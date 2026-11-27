from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from ..exceptions import BusinessRuleError, NotFoundError
from ..models import Report, User
from ..repositories import events as events_repo
from ..schemas import ReportCreate, ReportRead
from ..serializers import serialize_report


def _parse_uuid(value: str, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise BusinessRuleError(f"{field} inválido") from exc


async def create_report(
    session: AsyncSession, payload: ReportCreate, user: User
) -> ReportRead:
    """Registra a denúncia para moderação; o conteúdo continua publicado."""
    review_id: uuid.UUID | None = None

    if payload.target_type == "EVENTO":
        if payload.event_id is None:
            raise BusinessRuleError("event_id é obrigatório para denúncia de evento")
        event_id = _parse_uuid(payload.event_id, "event_id")
        if await events_repo.get_active_event(session, event_id) is None:
            raise NotFoundError("Evento não encontrado")
    else:
        if payload.review_id is None:
            raise BusinessRuleError("review_id é obrigatório para denúncia de avaliação")
        review_id = _parse_uuid(payload.review_id, "review_id")
        review = await events_repo.get_review(session, review_id)
        if review is None:
            raise NotFoundError("Avaliação não encontrada")
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
