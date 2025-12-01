package com.spyservice.mobile.ui.captured

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.spyservice.mobile.data.repository.CreativeRepository
import com.spyservice.mobile.data.repository.LocalCreativeRepository
import com.spyservice.mobile.data.repository.SettingsRepository

class CapturedCreativesViewModelFactory(
    private val localRepository: LocalCreativeRepository,
    private val creativeRepository: CreativeRepository,
    private val settingsRepository: SettingsRepository
) : ViewModelProvider.Factory {
    
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(CapturedCreativesViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return CapturedCreativesViewModel(
                localRepository,
                creativeRepository,
                settingsRepository
            ) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
