// Глобальные переменные
let currentFile = null;
let currentTab = "compress";
let currentJobId = null;
let progressInterval = null;

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", function () {
  initTabs();
  initFileUploads();
  initSliders();
  initButtons();
  initProgressModal();

  // Сохраняем оригинальный текст кнопок
  const buttons = document.querySelectorAll(".btn:not(.btn-secondary)");
  buttons.forEach((button) => {
    button.setAttribute("data-original-text", button.innerHTML);
  });
});

// 1. Инициализация табов
function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.getAttribute("data-tab");
      currentTab = tabId;

      // Убираем активный класс
      tabs.forEach((t) => t.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));

      // Добавляем активный класс
      tab.classList.add("active");
      document.getElementById(tabId).classList.add("active");
    });
  });
}

// 2. Инициализация загрузки файлов
function initFileUploads() {
  // Для каждой вкладки настраиваем загрузку
  const uploadConfigs = [
    {
      areaId: "uploadAreaCompress",
      btnId: "selectFileBtnCompress",
      inputId: "fileInputCompress",
      infoId: "fileInfoCompress",
      nameId: "fileNameCompress",
      sizeId: "fileSizeCompress",
    },
    {
      areaId: "uploadAreaConvert",
      btnId: "selectFileBtnConvert",
      inputId: "fileInputConvert",
      infoId: "fileInfoConvert",
      nameId: "fileNameConvert",
      sizeId: "fileSizeConvert",
    },
    {
      areaId: "uploadAreaBoth",
      btnId: "selectFileBtnBoth",
      inputId: "fileInputBoth",
      infoId: "fileInfoBoth",
      nameId: "fileNameBoth",
      sizeId: "fileSizeBoth",
    },
  ];

  uploadConfigs.forEach((config) => {
    const uploadArea = document.getElementById(config.areaId);
    const selectBtn = document.getElementById(config.btnId);
    const fileInput = document.getElementById(config.inputId);
    const fileInfo = document.getElementById(config.infoId);
    const fileName = document.getElementById(config.nameId);
    const fileSize = document.getElementById(config.sizeId);

    if (!uploadArea || !selectBtn || !fileInput) return;

    // Клик по кнопке выбора файла
    selectBtn.addEventListener("click", () => {
      fileInput.click();
    });

    // Изменение выбора файла
    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0], fileInfo, fileName, fileSize);
      }
    });

    // Drag and Drop
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = "var(--primary)";
      uploadArea.style.backgroundColor = "rgba(108, 99, 255, 0.05)";
    });

    uploadArea.addEventListener("dragleave", () => {
      uploadArea.style.borderColor = "var(--gray)";
      uploadArea.style.backgroundColor = "transparent";
    });

    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = "var(--gray)";
      uploadArea.style.backgroundColor = "transparent";

      if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0], fileInfo, fileName, fileSize);
      }
    });
  });
}

// Обработка выбора файла
function handleFileSelect(file, fileInfo, fileNameElem, fileSizeElem) {
  // Проверка размера файла
  if (file.size > 2 * 1024 * 1024 * 1024) {
    alert("Файл слишком большой. Максимальный размер: 2GB");
    return;
  }

  // Проверка формата
  const validExtensions = [
    ".mp4",
    ".avi",
    ".mov",
    ".wmv",
    ".flv",
    ".mkv",
    ".webm",
    ".m4v",
    ".mpg",
    ".mpeg",
    ".3gp",
  ];
  const extension = file.name
    .substring(file.name.lastIndexOf("."))
    .toLowerCase();

  if (!validExtensions.includes(extension)) {
    alert("Неподдерживаемый формат файла. Пожалуйста, выберите видео файл.");
    return;
  }

  currentFile = file;

  // Показываем информацию о файле
  fileNameElem.textContent = file.name;
  fileSizeElem.textContent = formatFileSize(file.size);
  fileInfo.style.display = "block";

  console.log("Файл выбран:", file.name, formatFileSize(file.size));
}

