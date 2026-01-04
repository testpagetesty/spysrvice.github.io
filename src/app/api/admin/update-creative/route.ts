import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { uploadFile, deleteFile } from '@/lib/storage'
import { getErrorMessage } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
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
    const deleteFileType = formData.get('delete_file_type') as string | null

    console.log('Update creative - received files:', {
      hasMediaFile: !!mediaFile,
      hasThumbnailFile: !!thumbnailFile
    })

    // Получаем текущий креатив из PostgreSQL
    const { rows: existingRows } = await query(
      'SELECT status, moderated_at, moderated_by, media_url, thumbnail_url, download_url FROM creatives WHERE id = $1',
      [creativeId]
    )

    if (existingRows.length === 0) {
      return NextResponse.json({ error: 'Креатив не найден' }, { status: 404 })
    }

    const existingCreative = existingRows[0]

    // Handle file deletion
    if (deleteFileType) {
      const updateFields: string[] = []
      const updateValues: any[] = []
      let paramIndex = 1

      if (deleteFileType === 'media') {
        updateFields.push(`media_url = $${paramIndex++}`)
        updateValues.push(null)
        // Удаляем файл из S3
        if (existingCreative.media_url) {
          try {
            const filePath = existingCreative.media_url.split('/').slice(-1)[0]
            await deleteFile(filePath)
          } catch (e) {
            console.error('Error deleting media file from S3:', e)
          }
        }
      }
      if (deleteFileType === 'thumbnail') {
        updateFields.push(`thumbnail_url = $${paramIndex++}`)
        updateValues.push(null)
        // Удаляем файл из S3
        if (existingCreative.thumbnail_url) {
          try {
            const filePath = existingCreative.thumbnail_url.split('/').slice(-1)[0]
            await deleteFile(`thumbs/${filePath}`)
          } catch (e) {
            console.error('Error deleting thumbnail file from S3:', e)
          }
        }
      }
      if (deleteFileType === 'download') {
        updateFields.push(`download_url = $${paramIndex++}`)
        updateValues.push(null)
        // Удаляем файл из S3 если нужно
        if (existingCreative.download_url) {
          try {
            const filePath = existingCreative.download_url.split('/').slice(-1)[0]
            await deleteFile(filePath)
          } catch (e) {
            console.error('Error deleting download file from S3:', e)
          }
        }
      }

      updateValues.push(creativeId)
      const { rows } = await query(
        `UPDATE creatives SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
        updateValues
      )

      return NextResponse.json({ 
        message: 'Файл успешно удален', 
        creative: rows[0] 
      }, { status: 200 })
    }

    // Get IDs for reference tables
    const [formatRes, typeRes, placementRes, platformRes] = await Promise.all([
      formatCode ? query('SELECT id FROM formats WHERE code = $1', [formatCode]) : Promise.resolve({ rows: [], rowCount: 0 }),
      typeCode ? query('SELECT id FROM types WHERE code = $1', [typeCode]) : Promise.resolve({ rows: [], rowCount: 0 }),
      placementCode ? query('SELECT id FROM placements WHERE code = $1', [placementCode]) : Promise.resolve({ rows: [], rowCount: 0 }),
      platformCode ? query('SELECT id FROM platforms WHERE code = $1', [platformCode]) : Promise.resolve({ rows: [], rowCount: 0 }),
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
      
      const sanitizedFileName = mediaFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const mediaFileName = `${Date.now()}-${sanitizedFileName}`
      
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
        console.log('Media uploaded successfully for update')
      } catch (uploadError) {
        console.error('Media upload error:', uploadError)
      }
    }

    if (thumbnailFile && thumbnailFile.size > 0) {
      console.log('Uploading thumbnail file for update:', {
        name: thumbnailFile.name,
        size: thumbnailFile.size,
        type: thumbnailFile.type
      })
      
      const sanitizedFileName = thumbnailFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const thumbFileName = `thumbs/${Date.now()}-${sanitizedFileName}`
      
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
        console.log('Thumbnail uploaded successfully for update')
      } catch (uploadError) {
        console.error('Thumbnail upload error:', uploadError)
      }
    }

    if (deleteFileType === 'download') {
      downloadUrl = null
      console.log('Download URL will be deleted')
    }

    // Prepare update data
    const updateFields: string[] = []
    const updateValues: any[] = []
    let paramIndex = 1

    updateFields.push(`title = $${paramIndex++}`)
    updateValues.push(title)

    updateFields.push(`description = $${paramIndex++}`)
    updateValues.push(description || null)

    updateFields.push(`cloaking = $${paramIndex++}`)
    updateValues.push(cloaking)

    updateFields.push(`landing_url = $${paramIndex++}`)
    updateValues.push(landingUrl || null)

    updateFields.push(`source_link = $${paramIndex++}`)
    updateValues.push(sourceLink || null)

    updateFields.push(`source_device = $${paramIndex++}`)
    updateValues.push(sourceDevice || null)

    updateFields.push(`media_url = $${paramIndex++}`)
    updateValues.push(mediaUrl)

    updateFields.push(`thumbnail_url = $${paramIndex++}`)
    updateValues.push(thumbnailUrl)

    updateFields.push(`download_url = $${paramIndex++}`)
    updateValues.push(downloadUrl)

    if (formatRes.rows.length > 0) {
      updateFields.push(`format_id = $${paramIndex++}`)
      updateValues.push(formatRes.rows[0].id)
    }

    if (typeRes.rows.length > 0) {
      updateFields.push(`type_id = $${paramIndex++}`)
      updateValues.push(typeRes.rows[0].id)
    }

    if (placementRes.rows.length > 0) {
      updateFields.push(`placement_id = $${paramIndex++}`)
      updateValues.push(placementRes.rows[0].id)
    }

    if (platformRes.rows.length > 0) {
      updateFields.push(`platform_id = $${paramIndex++}`)
      updateValues.push(platformRes.rows[0].id)
    }

    if (countryCode) {
      updateFields.push(`country_code = $${paramIndex++}`)
      updateValues.push(countryCode)
    }

    // Если креатив был опубликован, переводим его обратно в статус draft
    if (!existingCreative || existingCreative.status === 'published') {
      updateFields.push(`status = $${paramIndex++}`)
      updateValues.push('draft')
      updateFields.push(`moderated_at = $${paramIndex++}`)
      updateValues.push(null)
      updateFields.push(`moderated_by = $${paramIndex++}`)
      updateValues.push(null)
      console.log('Creative status will be reset to draft after update')
    }

    // Add captured_at if provided
    if (capturedAt && capturedAt.trim() !== '') {
      updateFields.push(`captured_at = $${paramIndex++}`)
      updateValues.push(capturedAt.trim())
      console.log('Saving captured_at:', capturedAt.trim())
    }

    updateValues.push(creativeId)

    // Update creative
    const { rows } = await query(
      `UPDATE creatives 
       SET ${updateFields.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex} 
       RETURNING *`,
      updateValues
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Ошибка при обновлении креатива' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Креатив успешно обновлен!', 
      creative: rows[0] 
    }, { status: 200 })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера', details: getErrorMessage(error) }, { status: 500 })
  }
}
