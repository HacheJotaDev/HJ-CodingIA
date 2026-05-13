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
  mode: 'chat' | 'code';
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
  mode?: 'chat' | 'code' | 'both';
}

// Modo de la IA
export type AIMode = 'chat' | 'code';

// Proveedor: OpenCode Zen
export const PROVIDERS: Provider[] = [
  { id: 'zen', name: 'OpenCode Zen', color: '#00e676', icon: '⚡', description: 'Modelos IA verificados por OpenCode' },
] as const;

// 7 modelos gratuitos — OpenCode Zen (sin API key)
export const AVAILABLE_MODELS: ModelInfo[] = [
  { id: 'minimax-free', name: 'MiniMax M2.5', provider: 'zen', description: 'Rápido y preciso — ideal para todo', tag: 'Predeterminado', mode: 'both' },
  { id: 'deepseek-r1-free', name: 'DeepSeek R1', provider: 'zen', description: 'Razonamiento profundo y análisis', tag: 'Razonamiento', mode: 'both' },
  { id: 'qwen3-free', name: 'Qwen3', provider: 'zen', description: 'Soporte multilingüe', tag: 'Multilingüe', mode: 'both' },
  { id: 'big-pickle-free', name: 'Big Pickle', provider: 'zen', description: 'Ventana de contexto grande', tag: 'Contexto', mode: 'code' },
  { id: 'nemotron-free', name: 'Nemotron Super', provider: 'zen', description: 'Potenciado por NVIDIA', tag: 'NVIDIA', mode: 'both' },
  { id: 'ring-free', name: 'Ring 2.6', provider: 'zen', description: '1T de ventana de contexto', tag: '1T', mode: 'code' },
  { id: 'auto', name: 'Auto', provider: 'zen', description: 'Selecciona el mejor modelo automáticamente', tag: 'Auto', mode: 'both' },
] as const;

// System prompts por modo
export const SYSTEM_PROMPTS: Record<AIMode, string> = {
  chat: `Eres HJ IA, un asistente de inteligencia artificial amigable y versátil. Respondes en español por defecto.

Puedes ayudar con CUALQUIER tema:
- Preguntas generales, curiosidades, historia, ciencia, deportes, cultura
- Redacción, traducción, resúmenes, análisis de texto
- Matemáticas, lógica, razonamiento
- Conversación casual, consejos, creatividad
- Y cualquier cosa que el usuario necesite

Reglas:
- Sé directo, amigable y conciso. No alargues innecesariamente.
- Responde en español salvo que te pidan otro idioma.
- Para preguntas simples, respuestas simples y rápidas.
- Para preguntas complejas, respuestas completas y bien estructuradas.
- Usa formato markdown cuando ayude a la claridad.
- Sé como ChatGPT: rápido, claro, útil y natural.`,

  code: `Eres HJ IA Code, un asistente de programación profesional y experto. Respondes en español por defecto.

Especializado en:
- Escribir, depurar y refactorizar código en cualquier lenguaje
- Arquitectura de software, diseño de sistemas
- Revisión de código, seguridad, rendimiento
- Explicar conceptos técnicos con ejemplos prácticos
- Crear proyectos completos paso a paso

Reglas:
- Sé directo y enfocado en código actionable.
- Responde en español salvo que te pidan otro idioma.
- Para código, usa bloques con el lenguaje (triple backtick + lenguaje).
- Si el usuario pide crear algo, muestra el código completo y funcional.
- Explica brevemente el "por qué" detrás de las decisiones técnicas.
- Sé como un senior developer pair programming.`,
};

export const SLASH_COMMANDS = [
  { name: '/ayuda', desc: 'Mostrar comandos disponibles', category: 'General' },
  { name: '/limpiar', desc: 'Limpiar historial de conversación', category: 'General' },
  { name: '/modelo', desc: 'Cambiar modelo de IA', category: 'Modelo' },
  { name: '/modo', desc: 'Cambiar modo (chat o código)', category: 'Modo' },
  { name: '/exportar', desc: 'Exportar conversación como markdown', category: 'Exportar' },
  { name: '/pensar', desc: 'Activar pensamiento extendido', category: 'Modelo' },
  { name: '/revisar', desc: 'Revisar código en busca de problemas', category: 'Código' },
  { name: '/planear', desc: 'Modo planificación', category: 'Código' },
] as const;

// ─── Persistencia en localStorage ───
const STORAGE_KEY = 'hj-ia-sessions';
const ACTIVE_SESSION_KEY = 'hj-ia-active-session';
const MODEL_KEY = 'hj-ia-model';
const MODE_KEY = 'hj-ia-mode';

export function saveSessionsToStorage(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = sessions.slice(0, 20).map(s => ({
      ...s,
      messages: s.messages.slice(-50),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* storage lleno */ }
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

export function saveMode(mode: AIMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODE_KEY, mode);
}

export function loadMode(): AIMode {
  if (typeof window === "undefined") return 'chat';
  const stored = localStorage.getItem(MODE_KEY);
  return stored === 'code' ? 'code' : 'chat';
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

export function getModelsForMode(mode: AIMode): ModelInfo[] {
  return AVAILABLE_MODELS.filter((m) => m.mode === 'both' || m.mode === mode);
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
