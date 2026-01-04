import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getErrorMessage } from '@/lib/utils'

// GET - получить все настройки рекламы
export async function GET(request: NextRequest) {
  try {
    const { rows } = await query(`
      SELECT * FROM ad_settings 
      ORDER BY priority DESC, position ASC
    `)

    return NextResponse.json({ settings: rows || [] })

  } catch (error) {
    console.error('Get ads error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

// POST - создать или обновить настройки рекламы
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { position, type, title, enabled, content, image_url, link_url, width, height, priority, display_conditions } = body

    if (!position || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: position, type' },
        { status: 400 }
      )
    }

    // Проверяем существует ли уже настройка для этой позиции
    const { rows: existing } = await query(
      'SELECT id FROM ad_settings WHERE position = $1',
      [position]
    )

    let result
    if (existing && existing.length > 0) {
      // Обновляем существующую
      const { rows } = await query(
        `UPDATE ad_settings 
         SET type = $1,
             title = $2,
             enabled = $3,
             content = $4,
             image_url = $5,
             link_url = $6,
             width = $7,
             height = $8,
             priority = $9,
             display_conditions = $10,
             updated_at = NOW()
         WHERE position = $11
         RETURNING *`,
        [
          type,
          title || null,
          enabled !== undefined ? enabled : true,
          content || null,
          image_url || null,
          link_url || null,
          width || 'auto',
          height || 'auto',
          priority || 0,
          display_conditions || null,
          position
        ]
      )
      result = rows[0]
    } else {
      // Создаем новую
      const { rows } = await query(
        `INSERT INTO ad_settings (
          position, type, title, enabled, content, image_url, link_url, 
          width, height, priority, display_conditions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          position,
          type,
          title || null,
          enabled !== undefined ? enabled : true,
          content || null,
          image_url || null,
          link_url || null,
          width || 'auto',
          height || 'auto',
          priority || 0,
          display_conditions || null
        ]
      )
      result = rows[0]
    }

    return NextResponse.json({
      success: true,
      setting: result
    })

  } catch (error) {
    console.error('Save ads error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

// DELETE - удалить настройки рекламы
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const position = searchParams.get('position')

    if (!position) {
      return NextResponse.json(
        { error: 'Missing required parameter: position' },
        { status: 400 }
      )
    }

    await query('DELETE FROM ad_settings WHERE position = $1', [position])

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete ads error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
