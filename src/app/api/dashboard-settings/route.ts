import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getErrorMessage } from '@/lib/utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET - получить настройки дашборда
export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase не настроен' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Получаем все настройки
    const { data, error } = await supabase
      .from('dashboard_settings')
      .select('key, value')

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch dashboard settings', details: getErrorMessage(error) },
        { status: 500 }
      )
    }

    // Преобразуем массив в объект
    const settings: Record<string, any> = {}
    if (data) {
      data.forEach(item => {
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
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase не настроен' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Missing key or value' },
        { status: 400 }
      )
    }

    // Используем UPSERT для создания или обновления
    const { data, error } = await supabase
      .from('dashboard_settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save dashboard settings', details: getErrorMessage(error) },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      settings: data 
    })

  } catch (error) {
    console.error('Save dashboard settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

