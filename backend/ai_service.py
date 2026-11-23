
import os
import json
import base64
import logging
from io import BytesIO

from PIL import Image, UnidentifiedImageError
from google import genai


logger = logging.getLogger(__name__)

# Допустимые настройки
MAX_IMAGES = 10
MIN_IMAGES = 2
MAX_IMAGE_BYTES = 10 * 1024 * 1024

ALLOWED_FORMATS = {
    "JPEG": "JPEG",
    "PNG": "PNG",
    "WEBP": "WEBP",
}


class ReferenceAnalysisError(Exception):
    """Ошибка при анализе визуальных референсов."""


def _prepare_image(file_bytes: bytes, filename: str) -> bytes:
    """
    Проверяет изображение и преобразует его в JPEG.
    Возвращает подготовленные байты изображения.
    """

    if not file_bytes:
        raise ReferenceAnalysisError(
            f"Файл {filename} пустой."
        )

    if len(file_bytes) > MAX_IMAGE_BYTES:
        raise ReferenceAnalysisError(
            f"Файл {filename} превышает допустимый размер 10 МБ."
        )

    try:
        image = Image.open(BytesIO(file_bytes))

        if image.format not in ALLOWED_FORMATS:
            raise ReferenceAnalysisError(
                f"Формат файла {filename} не поддерживается. "
                "Используйте JPEG, PNG или WEBP."
            )

        image.load()

        # Приводим изображение к RGB
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Сохраняем изображение в JPEG
        output = BytesIO()
        image.save(output, format="JPEG", quality=90)

        return output.getvalue()

    except ReferenceAnalysisError:
        raise

    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ReferenceAnalysisError(
            f"Не удалось обработать изображение {filename}."
        ) from exc


def _extract_json(response_text: str) -> dict:
    """
    Извлекает JSON из ответа Gemini.
    Обрабатывает также ответы, обёрнутые в markdown.
    """

    if not response_text or not response_text.strip():
        raise ReferenceAnalysisError(
            "Gemini вернул пустой ответ."
        )

    text = response_text.strip()

    # Удаляем markdown-обёртку, если она есть
    if text.startswith("```"):
        lines = text.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        text = "\n".join(lines).strip()

    try:
        result = json.loads(text)

        if not isinstance(result, dict):
            raise ReferenceAnalysisError(
                "Gemini вернул данные не в формате JSON-объекта."
            )

        return result

    except json.JSONDecodeError:
        # Пытаемся найти JSON внутри дополнительного текста
        start = text.find("{")
        end = text.rfind("}")

        if start == -1 or end == -1 or end <= start:
            raise ReferenceAnalysisError(
                "Не удалось найти JSON в ответе Gemini."
            )

        try:
            result = json.loads(text[start:end + 1])

            if not isinstance(result, dict):
                raise ReferenceAnalysisError(
                    "Gemini вернул некорректную структуру JSON."
                )

            return result

        except json.JSONDecodeError as exc:
            raise ReferenceAnalysisError(
                "Gemini вернул некорректный JSON. Попробуйте ещё раз."
            ) from exc


