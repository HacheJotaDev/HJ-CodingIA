import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://api.mail.tm/domains', {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Error al obtener dominios: ${res.statusText}` },
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
