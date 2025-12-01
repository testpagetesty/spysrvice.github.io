package com.spyservice.mobile.ui.main

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.spyservice.mobile.data.model.CaptureResult
import com.spyservice.mobile.data.repository.SettingsRepository
import com.spyservice.mobile.data.repository.CreativeRepository
import kotlinx.coroutines.launch

class MainViewModel(
    private val settingsRepository: SettingsRepository,
    private val creativeRepository: CreativeRepository
) : ViewModel() {
    
    private val _captureStatus = MutableLiveData<CaptureStatus>(CaptureStatus.Idle)
    val captureStatus: LiveData<CaptureStatus> = _captureStatus
    
    fun hasSettings(): Boolean {
        return settingsRepository.hasSettings()
    }
    
    fun captureCreative() {
        viewModelScope.launch {
            _captureStatus.value = CaptureStatus.Loading
            
            try {
                // ИЗМЕНЕНИЕ: Теперь только захватываем локально, БЕЗ загрузки на сервер
                val result = creativeRepository.captureCreative()
                
                when (result) {
                    is CaptureResult.Success -> {
                        _captureStatus.value = CaptureStatus.Success
                    }
                    is CaptureResult.Error -> {
                        _captureStatus.value = CaptureStatus.Error(result.message)
                    }
                    null -> {
                        _captureStatus.value = CaptureStatus.Error("Capture failed: Unknown error")
                    }
                }
            } catch (e: Exception) {
                _captureStatus.value = CaptureStatus.Error(e.message ?: "Unknown error")
            }
        }
    }
}

sealed class CaptureStatus {
    object Idle : CaptureStatus()
    object Loading : CaptureStatus()
    object Success : CaptureStatus()
    data class Error(val message: String) : CaptureStatus()
}

