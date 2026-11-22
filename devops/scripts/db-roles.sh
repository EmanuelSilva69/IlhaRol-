#!/usr/bin/env bash
# Reaplica papéis, grants e default privileges do banco.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=db-common.sh
. "$SCRIPT_DIR/db-common.sh"

db_load_env
db_assert_running

db_compose exec -T \
  -e "ILHAROLE_APP_USER=$ILHAROLE_APP_USER" \
  -e "ILHAROLE_APP_PASSWORD=$ILHAROLE_APP_PASSWORD" \
  -e "ILHAROLE_READONLY_USER=$ILHAROLE_READONLY_USER" \
  -e "ILHAROLE_READONLY_PASSWORD=$ILHAROLE_READONLY_PASSWORD" \
  db bash /opt/ilharole-db/init/02-roles.sh

echo "Papéis, grants e default privileges reaplicados."
