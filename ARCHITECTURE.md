# АРХИТЕКТУРА ПРОЕКТА
Diagrams / FastDia

## Краткое резюме

Diagrams — веб-приложение для создания и редактирования диаграмм. SPA на React с визуальным редактором на @xyflow/react, API на FastAPI и асинхронный доступ к PostgreSQL через SQLAlchemy/asyncpg. Присутствуют аутентификация, проекты и диаграммы пользователя, экспорт в PNG/JPG/SVG, административные операции и статистика.

Архитектура монолитная на стороне backend: один FastAPI-процесс включает роутеры Auth, Diagrams и Admin. Frontend собран как SPA и в production обслуживается Nginx, который отдаёт статические файлы и проксирует API-запросы к backend (uvicorn). База данных — локальный PostgreSQL на том же сервере.

Платёжная подсистема полностью удалена: тарифов и ограничений Free/Pro в продукте нет, каждому пользователю доступен полный функционал (поле `is_pro` и модель `Transaction` оставлены только для совместимости с БД).

| Параметр | Вывод |
|---|---|
| Архитектурный стиль | SPA + REST API; модульный монолит backend |
| Backend | Python 3.10+, FastAPI, SQLAlchemy Async, asyncpg, PostgreSQL |
| Frontend | React 19, Vite 8, React Router, @xyflow/react, Axios, Tailwind CSS 4 |
| Хранение диаграмм | JSONB: nodes, edges и viewport в `content` |
| Аутентификация | JWT access token + refresh token в HttpOnly cookie |
| Платежи | Нет (подсистема удалена; всем пользователям доступен полный функционал) |
| Развёртывание | Прод: Nginx (статика SPA) + systemd/uvicorn + локальный PostgreSQL |

## 1. Обзор проекта

### 1.1 Назначение

Приложение позволяет пользователю создавать проекты и диаграммы, редактировать узлы и связи на canvas, применять шаблоны, стилизовать элементы, вращать их, сохранять данные на сервере и экспортировать изображение в PNG/JPG/SVG. Доступны регистрация/вход, дашборд с поиском и избранным, профильные экраны и административная панель со статистикой.

### 1.2 Основные функции, подтверждённые кодом

- Регистрация, вход, выход, проверка текущего пользователя и обновление access-токена через refresh-cookie.
- Создание, просмотр, переименование и удаление проектов; создание, сохранение, переименование, избранное и удаление диаграмм.
- Редактор на React Flow: палитра фигур по типам диаграмм, UML-фигуры (класс, интерфейс, абстрактный класс, перечисление), типы связей с маркерами (ассоциация, направленная, зависимость, наследование, реализация, агрегация, композиция), стили, поворот элементов на 360°, история изменений (undo/redo), миникарта, шаблоны.
- Экспорт диаграммы в PNG/JPG/SVG кастомным SVG-рендером с отступом 48px.
- Лимиты: максимум 20 диаграмм на пользователя и 80 элементов на диаграмму.
- Первый зарегистрированный пользователь автоматически получает роль admin.
- Администрирование: список пользователей, блокировка, сброс пароля, удаление, статистика (графики активности, регистраций, распределение диаграмм по типам).

## 2. Архитектура и диаграмма компонентов

```
┌──────────┐   HTTPS    ┌────────────────────────────┐   SQL    ┌────────────┐
│  Client  │ ─────────► │            Nginx           │          │            │
│ (Browser)│            │  :8443  SPA + /api proxy   │          │ PostgreSQL │
└──────────┘            └────────────┬───────────────┘          └─────┬──────┘
                                     │ proxy                          │
                          ┌──────────▼───────────┐                    │
                          │  FastAPI (uvicorn)   │ ──────────────────►│
                          │   127.0.0.1:8000     │   async SQLAlchemy │
                          │  auth │ diagrams │ admin                  │
                          └──────────────────────┘
```

