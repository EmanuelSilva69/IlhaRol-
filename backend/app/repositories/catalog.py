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


async def get_event_categories(
    session: AsyncSession, event_ids: list[uuid.UUID]
) -> dict[uuid.UUID, Category]:
    """Categoria de cada evento, preferindo a principal."""
    if not event_ids:
        return {}
    rows = await session.execute(
        select(EventCategory.event_id, Category)
        .join(Category, EventCategory.category_id == Category.id)
        .where(EventCategory.event_id.in_(event_ids))
        .order_by(EventCategory.is_primary.desc())
    )
    categories: dict[uuid.UUID, Category] = {}
    for event_id, category in rows:
        categories.setdefault(event_id, category)
    return categories


async def get_venues(
    session: AsyncSession, venue_ids: set[uuid.UUID]
) -> dict[uuid.UUID, Venue]:
    if not venue_ids:
        return {}
    result = await session.scalars(select(Venue).where(Venue.id.in_(venue_ids)))
    return {venue.id: venue for venue in result}


async def clear_event_categories(session: AsyncSession, event_id: uuid.UUID) -> None:
    await session.execute(delete(EventCategory).where(EventCategory.event_id == event_id))


async def get_venue(session: AsyncSession, venue_id: uuid.UUID) -> Venue | None:
    return await session.get(Venue, venue_id)


async def find_venue_by_slug(session: AsyncSession, slug: str) -> Venue | None:
    return await session.scalar(select(Venue).where(Venue.slug == slug))