// Форматирование размера файла
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// 3. Инициализация слайдеров
function initSliders() {
  // Слайдер для сжатия по размеру
  const targetSize = document.getElementById("targetSize");
  const sizeValue = document.getElementById("sizeValue");
  if (targetSize && sizeValue) {
    targetSize.addEventListener("input", function () {
      sizeValue.textContent = `${this.value} МБ`;
    });
  }

  // Слайдер для сжатия по проценту
  const compressPercent = document.getElementById("compressPercent");
  const percentValue = document.getElementById("percentValue");
  if (compressPercent && percentValue) {
    compressPercent.addEventListener("input", function () {
      percentValue.textContent = `${this.value}%`;
    });
  }

  // Слайдер для комбинированной операции
  const bothTargetSize = document.getElementById("bothTargetSize");
  const bothSizeValue = document.getElementById("bothSizeValue");
  if (bothTargetSize && bothSizeValue) {
    bothTargetSize.addEventListener("input", function () {
      bothSizeValue.textContent = `${this.value} МБ`;
    });
  }

  // Переключение метода сжатия
  const compressMethod = document.getElementById("compressMethod");
  const sizeOption = document.getElementById("sizeOption");
  const percentOption = document.getElementById("percentOption");

  if (compressMethod && sizeOption && percentOption) {
    compressMethod.addEventListener("change", function () {
      if (this.value === "size") {
        sizeOption.style.display = "block";
        percentOption.style.display = "none";
      } else if (this.value === "percent") {
        sizeOption.style.display = "none";
        percentOption.style.display = "block";
      } else {
        sizeOption.style.display = "none";
        percentOption.style.display = "none";
      }
    });
  }
}

// 4. Инициализация кнопок
function initButtons() {
  // Кнопка сжатия
  const compressBtn = document.getElementById("compressBtn");
  if (compressBtn) {
    compressBtn.addEventListener("click", processCompress);
  }

  // Кнопка конвертации
  const convertBtn = document.getElementById("convertBtn");
  if (convertBtn) {
    convertBtn.addEventListener("click", processConvert);
  }

  // Кнопка сжатия и конвертации
  const bothBtn = document.getElementById("bothBtn");
  if (bothBtn) {
    bothBtn.addEventListener("click", processBoth);
  }

  // Кнопки сброса
  const resetButtons = ["resetBtnCompress", "resetBtnConvert", "resetBtnBoth"];
  resetButtons.forEach((btnId) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener("click", resetTab);
    }
  });
}

// 5. Инициализация модалки прогресса
function initProgressModal() {
  const cancelBtn = document.getElementById("cancelProcessing");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (confirm("Вы уверены, что хотите отменить обработку?")) {
        hideProgressModal();

        // Восстанавливаем кнопку
        const button = document.querySelector(".btn:disabled");
        if (button) {
          button.innerHTML =
            button.getAttribute("data-original-text") ||
            '<i class="fas fa-compress-alt"></i> Сжать видео';
          button.disabled = false;
        }
      }
    });
  }
}

// Функция сброса вкладки
function resetTab() {
  currentFile = null;

  // Скрываем информацию о файле на текущей вкладке
  const currentTabId = currentTab;
  const fileInfo = document.getElementById(
    `fileInfo${capitalizeFirstLetter(currentTabId)}`,
  );
  if (fileInfo) {
    fileInfo.style.display = "none";
  }

  // Сбрасываем input файла
  const fileInput = document.getElementById(
    `fileInput${capitalizeFirstLetter(currentTabId)}`,
  );
  if (fileInput) {
    fileInput.value = "";
  }

  // Сбрасываем значения для вкладки сжатия
  if (currentTabId === "compress") {
    const compressMethod = document.getElementById("compressMethod");
    const sizeOption = document.getElementById("sizeOption");
    const percentOption = document.getElementById("percentOption");
    const targetSize = document.getElementById("targetSize");
    const sizeValue = document.getElementById("sizeValue");
    const compressPercent = document.getElementById("compressPercent");
    const percentValue = document.getElementById("percentValue");

    if (compressMethod) compressMethod.value = "size";
    if (sizeOption) sizeOption.style.display = "block";
    if (percentOption) percentOption.style.display = "none";
    if (targetSize) targetSize.value = 50;
    if (sizeValue) sizeValue.textContent = "50 МБ";
    if (compressPercent) compressPercent.value = 50;
    if (percentValue) percentValue.textContent = "50%";
  }

  // Сбрасываем значения для комбинированной вкладки
  if (currentTabId === "both") {
    const bothTargetSize = document.getElementById("bothTargetSize");
    const bothSizeValue = document.getElementById("bothSizeValue");

    if (bothTargetSize) bothTargetSize.value = 100;
    if (bothSizeValue) bothSizeValue.textContent = "100 МБ";
  }

  console.log("Вкладка сброшена");
}

