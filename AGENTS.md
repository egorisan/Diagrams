# AGENTS.md — FastDia

Руководство для агентов и разработчиков: как устроен проект, как его запускать,
какие у него ограничения и подводные камни. Читайте целиком перед правками.

## Что это

SaaS-редактор диаграмм в браузере (десктоп-ориентированный):
диаграммы классов, объектов, C4, прецедентов (use case), ER, компонентов.

- Backend: FastAPI + async SQLAlchemy + PostgreSQL (JSONB для содержимого)
- Frontend: React 19 + Vite + @xyflow/react (React Flow) + Tailwind CSS 4
- Прод: статика через nginx + uvicorn на systemd (без Docker на текущем сервере)
- Платежей и тарифов больше НЕТ: всем пользователям выдаётся `is_pro=True`
  (поле оставлено в модели/БД для совместимости, логика лимитов Free отключена)

## Ключевые факты о продукте

- Регистрация/логин по email+паролю. Первый зарегистрированный юзер — `role='admin'`.
- JWT access-токен (30 мин) + refresh в HttpOnly-cookie; авто-refresh в axios-интерсепторе.
- Лимиты: **20 диаграмм** на пользователя (403 `DIAGRAM_TOTAL_LIMIT`),
  **80 элементов** на диаграмму (400 `ELEMENT_LIMIT` при PUT, блок на клиенте).
- Плоская структура: 1 проект ≈ 1 диаграмма; на дашборде карточки — это диаграммы.
- Экспорт PNG/JPG/SVG — клиентский, кастомный SVG-рендер (НЕ html-to-image!).
- Мобильный блокер при ширине < 768px.
- В UI нет упоминаний Pro/тарифов/оплаты — это осознанное требование, не вертайте.

## Структура

```
backend/
  app/
    main.py             # FastAPI app, lifespan → init_db()
    models.py           # User, Project, Diagram, ExportLog, Transaction(legacy)
    schemas.py          # Pydantic-схемы
    database.py         # engine, get_db, init_db + MIGRATIONS (идемпотентные)
    core/security.py    # JWT create/decode, bcrypt, REFRESH_COOKIE
    routers/
      auth.py           # register(login, refresh, logout, me), get_current_user
      diagrams.py       # CRUD проектов/диаграмм, favorite, export-log, лимиты
      admin.py          # users (ban/delete/password), stats
  requirements.txt      # версии под Python 3.10+ (на сервере 3.10)
  .env                  # НЕ коммитится; см. .env.example
frontend/
  src/
    api/index.js        # axios instance, baseURL '/', refresh на 401
    store/auth.jsx      # AuthProvider: user, login/register/logout/refreshUser
    pages/              # Landing Login Register Dashboard Editor Admin Templates
                        # Profile Settings Help
    components/         # SideNav, AuthLayout, LegalModal, Charts, DiagramPreview,
                        # ExportModal, Logo, MobileBlocker
    editor/
      palette.js        # SHAPES, PALETTES по типам, EDGE_STYLES, CONNECTION_HINTS
      CustomNode.jsx    # фигуры + source-хэндлы + ручка поворота
      StylePanel.jsx    # панель «Свойства» выделенной ноды
      templates.js      # готовые шаблоны (build() → {nodes, edges, viewport})
      exportImage.js    # buildDiagramSvg + rasterize → PNG/JPG/SVG, pad=48
  Dockerfile.prod       # vite build → nginx (для docker-деплоя)
  nginx.conf            # SPA + прокси API (для docker-деплоя)
docker-compose.yml      # универсальный вариант; на проде не используется
```

## Команды

```bash
# Локальный запуск
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000
cd frontend && npm ci && npm run dev        # :5173, прокси API → :8000

# Проверки
cd frontend && npm run lint                 # oxlint — должен быть 0/0
cd frontend && npm run build                # vite build
cd backend  && .venv/bin/python -c "import ast; compile(open('app/main.py').read(),'x','exec')"
```

## Текущий прод

