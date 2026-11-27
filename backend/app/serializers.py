"""Conversão de modelos do banco para os schemas expostos pela API."""

from __future__ import annotations

import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from .models import Category, Event, Notification, Report, Review, User, Venue
from .repositories import catalog as catalog_repo
from .repositories import events as events_repo
from .repositories import users as users_repo
from .schemas import (
    EventRead,
    NotificationPreferencesRead,
    NotificationRead,
    ReportRead,
    ReviewRead,
    UserProfileRead,
)

SAO_LUIS_TZ = ZoneInfo("America/Fortaleza")

STATUS_TO_FRONT = {
    "draft": "ATIVO",
    "published": "ATIVO",
    "cancelled": "CANCELADO",
    "finished": "REALIZADO",
}

NOTIFICATION_TYPE_TO_FRONT = {
    "event_reminder": "NOVO_EVENTO_COMPATIVEL",
    "event_update": "ALTERACAO_EVENTO",
    "event_cancel": "CANCELAMENTO_EVENTO",
    "review_reply": "ALTERACAO_EVENTO",
    "system": "ALTERACAO_EVENTO",
}

DEFAULT_NOTIFICATION_MESSAGES = {
    "event_reminder": "Novo evento compatível com seus interesses culturais.",
    "event_update": "O evento que você salvou na agenda sofreu alterações.",
    "event_cancel": "O evento que você salvou na agenda foi cancelado.",
}


def format_datetime(value: datetime) -> str:
    return value.astimezone(SAO_LUIS_TZ).strftime("%d/%m/%Y %H:%M")


def format_date(value: datetime) -> str:
    return value.astimezone(SAO_LUIS_TZ).strftime("%Y-%m-%d")


def format_time_range(starts_at: datetime, ends_at: datetime) -> str:
    starts = starts_at.astimezone(SAO_LUIS_TZ)
    ends = ends_at.astimezone(SAO_LUIS_TZ)
    if starts.date() == ends.date():
        return f"{starts:%H:%M} às {ends:%H:%M}"
    return f"{starts:%d/%m %H:%M} às {ends:%d/%m %H:%M}"


def _review_read(review: Review, authors: dict[uuid.UUID, User]) -> ReviewRead:
    author = authors.get(review.user_id)
    return ReviewRead(
        id=str(review.id),
        author=author.display_name if author else "Usuário",
        author_id=str(review.user_id),
        rating=review.rating,
        comment=review.comment,
        created_at=format_datetime(review.created_at),
    )


async def serialize_reviews(
    session: AsyncSession, event_id: uuid.UUID
) -> list[ReviewRead]:
    reviews = await events_repo.list_reviews(session, event_id)
    authors = await users_repo.get_users(session, (review.user_id for review in reviews))
    return [_review_read(review, authors) for review in reviews]


async def serialize_event(
    session: AsyncSession,
    event: Event,
    current_user_id: uuid.UUID | None = None,
) -> EventRead:
    return (await serialize_events(session, [event], current_user_id))[0]


async def serialize_events(
    session: AsyncSession,
    events: list[Event],
    current_user_id: uuid.UUID | None = None,
) -> list[EventRead]:
    """Carrega os dados relacionados em lote: o número de consultas não cresce
    com a quantidade de eventos."""
    if not events:
        return []

    event_ids = [event.id for event in events]
    categories = await catalog_repo.get_event_categories(session, event_ids)
    venues = await catalog_repo.get_venues(
        session, {event.venue_id for event in events if event.venue_id}
    )
    reviews = await events_repo.list_reviews_for(session, event_ids)
    people = await users_repo.get_users(
        session,
        {event.organizer_id for event in events if event.organizer_id}
        | {review.user_id for items in reviews.values() for review in items},
    )
    favorites = (
        await events_repo.list_favorite_event_ids(session, current_user_id, event_ids)
        if current_user_id is not None
        else set()
    )

    return [
        _event_read(
            event,
            category=categories.get(event.id),
            venue=venues.get(event.venue_id) if event.venue_id else None,
            organizer=people.get(event.organizer_id) if event.organizer_id else None,
            reviews=[_review_read(review, people) for review in reviews[event.id]],
            is_favorite=event.id in favorites,
        )
        for event in events
    ]


def _event_read(
    event: Event,
    *,
    category: Category | None,
    venue: Venue | None,
    organizer: User | None,
    reviews: list[ReviewRead],
    is_favorite: bool,
) -> EventRead:
    return EventRead(
        id=str(event.id),
        title=event.title,
        description=event.description,
        category=category.slug if category else None,
        date=format_date(event.starts_at),
        time=format_time_range(event.starts_at, event.ends_at),
        starts_at=event.starts_at,
        ends_at=event.ends_at,
        location=(venue.address or venue.name) if venue else None,
        neighborhood=venue.neighborhood if venue else None,
        latitude=float(venue.latitude) if venue and venue.latitude is not None else None,
        longitude=(
            float(venue.longitude) if venue and venue.longitude is not None else None
        ),
        banner_url=event.cover_url,
        organizer=organizer.display_name if organizer else None,
        organizer_id=str(event.organizer_id) if event.organizer_id else None,
        status=STATUS_TO_FRONT.get(event.status, "ATIVO"),
        is_favorite=is_favorite,
        reviews=reviews,
        price_cents=event.price_cents,
        is_free=event.is_free,
        capacity=event.capacity,
    )


async def serialize_preferences(
    session: AsyncSession, user_id: uuid.UUID
) -> NotificationPreferencesRead:
    preferences = await users_repo.get_preferences(session, user_id)
    if preferences is None:
        return NotificationPreferencesRead(
            new_events=True,
            event_changes=True,
            weekly_summary=False,
        )

    return NotificationPreferencesRead(
        new_events=preferences.new_events,
        event_changes=preferences.event_changes,
        weekly_summary=preferences.weekly_summary,
    )


async def serialize_profile(session: AsyncSession, user: User) -> UserProfileRead:
    return UserProfileRead(
        id=str(user.id),
        name=user.display_name,
        email=user.email,
        role=user.role,
        neighborhood=user.neighborhood,
        bio=user.bio,
        avatar_url=user.avatar_url,
        member_since=format_date(user.created_at),
        interests=await users_repo.list_interest_names(session, user.id),
        notification_preferences=await serialize_preferences(session, user.id),
    )


async def serialize_notification(
    session: AsyncSession, notification: Notification
) -> NotificationRead:
    event = (
        await events_repo.get_event(session, notification.event_id)
        if notification.event_id
        else None
    )
    message = notification.payload.get("mensagem") if notification.payload else None
    if not message:
        message = DEFAULT_NOTIFICATION_MESSAGES.get(
            notification.kind, "Você tem uma nova atualização no IlhaRolê."
        )

    return NotificationRead(
        id=str(notification.id),
        event_id=str(notification.event_id) if notification.event_id else None,
        event_title=event.title if event else None,
        type=NOTIFICATION_TYPE_TO_FRONT.get(notification.kind, "ALTERACAO_EVENTO"),
        content=message,
        created_at=format_datetime(notification.created_at),
        read=notification.read_at is not None,
    )


async def serialize_report(session: AsyncSession, report: Report) -> ReportRead:
    event = (
        await events_repo.get_event(session, report.event_id)
        if report.event_id
        else None
    )
    return ReportRead(
        id=str(report.id),
        target_type=report.target_type,
        event_id=str(report.event_id) if report.event_id else None,
        event_title=event.title if event else None,
        review_id=str(report.review_id) if report.review_id else None,
        reason=report.reason,
        description=report.description,
        status=report.status,
        created_at=format_datetime(report.created_at),
    )
