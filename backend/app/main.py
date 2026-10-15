from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import init_db
from app.routers import auth, diagrams, payments, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="24KT_Diagrams API", lifespan=lifespan)

# Настройка CORS для работы с React фронтендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В проде заменим на конкретный домен фронтенда
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(diagrams.router)
app.include_router(payments.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    return {"message": "API is running"}
