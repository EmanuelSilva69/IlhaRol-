-- Diagnóstico rápido do banco. Somente leitura.
\pset pager off
\pset border 2

\echo ''
\echo '== Versão e tamanho =='
SELECT
    version() AS postgres_version,
    current_database() AS database,
    pg_size_pretty(pg_database_size(current_database())) AS database_size,
    now() - pg_postmaster_start_time() AS uptime;

\echo ''
\echo '== Conexões =='
SELECT
    COALESCE(state, 'background') AS state,
    count(*) AS connections
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state
ORDER BY connections DESC;

\echo ''
\echo '== Cache hit ratio (quanto maior, melhor) =='
SELECT
    round(100.0 * sum(blks_hit) / NULLIF(sum(blks_hit + blks_read), 0), 2) AS cache_hit_pct,
    sum(blks_read) AS blocks_read,
    sum(blks_hit) AS blocks_hit
FROM pg_stat_database
WHERE datname = current_database();

\echo ''
\echo '== Maiores tabelas =='
SELECT
    schemaname,
    relname AS table_name,
    n_live_tup AS live_rows,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 15;

\echo ''
\echo '== Índices menos usados =='
SELECT
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC
LIMIT 15;

\echo ''
\echo '== Locks por modo =='
SELECT
    mode,
    count(*) AS locks
FROM pg_locks
WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())
GROUP BY mode
ORDER BY locks DESC;

\echo ''
\echo '== Migrações aplicadas =='
SELECT version, applied_at, left(checksum, 12) AS checksum_prefix
FROM app.schema_migrations
ORDER BY version;

\echo ''
\echo '== Contagens de domínio =='
SELECT
    (SELECT count(*) FROM app.users) AS users,
    (SELECT count(*) FROM app.categories) AS categories,
    (SELECT count(*) FROM app.venues) AS venues,
    (SELECT count(*) FROM app.events) AS events,
    (SELECT count(*) FROM app.favorites) AS favorites,
    (SELECT count(*) FROM app.reviews) AS reviews,
    (SELECT count(*) FROM app.notifications) AS notifications,
    (SELECT count(*) FROM app.reports) AS reports,
    (SELECT count(*) FROM audit.log) AS audit_rows;

\echo ''
\echo '== Saúde do banco =='
SELECT * FROM analytics.v_database_health;

SELECT (EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
))::text AS has_pgss \gset

\if :has_pgss
\echo ''
\echo '== Consultas mais caras (pg_stat_statements) =='
SELECT
    round(total_exec_time::numeric, 2) AS total_ms,
    calls,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    rows,
    left(query, 140) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
\else
\echo ''
\echo 'pg_stat_statements indisponível; pule esta seção.'
\endif
