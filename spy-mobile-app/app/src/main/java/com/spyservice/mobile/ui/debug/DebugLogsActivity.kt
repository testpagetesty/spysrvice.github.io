package com.spyservice.mobile.ui.debug

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import com.spyservice.mobile.databinding.ActivityDebugLogsBinding
import com.spyservice.mobile.utils.InAppLogger

class DebugLogsActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityDebugLogsBinding
    private lateinit var adapter: LogsAdapter
    private val handler = Handler(Looper.getMainLooper())
    private var autoRefreshRunnable: Runnable? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityDebugLogsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupUI()
        setupRecyclerView()
        startAutoRefresh()
    }
    
    private fun setupUI() {
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Debug Logs"
        
        binding.buttonClearLogs.setOnClickListener {
            InAppLogger.clearLogs()
            refreshLogs()
        }
        
        binding.buttonExportLogs.setOnClickListener {
            exportLogs()
        }
        
        binding.buttonRefresh.setOnClickListener {
            refreshLogs()
        }
        
        binding.buttonCopyLogs.setOnClickListener {
            copyAllLogsToClipboard()
        }
    }
    
    private fun setupRecyclerView() {
        adapter = LogsAdapter()
        binding.recyclerViewLogs.layoutManager = LinearLayoutManager(this)
        binding.recyclerViewLogs.adapter = adapter
        
        refreshLogs()
    }
    
    private fun refreshLogs() {
        val logs = InAppLogger.getAllLogs()
        adapter.updateLogs(logs)
        
        // Прокрутить к последнему логу
        if (logs.isNotEmpty()) {
            binding.recyclerViewLogs.scrollToPosition(logs.size - 1)
        }
        
        // Обновить счетчик
        binding.textLogCount.text = "Logs: ${logs.size}"
    }
    
    private fun startAutoRefresh() {
        autoRefreshRunnable = object : Runnable {
            override fun run() {
                refreshLogs()
                handler.postDelayed(this, 2000) // Обновлять каждые 2 секунды
            }
        }
        handler.post(autoRefreshRunnable!!)
    }
    
    private fun stopAutoRefresh() {
        autoRefreshRunnable?.let { handler.removeCallbacks(it) }
    }
    
    private fun copyAllLogsToClipboard() {
        try {
            val logs = InAppLogger.getAllLogs()
            if (logs.isEmpty()) {
                Toast.makeText(this, "No logs to copy", Toast.LENGTH_SHORT).show()
                return
            }
            
            // Форматируем логи в читаемый текст
            val logsText = logs.joinToString("\n") { log ->
                "${log.timestamp} [${log.level}] ${log.tag}: ${log.message}"
            }
            
            // Копируем в буфер обмена
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("Debug Logs", logsText)
            clipboard.setPrimaryClip(clip)
            
            // Показываем уведомление
            Toast.makeText(this, "✅ All logs copied to clipboard (${logs.size} entries)", Toast.LENGTH_LONG).show()
            
            // Логируем действие
            InAppLogger.i("CLIPBOARD", "All logs copied to clipboard (${logs.size} entries)")
            
        } catch (e: Exception) {
            Toast.makeText(this, "❌ Error copying logs: ${e.message}", Toast.LENGTH_LONG).show()
            InAppLogger.e("CLIPBOARD", "Error copying logs to clipboard", e)
        }
    }
    
    private fun exportLogs() {
        val logFile = InAppLogger.exportLogs(this)
        if (logFile != null) {
            // Поделиться файлом
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_STREAM, androidx.core.content.FileProvider.getUriForFile(
                    this@DebugLogsActivity,
                    "${packageName}.fileprovider",
                    logFile
                ))
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            startActivity(Intent.createChooser(shareIntent, "Export Logs"))
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopAutoRefresh()
    }
    
    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }
}
