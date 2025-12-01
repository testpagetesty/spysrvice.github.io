package com.spyservice.mobile.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.spyservice.mobile.data.repository.ReferenceRepository
import com.spyservice.mobile.data.repository.SettingsRepository

class SettingsViewModelFactory(
    private val settingsRepository: SettingsRepository,
    private val referenceRepository: ReferenceRepository
) : ViewModelProvider.Factory {
    
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(SettingsViewModel::class.java)) {
            return SettingsViewModel(settingsRepository, referenceRepository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

