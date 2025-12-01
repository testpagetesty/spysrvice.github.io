package com.spyservice.mobile.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

/**
 * DAO для работы с захваченными креативами
 */
@Dao
interface CapturedCreativeDao {
    
    @Query("SELECT * FROM captured_creatives ORDER BY capturedAt DESC")
    fun getAll(): Flow<List<CapturedCreativeEntity>>
    
    @Query("SELECT * FROM captured_creatives WHERE uploaded = 0 ORDER BY capturedAt DESC")
    fun getNotUploaded(): Flow<List<CapturedCreativeEntity>>
    
    @Query("SELECT * FROM captured_creatives WHERE id = :id")
    suspend fun getById(id: Long): CapturedCreativeEntity?
    
    @Insert
    suspend fun insert(creative: CapturedCreativeEntity): Long
    
    @Update
    suspend fun update(creative: CapturedCreativeEntity)
    
    @Query("DELETE FROM captured_creatives WHERE id = :id")
    suspend fun delete(id: Long)
    
    @Query("UPDATE captured_creatives SET uploaded = 1, uploadedAt = :uploadedAt WHERE id = :id")
    suspend fun markAsUploaded(id: Long, uploadedAt: Long)
    
    @Query("SELECT COUNT(*) FROM captured_creatives WHERE uploaded = 0")
    suspend fun getNotUploadedCount(): Int
}
