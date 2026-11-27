from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..schemas import CategoryRead
from ..services import catalog as catalog_service

router = APIRouter(prefix="/api", tags=["catálogo"])


@router.get("/categorias", response_model=list[CategoryRead])
async def list_categories(
    session: AsyncSession = Depends(get_session),
) -> list[CategoryRead]:
    return await catalog_service.list_categories(session)


@router.get("/bairros", response_model=list[str])
async def list_neighborhoods() -> list[str]:
    return catalog_service.list_neighborhoods()
