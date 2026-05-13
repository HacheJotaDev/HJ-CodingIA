import { Domain, MailAccount, MailMessage, MessagesResponse } from './types'

const BASE = 'https://api.mail.tm'

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `API error ${res.status}`)
  }
  return res.json()
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export async function getDomains(): Promise<Domain[]> {
  const data = await api('/domains')
  return data['hydra:member'] || data
}

export async function createToken(address: string, password: string): Promise<{ token: string; id: string }> {
  return api('/token', {
    method: 'POST',
    body: JSON.stringify({ address, password }),
  })
}

export async function createAccount(address: string, password: string): Promise<MailAccount> {
  return api('/accounts', {
    method: 'POST',
    body: JSON.stringify({ address, password }),
  })
}

export async function getMessages(token: string, page = 1): Promise<MessagesResponse> {
  return api(`/messages?page=${page}`, {
    headers: authHeader(token),
  })
}

export async function getMessage(token: string, id: string): Promise<MailMessage> {
  return api(`/messages/${id}`, {
    headers: authHeader(token),
  })
}

export async function deleteMessage(token: string, id: string): Promise<void> {
  await api(`/messages/${id}`, {
    method: 'DELETE',
    headers: authHeader(token),
  })
}

export async function deleteAccount(token: string, id: string): Promise<void> {
  await api(`/accounts/${id}`, {
    method: 'DELETE',
    headers: authHeader(token),
  })
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<base\b[^>]*>/gi, '')
}

export function randomUsername(length = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function randomPassword(length = 14): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