- Nginx на :8443 обслуживает собранный SPA из `/var/www/diagrams_app` и проксирует API на `127.0.0.1:8000`; :80 редиректит на HTTPS.
- Backend — один процесс uvicorn (systemd `diagrams-backend.service`), роутеры `auth`, `diagrams`, `admin` объединены в одном FastAPI-приложении.
- Роутеры обращаются к моделям SQLAlchemy через `get_db`; `auth.get_current_user` защищает приватные API.
- Frontend взаимодействует с API через общий Axios-клиент (`/api`), состояние пользователя — в AuthContext.
- Docker-конфигурация (`docker-compose.yml`, `Dockerfile.prod`, `nginx.conf`) присутствует в репозитории как универсальный вариант развёртывания; текущий прод работает без контейнеров.

## 3. Диаграмма классов и модель данных

Основные ORM-модели — `backend/app/models.py`. Связи: `User → Project → Diagram` через внешние ключи и relationship с каскадным удалением.

```
User ────< Project ────< Diagram
 │          │              │  content (JSONB): nodes[], edges[], viewport{}
 │          │              │  type, name, is_favorite
 │          │              name, diagram_type
 │          name
 email, password_hash, role ('user'|'admin'), is_pro (legacy), is_banned,
 last_active_at

User ────< ExportLog (action: 'save'|'export', diagram_id)
User ────< Transaction (legacy от удалённой платёжной подсистемы)
```

### 3.1 Ключевые классы и модули

| Элемент | Ответственность |
|---|---|
| User | Учётная запись, роль, блокировка, активность |
| Project | Контейнер диаграмм пользователя (1 проект ≈ 1 диаграмма) |
| Diagram | Тип диаграммы, избранное и JSONB-содержимое редактора |
| ExportLog | Учёт сохранений и экспортов для аналитики |
| Transaction | Legacy-модель, не используется |
| UserCreate / UserResponse / Token | Валидация auth DTO |
| ProjectCreate / ProjectRename / DiagramCreate / DiagramRename / DiagramSave | Контракты API проектов и диаграмм |
| AdminPasswordReset | Сброс пароля администратором |
| AuthProvider / useAuth | Состояние сессии на frontend |
| CustomNode | Отрисовка узла, inline-редактирование, ручка поворота, source-хэндлы |
| palette.js | SHAPES, PALETTES по типам диаграмм, EDGE_STYLES, подсказки связей |
| exportImage.js | Кастомный SVG-рендер диаграммы + растеризация в PNG/JPG |
| Editor page | Canvas, граф, история, сохранение/экспорт |

## 4. Диаграмма последовательности

### 4.1 Вход пользователя

```
Client              FastAPI                     PostgreSQL
  │ POST /auth/login    │                           │
  │ {email, password}   │── SELECT user ───────────►│
  │                     │◄─ user                    │
  │                     │  verify bcrypt, is_banned │
  │◄─ access_token      │                           │
  │   +Set-Cookie(refresh, HttpOnly)                │
  │ GET /auth/me (Bearer)                           │
  │◄─ {id, email, name, role}                       │
  │  ...защищённые запросы: при 401 → POST /auth/refresh → retry
```

### 4.2 Сохранение диаграммы

```
Client              FastAPI                     PostgreSQL
  │ PUT /diagrams/{id}    │                           │
  │ {content:{nodes,edges,│── check owner ──────────►│
  │   viewport}}          │   check ELEMENT_LIMIT(80) │
  │                     │── UPDATE diagram ────────►│
  │                     │── INSERT ExportLog(save) ►│
  │◄─ {ok}               │                           │
```

## 5. Диаграмма прецедентов

```
Гость:        Регистрация, Вход, просмотр лендинга, условия/политика (модалки)
Пользователь: Управление проектами и диаграммами (CRUD, переименование, избранное)
              Редактирование на canvas (фигуры, связи, стили, поворот, шаблоны, undo/redo)
              Поиск/фильтры/сортировка диаграмм, экспорт PNG/JPG/SVG
              Профиль, настройки, справка
Администратор:+ Просмотр пользователей и статистики
              + Блокировка/разблокировка, сброс пароля, удаление пользователей
```

