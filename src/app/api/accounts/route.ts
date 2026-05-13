import { NextResponse } from 'next/server';

const API_BASES = [
  'https://api.duckmail.sbs',
  'https://api.mail.tm',
];

export async function POST(request: Request) {
  const body = await request.json();
  const { address, password } = body;

  if (!address || !password) {
    return NextResponse.json(
      { error: 'Dirección y contraseña son requeridas' },
      { status: 400 }
    );
  }

  // Determine which API to use based on domain
  const domain = address.split('@')[1];
  let apiBase = API_BASES[0];

  // Try each API
  for (const baseUrl of API_BASES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${baseUrl}/accounts`, {
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

      // If we get a 422 (address already used), don't try the next API
      if (res.status === 422) {
        const errorBody = await res.text().catch(() => '');
        return NextResponse.json(
          { error: `Esta dirección ya está en uso`, details: errorBody },
          { status: 422 }
        );
      }

      // If this API returned a client error, try the next one
      if (res.status < 500) continue;

    } catch {
      // Connection error, try next API
      continue;
    }
  }

  return NextResponse.json(
    { error: 'No se pudo crear la cuenta en ningún proveedor' },
    { status: 503 }
  );
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    const accountId = body.accountId;
    if (!accountId) {
      return NextResponse.json({ success: true });
    }

    for (const baseUrl of API_BASES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(`${baseUrl}/accounts/${accountId}`, {
          method: 'DELETE',
          headers: {
            Authorization: authHeader,
            'User-Agent': 'HacheMail/2.0',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok || res.status === 204) {
          return NextResponse.json({ success: true });
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
