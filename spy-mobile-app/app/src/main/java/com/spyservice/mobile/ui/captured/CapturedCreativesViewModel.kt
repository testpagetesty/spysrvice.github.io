package com.spyservice.mobile.ui.captured

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.asLiveData
import androidx.lifecycle.viewModelScope
import com.spyservice.mobile.data.local.CapturedCreativeEntity
import com.spyservice.mobile.data.repository.CreativeRepository
import com.spyservice.mobile.data.repository.LocalCreativeRepository
import com.spyservice.mobile.data.repository.SettingsRepository
import kotlinx.coroutines.launch

class CapturedCreativesViewModel(
    private val localRepository: LocalCreativeRepository,
    private val creativeRepository: CreativeRepository,
    private val settingsRepository: SettingsRepository
) : ViewModel() {
    
    val creatives: LiveData<List<CapturedCreativeEntity>> = 
        localRepository.getAllCreatives().asLiveData()
    
    private val _uploadStatus = MutableLiveData<UploadStatus>(UploadStatus.Idle)
    val uploadStatus: LiveData<UploadStatus> = _uploadStatus
    
    private val _deleteStatus = MutableLiveData<Boolean>()
    val deleteStatus: LiveData<Boolean> = _deleteStatus
    
    fun uploadCreative(creativeId: Long) {
        viewModelScope.launch {
            try {
                _uploadStatus.value = UploadStatus.Loading
                
                val settings = settingsRepository.getSettings()
                if (settings == null) {
                    _uploadStatus.value = UploadStatus.Error("Settings not configured")
                    return@launch
                }
                
                val success = creativeRepository.uploadCapturedCreativeById(creativeId, settings)
                
                if (success) {
                    _uploadStatus.value = UploadStatus.Success
                } else {
                    _uploadStatus.value = UploadStatus.Error("Upload failed")
                }
            } catch (e: Exception) {
                _uploadStatus.value = UploadStatus.Error(e.message ?: "Unknown error")
            }
        }
    }
    
    fun deleteCreative(creativeId: Long) {
        viewModelScope.launch {
            try {
                localRepository.deleteCreative(creativeId)
                _deleteStatus.value = true
            } catch (e: Exception) {
                _deleteStatus.value = false
            }
        }
    }
    
    fun refreshCreatives() {
        // LiveData automatically refreshes from database
        // This method can be used for manual refresh if needed
    }
}

sealed class UploadStatus {
    object Idle : UploadStatus()
    object Loading : UploadStatus()
    object Success : UploadStatus()
    data class Error(val message: String) : UploadStatus()
}
