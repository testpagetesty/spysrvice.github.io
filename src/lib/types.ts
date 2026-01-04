// Types for our database (moved from supabase.ts)

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

