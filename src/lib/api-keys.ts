"use client";

export interface ApiKeys {
  anthropic: string;
  openai: string;
  google: string;
  deepseek: string;
  mistral: string;
  "z-ai": string; // optional custom endpoint
}

const API_KEYS_STORAGE_KEY = "hj-codingia-api-keys";

export function getApiKeys(): ApiKeys {
  if (typeof window === "undefined") {
    return { anthropic: "", openai: "", google: "", deepseek: "", mistral: "", "z-ai": "" };
  }
  try {
    const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return { anthropic: "", openai: "", google: "", deepseek: "", mistral: "", "z-ai": "" };
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
  const key = getApiKeyForProvider(provider);
  return key.trim().length > 0;
}

export function hasAnyApiKey(): boolean {
  const keys = getApiKeys();
  return Object.values(keys).some((v) => v.trim().length > 0);
}

// Provider API endpoints
export const PROVIDER_ENDPOINTS: Record<string, string> = {
  anthropic: "https://api.anthropic.com/v1/messages",
  openai: "https://api.openai.com/v1/chat/completions",
  google: "https://generativelanguage.googleapis.com/v1beta",
  deepseek: "https://api.deepseek.com/v1/chat/completions",
  mistral: "https://api.mistral.ai/v1/chat/completions",
};

// Provider model mapping for API calls
export const PROVIDER_MODEL_MAP: Record<string, string> = {
  "glm-4-plus": "glm-4-plus",
  "glm-4-flash": "glm-4-flash",
  "glm-4-long": "glm-4-long",
  "claude-4-sonnet": "claude-sonnet-4-20250514",
  "claude-4-opus": "claude-opus-4-20250514",
  "gpt-4o": "gpt-4o",
  "gpt-4-turbo": "gpt-4-turbo",
  "gemini-pro": "gemini-2.0-flash",
  "gemini-flash": "gemini-2.0-flash-lite",
  "deepseek-v3": "deepseek-chat",
  "deepseek-coder": "deepseek-coder",
  "mistral-large": "mistral-large-latest",
  "codestral": "codestral-latest",
};
