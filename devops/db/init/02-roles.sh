#!/usr/bin/env bash
# Cria/atualiza os papéis de menor privilégio do IlhaRolê.
# Executado pelo entrypoint do PostgreSQL somente na criação do volume.
# Também pode ser rodado manualmente:
#   docker compose -f devops/docker-compose.yml exec db bash /opt/ilharole-db/init/02-roles.sh
set -euo pipefail

app_user="${ILHAROLE_APP_USER:-ilharole_app}"
readonly_user="${ILHAROLE_READONLY_USER:-ilharole_readonly}"
app_password="${ILHAROLE_APP_PASSWORD:-change-me-app}"
readonly_password="${ILHAROLE_READONLY_PASSWORD:-change-me-readonly}"

psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    -v owner="$POSTGRES_USER" \
    -v db_name="$POSTGRES_DB" \
    -v app_user="$app_user" \
    -v app_password="$app_password" \
    -v readonly_user="$readonly_user" \
    -v readonly_password="$readonly_password" <<'EOSQL'
SELECT format('CREATE ROLE %I LOGIN', :'app_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user') \gexec
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'app_user', :'app_password') \gexec

SELECT format('CREATE ROLE %I LOGIN', :'readonly_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'readonly_user') \gexec
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'readonly_user', :'readonly_password') \gexec

ALTER ROLE :"app_user" SET search_path = app, public;
ALTER ROLE :"readonly_user" SET search_path = app, analytics, public;

GRANT CONNECT ON DATABASE :"db_name" TO :"app_user", :"readonly_user";

GRANT USAGE ON SCHEMA app TO :"app_user", :"readonly_user";
GRANT USAGE ON SCHEMA analytics TO :"app_user", :"readonly_user";
GRANT USAGE ON SCHEMA audit TO :"readonly_user";

-- Objetos que já existem (normalmente nenhum no primeiro boot).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO :"app_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO :"app_user";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO :"app_user";
GRANT SELECT ON ALL TABLES IN SCHEMA app TO :"readonly_user";
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO :"readonly_user", :"app_user";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA analytics TO :"readonly_user", :"app_user";
GRANT SELECT ON ALL TABLES IN SCHEMA audit TO :"readonly_user";

-- A aplicação não deve alterar o controle de migrações.
REVOKE INSERT, UPDATE, DELETE ON app.schema_migrations FROM :"app_user";

-- Objetos criados depois (migrações e seeds rodam como o owner do banco).
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner" IN SCHEMA app
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner" IN SCHEMA app
    GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner" IN SCHEMA app
    GRANT EXECUTE ON FUNCTIONS TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner" IN SCHEMA app
    GRANT SELECT ON TABLES TO :"readonly_user";

ALTER DEFAULT PRIVILEGES FOR ROLE :"owner" IN SCHEMA analytics
    GRANT SELECT ON TABLES TO :"readonly_user", :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner" IN SCHEMA analytics
    GRANT EXECUTE ON FUNCTIONS TO :"readonly_user", :"app_user";

ALTER DEFAULT PRIVILEGES FOR ROLE :"owner" IN SCHEMA audit
    GRANT SELECT ON TABLES TO :"readonly_user";

SELECT 'IlhaRolê: papéis de aplicação configurados' AS status;
EOSQL
