package com.spyservice.mobile.service

import android.app.DownloadManager
import android.content.ContentResolver
import android.content.Context
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.spyservice.mobile.utils.InAppLogger
import com.spyservice.mobile.utils.Logger
import kotlinx.coroutines.delay
import java.io.File
import java.util.Locale

/**
 * Детектор файлов страниц, сохраненных Chrome
 * Ищет файлы во всех возможных местах с множественными методами
 */
class ChromePageFileDetector(private val context: Context) {
    
    private val contentResolver: ContentResolver = context.contentResolver
    
    /**
     * Найти файл страницы, сохраненный Chrome
     * Использует все доступные методы поиска
     */
    suspend fun findChromeSavedPageFile(searchStartTime: Long, timeoutMs: Long = 60000): File? {
        InAppLogger.d(Logger.Tags.SERVICE, "🔍 === ПОИСК ФАЙЛА СТРАНИЦЫ CHROME ===")
        InAppLogger.d(Logger.Tags.SERVICE, "⏰ Время начала поиска: $searchStartTime")
        
        // Уменьшаем количество попыток - достаточно 10 попыток (20 секунд)
        val maxAttempts = 10
        var attempts = 0
        
        while (attempts < maxAttempts) {
            attempts++
            InAppLogger.d(Logger.Tags.SERVICE, "🔍 Попытка $attempts/$maxAttempts...")
            
            // Метод 1: DownloadManager (самый надежный для Chrome скачиваний)
            val dmFile = findViaDownloadManager(searchStartTime)
            if (dmFile != null && dmFile.exists() && dmFile.length() > 0) {
                InAppLogger.success(Logger.Tags.SERVICE, "✅ Файл найден через DownloadManager: ${dmFile.name}")
                return dmFile
            }
            
            // Метод 2: MediaStore Downloads (Android 10+)
            // Работает БЕЗ разрешений через ContentResolver
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val msFile = findViaMediaStore(searchStartTime)
                if (msFile != null && msFile.exists() && msFile.length() > 0) {
                    InAppLogger.success(Logger.Tags.SERVICE, "✅ Файл найден через MediaStore: ${msFile.name}")
                    return msFile
                }
            }
            
            // Метод 3: MediaStore для Android < 10 (через Files API)
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                val msFilesFile = findViaMediaStoreFiles(searchStartTime)
                if (msFilesFile != null && msFilesFile.exists() && msFilesFile.length() > 0) {
                    InAppLogger.success(Logger.Tags.SERVICE, "✅ Файл найден через MediaStore Files: ${msFilesFile.name}")
                    return msFilesFile
                }
            }
            
            // ПРИМЕЧАНИЕ: Прямое сканирование папки Downloads НЕ РАБОТАЕТ без разрешений на Android 10+
            // Поэтому используем только системные API (DownloadManager и MediaStore)
            
