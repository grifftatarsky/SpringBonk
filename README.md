# SpringBonk

This a service system with the following parts.

- Resource Server (Spring Boot with PGSQL RDBMS)
- Authentication Server (Keycloak with PGSQL RDBMS)
- Backend-For-Frontend Server (Spring Boot)
- Frontend (Angular TS)

### Searchable Code Tags:

- `LOCK_IN_POINT` - this tag shows where any code which makes something non-agnostic is.
- `TODO` - where I put...todo's. You've most likely seen this one before.
    - `TODO TEST` - self explanatory, write a unit test.
- `CHOICE` - development decisions which might change.
- `SEE` - links to webpages with information on why something is done / how it works

### Log format

For logs, please use format: `[CLASS] Content of log`.

### Tasks

#### Backend

1. Upgrade to latest Java
2. Add liquibase (Priority)

#### Frontend

1. Book blurb does not update based on state in the frontend.
2. Election delete doesn't update the main page
