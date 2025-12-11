package com.spyservice.mobile.ui.main

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.spyservice.mobile.R
import com.spyservice.mobile.SpyServiceApplication
import com.spyservice.mobile.service.ScreenshotService

/**
 * Activity для запроса разрешения на захват экрана
 */
class ScreenshotPermissionActivity : AppCompatActivity() {
    
    companion object {
        private const val TAG = "ScreenshotPermission"
    }
    
    private lateinit var screenshotService: ScreenshotService
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.d(TAG, "ScreenshotPermissionActivity created")
        
        screenshotService = ScreenshotService(this)
        
        // Показать диалог с объяснением
        showPermissionDialog()
    }
    
    private fun showPermissionDialog() {
        AlertDialog.Builder(this)
            .setTitle("Screen Capture Permission")
            .setMessage("This app needs permission to capture screenshots for creative analysis. Please grant the permission.")
            .setPositiveButton("Grant Permission") { _, _ ->
                requestScreenshotPermission()
            }
            .setNegativeButton("Cancel") { _, _ ->
                finish()
            }
            .setCancelable(false)
            .show()
    }
    
    private fun requestScreenshotPermission() {
        try {
            Log.d(TAG, "Requesting screenshot permission...")
            val intent = screenshotService.createScreenCaptureIntent()
            Log.d(TAG, "Intent created, starting activity for result...")
            
            // Использовать правильный метод для запроса разрешения
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                startActivityForResult(intent, ScreenshotService.REQUEST_MEDIA_PROJECTION)
            } else {
                Toast.makeText(this, "Screen capture requires Android 5.0+", Toast.LENGTH_LONG).show()
                finish()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting screenshot permission", e)
            e.printStackTrace()
            Toast.makeText(this, "Error requesting permission: ${e.message}", Toast.LENGTH_LONG).show()
            finish()
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == ScreenshotService.REQUEST_MEDIA_PROJECTION) {
            Log.d(TAG, "MediaProjection permission result: $resultCode")
            
            screenshotService.initializeMediaProjection(resultCode, data)
            
            // Сохранить в Application для использования в сервисе
            val app = application as? SpyServiceApplication
            if (app != null && resultCode == Activity.RESULT_OK) {
                // Инициализировать screenshot service
                val screenshotServiceForRepo = ScreenshotService(this)
                screenshotServiceForRepo.initializeMediaProjection(resultCode, data)
                
                // Сохранить в Application
                app.screenshotService = screenshotServiceForRepo
                
                // Обновить сервис в репозитории
                // Передаем this (ScreenshotPermissionActivity) для открытия файлового менеджера
                app.creativeRepository.initializeCaptureServices(
                    null, // Accessibility service
                    this // Activity для файлового менеджера
                )
                
                Log.d(TAG, "Screenshot service saved to Application")
                Toast.makeText(this, "Screen capture permission granted!", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "Screen capture permission denied", Toast.LENGTH_SHORT).show()
            }
            
            finish()
        }
    }
}

