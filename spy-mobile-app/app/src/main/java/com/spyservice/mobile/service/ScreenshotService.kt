package com.spyservice.mobile.service

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Handler
import android.os.Looper
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager
import com.spyservice.mobile.utils.Logger
import kotlinx.coroutines.delay
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Сервис для создания скриншотов экрана
 */
class ScreenshotService(private val context: Context) {
    
    companion object {
        private const val TAG = "ScreenshotService"
        const val REQUEST_MEDIA_PROJECTION = 1001
    }
    
    var mediaProjection: MediaProjection? = null
    private var mediaProjectionManager: MediaProjectionManager? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    
    init {
        mediaProjectionManager = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    }
    
    /**
     * Запросить разрешение на захват экрана
     */
    fun createScreenCaptureIntent(): Intent {
        val intent = mediaProjectionManager?.createScreenCaptureIntent()
        if (intent == null) {
            throw IllegalStateException("MediaProjectionManager not available")
        }
        Log.d(TAG, "Screen capture intent created")
        return intent
    }
    
    /**
     * Инициализировать MediaProjection после получения разрешения
     */
    fun initializeMediaProjection(resultCode: Int, data: Intent?) {
        Logger.step(Logger.Tags.SCREENSHOT, 1, "Initializing MediaProjection")
        
        Logger.checkpoint(Logger.Tags.PERMISSION, "MEDIA_PROJECTION_RESULT", mapOf(
            "resultCode" to resultCode,
            "expectedResultCode" to Activity.RESULT_OK,
            "dataIntent" to (data != null),
            "mediaProjectionManager" to (mediaProjectionManager != null)
        ))
        
        if (resultCode == Activity.RESULT_OK && data != null) {
            try {
                mediaProjection = mediaProjectionManager?.getMediaProjection(resultCode, data)
                Logger.success(Logger.Tags.SCREENSHOT, "MediaProjection initialized successfully")
                
                Logger.checkpoint(Logger.Tags.PERMISSION, "PERMISSION_GRANTED", mapOf(
                    "mediaProjection" to (mediaProjection != null)
                ))
                
            } catch (e: Exception) {
                Logger.failure(Logger.Tags.SCREENSHOT, "Exception while initializing MediaProjection", e)
            }
        } else {
            Logger.failure(Logger.Tags.PERMISSION, "Failed to get MediaProjection permission. Result code: $resultCode")
        }
    }
    
    /**
     * Проверить, инициализирован ли MediaProjection
     */
    fun isMediaProjectionInitialized(): Boolean {
        return mediaProjection != null
    }
    
    /**
     * Захватить текущий экран
     */
    suspend fun captureCurrentScreen(): Bitmap? {
        Logger.step(Logger.Tags.SCREENSHOT, 1, "captureCurrentScreen called")
        
        Logger.checkpoint(Logger.Tags.SCREENSHOT, "CAPTURE_SCREEN", mapOf(
            "mediaProjection" to (mediaProjection != null),
            "mediaProjectionManager" to (mediaProjectionManager != null)
        ))
        
        if (mediaProjection == null) {
            Logger.failure(Logger.Tags.SCREENSHOT, "MediaProjection not initialized! Need to request permission first")
            Logger.w(Logger.Tags.PERMISSION, "To fix: Call createScreenCaptureIntent() and initializeMediaProjection()")
            return null
        }
        
        return try {
            Logger.step(Logger.Tags.SCREENSHOT, 2, "Starting screen capture")
            val bitmap = captureScreen()
            
            if (bitmap != null) {
                Logger.success(Logger.Tags.SCREENSHOT, "Screen captured successfully: ${bitmap.width}x${bitmap.height}")
            } else {
                Logger.failure(Logger.Tags.SCREENSHOT, "Screen capture returned null bitmap")
            }
            
            bitmap
        } catch (e: Exception) {
            Logger.failure(Logger.Tags.SCREENSHOT, "Error capturing screen", e)
            null
        }
    }
    
