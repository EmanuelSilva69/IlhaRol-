-- 0001: schema de domínio do IlhaRolê.
-- Convenções:
--   * UUIDs com gen_random_uuid();
--   * citext para e-mail/slug;
--   * timestamptz para tudo que é data/hora;
--   * soft delete apenas onde faz sentido (users/events).
--   * dinheiro em centavos (integer) para evitar erro de ponto flutuante.

CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION app.set_updated_at() IS 'Atualiza updated_at em cada UPDATE';

CREATE TABLE app.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email citext NOT NULL UNIQUE
        CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    display_name text NOT NULL
        CHECK (length(btrim(display_name)) BETWEEN 2 AND 80),
    password_hash text,
    role text NOT NULL DEFAULT 'visitor'
        CHECK (role IN ('visitor', 'producer', 'admin')),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

COMMENT ON TABLE app.users IS 'Pessoas que usam a plataforma';
COMMENT ON COLUMN app.users.role IS 'visitor, producer ou admin';

CREATE TABLE app.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug citext NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    color text CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
    icon text,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE app.categories IS 'Categorias culturais exibidas no feed e no mapa';

CREATE TABLE app.venues (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug citext NOT NULL UNIQUE,
    name text NOT NULL,
    address text,
    neighborhood text,
    latitude numeric(9, 6) CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    longitude numeric(9, 6) CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    created_by uuid REFERENCES app.users (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT venues_coordinates_together
        CHECK ((latitude IS NULL) = (longitude IS NULL))
);

COMMENT ON TABLE app.venues IS 'Locais físicos; coordenadas opcionais para eventos de mapa';

CREATE TABLE app.events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug citext NOT NULL UNIQUE,
    title text NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 160),
    description text,
    venue_id uuid REFERENCES app.venues (id) ON DELETE SET NULL,
    organizer_id uuid REFERENCES app.users (id) ON DELETE SET NULL,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
    is_free boolean NOT NULL DEFAULT true,
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'cancelled', 'finished')),
    capacity integer CHECK (capacity IS NULL OR capacity > 0),
    cover_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT events_time_order CHECK (ends_at > starts_at),
    CONSTRAINT events_free_price CHECK (NOT is_free OR price_cents = 0),
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('portuguese'::regconfig, coalesce(title, '')), 'A') ||
        setweight(to_tsvector('portuguese'::regconfig, coalesce(description, '')), 'B')
    ) STORED
);

COMMENT ON TABLE app.events IS 'Eventos culturais; search_vector alimenta a busca textual';
COMMENT ON COLUMN app.events.price_cents IS 'Preço em centavos; 0 quando is_free = true';

CREATE TABLE app.event_categories (
    event_id uuid NOT NULL REFERENCES app.events (id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES app.categories (id) ON DELETE CASCADE,
    is_primary boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, category_id)
);

COMMENT ON TABLE app.event_categories IS 'Relação N:N entre eventos e categorias';

CREATE UNIQUE INDEX event_categories_one_primary_idx
    ON app.event_categories (event_id)
    WHERE is_primary;

CREATE TABLE app.favorites (
    user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
    event_id uuid NOT NULL REFERENCES app.events (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, event_id)
);

COMMENT ON TABLE app.favorites IS 'Eventos favoritados por usuário';

CREATE TABLE app.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES app.events (id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
    rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment text CHECK (comment IS NULL OR length(comment) <= 2000),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, user_id)
);

COMMENT ON TABLE app.reviews IS 'Uma avaliação por usuário e evento';

CREATE TABLE app.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
    event_id uuid REFERENCES app.events (id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('event_reminder', 'event_update', 'review_reply', 'system')),
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE app.notifications IS 'Notificações persistentes; payload jsonb permite evolução';

-- updated_at automático
CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON app.users
    FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER categories_set_updated_at
    BEFORE UPDATE ON app.categories
    FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER venues_set_updated_at
    BEFORE UPDATE ON app.venues
    FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER events_set_updated_at
    BEFORE UPDATE ON app.events
    FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER reviews_set_updated_at
    BEFORE UPDATE ON app.reviews
    FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
