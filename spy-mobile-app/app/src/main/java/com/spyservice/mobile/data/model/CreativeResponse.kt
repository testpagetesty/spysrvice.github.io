package com.spyservice.mobile.data.model

data class CreativeResponse(
    val success: Boolean,
    val creative: Creative?,
    val urls: Urls?
)

data class Creative(
    val id: String,
    val title: String?,
    val captured_at: String
)

data class Urls(
    val mediaUrl: String?,
    val thumbnailUrl: String?,
    val downloadUrl: String?
)

