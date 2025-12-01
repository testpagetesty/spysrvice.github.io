package com.spyservice.mobile.data.local

import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import android.content.Context

/**
 * Локальная база данных приложения
 */
@Database(
    entities = [CapturedCreativeEntity::class],
    version = 2,
    exportSchema = false
)
abstract class SpyServiceDatabase : RoomDatabase() {
    
    abstract fun capturedCreativeDao(): CapturedCreativeDao
    
    companion object {
        @Volatile
        private var INSTANCE: SpyServiceDatabase? = null
        
        // Миграция с версии 1 на версию 2 (добавление поля archiveSizeBytes)
        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL("ALTER TABLE captured_creatives ADD COLUMN archiveSizeBytes INTEGER")
            }
        }
        
        fun getDatabase(context: Context): SpyServiceDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    SpyServiceDatabase::class.java,
                    "spy_service_database"
                )
                .addMigrations(MIGRATION_1_2)
                .fallbackToDestructiveMigration() // Если миграция не сработает, пересоздаем БД
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
