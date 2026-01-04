import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getErrorMessage } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { creativeIds } = body

    if (!creativeIds || !Array.isArray(creativeIds) || creativeIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty creativeIds array' },
        { status: 400 }
      )
    }

    // Delete creatives из PostgreSQL
    const placeholders = creativeIds.map((_, i) => `$${i + 1}`).join(',')
    const { rows } = await query(
      `DELETE FROM creatives 
       WHERE id IN (${placeholders})
       RETURNING id`,
      creativeIds
    )

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${rows?.length || 0} creative(s)`,
      deletedCount: rows?.length || 0,
      deletedIds: rows?.map(c => c.id) || []
    })

  } catch (error) {
    console.error('Delete creatives error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
