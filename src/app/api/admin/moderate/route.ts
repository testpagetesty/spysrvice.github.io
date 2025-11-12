import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
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

    // Обновляем статус креативов
    const { data, error } = await supabase
      .from('creatives')
      .update({
        status: newStatus,
        moderated_at: new Date().toISOString(),
        moderated_by: moderatedBy,
        updated_at: new Date().toISOString()
      })
      .in('id', creativeIds)
      .select('id, title, status')

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to update creatives', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Successfully ${action}ed ${creativeIds.length} creative(s)`,
      action,
      newStatus,
      updatedCreatives: data,
      count: data?.length || 0
    })

  } catch (error) {
    console.error('Moderation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Получаем статистику по статусам
    const { data, error } = await supabase
      .from('creatives')
      .select('status')
      .not('status', 'is', null)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to get statistics', details: error.message },
        { status: 500 }
      )
    }

    // Подсчитываем статистику
    const stats = data?.reduce((acc, creative) => {
      acc[creative.status] = (acc[creative.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return NextResponse.json({
      statistics: {
        draft: stats.draft || 0,
        published: stats.published || 0,
        total: data?.length || 0
      }
    })

  } catch (error) {
    console.error('Statistics error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
