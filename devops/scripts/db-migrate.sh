#!/usr/bin/env bash
# Aplica migrações SQL versionadas em devops/db/migrations.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=db-common.sh
. "$SCRIPT_DIR/db-common.sh"

dry_run=0
if [ "${1:-}" = "--dry-run" ]; then
  dry_run=1
fi

db_load_env
db_assert_running

MIGRATIONS_DIR="$DB_DEVOPS_ROOT/db/migrations"

db_psql -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS app.schema_migrations (
    version text PRIMARY KEY,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
);" >/dev/null

pending=()
for file in "$MIGRATIONS_DIR"/*.sql; do
  [ -e "$file" ] || continue
  version="$(basename "$file" .sql)"
  checksum="$(db_sha256 "$file")"
  applied_checksum="$(db_psql_capture -c "SELECT checksum FROM app.schema_migrations WHERE version = '$version';" | head -n 1)"

  if [ -n "$applied_checksum" ]; then
    if [ "$applied_checksum" != "$checksum" ]; then
      echo "Checksum divergente em $version. Crie uma nova migração em vez de alterar a existente." >&2
      exit 1
    fi
    echo "= $version (já aplicada)"
    continue
  fi

  pending+=("$version|$file|$checksum")
done

if [ "${#pending[@]}" -eq 0 ]; then
  if [ "$dry_run" -eq 0 ]; then
    "$SCRIPT_DIR/db-roles.sh"
  fi
  echo "Nenhuma migração pendente."
  exit 0
fi

if [ "$dry_run" -eq 1 ]; then
  echo "Migrações pendentes:"
  for item in "${pending[@]}"; do
    IFS='|' read -r version _ _ <<< "$item"
    echo "  - $version"
  done
  exit 0
fi

# Garante papéis/default privileges antes de criar novas tabelas.
"$SCRIPT_DIR/db-roles.sh"

for item in "${pending[@]}"; do
  IFS='|' read -r version file checksum <<< "$item"
  container_path="/opt/ilharole-db/migrations/$(basename "$file")"
  echo "+ $version"
  db_psql --single-transaction \
    -f "$container_path" \
    -c "INSERT INTO app.schema_migrations (version, checksum) VALUES ('$version', '$checksum');" \
    >/dev/null
done

echo "Migrações aplicadas: ${#pending[@]}."
