from __future__ import annotations

import uuid
from datetime import datetime, time, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from ..exceptions import (
    BusinessRuleError,
    ConflictError,
    InvalidInputError,
    NotFoundError,
    PermissionDeniedError,
)
from ..models import Event, EventCategory, Favorite, Review, User
from ..repositories import catalog as catalog_repo
from ..repositories import events as events_repo
from ..schemas import (
    FREE_EVENT_WITH_PRICE,
    EventCreate,
    EventRead,
    EventUpdate,
    FeedPeriod,
    ReviewCreate,
    ReviewRead,
)
from ..serializers import (
    SAO_LUIS_TZ,
    format_datetime,
    serialize_event,
    serialize_events,
    serialize_reviews,
)
from ..slugs import event_slug
from .catalog import get_or_create_venue, resolve_category
from .notifications import notify_favorites, notify_new_event


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


async def get_event_or_404(session: AsyncSession, event_id: uuid.UUID) -> Event:
    event = await events_repo.get_active_event(session, event_id)
    if event is None:
        raise NotFoundError("Evento não encontrado")
    return event


def _ensure_can_manage(event: Event, user: User, action: str) -> None:
    if event.organizer_id != user.id and user.role != "admin":
        raise PermissionDeniedError(f"Apenas o criador pode {action} este evento")


def weekend_window(now: datetime) -> tuple[datetime, datetime]:
    """Sábado 00h até segunda 00h (horário de São Luís) do fim de semana
    corrente ou do próximo."""
    local = now.astimezone(SAO_LUIS_TZ)
    days_until_saturday = (5 - local.weekday()) % 7
    if local.weekday() == 6:
        days_until_saturday = -1
    saturday = datetime.combine(
        local.date() + timedelta(days=days_until_saturday), time.min, SAO_LUIS_TZ
    )
    return saturday, saturday + timedelta(days=2)


def _period_filters(periodo: FeedPeriod | None, now: datetime) -> dict[str, datetime]:
    if periodo == "PASSADOS":
        return {"ends_before": now}
    if periodo == "PROXIMOS":
        return {"starts_from": now}
    if periodo == "FIM_DE_SEMANA":
        weekend_start, weekend_end = weekend_window(now)
        return {"starts_before": weekend_end, "ends_after": max(weekend_start, now)}
    return {}


async def list_feed(
    session: AsyncSession,
    *,
    q: str | None,
    bairro: str | None,
    categoria: str | None,
    periodo: FeedPeriod | None,
    limit: int,
    offset: int,
    user: User | None,
) -> list[EventRead]:
    events = await events_repo.list_feed(
        session,
        q=q,
        bairro=bairro,
        categoria=categoria,
        limit=limit,
        offset=offset,
        **_period_filters(periodo, datetime.now(timezone.utc)),
    )
    return await serialize_events(
        session, events, current_user_id=user.id if user else None
    )


async def get_event(
    session: AsyncSession, event_id: uuid.UUID, user: User | None
) -> EventRead:
    event = await get_event_or_404(session, event_id)
    return await serialize_event(session, event, current_user_id=user.id if user else None)


async def create_event(
    session: AsyncSession, payload: EventCreate, user: User
) -> EventRead:
    starts_at = _aware(payload.starts_at)
    ends_at = _aware(payload.ends_at)
    if ends_at <= starts_at:
        raise BusinessRuleError("A data de término deve ser posterior à de início")
    if starts_at <= datetime.now(timezone.utc):
        raise BusinessRuleError("A data e o horário precisam ser futuros")

    category = await resolve_category(session, payload.category)
    if category is None:
        raise BusinessRuleError("Categoria inválida")

    venue = await get_or_create_venue(
        session,
        name=payload.venue_name,
        address=payload.address,
        neighborhood=payload.neighborhood,
        latitude=payload.latitude,
        longitude=payload.longitude,
        created_by=user.id,
    )

    event = Event(
        slug=event_slug(payload.title),
        title=payload.title.strip(),
        description=payload.description,
        venue_id=venue.id,
        organizer_id=user.id,
        starts_at=starts_at,
        ends_at=ends_at,
        price_cents=payload.price_cents,
        is_free=payload.is_free,
        status="published",
        capacity=payload.capacity,
        cover_url=payload.banner_url,
    )
    session.add(event)
    await session.flush()
    session.add(EventCategory(event_id=event.id, category_id=category.id, is_primary=True))
    await notify_new_event(
        session,
        event=event,
        category_id=category.id,
        neighborhood=venue.neighborhood,
    )
    await session.commit()
    await session.refresh(event)

    return await serialize_event(session, event, current_user_id=user.id)


