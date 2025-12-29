'use client'

import { useState, useEffect, useRef } from 'react'
import ReactCountryFlag from 'react-country-flag'

// Простые иконки
const SearchIcon = () => <span>🔍</span>
const TrendingUpIcon = () => <span>📈</span>
const UsersIcon = () => <span>👥</span>
const EyeIcon = () => <span>👁️</span>
const CalendarIcon = () => <span>📅</span>
const ChevronDownIcon = () => <span>▼</span>

// Copy icon - classic double document icon
const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

// Component to render country flag
const CountryFlag = ({ countryCode }: { countryCode?: string | null }) => {
  if (!countryCode || countryCode.length !== 2) return null
  return (
    <ReactCountryFlag
      countryCode={countryCode.toUpperCase()}
      svg
      style={{
        width: '1.2em',
        height: '1.2em',
      }}
      title={countryCode}
    />
  )
}

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
const ALLOWED_PLATFORM_CODES = ['web', 'google_play', 'youtube', 'discovery']

export default function HomePage() {
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
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 30
  
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const [modalAdSettings, setModalAdSettings] = useState<any | null>(null)
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showFullScreenshot, setShowFullScreenshot] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 })
  const [cropEnd, setCropEnd] = useState({ x: 0, y: 0 })
  const [isCropping, setIsCropping] = useState(false)
  
  // Состояния для анимаций модалок
  const [modalAnimating, setModalAnimating] = useState(false)
  const [modalRender, setModalRender] = useState(false)
  const [fullScreenshotAnimating, setFullScreenshotAnimating] = useState(false)
  const [fullScreenshotRender, setFullScreenshotRender] = useState(false)
  const [cropModalAnimating, setCropModalAnimating] = useState(false)
  const [cropModalRender, setCropModalRender] = useState(false)
  const [cropImageRef, setCropImageRef] = useState<HTMLImageElement | null>(null)
  const dateDropdownRef = useRef<HTMLDivElement>(null)

  // Блокируем скролл страницы когда открыта модалка
  useEffect(() => {
    if (showModal || showFullScreenshot || showCropModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    // Cleanup: восстанавливаем скролл при размонтировании
    return () => {
      document.body.style.overflow = ''
    }
  }, [showModal, showFullScreenshot, showCropModal])

  // Анимация основной модалки
  useEffect(() => {
    if (showModal && selectedCreative) {
      setModalRender(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setModalAnimating(true)
        })
      })
    } else if (!showModal) {
      setModalAnimating(false)
      const timer = setTimeout(() => setModalRender(false), 200)
      return () => clearTimeout(timer)
    }
  }, [showModal, selectedCreative])

  // Анимация модалки полного скриншота
  useEffect(() => {
    if (showFullScreenshot) {
      setFullScreenshotRender(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFullScreenshotAnimating(true)
        })
      })
    } else {
      setFullScreenshotAnimating(false)
      const timer = setTimeout(() => setFullScreenshotRender(false), 200)
      return () => clearTimeout(timer)
    }
  }, [showFullScreenshot])

  // Анимация модалки обрезки
  useEffect(() => {
    if (showCropModal && cropImage) {
      setCropModalRender(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setCropModalAnimating(true)
        })
      })
    } else if (!showCropModal) {
      setCropModalAnimating(false)
      const timer = setTimeout(() => setCropModalRender(false), 200)
      return () => clearTimeout(timer)
    }
  }, [showCropModal, cropImage])

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
    setCopiedField(null)
  }

  const copyToClipboard = async (text: string, fieldName: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Скачать тизер
  const downloadTeaser = async (imageUrl: string) => {
    try {
      // Загружаем изображение
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })

      // Создаем canvas и рисуем изображение
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('Не удалось получить контекст canvas')
      }
      
      ctx.drawImage(img, 0, 0)

      // Конвертируем в PNG blob
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Ошибка при конвертации изображения в PNG')
          return
        }
        
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `teaser_${selectedCreative?.id || Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }, 'image/png')
    } catch (error) {
      console.error('Failed to download teaser:', error)
      alert('Ошибка при скачивании тизера')
    }
  }

  // Открыть модальное окно для обрезания
  const openCropModal = (imageUrl: string) => {
    setCropImage(imageUrl)
    setShowCropModal(true)
    setCropStart({ x: 0, y: 0 })
    setCropEnd({ x: 0, y: 0 })
    setIsCropping(false)
  }

  // Закрыть модальное окно обрезания
  const closeCropModal = () => {
    setShowCropModal(false)
    setCropImage(null)
    setCropStart({ x: 0, y: 0 })
    setCropEnd({ x: 0, y: 0 })
    setIsCropping(false)
    setCropImageRef(null)
    isMouseDownRef.current = false
  }

  const cropImageContainerRef = useRef<HTMLDivElement>(null)
  const isMouseDownRef = useRef(false)

  // Начать обрезание
  const startCrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cropImageContainerRef.current) return
    e.preventDefault()
    e.stopPropagation()
    isMouseDownRef.current = true
    const rect = cropImageContainerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setCropStart({ x, y })
    setCropEnd({ x, y })
    setIsCropping(true)
  }

  // Обновить область обрезания
  const updateCrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDownRef.current || !cropImageContainerRef.current) return
    e.preventDefault()
    e.stopPropagation()
    const rect = cropImageContainerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    setCropEnd({ x, y })
    setIsCropping(true)
  }

  // Завершить обрезание
  const endCrop = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    isMouseDownRef.current = false
    setIsCropping(false)
  }

  // Обработчик мыши вне контейнера (для глобального отслеживания)
  useEffect(() => {
    if (!showCropModal) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current || !cropImageContainerRef.current) return
      
      const rect = cropImageContainerRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
      const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
      setCropEnd({ x, y })
    }

    const handleMouseUp = () => {
      isMouseDownRef.current = false
      setIsCropping(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [showCropModal])

  // Применить обрезание и скачать
  const applyCropAndDownload = () => {
    if (!cropImageRef || !cropImageContainerRef.current) return

    const containerRect = cropImageContainerRef.current.getBoundingClientRect()
    const img = cropImageRef
    
    // Вычислить координаты области обрезания
    const x = Math.min(cropStart.x, cropEnd.x)
    const y = Math.min(cropStart.y, cropEnd.y)
    const width = Math.abs(cropEnd.x - cropStart.x)
    const height = Math.abs(cropEnd.y - cropStart.y)

    if (width === 0 || height === 0) {
      alert('Выберите область для обрезания')
      return
    }

    // Найти элемент изображения для получения его реальных размеров
    const imgElement = cropImageContainerRef.current.querySelector('img') as HTMLImageElement
    if (!imgElement) return

    // Вычислить масштаб между отображаемым размером и реальным размером изображения
    const displayedWidth = imgElement.offsetWidth
    const displayedHeight = imgElement.offsetHeight
    const scaleX = img.naturalWidth / displayedWidth
    const scaleY = img.naturalHeight / displayedHeight

    // Создать новый canvas для обрезанного изображения
    const croppedCanvas = document.createElement('canvas')
    croppedCanvas.width = width * scaleX
    croppedCanvas.height = height * scaleY
    const ctx = croppedCanvas.getContext('2d')
    if (!ctx) return

    // Нарисовать обрезанную область
    ctx.drawImage(
      img,
      x * scaleX,
      y * scaleY,
      width * scaleX,
      height * scaleY,
      0,
      0,
      width * scaleX,
      height * scaleY
    )

    // Конвертировать в blob и скачать
    croppedCanvas.toBlob((blob) => {
      if (!blob) {
        alert('Ошибка при создании обрезанного изображения')
        return
      }
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `teaser_cropped_${selectedCreative?.id || Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      closeCropModal()
    }, 'image/png')
  }

  // Загрузить изображение для обрезания
  useEffect(() => {
    if (showCropModal && cropImage) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        setCropImageRef(img)
      }
      img.onerror = () => {
        alert('Ошибка загрузки изображения')
        closeCropModal()
      }
      img.src = cropImage
    }
  }, [showCropModal, cropImage])

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
        if (showCropModal) {
          closeCropModal()
        } else if (showFullScreenshot) {
          setShowFullScreenshot(false)
        } else if (showModal) {
          closeModal()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showModal, showFullScreenshot, showCropModal])

  useEffect(() => {
    loadData()
  }, [])
  
  // Функция для перехода на страницу
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      loadDataWithFilters(page)
    }
  }
  
  // Функция для загрузки данных с фильтрами
  const loadDataWithFilters = async (page = 1) => {
    setLoading(true)
    try {
      // Создаем URL с параметрами фильтрации и пагинации
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', itemsPerPage.toString())
      
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)
      if (filters.format) params.set('format', filters.format)
      if (filters.type) params.set('type', filters.type)
      if (filters.placement) params.set('placement', filters.placement)
      if (filters.country) params.set('country', filters.country)
      if (filters.platform) params.set('platform', filters.platform)
      if (filters.cloaking) params.set('cloaking', filters.cloaking)

      // Load creatives with pagination
      const creativesResponse = await fetch(`/api/creatives?${params.toString()}`)
      if (creativesResponse.ok) {
        const creativesData = await creativesResponse.json()
        if (creativesData.success) {
          setCreatives(creativesData.creatives || [])
          setTotalCount(creativesData.total || 0)
          setTotalPages(creativesData.totalPages || 1)
          setCurrentPage(page)
        } else {
          // Fallback для демо-данных
          setCreatives(creativesData.creatives || [])
          setTotalCount(1)
          setTotalPages(1)
          setCurrentPage(1)
        }
      }
    } catch (error) {
      console.error('Error loading data with filters:', error)
    }
    setLoading(false)
  }

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
        // Показываем все платформы из базы данных без фильтрации
        setPlatforms(data)
      }
      if (countriesRes.ok) setCountries(await countriesRes.json())

      // Загружаем креативы через API с пагинацией
      await loadDataWithFilters(1)
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
    // Сбрасываем на первую страницу при применении фильтров
    setCurrentPage(1)
    await loadDataWithFilters(1)
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Title and Buttons Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 border-b border-gray-800 gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Spy Service</h1>
          
            {/* Buttons - Mobile: centered, PC: right aligned */}
            <div className="flex items-center justify-center sm:justify-end space-x-2 sm:space-x-4">
              <button
                onClick={toggleTheme}
                className="btn btn-ghost"
                title={isLightTheme ? 'Switch to dark theme' : 'Switch to light theme'}
              >
                {isLightTheme ? 'Dark' : 'Light'}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-ghost"
                title="Refresh page"
              >
                Refresh
              </button>
              <button className="btn btn-primary">
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
                        className="btn btn-primary btn-sm"
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
                  loadDataWithFilters(1)
                }}
                className="btn btn-secondary flex-1"
              >
                Reset
              </button>
              <button 
                onClick={() => {
                  setCurrentPage(1)
                  applyFilters()
                }}
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
                      <span className="text-gray-300 flex items-center gap-1.5">
                        <CountryFlag countryCode={creative.country_code || creative.countries?.code} />
                        {creative.countries?.name || '-'}
                      </span>
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
          <button 
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <span className="text-gray-400">
            Page {currentPage} of {totalPages} ({totalCount} total)
          </span>
          
          <button 
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </main>

      {/* Modal */}
      {modalRender && selectedCreative && (
        <div 
          className={`fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${
            modalAnimating ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeModal}
        >
          <div 
            className={`bg-gray-900 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-800/50 transition-all duration-200 ${
              modalAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
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
                  onClick={closeModal}
                  className="btn-ghost btn-sm rounded-full p-2 ml-2"
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
                  download
                  className="btn btn-primary btn-full"
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
                  className="btn"
                  style={{ backgroundColor: '#16a34a', color: 'white' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
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
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column - Information */}
                <div className="lg:col-span-7">
                  <h3 className="text-lg font-semibold text-white mb-4">Information</h3>
                  
                  {/* Title */}
                  <div className="mb-4 pb-4 border-b border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm text-gray-400">Title</div>
                      {selectedCreative.title && (
                        <button
                          onClick={() => copyToClipboard(selectedCreative.title!, 'title')}
                          className="btn btn-ghost btn-sm p-1.5 rounded"
                          title="Копировать заголовок"
                        >
                          {copiedField === 'title' ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      )}
                    </div>
                    <div className="text-base text-white font-medium break-words">
                      {selectedCreative.title || '-'}
                    </div>
                  </div>

                  {/* Description */}
                  {selectedCreative.description && (
                    <div className="mb-4 pb-4 border-b border-gray-700">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm text-gray-400">Description</div>
                        <button
                          onClick={() => copyToClipboard(selectedCreative.description!, 'description')}
                          className="btn btn-ghost btn-sm p-1.5 rounded"
                          title="Копировать описание"
                        >
                          {copiedField === 'description' ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      </div>
                      <div className="text-base text-gray-300 break-words">
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
                            const code = selectedCreative.formats?.code
                            if (!code) return
                            filterByFormat(code)
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
                            const code = selectedCreative.types?.code
                            if (!code) return
                            filterByType(code)
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
                            const code = selectedCreative.placements?.code
                            if (!code) return
                            filterByPlacement(code)
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
                          className="text-sm text-white underline font-medium hover:opacity-80 transition-opacity flex items-center gap-1.5"
                        >
                          <CountryFlag countryCode={selectedCreative.country_code || selectedCreative.countries?.code} />
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
                            const code = selectedCreative.platforms?.code
                            if (!code) return
                            filterByPlatform(code)
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
                <div className="lg:col-span-5">
                  {selectedCreative.media_url ? (
                    <div className="w-full max-w-lg mx-auto">
                      <div className="relative group">
                        <img
                          src={selectedCreative.media_url}
                          alt={selectedCreative.title || 'Creative'}
                          className="w-full h-auto max-h-[500px] object-contain rounded-lg border border-gray-700 shadow-sm transition-opacity duration-300"
                        />
                        {/* Dark Overlay on Hover */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity duration-300 rounded-lg pointer-events-none"></div>
                        {/* Action Buttons - Centered */}
                        <div className="absolute inset-0 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              downloadTeaser(selectedCreative.media_url!)
                            }}
                            className="no-theme-invert bg-white hover:bg-gray-100 p-4 rounded-lg transition-all flex items-center justify-center shadow-lg pointer-events-auto transform hover:scale-110"
                            title="Скачать тизер"
                          >
                            <img
                              src="/free-icon-download-arrow-81500.png"
                              alt="Download"
                              className="w-8 h-8"
                            />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openCropModal(selectedCreative.media_url!)
                            }}
                            className="no-theme-invert bg-white hover:bg-gray-100 p-4 rounded-lg transition-all flex items-center justify-center shadow-lg pointer-events-auto transform hover:scale-110"
                            title="Обрезать тизер"
                          >
                            <img
                              src="/free-icon-resize-6297749.png"
                              alt="Crop"
                              className="w-8 h-8"
                            />
                          </button>
                        </div>
                      </div>
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
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {cropModalRender && cropImage && (
        <div
          className={`fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 no-select transition-opacity duration-200 ${
            cropModalAnimating ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeCropModal}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            className={`bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto no-select shadow-2xl border border-gray-800/50 transition-all duration-200 ${
              cropModalAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">Обрезать тизер</h2>
              <button
                onClick={closeCropModal}
                className="text-gray-400 hover:text-white text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Image with Crop Overlay */}
            <div className="p-6 flex flex-col items-center">
              <div className="mb-4 text-sm text-gray-400 text-center">
                Выберите область для обрезания, зажав левую кнопку мыши и перетаскивая
              </div>
              <div
                ref={cropImageContainerRef}
                className="relative border border-gray-700 rounded-lg overflow-hidden cursor-crosshair inline-block no-select"
                style={{ maxWidth: '100%' }}
                onMouseDown={startCrop}
                onMouseMove={updateCrop}
                onMouseUp={endCrop}
                onContextMenu={(e) => e.preventDefault()}
              >
                {cropImage && (
                  <>
                    <img
                      src={cropImage}
                      alt="Crop preview"
                      className="max-w-full max-h-[70vh] w-auto h-auto block"
                      style={{ display: 'block' }}
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                    />
                    {/* Crop Overlay */}
                    {(cropStart.x !== cropEnd.x || cropStart.y !== cropEnd.y) && cropImageContainerRef.current && (
                      <>
                        {/* Затемнение вне области через SVG mask для четкого отображения */}
                        <svg
                          className="absolute inset-0 pointer-events-none"
                          style={{ width: '100%', height: '100%' }}
                        >
                          <defs>
                            <mask id={`cropMask-${selectedCreative?.id || 'default'}`}>
                              <rect width="100%" height="100%" fill="white" />
                              <rect
                                x={Math.min(cropStart.x, cropEnd.x)}
                                y={Math.min(cropStart.y, cropEnd.y)}
                                width={Math.abs(cropEnd.x - cropStart.x)}
                                height={Math.abs(cropEnd.y - cropStart.y)}
                                fill="black"
                              />
                            </mask>
                          </defs>
                          <rect
                            width="100%"
                            height="100%"
                            fill="rgba(0, 0, 0, 0.6)"
                            mask={`url(#cropMask-${selectedCreative?.id || 'default'})`}
                          />
                        </svg>
                        {/* Рамка выбора */}
                        <div
                          className="absolute border-2 border-blue-500 pointer-events-none z-10 bg-transparent"
                          style={{
                            left: `${Math.min(cropStart.x, cropEnd.x)}px`,
                            top: `${Math.min(cropStart.y, cropEnd.y)}px`,
                            width: `${Math.abs(cropEnd.x - cropStart.x)}px`,
                            height: `${Math.abs(cropEnd.y - cropStart.y)}px`,
                          }}
                        >
                          {/* Углы */}
                          <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-blue-500 bg-transparent" style={{ borderWidth: '3px 0 0 3px' }} />
                          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-blue-500 bg-transparent" style={{ borderWidth: '3px 3px 0 0' }} />
                          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-blue-500 bg-transparent" style={{ borderWidth: '0 0 3px 3px' }} />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-blue-500 bg-transparent" style={{ borderWidth: '0 3px 3px 0' }} />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={closeCropModal}
                  className="btn btn-secondary"
                >
                  Отмена
                </button>
                <button
                  onClick={applyCropAndDownload}
                  className="btn btn-primary"
                >
                  Скачать обрезанное изображение
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Screenshot Modal */}
      {fullScreenshotRender && selectedCreative?.thumbnail_url && (
        <>
          {/* Mobile: Full screen */}
          <div 
            className={`fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[100] p-2 sm:hidden transition-opacity duration-200 ${
              fullScreenshotAnimating ? 'opacity-100' : 'opacity-0'
            }`}
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
            className={`hidden sm:block fixed inset-0 bg-black/60 backdrop-blur-md z-[100] p-4 transition-opacity duration-200 ${
              fullScreenshotAnimating ? 'opacity-100' : 'opacity-0'
            }`}
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