            if (attempts < maxAttempts) {
                delay(2000)
            }
        }
        
        InAppLogger.e(Logger.Tags.SERVICE, "❌ Файл не найден после $attempts попыток")
        return null
    }
    
    /**
     * Метод 1: DownloadManager API
     */
    private fun findViaDownloadManager(minTime: Long): File? {
        return try {
            val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager
                ?: return null
            
            val query = DownloadManager.Query().apply {
                setFilterByStatus(DownloadManager.STATUS_SUCCESSFUL or DownloadManager.STATUS_RUNNING)
            }
            
            val cursor: Cursor? = downloadManager.query(query)
            cursor?.use {
                val idColumn = it.getColumnIndex(DownloadManager.COLUMN_ID)
                val uriColumn = it.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI)
                val dateColumn = it.getColumnIndex(DownloadManager.COLUMN_LAST_MODIFIED_TIMESTAMP)
                val sizeColumn = it.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)
                
                while (it.moveToNext()) {
                    try {
                        val dateModified = it.getLong(dateColumn)
                        if (dateModified < minTime) continue
                        
                        val uriString = it.getString(uriColumn)
                        val file = if (uriString != null) {
                            getFileFromUri(Uri.parse(uriString))
                        } else null
                        
                        if (file != null && file.exists() && file.length() > 0) {
                            if (isLikelyPageFile(file)) {
                                return file
                            }
                        }
                    } catch (e: Exception) {
                        continue
                    }
                }
            }
            null
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * Метод 2: MediaStore Downloads
     */
    private fun findViaMediaStore(minTime: Long): File? {
        return try {
            val projection = arrayOf(
                MediaStore.Downloads._ID,
                MediaStore.Downloads.DISPLAY_NAME,
                MediaStore.Downloads.DATE_MODIFIED,
                MediaStore.Downloads.SIZE,
                MediaStore.Downloads.DATA
            )
            
            val selection = "${MediaStore.Downloads.DATE_MODIFIED} >= ?"
            val selectionArgs = arrayOf((minTime / 1000).toString())
            val sortOrder = "${MediaStore.Downloads.DATE_MODIFIED} DESC"
            
            val cursor: Cursor? = contentResolver.query(
                MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                sortOrder
            )
            
            cursor?.use {
                val idColumn = it.getColumnIndexOrThrow(MediaStore.Downloads._ID)
                val nameColumn = it.getColumnIndexOrThrow(MediaStore.Downloads.DISPLAY_NAME)
                val dataColumn = it.getColumnIndex(MediaStore.Downloads.DATA)
                val sizeColumn = it.getColumnIndexOrThrow(MediaStore.Downloads.SIZE)
                
                while (it.moveToNext()) {
                    try {
                        val name = it.getString(nameColumn)
                        val size = it.getLong(sizeColumn)
                        
                        if (size == 0L || name == null) continue
                        
                        // Пробуем получить путь через DATA
                        val data = if (dataColumn >= 0) it.getString(dataColumn) else null
                        val file = if (data != null && File(data).exists()) {
                            File(data)
                        } else {
                            // Используем Content URI
                            val id = it.getLong(idColumn)
                            val contentUri = android.content.ContentUris.withAppendedId(
                                MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                                id
                            )
                            getFileFromUri(contentUri)
                        }
                        
                        if (file != null && file.exists() && file.length() > 0) {
                            if (isLikelyPageFile(file)) {
                                return file
                            }
                        }
                    } catch (e: Exception) {
                        continue
                    }
                }
            }
            null
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * Метод 3: MediaStore Files API (для Android < 10)
     * Работает БЕЗ разрешений через ContentResolver
     */
    private fun findViaMediaStoreFiles(minTime: Long): File? {
        return try {
            val projection = arrayOf(
                MediaStore.Files.FileColumns._ID,
                MediaStore.Files.FileColumns.DISPLAY_NAME,
                MediaStore.Files.FileColumns.DATE_MODIFIED,
                MediaStore.Files.FileColumns.SIZE,
                MediaStore.Files.FileColumns.DATA
            )
            
            val selection = "${MediaStore.Files.FileColumns.DATE_MODIFIED} >= ? AND " +
                           "${MediaStore.Files.FileColumns.MEDIA_TYPE} = ${MediaStore.Files.FileColumns.MEDIA_TYPE_NONE}"
            val selectionArgs = arrayOf((minTime / 1000).toString())
            val sortOrder = "${MediaStore.Files.FileColumns.DATE_MODIFIED} DESC"
            
            val cursor: Cursor? = contentResolver.query(
                MediaStore.Files.getContentUri("external"),
                projection,
                selection,
                selectionArgs,
                sortOrder
            )
            
            cursor?.use {
                val idColumn = it.getColumnIndexOrThrow(MediaStore.Files.FileColumns._ID)
                val nameColumn = it.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DISPLAY_NAME)
                val dataColumn = it.getColumnIndex(MediaStore.Files.FileColumns.DATA)
                
                while (it.moveToNext()) {
                    try {
                        val name = it.getString(nameColumn)
                        val data = if (dataColumn >= 0) it.getString(dataColumn) else null
                        
                        if (name == null) continue
                        
                        // Пробуем получить файл через DATA (для Android < 10)
                        val file = if (data != null && File(data).exists()) {
                            File(data)
                        } else null
                        
                        if (file != null && file.exists() && file.length() > 0) {
                            if (isLikelyPageFile(file)) {
                                return file
                            }
                        }
                    } catch (e: Exception) {
                        continue
                    }
                }
            }
            null
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * Получить File из URI
     */
    private fun getFileFromUri(uri: Uri): File? {
        return try {
            when {
                uri.scheme == "file" -> File(uri.path ?: return null)
                uri.scheme == "content" -> {
                    // Пробуем получить путь через DATA
                    val projection = arrayOf(MediaStore.Downloads.DATA)
                    val cursor = contentResolver.query(uri, projection, null, null, null)
                    cursor?.use {
                        if (it.moveToFirst()) {
                            val dataColumn = it.getColumnIndex(MediaStore.Downloads.DATA)
                            if (dataColumn >= 0) {
                                val path = it.getString(dataColumn)
                                if (path != null && File(path).exists()) {
                                    return File(path)
                                }
                            }
                        }
                    }
                    null
                }
                else -> null
            }
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * Определить является ли файл страницей Chrome
     */
    private fun isLikelyPageFile(file: File): Boolean {
        val name = file.name.lowercase()
        val size = file.length()
        
        // Исключаем временные файлы
        if (name.endsWith(".crdownload") || name.endsWith(".tmp") || name.endsWith(".part")) {
            return false
        }
        
        // Проверяем размер (от 10KB до 200MB)
        if (size < 10 * 1024 || size > 200 * 1024 * 1024) {
            return false
        }
        
        // Проверяем расширение
        val hasPageExtension = name.endsWith(".mhtml") || 
                              name.endsWith(".html") || 
                              name.endsWith(".htm")
        
        // Проверяем ключевые слова
        val hasPageKeywords = name.contains("page") || 
                            name.contains("download") ||
                            name.contains("save") ||
                            name.contains("offline")
        
        // Файлы без расширения с разумным размером (Chrome может сохранять без расширения)
        val hasNoExtension = !name.contains(".")
        val hasReasonableSize = size > 100 * 1024 && size < 200 * 1024 * 1024
        
        return hasPageExtension || hasPageKeywords || (hasNoExtension && hasReasonableSize)
    }
}
