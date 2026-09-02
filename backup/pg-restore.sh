#!/usr/bin/env bash
# Restore a cluster dump written by pg-backup.sh. Run from the repo root:
#
#   ./backup/pg-restore.sh                       # newest backup
#   ./backup/pg-restore.sh backups/pgcluster-....sql.gz
#
# The dump was taken with --clean --if-exists, so it drops and recreates every
# database and role it contains. Stop the apps and Keycloak first: Postgres
# cannot drop a database that still has sessions attached.
set -euo pipefail

cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER="${PG_CONTAINER:-pgsql}"

archive="${1:-}"
if [ -z "$archive" ]; then
  archive="$(ls -1t "$BACKUP_DIR"/pgcluster-*.sql.gz 2>/dev/null | head -1 || true)"
fi
if [ -z "$archive" ] || [ ! -f "$archive" ]; then
  echo "no backup found (looked in $BACKUP_DIR)" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "container '$CONTAINER' is not running; start it with: docker compose up -d postgres" >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a; . ./.env; set +a

echo "About to restore $archive into container '$CONTAINER'."
echo "This DROPS and recreates every database in the dump. Keycloak must be stopped."
read -r -p "Type 'restore' to continue: " confirm
[ "$confirm" = "restore" ] || { echo "aborted"; exit 1; }

gunzip -c "$archive" \
  | docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" "$CONTAINER" \
      psql --username "$POSTGRES_USER" --dbname postgres

echo "restore complete; bring the stack back up"
