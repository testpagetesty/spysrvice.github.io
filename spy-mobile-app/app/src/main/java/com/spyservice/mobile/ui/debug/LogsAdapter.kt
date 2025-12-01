package com.spyservice.mobile.ui.debug

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Color
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.Toast
import androidx.recyclerview.widget.RecyclerView
import com.spyservice.mobile.databinding.ItemLogEntryBinding
import com.spyservice.mobile.utils.InAppLogger

class LogsAdapter : RecyclerView.Adapter<LogsAdapter.LogViewHolder>() {
    
    private var logs = listOf<InAppLogger.LogEntry>()
    
    fun updateLogs(newLogs: List<InAppLogger.LogEntry>) {
        logs = newLogs
        notifyDataSetChanged()
    }
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): LogViewHolder {
        val binding = ItemLogEntryBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return LogViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: LogViewHolder, position: Int) {
        holder.bind(logs[position])
    }
    
    override fun getItemCount(): Int = logs.size
    
    class LogViewHolder(
        private val binding: ItemLogEntryBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        
        fun bind(log: InAppLogger.LogEntry) {
            binding.textTimestamp.text = log.timestamp
            binding.textLevel.text = log.level
            binding.textTag.text = log.tag
            binding.textMessage.text = log.message
            
            // Цветовая кодировка по уровню
            val color = when (log.level) {
                "ERROR", "FAILURE" -> Color.RED
                "WARN" -> Color.parseColor("#FF9800") // Orange
                "SUCCESS" -> Color.parseColor("#4CAF50") // Green
                "STEP" -> Color.parseColor("#2196F3") // Blue
                "INFO" -> Color.parseColor("#607D8B") // Blue Grey
                else -> Color.BLACK
            }
            
            binding.textLevel.setTextColor(color)
            binding.textMessage.setTextColor(color)
            
            // Долгое нажатие для копирования отдельной записи
            binding.root.setOnLongClickListener {
                copyLogEntryToClipboard(log)
                true
            }
        }
        
        private fun copyLogEntryToClipboard(log: InAppLogger.LogEntry) {
            try {
                val context = binding.root.context
                val logText = "${log.timestamp} [${log.level}] ${log.tag}: ${log.message}"
                
                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = ClipData.newPlainText("Log Entry", logText)
                clipboard.setPrimaryClip(clip)
                
                Toast.makeText(context, "📋 Log entry copied to clipboard", Toast.LENGTH_SHORT).show()
                InAppLogger.i("CLIPBOARD", "Single log entry copied to clipboard")
                
            } catch (e: Exception) {
                val context = binding.root.context
                Toast.makeText(context, "❌ Error copying log: ${e.message}", Toast.LENGTH_SHORT).show()
                InAppLogger.e("CLIPBOARD", "Error copying single log entry", e)
            }
        }
    }
}
