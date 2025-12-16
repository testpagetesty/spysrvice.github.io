import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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
    // Проверяем размер запроса (Vercel лимит ~4.5MB для body)
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const sizeMB = parseInt(contentLength) / (1024 * 1024)
      console.log(`Request size: ${sizeMB.toFixed(2)} MB`)
      if (sizeMB > 4.5) {
        console.warn(`⚠️ Request size (${sizeMB.toFixed(2)} MB) exceeds Vercel limit (4.5 MB)`)
        // Не блокируем, но предупреждаем
      }
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials')
      return NextResponse.json(
        { 
          success: false,
          error: 'Server configuration error' 
        },
        { 
          status: 500, 
          headers: responseHeaders
        }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    // Получаем ID справочников
    const [formatRes, typeRes, placementRes, platformRes] = await Promise.all([
      supabase.from('formats').select('id').eq('code', formatCode).single(),
      supabase.from('types').select('id').eq('code', typeCode).single(),
      supabase.from('placements').select('id').eq('code', placementCode).single(),
      supabase.from('platforms').select('id').eq('code', platformCode).single()
    ])

    if (formatRes.error || typeRes.error || placementRes.error || platformRes.error) {
      console.error('Reference data errors:', {
        format: formatRes.error,
        type: typeRes.error,
        placement: placementRes.error,
        platform: platformRes.error
      })
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid reference data',
          details: {
            format: formatRes.error?.message,
            type: typeRes.error?.message,
            placement: placementRes.error?.message,
            platform: platformRes.error?.message
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

    // Загружаем файлы в Storage
    let mediaUrl = null
    let thumbnailUrl = null
    let finalDownloadUrl: string | null = null // Используем другое имя чтобы не конфликтовать с параметром

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
      
      const { data: mediaData, error: mediaError } = await supabase.storage
        .from('creatives-media')
        .upload(mediaFileName, mediaFile, {
          contentType,
          cacheControl: '3600',
          upsert: false
        })
      
      if (mediaError) {
        console.error('Media upload error:', mediaError)
      } else {
        console.log('Media uploaded successfully:', mediaData)
        const { data } = supabase.storage.from('creatives-media').getPublicUrl(mediaFileName)
        mediaUrl = data.publicUrl
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
      
      const { data: thumbData, error: thumbError } = await supabase.storage
        .from('creatives-media')
        .upload(thumbFileName, thumbnailFile, {
          contentType,
          cacheControl: '3600',
          upsert: false
        })
      
      if (thumbError) {
        console.error('Thumbnail upload error:', thumbError)
      } else {
        console.log('Thumbnail uploaded successfully:', thumbData)
        const { data } = supabase.storage.from('creatives-media').getPublicUrl(thumbFileName)
        thumbnailUrl = data.publicUrl
      }
    }

    // Файл архива страницы всегда загружается напрямую в Supabase Storage
    // Мобильное приложение отправляет только URL файла из Supabase Storage
    if (downloadUrl) {
      console.log('✅ Using download URL from Supabase Storage:', downloadUrl)
      console.log('✅ Download URL length:', downloadUrl.length)
      finalDownloadUrl = downloadUrl
    } else {
      console.warn('⚠️ No download URL provided - архив страницы должен быть загружен напрямую в Supabase Storage')
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

    const insertData = {
      title,
      description,
      format_id: formatRes.data.id,
      type_id: typeRes.data.id,
      placement_id: placementRes.data.id,
      country_code: countryCode,
      platform_id: platformRes.data.id,
      cloaking,
      media_url: mediaUrl,
      thumbnail_url: thumbnailUrl,
      landing_url: landingUrl,
      source_link: sourceLink,
      download_url: finalDownloadUrl,
      source_device: sourceDevice || 'unknown',
      captured_at: finalCapturedAt,
      status: 'draft' // Новые креативы создаются как черновики
    }

    console.log('📝 Inserting creative with data:', {
      title,
      landing_url: landingUrl,
      download_url: finalDownloadUrl,
      download_url_length: finalDownloadUrl?.length || 0,
      media_url: mediaUrl,
      thumbnail_url: thumbnailUrl,
      hasDownloadUrl: !!finalDownloadUrl,
      formatCode,
      typeCode,
      platformCode
    })
    
    console.log('📝 Full insertData:', JSON.stringify(insertData, null, 2))

    const { data: creative, error: insertError } = await supabase
      .from('creatives')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Insert error:', insertError)
      console.error('❌ Insert error details:', JSON.stringify(insertError, null, 2))
      console.error('❌ Insert data that failed:', JSON.stringify(insertData, null, 2))
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to create creative', 
          details: insertError.message,
          code: insertError.code || 'UNKNOWN',
          hint: insertError.hint || null
        }, 
        { 
          status: 500, 
          headers: responseHeaders
        }
      )
    }
    
    // КРИТИЧНО: Проверяем что creative был создан
    if (!creative) {
      console.error('❌ Creative is null after insert (no error returned)')
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        message: 'Supabase not configured',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey
      }, { headers: responseHeaders })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const searchParams = request.nextUrl.searchParams
    
    // Параметры пагинации
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const offset = (page - 1) * limit
    
    // Создаем запрос
    let query = supabase
      .from('creatives')
      .select(`
        *,
        formats(name, code),
        types(name, code),
        placements(name, code),
        countries(name),
        platforms(name, code)
      `, { count: 'exact' })
      .eq('status', 'published')
      .order('captured_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
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
      query = query.gte('captured_at', `${dateFrom}T00:00:00`)
    }
    if (dateTo) {
      query = query.lte('captured_at', `${dateTo}T23:59:59`)
    }
    if (format) {
      query = query.eq('formats.code', format)
    }
    if (type) {
      query = query.eq('types.code', type)
    }
    if (placement) {
      query = query.eq('placements.code', placement)
    }
    if (country) {
      query = query.eq('country_code', country)
    }
    if (platform) {
      query = query.eq('platforms.code', platform)
    }
    if (cloaking && cloaking !== '') {
      query = query.eq('cloaking', cloaking === 'true')
    }
    
    const { data, error, count } = await query
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ 
        success: false,
        error: error.message 
      }, { 
        status: 500, 
        headers: responseHeaders 
      })
    }
    
    return NextResponse.json({ 
      success: true,
      creatives: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
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