import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') || req.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
    }
    const res = await fetch(`https://api.mail.tm/messages/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data.message || data.detail || 'Error' }, { status: res.status })
    }
    return NextResponse.json(data)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') || req.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
    }
    const res = await fetch(`https://api.mail.tm/messages/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return NextResponse.json({ error: data.message || 'Error al eliminar' }, { status: res.status })
    }
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
