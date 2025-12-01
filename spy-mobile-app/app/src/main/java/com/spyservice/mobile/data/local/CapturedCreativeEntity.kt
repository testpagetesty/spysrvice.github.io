package com.spyservice.mobile.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Entity для локального хранения захваченных креативов
 */
@Entity(tableName = "captured_creatives")
data class CapturedCreativeEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val landingUrl: String,
    val title: String?,
    val description: String?,
    val sourceLink: String?,
    val landingImagePath: String?,
    val fullScreenshotPath: String?,
    val thumbnailPath: String?,
    val pageArchivePath: String?,
    val archiveSizeBytes: Long?,
    val capturedAt: Long,
    val uploaded: Boolean = false,
    val uploadedAt: Long? = null
)
