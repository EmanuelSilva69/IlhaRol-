from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from .neighborhoods import ensure_supported_neighborhood

UserRole = Literal["visitor", "producer", "admin"]
FeedPeriod = Literal["PROXIMOS", "FIM_DE_SEMANA", "PASSADOS"]
Neighborhood = Annotated[str, AfterValidator(ensure_supported_neighborhood)]

FREE_EVENT_WITH_PRICE = "Evento gratuito não pode ter preço"


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    neighborhood: Neighborhood | None = None
    interests: list[str] = Field(default_factory=list)
    role: Literal["visitor", "producer"] = "visitor"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class NotificationPreferencesRead(BaseModel):
    new_events: bool
    event_changes: bool
    weekly_summary: bool


class NotificationPreferencesUpdate(BaseModel):
    new_events: bool | None = None
    event_changes: bool | None = None
    weekly_summary: bool | None = None


class UserProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: EmailStr
    role: UserRole
    neighborhood: str | None
    bio: str | None
    avatar_url: str | None
    member_since: str
    interests: list[str]
    notification_preferences: NotificationPreferencesRead


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    neighborhood: Neighborhood | None = None
    bio: str | None = Field(default=None, max_length=500)
    avatar_url: str | None = Field(default=None, max_length=500)
    interests: list[str] | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileRead


class ReviewRead(BaseModel):
    id: str
    author: str
    author_id: str | None
    rating: int
    comment: str | None
    created_at: str


class EventRead(BaseModel):
    id: str
    title: str
    description: str | None
    category: str | None
    date: str
    time: str
    starts_at: datetime
    ends_at: datetime
    location: str | None
    neighborhood: str | None
    latitude: float | None
    longitude: float | None
    banner_url: str | None
    organizer: str | None
    organizer_id: str | None
    status: str
    is_favorite: bool
    reviews: list[ReviewRead]
    price_cents: int
    is_free: bool
    capacity: int | None


class EventCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    category: str = Field(min_length=2, max_length=80)
    starts_at: datetime
    ends_at: datetime
    venue_name: str = Field(min_length=2, max_length=160)
    address: str | None = Field(default=None, max_length=300)
    neighborhood: Neighborhood
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    banner_url: str | None = Field(default=None, max_length=1000)
    price_cents: int = Field(default=0, ge=0)
    is_free: bool = True
    capacity: int | None = Field(default=None, gt=0)

    @field_validator("ends_at")
    @classmethod
    def ends_after_starts(cls, value: datetime, info):
        starts = info.data.get("starts_at")
        if starts is not None and value <= starts:
            raise ValueError("ends_at deve ser posterior a starts_at")
        return value

    @model_validator(mode="after")
    def free_event_has_no_price(self) -> EventCreate:
        if self.is_free and self.price_cents > 0:
            raise ValueError(FREE_EVENT_WITH_PRICE)
        return self


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    category: str | None = Field(default=None, min_length=2, max_length=80)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    venue_name: str | None = Field(default=None, min_length=2, max_length=160)
    address: str | None = Field(default=None, max_length=300)
    neighborhood: Neighborhood | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    banner_url: str | None = Field(default=None, max_length=1000)
    price_cents: int | None = Field(default=None, ge=0)
    is_free: bool | None = None
    capacity: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def coordinates_come_together(self) -> EventUpdate:
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Informe latitude e longitude juntas")
        return self


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)


class FavoriteResponse(BaseModel):
    favorite: bool


class NotificationRead(BaseModel):
    id: str
    event_id: str | None
    event_title: str | None
    type: str
    content: str
    created_at: str
    read: bool


class ReportCreate(BaseModel):
    target_type: Literal["EVENTO", "AVALIACAO"]
    event_id: str | None = None
    review_id: str | None = None
    reason: Literal[
        "INFORMACAO_FALSA", "DISCURSO_OFENSIVO", "SPAM", "OUTRO"
    ] = "INFORMACAO_FALSA"
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("review_id")
    @classmethod
    def review_only_for_review_target(cls, value: str | None, info):
        target = info.data.get("target_type")
        if target == "AVALIACAO" and value is None:
            raise ValueError("review_id é obrigatório para denúncia de avaliação")
        return value


class ReportRead(BaseModel):
    id: str
    target_type: str
    event_id: str | None
    event_title: str | None = None
    review_id: str | None
    reason: str
    description: str | None
    status: str
    created_at: str


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    slug: str
    name: str


class MessageResponse(BaseModel):
    message: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10)
    new_password: str = Field(min_length=8, max_length=128)
