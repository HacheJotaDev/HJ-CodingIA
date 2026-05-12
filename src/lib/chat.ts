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
}

export const PROVIDERS: Provider[] = [
  { id: 'z-ai', name: 'Z AI', color: '#e91e63', icon: '⚡', description: 'Z AI flagship models' },
  { id: 'anthropic', name: 'Anthropic', color: '#d4a574', icon: '🧠', description: 'Claude family models' },
  { id: 'openai', name: 'OpenAI', color: '#10a37f', icon: '🔮', description: 'GPT family models' },
  { id: 'google', name: 'Google', color: '#4285f4', icon: '✨', description: 'Gemini family models' },
  { id: 'deepseek', name: 'DeepSeek', color: '#00d4aa', icon: '🔍', description: 'DeepSeek models' },
  { id: 'mistral', name: 'Mistral', color: '#ff7000', icon: '🌀', description: 'Mistral family models' },
] as const;

export const AVAILABLE_MODELS: ModelInfo[] = [
  // Z AI
  { id: 'glm-4-plus', name: 'GLM-4 Plus', provider: 'z-ai', description: 'Most capable model, best for complex tasks' },
  { id: 'glm-4-flash', name: 'GLM-4 Flash', provider: 'z-ai', description: 'Fast responses, good for quick tasks' },
  { id: 'glm-4-long', name: 'GLM-4 Long', provider: 'z-ai', description: 'Extended context window for long documents' },
  // Anthropic
  { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'anthropic', description: 'Balanced intelligence and speed' },
  { id: 'claude-4-opus', name: 'Claude 4 Opus', provider: 'anthropic', description: 'Most powerful Claude model' },
  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Fast multimodal reasoning' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', description: 'High performance with speed' },
  // Google
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google', description: 'Advanced reasoning and code' },
  { id: 'gemini-flash', name: 'Gemini Flash', provider: 'google', description: 'Ultra-fast responses' },
  // DeepSeek
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'deepseek', description: 'Open-weight reasoning model' },
  { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'deepseek', description: 'Specialized for code generation' },
  // Mistral
  { id: 'mistral-large', name: 'Mistral Large', provider: 'mistral', description: 'Top-tier Mistral model' },
  { id: 'codestral', name: 'Codestral', provider: 'mistral', description: 'Code-specialized Mistral model' },
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

export function formatCost(tokens: number, model: string): string {
  const rates: Record<string, [number, number]> = {
    'glm-4-plus': [0.003, 0.015],
    'glm-4-flash': [0.001, 0.005],
    'glm-4-long': [0.004, 0.018],
    'claude-4-sonnet': [0.003, 0.015],
    'claude-4-opus': [0.015, 0.075],
    'gpt-4o': [0.005, 0.015],
    'gpt-4-turbo': [0.01, 0.03],
    'gemini-pro': [0.003, 0.015],
    'gemini-flash': [0.001, 0.005],
    'deepseek-v3': [0.002, 0.008],
    'deepseek-coder': [0.002, 0.008],
    'mistral-large': [0.004, 0.012],
    'codestral': [0.002, 0.006],
  };
  const [inputRate] = rates[model] || rates['glm-4-plus'];
  return `$${((tokens * inputRate) / 1000).toFixed(4)}`;
}

export function exportToMarkdown(messages: Message[]): string {
  const lines = ['# HJ CodingIA Session Export', ''];
  for (const msg of messages) {
    const time = new Date(msg.timestamp).toLocaleString();
    const role = msg.role === 'user' ? '👤 You' : '🤖 HJ CodingIA';
    lines.push(`## ${role} — ${time}`, '');
    lines.push(msg.content, '');
  }
  return lines.join('\n');
}
