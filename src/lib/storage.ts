import type { MailAccount } from './types';

const ACCOUNTS_KEY = 'hachemail_accounts';
const ACTIVE_KEY = 'hachemail_active';
const MAX_ACCOUNTS = 10;

export function saveAccounts(accounts: MailAccount[]): void {
  try {
    const trimmed = accounts.slice(0, MAX_ACCOUNTS);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function loadAccounts(): MailAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_ACCOUNTS);
  } catch {
    return [];
  }
}

export function saveActiveAccount(id: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // ignore
  }
}

export function loadActiveAccount(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function addAccount(account: MailAccount): MailAccount[] {
  const accounts = loadAccounts();
  // Check if account already exists
  const existing = accounts.findIndex(a => a.id === account.id);
  if (existing >= 0) {
    accounts[existing] = account;
  } else {
    accounts.unshift(account);
  }
  saveAccounts(accounts);
  saveActiveAccount(account.id);
  return accounts;
}

export function removeAccount(id: string): MailAccount[] {
  const accounts = loadAccounts().filter(a => a.id !== id);
  saveAccounts(accounts);
  // If the removed account was active, switch to first
  const activeId = loadActiveAccount();
  if (activeId === id) {
    if (accounts.length > 0) {
      saveActiveAccount(accounts[0].id);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  }
  return accounts;
}

export function updateAccountToken(id: string, token: string): void {
  const accounts = loadAccounts();
  const account = accounts.find(a => a.id === id);
  if (account) {
    account.token = token;
    saveAccounts(accounts);
  }
}
