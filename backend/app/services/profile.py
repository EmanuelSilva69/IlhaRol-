from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from ..exceptions import BusinessRuleError
from ..models import NotificationPreference, User
from ..repositories import activity as activity_repo
from ..repositories import events as events_repo
from ..repositories import users as users_repo
from ..schemas import (
    EventRead,
    NotificationPreferencesRead,
    NotificationPreferencesUpdate,
    NotificationRead,
    ProfileUpdate,
    ReportRead,
    UserProfileRead,
)
from ..security import hash_password, verify_password
from ..serializers import (
    serialize_events,
    serialize_notification,
    serialize_profile,
    serialize_report,
)
from .auth import add_interests


async def get_profile(session: AsyncSession, user: User) -> UserProfileRead:
    return await serialize_profile(session, user)


async def update_profile(
    session: AsyncSession, user: User, payload: ProfileUpdate
) -> UserProfileRead:
    if payload.name is not None:
        user.display_name = payload.name.strip()
    if payload.neighborhood is not None:
        user.neighborhood = payload.neighborhood
    if payload.bio is not None:
        user.bio = payload.bio
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url

    if payload.interests is not None:
        await users_repo.clear_interests(session, user.id)
        await add_interests(session, user.id, payload.interests)

    await session.commit()
    await session.refresh(user)
    return await serialize_profile(session, user)


async def change_password(
    session: AsyncSession, user: User, current_password: str, new_password: str
) -> None:
    if not verify_password(current_password, user.password_hash):
        raise BusinessRuleError("Senha atual incorreta")

    user.password_hash = hash_password(new_password)
    await session.commit()


def _preferences_read(preferences: NotificationPreference) -> NotificationPreferencesRead:
    return NotificationPreferencesRead(
        new_events=preferences.new_events,
        event_changes=preferences.event_changes,
        weekly_summary=preferences.weekly_summary,
    )


async def _get_or_create_preferences(
    session: AsyncSession, user: User
) -> NotificationPreference:
    preferences = await users_repo.get_preferences(session, user.id)
    if preferences is None:
        preferences = NotificationPreference(user_id=user.id)
        session.add(preferences)
    return preferences


async def get_preferences(
    session: AsyncSession, user: User
) -> NotificationPreferencesRead:
    preferences = await _get_or_create_preferences(session, user)
    await session.commit()
    return _preferences_read(preferences)


async def update_preferences(
    session: AsyncSession, user: User, payload: NotificationPreferencesUpdate
) -> NotificationPreferencesRead:
    preferences = await _get_or_create_preferences(session, user)
    if payload.new_events is not None:
        preferences.new_events = payload.new_events
    if payload.event_changes is not None:
        preferences.event_changes = payload.event_changes
    if payload.weekly_summary is not None:
        preferences.weekly_summary = payload.weekly_summary

    await session.commit()
    return _preferences_read(preferences)


async def get_agenda(session: AsyncSession, user: User) -> list[EventRead]:
    events = await events_repo.list_favorited_by(session, user.id)
    return await serialize_events(session, events, current_user_id=user.id)


async def list_my_events(session: AsyncSession, user: User) -> list[EventRead]:
    """Todas as publicações do organizador, inclusive rascunhos e canceladas."""
    events = await events_repo.list_by_organizer(session, user.id)
    return await serialize_events(session, events, current_user_id=user.id)


async def list_notifications(session: AsyncSession, user: User) -> list[NotificationRead]:
    return [
        await serialize_notification(session, notification)
        for notification in await activity_repo.list_notifications(session, user.id)
    ]


async def mark_notifications_read(session: AsyncSession, user: User) -> int:
    notifications = await activity_repo.list_unread_notifications(session, user.id)
    now = datetime.now(timezone.utc)
    for notification in notifications:
        notification.read_at = now
    await session.commit()
    return len(notifications)


async def list_my_reports(session: AsyncSession, user: User) -> list[ReportRead]:
    return [
        await serialize_report(session, report)
        for report in await activity_repo.list_reports_by(session, user.id)
    ]
