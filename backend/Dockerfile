# Используем официальный легкий образ Python
FROM python:3.11-slim

# Рабочая директория внутри контейнера
WORKDIR /app

# Запрещаем Python писать .pyc файлы и буферизовать stdout (полезно для логов)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Копируем зависимости и устанавливаем их
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь остальной код проекта
COPY . .

# Команда для запуска сервера
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
