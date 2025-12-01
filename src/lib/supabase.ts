import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface Creative {
  id: string
  title?: string
  description?: string
  captured_at: string
  format_id?: string
  type_id?: string
  placement_id?: string
  country_code?: string
  platform_id?: string
  cloaking?: boolean
  media_url?: string
  thumbnail_url?: string
  landing_url?: string
  source_link?: string
  download_url?: string
  source_device?: string
  project_id?: string
  status: 'draft' | 'published'
  moderated_at?: string
  moderated_by?: string
  created_at: string
  updated_at: string
  
  // Relations
  formats?: Format
  types?: Type
  placements?: Placement
  countries?: Country
  platforms?: Platform
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

export interface CreativeWithRelations extends Creative {
  formats: Format
  types: Type
  placements: Placement
  countries: Country
  platforms: Platform
}

// Filter types
export interface Filters {
  date?: string
  format?: string
  type?: string
  placement?: string
  country?: string
  platform?: string
  cloaking?: boolean | null
}

// API functions
export const getCreatives = async (filters: Filters = {}, page = 1, limit = 30) => {
  let query = supabase
    .from('creatives')
    .select(`
      *,
      formats(code, name),
      types(code, name),
      placements(code, name),
      countries(code, name),
      platforms(code, name)
    `)
    .eq('status', 'published') // Показываем только опубликованные креативы
    .order('captured_at', { ascending: false })

  // Apply filters
  if (filters.date) {
    query = query.gte('captured_at', filters.date)
  }
  if (filters.format) {
    query = query.eq('formats.code', filters.format)
  }
  if (filters.type) {
    query = query.eq('types.code', filters.type)
  }
  if (filters.placement) {
    query = query.eq('placements.code', filters.placement)
  }
  if (filters.country) {
    query = query.eq('country_code', filters.country)
  }
  if (filters.platform) {
    query = query.eq('platforms.code', filters.platform)
  }
  if (filters.cloaking !== null && filters.cloaking !== undefined) {
    query = query.eq('cloaking', filters.cloaking)
  }

  // Pagination
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  return query
}

export const getFormats = () => supabase.from('formats').select('*').order('name')
export const getTypes = () => supabase.from('types').select('*').order('name')
export const getPlacements = () => supabase.from('placements').select('*').order('name')
export const getPlatforms = () => supabase.from('platforms').select('*').order('name')
export const getCountries = () => supabase.from('countries').select('*').order('name')

// Get countries with creative counts
export const getCountriesWithCounts = async () => {
  const { data, error } = await supabase
    .from('countries')
    .select(`
      code,
      name,
      created_at,
      creatives(count)
    `)
    .order('name')

  if (error) throw error
  
  return data?.map(country => ({
    code: country.code,
    name: country.name,
    created_at: country.created_at,
    count: country.creatives?.[0]?.count || 0
  })) || []
}

// Функция для админки - получение креативов по статусу
export const getCreativesByStatus = async (status: 'draft' | 'published' | 'all' = 'all', filters: Filters = {}, page = 1, limit = 30) => {
  let query = supabase
    .from('creatives')
    .select(`
      *,
      formats(code, name),
      types(code, name),
      placements(code, name),
      countries(code, name),
      platforms(code, name)
    `)

  // Фильтр по статусу
  if (status !== 'all') {
    query = query.eq('status', status)
  }

  query = query.order('created_at', { ascending: false })

  // Apply filters
  if (filters.date) {
    query = query.gte('captured_at', filters.date)
  }
  
  if (filters.format) {
    query = query.eq('formats.code', filters.format)
  }
  
  if (filters.type) {
    query = query.eq('types.code', filters.type)
  }
  
  if (filters.placement) {
    query = query.eq('placements.code', filters.placement)
  }
  
  if (filters.country) {
    query = query.eq('country_code', filters.country)
  }
  
  if (filters.platform) {
    query = query.eq('platforms.code', filters.platform)
  }
  
  if (filters.cloaking !== null && filters.cloaking !== undefined) {
    query = query.eq('cloaking', filters.cloaking)
  }

  // Pagination
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  const { data, error, count } = await query
    .range(from, to)
    .limit(limit)

  return { data, error, count }
}
