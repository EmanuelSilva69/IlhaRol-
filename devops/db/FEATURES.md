# Features de banco — IlhaRolê

Conjunto de recursos de banco e dockerização adicionados à base do projeto.
A maioria funciona sem subir serviços extras; os perfis opcionais ficam atrás
de `profiles` do Docker Compose.

## Visão rápida

| # | Feature | Onde |
| --- | --- | --- |
| 1 | Configuração de performance e observabilidade do PostgreSQL | `db/postgresql.conf` |
| 2 | Extensões: pgcrypto, citext, unaccent, pg_trgm, btree_gin, cube, earthdistance e pg_stat_statements | `db/init/01-init.sql` |
| 3 | Schemas `app`, `audit` e `analytics` | `db/init/01-init.sql` |
| 4 | Papéis de menor privilégio (`app` e `readonly`) + script de reaplicação | `db/init/02-roles.sh`, `scripts/db-roles.*` |
| 5 | Schema de domínio com constraints reais | `db/migrations/0001_domain_schema.sql` |
| 6 | `updated_at` automático por trigger | `db/migrations/0001_domain_schema.sql` |
| 7 | Auditoria genérica com ator e retenção | `db/migrations/0002_audit.sql` |
| 8 | Busca full-text em português com ranking | `db/migrations/0003_indexes_and_search.sql` |
| 9 | Busca aproximada por trigramas (autocomplete) | `db/migrations/0003_indexes_and_search.sql` |
| 10 | Busca por proximidade geográfica (raio em km) | `db/migrations/0003_indexes_and_search.sql` |
| 11 | Views e materialized view de analytics | `db/migrations/0004_analytics.sql` |
| 12 | Migrações versionadas com checksum e detecção de drift | `scripts/db-migrate.{ps1,sh}` |
| 13 | Seed de demonstração idempotente | `db/seeds/0001_demo.sql` |
| 14 | Reset controlado (schemas + migrações + seed) | `scripts/db-reset.{ps1,sh}` |
| 15 | Restauração de backup com confirmação | `scripts/db-restore.{ps1,sh}` |
| 16 | Diagnóstico de tamanho, conexões, cache, índices e queries lentas | `scripts/db-stats.{ps1,sh}` |
| 17 | Verificação estrutural do banco | `scripts/db-check.{ps1,sh}` |
| 18 | Smoke tests transacionais de banco | `scripts/db-test.{ps1,sh}` |
| 19 | Porta do Postgres publicada apenas no loopback do host (`POSTGRES_EXPOSE_PORT`) | `docker-compose.yml` |
| 20 | pgAdmin por perfil | profile `tools` |
| 21 | PgBouncer por perfil | profile `pool` |
| 22 | Backup automático com retenção | profile `backup` |
| 23 | Métricas Prometheus | profile `observability` |
| 24 | CI de migrações, seed, verificação e smoke tests | `.github/workflows/db-ci.yml` |

## Comandos do dia a dia

```powershell
# Aplicar migrações pendentes
.\devops\scripts\db-migrate.ps1

# Reaplicar papéis/grants (volume antigo ou após reset)
.\devops\scripts\db-roles.ps1

# Ver o que está pendente, sem aplicar
.\devops\scripts\db-migrate.ps1 -DryRun

# Aplicar seed de demonstração
.\devops\scripts\db-seed.ps1

# Recriar schemas, migrações e seed (destrutivo)
.\devops\scripts\db-reset.ps1 -Force

# Verificar estrutura
.\devops\scripts\db-check.ps1

# Rodar smoke tests (rollback automático)
.\devops\scripts\db-test.ps1

# Diagnóstico
.\devops\scripts\db-stats.ps1

# Restaurar backup
.\devops\scripts\db-restore.ps1 .\ilharole-backup.sql
```

```bash
./devops/scripts/db-migrate.sh
./devops/scripts/db-roles.sh
./devops/scripts/db-migrate.sh --dry-run
./devops/scripts/db-seed.sh
./devops/scripts/db-reset.sh --force
./devops/scripts/db-check.sh
./devops/scripts/db-test.sh
./devops/scripts/db-stats.sh
./devops/scripts/db-restore.sh ./ilharole-backup.sql
```

## Perfis opcionais

```bash
# pgAdmin em http://localhost:5050
docker compose -f devops/docker-compose.yml --profile tools up -d pgadmin

# PgBouncer em localhost:6432
docker compose -f devops/docker-compose.yml --profile pool up -d pgbouncer

# Backup automático diário em volume Docker
docker compose -f devops/docker-compose.yml --profile backup up -d backup

# Métricas em http://localhost:9187/metrics
docker compose -f devops/docker-compose.yml --profile observability up -d postgres-exporter
```

Combine perfis:

```bash
docker compose -f devops/docker-compose.yml --profile tools --profile observability up -d
```

## Acesso pelo host

O Postgres é publicado apenas em `127.0.0.1`, na porta
`POSTGRES_EXPOSE_PORT` (padrão `5432`). Para usar DBeaver/psql no host:

```bash
docker compose -f devops/docker-compose.yml up -d db
```

Conecte em `localhost:5432` com `POSTGRES_USER`/`POSTGRES_PASSWORD`.

## Migrações

- Arquivos em `devops/db/migrations/`, ordem lexicográfica.
- Cada arquivo é aplicado uma única vez e registrado em `app.schema_migrations`.
- O runner compara o SHA-256 local com o registrado; se uma migração antiga
  mudar, ele falha com "Checksum divergente". Nesse caso, crie uma nova
  migração em vez de editar a antiga.
- Os arquivos são montados no contêiner em `/opt/ilharole-db`, então o runner
  não depende de copiar arquivos nem de publicar a porta do banco.

## Papéis

| Papel | Uso |
| --- | --- |
| `POSTGRES_USER` (ex.: `ilharole`) | owner/superusuário local, usado pelas migrações |
| `ILHAROLE_APP_USER` (ex.: `ilharole_app`) | DML em `app`, leitura em `analytics` |
| `ILHAROLE_READONLY_USER` (ex.: `ilharole_readonly`) | leitura em `app`, `analytics` e `audit` |

As senhas vêm de `devops/.env`. Em um volume já existente, os papéis não são
criados automaticamente; rode:

```bash
docker compose -f devops/docker-compose.yml exec db bash /opt/ilharole-db/init/02-roles.sh
```

## Observações de segurança

- `db/postgresql.conf` habilita `pg_stat_statements` e log de queries acima de
  500 ms; isso é adequado ao ambiente local, não a produção.
- O PgBouncer usa `AUTH_TYPE=scram-sha-256` e `pool_mode=session` por padrão
  para manter compatibilidade com os prepared statements do asyncpg. Para usar
  `pool_mode=transaction`, configure `DB_STATEMENT_CACHE_SIZE=0` na API.
- O backup automático grava no volume `ilharole_backups`; copie os arquivos
  para fora do host/volume antes de considerar o backup durável.