    /**
     * Захватить всю страницу (с прокруткой)
     * @param accessibilityService Сервис доступности для прокрутки страницы
     * @return Bitmap со скриншотом всей страницы или null в случае ошибки
     */
    suspend fun captureFullPage(accessibilityService: com.spyservice.mobile.service.CreativeAccessibilityService?): Bitmap? {
        Logger.step(Logger.Tags.SCREENSHOT, 1, "Starting full page capture with scrolling")
        
        if (mediaProjection == null) {
            Logger.failure(Logger.Tags.SCREENSHOT, "MediaProjection not initialized!")
            return null
        }
        
        if (accessibilityService == null) {
            Logger.w(Logger.Tags.SCREENSHOT, "AccessibilityService is null, falling back to single screenshot")
            return captureCurrentScreen()
        }
        
        return try {
            // Прокручиваем страницу в начало
            Logger.step(Logger.Tags.SCREENSHOT, 2, "Scrolling to top of page")
            accessibilityService.scrollToTop()
            kotlinx.coroutines.delay(500) // Даем время странице загрузиться
            
            val screenshots = mutableListOf<Bitmap>()
            var scrollAttempts = 0
            val maxScrollAttempts = 50 // Максимальное количество прокруток
            var canScrollMore = true
            var consecutiveFailures = 0
            val maxConsecutiveFailures = 3 // Останавливаемся после 3 неудачных попыток подряд
            
            // Делаем первый скриншот (верх страницы)
            Logger.step(Logger.Tags.SCREENSHOT, 3, "Capturing first screenshot")
            val firstScreenshot = captureCurrentScreen()
            if (firstScreenshot != null) {
                screenshots.add(firstScreenshot)
                Logger.success(Logger.Tags.SCREENSHOT, "First screenshot captured: ${firstScreenshot.width}x${firstScreenshot.height}")
            } else {
                Logger.failure(Logger.Tags.SCREENSHOT, "Failed to capture first screenshot")
                return null
            }
            
            // Прокручиваем и делаем скриншоты
            while (canScrollMore && scrollAttempts < maxScrollAttempts) {
                scrollAttempts++
                Logger.step(Logger.Tags.SCREENSHOT, 3 + scrollAttempts, "Scroll attempt $scrollAttempts")
                
                // Прокручиваем вниз
                val scrollSuccess = accessibilityService.scrollPageDown()
                
                if (scrollSuccess) {
                    consecutiveFailures = 0
                    // Даем время странице прокрутиться и загрузиться
                    kotlinx.coroutines.delay(800)
                    
                    // Делаем скриншот
                    val screenshot = captureCurrentScreen()
                    if (screenshot != null) {
                        screenshots.add(screenshot)
                        Logger.success(Logger.Tags.SCREENSHOT, "Screenshot $scrollAttempts captured: ${screenshot.width}x${screenshot.height}")
                    } else {
                        Logger.w(Logger.Tags.SCREENSHOT, "Failed to capture screenshot after scroll $scrollAttempts")
                        consecutiveFailures++
                    }
                } else {
                    consecutiveFailures++
                    Logger.w(Logger.Tags.SCREENSHOT, "Failed to scroll on attempt $scrollAttempts")
                    
                    if (consecutiveFailures >= maxConsecutiveFailures) {
                        Logger.step(Logger.Tags.SCREENSHOT, 0, "Stopping: $consecutiveFailures consecutive scroll failures")
                        canScrollMore = false
                    }
                }
            }
            
            Logger.step(Logger.Tags.SCREENSHOT, 0, "Captured ${screenshots.size} screenshots, merging...")
            
            // Объединяем все скриншоты в один
            val mergedBitmap = mergeScreenshots(screenshots)
            
            if (mergedBitmap != null) {
                Logger.success(Logger.Tags.SCREENSHOT, "Full page screenshot created: ${mergedBitmap.width}x${mergedBitmap.height}")
            } else {
                Logger.failure(Logger.Tags.SCREENSHOT, "Failed to merge screenshots")
            }
            
            // Освобождаем память от отдельных скриншотов
            screenshots.forEach { it.recycle() }
            
            mergedBitmap
        } catch (e: Exception) {
            Logger.failure(Logger.Tags.SCREENSHOT, "Error capturing full page", e)
            null
        }
    }
    
