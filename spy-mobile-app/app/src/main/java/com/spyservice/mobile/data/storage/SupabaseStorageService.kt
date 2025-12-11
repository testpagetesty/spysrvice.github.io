package com.spyservice.mobile.data.storage

import android.content.Context
import com.spyservice.mobile.data.api.ApiClient
import com.spyservice.mobile.utils.InAppLogger
import com.spyservice.mobile.utils.Logger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File

/**
 * Сервис для прямой загрузки файлов в Supabase Storage
 * Обходит ограничения Vercel API (4.5 MB) загружая файлы напрямую в Supabase
 */
class SupabaseStorageService(private val context: Context) {
    
    private val supabaseUrl = ApiClient.SUPABASE_URL
    private val supabaseAnonKey = ApiClient.SUPABASE_ANON_KEY
    private val bucketName = "creatives-media"
    
    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(600, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(600, java.util.concurrent.TimeUnit.SECONDS)
        .writeTimeout(600, java.util.concurrent.TimeUnit.SECONDS)
        .build()
    
    /**
     * Загрузить файл напрямую в Supabase Storage
     * @param file Файл для загрузки
     * @param path Путь в Storage (например, "archives/filename.zip")
     * @return Public URL загруженного файла или null в случае ошибки
     */
    suspend fun uploadFile(file: File, path: String): String? {
        return withContext(Dispatchers.IO) {
            try {
                if (!file.exists() || file.length() == 0L) {
                    InAppLogger.e(Logger.Tags.SERVICE, "❌ Файл не существует или пустой: ${file.absolutePath}")
                    return@withContext null
                }
            
            val fileSizeMB = file.length() / (1024.0 * 1024.0)
            InAppLogger.d(Logger.Tags.SERVICE, "📤 Загрузка файла в Supabase Storage: ${file.name}, размер: ${String.format("%.2f", fileSizeMB)} MB, путь: $path")
            
            // Определяем MIME тип
            val mimeType = when {
                file.name.endsWith(".zip", ignoreCase = true) -> "application/zip"
                file.name.endsWith(".mhtml", ignoreCase = true) -> "application/x-mimearchive"
                file.name.endsWith(".html", ignoreCase = true) -> "text/html"
                else -> "application/octet-stream"
            }
            
            val requestBody = file.asRequestBody(mimeType.toMediaType())
            
            // URL для загрузки в Supabase Storage (POST /storage/v1/object/{bucket}/{path})
            val uploadUrl = "$supabaseUrl/storage/v1/object/$bucketName/$path"
            
            InAppLogger.d(Logger.Tags.SERVICE, "📡 URL загрузки: $uploadUrl")
            
            val request = Request.Builder()
                .url(uploadUrl)
                .post(requestBody)
                .addHeader("Authorization", "Bearer $supabaseAnonKey")
                .addHeader("apikey", supabaseAnonKey)
                .addHeader("Content-Type", mimeType)
                .addHeader("x-upsert", "false") // Не перезаписывать существующие файлы
                .addHeader("Prefer", "return=representation") // Возвращать информацию о загруженном файле
                .build()
            
            val response = okHttpClient.newCall(request).execute()
            
            if (response.isSuccessful) {
                // Получаем публичный URL файла
                val publicUrl = "$supabaseUrl/storage/v1/object/public/$bucketName/$path"
                InAppLogger.success(Logger.Tags.SERVICE, "✅ Файл успешно загружен в Supabase Storage: $publicUrl")
                publicUrl
            } else {
                val errorBody = response.body?.string()
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка загрузки в Supabase Storage: код=${response.code}, сообщение=${response.message}, тело=$errorBody")
                null
            }
        } catch (e: Exception) {
                InAppLogger.e(Logger.Tags.SERVICE, "❌ Исключение при загрузке в Supabase Storage: ${e.message}", e)
                null
            }
        }
    }
    
    /**
     * Генерировать уникальное имя файла для Storage
     */
    fun generateStoragePath(originalFileName: String, subfolder: String = "archives"): String {
        val sanitized = originalFileName.replace("[^a-zA-Z0-9._-]".toRegex(), "_")
        val timestamp = System.currentTimeMillis()
        val extension = if (sanitized.contains(".")) {
            sanitized.substringAfterLast(".")
        } else {
            "mhtml"
        }
        val nameWithoutExt = sanitized.substringBeforeLast(".")
        return "$subfolder/${nameWithoutExt}_$timestamp.$extension"
    }
}

