import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const type = params.type // formats, types, placements, platforms, countries
    const searchParams = request.nextUrl.searchParams
    const withCounts = searchParams.get('withCounts') === 'true'

    let tableName: string
    let selectFields = '*'

    switch (type) {
      case 'formats':
        tableName = 'formats'
        break
      case 'types':
        tableName = 'types'
        break
      case 'placements':
        tableName = 'placements'
        break
      case 'platforms':
        tableName = 'platforms'
        break
      case 'countries':
        tableName = 'countries'
        selectFields = 'code, name, created_at'
        break
      default:
        return NextResponse.json(
          { error: 'Invalid reference type' },
          { status: 400 }
        )
    }

    if (type === 'countries' && withCounts) {
      // Для стран с количеством креативов - возвращаем ВСЕ страны из таблицы countries
      // Даже если у них нет креативов (count будет 0)
      const { rows } = await query(`
        SELECT 
          co.code,
          co.name,
          co.created_at,
          COUNT(c.id)::int as count
        FROM countries co
        LEFT JOIN creatives c ON c.country_code = co.code AND c.status = 'published'
        GROUP BY co.code, co.name, co.created_at
        ORDER BY co.name
      `)
      
      // Возвращаем ВСЕ страны, даже с count = 0
      return NextResponse.json({ 
        data: rows.map(row => ({
          code: row.code,
          name: row.name,
          created_at: row.created_at,
          count: parseInt(row.count || '0')
        }))
      })
    }

    const { rows } = await query(`SELECT ${selectFields} FROM ${tableName} ORDER BY name`)

    return NextResponse.json({ data: rows })
  } catch (error) {
    console.error('Error fetching references:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

