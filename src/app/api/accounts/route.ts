import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, password } = body;

    if (!address || !password) {
      return NextResponse.json(
        { error: 'Dirección y contraseña son requeridas' },
        { status: 400 }
      );
    }

    const res = await fetch('https://api.mail.tm/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password }),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Error al crear cuenta: ${res.statusText}`, details: errorBody },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error de conexión con mail.tm' },
      { status: 500 }
    );
  }
}
