from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..db import get_session
from ..models import (
    NotificationPreference,
    PasswordResetToken,
    User,
    UserInterest,
)
from ..schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from ..security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from ..services import resolve_category, serialize_profile

router = APIRouter(prefix="/api/auth", tags=["autenticação"])
settings = get_settings()


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def _add_interests(
    session: AsyncSession,
    user_id: uuid.UUID,
    interests: list[str],
) -> None:
    for value in interests:
        category = await resolve_category(session, value)
        if category is not None:
            session.add(
                UserInterest(user_id=user_id, category_id=category.id)
            )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    email = str(payload.email).lower()
    existing = await session.scalar(
        select(User).where(func.lower(User.email) == email)
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-mail já cadastrado",
        )

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
    await _add_interests(session, user.id, payload.interests)

    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-mail já cadastrado",
        ) from exc

    await session.refresh(user)
    return TokenResponse(
        access_token=create_access_token(user.id),
        user=await serialize_profile(session, user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    user = await session.scalar(
        select(User).where(
            func.lower(User.email) == str(payload.email).lower(),
            User.deleted_at.is_(None),
        )
    )

    if user is None or not user.is_active or not verify_password(
        payload.password, user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )

    return TokenResponse(
        access_token=create_access_token(user.id),
        user=await serialize_profile(session, user),
    )


@router.get("/me")
async def me(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await serialize_profile(session, user)


@router.post("/logout", response_model=MessageResponse)
async def logout() -> MessageResponse:
    return MessageResponse(
        message="Sessão encerrada no cliente. Tokens JWT são stateless."
    )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    session: AsyncSession = Depends(get_session),
) -> ForgotPasswordResponse:
    user = await session.scalar(
        select(User).where(
            func.lower(User.email) == str(payload.email).lower(),
            User.deleted_at.is_(None),
        )
    )

    token: str | None = None
    if user is not None:
        token = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)
        session.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=_token_hash(token),
                expires_at=now + timedelta(minutes=30),
            )
        )
        await session.commit()

    return ForgotPasswordResponse(
        message=(
            "Se o e-mail estiver cadastrado, enviaremos um link de "
            "redefinição de uso único."
        ),
        reset_token=token if settings.debug else None,
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    session: AsyncSession = Depends(get_session),
) -> MessageResponse:
    now = datetime.now(timezone.utc)
    reset_token = await session.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == _token_hash(payload.token),
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
    )

    if reset_token is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido, expirado ou já utilizado",
        )

    user = await session.get(User, reset_token.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário não encontrado",
        )

    user.password_hash = hash_password(payload.new_password)
    reset_token.used_at = now
    await session.commit()

    return MessageResponse(message="Senha redefinida com sucesso")


@router.delete("/account", response_model=MessageResponse)
async def delete_account(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> MessageResponse:
    user.is_active = False
    user.deleted_at = datetime.now(timezone.utc)
    await session.commit()
    return MessageResponse(message="Conta desativada")
