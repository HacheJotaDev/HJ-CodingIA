export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model: string;
}

export interface Provider {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  tag?: string;
}

// Proveedor único — OpenCode Zen
export const PROVIDERS: Provider[] = [
  { id: 'zen', name: 'OpenCode Zen', color: '#00e676', icon: '⚡', description: 'Modelos IA potenciados por OpenCode Zen' },
] as const;

// 7 modelos disponibles
export const AVAILABLE_MODELS: ModelInfo[] = [
  { id: 'minimax-free', name: 'MiniMax M2.5', provider: 'zen', description: 'Rápido y preciso — ideal para todo', tag: 'Predeterminado' },
  { id: 'deepseek-r1-free', name: 'DeepSeek R1', provider: 'zen', description: 'Razonamiento profundo y análisis', tag: 'Razonamiento' },
  { id: 'qwen3-free', name: 'Qwen3', provider: 'zen', description: 'Soporte multilingüe', tag: 'Multilingüe' },
  { id: 'big-pickle-free', name: 'Big Pickle', provider: 'zen', description: 'Ventana de contexto grande', tag: 'Contexto' },
  { id: 'nemotron-free', name: 'Nemotron Super', provider: 'zen', description: 'Potenciado por NVIDIA', tag: 'NVIDIA' },
  { id: 'ring-free', name: 'Ring 2.6', provider: 'zen', description: '1T de ventana de contexto', tag: '1T Contexto' },
  { id: 'auto', name: 'Auto', provider: 'zen', description: 'Selecciona automáticamente el mejor modelo', tag: 'Auto' },
] as const;

export const SLASH_COMMANDS = [
  { name: '/ayuda', desc: 'Mostrar comandos disponibles', category: 'General' },
  { name: '/limpiar', desc: 'Limpiar historial de conversación', category: 'General' },
  { name: '/compactar', desc: 'Resumir y comprimir historial', category: 'General' },
  { name: '/modelo', desc: 'Cambiar modelo de IA', category: 'Modelo' },
  { name: '/exportar', desc: 'Exportar conversación como markdown', category: 'Exportar' },
  { name: '/pensar', desc: 'Activar pensamiento extendido', category: 'Modelo' },
  { name: '/revisar', desc: 'Revisar código en busca de problemas', category: 'Código' },
  { name: '/planear', desc: 'Modo planificación', category: 'Código' },
] as const;

// ─── Persistencia en localStorage ───
const STORAGE_KEY = 'hj-ia-sessions';
const ACTIVE_SESSION_KEY = 'hj-ia-active-session';
const MODEL_KEY = 'hj-ia-model';

export function saveSessionsToStorage(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return;
  try {
    // Solo guardar las últimas 20 sesiones, últimas 50 msgs por sesión
    const trimmed = sessions.slice(0, 20).map(s => ({
      ...s,
      messages: s.messages.slice(-50),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* storage lleno, ignorar */ }
}

export function loadSessionsFromStorage(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignorar */ }
  return [];
}

export function saveActiveSession(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(ACTIVE_SESSION_KEY, id);
  else localStorage.removeItem(ACTIVE_SESSION_KEY);
}

export function loadActiveSession(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_SESSION_KEY);
}

export function saveModel(model: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODEL_KEY, model);
}

export function loadModel(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MODEL_KEY);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function getProviderForModel(modelId: string): Provider | undefined {
  const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
  if (!model) return undefined;
  return PROVIDERS.find((p) => p.id === model.provider);
}

export function getModelsByProvider(providerId: string): ModelInfo[] {
  return AVAILABLE_MODELS.filter((m) => m.provider === providerId);
}

export function exportToMarkdown(messages: Message[]): string {
  const lines = ['# HJ IA — Exportar Sesión', ''];
  for (const msg of messages) {
    const time = new Date(msg.timestamp).toLocaleString('es');
    const role = msg.role === 'user' ? 'Tú' : 'HJ IA';
    lines.push(`## ${role} — ${time}`, '', msg.content, '');
  }
  return lines.join('\n');
}