- URL: `https://diagrams.31.77.219.42.sslip.io:8443`
- Сервер `31.77.219.42` — ЧУЖОЙ прод тоже там (dmanager: :443 uvicorn, :8443 nginx).
  Ничего общего не трогать: их systemd-юниты, nginx-сайты, cron, nftables, БД.
- Наш кусок сервера:
  - бэкенд: systemd `diagrams-backend.service` → uvicorn `127.0.0.1:8000`,
    код в `/root/diagrams/backend`, env `/root/diagrams/backend/.env`
  - фронт: собранный dist в `/var/www/diagrams_app`
  - БД: локальный Postgres, база `diagrams_db`, юзер `diagrams_user`
  - nginx: `/etc/nginx/sites-enabled/diagrams` (:80 → редирект :8443, :8443 ssl
    статика + прокси API на 8000); cert — Let's Encrypt, certbot.timer + deploy-hook
  - SSH: `ssh root@31.77.219.42` (ключ настроен)

### Деплой изменений

```bash
# фронт: npm run build → dist/* в /var/www/diagrams_app
# бэкенд: app/ в /root/diagrams/backend/app → systemctl restart diagrams-backend
```

## Конвенции и подводные камни

- **Экспорт**: не использовать html-to-image (ломает SVG-маркеры и фоны подписей).
  `exportImage.js` строит чистый SVG из content; отступ `pad = 48`.
- **Хэндлы**: на каждой стороне ноды только source-хэндл + `ConnectionMode.Loose` —
  направление стрелки всегда = направлению протягивания. Не возвращайте target-хэндлы
  поверх source (была регрессия: стрелки рисовались наоборот).
- **Маркеры связей**: `markerEnd` (arrow/arrowclosed) + кастомные `markerStart`
  url(#mk-diamond|-fill) для агрегации/композиции; defs — `EdgeMarkerDefs` в Editor
  и в экспортере (оба места править вместе).
- **Ротация**: `data.rotation` 0–360; ручка поворота в CustomNode (drag, Shift=15°);
  учитывать в экспорте/превью (уже учтено).
- **Миграций нет (Alembic не используется)** — `init_db()` + список `MIGRATIONS`
  в database.py с `IF NOT EXISTS`; новые поля/данные добавляйте туда идемпотентно.
- **Модель Transaction и таблица transactions** — legacy от удалённых платежей,
  оставлены намеренно; не используйте.
- **is_pro**: оставлено для совместимости; все юзеры pro — watermark при экспорте
  всегда выключен (вызов `exportDiagram(..., true, ...)` — не «чините»).
- **sanitizeNodes** в Editor — белый список полей ноды: добавляя новое поле в
  data (напр. rotation), не забудьте его туда.
- **Новые фигуры**: правьте ТРИ места — `palette.js` (SHAPES/PALETTES),
  `CustomNode.jsx`, `exportImage.js` shapeSvg (+SIZES) и `DiagramPreview.jsx`.
- **Превью/экспорт** — независимые SVG-рендеры, зеркалят канвас; держите их в
  синхроне с редактором.
- **Корневые `package.json`/`node_moduls/`** — мусорные артефакты, в .gitignore;
  не коммитить и не использовать.
- Секреты только в `backend/.env` (gitignored); `.env.example` — без реальных
  значений. Репозиторий публичный: github.com/egorisan/Diagrams.
- UX-мелочи: меню карточек не должно обрезаться (overflow), графики в админке
  — viewBox + `<title>`-тултипы с датами.
- Стиль UI: пастель, розовый акцент pink-500, rounded-2xl карточки,
  Tailwind-классы без кастомного CSS почти везде.

## Что НЕ добавлять (явные запреты из ТЗ/истории)

- Google/Telegram-логин, подтверждение email
- PDF-экспорт
- Платежи/тарифы/подписки и любые их упоминания в UI
- Вложенные папки проектов (плоская структура by design)
- Жёсткая валидация связей — только мягкие подсказки (CONNECTION_HINTS)
```
