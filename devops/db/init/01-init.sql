-- Executado apenas na primeira criação do volume do PostgreSQL.
-- Extensões, schemas e a tabela de controle de migrações vivem aqui.
-- As tabelas de domínio são criadas por devops/db/migrations/.

-- Extensões base
CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- gen_random_uuid() e crypt()
CREATE EXTENSION IF NOT EXISTS citext;        -- e-mails e slugs case-insensitive
CREATE EXTENSION IF NOT EXISTS unaccent;      -- buscas sem acento
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- busca aproximada por similaridade
CREATE EXTENSION IF NOT EXISTS btree_gin;     -- índices GIN compostos
CREATE EXTENSION IF NOT EXISTS cube;          -- dependência de earthdistance
CREATE EXTENSION IF NOT EXISTS earthdistance; -- distância entre coordenadas

-- pg_stat_statements depende de shared_preload_libraries.
-- A configuração local já habilita a biblioteca; fora dela, apenas avisamos.
DO $do$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'pg_stat_statements indisponível: %', SQLERRM;
    END;
END;
$do$;

-- Schemas por responsabilidade
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS analytics;

COMMENT ON SCHEMA app IS 'Tabelas e funções de domínio do IlhaRolê';
COMMENT ON SCHEMA audit IS 'Trilha de auditoria e retenção';
COMMENT ON SCHEMA analytics IS 'Views, métricas e materialized views de leitura';

-- Controle de versão das migrações (o runner também garante a existência).
CREATE TABLE IF NOT EXISTS app.schema_migrations (
    version text PRIMARY KEY,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE app.schema_migrations IS 'Migrações SQL aplicadas e seus checksums SHA-256';

SELECT 'IlhaRolê: banco inicializado' AS status;
