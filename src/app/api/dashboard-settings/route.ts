import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getErrorMessage } from '@/lib/utils'

// GET - получить настройки дашборда
export async function GET(request: NextRequest) {
  try {
    // Получаем все настройки из PostgreSQL
    const { rows } = await query('SELECT key, value FROM dashboard_settings')

    // Преобразуем массив в объект
    const settings: Record<string, any> = {}
    if (rows) {
      rows.forEach((item: any) => {
        settings[item.key] = item.value
      })
    }

    return NextResponse.json({ settings })

  } catch (error) {
    console.error('Get dashboard settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

// POST - обновить настройки дашборда
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Missing key or value' },
        { status: 400 }
      )
    }

    // Используем UPSERT для создания или обновления в PostgreSQL
    const { rows } = await query(
      `INSERT INTO dashboard_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, updated_at = NOW()
       RETURNING *`,
      [key, value]
    )

    return NextResponse.json({ 
      success: true, 
      settings: rows[0] 
    })

  } catch (error) {
    console.error('Save dashboard settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

