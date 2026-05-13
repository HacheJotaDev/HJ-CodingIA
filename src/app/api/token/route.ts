import { NextResponse } from 'next/server';

const API_BASES = [
  'https://api.duckmail.sbs',
  'https://api.mail.tm',
];

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

    // Try each API
    for (const baseUrl of API_BASES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(`${baseUrl}/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/ld+json, application/json',
            'User-Agent': 'HacheMail/2.0',
          },
          body: JSON.stringify({ address, password }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data);
        }

        // 401 = wrong credentials, don't try next API
        if (res.status === 401) {
          const errorBody = await res.text().catch(() => '');
          return NextResponse.json(
            { error: `Credenciales inválidas`, details: errorBody },
            { status: 401 }
          );
        }

      } catch {
        continue;
      }
    }

    return NextResponse.json(
      { error: 'No se pudo autenticar con ningún proveedor' },
      { status: 503 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Error de conexión' },
      { status: 500 }
    );
  }
}
