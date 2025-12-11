package com.spyservice.mobile.data.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import java.util.concurrent.TimeUnit

object ApiClient {
    
    // Базовые URL
    private const val BASE_URL = "https://spysrvice-github-io-2b22.vercel.app"
    const val SUPABASE_URL = "https://oilwcbfyhutzyjzlqbuk.supabase.co"
    const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTQ5NDAsImV4cCI6MjA3ODM3MDk0MH0.pQAq4iav6pO4Oh3D1XqYVAXGc2iBy5hTJuDconcws8I"
    
    private val loggingInterceptor by lazy {
        HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
    }
    
    // Gson с lenient режимом для обработки невалидного JSON
    private val gson: Gson by lazy {
        GsonBuilder()
            .setLenient() // Разрешаем невалидный JSON
            .setPrettyPrinting()
            .create()
    }
    
    private val okHttpClient by lazy {
        OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .connectTimeout(600, TimeUnit.SECONDS)  // 10 минут для подключения
            .readTimeout(600, TimeUnit.SECONDS)      // 10 минут для чтения (для больших файлов)
            .writeTimeout(600, TimeUnit.SECONDS)    // 10 минут для записи (для больших файлов)
            .retryOnConnectionFailure(true)         // Повтор при ошибке соединения
            .connectionPool(okhttp3.ConnectionPool(5, 5, TimeUnit.MINUTES)) // Keep-alive соединения
            .build()
    }
    
    // Retrofit для основного API (создание креативов)
    private val creativeRetrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(
                okHttpClient.newBuilder()
                    .addInterceptor { chain ->
                        val originalRequest = chain.request()
                        val requestBuilder = originalRequest.newBuilder()
                            .addHeader("User-Agent", "SpyService-Mobile-Android/1.0")
                            .addHeader("Accept", "*/*")
                            .addHeader("Accept-Encoding", "gzip, deflate, br")
                            .addHeader("Connection", "keep-alive")
                            .addHeader("Cache-Control", "no-cache")
                        val request = requestBuilder.build()
                        chain.proceed(request)
                    }
                    .build()
            )
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }
    
    // Retrofit для Supabase REST API (справочники)
    private val supabaseRetrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(SUPABASE_URL)
            .client(
                okHttpClient.newBuilder()
                    .addInterceptor { chain ->
                        val request = chain.request().newBuilder()
                            .addHeader("apikey", SUPABASE_ANON_KEY)
                            .addHeader("Authorization", "Bearer $SUPABASE_ANON_KEY")
                            .build()
                        chain.proceed(request)
                    }
                    .build()
            )
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    val creativeApi: CreativeApi by lazy {
        creativeRetrofit.create(CreativeApi::class.java)
    }
    
    val referenceApi: ReferenceApi by lazy {
        supabaseRetrofit.create(ReferenceApi::class.java)
    }
}

