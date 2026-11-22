from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import (
    Category,
    Event,
    EventCategory,
    Favorite,
    Review,
    User,
    Venue,
)
from ..schemas import (
    EventCreate,
    EventRead,
    EventUpdate,
    FavoriteResponse,
    ReviewCreate,
    ReviewRead,
)
from ..security import (
    get_current_user,
    get_current_user_optional,
    require_roles,
)
from ..services import (
    event_slug,
    format_datetime,
    get_or_create_venue,
    notify_favorites,
    notify_new_event,
    resolve_category,
    serialize_event,
    serialize_reviews,
)

router = APIRouter(prefix="/api/eventos", tags=["eventos"])


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


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
    now = datetime.now(timezone.utc)
    statement = select(Event).where(
        Event.deleted_at.is_(None),
        Event.status != "draft",
    )

    if bairro:
        statement = statement.join(
            Venue, Event.venue_id == Venue.id
        ).where(Venue.neighborhood == bairro)

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
            or_(
                Event.title.ilike(term),
                Event.description.ilike(term),
            )
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

    statement = (
        statement.order_by(Event.starts_at.asc())
        .offset(offset)
        .limit(limit)
    )
    events = (await session.scalars(statement)).all()
    current_user_id = user.id if user else None

    return [
        await serialize_event(session, event, current_user_id=current_user_id)
        for event in events
    ]


@router.get("/{event_id}", response_model=EventRead)
async def get_event(
    event_id: uuid.UUID,
    user: User | None = Depends(get_current_user_optional),
    session: AsyncSession = Depends(get_session),
) -> EventRead:
    event = await session.get(Event, event_id)
    if event is None or event.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento não encontrado",
        )

    return await serialize_event(
        session, event, current_user_id=user.id if user else None
    )


@router.post(
    "",
    response_model=EventRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_event(
    payload: EventCreate,
    user: User = Depends(require_roles("producer", "admin")),
    session: AsyncSession = Depends(get_session),
) -> EventRead:
    starts_at = _aware(payload.starts_at)
    ends_at = _aware(payload.ends_at)
    if ends_at <= starts_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A data de término deve ser posterior à de início",
        )
    if starts_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A data e o horário precisam ser futuros",
        )

    category = await resolve_category(session, payload.category)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Categoria inválida",
        )

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
    session.add(
        EventCategory(
            event_id=event.id,
            category_id=category.id,
            is_primary=True,
        )
    )
    await notify_new_event(
        session,
        event=event,
        category_id=category.id,
        neighborhood=venue.neighborhood,
    )
    await session.commit()
    await session.refresh(event)

    return await serialize_event(session, event, current_user_id=user.id)


@router.patch("/{event_id}", response_model=EventRead)
async def update_event(
    event_id: uuid.UUID,
    payload: EventUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> EventRead:
    event = await session.get(Event, event_id)
    if event is None or event.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento não encontrado",
        )
    if event.organizer_id != user.id and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o criador pode editar este evento",
        )

    starts_at = _aware(payload.starts_at) if payload.starts_at else event.starts_at
    ends_at = _aware(payload.ends_at) if payload.ends_at else event.ends_at
    if ends_at <= starts_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A data de término deve ser posterior à de início",
        )

    should_notify = False

    if payload.title is not None:
        event.title = payload.title.strip()
    if payload.description is not None:
        event.description = payload.description
    if payload.starts_at is not None:
        event.starts_at = starts_at
        should_notify = True
    if payload.ends_at is not None:
        event.ends_at = ends_at
        should_notify = True
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
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Categoria inválida",
            )
        await session.execute(
            delete(EventCategory).where(EventCategory.event_id == event.id)
        )
        session.add(
            EventCategory(
                event_id=event.id,
                category_id=category.id,
                is_primary=True,
            )
        )

    venue_fields = (
        payload.venue_name,
        payload.address,
        payload.neighborhood,
        payload.latitude,
        payload.longitude,
    )
    if any(value is not None for value in venue_fields):
        venue = (
            await session.get(Venue, event.venue_id)
            if event.venue_id
            else None
        )
        venue_name = payload.venue_name or (venue.name if venue else None)
        if venue_name is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Informe o nome do local",
            )
        new_venue = await get_or_create_venue(
            session,
            name=venue_name,
            address=payload.address or (venue.address if venue else None),
            neighborhood=payload.neighborhood
            or (venue.neighborhood if venue else None),
            latitude=payload.latitude
            if payload.latitude is not None
            else (
                float(venue.latitude)
                if venue and venue.latitude is not None
                else None
            ),
            longitude=payload.longitude
            if payload.longitude is not None
            else (
                float(venue.longitude)
                if venue and venue.longitude is not None
                else None
            ),
            created_by=user.id,
        )
        event.venue_id = new_venue.id
        should_notify = True

    if should_notify:
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


@router.post("/{event_id}/cancelar", response_model=EventRead)
async def cancel_event(
    event_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> EventRead:
    event = await session.get(Event, event_id)
    if event is None or event.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento não encontrado",
        )
    if event.organizer_id != user.id and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o criador pode cancelar este evento",
        )

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


@router.post("/{event_id}/favorito", response_model=FavoriteResponse)
async def favorite_event(
    event_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FavoriteResponse:
    event = await session.get(Event, event_id)
    if event is None or event.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento não encontrado",
        )

    existing = await session.get(Favorite, (user.id, event.id))
    if existing is None:
        session.add(Favorite(user_id=user.id, event_id=event.id))
        await session.commit()

    return FavoriteResponse(favorite=True)


@router.delete("/{event_id}/favorito", response_model=FavoriteResponse)
async def unfavorite_event(
    event_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FavoriteResponse:
    favorite = await session.get(Favorite, (user.id, event_id))
    if favorite is not None:
        await session.delete(favorite)
        await session.commit()

    return FavoriteResponse(favorite=False)


@router.get("/{event_id}/avaliacoes", response_model=list[ReviewRead])
async def list_reviews(
    event_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> list[ReviewRead]:
    event = await session.get(Event, event_id)
    if event is None or event.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento não encontrado",
        )

    return await serialize_reviews(session, event.id)


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
    event = await session.get(Event, event_id)
    if event is None or event.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento não encontrado",
        )
    if event.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Evento cancelado não pode ser avaliado",
        )
    if (
        event.status != "finished"
        and event.ends_at >= datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Avaliações são permitidas apenas após o término do evento",
        )

    existing = await session.scalar(
        select(Review).where(
            Review.event_id == event.id,
            Review.user_id == user.id,
        )
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Você já avaliou este evento",
        )

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
