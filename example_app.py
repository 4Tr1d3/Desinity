"""Точка входа Designity: Flask одновременно отдаёт сайт и API."""
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, send_from_directory

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

from backend.api import ai_bp  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 105 * 1024 * 1024
app.register_blueprint(ai_bp)


@app.get("/")
def index():
    """Главная страница сайта."""
    return send_from_directory(FRONTEND_DIR / "html", "main.html")


@app.get("/create-project.html")
@app.get("/create-project")
def create_project():
    """Страница загрузки и анализа референсов."""
    return send_from_directory(FRONTEND_DIR / "html", "create-project.html")


@app.get("/css/<path:filename>")
def frontend_css(filename):
    return send_from_directory(FRONTEND_DIR / "css", filename)


@app.get("/js/<path:filename>")
def frontend_js(filename):
    return send_from_directory(FRONTEND_DIR / "js", filename)


@app.get("/assets/<path:filename>")
def frontend_assets(filename):
    return send_from_directory(FRONTEND_DIR / "assets", filename)


@app.get("/api/health")
def health():
    return jsonify({
        "success": True,
        "service": "Designity",
        "status": "running",
    }), 200


@app.errorhandler(413)
def request_entity_too_large(_error):
    return jsonify({
        "success": False,
        "error": "Размер запроса превышает допустимые 105 МБ.",
    }), 413


@app.errorhandler(500)
def internal_server_error(error):
    app.logger.exception("Внутренняя ошибка Flask: %s", error)
    return jsonify({
        "success": False,
        "error": "Внутренняя ошибка сервера.",
    }), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.logger.info("Запуск Designity на порту %s", port)
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
