package com.spyservice.mobile.service

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import android.webkit.WebView
import android.webkit.WebViewClient
import com.spyservice.mobile.utils.InAppLogger
import com.spyservice.mobile.utils.Logger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume

/**
 * Сервис для получения превью (тизера) сайта
 * Сохраняет превью локально для последующей отправки на сервер
 */
class PagePreviewService(private val context: Context) {
    
    companion object {
        private const val TAG = "PagePreviewService"
        private const val TIMEOUT_SECONDS = 30L
        private const val PREVIEW_FOLDER = "previews"
    }
    
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .build()
    
    /**
     * Получить превью сайта и сохранить локально
     * @return File - сохраненный файл превью или null
     */
    suspend fun getAndSavePreview(pageUrl: String): File? = withContext(Dispatchers.IO) {
        try {
            InAppLogger.step(Logger.Tags.SERVICE, 1, "🖼️ Получение превью: $pageUrl")
            
            // ВСЕГДА используем WebView для получения полного HTML с динамическим контентом
            // HTTP запрос не получает JavaScript-контент, поэтому изображения могут отсутствовать
            InAppLogger.d(Logger.Tags.SERVICE, "Используем WebView для получения полного HTML...")
            var html = downloadHtmlViaWebView(pageUrl)
            if (html != null && html.isNotEmpty()) {
                InAppLogger.d(Logger.Tags.SERVICE, "✅ HTML получен через WebView (${html.length} символов)")
            } else {
                // Fallback на HTTP, если WebView не сработал
                InAppLogger.d(Logger.Tags.SERVICE, "WebView не удался, пробуем HTTP...")
                html = downloadHtmlContent(pageUrl)
                if (html != null && html.isNotEmpty()) {
                    InAppLogger.d(Logger.Tags.SERVICE, "✅ HTML получен через HTTP (${html.length} символов)")
                }
            }
            
            if (html == null || html.isEmpty()) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Не удалось получить HTML")
                return@withContext null
            }
            
            // Ищем изображение тизера в порядке приоритета (как Google):
            InAppLogger.d(Logger.Tags.SERVICE, "🔍 Поиск og:image...")
            var previewUrl = findPreviewInMetaTags(html)
            
            if (previewUrl == null) {
                InAppLogger.d(Logger.Tags.SERVICE, "🔍 Поиск в JSON-LD...")
                previewUrl = findPreviewInJsonLd(html)
            }
            
            if (previewUrl == null) {
                InAppLogger.d(Logger.Tags.SERVICE, "🔍 Поиск первого изображения в статье...")
                previewUrl = findFirstArticleImage(html, pageUrl)
            }
            
            if (previewUrl == null) {
                InAppLogger.d(Logger.Tags.SERVICE, "🔍 Поиск приоритетных изображений...")
                previewUrl = findPreviewInImages(html, pageUrl)
            }
            
            if (previewUrl == null) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Превью не найдено в HTML")
                return@withContext null
            }
            
            val fullUrl = resolveUrl(previewUrl, pageUrl)
            InAppLogger.success(Logger.Tags.SERVICE, "✅ Найдено превью: $fullUrl")
            
            val previewFile = downloadAndSavePreview(fullUrl)
            
            if (previewFile != null && previewFile.exists()) {
                InAppLogger.success(Logger.Tags.SERVICE, "✅ Превью сохранено: ${previewFile.absolutePath}")
            } else {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Не удалось сохранить превью")
            }
            
