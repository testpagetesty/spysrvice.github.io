package com.spyservice.mobile.utils

import android.util.Log

/**
 * Централизованная система логирования для отладки
 */
object Logger {
    
    private const val BASE_TAG = "SpyService"
    
    // Теги для разных компонентов
    object Tags {
        const val APP = "${BASE_TAG}_App"
        const val REPOSITORY = "${BASE_TAG}_Repository"
        const val SERVICE = "${BASE_TAG}_Service"
        const val UI = "${BASE_TAG}_UI"
        const val CAPTURE = "${BASE_TAG}_Capture"
        const val SCREENSHOT = "${BASE_TAG}_Screenshot"
        const val DATABASE = "${BASE_TAG}_Database"
        const val NETWORK = "${BASE_TAG}_Network"
        const val PERMISSION = "${BASE_TAG}_Permission"
        const val ARCHIVE = "${BASE_TAG}_Archive"
        const val ERROR = "${BASE_TAG}_ERROR"
    }
    
    fun d(tag: String, message: String) {
        Log.d(tag, "🔍 $message")
    }
    
    fun i(tag: String, message: String) {
        Log.i(tag, "ℹ️ $message")
    }
    
    fun w(tag: String, message: String) {
        Log.w(tag, "⚠️ $message")
    }
    
    fun e(tag: String, message: String, throwable: Throwable? = null) {
        Log.e(tag, "❌ $message", throwable)
    }
    
    fun step(tag: String, step: Int, description: String) {
        Log.d(tag, "📋 STEP $step: $description")
    }
    
    fun success(tag: String, message: String) {
        Log.i(tag, "✅ SUCCESS: $message")
    }
    
    fun failure(tag: String, message: String, throwable: Throwable? = null) {
        Log.e(tag, "💥 FAILURE: $message", throwable)
    }
    
    fun checkpoint(tag: String, checkpoint: String, data: Map<String, Any?> = emptyMap()) {
        val dataStr = if (data.isNotEmpty()) {
            data.entries.joinToString(", ") { "${it.key}=${it.value}" }
        } else ""
        Log.d(tag, "🎯 CHECKPOINT [$checkpoint] $dataStr")
    }
}
