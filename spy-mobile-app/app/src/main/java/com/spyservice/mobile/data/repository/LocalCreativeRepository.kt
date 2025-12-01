package com.spyservice.mobile.data.repository

import com.spyservice.mobile.data.local.CapturedCreativeDao
import com.spyservice.mobile.data.local.CapturedCreativeEntity
import com.spyservice.mobile.data.model.CapturedCreative
import kotlinx.coroutines.flow.Flow

/**
 * Repository для работы с локально сохраненными креативами
 */
class LocalCreativeRepository(
    private val dao: CapturedCreativeDao
) {
    
    fun getAllCreatives(): Flow<List<CapturedCreativeEntity>> {
        return dao.getAll()
    }
    
    fun getNotUploadedCreatives(): Flow<List<CapturedCreativeEntity>> {
        return dao.getNotUploaded()
    }
    
    suspend fun getCreativeById(id: Long): CapturedCreativeEntity? {
        return dao.getById(id)
    }
    
    suspend fun saveCreative(capturedCreative: CapturedCreative): Long {
        val entity = CapturedCreativeEntity(
            landingUrl = capturedCreative.landingUrl,
            title = capturedCreative.title,
            description = capturedCreative.description,
            sourceLink = capturedCreative.sourceLink,
            landingImagePath = capturedCreative.landingImageFile?.absolutePath,
            fullScreenshotPath = capturedCreative.fullScreenshotFile?.absolutePath,
            thumbnailPath = capturedCreative.thumbnailFile?.absolutePath,
            pageArchivePath = capturedCreative.pageArchiveFile?.absolutePath,
            archiveSizeBytes = capturedCreative.pageArchiveFile?.length(),
            capturedAt = capturedCreative.capturedAt
        )
        return dao.insert(entity)
    }
    
    suspend fun markAsUploaded(id: Long) {
        dao.markAsUploaded(id, System.currentTimeMillis())
    }
    
    suspend fun deleteCreative(id: Long) {
        dao.delete(id)
    }
    
    suspend fun getNotUploadedCount(): Int {
        return dao.getNotUploadedCount()
    }
    
    /**
     * Конвертировать Entity обратно в CapturedCreative для загрузки
     */
    fun entityToCapturedCreative(entity: CapturedCreativeEntity): CapturedCreative {
        return CapturedCreative(
            landingUrl = entity.landingUrl,
            landingImageFile = entity.landingImagePath?.let { java.io.File(it) },
            sourceLink = entity.sourceLink,
            title = entity.title,
            description = entity.description,
            fullScreenshotFile = entity.fullScreenshotPath?.let { java.io.File(it) },
            pageArchiveFile = entity.pageArchivePath?.let { java.io.File(it) },
            thumbnailFile = entity.thumbnailPath?.let { java.io.File(it) },
            capturedAt = entity.capturedAt
        )
    }
}
