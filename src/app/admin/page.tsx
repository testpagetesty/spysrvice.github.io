'use client'
import { useState, useEffect, useRef } from 'react'

// Icon components
const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

// Types
interface Creative {
  id: string
  title: string
  description?: string
  captured_at: string
  cloaking: boolean
  media_url?: string
  thumbnail_url?: string
  download_url?: string
  landing_url?: string
  source_link?: string
  source_device?: string
  country_code?: string
  status: 'draft' | 'published'
  moderated_at?: string
  moderated_by?: string
  created_at: string
  updated_at: string
  formats?: { name: string; code: string }
  types?: { name: string; code: string }
  placements?: { name: string; code: string }
  countries?: { name: string }
  platforms?: { name: string; code: string }
}

interface FilterOption {
  id: string
  code: string
  name: string
}

// Types for date input with showPicker
type DateInputWithPicker = HTMLInputElement & {
  showPicker?: () => void
}

const ALLOWED_FORMAT_CODES = ['teaser', 'video']
const ALLOWED_TYPE_CODES = ['crypt', 'gambling', 'nutra', 'news', 'product', 'nutra_vsl']
const ALLOWED_PLACEMENT_CODES = ['demand_gen', 'uac']
const ALLOWED_PLATFORM_CODES = ['web', 'google_play', 'youtube', 'discovery']

