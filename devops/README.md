# DevOps — IlhaRolê

Esta pasta concentra Docker, PostgreSQL, variáveis de ambiente e scripts de apoio. É o ponto de trabalho da equipe de DB/DevOps.

## Estrutura

```text
devops/
├── .env.example
├── docker-compose.yml
├── docker/
│   ├── backend.Dockerfile
│   └── frontend.Dockerfile
├── db/
│   ├── FEATURES.md
│   ├── README.md
│   ├── postgresql.conf
│   ├── init/
│   │   ├── 01-init.sql
│   │   └── 02-roles.sh
│   ├── migrations/
│   ├── seeds/
│   └── diagnostics/
└── scripts/
    ├── db-backup.ps1
    ├── db-backup.sh
    ├── db-check.ps1
    ├── db-check.sh
    ├── db-common.ps1
    ├── db-common.sh
    ├── db-logs.ps1
    ├── db-logs.sh
    ├── db-migrate.ps1
    ├── db-migrate.sh
    ├── db-reset.ps1
    ├── db-reset.sh
    ├── db-restore.ps1
    ├── db-restore.sh
    ├── db-roles.ps1
    ├── db-roles.sh
    ├── db-seed.ps1
    ├── db-seed.sh
    ├── db-shell.ps1
    ├── db-shell.sh
    ├── db-stats.ps1
    ├── db-stats.sh
    ├── db-test.ps1
    └── db-test.sh
```

## Primeira execução

A partir da raiz do repositório:

```powershell
Copy-Item devops\.env.example devops\.env
docker compose -f devops/docker-compose.yml up --build -d
docker compose -f devops/docker-compose.yml ps
```

```bash
cp devops/.env.example devops/.env
docker compose -f devops/docker-compose.yml up --build -d
docker compose -f devops/docker-compose.yml ps
```

O Compose lê `devops/.env` automaticamente porque o arquivo está ao lado do `docker-compose.yml`.

## Serviços

| Serviço | Endereço | Observação |
| --- | --- | --- |
| `web` | http://localhost:5173 | React/Vite com hot reload |
| `api` | http://localhost:8000 | FastAPI; documentação em `/docs` |
| `db` | `localhost:5432` (loopback) | PostgreSQL 16; porta configurável em `POSTGRES_EXPOSE_PORT` |
| `pgadmin` | http://localhost:5050 | Perfil `tools` |
| `pgbouncer` | localhost:6432 | Perfil `pool` |
| `postgres-exporter` | http://localhost:9187/metrics | Perfil `observability` |
| `backup` | volume `ilharole_backups` | Perfil `backup` |

## Perfis opcionais

Os serviços de banco além do `db` não sobem por padrão:

```bash
docker compose -f devops/docker-compose.yml --profile tools up -d pgadmin
docker compose -f devops/docker-compose.yml --profile pool up -d pgbouncer
docker compose -f devops/docker-compose.yml --profile observability up -d postgres-exporter
docker compose -f devops/docker-compose.yml --profile backup up -d backup
```

## Comandos úteis

```bash
# logs
docker compose -f devops/docker-compose.yml logs -f api

# parar sem apagar dados
docker compose -f devops/docker-compose.yml down

# apagar também o volume do banco (ação destrutiva)
docker compose -f devops/docker-compose.yml down -v

# reconstruir um serviço
docker compose -f devops/docker-compose.yml up -d --build web
```

## Variáveis

| Variável | Padrão | Uso |
| --- | --- | --- |
| `POSTGRES_DB` | `ilharole` | Banco criado pelo PostgreSQL |
| `POSTGRES_USER` | `ilharole` | Usuário owner do banco |
| `POSTGRES_PASSWORD` | `change-me-in-local-env` | Senha local |
| `POSTGRES_HOST` | `db` | Host interno usado pela API |
| `POSTGRES_PORT` | `5432` | Porta interna |
| `API_PORT` | `8000` | Porta da API no host |
| `WEB_PORT` | `5173` | Porta da interface no host |
| `CORS_ORIGINS` | `http://localhost:5173` | Origem autorizada |
| `CARTO_API_KEY` | vazio | Chave dos Basemaps CARTO; fica só no `.env` local |
| `DB_POOL_SIZE` | `10` | Conexões mantidas no pool da API |
| `DB_MAX_OVERFLOW` | `20` | Conexões extras permitidas |
| `DB_POOL_RECYCLE` | `1800` | Reciclagem de conexões (segundos) |
| `DB_CONNECT_TIMEOUT` | `5` | Timeout de conexão com o banco (segundos) |
| `DB_STATEMENT_CACHE_SIZE` | `100` | Cache de prepared statements do asyncpg; use `0` com PgBouncer em transaction |
| `ILHAROLE_APP_USER` | `ilharole_app` | Papel DML da aplicação |
| `ILHAROLE_APP_PASSWORD` | `change-me-app` | Senha do papel da aplicação |
| `ILHAROLE_READONLY_USER` | `ilharole_readonly` | Papel somente leitura |
| `ILHAROLE_READONLY_PASSWORD` | `change-me-readonly` | Senha do papel somente leitura |
| `TZ` | `America/Fortaleza` | Fuso do banco e dos backups |
| `POSTGRES_EXPOSE_PORT` | `5432` | Porta do Postgres no loopback do host |
| `PGADMIN_*` | ver `.env.example` | Credenciais/porta do pgAdmin |
| `PGBOUNCER_*` | ver `.env.example` | Porta, modo e limites do PgBouncer |
| `BACKUP_*` | ver `.env.example` | Agendamento e retenção do backup |

