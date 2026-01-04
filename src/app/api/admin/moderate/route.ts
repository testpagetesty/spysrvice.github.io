import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getErrorMessage } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, creativeIds, moderatedBy = 'admin' } = body

    if (!action || !creativeIds || !Array.isArray(creativeIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: action, creativeIds' },
        { status: 400 }
      )
    }

    if (!['approve', 'draft'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve or draft' },
        { status: 400 }
      )
    }

    // Определяем новый статус
    let newStatus: string
    switch (action) {
      case 'approve':
        newStatus = 'published'
        break
      case 'draft':
        newStatus = 'draft'
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Обновляем статус креативов в PostgreSQL
    const placeholders = creativeIds.map((_, i) => `$${i + 1}`).join(',')
    const { rows } = await query(
      `UPDATE creatives 
       SET status = $${creativeIds.length + 1},
           moderated_at = $${creativeIds.length + 2},
           moderated_by = $${creativeIds.length + 3},
           updated_at = NOW()
       WHERE id IN (${placeholders})
       RETURNING id, title, status`,
      [...creativeIds, newStatus, new Date().toISOString(), moderatedBy]
    )

    return NextResponse.json({
      message: `Successfully ${action}ed ${creativeIds.length} creative(s)`,
      action,
      newStatus,
      updatedCreatives: rows,
      count: rows?.length || 0
    })

  } catch (error) {
    console.error('Moderation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Получаем статистику по статусам из PostgreSQL
    const { rows } = await query(`
      SELECT status, COUNT(*) as count
      FROM creatives
      WHERE status IS NOT NULL
      GROUP BY status
    `)

    const stats: Record<string, number> = {}
    let total = 0
    
    rows.forEach((row: any) => {
      stats[row.status] = parseInt(row.count)
      total += parseInt(row.count)
    })

    return NextResponse.json({
      statistics: {
        draft: stats.draft || 0,
        published: stats.published || 0,
        total
      }
    })

  } catch (error) {
    console.error('Statistics error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