export default function AdminPage() {
  const [isLightTheme, setIsLightTheme] = useState(false)
  
  // Простое переключение темы через CSS инверсию
  const toggleTheme = () => {
    const newTheme = !isLightTheme
    setIsLightTheme(newTheme)
    if (newTheme) {
      document.documentElement.classList.add('light-theme')
    } else {
      document.documentElement.classList.remove('light-theme')
    }
    localStorage.setItem('theme', newTheme ? 'light' : 'dark')
  }

  // Загружаем сохраненную тему при монтировании
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'light') {
      setIsLightTheme(true)
      document.documentElement.classList.add('light-theme')
    }
  }, [])

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [selectedCreatives, setSelectedCreatives] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Filter states
  const [formats, setFormats] = useState<FilterOption[]>([])
  const [types, setTypes] = useState<FilterOption[]>([])
  const [placements, setPlacements] = useState<FilterOption[]>([])
  const [platforms, setPlatforms] = useState<FilterOption[]>([])
  const [countries, setCountries] = useState<FilterOption[]>([])

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    format: '',
    type: '',
    placement: '',
    country: '',
    platform: '',
    cloaking: '',
    status: 'draft' // Добавляем фильтр по статусу, по умолчанию показываем черновики
  })

  // Moderation states
  const [moderationStats, setModerationStats] = useState({
    draft: 0,
    published: 0,
    total: 0
  })
  const [bulkAction, setBulkAction] = useState('')
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'ads' | 'dashboard'>('list')
  
  // Ads settings states
  const [adsSettings, setAdsSettings] = useState<any[]>([])

  // Dashboard settings states
  const [dashboardFilterSettings, setDashboardFilterSettings] = useState({
    date: true,
    format: true,
    type: true,
    placement: true,
    country: true,
    platform: true,
    cloaking: true
  })

  // Загружаем настройки фильтров при открытии таба
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardSettings()
    }
  }, [activeTab])

  const loadDashboardSettings = async () => {
    try {
      const response = await fetch('/api/dashboard-settings')
      if (!response.ok) {
        throw new Error('Failed to load settings')
      }
      const data = await response.json()
      
      if (data.settings?.filters) {
        setDashboardFilterSettings({
          date: data.settings.filters.date !== false,
          format: data.settings.filters.format !== false,
          type: data.settings.filters.type !== false,
          placement: data.settings.filters.placement !== false,
          country: data.settings.filters.country !== false,
          platform: data.settings.filters.platform !== false,
          cloaking: data.settings.filters.cloaking !== false
        })
      }
    } catch (e) {
      console.error('Error loading dashboard settings:', e)
      // Fallback на localStorage если API недоступен
      const settings = localStorage.getItem('dashboardSettings')
      if (settings) {
        try {
          const parsed = JSON.parse(settings)
          if (parsed.filters) {
            setDashboardFilterSettings({
              date: parsed.filters.date !== false,
              format: parsed.filters.format !== false,
              type: parsed.filters.type !== false,
              placement: parsed.filters.placement !== false,
              country: parsed.filters.country !== false,
              platform: parsed.filters.platform !== false,
              cloaking: parsed.filters.cloaking !== false
            })
          }
        } catch (err) {
          console.error('Error parsing localStorage settings:', err)
        }
      }
    }
  }

  const saveDashboardFilterSettings = async (filterKey: string, value: boolean) => {
    try {
      // Обновляем локальное состояние сразу для мгновенного отклика UI
      const updatedFilters = {
        ...dashboardFilterSettings,
        [filterKey]: value
      }
      setDashboardFilterSettings(updatedFilters)
      
      // Сохраняем через API
      const saveResponse = await fetch('/api/dashboard-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: 'filters',
          value: updatedFilters
        })
      })
      
      if (!saveResponse.ok) {
        throw new Error('Failed to save settings')
      }
      
      // Также сохраняем в localStorage как fallback
      const settings = JSON.parse(localStorage.getItem('dashboardSettings') || '{}')
      settings.filters = updatedFilters
      localStorage.setItem('dashboardSettings', JSON.stringify(settings))
      
      // Отправляем событие для обновления главной страницы
      window.dispatchEvent(new Event('dashboardSettingsChanged'))
      
    } catch (e) {
      console.error('Error saving dashboard settings:', e)
      // Fallback на localStorage
      const settings = JSON.parse(localStorage.getItem('dashboardSettings') || '{}')
      settings.filters = settings.filters || {}
      settings.filters[filterKey] = value
      localStorage.setItem('dashboardSettings', JSON.stringify(settings))
      window.dispatchEvent(new Event('dashboardSettingsChanged'))
    }
  }
  const [editingAd, setEditingAd] = useState<any | null>(null)
  const [adForm, setAdForm] = useState({
    position: 'modal',
    type: 'code',
    title: '',
    enabled: true,
    content: '',
    image_url: '',
    link_url: '',
    width: '100%',
    height: 'auto',
    priority: 0
  })
  const [loadingAds, setLoadingAds] = useState(false)
  
  // Create form states
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    format: '',
    type: '',
    placement: '',
    country: '',
    platform: '',
    cloaking: false,
    landing_url: '',
    source_link: '',
    source_device: '',
    captured_at: ''
  })
  const [createFiles, setCreateFiles] = useState({
    media_file: null as File | null,
    thumbnail_file: null as File | null,
    zip_file: null as File | null
  })
  const [creating, setCreating] = useState(false)

  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showFullScreenshot, setShowFullScreenshot] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCreative, setEditingCreative] = useState<Creative | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [fieldEditValue, setFieldEditValue] = useState<string>('')
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    format: '',
    type: '',
    placement: '',
    country: '',
    platform: '',
    cloaking: false,
    landing_url: '',
    source_link: '',
    source_device: '',
    captured_at: ''
  })
  const [editFiles, setEditFiles] = useState({
    media_file: null as File | null,
    thumbnail_file: null as File | null,
    zip_file: null as File | null
  })
  const [saving, setSaving] = useState(false)
  const dateDropdownRef = useRef<HTMLDivElement>(null)

  const dateFromRef = useRef<DateInputWithPicker | null>(null)
  const dateToRef = useRef<DateInputWithPicker | null>(null)

  // Date presets
  const datePresets = [
    { label: 'Today', days: 0 },
    { label: 'Yesterday', days: 1 },
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'This Month', days: 'thisMonth' as const },
    { label: 'Last Month', days: 'lastMonth' as const }
  ]

  // Authentication
  const handleLogin = () => {
    if (password === 'Kk199107991@') {
      setIsAuthenticated(true)
      // Сохраняем состояние авторизации в localStorage
      localStorage.setItem('admin_authenticated', 'true')
      localStorage.setItem('admin_password', password)
      loadData()
    } else {
      alert('Неверный пароль!')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setPassword('')
    // Удаляем данные из localStorage
    localStorage.removeItem('admin_authenticated')
    localStorage.removeItem('admin_password')
  }

  // Проверяем сохраненную авторизацию при загрузке страницы
  useEffect(() => {
    const savedAuth = localStorage.getItem('admin_authenticated')
    const savedPassword = localStorage.getItem('admin_password')
    
    if (savedAuth === 'true' && savedPassword === 'Kk199107991@') {
      setIsAuthenticated(true)
    }
  }, [])

  // Загружаем данные при авторизации
  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  // Блокируем скролл страницы когда открыта модалка
  useEffect(() => {
    if (showModal || showFullScreenshot || showEditModal || showDeleteConfirm) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    // Cleanup: восстанавливаем скролл при размонтировании
    return () => {
      document.body.style.overflow = ''
    }
  }, [showModal, showFullScreenshot, showEditModal, showDeleteConfirm])

  // Date functions
  const openDatePicker = (ref: React.RefObject<DateInputWithPicker>) => {
    const input = ref.current
    input?.showPicker?.()
  }

  const getDateRangeLabel = () => {
    if (filters.dateFrom && filters.dateTo) {
      return `${filters.dateFrom} - ${filters.dateTo}`
    } else if (filters.dateFrom) {
      return `From ${filters.dateFrom}`
    } else if (filters.dateTo) {
      return `Until ${filters.dateTo}`
    }
    return 'All time'
  }

  const selectDatePreset = (preset: typeof datePresets[0]) => {
    const today = new Date()
    let dateFrom = ''
    let dateTo = ''

    if (typeof preset.days === 'number') {
      if (preset.days === 0) {
        // Today
        dateFrom = dateTo = today.toISOString().split('T')[0]
      } else if (preset.days === 1) {
        // Yesterday
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        dateFrom = dateTo = yesterday.toISOString().split('T')[0]
      } else {
        // Last N days
        const fromDate = new Date(today)
        fromDate.setDate(fromDate.getDate() - preset.days)
        dateFrom = fromDate.toISOString().split('T')[0]
        dateTo = today.toISOString().split('T')[0]
      }
    } else if (preset.days === 'thisMonth') {
      // This month
      dateFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
      dateTo = today.toISOString().split('T')[0]
    } else if (preset.days === 'lastMonth') {
      // Last month
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      dateFrom = lastMonth.toISOString().split('T')[0]
      dateTo = lastMonthEnd.toISOString().split('T')[0]
    }

    setFilters({...filters, dateFrom, dateTo})
    setShowDateDropdown(false)
  }

  // Modal functions
  const openModal = (creative: Creative) => {
    setSelectedCreative(creative)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedCreative(null)
    setShowFullScreenshot(false)
    setEditingField(null)
    setFieldEditValue('')
  }

  // Edit functions
  const openEditModal = (creative: Creative) => {
    setEditingCreative(creative)
    
    // Convert ISO date to datetime-local format for input
    // Format from DB: "2025-11-11T18:34:10.192+00:00" or "2025-11-11T18:34:10.192Z"
    // Format for input: "2025-11-11T18:34"
    let capturedAtFormatted = ''
    if (creative.captured_at) {
      try {
        const date = new Date(creative.captured_at)
        if (!isNaN(date.getTime())) {
          // Get local date/time components
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          const hours = String(date.getHours()).padStart(2, '0')
          const minutes = String(date.getMinutes()).padStart(2, '0')
          capturedAtFormatted = `${year}-${month}-${day}T${hours}:${minutes}`
        }
      } catch (e) {
        console.error('Error parsing date:', e)
      }
    }
    
    setEditForm({
      title: creative.title || '',
      description: creative.description || '',
      format: creative.formats?.code || '',
      type: creative.types?.code || '',
      placement: creative.placements?.code || '',
      country: creative.country_code || '',
      platform: creative.platforms?.code || '',
      cloaking: creative.cloaking || false,
      landing_url: creative.landing_url || '',
      source_link: creative.source_link || '',
      source_device: creative.source_device || '',
      captured_at: capturedAtFormatted
    })
    setEditFiles({
      media_file: null,
      thumbnail_file: null,
      zip_file: null
    })
    setShowEditModal(true)
    setShowModal(false)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setEditingCreative(null)
    setEditForm({
      title: '',
      description: '',
      format: '',
      type: '',
      placement: '',
      country: '',
      platform: '',
      cloaking: false,
      landing_url: '',
      source_link: '',
      source_device: '',
      captured_at: ''
    })
    setEditFiles({
      media_file: null,
      thumbnail_file: null,
      zip_file: null
    })
  }

  const handleFileChange = (fileType: 'media_file' | 'thumbnail_file' | 'zip_file', file: File | null) => {
    console.log('File changed in edit form:', fileType, file ? { name: file.name, size: file.size, type: file.type } : 'null')
    setEditFiles(prev => ({
      ...prev,
      [fileType]: file
    }))
  }

  const saveCreative = async () => {
    if (!editingCreative) return

    setSaving(true)
    try {
      // Prepare FormData
      const formData = new FormData()
      formData.append('creative_id', editingCreative.id)
      formData.append('title', editForm.title)
      formData.append('description', editForm.description || '')
      formData.append('format', editForm.format || '')
      formData.append('type', editForm.type || '')
      formData.append('placement', editForm.placement || '')
      formData.append('country', editForm.country || '')
      formData.append('platform', editForm.platform || '')
      formData.append('cloaking', String(editForm.cloaking))
      formData.append('landing_url', editForm.landing_url || '')
      formData.append('source_link', editForm.source_link || '')
      formData.append('source_device', editForm.source_device || '')
      
      // Convert datetime-local to ISO format (same as DB format)
      if (editForm.captured_at) {
        try {
          // datetime-local format: "2025-11-11T18:34"
          // Convert to ISO format: "2025-11-11T18:34:00.000Z"
          const date = new Date(editForm.captured_at)
          if (!isNaN(date.getTime())) {
            formData.append('captured_at', date.toISOString())
            console.log('Date conversion:', editForm.captured_at, '->', date.toISOString())
          }
        } catch (e) {
          console.error('Error converting date:', e)
        }
      }
      
      // Current URLs (to preserve if not replaced)
      formData.append('current_media_url', editingCreative.media_url || '')
      formData.append('current_thumbnail_url', editingCreative.thumbnail_url || '')
      formData.append('current_download_url', editingCreative.download_url || '')

      // Add files if provided
      if (editFiles.media_file) {
        formData.append('media_file', editFiles.media_file)
        console.log('Adding media file for update:', editFiles.media_file.name, editFiles.media_file.size)
      }
      if (editFiles.thumbnail_file) {
        formData.append('thumbnail_file', editFiles.thumbnail_file)
        console.log('Adding thumbnail file for update:', editFiles.thumbnail_file.name, editFiles.thumbnail_file.size)
      }
      if (editFiles.zip_file) {
        formData.append('zip_file', editFiles.zip_file)
        console.log('Adding ZIP file for update:', editFiles.zip_file.name, editFiles.zip_file.size, editFiles.zip_file.type)
      } else {
        console.log('No ZIP file to add for update')
      }

      console.log('Sending update formData with files:', {
        hasMedia: !!editFiles.media_file,
        hasThumbnail: !!editFiles.thumbnail_file,
        hasZip: !!editFiles.zip_file,
        currentDownloadUrl: editingCreative.download_url
      })

      // Send to API endpoint
      const response = await fetch('/api/admin/update-creative', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      console.log('Update API Response:', {
        ok: response.ok,
        status: response.status,
        result: result
      })

      if (response.ok) {
        console.log('Creative updated successfully:', {
          id: result.creative?.id,
          download_url: result.creative?.download_url
        })
        alert('Креатив обновлен. Он снова в разделе «Новые» и ожидает повторной модерации.')
        closeEditModal()
        loadData() // Refresh data
      } else {
        console.error('Update error:', result)
        alert(`Ошибка при обновлении: ${result.error || 'Неизвестная ошибка'}\n${result.details || ''}`)
      }

    } catch (error) {
      console.error('Error saving creative:', error)
      alert('Ошибка при сохранении')
    }
    setSaving(false)
  }

  // Quick edit field function
  const startEditField = (fieldName: string, currentValue: string) => {
    setEditingField(fieldName)
    setFieldEditValue(currentValue)
  }

  const cancelEditField = () => {
    setEditingField(null)
    setFieldEditValue('')
  }

  const saveFieldEdit = async (fieldName: string) => {
    if (!selectedCreative) return

    try {
      const formData = new FormData()
      formData.append('creative_id', selectedCreative.id)
      
      // Always send all current field values to prevent them from being nullified
      // Send current title (or new value if editing title)
      formData.append('title', fieldName === 'title' ? fieldEditValue : (selectedCreative.title || ''))
      
      // Send current description (or new value if editing description)
      formData.append('description', fieldName === 'description' ? fieldEditValue : (selectedCreative.description || ''))
      
      // Send current format (or new value if editing format)
      formData.append('format', fieldName === 'format' ? fieldEditValue : (selectedCreative.formats?.code || ''))
      
      // Send current type (or new value if editing type)
      formData.append('type', fieldName === 'type' ? fieldEditValue : (selectedCreative.types?.code || ''))
      
      // Send current placement (or new value if editing placement)
      formData.append('placement', fieldName === 'placement' ? fieldEditValue : (selectedCreative.placements?.code || ''))
      
      // Send current country (or new value if editing country)
      formData.append('country', fieldName === 'country' ? fieldEditValue : (selectedCreative.country_code || ''))
      
      // Send current platform (or new value if editing platform)
      formData.append('platform', fieldName === 'platform' ? fieldEditValue : (selectedCreative.platforms?.code || ''))
      
      // Send current cloaking (or new value if editing cloaking)
      formData.append('cloaking', fieldName === 'cloaking' ? (fieldEditValue === 'true' ? 'true' : 'false') : (selectedCreative.cloaking ? 'true' : 'false'))

      // Preserve current URLs
      formData.append('current_media_url', selectedCreative.media_url || '')
      formData.append('current_thumbnail_url', selectedCreative.thumbnail_url || '')
      formData.append('current_download_url', selectedCreative.download_url || '')
      
      // Preserve other fields that might be in the API
      formData.append('landing_url', selectedCreative.landing_url || '')
      formData.append('source_link', selectedCreative.source_link || '')
      formData.append('source_device', selectedCreative.source_device || '')
      
      // Preserve captured_at if it exists
      if (selectedCreative.captured_at) {
        // Convert to datetime-local format for API
        try {
          const date = new Date(selectedCreative.captured_at)
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const hours = String(date.getHours()).padStart(2, '0')
            const minutes = String(date.getMinutes()).padStart(2, '0')
            formData.append('captured_at', `${year}-${month}-${day}T${hours}:${minutes}`)
          }
        } catch (e) {
          console.error('Error formatting captured_at:', e)
        }
      }

      const response = await fetch('/api/admin/update-creative', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok && result.creative) {
        // Обновляем список креативов через API
        try {
          // Загружаем обновленный креатив через API
          const creativeRes = await fetch(`/api/admin/creatives?limit=100&status=all`)
          if (creativeRes.ok) {
            const creativeResult = await creativeRes.json()
            if (creativeResult.success) {
              const updatedCreative = creativeResult.creatives.find((c: any) => c.id === selectedCreative.id)
              if (updatedCreative) {
                const fullUpdatedCreative = {
                  ...updatedCreative,
                  formats: updatedCreative.formats || null,
                  types: updatedCreative.types || null,
                  placements: updatedCreative.placements || null,
                  platforms: updatedCreative.platforms || null,
                  countries: updatedCreative.countries || null
                } as Creative
                
                // Update selectedCreative with fresh data from API
                setSelectedCreative(fullUpdatedCreative)
                
                // Also update in the creatives list to keep them in sync
                setCreatives(prevCreatives => 
                  prevCreatives.map(c => c.id === fullUpdatedCreative.id ? fullUpdatedCreative : c)
                )
              } else {
                // Fallback: update with API response data and local mappings
                const updatedCreative = { ...selectedCreative, ...result.creative } as Creative
                
                // Update the field that was edited
                if (fieldName === 'title') {
                  updatedCreative.title = fieldEditValue
                } else if (fieldName === 'description') {
                  updatedCreative.description = fieldEditValue || undefined
                } else if (fieldName === 'format') {
                  const format = formats.find(f => f.code === fieldEditValue)
                  if (format) updatedCreative.formats = { name: format.name, code: format.code }
                } else if (fieldName === 'type') {
                  const type = types.find(t => t.code === fieldEditValue)
                  if (type) updatedCreative.types = { name: type.name, code: type.code }
                } else if (fieldName === 'placement') {
                  const placement = placements.find(p => p.code === fieldEditValue)
                  if (placement) updatedCreative.placements = { name: placement.name, code: placement.code }
                } else if (fieldName === 'country') {
                  updatedCreative.country_code = fieldEditValue
                  const country = countries.find(c => c.code === fieldEditValue)
                  if (country) updatedCreative.countries = { name: country.name }
                } else if (fieldName === 'platform') {
                  const platform = platforms.find(p => p.code === fieldEditValue)
                  if (platform) updatedCreative.platforms = { name: platform.name, code: platform.code }
                } else if (fieldName === 'cloaking') {
                  updatedCreative.cloaking = fieldEditValue === 'true'
                }
                
                setSelectedCreative(updatedCreative)
                setCreatives(prevCreatives => 
                  prevCreatives.map(c => c.id === updatedCreative.id ? updatedCreative : c)
                )
              }
            } else {
              // Если API не вернул success, используем данные из result.creative
              const updatedCreative = { ...selectedCreative, ...result.creative } as Creative
              setSelectedCreative(updatedCreative)
              setCreatives(prevCreatives => 
                prevCreatives.map(c => c.id === updatedCreative.id ? updatedCreative : c)
              )
            }
          } else {
            // Если запрос не успешен, используем данные из result.creative
            const updatedCreative = { ...selectedCreative, ...result.creative } as Creative
            setSelectedCreative(updatedCreative)
            setCreatives(prevCreatives => 
              prevCreatives.map(c => c.id === updatedCreative.id ? updatedCreative : c)
            )
          }
        } catch (error) {
          console.error('Error fetching updated creative:', error)
          // Fallback: update local state with the edited value
          const updatedCreative = { ...selectedCreative } as Creative
          if (fieldName === 'title') {
            updatedCreative.title = fieldEditValue
          } else if (fieldName === 'description') {
            updatedCreative.description = fieldEditValue || undefined
          }
          setSelectedCreative(updatedCreative)
        }
        
        setEditingField(null)
        setFieldEditValue('')
      } else {
        alert(`Ошибка при сохранении: ${result.error || 'Неизвестная ошибка'}`)
      }
    } catch (error) {
      console.error('Error saving field:', error)
      alert('Ошибка при сохранении')
    }
  }

  const deleteCreativeFile = async (fileType: 'media' | 'thumbnail' | 'download') => {
    if (!editingCreative) return

    const confirmed = confirm(`Удалить ${fileType === 'media' ? 'изображение' : fileType === 'thumbnail' ? 'скриншот' : 'архив'}?`)
    if (!confirmed) return

    try {
      const formData = new FormData()
      formData.append('creative_id', editingCreative.id)
      formData.append('delete_file_type', fileType)

      const response = await fetch('/api/admin/update-creative', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        // Update local state
        setEditingCreative(prev => prev ? {
          ...prev,
          [`${fileType === 'media' ? 'media' : fileType === 'thumbnail' ? 'thumbnail' : 'download'}_url`]: null
        } : null)
        alert('Файл удален')
      } else {
        alert(`Ошибка: ${result.error || 'Неизвестная ошибка'}`)
      }

    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Ошибка при удалении файла')
    }
  }

  // Selection functions
  const toggleCreativeSelection = (id: string) => {
    const newSelected = new Set(selectedCreatives)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedCreatives(newSelected)
  }

  const selectAllCreatives = () => {
    if (selectedCreatives.size === creatives.length) {
      setSelectedCreatives(new Set())
    } else {
      setSelectedCreatives(new Set(creatives.map(c => c.id)))
    }
  }

  // Delete functions
  const deleteSelectedCreatives = async () => {
    if (selectedCreatives.size === 0) return

    try {
      const creativeIds = Array.from(selectedCreatives)
      
      const response = await fetch('/api/admin/delete-creatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ creativeIds })
      })

      const result = await response.json()

      if (response.ok) {
        // Refresh data
        setSelectedCreatives(new Set())
        setShowDeleteConfirm(false)
        await loadData()
        await loadModerationStats()
        alert(`Успешно удалено ${result.deletedCount} креативов`)
      } else {
        alert(`Ошибка при удалении: ${result.error || 'Неизвестная ошибка'}`)
      }

    } catch (error) {
      console.error('Error deleting creatives:', error)
      alert('Ошибка при удалении креативов')
    }
  }

  const deleteSingleCreative = async (creativeId: string, creativeTitle?: string) => {
    const titleText = creativeTitle ? ` "${creativeTitle}"` : ''
    if (!confirm(`Вы уверены, что хотите удалить креатив${titleText}?`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/delete-creatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ creativeIds: [creativeId] })
      })

      const result = await response.json()

      if (response.ok) {
        // Remove from selection if selected
        setSelectedCreatives(prev => {
          const newSet = new Set(prev)
          newSet.delete(creativeId)
          return newSet
        })
        
        // Close modal if this creative was being viewed
        if (selectedCreative?.id === creativeId) {
          setShowModal(false)
          setSelectedCreative(null)
        }
        
        // Refresh data
        await loadData()
        await loadModerationStats()
        alert('Креатив успешно удален')
      } else {
        alert(`Ошибка при удалении: ${result.error || 'Неизвестная ошибка'}`)
      }

    } catch (error) {
      console.error('Error deleting creative:', error)
      alert('Ошибка при удалении креатива')
    }
  }

  // Moderation functions
  const moderateCreatives = async (action: 'approve' | 'draft', creativeIds: string[]) => {
    try {
      const response = await fetch('/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          creativeIds,
          moderatedBy: 'admin'
        })
      })

      const result = await response.json()

      if (response.ok) {
        // Refresh data after moderation
        await loadData()
        await loadModerationStats()
        setSelectedCreatives(new Set())
        
        const actionText = action === 'approve' ? 'одобрено' : 'возвращено в черновики'
        alert(`${result.count} креативов ${actionText}`)
      } else {
        alert(`Ошибка модерации: ${result.error}`)
      }
    } catch (error) {
      console.error('Moderation error:', error)
      alert('Ошибка при модерации')
    }
  }

  const handleBulkAction = () => {
    if (!bulkAction || selectedCreatives.size === 0) return
    
    const creativeIds = Array.from(selectedCreatives)
    const actionText = bulkAction === 'approve' ? 'одобрить' : 'вернуть в черновики'
    
    if (confirm(`Вы уверены, что хотите ${actionText} ${creativeIds.length} креативов?`)) {
      moderateCreatives(bulkAction as 'approve' | 'draft', creativeIds)
    }
    
    setBulkAction('')
    setShowBulkConfirm(false)
  }

  const moderateSingle = (action: 'approve' | 'draft', creativeId: string) => {
    moderateCreatives(action, [creativeId])
  }

  // Ads management functions
  const loadAdsSettings = async () => {
    setLoadingAds(true)
    try {
      const response = await fetch('/api/admin/ads')
      if (response.ok) {
        const data = await response.json()
        setAdsSettings(data.settings || [])
      }
    } catch (error) {
      console.error('Failed to load ads settings:', error)
    }
    setLoadingAds(false)
  }

  const openAdEditor = (ad?: any) => {
    if (ad) {
      setEditingAd(ad)
      setAdForm({
        position: ad.position,
        type: ad.type,
        title: ad.title || '',
        enabled: ad.enabled !== undefined ? ad.enabled : true,
        content: ad.content || '',
        image_url: ad.image_url || '',
        link_url: ad.link_url || '',
        width: ad.width || '100%',
        height: ad.height || 'auto',
        priority: ad.priority || 0
      })
    } else {
      setEditingAd(null)
      setAdForm({
        position: 'modal',
        type: 'code',
        title: '',
        enabled: true,
        content: '',
        image_url: '',
        link_url: '',
        width: '100%',
        height: 'auto',
        priority: 0
      })
    }
  }

  const saveAdSettings = async () => {
    setLoadingAds(true)
    try {
      const response = await fetch('/api/admin/ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adForm)
      })

      const result = await response.json()

      if (response.ok) {
        alert('Настройки рекламы сохранены!')
        await loadAdsSettings()
        setEditingAd(null)
        setAdForm({
          position: 'modal',
          type: 'code',
          title: '',
          enabled: true,
          content: '',
          image_url: '',
          link_url: '',
          width: '100%',
          height: 'auto',
          priority: 0
        })
      } else {
        alert(`Ошибка сохранения: ${result.error}`)
      }
    } catch (error) {
      console.error('Save ads error:', error)
      alert('Ошибка при сохранении настроек рекламы')
    }
    setLoadingAds(false)
  }

  const deleteAdSettings = async (position: string) => {
    if (!confirm(`Удалить настройки рекламы для позиции "${position}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/ads?position=${position}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Настройки рекламы удалены!')
        await loadAdsSettings()
      } else {
        const result = await response.json()
        alert(`Ошибка удаления: ${result.error}`)
      }
    } catch (error) {
      console.error('Delete ads error:', error)
      alert('Ошибка при удалении настроек рекламы')
    }
  }

  // Create functions
  const resetCreateForm = () => {
    setCreateForm({
      title: '',
      description: '',
      format: '',
      type: '',
      placement: '',
      country: '',
      platform: '',
      cloaking: false,
      landing_url: '',
      source_link: '',
      source_device: '',
      captured_at: ''
    })
    setCreateFiles({
      media_file: null,
      thumbnail_file: null,
      zip_file: null
    })
  }

  const handleCreateFileChange = (type: 'media_file' | 'thumbnail_file' | 'zip_file', file: File | null) => {
    console.log('File changed:', type, file ? { name: file.name, size: file.size, type: file.type } : 'null')
    setCreateFiles(prev => ({
      ...prev,
      [type]: file
    }))
  }

  const createCreative = async () => {
    if (!createForm.title.trim()) {
      alert('Название обязательно для заполнения')
      return
    }

    setCreating(true)
    try {
      const formData = new FormData()
      
      // Add form data
      formData.append('title', createForm.title)
      formData.append('description', createForm.description || '')
      formData.append('format', createForm.format || '')
      formData.append('type', createForm.type || '')
      formData.append('placement', createForm.placement || '')
      formData.append('country', createForm.country || '')
      formData.append('platform', createForm.platform || '')
      formData.append('cloaking', String(createForm.cloaking))
      formData.append('landing_url', createForm.landing_url || '')
      formData.append('source_link', createForm.source_link || '')
      formData.append('source_device', createForm.source_device || '')
      
      // Convert datetime-local to ISO format
      if (createForm.captured_at) {
        try {
          const date = new Date(createForm.captured_at)
          if (!isNaN(date.getTime())) {
            formData.append('captured_at', date.toISOString())
          }
        } catch (e) {
          console.error('Error converting date:', e)
        }
      }

      // Add files
      if (createFiles.media_file) {
        formData.append('media_file', createFiles.media_file)
        console.log('Adding media file:', createFiles.media_file.name, createFiles.media_file.size)
      }
      if (createFiles.thumbnail_file) {
        formData.append('thumbnail_file', createFiles.thumbnail_file)
        console.log('Adding thumbnail file:', createFiles.thumbnail_file.name, createFiles.thumbnail_file.size)
      }
      if (createFiles.zip_file) {
        formData.append('zip_file', createFiles.zip_file)
        console.log('Adding ZIP file:', createFiles.zip_file.name, createFiles.zip_file.size, createFiles.zip_file.type)
      } else {
        console.log('No ZIP file to add')
      }

      console.log('Sending formData with files:', {
        hasMedia: !!createFiles.media_file,
        hasThumbnail: !!createFiles.thumbnail_file,
        hasZip: !!createFiles.zip_file
      })

      const response = await fetch('/api/creatives', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      console.log('API Response:', {
        ok: response.ok,
        status: response.status,
        result: result
      })

      if (response.ok) {
        console.log('Creative created successfully:', {
          id: result.creative?.id,
          download_url: result.creative?.download_url,
          urls: result.urls,
          fileUploads: result.fileUploads
        })
        
        // Формируем сообщение о статусе загрузки файлов
        const uploadStatus = []
        if (result.fileUploads?.media) uploadStatus.push('✅ Медиа файл')
        else if (createFiles.media_file) uploadStatus.push('❌ Медиа файл не загружен')
        
        if (result.fileUploads?.thumbnail) uploadStatus.push('✅ Скриншот')
        else if (createFiles.thumbnail_file) uploadStatus.push('❌ Скриншот не загружен')
        
        if (result.fileUploads?.archive) uploadStatus.push('✅ Archive uploaded')
        
        const statusMessage = uploadStatus.length > 0 ? '\n\n' + uploadStatus.join('\n') : ''
        
        alert(`Креатив успешно создан!${statusMessage}`)
        resetCreateForm()
        setActiveTab('list')
        await loadData()
        await loadModerationStats()
      } else {
        console.error('API Error:', result)
        alert(`Ошибка при создании: ${result.error || 'Неизвестная ошибка'}\n${result.details || ''}`)
      }

    } catch (error) {
      console.error('Create error:', error)
      alert('Ошибка при создании креатива')
    }
    setCreating(false)
  }

  // Load moderation statistics
  const loadModerationStats = async () => {
    try {
      const response = await fetch('/api/admin/moderate')
      if (response.ok) {
        const data = await response.json()
        setModerationStats(data.statistics)
      }
    } catch (error) {
      console.error('Failed to load moderation stats:', error)
    }
  }

  // Data loading (same as main page)
  const loadData = async () => {
    setLoading(true)
    try {
      // Load moderation statistics
      await loadModerationStats()

      // Load reference data через новые API endpoints
      const [formatsRes, typesRes, placementsRes, platformsRes, countriesRes] = await Promise.all([
        fetch('/api/references/formats'),
        fetch('/api/references/types'),
        fetch('/api/references/placements'),
        fetch('/api/references/platforms'),
        fetch('/api/references/countries')
      ])

      const [formatsResult, typesResult, placementsResult, platformsResult, countriesResult] = await Promise.all([
        formatsRes.json(),
        typesRes.json(),
        placementsRes.json(),
        platformsRes.json(),
        countriesRes.json()
      ])

      // Filter allowed options (только для formats, types, placements)
      const formatsData = formatsResult.data || []
      const typesData = typesResult.data || []
      const placementsData = placementsResult.data || []
      const platformsData = platformsResult.data || []
      const countriesData = countriesResult.data || []

      setFormats(formatsData.filter((f: FilterOption) => ALLOWED_FORMAT_CODES.includes(f.code)))
      setTypes(typesData.filter((t: FilterOption) => ALLOWED_TYPE_CODES.includes(t.code)))
      setPlacements(placementsData.filter((p: FilterOption) => ALLOWED_PLACEMENT_CODES.includes(p.code)))
      // Показываем все платформы из базы данных без фильтрации
      setPlatforms(platformsData)
      setCountries(countriesData.map((c: any) => ({ id: c.code, code: c.code, name: c.name })))

      // Load creatives через новый API endpoint для админки (все креативы)
      const creativesRes = await fetch('/api/admin/creatives?page=1&limit=100&status=all')
      if (creativesRes.ok) {
        const creativesResult = await creativesRes.json()
        if (creativesResult.success) {
          setCreatives(creativesResult.creatives || [])
        } else {
          setCreatives([])
        }
      } else {
        setCreatives([])
      }
      
      // Apply current filters after loading
      setTimeout(() => applyFilters(), 100)

    } catch (error) {
      console.error('Error loading data:', error)
      loadDemoData()
    }
    setLoading(false)
  }

  const loadDemoData = () => {
    // Same demo data as main page
    setFormats([
      { id: '1', code: 'teaser', name: 'Teaser' },
      { id: '2', code: 'video', name: 'Video' }
    ])
    setTypes([
      { id: '1', code: 'crypt', name: 'Crypt' },
      { id: '2', code: 'gambling', name: 'Gambling' },
      { id: '3', code: 'nutra', name: 'Nutra' }
    ])
    setPlacements([
      { id: '1', code: 'demand_gen', name: 'Demand Gen' },
      { id: '2', code: 'uac', name: 'UAC' }
    ])
    setPlatforms([
      { id: '1', code: 'web', name: 'Web' },
      { id: '2', code: 'google_play', name: 'Google play' },
      { id: '3', code: 'youtube', name: 'YouTube' }
    ])
    setCountries([
      { id: 'AR', code: 'AR', name: 'Argentina' },
      { id: 'US', code: 'US', name: 'United States' }
    ])

    setCreatives([
      {
        id: '1',
        title: 'Escribí tu consulta',
        description: 'Crypto advertisement creative from Argentina',
        captured_at: '2025-11-11T18:34:10.192+00:00',
        cloaking: false,
        formats: { name: 'Teaser', code: 'teaser' },
        types: { name: 'Crypt', code: 'crypt' },
        placements: { name: 'Demand Gen', code: 'demand_gen' },
        countries: { name: 'Argentina' },
        platforms: { name: 'Web', code: 'web' },
        country_code: 'AR',
        media_url: 'https://oilwcbfyhutzyjzlqbuk.supabase.co/storage/v1/object/public/creatives-media/1762886048692-2de5ce8a-1fc7-4166-a1ec-5faef0f3e230.webp',
        thumbnail_url: 'https://oilwcbfyhutzyjzlqbuk.supabase.co/storage/v1/object/public/creatives-media/thumbs/1762886049361-3074abdf-c47a-484e-9f87-8e369ee24cb1.webp',
        download_url: 'https://oilwcbfyhutzyjzlqbuk.supabase.co/storage/v1/object/public/creatives-media/archives/1762886049789-1762882033.zip',
        source_link: 'https://f5spy.com/viewer/4480/view',
        landing_url: '',
        source_device: '',
        status: 'draft',
        created_at: '2025-11-11T18:34:10.192+00:00',
        updated_at: '2025-11-11T18:34:10.192+00:00'
      }
    ])
  }

  // Apply filters (same logic as main page)
  const applyFilters = async () => {
    setLoading(true)
    try {
      // Используем новый API endpoint для админки
      const params = new URLSearchParams()
      params.set('page', '1')
      params.set('limit', '100')
      
      // Status filtering (most important for admin)
      if (filters.status && filters.status !== 'all') {
        params.set('status', filters.status)
      } else {
        params.set('status', 'all')
      }
      
      // Date filtering
      if (filters.dateFrom) {
        params.set('dateFrom', filters.dateFrom)
      }
      if (filters.dateTo) {
        params.set('dateTo', filters.dateTo)
      }
      
      // Other filters
      if (filters.format) {
        params.set('format', filters.format)
      }
      if (filters.type) {
        params.set('type', filters.type)
      }
      if (filters.placement) {
        params.set('placement', filters.placement)
      }
      if (filters.country) {
        params.set('country', filters.country)
      }
      if (filters.platform) {
        params.set('platform', filters.platform)
      }
      if (filters.cloaking !== null && filters.cloaking !== undefined) {
        params.set('cloaking', filters.cloaking.toString())
      }

      console.log('Admin Filter URL:', `/api/admin/creatives?${params.toString()}`)

      const response = await fetch(`/api/admin/creatives?${params.toString()}`)
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setCreatives(result.creatives || [])
        } else {
          setCreatives([])
        }
      } else {
        console.error('Failed to fetch creatives:', response.status)
        setCreatives([])
      }

    } catch (error) {
      console.error('Error applying filters:', error)
      setCreatives([])
    }
    setLoading(false)
  }

  // Effects
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (activeTab === 'ads') {
      loadAdsSettings()
    }
  }, [activeTab])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showFullScreenshot) {
          setShowFullScreenshot(false)
        } else if (showModal) {
          closeModal()
        } else if (showDeleteConfirm) {
          setShowDeleteConfirm(false)
        } else if (showEditModal) {
          closeEditModal()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showModal, showFullScreenshot, showDeleteConfirm, showEditModal])

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-lg border border-gray-700 w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">Admin Panel</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter admin password"
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Title and Buttons Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 border-b border-gray-800 gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Admin Panel</h1>
          
            {/* Buttons - Mobile: centered, PC: right aligned */}
            <div className="flex items-center justify-center sm:justify-end space-x-2">
              <button
                onClick={toggleTheme}
                className="btn btn-ghost"
                title={isLightTheme ? 'Переключить на темную тему' : 'Переключить на светлую тему'}
              >
                {isLightTheme ? 'Темная' : 'Светлая'}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-ghost"
                title="Обновить страницу"
              >
                Обновить
              </button>
              <button
                onClick={handleLogout}
                className="btn btn-danger"
              >
                Выйти
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="py-3 border-b border-gray-800">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span>📋</span>
                <span>Список креативов</span>
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'create' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span>➕</span>
                <span>Создать креатив</span>
              </button>
              <button
                onClick={() => setActiveTab('ads')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'ads' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span>📢</span>
                <span>Настройки рекламы</span>
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'dashboard' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span>⚙️</span>
                <span>Настройка дашборда</span>
              </button>
            </div>
          </div>

          {/* Info Bar - Only for List Tab */}
          {activeTab === 'list' && (
            <div className="py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Left Side - Statistics */}
              <div className="flex items-center justify-center sm:justify-start space-x-6">
                {/* PC Version - Show "креативов" */}
                <div className="hidden sm:block text-sm text-gray-300">
                  <span className="font-medium">{creatives.length}</span>
                  <span className="text-gray-400 ml-1">креативов</span>
                  {selectedCreatives.size > 0 && (
                    <>
                      <span className="text-gray-600 mx-2">•</span>
                      <span className="font-medium text-blue-400">{selectedCreatives.size}</span>
                      <span className="text-gray-400 ml-1">выбрано</span>
                    </>
                  )}
                </div>
                
                {/* PC Version - Show divider */}
                <div className="hidden sm:block h-6 w-px bg-gray-700"></div>
                
                <div className="flex items-center space-x-3">
                  <div className="flex items-center gap-2 bg-yellow-600/20 border border-yellow-600/30 rounded-lg px-3 py-1.5">
                    <span className="text-yellow-400 text-xs font-medium">🆕</span>
                    <span className="text-yellow-300 text-sm font-medium">Новые:</span>
                    <span className="text-white text-sm font-bold">{moderationStats.draft}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-green-600/20 border border-green-600/30 rounded-lg px-3 py-1.5">
                    <span className="text-green-400 text-xs font-medium">✅</span>
                    <span className="text-green-300 text-sm font-medium">Опубликовано:</span>
                    <span className="text-white text-sm font-bold">{moderationStats.published}</span>
                  </div>
                </div>
              </div>

              {/* Right Side - Action Buttons */}
              {selectedCreatives.size > 0 && (
                <div className="flex items-center justify-center sm:justify-end space-x-2">
                  <button
                    onClick={() => moderateCreatives('approve', Array.from(selectedCreatives))}
                    className="btn btn-success"
                  >
                    <span>✅</span>
                    <span>Опубликовать ({selectedCreatives.size})</span>
                  </button>
                  <button
                    onClick={() => moderateCreatives('draft', Array.from(selectedCreatives))}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-yellow-600/20"
                  >
                    <span>🆕</span>
                    <span>В новые ({selectedCreatives.size})</span>
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <TrashIcon />
                    <span>Удалить ({selectedCreatives.size})</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Content based on active tab */}
      {activeTab === 'list' && (
        <>
          {/* Filters - Same as main page */}
          <div className="bg-gray-900 border-b border-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Статус</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">🆕 Новые</option>
                <option value="published">✅ Опубликованные</option>
                <option value="all">📋 Все статусы</option>
              </select>
            </div>
            {/* Date Picker */}
            <div className="relative" ref={dateDropdownRef}>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
              <button
                type="button"
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon />
                  <span className="text-sm">{getDateRangeLabel()}</span>
                </div>
                <ChevronDownIcon />
              </button>

              {showDateDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden min-w-[280px] max-w-[320px]">
                  <div className="p-2 border-b border-gray-700">
                    <div className="grid grid-cols-2 gap-1">
                      {datePresets.map((preset, index) => (
                        <button
                          key={index}
                          onClick={() => selectDatePreset(preset)}
                          className="text-left px-2 py-1.5 text-xs text-gray-300 hover:bg-gray-700 rounded transition-colors whitespace-nowrap"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-2">
                    <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Custom Range</div>
                    <div className="space-y-2">
                      <input
                        ref={dateFromRef}
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                        onFocus={() => openDatePicker(dateFromRef)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        ref={dateToRef}
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                        onFocus={() => openDatePicker(dateToRef)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => {
                          setFilters({...filters, dateFrom: '', dateTo: ''})
                          setShowDateDropdown(false)
                        }}
                        className="flex-1 px-2 py-1 text-xs text-gray-400 hover:text-white border border-gray-600 rounded hover:border-gray-500 transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => setShowDateDropdown(false)}
                        className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Format */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Format</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.format}
                onChange={(e) => setFilters({...filters, format: e.target.value})}
              >
                <option value="">All</option>
                {formats.map(format => (
                  <option key={format.id} value={format.code}>{format.name}</option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
              >
                <option value="">All</option>
                {types.map(type => (
                  <option key={type.id} value={type.code}>{type.name}</option>
                ))}
              </select>
            </div>

            {/* Placement */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Placement</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.placement}
                onChange={(e) => setFilters({...filters, placement: e.target.value})}
              >
                <option value="">All</option>
                {placements.map(placement => (
                  <option key={placement.id} value={placement.code}>{placement.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.country}
                onChange={(e) => setFilters({...filters, country: e.target.value})}
              >
                <option value="">All</option>
                {countries.map(country => (
                  <option key={country.id} value={country.code}>{country.name}</option>
                ))}
              </select>
            </div>

            {/* Platform */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Platform</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.platform}
                onChange={(e) => setFilters({...filters, platform: e.target.value})}
              >
                <option value="">All</option>
                {platforms.map(platform => (
                  <option key={platform.id} value={platform.code}>{platform.name}</option>
                ))}
              </select>
            </div>

            {/* Cloaking */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Cloaking</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.cloaking}
                onChange={(e) => setFilters({...filters, cloaking: e.target.value})}
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <button
                onClick={() => {
                  setFilters({
                    dateFrom: '',
                    dateTo: '',
                    format: '',
                    type: '',
                    placement: '',
                    country: '',
                    platform: '',
                    cloaking: '',
                    status: 'draft'
                  })
                  loadData()
                }}
                className="btn btn-secondary flex-1"
              >
                Reset
              </button>
              <button
                onClick={applyFilters}
                className="btn btn-primary flex-1"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Bulk Actions */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={selectedCreatives.size === creatives.length && creatives.length > 0}
                onChange={selectAllCreatives}
                className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
              />
              Select All
            </label>
          </div>
        </div>

        {loading ? (
          /* Loading State */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-lg border border-gray-700 animate-pulse">
                <div className="aspect-video bg-gray-700"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-700 rounded"></div>
                  <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : creatives.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <h3 className="text-xl font-medium text-white mb-2 mt-4">No creatives found</h3>
            <p className="text-gray-400 mb-6">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          /* Creatives Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {creatives && creatives.length > 0 ? creatives.map((creative) => (
              <div
                key={creative.id}
                className={`bg-gray-800 rounded-lg border transition-colors relative ${
                  selectedCreatives.has(creative.id) 
                    ? 'border-blue-500 bg-gray-750' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {/* Selection Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedCreatives.has(creative.id)}
                    onChange={() => toggleCreativeSelection(creative.id)}
                    className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Creative Card Content */}
                <div 
                  className="cursor-pointer"
                  onClick={() => openModal(creative)}
                >
                  {/* Media Preview */}
                  <div className="aspect-video bg-gray-700 flex items-center justify-center relative">
                    {creative.media_url ? (
                      <img
                        src={creative.media_url}
                        alt={creative.title || 'Creative'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-white text-center">
                        <div className="text-4xl mb-2">📄</div>
                        <p className="text-sm">No Preview</p>
                      </div>
                    )}

                    {/* Date Badge */}
                    <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                      {new Date(creative.captured_at).toLocaleDateString()}
                    </div>

                    {/* Cloaking Badge */}
                    {creative.cloaking && (
                      <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                        Cloaking
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-white font-medium mb-2">
                      {creative.title || 'Untitled'}
                    </h3>

                    {/* Metadata */}
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex justify-between">
                        <span>Format:</span>
                        <span className="text-gray-300">{creative.formats?.name || '-'}</span>
                      </div>

                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className="text-gray-300">{creative.types?.name || '-'}</span>
                      </div>

                      <div className="flex justify-between">
                        <span>Placement:</span>
                        <span className="text-gray-300">{creative.placements?.name || '-'}</span>
                      </div>

                      <div className="flex justify-between">
                        <span>Country:</span>
                        <span className="text-gray-300">{creative.countries?.name || '-'}</span>
                      </div>

                      <div className="flex justify-between">
                        <span>Platform:</span>
                        <span className="text-gray-300">{creative.platforms?.name || '-'}</span>
                      </div>

                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          creative.status === 'published' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
                        }`}>
                          {creative.status === 'published' ? '✅ Опубликован' : '🆕 Новый'}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {creative.description && (
                      <p className="text-gray-400 text-sm mt-3">
                        {creative.description.length > 80
                          ? creative.description.substring(0, 80) + '...'
                          : creative.description
                        }
                      </p>
                    )}

                    {/* Moderation Actions */}
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="flex gap-2">
                        {creative.status !== 'published' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              moderateSingle('approve', creative.id)
                            }}
                            className="btn btn-success btn-sm flex-1"
                          >
                            ✅ Опубликовать
                          </button>
                        )}
                        {creative.status !== 'draft' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              moderateSingle('draft', creative.id)
                            }}
                            className="btn btn-sm flex-1"
                            style={{ backgroundColor: '#ca8a04', color: 'white' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a16207'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ca8a04'}
                          >
                            🆕 В новые
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteSingleCreative(creative.id, creative.title)
                          }}
                          className="btn btn-danger btn-sm flex items-center justify-center gap-1"
                          title="Удалить креатив"
                        >
                          <TrashIcon />
                          <span>Удалить</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-medium text-white mb-2">No creatives found</h3>
                <p className="text-gray-400">No creatives match the current filters.</p>
              </div>
            )}
          </div>
        )}
      </main>
        </>
      )}

      {/* Create Creative Tab */}
      {activeTab === 'create' && (
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">➕ Создать новый креатив</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Form Fields */}
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Название <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({...createForm, title: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Введите название креатива"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Описание</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Описание креатива"
                  />
                </div>

                {/* Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Формат</label>
                  <select
                    value={createForm.format}
                    onChange={(e) => setCreateForm({...createForm, format: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Выберите формат</option>
                    {formats.map(format => (
                      <option key={format.id} value={format.code}>{format.name}</option>
                    ))}
                  </select>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Тип</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm({...createForm, type: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Выберите тип</option>
                    {types.map(type => (
                      <option key={type.id} value={type.code}>{type.name}</option>
                    ))}
                  </select>
                </div>

                {/* Placement */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Размещение</label>
                  <select
                    value={createForm.placement}
                    onChange={(e) => setCreateForm({...createForm, placement: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Выберите размещение</option>
                    {placements.map(placement => (
                      <option key={placement.id} value={placement.code}>{placement.name}</option>
                    ))}
                  </select>
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Страна</label>
                  <select
                    value={createForm.country}
                    onChange={(e) => setCreateForm({...createForm, country: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Выберите страну</option>
                    {countries.map(country => (
                      <option key={country.id} value={country.code}>{country.name}</option>
                    ))}
                  </select>
                </div>

                {/* Platform */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Платформа</label>
                  <select
                    value={createForm.platform}
                    onChange={(e) => setCreateForm({...createForm, platform: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Выберите платформу</option>
                    {platforms.map(platform => (
                      <option key={platform.id} value={platform.code}>{platform.name}</option>
                    ))}
                  </select>
                </div>

                {/* Cloaking */}
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={createForm.cloaking}
                      onChange={(e) => setCreateForm({...createForm, cloaking: e.target.checked})}
                      className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-300">Cloaking</span>
                  </label>
                </div>
              </div>

              {/* Right Column - Files and Additional Fields */}
              <div className="space-y-6">
                {/* Media File */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Media Image/Video</label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.svg,.ico,.avif,.heic,.heif,.mp4,.avi,.mov,.wmv,.flv,.webm,.mkv,.m4v,.3gp,.ogv,.mpg,.mpeg,.ts,.mts,.m2ts"
                    onChange={(e) => handleCreateFileChange('media_file', e.target.files?.[0] || null)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {createFiles.media_file && (
                    <div className="mt-2">
                      <p className="text-xs text-green-400">✅ Выбран: {createFiles.media_file.name}</p>
                      <p className="text-xs text-gray-500">Размер: {(createFiles.media_file.size / 1024 / 1024).toFixed(2)} MB | Тип: {createFiles.media_file.type}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Поддерживаемые форматы: JPG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, MP4, AVI, MOV, WebM, MKV и другие</p>
                </div>

                {/* Thumbnail File */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Screenshot</label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.svg,.ico,.avif,.heic,.heif"
                    onChange={(e) => handleCreateFileChange('thumbnail_file', e.target.files?.[0] || null)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {createFiles.thumbnail_file && (
                    <div className="mt-2">
                      <p className="text-xs text-green-400">✅ Выбран: {createFiles.thumbnail_file.name}</p>
                      <p className="text-xs text-gray-500">Размер: {(createFiles.thumbnail_file.size / 1024 / 1024).toFixed(2)} MB | Тип: {createFiles.thumbnail_file.type}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Скриншот страницы для отображения в модальном окне. Форматы: JPG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC</p>
                </div>

                {/* Zip File */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">ZIP архив</label>
                  <input
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      console.log('ZIP file selected:', file ? { name: file.name, size: file.size, type: file.type } : 'none')
                      handleCreateFileChange('zip_file', file)
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {createFiles.zip_file && (
                    <div className="mt-2">
                      <p className="text-xs text-green-400">✅ Выбран: {createFiles.zip_file.name}</p>
                      <p className="text-xs text-gray-500">Размер: {(createFiles.zip_file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  )}
                </div>

                {/* Landing URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Landing URL</label>
                  <input
                    type="url"
                    value={createForm.landing_url}
                    onChange={(e) => setCreateForm({...createForm, landing_url: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>

                {/* Source Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Источник</label>
                  <input
                    type="url"
                    value={createForm.source_link}
                    onChange={(e) => setCreateForm({...createForm, source_link: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://source.com"
                  />
                </div>

                {/* Source Device */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Устройство</label>
                  <select
                    value={createForm.source_device}
                    onChange={(e) => setCreateForm({...createForm, source_device: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Выберите устройство</option>
                    <option value="desktop">Desktop</option>
                    <option value="mobile">Mobile</option>
                    <option value="tablet">Tablet</option>
                  </select>
                </div>

                {/* Captured Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Дата захвата</label>
                  <input
                    type="datetime-local"
                    value={createForm.captured_at}
                    onChange={(e) => setCreateForm({...createForm, captured_at: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-700">
              <button
                onClick={resetCreateForm}
                className="btn btn-secondary"
              >
                Очистить
              </button>
              <button
                onClick={createCreative}
                disabled={creating || !createForm.title.trim()}
                className="btn btn-primary"
              >
                {creating ? '⏳ Создание...' : '✅ Создать креатив'}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Ads Settings Tab */}
      {activeTab === 'ads' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white">📢 Настройки рекламы</h2>
              <button
                onClick={() => openAdEditor()}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                ➕ Добавить рекламный блок
              </button>
            </div>

            {loadingAds ? (
              <div className="text-center py-12">
                <div className="text-gray-400">Загрузка настроек рекламы...</div>
              </div>
            ) : editingAd === null ? (
              <>
                {/* List of ad settings */}
                {adsSettings.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📢</div>
                    <h3 className="text-xl font-medium text-white mb-2">Нет настроек рекламы</h3>
                    <p className="text-gray-400 mb-6">Создайте первый рекламный блок для начала</p>
                    <button
                      onClick={() => openAdEditor()}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      ➕ Создать рекламный блок
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {adsSettings.map((ad) => (
                      <div
                        key={ad.id}
                        className="bg-gray-800 rounded-lg border border-gray-700 p-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                              <h3 className="text-base sm:text-lg font-semibold text-white break-words">{ad.title || ad.position}</h3>
                              <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                                ad.enabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                              }`}>
                                {ad.enabled ? '✅ Включено' : '❌ Выключено'}
                              </span>
                              <span className="text-xs text-gray-400 whitespace-nowrap">Позиция: {ad.position}</span>
                              <span className="text-xs text-gray-400 whitespace-nowrap">Тип: {ad.type}</span>
                            </div>
                            {ad.content && (
                              <p className="text-sm text-gray-400 mb-2 line-clamp-2 break-words">{ad.content}</p>
                            )}
                            {ad.image_url && (
                              <p className="text-xs text-gray-500 break-all">Изображение: {ad.image_url}</p>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 sm:ml-4">
                            <button
                              onClick={() => openAdEditor(ad)}
                              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors whitespace-nowrap"
                            >
                              ✏️ Редактировать
                            </button>
                            <button
                              onClick={() => deleteAdSettings(ad.position)}
                              className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors whitespace-nowrap"
                            >
                              🗑️ Удалить
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Ad Editor Form */}
                <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">
                    {editingAd ? 'Редактировать рекламный блок' : 'Создать рекламный блок'}
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Position */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Позиция <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={adForm.position}
                          onChange={(e) => setAdForm({...adForm, position: e.target.value})}
                          disabled={!!editingAd}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <option value="modal">Модальное окно креатива</option>
                          <option value="between_creatives">Между креативами</option>
                          <option value="sidebar">Боковая панель</option>
                          <option value="header">Шапка сайта</option>
                          <option value="footer">Подвал сайта</option>
                        </select>
                      </div>

                      {/* Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Тип рекламы <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={adForm.type}
                          onChange={(e) => setAdForm({...adForm, type: e.target.value})}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="code">Код рекламы (Google Ads, etc.)</option>
                          <option value="image">Изображение с ссылкой</option>
                          <option value="html">HTML код</option>
                        </select>
                      </div>

                      {/* Title */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Название</label>
                        <input
                          type="text"
                          value={adForm.title}
                          onChange={(e) => setAdForm({...adForm, title: e.target.value})}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Название рекламного блока"
                        />
                      </div>

                      {/* Enabled */}
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={adForm.enabled}
                            onChange={(e) => setAdForm({...adForm, enabled: e.target.checked})}
                            className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-300">Включено</span>
                        </label>
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Приоритет</label>
                        <input
                          type="number"
                          value={adForm.priority}
                          onChange={(e) => setAdForm({...adForm, priority: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                        <p className="text-xs text-gray-400 mt-1">Чем выше число, тем выше приоритет показа</p>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Content based on type */}
                      {adForm.type === 'code' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Код рекламы <span className="text-red-400">*</span>
                          </label>
                          <textarea
                            value={adForm.content}
                            onChange={(e) => setAdForm({...adForm, content: e.target.value})}
                            rows={8}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Вставьте код рекламы (Google Ads, Yandex Direct, etc.)"
                          />
                        </div>
                      )}

                      {adForm.type === 'html' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            HTML код <span className="text-red-400">*</span>
                          </label>
                          <textarea
                            value={adForm.content}
                            onChange={(e) => setAdForm({...adForm, content: e.target.value})}
                            rows={8}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Вставьте HTML код рекламы"
                          />
                        </div>
                      )}

                      {adForm.type === 'image' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              URL изображения <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="url"
                              value={adForm.image_url}
                              onChange={(e) => setAdForm({...adForm, image_url: e.target.value})}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="https://example.com/ad.jpg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Ссылка для перехода
                            </label>
                            <input
                              type="url"
                              value={adForm.link_url}
                              onChange={(e) => setAdForm({...adForm, link_url: e.target.value})}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="https://example.com"
                            />
                          </div>
                          {adForm.image_url && (
                            <div className="mt-4">
                              <img
                                src={adForm.image_url}
                                alt="Preview"
                                className="max-w-full h-auto rounded border border-gray-600"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            </div>
                          )}
                        </>
                      )}

                      {/* Width and Height */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Ширина</label>
                          <input
                            type="text"
                            value={adForm.width}
                            onChange={(e) => setAdForm({...adForm, width: e.target.value})}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="100%"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Высота</label>
                          <input
                            type="text"
                            value={adForm.height}
                            onChange={(e) => setAdForm({...adForm, height: e.target.value})}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="auto"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-4 mt-8 pt-6 border-t border-gray-700">
                    <button
                      onClick={() => {
                        setEditingAd(null)
                        setAdForm({
                          position: 'modal',
                          type: 'code',
                          title: '',
                          enabled: true,
                          content: '',
                          image_url: '',
                          link_url: '',
                          width: '100%',
                          height: 'auto',
                          priority: 0
                        })
                      }}
                      className="w-full sm:w-auto px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={saveAdSettings}
                      disabled={loadingAds || !adForm.position || !adForm.type || (adForm.type === 'code' && !adForm.content) || (adForm.type === 'image' && !adForm.image_url) || (adForm.type === 'html' && !adForm.content)}
                      className={`w-full sm:w-auto px-6 py-2 rounded-lg font-medium transition-colors ${
                        loadingAds || !adForm.position || !adForm.type || (adForm.type === 'code' && !adForm.content) || (adForm.type === 'image' && !adForm.image_url) || (adForm.type === 'html' && !adForm.content)
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {loadingAds ? '⏳ Сохранение...' : '✅ Сохранить'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Delete</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete {selectedCreatives.size} selected creative(s)? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteSelectedCreatives}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Same as main page */}
      {showModal && selectedCreative && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">
                {selectedCreative.title || 'Creative Details'}
              </h2>
              <div className="hidden sm:flex items-center gap-3">
                {selectedCreative.download_url && (
                  <a
                    href={selectedCreative.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="btn btn-primary"
                  >
                    Download Archive
                  </a>
                )}
                {selectedCreative.download_url && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      try {
                        // Показываем индикатор загрузки (опционально)
                        const button = e.currentTarget
                        const originalText = button.innerHTML
                        button.disabled = true
                        button.innerHTML = '<span>⏳ Loading...</span>'
                        
                        // Загружаем файл в кеш браузера
                        const response = await fetch(selectedCreative.download_url!)
                        if (!response.ok) {
                          throw new Error('Failed to load file')
                        }
                        
                        // Получаем текст файла
                        const text = await response.text()
                        
                        // Восстанавливаем кнопку
                        button.disabled = false
                        button.innerHTML = originalText
                        
                        // Проверяем, что мы получили контент
                        if (!text || text.length === 0) {
                          throw new Error('File content is empty')
                        }
                        
                        // Проверяем, это MHTML или обычный HTML
                        let htmlContent = text
                        
                        if (text.includes('Content-Type: multipart/related') || text.includes('boundary=')) {
                          // Это MHTML, извлекаем HTML и CSS
                          // Ищем boundary в заголовке MHTML
                          let boundaryMatch = text.match(/boundary=["']?([^"'\s;]+)["']?/i)
                          
                          // Если не нашли в первой строке, ищем в Content-Type
                          if (!boundaryMatch) {
                            const contentTypeMatch = text.match(/Content-Type:\s*multipart\/related[^]*?boundary=["']?([^"'\s;]+)["']?/i)
                            if (contentTypeMatch) {
                              boundaryMatch = contentTypeMatch
                            }
                          }
                          
                          const cssResources = new Map()
                          const imageResources = new Map()
                          
                          if (boundaryMatch) {
                            const boundary = `--${boundaryMatch[1]}`
                            // Разделяем на части, но пропускаем первую часть (заголовки MHTML)
                            const allParts = text.split(boundary)
                            // Пропускаем первую часть (заголовки MHTML) и последнюю (пустая строка после последнего boundary)
                            const parts = allParts.slice(1, allParts.length - 1)
                            
                            // Собираем все ресурсы (CSS и изображения)
                            for (const part of parts) {
                              const headerEnd = part.indexOf('\r\n\r\n') !== -1 
                                ? part.indexOf('\r\n\r\n') + 4
                                : part.indexOf('\n\n') !== -1
                                ? part.indexOf('\n\n') + 2
                                : -1
                              
                              if (headerEnd === -1) continue
                              
                              const headers = part.substring(0, headerEnd).toLowerCase()
                              const body = part.substring(headerEnd).trim()
                              
                              // Ищем CSS файлы
                              if (headers.includes('content-type: text/css')) {
                                const locationMatch = headers.match(/content-location:\s*([^\r\n]+)/i) || 
                                                     headers.match(/content-id:\s*<([^>]+)>/i)
                                const location = locationMatch ? locationMatch[1].trim() : null
                                
                                if (location && body.length > 0) {
                                  // Сохраняем CSS контент
                                  cssResources.set(location, body)
                                }
                              }
                              
                              // Ищем изображения (jpg, png, gif, webp, svg и т.д.)
                              if (headers.includes('content-type: image/')) {
                                const contentTypeMatch = headers.match(/content-type:\s*([^\r\n]+)/i)
                                const contentType = contentTypeMatch ? contentTypeMatch[1].trim().toLowerCase() : 'image/jpeg'
                                
                                const locationMatch = headers.match(/content-location:\s*([^\r\n]+)/i) || 
                                                     headers.match(/content-id:\s*<([^>]+)>/i)
                                const location = locationMatch ? locationMatch[1].trim() : null
                                
                                if (location && body.length > 0) {
                                  try {
                                    // Проверяем Content-Transfer-Encoding
                                    const encodingMatch = headers.match(/content-transfer-encoding:\s*([^\r\n]+)/i)
                                    const encoding = encodingMatch ? encodingMatch[1].trim().toLowerCase() : ''
                                    
                                    let imageData = body.trim()
                                    
                                    // Если изображение уже в формате data URI, используем как есть
                                    if (imageData.startsWith('data:')) {
                                      imageResources.set(location, imageData)
                                      continue
                                    }
                                    
                                    // Если encoding = base64 или изображение выглядит как base64
                                    if (encoding === 'base64' || /^[A-Za-z0-9+/=\s]+$/.test(imageData)) {
                                      // Удаляем все пробелы и переносы строк из base64
                                      const cleanBody = imageData.replace(/[\r\n\s]/g, '')
                                      imageData = `data:${contentType};base64,${cleanBody}`
                                    } else {
                                      // Для бинарных данных в браузере нужно использовать другой подход
                                      // Но обычно в MHTML изображения уже в base64
                                      // Пробуем использовать как base64
                                      const cleanBody = imageData.replace(/[\r\n\s]/g, '')
                                      if (/^[A-Za-z0-9+/=]+$/.test(cleanBody)) {
                                        imageData = `data:${contentType};base64,${cleanBody}`
                                      } else {
                                        // Если не base64, пропускаем (в браузере сложно работать с бинарными данными)
                                        continue
                                      }
                                    }
                                    
                                    // Сохраняем изображение
                                    imageResources.set(location, imageData)
                                  } catch (e) {
                                    // Если не удалось обработать изображение, пропускаем его
                                    continue
                                  }
                                }
                              }
                            }
                            
                            // Ищем часть с основным HTML контентом
                            let foundMainHtml = false
                            let mainHtmlContent = ''
                            let maxHtmlLength = 0
                            let baseUrl = '' // Базовый URL для разрешения относительных путей
                            
                            // Сначала ищем HTML с Content-Location (основная страница, не iframe)
                            for (const part of parts) {
                              const headerEnd = part.indexOf('\r\n\r\n') !== -1 
                                ? part.indexOf('\r\n\r\n') + 4
                                : part.indexOf('\n\n') !== -1
                                ? part.indexOf('\n\n') + 2
                                : -1
                              
                              if (headerEnd === -1) continue
                              
                              const headers = part.substring(0, headerEnd).toLowerCase()
                              let body = part.substring(headerEnd).trim()
                              
                              // Удаляем возможные заголовки MHTML из начала body (если они там остались)
                              // Ищем начало HTML контента - должно начинаться с <!DOCTYPE или <html
                              const htmlStartIndex = Math.max(
                                body.indexOf('<!DOCTYPE'),
                                body.indexOf('<html')
                              )
                              
                              if (htmlStartIndex > 0) {
                                // Если HTML начинается не с начала body, обрезаем все заголовки перед ним
                                body = body.substring(htmlStartIndex)
                              }
                              
                              // Ищем HTML блок с Content-Location (основная страница, не iframe)
                              // Исключаем iframe контент и другие встроенные элементы
                              if (headers.includes('content-type: text/html') && 
                                  headers.includes('content-location:') &&
                                  (body.includes('<!DOCTYPE') || body.startsWith('<html'))) {
                                const locationMatch = headers.match(/content-location:\s*([^\r\n]+)/i)
                                const location = locationMatch ? locationMatch[1].trim() : ''
                                
                                // Сохраняем базовый URL
                                if (location && !baseUrl) {
                                  try {
                                    const urlObj = new URL(location)
                                    baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1)}`
                                  } catch {
                                    baseUrl = location.substring(0, location.lastIndexOf('/') + 1)
                                  }
                                }
                                
                                // Пропускаем iframe, embed и другие встроенные элементы
                                if (location.includes('iframe') || 
                                    location.includes('embed') || 
                                    location.includes('frame') ||
                                    location.includes('widget') ||
                                    location.includes('popup')) {
                                  continue
                                }
                                
                                // Ищем начало HTML (может быть <!DOCTYPE или <html)
                                const htmlStart = Math.max(
                                  body.indexOf('<!DOCTYPE'),
                                  body.indexOf('<html')
                                )
                                
                                if (htmlStart !== -1) {
                                  const candidate = body.substring(htmlStart)
                                  const htmlEnd = candidate.indexOf('</html>')
                                  if (htmlEnd !== -1) {
                                    const htmlBlock = candidate.substring(0, htmlEnd + 7)
                                    // Берем самый большой HTML блок с Content-Location
                                    if (htmlBlock.length > maxHtmlLength) {
                                      mainHtmlContent = htmlBlock
                                      maxHtmlLength = htmlBlock.length
                                      foundMainHtml = true
                                    }
                                  }
                                }
                              }
                            }
                            
                            // Если нашли через Content-Location, используем его
                            if (foundMainHtml && mainHtmlContent.length > 0) {
                              htmlContent = mainHtmlContent
                            } else {
                              // Если не нашли через Content-Location, берем самый большой HTML блок
                              maxHtmlLength = 0
                              for (const part of parts) {
                                const headerEnd = part.indexOf('\r\n\r\n') !== -1 
                                  ? part.indexOf('\r\n\r\n') + 4
                                  : part.indexOf('\n\n') !== -1
                                  ? part.indexOf('\n\n') + 2
                                  : -1
                                
                                if (headerEnd === -1) continue
                                
                                const headers = part.substring(0, headerEnd).toLowerCase()
                                let body = part.substring(headerEnd).trim()
                                
                                // Удаляем возможные заголовки MHTML из начала body
                                const htmlStartIndex = Math.max(
                                  body.indexOf('<!DOCTYPE'),
                                  body.indexOf('<html')
                                )
                                
                                if (htmlStartIndex > 0) {
                                  // Если HTML начинается не с начала body, обрезаем все заголовки перед ним
                                  body = body.substring(htmlStartIndex)
                                }
                                
                                // Пропускаем части без HTML или с подозрительными заголовками
                                if (!headers.includes('content-type: text/html') || 
                                    (!body.includes('<!DOCTYPE') && !body.startsWith('<html'))) {
                                  continue
                                }
                                
                                // Пропускаем iframe и встроенный контент
                                if (headers.includes('content-location:')) {
                                  const locationMatch = headers.match(/content-location:\s*([^\r\n]+)/i)
                                  const location = locationMatch ? locationMatch[1].trim().toLowerCase() : ''
                                  if (location.includes('iframe') || 
                                      location.includes('embed') || 
                                      location.includes('frame') ||
                                      location.includes('widget') ||
                                      location.includes('popup')) {
                                    continue
                                  }
                                }
                                
                                // Ищем начало HTML (может быть <!DOCTYPE или <html)
                                const htmlStart = Math.max(
                                  body.indexOf('<!DOCTYPE'),
                                  body.indexOf('<html')
                                )
                                
                                if (htmlStart !== -1) {
                                  const candidate = body.substring(htmlStart)
                                  const htmlEnd = candidate.indexOf('</html>')
                                  if (htmlEnd !== -1) {
                                    const htmlBlock = candidate.substring(0, htmlEnd + 7)
                                    // Берем самый большой HTML блок (основной контент)
                                    if (htmlBlock.length > maxHtmlLength && htmlBlock.length > 1000) {
                                      mainHtmlContent = htmlBlock
                                      maxHtmlLength = htmlBlock.length
                                    }
                                  }
                                }
                              }
                              
                              if (mainHtmlContent.length > 0) {
                                htmlContent = mainHtmlContent
                              }
                            }
                            
                            // Встраиваем CSS стили в HTML
                            if (htmlContent && cssResources.size > 0) {
                              // Находим </head> или создаем head если его нет
                              let headEnd = htmlContent.indexOf('</head>')
                              if (headEnd === -1) {
                                // Если нет </head>, добавляем перед </html>
                                const htmlEnd = htmlContent.indexOf('</html>')
                                if (htmlEnd !== -1) {
                                  htmlContent = htmlContent.substring(0, htmlEnd) + '</head></html>'
                                  headEnd = htmlContent.indexOf('</head>')
                                }
                              }
                              
                              if (headEnd !== -1) {
                                // Создаем блок со стилями
                                let stylesBlock = ''
                                cssResources.forEach((cssContent, location) => {
                                  stylesBlock += `<style data-source="${location}">\n${cssContent}\n</style>\n`
                                })
                                
                                // Вставляем стили перед </head>
                                htmlContent = htmlContent.substring(0, headEnd) + stylesBlock + htmlContent.substring(headEnd)
                              }
                              
                              // Заменяем ссылки на cid: CSS файлы на встроенные стили
                              cssResources.forEach((cssContent, location) => {
                                // Заменяем cid: ссылки в href
                                htmlContent = htmlContent.replace(
                                  new RegExp(`<link[^>]*href=["']cid:${location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'gi'),
                                  ''
                                )
                              })
                            }
                            
                            // Функция для разрешения относительных URL
                            const resolveUrl = (url: string, base: string): string => {
                              if (!url) return url
                              
                              // Если уже абсолютный URL
                              if (url.startsWith('http://') || url.startsWith('https://')) {
                                return url
                              }
                              
                              // Если протокол-относительный URL (//example.com/image.jpg)
                              if (url.startsWith('//')) {
                                try {
                                  const baseUrl = new URL(base || 'http://example.com')
                                  return `${baseUrl.protocol}${url}`
                                } catch {
                                  return `https:${url}`
                                }
                              }
                              
                              // Если абсолютный путь (/image.jpg)
                              if (url.startsWith('/')) {
                                try {
                                  const baseUrl = new URL(base || 'http://example.com')
                                  return `${baseUrl.protocol}//${baseUrl.host}${url}`
                                } catch {
                                  return url
                                }
                              }
                              
                              // Относительный путь (image.jpg или ../image.jpg)
                              try {
                                const baseUrl = new URL(base || 'http://example.com')
                                return new URL(url, baseUrl).toString()
                              } catch {
                                return url
                              }
                            }
                            
                            // Функция для нормализации URL (для сравнения)
                            const normalizeUrlForMatch = (url: string): string => {
                              if (!url) return ''
                              try {
                                const urlObj = new URL(url, baseUrl || 'http://example.com')
                                // Убираем протокол, домен, query и hash для сравнения
                                return urlObj.pathname.toLowerCase()
                              } catch {
                                // Если не URL, возвращаем путь без query и hash
                                return url.split('?')[0].split('#')[0].toLowerCase()
                              }
                            }
                            
                            // Заменяем ссылки на изображения из MHTML на встроенные data URIs
                            if (htmlContent && imageResources.size > 0) {
                              // Создаем карту нормализованных путей для быстрого поиска
                              const imageMap = new Map<string, string>()
                              imageResources.forEach((imageData, location) => {
                                // Сохраняем оригинальный путь (в разных вариантах регистра)
                                imageMap.set(location.toLowerCase(), imageData)
                                imageMap.set(location, imageData)
                                
                                // Сохраняем нормализованный путь
                                const normalized = normalizeUrlForMatch(location)
                                if (normalized) {
                                  imageMap.set(normalized, imageData)
                                  // Также сохраняем с ведущим слешем
                                  if (!normalized.startsWith('/')) {
                                    imageMap.set(`/${normalized}`, imageData)
                                  }
                                }
                                
                                // Сохраняем только имя файла
                                const fileName = location.split('/').pop()?.split('?')[0]?.toLowerCase()
                                if (fileName && fileName.includes('.')) {
                                  imageMap.set(fileName, imageData)
                                  // Также с разными вариантами пути
                                  imageMap.set(`./${fileName}`, imageData)
                                  imageMap.set(`../${fileName}`, imageData)
                                }
                                
                                // Если есть baseUrl, разрешаем относительные пути
                                if (baseUrl) {
                                  try {
                                    const resolved = resolveUrl(location, baseUrl)
                                    if (resolved !== location) {
                                      imageMap.set(resolved.toLowerCase(), imageData)
                                      const resolvedNormalized = normalizeUrlForMatch(resolved)
                                      if (resolvedNormalized) {
                                        imageMap.set(resolvedNormalized, imageData)
                                      }
                                    }
                                  } catch (e) {
                                    // Игнорируем ошибки разрешения URL
                                  }
                                }
                              })
                              
                              // Заменяем все ссылки на изображения
                              imageMap.forEach((imageData, searchKey) => {
                                // Экранируем для regex
                                const escaped = searchKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                                
                                // Заменяем в src атрибутах
                                htmlContent = htmlContent.replace(
                                  new RegExp(`(src=["'])([^"']*${escaped}[^"']*)(["'])`, 'gi'),
                                  (match, prefix, url, suffix) => {
                                    // Проверяем, что это действительно изображение
                                    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|#|$)/i) || 
                                        url.includes('image') || 
                                        url.match(/data:image/i)) {
                                      return `${prefix}${imageData}${suffix}`
                                    }
                                    return match
                                  }
                                )
                                
                                // Заменяем в srcset
                                htmlContent = htmlContent.replace(
                                  new RegExp(`(srcset=["'])([^"']*${escaped}[^"']*)(["'])`, 'gi'),
                                  (match, prefix, url, suffix) => {
                                    // Проверяем, что это действительно изображение
                                    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|#|$)/i) || 
                                        url.includes('image')) {
                                      return `${prefix}${imageData}${suffix}`
                                    }
                                    return match
                                  }
                                )
                                
                                // Заменяем в data-src (lazy loading)
                                htmlContent = htmlContent.replace(
                                  new RegExp(`(data-src=["'])([^"']*${escaped}[^"']*)(["'])`, 'gi'),
                                  (match, prefix, url, suffix) => {
                                    // Проверяем, что это действительно изображение
                                    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|#|$)/i) || 
                                        url.includes('image')) {
                                      return `${prefix}${imageData}${suffix}`
                                    }
                                    return match
                                  }
                                )
                                
                                // Заменяем cid: ссылки
                                htmlContent = htmlContent.replace(
                                  new RegExp(`cid:${escaped}`, 'gi'),
                                  imageData
                                )
                                
                                // Заменяем в inline стилях (style="background-image: url(...)")
                                htmlContent = htmlContent.replace(
                                  new RegExp(`(style=["'][^"']*background-image:\\s*url\\(["']?)([^"')]*${escaped}[^"')]*)(["']?\\)[^"']*["'])`, 'gi'),
                                  (match, prefix, url, suffix) => {
                                    return `${prefix}${imageData}${suffix}`
                                  }
                                )
                                
                                // Также заменяем в других CSS свойствах со ссылками на изображения
                                htmlContent = htmlContent.replace(
                                  new RegExp(`(style=["'][^"']*:\\s*url\\(["']?)([^"')]*${escaped}[^"')]*)(["']?\\)[^"']*["'])`, 'gi'),
                                  (match, prefix, url, suffix) => {
                                    // Проверяем, что это изображение
                                    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|#|$)/i) || 
                                        url.includes('image')) {
                                      return `${prefix}${imageData}${suffix}`
                                    }
                                    return match
                                  }
                                )
                              })
                              
                              // Также обрабатываем пути в CSS
                              const updatedCssResources = new Map<string, string>()
                              cssResources.forEach((cssContent, cssLocation) => {
                                let updatedCss = cssContent
                                
                                // Обрабатываем все возможные варианты путей к изображениям
                                imageMap.forEach((imageData, searchKey) => {
                                  const escaped = searchKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                                  
                                  // Заменяем в CSS url() с разными вариантами кавычек и без них
                                  updatedCss = updatedCss.replace(
                                    new RegExp(`url\\(["']?[^"')]*${escaped}[^"')]*["']?\\)`, 'gi'),
                                    `url(${imageData})`
                                  )
                                  
                                  // Также заменяем относительные пути, разрешая их через baseUrl
                                  if (baseUrl) {
                                    const resolvedUrl = resolveUrl(searchKey, baseUrl)
                                    if (resolvedUrl !== searchKey) {
                                      const resolvedEscaped = resolvedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                                      updatedCss = updatedCss.replace(
                                        new RegExp(`url\\(["']?[^"')]*${resolvedEscaped}[^"')]*["']?\\)`, 'gi'),
                                        `url(${imageData})`
                                      )
                                    }
                                  }
                                })
                                
                                updatedCssResources.set(cssLocation, updatedCss)
                              })
                              
                              // Обновляем CSS ресурсы
                              cssResources.clear()
                              updatedCssResources.forEach((content, location) => {
                                cssResources.set(location, content)
                              })
                              
                              // Обновляем CSS в HTML после замены изображений
                              if (cssResources.size > 0) {
                                let headEnd = htmlContent.indexOf('</head>')
                                if (headEnd !== -1) {
                                  // Находим существующие style теги и обновляем их
                                  const styleRegex = /<style[^>]*data-source=["']([^"']+)["'][^>]*>([\s\S]*?)<\/style>/gi
                                  htmlContent = htmlContent.replace(styleRegex, (match, source, content) => {
                                    const updatedContent = cssResources.get(source) || content
                                    return `<style data-source="${source}">\n${updatedContent}\n</style>`
                                  })
                                }
                              }
                            }
                          } else {
                            // Fallback: прямой поиск HTML
                            const htmlMatch = text.match(/<!DOCTYPE[\s\S]*?<\/html>/i)
                            if (htmlMatch) {
                              htmlContent = htmlMatch[0]
                            }
                          }
                          
                          // Проверяем, что HTML контент был найден
                          if (!htmlContent || htmlContent.trim().length === 0) {
                            throw new Error('Failed to extract HTML content from MHTML file')
                          }
                          
                          // Финальная обрезка - строго по первому </html>
                          const finalHtmlEnd = htmlContent.indexOf('</html>')
                          if (finalHtmlEnd !== -1) {
                            htmlContent = htmlContent.substring(0, finalHtmlEnd + 7)
                          }
                        }
                        
                        // Финальная очистка HTML контента
                        htmlContent = htmlContent.trim()
                        
                        // Проверяем, что после очистки контент не пустой
                        if (!htmlContent || htmlContent.length === 0) {
                          throw new Error('HTML content is empty after processing')
                        }
                        
                        // Удаляем заголовки MHTML, если они попали в начало HTML (From, Subject, Date и т.д.)
                        const mhtmlHeadersPattern = /^(From:|Snapshot-Content-Location:|Subject:|Date:|MIME-Version:|Content-Type:|boundary=)[^\n]*\n?/gmi
                        htmlContent = htmlContent.replace(mhtmlHeadersPattern, '')
                        
                        // Ищем начало HTML контента после удаления заголовков
                        const finalHtmlStart = Math.max(
                          htmlContent.indexOf('<!DOCTYPE'),
                          htmlContent.indexOf('<html')
                        )
                        
                        if (finalHtmlStart > 0) {
                          // Если HTML начинается не с начала, обрезаем все перед ним
                          htmlContent = htmlContent.substring(finalHtmlStart)
                        }
                        
                        // Строго обрезаем по первому </html> - это гарантирует, что мы не захватим
                        // дополнительные HTML блоки из других частей MHTML (например, iframe контент)
                        const strictHtmlEnd = htmlContent.indexOf('</html>')
                        if (strictHtmlEnd !== -1) {
                          htmlContent = htmlContent.substring(0, strictHtmlEnd + 7)
                        }
                        
                        // Удаляем все скрипты, которые могут добавлять элементы на страницу
                        htmlContent = htmlContent.replace(/<script[\s\S]*?<\/script>/gi, '')
                        
                        // Проверяем структуру HTML - должно быть: <!DOCTYPE>...<html>...<body>...</body></html>
                        // Убеждаемся, что после </body> идет только </html>, без лишнего контента
                        const bodyEndIndex = htmlContent.lastIndexOf('</body>')
                        const htmlEndIndex = htmlContent.lastIndexOf('</html>')
                        
                        if (bodyEndIndex !== -1 && htmlEndIndex !== -1 && htmlEndIndex > bodyEndIndex) {
                          // Проверяем, что между </body> и </html> нет лишнего контента
                          const betweenTags = htmlContent.substring(bodyEndIndex + 7, htmlEndIndex).trim()
                          if (betweenTags.length > 0 && !betweenTags.match(/^[\s\n\r]*$/)) {
                            // Есть лишний контент между тегами, удаляем его
                            htmlContent = htmlContent.substring(0, bodyEndIndex + 7) + '\n</html>'
                          }
                        }
                        
                        // Валидация HTML контента перед созданием blob
                        if (!htmlContent || htmlContent.trim().length === 0) {
                          throw new Error('HTML content is empty')
                        }
                        
                        // Проверяем, что HTML начинается с <!DOCTYPE или <html
                        if (!htmlContent.includes('<!DOCTYPE') && !htmlContent.includes('<html')) {
                          throw new Error('Invalid HTML content: missing DOCTYPE or html tag')
                        }
                        
                        // Убеждаемся, что HTML имеет закрывающий тег </html>
                        if (!htmlContent.includes('</html>')) {
                          htmlContent += '\n</html>'
                        }
                        
                        // Убеждаемся, что есть тег <body>
                        if (!htmlContent.includes('<body')) {
                          const htmlTagIndex = htmlContent.indexOf('<html')
                          if (htmlTagIndex !== -1) {
                            const htmlTagEnd = htmlContent.indexOf('>', htmlTagIndex)
                            if (htmlTagEnd !== -1) {
                              htmlContent = htmlContent.substring(0, htmlTagEnd + 1) + '\n<body>\n' + 
                                           htmlContent.substring(htmlTagEnd + 1)
                              // Добавляем закрывающий тег </body> перед </html>
                              const htmlEndIndex = htmlContent.lastIndexOf('</html>')
                              if (htmlEndIndex !== -1) {
                                htmlContent = htmlContent.substring(0, htmlEndIndex) + '\n</body>\n' + 
                                             htmlContent.substring(htmlEndIndex)
                              }
                            }
                          }
                        }
                        
                        // Создаем blob из HTML контента
                        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
                        
                        // Проверяем размер blob
                        if (blob.size === 0) {
                          throw new Error('Blob size is zero')
                        }
                        
                        // Создаем blob URL
                        const blobUrl = URL.createObjectURL(blob)
                        
                        // Проверяем, что blob URL создан успешно
                        if (!blobUrl || blobUrl.length === 0) {
                          throw new Error('Failed to create blob URL')
                        }
                        
                        // Открываем в новой вкладке
                        const newWindow = window.open(blobUrl, '_blank')
                        
                        if (!newWindow) {
                          URL.revokeObjectURL(blobUrl)
                          alert('Please allow popups to preview the page')
                        } else {
                          // Даем время окну загрузиться перед возможной очисткой
                          // Blob URL будет автоматически очищен браузером при закрытии вкладки
                          // Но мы можем сохранить ссылку на blobUrl в window для отладки
                          if (typeof window !== 'undefined') {
                            (window as any).lastBlobUrl = blobUrl
                          }
                        }
                      } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                        alert(`Failed to load page preview: ${errorMessage}`)
                      } finally {
                        // Восстанавливаем кнопку в случае ошибки
                        const button = e.currentTarget
                        if (button) {
                          button.disabled = false
                          button.textContent = 'Preview Page'
                        }
                      }
                    }}
                    className="btn btn-success"
                  >
                    Preview Page
                  </button>
                )}
                {selectedCreative.source_link && (
                  <a
                    href={selectedCreative.source_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    Link
                  </a>
                )}
                <button
                  onClick={() => openEditModal(selectedCreative)}
                  className="btn btn-success"
                >
                  <EditIcon />
                  <span>Edit</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteSingleCreative(selectedCreative.id, selectedCreative.title)
                  }}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                >
                  <TrashIcon />
                  <span>Delete</span>
                </button>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white text-2xl font-bold ml-2"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Mobile Buttons - Below Header */}
            <div className="flex flex-col sm:hidden gap-2 p-4 border-b border-gray-700">
              {selectedCreative.download_url && (
                <a
                  href={selectedCreative.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors text-center"
                >
                  Download Archive
                </a>
              )}
              {selectedCreative.download_url && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    try {
                      // Показываем индикатор загрузки (опционально)
                      const button = e.currentTarget
                      const originalText = button.innerHTML
                      button.disabled = true
                      button.innerHTML = '<span>⏳ Loading...</span>'
                      
                      // Загружаем файл в кеш браузера
                      const response = await fetch(selectedCreative.download_url!)
                      if (!response.ok) {
                        throw new Error('Failed to load file')
                      }
                      
                      // Получаем текст файла
                      const text = await response.text()
                      
                      // Восстанавливаем кнопку
                      button.disabled = false
                      button.innerHTML = originalText
                      
                      // Проверяем, что мы получили контент
                      if (!text || text.length === 0) {
                        throw new Error('File content is empty')
                      }
                      
                      // Проверяем, это MHTML или обычный HTML
                      let htmlContent = text
                      
                      if (text.includes('Content-Type: multipart/related') || text.includes('boundary=')) {
                        // Это MHTML, извлекаем HTML и CSS
                        // Ищем boundary в заголовке MHTML
                        let boundaryMatch = text.match(/boundary=["']?([^"'\s;]+)["']?/i)
                        
                        // Если не нашли в первой строке, ищем в Content-Type
                        if (!boundaryMatch) {
                          const contentTypeMatch = text.match(/Content-Type:\s*multipart\/related[^]*?boundary=["']?([^"'\s;]+)["']?/i)
                          if (contentTypeMatch) {
                            boundaryMatch = contentTypeMatch
                          }
                        }
                        
                        const cssResources = new Map()
                        const imageResources = new Map()
                        
                        if (boundaryMatch) {
                          const boundary = `--${boundaryMatch[1]}`
                          // Разделяем на части, но пропускаем первую часть (заголовки MHTML)
                          const allParts = text.split(boundary)
                          // Пропускаем первую часть (заголовки MHTML) и последнюю (пустая строка после последнего boundary)
                          const parts = allParts.slice(1, allParts.length - 1)
                          
                          // Собираем все ресурсы (CSS и изображения)
                          for (const part of parts) {
                            const headerEnd = part.indexOf('\r\n\r\n') !== -1 
                              ? part.indexOf('\r\n\r\n') + 4
                              : part.indexOf('\n\n') !== -1
                              ? part.indexOf('\n\n') + 2
                              : -1
                            
                            if (headerEnd === -1) continue
                            
                            const headers = part.substring(0, headerEnd).toLowerCase()
                            const body = part.substring(headerEnd).trim()
                            
                            // Ищем CSS файлы
                            if (headers.includes('content-type: text/css')) {
                              const locationMatch = headers.match(/content-location:\s*([^\r\n]+)/i) || 
                                                   headers.match(/content-id:\s*<([^>]+)>/i)
                              const location = locationMatch ? locationMatch[1].trim() : null
                              
                              if (location && body.length > 0) {
                                // Сохраняем CSS контент
                                cssResources.set(location, body)
                              }
                            }
                            
                            // Ищем изображения (jpg, png, gif, webp, svg и т.д.)
                            if (headers.includes('content-type: image/')) {
                              const contentTypeMatch = headers.match(/content-type:\s*([^\r\n]+)/i)
                              const contentType = contentTypeMatch ? contentTypeMatch[1].trim().toLowerCase() : 'image/jpeg'
                              
                              const locationMatch = headers.match(/content-location:\s*([^\r\n]+)/i) || 
                                                   headers.match(/content-id:\s*<([^>]+)>/i)
                              const location = locationMatch ? locationMatch[1].trim() : null
                              
                              if (location && body.length > 0) {
                                try {
                                  // Проверяем Content-Transfer-Encoding
                                  const encodingMatch = headers.match(/content-transfer-encoding:\s*([^\r\n]+)/i)
                                  const encoding = encodingMatch ? encodingMatch[1].trim().toLowerCase() : ''
                                  
                                  let imageData = body.trim()
                                  
                                  // Если изображение уже в формате data URI, используем как есть
                                  if (imageData.startsWith('data:')) {
                                    imageResources.set(location, imageData)
                                    continue
                                  }
                                  
                                  // Если encoding = base64 или изображение выглядит как base64
                                  if (encoding === 'base64' || /^[A-Za-z0-9+/=\s]+$/.test(imageData)) {
                                    // Удаляем все пробелы и переносы строк из base64
                                    const cleanBody = imageData.replace(/[\r\n\s]/g, '')
                                    imageData = `data:${contentType};base64,${cleanBody}`
                                  } else {
                                    // Для бинарных данных в браузере нужно использовать другой подход
                                    // Но обычно в MHTML изображения уже в base64
                                    // Пробуем использовать как base64
                                    const cleanBody = imageData.replace(/[\r\n\s]/g, '')
                                    if (/^[A-Za-z0-9+/=]+$/.test(cleanBody)) {
                                      imageData = `data:${contentType};base64,${cleanBody}`
                                    } else {
                                      // Если не base64, пропускаем (в браузере сложно работать с бинарными данными)
                                      continue
                                    }
                                  }
                                  
                                  // Сохраняем изображение
                                  imageResources.set(location, imageData)
                                } catch (e) {
                                  // Если не удалось обработать изображение, пропускаем его
                                  continue
                                }
                              }
                            }
                          }
                          
                          // Ищем часть с основным HTML контентом
                          let foundMainHtml = false
                          let mainHtmlContent = ''
                          let maxHtmlLength = 0
                          let baseUrl = '' // Базовый URL для разрешения относительных путей
                          
                          // Сначала ищем HTML с Content-Location (основная страница, не iframe)
                          for (const part of parts) {
                            const headerEnd = part.indexOf('\r\n\r\n') !== -1 
                              ? part.indexOf('\r\n\r\n') + 4
                              : part.indexOf('\n\n') !== -1
                              ? part.indexOf('\n\n') + 2
                              : -1
                            
                            if (headerEnd === -1) continue
                            
                            const headers = part.substring(0, headerEnd).toLowerCase()
                            let body = part.substring(headerEnd).trim()
                            
                            // Удаляем возможные заголовки MHTML из начала body (если они там остались)
                            // Ищем начало HTML контента - должно начинаться с <!DOCTYPE или <html
                            const htmlStartIndex = Math.max(
                              body.indexOf('<!DOCTYPE'),
                              body.indexOf('<html')
                            )
                            
                            if (htmlStartIndex > 0) {
                              // Если HTML начинается не с начала body, обрезаем все заголовки перед ним
                              body = body.substring(htmlStartIndex)
                            }
                            
                            // Ищем HTML блок с Content-Location (основная страница, не iframe)
                            // Исключаем iframe контент и другие встроенные элементы
                            if (headers.includes('content-type: text/html') && 
                                headers.includes('content-location:') &&
                                (body.includes('<!DOCTYPE') || body.startsWith('<html'))) {
                              const locationMatch = headers.match(/content-location:\s*([^\r\n]+)/i)
                              const location = locationMatch ? locationMatch[1].trim() : ''
                              
                              // Сохраняем базовый URL
                              if (location && !baseUrl) {
                                try {
                                  const urlObj = new URL(location)
                                  baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1)}`
                                } catch {
                                  baseUrl = location.substring(0, location.lastIndexOf('/') + 1)
                                }
                              }
                              
                              // Пропускаем iframe, embed и другие встроенные элементы
                              if (location.includes('iframe') || 
                                  location.includes('embed') || 
                                  location.includes('frame') ||
                                  location.includes('widget') ||
                                  location.includes('popup')) {
                                continue
                              }
                              
                              // Ищем начало HTML (может быть <!DOCTYPE или <html)
                              const htmlStart = Math.max(
                                body.indexOf('<!DOCTYPE'),
                                body.indexOf('<html')
                              )
                              
                              if (htmlStart !== -1) {
                                const candidate = body.substring(htmlStart)
                                const htmlEnd = candidate.indexOf('</html>')
                                if (htmlEnd !== -1) {
                                  const htmlBlock = candidate.substring(0, htmlEnd + 7)
                                  // Берем самый большой HTML блок с Content-Location
                                  if (htmlBlock.length > maxHtmlLength) {
                                    mainHtmlContent = htmlBlock
                                    maxHtmlLength = htmlBlock.length
                                    foundMainHtml = true
                                  }
                                }
                              }
                            }
                          }
                          
                          // Если нашли через Content-Location, используем его
                          if (foundMainHtml && mainHtmlContent.length > 0) {
                            htmlContent = mainHtmlContent
                          } else {
                            // Если не нашли через Content-Location, берем самый большой HTML блок
                            maxHtmlLength = 0
                            for (const part of parts) {
                              const headerEnd = part.indexOf('\r\n\r\n') !== -1 
                                ? part.indexOf('\r\n\r\n') + 4
                                : part.indexOf('\n\n') !== -1
                                ? part.indexOf('\n\n') + 2
                                : -1
                              
                              if (headerEnd === -1) continue
                              
                              const headers = part.substring(0, headerEnd).toLowerCase()
                              let body = part.substring(headerEnd).trim()
                              
                              // Удаляем возможные заголовки MHTML из начала body
                              const htmlStartIndex = Math.max(
                                body.indexOf('<!DOCTYPE'),
                                body.indexOf('<html')
                              )
                              
                              if (htmlStartIndex > 0) {
                                // Если HTML начинается не с начала body, обрезаем все заголовки перед ним
                                body = body.substring(htmlStartIndex)
                              }
                              
                              // Пропускаем части без HTML или с подозрительными заголовками
                              if (!headers.includes('content-type: text/html') || 
                                  (!body.includes('<!DOCTYPE') && !body.startsWith('<html'))) {
                                continue
                              }
                              
                              // Пропускаем iframe и встроенный контент
                              if (headers.includes('content-location:')) {
                                const locationMatch = headers.match(/content-location:\s*([^\r\n]+)/i)
                                const location = locationMatch ? locationMatch[1].trim().toLowerCase() : ''
                                if (location.includes('iframe') || 
                                    location.includes('embed') || 
                                    location.includes('frame') ||
                                    location.includes('widget') ||
                                    location.includes('popup')) {
                                  continue
                                }
                              }
                              
                              // Ищем начало HTML (может быть <!DOCTYPE или <html)
                              const htmlStart = Math.max(
                                body.indexOf('<!DOCTYPE'),
                                body.indexOf('<html')
                              )
                              
                              if (htmlStart !== -1) {
                                const candidate = body.substring(htmlStart)
                                const htmlEnd = candidate.indexOf('</html>')
                                if (htmlEnd !== -1) {
                                  const htmlBlock = candidate.substring(0, htmlEnd + 7)
                                  // Берем самый большой HTML блок (основной контент)
                                  if (htmlBlock.length > maxHtmlLength && htmlBlock.length > 1000) {
                                    mainHtmlContent = htmlBlock
                                    maxHtmlLength = htmlBlock.length
                                  }
                                }
                              }
                            }
                            
                            if (mainHtmlContent.length > 0) {
                              htmlContent = mainHtmlContent
                            }
                          }
                          
                          // Встраиваем CSS стили в HTML
                          if (htmlContent && cssResources.size > 0) {
                            // Находим </head> или создаем head если его нет
                            let headEnd = htmlContent.indexOf('</head>')
                            if (headEnd === -1) {
                              // Если нет </head>, добавляем перед </html>
                              const htmlEnd = htmlContent.indexOf('</html>')
                              if (htmlEnd !== -1) {
                                htmlContent = htmlContent.substring(0, htmlEnd) + '</head></html>'
                                headEnd = htmlContent.indexOf('</head>')
                              }
                            }
                            
                            if (headEnd !== -1) {
                              // Создаем блок со стилями
                              let stylesBlock = ''
                              cssResources.forEach((cssContent, location) => {
                                stylesBlock += `<style data-source="${location}">\n${cssContent}\n</style>\n`
                              })
                              
                              // Вставляем стили перед </head>
                              htmlContent = htmlContent.substring(0, headEnd) + stylesBlock + htmlContent.substring(headEnd)
                            }
                            
                            // Заменяем ссылки на cid: CSS файлы на встроенные стили
                            cssResources.forEach((cssContent, location) => {
                              // Заменяем cid: ссылки в href
                              htmlContent = htmlContent.replace(
                                new RegExp(`<link[^>]*href=["']cid:${location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'gi'),
                                ''
                              )
                            })
                          }
                          
                          // Функция для разрешения относительных URL
                          const resolveUrl = (url: string, base: string): string => {
                            if (!url) return url
                            
                            // Если уже абсолютный URL
                            if (url.startsWith('http://') || url.startsWith('https://')) {
                              return url
                            }
                            
                            // Если протокол-относительный URL (//example.com/image.jpg)
                            if (url.startsWith('//')) {
                              try {
                                const baseUrl = new URL(base || 'http://example.com')
                                return `${baseUrl.protocol}${url}`
                              } catch {
                                return `https:${url}`
                              }
                            }
                            
                            // Если абсолютный путь (/image.jpg)
                            if (url.startsWith('/')) {
                              try {
                                const baseUrl = new URL(base || 'http://example.com')
                                return `${baseUrl.protocol}//${baseUrl.host}${url}`
                              } catch {
                                return url
                              }
                            }
                            
                            // Относительный путь (image.jpg или ../image.jpg)
                            try {
                              const baseUrl = new URL(base || 'http://example.com')
                              return new URL(url, baseUrl).toString()
                            } catch {
                              return url
                            }
                          }
                          
                          // Функция для нормализации URL (для сравнения)
                          const normalizeUrlForMatch = (url: string): string => {
                            if (!url) return ''
                            try {
                              const urlObj = new URL(url, baseUrl || 'http://example.com')
                              // Убираем протокол, домен, query и hash для сравнения
                              return urlObj.pathname.toLowerCase()
                            } catch {
                              // Если не URL, возвращаем путь без query и hash
                              return url.split('?')[0].split('#')[0].toLowerCase()
                            }
                          }
                          
                          // Заменяем ссылки на изображения из MHTML на встроенные data URIs
                          if (htmlContent && imageResources.size > 0) {
                            // Создаем карту нормализованных путей для быстрого поиска
                            const imageMap = new Map<string, string>()
                            imageResources.forEach((imageData, location) => {
                              // Сохраняем оригинальный путь (в разных вариантах регистра)
                              imageMap.set(location.toLowerCase(), imageData)
                              imageMap.set(location, imageData)
                              
                              // Сохраняем нормализованный путь
                              const normalized = normalizeUrlForMatch(location)
                              if (normalized) {
                                imageMap.set(normalized, imageData)
                                // Также сохраняем с ведущим слешем
                                if (!normalized.startsWith('/')) {
                                  imageMap.set(`/${normalized}`, imageData)
                                }
                              }
                              
                              // Сохраняем только имя файла
                              const fileName = location.split('/').pop()?.split('?')[0]?.toLowerCase()
                              if (fileName && fileName.includes('.')) {
                                imageMap.set(fileName, imageData)
                                // Также с разными вариантами пути
                                imageMap.set(`./${fileName}`, imageData)
                                imageMap.set(`../${fileName}`, imageData)
                              }
                              
                              // Если есть baseUrl, разрешаем относительные пути
                              if (baseUrl) {
                                try {
                                  const resolved = resolveUrl(location, baseUrl)
                                  if (resolved !== location) {
                                    imageMap.set(resolved.toLowerCase(), imageData)
                                    const resolvedNormalized = normalizeUrlForMatch(resolved)
                                    if (resolvedNormalized) {
                                      imageMap.set(resolvedNormalized, imageData)
                                    }
                                  }
                                } catch (e) {
                                  // Игнорируем ошибки разрешения URL
                                }
                              }
                            })
                            
                            // Заменяем все ссылки на изображения
                            imageMap.forEach((imageData, searchKey) => {
                              // Экранируем для regex
                              const escaped = searchKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                              
                              // Заменяем в src атрибутах
                              htmlContent = htmlContent.replace(
                                new RegExp(`(src=["'])([^"']*${escaped}[^"']*)(["'])`, 'gi'),
                                (match, prefix, url, suffix) => {
                                  // Проверяем, что это действительно изображение
                                  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|#|$)/i) || 
                                      url.includes('image') || 
                                      url.match(/data:image/i)) {
                                    return `${prefix}${imageData}${suffix}`
                                  }
                                  return match
                                }
                              )
                              
                              // Заменяем в srcset
                              htmlContent = htmlContent.replace(
                                new RegExp(`(srcset=["'])([^"']*${escaped}[^"']*)(["'])`, 'gi'),
                                (match, prefix, url, suffix) => {
                                  // Проверяем, что это действительно изображение
                                  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|#|$)/i) || 
                                      url.includes('image')) {
                                    return `${prefix}${imageData}${suffix}`
                                  }
                                  return match
                                }
                              )
                              
                              // Заменяем в data-src (lazy loading)
                              htmlContent = htmlContent.replace(
                                new RegExp(`(data-src=["'])([^"']*${escaped}[^"']*)(["'])`, 'gi'),
                                (match, prefix, url, suffix) => {
                                  // Проверяем, что это действительно изображение
                                  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|#|$)/i) || 
                                      url.includes('image')) {
                                    return `${prefix}${imageData}${suffix}`
                                  }
                                  return match
                                }
                              )
                              
                              // Заменяем cid: ссылки
                              htmlContent = htmlContent.replace(
                                new RegExp(`cid:${escaped}`, 'gi'),
                                imageData
                              )
                              
                              // Заменяем в inline стилях (style="background-image: url(...)")
                              htmlContent = htmlContent.replace(
                                new RegExp(`(style=["'][^"']*background-image:\\s*url\\(["']?)([^"')]*${escaped}[^"')]*)(["']?\\)[^"']*["'])`, 'gi'),
                                (match, prefix, url, suffix) => {
                                  return `${prefix}${imageData}${suffix}`
                                }
                              )
                              
                              // Также заменяем в других CSS свойствах со ссылками на изображения
                              htmlContent = htmlContent.replace(
                                new RegExp(`(style=["'][^"']*:\\s*url\\(["']?)([^"')]*${escaped}[^"')]*)(["']?\\)[^"']*["'])`, 'gi'),
                                (match, prefix, url, suffix) => {
                                  // Проверяем, что это изображение
                                  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|#|$)/i) || 
                                      url.includes('image')) {
                                    return `${prefix}${imageData}${suffix}`
                                  }
                                  return match
                                }
                              )
                            })
                            
                            // Также обрабатываем пути в CSS
                            const updatedCssResources = new Map<string, string>()
                            cssResources.forEach((cssContent, cssLocation) => {
                              let updatedCss = cssContent
                              
                              // Обрабатываем все возможные варианты путей к изображениям
                              imageMap.forEach((imageData, searchKey) => {
                                const escaped = searchKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                                
                                // Заменяем в CSS url() с разными вариантами кавычек и без них
                                updatedCss = updatedCss.replace(
                                  new RegExp(`url\\(["']?[^"')]*${escaped}[^"')]*["']?\\)`, 'gi'),
                                  `url(${imageData})`
                                )
                                
                                // Также заменяем относительные пути, разрешая их через baseUrl
                                if (baseUrl) {
                                  const resolvedUrl = resolveUrl(searchKey, baseUrl)
                                  if (resolvedUrl !== searchKey) {
                                    const resolvedEscaped = resolvedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                                    updatedCss = updatedCss.replace(
                                      new RegExp(`url\\(["']?[^"')]*${resolvedEscaped}[^"')]*["']?\\)`, 'gi'),
                                      `url(${imageData})`
                                    )
                                  }
                                }
                              })
                              
                              updatedCssResources.set(cssLocation, updatedCss)
                            })
                            
                            // Обновляем CSS ресурсы
                            cssResources.clear()
                            updatedCssResources.forEach((content, location) => {
                              cssResources.set(location, content)
                            })
                            
                            // Обновляем CSS в HTML после замены изображений
                            if (cssResources.size > 0) {
                              let headEnd = htmlContent.indexOf('</head>')
                              if (headEnd !== -1) {
                                // Находим существующие style теги и обновляем их
                                const styleRegex = /<style[^>]*data-source=["']([^"']+)["'][^>]*>([\s\S]*?)<\/style>/gi
                                htmlContent = htmlContent.replace(styleRegex, (match, source, content) => {
                                  const updatedContent = cssResources.get(source) || content
                                  return `<style data-source="${source}">\n${updatedContent}\n</style>`
                                })
                              }
                            }
                          }
                        } else {
                          // Fallback: прямой поиск HTML
                          const htmlMatch = text.match(/<!DOCTYPE[\s\S]*?<\/html>/i)
                          if (htmlMatch) {
                            htmlContent = htmlMatch[0]
                          }
                        }
                        
                        // Проверяем, что HTML контент был найден
                        if (!htmlContent || htmlContent.trim().length === 0) {
                          throw new Error('Failed to extract HTML content from MHTML file')
                        }
                        
                        // Финальная обрезка - строго по первому </html>
                        const finalHtmlEnd = htmlContent.indexOf('</html>')
                        if (finalHtmlEnd !== -1) {
                          htmlContent = htmlContent.substring(0, finalHtmlEnd + 7)
                        }
                      }
                      
                      // Финальная очистка HTML контента
                      htmlContent = htmlContent.trim()
                      
                      // Проверяем, что после очистки контент не пустой
                      if (!htmlContent || htmlContent.length === 0) {
                        throw new Error('HTML content is empty after processing')
                      }
                      
                      // Удаляем заголовки MHTML, если они попали в начало HTML (From, Subject, Date и т.д.)
                      const mhtmlHeadersPattern = /^(From:|Snapshot-Content-Location:|Subject:|Date:|MIME-Version:|Content-Type:|boundary=)[^\n]*\n?/gmi
                      htmlContent = htmlContent.replace(mhtmlHeadersPattern, '')
                      
                      // Ищем начало HTML контента после удаления заголовков
                      const finalHtmlStart = Math.max(
                        htmlContent.indexOf('<!DOCTYPE'),
                        htmlContent.indexOf('<html')
                      )
                      
                      if (finalHtmlStart > 0) {
                        // Если HTML начинается не с начала, обрезаем все перед ним
                        htmlContent = htmlContent.substring(finalHtmlStart)
                      }
                      
                      // Строго обрезаем по первому </html> - это гарантирует, что мы не захватим
                      // дополнительные HTML блоки из других частей MHTML (например, iframe контент)
                      const strictHtmlEnd = htmlContent.indexOf('</html>')
                      if (strictHtmlEnd !== -1) {
                        htmlContent = htmlContent.substring(0, strictHtmlEnd + 7)
                      }
                      
                      // Удаляем все скрипты, которые могут добавлять элементы на страницу
                      htmlContent = htmlContent.replace(/<script[\s\S]*?<\/script>/gi, '')
                      
                      // Проверяем структуру HTML - должно быть: <!DOCTYPE>...<html>...<body>...</body></html>
                      // Убеждаемся, что после </body> идет только </html>, без лишнего контента
                      const bodyEndIndex = htmlContent.lastIndexOf('</body>')
                      const htmlEndIndex = htmlContent.lastIndexOf('</html>')
                      
                      if (bodyEndIndex !== -1 && htmlEndIndex !== -1 && htmlEndIndex > bodyEndIndex) {
                        // Проверяем, что между </body> и </html> нет лишнего контента
                        const betweenTags = htmlContent.substring(bodyEndIndex + 7, htmlEndIndex).trim()
                        if (betweenTags.length > 0 && !betweenTags.match(/^[\s\n\r]*$/)) {
                          // Есть лишний контент между тегами, удаляем его
                          htmlContent = htmlContent.substring(0, bodyEndIndex + 7) + '\n</html>'
                        }
                      }
                      
                      // Валидация HTML контента перед созданием blob
                      if (!htmlContent || htmlContent.trim().length === 0) {
                        throw new Error('HTML content is empty')
                      }
                      
                      // Проверяем, что HTML начинается с <!DOCTYPE или <html
                      if (!htmlContent.includes('<!DOCTYPE') && !htmlContent.includes('<html')) {
                        throw new Error('Invalid HTML content: missing DOCTYPE or html tag')
                      }
                      
                      // Убеждаемся, что HTML имеет закрывающий тег </html>
                      if (!htmlContent.includes('</html>')) {
                        htmlContent += '\n</html>'
                      }
                      
                      // Убеждаемся, что есть тег <body>
                      if (!htmlContent.includes('<body')) {
                        const htmlTagIndex = htmlContent.indexOf('<html')
                        if (htmlTagIndex !== -1) {
                          const htmlTagEnd = htmlContent.indexOf('>', htmlTagIndex)
                          if (htmlTagEnd !== -1) {
                            htmlContent = htmlContent.substring(0, htmlTagEnd + 1) + '\n<body>\n' + 
                                         htmlContent.substring(htmlTagEnd + 1)
                            // Добавляем закрывающий тег </body> перед </html>
                            const htmlEndIndex = htmlContent.lastIndexOf('</html>')
                            if (htmlEndIndex !== -1) {
                              htmlContent = htmlContent.substring(0, htmlEndIndex) + '\n</body>\n' + 
                                           htmlContent.substring(htmlEndIndex)
                            }
                          }
                        }
                      }
                      
                      // Создаем blob из HTML контента
                      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
                      
                      // Проверяем размер blob
                      if (blob.size === 0) {
                        throw new Error('Blob size is zero')
                      }
                      
                      // Создаем blob URL
                      const blobUrl = URL.createObjectURL(blob)
                      
                      // Проверяем, что blob URL создан успешно
                      if (!blobUrl || blobUrl.length === 0) {
                        throw new Error('Failed to create blob URL')
                      }
                      
                      // Открываем в новой вкладке
                      const newWindow = window.open(blobUrl, '_blank')
                      
                      if (!newWindow) {
                        URL.revokeObjectURL(blobUrl)
                        alert('Please allow popups to preview the page')
                      } else {
                        // Даем время окну загрузиться перед возможной очисткой
                        // Blob URL будет автоматически очищен браузером при закрытии вкладки
                        // Но мы можем сохранить ссылку на blobUrl в window для отладки
                        if (typeof window !== 'undefined') {
                          (window as any).lastBlobUrl = blobUrl
                        }
                      }
                    } catch (error) {
                      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                      alert(`Failed to load page preview: ${errorMessage}`)
                    } finally {
                      // Восстанавливаем кнопку в случае ошибки
                      const button = e.currentTarget
                      if (button) {
                        button.disabled = false
                        button.textContent = 'Preview Page'
                      }
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
                >
                  Preview Page
                </button>
              )}
              {selectedCreative.source_link && (
                <a
                  href={selectedCreative.source_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-full"
                >
                  Link
                </a>
              )}
              <button
                onClick={() => openEditModal(selectedCreative)}
                className="btn btn-success btn-full"
              >
                <EditIcon />
                <span>Edit</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteSingleCreative(selectedCreative.id, selectedCreative.title)
                }}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
              >
                <TrashIcon />
                <span>Delete</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Information */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Information</h3>
                  
                  {/* Title */}
                  <div className="mb-4 pb-4 border-b border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm text-gray-400">Title</div>
                      {editingField !== 'title' && (
                        <button
                          onClick={() => startEditField('title', selectedCreative.title || '')}
                          className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                          title="Редактировать заголовок"
                        >
                          <EditIcon />
                        </button>
                      )}
                    </div>
                    {editingField === 'title' ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={fieldEditValue}
                          onChange={(e) => setFieldEditValue(e.target.value)}
                          className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => saveFieldEdit('title')}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEditField}
                          className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                    <div className="text-base text-white font-medium">
                      {selectedCreative.title || '-'}
                    </div>
                    )}
                  </div>

                  {/* Description */}
                    <div className="mb-4 pb-4 border-b border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm text-gray-400">Description</div>
                      {editingField !== 'description' && (
                        <button
                          onClick={() => startEditField('description', selectedCreative.description || '')}
                          className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                          title="Редактировать описание"
                        >
                          <EditIcon />
                        </button>
                      )}
                      </div>
                    {editingField === 'description' ? (
                      <div className="flex gap-2">
                        <textarea
                          value={fieldEditValue}
                          onChange={(e) => setFieldEditValue(e.target.value)}
                          className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => saveFieldEdit('description')}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditField}
                            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-base text-gray-300">
                        {selectedCreative.description || '-'}
                    </div>
                  )}
                  </div>

                  {/* Metadata */}
                  <div className="space-y-3">
                    {/* Format */}
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-sm text-gray-400">Format:</span>
                      <div className="flex items-center gap-2">
                        {editingField === 'format' ? (
                          <div className="flex gap-2">
                            <select
                              value={fieldEditValue}
                              onChange={(e) => setFieldEditValue(e.target.value)}
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            >
                              <option value="">-</option>
                              {formats.map(f => (
                                <option key={f.code} value={f.code}>{f.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => saveFieldEdit('format')}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEditField}
                              className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                      <span className="text-sm text-white underline font-medium">
                        {selectedCreative.formats?.name || '-'}
                      </span>
                            <button
                              onClick={() => startEditField('format', selectedCreative.formats?.code || '')}
                              className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                              title="Редактировать формат"
                            >
                              <EditIcon />
                            </button>
                          </>
                        )}
                    </div>
                    </div>
                    {/* Type */}
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-sm text-gray-400">Type:</span>
                      <div className="flex items-center gap-2">
                        {editingField === 'type' ? (
                          <div className="flex gap-2">
                            <select
                              value={fieldEditValue}
                              onChange={(e) => setFieldEditValue(e.target.value)}
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            >
                              <option value="">-</option>
                              {types.map(t => (
                                <option key={t.code} value={t.code}>{t.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => saveFieldEdit('type')}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEditField}
                              className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                      <span className="text-sm text-white underline font-medium">
                        {selectedCreative.types?.name || '-'}
                      </span>
                            <button
                              onClick={() => startEditField('type', selectedCreative.types?.code || '')}
                              className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                              title="Редактировать тип"
                            >
                              <EditIcon />
                            </button>
                          </>
                        )}
                    </div>
                    </div>
                    {/* Placement */}
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-sm text-gray-400">Placement:</span>
                      <div className="flex items-center gap-2">
                        {editingField === 'placement' ? (
                          <div className="flex gap-2">
                            <select
                              value={fieldEditValue}
                              onChange={(e) => setFieldEditValue(e.target.value)}
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            >
                              <option value="">-</option>
                              {placements.map(p => (
                                <option key={p.code} value={p.code}>{p.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => saveFieldEdit('placement')}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEditField}
                              className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                      <span className="text-sm text-white underline font-medium">
                        {selectedCreative.placements?.name || '-'}
                      </span>
                            <button
                              onClick={() => startEditField('placement', selectedCreative.placements?.code || '')}
                              className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                              title="Редактировать размещение"
                            >
                              <EditIcon />
                            </button>
                          </>
                        )}
                    </div>
                    </div>
                    {/* Country */}
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-sm text-gray-400">Country:</span>
                      <div className="flex items-center gap-2">
                        {editingField === 'country' ? (
                          <div className="flex gap-2">
                            <select
                              value={fieldEditValue}
                              onChange={(e) => setFieldEditValue(e.target.value)}
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            >
                              <option value="">-</option>
                              {countries.map(c => (
                                <option key={c.code} value={c.code}>{c.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => saveFieldEdit('country')}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEditField}
                              className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                      <span className="text-sm text-white underline font-medium">
                        {selectedCreative.countries?.name || '-'}
                      </span>
                            <button
                              onClick={() => startEditField('country', selectedCreative.country_code || '')}
                              className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                              title="Редактировать страну"
                            >
                              <EditIcon />
                            </button>
                          </>
                        )}
                    </div>
                    </div>
                    {/* Platform */}
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-sm text-gray-400">Platform:</span>
                      <div className="flex items-center gap-2">
                        {editingField === 'platform' ? (
                          <div className="flex gap-2">
                            <select
                              value={fieldEditValue}
                              onChange={(e) => setFieldEditValue(e.target.value)}
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            >
                              <option value="">-</option>
                              {platforms.map(p => (
                                <option key={p.code} value={p.code}>{p.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => saveFieldEdit('platform')}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEditField}
                              className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                      <span className="text-sm text-white underline font-medium">
                        {selectedCreative.platforms?.name || '-'}
                      </span>
                            <button
                              onClick={() => startEditField('platform', selectedCreative.platforms?.code || '')}
                              className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                              title="Редактировать платформу"
                            >
                              <EditIcon />
                            </button>
                          </>
                        )}
                    </div>
                    </div>
                    {/* Cloaking */}
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-sm text-gray-400">Cloaking:</span>
                      <div className="flex items-center gap-2">
                        {editingField === 'cloaking' ? (
                          <div className="flex gap-2">
                            <select
                              value={fieldEditValue}
                              onChange={(e) => setFieldEditValue(e.target.value)}
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            >
                              <option value="false">No</option>
                              <option value="true">Yes</option>
                            </select>
                            <button
                              onClick={() => saveFieldEdit('cloaking')}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEditField}
                              className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                      <span className={`text-sm font-medium ${
                        selectedCreative.cloaking ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {selectedCreative.cloaking ? 'Yes' : 'No'}
                      </span>
                            <button
                              onClick={() => startEditField('cloaking', String(selectedCreative.cloaking))}
                              className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                              title="Редактировать cloaking"
                            >
                              <EditIcon />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-400">Captured:</span>
                      <span className="text-sm text-gray-300">
                        {new Date(selectedCreative.captured_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column - Media */}
                <div>
                  {selectedCreative.media_url ? (
                    <div className="w-full">
                      <img
                        src={selectedCreative.media_url}
                        alt={selectedCreative.title || 'Creative'}
                        className="w-full h-auto rounded-lg border border-gray-700 shadow-sm"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-800 flex items-center justify-center rounded-lg border border-gray-700">
                      <div className="text-center text-gray-400">
                        <div className="text-4xl mb-2">📄</div>
                        <p>No Preview Available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Screenshot Modal */}
      {showFullScreenshot && selectedCreative?.thumbnail_url && (
        <>
          {/* Mobile: Full screen */}
          <div
            className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[100] p-2 sm:hidden"
            onClick={() => setShowFullScreenshot(false)}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowFullScreenshot(false)
                }}
                className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700 text-white text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center z-10"
              >
                ×
              </button>
              <img
                src={selectedCreative.thumbnail_url}
                alt="Full screenshot"
                className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Desktop: Inside modal */}
          <div 
            className="hidden sm:block fixed inset-0 bg-black bg-opacity-75 z-[100] p-4"
            onClick={() => setShowFullScreenshot(false)}
          >
            <div className="max-w-6xl mx-auto h-full flex flex-col">
              <div className="flex justify-end mb-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowFullScreenshot(false)
                  }}
                  className="bg-gray-800 hover:bg-gray-700 text-white text-2xl font-bold w-10 h-10 rounded-full flex items-center justify-center"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-900 rounded-lg p-4 flex items-start justify-center">
                <img
                  src={selectedCreative.thumbnail_url}
                  alt="Full screenshot"
                  className="w-full max-w-full h-auto object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {showEditModal && editingCreative && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Edit Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">Edit Creative</h2>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-white text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Edit Form */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Form Fields */}
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Format */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Format</label>
                    <select
                      value={editForm.format}
                      onChange={(e) => setEditForm({...editForm, format: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Format</option>
                      {formats.map(format => (
                        <option key={format.id} value={format.code}>{format.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Type</option>
                      {types.map(type => (
                        <option key={type.id} value={type.code}>{type.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Placement */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Placement</label>
                    <select
                      value={editForm.placement}
                      onChange={(e) => setEditForm({...editForm, placement: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Placement</option>
                      {placements.map(placement => (
                        <option key={placement.id} value={placement.code}>{placement.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                    <select
                      value={editForm.country}
                      onChange={(e) => setEditForm({...editForm, country: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Country</option>
                      {countries.map(country => (
                        <option key={country.id} value={country.code}>{country.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Platform */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Platform</label>
                    <select
                      value={editForm.platform}
                      onChange={(e) => setEditForm({...editForm, platform: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Platform</option>
                      {platforms.map(platform => (
                        <option key={platform.id} value={platform.code}>{platform.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cloaking */}
                  <div>
                    <label className="flex items-center gap-2 text-gray-300">
                      <input
                        type="checkbox"
                        checked={editForm.cloaking}
                        onChange={(e) => setEditForm({...editForm, cloaking: e.target.checked})}
                        className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                      />
                      Cloaking
                    </label>
                  </div>

                  {/* Landing URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Landing URL</label>
                    <input
                      type="url"
                      value={editForm.landing_url}
                      onChange={(e) => setEditForm({...editForm, landing_url: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Source Link */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Source Link</label>
                    <input
                      type="url"
                      value={editForm.source_link}
                      onChange={(e) => setEditForm({...editForm, source_link: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Source Device */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Source Device</label>
                    <select
                      value={editForm.source_device}
                      onChange={(e) => setEditForm({...editForm, source_device: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Device</option>
                      <option value="desktop">Desktop</option>
                      <option value="mobile">Mobile</option>
                      <option value="tablet">Tablet</option>
                    </select>
                  </div>

                  {/* Captured Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Captured Date & Time</label>
                    <input
                      type="datetime-local"
                      value={editForm.captured_at}
                      onChange={(e) => setEditForm({...editForm, captured_at: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Date and time when the creative was captured</p>
                  </div>
                </div>

                {/* Right Column - Files */}
                <div className="space-y-6">
                  {/* Media File */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Media Image/Video</label>
                    {editingCreative.media_url && (
                      <div className="mb-3 relative">
                        <img
                          src={editingCreative.media_url}
                          alt="Current media"
                          className="w-full h-32 object-cover rounded border border-gray-700"
                        />
                        <button
                          onClick={() => deleteCreativeFile('media')}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.svg,.ico,.avif,.heic,.heif,.mp4,.avi,.mov,.wmv,.flv,.webm,.mkv,.m4v,.3gp,.ogv,.mpg,.mpeg,.ts,.mts,.m2ts"
                      onChange={(e) => handleFileChange('media_file', e.target.files?.[0] || null)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {editFiles.media_file && (
                      <div className="mt-2">
                        <p className="text-sm text-green-400">✅ Новый файл: {editFiles.media_file.name}</p>
                        <p className="text-xs text-gray-500">Размер: {(editFiles.media_file.size / 1024 / 1024).toFixed(2)} MB | Тип: {editFiles.media_file.type}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Поддерживаемые форматы: JPG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, MP4, AVI, MOV, WebM, MKV и другие</p>
                  </div>

                  {/* Thumbnail File */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Screenshot</label>
                    {editingCreative.thumbnail_url && (
                      <div className="mb-3 relative">
                        <img
                          src={editingCreative.thumbnail_url}
                          alt="Current thumbnail"
                          className="w-full h-32 object-cover rounded border border-gray-700"
                        />
                        <button
                          onClick={() => deleteCreativeFile('thumbnail')}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.svg,.ico,.avif,.heic,.heif"
                      onChange={(e) => handleFileChange('thumbnail_file', e.target.files?.[0] || null)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {editFiles.thumbnail_file && (
                      <div className="mt-2">
                        <p className="text-sm text-green-400">✅ Новый файл: {editFiles.thumbnail_file.name}</p>
                        <p className="text-xs text-gray-500">Размер: {(editFiles.thumbnail_file.size / 1024 / 1024).toFixed(2)} MB | Тип: {editFiles.thumbnail_file.type}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Скриншот страницы. Форматы: JPG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC</p>
                  </div>

                  {/* Archive File - только ссылка на Supabase Storage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Archive (ZIP)</label>
                    {editingCreative.download_url ? (
                      <div className="mb-3 p-3 bg-gray-800 border border-gray-700 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">📦</span>
                            <span className="text-white text-sm">Archive available</span>
                          </div>
                          <button
                            onClick={() => deleteCreativeFile('download')}
                            className="bg-red-600 hover:bg-red-700 text-white p-1 rounded"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                        <a
                          href={editingCreative.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm underline flex items-center gap-1"
                        >
                          <span>Download from Supabase Storage</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <p className="text-xs text-gray-500 mt-2 break-all">{editingCreative.download_url}</p>
                      </div>
                    ) : (
                      <div className="mb-3 p-3 bg-gray-800 rounded border border-gray-700">
                        <p className="text-gray-400 text-sm">No archive available. Archives are uploaded directly to Supabase Storage.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-8 pt-6 border-t border-gray-700">
                <button
                  onClick={closeEditModal}
                  disabled={saving}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white py-3 px-4 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCreative}
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 px-4 rounded transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Settings Tab */}
      {activeTab === 'dashboard' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">⚙️ Настройка дашборда</h2>

            <div className="space-y-6">
              {/* Display Settings */}
              <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Настройки отображения</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Количество элементов на странице
                    </label>
                    <select
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue="20"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="30">30</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Количество креативов, отображаемых на одной странице</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Сортировка по умолчанию
                    </label>
                    <select
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue="newest"
                    >
                      <option value="newest">Сначала новые</option>
                      <option value="oldest">Сначала старые</option>
                      <option value="title_asc">По названию (А-Я)</option>
                      <option value="title_desc">По названию (Я-А)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="showThumbnails"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="showThumbnails" className="text-sm text-gray-300">
                      Показывать миниатюры изображений
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="showDescriptions"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="showDescriptions" className="text-sm text-gray-300">
                      Показывать описания креативов
                    </label>
                  </div>
                </div>
              </div>

              {/* Filter Visibility Settings */}
              <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Видимость фильтров</h3>
                <p className="text-sm text-gray-400 mb-4">Выберите, какие фильтры отображать в дашборде</p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="showDateFilter"
                        checked={dashboardFilterSettings.date}
                        disabled
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 opacity-50 cursor-not-allowed"
                      />
                      <label htmlFor="showDateFilter" className="text-sm font-medium text-white">
                        Date (Дата)
                      </label>
                    </div>
                    <span className="text-xs text-gray-400">Обязательный</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="showFormatFilter"
                        checked={dashboardFilterSettings.format}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        onChange={(e) => {
                          saveDashboardFilterSettings('format', e.target.checked)
                        }}
                      />
                      <label htmlFor="showFormatFilter" className="text-sm font-medium text-white">
                        Format (Формат)
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="showTypeFilter"
                        checked={dashboardFilterSettings.type}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        onChange={(e) => {
                          saveDashboardFilterSettings('type', e.target.checked)
                        }}
                      />
                      <label htmlFor="showTypeFilter" className="text-sm font-medium text-white">
                        Type (Тип)
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="showPlacementFilter"
                        checked={dashboardFilterSettings.placement}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        onChange={(e) => {
                          saveDashboardFilterSettings('placement', e.target.checked)
                        }}
                      />
                      <label htmlFor="showPlacementFilter" className="text-sm font-medium text-white">
                        Placement (Размещение)
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="showCountryFilter"
                        checked={dashboardFilterSettings.country}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        onChange={(e) => {
                          saveDashboardFilterSettings('country', e.target.checked)
                        }}
                      />
                      <label htmlFor="showCountryFilter" className="text-sm font-medium text-white">
                        Country (Страна)
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="showPlatformFilter"
                        checked={dashboardFilterSettings.platform}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        onChange={(e) => {
                          saveDashboardFilterSettings('platform', e.target.checked)
                        }}
                      />
                      <label htmlFor="showPlatformFilter" className="text-sm font-medium text-white">
                        Platform (Платформа)
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="showCloakingFilter"
                        checked={dashboardFilterSettings.cloaking}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        onChange={(e) => {
                          saveDashboardFilterSettings('cloaking', e.target.checked)
                        }}
                      />
                      <label htmlFor="showCloakingFilter" className="text-sm font-medium text-white">
                        Cloaking (Клоакинг)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter Settings */}
              <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Настройки фильтров</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Период по умолчанию
                    </label>
                    <select
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue="all"
                    >
                      <option value="all">Все время</option>
                      <option value="today">Сегодня</option>
                      <option value="week">Последние 7 дней</option>
                      <option value="month">Последние 30 дней</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Дополнительные настройки</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="enableAutoRefresh"
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="enableAutoRefresh" className="text-sm text-gray-300">
                      Автоматическое обновление данных
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Интервал автообновления (секунды)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      step="10"
                      defaultValue="60"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="enableNotifications"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="enableNotifications" className="text-sm text-gray-300">
                      Показывать уведомления о новых креативах
                    </label>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setActiveTab('list')}
                  className="btn btn-secondary"
                >
                  Отмена
                </button>
                <button
                  onClick={async () => {
                    try {
                      // Сохраняем все текущие настройки через API
                      const response = await fetch('/api/dashboard-settings', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          key: 'filters',
                          value: dashboardFilterSettings
                        })
                      })
                      
                      if (response.ok) {
                        alert('Настройки успешно сохранены! Изменения применятся на всех устройствах.')
                        window.dispatchEvent(new Event('dashboardSettingsChanged'))
                      } else {
                        throw new Error('Failed to save')
                      }
                    } catch (e) {
                      console.error('Error saving settings:', e)
                      alert('Ошибка при сохранении настроек. Попробуйте еще раз.')
                    }
                  }}
                  className="btn btn-primary"
                >
                  Сохранить настройки
                </button>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  )
}