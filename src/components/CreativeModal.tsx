'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Download, ExternalLink, Play } from 'lucide-react'
import { type CreativeWithRelations } from '@/lib/supabase'
import { formatDateTime, getMediaUrl } from '@/lib/utils'

interface CreativeModalProps {
  creative: CreativeWithRelations | null
  isOpen: boolean
  onClose: () => void
}

export default function CreativeModal({ creative, isOpen, onClose }: CreativeModalProps) {
  const [imageError, setImageError] = useState(false)

  if (!isOpen || !creative) return null

  const mediaUrl = getMediaUrl(creative.media_url)
  const isVideo = creative.formats?.code === 'video'

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">
            {creative.title || 'Creative Details'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Left Column - Information */}
          <div className="lg:w-1/2 p-6 border-r border-gray-800">
            <div className="space-y-6">
              {/* Information Section */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Title</span>
                    <span className="text-white text-right max-w-xs">
                      {creative.title || '-'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Format</span>
                    <span className="text-white">{creative.formats?.name || '-'}</span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Type</span>
                    <span className="text-white">{creative.types?.name || '-'}</span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Placement</span>
                    <span className="text-white">{creative.placements?.name || '-'}</span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Country</span>
                    <span className="text-white">{creative.countries?.name || '-'}</span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Platform</span>
                    <span className="text-white">{creative.platforms?.name || '-'}</span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Cloaking</span>
                    <span className={`font-medium ${creative.cloaking ? 'text-red-400' : 'text-green-400'}`}>
                      {creative.cloaking ? 'Yes' : 'No'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Captured</span>
                    <span className="text-white">{formatDateTime(creative.captured_at)}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {creative.description && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Description</h3>
                  <p className="text-gray-300 leading-relaxed">
                    {creative.description}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {creative.download_url && (
                  <a
                    href={creative.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Archive
                  </a>
                )}
                
                {creative.source_link && (
                  <button
                    onClick={() => window.open(creative.source_link, '_blank')}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Link
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Media */}
          <div className="lg:w-1/2 p-6">
            <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
              {!imageError && mediaUrl ? (
                <>
                  <Image
                    src={mediaUrl}
                    alt={creative.title || 'Creative'}
                    fill
                    className="object-contain"
                    onError={() => setImageError(true)}
                    sizes="50vw"
                  />
                  
                  {/* Video Play Button */}
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                      <button 
                        className="bg-black bg-opacity-70 rounded-full p-4 hover:scale-110 transition-transform"
                        onClick={() => mediaUrl && window.open(mediaUrl, '_blank')}
                      >
                        <Play className="w-8 h-8 text-white fill-white" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-lg flex items-center justify-center">
                      {isVideo ? (
                        <Play className="w-8 h-8" />
                      ) : (
                        <ExternalLink className="w-8 h-8" />
                      )}
                    </div>
                    <p>No media available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Media Info */}
            <div className="mt-4 text-sm text-gray-400">
              <p>Click the image to view in full size</p>
              {isVideo && <p>This is a video creative</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
