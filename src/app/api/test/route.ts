import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Test API works!' })
}

export async function POST() {
  return NextResponse.json({ message: 'POST works too!' })
}
