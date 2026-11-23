const uploadZone = document.querySelector("#upload-zone");
const fileInput = document.querySelector("#reference-input");
const uploadTitle = document.querySelector("#upload-title");
const uploadSubtitle = document.querySelector("#upload-subtitle");
const analyzeButton = document.querySelector("#analyze-button");
const feedback = document.querySelector("#feedback");
const selectedFilesBox = document.querySelector("#selected-files");
const descriptionInput = document.querySelector("#project-description");
const results = document.querySelector("#results");

const MIN_IMAGES = 2;
const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

let selectedImages = [];
let latestAnalysis = null;

function setFeedback(message, isError = true) {
  feedback.textContent = message;
  feedback.classList.toggle("is-success", !isError);
}

function syncInputFiles() {
  const transfer = new DataTransfer();
  selectedImages.forEach((file) => transfer.items.add(file));
  fileInput.files = transfer.files;
}

function renderSelectedFiles() {
  uploadTitle.textContent = selectedImages.length
    ? `Выбрано изображений: ${selectedImages.length}`
    : "Перетащи изображения сюда";
  uploadSubtitle.textContent = selectedImages.length
    ? selectedImages.map((file) => file.name).join(", ")
    : "или выбери файлы с компьютера";

  selectedFilesBox.replaceChildren();
  if (!selectedImages.length) return;

  const heading = document.createElement("p");
  heading.className = "selected-files-heading";
  heading.textContent = "ДОБАВЛЕННЫЕ РЕФЕРЕНСЫ";
  selectedFilesBox.append(heading);

  selectedImages.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "selected-file";
    const name = document.createElement("span");
    name.textContent = `${index + 1}. ${file.name}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-file";
    remove.textContent = "Удалить";
    remove.setAttribute("aria-label", `Удалить ${file.name}`);
    remove.addEventListener("click", () => {
      selectedImages.splice(index, 1);
      syncInputFiles();
      renderSelectedFiles();
      setFeedback("");
    });
    item.append(name, remove);
    selectedFilesBox.append(item);
  });
}

function addFiles(files) {
  const incoming = Array.from(files);
  const rejected = [];

  incoming.forEach((file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      rejected.push(`${file.name}: формат не поддерживается`);
    } else if (file.size > MAX_FILE_SIZE) {
      rejected.push(`${file.name}: размер больше 10 МБ`);
    } else if (selectedImages.some((item) =>
      item.name === file.name && item.size === file.size
    )) {
      // Не добавляем один и тот же файл повторно.
    } else if (selectedImages.length >= MAX_IMAGES) {
      rejected.push(`Можно загрузить максимум ${MAX_IMAGES} изображений`);
    } else {
      selectedImages.push(file);
    }
  });

  syncInputFiles();
  renderSelectedFiles();
  results.hidden = true;
  latestAnalysis = null;
  setFeedback(rejected.join(". "), rejected.length > 0);
}

fileInput.addEventListener("change", () => addFiles(fileInput.files));

["dragenter", "dragover"].forEach((eventName) => {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.remove("is-dragging");
  });
});

uploadZone.addEventListener("drop", (event) => {
  if (event.dataTransfer?.files?.length) {
    addFiles(event.dataTransfer.files);
  }
});

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}

function addList(parent, values, className = "result-list") {
  const list = createElement("ul", className);
  (Array.isArray(values) ? values : []).forEach((value) => {
    const text = typeof value === "string"
      ? value
      : value?.recommendation || value?.category || JSON.stringify(value);
    list.append(createElement("li", "", text));
  });
  parent.append(list);
}

function renderAnalysis(data) {
  results.replaceChildren();
  results.hidden = false;

  const heading = createElement("div", "results-heading");
  heading.append(
    createElement("span", "results-kicker", "DESIGNITY / AI ANALYSIS"),
    createElement("h2", "", "Результаты анализа")
  );
  results.append(heading);

  const summary = createElement("section", "result-card");
  summary.append(createElement("h3", "", "Общая концепция"));
  summary.append(createElement("p", "", data.summary || "Общее описание не получено."));
  results.append(summary);

  const images = createElement("section", "result-section");
  images.append(createElement("h3", "", "Анализ референсов"));
  (data.images_analysis || []).forEach((image, index) => {
    const card = createElement("article", "result-card image-analysis");
    card.append(createElement("span", "result-index", `РЕФЕРЕНС ${index + 1}`));
    card.append(createElement("h4", "", image.image_name || `Изображение ${index + 1}`));
    card.append(createElement("p", "", image.description || ""));
    const details = [
      ["Стиль", image.visual_style],
      ["Композиция", image.composition],
      ["Типографика", image.typography],
      ["Настроение", image.mood],
      ["Цвета", Array.isArray(image.colors) ? image.colors.join(", ") : image.colors],
    ];
    details.forEach(([label, value]) => {
      if (!value) return;
      const row = createElement("p", "analysis-detail");
      row.append(createElement("strong", "", `${label}: `), document.createTextNode(value));
      card.append(row);
    });
    images.append(card);
  });
  results.append(images);

  const comparison = createElement("div", "results-grid");
  const common = createElement("section", "result-card");
  common.append(createElement("h3", "", "Общее между референсами"));
  addList(common, data.common_features);
  const differences = createElement("section", "result-card");
  differences.append(createElement("h3", "", "Различия"));
  addList(differences, data.differences);
  comparison.append(common, differences);
  results.append(comparison);

  const palette = createElement("section", "result-card");
  palette.append(createElement("h3", "", "Цветовая палитра"));
  const swatches = createElement("div", "palette");
  (data.color_palette || []).forEach((item) => {
    const swatch = createElement("div", "palette-item");
    const color = createElement("span", "color-swatch");
    const hex = /^#[0-9a-fA-F]{6}$/.test(item.hex || "") ? item.hex : "#777777";
    color.style.backgroundColor = hex;
    swatch.append(color, createElement("strong", "", item.color || hex));
    swatch.append(createElement("small", "", hex));
    if (item.usage) swatch.append(createElement("small", "", item.usage));
    swatches.append(swatch);
  });
  palette.append(swatches);
  results.append(palette);

  const selection = createElement("section", "result-card selection-card");
  selection.append(createElement("h3", "", "Выбери характеристики для своего проекта"));
  selection.append(createElement("p", "muted-result", "Отметь идеи, которые хочешь перенести в итоговую концепцию."));
  const options = [];
  (data.common_features || []).forEach((value) => options.push({ label: value, group: "Общие черты" }));
  (data.style_keywords || []).forEach((value) => options.push({ label: value, group: "Ключевые слова" }));
  (data.design_recommendations || []).forEach((value) => {
    options.push({
      label: `${value.category ? `${value.category}: ` : ""}${value.recommendation || ""}`,
      group: "Рекомендации",
    });
  });
  (data.color_palette || []).forEach((value) => {
    options.push({
      label: `${value.color || value.hex} (${value.hex || ""}) — ${value.usage || "цвет палитры"}`,
      group: "Цвета",
    });
  });

  const uniqueOptions = [...new Map(options.filter((item) => item.label.trim())
    .map((item) => [item.label, item])).values()];
  const checkboxList = createElement("div", "characteristics-list");
  uniqueOptions.forEach((option, index) => {
    const label = createElement("label", "characteristic-option");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "characteristic";
    checkbox.value = option.label;
    checkbox.checked = true;
    const copy = createElement("span", "");
    copy.append(createElement("small", "", option.group));
    copy.append(createElement("span", "", option.label));
    label.append(checkbox, copy);
    checkboxList.append(label);
  });
  if (!uniqueOptions.length) {
    checkboxList.append(createElement("p", "muted-result", "ИИ не вернул список отдельных характеристик. Можно использовать общий бриф."));
  }
  selection.append(checkboxList);

  const briefButton = createElement("button", "brief-button", "Сформировать дизайн-бриф");
  briefButton.type = "button";
  briefButton.addEventListener("click", () => renderBrief(data, checkboxList));
  selection.append(briefButton);
  results.append(selection);

  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderBrief(data, checkboxList) {
  const selected = Array.from(checkboxList.querySelectorAll("input:checked"))
    .map((input) => input.value);
  const source = data.design_brief || {};
  const lines = [
    "ДИЗАЙН-БРИФ",
    "",
    `Концепция: ${source.concept || data.summary || "Не указана"}`,
    `Целевая аудитория: ${source.target_audience || "Требует уточнения"}`,
    `Визуальное направление: ${source.visual_direction || "Требует уточнения"}`,
    "",
    "ВЫБРАННЫЕ ХАРАКТЕРИСТИКИ",
    ...(selected.length ? selected.map((item) => `• ${item}`) : ["• Характеристики не выбраны"]),
    "",
    "КЛЮЧЕВЫЕ ЭЛЕМЕНТЫ",
    ...(source.key_elements || [] ).map((item) => `• ${item}`),
    "",
    "ИТОГОВЫЕ РЕКОМЕНДАЦИИ",
    ...(source.final_recommendations || []).map((item) => `• ${item}`),
  ];
  const brief = createElement("section", "result-card brief-card");
  brief.append(createElement("h3", "", "Твой дизайн-бриф"));
  const editor = document.createElement("textarea");
  editor.className = "brief-editor";
  editor.rows = 16;
  editor.value = lines.join("\n");
  editor.setAttribute("aria-label", "Редактируемый дизайн-бриф");
  const actions = createElement("div", "brief-actions");
  const copy = createElement("button", "brief-button", "Скопировать бриф");
  copy.type = "button";
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(editor.value);
      setFeedback("Дизайн-бриф скопирован.", false);
    } catch {
      editor.select();
      document.execCommand("copy");
      setFeedback("Дизайн-бриф скопирован.", false);
    }
  });
  actions.append(copy);
  brief.append(editor, actions);
  const previous = results.querySelector(".brief-card");
  if (previous) previous.remove();
  results.append(brief);
  brief.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function runAnalysis() {
  if (selectedImages.length < MIN_IMAGES) {
    setFeedback(`Для анализа добавь минимум ${MIN_IMAGES} изображения.`);
    return;
  }
  if (selectedImages.length > MAX_IMAGES) {
    setFeedback(`Можно загрузить максимум ${MAX_IMAGES} изображений.`);
    return;
  }

  const formData = new FormData();
  selectedImages.forEach((file) => formData.append("images", file));
  formData.append("description", descriptionInput.value.trim());

  analyzeButton.disabled = true;
  analyzeButton.textContent = "ИИ анализирует референсы...";
  setFeedback("Отправляем изображения в Designity AI. Это может занять некоторое время.", false);
  results.hidden = true;

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || `Ошибка сервера (${response.status}).`);
    }
    latestAnalysis = payload.data;
    renderAnalysis(latestAnalysis);
    setFeedback("Анализ завершён. Выбери характеристики и сформируй дизайн-бриф.", false);
  } catch (error) {
    setFeedback(error.message || "Не удалось связаться с сервером. Проверь Docker и API-ключ.");
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.textContent = "Запустить анализ";
  }
}

analyzeButton.addEventListener("click", runAnalysis);
