from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import (
    Event,
    Favorite,
    Notification,
    NotificationPreference,
    Report,
    User,
    UserInterest,
)
from ..schemas import (
    ChangePasswordRequest,
    EventRead,
    MessageResponse,
    NotificationPreferencesRead,
    NotificationPreferencesUpdate,
    NotificationRead,
    ProfileUpdate,
    ReportRead,
    UserProfileRead,
)
from ..security import get_current_user, hash_password, verify_password
from ..services import (
    resolve_category,
    serialize_event,
    serialize_notification,
    serialize_profile,
    serialize_report,
)

router = APIRouter(prefix="/api/me", tags=["perfil"])


@router.get("/perfil", response_model=UserProfileRead)
async def get_profile(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserProfileRead:
    return await serialize_profile(session, user)


@router.patch("/perfil", response_model=UserProfileRead)
async def update_profile(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
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
        await session.execute(
            delete(UserInterest).where(UserInterest.user_id == user.id)
        )
        for value in payload.interests:
            category = await resolve_category(session, value)
            if category is not None:
                session.add(
                    UserInterest(user_id=user.id, category_id=category.id)
                )

    await session.commit()
    await session.refresh(user)
    return await serialize_profile(session, user)


@router.post("/senha", response_model=MessageResponse)
async def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> MessageResponse:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta",
        )

    user.password_hash = hash_password(payload.new_password)
    await session.commit()
    return MessageResponse(message="Senha alterada com sucesso")


@router.get("/preferencias", response_model=NotificationPreferencesRead)
async def get_preferences(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> NotificationPreferencesRead:
    preferences = await session.get(NotificationPreference, user.id)
    if preferences is None:
        preferences = NotificationPreference(user_id=user.id)
        session.add(preferences)
        await session.commit()

    return NotificationPreferencesRead(
        new_events=preferences.new_events,
        event_changes=preferences.event_changes,
        weekly_summary=preferences.weekly_summary,
    )


@router.put("/preferencias", response_model=NotificationPreferencesRead)
async def update_preferences(
    payload: NotificationPreferencesUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> NotificationPreferencesRead:
    preferences = await session.get(NotificationPreference, user.id)
    if preferences is None:
        preferences = NotificationPreference(user_id=user.id)
        session.add(preferences)

    if payload.new_events is not None:
        preferences.new_events = payload.new_events
    if payload.event_changes is not None:
        preferences.event_changes = payload.event_changes
    if payload.weekly_summary is not None:
        preferences.weekly_summary = payload.weekly_summary

    await session.commit()
    return NotificationPreferencesRead(
        new_events=preferences.new_events,
        event_changes=preferences.event_changes,
        weekly_summary=preferences.weekly_summary,
    )


@router.get("/agenda", response_model=list[EventRead])
async def get_favorites(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[EventRead]:
    events = (
        await session.scalars(
            select(Event)
            .join(Favorite, Favorite.event_id == Event.id)
            .where(
                Favorite.user_id == user.id,
                Event.deleted_at.is_(None),
            )
            .order_by(Event.starts_at)
        )
    ).all()

    return [
        await serialize_event(session, event, current_user_id=user.id)
        for event in events
    ]


@router.get("/notificacoes", response_model=list[NotificationRead])
async def get_notifications(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[NotificationRead]:
    notifications = (
        await session.scalars(
            select(Notification)
            .where(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc())
        )
    ).all()

    return [
        await serialize_notification(session, notification)
        for notification in notifications
    ]


@router.post("/notificacoes/lidas", response_model=MessageResponse)
async def mark_notifications_read(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> MessageResponse:
    notifications = (
        await session.scalars(
            select(Notification).where(
                Notification.user_id == user.id,
                Notification.read_at.is_(None),
            )
        )
    ).all()

    for notification in notifications:
        notification.read_at = datetime.now(timezone.utc)

    await session.commit()
    return MessageResponse(
        message=f"{len(notifications)} notificação(ões) marcada(s) como lida(s)"
    )


@router.get("/denuncias", response_model=list[ReportRead])
async def get_my_reports(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ReportRead]:
    reports = (
        await session.scalars(
            select(Report)
            .where(Report.reporter_id == user.id)
            .order_by(Report.created_at.desc())
        )
    ).all()

    return [
        await serialize_report(session, report) for report in reports
    ]
