-- Verificações estruturais do banco. Falha com exceção se algo essencial faltar.
\set ON_ERROR_STOP on
\pset pager off

\echo '== IlhaRolê: verificação estrutural =='

DO $check$
DECLARE
    missing text[] := ARRAY[]::text[];
    expected_extensions text[] := ARRAY[
        'pgcrypto', 'citext', 'unaccent', 'pg_trgm', 'btree_gin', 'cube', 'earthdistance'
    ];
    expected_tables text[] := ARRAY[
        'app.users', 'app.categories', 'app.venues', 'app.events',
        'app.event_categories', 'app.favorites', 'app.reviews', 'app.notifications',
        'app.schema_migrations', 'audit.log'
    ];
    expected_views text[] := ARRAY[
        'analytics.v_event_engagement', 'analytics.v_category_popularity',
        'analytics.v_upcoming_events', 'analytics.v_database_health',
        'analytics.mv_daily_event_stats'
    ];
    expected_functions text[] := ARRAY[
        'app.search_events(text,integer)',
        'app.search_events_fuzzy(text,integer)',
        'app.events_near(double precision,double precision,double precision,integer)',
        'analytics.refresh_daily_event_stats()'
    ];
    item text;
BEGIN
    FOREACH item IN ARRAY expected_extensions LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = item) THEN
            missing := missing || ('extensão ' || item);
        END IF;
    END LOOP;

    FOREACH item IN ARRAY expected_tables LOOP
        IF to_regclass(item) IS NULL THEN
            missing := missing || ('tabela ' || item);
        END IF;
    END LOOP;

    FOREACH item IN ARRAY expected_views LOOP
        IF to_regclass(item) IS NULL THEN
            missing := missing || ('view ' || item);
        END IF;
    END LOOP;

    FOREACH item IN ARRAY expected_functions LOOP
        IF to_regprocedure(item) IS NULL THEN
            missing := missing || ('função ' || item);
        END IF;
    END LOOP;

    IF cardinality(missing) > 0 THEN
        RAISE EXCEPTION 'Objetos ausentes: %', array_to_string(missing, ', ');
    END IF;
END;
$check$;

SELECT
    (SELECT count(*) FROM app.schema_migrations) AS migrations,
    (SELECT count(*) FROM app.users) AS users,
    (SELECT count(*) FROM app.events) AS events,
    (SELECT count(*) FROM app.categories) AS categories,
    (SELECT count(*) FROM app.venues) AS venues;

SELECT * FROM analytics.v_database_health;

\echo 'OK: estrutura do banco consistente.'
