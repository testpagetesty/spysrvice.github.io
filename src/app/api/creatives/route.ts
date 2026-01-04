import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { uploadFile, getPublicUrl } from '@/lib/storage'
import { getErrorMessage } from '@/lib/utils'

// Для App Router лимиты настраиваются в next.config.js
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 секунд максимум
export const dynamic = 'force-dynamic' // Принудительная динамическая генерация

// CORS заголовки
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, User-Agent, Accept, Accept-Encoding, Cache-Control, Connection',
  'Access-Control-Max-Age': '86400', // 24 часа
}

// Обработка preflight запросов
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  // Сразу возвращаем CORS заголовки для предотвращения блокировки
  const responseHeaders = new Headers({
    ...corsHeaders,
    'Content-Type': 'application/json; charset=utf-8'
  })
  
  // Логируем входящий запрос для отладки
  console.log('=== POST /api/creatives ===')
  console.log('Headers:', Object.fromEntries(request.headers.entries()))
  console.log('Method:', request.method)
  console.log('URL:', request.url)
  
  try {
    // Проверяем размер запроса
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const sizeMB = parseInt(contentLength) / (1024 * 1024)
      console.log(`Request size: ${sizeMB.toFixed(2)} MB`)
    }

    // Парсим formData с обработкой ошибок
    let formData: FormData
    try {
      formData = await request.formData()
      console.log('FormData received, keys:', Array.from(formData.keys()))
    } catch (formDataError: any) {
      console.error('Error parsing formData:', formDataError)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to parse form data',
          details: formDataError?.message || 'Unknown error'
        },
        { 
          status: 400, 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8'
          }
        }
      )
    }
    
    // Извлекаем данные из формы
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const formatCode = formData.get('format') as string
    const typeCode = formData.get('type') as string
    const placementCode = formData.get('placement') as string
    const countryCode = formData.get('country') as string
    const platformCode = formData.get('platform') as string
    const cloaking = formData.get('cloaking') === 'true'
    const landingUrl = formData.get('landing_url') as string
    const sourceLink = formData.get('source_link') as string
    const sourceDevice = formData.get('source_device') as string
    const downloadUrl = formData.get('download_url') as string | null // URL файла из Supabase Storage (мобильное приложение загружает напрямую)
    
    // Файлы (для веб-интерфейса, мобильное приложение отправляет только URL)
    const mediaFile = formData.get('media_file') as File | null
    const thumbnailFile = formData.get('thumbnail_file') as File | null
    // zipFile больше не обрабатываем - все файлы страниц загружаются напрямую в Supabase Storage

    console.log('Received data:', {
      title, formatCode, typeCode, placementCode, countryCode, platformCode,
      hasMediaFile: !!mediaFile,
      hasThumbnailFile: !!thumbnailFile,
      hasDownloadUrl: !!downloadUrl,
      downloadUrl: downloadUrl
    })

    // Получаем ID справочников из PostgreSQL
    const [formatRes, typeRes, placementRes, platformRes] = await Promise.all([
      formatCode ? query('SELECT id FROM formats WHERE code = $1', [formatCode]) : Promise.resolve({ rows: [], rowCount: 0 }),
      typeCode ? query('SELECT id FROM types WHERE code = $1', [typeCode]) : Promise.resolve({ rows: [], rowCount: 0 }),
      placementCode ? query('SELECT id FROM placements WHERE code = $1', [placementCode]) : Promise.resolve({ rows: [], rowCount: 0 }),
      platformCode ? query('SELECT id FROM platforms WHERE code = $1', [platformCode]) : Promise.resolve({ rows: [], rowCount: 0 }),
    ])

    if (formatRes.rows.length === 0 || typeRes.rows.length === 0 || 
        placementRes.rows.length === 0 || platformRes.rows.length === 0) {
      console.error('Reference data errors: missing reference data')
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid reference data',
          details: {
            format: formatRes.rows.length === 0 ? 'Format not found' : null,
            type: typeRes.rows.length === 0 ? 'Type not found' : null,
            placement: placementRes.rows.length === 0 ? 'Placement not found' : null,
            platform: platformRes.rows.length === 0 ? 'Platform not found' : null
          }
        }, 
        { 
          status: 400, 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8'
          }
        }
      )
    }

    // Загружаем файлы в S3 Storage
    let mediaUrl = null
    let thumbnailUrl = null
    let finalDownloadUrl: string | null = null

    if (mediaFile) {
      console.log('Uploading media file:', {
        name: mediaFile.name,
        size: mediaFile.size,
        type: mediaFile.type
      })
      
      // Очищаем имя файла от специальных символов
      const sanitizedFileName = mediaFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const mediaFileName = `${Date.now()}-${sanitizedFileName}`
      
      // Определяем content-type на основе расширения файла
      let contentType = mediaFile.type
      if (!contentType) {
        const ext = mediaFile.name.toLowerCase().split('.').pop()
        const mimeTypes: Record<string, string> = {
          'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif',
          'webp': 'image/webp', 'bmp': 'image/bmp', 'tiff': 'image/tiff', 'svg': 'image/svg+xml',
          'ico': 'image/x-icon', 'avif': 'image/avif', 'heic': 'image/heic', 'heif': 'image/heif',
          'mp4': 'video/mp4', 'avi': 'video/x-msvideo', 'mov': 'video/quicktime', 'wmv': 'video/x-ms-wmv',
          'flv': 'video/x-flv', 'webm': 'video/webm', 'mkv': 'video/x-matroska', 'm4v': 'video/x-m4v',
          '3gp': 'video/3gpp', 'ogv': 'video/ogg', 'mpg': 'video/mpeg', 'mpeg': 'video/mpeg',
          'ts': 'video/mp2t', 'mts': 'video/mp2t', 'm2ts': 'video/mp2t'
        }
        contentType = mimeTypes[ext || ''] || 'application/octet-stream'
      }
      
      try {
        mediaUrl = await uploadFile(mediaFile, mediaFileName, contentType)
        console.log('Media uploaded successfully:', mediaUrl)
      } catch (mediaError) {
        console.error('Media upload error:', mediaError)
      }
    }

    if (thumbnailFile) {
      console.log('Uploading thumbnail file:', {
        name: thumbnailFile.name,
        size: thumbnailFile.size,
        type: thumbnailFile.type
      })
      
      // Очищаем имя файла от специальных символов
      const sanitizedFileName = thumbnailFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const thumbFileName = `thumbs/${Date.now()}-${sanitizedFileName}`
      
      // Определяем content-type для изображений
      let contentType = thumbnailFile.type
      if (!contentType) {
        const ext = thumbnailFile.name.toLowerCase().split('.').pop()
        const imageMimeTypes: Record<string, string> = {
          'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif',
          'webp': 'image/webp', 'bmp': 'image/bmp', 'tiff': 'image/tiff', 'svg': 'image/svg+xml',
          'ico': 'image/x-icon', 'avif': 'image/avif', 'heic': 'image/heic', 'heif': 'image/heif'
        }
        contentType = imageMimeTypes[ext || ''] || 'image/jpeg'
      }
      
      try {
        thumbnailUrl = await uploadFile(thumbnailFile, thumbFileName, contentType)
        console.log('Thumbnail uploaded successfully:', thumbnailUrl)
      } catch (thumbError) {
        console.error('Thumbnail upload error:', thumbError)
      }
    }

    // Файл архива страницы загружается напрямую в S3 Storage
    // Мобильное приложение отправляет только URL файла из S3 Storage
    if (downloadUrl) {
      console.log('✅ Using download URL from S3 Storage:', downloadUrl)
      console.log('✅ Download URL length:', downloadUrl.length)
      finalDownloadUrl = downloadUrl
    } else {
      console.warn('⚠️ No download URL provided - архив страницы должен быть загружен напрямую в S3 Storage')
      finalDownloadUrl = null
    }
    
    // КРИТИЧНО: Проверяем что downloadUrl валидный URL
    if (finalDownloadUrl) {
      try {
        new URL(finalDownloadUrl)
        console.log('✅ Download URL is valid')
      } catch (e) {
        console.error('❌ Download URL is not a valid URL:', finalDownloadUrl)
        finalDownloadUrl = null // Не сохраняем невалидный URL
      }
    }

    // Создаем запись в базе данных
    // Handle captured_at from form or use current time
    const capturedAt = formData.get('captured_at') as string
    let finalCapturedAt = new Date().toISOString()
    
    if (capturedAt) {
      try {
        const date = new Date(capturedAt)
        if (!isNaN(date.getTime())) {
          finalCapturedAt = date.toISOString()
        }
      } catch (e) {
        console.error('Error parsing captured_at:', e)
      }
    }

    // Создаем запись в PostgreSQL
    const insertResult = await query(
      `INSERT INTO creatives (
        title, description, format_id, type_id, placement_id, 
        country_code, platform_id, cloaking, media_url, thumbnail_url,
        landing_url, source_link, download_url, source_device,
        captured_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        title,
        description || null,
        formatRes.rows[0]?.id || null,
        typeRes.rows[0]?.id || null,
        placementRes.rows[0]?.id || null,
        countryCode || null,
        platformRes.rows[0]?.id || null,
        cloaking,
        mediaUrl,
        thumbnailUrl,
        landingUrl || null,
        sourceLink || null,
        finalDownloadUrl,
        sourceDevice || 'unknown',
        finalCapturedAt,
        'draft'
      ]
    )

    const creative = insertResult.rows[0]

    if (!creative) {
      console.error('❌ Creative is null after insert')
      return NextResponse.json(
        {
          success: false,
          error: 'Creative was not created',
          creative: null
        },
        { 
          status: 500,
          headers: responseHeaders
        }
      )
    }

    console.log('Creative created successfully:', {
      id: creative?.id,
      download_url: creative?.download_url,
      download_url_length: creative?.download_url?.length || 0,
      downloadUrlFromMobile: downloadUrl,
      finalDownloadUrl: finalDownloadUrl
    })
    
    // Убеждаемся что download_url сохранен
    if (!creative?.download_url && finalDownloadUrl) {
      console.warn('⚠️ WARNING: download_url не сохранен в базе, но был передан:', finalDownloadUrl)
    }

    // Убеждаемся что всегда возвращаем валидный JSON
    const responseData = { 
      success: true, 
      creative: creative || null,
      urls: { 
        mediaUrl: mediaUrl || null, 
        thumbnailUrl: thumbnailUrl || null, 
        downloadUrl: finalDownloadUrl || null
      },
      fileUploads: {
        media: !!mediaUrl,
        thumbnail: !!thumbnailUrl,
        archive: !!finalDownloadUrl
      }
    }
    
    console.log('Sending response:', JSON.stringify(responseData, null, 2))
    
    // Убеждаемся что creative существует и имеет download_url
    if (!creative) {
      console.error('❌ Creative is null after insert')
      return NextResponse.json(
        {
          success: false,
          error: 'Creative was not created',
          creative: null
        },
        { 
          status: 500,
          headers: responseHeaders
        }
      )
    }
    
    console.log('✅ Creative created successfully:', {
      id: creative.id,
      download_url: creative.download_url,
      download_url_length: creative.download_url?.length || 0
    })
    
    return NextResponse.json(responseData, { 
      status: 200,
      headers: responseHeaders
    })

  } catch (error: any) {
    console.error('API Error:', error)
    console.error('Error stack:', error?.stack)
    console.error('Error message:', error?.message)
    
    // ВСЕГДА возвращаем валидный JSON, даже при ошибке
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
        type: error?.name || 'Error'
      },
      { 
        status: 500, 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json; charset=utf-8'
        }
      }
    )
  }
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
    const limit = parseInt(searchParams.get('limit') || '30')
    const offset = (page - 1) * limit
    
    // Базовый запрос
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
      WHERE c.status = 'published'
    `

    const queryParams: any[] = []
    let paramIndex = 1

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
    queryText += ` ORDER BY c.captured_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(limit, offset)

    // Получаем данные
    const { rows: creatives } = await query(queryText, queryParams)

    // Получаем общее количество (для пагинации)
    const countQuery = queryText.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM').split('ORDER BY')[0]
    const { rows: countRows } = await query(countQuery, queryParams.slice(0, -2)) // Убираем LIMIT и OFFSET
    const total = parseInt(countRows[0]?.total || '0')

    // Форматируем результат
    const formattedCreatives = creatives.map(creative => ({
      id: creative.id,
      title: creative.title,
      description: creative.description,
      captured_at: creative.captured_at,
      format: creative.format_code ? { code: creative.format_code, name: creative.format_name } : null,
      type: creative.type_code ? { code: creative.type_code, name: creative.type_name } : null,
      placement: creative.placement_code ? { code: creative.placement_code, name: creative.placement_name } : null,
      platform: creative.platform_code ? { code: creative.platform_code, name: creative.platform_name } : null,
      country: creative.country_code ? { code: creative.country_code, name: creative.country_name } : null,
      cloaking: creative.cloaking,
      media_url: creative.media_url,
      thumbnail_url: creative.thumbnail_url,
      landing_url: creative.landing_url,
      download_url: creative.download_url,
      status: creative.status,
      created_at: creative.created_at,
      updated_at: creative.updated_at,
    }))

    return NextResponse.json({ 
      success: true,
      creatives: formattedCreatives,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }, { headers: responseHeaders })
  } catch (error) {
    console.error('API error:', error)
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