def analyze_references(
    images: list[tuple[str, bytes]],
    user_description: str = ""
) -> dict:
    """
    Анализирует от 2 до 10 изображений с помощью Gemini.

    images:
        Список кортежей (имя_файла, байты_изображения).

    user_description:
        Дополнительное описание задачи пользователя.
    """

    # Проверяем количество изображений
    if not images:
        raise ReferenceAnalysisError(
            "Необходимо загрузить изображения."
        )

    if len(images) < MIN_IMAGES:
        raise ReferenceAnalysisError(
            "Для анализа необходимо загрузить минимум 2 изображения."
        )

    if len(images) > MAX_IMAGES:
        raise ReferenceAnalysisError(
            "Можно загрузить максимум 10 изображений."
        )

    # Получаем API-ключ
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        logger.error("Переменная GEMINI_API_KEY не найдена.")
        raise ReferenceAnalysisError(
            "Не найден API-ключ Gemini. Проверьте файл .env."
        )

    model_name = os.getenv(
        "GEMINI_MODEL",
        "gemini-3.8-flash"
    )

    logger.info(
        "Начинаем анализ %s изображений с помощью модели %s",
        len(images),
        model_name
    )

    # Инструкция для модели
    prompt = f"""
Ты — профессиональный арт-директор, дизайнер и эксперт
по визуальным коммуникациям.

Твоя задача — провести подробный анализ загруженных
визуальных референсов для проекта Designity.

Дополнительное описание пользователя:
{user_description if user_description else "Не предоставлено."}

Проанализируй изображения по отдельности и в совокупности.

Обрати внимание на:
- визуальный стиль;
- цветовую палитру;
- композицию;
- типографику;
- графические элементы;
- формы и геометрию;
- визуальную иерархию;
- настроение и атмосферу;
- сходства и различия между изображениями.

На основе анализа предложи рекомендации для создания
единой дизайн-концепции.

Верни результат СТРОГО в формате JSON.
Не добавляй markdown, пояснения до или после JSON.

Структура ответа:

{{
  "summary": "Общее описание визуальной концепции",

  "images_analysis": [
    {{
      "image_name": "Название изображения",
      "description": "Подробное описание",
      "visual_style": "Визуальный стиль",
      "colors": ["Цвет 1", "Цвет 2"],
      "composition": "Особенности композиции",
      "typography": "Особенности типографики",
      "mood": "Настроение изображения"
    }}
  ],

  "common_features": [
    "Общие визуальные особенности"
  ],

  "differences": [
    "Основные различия между референсами"
  ],

  "color_palette": [
    {{
      "color": "Название цвета",
      "hex": "#000000",
      "usage": "Рекомендуемое применение"
    }}
  ],

  "style_keywords": [
    "Ключевые слова стиля"
  ],

  "typography": {{
    "recommended_style": "Рекомендуемый стиль шрифтов",
    "characteristics": [
      "Характеристика типографики"
    ],
    "recommendations": "Рекомендации по типографике"
  }},

  "composition": {{
    "principles": [
      "Принципы композиции"
    ],
    "recommendations": "Рекомендации по композиции"
  }},

  "design_recommendations": [
    {{
      "category": "Категория рекомендации",
      "recommendation": "Подробная рекомендация"
    }}
  ],

  "design_brief": {{
    "concept": "Описание итоговой дизайн-концепции",
    "target_audience": "Предполагаемая целевая аудитория",
    "visual_direction": "Направление визуального дизайна",
    "key_elements": [
      "Ключевой элемент дизайна"
    ],
    "final_recommendations": [
      "Итоговая рекомендация"
    ]
  }}
}}

Важно:
- Анализируй именно загруженные изображения.
- Не выдумывай детали, которых нет на изображениях.
- Если информация неизвестна, укажи это явно.
- Пиши содержательно и профессионально.
- Все текстовые значения должны быть на русском языке.
"""

    # Формируем мультимодальный запрос
    content = [
        {
            "type": "text",
            "text": prompt
        }
    ]

    for index, (filename, raw_bytes) in enumerate(images, start=1):
        logger.info(
            "Подготавливаем изображение %s из %s: %s",
            index,
            len(images),
            filename
        )

        image_bytes = _prepare_image(raw_bytes, filename)

        content.append({
            "type": "text",
            "text": f"Референс {index}: {filename}"
        })

        content.append({
            "type": "image",
            "data": base64.b64encode(image_bytes).decode("utf-8"),
            "mime_type": "image/jpeg"
        })

    # Отправляем запрос в Gemini Interactions API
    try:
        logger.info("Отправляем запрос в Gemini Interactions API.")

        client = genai.Client(api_key=api_key)

        interaction = client.interactions.create(
            model=model_name,
            input=content
        )

        response_text = interaction.output_text or ""

        if not response_text.strip():
            raise ReferenceAnalysisError(
                "Gemini вернул пустой ответ. Попробуйте ещё раз."
            )

        logger.info("Gemini успешно завершил анализ.")

    except ReferenceAnalysisError:
        raise

    except Exception as exc:
        logger.exception(
            "Ошибка при обращении к Google Gemini Interactions API"
        )

        raise ReferenceAnalysisError(
            "Не удалось связаться с ИИ-сервисом. "
            "Проверьте API-ключ, подключение и доступность модели."
        ) from exc

    # Преобразуем ответ модели в Python-словарь
    result = _extract_json(response_text)

    logger.info("JSON успешно обработан.")

    return result
