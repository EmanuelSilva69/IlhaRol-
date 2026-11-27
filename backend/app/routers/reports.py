from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import User
from ..schemas import ReportCreate, ReportRead
from ..security import get_current_user
from ..services import reports as reports_service

router = APIRouter(tags=["denúncias"])


@router.post(
    "/api/denuncias",
    response_model=ReportRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_report(
    payload: ReportCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReportRead:
    return await reports_service.create_report(session, payload, user)
