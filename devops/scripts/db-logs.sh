#!/usr/bin/env bash
# Acompanha os logs do serviço db.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=db-common.sh
. "$SCRIPT_DIR/db-common.sh"

db_load_env
TAIL="${1:-200}"
db_compose logs -f --tail "$TAIL" db
