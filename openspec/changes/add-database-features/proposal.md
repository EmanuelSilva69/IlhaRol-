# Proposal

## Why

A base do IlhaRolê já tem PostgreSQL e Docker, mas o banco ainda é um ponto de
partida vazio: não há schema de domínio, migrações, papéis de menor privilégio,
busca, observabilidade ou rotinas de operação. A equipe de DB/Dockerização
precisa de uma base utilizável pelas demais equipes sem transformar cada
necessidade em alteração manual no banco local.

## What Changes

- Adicionar configuração própria do PostgreSQL para desenvolvimento e
  observabilidade (`pg_stat_statements`, log de queries lentas, timeouts).
- Criar init idempotente com extensões, schemas `app`, `audit` e `analytics`,
  além dos papéis `app` e `readonly`.
- Criar schema de domínio para usuários, categorias, locais, eventos,
  favoritos, avaliações e notificações, com constraints e triggers.
- Adicionar auditoria genérica com ator e retenção.
- Adicionar busca full-text em português, busca aproximada por trigramas e
  busca geográfica por raio.
- Adicionar views e materialized view de analytics.
- Adicionar migrações versionadas com checksum, seed, reset, restore,
  diagnóstico, verificação e smoke tests.
- Adicionar perfis Docker opcionais: pgAdmin, PgBouncer, backup automático e
  métricas Prometheus.
- Publicar a porta do PostgreSQL apenas no loopback do host.
- Adicionar CI que aplica init, migrações, seed e smoke tests em PostgreSQL 16.
- Documentar o catálogo em `devops/db/FEATURES.md`.

## Capabilities

### New Capabilities

- `database-foundation`: schema, migrações, papéis, seed e busca.
- `database-operations`: backup, restore, reset, diagnóstico e perfis Docker.
- `database-quality`: verificação estrutural, smoke tests e CI.

### Modified Capabilities

Nenhuma. As rotas atuais da API continuam iguais; o pool de conexões passa a
ser configurável por variáveis de ambiente.

## Impact

- **Banco:** novas extensões, schemas, tabelas, funções, views e triggers.
- **Docker:** serviço `db` com configuração, volume de scripts e porta local
  no loopback; serviços opcionais atrás de `profiles`.
- **Back-end:** pool e `statement_cache_size` configuráveis; nenhum endpoint
  novo.
- **Operação:** novos scripts PowerShell/Bash e workflow de CI.
- **Fora de escopo:** autenticação, endpoints de negócio, RLS e ambiente de
  produção.
