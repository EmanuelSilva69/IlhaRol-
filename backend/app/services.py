from __future__ import annotations

import re
import unicodedata
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import (
    Category,
    Event,
    EventCategory,
    Favorite,
    Notification,
    NotificationPreference,
    Report,
    Review,
    User,
    UserInterest,
    Venue,
)
from .schemas import (
    EventRead,
    NotificationRead,
    NotificationPreferencesRead,
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

CATEGORY_ALIASES = {
    "bumba-meu-boi": "bumba-meu-boi",
    "musica-e-reggae": "reggae",
    "musica-reggae": "reggae",
    "reggae": "reggae",
    "teatro": "teatro",
    "gastronomia": "gastronomia",
    "museus": "museus",
    "museu": "museus",
    "tambor-de-crioula": "tambor-de-crioula",
    "samba-e-pagode": "samba-pagode",
    "samba-pagode": "samba-pagode",
    "pagode": "samba-pagode",
    "orla-e-praia": "orla-praia",
    "orla-praia": "orla-praia",
    "praia": "orla-praia",
    "feirinhas": "feirinhas-artesanato",
    "feirinhas-e-artesanato": "feirinhas-artesanato",
    "feirinhas-artesanato": "feirinhas-artesanato",
    "artesanato": "feirinhas-artesanato",
    "cinema": "cinema-audiovisual",
    "cinema-audiovisual": "cinema-audiovisual",
    "audiovisual": "cinema-audiovisual",
}


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    base = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    return base or "item"


def event_slug(title: str) -> str:
    return f"{slugify(title)}-{uuid.uuid4().hex[:8]}"


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


async def get_event_category(
    session: AsyncSession, event_id: uuid.UUID
) -> Category | None:
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


async def serialize_reviews(
    session: AsyncSession, event_id: uuid.UUID
) -> list[ReviewRead]:
    reviews = (
        await session.scalars(
            select(Review)
            .where(Review.event_id == event_id)
            .order_by(Review.created_at.desc())
        )
    ).all()

    user_ids = {review.user_id for review in reviews}
    users: dict[uuid.UUID, User] = {}
    if user_ids:
        result = await session.scalars(select(User).where(User.id.in_(user_ids)))
        users = {user.id: user for user in result}

    payloads: list[ReviewRead] = []
    for review in reviews:
        author = users.get(review.user_id)
        payloads.append(
            ReviewRead(
                id=str(review.id),
                author=author.display_name if author else "Usuário",
                author_id=str(review.user_id),
                rating=review.rating,
                comment=review.comment,
                created_at=format_datetime(review.created_at),
            )
        )

    return payloads


async def serialize_event(
    session: AsyncSession,
    event: Event,
    current_user_id: uuid.UUID | None = None,
) -> EventRead:
    category = await get_event_category(session, event.id)
    venue = await session.get(Venue, event.venue_id) if event.venue_id else None
    organizer = (
        await session.get(User, event.organizer_id) if event.organizer_id else None
    )
    reviews = await serialize_reviews(session, event.id)

    is_favorite = False
    if current_user_id is not None:
        is_favorite = (
            await session.get(Favorite, (current_user_id, event.id)) is not None
        )

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


async def user_interests(session: AsyncSession, user_id: uuid.UUID) -> list[str]:
    result = await session.scalars(
        select(Category.name)
        .join(UserInterest, UserInterest.category_id == Category.id)
        .where(UserInterest.user_id == user_id)
        .order_by(Category.sort_order, Category.name)
    )
    return list(result)


async def notification_preferences(
    session: AsyncSession, user_id: uuid.UUID
) -> NotificationPreferencesRead:
    preferences = await session.get(NotificationPreference, user_id)
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


async def serialize_profile(
    session: AsyncSession, user: User
) -> UserProfileRead:
    interests = await user_interests(session, user.id)
    preferences = await notification_preferences(session, user.id)

    return UserProfileRead(
        id=str(user.id),
        name=user.display_name,
        email=user.email,
        role=user.role,
        neighborhood=user.neighborhood,
        bio=user.bio,
        avatar_url=user.avatar_url,
        member_since=format_date(user.created_at),
        interests=interests,
        notification_preferences=preferences,
    )


async def serialize_notification(
    session: AsyncSession, notification: Notification
) -> NotificationRead:
    event = (
        await session.get(Event, notification.event_id)
        if notification.event_id
        else None
    )
    message = notification.payload.get("mensagem") if notification.payload else None

    if not message:
        if notification.kind == "event_reminder":
            message = "Novo evento compatível com seus interesses culturais."
        elif notification.kind == "event_update":
            message = "O evento que você salvou na agenda sofreu alterações."
        elif notification.kind == "event_cancel":
            message = "O evento que você salvou na agenda foi cancelado."
        else:
            message = "Você tem uma nova atualização no IlhaRolê."

    return NotificationRead(
        id=str(notification.id),
        event_id=str(notification.event_id) if notification.event_id else None,
        event_title=event.title if event else None,
        type=NOTIFICATION_TYPE_TO_FRONT.get(
            notification.kind, "ALTERACAO_EVENTO"
        ),
        content=message,
        created_at=format_datetime(notification.created_at),
        read=notification.read_at is not None,
    )


async def serialize_report(
    session: AsyncSession, report: Report
) -> ReportRead:
    event = (
        await session.get(Event, report.event_id)
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


async def resolve_category(
    session: AsyncSession, value: str
) -> Category | None:
    raw = value.strip()
    alias = CATEGORY_ALIASES.get(slugify(raw))

    for candidate in [alias, raw]:
        if not candidate:
            continue

        category = await session.scalar(
            select(Category).where(Category.slug == candidate)
        )
        if category is not None:
            return category

    return await session.scalar(
        select(Category).where(Category.name.ilike(raw))
    )


async def get_or_create_venue(
    session: AsyncSession,
    *,
    name: str,
    address: str | None,
    neighborhood: str | None,
    latitude: float | None,
    longitude: float | None,
    created_by: uuid.UUID,
) -> Venue:
    slug = slugify(name)
    venue = await session.scalar(select(Venue).where(Venue.slug == slug))
    if venue is None:
        venue = Venue(
            slug=slug,
            name=name,
            address=address,
            neighborhood=neighborhood,
            latitude=latitude,
            longitude=longitude,
            created_by=created_by,
        )
        session.add(venue)
        await session.flush()
        return venue

    changed = False
    if address and not venue.address:
        venue.address = address
        changed = True
    if neighborhood and not venue.neighborhood:
        venue.neighborhood = neighborhood
        changed = True
    if latitude is not None and venue.latitude is None:
        venue.latitude = latitude
        changed = True
    if longitude is not None and venue.longitude is None:
        venue.longitude = longitude
        changed = True
    if changed:
        await session.flush()

    return venue


async def notify_favorites(
    session: AsyncSession,
    *,
    event: Event,
    kind: str,
    message: str,
) -> None:
    favorite_user_ids = list(
        await session.scalars(
            select(Favorite.user_id).where(Favorite.event_id == event.id)
        )
    )
    if not favorite_user_ids:
        return

    preference_result = await session.scalars(
        select(NotificationPreference).where(
            NotificationPreference.user_id.in_(favorite_user_ids)
        )
    )
    preferences = {
        preference.user_id: preference for preference in preference_result
    }

    for user_id in favorite_user_ids:
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
    """Notifica usuários com interesse na categoria ou no bairro (RF08)."""
    interested_ids: set[uuid.UUID] = set(
        await session.scalars(
            select(UserInterest.user_id).where(
                UserInterest.category_id == category_id
            )
        )
    )

    if neighborhood:
        neighborhood_ids = set(
            await session.scalars(
                select(User.id).where(
                    User.neighborhood == neighborhood,
                    User.deleted_at.is_(None),
                    User.is_active.is_(True),
                )
            )
        )
        interested_ids |= neighborhood_ids

    if event.organizer_id in interested_ids:
        interested_ids.discard(event.organizer_id)

    if not interested_ids:
        return

    preference_result = await session.scalars(
        select(NotificationPreference).where(
            NotificationPreference.user_id.in_(interested_ids)
        )
    )
    preferences = {
        preference.user_id: preference for preference in preference_result
    }

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
                        f"Novo evento compatível com seus interesses: "
                        f"“{event.title}”."
                    )
                },
            )
        )
