# Banco de dados — IlhaRolê

O PostgreSQL roda no serviço `db` do `devops/docker-compose.yml` com uma
configuração própria (`devops/db/postgresql.conf`) e scripts versionados.
O catálogo completo de recursos está em [`FEATURES.md`](FEATURES.md).

## Conexão

| Item | Valor |
| --- | --- |
| Host (dentro dos contêineres) | `db` |
| Porta interna | `5432` |
| Banco | `POSTGRES_DB` (padrão `ilharole`) |
| Usuário owner | `POSTGRES_USER` (padrão `ilharole`) |
| Papel da aplicação | `ILHAROLE_APP_USER` (padrão `ilharole_app`) |
| Papel somente leitura | `ILHAROLE_READONLY_USER` (padrão `ilharole_readonly`) |
| Senhas | `devops/.env` |

A porta do banco é publicada apenas no loopback do host
(`127.0.0.1:${POSTGRES_EXPOSE_PORT}`). Para acessar pelo terminal:

```powershell
.\devops\scripts\db-shell.ps1
```

```bash
./devops/scripts/db-shell.sh
```

Ou diretamente:

```bash
docker compose -f devops/docker-compose.yml exec db \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Para usar DBeaver, psql ou outro cliente no host, conecte em
`localhost:${POSTGRES_EXPOSE_PORT}` (padrão `5432`) com as credenciais do
`devops/.env`.

## Inicialização x migrações

Há duas camadas:

1. **Init** (`devops/db/init/`): roda apenas na primeira criação do volume.
   Cria extensões, schemas, a tabela `app.schema_migrations` e os papéis de
   aplicação.
2. **Migrações** (`devops/db/migrations/`): rodam sob demanda com
   `db-migrate` e criam/alteram tabelas, índices, funções e views.

Para aplicar migrações:

```powershell
.\devops\scripts\db-migrate.ps1
```

```bash
./devops/scripts/db-migrate.sh
```

Cada migração é registrada com SHA-256 em `app.schema_migrations`. O runner
recusa migrações já aplicadas cujo arquivo mudou. Para ver o que está pendente:

```powershell
.\devops\scripts\db-migrate.ps1 -DryRun
```

```bash
./devops/scripts/db-migrate.sh --dry-run
```

Se precisar recriar tudo do zero:

```powershell
.\devops\scripts\db-reset.ps1 -Force
```

```bash
./devops/scripts/db-reset.sh --force
```

> `db-reset` apaga os schemas `app`, `audit` e `analytics`, mas preserva as
> extensões. Use com consciência.

## Seed de demonstração

O seed cria usuários, 10 categorias, 5 locais, 10 eventos, favoritos,
avaliações e notificações. É idempotente.

```powershell
.\devops\scripts\db-seed.ps1
```

```bash
./devops/scripts/db-seed.sh
```

## Schema

| Schema | Conteúdo |
| --- | --- |
| `app` | usuários, interesses, preferências, categorias, locais, eventos, favoritos, avaliações, notificações, denúncias e tokens de recuperação |
| `audit` | log genérico de alterações e retenção |
| `analytics` | views, materialized view e painel de saúde |

### Busca e mapa

- `app.search_events('termo')`: full-text em português com ranking.
- `app.search_events_fuzzy('termo')`: similaridade por trigramas.
- `app.events_near(lat, lng, raio_km)`: eventos próximos de um ponto.
- `analytics.v_upcoming_events`: agenda dos próximos 30 dias com coordenadas.

### Auditoria

A aplicação pode registrar o autor da alteração na mesma transação:

```sql
SET LOCAL app.current_user_id = '00000000-0000-4000-8000-000000000001';
UPDATE app.events SET title = 'Novo título' WHERE id = '...';
```

O trigger grava `old_data`/`new_data` em `audit.log`. Retenção manual:

```sql
SELECT audit.purge_older_than(90);
```

## Verificação e diagnóstico

```powershell
.\devops\scripts\db-check.ps1   # estrutura
.\devops\scripts\db-test.ps1    # smoke tests com rollback
.\devops\scripts\db-stats.ps1   # tamanho, conexões, cache, índices e queries lentas
.\devops\scripts\db-logs.ps1    # logs do serviço db
.\devops\scripts\db-roles.ps1   # reaplica papéis e grants
```

```bash
./devops/scripts/db-check.sh
./devops/scripts/db-test.sh
./devops/scripts/db-stats.sh
./devops/scripts/db-logs.sh
./devops/scripts/db-roles.sh
```

## Backup e restauração

Backup SQL simples:

```powershell
.\devops\scripts\db-backup.ps1
```

```bash
./devops/scripts/db-backup.sh
```

O arquivo padrão é `ilharole-backup.sql`. Para restaurar:

```powershell
.\devops\scripts\db-restore.ps1 .\ilharole-backup.sql
```

```bash
./devops/scripts/db-restore.sh ./ilharole-backup.sql
```

A restauração recria `app`, `audit` e `analytics` antes de importar. Use
`--force` (PowerShell: `-Force`) para pular a confirmação em automação.

Para backup automático com retenção:

```bash
docker compose -f devops/docker-compose.yml --profile backup up -d backup
```

Os arquivos ficam no volume `ilharole_backups`. Copie-os para fora do host
periodicamente; volume Docker não substitui backup durável.

## Ferramentas opcionais

| Perfil | Serviço | Endereço |
| --- | --- | --- |
| `tools` | pgAdmin | http://localhost:5050 |
| `pool` | PgBouncer | localhost:6432 |
| `observability` | postgres-exporter | http://localhost:9187/metrics |
| `backup` | backup automático | volume `ilharole_backups` |

```bash
docker compose -f devops/docker-compose.yml --profile tools up -d pgadmin
docker compose -f devops/docker-compose.yml --profile observability up -d postgres-exporter
```

## Problemas comuns

- **Papéis ausentes em volume antigo:** rode `db-roles` (ou `02-roles.sh`
  manualmente) para recriar papéis/grants; recrie o volume com `down -v` só se
  aceitar perder dados.
- **Mudanças em `db/init/` não aparecem:** init só roda em volume novo.
  Migrações são o caminho para evoluir um banco existente.
- **`pg_stat_statements` indisponível:** confirme `shared_preload_libraries`
  em `postgresql.conf` e reinicie o serviço.
- **PgBouncer com asyncpg:** use `pool_mode=session` ou configure
  `DB_STATEMENT_CACHE_SIZE=0` na API.
- **Porta 5432 já em uso:** altere `POSTGRES_EXPOSE_PORT` no `.env`; a porta é
  publicada apenas no loopback do host.
