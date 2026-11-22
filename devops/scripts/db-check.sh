#!/usr/bin/env bash
# Verifica extensões, schemas, tabelas, views, funções e tamanho do banco.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=db-common.sh
. "$SCRIPT_DIR/db-common.sh"

db_load_env
db_assert_running
db_psql_file "diagnostics/check.sql"
echo "Banco consistente."
