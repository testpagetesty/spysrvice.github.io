package com.spyservice.mobile.service

import android.content.Context
import android.provider.MediaStore
import android.content.ContentUris
import android.os.Build
import android.net.Uri
import android.database.Cursor
import com.spyservice.mobile.data.model.CapturedCreative
import com.spyservice.mobile.data.model.CaptureResult
import com.spyservice.mobile.utils.InAppLogger
import com.spyservice.mobile.utils.Logger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume
import java.io.File

/**
 * Сервис для автоматического захвата креативов
 * Упрощенная версия - только получение URL и передача настроек
 */
class CreativeCaptureService(
    private val context: Context,
    private val accessibilityService: CreativeAccessibilityService? = null,
    private val activity: android.app.Activity? = null // Для открытия файлового менеджера
) {
    
    companion object {
        private const val TAG = "CreativeCaptureService"
        const val REQUEST_CODE_FILE_PICKER = 1001
    }
    
    /**
     * Основной метод захвата креатива
     * Упрощенная версия - только URL и настройки приложения
     */
    suspend fun captureCreative(): CaptureResult = withContext(Dispatchers.IO) {
        try {
            // Получаем URL из браузера
            val currentUrl = getCurrentUrl()
            if (currentUrl.isNullOrEmpty()) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Не удалось извлечь URL из браузера")
                return@withContext CaptureResult.Error("Cannot get current URL from browser. Make sure you are on a web page and Accessibility Service is enabled.")
            }
            
            // Экспорт страницы через встроенную функцию Chrome
            val pageArchive = savePageUsingChrome(currentUrl)
            
            // Создаем минимальный объект CapturedCreative только с URL и архивом
            val capturedCreative = CapturedCreative(
                landingUrl = currentUrl,
                title = null,
                description = null,
                sourceLink = null,
                landingImageFile = null,
                fullScreenshotFile = null,
                thumbnailFile = null,
                pageArchiveFile = pageArchive,
                capturedAt = System.currentTimeMillis()
            )
            
            if (pageArchive == null) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Не удалось сохранить страницу через Chrome")
                return@withContext CaptureResult.Error("Failed to save page archive through Chrome")
            }
            
            InAppLogger.success(Logger.Tags.SERVICE, "✅ Страница успешно сохранена: ${pageArchive.name} (${pageArchive.length()} bytes)")
            InAppLogger.d(Logger.Tags.SERVICE, "📦 Создаем CapturedCreative с архивом: ${pageArchive.absolutePath}")
            InAppLogger.d(Logger.Tags.SERVICE, "✅ CapturedCreative создан: landingUrl=${capturedCreative.landingUrl}, pageArchiveFile=${capturedCreative.pageArchiveFile?.name}")
            
            CaptureResult.Success(capturedCreative)
            
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка захвата креатива: ${e.message}", e)
            CaptureResult.Error("Capture failed: ${e.message}", e)
        }
    }
    
    /**
     * Получить текущий URL из браузера с улучшенной обработкой ошибок
     */
    private suspend fun getCurrentUrl(): String? {
        try {
            if (accessibilityService == null) {
                return null
            }
            
            delay(500)
            val rawUrl = accessibilityService?.getCurrentUrl()
            
            if (rawUrl.isNullOrEmpty()) {
                delay(500)
                val retryUrl = accessibilityService?.getCurrentUrl()
                if (retryUrl.isNullOrEmpty()) {
                    return null
                }
                return fixUrl(retryUrl)
            }
            
            return fixUrl(rawUrl)
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка при извлечении URL: ${e.message}", e)
            return null
        }
    }
    
    /**
     * Исправить неполный URL
     */
    private fun fixUrl(rawUrl: String): String? {
        try {
            // Очистить URL от лишних пробелов и символов
            var cleanUrl = rawUrl.trim()
            
            // Если URL уже полный
            if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
                return cleanUrl
            }

            // Убираем возможные префиксы поиска или адресной строки
            cleanUrl = cleanUrl.removePrefix("Search or type web address")
                              .removePrefix("Поиск или веб-адрес")
                              .trim()

            // Если URL начинается с www
            if (cleanUrl.startsWith("www.")) {
                return "https://$cleanUrl"
            }

            // Если это мобильная версия (mobile.site.com, m.site.com)
            if (cleanUrl.startsWith("mobile.") || cleanUrl.startsWith("m.")) {
                return "https://$cleanUrl"
            }

            // Если это поддомен (subdomain.site.com)
            if (cleanUrl.matches(Regex("^[a-zA-Z0-9-]+\\.[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}.*"))) {
                return "https://$cleanUrl"
            }

            // Если это просто домен с путем (site.com/page, site.com/path/to/page)
            if (cleanUrl.matches(Regex("^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/.*)?$"))) {
                return "https://$cleanUrl"
            }

            // Если это домен с портом (site.com:8080)
            if (cleanUrl.matches(Regex("^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}:[0-9]+(/.*)?$"))) {
                return "https://$cleanUrl"
            }

            // Если это IP адрес (192.168.1.1 или 192.168.1.1/path)
            if (cleanUrl.matches(Regex("^[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}(:[0-9]+)?(/.*)?$"))) {
                return "http://$cleanUrl" // Для IP используем http по умолчанию
            }

            // Если это localhost или локальный домен
            if (cleanUrl.startsWith("localhost") || cleanUrl.endsWith(".local")) {
                return "http://$cleanUrl"
            }

            // Если URL содержит домен без схемы (общий случай)
            if (cleanUrl.contains(".") && !cleanUrl.contains(" ") && cleanUrl.length > 3) {
                return "https://$cleanUrl"
            }

            return null

        } catch (e: Exception) {
            return null
        }
    }
    
    /**
     * Сохранить страницу используя встроенную функцию Chrome "Скачать страницу"
     * Chrome уже видит правильную страницу через прокси, поэтому используем его функцию сохранения
     * Ожидает завершения скачивания перед возвратом файла
     */
    private suspend fun savePageUsingChrome(url: String): File? {
        return try {
            if (accessibilityService == null) {
            return null
        }
        
            // Время перед началом сохранения (для фильтрации старых файлов)
            val beforeSaveTime = System.currentTimeMillis()
            
            // Запускаем детектор файлов ДО активации сохранения
            val fileDetector = ChromePageFileDetector(context)
            InAppLogger.d(Logger.Tags.SERVICE, "🔍 Запускаем детектор файлов Chrome...")
            
            // Запускаем поиск файла в фоне с использованием coroutineScope
            var savedFile = coroutineScope {
                val searchJob = async(Dispatchers.IO) {
                    // Уменьшаем таймаут до 20 секунд (10 попыток × 2 секунды)
                    fileDetector.findChromeSavedPageFile(beforeSaveTime, 20000)
                }
                
                // Даем время на запуск детектора
                delay(1000)
                
                // Активируем функцию "Скачать страницу" в Chrome
                InAppLogger.d(Logger.Tags.SERVICE, "📥 Активируем функцию 'Скачать страницу' в Chrome...")
                val success = accessibilityService.savePageInChrome()
                if (!success) {
                    InAppLogger.e(Logger.Tags.SERVICE, "❌ Не удалось активировать функцию 'Скачать страницу' в Chrome")
                    return@coroutineScope null
                }
                
                // Ждем начала сохранения страницы (Chrome сохраняет в папку Downloads)
                delay(2000)
                
                // Ждем результат поиска файла
                searchJob.await()
            }
            
            // Если файл не найден автоматически, открываем файловый менеджер для ручного выбора
            if (savedFile == null) {
                InAppLogger.w(Logger.Tags.SERVICE, "⚠️ Файл не найден автоматически. Открываем файловый менеджер для ручного выбора...")
                try {
                    savedFile = openFilePickerForManualSelection()
                    if (savedFile == null) {
                        InAppLogger.e(Logger.Tags.SERVICE, "❌ Файл не выбран пользователем или корутина была отменена")
                        return null
                    }
                    InAppLogger.success(Logger.Tags.SERVICE, "✅ Файл успешно выбран пользователем: ${savedFile.name}")
                } catch (e: kotlinx.coroutines.CancellationException) {
                    InAppLogger.e(Logger.Tags.SERVICE, "❌ Корутина отменена во время ожидания выбора файла: ${e.message}")
                    return null
                } catch (e: Exception) {
                    InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка при выборе файла: ${e.message}", e)
                    return null
                }
            }
            
            // Проверяем что файл действительно существует и не пустой
            if (!savedFile.exists()) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Файл не существует: ${savedFile.absolutePath}")
                return null
            }
            
            val fileSize = savedFile.length()
            if (fileSize == 0L) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Файл пустой: ${savedFile.absolutePath}")
                return null
            }
            
            InAppLogger.success(Logger.Tags.SERVICE, "✅ Файл найден: ${savedFile.name}, размер: $fileSize bytes, путь: ${savedFile.absolutePath}")
            
            // Обрабатываем и копируем файл в нашу папку для архива
            val archiveDir = context.getExternalFilesDir("captures")
            if (archiveDir == null) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Не удалось получить папку для архива")
                return savedFile
            }
            
            archiveDir.mkdirs()
            if (!archiveDir.exists()) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Не удалось создать папку для архива: ${archiveDir.absolutePath}")
                return savedFile
            }
            
            // Генерируем имя файла на основе URL и времени
            val timestamp = System.currentTimeMillis()
            val domain = try {
                val urlPart = url.substringAfter("://").substringBefore("/").substringBefore("?")
                urlPart.replace(".", "_").replace("-", "_").take(50) // Ограничиваем длину
            } catch (e: Exception) {
                "page"
            }
            
            // Определяем расширение файла на основе исходного файла
            val originalExtension = savedFile.extension.ifEmpty { "mhtml" }
            val archiveFileName = "${domain}_${timestamp}.${originalExtension}"
            val archiveFile = File(archiveDir, archiveFileName)
            
            try {
                // Копируем файл
                savedFile.copyTo(archiveFile, overwrite = true)
                
                // Проверяем что файл скопирован успешно
                if (!archiveFile.exists() || archiveFile.length() != fileSize) {
                    InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка копирования: файл не скопирован корректно")
                    return savedFile
                }
                
                InAppLogger.success(Logger.Tags.SERVICE, "✅ Архив создан: ${archiveFile.name}, размер: ${archiveFile.length()} bytes, путь: ${archiveFile.absolutePath}")
                return archiveFile
            } catch (e: Exception) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка копирования файла: ${e.message}", e)
                // Возвращаем оригинальный файл если копирование не удалось
                return savedFile
            }
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка сохранения страницы через Chrome: ${e.message}", e)
            null
        }
    }
    
    /**
     * Получить список скачанных файлов через MediaStore и прямой доступ к папке
     * Работает на всех версиях Android, включая Android 10+
     */
    private fun getDownloadedFiles(minTime: Long): List<File> {
        val files = mutableSetOf<File>()
        
        // Метод 1: Поиск через MediaStore
        try {
            val contentResolver = context.contentResolver
            
            // Пробуем разные URI для разных версий Android
            val uris = mutableListOf<Uri>()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                uris.add(MediaStore.Downloads.EXTERNAL_CONTENT_URI)
            }
            uris.add(MediaStore.Files.getContentUri("external"))
            
            for (uri in uris) {
                try {
                    val projection = arrayOf(
                        MediaStore.Downloads._ID,
                        MediaStore.Downloads.DISPLAY_NAME,
                        MediaStore.Downloads.DATE_MODIFIED,
                        MediaStore.Downloads.SIZE,
                        MediaStore.Downloads.DATA,
                        MediaStore.Downloads.RELATIVE_PATH
                    )
                    
                    val selection = "${MediaStore.Downloads.DATE_MODIFIED} >= ?"
                    val selectionArgs = arrayOf((minTime / 1000).toString()) // MediaStore использует секунды
                    val sortOrder = "${MediaStore.Downloads.DATE_MODIFIED} DESC"
                    
                    val cursor: Cursor? = contentResolver.query(
                        uri,
                        projection,
                        selection,
                        selectionArgs,
                        sortOrder
                    )
                    
                    cursor?.use {
                        val idColumn = it.getColumnIndexOrThrow(MediaStore.Downloads._ID)
                        val nameColumn = it.getColumnIndexOrThrow(MediaStore.Downloads.DISPLAY_NAME)
                        val dataColumn = it.getColumnIndexOrThrow(MediaStore.Downloads.DATA)
                        val relativePathColumn = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            it.getColumnIndex(MediaStore.Downloads.RELATIVE_PATH)
                        } else {
                            -1
                        }
                        
                        while (it.moveToNext()) {
                            try {
                                val id = it.getLong(idColumn)
                                val name = it.getString(nameColumn)
                                var data = if (dataColumn >= 0) it.getString(dataColumn) else null
                                
                                // Для Android 10+ может не быть DATA, используем RELATIVE_PATH
                                if (data == null && relativePathColumn >= 0 && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                    val relativePath = it.getString(relativePathColumn)
                                    if (relativePath != null) {
                                        val downloadsDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS)
                                        data = File(downloadsDir, relativePath).absolutePath
                                    }
                                }
                                
                                if (data != null) {
                                    val file = File(data)
                                    if (file.exists() && file.isFile) {
                                        files.add(file)
                                    }
                                }
                            } catch (e: Exception) {
                                // Пропускаем проблемные записи
                                continue
                            }
                        }
                    }
                } catch (e: Exception) {
                    InAppLogger.d(Logger.Tags.SERVICE, "⚠️ Ошибка при запросе MediaStore URI $uri: ${e.message}")
                }
            }
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка при получении списка скачанных файлов через MediaStore: ${e.message}", e)
        }
        
        // Метод 2: Прямой доступ к папке Downloads (для старых версий Android или как резерв)
        try {
            val downloadsDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS)
            if (downloadsDir.exists() && downloadsDir.canRead()) {
                val dirFiles = downloadsDir.listFiles()?.filter { 
                    it.isFile && it.lastModified() >= minTime 
                } ?: emptyList()
                
                files.addAll(dirFiles)
                InAppLogger.d(Logger.Tags.SERVICE, "📁 Найдено файлов через прямой доступ: ${dirFiles.size}")
            }
        } catch (e: Exception) {
            InAppLogger.d(Logger.Tags.SERVICE, "⚠️ Ошибка при прямом доступе к папке Downloads: ${e.message}")
        }
        
        // Метод 3: Проверка внутренней папки Downloads приложения (если Chrome сохраняет туда)
        try {
            val appDownloadsDir = File(context.getExternalFilesDir(null), "Downloads")
            if (appDownloadsDir.exists()) {
                val appFiles = appDownloadsDir.listFiles()?.filter { 
                    it.isFile && it.lastModified() >= minTime 
                } ?: emptyList()
                files.addAll(appFiles)
                InAppLogger.d(Logger.Tags.SERVICE, "📁 Найдено файлов в папке приложения: ${appFiles.size}")
            }
        } catch (e: Exception) {
            // Игнорируем ошибки
        }
        
        InAppLogger.d(Logger.Tags.SERVICE, "📋 Всего найдено файлов: ${files.size}")
        return files.toList()
    }
    
    /**
     * Открыть файловый менеджер для ручного выбора файла страницы
     * Используется если автоматический поиск не нашел файл
     * Открывает файловый менеджер Samsung с папкой Downloads и ЖДЕТ выбора файла
     */
    private suspend fun openFilePickerForManualSelection(): File? {
        return try {
            if (activity == null) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Activity не доступна для открытия файлового менеджера")
                return null
            }
            
            InAppLogger.d(Logger.Tags.SERVICE, "📁 Открываем файловый менеджер Samsung для выбора файла...")
            
            // Используем suspendCancellableCoroutine для ожидания результата выбора файла
            kotlinx.coroutines.suspendCancellableCoroutine { continuation ->
                // Сохраняем continuation для использования в Activity
                filePickerContinuation = continuation
                
                // Обработчик отмены корутины
                continuation.invokeOnCancellation {
                    InAppLogger.w(Logger.Tags.SERVICE, "⚠️ Корутина отменена до выбора файла")
                    filePickerContinuation = null
                }
                
                // Создаем Intent для открытия файлового менеджера Samsung
                val intent = FilePickerHelper.createSamsungDownloadsIntent(context)
                
                try {
                    // Используем startActivityForResult для получения результата
                    // ВАЖНО: continuation будет вызван в handleFilePickerResult когда пользователь выберет файл
                    activity.startActivityForResult(intent, REQUEST_CODE_FILE_PICKER)
                    InAppLogger.d(Logger.Tags.SERVICE, "📁 Файловый менеджер открыт. Ожидаем выбор файла...")
                    InAppLogger.d(Logger.Tags.SERVICE, "⏳ Программа ждет выбора файла пользователем...")
                    InAppLogger.d(Logger.Tags.SERVICE, "⏳ Continuation сохранен, корутина приостановлена до выбора файла")
                    
                    // Continuation будет вызван в handleFilePickerResult() когда пользователь выберет файл
                    // НЕ вызываем continuation здесь - ждем результата из Activity
                } catch (e: Exception) {
                    InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка открытия файлового менеджера: ${e.message}", e)
                    filePickerContinuation = null
                    continuation.resume(null)
                }
            }
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка при открытии файлового менеджера: ${e.message}", e)
            null
        }
    }
    
    // Continuation для ожидания результата выбора файла
    private var filePickerContinuation: kotlin.coroutines.Continuation<File?>? = null
    
    /**
     * Обработать результат выбора файла из файлового менеджера
     * Должен вызываться из Activity в onActivityResult
     */
    fun handleFilePickerResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        if (requestCode == REQUEST_CODE_FILE_PICKER) {
            val continuation = filePickerContinuation
            filePickerContinuation = null
            
            if (continuation == null) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Continuation не найден - корутина уже завершена или отменена")
                return
            }
            
            if (resultCode == android.app.Activity.RESULT_OK && data != null) {
                val uri = data.data
                if (uri != null) {
                    InAppLogger.d(Logger.Tags.SERVICE, "📁 Получен URI выбранного файла: $uri")
                    val file = FilePickerHelper.getFileFromUri(context, uri)
                    if (file != null && file.exists() && file.length() > 0) {
                        InAppLogger.success(Logger.Tags.SERVICE, "✅ Файл выбран пользователем: ${file.name} (${file.length()} bytes)")
                        InAppLogger.d(Logger.Tags.SERVICE, "📤 Возобновляем корутину с выбранным файлом...")
                        try {
                            continuation.resume(file)
                        } catch (e: Exception) {
                            InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка возобновления корутины: ${e.message}", e)
                        }
                    } else {
                        InAppLogger.e(Logger.Tags.SERVICE, "❌ Выбранный файл недоступен или пустой")
                        try {
                            continuation.resume(null)
                        } catch (e: Exception) {
                            InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка возобновления корутины: ${e.message}", e)
                        }
                    }
                } else {
                    InAppLogger.e(Logger.Tags.SERVICE, "❌ Файл не выбран (URI null)")
                    try {
                        continuation.resume(null)
                    } catch (e: Exception) {
                        InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка возобновления корутины: ${e.message}", e)
                    }
                }
            } else {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Пользователь отменил выбор файла (resultCode: $resultCode)")
                try {
                    continuation.resume(null)
                } catch (e: Exception) {
                    InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка возобновления корутины: ${e.message}", e)
                }
            }
        }
    }
    
}
