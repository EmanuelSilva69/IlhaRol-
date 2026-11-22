-- 0005: perfil do usuário, interesses, preferências, denúncias e recuperação.
-- Complementa o schema de domínio sem alterar as migrações já aplicadas.

ALTER TABLE app.users
    ADD COLUMN IF NOT EXISTS neighborhood text,
    ADD COLUMN IF NOT EXISTS bio text
        CHECK (bio IS NULL OR length(bio) <= 500),
    ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN app.users.neighborhood IS 'Bairro de interesse usado na personalização';
COMMENT ON COLUMN app.users.bio IS 'Texto curto exibido no perfil';

-- Interesses culturais do usuário (relação N:N com categorias).
CREATE TABLE app.user_interests (
    user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES app.categories (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, category_id)
);

COMMENT ON TABLE app.user_interests IS 'Categorias culturais escolhidas pelo usuário';

CREATE INDEX user_interests_category_idx
    ON app.user_interests (category_id);

-- Preferências de notificação (RF12).
CREATE TABLE app.notification_preferences (
    user_id uuid PRIMARY KEY REFERENCES app.users (id) ON DELETE CASCADE,
    new_events boolean NOT NULL DEFAULT true,
    event_changes boolean NOT NULL DEFAULT true,
    weekly_summary boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE app.notification_preferences IS 'Flags consultadas antes de disparar alertas';

CREATE TRIGGER notification_preferences_set_updated_at
    BEFORE UPDATE ON app.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- Denúncias de eventos ou avaliações (RF14).
CREATE TABLE app.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
    target_type text NOT NULL
        CHECK (target_type IN ('EVENTO', 'AVALIACAO')),
    event_id uuid REFERENCES app.events (id) ON DELETE CASCADE,
    review_id uuid REFERENCES app.reviews (id) ON DELETE CASCADE,
    reason text NOT NULL
        CHECK (reason IN ('INFORMACAO_FALSA', 'DISCURSO_OFENSIVO', 'SPAM', 'OUTRO')),
    description text
        CHECK (description IS NULL OR length(description) <= 2000),
    status text NOT NULL DEFAULT 'EM_ANALISE'
        CHECK (status IN ('EM_ANALISE', 'PROCEDENTE', 'IMPROCEDENTE')),
    reviewer_id uuid REFERENCES app.users (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    reviewed_at timestamptz,
    CONSTRAINT reports_target_check CHECK (
        (target_type = 'EVENTO' AND event_id IS NOT NULL AND review_id IS NULL)
        OR
        (target_type = 'AVALIACAO' AND review_id IS NOT NULL)
    )
);

COMMENT ON TABLE app.reports IS 'Denúncias enviadas para moderação; o denunciante não é exposto';

CREATE INDEX reports_reporter_idx
    ON app.reports (reporter_id, created_at DESC);

CREATE INDEX reports_event_idx
    ON app.reports (event_id, created_at DESC)
    WHERE event_id IS NOT NULL;

CREATE INDEX reports_pending_idx
    ON app.reports (created_at DESC)
    WHERE status = 'EM_ANALISE';

CREATE TRIGGER reports_audit
    AFTER INSERT OR UPDATE OR DELETE ON app.reports
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

-- Tokens de recuperação de acesso (RF09).
CREATE TABLE app.password_reset_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT password_reset_expiry CHECK (expires_at > created_at)
);

COMMENT ON TABLE app.password_reset_tokens IS 'Links de redefinição de uso único; armazena apenas o hash';

CREATE INDEX password_reset_user_idx
    ON app.password_reset_tokens (user_id, expires_at DESC)
    WHERE used_at IS NULL;
