#!/usr/bin/env bash
# Aplica o seed de demonstração (idempotente).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=db-common.sh
. "$SCRIPT_DIR/db-common.sh"

db_load_env
db_assert_running

has_events="$(db_psql_capture -c "SELECT to_regclass('app.events') IS NOT NULL;")"
if [ "$has_events" != "t" ]; then
  echo "As tabelas não existem. Rode primeiro: ./devops/scripts/db-migrate.sh" >&2
  exit 1
fi

db_psql --single-transaction -f "/opt/ilharole-db/seeds/0001_demo.sql"

# Atualiza a materialized view fora da transação do seed.
db_psql -c "SELECT analytics.refresh_daily_event_stats();" >/dev/null

echo "Seed de demonstração aplicado."
