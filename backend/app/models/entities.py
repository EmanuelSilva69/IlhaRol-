"""Modelos ORM espelhando o Diagrama de Classes (PRD v2, Seção 8)."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    TypeDecorator,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator[datetime]):
    """Armazena sempre em UTC e devolve datetime com timezone.

    Garante o mesmo comportamento no PostgreSQL (timestamptz) e no SQLite
    usado nos testes, que não guarda fuso horário.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class Base(DeclarativeBase):
    pass


class SituacaoEvento(str, enum.Enum):
    ATIVO = "ATIVO"
    CANCELADO = "CANCELADO"
    REALIZADO = "REALIZADO"


class SituacaoDenuncia(str, enum.Enum):
    PENDENTE = "PENDENTE"
    PROCEDENTE = "PROCEDENTE"
    IMPROCEDENTE = "IMPROCEDENTE"


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    nome: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hash_senha: Mapped[str] = mapped_column(String(255))
    bairro: Mapped[str | None] = mapped_column(String(120))
    data_cadastro: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    eventos: Mapped[list["Evento"]] = relationship(back_populates="criador")
    preferencias: Mapped["PreferenciasNotificacao | None"] = relationship(
        back_populates="usuario", uselist=False, cascade="all, delete-orphan"
    )


class Categoria(Base):
    __tablename__ = "categorias"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    nome: Mapped[str] = mapped_column(String(80), unique=True)
    descricao: Mapped[str | None] = mapped_column(Text)


class Evento(Base):
    __tablename__ = "eventos"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    criador_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id"), index=True)
    categoria_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("categorias.id"), index=True
    )
    titulo: Mapped[str] = mapped_column(String(200))
    descricao: Mapped[str] = mapped_column(Text, default="")
    data_hora: Mapped[datetime] = mapped_column(UTCDateTime, index=True)
    local: Mapped[str] = mapped_column(String(200))
    bairro: Mapped[str] = mapped_column(String(120), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    imagem_url: Mapped[str | None] = mapped_column(String(500))
    situacao: Mapped[SituacaoEvento] = mapped_column(
        Enum(SituacaoEvento, name="situacao_evento"), default=SituacaoEvento.ATIVO
    )

    criador: Mapped[Usuario] = relationship(back_populates="eventos", lazy="joined")
    categoria: Mapped[Categoria] = relationship(lazy="joined")


class Favorito(Base):
    __tablename__ = "favoritos"
    __table_args__ = (UniqueConstraint("usuario_id", "evento_id"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), index=True
    )
    evento_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("eventos.id", ondelete="CASCADE"), index=True
    )
    data_salvamento: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    evento: Mapped[Evento] = relationship()


class Avaliacao(Base):
    __tablename__ = "avaliacoes"
    __table_args__ = (
        UniqueConstraint("usuario_id", "evento_id"),
        CheckConstraint("nota BETWEEN 1 AND 5", name="ck_avaliacao_nota"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), index=True
    )
    evento_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("eventos.id", ondelete="CASCADE"), index=True
    )
    nota: Mapped[int] = mapped_column(Integer)
    comentario: Mapped[str | None] = mapped_column(Text)
    data_criacao: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    usuario: Mapped[Usuario] = relationship(lazy="joined")


class Notificacao(Base):
    __tablename__ = "notificacoes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), index=True
    )
    evento_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("eventos.id", ondelete="CASCADE")
    )
    mensagem: Mapped[str] = mapped_column(Text)
    lida: Mapped[bool] = mapped_column(Boolean, default=False)
    data_envio: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)


class PreferenciasNotificacao(Base):
    __tablename__ = "preferencias_notificacao"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True
    )
    receber_email: Mapped[bool] = mapped_column(Boolean, default=True)
    receber_push: Mapped[bool] = mapped_column(Boolean, default=True)
    lembrete_horas_antes: Mapped[int] = mapped_column(Integer, default=24)

    usuario: Mapped[Usuario] = relationship(back_populates="preferencias")


class Denuncia(Base):
    __tablename__ = "denuncias"
    __table_args__ = (
        CheckConstraint(
            "(evento_id IS NOT NULL) <> (avaliacao_id IS NOT NULL)",
            name="ck_denuncia_alvo_unico",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    denunciante_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), index=True
    )
    evento_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("eventos.id", ondelete="CASCADE")
    )
    avaliacao_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("avaliacoes.id", ondelete="CASCADE")
    )
    motivo: Mapped[str] = mapped_column(String(200))
    descricao: Mapped[str | None] = mapped_column(Text)
    situacao: Mapped[SituacaoDenuncia] = mapped_column(
        Enum(SituacaoDenuncia, name="situacao_denuncia"),
        default=SituacaoDenuncia.PENDENTE,
    )
    data_criacao: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)


class TokenRecuperacao(Base):
    __tablename__ = "tokens_recuperacao"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True)
    expira_em: Mapped[datetime] = mapped_column(UTCDateTime)
    usado: Mapped[bool] = mapped_column(Boolean, default=False)
