-- 0006: permite notificações específicas de cancelamento.
-- O layout original previa event_update para alterações e não tinha um tipo
-- dedicado para cancelamento (RF11).

ALTER TABLE app.notifications
    DROP CONSTRAINT IF EXISTS notifications_kind_check;

ALTER TABLE app.notifications
    ADD CONSTRAINT notifications_kind_check
    CHECK (kind IN (
        'event_reminder',
        'event_update',
        'event_cancel',
        'review_reply',
        'system'
    ));
