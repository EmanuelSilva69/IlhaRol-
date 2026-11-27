from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..db import get_session
from ..models import User
from ..schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserProfileRead,
)
from ..security import get_current_user
from ..services import auth as auth_service
from ..services import profile as profile_service

router = APIRouter(prefix="/api/auth", tags=["autenticação"])
settings = get_settings()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    return await auth_service.register(session, payload)


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    return await auth_service.login(session, str(payload.email), payload.password)


@router.get("/me", response_model=UserProfileRead)
async def me(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserProfileRead:
    return await profile_service.get_profile(session, user)


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
    return await auth_service.forgot_password(
        session, str(payload.email), expose_token=settings.debug
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    session: AsyncSession = Depends(get_session),
) -> MessageResponse:
    await auth_service.reset_password(session, payload)
    return MessageResponse(message="Senha redefinida com sucesso")


@router.delete("/account", response_model=MessageResponse)
async def delete_account(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> MessageResponse:
    await auth_service.deactivate_account(session, user)
    return MessageResponse(message="Conta desativada")
