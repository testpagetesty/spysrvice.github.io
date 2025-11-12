import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getErrorMessage } from '@/lib/utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// GET - получить настройки рекламы для определенной позиции
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    const { searchParams } = new URL(request.url)
    const position = searchParams.get('position')

    let query = supabase
      .from('ad_settings')
      .select('*')
      .eq('enabled', true)
      .order('priority', { ascending: false })

    if (position) {
      query = query.eq('position', position)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch ad settings', details: getErrorMessage(error) },
        { status: 500 }
      )
    }

    // Если запрашивается конкретная позиция, возвращаем первый результат
    if (position && data && data.length > 0) {
      return NextResponse.json({ setting: data[0] })
    }

    // Иначе возвращаем все настройки
    return NextResponse.json({ settings: data || [] })

  } catch (error) {
    console.error('Get ads error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
