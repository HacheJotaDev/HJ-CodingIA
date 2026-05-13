"use client";

// No API keys needed — all models work via OpenCode Zen
// This file is kept for backward compatibility but all models are free

export interface ApiKeys {
  [key: string]: string;
}

const API_KEYS_STORAGE_KEY = "hj-codingia-api-keys";

export function getApiKeys(): ApiKeys {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {};
}

export function saveApiKeys(keys: ApiKeys): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
}

export function getApiKeyForProvider(_provider: string): string {
  return ""; // No API keys needed
}

export function hasApiKeyForProvider(_provider: string): boolean {
  return true; // All providers work without keys
}

export function hasAnyApiKey(): boolean {
  return true; // Always "has" access since everything is free
}