// Вспомогательная функция для капитализации
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// 6. Основные функции обработки
async function processCompress() {
  if (!currentFile) {
    alert("Пожалуйста, выберите видео файл");
    return;
  }

  const method = document.getElementById("compressMethod").value;
  const formData = new FormData();
  formData.append("video", currentFile);

  let endpoint = "";
  let processingText = "";

  if (method === "size") {
    const size = document.getElementById("targetSize").value;
    if (!size || size < 1) {
      alert("Пожалуйста, укажите размер для сжатия");
      return;
    }
    formData.append("targetSize", size);
    endpoint = "/api/video/compress/size";
    processingText = `Сжатие видео до ${size} МБ`;
  } else if (method === "percent") {
    const percent = document.getElementById("compressPercent").value;
    if (!percent || percent < 1 || percent > 99) {
      alert("Пожалуйста, укажите процент сжатия от 1 до 99");
      return;
    }
    formData.append("percent", percent);
    endpoint = "/api/video/compress/percent";
    processingText = `Сжатие видео на ${percent}%`;
  } else {
    endpoint = "/api/video/compress/size";
    formData.append("targetSize", "50");
    processingText = "Сжатие видео";
  }

  await sendProcessingRequest(endpoint, formData, processingText);
}

async function processConvert() {
  if (!currentFile) {
    alert("Пожалуйста, выберите видео файл");
    return;
  }

  const format = document.getElementById("targetFormat").value;
  const quality = document.getElementById("videoQuality").value;

  const formData = new FormData();
  formData.append("video", currentFile);
  formData.append("format", format);
  formData.append("quality", quality);

  await sendProcessingRequest(
    "/api/video/convert",
    formData,
    `Конвертация в ${format.toUpperCase()}`,
  );
}

async function processBoth() {
  if (!currentFile) {
    alert("Пожалуйста, выберите видео файл");
    return;
  }

  const format = document.getElementById("bothTargetFormat").value;
  const size = document.getElementById("bothTargetSize").value;
  const quality = document.getElementById("bothVideoQuality").value;

  if (!size || size < 1) {
    alert("Пожалуйста, укажите размер для сжатия");
    return;
  }

  const formData = new FormData();
  formData.append("video", currentFile);
  formData.append("format", format);
  formData.append("targetSize", size);
  formData.append("quality", quality);

  await sendProcessingRequest(
    "/api/video/compress-convert",
    formData,
    `Сжатие до ${size} МБ и конвертация в ${format.toUpperCase()}`,
  );
}

