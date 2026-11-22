#!/usr/bin/env bash
# Diagnóstico de tamanho, conexões, cache, índices e consultas lentas.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=db-common.sh
. "$SCRIPT_DIR/db-common.sh"

db_load_env
db_assert_running
db_psql_file "diagnostics/stats.sql"
