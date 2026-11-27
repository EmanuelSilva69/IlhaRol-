from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Event, Notification
from ..repositories import events as events_repo
from ..repositories import users as users_repo


async def notify_favorites(
    session: AsyncSession,
    *,
    event: Event,
    kind: str,
    message: str,
) -> None:
    """Avisa quem salvou o evento, respeitando a preferência de alterações."""
    favoriter_ids = await events_repo.list_favoriter_ids(session, event.id)
    if not favoriter_ids:
        return

    preferences = await users_repo.get_preferences_for(session, favoriter_ids)
    for user_id in favoriter_ids:
        preference = preferences.get(user_id)
        if preference is not None and not preference.event_changes:
            continue
        session.add(
            Notification(
                user_id=user_id,
                event_id=event.id,
                kind=kind,
                payload={"mensagem": message},
            )
        )


async def notify_new_event(
    session: AsyncSession,
    *,
    event: Event,
    category_id: uuid.UUID,
    neighborhood: str | None,
) -> None:
    """Avisa quem tem interesse na categoria ou mora no bairro do evento."""
    interested_ids = await users_repo.list_ids_interested_in(session, category_id)
    if neighborhood:
        interested_ids |= await users_repo.list_active_ids_in_neighborhood(
            session, neighborhood
        )
    interested_ids.discard(event.organizer_id)
    if not interested_ids:
        return

    preferences = await users_repo.get_preferences_for(session, interested_ids)
    for user_id in interested_ids:
        preference = preferences.get(user_id)
        if preference is not None and not preference.new_events:
            continue
        session.add(
            Notification(
                user_id=user_id,
                event_id=event.id,
                kind="event_reminder",
                payload={
                    "mensagem": (
                        f"Novo evento compatível com seus interesses: “{event.title}”."
                    )
                },
            )
        )
