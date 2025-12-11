package com.spyservice.mobile.service

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.spyservice.mobile.utils.InAppLogger
import kotlinx.coroutines.delay
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Accessibility Service для извлечения данных из Chrome и YouTube
 */
class CreativeAccessibilityService : AccessibilityService() {
    
    companion object {
        private const val TAG = "CreativeAccessibilityService"
        
        // Список поддерживаемых браузеров
        private val SUPPORTED_BROWSERS = setOf(
            "com.android.chrome",              // Chrome
            "com.chrome.browser",              // Chrome альтернативный
            "com.chrome.dev",                  // Chrome Dev
            "com.chrome.canary",               // Chrome Canary
            "com.google.android.apps.chrome",  // Chrome системный
            "org.mozilla.firefox",             // Firefox
            "org.mozilla.fennec_fdroid",       // Firefox F-Droid
            "com.microsoft.emmx",               // Edge
            "com.opera.browser",               // Opera
            "com.opera.mini.native",           // Opera Mini
            "com.brave.browser",               // Brave
            "com.vivaldi.browser",             // Vivaldi
            "com.samsung.android.sbrowser",    // Samsung Internet
            "com.mi.globalbrowser",            // Mi Browser
            "com.huawei.browser",              // Huawei Browser
            "com.sec.android.app.sbrowser",    // Samsung Browser
            "com.uc.browser.en",               // UC Browser
            "com.baidu.browser.apps",          // Baidu Browser
            "com.yandex.browser",              // Yandex Browser
            "com.google.android.youtube"       // YouTube (для рекламы)
        )
        
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
        
        // Проверяем поддерживаемые браузеры
        if (packageName == null || !SUPPORTED_BROWSERS.contains(packageName)) {
            return
        }
        
        // Обрабатываем события изменения страницы
        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                // Страница изменилась - обновляем данные
                extractPageData()
            }
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                // Контент страницы изменился - обновляем URL если нужно
                // Не обновляем слишком часто, чтобы не перегружать систему
                if (currentUrl.isNullOrEmpty()) {
                    extractPageData()
                }
            }
            AccessibilityEvent.TYPE_VIEW_TEXT_SELECTION_CHANGED -> {
                // Текст выделен - может быть URL в адресной строке
                if (currentUrl.isNullOrEmpty()) {
                    extractPageData()
                }
            }
        }
    }

    override fun onInterrupt() {
    }
    
    /**
     * Получить текущий URL с повторными попытками
     */
    suspend fun getCurrentUrl(): String? = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
        try {
            var url: String? = null
            var attempts = 0
            val maxAttempts = 5
            val delayMs = 300L
            
            // Пробуем несколько раз с задержками
            while (attempts < maxAttempts && url.isNullOrEmpty()) {
                extractPageData()
                url = currentUrl
                
                if (url.isNullOrEmpty()) {
                    attempts++
                    if (attempts < maxAttempts) {
                        delay(delayMs)
                    }
                }
            }
            
            // Логируем результат
            if (url.isNullOrEmpty()) {
                InAppLogger.w("AccessibilityService", "⚠️ URL не извлечен после $maxAttempts попыток")
                Log.w(TAG, "Failed to extract URL after $maxAttempts attempts")
            } else {
                InAppLogger.d("AccessibilityService", "✅ URL извлечен: ${url.take(80)}...")
                Log.d(TAG, "URL extracted: $url")
            }
            
            url
        } catch (e: Exception) {
            Log.e(TAG, "Error getting current URL", e)
            InAppLogger.e("AccessibilityService", "❌ Ошибка получения URL: ${e.message}", e)
            null
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
            val rootNode = rootInActiveWindow ?: run {
                Log.w(TAG, "rootInActiveWindow is null")
                return
            }
            
            // Извлечь URL из адресной строки (приоритет)
            val extractedUrl = extractUrlFromAddressBar(rootNode)
            if (!extractedUrl.isNullOrEmpty()) {
                currentUrl = extractedUrl
                InAppLogger.d("AccessibilityService", "📋 URL обновлен: ${currentUrl?.take(80)}...")
            } else {
                // Если URL не найден, но был ранее - сохраняем старый
                if (currentUrl.isNullOrEmpty()) {
                    InAppLogger.w("AccessibilityService", "⚠️ URL не найден в адресной строке")
                }
            }
            
            // Извлечь заголовок страницы
            val extractedTitle = extractPageTitle(rootNode)
            if (!extractedTitle.isNullOrEmpty()) {
                pageTitle = extractedTitle
            }
            
            // Извлечь описание
            val extractedDesc = extractPageDescription(rootNode)
            if (!extractedDesc.isNullOrEmpty()) {
                pageDescription = extractedDesc
            }
            
            // Найти ссылки на объявления
            adLinks = extractAdLinks(rootNode)
            
            Log.d(TAG, "Extracted data - URL: ${currentUrl?.take(100)}, Title: ${pageTitle?.take(50)}")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting page data", e)
            InAppLogger.e("AccessibilityService", "❌ Ошибка извлечения данных страницы: ${e.message}", e)
        }
    }
    
    /**
     * Извлечь URL из адресной строки (улучшенная версия с поддержкой разных браузеров)
     */
    private fun extractUrlFromAddressBar(rootNode: AccessibilityNodeInfo): String? {
        // Список возможных ID адресной строки для разных браузеров и версий
        val addressBarIds = listOf(
            "com.android.chrome:id/url_bar",           // Chrome стандартный
            "com.chrome.browser:id/url_bar",           // Chrome альтернативный
            "com.android.chrome:id/omnibox_text_view", // Chrome omnibox
            "com.android.chrome:id/location_bar",       // Chrome location bar
            "org.mozilla.firefox:id/mozac_browser_toolbar_url_view", // Firefox
            "com.microsoft.emmx:id/url_bar",          // Edge
            "com.opera.browser:id/url_field",          // Opera
            "com.brave.browser:id/url_bar",            // Brave
            "com.vivaldi.browser:id/url_bar"            // Vivaldi
        )
        
        // Пробуем найти URL по известным ID
        for (addressBarId in addressBarIds) {
            try {
                val addressBarNodes = rootNode.findAccessibilityNodeInfosByViewId(addressBarId)
                if (addressBarNodes.isNotEmpty()) {
                    val rawUrl = addressBarNodes[0].text?.toString()
                    addressBarNodes.forEach { it.recycle() }
                    
                    if (!rawUrl.isNullOrEmpty()) {
                        val cleaned = cleanUrl(rawUrl)
                        if (cleaned != null) {
                            InAppLogger.d("AccessibilityService", "✅ URL найден через ID: $addressBarId")
                            return cleaned
                        }
                    }
                }
            } catch (e: Exception) {
                // Игнорируем ошибки для конкретного ID
            }
        }
        
        // Альтернативный способ: поиск по тексту "http" или "https"
        val urlFromText = findUrlByText(rootNode)
        if (urlFromText != null) {
            InAppLogger.d("AccessibilityService", "✅ URL найден через поиск по тексту")
            return urlFromText
        }
        
        // Поиск в contentDescription
        val urlFromContentDesc = findUrlByContentDescription(rootNode)
        if (urlFromContentDesc != null) {
            InAppLogger.d("AccessibilityService", "✅ URL найден через contentDescription")
            return urlFromContentDesc
        }
        
        // Последняя попытка: поиск во всех узлах
        InAppLogger.d("AccessibilityService", "🔍 Поиск URL во всех узлах...")
        return findUrlInAllNodes(rootNode)
    }
    
    /**
     * Найти URL по тексту содержащему "http" или "https"
     */
    private fun findUrlByText(rootNode: AccessibilityNodeInfo): String? {
        try {
            val allNodes = mutableListOf<AccessibilityNodeInfo>()
            collectAllNodes(rootNode, allNodes)
            
            for (node in allNodes) {
                val text = node.text?.toString()
                if (!text.isNullOrEmpty()) {
                    // Ищем полный URL
                    val urlMatch = Regex("https?://[^\\s]+").find(text)
                    if (urlMatch != null) {
                        val url = urlMatch.value.trim()
                        if (isValidUrl(url)) {
                            allNodes.forEach { it.recycle() }
                            return url
                        }
                    }
                    
                    // Ищем домен без схемы
                    val domainMatch = Regex("(www\\.)?[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/[^\\s]*)?").find(text)
                    if (domainMatch != null) {
                        val domain = domainMatch.value.trim()
                        val cleaned = cleanUrl(domain)
                        if (cleaned != null && isValidUrl(cleaned)) {
                            allNodes.forEach { it.recycle() }
                            return cleaned
                        }
                    }
                }
            }
            
            allNodes.forEach { it.recycle() }
        } catch (e: Exception) {
            Log.e(TAG, "Error finding URL by text", e)
        }
        
        return null
    }
    
    /**
     * Найти URL в contentDescription
     */
    private fun findUrlByContentDescription(rootNode: AccessibilityNodeInfo): String? {
        try {
            val allNodes = mutableListOf<AccessibilityNodeInfo>()
            collectAllNodes(rootNode, allNodes)
            
            for (node in allNodes) {
                val contentDesc = node.contentDescription?.toString()
                if (!contentDesc.isNullOrEmpty()) {
                    val urlMatch = Regex("https?://[^\\s]+").find(contentDesc)
                    if (urlMatch != null) {
                        val url = urlMatch.value.trim()
                        if (isValidUrl(url)) {
                            allNodes.forEach { it.recycle() }
                            return url
                        }
                    }
                }
            }
            
            allNodes.forEach { it.recycle() }
        } catch (e: Exception) {
            Log.e(TAG, "Error finding URL by contentDescription", e)
        }
        
        return null
    }
    
    /**
     * Собрать все узлы в список
     */
    private fun collectAllNodes(node: AccessibilityNodeInfo, list: MutableList<AccessibilityNodeInfo>) {
        list.add(node)
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (child != null) {
                collectAllNodes(child, list)
            }
        }
    }
    
    /**
     * Проверить валидность URL
     */
    private fun isValidUrl(url: String): Boolean {
        return try {
            android.net.Uri.parse(url)
            url.startsWith("http://") || url.startsWith("https://")
        } catch (e: Exception) {
            false
        }
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
    
    /**
     * Открыть меню Chrome через AccessibilityService
     * Поиск кнопки меню осуществляется по ID (независимо от языка)
     */
    fun openChromeMenu(): Boolean {
        return try {
            val rootNode = rootInActiveWindow ?: return false
            
            // Возможные ID для кнопки меню Chrome (трехточечное меню)
            val menuButtonIds = listOf(
                "com.android.chrome:id/menu_button",
                "com.android.chrome:id/toolbar_menu_button",
                "com.android.chrome:id/menu_anchor",
                "com.chrome.browser:id/menu_button",
                "com.chrome.browser:id/toolbar_menu_button"
            )
            
            // Ищем кнопку меню по ID
            for (menuId in menuButtonIds) {
                try {
                    val menuNodes = rootNode.findAccessibilityNodeInfosByViewId(menuId)
                    if (menuNodes.isNotEmpty()) {
                        val menuNode = menuNodes[0]
                        if (menuNode.isClickable) {
                            val success = menuNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                            menuNodes.forEach { it.recycle() }
                            rootNode.recycle()
                            
                            if (success) {
                                return true
                            }
                        }
                        menuNodes.forEach { it.recycle() }
                    }
                } catch (e: Exception) {
                    // Продолжаем поиск
                }
            }
            
            rootNode.recycle()
            InAppLogger.e("AccessibilityService", "❌ Не удалось найти кнопку меню Chrome по ID")
            false
        } catch (e: Exception) {
            InAppLogger.e("AccessibilityService", "❌ Ошибка открытия меню Chrome: ${e.message}", e)
            false
        }
    }
    
    /**
     * Активировать функцию "Скачать страницу" в Chrome
     * Использует встроенную функцию Chrome для сохранения страницы (MHTML)
     * Поиск кнопок осуществляется по ID, а не по тексту (для поддержки разных языков)
     */
    suspend fun savePageInChrome(): Boolean {
        return try {
            // Открываем меню Chrome
            delay(500)
            if (!openChromeMenu()) {
                InAppLogger.e("AccessibilityService", "❌ Не удалось открыть меню Chrome")
                return false
            }
            
            delay(3000) // Ждем 3 секунды после открытия меню перед нажатием на кнопку скачивания
            
            // Ищем кнопку "Скачать страницу" по ID (независимо от языка)
            val rootNode = rootInActiveWindow ?: return false
            
            // Возможные ID для кнопки "Скачать страницу" в Chrome (только по ID, без текста)
            // Рабочий ID: com.android.chrome:id/button_three
            val downloadPageIds = listOf(
                "com.android.chrome:id/button_three",  // Рабочий ID кнопки "Скачать страницу"
                "com.android.chrome:id/download_page",
                "com.android.chrome:id/menu_item_download_page",
                "com.android.chrome:id/menu_item_download",
                "com.android.chrome:id/download",
                "com.android.chrome:id/offline_page",
                "com.android.chrome:id/save_page",
                "com.chrome.browser:id/download_page",
                "com.chrome.browser:id/menu_item_download_page",
                "com.chrome.browser:id/menu_item_download",
                "com.chrome.browser:id/download",
                "com.chrome.browser:id/offline_page",
                "com.chrome.browser:id/save_page"
            )
            
            // Сначала пробуем найти по ID
            for (downloadId in downloadPageIds) {
                try {
                    val downloadNodes = rootNode.findAccessibilityNodeInfosByViewId(downloadId)
                    if (downloadNodes.isNotEmpty()) {
                        val downloadNode = downloadNodes[0]
                        val isClickable = downloadNode.isClickable
                        
                        // Сохраняем данные перед переработкой узлов
                        if (isClickable) {
                            // Выполняем действие ДО переработки узлов
                            val success = downloadNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                            
                            // Перерабатываем узлы после использования
                            downloadNodes.forEach { it.recycle() }
                            
                            if (success) {
                                // Перерабатываем rootNode только после успешного клика
                                rootNode.recycle()
                                delay(1000)
                                handleDownloadConfirmationDialogs()
                                return true
                            }
                        } else {
                            // Перерабатываем узлы если не кликабельный
                            downloadNodes.forEach { it.recycle() }
                        }
                    }
                } catch (e: Exception) {
                    InAppLogger.e("AccessibilityService", "❌ Ошибка при поиске кнопки по ID $downloadId: ${e.message}")
                    // Продолжаем поиск
                }
            }
            
            // Если не нашли по ID, ищем более точно по всем элементам меню
            val allNodes = mutableListOf<AccessibilityNodeInfo>()
            collectAllNodes(rootNode, allNodes)
            
            // Логируем ВСЕ элементы меню с их ID для отладки (не только кликабельные)
            InAppLogger.d("AccessibilityService", "📋 Всего элементов в меню: ${allNodes.size}")
            for (node in allNodes) {
                try {
                    val viewId = node.viewIdResourceName
                    val className = node.className?.toString()
                    val isClickable = node.isClickable
                    val text = node.text?.toString()
                    if (viewId != null) {
                        InAppLogger.d("AccessibilityService", "📌 Элемент: ID=$viewId, класс=$className, кликабельный=$isClickable, текст='$text'")
                    }
                } catch (e: Exception) {
                    // Игнорируем ошибки при логировании
                }
            }
            
            // Логируем все кликабельные элементы с их ID для отладки
            val clickableNodes = allNodes.filter { it.isClickable }
            InAppLogger.d("AccessibilityService", "🔘 Кликабельных элементов: ${clickableNodes.size}")
            
            // Ищем элемент с ID содержащим "download_page" или "download" (но не просто "download" без "page")
            // Это должно быть именно скачивание страницы, а не обычное скачивание файла
            var foundNode: AccessibilityNodeInfo? = null
            var foundViewId: String? = null
            
            for (node in clickableNodes) {
                try {
                    val viewId = node.viewIdResourceName?.lowercase() ?: ""
                    // Ищем именно "download_page" или "download" в контексте меню страницы
                    if ((viewId.contains("download_page") || viewId.contains("menu_item_download")) &&
                        !viewId.contains("download_manager") && // Исключаем менеджер загрузок
                        !viewId.contains("download_history")) {  // Исключаем историю загрузок
                        foundNode = node
                        foundViewId = node.viewIdResourceName
                        break
                    }
                } catch (e: Exception) {
                    // Пропускаем проблемные узлы
                    continue
                }
            }
            
            if (foundNode != null && foundViewId != null) {
                try {
                    InAppLogger.d("AccessibilityService", "✅ Найдена кнопка 'Скачать страницу': ID=$foundViewId")
                    
                    val success = foundNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    
                    // Перерабатываем все узлы после использования
                    allNodes.forEach { 
                        try { it.recycle() } catch (e: Exception) { /* Игнорируем ошибки переработки */ }
                    }
                    try { rootNode.recycle() } catch (e: Exception) { /* Игнорируем ошибки переработки */ }
                    
                    if (success) {
                        delay(1000)
                        handleDownloadConfirmationDialogs()
                        return true
                    }
                } catch (e: Exception) {
                    InAppLogger.e("AccessibilityService", "❌ Ошибка при клике на кнопку: ${e.message}", e)
                    // Перерабатываем узлы при ошибке
                    allNodes.forEach { 
                        try { it.recycle() } catch (ex: Exception) { /* Игнорируем */ }
                    }
                    try { rootNode.recycle() } catch (ex: Exception) { /* Игнорируем */ }
                }
            }
            
            // Если не нашли по точным ID, пробуем найти элемент с ID содержащим "page" и "download" (только по ID, без текста)
            var pageDownloadNode: AccessibilityNodeInfo? = null
            var pageDownloadViewId: String? = null
            
            for (node in clickableNodes) {
                try {
                    val viewId = node.viewIdResourceName?.lowercase() ?: ""
                    
                    // Ищем элемент который связан со страницей и скачиванием ТОЛЬКО по ID
                    if ((viewId.contains("page") && (viewId.contains("download") || viewId.contains("save"))) ||
                        (viewId.contains("offline") && viewId.contains("page")) ||
                        (viewId.contains("save") && viewId.contains("page"))) {
                        pageDownloadNode = node
                        pageDownloadViewId = node.viewIdResourceName
                        break
                    }
                } catch (e: Exception) {
                    // Пропускаем проблемные узлы
                    continue
                }
            }
            
            if (pageDownloadNode != null && pageDownloadViewId != null) {
                try {
                    InAppLogger.d("AccessibilityService", "✅ Найдена кнопка 'Скачать страницу' (поиск по ID паттерну): ID=$pageDownloadViewId")
                    
                    val success = pageDownloadNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    
                    // Перерабатываем все узлы после использования
                    allNodes.forEach { 
                        try { it.recycle() } catch (e: Exception) { /* Игнорируем ошибки переработки */ }
                    }
                    try { rootNode.recycle() } catch (e: Exception) { /* Игнорируем ошибки переработки */ }
                    
                    if (success) {
                        delay(1000)
                        handleDownloadConfirmationDialogs()
                        return true
                    }
                } catch (e: Exception) {
                    InAppLogger.e("AccessibilityService", "❌ Ошибка при клике на кнопку (паттерн): ${e.message}", e)
                    // Перерабатываем узлы при ошибке
                    allNodes.forEach { 
                        try { it.recycle() } catch (ex: Exception) { /* Игнорируем */ }
                    }
                    try { rootNode.recycle() } catch (ex: Exception) { /* Игнорируем */ }
                }
            }
            
            // Логируем все кликабельные элементы с подробной информацией
            InAppLogger.d("AccessibilityService", "📋 Список всех кликабельных элементов меню:")
            for ((index, node) in clickableNodes.withIndex()) {
                try {
                    val viewId = node.viewIdResourceName
                    val className = node.className?.toString()
                    val text = node.text?.toString()
                    val contentDesc = node.contentDescription?.toString()
                    val bounds = android.graphics.Rect()
                    node.getBoundsInScreen(bounds)
                    
                    InAppLogger.d("AccessibilityService", "  [$index] ID=$viewId, класс=$className, текст='$text', описание='$contentDesc', координаты=(${bounds.left},${bounds.top})-(${bounds.right},${bounds.bottom})")
                } catch (e: Exception) {
                    InAppLogger.d("AccessibilityService", "  [$index] Ошибка при чтении элемента: ${e.message}")
                }
            }
            
            // Последняя попытка: пробуем найти элемент по позиции в меню
            // Обычно кнопка "Скачать страницу" находится внизу меню (последний или предпоследний элемент)
            // Сортируем элементы по Y координате (снизу вверх) и пробуем последние элементы
            val nodesWithBounds = mutableListOf<Pair<AccessibilityNodeInfo, android.graphics.Rect>>()
            
            for (node in clickableNodes) {
                try {
                    val bounds = android.graphics.Rect()
                    node.getBoundsInScreen(bounds)
                    if (!bounds.isEmpty) {
                        nodesWithBounds.add(Pair(node, bounds))
                    }
                } catch (e: Exception) {
                    continue
                }
            }
            
            // Сортируем по Y координате (снизу вверх - последние элементы меню)
            nodesWithBounds.sortByDescending { it.second.bottom }
            
            // Пробуем последние 3 элемента меню (обычно кнопка скачивания внизу)
            val candidatesToTry = nodesWithBounds.take(3)
            
            InAppLogger.d("AccessibilityService", "🔄 Пробуем кликнуть по последним ${candidatesToTry.size} элементам меню (снизу вверх)")
            
            for ((index, pair) in candidatesToTry.withIndex()) {
                val (node, bounds) = pair
                try {
                    val viewId = node.viewIdResourceName
                    val className = node.className?.toString()
                    InAppLogger.d("AccessibilityService", "  Попытка [$index]: ID=$viewId, класс=$className, координаты=(${bounds.left},${bounds.top})-(${bounds.right},${bounds.bottom})")
                    
                    // Пробуем кликнуть по координатам центра элемента (более надежно)
                    val centerX = bounds.centerX()
                    val centerY = bounds.centerY()
                    
                    // Сначала пробуем обычный клик
                    var success = node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    
                    // Если не сработало, пробуем через GestureDescription
                    if (!success) {
                        try {
                            val path = android.graphics.Path().apply {
                                moveTo(centerX.toFloat(), centerY.toFloat())
                            }
                            
                            val gesture = android.accessibilityservice.GestureDescription.Builder()
                            gesture.addStroke(
                                android.accessibilityservice.GestureDescription.StrokeDescription(
                                    path, 0, 100
                                )
                            )
                            
                            success = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Main) {
                                kotlinx.coroutines.suspendCancellableCoroutine { continuation ->
                                    var completed = false
                                    val callback = object : android.accessibilityservice.AccessibilityService.GestureResultCallback() {
                                        override fun onCompleted(gestureDescription: android.accessibilityservice.GestureDescription?) {
                                            if (!completed) {
                                                completed = true
                                                continuation.resume(true)
                                            }
                                        }
                                        override fun onCancelled(gestureDescription: android.accessibilityservice.GestureDescription?) {
                                            if (!completed) {
                                                completed = true
                                                continuation.resume(false)
                                            }
                                        }
                                    }
                                    val handler = android.os.Handler(android.os.Looper.getMainLooper())
                                    dispatchGesture(gesture.build(), callback, handler)
                                    handler.postDelayed({
                                        if (!completed) {
                                            completed = true
                                            continuation.resume(false)
                                        }
                                    }, 1000)
                                }
                            }
                        } catch (e: Exception) {
                            InAppLogger.e("AccessibilityService", "❌ Ошибка GestureDescription: ${e.message}")
                        }
                    }
                    
                    if (success) {
                        InAppLogger.d("AccessibilityService", "✅ Клик выполнен успешно на элементе [$index]")
                        
                        // Перерабатываем все узлы после использования
                        allNodes.forEach { 
                            try { it.recycle() } catch (e: Exception) { /* Игнорируем ошибки переработки */ }
                        }
                        try { rootNode.recycle() } catch (e: Exception) { /* Игнорируем ошибки переработки */ }
                        
                        delay(1000)
                        handleDownloadConfirmationDialogs()
                        return true
                    }
                } catch (e: Exception) {
                    InAppLogger.e("AccessibilityService", "❌ Ошибка при клике на элемент [$index]: ${e.message}", e)
                }
            }
            
            // Перерабатываем все узлы перед выходом
            allNodes.forEach { 
                try { it.recycle() } catch (e: Exception) { /* Игнорируем ошибки переработки */ }
            }
            try { rootNode.recycle() } catch (e: Exception) { /* Игнорируем ошибки переработки */ }
            
            InAppLogger.e("AccessibilityService", "❌ Не удалось найти кнопку 'Скачать страницу' в меню Chrome по ID")
            false
        } catch (e: Exception) {
            InAppLogger.e("AccessibilityService", "❌ Ошибка сохранения страницы в Chrome: ${e.message}", e)
            false
        }
    }
    
    /**
     * Обработать диалоги подтверждения скачивания в Chrome
     * Ищет кнопки подтверждения по ID (независимо от языка)
     */
    private suspend fun handleDownloadConfirmationDialogs(): Boolean {
        return try {
            var handled = false
            var attempts = 0
            val maxAttempts = 5
            
            while (!handled && attempts < maxAttempts) {
                attempts++
                delay(500)
                
                val rootNode = rootInActiveWindow ?: break
                
                // Возможные ID для кнопок подтверждения в диалогах Chrome/Android
                val confirmButtonIds = listOf(
                    "android:id/button1",  // Обычно это "OK" или положительная кнопка
                    "android:id/button2",  // Иногда это "OK"
                    "com.android.chrome:id/positive_button",
                    "com.android.chrome:id/ok_button",
                    "com.android.chrome:id/allow_button",
                    "com.chrome.browser:id/positive_button"
                )
                
                // Сначала пробуем найти по ID
                for (buttonId in confirmButtonIds) {
                    try {
                        val buttonNodes = rootNode.findAccessibilityNodeInfosByViewId(buttonId)
                        if (buttonNodes.isNotEmpty()) {
                            val buttonNode = buttonNodes[0]
                            if (buttonNode.isClickable) {
                                val success = buttonNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                                buttonNodes.forEach { it.recycle() }
                                rootNode.recycle()
                                
                                if (success) {
                                    return true
                                }
                            }
                            buttonNodes.forEach { it.recycle() }
                        }
                    } catch (e: Exception) {
                        // Продолжаем поиск
                    }
                }
                
                // Если не нашли по ID, пробуем найти положительную кнопку по позиции
                val allNodes = mutableListOf<AccessibilityNodeInfo>()
                collectAllNodes(rootNode, allNodes)
                
                val clickableNodes = allNodes.filter { it.isClickable }
                // Обычно положительная кнопка (OK/Download) находится справа или внизу
                val confirmButton = clickableNodes.lastOrNull()
                
                if (confirmButton != null) {
                    val success = confirmButton.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    allNodes.forEach { it.recycle() }
                    rootNode.recycle()
                    
                    if (success) {
                        return true
                    }
                }
                
                allNodes.forEach { it.recycle() }
                rootNode.recycle()
            }
            
            handled
        } catch (e: Exception) {
            false
        }
    }
}


