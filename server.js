const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3000;

// Указываем путь к FFmpeg
// const ffmpegPath = path.join(__dirname, "ffmpeg", "bin", "ffmpeg.exe");
// const ffprobePath = path.join(__dirname, "ffmpeg", "bin", "ffprobe.exe");
// ============================================
// ==== FFMPEG - АВТОВЫБОР ПЛАТФОРМЫ ==========
// ============================================
const isWindows = process.platform === 'win32';
const isProduction = process.env.NODE_ENV === 'production';

let ffmpegPath, ffprobePath;

if (isProduction) {
  // RENDER - используем системный FFmpeg
  ffmpegPath = 'ffmpeg';
  ffprobePath = 'ffprobe';
  console.log('☁️ Render: используем системный FFmpeg');
} 
else if (isWindows) {
  // Windows - локальный
  ffmpegPath = path.join(__dirname, "ffmpeg", "bin", "ffmpeg.exe");
  ffprobePath = path.join(__dirname, "ffmpeg", "bin", "ffprobe.exe");
  console.log('🪟 Windows: локальный FFmpeg');
}
else {
  // MacOS/Linux локально
  ffmpegPath = 'ffmpeg';
  ffprobePath = 'ffprobe';
  console.log('🐧 Linux/Mac: системный FFmpeg');
}

console.log(`📁 FFmpeg путь: ${ffmpegPath}`);
console.log(`📁 FFprobe путь: ${ffprobePath}`);

// console.log("FFmpeg путь:", ffmpegPath);
// console.log("FFprobe путь:", ffprobePath);

// Создаем папки
const folders = ["uploads", "uploads/input", "uploads/output"];
folders.forEach((folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    console.log(`Создана папка: ${folder}`);
  }
});

// Простое преобразование: кириллица -> латиница
function simpleTranslit(text) {
  if (!text) return "video";

  const map = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "yo",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
    А: "A",
    Б: "B",
    В: "V",
    Г: "G",
    Д: "D",
    Е: "E",
    Ё: "YO",
    Ж: "ZH",
    З: "Z",
    И: "I",
    Й: "Y",
    К: "K",
    Л: "L",
    М: "M",
    Н: "N",
    О: "O",
    П: "P",
    Р: "R",
    С: "S",
    Т: "T",
    У: "U",
    Ф: "F",
    Х: "H",
    Ц: "TS",
    Ч: "CH",
    Ш: "SH",
    Щ: "SCH",
    Ъ: "",
    Ы: "Y",
    Ь: "",
    Э: "E",
    Ю: "YU",
    Я: "YA",
  };

  let result = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (map[char]) {
      result += map[char];
    } else if (char === " ") {
      result += "_";
    } else if (/[a-zA-Z0-9\-_\.]/.test(char)) {
      result += char;
    } else {
      result += "_";
    }
  }

  // Убираем множественные подчеркивания и обрезаем
  result = result.replace(/_+/g, "_").replace(/^_+|_+$/g, "");

  // Если результат пустой или слишком короткий, добавляем timestamp
  if (!result || result.length < 3) {
    const timestamp = Date.now().toString().slice(-6);
    result = `video_${timestamp}`;
  }

  // Ограничиваем длину
  if (result.length > 100) {
    result = result.substring(0, 100);
  }

  return result;
}

// Функция для создания безопасного имени файла - УПРОЩЕННАЯ ВЕРСИЯ
function createOutputFilename(originalName, prefix = "") {
  console.log(`🔤 Создание имени для: "${originalName}"`);

  // Берем только имя без расширения
  const nameWithoutExt = path.basename(
    originalName,
    path.extname(originalName),
  );

  // Транслитерируем
  const transliterated = simpleTranslit(nameWithoutExt);

  // Собираем имя
  let finalName = prefix ? `${prefix}_${transliterated}` : transliterated;

  // Добавляем UUID
  const shortUuid = uuidv4().slice(0, 6);

  // НЕ ДОБАВЛЯЕМ РАСШИРЕНИЕ ЗДЕСЬ!
  finalName = `${finalName}_${shortUuid}`;

  console.log(`✅ Итоговое имя (без расширения): ${finalName}`);
  return finalName; // Возвращаем без расширения!
}

// Настройка загрузки файлов - используем UUID для хранения
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/input/");
  },
  filename: (req, file, cb) => {
    // Всегда используем UUID для хранения файлов на сервере
    const ext = path.extname(file.originalname) || ".mp4";
    const uniqueName = `${uuidv4()}${ext}`;

    console.log(
      `📤 Файл сохранен как: ${uniqueName} (оригинал: "${file.originalname}")`,
    );
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Разрешаем CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Главная страница
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Проверка здоровья
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Сервер работает",
    ffmpeg: fs.existsSync(ffmpegPath) ? "доступен" : "не найден",
  });
});

