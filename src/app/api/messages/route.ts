import { NextResponse } from 'next/server';

const API_BASES = [
  'https://api.duckmail.sbs',
  'https://api.mail.tm',
];

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

    for (const baseUrl of API_BASES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(`${baseUrl}/messages?page=${page}`, {
          headers: {
            'Accept': 'application/ld+json, application/json',
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'HacheMail/2.0',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data);
        }

        // 401 = token invalid for this provider, try next
        if (res.status === 401) continue;

        // Other error, return it
        const errorBody = await res.text().catch(() => '');
        return NextResponse.json(
          { error: `Error al obtener mensajes: ${res.statusText}`, details: errorBody },
          { status: res.status }
        );
      } catch {
        continue;
      }
    }

    return NextResponse.json(
      { error: 'No se pudo obtener mensajes de ningún proveedor' },
      { status: 503 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Error de conexión' },
      { status: 500 }
    );
  }
}
