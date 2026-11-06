# Развёртывание FastDia на своём сервере

Инструкция для запуска проекта из публичного репозитория
[github.com/egorisan/Diagrams](https://github.com/egorisan/Diagrams) на чистом сервере
или локальном компьютере.

Есть два способа:

- **Способ A — Docker Compose** (рекомендуется): одна команда, PostgreSQL поднимается в контейнере.
- **Способ B — без Docker**: PostgreSQL + Python + Node.js + nginx вручную
  (так проект работает на текущем продакшн-сервере).

После запуска **первый зарегистрированный пользователь автоматически становится администратором**.

---

## Требования

| Способ | Что нужно |
|---|---|
| A | Linux / macOS / Windows с Docker Engine 24+ и плагином `docker compose`, git, свободный порт 80 |
| B | Ubuntu 22.04+ (или аналог), git, Python 3.10+, Node.js 20+, PostgreSQL 14+, nginx |

Минимальные ресурсы: 1 vCPU, 1 ГБ RAM, 2 ГБ диска.

---

## Способ A — Docker Compose

### 1. Установить Docker (Ubuntu)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # затем перелогиньтесь
docker compose version          # проверка
```

На Windows/macOS установите Docker Desktop.

### 2. Клонировать репозиторий

```bash
git clone https://github.com/egorisan/Diagrams.git fastdia
cd fastdia
```

### 3. Создать файл окружения backend

```bash
cp backend/.env.example backend/.env
# сгенерировать секрет для JWT и вписать его в backend/.env
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
nano backend/.env        # JWT_SECRET_KEY=<сгенерированная строка>
```

`DATABASE_URL` в `.env` при запуске через Compose можно не менять — он переопределяется
и указывает на контейнер `db`.

Необязательно: задать свой пароль БД и порт сайта в файле `.env` **в корне** проекта:

```bash
cat > .env <<'EOF'
POSTGRES_PASSWORD=придумайте-пароль
APP_PORT=80
EOF
```

### 4. Собрать и запустить

```bash
docker compose up -d --build
docker compose ps            # все три сервиса: db, backend, frontend — Up
docker compose logs -f backend   # ожидаем "Application startup complete"
```

Таблицы БД создаются автоматически при первом старте backend.

### 5. Открыть сайт

`http://<IP-сервера>/` (или `http://localhost/` при локальном запуске).
Зарегистрируйтесь — первый аккаунт получит роль администратора
(пункт «Админ-панель» в меню).

### Управление

```bash
docker compose logs -f              # логи
docker compose restart backend      # перезапуск API
git pull && docker compose up -d --build   # обновление до свежей версии
docker compose down                 # остановить (данные БД сохраняются в volume db_data)
docker compose down -v              # остановить и УДАЛИТЬ все данные БД
```

---

## Способ B — без Docker (Ubuntu)

### 1. Системные пакеты

```bash
sudo apt update
sudo apt install -y git python3 python3-venv python3-pip postgresql nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. База данных

```bash
sudo -u postgres psql <<'SQL'
CREATE USER diagrams_user WITH PASSWORD 'придумайте-пароль';
CREATE DATABASE diagrams_db OWNER diagrams_user;
SQL
```

### 3. Код и backend

```bash
sudo git clone https://github.com/egorisan/Diagrams.git /opt/fastdia
cd /opt/fastdia/backend
sudo python3 -m venv .venv
sudo .venv/bin/pip install -r requirements.txt
sudo cp .env.example .env
sudo nano .env
```

Содержимое `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://diagrams_user:придумайте-пароль@localhost:5432/diagrams_db
JWT_SECRET_KEY=<python3 -c "import secrets; print(secrets.token_urlsafe(48))">
```

Проверочный запуск: `sudo .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000`
(в соседнем терминале `curl http://127.0.0.1:8000/docs` → HTML Swagger). Остановите Ctrl+C.

### 4. Сервис systemd для backend

```bash
sudo tee /etc/systemd/system/fastdia-backend.service >/dev/null <<'EOF'
[Unit]
Description=FastDia backend (FastAPI)
After=network.target postgresql.service

[Service]
WorkingDirectory=/opt/fastdia/backend
EnvironmentFile=/opt/fastdia/backend/.env
ExecStart=/opt/fastdia/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now fastdia-backend
systemctl status fastdia-backend
```

### 5. Сборка frontend

```bash
cd /opt/fastdia/frontend
sudo npm ci
sudo npm run build
sudo mkdir -p /var/www/fastdia && sudo cp -r dist/* /var/www/fastdia/
```

### 6. nginx

```bash
sudo tee /etc/nginx/sites-available/fastdia >/dev/null <<'EOF'
server {
    listen 80;
    server_name _;            # или ваш домен

    root /var/www/fastdia;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ ^/(auth|projects|diagrams|admin)(/|$) {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/fastdia /etc/nginx/sites-enabled/fastdia
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Откройте `http://<IP-сервера>/` и зарегистрируйтесь (первый пользователь — администратор).

### Обновление

```bash
cd /opt/fastdia && sudo git pull
sudo systemctl restart fastdia-backend
cd frontend && sudo npm ci && sudo npm run build && sudo rm -rf /var/www/fastdia/* && sudo cp -r dist/* /var/www/fastdia/
```

---

## HTTPS (необязательно)

При наличии домена, A-запись которого указывает на сервер (способ B):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com
```

Без своего домена можно использовать бесплатный wildcard-DNS `<IP>.sslip.io`
(например, `203.0.113.10.sslip.io`).

---

## Локальная разработка

```bash
# backend (нужен запущенный PostgreSQL и backend/.env)
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend (в другом терминале) — http://localhost:5173, API проксируется на :8000
cd frontend && npm ci && npm run dev
```

Открыть в VS Code: **File → Open Folder** → корень репозитория. В проводнике видны
`docker-compose.yml`, `backend/requirements.txt`, `frontend/package.json`; команды выше
выполняются во встроенном терминале (**Terminal → New Terminal**).

Проверки кода: `cd frontend && npm run lint && npm run build`.

---

## Проверка работоспособности

1. `http://<сервер>/` — открывается главная страница FastDia.
2. `http://<сервер>/docs` недоступен снаружи (API открыт только по своим маршрутам) —
   проверить API можно так: `curl -i http://<сервер>/auth/me` → `401` (ожидаемо без токена).
3. Регистрация → «Мои проекты» → «Создать диаграмму» → добавить элементы → «Сохранить».
4. Под первым пользователем доступна «Админ-панель» → «Статистика».

## Частые проблемы

| Симптом | Решение |
|---|---|
| `502 Bad Gateway` | backend не запущен: `docker compose logs backend` / `journalctl -u fastdia-backend -n 50` |
| backend падает с ошибкой подключения к БД | проверьте `DATABASE_URL` и что PostgreSQL запущен |
| порт 80 занят | Docker: `APP_PORT=8080` в корневом `.env`; без Docker — `listen 8080;` в nginx |
| после обновления видна старая версия | обновите страницу с очисткой кэша (Ctrl+Shift+R) |
| нет доступа к админке | админом становится только самый первый зарегистрированный пользователь; иначе: `UPDATE users SET role='admin' WHERE email='…';` в psql |

## Безопасность

- Никогда не коммитьте `backend/.env` и корневой `.env` (они в `.gitignore`).
- Обязательно задайте собственный `JWT_SECRET_KEY` и пароль БД.
