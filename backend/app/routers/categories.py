from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import Category, Venue
from ..schemas import CategoryRead

router = APIRouter(prefix="/api", tags=["catálogo"])


@router.get("/categorias", response_model=list[CategoryRead])
async def list_categories(
    session: AsyncSession = Depends(get_session),
) -> list[CategoryRead]:
    categories = (
        await session.scalars(
            select(Category).order_by(Category.sort_order, Category.name)
        )
    ).all()

    return [
        CategoryRead(id=str(category.id), slug=category.slug, name=category.name)
        for category in categories
    ]


@router.get("/bairros", response_model=list[str])
async def list_neighborhoods(
    session: AsyncSession = Depends(get_session),
) -> list[str]:
    neighborhoods = (
        await session.scalars(
            select(Venue.neighborhood)
            .where(Venue.neighborhood.is_not(None))
            .distinct()
            .order_by(Venue.neighborhood)
        )
    ).all()

    return [neighborhood for neighborhood in neighborhoods if neighborhood]
