import type { Domain, TokenResponse, AccountResponse, MessagesResponse, MailMessage } from './types';

const MAILTM_BASE = 'https://api.mail.tm';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${MAILTM_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`API Error ${res.status}: ${res.statusText}${errorBody ? ` - ${errorBody}` : ''}`);
  }

  return res.json();
}

export async function getDomains(): Promise<Domain[]> {
  const data = await fetchApi<{ "hydra:member": Domain[] }>('/domains');
  return data['hydra:member'] || [];
}

export async function createToken(address: string, password: string): Promise<TokenResponse> {
  return fetchApi<TokenResponse>('/token', {
    method: 'POST',
    body: JSON.stringify({ address, password }),
  });
}

export async function createAccount(address: string, password: string): Promise<AccountResponse> {
  return fetchApi<AccountResponse>('/accounts', {
    method: 'POST',
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
  const res = await fetch(`${MAILTM_BASE}/messages/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(`Error al eliminar mensaje: ${res.statusText}`);
  }
}

export async function deleteAccount(id: string): Promise<void> {
  const res = await fetch(`${MAILTM_BASE}/accounts/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(`Error al eliminar cuenta: ${res.statusText}`);
  }
}
