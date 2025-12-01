package com.spyservice.mobile

import android.app.Application
import com.spyservice.mobile.data.api.ApiClient
import com.spyservice.mobile.data.local.SpyServiceDatabase
import com.spyservice.mobile.data.repository.CreativeRepository
import com.spyservice.mobile.data.repository.LocalCreativeRepository
import com.spyservice.mobile.data.repository.ReferenceRepository
import com.spyservice.mobile.data.repository.SettingsRepository
import com.spyservice.mobile.utils.Logger

class SpyServiceApplication : Application(), Application.ActivityLifecycleCallbacks {
    
    // Database
    private val database by lazy { SpyServiceDatabase.getDatabase(this) }
    
    // Repositories
    lateinit var settingsRepository: SettingsRepository
    lateinit var referenceRepository: ReferenceRepository
    lateinit var localCreativeRepository: LocalCreativeRepository
    lateinit var creativeRepository: CreativeRepository
    
    // Services
    var screenshotService: com.spyservice.mobile.service.ScreenshotService? = null
    
    // Текущая активность
    private var currentActivity: android.app.Activity? = null
    
    override fun onCreate() {
        super.onCreate()
        
        // Регистрируем колбэки для отслеживания активности
        registerActivityLifecycleCallbacks(this)
        
        Logger.step(Logger.Tags.APP, 1, "Application onCreate() started")
        
        try {
            Logger.checkpoint(Logger.Tags.APP, "PRE_INIT", mapOf(
                "packageName" to packageName,
                "versionName" to getVersionName()
            ))
            
            // Инициализация репозиториев
            Logger.step(Logger.Tags.APP, 2, "Initializing SettingsRepository")
            settingsRepository = SettingsRepository(this)
            Logger.success(Logger.Tags.APP, "SettingsRepository initialized")
            
            Logger.step(Logger.Tags.APP, 3, "Initializing ReferenceRepository")
            referenceRepository = ReferenceRepository(ApiClient.referenceApi)
            Logger.success(Logger.Tags.APP, "ReferenceRepository initialized")
            
            Logger.step(Logger.Tags.APP, 4, "Initializing Database")
            val dao = database.capturedCreativeDao()
            Logger.d(Logger.Tags.DATABASE, "Database DAO created: ${dao != null}")
            
            Logger.step(Logger.Tags.APP, 5, "Initializing LocalCreativeRepository")
            localCreativeRepository = LocalCreativeRepository(dao)
            Logger.success(Logger.Tags.APP, "LocalCreativeRepository initialized")
            
            Logger.step(Logger.Tags.APP, 6, "Initializing CreativeRepository")
            creativeRepository = CreativeRepository(ApiClient.creativeApi, this, localCreativeRepository)
            Logger.success(Logger.Tags.APP, "CreativeRepository initialized")
            
            Logger.checkpoint(Logger.Tags.APP, "POST_INIT", mapOf(
                "settingsRepository" to (::settingsRepository.isInitialized),
                "referenceRepository" to (::referenceRepository.isInitialized),
                "localCreativeRepository" to (::localCreativeRepository.isInitialized),
                "creativeRepository" to (::creativeRepository.isInitialized)
            ))
            
            Logger.success(Logger.Tags.APP, "Application initialized successfully")
            
        } catch (e: Exception) {
            Logger.failure(Logger.Tags.APP, "Application initialization failed", e)
            e.printStackTrace()
            throw e
        }
    }
    
    /**
     * Получить текущую активность
     */
    fun getCurrentActivity(): android.app.Activity? = currentActivity
    
    // ActivityLifecycleCallbacks
    override fun onActivityCreated(activity: android.app.Activity, savedInstanceState: android.os.Bundle?) {}
    override fun onActivityStarted(activity: android.app.Activity) {}
    override fun onActivityResumed(activity: android.app.Activity) {
        currentActivity = activity
    }
    override fun onActivityPaused(activity: android.app.Activity) {
        if (currentActivity == activity) {
            currentActivity = null
        }
    }
    override fun onActivityStopped(activity: android.app.Activity) {}
    override fun onActivitySaveInstanceState(activity: android.app.Activity, outState: android.os.Bundle) {}
    override fun onActivityDestroyed(activity: android.app.Activity) {
        if (currentActivity == activity) {
            currentActivity = null
        }
    }
    
    private fun getVersionName(): String {
        return try {
            packageManager.getPackageInfo(packageName, 0).versionName
        } catch (e: Exception) {
            "unknown"
        }
    }
}

