'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Play, ExternalLink, Download } from 'lucide-react'
import { type CreativeWithRelations } from '@/lib/supabase'
import { formatDate, getMediaUrl, truncateText } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface CreativeCardProps {
  creative: CreativeWithRelations
  onClick: () => void
}

export default function CreativeCard({ creative, onClick }: CreativeCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const mediaUrl = getMediaUrl(creative.media_url)
  const thumbnailUrl = getMediaUrl(creative.thumbnail_url) || mediaUrl
  const isVideo = creative.formats?.code === 'video'

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setIsLoading(false)
  }

  return (
    <div 
      className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 card-hover cursor-pointer group"
      onClick={onClick}
    >
      {/* Media Preview */}
      <div className="relative aspect-video bg-gray-900">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {!imageError && thumbnailUrl ? (
          <>
            <Image
              src={thumbnailUrl}
              alt={creative.title || 'Creative'}
              fill
              className={cn(
                "object-cover transition-opacity duration-300",
                isLoading ? "opacity-0" : "opacity-100"
              )}
              onLoad={handleImageLoad}
              onError={handleImageError}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
            
            {/* Video Play Button */}
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-50 transition-all">
                <div className="bg-black bg-opacity-70 rounded-full p-3 group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 text-white fill-white" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center text-gray-400">
              <div className="w-12 h-12 mx-auto mb-2 bg-gray-700 rounded flex items-center justify-center">
                {isVideo ? (
                  <Play className="w-6 h-6" />
                ) : (
                  <ExternalLink className="w-6 h-6" />
                )}
              </div>
              <p className="text-sm">No Preview</p>
            </div>
          </div>
        )}

        {/* Date Badge */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          {formatDate(creative.captured_at)}
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
        {/* Title */}
        <h3 className="text-white font-medium mb-2 line-clamp-2">
          {creative.title ? truncateText(creative.title, 60) : '-'}
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
            <span>Country:</span>
            <span className="text-gray-300">{creative.countries?.name || '-'}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Platform:</span>
            <span className="text-gray-300">{creative.platforms?.name || '-'}</span>
          </div>
        </div>

        {/* Description Preview */}
        {creative.description && (
          <p className="text-gray-400 text-sm mt-3 line-clamp-2">
            {truncateText(creative.description, 100)}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
          {creative.download_url && (
            <button 
              className="btn btn-secondary btn-sm flex-1"
              onClick={(e) => {
                e.stopPropagation()
                window.open(creative.download_url, '_blank')
              }}
            >
              Download
            </button>
          )}
          
          {creative.source_link && (
            <button 
              className="btn btn-primary btn-sm flex-1"
              onClick={(e) => {
                e.stopPropagation()
                window.open(creative.source_link, '_blank')
              }}
            >
              Link
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
