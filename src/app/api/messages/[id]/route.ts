import { NextResponse } from 'next/server';

const API_BASES = [
  'https://api.duckmail.sbs',
  'https://api.mail.tm',
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

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

        const res = await fetch(`${baseUrl}/messages/${id}`, {
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

        if (res.status === 401) continue;
        if (res.status === 404) {
          return NextResponse.json(
            { error: 'Mensaje no encontrado' },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { error: `Error al obtener mensaje: ${res.statusText}` },
          { status: res.status }
        );
      } catch {
        continue;
      }
    }

    return NextResponse.json(
      { error: 'No se pudo obtener el mensaje de ningún proveedor' },
      { status: 503 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Error de conexión' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

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

        const res = await fetch(`${baseUrl}/messages/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'HacheMail/2.0',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok || res.status === 204) {
          return NextResponse.json({ success: true });
        }

        if (res.status === 401) continue;
      } catch {
        continue;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error de conexión' },
      { status: 500 }
    );
  }
}
