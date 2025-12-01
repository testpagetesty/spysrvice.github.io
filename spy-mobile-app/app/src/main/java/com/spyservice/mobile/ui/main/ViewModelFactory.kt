package com.spyservice.mobile.ui.main

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.spyservice.mobile.data.repository.CreativeRepository
import com.spyservice.mobile.data.repository.SettingsRepository

class ViewModelFactory(
    private val settingsRepository: SettingsRepository,
    private val creativeRepository: CreativeRepository
) : ViewModelProvider.Factory {
    
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(MainViewModel::class.java)) {
            return MainViewModel(settingsRepository, creativeRepository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

