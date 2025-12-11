package com.spyservice.mobile.service

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.provider.DocumentsContract
import com.spyservice.mobile.utils.InAppLogger
import com.spyservice.mobile.utils.Logger
import java.io.File
import java.io.FileOutputStream

/**
 * Помощник для открытия системного файлового менеджера и выбора файла
 * Использует Storage Access Framework - не требует разрешений
 */
object FilePickerHelper {
    
    /**
     * Создать Intent для открытия файлового менеджера Samsung с папкой Downloads
     */
    fun createSamsungDownloadsIntent(context: Context): Intent {
        // Пробуем открыть Samsung файловый менеджер напрямую
        val samsungIntent = Intent().apply {
            try {
                setClassName("com.sec.android.app.myfiles", "com.sec.android.app.myfiles.external.ui.activity.MainActivity")
                // Пробуем открыть папку Downloads
                val downloadsPath = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).absolutePath
                putExtra("EXTRA_KEY_FOLDER_PATH", downloadsPath)
            } catch (e: Exception) {
                // Если Samsung файловый менеджер недоступен, используем стандартный
            }
        }
        
        // Стандартный Intent для выбора файла
        val standardIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "*/*"
            addCategory(Intent.CATEGORY_OPENABLE)
            putExtra(Intent.EXTRA_LOCAL_ONLY, true)
        }
        
        // Создаем chooser с приоритетом Samsung файлового менеджера
        return Intent.createChooser(standardIntent, "Выберите файл страницы из папки Downloads").apply {
            try {
                if (samsungIntent.resolveActivity(context.packageManager) != null) {
                    putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(samsungIntent))
                }
            } catch (e: Exception) {
                // Игнорируем ошибки проверки
            }
        }
    }
    
    /**
     * Получить File из URI (результат выбора файла)
     */
    fun getFileFromUri(context: Context, uri: Uri): File? {
        return try {
            when {
                uri.scheme == "file" -> {
                    File(uri.path ?: return null)
                }
                uri.scheme == "content" -> {
                    // Копируем файл из Content URI во временную папку приложения
                    copyUriToTempFile(context, uri)
                }
                else -> null
            }
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка получения файла из URI: ${e.message}", e)
            null
        }
    }
    
    /**
     * Копировать файл из Content URI во временный файл
     */
    private fun copyUriToTempFile(context: Context, uri: Uri): File? {
        return try {
            val inputStream = context.contentResolver.openInputStream(uri)
            inputStream?.use { input ->
                val tempFile = File(context.cacheDir, "selected_page_${System.currentTimeMillis()}.mhtml")
                FileOutputStream(tempFile).use { output ->
                    input.copyTo(output)
                }
                if (tempFile.exists() && tempFile.length() > 0) {
                    InAppLogger.d(Logger.Tags.SERVICE, "✅ Файл скопирован: ${tempFile.name} (${tempFile.length()} bytes)")
                    tempFile
                } else {
                    null
                }
            }
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.SERVICE, "❌ Ошибка копирования файла: ${e.message}", e)
            null
        }
    }
}
