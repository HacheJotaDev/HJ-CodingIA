import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://api.mail.tm/domains', {
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
