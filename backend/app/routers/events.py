from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import User
from ..schemas import (
    EventCreate,
    EventRead,
    EventUpdate,
    FavoriteResponse,
    ReviewCreate,
    ReviewRead,
)
from ..security import get_current_user, get_current_user_optional, require_roles
from ..services import events as events_service

router = APIRouter(prefix="/api/eventos", tags=["eventos"])


@router.get("", response_model=list[EventRead])
async def list_events(
    q: str | None = Query(default=None, max_length=120),
    bairro: str | None = Query(default=None, max_length=120),
    categoria: str | None = Query(default=None, max_length=80),
    periodo: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User | None = Depends(get_current_user_optional),
    session: AsyncSession = Depends(get_session),
) -> list[EventRead]:
    return await events_service.list_feed(
        session,
        q=q,
        bairro=bairro,
        categoria=categoria,
        periodo=periodo,
        limit=limit,
        offset=offset,
        user=user,
    )


@router.get("/{event_id}", response_model=EventRead)
async def get_event(
    event_id: uuid.UUID,
    user: User | None = Depends(get_current_user_optional),
    session: AsyncSession = Depends(get_session),
) -> EventRead:
    return await events_service.get_event(session, event_id, user)


@router.post("", response_model=EventRead, status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventCreate,
    user: User = Depends(require_roles("producer", "admin")),
    session: AsyncSession = Depends(get_session),
) -> EventRead:
    return await events_service.create_event(session, payload, user)


@router.patch("/{event_id}", response_model=EventRead)
async def update_event(
    event_id: uuid.UUID,
    payload: EventUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> EventRead:
    return await events_service.update_event(session, event_id, payload, user)


@router.post("/{event_id}/cancelar", response_model=EventRead)
async def cancel_event(
    event_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> EventRead:
    return await events_service.cancel_event(session, event_id, user)


@router.post("/{event_id}/favorito", response_model=FavoriteResponse)
async def favorite_event(
    event_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FavoriteResponse:
    await events_service.favorite_event(session, event_id, user)
    return FavoriteResponse(favorite=True)


@router.delete("/{event_id}/favorito", response_model=FavoriteResponse)
async def unfavorite_event(
    event_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FavoriteResponse:
    await events_service.unfavorite_event(session, event_id, user)
    return FavoriteResponse(favorite=False)


@router.get("/{event_id}/avaliacoes", response_model=list[ReviewRead])
async def list_reviews(
    event_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> list[ReviewRead]:
    return await events_service.list_reviews(session, event_id)


@router.post(
    "/{event_id}/avaliacoes",
    response_model=ReviewRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_review(
    event_id: uuid.UUID,
    payload: ReviewCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReviewRead:
    return await events_service.create_review(session, event_id, payload, user)
