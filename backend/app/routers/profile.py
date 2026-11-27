from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import User
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
from ..security import get_current_user
from ..services import profile as profile_service

router = APIRouter(prefix="/api/me", tags=["perfil"])


@router.get("/perfil", response_model=UserProfileRead)
async def get_profile(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserProfileRead:
    return await profile_service.get_profile(session, user)


@router.patch("/perfil", response_model=UserProfileRead)
async def update_profile(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserProfileRead:
    return await profile_service.update_profile(session, user, payload)


@router.post("/senha", response_model=MessageResponse)
async def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> MessageResponse:
    await profile_service.change_password(
        session, user, payload.current_password, payload.new_password
    )
    return MessageResponse(message="Senha alterada com sucesso")


@router.get("/preferencias", response_model=NotificationPreferencesRead)
async def get_preferences(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> NotificationPreferencesRead:
    return await profile_service.get_preferences(session, user)


@router.put("/preferencias", response_model=NotificationPreferencesRead)
async def update_preferences(
    payload: NotificationPreferencesUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> NotificationPreferencesRead:
    return await profile_service.update_preferences(session, user, payload)


@router.get("/agenda", response_model=list[EventRead])
async def get_agenda(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[EventRead]:
    return await profile_service.get_agenda(session, user)


@router.get("/eventos", response_model=list[EventRead])
async def get_my_events(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[EventRead]:
    return await profile_service.list_my_events(session, user)


@router.get("/notificacoes", response_model=list[NotificationRead])
async def get_notifications(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[NotificationRead]:
    return await profile_service.list_notifications(session, user)


@router.post("/notificacoes/lidas", response_model=MessageResponse)
async def mark_notifications_read(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> MessageResponse:
    count = await profile_service.mark_notifications_read(session, user)
    return MessageResponse(
        message=f"{count} notificação(ões) marcada(s) como lida(s)"
    )


@router.get("/denuncias", response_model=list[ReportRead])
async def get_my_reports(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ReportRead]:
    return await profile_service.list_my_reports(session, user)
