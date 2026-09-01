#!/usr/bin/env bash
#
# clearBuildCaches.sh - reclaim disk from Docker build artifacts after a deploy.
#
# Conservative by design. This script NEVER:
#   * touches volumes - postgres_data lives there
#   * removes tagged images - akira-*, keycloak, nginx, postgres, certbot
#   * stops, restarts, or otherwise disturbs running containers
#
# By default it keeps recent build cache, so the Maven dependency layer
# (COPY pom.xml -> mvn dependency:go-offline) survives and the next deploy
# still builds in seconds instead of re-downloading every dependency.
# Use --all only when you actually need the space back.

set -euo pipefail

KEEP="168h"
ALL=0
DRY=0

die() { printf 'clearBuildCaches: %s\n' "$1" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: ./clearBuildCaches.sh [options]

  -k, --keep DURATION   Keep build cache newer than DURATION (default: 168h).
                        Ignored when --all is given.
  -a, --all             Remove ALL build cache, including the Maven dependency
                        layer. The next build re-downloads every dependency -
                        roughly a minute per service. Use sparingly.
  -n, --dry-run         Report what would be reclaimed; change nothing.
  -h, --help            Show this help.

Examples:
  ./clearBuildCaches.sh                # keep the last week of cache
  ./clearBuildCaches.sh --keep 24h     # keep only the last day
  ./clearBuildCaches.sh --all          # full wipe, slow next build
  ./clearBuildCaches.sh --dry-run      # look before you leap
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    -k|--keep)
      [ $# -ge 2 ] || die "--keep needs a duration, e.g. 168h"
      KEEP="$2"; shift 2 ;;
    -a|--all)     ALL=1; shift ;;
    -n|--dry-run) DRY=1; shift ;;
    -h|--help)    usage; exit 0 ;;
    *) die "unknown option: $1 (try --help)" ;;
  esac
done

command -v docker >/dev/null 2>&1 || die "docker not found on PATH"
docker info >/dev/null 2>&1        || die "cannot reach the Docker daemon"

echo "=== Disk usage before ==="
docker system df
echo

if [ "$DRY" -eq 1 ]; then
  echo "=== Dry run - nothing will be removed ==="
  if [ "$ALL" -eq 1 ]; then
    echo "Would run: docker builder prune --all --force"
  else
    echo "Would run: docker builder prune --force --filter until=${KEEP}"
  fi
  echo "Would run: docker image prune --force   (dangling/untagged images only)"
  echo
  echo "Reclaimable totals are in the RECLAIMABLE column above."
  exit 0
fi

if [ "$ALL" -eq 1 ]; then
  echo "=== Removing ALL build cache ==="
  echo "Note: the next build re-downloads every Maven dependency."
  docker builder prune --all --force
else
  echo "=== Removing build cache older than ${KEEP} ==="
  docker builder prune --force --filter "until=${KEEP}"
fi
echo

# Dangling images only - untagged layers orphaned by repeated rebuilds.
# Tagged images (akira-bff, postgres, nginx, ...) are never touched.
echo "=== Removing dangling images ==="
docker image prune --force
echo

echo "=== Disk usage after ==="
docker system df
echo
echo "Done. Volumes and tagged images were left untouched."
