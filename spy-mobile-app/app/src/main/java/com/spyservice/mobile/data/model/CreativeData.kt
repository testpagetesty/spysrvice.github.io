package com.spyservice.mobile.data.model

import java.io.File

data class CreativeData(
    val title: String?,
    val description: String?,
    val landing_url: String?,
    val source_link: String?,
    val captured_at: String,
    val media_file: File?,
    val thumbnail_file: File?,
    val zip_file: File?
)

