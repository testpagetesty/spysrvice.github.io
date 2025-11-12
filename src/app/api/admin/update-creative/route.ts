import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getErrorMessage } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase не настроен на сервере' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const formData = await request.formData()

    const creativeId = formData.get('creative_id') as string
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
    const capturedAt = formData.get('captured_at') as string

    const mediaFile = formData.get('media_file') as File | null
    const thumbnailFile = formData.get('thumbnail_file') as File | null
    const zipFile = formData.get('zip_file') as File | null
    const deleteFileType = formData.get('delete_file_type') as string | null

    console.log('Update creative - received files:', {
      hasMediaFile: !!mediaFile,
      hasThumbnailFile: !!thumbnailFile,
      hasZipFile: !!zipFile,
      zipFileName: zipFile?.name,
      zipFileSize: zipFile?.size,
      zipFileType: zipFile?.type
    })

    // Fetch current creative to determine status for moderation reset
    const { data: existingCreative, error: fetchError } = await supabase
      .from('creatives')
      .select('status, moderated_at, moderated_by')
      .eq('id', creativeId)
      .single()

    if (fetchError) {
      console.error('Failed to fetch existing creative:', fetchError)
    }

    // Handle file deletion
    if (deleteFileType) {
      const updateData: any = {}
      if (deleteFileType === 'media') updateData.media_url = null
      if (deleteFileType === 'thumbnail') updateData.thumbnail_url = null
      if (deleteFileType === 'download') updateData.download_url = null

      const { data: updatedCreative, error: updateError } = await supabase
        .from('creatives')
        .update(updateData)
        .eq('id', creativeId)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: 'Ошибка при удалении файла', details: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ 
        message: 'Файл успешно удален', 
        creative: updatedCreative 
      }, { status: 200 })
    }

    // Get IDs for reference tables
    const [formatRes, typeRes, placementRes, platformRes] = await Promise.all([
      formatCode ? supabase.from('formats').select('id').eq('code', formatCode).single() : Promise.resolve({ data: null, error: null }),
      typeCode ? supabase.from('types').select('id').eq('code', typeCode).single() : Promise.resolve({ data: null, error: null }),
      placementCode ? supabase.from('placements').select('id').eq('code', placementCode).single() : Promise.resolve({ data: null, error: null }),
      platformCode ? supabase.from('platforms').select('id').eq('code', platformCode).single() : Promise.resolve({ data: null, error: null })
    ])

    // Upload files if provided, otherwise keep current URLs
    let mediaUrl = formData.get('current_media_url') as string | null
    let thumbnailUrl = formData.get('current_thumbnail_url') as string | null
    let downloadUrl = formData.get('current_download_url') as string | null

    if (mediaFile && mediaFile.size > 0) {
      console.log('Uploading media file for update:', {
        name: mediaFile.name,
        size: mediaFile.size,
        type: mediaFile.type
      })
      
      // Очищаем имя файла от специальных символов
      const sanitizedFileName = mediaFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const mediaFileName = `${Date.now()}-${sanitizedFileName}`
      
      // Определяем content-type
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
      
      const { error: uploadError } = await supabase.storage.from('creatives-media').upload(mediaFileName, mediaFile, {
        contentType,
        cacheControl: '3600',
        upsert: false
      })
      if (uploadError) {
        console.error('Media upload error:', uploadError)
      } else {
        console.log('Media uploaded successfully for update')
        const { data } = supabase.storage.from('creatives-media').getPublicUrl(mediaFileName)
        mediaUrl = data.publicUrl
      }
    }

    if (thumbnailFile && thumbnailFile.size > 0) {
      console.log('Uploading thumbnail file for update:', {
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
      
      const { error: uploadError } = await supabase.storage.from('creatives-media').upload(thumbFileName, thumbnailFile, {
        contentType,
        cacheControl: '3600',
        upsert: false
      })
      if (uploadError) {
        console.error('Thumbnail upload error:', uploadError)
      } else {
        console.log('Thumbnail uploaded successfully for update')
        const { data } = supabase.storage.from('creatives-media').getPublicUrl(thumbFileName)
        thumbnailUrl = data.publicUrl
      }
    }

    if (zipFile && zipFile.size > 0) {
      console.log('Uploading ZIP file for update:', {
        name: zipFile.name,
        size: zipFile.size,
        type: zipFile.type
      })
      
      // Очищаем имя файла от специальных символов
      const sanitizedFileName = zipFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const zipFileName = `archives/${Date.now()}-${sanitizedFileName}`
      console.log('ZIP file path:', zipFileName)
      
      try {
        const { data: zipData, error: uploadError } = await supabase.storage
          .from('creatives-media')
          .upload(zipFileName, zipFile, {
            contentType: zipFile.type || 'application/zip',
            cacheControl: '3600',
            upsert: false
          })
        
        if (uploadError) {
          console.error('Zip upload error:', uploadError)
          console.error('Error details:', JSON.stringify(uploadError, null, 2))
          // Не блокируем обновление креатива, если ZIP не загрузился
        } else {
          console.log('ZIP uploaded successfully:', zipData)
          const { data: urlData } = supabase.storage.from('creatives-media').getPublicUrl(zipFileName)
          downloadUrl = urlData.publicUrl
          console.log('ZIP download URL:', downloadUrl)
        }
      } catch (uploadError) {
        console.error('Exception during ZIP upload:', uploadError)
        // Не блокируем обновление креатива
      }
    } else {
      console.log('No ZIP file provided for update, keeping current download_url:', downloadUrl)
    }

    // Prepare update data
    const updateData: any = {
      title,
      description: description || null,
      cloaking,
      landing_url: landingUrl || null,
      source_link: sourceLink || null,
      source_device: sourceDevice || null,
      media_url: mediaUrl,
      thumbnail_url: thumbnailUrl,
      download_url: downloadUrl
    }

    // Если креатив был опубликован, переводим его обратно в статус new/draft
    if (!existingCreative || existingCreative.status === 'published') {
      updateData.status = 'draft'
      updateData.moderated_at = null
      updateData.moderated_by = null
      console.log('Creative status will be reset to draft after update')
    }

    // Add captured_at if provided (already in ISO format from client)
    if (capturedAt && capturedAt.trim() !== '') {
      // Date comes in ISO format: "2025-11-11T18:34:00.000Z"
      // Save it as is (same format as DB)
      updateData.captured_at = capturedAt.trim()
      console.log('Saving captured_at:', updateData.captured_at)
    }

    if (formatRes.data) updateData.format_id = formatRes.data.id
    if (typeRes.data) updateData.type_id = typeRes.data.id
    if (placementRes.data) updateData.placement_id = placementRes.data.id
    if (platformRes.data) updateData.platform_id = platformRes.data.id
    if (countryCode) updateData.country_code = countryCode

    console.log('Updating creative with data:', {
      id: creativeId,
      title,
      download_url: downloadUrl,
      media_url: mediaUrl,
      thumbnail_url: thumbnailUrl,
      hasDownloadUrl: !!downloadUrl,
      hasZipFile: !!zipFile,
      newStatus: updateData.status || existingCreative?.status || 'draft'
    })

    // Update creative
    const { data: updatedCreative, error: updateError } = await supabase
      .from('creatives')
      .update(updateData)
      .eq('id', creativeId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Ошибка при обновлении креатива', details: getErrorMessage(updateError) }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Креатив успешно обновлен!', 
      creative: updatedCreative 
    }, { status: 200 })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера', details: getErrorMessage(error) }, { status: 500 })
  }
}