// 7. Отправка запроса на сервер с прогресс-баром
async function sendProcessingRequest(endpoint, formData, actionName) {
  const button = event.target.closest(".btn");
  const originalText = button.innerHTML;

  // Показываем модалку с прогрессом
  showProgressModal(actionName);

  button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Начинаем...`;
  button.disabled = true;

  try {
    console.log("Отправка запроса на:", endpoint);

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Неизвестная ошибка сервера" }));
      throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.jobId) {
      // Сохраняем ID задачи
      currentJobId = result.jobId;

      // Начинаем отслеживать прогресс
      startProgressTracking();
    } else if (result.success) {
      // Старый формат ответа (без jobId)
      hideProgressModal();
      showSuccessMessage(result);

      // Автоматическое скачивание
      setTimeout(() => {
        downloadFile(result.downloadUrl, result.processedFile);
      }, 1000);

      button.innerHTML = originalText;
      button.disabled = false;
    } else {
      throw new Error(result.error || "Неизвестная ошибка");
    }
  } catch (error) {
    console.error("Ошибка обработки:", error);

    hideProgressModal();
    alert(`Ошибка: ${error.message}`);
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

// 8. Функции для работы с прогресс-баром
function showProgressModal(actionName) {
  const overlay = document.getElementById("processingOverlay");
  const title = document.getElementById("processingTitle");
  const icon = document.getElementById("processingIcon");

  if (overlay && title) {
    title.textContent = actionName;
    icon.className = "fas fa-spinner fa-spin";
    overlay.style.display = "flex";

    // Сброс прогресса
    updateProgress(
      0,
      "Подготовка к обработке...",
      "00:00",
      "--:--",
      "Инициализация",
      "-",
    );
  }
}

function updateProgress(percent, message, time, remaining, stage, speed) {
  const percentElement = document.getElementById("progressPercent");
  const barElement = document.getElementById("progressBar");
  const textElement = document.getElementById("processingText");
  const timeElement = document.getElementById("progressTime");
  const remainingElement = document.getElementById("processRemaining");
  const stageElement = document.getElementById("processStage");
  const speedElement = document.getElementById("progressSpeed");
  const processTimeElement = document.getElementById("processTime");
  const icon = document.getElementById("processingIcon");

  if (percentElement) percentElement.textContent = `${percent}%`;
  if (barElement) barElement.style.width = `${percent}%`;
  if (textElement) textElement.textContent = message;
  if (timeElement) timeElement.textContent = time;
  if (remainingElement) remainingElement.textContent = remaining;
  if (stageElement) stageElement.textContent = stage;
  if (speedElement) speedElement.textContent = speed;
  if (processTimeElement) processTimeElement.textContent = time;

  // Меняем иконку в зависимости от прогресса
  if (icon) {
    if (percent >= 100) {
      icon.className = "fas fa-check-circle";
      icon.style.color = "#4caf50";
    } else if (percent >= 80) {
      icon.className = "fas fa-tasks";
    } else if (percent >= 50) {
      icon.className = "fas fa-cogs";
    } else if (percent >= 20) {
      icon.className = "fas fa-spinner fa-spin";
    }
  }
}

function startProgressTracking() {
  if (!currentJobId) return;

  if (progressInterval) {
    clearInterval(progressInterval);
  }

  progressInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/processing-status/${currentJobId}`);
      if (!response.ok) {
        console.log("Не удалось получить статус задачи");
        return;
      }

      const status = await response.json();

      // Обновляем UI
      updateProgress(
        status.progress || 0,
        status.message || "Обработка...",
        status.time || "00:00",
        status.remaining || "--:--",
        status.stage || "Обработка",
        status.speed || "-",
      );

      // Если обработка завершена
      if (status.status === "completed" && status.result) {
        clearInterval(progressInterval);

        // Показываем завершение
        updateProgress(
          100,
          "Обработка завершена!",
          "Готово",
          "00:00",
          "Готово",
          "-",
        );

        // Автоматическое скрытие через 2 секунды
        setTimeout(() => {
          hideProgressModal();

          // Автоматическое скачивание
          if (status.result.downloadUrl) {
            downloadFile(
              status.result.downloadUrl,
              status.result.processedFile,
            );
          }

          // Показываем результат
          showSuccessMessage(status.result);

          // Восстанавливаем кнопку
          const button = document.querySelector(".btn:disabled");
          if (button) {
            button.innerHTML =
              button.getAttribute("data-original-text") ||
              '<i class="fas fa-compress-alt"></i> Сжать видео';
            button.disabled = false;
          }
        }, 2000);
      }

      // Если ошибка
      if (status.status === "error") {
        clearInterval(progressInterval);
        hideProgressModal();
        alert(`Ошибка: ${status.message}`);

        // Восстанавливаем кнопку
        const button = document.querySelector(".btn:disabled");
        if (button) {
          button.innerHTML =
            button.getAttribute("data-original-text") ||
            '<i class="fas fa-compress-alt"></i> Сжать видео';
          button.disabled = false;
        }
      }
    } catch (error) {
      console.error("Ошибка отслеживания прогресса:", error);
    }
  }, 1000); // Проверяем каждую секунду
}

