import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { address, password } = await req.json()
    if (!address || !password) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }
    const res = await fetch('https://api.mail.tm/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data.message || data.detail || 'Error de autenticación' }, { status: res.status })
    }
    return NextResponse.json(data)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
