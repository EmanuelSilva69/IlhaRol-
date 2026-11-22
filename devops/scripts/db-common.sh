#!/usr/bin/env bash
# Utilitários compartilhados pelos scripts de banco (Linux/macOS).
# Uso: . "$SCRIPT_DIR/db-common.sh"

db_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd
}

DB_DEVOPS_ROOT="$(db_root)"
DB_COMPOSE="$DB_DEVOPS_ROOT/docker-compose.yml"
DB_CONTAINER_ROOT="/opt/ilharole-db"

# No Git Bash/MSYS, caminhos absolutos de contêiner (-f /opt/...) são
# convertidos para caminhos Windows. cygpath resolve o caminho do Compose e
# MSYS_NO_PATHCONV evita a conversão dos caminhos internos do contêiner.
if command -v cygpath >/dev/null 2>&1; then
  DB_COMPOSE="$(cygpath -w "$DB_COMPOSE")"
fi

db_compose() {
  MSYS_NO_PATHCONV=1 docker compose -f "$DB_COMPOSE" "$@"
}

db_load_env() {
  local env_file="$DB_DEVOPS_ROOT/.env"
  if [ -f "$env_file" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$env_file"
    set +a
  fi

  : "${POSTGRES_USER:=ilharole}"
  : "${POSTGRES_DB:=ilharole}"
  : "${POSTGRES_PASSWORD:=}"
  : "${POSTGRES_HOST:=db}"
  : "${POSTGRES_PORT:=5432}"
  : "${ILHAROLE_APP_USER:=ilharole_app}"
  : "${ILHAROLE_APP_PASSWORD:=change-me-app}"
  : "${ILHAROLE_READONLY_USER:=ilharole_readonly}"
  : "${ILHAROLE_READONLY_PASSWORD:=change-me-readonly}"
  export POSTGRES_USER POSTGRES_DB POSTGRES_PASSWORD POSTGRES_HOST POSTGRES_PORT
  export ILHAROLE_APP_USER ILHAROLE_APP_PASSWORD
  export ILHAROLE_READONLY_USER ILHAROLE_READONLY_PASSWORD
}

db_assert_running() {
  if ! db_compose ps -q db | grep -q .; then
    echo "O serviço 'db' não está em execução. Suba com: docker compose -f devops/docker-compose.yml up -d db" >&2
    exit 1
  fi
}

db_psql() {
  db_compose exec -T db \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --quiet "$@"
}

db_psql_capture() {
  db_compose exec -T db \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --quiet -t -A -F '|' "$@"
}

db_psql_file() {
  local relative_path="$1"
  shift
  db_psql -f "$DB_CONTAINER_ROOT/$relative_path" "$@"
}

db_sha256() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  else
    shasum -a 256 "$file" | awk '{print $1}'
  fi
}
