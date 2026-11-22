-- 0003: índices de performance, busca textual, similaridade e geolocalização.

-- Feed público: eventos publicados por data
CREATE INDEX events_status_starts_idx
    ON app.events (status, starts_at)
    WHERE deleted_at IS NULL;

CREATE INDEX events_venue_starts_idx
    ON app.events (venue_id, starts_at)
    WHERE deleted_at IS NULL;

CREATE INDEX events_organizer_idx
    ON app.events (organizer_id)
    WHERE deleted_at IS NULL;

-- Busca textual em português
CREATE INDEX events_search_vector_idx
    ON app.events USING gin (search_vector);

-- Busca tolerante a erros de digitação
CREATE INDEX events_title_trgm_idx
    ON app.events USING gin (title gin_trgm_ops);

CREATE INDEX events_description_trgm_idx
    ON app.events USING gin (description gin_trgm_ops);

CREATE INDEX venues_name_trgm_idx
    ON app.venues USING gin (name gin_trgm_ops);

-- Proximidade geográfica do local
CREATE INDEX venues_geo_idx
    ON app.venues USING gist (ll_to_earth(latitude::double precision, longitude::double precision))
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX event_categories_category_idx
    ON app.event_categories (category_id);

CREATE INDEX favorites_event_idx
    ON app.favorites (event_id);

CREATE INDEX reviews_event_created_idx
    ON app.reviews (event_id, created_at DESC);

CREATE INDEX reviews_user_idx
    ON app.reviews (user_id);

CREATE INDEX notifications_unread_idx
    ON app.notifications (user_id, created_at DESC)
    WHERE read_at IS NULL;

CREATE INDEX users_role_idx
    ON app.users (role)
    WHERE deleted_at IS NULL;

-- Busca full-text com ranking e nome do local.
CREATE OR REPLACE FUNCTION app.search_events(
    q text,
    max_results integer DEFAULT 20
)
RETURNS TABLE (
    event_id uuid,
    title text,
    starts_at timestamptz,
    venue text,
    relevance real
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        e.id,
        e.title,
        e.starts_at,
        v.name AS venue,
        ts_rank(e.search_vector, websearch_to_tsquery('portuguese', q)) AS relevance
    FROM app.events e
    LEFT JOIN app.venues v ON v.id = e.venue_id
    WHERE e.status = 'published'
      AND e.deleted_at IS NULL
      AND e.search_vector @@ websearch_to_tsquery('portuguese', coalesce(q, ''))
    ORDER BY relevance DESC, e.starts_at ASC
    LIMIT greatest(1, least(coalesce(max_results, 20), 100));
$$;

COMMENT ON FUNCTION app.search_events(text, integer) IS 'Busca full-text com ranking (português)';

-- Eventos próximos de um ponto, usando earthdistance.
CREATE OR REPLACE FUNCTION app.events_near(
    lat double precision,
    lng double precision,
    radius_km double precision DEFAULT 5,
    max_results integer DEFAULT 50
)
RETURNS TABLE (
    event_id uuid,
    title text,
    venue text,
    starts_at timestamptz,
    distance_km double precision
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        e.id,
        e.title,
        v.name,
        e.starts_at,
        earth_distance(
            ll_to_earth(lat, lng),
            ll_to_earth(v.latitude::double precision, v.longitude::double precision)
        ) / 1000.0 AS distance_km
    FROM app.events e
    JOIN app.venues v ON v.id = e.venue_id
    WHERE e.status = 'published'
      AND e.deleted_at IS NULL
      AND v.latitude IS NOT NULL
      AND v.longitude IS NOT NULL
      AND earth_box(ll_to_earth(lat, lng), radius_km * 1000) @>
          ll_to_earth(v.latitude::double precision, v.longitude::double precision)
      AND earth_distance(
            ll_to_earth(lat, lng),
            ll_to_earth(v.latitude::double precision, v.longitude::double precision)
          ) <= radius_km * 1000
    ORDER BY distance_km ASC, e.starts_at ASC
    LIMIT greatest(1, least(coalesce(max_results, 50), 200));
$$;

COMMENT ON FUNCTION app.events_near(double precision, double precision, double precision, integer)
    IS 'Eventos publicados dentro de um raio (km) de uma coordenada';

-- Busca por similaridade (para autocomplete quando o full-text não ajuda).
CREATE OR REPLACE FUNCTION app.search_events_fuzzy(
    term text,
    max_results integer DEFAULT 10
)
RETURNS TABLE (
    event_id uuid,
    title text,
    similarity real
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        e.id,
        e.title,
        similarity(e.title, term) AS similarity
    FROM app.events e
    WHERE e.status = 'published'
      AND e.deleted_at IS NULL
      AND e.title % term
    ORDER BY similarity DESC, e.starts_at ASC
    LIMIT greatest(1, least(coalesce(max_results, 10), 50));
$$;

COMMENT ON FUNCTION app.search_events_fuzzy(text, integer) IS 'Busca aproximada por trigramas';
