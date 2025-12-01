package com.spyservice.mobile.ui.settings

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.spyservice.mobile.data.model.ReferenceItem
import com.spyservice.mobile.data.repository.SettingsRepository
import com.spyservice.mobile.data.repository.ReferenceRepository
import kotlinx.coroutines.launch

class SettingsViewModel(
    private val settingsRepository: SettingsRepository,
    private val referenceRepository: ReferenceRepository
) : ViewModel() {
    
    private val _formats = MutableLiveData<List<ReferenceItem>>()
    val formats: LiveData<List<ReferenceItem>> = _formats
    
    private val _types = MutableLiveData<List<ReferenceItem>>()
    val types: LiveData<List<ReferenceItem>> = _types
    
    private val _placements = MutableLiveData<List<ReferenceItem>>()
    val placements: LiveData<List<ReferenceItem>> = _placements
    
    private val _countries = MutableLiveData<List<ReferenceItem>>()
    val countries: LiveData<List<ReferenceItem>> = _countries
    
    private val _platforms = MutableLiveData<List<ReferenceItem>>()
    val platforms: LiveData<List<ReferenceItem>> = _platforms
    
    private val _currentSettings = MutableLiveData<AppSettings?>()
    val currentSettings: LiveData<AppSettings?> = _currentSettings
    
    private val _saveStatus = MutableLiveData<Boolean>()
    val saveStatus: LiveData<Boolean> = _saveStatus
    
    fun loadReferenceData() {
        viewModelScope.launch {
            try {
                _formats.value = referenceRepository.getFormats()
                _types.value = referenceRepository.getTypes()
                _placements.value = referenceRepository.getPlacements()
                _countries.value = referenceRepository.getCountries()
                _platforms.value = referenceRepository.getPlatforms()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
    
    fun loadSettings() {
        viewModelScope.launch {
            _currentSettings.value = settingsRepository.getSettings()
        }
    }
    
    fun saveSettings(
        format: String,
        type: String,
        placement: String,
        country: String,
        platform: String,
        cloaking: Boolean,
        archiveMode: ArchiveMode
    ) {
        viewModelScope.launch {
            try {
                val settings = AppSettings(
                    format = format,
                    type = type,
                    placement = placement,
                    country = country,
                    platform = platform,
                    cloaking = cloaking,
                    archiveMode = archiveMode
                )
                settingsRepository.saveSettings(settings)
                _saveStatus.value = true
            } catch (e: Exception) {
                e.printStackTrace()
                _saveStatus.value = false
            }
        }
    }
}

data class AppSettings(
    val format: String,
    val type: String,
    val placement: String,
    val country: String,
    val platform: String,
    val cloaking: Boolean,
    val archiveMode: ArchiveMode = ArchiveMode.ZIP
)

enum class ArchiveMode(val displayName: String, val fileExtension: String) {
    ZIP("Полный архив (ZIP)", "zip"),
    MHTML("Веб-страница, один файл (MHTML)", "mhtml")
}

