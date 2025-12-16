import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase не настроен' },
        { status: 500 }
      )
    }

    // Создаем клиент с service role key (имеет полные права)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const results: string[] = []
    const errors: string[] = []

    // SQL запросы для настройки политик
    const policies = [
      // Удаляем старые политики
      {
        name: 'Удаление старых политик',
        sql: `
          DROP POLICY IF EXISTS "Authenticated users can upload creatives media" ON storage.objects;
          DROP POLICY IF EXISTS "Anonymous users can upload creatives media" ON storage.objects;
          DROP POLICY IF EXISTS "Authenticated users can update creatives media" ON storage.objects;
          DROP POLICY IF EXISTS "Anonymous users can update creatives media" ON storage.objects;
          DROP POLICY IF EXISTS "Public read access for creatives media" ON storage.objects;
          DROP POLICY IF EXISTS "Authenticated users can delete creatives media" ON storage.objects;
        `
      },
      // Политика для чтения (публичный доступ)
      {
        name: 'Public read access',
        sql: `
          CREATE POLICY "Public read access for creatives media" 
          ON storage.objects 
          FOR SELECT 
          USING (bucket_id = 'creatives-media');
        `
      },
      // Политика для загрузки (анонимные пользователи)
      {
        name: 'Anonymous upload',
        sql: `
          CREATE POLICY "Anonymous users can upload creatives media" 
          ON storage.objects 
          FOR INSERT 
          WITH CHECK (bucket_id = 'creatives-media');
        `
      },
      // Политика для обновления (анонимные пользователи)
      {
        name: 'Anonymous update',
        sql: `
          CREATE POLICY "Anonymous users can update creatives media" 
          ON storage.objects 
          FOR UPDATE 
          USING (bucket_id = 'creatives-media') 
          WITH CHECK (bucket_id = 'creatives-media');
        `
      },
      // Политика для удаления (только аутентифицированные)
      {
        name: 'Authenticated delete',
        sql: `
          CREATE POLICY "Authenticated users can delete creatives media" 
          ON storage.objects 
          FOR DELETE 
          USING (
            bucket_id = 'creatives-media' 
            AND auth.role() = 'authenticated'
          );
        `
      },
      // Включаем RLS
      {
        name: 'Enable RLS',
        sql: `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;`
      }
    ]

    // Выполняем каждый SQL запрос через RPC функцию exec_sql
    // Если RPC функция не существует, используем прямой SQL через Supabase client
    for (const policy of policies) {
      try {
        // Пробуем выполнить через RPC функцию exec_sql (если она существует)
        const { data, error: rpcError } = await supabase.rpc('exec_sql', {
          sql_query: policy.sql
        })

        if (rpcError) {
          // Если RPC функция не существует, пробуем выполнить SQL напрямую
          // через Supabase Management API
          console.log(`Пробуем выполнить SQL напрямую для: ${policy.name}`)
          
          // Supabase JS SDK не поддерживает прямой SQL выполнение
          // Нужно использовать PostgREST или создать RPC функцию
          // Попробуем через fetch к Supabase REST API
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ sql_query: policy.sql })
          })

          if (response.ok) {
            results.push(`✅ ${policy.name}: успешно`)
          } else {
            const errorText = await response.text()
            errors.push(`❌ ${policy.name}: ${errorText}`)
            console.error(`Ошибка для ${policy.name}:`, errorText)
          }
        } else {
          results.push(`✅ ${policy.name}: успешно`)
        }
      } catch (error: any) {
        errors.push(`❌ ${policy.name}: ${error.message || 'Неизвестная ошибка'}`)
        console.error(`Ошибка для ${policy.name}:`, error)
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Некоторые политики не удалось настроить',
        results,
        errors
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Все политики успешно настроены',
      results
    })

  } catch (error: any) {
    console.error('Ошибка настройки политик:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка настройки политик',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

