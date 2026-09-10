#!/usr/bin/env bash
# Runs the RLS isolation test suite against the local database.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgres://app_dev:dev_password_change_me@localhost:5432/intervia}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for f in "$ROOT_DIR"/db/tests/*.sql; do
  echo "==> Running $(basename "$f")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
