# akira-platform (formerly known as SpringBonk)

A multi-service containerized application for running a ranked-choice book club. Built with a BFF (Backend for Frontend) pattern, OAuth 2.0 authentication, and event-driven messaging.

### Architecture

- **Resource Server** — Spring Boot, PostgreSQL, Liquibase. Handles book data, elections, and ranked-choice tallying. RSQL for dynamic query filtering.
- **Authentication Server** — Keycloak with a dedicated PostgreSQL instance. Manages user identity, roles, and OAuth 2.0 token issuance. The BFF handles token exchange so the frontend never touches tokens directly.
- **Backend-For-Frontend** — Spring Boot. Aggregates downstream calls, manages session state, and acts as the OAuth 2.0 client. Sits behind Nginx as a reverse proxy.
- **Frontend** — Angular (TypeScript). Component-based architecture with lazy-loaded modules and reactive state management.
- **Infrastructure** — Docker Compose for local orchestration. Each service runs in its own container with isolated networking. Nginx handles routing, SSL termination, and static asset serving.

### Patterns & Approach

- **BFF as security boundary** — the frontend is a public client with no token storage; all OAuth flows route through the BFF, which holds tokens server-side and proxies authenticated requests downstream.
- **Database-per-service** — Keycloak and the resource server each own their own PostgreSQL instance. No shared schemas, no cross-service joins.
- **Liquibase migrations** — schema changes are version-controlled and applied at startup, keeping environments reproducible.
- **Ranked-choice tallying** — elections resolve using instant-runoff voting with configurable round logic.
- **Test-driven** — JUnit and Mockito. Services are designed for testability with constructor injection and interface-driven dependencies.

### Code Tags

- `LOCK_IN_POINT` — marks non-agnostic code (vendor or implementation lock-in)
- `TODO` / `TODO TEST` — outstanding work and missing tests
- `CHOICE` — development decisions that may change
- `SEE` — links to reference material

### Log Format

`[CLASS] Content of log`

---

# Oozengine

A D&D Dungeon Master toolset and combat balancer/simulator, integrated as an additional microservice in the SpringBonk ecosystem. Spring Boot, PostgreSQL, JPA/Hibernate, Liquibase — secured as an OAuth 2.0 resource server behind the BFF and built downstream of the SpringBonk parent POM.

### Patterns & Approach

- **Module of the SpringBonk reactor** — builds from the shared parent POM (Spring Boot 4 / Java 26), inheriting dependency and plugin management rather than a standalone Spring Boot parent.
- **Secured resource server behind the BFF** — validates Keycloak-issued JWTs via spring-addons; the BFF routes `/ooz/**` with token relay, so the Angular client never handles tokens directly. Method-level security is enabled for write paths.
- **Database-per-service** — owns a dedicated `ooz-db` Postgres database. Liquibase owns all DDL; Hibernate runs with `ddl-auto: validate` to confirm entities match the migrated schema at startup.
- **Virtual threading** — request handling runs on Java virtual threads (`spring.threads.virtual.enabled`).
- **Configurable simulation** — combat balancing is designed around pluggable rulesets, so encounter parameters (action economy, terrain modifiers, CR calculations) can be swapped without rewriting core logic.
- **Event-driven messaging (planned)** — Apache Pulsar for cross-service game events is on the roadmap; the starters were deferred until there are producers and consumers to wire.

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
| Module under SpringBonk parent POM | ✓ |
| Secured resource server behind BFF | ✓ |
| Database-per-service (ooz-db) | ✓ |
| JPA + Liquibase (validate) | ✓ |
| Pulsar system stream | planned |
| Pulsar applied to all services | planned |
| Actions | planned |
| Terrain & geography | planned |
| Game feeds via Pulsar | planned |
