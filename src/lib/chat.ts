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

// Single provider — OpenCode Zen (no API key needed)
export const PROVIDERS: Provider[] = [
  { id: 'zen', name: 'OpenCode Zen', color: '#00e676', icon: '⚡', description: 'AI models powered by OpenCode Zen — no API key required' },
] as const;

// 7 models — all work without API keys via OpenCode Zen
export const AVAILABLE_MODELS: ModelInfo[] = [
  { id: 'minimax-free', name: 'MiniMax M2.5', provider: 'zen', description: 'Best for code — fast and accurate', tag: 'Default' },
  { id: 'deepseek-r1-free', name: 'DeepSeek R1', provider: 'zen', description: 'Powerful reasoning and analysis', tag: 'Reasoning' },
  { id: 'qwen3-free', name: 'Qwen3', provider: 'zen', description: 'Multilingual support', tag: 'Multilingual' },
  { id: 'big-pickle-free', name: 'Big Pickle', provider: 'zen', description: 'Large context window', tag: 'Context' },
  { id: 'nemotron-free', name: 'Nemotron Super', provider: 'zen', description: 'NVIDIA powered', tag: 'NVIDIA' },
  { id: 'ring-free', name: 'Ring 2.6', provider: 'zen', description: '1T context window', tag: '1T Context' },
  { id: 'auto', name: 'Auto Route', provider: 'zen', description: 'Automatically selects the best model', tag: 'Auto' },
] as const;

export const SLASH_COMMANDS = [
  { name: '/help', desc: 'Show available commands', category: 'General' },
  { name: '/clear', desc: 'Clear conversation history', category: 'General' },
  { name: '/compact', desc: 'Summarize and compress history', category: 'General' },
  { name: '/model', desc: 'Switch AI model', category: 'Model' },
  { name: '/caveman', desc: 'Activate telegraphic speech mode', category: 'Display' },
  { name: '/rocky', desc: 'Activate Rocky speech mode', category: 'Display' },
  { name: '/normal', desc: 'Deactivate speech modes', category: 'Display' },
  { name: '/cost', desc: 'Show token usage estimate', category: 'Info' },
  { name: '/export', desc: 'Export conversation as markdown', category: 'Export' },
  { name: '/think', desc: 'Toggle extended thinking', category: 'Model' },
  { name: '/review', desc: 'Review code for issues', category: 'Code' },
  { name: '/plan', desc: 'Enter planning mode', category: 'Code' },
  { name: '/agents', desc: 'List available AI agents', category: 'Agents' },
  { name: '/goals', desc: 'Set or view session goals', category: 'Agents' },
] as const;

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

export function isModelFree(_modelId: string): boolean {
  return true; // All models are free
}

export function formatCost(_tokens: number, _model: string): number {
  return 0; // All models are free
}

export function exportToMarkdown(messages: Message[]): string {
  const lines = ['# HJ CodingIA Session Export', ''];
  for (const msg of messages) {
    const time = new Date(msg.timestamp).toLocaleString();
    const role = msg.role === 'user' ? 'You' : 'HJ CodingIA';
    lines.push(`## ${role} — ${time}`, '', msg.content, '');
  }
  return lines.join('\n');
}
