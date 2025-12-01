package com.spyservice.mobile.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.spyservice.mobile.ui.settings.AppSettings
import com.spyservice.mobile.ui.settings.ArchiveMode

class SettingsRepository(context: Context) {
    
    private val prefs: SharedPreferences = 
        context.getSharedPreferences("spy_service_settings", Context.MODE_PRIVATE)
    
    fun saveSettings(settings: AppSettings) {
        prefs.edit().apply {
            putString("format", settings.format)
            putString("type", settings.type)
            putString("placement", settings.placement)
            putString("country", settings.country)
            putString("platform", settings.platform)
            putBoolean("cloaking", settings.cloaking)
            putString("archiveMode", settings.archiveMode.name)
            apply()
        }
    }
    
    fun getSettings(): AppSettings? {
        val format = prefs.getString("format", null) ?: return null
        val type = prefs.getString("type", null) ?: return null
        val placement = prefs.getString("placement", null) ?: return null
        val country = prefs.getString("country", null) ?: return null
        val platform = prefs.getString("platform", null) ?: return null
        val cloaking = prefs.getBoolean("cloaking", false)
        val archiveModeName = prefs.getString("archiveMode", "ZIP") ?: "ZIP"
        val archiveMode = try {
            ArchiveMode.valueOf(archiveModeName)
        } catch (e: Exception) {
            ArchiveMode.ZIP
        }
        
        return AppSettings(
            format = format,
            type = type,
            placement = placement,
            country = country,
            platform = platform,
            cloaking = cloaking,
            archiveMode = archiveMode
        )
    }
    
    fun hasSettings(): Boolean {
        return getSettings() != null
    }
}