    /**
     * Объединить несколько скриншотов в один длинный скриншот
     */
    private fun mergeScreenshots(screenshots: List<Bitmap>): Bitmap? {
        if (screenshots.isEmpty()) {
            return null
        }
        
        if (screenshots.size == 1) {
            return screenshots[0].copy(screenshots[0].config, false)
        }
        
        return try {
            val first = screenshots[0]
            val width = first.width
            var totalHeight = 0
            
            // Вычисляем общую высоту
            screenshots.forEach { bitmap ->
                totalHeight += bitmap.height
            }
            
            // Создаем новый Bitmap для объединенного скриншота
            val mergedBitmap = Bitmap.createBitmap(width, totalHeight, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(mergedBitmap)
            
            // Рисуем скриншоты один за другим
            var currentY = 0
            screenshots.forEach { bitmap ->
                canvas.drawBitmap(bitmap, 0f, currentY.toFloat(), null)
                currentY += bitmap.height
            }
            
            mergedBitmap
        } catch (e: Exception) {
            Log.e(TAG, "Error merging screenshots", e)
            null
        }
    }
    
    /**
     * Выполнить захват экрана
     */
    private suspend fun captureScreen(): Bitmap? = suspendCancellableCoroutine { continuation ->
        try {
            val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
            val displayMetrics = DisplayMetrics()
            windowManager.defaultDisplay.getMetrics(displayMetrics)
            
            val width = displayMetrics.widthPixels
            val height = displayMetrics.heightPixels
            val density = displayMetrics.densityDpi
            
            imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 1)
            
            virtualDisplay = mediaProjection?.createVirtualDisplay(
                "ScreenCapture",
                width, height, density,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                imageReader?.surface,
                null, null
            )
            
            imageReader?.setOnImageAvailableListener({ reader ->
                try {
                    val image = reader.acquireLatestImage()
                    if (image != null) {
                        val bitmap = imageToBitmap(image, width, height)
                        image.close()
                        
                        // Очистка ресурсов
                        cleanup()
                        
                        if (continuation.isActive) {
                            continuation.resume(bitmap)
                        }
                    } else {
                        if (continuation.isActive) {
                            continuation.resume(null)
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error processing captured image", e)
                    cleanup()
                    if (continuation.isActive) {
                        continuation.resume(null)
                    }
                }
            }, Handler(Looper.getMainLooper()))
            
            // Таймаут для захвата
            Handler(Looper.getMainLooper()).postDelayed({
                if (continuation.isActive) {
                    Log.w(TAG, "Screenshot capture timeout")
                    cleanup()
                    continuation.resume(null)
                }
            }, 5000)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error capturing screen", e)
            cleanup()
            if (continuation.isActive) {
                continuation.resume(null)
            }
        }
    }
    
    /**
     * Преобразовать Image в Bitmap
     */
    private fun imageToBitmap(image: Image, width: Int, height: Int): Bitmap {
        val planes = image.planes
        val buffer = planes[0].buffer
        val pixelStride = planes[0].pixelStride
        val rowStride = planes[0].rowStride
        val rowPadding = rowStride - pixelStride * width
        
        val bitmap = Bitmap.createBitmap(
            width + rowPadding / pixelStride,
            height,
            Bitmap.Config.ARGB_8888
        )
        bitmap.copyPixelsFromBuffer(buffer)
        
        return if (rowPadding == 0) {
            bitmap
        } else {
            Bitmap.createBitmap(bitmap, 0, 0, width, height)
        }
    }
    
    /**
     * Очистить ресурсы
     */
    private fun cleanup() {
        virtualDisplay?.release()
        virtualDisplay = null
        
        imageReader?.close()
        imageReader = null
    }
    
    /**
     * Освободить MediaProjection
     */
    fun release() {
        cleanup()
        mediaProjection?.stop()
        mediaProjection = null
    }
}
