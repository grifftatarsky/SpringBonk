# Security Policy

## Supported Versions

akira-platform has no tagged releases. It is developed on a single branch, and
the only code that receives security fixes is the current tip of `main`.

| Version                        | Supported          |
| ------------------------------ | ------------------ |
| `main` (latest commit)         | :white_check_mark: |
| Any older commit, or a fork    | :x:                |

If you are running a pinned commit or a fork, the remedy for any issue is to
rebase onto `main`. Nothing is backported.

## Reporting a Vulnerability

**Please do not open a public issue, discussion, or pull request for a security
problem.** A public report is visible to everyone before there is a fix.

Report it privately through GitHub instead:

➡️ **[Report a vulnerability](https://github.com/grifftatarsky/akira-platform/security/advisories/new)**

(Or navigate there manually: the repository's **Security** tab → **Advisories**
→ **Report a vulnerability**.)

The report stays private between you and the maintainer until an advisory is
published, and it stays attached to the repository rather than to an inbox.

### What to include

The more of this you can provide, the faster the report can be triaged:

- **Which component** — `spring-bff`, `spring-resource`, `spring-ooze`,
  `spring-decks`, the Angular client in `angular-client/akira-ng`, or the
  deployment configuration (`docker-compose.yaml`, `nginx.conf`, `init-db.sh`,
  the Keycloak realm).
- **The commit SHA** you tested against.
- **Reproduction steps** — a request sequence, a proof-of-concept, or a failing
  test is ideal.
- **Impact** — what an attacker gains: whose data, which privileges, whether
  authentication is required.
- **Any non-default configuration** required to trigger it.

### What to expect

| Stage                          | Target                                              |
| ------------------------------ | --------------------------------------------------- |
| Acknowledgement of your report | Within 7 days                                        |
| Triage and initial assessment  | Within 14 days                                       |
| Fix for an accepted report     | 30 days for high/critical severity, best effort otherwise |
| Status updates while open      | At least every 2 weeks                               |

**If the report is accepted**, a fix lands on `main` and a GitHub Security
Advisory is published describing the issue and the affected commit range. You
will be credited by name or handle unless you ask to stay anonymous.

**If the report is declined**, you will get the reasoning — usually that the
behaviour is intentional, is out of scope below, or is not reachable in this
codebase. You are free to disclose publicly at that point.

**Coordinated disclosure:** please give the maintainer 90 days from
acknowledgement, or until an advisory is published, whichever comes first.

This is a single-maintainer project, not a funded product. The timelines above
are honest targets rather than a contractual SLA, and there is **no bug bounty**
— no payment is offered for reports.

## Scope

### In scope

- Authentication and authorization flaws in the BFF, which is the security
  boundary: session handling, the OAuth 2.0 client flows, CSRF protection, and
  anything that lets the browser reach a token it should never hold.
- Authorization gaps in the resource servers — missing or incorrect method
  security, elections or shelves readable or writable across users, RSQL filter
  expressions that reach data or SQL they should not.
- Injection of any kind, SSRF, XXE, and unsafe deserialization.
- Token validation errors: accepted issuers, audiences, signatures, or expiry.
- XSS or client-side injection in the Angular client, including anything
  introduced through the federated remotes.
- Insecure defaults in the shipped configuration that would carry into a real
  deployment.
- **Committed credentials that reach beyond the local stack** — a key for a
  deployed host, a real Keycloak realm, or a third-party API. See below for why
  the checked-in local fixtures are not this.

### Out of scope

- The credentials committed in `.env`, `keycloak/local-keycloak-realm.json`,
  `init-db.sh`, and the BFF's `application.yml`. These are deliberate fixtures,
  not leaked secrets: every datasource URL in them points at `localhost` or the
  Compose-internal `pgsql` host, the issuer is a realm named `local-keycloak`,
  and the BFF client secret has to be identical across the realm import and the
  app config for the stack to start at all. They authenticate nothing reachable
  off the machine running Compose.
- Self-signed certificates and missing TLS hardening in the local Nginx config.
- Missing security headers, cookie flags, or rate limiting on the local-only
  stack, absent a demonstrated attack.
- Vulnerabilities in Spring Boot, Keycloak, PostgreSQL, Angular, or any other
  upstream dependency. Report those to the project that owns them. A report is
  welcome here only if you can show a specific exploitable path through *this*
  code that the upstream fix does not already close.
- Dependency versions flagged by a scanner with no demonstrated impact —
  Dependabot already tracks these (see below).
- Denial of service through volumetric traffic or resource exhaustion.
- Social engineering, phishing, and physical attacks.
- Findings that require an already-compromised host, a malicious local user, or
  physical access to the machine running the stack.

## Testing safely

There is no hosted deployment of this project to test against. Run the stack
locally (`docker compose up`, per the README) and test only against your own
instance.

Research done in good faith against your own local deployment — without
accessing anyone else's data, without degrading a service you do not own, and
reported privately through the channel above — will not be pursued. Do not test
against any third-party host.

## Automated coverage already in place

Two workflows run on this repository, so you know what is already being checked:

- **[Dependabot](https://github.com/grifftatarsky/akira-platform/blob/main/.github/dependabot.yml)** — security alerts, plus weekly
  version updates for Maven, npm, Docker base images, and Compose images.
- **[CodeQL](https://github.com/grifftatarsky/akira-platform/blob/main/.github/workflows/codeql.yml)** — static analysis of the Java, TypeScript,
  and Actions code on every push and pull request to `main`, plus a weekly
  scheduled re-scan against newly published queries.
