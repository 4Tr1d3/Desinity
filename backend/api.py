"""Flask Blueprint с endpoint для анализа референсов Designity."""
from flask import Blueprint, jsonify, request

from .ai_service import ReferenceAnalysisError, analyze_references

ai_bp = Blueprint("designity_ai", __name__)


@ai_bp.post("/api/analyze")
def analyze():
    """Принимает multipart/form-data: images (повторяемое поле), description."""
    uploaded = request.files.getlist("images")
    description = (request.form.get("description") or "").strip()

    if not uploaded or any(not item.filename for item in uploaded):
        return jsonify({
            "success": False,
            "error": "Добавьте изображения в поле images."
        }), 400

    try:
        images = [(item.filename, item.read()) for item in uploaded]
        result = analyze_references(images, description)
        return jsonify({"success": True, "data": result}), 200
    except ReferenceAnalysisError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        return jsonify({
            "success": False,
            "error": "Внутренняя ошибка сервера при анализе изображений."
        }), 500
