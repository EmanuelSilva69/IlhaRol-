#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE="$SCRIPT_DIR/../docker-compose.yml"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

if [ "$#" -gt 0 ]; then
  docker compose -f "$COMPOSE" exec db \
    psql -U "${POSTGRES_USER:-ilharole}" -d "${POSTGRES_DB:-ilharole}" -c "$*"
else
  docker compose -f "$COMPOSE" exec db \
    psql -U "${POSTGRES_USER:-ilharole}" -d "${POSTGRES_DB:-ilharole}"
fi
