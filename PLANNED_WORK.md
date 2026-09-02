# Planned work

Things we know we want, deliberately not built yet. Each entry says what the
current design is, what it becomes, and — the part that matters — **what makes
it urgent**, so nobody does it early and nobody misses the moment.

Bugs and papercuts live in `KNOWN_ISSUES.md`. This file is for accepted debt.

---

## 1. Move JPSS image storage to MongoDB, and add a per-user rate limit

**Today.** `jpss-resource` stores both renditions of every photo as `BYTEA` in
the `sticker_image` table: a display image capped at 1600px on the long edge and
a 128px atlas tile. Uploads are capped at 8MB each. There is no per-user quota
and no rate limit — an authenticated user can post photos indefinitely.

**Why it is fine for now.** Posting requires a Keycloak session, and the realm is
people we know. The blast radius of abuse is a conversation, not an incident.

**What makes it urgent.** Two triggers, either one on its own:

- **Open or widened signup.** The moment an account is cheap to obtain, unbounded
  upload becomes an unbounded write primitive.
- **Disk pressure on the Postgres volume.** `jps-db` shares `postgres_data` with
  Keycloak's `auth-db`. Filling that volume does not degrade stickers — it takes
  down authentication for every service in the stack. That coupling is the real
  reason this is on the list.

Watch it with the storage query in the deploy notes
(`pg_total_relation_size('sticker_image')`).

**What it becomes.** A MongoDB container holding the image bytes, with
`sticker_image` reduced to a reference (id, content type, dimensions) or dropped
entirely. Plus a per-user rate limit — a sticker count cap and a rolling upload
window — enforced in `StickerService` before `ImageProcessor` runs, so a rejected
upload costs a row lookup rather than a decode.

Do both together: the quota is what stops the new store filling up, and the new
store is what stops the quota being about Postgres.

---

## 2. Slim the wall payload, load metadata and images on demand

**Today.** `GET /jps/stickers` returns every sticker with its full metadata in
one unpaginated response (`findAllByOrderByCreatedAtDesc`), and the globe holds
all of it in memory. Images are already separate — the globe draws a shared
glyph, not thumbnails — so the payload is metadata only.

**Why it is fine for now.** Tens to hundreds of stickers is a small JSON
document, and having every point resident is what makes the globe feel instant:
no fetch on pan, no popping in as you spin.

**Deliberately not pagination.** We want *all* the points on the globe at once —
that is the product. Paging the wall would mean stickers appearing as you scroll
a map, which is the wrong experience.

**What it becomes.** Split the endpoint by what each part is for:

- A **slim point list** — id, longitude, latitude, and whatever the mark's colour
  depends on (author id, so "mine" still renders). Nothing else. This stays
  unpaginated and loads everything, as now, and it is what feeds the deck layer.
- **Metadata on demand** — `GET /jps/stickers/{id}` when a sticker is clicked,
  populating the sidebar. Cache per id client-side so reopening one is free.
- **Image on demand** — already how it works; the sidebar's `<img>` is the first
  time bytes are fetched, and the response is cached for a week with an ETag.

The result is that the globe's cost scales with point *count* rather than
content, and opening a sticker costs one small request.

**What makes it urgent.** When the initial payload gets big enough to delay first
paint of the globe. The point list is a few dozen bytes per sticker, so that is a
long way off — likely tens of thousands of stickers.

---

## 3. Put every Swagger UI and OpenAPI doc behind the gateway and Keycloak

**Today.** All five services list these in `resourceserver.permit-all`:

```yaml
- /swagger-ui*/**
- /v3/api-docs*/**
```

`GET /v3/api-docs` returns `200` unauthenticated. In prod the services are only
reachable through nginx and the BFF, so this is not publicly exposed *today* —
but it is one routing change away from being so, and the permit-all entry is
what would make that change silent.

**Why it is fine for now.** No nginx location proxies to the doc paths, so
nothing outside the compose network can reach them.

**What makes it urgent.** Any of: publishing a service port, adding a route that
happens to cover `/v3/api-docs`, or wanting the docs available to the team
without an SSH tunnel — that last one is the likely trigger, and it is exactly
when the wrong fix (widen permit-all) is most tempting.

**What it becomes.** Drop both entries from every service's permit-all so the
docs require a bearer token like any other endpoint, then expose them
deliberately through the BFF — a gateway route under a prefix, with `TokenRelay`
so a signed-in session reaches them. Docs then follow the same auth as the API
they describe, and there is one place to revoke access.

Consider `springdoc.api-docs.enabled` / `springdoc.swagger-ui.enabled` set to
`false` under the `prod` profile as the belt-and-braces version — the services
already warn about this at startup.

---

## 4. Narrow the CORS policy on `/api/`, and fix two nginx-specific defects

**Today.** The `/api/` location in `nginx/conf/default.conf` proxies to a
host-side service on `:7001` and adds:

```nginx
add_header 'Access-Control-Allow-Origin' '*';
add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
add_header 'Access-Control-Allow-Headers' '*';
```

`*` declares everything under `/api/` readable by every website on the internet.

**Why it is fine for now — conditionally.** `*` and credentials are mutually
exclusive: browsers will not send cookies to a wildcard origin and reject the
response if forced. So anything cookie-authenticated is safe by accident.

The open question is whether `:7001` is trusted for some *other* reason — being
on the host network, sitting behind the proxy, or simply never expected to be
called from a browser. If so, `*` converts a network-position trust boundary
into a public one, using visitors' browsers to do the reaching. **Answer that
before deciding this entry is low priority.**

