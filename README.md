# SpringBonk

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

A D&D Dungeon Master toolset and combat balancer/simulator, integrated as an additional microservice in the SpringBonk ecosystem. Spring Boot, Redis, JPA, Apache Pulsar.

### Patterns & Approach

- **Redis caching** — reference data (skills, feats, equipment) is cached in Redis to keep reads fast and reduce database load. Cache invalidation is event-driven.
- **Pulsar for system events** — services communicate via Apache Pulsar topics. Game state changes propagate asynchronously, decoupling producers from consumers.
- **JPA over JDBC** — migrated from raw JDBC to JPA/Hibernate for cleaner entity mapping and relationship management. JDBC and Redis repositories disabled in favor of unified JPA access.
- **Virtual threading ready** — service design favors non-blocking patterns and stateless request handling to support Java virtual threads as the concurrency model matures.
- **Configurable simulation** — combat balancing is designed around pluggable rulesets, so encounter parameters (action economy, terrain modifiers, CR calculations) can be swapped without rewriting core logic.

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
| Redis cache | ✓ |
| JPA (JDBC eliminated) | ✓ |
| Pulsar system stream | ✓ |
| Pulsar applied to all services | in progress |
| Actions | planned |
| Terrain & geography | planned |
| Game feeds via Pulsar | planned |