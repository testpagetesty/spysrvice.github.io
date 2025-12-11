package com.spyservice.mobile.data.repository

import android.content.Context
import com.spyservice.mobile.data.api.CreativeApi
import com.spyservice.mobile.data.model.CapturedCreative
import com.spyservice.mobile.data.model.CaptureResult
import com.spyservice.mobile.data.model.CreativeData
import com.spyservice.mobile.service.CreativeCaptureService
import com.spyservice.mobile.service.CreativeAccessibilityService
import com.spyservice.mobile.service.ScreenshotService
import com.spyservice.mobile.service.PageArchiver
import com.spyservice.mobile.service.PagePreviewService
import com.spyservice.mobile.ui.settings.AppSettings
import com.spyservice.mobile.utils.InAppLogger
import com.spyservice.mobile.utils.Logger
import com.spyservice.mobile.data.storage.SupabaseStorageService
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody

class CreativeRepository(
    private val api: CreativeApi,
    private val context: Context? = null,
    private val localRepository: LocalCreativeRepository? = null
) {
    
    private var captureService: CreativeCaptureService? = null
    
    /**
     * Получить сервис захвата (для обработки результатов файлового менеджера)
     */
    fun getCaptureService(): CreativeCaptureService? = captureService
    
    /**
     * Инициализировать сервисы захвата
     */
    fun initializeCaptureServices(
        accessibilityService: CreativeAccessibilityService?,
        activity: android.app.Activity? = null // Для открытия файлового менеджера
    ) {
        try {
            if (context == null) {
                return
            }
            
            try {
                captureService = CreativeCaptureService(
                    context = context,
                    accessibilityService = accessibilityService,
                    activity = activity
                )
            } catch (e: Exception) {
                throw e
            }
            
        } catch (e: Exception) {
            // Игнорируем ошибки
        }
    }
    
    /**
     * Захватить креатив и сохранить локально (БЕЗ загрузки на сервер)
     */
    suspend fun captureCreative(): CaptureResult? {
        return try {
            if (captureService == null) {
                return CaptureResult.Error("Capture service not initialized")
            }

            if (localRepository == null) {
                return CaptureResult.Error("Local repository not initialized")
            }
            
            // Захватить креатив
            val captureResult = captureService?.captureCreative()
            
            when (captureResult) {
                is CaptureResult.Success -> {
                    val creative = captureResult.creative
                    
                    try {
                        localRepository.saveCreative(creative)
                    } catch (e: Exception) {
                        // Игнорируем ошибки
                    }
                    
                    captureResult
                }
                is CaptureResult.Error -> {
                    captureResult
                }
                null -> {
                    CaptureResult.Error("Capture service returned null")
                }
            }
        } catch (e: Exception) {
            CaptureResult.Error("Capture failed: ${e.message}", e)
        }
    }

    /**
     * Захватить креатив и загрузить на сервер (старый метод для обратной совместимости)
     */
    suspend fun captureAndUpload(settings: AppSettings): Boolean {
        val captureResult = captureCreative()
        return when (captureResult) {
            is CaptureResult.Success -> {
                // Для старых методов загружаем файл в Supabase Storage если он есть
                val creative = captureResult.creative
                val downloadUrl = if (creative.pageArchiveFile != null && creative.pageArchiveFile.exists()) {
                    val storageService = SupabaseStorageService(context ?: return false)
                    val storagePath = storageService.generateStoragePath(creative.pageArchiveFile.name)
                    storageService.uploadFile(creative.pageArchiveFile, storagePath)
                } else {
                    null
                }
                uploadCapturedCreative(creative, settings, downloadUrl)
            }
            else -> false
        }
    }

    /**
     * Загрузить уже захваченный креатив на сервер по ID
     */
    suspend fun uploadCapturedCreativeById(creativeId: Long, settings: AppSettings): Boolean {
        return try {
            val entity = localRepository?.getCreativeById(creativeId)
            if (entity == null) {
                return false
            }
            
            val creative = localRepository?.entityToCapturedCreative(entity)
            if (creative == null) {
                return false
            }
            
            // Загружаем файл в Supabase Storage если он есть
            val downloadUrl = if (creative.pageArchiveFile != null && creative.pageArchiveFile.exists()) {
                val storageService = SupabaseStorageService(context ?: return false)
                val storagePath = storageService.generateStoragePath(creative.pageArchiveFile.name)
                storageService.uploadFile(creative.pageArchiveFile, storagePath)
            } else {
                null
            }
            
            val uploadSuccess = uploadCapturedCreative(creative, settings, downloadUrl)
            
            if (uploadSuccess) {
                localRepository?.markAsUploaded(creativeId)
            }
            
            uploadSuccess
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * Загрузить захваченный креатив на сервер (публичный метод для прямого вызова)
     */
    suspend fun uploadCapturedCreativeDirect(
        capturedCreative: CapturedCreative,
        settings: AppSettings
    ): Boolean {
        // Используем NonCancellable чтобы предотвратить отмену корутины во время загрузки
        return kotlinx.coroutines.withContext(kotlinx.coroutines.NonCancellable) {
            try {
                // Проверяем что есть URL для отправки
                if (capturedCreative.landingUrl.isBlank() || 
                    capturedCreative.landingUrl.contains("test-site") || 
                    capturedCreative.landingUrl.contains("example.com")) {
                    InAppLogger.e(Logger.Tags.REPOSITORY, "❌ landingUrl пустой или тестовый")
                    return@withContext false
                }
                
                // Проверяем что URL валидный
                try {
                    android.net.Uri.parse(capturedCreative.landingUrl)
                } catch (e: Exception) {
                    InAppLogger.e(Logger.Tags.REPOSITORY, "❌ landingUrl невалидный: ${capturedCreative.landingUrl}")
                    return@withContext false
                }
                
                // КРИТИЧНО: Проверяем что архив страницы скачался и существует
                if (capturedCreative.pageArchiveFile == null) {
                    InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Архив страницы не скачан - креатив не будет отправлен")
                    return@withContext false
                }
                
                if (!capturedCreative.pageArchiveFile.exists()) {
                    InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Файл архива не существует: ${capturedCreative.pageArchiveFile.absolutePath}")
                    return@withContext false
                }
                
                if (capturedCreative.pageArchiveFile.length() == 0L) {
                    InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Файл архива пустой: ${capturedCreative.pageArchiveFile.absolutePath}")
                    return@withContext false
                }
                
                // Сначала загружаем файл напрямую в Supabase Storage (обходим лимит Vercel)
                InAppLogger.d(Logger.Tags.REPOSITORY, "📤 Загружаем файл напрямую в Supabase Storage...")
                val storageService = SupabaseStorageService(context ?: return@withContext false)
                val storagePath = storageService.generateStoragePath(capturedCreative.pageArchiveFile.name)
                val fileUrl = storageService.uploadFile(capturedCreative.pageArchiveFile, storagePath)
                
                if (fileUrl == null) {
                    InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Не удалось загрузить файл в Supabase Storage")
                    return@withContext false
                }
                
                InAppLogger.success(Logger.Tags.REPOSITORY, "✅ Файл загружен в Supabase Storage: $fileUrl")
                
                // Теперь отправляем только метаданные через Vercel API (без файла)
                InAppLogger.d(Logger.Tags.REPOSITORY, "📤 Отправляем метаданные на сервер...")
                val result = uploadCapturedCreative(capturedCreative, settings, fileUrl)
                if (result) {
                    InAppLogger.success(Logger.Tags.REPOSITORY, "✅ Креатив успешно загружен на сервер")
                } else {
                    InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Не удалось загрузить креатив на сервер")
                }
                result
            } catch (e: kotlinx.coroutines.CancellationException) {
                InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Загрузка отменена: ${e.message}", e)
                false
            } catch (e: Exception) {
                InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Ошибка в uploadCapturedCreativeDirect: ${e.message}", e)
                false
            }
        }
    }
    
    /**
     * Загрузить захваченный креатив на сервер
     * @param downloadUrl URL файла в Supabase Storage (если null, файл не был загружен)
     */
    private suspend fun uploadCapturedCreative(
        capturedCreative: CapturedCreative,
        settings: AppSettings,
        downloadUrl: String? = null
    ): Boolean {
        // Используем NonCancellable чтобы предотвратить отмену корутины во время загрузки
        return kotlinx.coroutines.withContext(kotlinx.coroutines.NonCancellable) {
            try {
            // Подготовка данных для отправки - только настройки и URL
            val titleBody = "".toRequestBody(null)  // Пустой title
            val descriptionBody = "".toRequestBody(null)  // Пустое description
            val landingUrlBody = capturedCreative.landingUrl.toRequestBody(null)
            val sourceLinkBody = (capturedCreative.sourceLink ?: capturedCreative.landingUrl).toRequestBody(null)
            val sourceDeviceBody = "mobile".toRequestBody(null)
            
            // Форматировать captured_at как ISO строку
            val capturedAtMillis = capturedCreative.capturedAt
            val capturedAtDate = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }.format(java.util.Date(capturedAtMillis))
            val capturedAtBody = capturedAtDate.toRequestBody(null)
            
            // Настройки приложения
            val formatBody = settings.format.toRequestBody(null)
            val typeBody = settings.type.toRequestBody(null)
            val placementBody = settings.placement.toRequestBody(null)
            val countryBody = settings.country.toRequestBody(null)
            val platformBody = settings.platform.toRequestBody(null)
            val cloakingBody = settings.cloaking.toString().toRequestBody(null)
            
            // Файл уже загружен в Supabase Storage, отправляем только URL
            // Файлы не отправляем через Vercel API - они уже в Supabase Storage
            val mediaFile: okhttp3.MultipartBody.Part? = null
            val thumbnailFile: okhttp3.MultipartBody.Part? = null
            val zipFile: okhttp3.MultipartBody.Part? = null
            
            // Отправляем URL файла как текстовое поле
            val downloadUrlBody = downloadUrl?.toRequestBody(null)
            
            InAppLogger.d(Logger.Tags.REPOSITORY, "📤 Отправляем данные на сервер: landingUrl=${capturedCreative.landingUrl}, downloadUrl=$downloadUrl")
            
            try {
                val response = api.createCreative(
                    title = titleBody,
                    description = descriptionBody,
                    format = formatBody,
                    type = typeBody,
                    placement = placementBody,
                    country = countryBody,
                    platform = platformBody,
                    cloaking = cloakingBody,
                    landingUrl = landingUrlBody,
                    sourceLink = sourceLinkBody,
                    sourceDevice = sourceDeviceBody,
                    capturedAt = capturedAtBody,
                    downloadUrl = downloadUrlBody,
                    mediaFile = mediaFile,
                    thumbnailFile = thumbnailFile
                )
                
                val responseCode = response.code()
                val contentType = response.headers()["Content-Type"] ?: "unknown"
                
                InAppLogger.d(Logger.Tags.REPOSITORY, "📥 Ответ сервера: код=$responseCode, Content-Type=$contentType")
                
                if (response.isSuccessful) {
                    val responseBody = response.body()
                    if (responseBody != null) {
                        InAppLogger.success(Logger.Tags.REPOSITORY, "✅ Креатив успешно создан. ID: ${responseBody.creative?.id}, download_url: ${responseBody.urls?.downloadUrl?.take(50)}...")
                        return@withContext true
                    } else {
                        InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Response body is null при успешном коде $responseCode")
                        return@withContext false
                    }
                } else {
                    // Читаем errorBody для диагностики
                    val errorBody = try {
                        response.errorBody()?.string() ?: "empty"
                    } catch (e: Exception) {
                        "error reading error body: ${e.message}"
                    }
                    
                    // Проверяем, не является ли ответ HTML страницей ошибки
                    if (errorBody.contains("<!DOCTYPE") || errorBody.contains("<html")) {
                        InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Сервер вернул HTML вместо JSON! Это может быть страница ошибки Vercel.")
                        InAppLogger.e(Logger.Tags.REPOSITORY, "❌ HTML ответ (первые 500 символов): ${errorBody.take(500)}")
                    } else {
                        InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Ошибка сервера: код=$responseCode, тело: ${errorBody.take(500)}")
                    }
                    return@withContext false
                }
            } catch (e: com.google.gson.JsonSyntaxException) {
                InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Ошибка парсинга JSON: сервер вернул не JSON. ${e.message}")
                InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Это означает что сервер вернул строку или HTML вместо JSON объекта")
                return@withContext false
            } catch (e: java.lang.IllegalStateException) {
                if (e.message?.contains("Expected BEGIN_OBJECT") == true) {
                    InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Сервер вернул строку вместо JSON объекта: ${e.message}")
                    InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Это может быть HTML страница ошибки или текстовая ошибка")
                } else {
                    InAppLogger.e(Logger.Tags.REPOSITORY, "❌ IllegalStateException: ${e.message}", e)
                }
                return@withContext false
            } catch (e: Exception) {
                InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Ошибка при отправке: ${e.javaClass.simpleName} - ${e.message}", e)
                return@withContext false
            }
            } catch (e: kotlinx.coroutines.CancellationException) {
                InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Загрузка отменена: ${e.message}", e)
                false
            } catch (e: Exception) {
                InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Критическая ошибка в uploadCapturedCreative: ${e.message}", e)
                false
            }
        }
    }
    
    suspend fun uploadCreative(
        creativeData: CreativeData,
        settings: AppSettings
    ): Result<Unit> {
        return try {
            // Создаем RequestBody для текстовых полей
            val titleBody = creativeData.title?.toRequestBody(null)
            val descriptionBody = creativeData.description?.toRequestBody(null)
            val formatBody = settings.format.toRequestBody(null)
            val typeBody = settings.type.toRequestBody(null)
            val placementBody = settings.placement.toRequestBody(null)
            val countryBody = settings.country.toRequestBody(null)
            val platformBody = settings.platform.toRequestBody(null)
            val cloakingBody = settings.cloaking.toString().toRequestBody(null)
            val landingUrlBody = creativeData.landing_url?.toRequestBody(null)
            val sourceLinkBody = creativeData.source_link?.toRequestBody(null)
            val sourceDeviceBody = "android".toRequestBody(null)
            val capturedAtBody = creativeData.captured_at.toRequestBody(null)
            
            // Создаем MultipartBody.Part для файлов
            val mediaPart = creativeData.media_file?.let { file ->
                val requestFile = file.asRequestBody("image/png".toMediaType())
                MultipartBody.Part.createFormData("media_file", file.name, requestFile)
            }
            
            val thumbnailPart = creativeData.thumbnail_file?.let { file ->
                val requestFile = file.asRequestBody("image/jpeg".toMediaType())
                MultipartBody.Part.createFormData("thumbnail_file", file.name, requestFile)
            }
            
            // zipFile больше не используется - все файлы страниц загружаются напрямую в Supabase Storage
            // Для этого метода downloadUrl не используется (старый метод для веб-интерфейса)
            val downloadUrlBody: okhttp3.RequestBody? = null
            
            val response = api.createCreative(
                title = titleBody,
                description = descriptionBody,
                format = formatBody,
                type = typeBody,
                placement = placementBody,
                country = countryBody,
                platform = platformBody,
                cloaking = cloakingBody,
                landingUrl = landingUrlBody,
                sourceLink = sourceLinkBody,
                sourceDevice = sourceDeviceBody,
                capturedAt = capturedAtBody,
                downloadUrl = downloadUrlBody,
                mediaFile = mediaPart,
                thumbnailFile = thumbnailPart
            )
            
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Upload failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

