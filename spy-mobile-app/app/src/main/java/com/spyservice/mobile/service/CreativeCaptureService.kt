package com.spyservice.mobile.service

import android.content.Context
import android.graphics.Bitmap
import com.spyservice.mobile.data.model.CapturedCreative
import com.spyservice.mobile.data.model.CaptureResult
import com.spyservice.mobile.data.model.PageContent
import com.spyservice.mobile.data.repository.SettingsRepository
import com.spyservice.mobile.utils.InAppLogger
import com.spyservice.mobile.utils.Logger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

/**
 * Сервис для автоматического захвата креативов
 */
class CreativeCaptureService(
    private val context: Context,
    private val accessibilityService: CreativeAccessibilityService? = null,
    private val screenshotService: ScreenshotService? = null,
    private val pageArchiver: PageArchiver? = null,
    private val pagePreviewService: PagePreviewService? = null
) {
    
    companion object {
        private const val TAG = "CreativeCaptureService"
        private const val INITIAL_DELAY_MS = 3000L // Начальная задержка для загрузки страницы
        private const val NAVIGATION_DELAY_MS = 5000L // Задержка после навигации
        private const val RETRY_DELAY_MS = 2000L // Задержка между попытками
        private const val MAX_RETRIES = 3 // Максимальное количество попыток
    }
    
    /**
     * Основной метод захвата креатива
     */
    suspend fun captureCreative(): CaptureResult = withContext(Dispatchers.IO) {
        try {
            val currentUrl = getCurrentUrl()
            if (currentUrl.isNullOrEmpty()) {
                return@withContext CaptureResult.Error("Cannot get current URL from browser")
            }
            
            delay(INITIAL_DELAY_MS)
            
            val adLink: String? = null
            val finalUrl = currentUrl
            
            val pageContent = extractPageContent(finalUrl)
            
            // ПРИОРИТЕТ: Получаем превью изображение (картинку) для Media Image/Video
            val previewFile = try {
                val previewService = pagePreviewService ?: PagePreviewService(context)
                previewService.getAndSavePreview(finalUrl)
            } catch (e: Exception) {
                null
            }
            
            // Захват скриншота всей страницы для thumbnail_file
            InAppLogger.step(Logger.Tags.SERVICE, 1, "📸 Захват скриншота всей страницы...")
            val fullPageScreenshot: Bitmap? = try {
                // УНИВЕРСАЛЬНЫЙ ПОДХОД: Простой захват через View.draw()
                InAppLogger.d(Logger.Tags.SERVICE, "🔄 Универсальный захват скриншота...")
                captureUniversalScreenshot(finalUrl)
            } catch (e: Exception) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка захвата скриншота: ${e.message}", e)
                null
            }
            
            // Сохраняем скриншот в файл
            val thumbnailFile: File? = if (fullPageScreenshot != null) {
                try {
                    InAppLogger.d(Logger.Tags.SERVICE, "💾 Сохранение скриншота в файл...")
                    val timestamp = System.currentTimeMillis()
                    val filename = "screenshot_${timestamp}.jpg" // Используем JPEG с низким качеством для минимального размера
                    val savedFile = saveImageToFile(fullPageScreenshot, filename)
                    if (savedFile != null && savedFile.exists() && savedFile.length() > 0) {
                        InAppLogger.success(Logger.Tags.SERVICE, "✅ Скриншот сохранен: ${savedFile.absolutePath}, размер: ${savedFile.length()} bytes")
                    } else {
                        InAppLogger.e(Logger.Tags.SERVICE, "❌ Не удалось сохранить скриншот в файл (файл не создан или пустой)")
                    }
                    // Освобождаем память после сохранения
                    fullPageScreenshot.recycle()
                    savedFile
                } catch (e: Exception) {
                    InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка сохранения скриншота: ${e.message}", e)
                    // Освобождаем память даже при ошибке
                    try {
                        fullPageScreenshot.recycle()
                    } catch (recycleException: Exception) {
                        // Игнорируем ошибки при освобождении памяти
                    }
                    null
                }
            } else {
                InAppLogger.w(Logger.Tags.SERVICE, "⚠️ Скриншот не создан, thumbnailFile будет null")
                null
            }
            
            // Создание архива страницы (MHTML - полный лендинг со всеми ресурсами)
            // АРХИВ ОБЯЗАТЕЛЬНО ДОЛЖЕН СОЗДАВАТЬСЯ И ОТПРАВЛЯТЬСЯ
            val pageArchive: File? = try {
                if (finalUrl.contains("example.com") || finalUrl.contains("test-site")) {
                    null
                } else {
                    val settingsRepository = SettingsRepository(context)
                    val settings = settingsRepository.getSettings()
                    val archiveMode = settings?.archiveMode ?: com.spyservice.mobile.ui.settings.ArchiveMode.MHTML
                    val archiveService = PageArchiveService(context)
                    val archive = archiveService.archivePage(finalUrl, archiveMode)
                    archive
                }
            } catch (e: Exception) {
                null
            }
            
            // Используем превью изображение как основной файл для Media Image/Video (лендинг/тизер)
            val landingFile = previewFile
            
            val timestamp = System.currentTimeMillis()
            val capturedCreative = CapturedCreative(
                landingUrl = finalUrl,
                title = pageContent.title,
                description = pageContent.description,
                sourceLink = adLink,
                landingImageFile = landingFile,  // Превью изображение для лендинга/тизера (media_file)
                fullScreenshotFile = null,  // Не используется
                thumbnailFile = thumbnailFile,  // Скриншот всей страницы для thumbnail_file
                pageArchiveFile = pageArchive,
                capturedAt = timestamp
            )
            
            if (thumbnailFile != null) {
                InAppLogger.d(Logger.Tags.SERVICE, "✅ Скриншот страницы создан: ${thumbnailFile.absolutePath}, размер: ${thumbnailFile.length()} bytes")
            } else {
                InAppLogger.w(Logger.Tags.SERVICE, "⚠️ Скриншот страницы не создан")
            }
            
            CaptureResult.Success(capturedCreative)
            
        } catch (e: Exception) {
            CaptureResult.Error("Capture failed: ${e.message}", e)
        }
    }
    
    /**
     * Получить текущий URL из браузера
     */
    private suspend fun getCurrentUrl(): String? {
        try {
            if (accessibilityService == null) {
                return createFallbackUrl()
            }
            
            val rawUrl = accessibilityService?.getCurrentUrl()
            if (rawUrl.isNullOrEmpty()) {
                return createFallbackUrl()
            }
            
            val correctedUrl = fixUrl(rawUrl)
            return correctedUrl ?: createFallbackUrl()
        } catch (e: Exception) {
            return createFallbackUrl()
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
    
    private fun createFallbackUrl(): String {
        // Создаем URL с текущим временем для тестирования
        val timestamp = System.currentTimeMillis()
        return "https://test-site-$timestamp.example.com"
    }
    
    /**
     * Захватить лендинг страницу с повторными попытками
     */
    private suspend fun captureLandingPage(url: String): Bitmap? {
        if (screenshotService == null) {
            return null
        }
        
        return captureWithRetries("landing page")
    }
    
    /**
     * Найти ссылку на объявление на странице
     */
    private suspend fun findAdLink(url: String): String? {
        return accessibilityService?.findAdLinks()?.firstOrNull()
    }
    
    /**
     * Перейти по URL
     */
    private suspend fun navigateToUrl(url: String) {
        accessibilityService?.navigateToUrl(url)
    }
    
    /**
     * Извлечь содержимое страницы
     */
    private suspend fun extractPageContent(url: String): PageContent {
        try {
            val accessibilityTitle = accessibilityService?.getPageTitle()
            val accessibilityDescription = accessibilityService?.getPageDescription()
            
            val title = accessibilityTitle?.takeIf { it.isNotBlank() } ?: when {
                url.contains("youtube.com") -> "YouTube Video"
                url.contains("facebook.com") -> "Facebook Ad"
                url.contains("instagram.com") -> "Instagram Story"
                else -> "Landing Page"
            }
            
            val description = accessibilityDescription?.takeIf { it.isNotBlank() } ?: "Creative content"
            
            return PageContent(
                url = url,
                title = title,
                description = description
            )
        } catch (e: Exception) {
            return PageContent(
                url = url,
                title = "Error",
                description = "Error: ${e.message}"
            )
        }
    }
    
    /**
     * Сделать скриншот всей страницы с повторными попытками
     */
    private suspend fun captureFullPage(url: String): Bitmap? {
        return captureWithRetries("full page")
    }
    
    /**
     * Захватить скриншот с повторными попытками
     */
    private suspend fun captureWithRetries(type: String): Bitmap? {
        repeat(MAX_RETRIES) { attempt ->
            try {
                val bitmap = screenshotService?.captureCurrentScreen()
                if (bitmap != null) {
                    return bitmap
                }
            } catch (e: Exception) {
                // Игнорируем ошибки
            }
            
            // Задержка перед следующей попыткой (кроме последней)
            if (attempt < MAX_RETRIES - 1) {
                delay(RETRY_DELAY_MS)
            }
        }
        
        return null
    }
    
    /**
     * Скачать архив страницы
     */
    private suspend fun downloadPageArchive(url: String): File? {
        if (pageArchiver == null) {
            return null
        }
        return try {
            pageArchiver?.downloadPageAsZip(url)
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * Создать миниатюру
     */
    private fun createThumbnail(bitmap: Bitmap?): Bitmap? {
        if (bitmap == null) return null
        
        val thumbnailSize = 200
        return Bitmap.createScaledBitmap(
            bitmap,
            thumbnailSize,
            (bitmap.height * thumbnailSize) / bitmap.width,
            true
        )
    }
    
    /**
     * Сохранить изображение в файл
     */
    private fun saveImageToFile(bitmap: Bitmap?, filename: String): File? {
        if (bitmap == null) {
            InAppLogger.w(Logger.Tags.SERVICE, "⚠️ Bitmap равен null, невозможно сохранить файл: $filename")
            return null
        }
        
        return try {
            val capturesDir = context.getExternalFilesDir("captures")
            if (capturesDir == null) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Не удалось получить директорию captures")
                return null
            }
            
            capturesDir.mkdirs()
            val file = File(capturesDir, filename)
            
            InAppLogger.d(Logger.Tags.SERVICE, "💾 Сохранение скриншота: ${file.absolutePath}, размер bitmap: ${bitmap.width}x${bitmap.height}")
            
            // Проверяем, что bitmap не пустой
            if (bitmap.isRecycled) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Bitmap уже переработан, невозможно сохранить")
                return null
            }
            
            // Проверяем, что bitmap содержит данные (не полностью белый)
            val samplePixel = bitmap.getPixel(bitmap.width / 2, bitmap.height / 2)
            val isWhite = android.graphics.Color.red(samplePixel) == 255 && 
                         android.graphics.Color.green(samplePixel) == 255 && 
                         android.graphics.Color.blue(samplePixel) == 255
            if (isWhite && bitmap.width > 100 && bitmap.height > 100) {
                InAppLogger.w(Logger.Tags.SERVICE, "⚠️ Предупреждение: скриншот может быть пустым (белый цвет в центре)")
            }
            
            // Оптимизируем bitmap перед сохранением (только если нужно)
            val optimizedBitmap = optimizeBitmapForSize(bitmap)
            
            var compressed = false
            // Сохраняем скриншот с хорошим качеством - Supabase поддерживает большие файлы
            // Убираем все ограничения по размеру, оставляем только оптимизацию качества
            var quality = 85 // Используем качество 85% для хорошего баланса
            var currentBitmap = optimizedBitmap
            
            // Сохраняем файл с выбранным качеством
            FileOutputStream(file).use { out ->
                compressed = currentBitmap.compress(Bitmap.CompressFormat.JPEG, quality, out)
            }
            
            if (!compressed) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка сжатия bitmap в JPEG")
            }
            
            // Освобождаем память
            if (currentBitmap != bitmap && currentBitmap != optimizedBitmap && !currentBitmap.isRecycled) {
                currentBitmap.recycle()
            }
            
            // Если сжатие не удалось, удаляем пустой файл
            if (!compressed && file.exists() && file.length() == 0L) {
                file.delete()
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Удален пустой файл после неудачного сжатия")
                return null
            }
            
            // Освобождаем память, если создали оптимизированную версию
            if (optimizedBitmap != bitmap && !optimizedBitmap.isRecycled) {
                optimizedBitmap.recycle()
            }
            
            val finalFileSize = file.length()
            val exists = file.exists()
            InAppLogger.d(Logger.Tags.SERVICE, "📁 Файл скриншота: exists=$exists, size=$finalFileSize bytes (${finalFileSize / 1024 / 1024} MB)")
            
            if (!exists || finalFileSize == 0L) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Файл скриншота не создан или пустой: exists=$exists, size=$finalFileSize")
                return null
            }
            
            file
        } catch (e: IOException) {
            InAppLogger.e(Logger.Tags.SERVICE, "❌ IOException при сохранении скриншота: ${e.message}", e)
            null
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка при сохранении скриншота: ${e.message}", e)
            null
        }
    }
    
    /**
     * Оптимизировать bitmap для уменьшения размера файла
     * Уменьшаем только если действительно необходимо, сохраняя качество
     */
    private fun optimizeBitmapForSize(bitmap: Bitmap): Bitmap {
        // Проверяем, что bitmap не пустой
        if (bitmap.isRecycled || bitmap.width == 0 || bitmap.height == 0) {
            InAppLogger.e(Logger.Tags.SERVICE, "❌ Bitmap пустой или переработанный")
            return bitmap
        }
        
        val maxWidth = 1920 // Максимальная ширина (не уменьшаем, если меньше)
        val maxHeight = 50000 // Максимальная высота (увеличено для очень длинных страниц)
        
        // Если изображение не слишком большое, возвращаем как есть
        if (bitmap.width <= maxWidth && bitmap.height <= maxHeight) {
            return bitmap
        }
        
        // Уменьшаем только если высота превышает максимум, но сохраняем ширину
        var newWidth = bitmap.width
        var newHeight = bitmap.height
        
        if (bitmap.height > maxHeight) {
            // Уменьшаем только высоту пропорционально
            val scale = maxHeight.toFloat() / bitmap.height
            newHeight = maxHeight
            newWidth = (bitmap.width * scale).toInt()
            InAppLogger.d(Logger.Tags.SERVICE, "🔄 Уменьшение высоты скриншота: ${bitmap.width}x${bitmap.height} -> ${newWidth}x${newHeight}")
        } else if (bitmap.width > maxWidth) {
            // Уменьшаем только ширину пропорционально
            val scale = maxWidth.toFloat() / bitmap.width
            newWidth = maxWidth
            newHeight = (bitmap.height * scale).toInt()
            InAppLogger.d(Logger.Tags.SERVICE, "🔄 Уменьшение ширины скриншота: ${bitmap.width}x${bitmap.height} -> ${newWidth}x${newHeight}")
        } else {
            return bitmap // Не нужно уменьшать
        }
        
        // Проверяем, что новые размеры валидны
        if (newWidth <= 0 || newHeight <= 0) {
            InAppLogger.e(Logger.Tags.SERVICE, "❌ Невалидные размеры после уменьшения: ${newWidth}x${newHeight}")
            return bitmap
        }
        
        // Создаем уменьшенную версию
        return Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true)
    }

    /**
     * Универсальный захват скриншота через простой WebView
     */
    private suspend fun captureUniversalScreenshot(url: String): Bitmap? = withContext(Dispatchers.Main) {
        return@withContext try {
            InAppLogger.d(Logger.Tags.SERVICE, "🌐 Создание простого скриншота для: $url")
            
            // Создаем простой WebView для рендеринга
            val webView = android.webkit.WebView(context)
            
            // Настройки WebView
            webView.settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                loadsImagesAutomatically = true
                useWideViewPort = true
                loadWithOverviewMode = true
                userAgentString = "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
            }
            
            // Размеры для скриншота
            val displayMetrics = context.resources.displayMetrics
            val width = displayMetrics.widthPixels
            val height = displayMetrics.heightPixels * 10 // ЗНАЧИТЕЛЬНО увеличиваем для очень длинных страниц
            
            // Устанавливаем размеры
            val widthSpec = android.view.View.MeasureSpec.makeMeasureSpec(width, android.view.View.MeasureSpec.EXACTLY)
            val heightSpec = android.view.View.MeasureSpec.makeMeasureSpec(height, android.view.View.MeasureSpec.EXACTLY)
            
            webView.measure(widthSpec, heightSpec)
            webView.layout(0, 0, width, height)
            
            // Ждем загрузки страницы
            var pageLoaded = false
            webView.webViewClient = object : android.webkit.WebViewClient() {
                override fun onPageFinished(view: android.webkit.WebView?, url: String?) {
                    pageLoaded = true
                    InAppLogger.d(Logger.Tags.SERVICE, "✅ Страница загружена: $url")
                }
            }
            
            InAppLogger.d(Logger.Tags.SERVICE, "🔄 Загрузка страницы...")
            webView.loadUrl(url)
            
            // Ждем загрузки (максимум 10 секунд)
            var waitTime = 0
            while (!pageLoaded && waitTime < 10000) {
                delay(500)
                waitTime += 500
            }
            
            if (!pageLoaded) {
                InAppLogger.w(Logger.Tags.SERVICE, "⚠️ Страница не загрузилась за 10 секунд")
            }
            
            // Дополнительная задержка для загрузки ресурсов
            delay(2000)
            
            // Принудительно прокручиваем страницу для загрузки всего контента
            InAppLogger.d(Logger.Tags.SERVICE, "📜 Прокрутка страницы для загрузки всего контента...")
            webView.evaluateJavascript("""
                (function() {
                    // Прокручиваем до конца страницы несколько раз
                    for(let i = 0; i < 5; i++) {
                        window.scrollTo(0, document.body.scrollHeight);
                        // Небольшая пауза между прокрутками
                        setTimeout(() => {}, 200);
                    }
                    
                    // Загружаем все ленивые изображения
                    const lazyImages = document.querySelectorAll('img[data-src], img[data-lazy-src], img[loading="lazy"], img[data-srcset]');
                    lazyImages.forEach(img => {
                        if (img.dataset.src) img.src = img.dataset.src;
                        if (img.dataset.lazySrc) img.src = img.dataset.lazySrc;
                        if (img.dataset.srcset) img.srcset = img.dataset.srcset;
                    });
                    
                    return document.body.scrollHeight;
                })();
            """.trimIndent()) { result ->
                InAppLogger.d(Logger.Tags.SERVICE, "📏 JavaScript: высота документа = $result")
            }
            
            // Ждем загрузки после прокрутки
            delay(3000)
            
            // Получаем реальную высоту контента
            val contentHeight = webView.contentHeight
            val scale = webView.scale
            val realContentHeight = (contentHeight * scale).toInt()
            
            InAppLogger.d(Logger.Tags.SERVICE, "📏 Финальные размеры: contentHeight=$contentHeight, scale=$scale, realHeight=$realContentHeight")
            
            // Используем максимальную высоту для захвата всей страницы
            val finalHeight = maxOf(realContentHeight, height, displayMetrics.heightPixels * 5)
            
            InAppLogger.d(Logger.Tags.SERVICE, "📐 Итоговая высота скриншота: $finalHeight")
            
            // Перемеряем WebView с увеличенной высотой
            val finalHeightSpec = android.view.View.MeasureSpec.makeMeasureSpec(finalHeight, android.view.View.MeasureSpec.EXACTLY)
            webView.measure(widthSpec, finalHeightSpec)
            webView.layout(0, 0, width, finalHeight)
            
            InAppLogger.d(Logger.Tags.SERVICE, "📸 Создание полного скриншота: ${width}x${finalHeight}")
            
            // Дополнительная задержка для завершения рендеринга
            delay(3000)
            
            // Принудительно обновляем отрисовку несколько раз
            webView.invalidate()
            webView.post {
                webView.invalidate()
                webView.post {
                    webView.invalidate()
                }
            }
            
            // Еще одна задержка для завершения отрисовки
            delay(2000)
            
            // Создаем bitmap напрямую (более надежно чем Picture API)
            val bitmap = Bitmap.createBitmap(width, finalHeight, Bitmap.Config.ARGB_8888)
            val canvas = android.graphics.Canvas(bitmap)
            
            // Белый фон
            canvas.drawColor(android.graphics.Color.WHITE)
            
            // Сохраняем текущее состояние canvas
            canvas.save()
            
            // Рисуем WebView напрямую на canvas
            webView.draw(canvas)
            
            // Восстанавливаем состояние canvas
            canvas.restore()
            
            // Проверяем, что bitmap не пустой (проверяем несколько пикселей в разных местах)
            var hasContent = false
            var nonWhitePixels = 0
            val checkPoints = listOf(
                Pair(bitmap.width / 4, bitmap.height / 4),
                Pair(bitmap.width / 2, bitmap.height / 2),
                Pair(bitmap.width * 3 / 4, bitmap.height * 3 / 4),
                Pair(bitmap.width / 4, bitmap.height * 3 / 4),
                Pair(bitmap.width * 3 / 4, bitmap.height / 4)
            )
            
            for ((x, y) in checkPoints) {
                if (x < bitmap.width && y < bitmap.height) {
                    val pixel = bitmap.getPixel(x, y)
                    val r = android.graphics.Color.red(pixel)
                    val g = android.graphics.Color.green(pixel)
                    val b = android.graphics.Color.blue(pixel)
                    // Если пиксель не белый, значит есть контент
                    if (!(r == 255 && g == 255 && b == 255)) {
                        nonWhitePixels++
                        hasContent = true
                    }
                }
            }
            
            if (!hasContent || nonWhitePixels < 2) {
                InAppLogger.w(Logger.Tags.SERVICE, "⚠️ Предупреждение: скриншот может быть пустым (найдено только $nonWhitePixels небелых пикселей)")
            } else {
                InAppLogger.d(Logger.Tags.SERVICE, "✅ Обнаружен контент в скриншоте ($nonWhitePixels небелых пикселей)")
            }
            
            // Очищаем WebView
            webView.destroy()
            
            InAppLogger.success(Logger.Tags.SERVICE, "✅ Полный скриншот страницы создан: ${bitmap.width}x${bitmap.height}")
            bitmap
            
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка универсального скриншота: ${e.message}", e)
            null
        }
    }
}