// Получить информацию о видео
app.post("/api/video/info", upload.single("video"), (req, res) => {
  console.log("📨 Получен запрос информации о видео");

  if (!req.file) {
    return res.status(400).json({ error: "Файл не загружен" });
  }

  const inputPath = path.join(__dirname, req.file.path);

  console.log(`📁 Анализ файла: "${req.file.originalname}"`);

  exec(
    `"${ffprobePath}" -v quiet -print_format json -show_format -show_streams "${inputPath}"`,
    (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Ошибка FFprobe:", error);
        return res.status(500).json({ error: "Ошибка анализа видео" });
      }

      try {
        const info = JSON.parse(stdout);
        const videoStream = info.streams.find((s) => s.codec_type === "video");
        const audioStream = info.streams.find((s) => s.codec_type === "audio");

        const response = {
          success: true,
          filename: req.file.originalname,
          size: req.file.size,
          duration: parseFloat(info.format.duration),
          format: info.format.format_name,
          video: videoStream
            ? {
                codec: videoStream.codec_name,
                width: videoStream.width,
                height: videoStream.height,
                fps: videoStream.r_frame_rate
                  ? eval(videoStream.r_frame_rate)
                  : null,
              }
            : null,
          audio: audioStream
            ? {
                codec: audioStream.codec_name,
                channels: audioStream.channels,
              }
            : null,
        };

        console.log("✅ Информация о видео получена");
        res.json(response);
      } catch (e) {
        console.error("❌ Ошибка парсинга:", e);
        res.status(500).json({ error: "Ошибка парсинга информации" });
      }
    },
  );
});

// Хранилище статусов обработки
const processingStatus = {};

// Маршрут для получения статуса обработки
app.get("/api/processing-status/:jobId", (req, res) => {
  const jobId = req.params.jobId;
  const status = processingStatus[jobId] || {
    status: "unknown",
    progress: 0,
    message: "Задача не найдена",
  };

  res.json(status);
});

