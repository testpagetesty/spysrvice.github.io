'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'

interface AdData {
  id: string
  title: string
  description: string
  image_url: string
  link_url: string
  cta_text: string
}

// Mock ad data - в реальном проекте это будет загружаться из админки
const mockAds: AdData[] = [
  {
    id: '1',
    title: 'Boost Your Ad Performance',
    description: 'Discover winning creatives with our advanced spy tools. Get insights into top-performing campaigns.',
    image_url: '/api/placeholder/400/200',
    link_url: '#',
    cta_text: 'Learn More'
  },
  {
    id: '2',
    title: 'Premium Analytics Dashboard',
    description: 'Track competitor strategies and optimize your campaigns with real-time data and insights.',
    image_url: '/api/placeholder/400/200',
    link_url: '#',
    cta_text: 'Get Started'
  },
  {
    id: '3',
    title: 'Creative Intelligence Platform',
    description: 'Stay ahead of the competition with our comprehensive creative monitoring and analysis tools.',
    image_url: '/api/placeholder/400/200',
    link_url: '#',
    cta_text: 'Try Now'
  }
]

interface AdBlockProps {
  position: number // Position in the grid to determine ad type
}

export default function AdBlock({ position }: AdBlockProps) {
  const [currentAd, setCurrentAd] = useState<AdData | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Rotate ads based on position and time
    const adIndex = position % mockAds.length
    setCurrentAd(mockAds[adIndex])
    
    // Simulate loading delay for more natural appearance
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [position])

  if (!currentAd || !isVisible) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 animate-pulse">
        <div className="aspect-video bg-gray-700 rounded mb-4"></div>
        <div className="h-4 bg-gray-700 rounded mb-2"></div>
        <div className="h-3 bg-gray-700 rounded mb-4"></div>
        <div className="h-8 bg-gray-700 rounded"></div>
      </div>
    )
  }

  const handleAdClick = () => {
    // Track ad click analytics here
    console.log('Ad clicked:', currentAd.id)
    if (currentAd.link_url !== '#') {
      window.open(currentAd.link_url, '_blank')
    }
  }

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-600 overflow-hidden group hover:border-blue-500 transition-all duration-300 cursor-pointer">
      {/* Sponsored Label */}
      <div className="bg-blue-600 text-white text-xs px-3 py-1 inline-block">
        Sponsored
      </div>
      
      <div className="p-6" onClick={handleAdClick}>
        {/* Ad Image */}
        <div className="aspect-video bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          <div className="text-white text-center z-10">
            <div className="w-12 h-12 mx-auto mb-2 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <ExternalLink className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">Premium Content</p>
          </div>
        </div>

        {/* Ad Content */}
        <div className="space-y-3">
          <h3 className="text-white font-semibold text-lg group-hover:text-blue-400 transition-colors">
            {currentAd.title}
          </h3>
          
          <p className="text-gray-300 text-sm leading-relaxed">
            {currentAd.description}
          </p>
          
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 group-hover:scale-105 transform transition-transform">
            <span>{currentAd.cta_text}</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtle animation effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-5 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-1000 pointer-events-none"></div>
    </div>
  )
}
