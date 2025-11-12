import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET - получить все настройки рекламы
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data, error } = await supabase
      .from('ad_settings')
      .select('*')
      .order('priority', { ascending: false })
      .order('position', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch ad settings', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ settings: data || [] })

  } catch (error) {
    console.error('Get ads error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - создать или обновить настройки рекламы
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const body = await request.json()
    const { position, type, title, enabled, content, image_url, link_url, width, height, priority, display_conditions } = body

    if (!position || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: position, type' },
        { status: 400 }
      )
    }

    // Проверяем существует ли уже настройка для этой позиции
    const { data: existing } = await supabase
      .from('ad_settings')
      .select('id')
      .eq('position', position)
      .single()

    let result
    if (existing) {
      // Обновляем существующую
      const { data, error } = await supabase
        .from('ad_settings')
        .update({
          type,
          title: title || null,
          enabled: enabled !== undefined ? enabled : true,
          content: content || null,
          image_url: image_url || null,
          link_url: link_url || null,
          width: width || 'auto',
          height: height || 'auto',
          priority: priority || 0,
          display_conditions: display_conditions || null,
          updated_at: new Date().toISOString()
        })
        .eq('position', position)
        .select()
        .single()

      if (error) {
        console.error('Update error:', error)
        return NextResponse.json(
          { error: 'Failed to update ad settings', details: error.message },
          { status: 500 }
        )
      }

      result = data
    } else {
      // Создаем новую
      const { data, error } = await supabase
        .from('ad_settings')
        .insert({
          position,
          type,
          title: title || null,
          enabled: enabled !== undefined ? enabled : true,
          content: content || null,
          image_url: image_url || null,
          link_url: link_url || null,
          width: width || 'auto',
          height: height || 'auto',
          priority: priority || 0,
          display_conditions: display_conditions || null
        })
        .select()
        .single()

      if (error) {
        console.error('Insert error:', error)
        return NextResponse.json(
          { error: 'Failed to create ad settings', details: error.message },
          { status: 500 }
        )
      }

      result = data
    }

    return NextResponse.json({
      success: true,
      setting: result
    })

  } catch (error) {
    console.error('Save ads error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - удалить настройки рекламы
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { searchParams } = new URL(request.url)
    const position = searchParams.get('position')

    if (!position) {
      return NextResponse.json(
        { error: 'Missing required parameter: position' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('ad_settings')
      .delete()
      .eq('position', position)

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete ad settings', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete ads error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
