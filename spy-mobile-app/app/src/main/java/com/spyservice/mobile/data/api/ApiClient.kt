package com.spyservice.mobile.data.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    
    // Базовые URL
    private const val BASE_URL = "https://spysrvice-github-io-2b22.vercel.app"
    private const val SUPABASE_URL = "https://oilwcbfyhutzyjzlqbuk.supabase.co"
    private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTQ5NDAsImV4cCI6MjA3ODM3MDk0MH0.pQAq4iav6pO4Oh3D1XqYVAXGc2iBy5hTJuDconcws8I"
    
    private val loggingInterceptor by lazy {
        HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
    }
    
    private val okHttpClient by lazy {
        OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .connectTimeout(60, TimeUnit.SECONDS)  // Увеличено для больших файлов
            .readTimeout(120, TimeUnit.SECONDS)    // Увеличено для больших файлов (17MB+)
            .writeTimeout(120, TimeUnit.SECONDS)   // Увеличено для больших файлов (17MB+)
            .build()
    }
    
    // Retrofit для основного API (создание креативов)
    private val creativeRetrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
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
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
    
    val creativeApi: CreativeApi by lazy {
        creativeRetrofit.create(CreativeApi::class.java)
    }
    
    val referenceApi: ReferenceApi by lazy {
        supabaseRetrofit.create(ReferenceApi::class.java)
    }
}

