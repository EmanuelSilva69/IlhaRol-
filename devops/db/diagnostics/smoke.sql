-- Smoke tests de banco. Executa escrita real e reverte tudo no final.
-- Rodar depois de db-migrations (e, de preferência, após o seed).
\set ON_ERROR_STOP on
\pset pager off

-- A MV precisa estar populada para o REFRESH CONCURRENTLY.
SELECT analytics.refresh_daily_event_stats();

BEGIN;

INSERT INTO app.users (id, email, display_name, role)
VALUES ('99999999-0000-4000-8000-000000000001', 'smoke@example.com', 'Smoke Test', 'visitor');

INSERT INTO app.categories (id, slug, name, color)
VALUES ('99999999-0000-4000-8000-000000000010', 'smoke-category', 'Smoke Category', '#123456');

INSERT INTO app.venues (id, slug, name, latitude, longitude)
VALUES ('99999999-0000-4000-8000-000000000020', 'smoke-venue', 'Smoke Venue', -2.529200, -44.302800);

INSERT INTO app.events (
    id, slug, title, description, venue_id, organizer_id,
    starts_at, ends_at, price_cents, is_free, status
)
VALUES (
    '99999999-0000-4000-8000-000000000030',
    'smoke-bumba-boi',
    'Smoke Bumba Boi',
    'Evento de teste com tambor, boi e cultura popular.',
    '99999999-0000-4000-8000-000000000020',
    '99999999-0000-4000-8000-000000000001',
    now() + interval '1 day',
    now() + interval '1 day 2 hours',
    0, true, 'published'
);

INSERT INTO app.event_categories (event_id, category_id, is_primary)
VALUES (
    '99999999-0000-4000-8000-000000000030',
    '99999999-0000-4000-8000-000000000010',
    true
);

INSERT INTO app.favorites (user_id, event_id)
VALUES (
    '99999999-0000-4000-8000-000000000001',
    '99999999-0000-4000-8000-000000000030'
);

INSERT INTO app.reviews (event_id, user_id, rating, comment)
VALUES (
    '99999999-0000-4000-8000-000000000030',
    '99999999-0000-4000-8000-000000000001',
    5,
    'Avaliação de smoke test.'
);

DO $smoke$
DECLARE
    found_count integer;
    avg_rating numeric;
    near_count integer;
    audit_count integer;
BEGIN
    SELECT count(*) INTO found_count
    FROM app.search_events('boi', 10)
    WHERE event_id = '99999999-0000-4000-8000-000000000030';

    IF found_count < 1 THEN
        RAISE EXCEPTION 'search_events não encontrou o evento (obtido %)', found_count;
    END IF;

    SELECT count(*) INTO found_count
    FROM app.search_events_fuzzy('Smoke Bumba', 10)
    WHERE event_id = '99999999-0000-4000-8000-000000000030';

    IF found_count < 1 THEN
        RAISE EXCEPTION 'search_events_fuzzy não encontrou o evento (obtido %)', found_count;
    END IF;

    SELECT count(*) INTO near_count
    FROM app.events_near(-2.529200, -44.302800, 1, 10)
    WHERE event_id = '99999999-0000-4000-8000-000000000030';

    IF near_count < 1 THEN
        RAISE EXCEPTION 'events_near não encontrou o evento (obtido %)', near_count;
    END IF;

    SELECT average_rating INTO avg_rating
    FROM analytics.v_event_engagement
    WHERE event_id = '99999999-0000-4000-8000-000000000030';

    IF avg_rating IS DISTINCT FROM 5.00 THEN
        RAISE EXCEPTION 'v_event_engagement retornou média % (esperado 5.00)', avg_rating;
    END IF;

    SELECT count(*) INTO audit_count
    FROM audit.log
    WHERE record_id = '99999999-0000-4000-8000-000000000030';

    IF audit_count < 1 THEN
        RAISE EXCEPTION 'audit.log não registrou o evento (obtido %)', audit_count;
    END IF;

    SELECT count(*) INTO found_count
    FROM analytics.v_upcoming_events
    WHERE event_id = '99999999-0000-4000-8000-000000000030';

    IF found_count < 1 THEN
        RAISE EXCEPTION 'v_upcoming_events não retornou o evento';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM analytics.v_database_health) THEN
        RAISE EXCEPTION 'v_database_health não retornou linha';
    END IF;
END;
$smoke$;

-- Auditing com ator explícito
SET LOCAL app.current_user_id = '99999999-0000-4000-8000-000000000001';
UPDATE app.events
SET title = 'Smoke Bumba Boi (atualizado)'
WHERE id = '99999999-0000-4000-8000-000000000030';

DO $actor$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM audit.log
        WHERE record_id = '99999999-0000-4000-8000-000000000030'
          AND action = 'UPDATE'
          AND actor_id = '99999999-0000-4000-8000-000000000001'
    ) THEN
        RAISE EXCEPTION 'audit.log não registrou o ator da atualização';
    END IF;
END;
$actor$;

ROLLBACK;

\echo 'OK: smoke tests de banco passaram (transação revertida).'
