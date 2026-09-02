# CLAUDE.md

Akira: a ranked-choice book club plus three federated side apps. Spring Boot
microservices behind a BFF gateway, Angular micro-frontends, Keycloak, Postgres,
nginx.

## Start here

| Need | Do this |
|---|---|
| Backend build + tests | `./mvnw -B -ntp verify` (repo root) |
| One module | `./mvnw -B -ntp -pl <module> verify` |
| All frontends | `cd angular-client/akira-ng && ./devbuildall.sh` |
| Frontend tests | `npx ng test akira-ng --watch=false` (also `president`) |
| Local stack | `docker compose up -d` (postgres, keycloak, nginx only) |
| Spring services | Run the jars yourself; they are **not** in compose locally |
| Ad-hoc DB backup | `docker exec pg-backup /usr/local/bin/pg-backup.sh once` |
| Restore a backup | `./backup/pg-restore.sh [file]` (stop Keycloak + services first) |

Java 26 is required and is often not the default JVM:
`JAVA_HOME=$(/usr/libexec/java_home -v 26) ./mvnw ...`

## Layout

| Module | Port | BFF prefix | What |
|---|---|---|---|
| `spring-bff` | 7081 | — | Gateway + OAuth2 client. All browser traffic goes through `/bff/**` |
| `spring-resource` | 7084 | `/api` | Book club, elections, blog |
| `spring-ooze` | 7085 | `/ooz` | D&D compendium + dice |
| `spring-decks` | 7086 | `/dck` | Card games, STOMP over `/dck-ws` |
| `jpss-resource` | 7087 | `/jps` | Jo Peace Stickers — geotagged photos |

Angular workspace is `angular-client/akira-ng`: host `akira-ng` plus remotes
`ooze`, `president`, `jpss-ui`, wired with Angular Native Federation.

## Gotchas that cost real time

Read these before touching the relevant area.

### Frontend / federation

- **Build the host before the remotes.** The host's `src/styles.css` `@source`s
  every remote, so it emits their Tailwind. A remote built alone has an empty
  stylesheet unless its `angular.json` `styles` points at `src/styles.css`
  (which `jpss-ui` does, because it is also served standalone).
- **A new remote must be added to `public/federation.manifest.json`** as well as
  `angular.json`. Missing there, the host cannot resolve the name and every
  route into it silently falls back to "unavailable".
- **Native Federation builds each shared package as a self-contained chunk.** It
  does not externalise one shared package from inside another, so a diamond
  dependency gets duplicated. deck.gl is a diamond (`core` and `layers` both sit
  on `@luma.gl/shadertools`), and two copies means shader hooks register on one
  `ShaderAssembler` and compile against the other — every fragment shader fails
  at runtime from a green build. Fix is `skip`, not `shared`: the whole graph
  (`@deck.gl/*`, `@luma.gl/*`, `maplibre-gl`) is bundled into `jpss-ui`.
- **maplibre-gl v6 is ESM-only and has no default export.** Use
  `import * as maplibregl from 'maplibre-gl'`. (Under v5 the rule was the exact
  opposite — it shipped UMD and only `default` worked — so do not "restore" the
  default import when you see it in old diffs.)
- **v6 loads its tile-parsing worker as a separate chunk**, resolved from
  maplibre's own `import.meta.url`. Federation bundles maplibre *into* this
  remote, so that path does not exist and the worker never starts: no error, no
  tiles, a blank globe. `angular.json` copies `maplibre-gl-worker.mjs` and
  `maplibre-gl-shared.mjs` beside our chunks and `globe.ts` calls
  `setWorkerUrl(new URL(..., import.meta.url))`. Both files are required — the
  worker imports the shared one.
- **nginx must map `.mjs` to a JS MIME type.** Its bundled `mime.types` predates
  `.mjs` and falls back to `application/octet-stream`, which a module worker is
  required to refuse — same silent blank globe as above. `nginx.conf` adds the
  `types { application/javascript mjs; }` block; any other host serving this
  remote needs the same.
- **Assets go on the `esbuild` target, not `build`.** `build` is
  `@angular-architects/native-federation:build`, which only wraps; the real
  Angular options live in the `esbuild` target. `assets` on `build` is silently
  ignored.
- **`.npmrc` sets `legacy-peer-deps`** because the deck.gl 9.4 betas have
  self-contradictory peer ranges. Without it `npm ci` fails outright. Remove it
  when 9.4 goes stable.
- **`jpss-ui` runs in two shells and the difference is load-bearing.** Inside the
  host it sits under a 3.5rem header; standalone (findjo.org) there is no header
  and no host `App`. Anything the host provides has to have a standalone
  equivalent or a working default — `--jpss-shell-header` defaults to `3.5rem`
  and the standalone `App` sets it to `0px`; theme resolution and the
  `theme-color` metas are duplicated in `projects/jpss-ui/src/app/app.ts`
  because the host's `App` never runs there.
- **Only the standalone document sets `viewport-fit=cover`.** That is what makes
  `env(safe-area-inset-*)` non-zero, so the globe can reach the screen edges on
  a notched phone. `.jpss-stage` publishes them as `--jpss-safe-*`, and the
  floating chrome insets itself by those; in the host they resolve to `0` and
  every rule is inert. Do not add `cover` to the host `index.html` without
  auditing every fixed element on every page.

