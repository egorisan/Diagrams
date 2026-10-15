from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone, timedelta
import uuid

from app.database import get_db
from app.models import User, Diagram, ExportLog, Transaction
from app.schemas import AdminUserResponse, AdminStats
from app.routers.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


async def get_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Требуются права администратора")
    return user


@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(db: AsyncSession = Depends(get_db), admin: User = Depends(get_admin)):
    result = await db.execute(select(User).order_by(User.created_at))
    return result.scalars().all()


@router.post("/users/{user_id}/ban", response_model=AdminUserResponse)
async def toggle_ban(user_id: uuid.UUID, db: AsyncSession = Depends(get_db), admin: User = Depends(get_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Нельзя заблокировать себя")
    user.is_banned = not user.is_banned
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/users/{user_id}/pro", response_model=AdminUserResponse)
async def toggle_pro(user_id: uuid.UUID, db: AsyncSession = Depends(get_db), admin: User = Depends(get_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    user.is_pro = not user.is_pro
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}")
async def delete_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db), admin: User = Depends(get_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить себя")
    await db.delete(user)
    await db.commit()
    return {"status": "deleted"}


@router.get("/stats", response_model=AdminStats)
async def stats(db: AsyncSession = Depends(get_db), admin: User = Depends(get_admin)):
    today = datetime.now(timezone.utc).date()

    async def scalar(q):
        return (await db.execute(q)).scalar() or 0

    revenue = (await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(Transaction.status == "succeeded")
    )).scalar()

    # Диаграммы по типам
    type_rows = await db.execute(
        select(Diagram.type, func.count(Diagram.id)).group_by(Diagram.type)
    )
    diagrams_by_type = {t: c for t, c in type_rows.all()}

    # Серии за последние 14 дней: сохранения и регистрации
    since = today - timedelta(days=13)
    saves_rows = await db.execute(
        select(func.date(ExportLog.exported_at), func.count(ExportLog.id))
        .where(func.date(ExportLog.exported_at) >= since)
        .group_by(func.date(ExportLog.exported_at))
    )
    reg_rows = await db.execute(
        select(func.date(User.created_at), func.count(User.id))
        .where(func.date(User.created_at) >= since)
        .group_by(func.date(User.created_at))
    )
    saves_map = {d: c for d, c in saves_rows.all()}
    reg_map = {d: c for d, c in reg_rows.all()}
    days = [since + timedelta(days=i) for i in range(14)]

    return AdminStats(
        total_users=await scalar(select(func.count(User.id))),
        pro_users=await scalar(select(func.count(User.id)).where(User.is_pro == True)),
        banned_users=await scalar(select(func.count(User.id)).where(User.is_banned == True)),
        active_today=await scalar(
            select(func.count(User.id)).where(func.date(User.last_active_at) == today)
        ),
        saves_today=await scalar(
            select(func.count(ExportLog.id))
            .where(ExportLog.format == "save")
            .where(func.date(ExportLog.exported_at) == today)
        ),
        exports_today=await scalar(
            select(func.count(ExportLog.id))
            .where(ExportLog.format != "save")
            .where(func.date(ExportLog.exported_at) == today)
        ),
        total_diagrams=await scalar(select(func.count(Diagram.id))),
        total_revenue=float(revenue or 0),
        diagrams_by_type=diagrams_by_type,
        activity_14d=[saves_map.get(d, 0) for d in days],
        registrations_14d=[reg_map.get(d, 0) for d in days],
    )
