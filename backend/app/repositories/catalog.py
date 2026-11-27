from __future__ import annotations

import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Category, EventCategory, Venue


async def list_categories(session: AsyncSession) -> list[Category]:
    return list(
        await session.scalars(select(Category).order_by(Category.sort_order, Category.name))
    )


async def find_category_by_slug(session: AsyncSession, slug: str) -> Category | None:
    return await session.scalar(select(Category).where(Category.slug == slug))


async def find_category_by_name(session: AsyncSession, name: str) -> Category | None:
    return await session.scalar(select(Category).where(Category.name.ilike(name)))


async def get_event_category(
    session: AsyncSession, event_id: uuid.UUID
) -> Category | None:
    """Categoria principal do evento; sem principal, a primeira encontrada."""
    primary = await session.scalar(
        select(Category)
        .join(EventCategory, EventCategory.category_id == Category.id)
        .where(
            EventCategory.event_id == event_id,
            EventCategory.is_primary.is_(True),
        )
        .limit(1)
    )
    if primary is not None:
        return primary

    return await session.scalar(
        select(Category)
        .join(EventCategory, EventCategory.category_id == Category.id)
        .where(EventCategory.event_id == event_id)
        .limit(1)
    )


async def clear_event_categories(session: AsyncSession, event_id: uuid.UUID) -> None:
    await session.execute(delete(EventCategory).where(EventCategory.event_id == event_id))


async def get_venue(session: AsyncSession, venue_id: uuid.UUID) -> Venue | None:
    return await session.get(Venue, venue_id)


async def find_venue_by_slug(session: AsyncSession, slug: str) -> Venue | None:
    return await session.scalar(select(Venue).where(Venue.slug == slug))


async def list_venue_neighborhoods(session: AsyncSession) -> list[str]:
    neighborhoods = await session.scalars(
        select(Venue.neighborhood)
        .where(Venue.neighborhood.is_not(None))
        .distinct()
        .order_by(Venue.neighborhood)
    )
    return [neighborhood for neighborhood in neighborhoods if neighborhood]
