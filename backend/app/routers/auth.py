from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError

from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserResponse, Token
from app.core.security import (
    get_password_hash, verify_password,
    create_access_token, create_refresh_token, decode_token,
    REFRESH_TOKEN_EXPIRE_DAYS,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

REFRESH_COOKIE = "refresh_token"

def _set_refresh_cookie(response: Response, user_id) -> None:
    refresh = create_refresh_token({"sub": str(user_id)})
    response.set_cookie(
        REFRESH_COOKIE,
        refresh,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        httponly=True,
        samesite="lax",
        secure=False,  # в проде True (HTTPS)
    )

async def _user_from_token(token: str, db: AsyncSession) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
    )
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт заблокирован")
    return user

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Этот Email уже зарегистрирован")

    new_user = User(email=user_data.email, password_hash=get_password_hash(user_data.password))
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    _set_refresh_cookie(response, new_user.id)
    return new_user

@router.post("/login", response_model=Token)
async def login(user_data: UserCreate, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_data.email))
    user = result.scalars().first()

    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный Email или пароль")
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт заблокирован")

    _set_refresh_cookie(response, user.id)
    return {"access_token": create_access_token({"sub": str(user.id)})}

@router.post("/refresh", response_model=Token)
async def refresh(request: Request, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Нет refresh-токена")
    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise JWTError("wrong token type")
        user = await _user_from_token(token, db)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Невалидный refresh-токен")
    return {"access_token": create_access_token({"sub": str(user.id)})}

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(REFRESH_COOKIE)
    return {"status": "ok"}

@router.get("/me", response_model=UserResponse)
async def me(request: Request, db: AsyncSession = Depends(get_db)):
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Нет токена")
    return await _user_from_token(token, db)

# Зависимость для защищенных роутов: читает Bearer-токен вручную
async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip()
    if not token or token == auth:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Нет токена")
    return await _user_from_token(token, db)
