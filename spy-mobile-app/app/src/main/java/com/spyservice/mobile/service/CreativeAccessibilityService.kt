package com.spyservice.mobile.service

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.spyservice.mobile.utils.InAppLogger
import kotlinx.coroutines.delay
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Accessibility Service для извлечения данных из Chrome и YouTube
 */
class CreativeAccessibilityService : AccessibilityService() {
    
    companion object {
        private const val TAG = "CreativeAccessibilityService"
        private const val CHROME_PACKAGE = "com.android.chrome"
        private const val YOUTUBE_PACKAGE = "com.google.android.youtube"
        
        @Volatile
        private var instance: CreativeAccessibilityService? = null
        
        fun getInstance(): CreativeAccessibilityService? {
            return instance
        }
    }
    
    private var currentUrl: String? = null
    private var pageTitle: String? = null
    private var pageDescription: String? = null
    private var adLinks: List<String> = emptyList()
    
    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }
    
    override fun onDestroy() {
        super.onDestroy()
        instance = null
    }
    
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        
        val packageName = event.packageName?.toString()
        if (packageName != CHROME_PACKAGE && packageName != YOUTUBE_PACKAGE) {
            return
        }
        
        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED,
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                extractPageData()
            }
        }
    }

    override fun onInterrupt() {
    }
    
    /**
     * Получить текущий URL
     */
    suspend fun getCurrentUrl(): String? = suspendCancellableCoroutine { continuation ->
        try {
            extractPageData()
            continuation.resume(currentUrl)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting current URL", e)
            continuation.resume(null)
        }
    }
    
    /**
     * Получить заголовок страницы
     */
    suspend fun getPageTitle(): String? = suspendCancellableCoroutine { continuation ->
        try {
            extractPageData()
            continuation.resume(pageTitle)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting page title", e)
            continuation.resume(null)
        }
    }
    
    /**
     * Получить описание страницы
     */
    suspend fun getPageDescription(): String? = suspendCancellableCoroutine { continuation ->
        try {
            extractPageData()
            continuation.resume(pageDescription)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting page description", e)
            continuation.resume(null)
        }
    }
    
    /**
     * Найти ссылки на объявления
     */
    suspend fun findAdLinks(): List<String> = suspendCancellableCoroutine { continuation ->
        try {
            extractPageData()
            continuation.resume(adLinks)
        } catch (e: Exception) {
            Log.e(TAG, "Error finding ad links", e)
            continuation.resume(emptyList())
        }
    }
    
    /**
     * Перейти по URL
     */
    suspend fun navigateToUrl(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
            Log.d(TAG, "Navigated to: $url")
        } catch (e: Exception) {
            Log.e(TAG, "Error navigating to URL: $url", e)
        }
    }
    
    /**
     * Извлечь данные страницы
     */
    private fun extractPageData() {
        try {
            val rootNode = rootInActiveWindow ?: return
            
            // Извлечь URL из адресной строки
            currentUrl = extractUrlFromAddressBar(rootNode)
            
            // Извлечь заголовок страницы
            pageTitle = extractPageTitle(rootNode)
            
            // Извлечь описание
            pageDescription = extractPageDescription(rootNode)
            
            // Найти ссылки на объявления
            adLinks = extractAdLinks(rootNode)
            
            Log.d(TAG, "Extracted data - URL: $currentUrl, Title: $pageTitle")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting page data", e)
        }
    }
    
    /**
     * Извлечь URL из адресной строки
     */
    private fun extractUrlFromAddressBar(rootNode: AccessibilityNodeInfo): String? {
        val addressBarNodes = rootNode.findAccessibilityNodeInfosByViewId("com.android.chrome:id/url_bar")
        if (addressBarNodes.isNotEmpty()) {
            val rawUrl = addressBarNodes[0].text?.toString()
            addressBarNodes.forEach { it.recycle() }
            
            if (!rawUrl.isNullOrEmpty()) {
                return cleanUrl(rawUrl)
            }
        }
        
        val omniboxNodes = rootNode.findAccessibilityNodeInfosByViewId("com.android.chrome:id/omnibox_results_container")
        if (omniboxNodes.isNotEmpty()) {
            val rawUrl = omniboxNodes[0].text?.toString()
            omniboxNodes.forEach { it.recycle() }
            
            if (!rawUrl.isNullOrEmpty()) {
                return cleanUrl(rawUrl)
            }
        }
        
        return findUrlInAllNodes(rootNode)
    }
    
    /**
     * Очистить URL от лишних символов и форматирования
     */
    private fun cleanUrl(rawUrl: String): String? {
        try {
            var cleaned = rawUrl.trim()

            // Убираем лишние пробелы и символы
            cleaned = cleaned.replace(Regex("\\s+"), "")

            // Убираем возможные префиксы поиска или адресной строки
            cleaned = cleaned.removePrefix("Search or type web address")
                            .removePrefix("Поиск или веб-адрес")
                            .removePrefix("search")
                            .trim()

            // Если URL уже полный
            if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
                return cleaned
            }

            // Если URL начинается с www
            if (cleaned.startsWith("www.")) {
                return "https://$cleaned"
            }

            // Если это мобильная версия (mobile.site.com, m.site.com)
            if (cleaned.startsWith("mobile.") || cleaned.startsWith("m.")) {
                return "https://$cleaned"
            }

            // Если это поддомен (subdomain.site.com)
            if (cleaned.matches(Regex("^[a-zA-Z0-9-]+\\.[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}.*"))) {
                return "https://$cleaned"
            }

            // Если это просто домен с путем (site.com/page, site.com/path/to/page)
            if (cleaned.matches(Regex("^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/.*)?$"))) {
                return "https://$cleaned"
            }

            // Если это домен с портом (site.com:8080)
            if (cleaned.matches(Regex("^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}:[0-9]+(/.*)?$"))) {
                return "https://$cleaned"
            }

            // Если это IP адрес (192.168.1.1 или 192.168.1.1/path)
            if (cleaned.matches(Regex("^[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}(:[0-9]+)?(/.*)?$"))) {
                return "http://$cleaned" // Для IP используем http по умолчанию
            }

            // Если это localhost или локальный домен
            if (cleaned.startsWith("localhost") || cleaned.endsWith(".local")) {
                return "http://$cleaned"
            }

            // Если URL содержит домен без схемы (общий случай)
            if (cleaned.contains(".") && !cleaned.contains(" ") && cleaned.length > 3) {
                return "https://$cleaned"
            }

            return if (cleaned.isNotEmpty() && cleaned != rawUrl.trim()) cleaned else rawUrl.trim()

        } catch (e: Exception) {
            InAppLogger.e("AccessibilityService", "Error cleaning URL", e)
            return rawUrl.trim()
        }
    }
    
    /**
     * Поиск URL во всех узлах
     */
    private fun findUrlInAllNodes(node: AccessibilityNodeInfo): String? {
        try {
            val text = node.text?.toString()
            val contentDesc = node.contentDescription?.toString()

            // Проверяем text на URL
            if (!text.isNullOrEmpty()) {
                val cleanedText = text.trim()
                
                // Если уже полный URL
                if (cleanedText.startsWith("http://") || cleanedText.startsWith("https://")) {
                    return cleanedText
                }
                
                // Проверяем различные форматы доменов
                if (isValidDomainFormat(cleanedText)) {
                    return cleanUrl(cleanedText)
                }
            }

            // Проверяем contentDescription на URL
            if (!contentDesc.isNullOrEmpty()) {
                val cleanedDesc = contentDesc.trim()
                
                // Если уже полный URL
                if (cleanedDesc.startsWith("http://") || cleanedDesc.startsWith("https://")) {
                    return cleanedDesc
                }
                
                // Проверяем различные форматы доменов
                if (isValidDomainFormat(cleanedDesc)) {
                    return cleanUrl(cleanedDesc)
                }
            }

            // Рекурсивный поиск в дочерних узлах
            for (i in 0 until node.childCount) {
                val child = node.getChild(i)
                if (child != null) {
                    val childUrl = findUrlInAllNodes(child)
                    child.recycle()
                    if (childUrl != null) {
                        return childUrl
                    }
                }
            }

        } catch (e: Exception) {
            // Игнорируем ошибки
        }

        return null
    }

    /**
     * Проверить, является ли строка валидным форматом домена
     */
    private fun isValidDomainFormat(text: String): Boolean {
        if (text.length < 4 || text.contains(" ")) return false
        
        return when {
            // www.site.com
            text.startsWith("www.") -> true
            // mobile.site.com, m.site.com
            text.startsWith("mobile.") || text.startsWith("m.") -> true
            // subdomain.site.com
            text.matches(Regex("^[a-zA-Z0-9-]+\\.[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}.*")) -> true
            // site.com или site.com/path
            text.matches(Regex("^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/.*)?$")) -> true
            // site.com:8080
            text.matches(Regex("^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}:[0-9]+(/.*)?$")) -> true
            // IP адрес
            text.matches(Regex("^[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}(:[0-9]+)?(/.*)?$")) -> true
            // localhost или .local
            text.startsWith("localhost") || text.endsWith(".local") -> true
            else -> false
        }
    }
    
    /**
     * Извлечь заголовок страницы
     */
    private fun extractPageTitle(rootNode: AccessibilityNodeInfo): String? {
        // Поиск заголовка в различных элементах
        val titleSelectors = listOf(
            "h1", "title", ".title", "#title"
        )
        
        return findTextBySelectors(rootNode, titleSelectors)
    }
    
    /**
     * Извлечь описание страницы
     */
    private fun extractPageDescription(rootNode: AccessibilityNodeInfo): String? {
        try {
            val metaDescription = findMetaDescriptionInHTML(rootNode)
            if (metaDescription != null && metaDescription.length > 50) {
                return metaDescription
            }
            
            val htmlDescription = findDescriptionInAllNodes(rootNode)
            if (htmlDescription != null && htmlDescription.length > 50) {
                return htmlDescription
            }
            
            return null
            
        } catch (e: Exception) {
            return null
        }
    }
    
    /**
     * Найти описание во всех узлах (более агрессивный поиск)
     */
    private fun findDescriptionInAllNodes(node: AccessibilityNodeInfo): String? {
        return searchAllNodesForDescription(node, 0)
    }
    
    /**
     * Рекурсивный поиск описания во всех узлах
     */
    private fun searchAllNodesForDescription(node: AccessibilityNodeInfo, depth: Int): String? {
        if (depth > 10) return null // Ограничиваем глубину поиска
        
        val text = node.text?.toString()
        val contentDesc = node.contentDescription?.toString()
        
        if (text != null && text.length > 100) {
            if (text.contains("<meta", ignoreCase = true) && text.contains("description", ignoreCase = true)) {
                val metaContent = extractMetaContentFromHTML(text, "description")
                if (metaContent != null && metaContent.length > 50) {
                    return metaContent
                }
            }
            
            if (text.length > 100 && text.length < 1000 && 
                text.contains(" ") && 
                (text.contains(".") || text.contains(",")) &&
                !text.equals(extractPageTitle(rootInActiveWindow ?: return null), ignoreCase = true)) {
                return text
            }
        }
        
        // Аналогично для contentDescription
        contentDesc?.let { desc ->
            if (desc.length > 100 && desc.contains("<meta", ignoreCase = true)) {
                val metaContent = extractMetaContentFromHTML(desc, "description")
                if (metaContent != null && metaContent.length > 50) {
                    return metaContent
                }
            }
        }
        
        // Рекурсивный поиск в дочерних узлах
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (child != null) {
                val childDesc = searchAllNodesForDescription(child, depth + 1)
                child.recycle()
                if (childDesc != null) {
                    return childDesc
                }
            }
        }
        
        return null
    }
    
    /**
     * Извлечь ссылки на объявления
     */
    private fun extractAdLinks(rootNode: AccessibilityNodeInfo): List<String> {
        val links = mutableListOf<String>()
        
        try {
            // Поиск кликабельных элементов с URL
            findClickableNodes(rootNode) { node ->
                val text = node.text?.toString()
                val contentDescription = node.contentDescription?.toString()
                
                // Проверка на рекламные ссылки
                if (isAdLink(text) || isAdLink(contentDescription)) {
                    // Попытка извлечь URL из элемента
                    val url = extractUrlFromNode(node)
                    if (url != null) {
                        links.add(url)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting ad links", e)
        }
        
        return links.distinct()
    }
    
    /**
     * Найти текст по селекторам
     */
    private fun findTextBySelectors(rootNode: AccessibilityNodeInfo, selectors: List<String>): String? {
        // Простой поиск по тексту элементов
        return findTextInNodes(rootNode)
    }
    
    /**
     * Найти текст в узлах
     */
    private fun findTextInNodes(node: AccessibilityNodeInfo): String? {
        val text = node.text?.toString()
        if (!text.isNullOrEmpty() && text.length > 10) {
            return text
        }
        
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (child != null) {
                val childText = findTextInNodes(child)
                child.recycle()
                if (childText != null) {
                    return childText
                }
            }
        }
        
        return null
    }
    
    /**
     * Найти meta name="description" в HTML коде страницы
     */
    private fun findMetaDescriptionInHTML(node: AccessibilityNodeInfo): String? {
        return searchForMetaTag(node, "description")
    }
    
    /**
     * Рекурсивный поиск meta тега в узлах
     */
    private fun searchForMetaTag(node: AccessibilityNodeInfo, metaName: String): String? {
        val text = node.text?.toString()
        val contentDesc = node.contentDescription?.toString()
        val className = node.className?.toString()
        
        // Особое внимание к WebView узлам (где находится HTML)
        if (className?.contains("WebView", ignoreCase = true) == true) {
            val webViewHtml = getWebViewHTML(node)
            if (webViewHtml != null) {
                val metaContent = extractMetaContentFromHTML(webViewHtml, metaName)
                if (metaContent != null) {
                    return metaContent
                }
            }
        }
        
        // Проверяем текст узла на наличие HTML с meta тегами
        text?.let { nodeText ->
            if (nodeText.contains("<meta", ignoreCase = true) || nodeText.contains("description", ignoreCase = true)) {
                val metaContent = extractMetaContentFromHTML(nodeText, metaName)
                if (metaContent != null) {
                    return metaContent
                }
            }
        }
        
        // Проверяем contentDescription
        contentDesc?.let { nodeContentDesc ->
            if (nodeContentDesc.contains("<meta", ignoreCase = true) || nodeContentDesc.contains("description", ignoreCase = true)) {
                val metaContent = extractMetaContentFromHTML(nodeContentDesc, metaName)
                if (metaContent != null) {
                    return metaContent
                }
            }
        }
        
        // Рекурсивный поиск в дочерних узлах
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (child != null) {
                val childMeta = searchForMetaTag(child, metaName)
                child.recycle()
                if (childMeta != null) {
                    return childMeta
                }
            }
        }
        
        return null
    }
    
    /**
     * Получить HTML из WebView узла
     */
    private fun getWebViewHTML(webViewNode: AccessibilityNodeInfo): String? {
        try {
            // Пытаемся получить максимально полную информацию из WebView
            val text = webViewNode.text?.toString()
            val contentDesc = webViewNode.contentDescription?.toString()
            
            // Объединяем всю доступную информацию
            val combinedContent = buildString {
                text?.let { append(it).append(" ") }
                contentDesc?.let { append(it).append(" ") }
                
                // Добавляем информацию из дочерних узлов WebView
                for (i in 0 until webViewNode.childCount) {
                    val child = webViewNode.getChild(i)
                    if (child != null) {
                        child.text?.let { append(it).append(" ") }
                        child.contentDescription?.let { append(it).append(" ") }
                        child.recycle()
                    }
                }
            }
            
            return if (combinedContent.isNotBlank()) {
                combinedContent
            } else null
            
        } catch (e: Exception) {
            return null
        }
    }
    
    /**
     * Извлечь содержимое meta тега из HTML строки
     */
    private fun extractMetaContentFromHTML(html: String, metaName: String): String? {
        try {
            // Более агрессивные паттерны для поиска meta тегов
            val patterns = listOf(
                // Стандартный формат с любыми пробелами
                """<meta\s+name\s*=\s*["']$metaName["']\s+content\s*=\s*["']([^"']*?)["']\s*/??>""".toRegex(setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE)),
                // Обратный порядок атрибутов
                """<meta\s+content\s*=\s*["']([^"']*?)["']\s+name\s*=\s*["']$metaName["']\s*/??>""".toRegex(setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE)),
                // С дополнительными атрибутами в начале
                """<meta[^>]*name\s*=\s*["']$metaName["'][^>]*content\s*=\s*["']([^"']*?)["'][^>]*/??>""".toRegex(setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE)),
                // С дополнительными атрибутами в конце
                """<meta[^>]*content\s*=\s*["']([^"']*?)["'][^>]*name\s*=\s*["']$metaName["'][^>]*/??>""".toRegex(setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE)),
                // OpenGraph формат
                """<meta\s+property\s*=\s*["']og:$metaName["']\s+content\s*=\s*["']([^"']*?)["']\s*/??>""".toRegex(setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE)),
                // Поиск в любом месте строки с HTML entities
                """name\s*=\s*["']$metaName["'][^>]*content\s*=\s*["']([^"']*?)["']""".toRegex(setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE)),
                // Поиск content перед name
                """content\s*=\s*["']([^"']*?)["'][^>]*name\s*=\s*["']$metaName["']""".toRegex(setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE))
            )
            
            for ((index, pattern) in patterns.withIndex()) {
                val match = pattern.find(html)
                if (match != null && match.groupValues.size > 1) {
                    val content = match.groupValues[1].trim()
                    if (content.isNotEmpty() && content.length > 5) {
                        val decodedContent = decodeHtmlEntities(content)
                        return decodedContent
                    }
                }
            }
            
            val simplePattern = """$metaName["'][^>]*content\s*=\s*["']([^"']+)["']""".toRegex(RegexOption.IGNORE_CASE)
            val simpleMatch = simplePattern.find(html)
            if (simpleMatch != null && simpleMatch.groupValues.size > 1) {
                val content = simpleMatch.groupValues[1].trim()
                if (content.isNotEmpty() && content.length > 10) {
                    val decodedContent = decodeHtmlEntities(content)
                    return decodedContent
                }
            }
        } catch (e: Exception) {
            // Игнорируем ошибки
        }
        
        return null
    }
    
    /**
     * Декодировать HTML entities
     */
    private fun decodeHtmlEntities(text: String): String {
        return text
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&mdash;", "—")
            .replace("&ndash;", "–")
            .replace("&nbsp;", " ")
            .replace("&#x27;", "'")
            .replace("&#x2F;", "/")
    }
    
    /**
     * Найти кликабельные узлы
     */
    private fun findClickableNodes(node: AccessibilityNodeInfo, callback: (AccessibilityNodeInfo) -> Unit) {
        if (node.isClickable) {
            callback(node)
        }
        
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (child != null) {
                findClickableNodes(child, callback)
                child.recycle()
            }
        }
    }
    
    /**
     * Проверить, является ли ссылка рекламной
     */
    private fun isAdLink(text: String?): Boolean {
        if (text.isNullOrEmpty()) return false
        
        val adKeywords = listOf(
            "ad", "advertisement", "sponsored", "promo", "offer",
            "реклама", "объявление", "предложение"
        )
        
        return adKeywords.any { keyword ->
            text.contains(keyword, ignoreCase = true)
        }
    }
    
    /**
     * Извлечь URL из узла
     */
    private fun extractUrlFromNode(node: AccessibilityNodeInfo): String? {
        // Попытка получить URL из различных атрибутов
        val text = node.text?.toString()
        val contentDescription = node.contentDescription?.toString()
        
        return when {
            text?.startsWith("http") == true -> text
            contentDescription?.startsWith("http") == true -> contentDescription
            else -> null
        }
    }
    
    /**
     * Прокрутить страницу вниз
     * @param distance Расстояние прокрутки в пикселях (по умолчанию 80% высоты экрана)
     * @return true если прокрутка выполнена успешно
     */
    fun scrollPageDown(distance: Int = -1): Boolean {
        return try {
            val rootNode = rootInActiveWindow ?: return false
            
            // Получаем размеры экрана для расчета расстояния прокрутки
            val scrollDistance = if (distance > 0) {
                distance
            } else {
                // По умолчанию прокручиваем на 80% высоты экрана
                val bounds = android.graphics.Rect()
                rootNode.getBoundsInScreen(bounds)
                (bounds.height() * 0.8).toInt()
            }
            
            // Прокрутка вниз через ACTION_SCROLL_FORWARD (доступно с API 23)
            val scrollAction = AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
            val success = rootNode.performAction(scrollAction)
            
            rootNode.recycle()
            
            if (success) {
                Log.d(TAG, "Page scrolled down by $scrollDistance pixels")
            } else {
                Log.w(TAG, "Failed to scroll page down")
            }
            
            success
        } catch (e: Exception) {
            Log.e(TAG, "Error scrolling page down", e)
            false
        }
    }
    
    /**
     * Прокрутить страницу вверх
     * @return true если прокрутка выполнена успешно
     */
    fun scrollPageUp(): Boolean {
        return try {
            val rootNode = rootInActiveWindow ?: return false
            
            // Прокрутка вверх через ACTION_SCROLL_BACKWARD (доступно с API 23)
            val scrollAction = AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
            val success = rootNode.performAction(scrollAction)
            
            rootNode.recycle()
            
            if (success) {
                Log.d(TAG, "Page scrolled up")
            } else {
                Log.w(TAG, "Failed to scroll page up")
            }
            
            success
        } catch (e: Exception) {
            Log.e(TAG, "Error scrolling page up", e)
            false
        }
    }
    
    /**
     * Прокрутить страницу в начало
     */
    suspend fun scrollToTop(): Boolean {
        return try {
            var scrolled = true
            var attempts = 0
            val maxAttempts = 20 // Максимальное количество попыток прокрутки вверх
            
            // Прокручиваем вверх до тех пор, пока это возможно
            while (scrolled && attempts < maxAttempts) {
                scrolled = scrollPageUp()
                if (scrolled) {
                    delay(200) // Небольшая задержка между прокрутками
                }
                attempts++
            }
            
            Log.d(TAG, "Scrolled to top after $attempts attempts")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error scrolling to top", e)
            false
        }
    }
}


