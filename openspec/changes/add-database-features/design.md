# Design

## Decisões

### Init x migrações

O entrypoint do PostgreSQL só executa `devops/db/init/` em volume novo. Por
isso, init cuida apenas do que é global e raramente muda: extensões, schemas,
tabela de controle e papéis. Tudo que evolui (tabelas, índices, funções e
views) fica em migrações versionadas, aplicadas por `db-migrate`.

O runner também faz bootstrap idempotente de extensões e schemas. Assim, um
volume criado antes desta mudança consegue receber as migrações sem precisar
ser apagado.

### Checksum das migrações

Cada arquivo é aplicado em uma transação junto com o registro em
`app.schema_migrations`. O SHA-256 é calculado localmente e comparado com o
valor registrado. Se uma migração antiga mudar, o runner falha e exige uma nova
migração, evitando divergência silenciosa entre ambientes.

### Papéis

`POSTGRES_USER` continua sendo o owner usado por migrações e seed.
`ILHAROLE_APP_USER` recebe DML em `app`, leitura em `analytics` e execução de
funções; `ILHAROLE_READONLY_USER` recebe apenas leitura. A aplicação não pode
alterar `app.schema_migrations`.

### Busca

A busca textual usa `tsvector` gerado a partir de `title` e `description` em
português, com índice GIN. A busca aproximada usa `pg_trgm`. A busca por
proximidade usa `cube` + `earthdistance` e um índice GiST na expressão
`ll_to_earth(latitude, longitude)`.

### Analytics

Views normais resolvem leitura em tempo real. `mv_daily_event_stats` é uma
materialized view com índice único para permitir `REFRESH ... CONCURRENTLY`.
O refresh é feito fora da transação do seed, por uma função `SECURITY DEFINER`.

### Perfis Docker

pgAdmin, PgBouncer, exporter e backup ficam atrás de `profiles` para não
aumentar o consumo nem a superfície padrão. O PgBouncer usa `pool_mode=session`
e `AUTH_TYPE=scram-sha-256` por padrão para funcionar com o asyncpg e com a
política de senha do PostgreSQL local.

### Porta do banco

O serviço `db` publica a porta apenas no loopback do host
(`127.0.0.1:${POSTGRES_EXPOSE_PORT}`), o que permite DBeaver/psql sem expor o
PostgreSQL para a rede local.

## Riscos e mitigações

- **Alterar migração aplicada:** checksum detecta e falha.
- **Volume antigo sem papéis:** documentado rodar `02-roles.sh` manualmente;
  o runner cobre extensões/schemas.
- **PgBouncer quebrando prepared statements:** modo `session` por padrão e
  `DB_STATEMENT_CACHE_SIZE=0` documentado para `transaction`.
- **Materialized view desatualizada:** função de refresh documentada e
  chamada no seed.
- **Backup apenas em volume Docker:** documentado copiar para fora do host.
