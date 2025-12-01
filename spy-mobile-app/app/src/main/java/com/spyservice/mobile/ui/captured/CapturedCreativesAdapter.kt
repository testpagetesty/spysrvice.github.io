package com.spyservice.mobile.ui.captured

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.spyservice.mobile.data.local.CapturedCreativeEntity
import com.spyservice.mobile.databinding.ItemCapturedCreativeBinding
import java.text.SimpleDateFormat
import java.util.*

class CapturedCreativesAdapter(
    private val onUploadClick: (CapturedCreativeEntity) -> Unit,
    private val onDeleteClick: (CapturedCreativeEntity) -> Unit
) : ListAdapter<CapturedCreativeEntity, CapturedCreativesAdapter.ViewHolder>(DiffCallback()) {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemCapturedCreativeBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
    
    inner class ViewHolder(
        private val binding: ItemCapturedCreativeBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        
        fun bind(creative: CapturedCreativeEntity) {
            binding.apply {
                textTitle.text = creative.title ?: "No Title"
                textUrl.text = creative.landingUrl
                textDescription.text = creative.description ?: "No description available"
                
                // Format date
                val dateFormat = SimpleDateFormat("dd.MM.yyyy HH:mm", Locale.getDefault())
                textCapturedAt.text = dateFormat.format(Date(creative.capturedAt))
                
                // Show file status including archive info
                val fileStatusParts = mutableListOf<String>()
                
                // Check for files
                if (creative.landingImagePath != null) fileStatusParts.add("✓ Landing")
                if (creative.fullScreenshotPath != null) fileStatusParts.add("✓ Screenshot")
                if (creative.thumbnailPath != null) fileStatusParts.add("✓ Thumbnail")
                
                if (creative.pageArchivePath != null) {
                    val archiveSize = creative.archiveSizeBytes?.let { formatFileSize(it) } ?: "Unknown size"
                    fileStatusParts.add("✓ Archive ($archiveSize)")
                } else {
                    fileStatusParts.add("✗ Archive")
                }
                
                textFileStatus.text = "Files: ${fileStatusParts.joinToString(", ")}"
                
                // Upload status
                if (creative.uploaded) {
                    textUploadStatus.text = "✅ Uploaded"
                    textUploadStatus.setTextColor(
                        itemView.context.getColor(android.R.color.holo_green_dark)
                    )
                    buttonUpload.isEnabled = false
                    buttonUpload.text = "Uploaded"
                } else {
                    textUploadStatus.text = "⏳ Not uploaded"
                    textUploadStatus.setTextColor(
                        itemView.context.getColor(android.R.color.holo_orange_dark)
                    )
                    buttonUpload.isEnabled = true
                    buttonUpload.text = "Upload"
                }
                
                // File status
                val hasScreenshot = !creative.fullScreenshotPath.isNullOrEmpty() && 
                                   java.io.File(creative.fullScreenshotPath).exists()
                val hasThumbnail = !creative.thumbnailPath.isNullOrEmpty() && 
                                  java.io.File(creative.thumbnailPath).exists()
                val hasArchive = !creative.pageArchivePath.isNullOrEmpty() && 
                                java.io.File(creative.pageArchivePath).exists()
                
                textFileStatus.text = "Files: " +
                    "${if (hasScreenshot) "✓" else "✗"} Screenshot, " +
                    "${if (hasThumbnail) "✓" else "✗"} Thumbnail, " +
                    "${if (hasArchive) "✓" else "✗"} Archive"
                
                // Click listeners
                buttonUpload.setOnClickListener {
                    onUploadClick(creative)
                }
                
                buttonDelete.setOnClickListener {
                    onDeleteClick(creative)
                }
            }
        }
    }
    
    private class DiffCallback : DiffUtil.ItemCallback<CapturedCreativeEntity>() {
        override fun areItemsTheSame(
            oldItem: CapturedCreativeEntity,
            newItem: CapturedCreativeEntity
        ): Boolean {
            return oldItem.id == newItem.id
        }
        
        override fun areContentsTheSame(
            oldItem: CapturedCreativeEntity,
            newItem: CapturedCreativeEntity
        ): Boolean {
            return oldItem == newItem
        }
    }
    
    private fun formatFileSize(bytes: Long): String {
        return when {
            bytes < 1024 -> "${bytes} B"
            bytes < 1024 * 1024 -> "${bytes / 1024} KB"
            else -> "${bytes / (1024 * 1024)} MB"
        }
    }
}
