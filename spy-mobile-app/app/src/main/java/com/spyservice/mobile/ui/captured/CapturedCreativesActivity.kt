package com.spyservice.mobile.ui.captured

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.spyservice.mobile.R
import com.spyservice.mobile.SpyServiceApplication
import com.spyservice.mobile.databinding.ActivityCapturedCreativesBinding

class CapturedCreativesActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityCapturedCreativesBinding
    private lateinit var viewModel: CapturedCreativesViewModel
    private lateinit var adapter: CapturedCreativesAdapter
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCapturedCreativesBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        try {
            val app = application as SpyServiceApplication
            val viewModelFactory = CapturedCreativesViewModelFactory(
                app.localCreativeRepository,
                app.creativeRepository,
                app.settingsRepository
            )
            viewModel = ViewModelProvider(this, viewModelFactory)[CapturedCreativesViewModel::class.java]
            
            setupUI()
            observeViewModel()
        } catch (e: Exception) {
            Toast.makeText(this, "Error initializing: ${e.message}", Toast.LENGTH_LONG).show()
            e.printStackTrace()
            finish()
        }
    }
    
    private fun setupUI() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Captured Creatives"
        
        // Setup RecyclerView
        adapter = CapturedCreativesAdapter(
            onUploadClick = { creative ->
                viewModel.uploadCreative(creative.id)
            },
            onDeleteClick = { creative ->
                viewModel.deleteCreative(creative.id)
            }
        )
        
        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.recyclerView.adapter = adapter
        
        // Refresh button
        binding.fabRefresh.setOnClickListener {
            viewModel.refreshCreatives()
        }
    }
    
    private fun observeViewModel() {
        viewModel.creatives.observe(this) { creatives ->
            adapter.submitList(creatives)
            
            if (creatives.isEmpty()) {
                binding.emptyView.visibility = android.view.View.VISIBLE
                binding.recyclerView.visibility = android.view.View.GONE
            } else {
                binding.emptyView.visibility = android.view.View.GONE
                binding.recyclerView.visibility = android.view.View.VISIBLE
            }
        }
        
        viewModel.uploadStatus.observe(this) { status ->
            when (status) {
                is UploadStatus.Loading -> {
                    // Show progress
                }
                is UploadStatus.Success -> {
                    Toast.makeText(this, "Creative uploaded successfully!", Toast.LENGTH_SHORT).show()
                }
                is UploadStatus.Error -> {
                    Toast.makeText(this, "Upload failed: ${status.message}", Toast.LENGTH_LONG).show()
                }
                is UploadStatus.Idle -> {
                    // Hide progress
                }
            }
        }
        
        viewModel.deleteStatus.observe(this) { success ->
            if (success) {
                Toast.makeText(this, "Creative deleted", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }
}
