from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import Event, Report, Review, User
from ..schemas import ReportCreate, ReportRead
from ..security import get_current_user
from ..services import serialize_report

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
    event_id: uuid.UUID | None = None
    review_id: uuid.UUID | None = None

    if payload.target_type == "EVENTO":
        if payload.event_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="event_id é obrigatório para denúncia de evento",
            )
        try:
            event_id = uuid.UUID(payload.event_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="event_id inválido",
            ) from exc

        event = await session.get(Event, event_id)
        if event is None or event.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evento não encontrado",
            )
    else:
        if payload.review_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="review_id é obrigatório para denúncia de avaliação",
            )
        try:
            review_id = uuid.UUID(payload.review_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="review_id inválido",
            ) from exc

        review = await session.get(Review, review_id)
        if review is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Avaliação não encontrada",
            )
        event_id = review.event_id

    report = Report(
        reporter_id=user.id,
        target_type=payload.target_type,
        event_id=event_id,
        review_id=review_id,
        reason=payload.reason,
        description=payload.description,
        status="EM_ANALISE",
    )
    session.add(report)
    await session.commit()
    await session.refresh(report)

    return await serialize_report(session, report)
