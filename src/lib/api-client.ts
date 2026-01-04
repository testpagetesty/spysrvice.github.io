// Клиентский API для работы с backend (замена Supabase клиента)

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export interface Creative {
  id: string
  title?: string
  description?: string
  captured_at: string
  format?: { code: string; name: string }
  type?: { code: string; name: string }
  placement?: { code: string; name: string }
  country?: { code: string; name: string }
  platform?: { code: string; name: string }
  cloaking?: boolean
  media_url?: string
  thumbnail_url?: string
  landing_url?: string
  download_url?: string
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
}

export interface Format {
  id: string
  code: string
  name: string
  created_at: string
}

export interface Type {
  id: string
  code: string
  name: string
  created_at: string
}

export interface Placement {
  id: string
  code: string
  name: string
  created_at: string
}

export interface Platform {
  id: string
  code: string
  name: string
  created_at: string
}

export interface Country {
  code: string
  name: string
  created_at: string
}

export interface Filters {
  dateFrom?: string
  dateTo?: string
  format?: string
  type?: string
  placement?: string
  country?: string
  platform?: string
  cloaking?: boolean | null
}

/**
 * Получение креативов с фильтрами
 */
export async function getCreatives(
  filters: Filters = {},
  page = 1,
  limit = 30
): Promise<{ creatives: Creative[]; total: number; page: number; totalPages: number }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.append('dateTo', filters.dateTo)
  if (filters.format) params.append('format', filters.format)
  if (filters.type) params.append('type', filters.type)
  if (filters.placement) params.append('placement', filters.placement)
  if (filters.country) params.append('country', filters.country)
  if (filters.platform) params.append('platform', filters.platform)
  if (filters.cloaking !== null && filters.cloaking !== undefined) {
    params.append('cloaking', filters.cloaking.toString())
  }

  const response = await fetch(`${API_URL}/api/creatives?${params.toString()}`)
  if (!response.ok) {
    throw new Error('Failed to fetch creatives')
  }

  return await response.json()
}

/**
 * Получение справочников
 */
export async function getFormats(): Promise<{ data: Format[] }> {
  const response = await fetch(`${API_URL}/api/references/formats`)
  if (!response.ok) throw new Error('Failed to fetch formats')
  return await response.json()
}

export async function getTypes(): Promise<{ data: Type[] }> {
  const response = await fetch(`${API_URL}/api/references/types`)
  if (!response.ok) throw new Error('Failed to fetch types')
  return await response.json()
}

export async function getPlacements(): Promise<{ data: Placement[] }> {
  const response = await fetch(`${API_URL}/api/references/placements`)
  if (!response.ok) throw new Error('Failed to fetch placements')
  return await response.json()
}

export async function getPlatforms(): Promise<{ data: Platform[] }> {
  const response = await fetch(`${API_URL}/api/references/platforms`)
  if (!response.ok) throw new Error('Failed to fetch platforms')
  return await response.json()
}

export async function getCountries(): Promise<{ data: Country[] }> {
  const response = await fetch(`${API_URL}/api/references/countries`)
  if (!response.ok) throw new Error('Failed to fetch countries')
  return await response.json()
}

export async function getCountriesWithCounts(): Promise<Array<Country & { count: number }>> {
  const response = await fetch(`${API_URL}/api/references/countries?withCounts=true`)
  if (!response.ok) throw new Error('Failed to fetch countries with counts')
  const result = await response.json()
  return result.data || []
}

