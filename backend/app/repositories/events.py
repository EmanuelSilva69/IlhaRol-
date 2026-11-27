from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Category, Event, EventCategory, Favorite, Review, Venue


async def get_event(session: AsyncSession, event_id: uuid.UUID) -> Event | None:
    """Inclui eventos removidos; use quando o histórico precisa do título."""
    return await session.get(Event, event_id)


async def get_active_event(session: AsyncSession, event_id: uuid.UUID) -> Event | None:
    event = await session.get(Event, event_id)
    if event is None or event.deleted_at is not None:
        return None
    return event


async def list_feed(
    session: AsyncSession,
    *,
    now: datetime,
    q: str | None,
    bairro: str | None,
    categoria: str | None,
    periodo: str | None,
    limit: int,
    offset: int,
) -> list[Event]:
    statement = select(Event).where(
        Event.deleted_at.is_(None),
        Event.status != "draft",
    )

    if bairro:
        statement = statement.join(Venue, Event.venue_id == Venue.id).where(
            Venue.neighborhood == bairro
        )

    if categoria:
        category_events = (
            select(EventCategory.event_id)
            .join(Category, EventCategory.category_id == Category.id)
            .where(Category.slug == categoria)
        )
        statement = statement.where(Event.id.in_(category_events))

    if q:
        term = f"%{q.strip()}%"
        statement = statement.where(
            or_(Event.title.ilike(term), Event.description.ilike(term))
        )

    if periodo == "PASSADOS":
        statement = statement.where(Event.ends_at < func.now())
    elif periodo == "FIM_DE_SEMANA":
        statement = statement.where(
            Event.starts_at >= now,
            Event.starts_at <= now + timedelta(days=7),
        )
    elif periodo == "PROXIMOS":
        statement = statement.where(Event.starts_at >= now)

    statement = statement.order_by(Event.starts_at.asc()).offset(offset).limit(limit)
    return list(await session.scalars(statement))


async def list_favorited_by(session: AsyncSession, user_id: uuid.UUID) -> list[Event]:
    return list(
        await session.scalars(
            select(Event)
            .join(Favorite, Favorite.event_id == Event.id)
            .where(Favorite.user_id == user_id, Event.deleted_at.is_(None))
            .order_by(Event.starts_at)
        )
    )


async def get_favorite(
    session: AsyncSession, user_id: uuid.UUID, event_id: uuid.UUID
) -> Favorite | None:
    return await session.get(Favorite, (user_id, event_id))


async def list_favoriter_ids(session: AsyncSession, event_id: uuid.UUID) -> list[uuid.UUID]:
    return list(
        await session.scalars(select(Favorite.user_id).where(Favorite.event_id == event_id))
    )


async def list_reviews(session: AsyncSession, event_id: uuid.UUID) -> list[Review]:
    return list(
        await session.scalars(
            select(Review)
            .where(Review.event_id == event_id)
            .order_by(Review.created_at.desc())
        )
    )


async def list_reviews_for(
    session: AsyncSession, event_ids: list[uuid.UUID]
) -> dict[uuid.UUID, list[Review]]:
    """Avaliações agrupadas por evento, da mais recente para a mais antiga."""
    grouped: dict[uuid.UUID, list[Review]] = {event_id: [] for event_id in event_ids}
    if not event_ids:
        return grouped
    reviews = await session.scalars(
        select(Review)
        .where(Review.event_id.in_(event_ids))
        .order_by(Review.created_at.desc())
    )
    for review in reviews:
        grouped[review.event_id].append(review)
    return grouped


async def list_favorite_event_ids(
    session: AsyncSession, user_id: uuid.UUID, event_ids: list[uuid.UUID]
) -> set[uuid.UUID]:
    if not event_ids:
        return set()
    return set(
        await session.scalars(
            select(Favorite.event_id).where(
                Favorite.user_id == user_id,
                Favorite.event_id.in_(event_ids),
            )
        )
    )


async def find_review_by_user(
    session: AsyncSession, event_id: uuid.UUID, user_id: uuid.UUID
) -> Review | None:
    return await session.scalar(
        select(Review).where(Review.event_id == event_id, Review.user_id == user_id)
    )


async def get_review(session: AsyncSession, review_id: uuid.UUID) -> Review | None:
    return await session.get(Review, review_id)
