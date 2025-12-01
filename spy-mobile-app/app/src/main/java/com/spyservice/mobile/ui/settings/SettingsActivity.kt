package com.spyservice.mobile.ui.settings

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.spyservice.mobile.R
import com.spyservice.mobile.SpyServiceApplication
import com.spyservice.mobile.data.model.ReferenceItem
import com.spyservice.mobile.databinding.ActivitySettingsBinding

class SettingsActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivitySettingsBinding
    private lateinit var viewModel: SettingsViewModel
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        val app = application as SpyServiceApplication
        val viewModelFactory = SettingsViewModelFactory(
            app.settingsRepository,
            app.referenceRepository
        )
        viewModel = ViewModelProvider(this, viewModelFactory)[SettingsViewModel::class.java]
        
        setupUI()
        observeViewModel()
        loadSettings()
    }
    
    private fun setupUI() {
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = getString(R.string.settings_title)
        
        binding.buttonSave.setOnClickListener {
            saveSettings()
        }
        
        // Загрузка справочников
        viewModel.loadReferenceData()
    }
    
    private fun observeViewModel() {
        viewModel.formats.observe(this) { formats ->
            updateSpinner(binding.spinnerFormat, formats)
        }
        
        viewModel.types.observe(this) { types ->
            updateSpinner(binding.spinnerType, types)
        }
        
        viewModel.placements.observe(this) { placements ->
            updateSpinner(binding.spinnerPlacement, placements)
        }
        
        viewModel.countries.observe(this) { countries ->
            updateSpinner(binding.spinnerCountry, countries)
        }
        
        viewModel.platforms.observe(this) { platforms ->
            updateSpinner(binding.spinnerPlatform, platforms)
        }
        
        viewModel.saveStatus.observe(this) { status ->
            if (status) {
                Toast.makeText(this, R.string.settings_saved, Toast.LENGTH_SHORT).show()
                finish()
            }
        }
    }
    
    private fun updateSpinner(spinner: android.widget.Spinner, items: List<ReferenceItem>) {
        val adapter = android.widget.ArrayAdapter(
            this,
            android.R.layout.simple_spinner_item,
            items.map { it.name }
        ).apply {
            setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        }
        spinner.adapter = adapter
    }
    
    private fun loadSettings() {
        viewModel.loadSettings()
        viewModel.currentSettings.observe(this) { settings ->
            settings?.let {
                // Установить выбранные значения в спиннеры
                setSpinnerSelection(binding.spinnerFormat, it.format)
                setSpinnerSelection(binding.spinnerType, it.type)
                setSpinnerSelection(binding.spinnerPlacement, it.placement)
                setSpinnerSelection(binding.spinnerCountry, it.country)
                setSpinnerSelection(binding.spinnerPlatform, it.platform)
                binding.switchCloaking.isChecked = it.cloaking
                
                // Установить режим архивирования
                when (it.archiveMode) {
                    ArchiveMode.ZIP -> binding.radioZip.isChecked = true
                    ArchiveMode.MHTML -> binding.radioMhtml.isChecked = true
                }
            }
        }
    }
    
    private fun setSpinnerSelection(spinner: android.widget.Spinner, code: String) {
        val adapter = spinner.adapter as? android.widget.ArrayAdapter<*>
        adapter?.let {
            for (i in 0 until it.count) {
                // Найти по коду и установить позицию
                // Упрощенная версия - в реальности нужно хранить код вместе с именем
            }
        }
    }
    
    private fun saveSettings() {
        val format = viewModel.formats.value?.getOrNull(binding.spinnerFormat.selectedItemPosition)?.code ?: ""
        val type = viewModel.types.value?.getOrNull(binding.spinnerType.selectedItemPosition)?.code ?: ""
        val placement = viewModel.placements.value?.getOrNull(binding.spinnerPlacement.selectedItemPosition)?.code ?: ""
        val country = viewModel.countries.value?.getOrNull(binding.spinnerCountry.selectedItemPosition)?.code ?: ""
        val platform = viewModel.platforms.value?.getOrNull(binding.spinnerPlatform.selectedItemPosition)?.code ?: ""
        val cloaking = binding.switchCloaking.isChecked
        
        // Определить режим архивирования
        val archiveMode = when {
            binding.radioMhtml.isChecked -> ArchiveMode.MHTML
            else -> ArchiveMode.ZIP
        }
        
        if (format.isEmpty() || type.isEmpty() || placement.isEmpty() || country.isEmpty() || platform.isEmpty()) {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show()
            return
        }
        
        viewModel.saveSettings(format, type, placement, country, platform, cloaking, archiveMode)
    }
    
    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }
}

