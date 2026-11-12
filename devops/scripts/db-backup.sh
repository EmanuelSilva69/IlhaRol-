#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE="$SCRIPT_DIR/../docker-compose.yml"
ENV_FILE="$SCRIPT_DIR/../.env"
OUTPUT="${1:-ilharole-backup.sql}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

docker compose -f "$COMPOSE" exec -T db \
  pg_dump -U "${POSTGRES_USER:-ilharole}" -d "${POSTGRES_DB:-ilharole}" > "$OUTPUT"

echo "Backup salvo em $OUTPUT"
