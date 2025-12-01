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
     * Инициализировать сервисы захвата
     */
    fun initializeCaptureServices(
        accessibilityService: CreativeAccessibilityService?,
        screenshotService: ScreenshotService?
    ) {
        try {
            if (context == null) {
                return
            }
            
            val pageArchiver: PageArchiver
            try {
                pageArchiver = PageArchiver(context)
            } catch (e: Exception) {
                throw e
            }
            
            val pagePreviewService: PagePreviewService
            try {
                pagePreviewService = PagePreviewService(context)
            } catch (e: Exception) {
                throw e
            }
            
            try {
                captureService = CreativeCaptureService(
                    context = context,
                    accessibilityService = accessibilityService,
                    screenshotService = screenshotService,
                    pageArchiver = pageArchiver,
                    pagePreviewService = pagePreviewService
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
                uploadCapturedCreative(captureResult.creative, settings)
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
            
            val uploadSuccess = uploadCapturedCreative(creative, settings)
            
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
        return try {
            InAppLogger.d(Logger.Tags.REPOSITORY, "🚀 uploadCapturedCreativeDirect вызван")
            InAppLogger.d(Logger.Tags.REPOSITORY, "📋 URL: ${capturedCreative.landingUrl}")
            android.util.Log.d("CreativeRepository", "🚀 uploadCapturedCreativeDirect вызван")
            android.util.Log.d("CreativeRepository", "📋 URL: ${capturedCreative.landingUrl}")
            
            val landingImageFile = capturedCreative.landingImageFile
            val pageArchiveFile = capturedCreative.pageArchiveFile
            val thumbnailFile = capturedCreative.thumbnailFile
            
            InAppLogger.d(Logger.Tags.REPOSITORY, "📁 Проверка файлов:")
            InAppLogger.d(Logger.Tags.REPOSITORY, "  - landingImageFile: ${landingImageFile?.absolutePath}, exists=${landingImageFile?.exists()}, size=${landingImageFile?.length()}")
            InAppLogger.d(Logger.Tags.REPOSITORY, "  - thumbnailFile: ${thumbnailFile?.absolutePath}, exists=${thumbnailFile?.exists()}, size=${thumbnailFile?.length()}")
            InAppLogger.d(Logger.Tags.REPOSITORY, "  - pageArchiveFile: ${pageArchiveFile?.absolutePath}, exists=${pageArchiveFile?.exists()}, size=${pageArchiveFile?.length()}")
            android.util.Log.d("CreativeRepository", "📁 Проверка файлов:")
            android.util.Log.d("CreativeRepository", "  - landingImageFile: ${landingImageFile?.absolutePath}, exists=${landingImageFile?.exists()}, size=${landingImageFile?.length()}")
            android.util.Log.d("CreativeRepository", "  - thumbnailFile: ${thumbnailFile?.absolutePath}, exists=${thumbnailFile?.exists()}, size=${thumbnailFile?.length()}")
            android.util.Log.d("CreativeRepository", "  - pageArchiveFile: ${pageArchiveFile?.absolutePath}, exists=${pageArchiveFile?.exists()}, size=${pageArchiveFile?.length()}")
            
            if (landingImageFile != null && !landingImageFile.exists()) {
                InAppLogger.w(Logger.Tags.REPOSITORY, "❌ landingImageFile не существует")
                android.util.Log.w("CreativeRepository", "❌ landingImageFile не существует")
                return false
            }
            
            if (pageArchiveFile != null && !pageArchiveFile.exists()) {
                InAppLogger.w(Logger.Tags.REPOSITORY, "❌ pageArchiveFile не существует")
                android.util.Log.w("CreativeRepository", "❌ pageArchiveFile не существует")
                return false
            }
            
            if (thumbnailFile != null && !thumbnailFile.exists()) {
                InAppLogger.w(Logger.Tags.REPOSITORY, "❌ thumbnailFile не существует")
                android.util.Log.w("CreativeRepository", "❌ thumbnailFile не существует")
                return false
            }
            
            uploadCapturedCreative(capturedCreative, settings)
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Ошибка в uploadCapturedCreativeDirect: ${e.message}", e)
            android.util.Log.e("CreativeRepository", "❌ Ошибка в uploadCapturedCreativeDirect: ${e.message}", e)
            e.printStackTrace()
            false
        }
    }
    
    /**
     * Загрузить захваченный креатив на сервер
     */
    private suspend fun uploadCapturedCreative(
        capturedCreative: CapturedCreative,
        settings: AppSettings
    ): Boolean {
        return try {
            // Подготовка данных для отправки
            val titleBody = (capturedCreative.title ?: "").toRequestBody(null)
            val descriptionBody = (capturedCreative.description ?: "").toRequestBody(null)
            val landingUrlBody = capturedCreative.landingUrl.toRequestBody(null)
            val sourceLinkBody = (capturedCreative.sourceLink ?: capturedCreative.landingUrl).toRequestBody(null)
            val sourceDeviceBody = "mobile".toRequestBody(null)
            
            // Форматировать captured_at как ISO строку
            val capturedAtMillis = capturedCreative.capturedAt
            val capturedAtDate = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }.format(java.util.Date(capturedAtMillis))
            val capturedAtBody = capturedAtDate.toRequestBody(null)
            
            // Настройки
            val formatBody = settings.format.toRequestBody(null)
            val typeBody = settings.type.toRequestBody(null)
            val placementBody = settings.placement.toRequestBody(null)
            val countryBody = settings.country.toRequestBody(null)
            val platformBody = settings.platform.toRequestBody(null)
            val cloakingBody = settings.cloaking.toString().toRequestBody(null)
            
            // Файлы
            // media_file - превью изображение (для поля Media Image/Video)
            val mediaFile = capturedCreative.landingImageFile?.let { file ->
                if (file.exists() && file.length() > 0) {
                    val ext = file.extension.lowercase()
                    // Отправляем только изображения, не архивы
                    if (ext in listOf("jpg", "jpeg", "png", "gif", "webp", "bmp")) {
                        val mimeType = when (ext) {
                            "jpg", "jpeg" -> "image/jpeg"
                            "png" -> "image/png"
                            "gif" -> "image/gif"
                            "webp" -> "image/webp"
                            "bmp" -> "image/bmp"
                            else -> "image/jpeg"
                        }
                        val requestFile = file.asRequestBody(mimeType.toMediaType())
                        MultipartBody.Part.createFormData("media_file", file.name, requestFile)
                    } else {
                        null
                    }
                } else {
                    null
                }
            } ?: capturedCreative.fullScreenshotFile?.let { file ->
                if (file.exists() && file.length() > 0) {
                    val requestFile = file.asRequestBody("image/png".toMediaType())
                    MultipartBody.Part.createFormData("media_file", file.name, requestFile)
                } else {
                    null
                }
            }
            
            // thumbnail_file - скриншот страницы (НЕ должен использовать landingImageFile)
            // Если thumbnailFile отсутствует, не отправляем thumbnail_file, чтобы избежать дублирования
            val thumbnailFile = capturedCreative.thumbnailFile?.let { file ->
                android.util.Log.d("CreativeRepository", "Проверка thumbnailFile: path=${file.absolutePath}, exists=${file.exists()}, size=${file.length()}")
                if (file.exists() && file.length() > 0) {
                    val fileSize = file.length()
                    val ext = file.extension.lowercase()
                    if (ext in listOf("jpg", "jpeg", "png", "gif", "webp", "bmp")) {
                        val mimeType = when (ext) {
                            "jpg", "jpeg" -> "image/jpeg"
                            "png" -> "image/png"
                            "gif" -> "image/gif"
                            "webp" -> "image/webp"
                            "bmp" -> "image/bmp"
                            else -> "image/webp"
                        }
                        android.util.Log.d("CreativeRepository", "✅ Создание thumbnail_file: ${file.name}, размер: ${fileSize} bytes, тип: $mimeType")
                        try {
                            val requestFile = file.asRequestBody(mimeType.toMediaType())
                            MultipartBody.Part.createFormData("thumbnail_file", file.name, requestFile)
                        } catch (e: Exception) {
                            android.util.Log.e("CreativeRepository", "❌ Ошибка создания RequestBody для thumbnailFile: ${e.message}", e)
                            null
                        }
                    } else {
                        android.util.Log.w("CreativeRepository", "❌ thumbnailFile не является изображением: $ext")
                        null
                    }
                } else {
                    android.util.Log.w("CreativeRepository", "❌ thumbnailFile не существует или пустой: exists=${file.exists()}, size=${file.length()}")
                    null
                }
            } ?: run {
                android.util.Log.w("CreativeRepository", "⚠️ thumbnailFile отсутствует - thumbnail_file не будет отправлен")
                android.util.Log.d("CreativeRepository", "thumbnailFile в capturedCreative: ${capturedCreative.thumbnailFile?.absolutePath}")
                null
            }
            
            // zip_file - архив страницы (MHTML или ZIP)
            // УБИРАЕМ ВСЕ ОГРАНИЧЕНИЯ - Supabase поддерживает файлы до 50MB
            val zipFile = capturedCreative.pageArchiveFile?.let { file ->
                if (file.exists() && file.length() > 0) {
                    val fileSize = file.length()
                    
                    // Определяем MIME тип по расширению файла
                    val mimeType = when (file.extension.lowercase()) {
                        "mhtml" -> "message/rfc822" // MHTML формат
                        "zip" -> "application/zip"
                        else -> "application/zip" // По умолчанию ZIP
                    }
                    
                    InAppLogger.d(Logger.Tags.REPOSITORY, "✅ Архив готов к отправке: ${file.name}, размер: ${fileSize / 1024} KB")
                    android.util.Log.d("CreativeRepository", "✅ Архив готов к отправке: ${file.name}, размер: ${fileSize / 1024} KB")
                    
                    val requestFile = file.asRequestBody(mimeType.toMediaType())
                    MultipartBody.Part.createFormData("zip_file", file.name, requestFile)
                } else {
                    null
                }
            } ?: run {
                InAppLogger.d(Logger.Tags.REPOSITORY, "📦 Архив отсутствует")
                null
            }
            
            if (thumbnailFile == null) {
                InAppLogger.w(Logger.Tags.REPOSITORY, "⚠️ thumbnail_file отсутствует - скриншот не будет отправлен")
                android.util.Log.w("CreativeRepository", "⚠️ thumbnail_file отсутствует - скриншот не будет отправлен")
            } else {
                InAppLogger.d(Logger.Tags.REPOSITORY, "✅ thumbnail_file готов к отправке")
                android.util.Log.d("CreativeRepository", "✅ thumbnail_file готов к отправке")
            }
            
            // Отправка запроса
            InAppLogger.d(Logger.Tags.REPOSITORY, "📤 Подготовка к отправке на сервер...")
            InAppLogger.d(Logger.Tags.REPOSITORY, "📋 Данные: title=${capturedCreative.title}, url=${capturedCreative.landingUrl}")
            InAppLogger.d(Logger.Tags.REPOSITORY, "📁 Файлы: mediaFile=${mediaFile != null}, thumbnailFile=${thumbnailFile != null}, zipFile=${zipFile != null}")
            android.util.Log.d("CreativeRepository", "📤 Подготовка к отправке на сервер...")
            android.util.Log.d("CreativeRepository", "📋 Данные: title=${capturedCreative.title}, url=${capturedCreative.landingUrl}")
            android.util.Log.d("CreativeRepository", "📁 Файлы: mediaFile=${mediaFile != null}, thumbnailFile=${thumbnailFile != null}, zipFile=${zipFile != null}")
            
            val response = try {
                InAppLogger.d(Logger.Tags.REPOSITORY, "🌐 Вызов API createCreative...")
                android.util.Log.d("CreativeRepository", "🌐 Вызов API createCreative...")
                api.createCreative(
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
                    mediaFile = mediaFile,
                    thumbnailFile = thumbnailFile,
                    zipFile = zipFile
                )
            } catch (e: Exception) {
                InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Ошибка при вызове API: ${e.message}", e)
                android.util.Log.e("CreativeRepository", "❌ Ошибка при вызове API: ${e.message}", e)
                android.util.Log.e("CreativeRepository", "❌ Тип ошибки: ${e.javaClass.simpleName}")
                e.printStackTrace()
                return false
            }
            
            InAppLogger.d(Logger.Tags.REPOSITORY, "📥 Ответ получен: isSuccessful=${response.isSuccessful}, code=${response.code()}")
            android.util.Log.d("CreativeRepository", "📥 Ответ получен: isSuccessful=${response.isSuccessful}, code=${response.code()}")
            
            if (!response.isSuccessful) {
                val errorBody = response.errorBody()?.string()
                InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Ошибка сервера: код=${response.code()}, сообщение=${response.message()}")
                InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Тело ошибки: $errorBody")
                android.util.Log.e("CreativeRepository", "❌ Ошибка сервера: код=${response.code()}, сообщение=${response.message()}")
                android.util.Log.e("CreativeRepository", "❌ Тело ошибки: $errorBody")
                return false
            } else {
                InAppLogger.success(Logger.Tags.REPOSITORY, "✅ Успешная отправка на сервер!")
                android.util.Log.d("CreativeRepository", "✅ Успешная отправка на сервер!")
                return true
            }
        } catch (e: Exception) {
            InAppLogger.e(Logger.Tags.REPOSITORY, "❌ Критическая ошибка в uploadCapturedCreative: ${e.message}", e)
            android.util.Log.e("CreativeRepository", "❌ Критическая ошибка в uploadCapturedCreative: ${e.message}", e)
            android.util.Log.e("CreativeRepository", "❌ Тип ошибки: ${e.javaClass.simpleName}")
            e.printStackTrace()
            false
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
            
            val zipPart = creativeData.zip_file?.let { file ->
                val requestFile = file.asRequestBody("application/zip".toMediaType())
                MultipartBody.Part.createFormData("zip_file", file.name, requestFile)
            }
            
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
                mediaFile = mediaPart,
                thumbnailFile = thumbnailPart,
                zipFile = zipPart
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

