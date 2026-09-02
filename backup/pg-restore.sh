#!/usr/bin/env bash
# Restore a cluster dump written by pg-backup.sh.
#
#   pg-restore.sh <dir>          # newest pgcluster-*.sql.gz in that directory
#   pg-restore.sh <file.sql.gz>  # that exact dump
#   pg-restore.sh                # ./backups, if it exists
#
# The target is an argument rather than a path derived from this script's own
# location: where the backups live is a property of the deployment, not of the
# checkout, so callers (a wrapper script, an alias) pass it in.
#
# Override the Postgres container with PG_CONTAINER; credentials are read from
# that container, so there is no .env to locate.
#
# The dump was taken with --clean --if-exists, so it drops and recreates every
# database and role it contains. Stop the apps and Keycloak first: Postgres
# cannot drop a database that still has sessions attached.
set -euo pipefail

CONTAINER="${PG_CONTAINER:-pgsql}"
target="${1:-./backups}"

if [ -d "$target" ]; then
  archive="$(ls -1t "$target"/pgcluster-*.sql.gz 2>/dev/null | head -1 || true)"
  if [ -z "$archive" ]; then
    echo "no pgcluster-*.sql.gz in $target" >&2
    exit 1
  fi
elif [ -f "$target" ]; then
  archive="$target"
else
  echo "not a directory or file: $target" >&2
  echo "usage: $(basename "$0") [backup-dir | dump-file]" >&2
  exit 64
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "container '$CONTAINER' is not running (override with PG_CONTAINER)" >&2
  exit 1
fi

echo "About to restore $archive into container '$CONTAINER'."
echo "This DROPS and recreates every database in the dump. Keycloak and the"
echo "services must be stopped or the drops will fail on open sessions."
read -r -p "Type 'restore' to continue: " confirm
[ "$confirm" = "restore" ] || { echo "aborted"; exit 1; }

# Credentials come from the container's own environment: it keeps the password
# out of a host process argument, and there is no .env path to get wrong.
gunzip -c "$archive" \
  | docker exec -i "$CONTAINER" sh -c \
      'PGPASSWORD="$POSTGRES_PASSWORD" psql --username "$POSTGRES_USER" --dbname postgres'

echo "restore complete; bring the stack back up"
