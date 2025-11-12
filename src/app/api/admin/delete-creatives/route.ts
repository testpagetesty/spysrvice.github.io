import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const body = await request.json()
    const { creativeIds } = body

    if (!creativeIds || !Array.isArray(creativeIds) || creativeIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty creativeIds array' },
        { status: 400 }
      )
    }

    // Delete creatives
    const { data, error } = await supabase
      .from('creatives')
      .delete()
      .in('id', creativeIds)
      .select('id')

    if (error) {
      console.error('Supabase delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete creatives', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${data?.length || 0} creative(s)`,
      deletedCount: data?.length || 0,
      deletedIds: data?.map(c => c.id) || []
    })

  } catch (error) {
    console.error('Delete creatives error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
