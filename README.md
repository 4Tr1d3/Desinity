# Designity — запуск сайта вместе с AI

## Что теперь работает

Frontend и backend запускаются одним Docker-контейнером и доступны с одного адреса.

1. Главная страница: `http://localhost:5000/`
2. Страница создания проекта: `http://localhost:5000/create-project.html`
3. Проверка backend: `http://localhost:5000/api/health`
4. Анализ изображений: `POST http://localhost:5000/api/analyze`

На странице создания проекта пользователь может:
- загрузить от 2 до 10 изображений JPEG, PNG или WEBP;
- удалить отдельный файл до отправки;
- добавить необязательное описание задачи;
- отправить изображения в Flask API;
- получить анализ Gemini, сравнение, цветовую палитру;
- отметить характеристики и сформировать редактируемый дизайн-бриф;
- скопировать готовый бриф.

## 1. Что нужно установить

- Docker Desktop с Docker Compose.
- API-ключ Google Gemini.

Для запуска не нужно отдельно устанавливать Python, Flask или библиотеки на Windows: зависимости устанавливаются внутри Docker-образа.

## 2. Подготовка API-ключа

В корне проекта, рядом с `compose.yaml`, скопируй `.env.example` и назови копию `.env`.

В Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Открой `.env` и замени значение `ВСТАВЬ_СЮДА_СВОЙ_API_KEY` на свой действующий ключ Gemini:

```dotenv
GEMINI_API_KEY=твой_ключ
GEMINI_MODEL=gemini-2.5-flash
```

Не отправляй `.env` в GitHub. Он уже исключён через `.gitignore` и `.dockerignore`.

Если выбранная модель недоступна для твоего ключа или аккаунта, укажи в `GEMINI_MODEL` другую модель Gemini, поддерживаемую твоим API-доступом. Сам backend читает имя модели из переменной окружения.

## 3. Запуск через Docker

Открой PowerShell в корневой папке проекта — там, где лежит `compose.yaml`.

Собери Docker-образ:

```powershell
docker compose build
```

Запусти приложение:

```powershell
docker compose up -d
```

Посмотри состояние контейнера:

```powershell
docker compose ps
```

Открой сайт:

- http://localhost:5000/

Проверь API:

- http://localhost:5000/api/health

Ожидаемый ответ health-check:

```json
{
  "success": true,
  "service": "Designity",
  "status": "running"
}
```

## 4. Как проверить AI-функцию

1. Открой http://localhost:5000/create-project.html.
2. Добавь минимум два изображения в формате JPEG, PNG или WEBP.
3. При желании напиши, для какого проекта подбираются референсы.
4. Нажми «Запустить анализ».
5. Дождись ответа Gemini. Запрос может выполняться некоторое время.
6. Изучи индивидуальный анализ, сходства, различия и палитру.
7. Отметь характеристики, которые хочешь использовать.
8. Нажми «Сформировать дизайн-бриф».
9. При необходимости отредактируй текст и скопируй его.

## 5. Просмотр логов и остановка

Показать логи приложения:

```powershell
docker compose logs -f
```

Остановить контейнер:

```powershell
docker compose down
```

Пересобрать образ после изменения Python-зависимостей или Dockerfile:

```powershell
docker compose down
docker compose build --no-cache
docker compose up -d
```

Если менял только HTML, CSS или JavaScript, файлы уже находятся внутри образа. Для гарантированного применения изменений пересобери и перезапусти контейнер:

```powershell
docker compose up -d --build
```

## 6. Частые проблемы

### Контейнер не стартует: `.env` not found

Убедись, что в корне проекта есть `.env`. Создай его из `.env.example` командой из раздела 2.

### Сообщение о том, что GEMINI_API_KEY не найден

Проверь, что ключ записан в `.env` без кавычек и без пробелов вокруг `=`. После изменения переменных пересоздай контейнер:

```powershell
docker compose down
docker compose up -d --build
```

### Gemini возвращает ошибку модели или доступа

Проверь действительность ключа и доступность модели, указанной в `GEMINI_MODEL`. Имя модели меняется в `.env`, исходники для этого редактировать не требуется.

### Сайт открывается, но анализ не работает

Проверь `/api/health`, затем посмотри логи:

```powershell
docker compose logs -f designity
```

Health-check подтверждает, что Flask работает, но не проверяет доступность Gemini API. Ошибка ключа или внешнего API проявится при реальном анализе.

### Порт 5000 занят

В `compose.yaml` замени левую часть `5000:5000`, например на `5001:5000`. После этого сайт будет доступен по адресу `http://localhost:5001/`.

## 7. Структура проекта

```text
desinity/
├── backend/
│   ├── __init__.py
│   ├── ai_service.py
│   └── api.py
├── frontend/
│   ├── assets/
│   ├── css/
│   ├── html/
│   └── js/
├── .dockerignore
├── .env                 # создаётся локально, в архив не включён
├── .env.example
├── .gitignore
├── Dockerfile
├── compose.yaml
├── requirements.txt
├── example_app.py
└── README.md
```

## 8. Безопасность

- Не вставляй API-ключ в JavaScript, HTML или CSS.
- Не коммить `.env` и не отправляй его в общий архив.
- Gemini вызывается только на backend.
- Ограничение на один файл — 10 МБ; поддерживаются JPEG, PNG и WEBP.
- Для анализа требуется от 2 до 10 изображений.
