package com.spyservice.mobile.data.api

import com.spyservice.mobile.data.model.ReferenceItem
import retrofit2.Response
import retrofit2.http.GET

interface ReferenceApi {
    
    @GET("/rest/v1/formats?select=id,code,name&order=name")
    suspend fun getFormats(): Response<List<ReferenceItem>>
    
    @GET("/rest/v1/types?select=id,code,name&order=name")
    suspend fun getTypes(): Response<List<ReferenceItem>>
    
    @GET("/rest/v1/placements?select=id,code,name&order=name")
    suspend fun getPlacements(): Response<List<ReferenceItem>>
    
    @GET("/rest/v1/platforms?select=id,code,name&order=name")
    suspend fun getPlatforms(): Response<List<ReferenceItem>>
    
    @GET("/rest/v1/countries?select=code,name&order=name")
    suspend fun getCountries(): Response<List<CountryItem>>
}

// Для стран структура немного другая (нет id, только code)
data class CountryItem(
    val code: String,
    val name: String
)

