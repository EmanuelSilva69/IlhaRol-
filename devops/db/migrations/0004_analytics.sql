-- 0004: views e materialized views para leitura/analytics.
-- As views são criadas pelo owner do banco; 02-roles.sh aplica
-- default privileges para app/readonly.

CREATE OR REPLACE VIEW analytics.v_event_engagement AS
SELECT
    e.id AS event_id,
    e.title,
    e.status,
    e.starts_at,
    COALESCE(f.favorites_count, 0) AS favorites_count,
    COALESCE(r.reviews_count, 0) AS reviews_count,
    r.average_rating
FROM app.events e
LEFT JOIN (
    SELECT event_id, count(*) AS favorites_count
    FROM app.favorites
    GROUP BY event_id
) f ON f.event_id = e.id
LEFT JOIN (
    SELECT event_id, count(*) AS reviews_count, round(avg(rating)::numeric, 2) AS average_rating
    FROM app.reviews
    GROUP BY event_id
) r ON r.event_id = e.id
WHERE e.deleted_at IS NULL;

COMMENT ON VIEW analytics.v_event_engagement IS 'Favoritos, avaliações e nota média por evento';

CREATE OR REPLACE VIEW analytics.v_category_popularity AS
SELECT
    c.id AS category_id,
    c.name,
    c.slug,
    count(DISTINCT e.id) AS published_events,
    COALESCE(sum(f.favorites_count), 0) AS favorites_count
FROM app.categories c
LEFT JOIN app.event_categories ec ON ec.category_id = c.id
LEFT JOIN app.events e
    ON e.id = ec.event_id
   AND e.status = 'published'
   AND e.deleted_at IS NULL
LEFT JOIN (
    SELECT event_id, count(*) AS favorites_count
    FROM app.favorites
    GROUP BY event_id
) f ON f.event_id = e.id
GROUP BY c.id, c.name, c.slug;

COMMENT ON VIEW analytics.v_category_popularity IS 'Eventos publicados e favoritos por categoria';

CREATE OR REPLACE VIEW analytics.v_upcoming_events AS
SELECT
    e.id AS event_id,
    e.title,
    e.slug,
    e.starts_at,
    e.ends_at,
    e.is_free,
    e.price_cents,
    v.name AS venue,
    v.neighborhood,
    v.latitude,
    v.longitude,
    c.name AS primary_category
FROM app.events e
LEFT JOIN app.venues v ON v.id = e.venue_id
LEFT JOIN app.event_categories ec
    ON ec.event_id = e.id
   AND ec.is_primary
LEFT JOIN app.categories c ON c.id = ec.category_id
WHERE e.status = 'published'
  AND e.deleted_at IS NULL
  AND e.starts_at BETWEEN now() AND now() + interval '30 days'
ORDER BY e.starts_at;

COMMENT ON VIEW analytics.v_upcoming_events IS 'Agenda dos próximos 30 dias';

CREATE MATERIALIZED VIEW analytics.mv_daily_event_stats AS
WITH event_days AS (
    SELECT
        id,
        date_trunc('day', starts_at)::date AS day,
        status
    FROM app.events
    WHERE deleted_at IS NULL
),
favorites AS (
    SELECT ed.day, count(*) AS favorites_count
    FROM app.favorites f
    JOIN event_days ed ON ed.id = f.event_id
    GROUP BY ed.day
),
reviews AS (
    SELECT
        ed.day,
        count(*) AS reviews_count,
        round(avg(r.rating)::numeric, 2) AS average_rating
    FROM app.reviews r
    JOIN event_days ed ON ed.id = r.event_id
    GROUP BY ed.day
)
SELECT
    d.day,
    count(*) FILTER (WHERE d.status = 'published') AS published_events,
    count(*) AS total_events,
    COALESCE(f.favorites_count, 0) AS favorites_count,
    COALESCE(r.reviews_count, 0) AS reviews_count,
    r.average_rating
FROM event_days d
LEFT JOIN favorites f ON f.day = d.day
LEFT JOIN reviews r ON r.day = d.day
GROUP BY d.day, f.favorites_count, r.reviews_count, r.average_rating;

CREATE UNIQUE INDEX mv_daily_event_stats_day_idx
    ON analytics.mv_daily_event_stats (day);

COMMENT ON MATERIALIZED VIEW analytics.mv_daily_event_stats IS 'Agregado diário; atualize com analytics.refresh_daily_event_stats()';

CREATE OR REPLACE FUNCTION analytics.refresh_daily_event_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics, public
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_daily_event_stats;
END;
$$;

COMMENT ON FUNCTION analytics.refresh_daily_event_stats() IS 'Atualiza a MV diária sem bloquear leituras';

CREATE OR REPLACE VIEW analytics.v_database_health AS
SELECT
    current_database() AS database_name,
    pg_size_pretty(pg_database_size(current_database())) AS database_size,
    (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) AS connections,
    current_setting('max_connections')::integer AS max_connections,
    COALESCE((
        SELECT round(100.0 * sum(blks_hit) / NULLIF(sum(blks_hit + blks_read), 0), 2)
        FROM pg_stat_database
        WHERE datname = current_database()
    ), 0) AS cache_hit_ratio,
    (SELECT count(*) FROM app.schema_migrations) AS applied_migrations,
    (SELECT count(*) FROM app.events) AS events_total;

COMMENT ON VIEW analytics.v_database_health IS 'Painel rápido de saúde do banco';
