import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getErrorMessage } from '@/lib/utils'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

// GET - получить настройки рекламы для определенной позиции
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const position = searchParams.get('position')

    let queryText = `
      SELECT * FROM ad_settings 
      WHERE enabled = true
    `
    const queryParams: any[] = []
    
    if (position) {
      queryText += ` AND position = $1`
      queryParams.push(position)
    }
    
    queryText += ` ORDER BY priority DESC, position ASC`

    const { rows } = await query(queryText, queryParams)

    // Если запрашивается конкретная позиция, возвращаем первый результат
    if (position && rows && rows.length > 0) {
      return NextResponse.json({ setting: rows[0] })
    }

    // Иначе возвращаем все настройки
    return NextResponse.json({ settings: rows || [] })

  } catch (error) {
    console.error('Get ads error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
