package com.spyservice.mobile.service

import android.content.Context
import android.util.Log
import android.webkit.WebView
import android.webkit.WebViewClient
import com.spyservice.mobile.ui.settings.ArchiveMode
import com.spyservice.mobile.utils.InAppLogger
import com.spyservice.mobile.utils.Logger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.*
import java.net.URL
import java.util.UUID
import java.util.concurrent.TimeUnit
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import kotlin.coroutines.resume

/**
 * Сервис для архивирования веб-страниц в ZIP или MHTML формат
 */
class PageArchiveService(private val context: Context) {
    
    companion object {
        private const val TAG = "PageArchiveService"
        private const val ARCHIVE_FOLDER = "page_archives"
        private const val TIMEOUT_SECONDS = 30L
    }
    
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .build()
    
    /**
     * Архивировать веб-страницу в ZIP или MHTML файл
     */
    suspend fun archivePage(url: String, archiveMode: ArchiveMode = ArchiveMode.ZIP): File? = withContext(Dispatchers.IO) {
        when (archiveMode) {
            ArchiveMode.ZIP -> archivePageAsZip(url)
            ArchiveMode.MHTML -> archivePageAsMhtml(url)
        }
    }
    
    /**
     * Архивировать веб-страницу в ZIP файл
     */
    private suspend fun archivePageAsZip(url: String): File? = withContext(Dispatchers.IO) {
        try {
            InAppLogger.step(Logger.Tags.ARCHIVE, 1, "🗜️ Starting page archiving for: $url")
            
            // Создаем папку для архивов
            val archiveDir = File(context.filesDir, ARCHIVE_FOLDER)
            if (!archiveDir.exists()) {
                archiveDir.mkdirs()
                InAppLogger.d(Logger.Tags.ARCHIVE, "Created archive directory: ${archiveDir.absolutePath}")
            }
            
            // Генерируем имя файла архива
            val timestamp = System.currentTimeMillis()
            val domain = extractDomain(url)
            val archiveFileName = "${domain}_${timestamp}.zip"
            val archiveFile = File(archiveDir, archiveFileName)
            
            InAppLogger.step(Logger.Tags.ARCHIVE, 2, "📦 Creating ZIP archive: $archiveFileName")
            
            // Создаем ZIP архив
            ZipOutputStream(FileOutputStream(archiveFile)).use { zipOut ->
                // 1. Загружаем и сохраняем основную HTML страницу
                val htmlContent = downloadHtmlContent(url)
                if (htmlContent != null) {
                    addToZip(zipOut, "index.html", htmlContent.toByteArray())
                    InAppLogger.success(Logger.Tags.ARCHIVE, "✅ Added index.html to archive")
                    
                    // 2. Извлекаем и загружаем ресурсы (CSS, JS, изображения)
                    val resources = extractResources(htmlContent, url)
                    InAppLogger.d(Logger.Tags.ARCHIVE, "Found ${resources.size} resources to download")
                    
                    var successCount = 0
                    for ((resourcePath, resourceUrl) in resources) {
                        try {
                            val resourceContent = downloadResource(resourceUrl)
                            if (resourceContent != null) {
                                addToZip(zipOut, resourcePath, resourceContent)
                                successCount++
                                InAppLogger.d(Logger.Tags.ARCHIVE, "✅ Added resource: $resourcePath")
                            }
                        } catch (e: Exception) {
                            InAppLogger.w(Logger.Tags.ARCHIVE, "⚠️ Failed to download resource: $resourceUrl - ${e.message}")
                        }
                    }
                    
                    InAppLogger.success(Logger.Tags.ARCHIVE, "📦 Archive created: $successCount/${resources.size} resources saved")
                } else {
                    InAppLogger.e(Logger.Tags.ARCHIVE, "❌ Failed to download main HTML content")
                    return@withContext null
                }
            }
            
            InAppLogger.success(Logger.Tags.ARCHIVE, "🎉 Page archived successfully: ${archiveFile.absolutePath}")
            InAppLogger.d(Logger.Tags.ARCHIVE, "Archive size: ${archiveFile.length() / 1024} KB")
            
            return@withContext archiveFile
            
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.ARCHIVE, "💥 Error archiving page: ${e.message}", e)
            Log.e(TAG, "Error archiving page: $url", e)
            return@withContext null
        }
    }
    
    /**
     * Загрузить HTML содержимое страницы
     */
    private suspend fun downloadHtmlContent(url: String): String? = withContext(Dispatchers.IO) {
        try {
            InAppLogger.d(Logger.Tags.ARCHIVE, "🌐 Downloading HTML from: $url")
            
            val request = Request.Builder()
                .url(url)
                .addHeader("User-Agent", "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36")
                .build()
            
            val response = httpClient.newCall(request).execute()
            
            if (response.isSuccessful) {
                val content = response.body?.string()
                InAppLogger.success(Logger.Tags.ARCHIVE, "✅ HTML downloaded: ${content?.length ?: 0} characters")
                return@withContext content
            } else {
                InAppLogger.e(Logger.Tags.ARCHIVE, "❌ HTTP error: ${response.code} ${response.message}")
                return@withContext null
            }
            
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.ARCHIVE, "❌ Error downloading HTML: ${e.message}", e)
            return@withContext null
        }
    }
    
    /**
     * Загрузить ресурс (CSS, JS, изображение)
     */
    private suspend fun downloadResource(resourceUrl: String): ByteArray? = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(resourceUrl)
                .addHeader("User-Agent", "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36")
                .build()
            
            val response = httpClient.newCall(request).execute()
            
            if (response.isSuccessful) {
                return@withContext response.body?.bytes()
            } else {
                return@withContext null
            }
            
        } catch (e: Exception) {
            return@withContext null
        }
    }
    
    /**
     * Извлечь ресурсы из HTML (CSS, JS, изображения)
     */
    private fun extractResources(htmlContent: String, baseUrl: String): Map<String, String> {
        val resources = mutableMapOf<String, String>()
        
        try {
            // CSS файлы
            val cssPattern = """<link[^>]*href\s*=\s*["']([^"']+\.css[^"']*)["'][^>]*>""".toRegex(RegexOption.IGNORE_CASE)
            cssPattern.findAll(htmlContent).forEach { match ->
                val href = match.groupValues[1]
                val fullUrl = resolveUrl(href, baseUrl)
                val fileName = "css/${extractFileName(href, "style.css")}"
                resources[fileName] = fullUrl
            }
            
            // JavaScript файлы
            val jsPattern = """<script[^>]*src\s*=\s*["']([^"']+\.js[^"']*)["'][^>]*>""".toRegex(RegexOption.IGNORE_CASE)
            jsPattern.findAll(htmlContent).forEach { match ->
                val src = match.groupValues[1]
                val fullUrl = resolveUrl(src, baseUrl)
                val fileName = "js/${extractFileName(src, "script.js")}"
                resources[fileName] = fullUrl
            }
            
            // Изображения
            val imgPattern = """<img[^>]*src\s*=\s*["']([^"']+\.(jpg|jpeg|png|gif|webp|svg)[^"']*)["'][^>]*>""".toRegex(RegexOption.IGNORE_CASE)
            imgPattern.findAll(htmlContent).forEach { match ->
                val src = match.groupValues[1]
                val fullUrl = resolveUrl(src, baseUrl)
                val fileName = "images/${extractFileName(src, "image.jpg")}"
                resources[fileName] = fullUrl
            }
            
            InAppLogger.d(Logger.Tags.ARCHIVE, "Extracted resources: ${resources.size} (CSS: ${resources.keys.count { it.startsWith("css/") }}, JS: ${resources.keys.count { it.startsWith("js/") }}, Images: ${resources.keys.count { it.startsWith("images/") }})")
            
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.ARCHIVE, "Error extracting resources: ${e.message}", e)
        }
        
        return resources
    }
    
    /**
     * Разрешить относительный URL в абсолютный
     */
    private fun resolveUrl(url: String, baseUrl: String): String {
        return try {
            if (url.startsWith("http://") || url.startsWith("https://")) {
                url
            } else if (url.startsWith("//")) {
                val protocol = URL(baseUrl).protocol
                "$protocol:$url"
            } else if (url.startsWith("/")) {
                val base = URL(baseUrl)
                "${base.protocol}://${base.host}$url"
            } else {
                val base = URL(baseUrl)
                val basePath = base.path.substringBeforeLast("/")
                "${base.protocol}://${base.host}$basePath/$url"
            }
        } catch (e: Exception) {
            url
        }
    }
    
    /**
     * Извлечь имя файла из URL
     */
    private fun extractFileName(url: String, defaultName: String): String {
        return try {
            val fileName = url.substringAfterLast("/").substringBefore("?").substringBefore("#")
            if (fileName.isNotEmpty() && fileName.contains(".")) {
                fileName
            } else {
                defaultName
            }
        } catch (e: Exception) {
            defaultName
        }
    }
    
    /**
     * Извлечь домен из URL
     */
    private fun extractDomain(url: String): String {
        return try {
            URL(url).host.replace("www.", "").replace(".", "_")
        } catch (e: Exception) {
            "unknown_site"
        }
    }
    
    /**
     * Добавить файл в ZIP архив
     */
    private fun addToZip(zipOut: ZipOutputStream, fileName: String, content: ByteArray) {
        val entry = ZipEntry(fileName)
        zipOut.putNextEntry(entry)
        zipOut.write(content)
        zipOut.closeEntry()
    }
    
    /**
     * Получить список всех архивов (ZIP и MHTML)
     */
    fun getAllArchives(): List<File> {
        val archiveDir = File(context.filesDir, ARCHIVE_FOLDER)
        return if (archiveDir.exists()) {
            archiveDir.listFiles { file -> 
                file.extension == "zip" || file.extension == "mhtml" 
            }?.toList() ?: emptyList()
        } else {
            emptyList()
        }
    }
    
    /**
     * Удалить архив
     */
    fun deleteArchive(archiveFile: File): Boolean {
        return try {
            val deleted = archiveFile.delete()
            if (deleted) {
                InAppLogger.success(Logger.Tags.ARCHIVE, "🗑️ Archive deleted: ${archiveFile.name}")
            }
            deleted
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.ARCHIVE, "Error deleting archive: ${e.message}", e)
            false
        }
    }
    
    /**
     * Создать скриншот страницы через WebView
     * Используется как fallback, если MediaProjection недоступен
     */
    suspend fun captureScreenshotFromWebView(url: String): android.graphics.Bitmap? {
        InAppLogger.d(Logger.Tags.ARCHIVE, "📸 [captureScreenshotFromWebView] Начало метода, URL: $url")
        
        return try {
            withContext(Dispatchers.Main) {
                var webView: WebView? = null
                var windowManager: android.view.WindowManager? = null

                try {
                    InAppLogger.d(Logger.Tags.ARCHIVE, "📸 [captureScreenshotFromWebView] Внутри withContext(Dispatchers.Main)")

                    // Устанавливаем размеры WebView (размер экрана)
                    val displayMetrics = context.resources.displayMetrics
                    val width = displayMetrics.widthPixels
                    val height = displayMetrics.heightPixels * 2 // Увеличиваем высоту для захвата длинной страницы

                    InAppLogger.d(Logger.Tags.ARCHIVE, "📐 Размеры экрана: ${width}x${height}")

                    // Создаем WebView и добавляем в невидимое окно для правильного рендеринга
                    webView = WebView(context)
                    InAppLogger.d(Logger.Tags.ARCHIVE, "✅ WebView создан")

                    // Получаем WindowManager
                    windowManager = context.getSystemService(android.content.Context.WINDOW_SERVICE) as android.view.WindowManager

                    // Параметры для невидимого окна
                    val params = android.view.WindowManager.LayoutParams(
                        width,
                        height,
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                            android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        } else {
                            @Suppress("DEPRECATION")
                            android.view.WindowManager.LayoutParams.TYPE_PHONE
                        },
                        android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                        android.view.WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                        android.graphics.PixelFormat.TRANSLUCENT
                    )

                    // Размещаем WebView за пределами экрана (невидимо)
                    params.x = -width
                    params.y = -height

                    // Добавляем WebView в WindowManager
                    try {
                        windowManager.addView(webView, params)
                        InAppLogger.d(Logger.Tags.ARCHIVE, "✅ WebView добавлен в WindowManager")
                    } catch (e: Exception) {
                        InAppLogger.w(Logger.Tags.ARCHIVE, "⚠️ Не удалось добавить WebView в WindowManager: ${e.message}")
                        // Fallback: используем обычное измерение
                        webView?.layoutParams = android.view.ViewGroup.LayoutParams(width, height)
                        webView?.measure(
                            android.view.View.MeasureSpec.makeMeasureSpec(width, android.view.View.MeasureSpec.EXACTLY),
                            android.view.View.MeasureSpec.makeMeasureSpec(height, android.view.View.MeasureSpec.EXACTLY)
                        )
                        webView?.layout(0, 0, width, height)
                        InAppLogger.d(Logger.Tags.ARCHIVE, "✅ WebView измерен и размещен (fallback)")
                    }
                    
                    webView?.settings?.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        loadsImagesAutomatically = true
                        useWideViewPort = true
                        loadWithOverviewMode = true
                        userAgentString = "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
                    }
                    InAppLogger.d(Logger.Tags.ARCHIVE, "✅ Настройки WebView установлены")
            
            return@withContext suspendCancellableCoroutine { cont ->
                var completed = false
                var pageFinished = false
                
                // Функция для проверки готовности страницы и создания скриншота
                fun captureScreenshot(view: WebView?) {
                    if (completed || view == null || webView == null) return
                    
                    InAppLogger.d(Logger.Tags.ARCHIVE, "📸 Проверка готовности страницы для скриншота...")
                    
                    // Проверяем готовность страницы через JavaScript
                    view.evaluateJavascript("""
                        (function() {
                            // Проверяем, что документ загружен
                            if (document.readyState !== 'complete') {
                                return 'not_ready';
                            }
                            
                            // Проверяем, что есть контент
                            if (!document.body || document.body.scrollHeight === 0) {
                                return 'no_content';
                            }
                            
                            // Загружаем ленивые изображения
                            const lazyImages = document.querySelectorAll('img[data-src], img[data-lazy-src], img[loading="lazy"]');
                            lazyImages.forEach(img => {
                                if (img.dataset.src) img.src = img.dataset.src;
                                if (img.dataset.lazySrc) img.src = img.dataset.lazySrc;
                            });
                            
                            // Прокручиваем вниз для загрузки всего контента
                            window.scrollTo(0, document.body.scrollHeight);
                            
                            return JSON.stringify({
                                ready: true,
                                scrollHeight: document.body.scrollHeight,
                                clientHeight: document.body.clientHeight,
                                imagesCount: document.images.length
                            });
                        })();
                    """.trimIndent()) { result ->
                        if (completed || !cont.isActive) return@evaluateJavascript
                        
                        try {
                            // Убираем кавычки из результата
                            val cleanResult = result?.removeSurrounding("\"")?.replace("\\\"", "\"") ?: ""
                            
                            if (cleanResult == "not_ready" || cleanResult == "no_content") {
                                // Страница еще не готова, повторяем через 1 секунду
                                InAppLogger.d(Logger.Tags.ARCHIVE, "⏳ Страница еще не готова: $cleanResult, повтор через 1 сек...")
                                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                                    if (!completed && cont.isActive) {
                                        captureScreenshot(view)
                                    }
                                }, 1000)
                                return@evaluateJavascript
                            }
                            
                            // Страница готова, создаем скриншот
                            InAppLogger.d(Logger.Tags.ARCHIVE, "✅ Страница готова: $cleanResult, создание скриншота...")
                            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                                if (!completed && cont.isActive) {
                                    try {
                                        InAppLogger.d(Logger.Tags.ARCHIVE, "🎨 Начало создания скриншота...")
                                        
                                        // Получаем реальную высоту контента
                                        var contentHeight = height
                                        try {
                                            val scrollHeight = view.contentHeight
                                            InAppLogger.d(Logger.Tags.ARCHIVE, "📏 contentHeight: $scrollHeight, height: $height")
                                            if (scrollHeight > 0 && scrollHeight < height * 10) {
                                                contentHeight = scrollHeight
                                            }
                                        } catch (e: Exception) {
                                            InAppLogger.e(Logger.Tags.ARCHIVE, "❌ Ошибка получения contentHeight: ${e.message}")
                                            // Используем дефолтную высоту
                                        }
                                        
                                        InAppLogger.d(Logger.Tags.ARCHIVE, "🎨 Создание скриншота: ${width}x${contentHeight}")
                                        
                                        // Принудительно обновляем отрисовку
                                        view.invalidate()
                                        
                                        // Небольшая задержка для завершения отрисовки
                                        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                                            if (!completed && cont.isActive) {
                                                try {
                                                    // Используем Picture для более надежного захвата
                                                    val picture = android.graphics.Picture()
                                                    val canvas = picture.beginRecording(width, contentHeight)
                                                    
                                                    // Устанавливаем белый фон
                                                    canvas.drawColor(android.graphics.Color.WHITE)
                                                    
                                                    // Рисуем WebView
                                                    InAppLogger.d(Logger.Tags.ARCHIVE, "🖼️ Рисование WebView на Canvas...")
                                                    view.draw(canvas)
                                                    picture.endRecording()
                                                    
                                                    InAppLogger.d(Logger.Tags.ARCHIVE, "✅ Picture создан: ${picture.width}x${picture.height}")
                                                    
                                                    // Конвертируем Picture в Bitmap
                                                    val bitmap = android.graphics.Bitmap.createBitmap(
                                                        picture.width,
                                                        picture.height,
                                                        android.graphics.Bitmap.Config.ARGB_8888
                                                    )
                                                    val bitmapCanvas = android.graphics.Canvas(bitmap)
                                                    bitmapCanvas.drawColor(android.graphics.Color.WHITE)
                                                    picture.draw(bitmapCanvas)
                                                    
                                                    InAppLogger.success(Logger.Tags.ARCHIVE, "✅ Скриншот создан: ${bitmap.width}x${bitmap.height}")
                                                    
                                                    completed = true
                                                    // Удаляем WebView из WindowManager перед уничтожением
                                                    try {
                                                        windowManager?.removeView(webView)
                                                    } catch (e: Exception) {
                                                        // Игнорируем ошибки удаления
                                                    }
                                                    webView?.destroy()
                                                    if (cont.isActive) {
                                                        cont.resume(bitmap)
                                                    }
                                                } catch (e: Exception) {
                                                    InAppLogger.e(Logger.Tags.ARCHIVE, "❌ Ошибка создания скриншота: ${e.message}", e)
                                                    completed = true
                                                    // Удаляем WebView из WindowManager перед уничтожением
                                                    try {
                                                        windowManager?.removeView(webView)
                                                    } catch (removeException: Exception) {
                                                        // Игнорируем ошибки удаления
                                                    }
                                                    webView?.destroy()
                                                    if (cont.isActive) {
                                                        cont.resume(null)
                                                    }
                                                }
                                            }
                                        }, 500) // Задержка 500мс для завершения отрисовки
                                    } catch (e: Exception) {
                                        InAppLogger.e(Logger.Tags.ARCHIVE, "❌ Ошибка при подготовке скриншота: ${e.message}", e)
                                        completed = true
                                        // Удаляем WebView из WindowManager перед уничтожением
                                        try {
                                            windowManager?.removeView(webView)
                                        } catch (removeException: Exception) {
                                            // Игнорируем ошибки удаления
                                        }
                                        webView?.destroy()
                                        if (cont.isActive) {
                                            cont.resume(null)
                                        }
                                    }
                                }
                            }, 2000) // Задержка 2 секунды для полной загрузки изображений
                        } catch (e: Exception) {
                            // В случае ошибки парсинга, все равно пытаемся создать скриншот
                            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                                if (!completed && cont.isActive) {
                                    captureScreenshot(view)
                                }
                            }, 2000)
                        }
                    }
                }
                
                webView?.webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, finishedUrl: String?) {
                        if (pageFinished) return
                        pageFinished = true
                        
                        InAppLogger.d(Logger.Tags.ARCHIVE, "✅ Страница загружена: $finishedUrl")
                        
                        if (!completed && cont.isActive) {
                            // Даем время на полную загрузку ресурсов
                            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                                if (!completed && cont.isActive) {
                                    captureScreenshot(view)
                                }
                            }, 2000) // Задержка 2 секунды после onPageFinished
                        }
                    }
                    
                    override fun onReceivedError(view: WebView?, request: android.webkit.WebResourceRequest?, error: android.webkit.WebResourceError?) {
                        InAppLogger.e(Logger.Tags.ARCHIVE, "❌ Ошибка загрузки страницы: ${error?.description}")
                    }
                }
                
                            // Таймаут
                            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                                if (!completed && cont.isActive) {
                                    InAppLogger.w(Logger.Tags.ARCHIVE, "⏱️ Таймаут создания скриншота (20 секунд)")
                                    completed = true
                                    // Удаляем WebView из WindowManager перед уничтожением
                                    try {
                                        windowManager?.removeView(webView)
                                    } catch (e: Exception) {
                                        // Игнорируем ошибки удаления
                                    }
                                    webView?.destroy()
                                    cont.resume(null)
                                }
                            }, 20000) // 20 секунд таймаут
                
                InAppLogger.d(Logger.Tags.ARCHIVE, "🌐 Загрузка URL: $url")
                webView?.loadUrl(url)
            }
                } catch (e: Exception) {
                    InAppLogger.e(Logger.Tags.ARCHIVE, "❌ [captureScreenshotFromWebView] Ошибка внутри withContext: ${e.message}", e)
                    // Очистка в случае ошибки
                    try {
                        windowManager?.removeView(webView)
                    } catch (removeException: Exception) {
                        // Игнорируем ошибки удаления
                    }
                    webView?.destroy()
                    null
                }
            }
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.ARCHIVE, "❌ [captureScreenshotFromWebView] Ошибка создания скриншота через WebView: ${e.message}", e)
            null
        }
    }
    
    /**
     * Архивировать веб-страницу в MHTML файл (один файл со всеми ресурсами)
     */
    private suspend fun archivePageAsMhtml(url: String): File? = withContext(Dispatchers.Main) {
        try {
            // Создание MHTML архива

            // Создаем папку для архивов
            val archiveDir = File(context.filesDir, ARCHIVE_FOLDER)
            if (!archiveDir.exists()) {
                archiveDir.mkdirs()
                InAppLogger.d(Logger.Tags.ARCHIVE, "Created archive directory: ${archiveDir.absolutePath}")
            }

            // Генерируем имя файла архива
            val timestamp = System.currentTimeMillis()
            val domain = extractDomain(url)
            val archiveFileName = "${domain}_${timestamp}.mhtml"
            val archiveFile = File(archiveDir, archiveFileName)

            // Создание архива: $archiveFileName

            // ВАЖНО: WebView должен создаваться и использоваться только на главном потоке
            val webView = WebView(context)

            // Максимально приближаем поведение к Chrome: включаем JS, DOM storage и т.п.
            webView.settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                loadsImagesAutomatically = true
                databaseEnabled = true
                setSupportZoom(true)
                useWideViewPort = true
                loadWithOverviewMode = true
                mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                allowFileAccess = true
                allowContentAccess = true
                mediaPlaybackRequiresUserGesture = false
                // Устанавливаем User-Agent как у мобильного Chrome
                userAgentString = "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
            }

            return@withContext suspendCancellableCoroutine { cont ->
                var completed = false
                var pageFinished = false

                webView.webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, finishedUrl: String?) {
                        super.onPageFinished(view, finishedUrl)

                        if (pageFinished) return
                        pageFinished = true

                        // Страница загружена, ждем ресурсы

                        // Выполняем JavaScript для прокрутки страницы и загрузки ленивых изображений
                        view?.evaluateJavascript("""
                            (function() {
                                // Загружаем все ленивые изображения и фоновые изображения
                                function loadLazyImages() {
                                    // Обычные ленивые изображения
                                    const lazyImages = document.querySelectorAll('img[data-src], img[data-lazy-src], img[data-srcset], img[loading="lazy"]');
                                    lazyImages.forEach(img => {
                                        if (img.dataset.src) {
                                            img.src = img.dataset.src;
                                        } else if (img.dataset.lazySrc) {
                                            img.src = img.dataset.lazySrc;
                                        } else if (img.dataset.srcset) {
                                            img.srcset = img.dataset.srcset;
                                        }
                                    });
                                    
                                    // Фоновые изображения в стилях
                                    const elementsWithBg = document.querySelectorAll('[data-bg], [data-background-image]');
                                    elementsWithBg.forEach(el => {
                                        if (el.dataset.bg) {
                                            el.style.backgroundImage = 'url(' + el.dataset.bg + ')';
                                        } else if (el.dataset.backgroundImage) {
                                            el.style.backgroundImage = 'url(' + el.dataset.backgroundImage + ')';
                                        }
                                    });
                                    
                                    // Загружаем все изображения из CSS (inline styles)
                                    const styleSheets = document.styleSheets;
                                    for (let i = 0; i < styleSheets.length; i++) {
                                        try {
                                            const rules = styleSheets[i].cssRules || styleSheets[i].rules;
                                            for (let j = 0; j < rules.length; j++) {
                                                if (rules[j].style && rules[j].style.backgroundImage) {
                                                    // Принудительно применяем стили для загрузки фоновых изображений
                                                }
                                            }
                                        } catch (e) {
                                            // Игнорируем ошибки CORS при доступе к стилям
                                        }
                                    }
                                }
                                
                                // Функция для прокрутки страницы
                                function scrollPage() {
                                    return new Promise((resolve) => {
                                        let totalHeight = 0;
                                        const distance = 400; // Прокручиваем по 400px
                                        const maxScroll = 15000; // Максимум 15к пикселей
                                        
                                        const timer = setInterval(() => {
                                            const scrollHeight = Math.max(
                                                document.body.scrollHeight,
                                                document.documentElement.scrollHeight,
                                                document.body.offsetHeight,
                                                document.documentElement.offsetHeight,
                                                document.body.clientHeight,
                                                document.documentElement.clientHeight
                                            );
                                            
                                            window.scrollBy(0, distance);
                                            totalHeight += distance;
                                            
                                            // Если прокрутили всю страницу или достигли максимума
                                            if(totalHeight >= scrollHeight || totalHeight >= maxScroll){
                                                clearInterval(timer);
                                                // Прокручиваем вниз до конца для загрузки последних элементов
                                                window.scrollTo(0, scrollHeight);
                                                setTimeout(() => {
                                                    // Возвращаемся наверх
                                                    window.scrollTo(0, 0);
                                                    resolve();
                                                }, 500);
                                                return;
                                            }
                                        }, 150); // Прокручиваем каждые 150ms для более плавной загрузки
                                    });
                                }
                                
                                // Ждем загрузки всех изображений
                                function waitForImages() {
                                    return new Promise((resolve) => {
                                        const images = document.querySelectorAll('img');
                                        let loaded = 0;
                                        let total = images.length;
                                        
                                        if (total === 0) {
                                            resolve();
                                            return;
                                        }
                                        
                                        const checkComplete = () => {
                                            loaded++;
                                            if (loaded >= total) {
                                                resolve();
                                            }
                                        };
                                        
                                        images.forEach(img => {
                                            if (img.complete) {
                                                checkComplete();
                                            } else {
                                                img.onload = checkComplete;
                                                img.onerror = checkComplete; // Считаем ошибку как завершение
                                            }
                                        });
                                        
                                        // Таймаут на случай, если изображения не загрузятся
                                        setTimeout(resolve, 2000);
                                    });
                                }
                                
                                // Запускаем процесс
                                loadLazyImages();
                                scrollPage().then(() => {
                                    return waitForImages();
                                }).then(() => {
                                    return 'ready';
                                });
                            })();
                        """.trimIndent(), null)

                        // Ждем дополнительное время для загрузки всех ресурсов
                        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                            if (completed) return@postDelayed
                            completed = true

                        // Сохранение веб-архива

                            // Сохраняем веб-архив (один файл, как в Chrome "Веб-страница, один файл")
                            view?.saveWebArchive(archiveFile.absolutePath, false) { path ->
                                try {
                                    if (path != null && archiveFile.exists()) {
                                        val fileSize = archiveFile.length()
                                        InAppLogger.success(
                                            Logger.Tags.ARCHIVE,
                                            "🎉 MHTML archive created by WebView: $path (size: ${fileSize / 1024} KB)"
                                        )
                                        cont.resume(archiveFile)
                                    } else {
                                        InAppLogger.e(
                                            Logger.Tags.ARCHIVE,
                                            "❌ WebView.saveWebArchive returned null path or file doesn't exist"
                                        )
                                        cont.resume(null)
                                    }
                                } catch (e: Exception) {
                                    InAppLogger.e(
                                        Logger.Tags.ARCHIVE,
                                        "💥 Error in saveWebArchive callback: ${e.message}",
                                        e
                                    )
                                    cont.resume(null)
                                } finally {
                                    view?.destroy()
                                }
                            }
                        }, 5000) // Увеличиваем задержку до 5 секунд для загрузки всех ресурсов
                    }

                    override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                        super.onPageStarted(view, url, favicon)
                        InAppLogger.d(Logger.Tags.ARCHIVE, "🌐 Page started loading: $url")
                    }

                    override fun onLoadResource(view: WebView?, url: String?) {
                        super.onLoadResource(view, url)
                        // Логирование загрузки ресурсов отключено для уменьшения шума в логах
                    }

                    @Suppress("DEPRECATION")
                    override fun onReceivedError(
                        view: WebView?,
                        errorCode: Int,
                        description: String?,
                        failingUrl: String?
                    ) {
                        super.onReceivedError(view, errorCode, description, failingUrl)

                        // Не прерываем процесс из-за ошибок загрузки отдельных ресурсов
                        InAppLogger.w(
                            Logger.Tags.ARCHIVE,
                            "⚠️ WebView resource error (non-critical): $errorCode $description, url=$failingUrl"
                        )
                    }

                    override fun onReceivedHttpError(
                        view: WebView?,
                        request: android.webkit.WebResourceRequest?,
                        errorResponse: android.webkit.WebResourceResponse?
                    ) {
                        super.onReceivedHttpError(view, request, errorResponse)
                        // Не прерываем процесс из-за HTTP ошибок отдельных ресурсов
                        InAppLogger.w(
                            Logger.Tags.ARCHIVE,
                            "⚠️ HTTP error loading resource: ${request?.url} (${errorResponse?.statusCode})"
                        )
                    }
                }

                InAppLogger.step(Logger.Tags.ARCHIVE, 2, "🌐 Loading page into WebView: $url")
                webView.loadUrl(url)

                cont.invokeOnCancellation {
                    try {
                        webView.destroy()
                    } catch (_: Exception) {
                    }
                }
            }
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.ARCHIVE, "💥 Error creating MHTML archive via WebView: ${e.message}", e)
            Log.e(TAG, "Error creating MHTML archive: $url", e)
            return@withContext null
        }
    }
    
    /**
     * Кодировать Subject в формат =?utf-8?Q?=...= (RFC 2047)
     */
    private fun encodeSubjectToQuotedPrintable(subject: String): String {
        // Если Subject содержит только ASCII, возвращаем как есть
        if (subject.all { it.code < 128 }) {
            return subject
        }
        
        // Кодируем в quoted-printable
        val quoted = convertToQuotedPrintable(subject)
        
        // Разбиваем на строки по 75 символов (RFC 2047 требует максимум 75 символов на строку)
        val lines = mutableListOf<String>()
        var pos = 0
        while (pos < quoted.length) {
            val end = minOf(pos + 75, quoted.length)
            lines.add(quoted.substring(pos, end))
            pos = end
        }
        
        // Формируем заголовок в формате =?utf-8?Q?=...=
        return lines.joinToString("\n ") { "=?utf-8?Q?$it?=" }
    }
    
    /**
     * Конвертировать текст в quoted-printable формат (RFC 2045)
     * ВАЖНО: Кодируем байты UTF-8, а не коды символов!
     */
    private fun convertToQuotedPrintable(text: String): String {
        val sb = StringBuilder()
        var lineLength = 0
        
        // Преобразуем строку в байты UTF-8
        val bytes = text.toByteArray(Charsets.UTF_8)
        
        for (byte in bytes) {
            val unsignedByte = byte.toInt() and 0xFF
            
            when {
                // Обычные ASCII символы (33-126, кроме =)
                unsignedByte in 33..126 && unsignedByte != '='.code -> {
                    if (lineLength >= 75) {
                        sb.append("=\n")
                        lineLength = 0
                    }
                    sb.append(unsignedByte.toChar())
                    lineLength++
                }
                // Пробел и табуляция
                unsignedByte == ' '.code || unsignedByte == '\t'.code -> {
                    if (lineLength >= 75) {
                        sb.append("=\n")
                        lineLength = 0
                    }
                    sb.append(unsignedByte.toChar())
                    lineLength++
                }
                // Перевод строки (LF)
                unsignedByte == '\n'.code -> {
                    sb.append("\n")
                    lineLength = 0
                }
                // Возврат каретки (CR) - игнорируем
                unsignedByte == '\r'.code -> {
                    // Игнорируем \r
                }
                // Все остальные байты кодируем в =XX формате
                else -> {
                    val encoded = String.format("=%02X", unsignedByte)
                    if (lineLength + encoded.length > 75) {
                        sb.append("=\n")
                        lineLength = 0
                    }
                    sb.append(encoded)
                    lineLength += encoded.length
                }
            }
        }
        
        return sb.toString()
    }
    
    /**
     * Определить MIME тип по расширению файла
     */
    private fun determineMimeType(filePath: String): String {
        val extension = filePath.substringAfterLast(".", "").lowercase()
        return when (extension) {
            "css" -> "text/css"
            "js" -> "application/javascript"
            "jpg", "jpeg" -> "image/jpeg"
            "png" -> "image/png"
            "gif" -> "image/gif"
            "webp" -> "image/webp"
            "svg" -> "image/svg+xml"
            "woff", "woff2" -> "font/woff"
            "ttf" -> "font/ttf"
            "otf" -> "font/otf"
            "eot" -> "application/vnd.ms-fontobject"
            "mp4" -> "video/mp4"
            "webm" -> "video/webm"
            "mp3" -> "audio/mpeg"
            "wav" -> "audio/wav"
            "pdf" -> "application/pdf"
            "html", "htm" -> "text/html"
            else -> "application/octet-stream"
        }
    }
    
    /**
     * Получить размер архива в человекочитаемом формате
     */
    fun getArchiveSize(archiveFile: File): String {
        val sizeBytes = archiveFile.length()
        return when {
            sizeBytes < 1024 -> "${sizeBytes} B"
            sizeBytes < 1024 * 1024 -> "${sizeBytes / 1024} KB"
            else -> "${sizeBytes / (1024 * 1024)} MB"
        }
    }
}
