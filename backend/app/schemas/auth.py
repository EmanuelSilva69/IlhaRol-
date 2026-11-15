"""Schemas de autenticação e perfil de usuário."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UsuarioCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    email: EmailStr
    senha: str = Field(min_length=8, max_length=128)
    bairro: str | None = Field(default=None, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nome: str
    email: EmailStr
    bairro: str | None
    data_cadastro: datetime


class PreferenciasOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    receber_email: bool = True
    receber_push: bool = True
    lembrete_horas_antes: int = 24


class PreferenciasUpdate(BaseModel):
    receber_email: bool | None = None
    receber_push: bool | None = None
    lembrete_horas_antes: int | None = Field(default=None, ge=0, le=168)


class PerfilOut(UsuarioOut):
    preferencias: PreferenciasOut


class PerfilUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=120)
    bairro: str | None = Field(default=None, max_length=120)
    preferencias: PreferenciasUpdate | None = None
