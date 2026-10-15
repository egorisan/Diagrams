from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Any

# --- Auth ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    is_pro: bool
    is_banned: bool
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# --- Projects / Diagrams ---
class ProjectCreate(BaseModel):
    name: str
    replace: bool = False  # Free-тариф: удалить старый проект и создать новый

class DiagramCreate(BaseModel):
    name: str
    type: str = "custom"
    content: dict[str, Any] | None = None  # начальное содержимое (например, из шаблона)

class DiagramSave(BaseModel):
    content: dict[str, Any]

class DiagramResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    type: str
    content: dict[str, Any]
    is_favorite: bool
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True

class ProjectResponse(BaseModel):
    id: UUID
    name: str
    created_at: datetime
    updated_at: datetime | None
    diagrams: list[DiagramResponse] = []

    class Config:
        from_attributes = True

# --- Payments ---
class PaymentCreateResponse(BaseModel):
    confirmation_url: str
    payment_id: str

# --- Admin ---
class AdminUserResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    is_pro: bool
    is_banned: bool
    last_active_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True

class AdminStats(BaseModel):
    total_users: int
    pro_users: int
    banned_users: int
    active_today: int
    saves_today: int
    exports_today: int
    total_diagrams: int
    total_revenue: float
    diagrams_by_type: dict[str, int] = {}
    activity_14d: list[int] = []       # сохранения по дням (последние 14 дней, от старых к новым)
    registrations_14d: list[int] = []  # регистрации по дням
