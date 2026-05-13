import { NextResponse } from 'next/server';

const API_BASES = [
  'https://api.duckmail.sbs',
  'https://api.mail.tm',
];

async function tryFetchDomains(baseUrl: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${baseUrl}/domains`, {
      headers: {
        'Accept': 'application/ld+json, application/json',
        'User-Agent': 'HacheMail/2.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = await res.json();
    const members = data['hydra:member'] || data;
    if (Array.isArray(members) && members.length > 0) {
      return members;
    }
    return null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

export async function GET() {
  for (const baseUrl of API_BASES) {
    const domains = await tryFetchDomains(baseUrl);
    if (domains) {
      return NextResponse.json({
        'hydra:member': domains,
        'hydra:totalItems': domains.length,
      });
    }
  }

  return NextResponse.json(
    { error: 'No se pudo conectar con ningún proveedor de correo temporal' },
    { status: 503 }
  );
}
