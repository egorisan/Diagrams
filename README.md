# FastDia

Онлайн-редактор диаграмм в браузере: диаграммы классов (UML), объектов, C4,
прецедентов, ER и компонентов.

- **Frontend:** React 19, Vite, @xyflow/react (React Flow), Tailwind CSS, Axios
- **Backend:** FastAPI, SQLAlchemy 2 (async), asyncpg, PostgreSQL (JSONB), JWT
- **Экспорт:** PNG / JPG / SVG

## Быстрый старт

```bash
git clone https://github.com/egorisan/Diagrams.git fastdia && cd fastdia
cp backend/.env.example backend/.env    # задайте JWT_SECRET_KEY
docker compose up -d --build
```

Откройте `http://localhost/` — первый зарегистрированный пользователь становится администратором.

Подробная инструкция (Docker и ручная установка, HTTPS, обновление, частые проблемы):
**[DEPLOY.md](DEPLOY.md)**.

## Документация

- [DEPLOY.md](DEPLOY.md) — развёртывание на своём сервере
- [ARCHITECTURE.md](ARCHITECTURE.md) — архитектура, модель данных, API
- [AGENTS.md](AGENTS.md) — соглашения по коду для разработчиков
