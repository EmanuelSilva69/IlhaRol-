"""Notificações e denúncias do usuário."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Notification, Report


async def list_notifications(
    session: AsyncSession, user_id: uuid.UUID
) -> list[Notification]:
    return list(
        await session.scalars(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
        )
    )


async def list_unread_notifications(
    session: AsyncSession, user_id: uuid.UUID
) -> list[Notification]:
    return list(
        await session.scalars(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
            )
        )
    )


async def list_reports_by(session: AsyncSession, reporter_id: uuid.UUID) -> list[Report]:
    return list(
        await session.scalars(
            select(Report)
            .where(Report.reporter_id == reporter_id)
            .order_by(Report.created_at.desc())
        )
    )
