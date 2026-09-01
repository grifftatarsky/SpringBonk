# akira-platform (formerly known as SpringBonk)

A multi-service containerized application for running a ranked-choice book club, plus a
pair of federated side apps — a D&D toolkit and a real-time card game. Built with a BFF
(Backend for Frontend) pattern, OAuth 2.0 authentication, and micro-frontends.

### Services

Everything is reached through Nginx on `:7080`; the services themselves are not exposed
directly.

| Service | Port | Path | Role |
|---|---|---|---|
| `nginx` | 7080 | `/` | Reverse proxy, static assets, federated remote hosting |
| `spring-bff` | 7081 | `/bff` | OAuth 2.0 client, session state, gateway to downstream services |
| `spring-resource` | 7084 | `/api` | Books, shelves, elections, reviews, notifications, activity |
| `spring-ooze` | 7085 | `/ooz` | Oozengine — D&D compendium and combat tooling |
| `spring-decks` | 7086 | `/dck`, `/dck-ws` | Real-time card games (President), STOMP over WebSocket |
| `keycloak` | 8080 | `/auth` | Identity, roles, OAuth 2.0 token issuance |
| `postgres` | 5432 | — | One database per service |

### Architecture

- **Resource Server** — Spring Boot, PostgreSQL, Liquibase. Handles book data, elections, and
  ranked-choice tallying. Spring Data repositories with explicit `@Query` and `Pageable` paging.
- **Authentication Server** — Keycloak with a dedicated PostgreSQL instance. Manages user
  identity, roles, and OAuth 2.0 token issuance. The BFF handles token exchange so the frontend
  never touches tokens directly.
- **Backend-For-Frontend** — Spring Boot Cloud Gateway. Aggregates downstream calls, manages
  session state, and acts as the OAuth 2.0 client. Sits behind Nginx as a reverse proxy.
- **Decks** — Spring Boot. Authoritative game engine with a STOMP broadcaster over WebSocket.
  Clients authenticate the CONNECT frame with a short-lived ticket; the session principal is the
  Keycloak subject. Runs on the in-memory simple broker — scaling past one instance means
  swapping in a RabbitMQ STOMP relay.
- **Frontend** — Angular 22, standalone components, signals, zoneless change detection,
  Tailwind CSS v4. A host shell plus two federated remotes (see below).
- **Infrastructure** — Docker Compose for local orchestration. Each service runs in its own
  container with isolated networking. Nginx handles routing, static assets, and serving the
  federated remotes. The local compose stack is plain HTTP — `certs/` is a placeholder and no
  TLS is configured, so don't point anything public at it as-is.

### Frontend layout

The Angular workspace lives in `angular-client/akira-ng` and builds three projects wired with
Angular Native Federation:

| Project | Kind | Served at |
|---|---|---|
| `akira-ng` | Host shell — book club, dashboard, auth, navigation | `/` |
| `ooze` | Remote — Oozengine compendium and dice | `/remotes/ooze/` |
| `president` | Remote — President card game (WebGPU table) | `/remotes/president/` |

Remotes are loaded lazily through `loadRemoteModule`, and the host degrades to an
"unavailable" route when a remote or its backend is down — the home page and nav both gate on
live health checks rather than assuming everything is up.

> **Tailwind note:** the remotes have no Tailwind build of their own. The host's Tailwind scan
> reaches into the remotes' templates and emits their classes, so after editing a remote's
> markup you must rebuild the **host** for new utility classes to exist.

### Running it locally

Prerequisites: JDK 26, Node (see `.nvmrc`), Docker.

Start the infrastructure (Postgres, Keycloak, Nginx):

```bash
docker compose up -d
```

