package com.spyservice.mobile.data.api

import com.spyservice.mobile.data.model.CreativeResponse
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

interface CreativeApi {
    
    @Multipart
    @POST("/api/creatives")
    suspend fun createCreative(
        @Part("title") title: RequestBody?,
        @Part("description") description: RequestBody?,
        @Part("format") format: RequestBody,
        @Part("type") type: RequestBody,
        @Part("placement") placement: RequestBody,
        @Part("country") country: RequestBody,
        @Part("platform") platform: RequestBody,
        @Part("cloaking") cloaking: RequestBody,
        @Part("landing_url") landingUrl: RequestBody?,
        @Part("source_link") sourceLink: RequestBody?,
        @Part("source_device") sourceDevice: RequestBody,
        @Part("captured_at") capturedAt: RequestBody?,
        @Part("download_url") downloadUrl: RequestBody?, // URL файла из Supabase Storage
        @Part mediaFile: MultipartBody.Part?,
        @Part thumbnailFile: MultipartBody.Part?
    ): Response<CreativeResponse>
}