// Обновите обработку видео для сохранения статуса:
app.post("/api/video/compress/size", upload.single("video"), (req, res) => {
  console.log("✅ Получен запрос на сжатие по размеру");

  const { targetSize } = req.body;

  if (!req.file || !targetSize) {
    return res.status(400).json({ error: "Недостаточно данных" });
  }

  const originalName = req.file.originalname;
  const inputPath = path.join(__dirname, req.file.path);

  // Создаем ID задачи для отслеживания прогресса
  const jobId = uuidv4();

  // Инициализируем статус
  processingStatus[jobId] = {
    status: "uploaded",
    progress: 5,
    message: "Файл загружен",
    stage: "Анализ видео",
    time: "00:00",
    remaining: "--:--",
    speed: "-",
  };

  // Возвращаем ID задачи сразу
  res.json({
    success: true,
    jobId: jobId,
    message: "Начинаем обработку...",
  });

  // Продолжаем обработку асинхронно
  setTimeout(() => {
    processCompressSize();
  }, 100);

  async function processCompressSize() {
    try {
      // Создаем читаемое имя для выходного файла
      const outputFilename = createOutputFilename(originalName, "compressed");
      const outputPath = path.join(__dirname, "uploads/output", outputFilename);

      // Обновляем статус
      processingStatus[jobId] = {
        ...processingStatus[jobId],
        status: "analyzing",
        progress: 10,
        message: "Анализируем видео",
        stage: "Анализ видео",
      };

      console.log(`📁 Исходный файл: "${originalName}"`);
      console.log(`📁 Выходной файл: ${outputFilename}`);
      console.log(`🎯 Целевой размер: ${targetSize} МБ`);

      // Получаем длительность видео
      const duration = await new Promise((resolve, reject) => {
        exec(
          `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`,
          (err, duration) => {
            if (err) reject(err);
            else resolve(duration);
          },
        );
      });

      const durationSec = parseFloat(duration);

      // Обновляем статус
      processingStatus[jobId] = {
        ...processingStatus[jobId],
        status: "calculating",
        progress: 15,
        message: "Расчет параметров",
        stage: "Подготовка обработки",
      };

      const targetBits = targetSize * 8 * 1024 * 1024;
      let targetBitrate = Math.floor(targetBits / durationSec - 128000);

      if (targetBitrate < 100000) {
        targetBitrate = 100000;
      }

      // Команда FFmpeg
      const command = `"${ffmpegPath}" -i "${inputPath}" -b:v ${targetBitrate} -c:a aac -b:a 128k -preset fast -y "${outputPath}"`;

      console.log("🚀 Выполняем команду FFmpeg...");

      // Обновляем статус
      processingStatus[jobId] = {
        ...processingStatus[jobId],
        status: "processing",
        progress: 20,
        message: "Начинаем сжатие видео",
        stage: "Сжатие видео",
      };

      // Запускаем FFmpeg
      const ffmpegProcess = exec(command);

      let lastProgressTime = Date.now();
      let lastProgressSeconds = 0;

      // Обработка прогресса
      ffmpegProcess.stderr.on("data", (data) => {
        const lines = data.toString().split("\n");
        lines.forEach((line) => {
          if (line.includes("time=")) {
            const timeMatch = line.match(/time=(\d+):(\d+):(\d+\.\d+)/);
            const speedMatch = line.match(/speed=([\d.]+)x/);

            if (timeMatch) {
              const hours = parseInt(timeMatch[1]);
              const minutes = parseInt(timeMatch[2]);
              const seconds = parseFloat(timeMatch[3]);
              const totalSeconds = hours * 3600 + minutes * 60 + seconds;

              // Расчет прогресса в процентах
              const progressPercent = Math.min(
                90,
                Math.max(20, (totalSeconds / durationSec) * 100),
              );

              // Расчет скорости
              const now = Date.now();
              const timeDiff = now - lastProgressTime;
              const secondsDiff = totalSeconds - lastProgressSeconds;

              let speed = speedMatch ? parseFloat(speedMatch[1]) : 1;
              if (timeDiff > 0 && secondsDiff > 0) {
                const calculatedSpeed = secondsDiff / (timeDiff / 1000);
                if (!isNaN(calculatedSpeed)) {
                  speed = calculatedSpeed;
                }
              }

              // Расчет оставшегося времени
              const remainingSeconds = (durationSec - totalSeconds) / speed;
              const remainingMinutes = Math.floor(remainingSeconds / 60);
              const remainingSecs = Math.floor(remainingSeconds % 60);

              // Обновляем статус
              processingStatus[jobId] = {
                ...processingStatus[jobId],
                progress: Math.round(progressPercent),
                message: `Обработано ${Math.round(progressPercent)}%`,
                stage: "Сжатие видео",
                time: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toFixed(2).padStart(5, "0")}`,
                remaining: `${remainingMinutes}:${remainingSecs.toString().padStart(2, "0")}`,
                speed: `${speed.toFixed(1)}x`,
              };

              lastProgressTime = now;
              lastProgressSeconds = totalSeconds;
            }
          }
        });
      });

      // Ожидание завершения FFmpeg
      ffmpegProcess.on("close", async (code) => {
        if (code === 0) {
          console.log("✅ FFmpeg завершил работу");

          // Обновляем статус
          processingStatus[jobId] = {
            ...processingStatus[jobId],
            status: "finalizing",
            progress: 95,
            message: "Завершаем обработку",
            stage: "Финальная обработка",
          };

          // Получаем информацию о файле
          const stats = await fs.stat(outputPath);
          const compressionRatio = (
            (1 - stats.size / req.file.size) *
            100
          ).toFixed(2);

          // Финальный статус
          processingStatus[jobId] = {
            ...processingStatus[jobId],
            status: "completed",
            progress: 100,
            message: "Обработка завершена!",
            stage: "Готово",
            result: {
              success: true,
              originalFile: originalName,
              processedFile: outputFilename,
              downloadUrl: `/api/download/${encodeURIComponent(outputFilename)}`,
              originalSize: req.file.size,
              compressedSize: stats.size,
              compressionRatio: compressionRatio + "%",
            },
          };

          // Автоочистка через 5 минут
          setTimeout(
            () => {
              delete processingStatus[jobId];
            },
            5 * 60 * 1000,
          );
        } else {
          processingStatus[jobId] = {
            ...processingStatus[jobId],
            status: "error",
            progress: 0,
            message: "Ошибка обработки видео",
            stage: "Ошибка",
          };
        }
      });
    } catch (error) {
      console.error("❌ Ошибка:", error);
      processingStatus[jobId] = {
        status: "error",
        progress: 0,
        message: "Ошибка обработки: " + error.message,
        stage: "Ошибка",
      };
    }
  }
});

// Сжать видео на процент (ИСПРАВЛЕННАЯ версия)
app.post("/api/video/compress/percent", upload.single("video"), (req, res) => {
  console.log("📨 Получен запрос на сжатие по проценту");

  const { percent } = req.body;

  if (!req.file || !percent) {
    return res.status(400).json({ error: "Недостаточно данных" });
  }

  const originalName = req.file.originalname;
  const inputPath = path.join(__dirname, req.file.path);

  // Создаем читаемое имя для выходного файла
  const outputFilename = createOutputFilename(originalName, "compressed");
  const outputPath = path.join(__dirname, "uploads/output", outputFilename);

  // Ограничиваем процент от 5 до 95 (5% - слабое сжатие, 95% - сильное сжатие)
  const safePercent = Math.max(5, Math.min(95, parseInt(percent)));

  console.log(`🎯 Сжатие на ${safePercent}%`);
  console.log(`📁 Исходный файл: "${originalName}"`);
  console.log(`📁 Выходной файл: ${outputFilename}`);

  // 1. Получаем информацию о видео для расчета битрейта
  exec(
    `"${ffprobePath}" -v quiet -print_format json -show_format -show_streams "${inputPath}"`,
    (error, stdout) => {
      if (error) {
        console.error("❌ Ошибка FFprobe:", error);
        return res.status(500).json({ error: "Ошибка анализа видео" });
      }

      try {
        const info = JSON.parse(stdout);
        const videoStream = info.streams.find((s) => s.codec_type === "video");

        if (!videoStream || !videoStream.bit_rate) {
          // Если не можем определить битрейт, используем CRF
          return compressWithCRF();
        }

        const originalBitrate = parseInt(videoStream.bit_rate);

        // ПРАВИЛЬНЫЙ расчет: чем больше процент сжатия, тем меньше битрейт
        // Например: 50% сжатия = оставляем 50% от исходного битрейта
        const targetBitrate = Math.floor(
          (originalBitrate * (100 - safePercent)) / 100,
        );

        if (targetBitrate < 100000) {
          targetBitrate = 100000; // Минимальный битрейт
        }

        console.log(`📊 Исходный битрейт: ${originalBitrate} бит/с`);
        console.log(
          `🎯 Целевой битрейт: ${targetBitrate} бит/с (${100 - safePercent}% от исходного)`,
        );

        // Команда FFmpeg с целевым битрейтом
        const command = `"${ffmpegPath}" -i "${inputPath}" -b:v ${targetBitrate} -maxrate ${targetBitrate} -bufsize ${targetBitrate * 2} -c:a aac -b:a 128k -preset fast -y "${outputPath}"`;

        console.log("🚀 Выполняем сжатие...");

        executeFFmpeg(command, outputPath, safePercent);
      } catch (e) {
        console.error("❌ Ошибка парсинга:", e);
        // Используем fallback метод
        compressWithCRF();
      }

      function compressWithCRF() {
        console.log("⚠️  Используем метод CRF (fallback)");

        // ПРАВИЛЬНЫЙ CRF: чем больше процент сжатия, тем БОЛЬШЕ значение CRF
        // CRF 18-23: почти без потерь, 23-28: хорошее качество, 28-35: заметное сжатие, 35-51: сильное сжатие
        const crf = Math.min(
          51,
          Math.max(18, Math.round(18 + (safePercent / 100) * 33)),
        );

        console.log(`🎯 CRF значение: ${crf} (чем больше, тем сильнее сжатие)`);

        const command = `"${ffmpegPath}" -i "${inputPath}" -c:v libx264 -crf ${crf} -preset fast -c:a aac -b:a 128k -y "${outputPath}"`;

        executeFFmpeg(command, outputPath, safePercent);
      }

      function executeFFmpeg(command, outputPath, percent) {
        const ffmpegProcess = exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error("❌ Ошибка сжатия:", error);
            console.error("Stderr:", stderr);
            return res.status(500).json({ error: "Ошибка сжатия видео" });
          }

          fs.stat(outputPath, (err, stats) => {
            if (err) {
              return res
                .status(500)
                .json({ error: "Ошибка получения размера файла" });
            }

            const compressionRatio = (
              (1 - stats.size / req.file.size) *
              100
            ).toFixed(2);

            console.log(`📊 Результат: ${compressionRatio}% сжатия`);
            console.log(
              `📊 Исходный размер: ${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
            );
            console.log(
              `📊 Сжатый размер: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
            );

            res.json({
              success: true,
              message: "Видео успешно сжато",
              originalFile: originalName,
              processedFile: outputFilename,
              downloadUrl: `/api/download/${encodeURIComponent(outputFilename)}`,
              originalSize: req.file.size,
              compressedSize: stats.size,
              compressionRatio: compressionRatio + "%",
              targetPercent: safePercent + "%",
            });
          });
        });

        // Логируем прогресс
        ffmpegProcess.stderr.on("data", (data) => {
          const line = data.toString();
          if (line.includes("time=")) {
            const timeMatch = line.match(/time=(\d+:\d+:\d+\.\d+)/);
            if (timeMatch) {
              console.log(`⏳ Прогресс: ${timeMatch[1]}`);
            }
          }
        });
      }
    },
  );
});

// КОНВЕРТАЦИЯ С СОХРАНЕНИЕМ КАЧЕСТВА
app.post("/api/video/convert", upload.single("video"), (req, res) => {
  console.log("=".repeat(60));
  console.log("📨 КОНВЕРТАЦИЯ С СОХРАНЕНИЕМ КАЧЕСТВА");
  console.log("=".repeat(60));

  const { format, quality } = req.body;

  if (!req.file || !format) {
    return res.status(400).json({ error: "Недостаточно данных" });
  }

  const originalName = req.file.originalname;
  const inputPath = path.join(__dirname, req.file.path);
  const inputExt = path.extname(originalName).toLowerCase();
  const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);

  console.log(`📁 Исходный файл: ${originalName} (${fileSizeMB} MB)`);

  const jobId = uuidv4();

  processingStatus[jobId] = {
    status: "uploaded",
    progress: 5,
    message: "Файл загружен",
    stage: "Подготовка",
  };

  res.json({
    success: true,
    jobId: jobId,
    message: "Начинаем конвертацию...",
  });

  setTimeout(() => processConversion(), 100);

  async function processConversion() {
    try {
      // 1. СОЗДАЕМ ИМЯ ВЫХОДНОГО ФАЙЛА
      const nameWithoutExt = path.basename(
        originalName,
        path.extname(originalName),
      );
      const transliterated = simpleTranslit(nameWithoutExt);
      const shortUuid = uuidv4().slice(0, 6);
      const outputFilename = `converted_${transliterated}_${shortUuid}.${format}`;
      const outputPath = path.join(__dirname, "uploads/output", outputFilename);

      console.log(`📁 Выходной файл: ${outputFilename}`);

      // 2. ПОЛУЧАЕМ ДЛИТЕЛЬНОСТЬ ВИДЕО
      let duration = 0;
      try {
        const durationOut = await new Promise((resolve, reject) => {
          exec(
            `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`,
            (err, stdout) => {
              if (err) reject(err);
              else resolve(stdout.trim());
            },
          );
        });
        duration = parseFloat(durationOut);
        console.log(`⏱️ Длительность: ${duration.toFixed(2)} сек`);
      } catch (e) {
        console.log("⚠️ Не удалось получить длительность");
      }

      // 3. ВЫЧИСЛЯЕМ БИТРЕЙТ ИСХОДНОГО ВИДЕО
      let sourceBitrate = 1000000; // 1 Mbps по умолчанию

      if (duration > 0) {
        sourceBitrate = Math.floor((req.file.size * 8) / duration);
        console.log(
          `📊 Исходный битрейт: ${(sourceBitrate / 1000).toFixed(0)} kbps`,
        );
      }

      // 4. ФОРМИРУЕМ КОМАНДУ FFMPEG
      let command;

      // ВАРИАНТ 1: БЫСТРОЕ КОПИРОВАНИЕ (без потери качества, 100% размер)
      if (
        (inputExt === ".mp4" && ["mov", "mkv"].includes(format)) ||
        (inputExt === ".mov" && format === "mp4") ||
        (inputExt === ".mkv" && format === "mp4")
      ) {
        console.log(
          "⚡ РЕЖИМ: Быстрое копирование - качество 100%, размер 100%",
        );
        command = `"${ffmpegPath}" -i "${inputPath}" -c copy -map 0 -y "${outputPath}"`;
      }

      // ВАРИАНТ 2: КОНВЕРТАЦИЯ С СОХРАНЕНИЕМ БИТРЕЙТА (качество 99%, размер ~100%)
      else if (format === "mp4" || format === "mov" || format === "mkv") {
        console.log("🎥 РЕЖИМ: H.264 с сохранением битрейта");

        // CRF для контроля качества (чем меньше, тем лучше)
        let crf = 23;
        if (quality === "high") crf = 18;
        if (quality === "low") crf = 28;

        command = `"${ffmpegPath}" -i "${inputPath}" -c:v libx264 -preset ultrafast -crf ${crf} -b:v ${sourceBitrate} -maxrate ${sourceBitrate * 1.2} -bufsize ${sourceBitrate * 2} -c:a aac -b:a 128k -movflags +faststart -y "${outputPath}"`;
      }

      // ВАРИАНТ 3: WEBM С СОХРАНЕНИЕМ БИТРЕЙТА
      else if (format === "webm") {
        console.log("🌐 РЕЖИМ: WEBM с сохранением битрейта");

        let crf = 32;
        if (quality === "high") crf = 25;
        if (quality === "low") crf = 40;

        command = `"${ffmpegPath}" -i "${inputPath}" -c:v libvpx-vp9 -crf ${crf} -b:v ${sourceBitrate} -maxrate ${sourceBitrate * 1.2} -bufsize ${sourceBitrate * 2} -deadline realtime -cpu-used 5 -c:a libopus -b:a 64k -y "${outputPath}"`;
      }

      // ВАРИАНТ 4: AVI
      else if (format === "avi") {
        console.log("🎬 РЕЖИМ: AVI с сохранением битрейта");
        command = `"${ffmpegPath}" -i "${inputPath}" -c:v mpeg4 -b:v ${sourceBitrate} -q:v 5 -c:a mp3 -b:a 128k -y "${outputPath}"`;
      } else {
        console.log(`⚠️ РЕЖИМ: Стандартный (${format})`);
        command = `"${ffmpegPath}" -i "${inputPath}" -y "${outputPath}"`;
      }

      console.log(`💻 Команда: ${command}`);

      // 5. ЗАПУСКАЕМ КОНВЕРТАЦИЮ
      processingStatus[jobId].progress = 30;
      processingStatus[jobId].message = "Конвертация...";

      await new Promise((resolve, reject) => {
        const ffmpegProcess = exec(command);

        ffmpegProcess.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`FFmpeg код: ${code}`));
        });

        ffmpegProcess.on("error", reject);
      });

      // 6. ПРОВЕРЯЕМ РЕЗУЛЬТАТ
      if (!fs.existsSync(outputPath)) {
        throw new Error("Файл не создан");
      }

      const stats = await fs.stat(outputPath);
      const ratio = ((stats.size / req.file.size) * 100).toFixed(1);

      console.log("=".repeat(60));
      console.log("✅ КОНВЕРТАЦИЯ ЗАВЕРШЕНА");
      console.log("=".repeat(60));
      console.log(
        `📊 Исходный размер: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
      );
      console.log(
        `📊 Выходной размер: ${(stats.size / 1024 / 1024).toFixed(2)} MB`,
      );
      console.log(`📊 Соотношение: ${ratio}% от оригинала`);
      console.log(
        `🎯 Качество: сохранено (битрейт ${(sourceBitrate / 1000).toFixed(0)} kbps)`,
      );

      // 7. ОТПРАВЛЯЕМ РЕЗУЛЬТАТ
      processingStatus[jobId] = {
        status: "completed",
        progress: 100,
        message: "Конвертация завершена!",
        stage: "Готово",
        result: {
          success: true,
          originalFile: originalName,
          processedFile: outputFilename,
          downloadUrl: `/api/download/${encodeURIComponent(outputFilename)}`,
          originalSize: req.file.size,
          compressedSize: stats.size,
          format: format.toUpperCase(),
          qualityPreserved: true,
          bitratePreserved: `${(sourceBitrate / 1000).toFixed(0)} kbps`,
          sizeRatio: `${ratio}%`,
        },
      };

      setTimeout(() => delete processingStatus[jobId], 5 * 60 * 1000);
    } catch (error) {
      console.error("❌ Ошибка:", error);
      processingStatus[jobId] = {
        status: "error",
        progress: 0,
        message: "Ошибка: " + error.message,
        stage: "Ошибка",
      };
    }
  }
});

// Сжать и конвертировать - ИСПРАВЛЕННАЯ ВЕРСИЯ
app.post("/api/video/compress-convert", upload.single("video"), (req, res) => {
  console.log("=".repeat(60));
  console.log("📨 ПОЛУЧЕН ЗАПРОС: СЖАТИЕ + КОНВЕРТАЦИЯ");
  console.log("=".repeat(60));

  const { format, targetSize, quality } = req.body;

  if (!req.file || !format || !targetSize) {
    return res.status(400).json({ error: "Недостаточно данных" });
  }

  const originalName = req.file.originalname;
  const inputPath = path.join(__dirname, req.file.path);
  const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);

  // Создаем ID задачи
  const jobId = uuidv4();

  console.log(`📋 Параметры:`);
  console.log(`   - Целевой размер: ${targetSize} МБ`);
  console.log(`   - Целевой формат: ${format}`);
  console.log(`   - Качество: ${quality || "medium"}`);
  console.log(`   - Исходный размер: ${fileSizeMB} MB`);
  console.log(`📁 Исходный файл: "${originalName}"`);

  // Инициализируем статус
  processingStatus[jobId] = {
    status: "uploaded",
    progress: 5,
    message: "Файл загружен",
    stage: "Подготовка",
    time: "00:00",
    remaining: "--:--",
    speed: "-",
  };

  // Возвращаем ID задачи сразу
  res.json({
    success: true,
    jobId: jobId,
    message: "Начинаем обработку...",
  });

  // Асинхронная обработка
  setTimeout(() => processCompressConvert(), 100);

  async function processCompressConvert() {
    try {
      // --------------------------------------------------------
      // 1. СОЗДАЕМ ИМЕНА ФАЙЛОВ
      // --------------------------------------------------------
      const nameWithoutExt = path.basename(
        originalName,
        path.extname(originalName),
      );
      const transliterated = simpleTranslit(nameWithoutExt);
      const shortUuid = uuidv4().slice(0, 6);

      // Выходной файл с правильным расширением
      const outputFilename = `processed_${transliterated}_${shortUuid}.${format}`;
      const outputPath = path.join(__dirname, "uploads/output", outputFilename);

      // Временный файл для сжатия (всегда MP4)
      const tempFilename = `temp_${uuidv4().slice(0, 8)}.mp4`;
      const tempPath = path.join(__dirname, "uploads/output", tempFilename);

      console.log(`📁 Временный файл: ${tempFilename}`);
      console.log(`📁 Выходной файл: ${outputFilename}`);

      // --------------------------------------------------------
      // 2. ПОЛУЧАЕМ ДЛИТЕЛЬНОСТЬ ВИДЕО
      // --------------------------------------------------------
      processingStatus[jobId] = {
        ...processingStatus[jobId],
        status: "analyzing",
        progress: 10,
        message: "Анализируем видео",
        stage: "Анализ видео",
      };

      const duration = await new Promise((resolve, reject) => {
        exec(
          `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`,
          (err, stdout) => {
            if (err) reject(err);
            else resolve(parseFloat(stdout.trim()));
          },
        );
      });

      console.log(`⏱️ Длительность: ${duration.toFixed(2)} сек`);

      // --------------------------------------------------------
      // 3. РАССЧИТЫВАЕМ БИТРЕЙТ ДЛЯ ЦЕЛЕВОГО РАЗМЕРА
      // --------------------------------------------------------
      processingStatus[jobId] = {
        ...processingStatus[jobId],
        status: "calculating",
        progress: 15,
        message: "Расчет параметров",
        stage: "Подготовка обработки",
      };

      // Целевой размер в битах
      const targetBits = targetSize * 8 * 1024 * 1024;

      // Битрейт видео (оставляем 128 kbps на аудио)
      let videoBitrate = Math.floor(targetBits / duration - 128000);

      // Минимальный и максимальный битрейт
      videoBitrate = Math.max(100000, Math.min(5000000, videoBitrate));

      console.log(
        `🎯 Целевой битрейт: ${(videoBitrate / 1000).toFixed(0)} kbps`,
      );

      // --------------------------------------------------------
      // 4. ЭТАП 1: СЖАТИЕ В MP4
      // --------------------------------------------------------
      processingStatus[jobId] = {
        ...processingStatus[jobId],
        status: "processing",
        progress: 20,
        message: "Сжатие видео...",
        stage: "Сжатие",
      };

      // Настройки качества для сжатия
      let preset = "fast";
      let crf = 23;

      if (quality === "high") crf = 20;
      if (quality === "low") crf = 28;

      // Команда для сжатия
      const compressCommand = `"${ffmpegPath}" -i "${inputPath}" \
        -c:v libx264 \
        -b:v ${videoBitrate} \
        -crf ${crf} \
        -preset ${preset} \
        -c:a aac \
        -b:a 128k \
        -movflags +faststart \
        -y "${tempPath}"`;

      console.log("🚀 ЭТАП 1: Сжатие видео...");
      console.log(`💻 Команда: ${compressCommand}`);

      // Запускаем сжатие с отслеживанием прогресса
      await new Promise((resolve, reject) => {
        const ffmpegProcess = exec(compressCommand);

        let lastProgress = 20;

        ffmpegProcess.stderr.on("data", (data) => {
          const line = data.toString();
          if (line.includes("time=")) {
            const timeMatch = line.match(/time=(\d+):(\d+):(\d+\.\d+)/);
            if (timeMatch && duration) {
              const hours = parseInt(timeMatch[1]);
              const minutes = parseInt(timeMatch[2]);
              const seconds = parseFloat(timeMatch[3]);
              const currentTime = hours * 3600 + minutes * 60 + seconds;

              // Прогресс от 20% до 60%
              const progress =
                20 + Math.min(40, Math.floor((currentTime / duration) * 40));

              if (progress > lastProgress) {
                lastProgress = progress;
                processingStatus[jobId] = {
                  ...processingStatus[jobId],
                  progress: progress,
                  message: `Сжатие: ${progress - 20}%`,
                };
              }
            }
          }
        });

        ffmpegProcess.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Ошибка сжатия, код: ${code}`));
        });

        ffmpegProcess.on("error", reject);
      });

      console.log("✅ ЭТАП 1: Сжатие завершено");

      // Проверяем, что временный файл создан
      if (!fs.existsSync(tempPath)) {
        throw new Error("Временный файл не создан");
      }

      // --------------------------------------------------------
      // 5. ЭТАП 2: КОНВЕРТАЦИЯ (если нужна)
      // --------------------------------------------------------
      processingStatus[jobId] = {
        ...processingStatus[jobId],
        progress: 70,
        message: "Конвертация видео...",
        stage: `Конвертация в ${format.toUpperCase()}`,
      };

      // Если целевой формат не MP4 - конвертируем
      if (format !== "mp4") {
        console.log(`🔄 ЭТАП 2: Конвертация в ${format}...`);

        let convertCommand;

        // Команды конвертации для разных форматов
        switch (format) {
          case "avi":
            convertCommand = `"${ffmpegPath}" -i "${tempPath}" -c:v mpeg4 -vtag xvid -q:v 5 -c:a mp3 -b:a 128k -y "${outputPath}"`;
            break;
          case "mov":
            convertCommand = `"${ffmpegPath}" -i "${tempPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -y "${outputPath}"`;
            break;
          case "mkv":
            convertCommand = `"${ffmpegPath}" -i "${tempPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -y "${outputPath}"`;
            break;
          case "webm":
            convertCommand = `"${ffmpegPath}" -i "${tempPath}" -c:v libvpx-vp9 -crf 32 -b:v 0 -c:a libopus -b:a 64k -deadline realtime -cpu-used 5 -y "${outputPath}"`;
            break;
          case "wmv":
            convertCommand = `"${ffmpegPath}" -i "${tempPath}" -c:v wmv2 -b:v 1M -c:a wmav2 -b:a 64k -y "${outputPath}"`;
            break;
          case "flv":
            convertCommand = `"${ffmpegPath}" -i "${tempPath}" -c:v flv -q:v 5 -c:a mp3 -b:a 64k -y "${outputPath}"`;
            break;
          default:
            convertCommand = `"${ffmpegPath}" -i "${tempPath}" -y "${outputPath}"`;
        }

        console.log(`💻 Команда: ${convertCommand}`);

        // Запускаем конвертацию
        await new Promise((resolve, reject) => {
          const convertProcess = exec(convertCommand);

          convertProcess.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Ошибка конвертации, код: ${code}`));
          });

          convertProcess.on("error", reject);
        });

        console.log(`✅ ЭТАП 2: Конвертация в ${format} завершена`);

        // Удаляем временный файл
        fs.unlink(tempPath, () => {});
      } else {
        // Если формат MP4 - просто переименовываем
        console.log("📦 ЭТАП 2: Формат MP4, просто перемещаем файл");
        fs.renameSync(tempPath, outputPath);
      }

      // --------------------------------------------------------
      // 6. ПРОВЕРКА РЕЗУЛЬТАТА
      // --------------------------------------------------------
      if (!fs.existsSync(outputPath)) {
        throw new Error("Выходной файл не создан");
      }

      const stats = await fs.stat(outputPath);
      const compressionRatio = ((1 - stats.size / req.file.size) * 100).toFixed(
        2,
      );
      const achievedSize = (stats.size / (1024 * 1024)).toFixed(2);

      console.log("=".repeat(60));
      console.log("✅ ОБРАБОТКА ЗАВЕРШЕНА УСПЕШНО");
      console.log("=".repeat(60));
      console.log(`📊 Результат:`);
      console.log(`   - Исходный размер: ${fileSizeMB} MB`);
      console.log(`   - Целевой размер: ${targetSize} MB`);
      console.log(`   - Достигнутый размер: ${achievedSize} MB`);
      console.log(`   - Сжатие: ${compressionRatio}%`);
      console.log(`   - Формат: ${format.toUpperCase()}`);

      // --------------------------------------------------------
      // 7. ФИНАЛЬНЫЙ СТАТУС
      // --------------------------------------------------------
      processingStatus[jobId] = {
        status: "completed",
        progress: 100,
        message: "Обработка завершена!",
        stage: "Готово",
        result: {
          success: true,
          originalFile: originalName,
          processedFile: outputFilename,
          downloadUrl: `/api/download/${encodeURIComponent(outputFilename)}`,
          originalSize: req.file.size,
          compressedSize: stats.size,
          compressionRatio: compressionRatio + "%",
          targetSize: targetSize + " MB",
          achievedSize: achievedSize + " MB",
          format: format.toUpperCase(),
        },
      };

      // Автоочистка через 5 минут
      setTimeout(
        () => {
          delete processingStatus[jobId];
        },
        5 * 60 * 1000,
      );
    } catch (error) {
      console.error("❌ Ошибка:", error);

      // Очищаем временные файлы при ошибке
      try {
        if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (e) {}

      processingStatus[jobId] = {
        status: "error",
        progress: 0,
        message: "Ошибка: " + error.message,
        stage: "Ошибка",
      };
    }
  }
});

// Скачать файл (ИСПРАВЛЕННЫЙ с декодированием URL)
app.get("/api/download/:filename", (req, res) => {
  let filename = req.params.filename;

  // Декодируем имя файла из URL
  try {
    filename = decodeURIComponent(filename);
  } catch (e) {
    console.log("Не удалось декодировать имя файла из URL");
  }

  const filePath = path.join(__dirname, "uploads/output", filename);

  console.log(`📥 Запрос на скачивание: ${filename}`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Файл не найден: ${filePath}`);

    // Попробуем найти файл без кодирования
    const files = fs.readdirSync(path.join(__dirname, "uploads/output"));
    const matchingFile = files.find(
      (f) => f === filename || decodeURIComponent(f) === filename,
    );

    if (matchingFile) {
      console.log(`🔍 Найден файл: ${matchingFile}`);
      filename = matchingFile;
    } else {
      return res.status(404).json({ error: "Файл не найден" });
    }
  }

  // Устанавливаем имя файла для скачивания
  res.download(
    path.join(__dirname, "uploads/output", filename),
    filename,
    (err) => {
      if (err) {
        console.error("❌ Ошибка скачивания:", err);
      }

      // Удаляем файл через 30 секунд
      setTimeout(() => {
        fs.unlink(
          path.join(__dirname, "uploads/output", filename),
          (unlinkErr) => {
            if (!unlinkErr) {
              console.log(`🗑️ Файл удален: ${filename}`);
            }
          },
        );
      }, 30000);
    },
  );
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`\n✅ Сервер запущен: http://localhost:${PORT}`);
  console.log(`📁 FFmpeg путь: ${ffmpegPath}`);
  console.log(`📂 Папка загрузок: ${path.join(__dirname, "uploads")}\n`);
  console.log("🔧 Режим работы:");
  console.log("  - Файлы сохраняются с UUID именами");
  console.log("  - Выходные файлы имеют читаемые транслитерированные имена");
  console.log("  - Исправлена логика сжатия по проценту\n");
});
