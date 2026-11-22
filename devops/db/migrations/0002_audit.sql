-- 0002: trilha de auditoria genérica.
-- Para registrar o autor da alteração, a aplicação pode executar:
--   SET LOCAL app.current_user_id = '<uuid-do-usuario>';
-- dentro da mesma transação da escrita.

CREATE TABLE audit.log (
    id bigserial PRIMARY KEY,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    actor_id uuid,
    old_data jsonb,
    new_data jsonb,
    changed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit.log IS 'Histórico de alterações em tabelas de domínio';

CREATE INDEX audit_log_table_changed_idx
    ON audit.log (table_name, changed_at DESC);

CREATE INDEX audit_log_record_idx
    ON audit.log (record_id);

CREATE OR REPLACE FUNCTION audit.log_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, app, public
AS $$
DECLARE
    actor uuid;
    target_id uuid;
    payload_old jsonb;
    payload_new jsonb;
BEGIN
    BEGIN
        actor := nullif(current_setting('app.current_user_id', true), '')::uuid;
    EXCEPTION
        WHEN invalid_text_representation THEN
            actor := NULL;
    END;

    IF TG_OP = 'DELETE' THEN
        payload_old := to_jsonb(OLD);
        payload_new := NULL;
        target_id := (payload_old ->> 'id')::uuid;
    ELSIF TG_OP = 'UPDATE' THEN
        payload_old := to_jsonb(OLD);
        payload_new := to_jsonb(NEW);
        target_id := (payload_new ->> 'id')::uuid;
    ELSE
        payload_old := NULL;
        payload_new := to_jsonb(NEW);
        target_id := (payload_new ->> 'id')::uuid;
    END IF;

    INSERT INTO audit.log (table_name, record_id, action, actor_id, old_data, new_data)
    VALUES (TG_TABLE_NAME, target_id, TG_OP, actor, payload_old, payload_new);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION audit.log_change() IS 'Trigger genérica: grava old/new em audit.log';

-- Tabelas com coluna id uuid. Tabelas de junção (favorites/event_categories)
-- não são auditadas para manter o log enxuto.
CREATE TRIGGER users_audit
    AFTER INSERT OR UPDATE OR DELETE ON app.users
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER categories_audit
    AFTER INSERT OR UPDATE OR DELETE ON app.categories
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER venues_audit
    AFTER INSERT OR UPDATE OR DELETE ON app.venues
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER events_audit
    AFTER INSERT OR UPDATE OR DELETE ON app.events
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER reviews_audit
    AFTER INSERT OR UPDATE OR DELETE ON app.reviews
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

-- Retenção manual (ou via cron/backup): remove registros antigos.
CREATE OR REPLACE FUNCTION audit.purge_older_than(days integer DEFAULT 90)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
    removed bigint;
BEGIN
    IF days < 1 THEN
        RAISE EXCEPTION 'days deve ser >= 1';
    END IF;

    DELETE FROM audit.log
    WHERE changed_at < now() - make_interval(days => days);

    GET DIAGNOSTICS removed = ROW_COUNT;
    RETURN removed;
END;
$$;

COMMENT ON FUNCTION audit.purge_older_than(integer) IS 'Remove auditoria mais antiga que N dias';
