# Tasks

## 1. Banco e schema

- [x] 1.1 Adicionar `devops/db/postgresql.conf` com tuning, timezone, log de queries lentas e `pg_stat_statements`.
- [x] 1.2 Reescrever `devops/db/init/01-init.sql` com extensões, schemas `app`/`audit`/`analytics` e `app.schema_migrations`.
- [x] 1.3 Criar `devops/db/init/02-roles.sh` com papéis `app` e `readonly`, grants e default privileges.
- [x] 1.4 Criar migração de domínio com constraints, soft delete, `updated_at` e trigger.
- [x] 1.5 Criar migração de auditoria com `audit.log`, trigger genérica e retenção.
- [x] 1.6 Criar migração de índices, busca full-text, trigramas e busca geográfica.
- [x] 1.7 Criar migração de views e materialized view de analytics.

## 2. Operação

- [x] 2.1 Criar runner de migrações PowerShell/Bash com checksum e detecção de drift.
- [x] 2.2 Criar seed de demonstração idempotente.
- [x] 2.3 Criar scripts de reset e restore com confirmação.
- [x] 2.4 Criar scripts de diagnóstico, verificação estrutural e smoke tests.
- [x] 2.5 Criar scripts de logs e utilitários compartilhados.
- [x] 2.6 Criar script de reaplicação de papéis/grants e integrá-lo a migrate/restore.
- [x] 2.7 Publicar a porta do PostgreSQL apenas no loopback do host.

## 3. Docker e perfis

- [x] 3.1 Montar configuração, init e scripts no serviço `db`.
- [x] 3.2 Adicionar perfis `tools` (pgAdmin), `pool` (PgBouncer), `observability` (exporter) e `backup`.
- [x] 3.3 Adicionar variáveis de pool de conexões ao serviço `api` e ao back-end.
- [x] 3.4 Validar `docker compose config` para o arquivo principal e perfis.

## 4. Qualidade e documentação

- [x] 4.1 Adicionar workflow de CI para init, migrações, seed, verificação e smoke tests.
- [x] 4.2 Criar `devops/db/FEATURES.md` com o catálogo de 24 features.
- [x] 4.3 Atualizar `devops/db/README.md`, `devops/README.md`, `README.md` e `backend/README.md`.
- [x] 4.4 Validar sintaxe SQL com parser PostgreSQL e sintaxe dos scripts PowerShell/Bash.
- [x] 4.5 Testar init, migrações, seed, reset, restore, check, stats e smoke tests em volume novo.
- [x] 4.6 Testar scripts PowerShell e Bash, incluindo Git Bash no Windows.
- [x] 4.7 Testar perfis pgAdmin, PgBouncer, exporter e backup.

## Workflow follow-up

- Revisar o diff e commitar a mudança.
- Arquivar a mudança após a revisão.
