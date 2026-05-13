import type { Domain, TokenResponse, AccountResponse, MessagesResponse, MailMessage } from './types';

const API_BASES = [
  'https://api.duckmail.sbs',
  'https://api.mail.tm',
];

const DEFAULT_HEADERS = {
  'Accept': 'application/ld+json, application/json',
  'User-Agent': 'HacheMail/2.0',
};

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  let lastError: Error | null = null;

  for (const baseUrl of API_BASES) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...DEFAULT_HEADERS,
          ...options?.headers,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        lastError = new Error(`API Error ${res.status}: ${res.statusText}${errorBody ? ` - ${errorBody}` : ''}`);

        // Don't try next API for client errors (except 401 which might mean wrong provider)
        if (res.status < 500 && res.status !== 401) {
          throw lastError;
        }
        continue;
      }

      return res.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.message.startsWith('API Error')) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  throw lastError || new Error('No se pudo conectar con ningún proveedor');
}

export async function getDomains(): Promise<Domain[]> {
  const data = await fetchApi<{ "hydra:member": Domain[] }>('/domains');
  return data['hydra:member'] || [];
}

export async function createToken(address: string, password: string): Promise<TokenResponse> {
  return fetchApi<TokenResponse>('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password }),
  });
}

export async function createAccount(address: string, password: string): Promise<AccountResponse> {
  return fetchApi<AccountResponse>('/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password }),
  });
}

export async function getMessages(token: string, page: number = 1): Promise<MessagesResponse> {
  return fetchApi<MessagesResponse>(`/messages?page=${page}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getMessage(token: string, id: string): Promise<MailMessage> {
  return fetchApi<MailMessage>(`/messages/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function deleteMessage(token: string, id: string): Promise<void> {
  let lastError: Error | null = null;

  for (const baseUrl of API_BASES) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${baseUrl}/messages/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          ...DEFAULT_HEADERS,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok || res.status === 204) return;
      if (res.status === 401) continue;

      lastError = new Error(`Error al eliminar mensaje: ${res.statusText}`);
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  // Don't throw - deletion is best-effort
}

export async function deleteAccount(id: string): Promise<void> {
  let lastError: Error | null = null;

  for (const baseUrl of API_BASES) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${baseUrl}/accounts/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...DEFAULT_HEADERS,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok || res.status === 204) return;
      if (res.status === 401) continue;

      lastError = new Error(`Error al eliminar cuenta: ${res.statusText}`);
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  // Don't throw - deletion is best-effort
}

// Utility functions
export function randomUsername(length: number = 10): string {
  const adjectives = ['rapido', 'seguro', 'nuevo', 'fresco', 'cool', 'top', 'pro', 'mega', 'super', 'ultra'];
  const nouns = ['correo', 'mail', 'msg', 'box', 'net', 'web', 'app', 'dev', 'user', 'code'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9999);
  return `${adj}.${noun}${num}`;
}

export function randomPassword(length: number = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function sanitizeHtml(html: string): string {
  let sanitized = html;
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']data:text\/html[^"']*["']/gi, 'src=""');
  sanitized = sanitized.replace(/<a\s+/gi, '<a target="_blank" rel="noopener noreferrer" ');
  return sanitized;
}
