
import os
import logging

from flask import Flask, jsonify
from dotenv import load_dotenv


# Загружаем переменные окружения из .env
load_dotenv()


# Настраиваем логирование
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)


# Импортируем API после загрузки .env
from backend.api import ai_bp


# Создаём Flask-приложение
app = Flask(__name__)

# Максимальный размер входящего запроса — 100 МБ
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024

# Подключаем API
app.register_blueprint(ai_bp)


# Главная страница
@app.get("/")
def index():
    return """
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Designity API</title>
    </head>
    <body>
        <h1>Designity</h1>
        <p>Сервис анализа визуальных референсов.</p>
        <p>API работает.</p>
        <p>Для проверки состояния сервера перейдите по адресу:</p>
        <a href="/api/health">API Health Check</a>
    </body>
    </html>
    """


# Проверка состояния сервера
@app.get("/api/health")
def health():
    return jsonify({
        "success": True,
        "service": "Designity",
        "status": "running"
    }), 200


# Обработка слишком больших запросов
@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        "success": False,
        "error": "Размер запроса превышает допустимые 100 МБ."
    }), 413


# Обработка внутренних ошибок Flask
@app.errorhandler(500)
def internal_server_error(error):
    app.logger.exception("Внутренняя ошибка Flask")

    return jsonify({
        "success": False,
        "error": "Внутренняя ошибка сервера."
    }), 500


# Запуск приложения
if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))

    debug_mode = (
        os.getenv("FLASK_DEBUG", "false").lower() == "true"
    )

    app.logger.info("Запуск Designity API...")
    app.logger.info("Порт: %s", port)
    app.logger.info("Режим отладки: %s", debug_mode)

    app.run(
        host="127.0.0.1",
        port=port,
        debug=debug_mode
    )