O `.env` é ignorado pelo Git. Nunca versione credenciais reais.

A chave `CARTO_API_KEY` é repassada ao front-end como `VITE_CARTO_API_KEY`. Como o Vite injeta variáveis `VITE_*` no bundle do navegador, essa chave é pública em tempo de execução. Restrinja os domínios permitidos no painel da CARTO e nunca use essa chave para operações sensíveis.

## Banco de dados

Os scripts em `devops/db/init/` rodam apenas na primeira criação do volume.
As evoluções de schema ficam em `devops/db/migrations/` e são aplicadas com o
runner, que registra versão e checksum em `app.schema_migrations`.

Consulte [`db/README.md`](db/README.md) para conexão, migrações, reset, backup e
restauração, e [`db/FEATURES.md`](db/FEATURES.md) para o catálogo de recursos.

```powershell
# abrir o psql
.\devops\scripts\db-shell.ps1

# executar uma consulta
.\devops\scripts\db-shell.ps1 "SELECT version();"

# aplicar migrações e seed
.\devops\scripts\db-migrate.ps1
.\devops\scripts\db-roles.ps1
.\devops\scripts\db-seed.ps1

# verificar e testar
.\devops\scripts\db-check.ps1
.\devops\scripts\db-test.ps1
.\devops\scripts\db-stats.ps1

# gerar e restaurar backup
.\devops\scripts\db-backup.ps1
.\devops\scripts\db-restore.ps1 .\ilharole-backup.sql
```

```bash
./devops/scripts/db-shell.sh
./devops/scripts/db-shell.sh "SELECT version();"
./devops/scripts/db-migrate.sh
./devops/scripts/db-roles.sh
./devops/scripts/db-seed.sh
./devops/scripts/db-check.sh
./devops/scripts/db-test.sh
./devops/scripts/db-stats.sh
./devops/scripts/db-backup.sh
./devops/scripts/db-restore.sh ./ilharole-backup.sql
```

Para acessar o banco pelo host (DBeaver, psql), conecte em
`localhost:${POSTGRES_EXPOSE_PORT}`. A porta é publicada apenas no loopback do
host e configurada no próprio `devops/docker-compose.yml`.

```bash
docker compose -f devops/docker-compose.yml up -d db
```

## Dockerfiles

Os Dockerfiles ficam em `devops/docker/` e são referenciados pelo Compose com contextos separados:

- `backend.Dockerfile` usa o contexto `../backend`;
- `frontend.Dockerfile` usa o contexto `../frontend`.

Assim, cada imagem instala apenas as dependências da sua aplicação.

## Problemas comuns

- **Porta ocupada:** altere `API_PORT` ou `WEB_PORT` no `devops/.env` e recrie os serviços.
- **Variáveis vazias:** confirme que `devops/.env` existe e foi criado a partir de `.env.example`.
- **Mudanças no banco não aparecem:** scripts de `db/init/` só rodam em volume novo. Use migrações (`db-migrate`) para evoluir o schema; `down -v` recria tudo e apaga dados.
- **Papéis `ilharole_app`/`ilharole_readonly` ausentes:** o `02-roles.sh` só roda no volume novo. Execute `db-roles` ou recrie o volume.
- **PgBouncer e prepared statements:** mantenha `PGBOUNCER_POOL_MODE=session` ou use `DB_STATEMENT_CACHE_SIZE=0` na API.
- **Docker daemon indisponível:** inicie o Docker Desktop e aguarde o motor ficar pronto.
