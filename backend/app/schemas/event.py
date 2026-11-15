"""Schemas de eventos."""

import enum
import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..models import SituacaoEvento


def _ensure_future(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    if value <= datetime.now(timezone.utc):
        raise ValueError("A data e hora do evento devem estar no futuro")
    return value


class Periodo(str, enum.Enum):
    HOJE = "hoje"
    SEMANA = "semana"
    MES = "mes"


class CategoriaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nome: str


class OrganizadorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nome: str


class EventoCreate(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    descricao: str = Field(default="", max_length=5000)
    data_hora: datetime
    local: str = Field(min_length=1, max_length=200)
    bairro: str = Field(min_length=1, max_length=120)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    imagem_url: str | None = Field(default=None, max_length=500)
    categoria_id: uuid.UUID

    @field_validator("data_hora")
    @classmethod
    def _future(cls, value: datetime) -> datetime:
        return _ensure_future(value)


class EventoUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=1, max_length=200)
    descricao: str | None = Field(default=None, max_length=5000)
    data_hora: datetime | None = None
    local: str | None = Field(default=None, min_length=1, max_length=200)
    bairro: str | None = Field(default=None, min_length=1, max_length=120)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    imagem_url: str | None = Field(default=None, max_length=500)
    categoria_id: uuid.UUID | None = None

    @field_validator("data_hora")
    @classmethod
    def _future(cls, value: datetime | None) -> datetime | None:
        return None if value is None else _ensure_future(value)


class EventoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    titulo: str
    descricao: str
    data_hora: datetime
    local: str
    bairro: str
    latitude: float
    longitude: float
    imagem_url: str | None
    situacao: SituacaoEvento
    categoria: CategoriaOut
    organizador: OrganizadorOut = Field(validation_alias="criador")