            return@withContext previewFile
            
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка получения превью: ${e.message}")
            return@withContext null
        }
    }
    
    /**
     * Получить HTML через WebView (если HTTP запрос не работает)
     */
    private suspend fun downloadHtmlViaWebView(url: String): String? = withContext(Dispatchers.Main) {
        try {
            InAppLogger.d(Logger.Tags.SERVICE, "Загрузка HTML через WebView: $url")
            val webView = WebView(context)
            webView.settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                loadsImagesAutomatically = true
                userAgentString = "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
            }
            
            return@withContext suspendCancellableCoroutine { cont ->
                var completed = false
                var pageLoaded = false
                
                webView.webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, finishedUrl: String?) {
                        super.onPageFinished(view, finishedUrl)
                        
                        if (pageLoaded) return
                        pageLoaded = true
                        
                        InAppLogger.d(Logger.Tags.SERVICE, "WebView: страница загружена, получаем HTML...")
                        
                        // Ждем немного для загрузки динамического контента
                        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                            if (completed) return@postDelayed
                            
                            // Получаем HTML через JavaScript
                            view?.evaluateJavascript("(function() { return document.documentElement.outerHTML; })()") { html ->
                                if (completed) return@evaluateJavascript
                                completed = true
                                
                                val cleanHtml = html?.removeSurrounding("\"")?.replace("\\n", "\n")?.replace("\\\"", "\"")?.replace("\\/", "/")
                                InAppLogger.d(Logger.Tags.SERVICE, "WebView: HTML получен (${cleanHtml?.length ?: 0} символов)")
                                cont.resume(cleanHtml)
                                webView.destroy()
                            }
                        }, 2000) // Ждем 2 секунды для загрузки контента
                    }
                }
                
                webView.loadUrl(url)
                
                // Таймаут 15 секунд
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                    if (!completed) {
                        completed = true
                        InAppLogger.w(Logger.Tags.SERVICE, "WebView: таймаут получения HTML")
                        cont.resume(null)
                        webView.destroy()
                    }
                }, 15000)
            }
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.SERVICE, "Ошибка получения HTML через WebView: ${e.message}")
            Log.e(TAG, "Error downloading HTML via WebView", e)
            return@withContext null
        }
    }
    
    /**
     * Поиск превью в мета-тегах (og:image, twitter:image)
     */
    private fun findPreviewInMetaTags(html: String): String? {
        try {
            val patterns = listOf(
                """<meta\s+property\s*=\s*["']og:image["']\s+content\s*=\s*["']([^"']+)["']""".toRegex(RegexOption.IGNORE_CASE),
                """<meta\s+content\s*=\s*["']([^"']+)["']\s+property\s*=\s*["']og:image["']""".toRegex(RegexOption.IGNORE_CASE),
                """<meta\s+name\s*=\s*["']twitter:image["']\s+content\s*=\s*["']([^"']+)["']""".toRegex(RegexOption.IGNORE_CASE),
                """property\s*=\s*["']og:image["'][^>]*content\s*=\s*["']([^"']+)["']""".toRegex(RegexOption.IGNORE_CASE)
            )
            
            for (pattern in patterns) {
                val match = pattern.find(html)
                if (match != null && match.groupValues.size > 1) {
                    val url = match.groupValues[1].trim()
                    if (url.isNotEmpty() && !isFavicon(url)) {
                        InAppLogger.d(Logger.Tags.SERVICE, "✅ Найден og:image: $url")
                        return url
                    }
                }
            }
            InAppLogger.d(Logger.Tags.SERVICE, "og:image не найден в мета-тегах")
        } catch (e: Exception) {
            Log.e(TAG, "Error finding preview in meta tags", e)
        }
        return null
    }
    
    /**
     * Проверить, является ли URL favicon'ом
     */
    private fun isFavicon(url: String): Boolean {
        val lowerUrl = url.lowercase()
        return lowerUrl.contains("favicon") || 
               lowerUrl.contains("icon") && (lowerUrl.contains("16x16") || lowerUrl.contains("32x32") || lowerUrl.contains("96x96"))
    }
    
    /**
     * Поиск изображения в JSON-LD структурированных данных (используется Google)
     */
    private fun findPreviewInJsonLd(html: String): String? {
        try {
            // Ищем JSON-LD скрипты
            val jsonLdPattern = """<script[^>]*type\s*=\s*["']application/ld\+json["'][^>]*>(.*?)</script>""".toRegex(setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
            val matches = jsonLdPattern.findAll(html)
            
            for (match in matches) {
                val jsonContent = match.groupValues[1].trim()
                if (jsonContent.isEmpty()) continue
                
                try {
                    // Ищем "image" в JSON (может быть строкой или объектом)
                    val imagePatterns = listOf(
                        """"image"\s*:\s*"([^"]+)"""".toRegex(),
                        """"image"\s*:\s*\{\s*"@type"\s*:\s*"ImageObject"[^}]*"url"\s*:\s*"([^"]+)"""".toRegex(),
                        """"image"\s*:\s*\[\s*"([^"]+)"""".toRegex(),
                        """"thumbnailUrl"\s*:\s*"([^"]+)"""".toRegex()
                    )
                    
                    for (pattern in imagePatterns) {
                        val imageMatch = pattern.find(jsonContent)
                        if (imageMatch != null && imageMatch.groupValues.size > 1) {
                            val imageUrl = imageMatch.groupValues[1].trim()
                            if (imageUrl.isNotEmpty() && !isFavicon(imageUrl)) {
                                return imageUrl
                            }
                        }
                    }
                } catch (e: Exception) {
                    // Продолжаем поиск в следующем JSON-LD блоке
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error finding preview in JSON-LD", e)
        }
        return null
    }
    
    /**
     * Поиск первого изображения в статье (не hero, не header)
     */
    private fun findFirstArticleImage(html: String, baseUrl: String): String? {
        try {
            val imgPattern = """<img[^>]*>""".toRegex(RegexOption.IGNORE_CASE)
            val images = imgPattern.findAll(html).toList()
            
            InAppLogger.d(Logger.Tags.SERVICE, "Найдено ${images.size} изображений в HTML")
            
            // Исключаем hero, header, navigation изображения
            val excludeKeywords = listOf(
                "hero", "header", "nav", "menu", "logo", "icon", 
                "avatar", "favicon", "sprite", "button", "banner-top",
                "top-banner", "advertisement", "ad-", "sidebar"
            )
            
            var checkedCount = 0
            // Ищем первое изображение в основном контенте
            for (imgTag in images) {
                val imgHtml = imgTag.value
                val hasExclude = excludeKeywords.any { imgHtml.contains(it, ignoreCase = true) }
                
                if (hasExclude) continue
                
                checkedCount++
                // Ищем src или data-src (lazy loading)
                var srcMatch = """src\s*=\s*["']([^"']+)["']""".toRegex(RegexOption.IGNORE_CASE).find(imgHtml)
                if (srcMatch == null) {
                    srcMatch = """data-src\s*=\s*["']([^"']+)["']""".toRegex(RegexOption.IGNORE_CASE).find(imgHtml)
                }
                if (srcMatch == null) {
                    srcMatch = """data-lazy-src\s*=\s*["']([^"']+)["']""".toRegex(RegexOption.IGNORE_CASE).find(imgHtml)
                }
                
                if (srcMatch != null && srcMatch.groupValues.size > 1) {
                    val src = srcMatch.groupValues[1].trim()
                    if (src.isNotEmpty() && isValidImageUrl(src) && !isFavicon(src)) {
                        val widthMatch = """width\s*=\s*["']?(\d+)["']?""".toRegex(RegexOption.IGNORE_CASE).find(imgHtml)
                        val heightMatch = """height\s*=\s*["']?(\d+)["']?""".toRegex(RegexOption.IGNORE_CASE).find(imgHtml)
                        
                        val width = widthMatch?.groupValues?.get(1)?.toIntOrNull() ?: 0
                        val height = heightMatch?.groupValues?.get(1)?.toIntOrNull() ?: 0
                        
                        InAppLogger.d(Logger.Tags.SERVICE, "Проверка изображения: $src (${width}x${height})")
                        
                        // Берем изображения больше 300x200 или без указанных размеров
                        if ((width >= 300 && height >= 200) || (width == 0 && height == 0)) {
                            InAppLogger.d(Logger.Tags.SERVICE, "✅ Найдено подходящее изображение: $src")
                            return src
                        }
                    }
                }
            }
            
            InAppLogger.d(Logger.Tags.SERVICE, "Проверено $checkedCount изображений, подходящих не найдено")
        } catch (e: Exception) {
            Log.e(TAG, "Error finding first article image", e)
        }
        return null
    }
    
    /**
     * Поиск превью в изображениях (fallback)
     */
    private fun findPreviewInImages(html: String, baseUrl: String): String? {
        try {
            val imgPattern = """<img[^>]*>""".toRegex(RegexOption.IGNORE_CASE)
            val images = imgPattern.findAll(html).toList()
            
            val priorityKeywords = listOf(
                "og-image", "social-image", "share-image", "article-image", 
                "news-image", "post-image", "featured", "cover", "main"
            )
            
            // Ищем приоритетные изображения (но НЕ hero)
            for (imgTag in images) {
                val imgHtml = imgTag.value
                val hasPriority = priorityKeywords.any { imgHtml.contains(it, ignoreCase = true) }
                val isHero = imgHtml.contains("hero", ignoreCase = true)
                
                if (hasPriority && !isHero) {
                    val srcMatch = """src\s*=\s*["']([^"']+)["']""".toRegex(RegexOption.IGNORE_CASE).find(imgHtml)
                    if (srcMatch != null && srcMatch.groupValues.size > 1) {
                        val src = srcMatch.groupValues[1].trim()
                        if (src.isNotEmpty() && isValidImageUrl(src) && !isFavicon(src)) {
                            return src
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error finding preview in images", e)
        }
        return null
    }
    
    
    /**
     * Проверить валидность URL изображения
     */
    private fun isValidImageUrl(url: String): Boolean {
        if (url.isEmpty() || url.startsWith("data:")) return false
        
        // Исключаем favicon и мелкие иконки
        if (isFavicon(url)) return false
        
        val lowerUrl = url.lowercase()
        val imageExtensions = listOf(".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp")
        
        // SVG не нужны для превью
        if (lowerUrl.contains(".svg")) return false
        
        if (imageExtensions.any { lowerUrl.contains(it) }) return true
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//")) {
            return !lowerUrl.contains(".css") && 
                   !lowerUrl.contains(".js") && 
                   !lowerUrl.contains("icon") &&
                   !lowerUrl.contains("logo") &&
                   !lowerUrl.contains("avatar")
        }
        
        return false
    }
    
    /**
     * Скачать HTML контент
     */
    private suspend fun downloadHtmlContent(url: String): String? = withContext(Dispatchers.IO) {
        try {
            // Пробуем несколько вариантов User-Agent
            val userAgents = listOf(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
            )
            
            for (userAgent in userAgents) {
                try {
                    val request = Request.Builder()
                        .url(url)
                        .addHeader("User-Agent", userAgent)
                        .addHeader("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
                        .addHeader("Accept-Language", "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7")
                        .addHeader("Accept-Encoding", "gzip, deflate, br")
                        .addHeader("Connection", "keep-alive")
                        .addHeader("Upgrade-Insecure-Requests", "1")
                        .addHeader("Sec-Fetch-Dest", "document")
                        .addHeader("Sec-Fetch-Mode", "navigate")
                        .addHeader("Sec-Fetch-Site", "none")
                        .addHeader("Cache-Control", "max-age=0")
                        .build()
                    
                    val response = httpClient.newCall(request).execute()
                    
                    if (response.isSuccessful) {
                        val html = response.body?.string()
                        if (html != null && html.isNotEmpty()) {
                            return@withContext html
                        }
                    }
                } catch (e: Exception) {
                    Log.d(TAG, "Failed with User-Agent: $userAgent, trying next...")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error downloading HTML", e)
        }
        return@withContext null
    }
    
    /**
     * Скачать и сохранить превью
     */
    private suspend fun downloadAndSavePreview(previewUrl: String): File? = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(previewUrl)
                .addHeader("User-Agent", "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
                .addHeader("Accept", "image/webp,image/apng,image/*,*/*;q=0.8")
                .addHeader("Referer", previewUrl)
                .build()
            
            val response = httpClient.newCall(request).execute()
            
            if (!response.isSuccessful) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ HTTP ошибка: ${response.code}")
                return@withContext null
            }
            
            val body = response.body?.bytes()
            if (body == null || body.isEmpty()) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Пустое тело ответа")
                return@withContext null
            }
            
            val contentType = response.header("Content-Type", "")
            val extension = getFileExtension(previewUrl, contentType)
            val fileName = "preview_${System.currentTimeMillis()}.$extension"
            
            val previewsDir = context.getExternalFilesDir(PREVIEW_FOLDER)
            if (previewsDir == null) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Не удалось получить директорию")
                return@withContext null
            }
            
            previewsDir.mkdirs()
            val file = File(previewsDir, fileName)
            
            FileOutputStream(file).use { out ->
                out.write(body)
            }
            
            if (file.length() == 0L || !file.exists()) {
                file.delete()
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Файл не сохранен")
                return@withContext null
            }
            
            return@withContext file
            
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка скачивания превью: ${e.message}")
            return@withContext null
        }
    }
    
    /**
     * Определить расширение файла
     */
    private fun getFileExtension(url: String, contentType: String?): String {
        val urlLower = url.lowercase()
        val urlExt = when {
            urlLower.contains(".jpg") || urlLower.contains(".jpeg") -> "jpg"
            urlLower.contains(".png") -> "png"
            urlLower.contains(".gif") -> "gif"
            urlLower.contains(".webp") -> "webp"
            urlLower.contains(".svg") -> "svg"
            else -> null
        }
        
        if (urlExt != null) return urlExt
        
        val contentTypeExt = when {
            contentType?.contains("jpeg") == true || contentType?.contains("jpg") == true -> "jpg"
            contentType?.contains("png") == true -> "png"
            contentType?.contains("gif") == true -> "gif"
            contentType?.contains("webp") == true -> "webp"
            else -> null
        }
        
        return contentTypeExt ?: "jpg"
    }
    
    /**
     * Разрешить относительный URL
     */
    private fun resolveUrl(url: String, baseUrl: String): String {
        return try {
            when {
                url.startsWith("http://") || url.startsWith("https://") -> url
                url.startsWith("//") -> "https:$url"
                url.startsWith("/") -> {
                    val base = URL(baseUrl)
                    URL(base.protocol, base.host, base.port, url).toString()
                }
                else -> {
                    val base = URL(baseUrl)
                    URL(base, url).toString()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error resolving URL", e)
            url
        }
    }
}

