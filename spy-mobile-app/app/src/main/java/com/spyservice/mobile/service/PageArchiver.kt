package com.spyservice.mobile.service

import android.content.Context
import android.util.Log
import android.webkit.WebView
import android.webkit.WebViewClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import kotlin.coroutines.resume

/**
 * Сервис для скачивания и архивирования веб-страниц
 */
class PageArchiver(private val context: Context) {
    
    companion object {
        private const val TAG = "PageArchiver"
        private const val TIMEOUT_SECONDS = 30L
    }
    
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .build()
    
    /**
     * Скачать страницу как ZIP архив
     */
    suspend fun downloadPageAsZip(url: String): File? = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Downloading page: $url")
            
            // Проверка на placeholder URL
            if (url.contains("example.com")) {
                Log.w(TAG, "Skipping archive download for placeholder URL")
                return@withContext null
            }
            
            // 1. Скачать HTML
            Log.d(TAG, "Step 1: Downloading HTML...")
            val htmlContent = downloadHtml(url)
            if (htmlContent.isNullOrEmpty()) {
                Log.e(TAG, "Failed to download HTML")
                return@withContext null
            }
            Log.d(TAG, "HTML downloaded, length: ${htmlContent.length}")
            
            // 2. Парсить HTML и найти ресурсы
            Log.d(TAG, "Step 2: Parsing HTML and extracting resources...")
            val document = Jsoup.parse(htmlContent, url)
            val resources = extractResources(document, url)
            Log.d(TAG, "Found ${resources.size} resources")
            
            // 3. Создать ZIP файл
            Log.d(TAG, "Step 3: Creating ZIP file...")
            val archivesDir = context.getExternalFilesDir("archives")
            if (archivesDir == null) {
                Log.e(TAG, "Cannot access external files directory")
                return@withContext null
            }
            archivesDir.mkdirs()
            val zipFile = File(archivesDir, "page_${System.currentTimeMillis()}.zip")
            
            ZipOutputStream(FileOutputStream(zipFile)).use { zipOut ->
                // Добавить HTML файл
                zipOut.putNextEntry(ZipEntry("index.html"))
                zipOut.write(htmlContent.toByteArray())
                zipOut.closeEntry()
                
                // Скачать и добавить ресурсы
                resources.forEach { resourceUrl ->
                    try {
                        val resourceContent = downloadResource(resourceUrl)
                        if (resourceContent != null) {
                            val fileName = getFileNameFromUrl(resourceUrl)
                            zipOut.putNextEntry(ZipEntry("resources/$fileName"))
                            zipOut.write(resourceContent)
                            zipOut.closeEntry()
                            Log.d(TAG, "Added resource: $fileName")
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to download resource: $resourceUrl", e)
                    }
                }
            }
            
            Log.d(TAG, "Page archived: ${zipFile.absolutePath}")
            zipFile
            
        } catch (e: Exception) {
            Log.e(TAG, "Error archiving page", e)
            null
        }
    }
    
    /**
     * Скачать HTML содержимое страницы
     */
    private suspend fun downloadHtml(url: String): String? = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(url)
                .addHeader("User-Agent", "Mozilla/5.0 (Android; Mobile) AppleWebKit/537.36")
                .build()
            
            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful) {
                response.body?.string()
            } else {
                Log.e(TAG, "HTTP error: ${response.code}")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error downloading HTML", e)
            null
        }
    }
    
    /**
     * Извлечь ссылки на ресурсы из HTML
     */
    private fun extractResources(document: Document, baseUrl: String): Set<String> {
        val resources = mutableSetOf<String>()
        
        // CSS файлы
        document.select("link[rel=stylesheet]").forEach { element ->
            val href = element.attr("href")
            if (href.isNotEmpty()) {
                resources.add(resolveUrl(baseUrl, href))
            }
        }
        
        // JavaScript файлы
        document.select("script[src]").forEach { element ->
            val src = element.attr("src")
            if (src.isNotEmpty()) {
                resources.add(resolveUrl(baseUrl, src))
            }
        }
        
        // Изображения
        document.select("img[src]").forEach { element ->
            val src = element.attr("src")
            if (src.isNotEmpty()) {
                resources.add(resolveUrl(baseUrl, src))
            }
        }
        
        return resources
    }
    
    /**
     * Скачать ресурс
     */
    private suspend fun downloadResource(url: String): ByteArray? = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(url)
                .addHeader("User-Agent", "Mozilla/5.0 (Android; Mobile) AppleWebKit/537.36")
                .build()
            
            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful) {
                response.body?.bytes()
            } else {
                null
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error downloading resource: $url", e)
            null
        }
    }
    
    /**
     * Разрешить относительный URL
     */
    private fun resolveUrl(baseUrl: String, relativeUrl: String): String {
        return try {
            if (relativeUrl.startsWith("http")) {
                relativeUrl
            } else {
                val base = java.net.URL(baseUrl)
                java.net.URL(base, relativeUrl).toString()
            }
        } catch (e: Exception) {
            relativeUrl
        }
    }
    
    /**
     * Получить имя файла из URL
     */
    private fun getFileNameFromUrl(url: String): String {
        return try {
            val path = java.net.URL(url).path
            val fileName = path.substringAfterLast('/')
            if (fileName.isEmpty()) "resource_${url.hashCode()}" else fileName
        } catch (e: Exception) {
            "resource_${url.hashCode()}"
        }
    }
}