Build and test the Maven reactor:

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 26) ./mvnw verify
```

Build and test the frontend:

```bash
cd angular-client/akira-ng && npm ci && npx ng build akira-ng && npx ng test akira-ng --watch=false
```

The remotes build separately (`npx ng build ooze`, `npx ng build president`). Build the host
first — see the Tailwind note above.

### Patterns & Approach

- **BFF as security boundary** — the frontend is a public client with no token storage; all OAuth
  flows route through the BFF, which holds tokens server-side and proxies authenticated requests
  downstream.
- **Database-per-service** — Keycloak, the resource server, Oozengine, and Decks each own their
  own PostgreSQL database. No shared schemas, no cross-service joins.
- **Liquibase migrations** — schema changes are version-controlled and applied at startup, keeping
  environments reproducible. Hibernate runs with `ddl-auto: validate` so entities are checked
  against the migrated schema rather than driving it.
- **Ranked-choice tallying** — elections resolve using instant-runoff voting with configurable
  round logic, and expose the round-by-round breakdown.
- **Micro-frontends over a monolith SPA** — side apps ship and fail independently of the shell.
- **Virtual threads** — request handling runs on Java virtual threads in the resource, Oozengine,
  and Decks services (`spring.threads.virtual.enabled`). The BFF stays reactive on WebFlux.
- **Test-driven** — JUnit and Mockito on the backend; Vitest with the Angular `unit-test` builder
  on the frontend.

### CI & Security

- **`ci.yml`** — builds and tests the Maven reactor on JDK 26 (Testcontainers-backed slices
  included), then builds all three Angular projects and runs the frontend suites.
- **`codeql.yml`** — CodeQL code scanning for `java-kotlin` (built via Maven), for
  `javascript-typescript`, and for the workflow files themselves. Runs on push, PR, and weekly.
- **Dependabot** — weekly grouped updates for Maven, npm, Docker, and Docker Compose, with a
  cooldown so brand-new releases settle before a PR opens.
- **`.github/SECURITY.md`** — supported versions and vulnerability reporting.

### Conventions

**Code tags**

- `LOCK_IN_POINT` — marks non-agnostic code (vendor or implementation lock-in)
- `TODO` / `TODO TEST` — outstanding work and missing tests
- `CHOICE` — development decisions that may change
- `SEE` — links to reference material

**Log format**

`[CLASS] Content of log`

---

# Oozengine

A D&D Dungeon Master toolset and combat balancer/simulator, integrated as an additional
microservice in the akira-platform ecosystem. Spring Boot, PostgreSQL, JPA/Hibernate, Liquibase —
secured as an OAuth 2.0 resource server behind the BFF and built downstream of the platform
parent POM.

### Patterns & Approach

- **Module of the platform reactor** — builds from the shared parent POM (Spring Boot 4 / Java 26),
  inheriting dependency and plugin management rather than a standalone Spring Boot parent.
- **Secured resource server behind the BFF** — validates Keycloak-issued JWTs via spring-addons; the
  BFF routes `/ooz/**` with token relay, so the Angular client never handles tokens directly.
  Method-level security is enabled for write paths.
- **Database-per-service** — owns a dedicated `ooz-db` Postgres database. Liquibase owns all DDL;
  Hibernate runs with `ddl-auto: validate` to confirm entities match the migrated schema at startup.
- **Virtual threading** — request handling runs on Java virtual threads (`spring.threads.virtual.enabled`).
- **Configurable simulation** — combat balancing is designed around pluggable rulesets, so encounter
  parameters (action economy, terrain modifiers, CR calculations) can be swapped without rewriting
  core logic.
- **Event-driven messaging (planned)** — Apache Pulsar for cross-service game events is on the
  roadmap; the starters were deferred until there are producers and consumers to wire.

### Data Progress

| Category | Status |
|---|---|
| Skills | ✓ |
| Feats | ✓ |
| Tools | ✓ |
| Equipment (base) | ✓ |
| Backgrounds | ✓ |
| Species | in progress |
| Traits | in progress |

### Combat & Items

| Category | Status |
|---|---|
| Base Weapons | ✓ |
| Base Armor | ✓ |
| Custom Weapons | planned |
| Custom Armor | planned |
| Mounts & Vehicles | planned |
| Spells | planned |
| Classes | planned |
| PCs | planned |
| NPCs | planned |
| Monsters | planned |

### Systems

| Category | Status |
|---|---|
| Module under platform parent POM | ✓ |
| Secured resource server behind BFF | ✓ |
| Database-per-service (ooz-db) | ✓ |
| JPA + Liquibase (validate) | ✓ |
| Pulsar system stream | planned |
| Pulsar applied to all services | planned |
| Actions | planned |
| Terrain & geography | planned |
| Game feeds via Pulsar | planned |

---

# President

A real-time multiplayer card game (President, a.k.a. Asshole) served as a federated Angular
remote against the `spring-decks` service.

### Two ways to play

- **Solo vs bots** — the remote carries its own TypeScript rules engine (`game/engine.ts`) and bot
  policy, so a single player can start a game immediately with no lobby and no server round trip.
- **Live multiplayer** — `spring-decks` runs the authoritative `PresidentEngine`; the client sends
  intents over STOMP and renders the state it gets back.

The rules therefore exist in two implementations, Java and TypeScript, which have to agree.
Both sides are covered by tests that play out full games; treat any rule change as a change to
both engines.

### Patterns & Approach

- **STOMP over WebSocket** — commands go up over STOMP, state fans out through a broadcaster.
  The CONNECT frame carries a short-lived ticket, and the session principal is the Keycloak
  subject. The server runs the in-memory simple broker today.
- **Pure engines, testable in isolation** — neither engine depends on its framework or transport,
  so both are exercised by playthrough tests that drive complete games.
- **WebGPU table** — the card table renders through WebGPU.
- **House rules** — two decks, no jokers, 104 cards; twos are high, the winner of a trick leads the
  next, and the President/Asshole exchange runs between rounds.
