'use client'

import { useState, useEffect, useRef } from 'react'

// Простые иконки
const SearchIcon = () => <span>🔍</span>
const TrendingUpIcon = () => <span>📈</span>
const UsersIcon = () => <span>👥</span>
const EyeIcon = () => <span>👁️</span>
const CalendarIcon = () => <span>📅</span>
const ChevronDownIcon = () => <span>▼</span>

// Типы данных
interface Creative {
  id: string
  title?: string
  description?: string
  captured_at: string
  cloaking?: boolean
  media_url?: string
  thumbnail_url?: string
  download_url?: string
  source_link?: string
  landing_url?: string
  source_device?: string
  formats?: { name: string; code?: string }
  types?: { name: string; code?: string }
  placements?: { name: string; code?: string }
  countries?: { name: string; code?: string }
  platforms?: { name: string; code?: string }
  country_code?: string
}

interface FilterOption {
  id: string
  code: string
  name: string
}

type DateInputWithPicker = HTMLInputElement & {
  showPicker?: () => void
}

const ALLOWED_FORMAT_CODES = ['teaser', 'video']
const ALLOWED_TYPE_CODES = ['crypt', 'gambling', 'nutra', 'news', 'product', 'nutra_vsl']
const ALLOWED_PLACEMENT_CODES = ['demand_gen', 'uac']
const ALLOWED_PLATFORM_CODES = ['web', 'google_play', 'youtube']

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const [creatives, setCreatives] = useState<Creative[]>([])
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
    cloaking: ''
  })
  
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const [modalAdSettings, setModalAdSettings] = useState<any | null>(null)
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showFullScreenshot, setShowFullScreenshot] = useState(false)
  const dateDropdownRef = useRef<HTMLDivElement>(null)

  const dateFromRef = useRef<DateInputWithPicker | null>(null)
  const dateToRef = useRef<DateInputWithPicker | null>(null)

  const openDatePicker = (ref: React.RefObject<DateInputWithPicker>) => {
    const input = ref.current
    input?.showPicker?.()
  }

  // Предустановленные периоды
  const datePresets = [
    { label: 'Today', value: () => {
      const today = new Date().toISOString().split('T')[0]
      return { dateFrom: today, dateTo: today }
    }},
    { label: 'Yesterday', value: () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const date = yesterday.toISOString().split('T')[0]
      return { dateFrom: date, dateTo: date }
    }},
    { label: 'Last 7 Days', value: () => {
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return { dateFrom: weekAgo.toISOString().split('T')[0], dateTo: today }
    }},
    { label: 'Last 30 Days', value: () => {
      const today = new Date().toISOString().split('T')[0]
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      return { dateFrom: monthAgo.toISOString().split('T')[0], dateTo: today }
    }},
    { label: 'This Month', value: () => {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]
      return { dateFrom: firstDay, dateTo: today }
    }},
    { label: 'Last Month', value: () => {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
      return { dateFrom: firstDay, dateTo: lastDay }
    }}
  ]

  const getDateRangeLabel = () => {
    if (!filters.dateFrom && !filters.dateTo) return 'Select a date'
    if (filters.dateFrom === filters.dateTo) return new Date(filters.dateFrom).toLocaleDateString()
    if (filters.dateFrom && filters.dateTo) {
      return `${new Date(filters.dateFrom).toLocaleDateString()} - ${new Date(filters.dateTo).toLocaleDateString()}`
    }
    if (filters.dateFrom) return `From ${new Date(filters.dateFrom).toLocaleDateString()}`
    if (filters.dateTo) return `Until ${new Date(filters.dateTo).toLocaleDateString()}`
    return 'Select a date'
  }

  const selectDatePreset = (preset: any) => {
    const dates = preset.value()
    setFilters({...filters, dateFrom: dates.dateFrom, dateTo: dates.dateTo})
    setShowDateDropdown(false)
  }

  const openModal = async (creative: Creative) => {
    setSelectedCreative(creative)
    setShowModal(true)
    
    // Загружаем настройки рекламы для модального окна
    try {
      const response = await fetch('/api/ads?position=modal')
      if (response.ok) {
        const data = await response.json()
        setModalAdSettings(data.setting || null)
      }
    } catch (error) {
      console.error('Failed to load ad settings:', error)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedCreative(null)
    setShowFullScreenshot(false)
    setModalAdSettings(null)
  }

  const filterByCloaking = (cloakingValue: boolean | null) => {
    const newFilters = {...filters, cloaking: cloakingValue === null ? '' : cloakingValue ? 'true' : 'false'}
    setFilters(newFilters)
    closeModal()
    setTimeout(() => {
      applyFilters()
    }, 100)
  }

  const filterByFormat = (formatCode: string) => {
    const newFilters = {...filters, format: formatCode}
    setFilters(newFilters)
    closeModal()
    setTimeout(() => {
      applyFilters()
    }, 100)
  }

  const filterByType = (typeCode: string) => {
    const newFilters = {...filters, type: typeCode}
    setFilters(newFilters)
    closeModal()
    setTimeout(() => {
      applyFilters()
    }, 100)
  }

  const filterByPlacement = (placementCode: string) => {
    const newFilters = {...filters, placement: placementCode}
    setFilters(newFilters)
    closeModal()
    setTimeout(() => {
      applyFilters()
    }, 100)
  }

  const filterByCountry = (countryCode: string) => {
    const newFilters = {...filters, country: countryCode}
    setFilters(newFilters)
    closeModal()
    setTimeout(() => {
      applyFilters()
    }, 100)
  }

  const filterByPlatform = (platformCode: string) => {
    const newFilters = {...filters, platform: platformCode}
    setFilters(newFilters)
    closeModal()
    setTimeout(() => {
      applyFilters()
    }, 100)
  }

  // Закрытие дропдауна при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Закрытие модалки по Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showFullScreenshot) {
          setShowFullScreenshot(false)
        } else if (showModal) {
          closeModal()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showModal, showFullScreenshot])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        console.log('Supabase not configured, using demo data')
        loadDemoData()
        return
      }

      // Загружаем справочники
      const [formatsRes, typesRes, placementsRes, platformsRes, countriesRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/formats`, { headers: { apikey: supabaseKey } }),
        fetch(`${supabaseUrl}/rest/v1/types`, { headers: { apikey: supabaseKey } }),
        fetch(`${supabaseUrl}/rest/v1/placements`, { headers: { apikey: supabaseKey } }),
        fetch(`${supabaseUrl}/rest/v1/platforms`, { headers: { apikey: supabaseKey } }),
        fetch(`${supabaseUrl}/rest/v1/countries`, { headers: { apikey: supabaseKey } })
      ])

      if (formatsRes.ok) {
        const data = (await formatsRes.json()) as FilterOption[]
        setFormats(data.filter(item => ALLOWED_FORMAT_CODES.includes(item.code)))
      }
      if (typesRes.ok) {
        const data = (await typesRes.json()) as FilterOption[]
        setTypes(data.filter(item => ALLOWED_TYPE_CODES.includes(item.code)))
      }
      if (placementsRes.ok) {
        const data = (await placementsRes.json()) as FilterOption[]
        setPlacements(data.filter(item => ALLOWED_PLACEMENT_CODES.includes(item.code)))
      }
      if (platformsRes.ok) {
        const data = (await platformsRes.json()) as FilterOption[]
        setPlatforms(data.filter(item => ALLOWED_PLATFORM_CODES.includes(item.code)))
      }
      if (countriesRes.ok) setCountries(await countriesRes.json())

      // Загружаем креативы (только опубликованные)
      const creativesRes = await fetch(`${supabaseUrl}/rest/v1/creatives?select=*,formats(name,code),types(name,code),placements(name,code),countries(name),platforms(name,code)&status=eq.published&limit=30&order=captured_at.desc`, {
        headers: { apikey: supabaseKey }
      })
      
      if (creativesRes.ok) {
        const data = await creativesRes.json()
        console.log('Loaded creatives from Supabase:', data)
        // Убираем фильтрацию на этапе загрузки, чтобы увидеть все данные
        setCreatives(data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      loadDemoData()
    } finally {
      setLoading(false)
    }
  }

  const loadDemoData = () => {
    // Демо справочники
    setFormats([
      { id: '1', code: 'teaser', name: 'Teaser' },
      { id: '2', code: 'video', name: 'Video' }
    ])
    setTypes([
      { id: '1', code: 'crypt', name: 'Crypt' },
      { id: '2', code: 'gambling', name: 'Gambling' },
      { id: '3', code: 'nutra', name: 'Nutra' },
      { id: '4', code: 'news', name: 'News' },
      { id: '5', code: 'product', name: 'Product' },
      { id: '6', code: 'nutra_vsl', name: 'Nutra (VSL)' }
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
      { id: 'DE', code: 'DE', name: 'Germany' },
      { id: 'ES', code: 'ES', name: 'Spain' },
      { id: 'AR', code: 'AR', name: 'Argentina' }
    ])
    
    // Демо креативы
    setCreatives([
      {
        id: '1',
        title: 'AHORA OFICIALMENTE EN LÍNEA',
        description: 'BONO DE BIENVENIDA DE 150.000 + 50 GIROS GRATIS',
        captured_at: '2024-11-10',
        cloaking: true,
        formats: { name: 'Teaser' },
        types: { name: 'Gambling' },
        placements: { name: 'Demand Gen' },
        countries: { name: 'Argentina' },
        platforms: { name: 'Google Search' }
      }
    ])
    setLoading(false)
  }

  const applyFilters = async () => {
    setLoading(true)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        // Фильтрация демо-данных
        let filtered = [
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
            source_link: 'https://f5spy.com/viewer/4480/view'
          }
        ]
        
        // Простая фильтрация для демо - используем UTC
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom + 'T00:00:00Z')
          const creativeDate = new Date(filtered[0]?.captured_at)
          if (creativeDate < fromDate) filtered = []
        }
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo + 'T23:59:59Z')
          const creativeDate = new Date(filtered[0]?.captured_at)
          if (creativeDate > toDate) filtered = []
        }
        if (filters.format && filters.format !== 'teaser') filtered = []
        if (filters.type && filters.type !== 'crypt') filtered = []
        if (filters.placement && filters.placement !== 'demand_gen') filtered = []
        if (filters.country && filters.country !== 'AR') filtered = []
        if (filters.platform && filters.platform !== 'web') filtered = []
        if (filters.cloaking) {
          const cloakingFilter = filters.cloaking === 'true'
          if (filtered[0]?.cloaking !== cloakingFilter) filtered = []
        }
        
        console.log('Demo filters applied:', filters)
        console.log('Demo creative date:', filtered[0]?.captured_at)
        console.log('Demo filtered results:', filtered)
        setCreatives(filtered)
        setLoading(false)
        return
      }

      // Строим URL с фильтрами для Supabase (только опубликованные)
      let url = `${supabaseUrl}/rest/v1/creatives?select=*,formats(name,code),types(name,code),placements(name,code),countries(name),platforms(name,code)&status=eq.published&order=captured_at.desc`
      
      // Фильтрация по датам - используем UTC для корректной работы с часовыми поясами
      if (filters.dateFrom && filters.dateTo) {
        // Диапазон дат в UTC
        const fromDateTime = `${filters.dateFrom}T00:00:00Z`
        const toDateTime = `${filters.dateTo}T23:59:59Z`
        url += `&and=(captured_at.gte.${fromDateTime},captured_at.lte.${toDateTime})`
      } else if (filters.dateFrom) {
        url += `&captured_at=gte.${filters.dateFrom}T00:00:00Z`
      } else if (filters.dateTo) {
        url += `&captured_at=lte.${filters.dateTo}T23:59:59Z`
      }
      
      const params = new URLSearchParams()
      if (filters.country) {
        params.append('country_code', `eq.${filters.country}`)
      }
      if (filters.cloaking) {
        params.append('cloaking', `eq.${filters.cloaking === 'true'}`)
      }
      
      // Для связанных таблиц нужно получить ID сначала
      let formatId = null
      let typeId = null
      let placementId = null
      let platformId = null
      
      // Получаем ID для фильтров
      if (filters.format) {
        const formatResponse = await fetch(`${supabaseUrl}/rest/v1/formats?code=eq.${filters.format}&select=id`, {
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        })
        const formatData = await formatResponse.json()
        if (formatData && formatData.length > 0) {
          formatId = formatData[0].id
          params.append('format_id', `eq.${formatId}`)
        }
      }
      
      if (filters.type) {
        const typeResponse = await fetch(`${supabaseUrl}/rest/v1/types?code=eq.${filters.type}&select=id`, {
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        })
        const typeData = await typeResponse.json()
        if (typeData && typeData.length > 0) {
          typeId = typeData[0].id
          params.append('type_id', `eq.${typeId}`)
        }
      }
      
      if (filters.placement) {
        const placementResponse = await fetch(`${supabaseUrl}/rest/v1/placements?code=eq.${filters.placement}&select=id`, {
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        })
        const placementData = await placementResponse.json()
        if (placementData && placementData.length > 0) {
          placementId = placementData[0].id
          params.append('placement_id', `eq.${placementId}`)
        }
      }
      
      if (filters.platform) {
        const platformResponse = await fetch(`${supabaseUrl}/rest/v1/platforms?code=eq.${filters.platform}&select=id`, {
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        })
        const platformData = await platformResponse.json()
        if (platformData && platformData.length > 0) {
          platformId = platformData[0].id
          params.append('platform_id', `eq.${platformId}`)
        }
      }
      
      if (params.toString()) {
        url += '&' + params.toString()
      }
      
      url += '&limit=30'

      console.log('Filter URL:', url)
      console.log('Applied filters:', filters)
      console.log('Date range:', {
        from: filters.dateFrom ? `${filters.dateFrom}T00:00:00` : null,
        to: filters.dateTo ? `${filters.dateTo}T23:59:59` : null
      })

      const response = await fetch(url, {
        headers: { apikey: supabaseKey }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Filtered creatives:', data)
        setCreatives(data)
      }
    } catch (error) {
      console.error('Error applying filters:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-white">Spy Service</h1>
              </div>
              
            </div>

            <div className="flex items-center space-x-4">
              
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Sign in
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-gray-900 border-b border-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Professional Date Picker */}
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
                  {/* Quick Presets */}
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

                  {/* Custom Date Range */}
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
                        placeholder="From"
                      />
                      <input
                        ref={dateToRef}
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                        onFocus={() => openDatePicker(dateToRef)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="To"
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

            <div></div>

            {/* Apply Button */}
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
                    cloaking: ''
                  })
                  loadData()
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Reset
              </button>
              <button 
                onClick={applyFilters}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
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
          /* Real Creatives */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {creatives.map((creative, i) => (
              <div 
                key={creative.id} 
                className="bg-gray-800 rounded-lg border border-gray-700 cursor-pointer hover:border-gray-600 transition-colors"
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
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
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
                </div>
              </div>
            ))}
            
            {/* Simple Ad Block every 6 items */}
            {creatives.length > 6 && (
              <div className="bg-gray-800 rounded-lg border border-blue-500">
                <div className="bg-blue-600 text-white text-xs px-3 py-1">
                  Sponsored
                </div>
                
                <div className="p-4">
                  <div className="aspect-video bg-blue-600 rounded mb-4 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="text-2xl mb-2">🚀</div>
                      <p className="text-sm">Premium Tools</p>
                    </div>
                  </div>

                  <h3 className="text-white font-medium mb-2">
                    Boost Your Campaigns
                  </h3>
                  
                  <p className="text-gray-300 text-sm mb-3">
                    Advanced spy tools for better results.
                  </p>
                  
                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded">
                    Learn More
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-center items-center space-x-4 mt-12">
          <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
            Previous
          </button>
          
          <span className="text-gray-400">
            Page 1 of 34
          </span>
          
          <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
            Next
          </button>
        </div>
      </main>

      {/* Modal */}
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
              <div className="flex items-center gap-3">
                {selectedCreative.download_url && (
                  <a
                    href={selectedCreative.download_url}
                    download
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    <span>📥</span>
                    <span>Download zip</span>
                  </a>
                )}
                {selectedCreative.source_link && (
                  <a
                    href={selectedCreative.source_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    <span>🔗</span>
                    <span>Link</span>
                  </a>
                )}
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white text-2xl font-bold ml-2"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Information */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Information</h3>
                  
                  {/* Title */}
                  <div className="mb-4 pb-4 border-b border-gray-700">
                    <div className="text-sm text-gray-400 mb-1">Title</div>
                    <div className="text-base text-white font-medium">
                      {selectedCreative.title || '-'}
                    </div>
                  </div>

                  {/* Description */}
                  {selectedCreative.description && (
                    <div className="mb-4 pb-4 border-b border-gray-700">
                      <div className="text-sm text-gray-400 mb-1">Description</div>
                      <div className="text-base text-gray-300">
                        {selectedCreative.description}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-sm text-gray-400">Format:</span>
                      {selectedCreative.formats?.code ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            filterByFormat(selectedCreative.formats!.code)
                          }}
                          className="text-sm text-white underline font-medium hover:opacity-80 transition-opacity"
                        >
                          {selectedCreative.formats?.name || '-'}
                        </button>
                      ) : (
                        <span className="text-sm text-white underline font-medium">-</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-sm text-gray-400">Type:</span>
                      {selectedCreative.types?.code ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            filterByType(selectedCreative.types!.code)
                          }}
                          className="text-sm text-white underline font-medium hover:opacity-80 transition-opacity"
                        >
                          {selectedCreative.types?.name || '-'}
                        </button>
                      ) : (
                        <span className="text-sm text-white underline font-medium">-</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-sm text-gray-400">Placement:</span>
                      {selectedCreative.placements?.code ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            filterByPlacement(selectedCreative.placements!.code)
                          }}
                          className="text-sm text-white underline font-medium hover:opacity-80 transition-opacity"
                        >
                          {selectedCreative.placements?.name || '-'}
                        </button>
                      ) : (
                        <span className="text-sm text-white underline font-medium">-</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-sm text-gray-400">Country:</span>
                      {selectedCreative.country_code ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            filterByCountry(selectedCreative.country_code!)
                          }}
                          className="text-sm text-white underline font-medium hover:opacity-80 transition-opacity"
                        >
                          {selectedCreative.countries?.name || '-'}
                        </button>
                      ) : (
                        <span className="text-sm text-white underline font-medium">-</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-sm text-gray-400">Platform:</span>
                      {selectedCreative.platforms?.code ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            filterByPlatform(selectedCreative.platforms!.code)
                          }}
                          className="text-sm text-white underline font-medium hover:opacity-80 transition-opacity"
                        >
                          {selectedCreative.platforms?.name || '-'}
                        </button>
                      ) : (
                        <span className="text-sm text-white underline font-medium">-</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-sm text-gray-400">Cloaking:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          filterByCloaking(selectedCreative.cloaking || false)
                        }}
                        className={`text-sm font-medium underline hover:opacity-80 transition-opacity ${
                          selectedCreative.cloaking ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {selectedCreative.cloaking ? 'Yes' : 'No'}
                      </button>
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

              {/* Ad Block - Full Width */}
              {modalAdSettings && modalAdSettings.enabled && (
                <div 
                  className="mt-6 bg-gray-800 border border-gray-700 rounded-lg p-4"
                  style={{
                    width: modalAdSettings.width || '100%',
                    height: modalAdSettings.height || 'auto'
                  }}
                >
                  {modalAdSettings.type === 'code' && modalAdSettings.content && (
                    <div 
                      dangerouslySetInnerHTML={{ __html: modalAdSettings.content }}
                      className="text-center"
                    />
                  )}
                  {modalAdSettings.type === 'html' && modalAdSettings.content && (
                    <div 
                      dangerouslySetInnerHTML={{ __html: modalAdSettings.content }}
                    />
                  )}
                  {modalAdSettings.type === 'image' && modalAdSettings.image_url && (
                    <a
                      href={modalAdSettings.link_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={modalAdSettings.image_url}
                        alt={modalAdSettings.title || 'Advertisement'}
                        className="w-full h-auto rounded"
                      />
                    </a>
                  )}
                  {!modalAdSettings.type && (
                    <div className="text-center text-gray-400 text-sm">
                      Здесь может быть твоя реклама
                    </div>
                  )}
                </div>
              )}

              {/* Screenshot Thumbnail - Full Width */}
              {selectedCreative.thumbnail_url && (
                <div className="mt-4 w-full">
                  <div className="text-sm text-gray-400 mb-2 text-center">Screen page</div>
                  <div 
                    className="relative overflow-hidden rounded-lg border border-gray-700 cursor-pointer group w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('Screenshot clicked, opening full view')
                      setShowFullScreenshot(true)
                    }}
                  >
                    <img
                      src={selectedCreative.thumbnail_url}
                      alt="Screenshot"
                      className="w-full object-cover transition-opacity group-hover:opacity-90 pointer-events-none"
                      style={{ maxHeight: '200px', objectPosition: 'top' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-900/80 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <span className="text-xs text-white">Click to view full size</span>
                    </div>
                  </div>
                </div>
              )}
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
            onClick={() => {
              console.log('Closing full screenshot')
              setShowFullScreenshot(false)
            }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  console.log('Close button clicked')
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
            onClick={() => {
              console.log('Closing full screenshot')
              setShowFullScreenshot(false)
            }}
          >
            <div className="max-w-6xl mx-auto h-full flex flex-col">
              <div className="flex justify-end mb-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log('Close button clicked')
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
    </div>
  )
}