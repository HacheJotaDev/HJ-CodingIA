import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const page = searchParams.get('page') || '1';

    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    const res = await fetch(`https://api.mail.tm/messages?page=${page}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Error al obtener mensajes: ${res.statusText}`, details: errorBody },
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
