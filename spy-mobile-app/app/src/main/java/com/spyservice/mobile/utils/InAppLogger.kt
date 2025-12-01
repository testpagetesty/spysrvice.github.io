package com.spyservice.mobile.utils

import android.content.Context
import android.widget.Toast
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

/**
 * Логирование внутри приложения для отладки
 */
object InAppLogger {
    
    private val logs = mutableListOf<LogEntry>()
    private val maxLogs = 100
    private val dateFormat = SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault())
    
    data class LogEntry(
        val timestamp: String,
        val level: String,
        val tag: String,
        val message: String
    )
    
    fun d(tag: String, message: String) {
        addLog("DEBUG", tag, message)
        Logger.d(tag, message)
    }
    
    fun i(tag: String, message: String) {
        addLog("INFO", tag, message)
        Logger.i(tag, message)
    }
    
    fun w(tag: String, message: String) {
        addLog("WARN", tag, message)
        Logger.w(tag, message)
    }
    
    fun e(tag: String, message: String, throwable: Throwable? = null) {
        addLog("ERROR", tag, "$message ${throwable?.message ?: ""}")
        Logger.e(tag, message, throwable)
    }
    
    fun step(tag: String, step: Int, description: String) {
        addLog("STEP", tag, "STEP $step: $description")
        Logger.step(tag, step, description)
    }
    
    fun success(tag: String, message: String) {
        addLog("SUCCESS", tag, message)
        Logger.success(tag, message)
    }
    
    fun failure(tag: String, message: String, throwable: Throwable? = null) {
        addLog("FAILURE", tag, "$message ${throwable?.message ?: ""}")
        Logger.failure(tag, message, throwable)
    }
    
    private fun addLog(level: String, tag: String, message: String) {
        synchronized(logs) {
            logs.add(LogEntry(
                timestamp = dateFormat.format(Date()),
                level = level,
                tag = tag.replace("SpyService_", ""),
                message = message
            ))
            
            // Ограничить количество логов
            if (logs.size > maxLogs) {
                logs.removeAt(0)
            }
        }
    }
    
    fun getAllLogs(): List<LogEntry> {
        return synchronized(logs) { logs.toList() }
    }
    
    fun getRecentLogs(count: Int = 20): List<LogEntry> {
        return synchronized(logs) { 
            logs.takeLast(count)
        }
    }
    
    fun clearLogs() {
        synchronized(logs) {
            logs.clear()
        }
    }
    
    fun showToast(context: Context, message: String) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        i("TOAST", message)
    }
    
    fun exportLogs(context: Context): File? {
        return try {
            val logsDir = context.getExternalFilesDir("logs")
            logsDir?.mkdirs()
            
            val logFile = File(logsDir, "spy_service_logs_${System.currentTimeMillis()}.txt")
            val content = getAllLogs().joinToString("\n") { 
                "${it.timestamp} [${it.level}] ${it.tag}: ${it.message}"
            }
            
            logFile.writeText(content)
            logFile
        } catch (e: Exception) {
            e(Logger.Tags.ERROR, "Failed to export logs", e)
            null
        }
    }
}
