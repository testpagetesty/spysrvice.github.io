import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Обрабатываем CORS для API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Обрабатываем preflight запросы
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, User-Agent, Accept, Accept-Encoding, Cache-Control, Connection',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    // Добавляем CORS заголовки к ответу
    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, User-Agent, Accept, Accept-Encoding, Cache-Control, Connection')
    response.headers.set('Access-Control-Max-Age', '86400')
    
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}

