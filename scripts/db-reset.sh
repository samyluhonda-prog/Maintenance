#!/usr/bin/env bash
# Resets the local development database: drops public/auth/storage/app
# schemas, reapplies the local-dev auth/storage shim (db/local_dev_shim.sql —
# NOT used against real Supabase, which already provides those schemas), then
# applies every migration in supabase/migrations/ in order.
#
# This is a LOCAL DEV ONLY script. Against a real Supabase project, use
# `supabase db push` / `supabase migration up` instead (see docs/DEPLOYMENT.md).
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgres://app_dev:dev_password_change_me@localhost:5432/intervia}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Resetting schemas on $DATABASE_URL"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "
  drop schema public cascade; create schema public; grant all on schema public to current_user;
  drop schema if exists auth cascade;
  drop schema if exists storage cascade;
  drop schema if exists app cascade;
  drop role if exists anon;
  drop role if exists authenticated;
  drop role if exists service_role;
"

echo "==> Applying local dev shim (auth/storage emulation)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/db/local_dev_shim.sql"

echo "==> Applying migrations"
for f in "$ROOT_DIR"/supabase/migrations/*.sql; do
  echo "   -- $(basename "$f")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "==> Done."
