#!/usr/bin/env bash
# Restaura um dump SQL gerado por db-backup.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=db-common.sh
. "$SCRIPT_DIR/db-common.sh"

INPUT="ilharole-backup.sql"
FORCE=0
if [ "${1:-}" = "--force" ]; then
  FORCE=1
  INPUT="${2:-$INPUT}"
elif [ -n "${1:-}" ]; then
  INPUT="$1"
fi
if [ "${2:-}" = "--force" ]; then
  FORCE=1
fi

db_load_env
db_assert_running

if [ ! -f "$INPUT" ]; then
  echo "Arquivo não encontrado: $INPUT" >&2
  exit 1
fi
if [ ! -s "$INPUT" ]; then
  echo "O arquivo de backup está vazio: $INPUT" >&2
  exit 1
fi

if [ "$FORCE" -ne 1 ]; then
  printf "Isso substitui os dados atuais de app/audit/analytics. Digite 'restore' para continuar: "
  read -r answer
  if [ "$answer" != "restore" ]; then
    echo "Cancelado."
    exit 0
  fi
fi

db_psql --single-transaction -c "DROP SCHEMA IF EXISTS analytics CASCADE;
DROP SCHEMA IF EXISTS audit CASCADE;
DROP SCHEMA IF EXISTS app CASCADE;" >/dev/null

db_psql --single-transaction < "$INPUT"

# Reaplica grants/default privileges; o dump pode ter vindo de outro volume.
"$SCRIPT_DIR/db-roles.sh"

echo "Backup restaurado a partir de $INPUT"
