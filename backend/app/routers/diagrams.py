from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app.models import Project, Diagram, ExportLog, User
from app.schemas import (
    ProjectCreate, DiagramCreate, DiagramSave,
    ProjectResponse, DiagramResponse,
)
from app.routers.auth import get_current_user

router = APIRouter(tags=["Diagrams"])

FREE_DAILY_LIMIT = 2  # сохранений + экспортов суммарно в день


async def _get_owned_project(project_id: uuid.UUID, user: User, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.diagrams))
        .where(Project.id == project_id, Project.user_id == user.id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    return project


async def _get_owned_diagram(diagram_id: uuid.UUID, user: User, db: AsyncSession) -> Diagram:
    result = await db.execute(
        select(Diagram)
        .join(Project, Diagram.project_id == Project.id)
        .where(Diagram.id == diagram_id, Project.user_id == user.id)
    )
    diagram = result.scalars().first()
    if not diagram:
        raise HTTPException(status_code=404, detail="Диаграмма не найдена")
    return diagram


async def _check_daily_limit(user: User, db: AsyncSession) -> None:
    """Free: суммарно 2 сохранения/экспорта в день."""
    if user.is_pro:
        return
    today = datetime.now(timezone.utc).date()
    result = await db.execute(
        select(func.count(ExportLog.id))
        .where(ExportLog.user_id == user.id)
        .where(func.date(ExportLog.exported_at) == today)
    )
    if (result.scalar() or 0) >= FREE_DAILY_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="LIMIT_REACHED",
        )


@router.get("/projects", response_model=list[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.diagrams))
        .where(Project.user_id == user.id)
        .order_by(Project.created_at)
    )
    return result.scalars().all()


@router.post("/projects", response_model=ProjectResponse, status_code=201)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if not user.is_pro:
        result = await db.execute(select(func.count(Project.id)).where(Project.user_id == user.id))
        if (result.scalar() or 0) >= 1:
            if not data.replace:
                raise HTTPException(status_code=403, detail="PROJECT_LIMIT")
            # Hard delete старого проекта (каскадно удалит диаграмму)
            old = await db.execute(select(Project).where(Project.user_id == user.id))
            for p in old.scalars().all():
                await db.delete(p)
            await db.flush()

    project = Project(user_id=user.id, name=data.name)
    db.add(project)
    await db.commit()

    result = await db.execute(
        select(Project).options(selectinload(Project.diagrams)).where(Project.id == project.id)
    )
    return result.scalars().first()


@router.delete("/projects/{project_id}")
async def delete_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    project = await _get_owned_project(project_id, user, db)
    await db.delete(project)
    await db.commit()
    return {"status": "deleted"}


@router.post("/projects/{project_id}/diagrams", response_model=DiagramResponse, status_code=201)
async def create_diagram(project_id: uuid.UUID, data: DiagramCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    project = await _get_owned_project(project_id, user, db)

    if not user.is_pro and len(project.diagrams) >= 1:
        raise HTTPException(status_code=403, detail="DIAGRAM_LIMIT")

    diagram = Diagram(project_id=project.id, name=data.name, type=data.type, content=data.content or {"nodes": [], "edges": []})
    db.add(diagram)
    await db.commit()
    await db.refresh(diagram)
    return diagram


@router.get("/diagrams/{diagram_id}", response_model=DiagramResponse)
async def get_diagram(diagram_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await _get_owned_diagram(diagram_id, user, db)


@router.put("/diagrams/{diagram_id}")
async def save_diagram(diagram_id: uuid.UUID, data: DiagramSave, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    diagram = await _get_owned_diagram(diagram_id, user, db)
    await _check_daily_limit(user, db)

    diagram.content = data.content
    if not user.is_pro:
        db.add(ExportLog(user_id=user.id, diagram_id=diagram.id, format="save"))
    # Триггер "активности" для метрик админки
    user.last_active_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "success"}


@router.post("/diagrams/{diagram_id}/export")
async def log_export(diagram_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Учет экспорта и проверка дневного лимита (генерация файла — на клиенте)."""
    diagram = await _get_owned_diagram(diagram_id, user, db)
    await _check_daily_limit(user, db)
    if not user.is_pro:
        db.add(ExportLog(user_id=user.id, diagram_id=diagram.id, format="export"))
    await db.commit()
    return {"status": "ok"}


@router.post("/diagrams/{diagram_id}/favorite", response_model=DiagramResponse)
async def toggle_favorite(diagram_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    diagram = await _get_owned_diagram(diagram_id, user, db)
    diagram.is_favorite = not diagram.is_favorite
    await db.commit()
    await db.refresh(diagram)
    return diagram


@router.delete("/diagrams/{diagram_id}")
async def delete_diagram(diagram_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    diagram = await _get_owned_diagram(diagram_id, user, db)
    await db.delete(diagram)
    await db.commit()
    return {"status": "deleted"}
