#!/usr/bin/env bash
# Smoke tests de escrita/leitura. Tudo é revertido ao final.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=db-common.sh
. "$SCRIPT_DIR/db-common.sh"

db_load_env
db_assert_running
db_psql_file "diagnostics/smoke.sql"
