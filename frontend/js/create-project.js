const uploadZone = document.querySelector("#upload-zone");
const fileInput = document.querySelector("#reference-input");
const uploadTitle = document.querySelector("#upload-title");
const uploadSubtitle = document.querySelector("#upload-subtitle");
const uploadHint = document.querySelector("#upload-hint");
const analyzeButton = document.querySelector("#analyze-button");
const feedback = document.querySelector("#feedback");

let selectedImages = [];

function updateSelectedFiles(files) {
  selectedImages = Array.from(files).filter((file) =>
    file.type.startsWith("image/")
  );

  if (selectedImages.length === 0) {
    uploadTitle.textContent = "Перетащи изображения сюда";
    uploadSubtitle.innerHTML = 'или <strong>выбери файлы</strong> с компьютера';
    uploadHint.textContent = "Можно добавить несколько изображений";
    feedback.textContent = "";
    return;
  }

  uploadTitle.textContent = `Выбрано изображений: ${selectedImages.length}`;
  uploadSubtitle.textContent = selectedImages.map((file) => file.name).join(", ");
  uploadHint.textContent = "Нажми, чтобы выбрать другие изображения";
  feedback.textContent = "";
}

fileInput.addEventListener("change", () => {
  updateSelectedFiles(fileInput.files);
});

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
  const files = event.dataTransfer?.files;
  if (!files?.length) return;

  // Переносим файлы в input, чтобы дальнейшая отправка могла использовать FormData.
  const transfer = new DataTransfer();
  Array.from(files).forEach((file) => {
    if (file.type.startsWith("image/")) transfer.items.add(file);
  });
  fileInput.files = transfer.files;
  updateSelectedFiles(fileInput.files);
});

analyzeButton.addEventListener("click", () => {
  if (selectedImages.length < 2) {
    feedback.textContent = "Для анализа добавь минимум два изображения.";
    return;
  }

  feedback.textContent = `Добавлено ${selectedImages.length} изображений. Интерфейс готов к подключению backend и ИИ-анализа.`;
});
