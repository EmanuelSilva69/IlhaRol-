#!/usr/bin/env bash
# Recria os schemas app/audit/analytics, reaplica migrações e seed.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=db-common.sh
. "$SCRIPT_DIR/db-common.sh"

db_load_env
db_assert_running

force=0
if [ "${1:-}" = "--force" ] || [ "${1:-}" = "-f" ]; then
  force=1
fi

if [ "$force" -ne 1 ]; then
  printf "Isso apaga app, audit e analytics (não apaga as extensões). Digite 'reset' para continuar: "
  read -r answer
  if [ "$answer" != "reset" ]; then
    echo "Cancelado."
    exit 0
  fi
fi

db_psql --single-transaction -c "DROP SCHEMA IF EXISTS analytics CASCADE;
DROP SCHEMA IF EXISTS audit CASCADE;
DROP SCHEMA IF EXISTS app CASCADE;" >/dev/null

"$SCRIPT_DIR/db-migrate.sh"
"$SCRIPT_DIR/db-seed.sh"

echo "Reset concluído."
