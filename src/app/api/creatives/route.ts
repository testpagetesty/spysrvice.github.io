import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getErrorMessage } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const formData = await request.formData()
    
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
    
    // Файлы
    const mediaFile = formData.get('media_file') as File | null
    const thumbnailFile = formData.get('thumbnail_file') as File | null
    const zipFile = formData.get('zip_file') as File | null

    console.log('Received data:', {
      title, formatCode, typeCode, placementCode, countryCode, platformCode,
      hasMediaFile: !!mediaFile,
      hasThumbnailFile: !!thumbnailFile,
      hasZipFile: !!zipFile,
      zipFileName: zipFile?.name,
      zipFileSize: zipFile?.size
    })

    // Получаем ID справочников
    const countryPromise = countryCode
      ? supabase.from('countries').select('id, code').eq('code', countryCode).single()
      : Promise.resolve({ data: null, error: null })

    const [formatRes, typeRes, placementRes, platformRes, countryRes] = await Promise.all([
      supabase.from('formats').select('id').eq('code', formatCode).single(),
      supabase.from('types').select('id').eq('code', typeCode).single(),
      supabase.from('placements').select('id').eq('code', placementCode).single(),
      supabase.from('platforms').select('id').eq('code', platformCode).single(),
      countryPromise
    ])

    if (
      formatRes.error ||
      typeRes.error ||
      placementRes.error ||
      platformRes.error ||
      countryRes?.error
    ) {
      console.error('Reference data errors:', {
        format: formatRes.error,
        type: typeRes.error,
        placement: placementRes.error,
        platform: platformRes.error,
        country: countryRes?.error
      })
      return NextResponse.json({ error: 'Invalid reference data' }, { status: 400 })
    }

    // Загружаем файлы в Storage
    let mediaUrl = null
    let thumbnailUrl = null
    let downloadUrl = null

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

    if (zipFile) {
      console.log('Uploading ZIP file:', {
        name: zipFile.name,
        size: zipFile.size,
        type: zipFile.type
      })
      
      // Очищаем имя файла от специальных символов
      const sanitizedFileName = zipFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const zipFileName = `archives/${Date.now()}-${sanitizedFileName}`
      console.log('ZIP file path:', zipFileName)
      
      try {
        const { data: zipData, error: zipError } = await supabase.storage
          .from('creatives-media')
          .upload(zipFileName, zipFile, {
            contentType: zipFile.type || 'application/zip',
            upsert: false,
            cacheControl: '3600'
          })
        
        if (zipError) {
          console.error('Zip upload error:', zipError)
          console.error('Error details:', JSON.stringify(zipError, null, 2))
          // Не блокируем создание креатива, если ZIP не загрузился
          // downloadUrl останется null
        } else {
          console.log('ZIP uploaded successfully:', zipData)
          const { data: urlData } = supabase.storage.from('creatives-media').getPublicUrl(zipFileName)
          downloadUrl = urlData.publicUrl
          console.log('ZIP download URL:', downloadUrl)
        }
      } catch (uploadError) {
        console.error('Exception during ZIP upload:', uploadError)
        // Не блокируем создание креатива
      }
    } else {
      console.log('No ZIP file provided')
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
      country_id: countryRes?.data?.id ?? null,
      country_code: countryRes?.data?.code ?? countryCode ?? null,
      platform_id: platformRes.data.id,
      cloaking,
      media_url: mediaUrl,
      thumbnail_url: thumbnailUrl,
      landing_url: landingUrl,
      source_link: sourceLink,
      download_url: downloadUrl,
      source_device: sourceDevice || 'unknown',
      captured_at: finalCapturedAt,
      status: 'draft' // Новые креативы создаются как черновики
    }

    console.log('Inserting creative with data:', {
      title,
      download_url: downloadUrl,
      media_url: mediaUrl,
      thumbnail_url: thumbnailUrl,
      hasDownloadUrl: !!downloadUrl
    })

    const { data: creative, error: insertError } = await supabase
      .from('creatives')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      console.error('Insert error details:', JSON.stringify(insertError, null, 2))
      return NextResponse.json({ 
        error: 'Failed to create creative', 
        details: insertError.message 
      }, { status: 500 })
    }

    console.log('Creative created successfully:', {
      id: creative?.id,
      download_url: creative?.download_url
    })

    return NextResponse.json({ 
      success: true, 
      creative,
      urls: { 
        mediaUrl, 
        thumbnailUrl, 
        downloadUrl 
      },
      fileUploads: {
        media: !!mediaUrl,
        thumbnail: !!thumbnailUrl,
        zip: !!downloadUrl
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    return NextResponse.json({ 
      message: 'Creative API endpoint',
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}