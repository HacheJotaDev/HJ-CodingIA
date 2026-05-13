"use client";

export interface ApiKeys {
  anthropic: string;
  openai: string;
  google: string;
  deepseek: string;
  mistral: string;
}

const API_KEYS_STORAGE_KEY = "hj-codingia-api-keys";

export function getApiKeys(): ApiKeys {
  if (typeof window === "undefined") {
    return { anthropic: "", openai: "", google: "", deepseek: "", mistral: "" };
  }
  try {
    const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { anthropic: "", openai: "", google: "", deepseek: "", mistral: "" };
}

export function saveApiKeys(keys: ApiKeys): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
}

export function getApiKeyForProvider(provider: string): string {
  const keys = getApiKeys();
  return keys[provider as keyof ApiKeys] || "";
}

export function hasApiKeyForProvider(provider: string): boolean {
  return getApiKeyForProvider(provider).trim().length > 0;
}

export function hasAnyApiKey(): boolean {
  const keys = getApiKeys();
  return Object.values(keys).some((v) => v.trim().length > 0);
}