### Angular signals

- **`effect()` must not read a signal it writes.** `setFile()` read `previewUrl`
  to revoke the old object URL and then wrote it, so the seeding effect re-ran
  and cleared every photo the user chose. Wrap the body in `untracked()`.
- **Optional chaining short-circuits dependency tracking.** `this.pins()?.sync({
  stickers: this.stickers() })` registers *no* dependencies while `pins` is
  null, so the effect never runs again. Read signals into locals first.

### deck.gl + globe

- **deck's own `IconLayer` renders nothing under `_GlobeView` when
  `billboard: true`** (9.3.11). Reproducible standalone: same data draws 3 icons
  under `MapView`, 0 under `_GlobeView`, while a ScatterplotLayer beside it draws
  all 3. `StickerIconLayer` exists for this — it copies ScatterplotLayer's
  billboard vertex path, which does survive the globe.
- **`map.isStyleLoaded()` also waits for tiles**, so it is never true while the
  globe is spinning. Gate per-style setup on `map.getStyle()` returning non-null
  instead — that means "the style is parsed", which is the actual question.
- MapLibre `Marker`: `setLngLat()` **before** `addTo()`, or `addTo` throws and
  orphans the element at the origin.

### Spring / auth

- **`/error` must be in `resourceserver.permit-all`.** Spring forwards unhandled
  exceptions there and the forward re-enters the filter chain; without it every
  server fault reaches the client as `401`, so a missing table looks like an auth
  problem. All five services now list it.
- **spring-addons pins `redirect_uri` to one `client-uri`.** The reactive
  resolver rewrites it unconditionally (the servlet one short-circuits when
  unset), and unset falls back to a relative URI that Keycloak rejects with
  `Invalid parameter: redirect_uri`. `MultiHostAuthorizationRequestResolver`
  overrides the bean to retarget per request, gated by
  `bff.allowed-client-origins`.
- Adding a public domain takes **three** changes: `bff.allowed-client-origins`,
  `BFF_POST_LOGIN_PATTERNS` / `BFF_POST_LOGOUT_PATTERNS` (they default to "under
  `client-uri`" and would otherwise refuse the new host), and the Keycloak
  client's redirect URIs.

### Database / deploy

- **Backups are `pg_dumpall`, not per-database `pg_dump`.** The `pg-backup`
  sidecar dumps the whole cluster to `./backups` at local midnight and keeps 3.
  Cluster-wide because the dump then also carries `CREATE ROLE` with passwords —
  a per-database dump restored onto a cluster whose roles are gone has nothing to
  load into, and `init-db.sh` will not re-run to recreate them. Its image tag
  must be bumped alongside `postgres`: `pg_dumpall` refuses a newer server.
- **The sidecar mounts `backup/` the directory, never `backup/pg-backup.sh`.** A
  single-file bind mount is inode-pinned on Linux and `git pull` replaces files
  by rename, so a file mount silently keeps running the pre-pull script. It does
  not reproduce on Docker Desktop, which resolves shares by path.
- **The sidecar's healthcheck asserts a recent non-empty dump, not liveness.** A
  backup container sleeps 24h at a time, so a broken one is indistinguishable
  from a working one by process state; `find -mmin -1560 -size +1k` over
  `/backups` is the thing actually worth knowing. It also polls `pg_isready`
  itself before each dump, so `depends_on: service_healthy` is a convenience,
  not a requirement.
- **`pg-restore.sh` takes its target as an argument, and reads credentials from
  the Postgres container.** Neither is derived from the script's own location:
  backup paths and `.env` live wherever a given deployment puts them, so callers
  pass them in. Do not reintroduce a repo-relative default for either.
- **`init-db.sh` runs only on first initialisation of an empty volume.** On an
  existing Postgres, a new service's database and role must be created by hand;
  Liquibase makes tables, not databases or roles.
- **Liquibase changesets are immutable once applied.** New schema goes in a new
  file under `db/changelog/changes/`.
- **Postgres folds unquoted identifiers to lowercase.** A mixed-case role must be
  `CREATE ROLE "MixedCase"` and referenced with the same quoting, and the app's
  datasource username must match exactly.

## Conventions

- Liquibase owns DDL; Hibernate is `ddl-auto: validate`.
- Each service mirrors its Keycloak user into a thin local `keycloak_user`
  (id = `sub`), provisioned just-in-time via `KeycloakUserService.ensure()`.
- Row-level rules (you may only edit your own sticker) live in the service, not
  in `@PreAuthorize` — no authority grants them.
- Angular: standalone components, `ChangeDetectionStrategy.OnPush`, signals,
  zoneless. Templates use `@if` / `@for`.
- Comments explain *why*, especially where the obvious approach was tried and
  failed. Match the surrounding density.

## Local credentials

Keycloak admin `admin` / `randompassword` (`KEYCLOAK_ADMIN_PASSWORD` in `.env`).

Realm users `brice`, `brice2`, `brice3`, `igor` all have the password **`secret`**.
Use it. Do not reset them via the admin API — the hashes in the realm export are
the source of truth and a reset only diverges the running container from it
until the volume is recreated.

`.env` is tracked and holds **local defaults only**. Production values live in
the deploy repo's own `.env`; never copy a real credential into this one.
