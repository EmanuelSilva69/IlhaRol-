"""Schemas de favoritos, avaliações e denúncias."""

import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator

from ..models import SituacaoDenuncia


class FavoritoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    evento_id: uuid.UUID
    data_salvamento: datetime


class AvaliacaoCreate(BaseModel):
    nota: Annotated[int, Field(ge=1, le=5, strict=True)]
    comentario: str | None = Field(default=None, max_length=2000)


class AutorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nome: str


class AvaliacaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    evento_id: uuid.UUID
    nota: int
    comentario: str | None
    data_criacao: datetime
    autor: AutorOut = Field(validation_alias="usuario")


class DenunciaCreate(BaseModel):
    evento_id: uuid.UUID | None = None
    avaliacao_id: uuid.UUID | None = None
    motivo: str = Field(min_length=1, max_length=200)
    descricao: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def _exactly_one_target(self) -> "DenunciaCreate":
        if (self.evento_id is None) == (self.avaliacao_id is None):
            raise ValueError("Informe exatamente um alvo: evento_id ou avaliacao_id")
        return self


class DenunciaOut(BaseModel):
    """A identidade do denunciante não é exposta."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    evento_id: uuid.UUID | None
    avaliacao_id: uuid.UUID | None
    motivo: str
    situacao: SituacaoDenuncia
    data_criacao: datetime
