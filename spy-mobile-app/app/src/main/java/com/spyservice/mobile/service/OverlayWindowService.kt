package com.spyservice.mobile.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import androidx.core.app.NotificationCompat
import android.widget.ImageButton
import com.spyservice.mobile.R
import com.spyservice.mobile.SpyServiceApplication
import com.spyservice.mobile.data.model.CaptureResult
import com.spyservice.mobile.ui.captured.CapturedCreativesActivity
import com.spyservice.mobile.ui.main.MainActivity
import com.spyservice.mobile.ui.main.ScreenshotPermissionActivity
import com.spyservice.mobile.utils.InAppLogger
import com.spyservice.mobile.utils.Logger
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Сервис для отображения плавающей кнопки поверх других приложений
 */
class OverlayWindowService : Service() {
    
    companion object {
        private const val TAG = "OverlayWindowService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "floating_capture_channel"
        private const val STATUS_CHANNEL_ID = "floating_capture_channel_status"
        
        fun start(context: Context) {
            val intent = Intent(context, OverlayWindowService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
        
        fun stop(context: Context) {
            val intent = Intent(context, OverlayWindowService::class.java)
            context.stopService(intent)
        }
    }
    
    private var windowManager: WindowManager? = null
    private var floatingView: View? = null
    private var captureButton: ImageButton? = null
    
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "OverlayWindowService created")
        
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
        
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        createFloatingWindow()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "OverlayWindowService started")
        return START_STICKY
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "OverlayWindowService destroyed")
        
        removeFloatingWindow()
        serviceScope.cancel()
    }
    
    /**
     * Создать плавающее окно с кнопкой
     */
    private fun createFloatingWindow() {
        try {
            Log.d(TAG, "Creating floating window...")
            
            // Проверить разрешение
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !android.provider.Settings.canDrawOverlays(this)) {
                Log.e(TAG, "No overlay permission!")
                return
            }
            
            // Создать простую круглую кнопку программно
            captureButton = ImageButton(this).apply {
                setImageResource(R.drawable.ic_camera_24)
                setBackgroundResource(android.R.drawable.btn_default)
                
                // Сделать кнопку круглой и красивой
                background = createCircularBackground()
                scaleType = android.widget.ImageView.ScaleType.CENTER
                
                // Установить размеры
                layoutParams = android.view.ViewGroup.LayoutParams(120, 120)
                
                // Цвет иконки
                setColorFilter(android.graphics.Color.WHITE)
            }
            floatingView = captureButton
            
            Log.d(TAG, "FloatingView created: ${floatingView != null}")
            Log.d(TAG, "CaptureButton found: ${captureButton != null}")
            
            if (floatingView == null) {
                Log.e(TAG, "Failed to inflate floating_capture_button layout!")
                return
            }
            
            // Параметры окна (упрощенные)
            val layoutParams = WindowManager.LayoutParams().apply {
                width = 120  // Размер кнопки
                height = 120
                type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                } else {
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_PHONE
                }
                flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                        WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH
                format = PixelFormat.TRANSLUCENT
                gravity = Gravity.TOP or Gravity.START
                x = 100
                y = 300
            }
            
            Log.d(TAG, "Layout params created - type: ${layoutParams.type}, flags: ${layoutParams.flags}")
            
            // Добавить обработчики перетаскивания и клика
            setupFloatingButtonHandlers(layoutParams)
            
            // Добавить в WindowManager
            windowManager?.addView(floatingView, layoutParams)
            
            Log.d(TAG, "Floating window successfully added to WindowManager!")
            
            // Проверить, что view действительно добавлен
            if (floatingView?.parent != null) {
                Log.d(TAG, "FloatingView has parent - successfully attached")
            } else {
                Log.e(TAG, "FloatingView has no parent - failed to attach!")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error creating floating window", e)
            e.printStackTrace()
        }
    }
    
    /**
     * Настроить обработчики для плавающей кнопки
     */
    private fun setupFloatingButtonHandlers(layoutParams: WindowManager.LayoutParams) {
        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f
        var isDragging = false
        
        captureButton?.setOnTouchListener { view, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = layoutParams.x
                    initialY = layoutParams.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isDragging = false
                    view.performHapticFeedback(android.view.HapticFeedbackConstants.VIRTUAL_KEY)
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val deltaX = kotlin.math.abs(event.rawX - initialTouchX)
                    val deltaY = kotlin.math.abs(event.rawY - initialTouchY)
                    
                    // Если движение больше порога - это перетаскивание
                    if (deltaX > 20 || deltaY > 20) {
                        isDragging = true
                        layoutParams.x = initialX + (event.rawX - initialTouchX).toInt()
                        layoutParams.y = initialY + (event.rawY - initialTouchY).toInt()
                        windowManager?.updateViewLayout(floatingView, layoutParams)
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    val deltaX = kotlin.math.abs(event.rawX - initialTouchX)
                    val deltaY = kotlin.math.abs(event.rawY - initialTouchY)
                    
                    // Если это клик (а не перетаскивание)
                    if (!isDragging && deltaX < 20 && deltaY < 20) {
                        Log.d(TAG, "Button clicked (not dragged)")
                        onCaptureButtonClicked()
                    } else {
                        Log.d(TAG, "Button was dragged, click ignored")
                    }
                    true
                }
                else -> false
            }
        }
    }
    
    /**
     * Обработка нажатия на кнопку захвата
     */
    private fun onCaptureButtonClicked() {
        InAppLogger.step(Logger.Tags.UI, 1, "🎯 CAPTURE BUTTON CLICKED")
        Logger.step(Logger.Tags.UI, 1, "Capture button clicked")
        
        // Показать уведомление сразу для обратной связи
        showNotification("🚀 Capture Started", "Starting capture process...")
        
        // Также Toast
        android.os.Handler(android.os.Looper.getMainLooper()).post {
            Toast.makeText(this, "Capture started!", Toast.LENGTH_SHORT).show()
        }
        
        serviceScope.launch {
            try {
                Logger.step(Logger.Tags.UI, 2, "Starting capture process in coroutine")
                
                // Показать индикатор загрузки
                showCaptureInProgress()
                
                // Получить приложение и репозиторий
                val app = application as? SpyServiceApplication
                if (app == null) {
                    Logger.failure(Logger.Tags.UI, "Application is null!")
                    showError("Application not available")
                    return@launch
                }
                
                Logger.checkpoint(Logger.Tags.UI, "APP_CHECK", mapOf(
                    "application" to (app != null),
                    "settingsRepository" to (app.settingsRepository != null),
                    "creativeRepository" to (app.creativeRepository != null)
                ))
                
                // Проверить настройки
                Logger.step(Logger.Tags.UI, 3, "Checking settings")
                val settings = app.settingsRepository.getSettings()
                if (settings == null) {
                    Logger.failure(Logger.Tags.UI, "Settings not configured!")
                    showError("Settings not configured. Please open app and configure settings first.")
                    return@launch
                }
                
                Logger.success(Logger.Tags.UI, "Settings found: format=${settings.format}, type=${settings.type}")
                
                // Инициализировать сервисы захвата если еще не инициализированы
                // Инициализация сервисов уже выполнена в MainActivity, пропускаем
                InAppLogger.d(Logger.Tags.UI, "Skipping service initialization - already done in MainActivity")
                
                Logger.step(Logger.Tags.UI, 5, "Starting creative capture")
                
                // Захватить креатив и сохранить локально
                val captureResult = app.creativeRepository.captureCreative()
                
                InAppLogger.step(Logger.Tags.UI, 3, "Capture result: ${captureResult?.javaClass?.simpleName}")
                Logger.checkpoint(Logger.Tags.UI, "CAPTURE_COMPLETE", mapOf(
                    "resultType" to captureResult?.javaClass?.simpleName,
                    "isSuccess" to (captureResult is CaptureResult.Success)
                ))
                
                when (captureResult) {
                    is CaptureResult.Success -> {
                        val creative = captureResult.creative
                        
                        // АВТОМАТИЧЕСКАЯ ОТПРАВКА НА СЕРВЕР
                        InAppLogger.step(Logger.Tags.UI, 4, "📤 Автоматическая отправка на сервер...")
                        Logger.step(Logger.Tags.UI, 6, "Uploading creative to server")
                        
                        // Проверяем все данные перед отправкой
                        android.util.Log.d("OverlayWindowService", "=== ПРОВЕРКА ДАННЫХ ПЕРЕД ОТПРАВКОЙ ===")
                        android.util.Log.d("OverlayWindowService", "URL: ${creative.landingUrl}")
                        android.util.Log.d("OverlayWindowService", "Title: ${creative.title}")
                        android.util.Log.d("OverlayWindowService", "Description: ${creative.description}")
                        android.util.Log.d("OverlayWindowService", "landingImageFile: ${creative.landingImageFile?.absolutePath}, exists: ${creative.landingImageFile?.exists()}, size: ${creative.landingImageFile?.length()}")
                        android.util.Log.d("OverlayWindowService", "pageArchiveFile: ${creative.pageArchiveFile?.absolutePath}, exists: ${creative.pageArchiveFile?.exists()}, size: ${creative.pageArchiveFile?.length()}")
                        android.util.Log.d("OverlayWindowService", "thumbnailFile: ${creative.thumbnailFile?.absolutePath}, exists: ${creative.thumbnailFile?.exists()}, size: ${creative.thumbnailFile?.length()}")
                        android.util.Log.d("OverlayWindowService", "Settings: format=${settings.format}, type=${settings.type}, platform=${settings.platform}")
                        
                        // Проверяем, что все необходимые данные есть
                        if (creative.title.isNullOrEmpty()) {
                            android.util.Log.w("OverlayWindowService", "⚠️ Title пустой!")
                        }
                        if (creative.description.isNullOrEmpty()) {
                            android.util.Log.w("OverlayWindowService", "⚠️ Description пустой!")
                        }
                        if (creative.landingImageFile == null || !creative.landingImageFile!!.exists()) {
                            android.util.Log.e("OverlayWindowService", "❌ landingImageFile отсутствует или не существует!")
                        }
                        if (creative.pageArchiveFile == null || !creative.pageArchiveFile!!.exists()) {
                            android.util.Log.e("OverlayWindowService", "❌ pageArchiveFile отсутствует или не существует!")
                        }
                        
                        // Отправляем сразу после захвата (creative уже сохранен в БД в captureCreative)
                        android.util.Log.d("OverlayWindowService", "Запуск serviceScope.launch для отправки...")
                        android.util.Log.d("OverlayWindowService", "serviceScope: $serviceScope")
                        android.util.Log.d("OverlayWindowService", "app.creativeRepository: ${app.creativeRepository}")
                        
                        try {
                            serviceScope.launch {
                                try {
                                    android.util.Log.d("OverlayWindowService", "✅ serviceScope.launch выполнен, начало отправки на сервер...")
                                    InAppLogger.d(Logger.Tags.UI, "Вызов uploadCapturedCreativeDirect...")
                                    android.util.Log.d("OverlayWindowService", "Вызов app.creativeRepository.uploadCapturedCreativeDirect...")
                                    
                                    // Используем прямой вызов uploadCapturedCreative с уже захваченным креативом
                                    val uploadSuccess = app.creativeRepository.uploadCapturedCreativeDirect(creative, settings)
                                    
                                    android.util.Log.d("OverlayWindowService", "uploadCapturedCreativeDirect вернул: $uploadSuccess")
                                    
                                    if (uploadSuccess) {
                                        InAppLogger.success(Logger.Tags.UI, "✅ Креатив успешно отправлен на сервер!")
                                        Logger.success(Logger.Tags.UI, "Creative uploaded successfully")
                                        android.util.Log.d("OverlayWindowService", "✅ Отправка успешна")
                                    } else {
                                        InAppLogger.e(Logger.Tags.UI, "❌ Ошибка отправки на сервер (uploadSuccess = false)")
                                        Logger.failure(Logger.Tags.UI, "Failed to upload creative")
                                        android.util.Log.e("OverlayWindowService", "❌ Отправка не удалась (uploadSuccess = false)")
                                    }
                                } catch (e: Exception) {
                                    InAppLogger.e(Logger.Tags.UI, "❌ Ошибка при отправке: ${e.message}", e)
                                    Logger.failure(Logger.Tags.UI, "Error uploading creative", e)
                                    android.util.Log.e("OverlayWindowService", "💥 ИСКЛЮЧЕНИЕ в serviceScope.launch", e)
                                    e.printStackTrace()
                                }
                            }
                            android.util.Log.d("OverlayWindowService", "serviceScope.launch вызван, ожидание выполнения...")
                        } catch (e: Exception) {
                            android.util.Log.e("OverlayWindowService", "💥 ОШИБКА при вызове serviceScope.launch", e)
                            InAppLogger.e(Logger.Tags.UI, "❌ Ошибка запуска отправки: ${e.message}", e)
                            e.printStackTrace()
                        }
                        
                        // Уведомление об успешном сохранении
                        val successMessage = "✅ Creative data saved!\n\n" +
                            "Title: ${creative.title ?: "N/A"}\n" +
                            "URL: ${creative.landingUrl}\n\n" +
                            "📱 Tap notification to view saved creatives"
                        
                        showSuccess(successMessage)
                        
                        // Показать уведомление с возможностью открыть список
                        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                            showNotificationWithAction(
                                "📱 Creative Saved", 
                                "Tap to view all captured creatives",
                                CapturedCreativesActivity::class.java
                            )
                        }, 1000)
                    }
                    is CaptureResult.Error -> {
                        showError("Capture failed: ${captureResult.message}")
                    }
                    null -> {
                        showError("Capture failed: Unknown error")
                    }
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Error during capture", e)
                e.printStackTrace()
                showError("Error: ${e.message}")
            } finally {
                hideCaptureInProgress()
            }
        }
    }
    
    /**
     * Инициализировать сервисы захвата
     */
    private fun initializeCaptureServices(app: SpyServiceApplication) {
        try {
            // Получить или создать Accessibility Service
            val accessibilityService = getAccessibilityServiceInstance()
            
            // Получить или создать Screenshot Service
            val screenshotService = app.screenshotService ?: ScreenshotService(this)
            
            // Проверить и запросить разрешение на захват экрана если нужно
            if (!screenshotService.isMediaProjectionInitialized()) {
                Log.d(TAG, "MediaProjection not initialized, requesting permission...")
                requestScreenshotPermission(screenshotService)
                // Сохранить в Application для будущего использования
                app.screenshotService = screenshotService
            } else {
                Log.d(TAG, "MediaProjection already initialized")
            }
            
            // Инициализировать в репозитории
            app.creativeRepository.initializeCaptureServices(
                accessibilityService,
                screenshotService
            )
            
            Log.d(TAG, "Capture services initialized")
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing capture services", e)
        }
    }
    
    /**
     * Запросить разрешение на захват экрана
     */
    private fun requestScreenshotPermission(screenshotService: ScreenshotService) {
        try {
            // Создать Activity для обработки результата
            val intent = Intent(this, ScreenshotPermissionActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtra("screenshot_service_request", true)
            }
            startActivity(intent)
            Log.d(TAG, "Screenshot permission request activity started")
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting screenshot permission", e)
            // Показать уведомление пользователю
            showNotification("⚠️ Permission Required", "Please grant screen capture permission in app settings")
        }
    }
    
    /**
     * Получить экземпляр Accessibility Service
     */
    private fun getAccessibilityServiceInstance(): CreativeAccessibilityService? {
        // TODO: Реализовать получение экземпляра Accessibility Service
        // Пока возвращаем null - будет работать без него
        return null
    }
    
    /**
     * Показать индикатор процесса захвата
     */
    private fun showCaptureInProgress() {
        captureButton?.alpha = 0.5f
        captureButton?.isEnabled = false
        
        // Показать уведомление о процессе
        showNotification("📸 Capturing", "Capturing creative...")
        
        // Также Toast
        android.os.Handler(android.os.Looper.getMainLooper()).post {
            Toast.makeText(this, "Capturing...", Toast.LENGTH_SHORT).show()
        }
    }
    
    /**
     * Скрыть индикатор процесса захвата
     */
    private fun hideCaptureInProgress() {
        captureButton?.alpha = 1.0f
        captureButton?.isEnabled = true
    }
    
    /**
     * Показать сообщение об успехе
     */
    private fun showSuccess(message: String) {
        // Показать уведомление вместо Toast (более надежно)
        showNotification("✅ Success", message)
        
        // Также показать Toast на главном потоке
        android.os.Handler(android.os.Looper.getMainLooper()).post {
            Toast.makeText(this, message, Toast.LENGTH_LONG).show()
        }
    }
    
    /**
     * Показать сообщение об ошибке
     */
    private fun showError(message: String) {
        // Показать уведомление вместо Toast
        showNotification("❌ Error", message)
        
        // Также показать Toast на главном потоке
        android.os.Handler(android.os.Looper.getMainLooper()).post {
            Toast.makeText(this, message, Toast.LENGTH_LONG).show()
        }
    }
    
    /**
     * Показать уведомление
     */
    private fun showNotification(title: String, message: String) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        val channelId = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            STATUS_CHANNEL_ID
        } else {
            CHANNEL_ID
        }
        
        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(R.drawable.ic_camera_24)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .build()
        
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }
    
    private fun showNotificationWithAction(title: String, message: String, activityClass: Class<*>) {
        val intent = Intent(this, activityClass).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        val channelId = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            STATUS_CHANNEL_ID
        } else {
            CHANNEL_ID
        }
        
        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(R.drawable.ic_camera_24)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .build()
        
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }
    
    /**
     * Создать канал уведомлений
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Канал для foreground service
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Floating Capture Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Service for floating capture button"
                setShowBadge(false)
            }
            
            // Канал для уведомлений о статусе захвата
            val statusChannel = NotificationChannel(
                STATUS_CHANNEL_ID,
                "Capture Status",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications about capture status"
                setShowBadge(true)
                enableVibration(true)
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(serviceChannel)
            notificationManager.createNotificationChannel(statusChannel)
        }
    }
    
    /**
     * Создать уведомление для Foreground Service
     */
    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Spy Service Active")
            .setContentText("Floating capture button is running")
            .setSmallIcon(R.drawable.ic_camera_24)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }
    
    /**
     * Создать круглый фон для кнопки
     */
    private fun createCircularBackground(): android.graphics.drawable.Drawable {
        val drawable = android.graphics.drawable.GradientDrawable()
        drawable.shape = android.graphics.drawable.GradientDrawable.OVAL
        drawable.setColor(android.graphics.Color.parseColor("#6200EE")) // Фиолетовый цвет
        drawable.setStroke(4, android.graphics.Color.WHITE) // Белая обводка
        return drawable
    }
    
    /**
     * Удалить плавающее окно
     */
    private fun removeFloatingWindow() {
        try {
            if (floatingView != null) {
                windowManager?.removeView(floatingView)
                floatingView = null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error removing floating window", e)
        }
    }
}

