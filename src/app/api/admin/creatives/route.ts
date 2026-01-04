import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getErrorMessage } from '@/lib/utils'

// CORS заголовки
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  const responseHeaders = new Headers({
    ...corsHeaders,
    'Content-Type': 'application/json; charset=utf-8'
  })
  
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Параметры пагинации
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = (page - 1) * limit
    
    // Фильтр по статусу (для админки)
    const status = searchParams.get('status') // 'all', 'draft', 'published'
    
    // Базовый запрос для админки (все креативы)
    let queryText = `
      SELECT 
        c.*,
        f.code as format_code, f.name as format_name,
        t.code as type_code, t.name as type_name,
        p.code as placement_code, p.name as placement_name,
        pl.code as platform_code, pl.name as platform_name,
        co.name as country_name
      FROM creatives c
      LEFT JOIN formats f ON c.format_id = f.id
      LEFT JOIN types t ON c.type_id = t.id
      LEFT JOIN placements p ON c.placement_id = p.id
      LEFT JOIN platforms pl ON c.platform_id = pl.id
      LEFT JOIN countries co ON c.country_code = co.code
      WHERE 1=1
    `

    const queryParams: any[] = []
    let paramIndex = 1

    // Фильтр по статусу
    if (status && status !== 'all') {
      queryText += ` AND c.status = $${paramIndex}`
      queryParams.push(status)
      paramIndex++
    }

    // Применяем фильтры
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const format = searchParams.get('format')
    const type = searchParams.get('type')
    const placement = searchParams.get('placement')
    const country = searchParams.get('country')
    const platform = searchParams.get('platform')
    const cloaking = searchParams.get('cloaking')

    if (dateFrom) {
      queryText += ` AND c.captured_at >= $${paramIndex}`
      queryParams.push(`${dateFrom}T00:00:00`)
      paramIndex++
    }

    if (dateTo) {
      queryText += ` AND c.captured_at <= $${paramIndex}`
      queryParams.push(`${dateTo}T23:59:59`)
      paramIndex++
    }

    if (format) {
      queryText += ` AND f.code = $${paramIndex}`
      queryParams.push(format)
      paramIndex++
    }

    if (type) {
      queryText += ` AND t.code = $${paramIndex}`
      queryParams.push(type)
      paramIndex++
    }

    if (placement) {
      queryText += ` AND p.code = $${paramIndex}`
      queryParams.push(placement)
      paramIndex++
    }

    if (country) {
      queryText += ` AND c.country_code = $${paramIndex}`
      queryParams.push(country)
      paramIndex++
    }

    if (platform) {
      queryText += ` AND pl.code = $${paramIndex}`
      queryParams.push(platform)
      paramIndex++
    }

    if (cloaking && cloaking !== '') {
      queryText += ` AND c.cloaking = $${paramIndex}`
      queryParams.push(cloaking === 'true')
      paramIndex++
    }

    // Сортировка и пагинация
    queryText += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(limit, offset)

    // Получаем данные
    const { rows: creatives } = await query(queryText, queryParams)

    // Получаем общее количество
    const countQuery = queryText.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM').split('ORDER BY')[0]
    const { rows: countRows } = await query(countQuery, queryParams.slice(0, -2))
    const total = parseInt(countRows[0]?.total || '0')

    // Форматируем результат для админки
    const formattedCreatives = creatives.map(creative => ({
      id: creative.id,
      title: creative.title,
      description: creative.description,
      captured_at: creative.captured_at,
      format_id: creative.format_id,
      type_id: creative.type_id,
      placement_id: creative.placement_id,
      platform_id: creative.platform_id,
      country_code: creative.country_code,
      cloaking: creative.cloaking,
      media_url: creative.media_url,
      thumbnail_url: creative.thumbnail_url,
      landing_url: creative.landing_url,
      download_url: creative.download_url,
      source_link: creative.source_link,
      source_device: creative.source_device,
      status: creative.status,
      moderated_at: creative.moderated_at,
      moderated_by: creative.moderated_by,
      created_at: creative.created_at,
      updated_at: creative.updated_at,
      // Relations для совместимости
      formats: creative.format_code ? { name: creative.format_name, code: creative.format_code } : null,
      types: creative.type_code ? { name: creative.type_name, code: creative.type_code } : null,
      placements: creative.placement_code ? { name: creative.placement_name, code: creative.placement_code } : null,
      platforms: creative.platform_code ? { name: creative.platform_name, code: creative.platform_code } : null,
      countries: creative.country_code ? { name: creative.country_name } : null,
    }))

    return NextResponse.json({ 
      success: true,
      creatives: formattedCreatives,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }, { headers: responseHeaders })
  } catch (error) {
    console.error('Admin API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: getErrorMessage(error) 
      }, 
      { 
        status: 500, 
        headers: responseHeaders
      }
    )
  }
}

