#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Nightly database backup for the Vehicle Fleet Manager.
#
# Dumps the PostgreSQL database from the running `db` container to a
# timestamped, gzipped file under ./backups, and keeps the 14 most recent.
#
# Add to crontab to run nightly at 2am:
#   0 2 * * * /full/path/to/fleet-manager/scripts/backup.sh >> /var/log/fleet-backup.log 2>&1
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# Work from the project root (one level up from this script).
cd "$(dirname "$0")/.."

# Load DB credentials from .env if present.
if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a; . ./.env; set +a
fi

PGUSER="${PGUSER:-fleet}"
PGDATABASE="${PGDATABASE:-fleet}"

mkdir -p backups
TS="$(date +%Y%m%d-%H%M%S)"
OUT="backups/fleet-${TS}.sql.gz"

echo "Backing up database '${PGDATABASE}' -> ${OUT}"
docker compose exec -T db pg_dump -U "${PGUSER}" "${PGDATABASE}" | gzip > "${OUT}"

# Retention: keep the 14 newest backups, delete the rest.
ls -1t backups/fleet-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm --

echo "Done. Current backups:"
ls -1t backups/fleet-*.sql.gz