**Two defects that are wrong regardless of the answer.**

- **No `always`.** nginx applies `add_header` only to 2xx/3xx, so 4xx and 5xx
  responses carry no CORS headers and a cross-origin caller sees an opaque
  failure instead of the real status.
- **It silently drops server-level headers.** A location with its own
  `add_header` does not inherit the server's — the comment above the HSTS block
  in `default.conf` already says this. This location has three, so any security
  header added at server level will not apply to `/api/`. That one is live now.

Also worth knowing: `add_header` appends rather than replaces. If the upstream
sets its own `Access-Control-Allow-Origin`, the browser sees two and rejects both.

**What it becomes.** Named origins instead of `*`, `always` on each header, and
`Access-Control-Allow-Credentials` only if the answer above says it is wanted.
If `/api/` turns out to be genuinely public data, keep `*` and just fix the two
defects.

---

## 5. Make the nginx default server explicit

**Today.** No server block is marked `default_server`, so an unmatched `Host`
falls through to the first block declared for that address:port in config-load
order — and `conf.d` loads alphabetically, so that is `default.conf`'s first
`:443` block, the www→apex redirect.

Measured against a replica of the current `conf.d`:

| Port | `Host` | Answering block |
|---|---|---|
| 443 | `akira-app.io` | the real app |
| 443 | `www.akira-app.io` | www→apex redirect |
| 443 | `findjo.org` | findjo |
| 443 | `evil.example` | **www→apex redirect** |
| 443 | `evil.example`, path `/bff/` | **www→apex redirect** — never reaches a proxy |

**Why it is fine for now.** An unmatched `Host` gets a 301 and never touches a
proxied location, so no `X-Forwarded-Host` is forwarded anywhere. This is not a
hole today.

**What makes it urgent.** "First block in config-load order" is an implicit
dependency on **filenames**. Add a conf that sorts before `default.conf`, or
rename one, and whichever block lands first silently becomes the fallback — and
if that block has a proxied location, an arbitrary `Host` starts reaching it
with `X-Forwarded-Host: $host`. The trigger is somebody adding a domain, which
is exactly what we now do routinely.

**What it becomes.** An explicit catch-all on both ports that closes the
connection without responding, so the fallback stops depending on file naming:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name _;
    ssl_certificate     /etc/letsencrypt/live/akira-app.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/akira-app.io/privkey.pem;
    return 444;
}
```

Note this must not shadow the ACME challenge: `certbot` validates over HTTP on
port 80, so either keep the `/.well-known/acme-challenge/` location in the
catch-all too, or leave port 80 alone and add `default_server` on 443 only.

---

## 6. Decide whether findjo.org gets its own Keycloak client, or realm, or neither

Open question, not a task. Nothing is blocked on it — record the answer here
when there is one.

**Today.** One realm, one client (`local-keycloak-confidential`), shared by both
domains. findjo.org logins work because
`MultiHostAuthorizationRequestResolver` rebuilds `redirect_uri` from the
forwarded host (gated by `bff.allowed-client-origins`) and findjo.org's URIs are
registered on that client. Same users, same credentials, same `sub` on both
domains — so a person owns the same stickers wherever they signed in.

**Why it is fine for now.** It works, and one shared user pool is currently the
right answer: findjo.org is another front door onto the same wall, not a
separate community.

**The question is what you are separating.** Three different answers:

- **Just working logins** — already done, nothing to do.
- **Separate secret / roles / token lifetimes** — a second *client* in the same
  realm. Users, credentials and `sub` are unchanged, so resource servers need no
  change at all: same issuer, single `ops` entry. Buys blast-radius isolation if
  one client's secret leaks, client-scoped roles, and `azp` in the token telling
  you which front door a request came through.
- **Separate people** — a second *realm*. Its own user store and its own `sub`
  namespace. Resource servers accept both by listing a second `ops` entry
  (`ops` is a `List`, matched on the token's `iss` claim), so that part is
  config. But it forks identity, and that is where it stops being cheap — see
  below.

**What a realm drags in that a client does not.** There is no tenancy in the
sticker data: `GET /stickers` returns every row, `keycloak_user` is keyed on
`sub` with no realm column, and ownership is per-`sub`. Two realms therefore
means two communities posting to one shared globe. Making the walls separate is
the real work — a tenant column on `sticker` and `keycloak_user`, filtering on
every read, and a ruling on whether the same human in both realms is one
identity or two. Settle the shared-wall question *before* the auth work; it
decides whether any of it is worth doing.

**Common to a client or a realm** — either way there are two registrations, so
two code changes are needed:

- `LoginOptionsController` must filter by forwarded host and return only that
  domain's registration. It currently returns all of them and the frontend takes
  `options[0]`, which is `HashMap` iteration order.
- `MultiHostAuthorizationRequestResolver`'s flat origin allowlist becomes a
  host → registration map, so a mismatch is refused at the BFF instead of
  bouncing off Keycloak with an opaque error.

**Trap, whichever way this goes.** `KC_HOSTNAME` is pinned to
`https://${SITE_URL}/auth`, so every login page renders on akira-app.io and the
address bar changes mid-login for findjo.org users. Unsetting it so Keycloak
derives the hostname from forwarded headers fixes the cosmetics and breaks the
resource servers: the `iss` claim would then vary by hostname, and issuer
matching is exact string comparison, so you would need an `ops` entry per realm
*per hostname*. Keep it pinned.

**What makes it urgent.** findjo.org wanting its own signups (realm), or
deciding the akira client secret leaking should not take findjo.org with it
(client). Neither is true today.
