package com.spyservice.mobile.data.model

import java.io.File

/**
 * Модель захваченного креатива
 */
data class CapturedCreative(
    val landingUrl: String,                    // URL лендинга
    val landingImageFile: File?,               // Скриншот лендинга
    val sourceLink: String?,                   // URL объявления
    val title: String?,                        // Заголовок страницы
    val description: String?,                  // Описание страницы
    val fullScreenshotFile: File?,             // Скриншот всей страницы
    val pageArchiveFile: File?,                // ZIP архив страницы
    val thumbnailFile: File?,                  // Миниатюра
    val capturedAt: Long = System.currentTimeMillis()
)

/**
 * Содержимое страницы
 */
data class PageContent(
    val url: String,
    val title: String?,
    val description: String?,
    val adLinks: List<String> = emptyList()
)

/**
 * Результат захвата
 */
sealed class CaptureResult {
    data class Success(val creative: CapturedCreative) : CaptureResult()
    data class Error(val message: String, val cause: Throwable? = null) : CaptureResult()
}
