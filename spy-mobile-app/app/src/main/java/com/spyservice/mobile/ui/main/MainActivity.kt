package com.spyservice.mobile.ui.main

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.Menu
import android.view.MenuItem
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.spyservice.mobile.R
import com.spyservice.mobile.SpyServiceApplication
import com.spyservice.mobile.databinding.ActivityMainBinding
import com.spyservice.mobile.service.CreativeAccessibilityService
import com.spyservice.mobile.service.OverlayWindowService
import com.spyservice.mobile.service.ScreenshotService
import com.spyservice.mobile.ui.captured.CapturedCreativesActivity
import com.spyservice.mobile.ui.debug.DebugLogsActivity
import com.spyservice.mobile.ui.settings.SettingsActivity
import com.spyservice.mobile.utils.InAppLogger
import com.spyservice.mobile.utils.Logger

class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private lateinit var viewModel: MainViewModel
    private var screenshotService: ScreenshotService? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Logger.step(Logger.Tags.UI, 1, "MainActivity onCreate started")
        
        try {
            Logger.step(Logger.Tags.UI, 2, "Inflating binding")
            binding = ActivityMainBinding.inflate(layoutInflater)
            
            Logger.step(Logger.Tags.UI, 3, "Setting content view")
            setContentView(binding.root)
            
            Logger.step(Logger.Tags.UI, 4, "Getting application instance")
            val app = application as? SpyServiceApplication
            if (app == null) {
                Logger.failure(Logger.Tags.UI, "Application is not SpyServiceApplication")
                Toast.makeText(this, "Application initialization error", Toast.LENGTH_LONG).show()
                finish()
                return
            }
            
            Logger.checkpoint(Logger.Tags.UI, "APP_REPOSITORIES", mapOf(
                "settingsRepository" to (app.settingsRepository != null),
                "creativeRepository" to (app.creativeRepository != null),
                "localCreativeRepository" to (app.localCreativeRepository != null)
            ))
            
            Logger.step(Logger.Tags.UI, 5, "Creating ViewModelFactory")
            val viewModelFactory = ViewModelFactory(
                app.settingsRepository,
                app.creativeRepository
            )
            
            Logger.step(Logger.Tags.UI, 6, "Creating ViewModel")
            viewModel = ViewModelProvider(this, viewModelFactory)[MainViewModel::class.java]
            
            Logger.step(Logger.Tags.UI, 7, "Setting up UI")
            setupUI()
            
            Logger.step(Logger.Tags.UI, 8, "Observing ViewModel")
            observeViewModel()
            
            Logger.step(Logger.Tags.UI, 9, "Checking permissions")
            checkPermissions()
            
            Logger.step(Logger.Tags.UI, 10, "Initializing screenshot service")
            initializeScreenshotService()
            
            Logger.step(Logger.Tags.UI, 11, "Initializing capture services")
            initializeCaptureServices()
            
            Logger.success(Logger.Tags.UI, "MainActivity onCreate completed successfully")
            
        } catch (e: Exception) {
            Logger.failure(Logger.Tags.UI, "Error in MainActivity onCreate", e)
            Toast.makeText(this, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            finish()
        }
    }
    
    private fun setupUI() {
        try {
            setSupportActionBar(binding.toolbar)
            supportActionBar?.title = getString(R.string.app_name)
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error setting action bar", e)
            // Если не удалось установить ActionBar, продолжаем без него
        }
        
        binding.fabCapture.setOnClickListener {
            // Запустить плавающую кнопку вместо прямого захвата
            startFloatingCaptureService()
        }
        
        // Добавить кнопку для остановки сервиса (для тестирования)
        binding.fabCapture.setOnLongClickListener {
            OverlayWindowService.stop(this)
            Toast.makeText(this, "Floating capture button stopped", Toast.LENGTH_SHORT).show()
            true
        }
        
        // Кнопка для запроса разрешения на скриншоты
        binding.buttonRequestScreenCapture.setOnClickListener {
            requestScreenCapturePermission()
        }
        
        binding.buttonEnableAccessibility.setOnClickListener {
            if (isAccessibilityServiceEnabled()) {
                // Если сервис включен, но не подключен - показать инструкции
                if (CreativeAccessibilityService.getInstance() == null) {
                    showAccessibilityReconnectDialog()
                } else {
                    Toast.makeText(this, "✅ AccessibilityService is working correctly", Toast.LENGTH_SHORT).show()
                }
            } else {
                openAccessibilitySettings()
            }
        }
        
        // Проверка настроек при запуске
        if (!viewModel.hasSettings()) {
            showSettingsRequiredDialog()
        }
        
        // Проверка состояния разрешения на скриншоты
        updateScreenCaptureButtonState()
    }
    
    override fun onResume() {
        super.onResume()
        updateScreenCaptureButtonState()
        
        // Переинициализировать сервисы при возврате в приложение
        // (на случай, если пользователь включил AccessibilityService)
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            initializeCaptureServices()
        }, 1000)
    }
    
    private fun observeViewModel() {
        viewModel.captureStatus.observe(this) { status ->
            when (status) {
                is CaptureStatus.Loading -> {
                    binding.fabCapture.isEnabled = false
                    binding.statusText.text = getString(R.string.capturing)
                }
                is CaptureStatus.Success -> {
                    binding.fabCapture.isEnabled = true
                    binding.statusText.text = getString(R.string.capture_success)
                    Toast.makeText(this, R.string.capture_success, Toast.LENGTH_SHORT).show()
                }
                is CaptureStatus.Error -> {
                    binding.fabCapture.isEnabled = true
                    binding.statusText.text = status.message
                    Toast.makeText(this, status.message, Toast.LENGTH_LONG).show()
                }
                is CaptureStatus.Idle -> {
                    binding.fabCapture.isEnabled = true
                    binding.statusText.text = ""
                }
            }
        }
    }
    
    private fun checkPermissions() {
        if (!Settings.canDrawOverlays(this)) {
            requestOverlayPermission()
        }
        
        // Проверить разрешение на захват экрана
        checkScreenshotPermission()
    }
    
    /**
     * Проверить и запросить разрешение на захват экрана
     */
    private fun checkScreenshotPermission() {
        screenshotService = ScreenshotService(this)
        
        // Если MediaProjection не инициализирован, запросить разрешение
        // Это будет сделано при первом использовании через OverlayWindowService
    }
    
    /**
     * Инициализировать Screenshot Service
     */
    private fun initializeScreenshotService() {
        screenshotService = ScreenshotService(this)
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        // Обработка результата выбора файла из файлового менеджера
        if (requestCode == com.spyservice.mobile.service.CreativeCaptureService.REQUEST_CODE_FILE_PICKER) {
            val app = application as? SpyServiceApplication
            app?.creativeRepository?.getCaptureService()?.handleFilePickerResult(requestCode, resultCode, data)
            return
        }
        
        if (requestCode == ScreenshotService.REQUEST_MEDIA_PROJECTION) {
            android.util.Log.d("MainActivity", "MediaProjection permission result: $resultCode")
            screenshotService?.initializeMediaProjection(resultCode, data)
            
            if (resultCode == RESULT_OK) {
                Toast.makeText(this, "✅ Screen capture permission granted! Now you can capture screenshots.", Toast.LENGTH_LONG).show()
                
                // Сохранить в Application для использования в OverlayWindowService
                val app = application as? SpyServiceApplication
                app?.screenshotService = screenshotService
                
                // Обновить кнопку
                binding.buttonRequestScreenCapture.text = "✅ Screen Capture Enabled"
                binding.buttonRequestScreenCapture.isEnabled = false
                
            } else {
                Toast.makeText(this, "❌ Screen capture permission denied. Screenshots won't work.", Toast.LENGTH_LONG).show()
            }
        }
    }
    
    private fun requestOverlayPermission() {
        AlertDialog.Builder(this)
            .setTitle(R.string.permission_overlay_title)
            .setMessage(R.string.permission_overlay_message)
            .setPositiveButton("Settings") { _, _ ->
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
                startActivity(intent)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun showSettingsRequiredDialog() {
        AlertDialog.Builder(this)
            .setTitle("Settings Required")
            .setMessage("Please configure settings before capturing creatives")
            .setPositiveButton("Open Settings") { _, _ ->
                startActivity(Intent(this, SettingsActivity::class.java))
            }
            .setCancelable(false)
            .show()
    }
    
    private fun showAccessibilityReconnectDialog() {
        AlertDialog.Builder(this)
            .setTitle("AccessibilityService Not Connected")
            .setMessage("The AccessibilityService is enabled in settings but not connected to the app.\n\nTo fix this:\n1. Disable the service in Settings\n2. Re-enable it\n3. Restart the app\n\nOr try restarting your device.")
            .setPositiveButton("Open Settings") { _, _ ->
                openAccessibilitySettings()
            }
            .setNegativeButton("Restart App") { _, _ ->
                recreate()
            }
            .setNeutralButton("Cancel", null)
            .show()
    }
    
    private fun initializeCaptureServices() {
        val app = application as? SpyServiceApplication
        if (app != null) {
            val isAccessibilityEnabled = isAccessibilityServiceEnabled()
            val accessibilityService = CreativeAccessibilityService.getInstance()
            val currentScreenshotService = this.screenshotService ?: ScreenshotService(this)
            // Передаем this (MainActivity) для открытия файлового менеджера
            app.creativeRepository.initializeCaptureServices(accessibilityService, this)
        }
    }
    
    /**
     * Обновить состояние кнопки разрешения на скриншоты
     */
    private fun updateScreenCaptureButtonState() {
        val app = application as? SpyServiceApplication
        val hasPermission = app?.screenshotService?.isMediaProjectionInitialized() == true ||
                           screenshotService?.isMediaProjectionInitialized() == true

        if (hasPermission) {
            binding.buttonRequestScreenCapture.text = "✅ Screen Capture Enabled"
            binding.buttonRequestScreenCapture.isEnabled = false
        } else {
            binding.buttonRequestScreenCapture.text = "Grant Screen Capture Permission"
            binding.buttonRequestScreenCapture.isEnabled = true
        }
        
        // Также обновим статус Accessibility Service
        updateAccessibilityButtonState()
    }
    
    private fun updateAccessibilityButtonState() {
        val isEnabled = isAccessibilityServiceEnabled()
        val isConnected = CreativeAccessibilityService.getInstance() != null
        
        when {
            isEnabled && isConnected -> {
                binding.buttonEnableAccessibility.text = "✅ Accessibility Service Working"
                binding.buttonEnableAccessibility.isEnabled = true // Позволить проверить статус
            }
            isEnabled && !isConnected -> {
                binding.buttonEnableAccessibility.text = "⚠️ Accessibility Service Not Connected"
                binding.buttonEnableAccessibility.isEnabled = true
            }
            else -> {
                binding.buttonEnableAccessibility.text = "Enable Accessibility Service"
                binding.buttonEnableAccessibility.isEnabled = true
            }
        }
    }
    
    private fun openAccessibilitySettings() {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            startActivity(intent)
            Toast.makeText(this, "Find 'SpyService Mobile' and enable it", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Toast.makeText(this, "Error opening accessibility settings: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
    
    private fun isAccessibilityServiceEnabled(): Boolean {
        return try {
            val enabledServices = Settings.Secure.getString(
                contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            )
            val serviceName = "${packageName}/${CreativeAccessibilityService::class.java.name}"
            enabledServices?.contains(serviceName) == true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Запросить разрешение на захват экрана
     */
    private fun requestScreenCapturePermission() {
        try {
            android.util.Log.d("MainActivity", "Requesting screen capture permission...")
            
            if (screenshotService == null) {
                screenshotService = ScreenshotService(this)
            }
            
            val intent = screenshotService!!.createScreenCaptureIntent()
            startActivityForResult(intent, ScreenshotService.REQUEST_MEDIA_PROJECTION)
            
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error requesting screen capture permission", e)
            Toast.makeText(this, "Error requesting permission: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    /**
     * Запустить сервис плавающей кнопки
     */
    private fun startFloatingCaptureService() {
        android.util.Log.d("MainActivity", "Starting floating capture service...")
        android.util.Log.d("MainActivity", "Overlay permission: ${Settings.canDrawOverlays(this)}")
        
        if (Settings.canDrawOverlays(this)) {
            OverlayWindowService.start(this)
            Toast.makeText(this, "Floating capture button started", Toast.LENGTH_SHORT).show()
            
            // Задержка перед сворачиванием, чтобы сервис успел запуститься
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                // Свернуть приложение, чтобы пользователь мог перейти в Chrome/YouTube
                moveTaskToBack(true)
            }, 1000)
        } else {
            android.util.Log.e("MainActivity", "No overlay permission!")
            requestOverlayPermission()
        }
    }
    
    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.main_menu, menu)
        return true
    }
    
    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.menu_captured_creatives -> {
                startActivity(Intent(this, CapturedCreativesActivity::class.java))
                true
            }
            R.id.menu_debug_logs -> {
                startActivity(Intent(this, DebugLogsActivity::class.java))
                true
            }
            R.id.menu_settings -> {
                startActivity(Intent(this, SettingsActivity::class.java))
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }
}

