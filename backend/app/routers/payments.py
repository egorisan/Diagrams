#app/routers/payments.py
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, Transaction
from app.schemas import PaymentCreateResponse
from app.routers.auth import get_current_user
from datetime import datetime, timezone
import httpx
import uuid
import os
import logging

router = APIRouter(prefix="/payments", tags=["Payments"])
logger = logging.getLogger(__name__)

YOOKASSA_API = "https://api.yookassa.ru/v3/payments"
SHOP_ID = os.getenv("YOOKASSA_SHOP_ID", "")
SECRET_KEY = os.getenv("YOOKASSA_SECRET_KEY", "")
PRO_PRICE = os.getenv("PRO_PRICE", "499.00")
RETURN_URL = os.getenv("PAYMENT_RETURN_URL", "http://localhost:5173/dashboard")


@router.post("/create", response_model=PaymentCreateResponse)
async def create_payment(user: User = Depends(get_current_user)):
    """Создает одноразовый платеж в ЮKassa (тестовый магазин) и возвращает ссылку на оплату."""
    if not SHOP_ID or not SECRET_KEY:
        raise HTTPException(status_code=503, detail="Платежный шлюз не настроен")

    payload = {
        "amount": {"value": PRO_PRICE, "currency": "RUB"},
        "confirmation": {"type": "redirect", "return_url": RETURN_URL},
        "capture": True,
        "description": "24KT_Diagrams — тариф Pro (разовый платеж)",
        "metadata": {"user_id": str(user.id)},
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            YOOKASSA_API,
            json=payload,
            auth=(SHOP_ID, SECRET_KEY),
            headers={"Idempotence-Key": str(uuid.uuid4())},
            timeout=15,
        )
    if resp.status_code not in (200, 201):
        logger.error(f"YooKassa error {resp.status_code}: {resp.text}")
        raise HTTPException(status_code=502, detail="Ошибка платежного шлюза")

    payment = resp.json()
    confirmation_url = payment.get("confirmation", {}).get("confirmation_url")
    if not confirmation_url:
        raise HTTPException(status_code=502, detail="Шлюз не вернул ссылку на оплату")
    return {"confirmation_url": confirmation_url, "payment_id": payment["id"]}


@router.post("/yookassa-webhook")
async def yookassa_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.json()

    if body.get("event") != "payment.succeeded":
        return {"status": "ignored"}

    payment = body.get("object", {})
    payment_id = payment.get("id")
    user_id_str = (payment.get("metadata") or {}).get("user_id")
    if not payment_id or not user_id_str:
        raise HTTPException(status_code=400, detail="Missing metadata")

    # Идемпотентность: один платеж = одна транзакция
    existing = await db.execute(select(Transaction).where(Transaction.payment_id == payment_id))
    if existing.scalars().first():
        return {"status": "already_processed"}

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    amount = payment.get("amount", {}).get("value", "0")
    db.add(Transaction(
        user_id=user.id,
        payment_id=payment_id,
        amount=amount,
        status="succeeded",
        completed_at=datetime.now(timezone.utc),
    ))
    user.is_pro = True
    await db.commit()

    logger.info(f"PRO-статус выдан пользователю {user_id_str}")
    return {"status": "success"}