## 6. Диаграмма развёртывания

Актуальный прод-сервер `31.77.219.42` (без Docker — Docker отсутствует на сервере):

```
Ubuntu 22.04
├─ Nginx  :80 → 301 https://...:8443
│          :8443 SSL (Let's Encrypt, certbot.timer)
│            ├── /           → /var/www/diagrams_app (static SPA)
│            └── /api/*      → http://127.0.0.1:8000
├─ systemd: diagrams-backend.service → uvicorn app.main:app
│           /root/diagrams/backend (+ .env), Python venv
└─ PostgreSQL (shared, локальный): БД diagrams_db, юзер diagrams_user
```

Публичный URL: `https://diagrams.31.77.219.42.sslip.io:8443`.
Альтернативный вариант для другого окружения — `docker-compose.yml` (frontend/Nginx + backend, БД внешняя через `DATABASE_URL`; сервис postgres закомментирован).

## 7. Диаграмма состояний

```
Сессия:       Анонимный ──register/login──► Аутентифицирован ──logout──► Анонимный
              Аутентифицирован ──access expired──► (auto-refresh по cookie)
Диаграмма:    Черновик (client) ──POST create──► Сохранена ──PUT content──► Сохранена
              Сохранена ──DELETE──► Удалена
Элемент:      Выделен ⇄ Редактируемый (label inline) + Поворот 0–360°
Пользователь: active ──admin ban──► banned ──unban──► active
```

## 8. Технологический стек

| Технология | Назначение |
|---|---|
| Python 3.10+ | Backend runtime |
| FastAPI | REST API, dependency injection, lifespan |
| Uvicorn | ASGI-сервер |
| SQLAlchemy Async | ORM и асинхронные запросы |
| asyncpg + PostgreSQL | Доступ к реляционной БД; JSONB для content |
| Pydantic / EmailStr | Валидация DTO API |
| python-jose | JWT access/refresh tokens |
| Passlib + bcrypt | Хеширование паролей |
| httpx | HTTP-клиент (присутствует в зависимостях) |
| React 19 | Frontend SPA |
| Vite 8 | Dev server и production build |
| @xyflow/react | Интерактивный графовый редактор |
| React Router | Маршрутизация страниц |
| Axios | HTTP-клиент и interceptors |
| Tailwind CSS 4 | Стилизация UI |
| Nginx | Раздача SPA и прокси API |
| systemd | Запуск backend-процесса |
| Let's Encrypt / certbot | TLS-сертификаты |
| Docker Compose | Альтернативный способ развёртывания |

## 9. API и описание компонентов

### 9.1 Основные маршруты

| Группа | Маршруты | Назначение |
|---|---|---|
| Auth | POST /auth/register, /auth/login, /auth/refresh, /auth/logout; GET /auth/me | Регистрация, сессия, профиль |
| Projects | GET/POST /projects; PATCH /projects/{id}; DELETE /projects/{id} | Список, создание, переименование, удаление |
| Diagrams | POST /projects/{id}/diagrams; GET/PUT/PATCH/DELETE /diagrams/{id}; POST /diagrams/{id}/export; POST /diagrams/{id}/favorite | CRUD диаграмм, сохранение, избранное, учёт экспорта |
| Admin | GET /admin/users; POST /admin/users/{id}/ban; POST /admin/users/{id}/password; DELETE /admin/users/{id}; GET /admin/stats | Управление пользователями и метрики |

### 9.2 Бизнес-правила

- `DIAGRAM_TOTAL_LIMIT = 20` — всего диаграмм на пользователя (403).
- `ELEMENT_LIMIT = 80` — элементов (узлов+связей) на диаграмму (400, проверка и на клиенте).
- Первый зарегистрированный пользователь → `role='admin'`.
- Refresh token хранится в HttpOnly cookie и ротируется при каждом refresh.
- Миграций через Alembic нет: `init_db()` выполняет `create_all` + идемпотентные `ALTER TABLE ... IF NOT EXISTS` из списка `MIGRATIONS` в `database.py`.
