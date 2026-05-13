import { MailAccount } from './types'

const ACCOUNTS_KEY = 'hache_mail_accounts'
const ACTIVE_KEY = 'hache_mail_active'

export function saveAccounts(accounts: MailAccount[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts.slice(0, 10)))
  } catch {}
}

export function loadAccounts(): MailAccount[] {
  try {
    const data = localStorage.getItem(ACCOUNTS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveActiveAccountId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY, id)
  } catch {}
}

export function loadActiveAccountId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(ACCOUNTS_KEY)
    localStorage.removeItem(ACTIVE_KEY)
  } catch {}
}
