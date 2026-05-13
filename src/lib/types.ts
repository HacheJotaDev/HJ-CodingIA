export type Mode = "chat" | "codigo" | "imagen";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isImage?: boolean;
  imageData?: string;
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  mode: Mode;
  model: string;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  mode?: Mode[];
}

export interface Settings {
  defaultModel: string;
  defaultMode: Mode;
  extendedThinking: boolean;
  codeReview: boolean;
  planningMode: boolean;
}

export interface ChatRequestBody {
  messages: { role: string; content: string }[];
  model: string;
  mode: Mode;
  systemSuffix?: string;
}

export interface ImageRequestBody {
  prompt: string;
  size?: string;
}

export interface ImageGenerationResponse {
  imageData: string;
  error?: string;
}
