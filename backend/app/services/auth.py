from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..exceptions import AuthenticationError, BusinessRuleError, ConflictError
from ..models import NotificationPreference, PasswordResetToken, User, UserInterest
from ..repositories import users as users_repo
from ..schemas import (
    ForgotPasswordResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from ..security import create_access_token, hash_password, verify_password
from ..serializers import serialize_profile
from .catalog import resolve_category

RESET_TOKEN_TTL = timedelta(minutes=30)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def add_interests(
    session: AsyncSession, user_id: uuid.UUID, interests: list[str]
) -> None:
    """Associa as categorias reconhecidas; valores desconhecidos são ignorados."""
    for value in interests:
        category = await resolve_category(session, value)
        if category is not None:
            session.add(UserInterest(user_id=user_id, category_id=category.id))


async def _token_response(session: AsyncSession, user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id),
        user=await serialize_profile(session, user),
    )


async def register(session: AsyncSession, payload: RegisterRequest) -> TokenResponse:
    email = str(payload.email).lower()
    if await users_repo.find_by_email(session, email) is not None:
        raise ConflictError("E-mail já cadastrado")

    user = User(
        email=email,
        display_name=payload.name.strip(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        neighborhood=payload.neighborhood,
        is_active=True,
    )
    session.add(user)
    await session.flush()

    session.add(NotificationPreference(user_id=user.id))
    await add_interests(session, user.id, payload.interests)

    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ConflictError("E-mail já cadastrado") from exc

    await session.refresh(user)
    return await _token_response(session, user)


async def login(session: AsyncSession, email: str, password: str) -> TokenResponse:
    user = await users_repo.find_active_by_email(session, email)
    if user is None or not user.is_active or not verify_password(
        password, user.password_hash
    ):
        raise AuthenticationError("Credenciais inválidas")

    return await _token_response(session, user)


async def forgot_password(
    session: AsyncSession, email: str, *, expose_token: bool
) -> ForgotPasswordResponse:
    """Gera token de uso único; a resposta não revela se o e-mail existe."""
    user = await users_repo.find_active_by_email(session, email)

    token: str | None = None
    if user is not None:
        token = secrets.token_urlsafe(32)
        session.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=_token_hash(token),
                expires_at=datetime.now(timezone.utc) + RESET_TOKEN_TTL,
            )
        )
        await session.commit()

    return ForgotPasswordResponse(
        message=(
            "Se o e-mail estiver cadastrado, enviaremos um link de "
            "redefinição de uso único."
        ),
        reset_token=token if expose_token else None,
    )


async def reset_password(session: AsyncSession, payload: ResetPasswordRequest) -> None:
    now = datetime.now(timezone.utc)
    reset_token = await users_repo.find_valid_reset_token(
        session, _token_hash(payload.token), now
    )
    if reset_token is None:
        raise BusinessRuleError("Token inválido, expirado ou já utilizado")

    user = await users_repo.get_user(session, reset_token.user_id)
    if user is None:
        raise BusinessRuleError("Usuário não encontrado")

    user.password_hash = hash_password(payload.new_password)
    reset_token.used_at = now
    await session.commit()


async def deactivate_account(session: AsyncSession, user: User) -> None:
    user.is_active = False
    user.deleted_at = datetime.now(timezone.utc)
    await session.commit()
