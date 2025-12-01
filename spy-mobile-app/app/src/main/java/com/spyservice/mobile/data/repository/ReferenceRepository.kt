package com.spyservice.mobile.data.repository

import com.spyservice.mobile.data.api.ReferenceApi
import com.spyservice.mobile.data.model.ReferenceItem

class ReferenceRepository(
    private val api: ReferenceApi
) {
    
    suspend fun getFormats(): List<ReferenceItem> {
        return try {
            val response = api.getFormats()
            if (response.isSuccessful) {
                response.body() ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }
    
    suspend fun getTypes(): List<ReferenceItem> {
        return try {
            val response = api.getTypes()
            if (response.isSuccessful) {
                response.body() ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }
    
    suspend fun getPlacements(): List<ReferenceItem> {
        return try {
            val response = api.getPlacements()
            if (response.isSuccessful) {
                response.body() ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }
    
    suspend fun getCountries(): List<ReferenceItem> {
        return try {
            val response = api.getCountries()
            if (response.isSuccessful) {
                val countries = response.body() ?: emptyList()
                // Конвертируем CountryItem в ReferenceItem
                countries.map { 
                    ReferenceItem(
                        id = it.code, // Используем code как id для стран
                        code = it.code,
                        name = it.name
                    )
                }
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }
    
    suspend fun getPlatforms(): List<ReferenceItem> {
        return try {
            val response = api.getPlatforms()
            if (response.isSuccessful) {
                response.body() ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }
}