async def update_event(
    session: AsyncSession, event_id: uuid.UUID, payload: EventUpdate, user: User
) -> EventRead:
    event = await get_event_or_404(session, event_id)
    _ensure_can_manage(event, user, "editar")

    starts_at = _aware(payload.starts_at) if payload.starts_at else event.starts_at
    ends_at = _aware(payload.ends_at) if payload.ends_at else event.ends_at
    if ends_at <= starts_at:
        raise BusinessRuleError("A data de término deve ser posterior à de início")
    if payload.starts_at is not None and starts_at <= datetime.now(timezone.utc):
        raise BusinessRuleError("A data e o horário precisam ser futuros")

    is_free = payload.is_free if payload.is_free is not None else event.is_free
    price_cents = (
        payload.price_cents if payload.price_cents is not None else event.price_cents
    )
    if is_free and price_cents > 0:
        raise InvalidInputError(FREE_EVENT_WITH_PRICE)

    schedule_or_place_changed = False

    if payload.title is not None:
        event.title = payload.title.strip()
    if payload.description is not None:
        event.description = payload.description
    if payload.starts_at is not None:
        event.starts_at = starts_at
        schedule_or_place_changed = True
    if payload.ends_at is not None:
        event.ends_at = ends_at
        schedule_or_place_changed = True
    if payload.price_cents is not None:
        event.price_cents = payload.price_cents
    if payload.is_free is not None:
        event.is_free = payload.is_free
    if payload.capacity is not None:
        event.capacity = payload.capacity
    if payload.banner_url is not None:
        event.cover_url = payload.banner_url

    if payload.category is not None:
        category = await resolve_category(session, payload.category)
        if category is None:
            raise BusinessRuleError("Categoria inválida")
        await catalog_repo.clear_event_categories(session, event.id)
        session.add(
            EventCategory(event_id=event.id, category_id=category.id, is_primary=True)
        )

    venue_fields = (
        payload.venue_name,
        payload.address,
        payload.neighborhood,
        payload.latitude,
        payload.longitude,
    )
    if any(value is not None for value in venue_fields):
        await _move_to_venue(session, event, payload, user)
        schedule_or_place_changed = True

    if schedule_or_place_changed:
        await notify_favorites(
            session,
            event=event,
            kind="event_update",
            message=(
                f"O evento “{event.title}” teve data, horário ou local "
                "alterado. Confira os detalhes atualizados."
            ),
        )

    await session.commit()
    await session.refresh(event)
    return await serialize_event(session, event, current_user_id=user.id)


async def _move_to_venue(
    session: AsyncSession, event: Event, payload: EventUpdate, user: User
) -> None:
    """Combina os campos enviados com o local atual e associa o evento."""
    venue = (
        await catalog_repo.get_venue(session, event.venue_id) if event.venue_id else None
    )
    venue_name = payload.venue_name or (venue.name if venue else None)
    if venue_name is None:
        raise BusinessRuleError("Informe o nome do local")

    def current_coordinate(value) -> float | None:
        return float(value) if value is not None else None

    new_venue = await get_or_create_venue(
        session,
        name=venue_name,
        address=payload.address or (venue.address if venue else None),
        neighborhood=payload.neighborhood or (venue.neighborhood if venue else None),
        latitude=payload.latitude
        if payload.latitude is not None
        else (current_coordinate(venue.latitude) if venue else None),
        longitude=payload.longitude
        if payload.longitude is not None
        else (current_coordinate(venue.longitude) if venue else None),
        created_by=user.id,
    )
    event.venue_id = new_venue.id


async def cancel_event(
    session: AsyncSession, event_id: uuid.UUID, user: User
) -> EventRead:
    event = await get_event_or_404(session, event_id)
    _ensure_can_manage(event, user, "cancelar")

    if event.status != "cancelled":
        event.status = "cancelled"
        await notify_favorites(
            session,
            event=event,
            kind="event_cancel",
            message=(
                f"O evento “{event.title}” que você salvou foi cancelado "
                "pelo organizador."
            ),
        )
        await session.commit()
        await session.refresh(event)

    return await serialize_event(session, event, current_user_id=user.id)


async def favorite_event(session: AsyncSession, event_id: uuid.UUID, user: User) -> None:
    event = await get_event_or_404(session, event_id)
    if await events_repo.get_favorite(session, user.id, event.id) is None:
        session.add(Favorite(user_id=user.id, event_id=event.id))
        await session.commit()


async def unfavorite_event(
    session: AsyncSession, event_id: uuid.UUID, user: User
) -> None:
    favorite = await events_repo.get_favorite(session, user.id, event_id)
    if favorite is not None:
        await session.delete(favorite)
        await session.commit()


async def list_reviews(session: AsyncSession, event_id: uuid.UUID) -> list[ReviewRead]:
    event = await get_event_or_404(session, event_id)
    return await serialize_reviews(session, event.id)


async def create_review(
    session: AsyncSession, event_id: uuid.UUID, payload: ReviewCreate, user: User
) -> ReviewRead:
    event = await get_event_or_404(session, event_id)
    if event.status == "cancelled":
        raise BusinessRuleError("Evento cancelado não pode ser avaliado")
    if event.status != "finished" and event.ends_at >= datetime.now(timezone.utc):
        raise BusinessRuleError(
            "Avaliações são permitidas apenas após o término do evento"
        )
    if await events_repo.find_review_by_user(session, event.id, user.id) is not None:
        raise ConflictError("Você já avaliou este evento")

    review = Review(
        event_id=event.id,
        user_id=user.id,
        rating=payload.rating,
        comment=payload.comment,
    )
    session.add(review)
    await session.commit()
    await session.refresh(review)

    return ReviewRead(
        id=str(review.id),
        author=user.display_name,
        author_id=str(user.id),
        rating=review.rating,
        comment=review.comment,
        created_at=format_datetime(review.created_at),
    )