function hideProgressModal() {
  const overlay = document.getElementById("processingOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }

  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }

  currentJobId = null;
}

// 9. Показ успешного сообщения
function showSuccessMessage(result) {
  // Создаем красивое модальное окно с результатом
  const modal = document.createElement("div");
  modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

  const sizeChange =
    result.compressionRatio ||
    ((1 - result.compressedSize / result.originalSize) * 100).toFixed(2) + "%";

  modal.innerHTML = `
            <div style="
                background: white;
                padding: 40px;
                border-radius: var(--border-radius);
                max-width: 500px;
                width: 90%;
                text-align: center;
                box-shadow: var(--shadow);
            ">
                <div style="
                    background: #4caf50;
                    color: white;
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                    font-size: 40px;
                ">
                    <i class="fas fa-check"></i>
                </div>
                <h3 style="margin-bottom: 20px; color: var(--dark);">✅ Обработка завершена!</h3>
                <div style="text-align: left; margin-bottom: 25px; background: #f8f9fa; padding: 20px; border-radius: 8px;">
                    <p style="margin-bottom: 10px;"><strong>📁 Исходный файл:</strong> ${result.originalFile}</p>
                    <p style="margin-bottom: 10px;"><strong>📊 Исходный размер:</strong> ${formatFileSize(result.originalSize)}</p>
                    ${
                      result.compressedSize
                        ? `
                        <p style="margin-bottom: 10px;"><strong>📁 Результат:</strong> ${formatFileSize(result.compressedSize)}</p>
                        <p style="margin-bottom: 10px;"><strong>📉 Степень сжатия:</strong> ${sizeChange}</p>
                    `
                        : ""
                    }
                    ${result.convertedFormat ? `<p style="margin-bottom: 10px;"><strong>🔄 Конвертировано в:</strong> ${result.convertedFormat}</p>` : ""}
                    ${result.format ? `<p style="margin-bottom: 10px;"><strong>🎬 Формат:</strong> ${result.format}</p>` : ""}
                </div>
                <p style="margin-bottom: 20px; color: var(--gray-dark);">Файл автоматически скачивается...</p>
                <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                        style="
                            background: var(--primary);
                            color: white;
                            border: none;
                            padding: 12px 30px;
                            border-radius: 50px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: var(--transition);
                        "
                        onmouseover="this.style.transform='translateY(-2px)'"
                        onmouseout="this.style.transform='translateY(0)'">
                    Закрыть
                </button>
            </div>
        `;

  document.body.appendChild(modal);

  // Автоматическое закрытие через 10 секунд
  setTimeout(() => {
    if (modal.parentNode) {
      modal.remove();
    }
  }, 10000);
}

// 10. Скачивание файла
function downloadFile(url, filename) {
  console.log("Скачивание файла:", url, filename);

  // Создаем временную ссылку для скачивания
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Альтернативный способ - открытие в новой вкладке
  setTimeout(() => {
    window.open(url, "_blank");
  }, 500);
}

// 11. Проверка соединения с сервером при загрузке
window.addEventListener("load", async () => {
  try {
    const response = await fetch("/api/health");
    if (response.ok) {
      console.log("✅ Соединение с сервером установлено");
    }
  } catch (error) {
    console.warn("⚠️ Не удалось подключиться к серверу");
  }
});

// Вспомогательная функция для форматирования времени
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
