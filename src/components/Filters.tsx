'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { 
  getFormats, 
  getTypes, 
  getPlacements, 
  getPlatforms, 
  getCountriesWithCounts,
  type Format,
  type Type,
  type Placement,
  type Platform,
  type Country,
  type Filters as FilterType
} from '@/lib/supabase'

interface FiltersProps {
  onFiltersChange: (filters: FilterType) => void
}

interface CountryWithCount extends Country {
  count: number
}

export default function Filters({ onFiltersChange }: FiltersProps) {
  const [filters, setFilters] = useState<FilterType>({})
  const [formats, setFormats] = useState<Format[]>([])
  const [types, setTypes] = useState<Type[]>([])
  const [placements, setPlacements] = useState<Placement[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [countries, setCountries] = useState<CountryWithCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFilterData()
  }, [])

  const loadFilterData = async () => {
    try {
      const [formatsRes, typesRes, placementsRes, platformsRes, countriesRes] = await Promise.all([
        getFormats(),
        getTypes(),
        getPlacements(),
        getPlatforms(),
        getCountriesWithCounts()
      ])

      if (formatsRes.data) setFormats(formatsRes.data)
      if (typesRes.data) setTypes(typesRes.data)
      if (placementsRes.data) setPlacements(placementsRes.data)
      if (platformsRes.data) setPlatforms(platformsRes.data)
      if (countriesRes) setCountries(countriesRes)
    } catch (error) {
      console.error('Error loading filter data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof FilterType, value: any) => {
    const newFilters = { ...filters, [key]: value === 'all' ? undefined : value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const applyFilters = () => {
    onFiltersChange(filters)
  }

  if (loading) {
    return (
      <div className="bg-gray-900 border-b border-gray-800 p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border-b border-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* First row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
            <input
              type="date"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => handleFilterChange('date', e.target.value)}
            />
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Format</label>
            <div className="relative">
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => handleFilterChange('format', e.target.value)}
              >
                <option value="all">All</option>
                {formats.map((format) => (
                  <option key={format.id} value={format.code}>
                    {format.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
            <div className="relative">
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <option value="all">All</option>
                {types.map((type) => (
                  <option key={type.id} value={type.code}>
                    {type.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Placements */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Placements</label>
            <div className="relative">
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => handleFilterChange('placement', e.target.value)}
              >
                <option value="all">All</option>
                {placements.map((placement) => (
                  <option key={placement.id} value={placement.code}>
                    {placement.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Second row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
            <div className="relative">
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => handleFilterChange('country', e.target.value)}
              >
                <option value="all">All</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name} [{country.count}]
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Platform</label>
            <div className="relative">
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => handleFilterChange('platform', e.target.value)}
              >
                <option value="all">All</option>
                {platforms.map((platform) => (
                  <option key={platform.id} value={platform.code}>
                    {platform.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Cloaking */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Cloaking</label>
            <div className="relative">
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => handleFilterChange('cloaking', e.target.value === 'true' ? true : e.target.value === 'false' ? false : null)}
              >
                <option value="all">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Apply Button */}
          <div className="flex items-end">
            <button
              onClick={applyFilters}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
