from __future__ import annotations

import uuid
from collections.abc import Iterable
from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import (
    Category,
    NotificationPreference,
    PasswordResetToken,
    User,
    UserInterest,
)


async def get_user(session: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await session.get(User, user_id)


async def get_users(
    session: AsyncSession, user_ids: Iterable[uuid.UUID]
) -> dict[uuid.UUID, User]:
    ids = set(user_ids)
    if not ids:
        return {}
    result = await session.scalars(select(User).where(User.id.in_(ids)))
    return {user.id: user for user in result}


async def find_by_email(session: AsyncSession, email: str) -> User | None:
    """Busca sem diferenciar maiúsculas, incluindo contas desativadas."""
    return await session.scalar(
        select(User).where(func.lower(User.email) == email.lower())
    )


async def find_active_by_email(session: AsyncSession, email: str) -> User | None:
    return await session.scalar(
        select(User).where(
            func.lower(User.email) == email.lower(),
            User.deleted_at.is_(None),
        )
    )


async def list_active_ids_in_neighborhood(
    session: AsyncSession, neighborhood: str
) -> set[uuid.UUID]:
    return set(
        await session.scalars(
            select(User.id).where(
                User.neighborhood == neighborhood,
                User.deleted_at.is_(None),
                User.is_active.is_(True),
            )
        )
    )


async def get_preferences(
    session: AsyncSession, user_id: uuid.UUID
) -> NotificationPreference | None:
    return await session.get(NotificationPreference, user_id)


async def get_preferences_for(
    session: AsyncSession, user_ids: Iterable[uuid.UUID]
) -> dict[uuid.UUID, NotificationPreference]:
    ids = set(user_ids)
    if not ids:
        return {}
    result = await session.scalars(
        select(NotificationPreference).where(NotificationPreference.user_id.in_(ids))
    )
    return {preference.user_id: preference for preference in result}


async def list_interest_names(
    session: AsyncSession, user_id: uuid.UUID
) -> list[str]:
    result = await session.scalars(
        select(Category.name)
        .join(UserInterest, UserInterest.category_id == Category.id)
        .where(UserInterest.user_id == user_id)
        .order_by(Category.sort_order, Category.name)
    )
    return list(result)


async def list_ids_interested_in(
    session: AsyncSession, category_id: uuid.UUID
) -> set[uuid.UUID]:
    return set(
        await session.scalars(
            select(UserInterest.user_id).where(UserInterest.category_id == category_id)
        )
    )


async def clear_interests(session: AsyncSession, user_id: uuid.UUID) -> None:
    await session.execute(delete(UserInterest).where(UserInterest.user_id == user_id))


async def find_valid_reset_token(
    session: AsyncSession, token_hash: str, now: datetime
) -> PasswordResetToken | None:
    return await session.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
    )
