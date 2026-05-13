import { Session, Settings } from "./types";

const STORAGE_KEYS = {
  SESSIONS: "hj-codingia-sessions",
  SETTINGS: "hj-codingia-settings",
  ACTIVE_SESSION: "hj-codingia-active-session",
};

export const MAX_SESSIONS = 30;
export const MAX_MESSAGES = 100;

export function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_SESSIONS);
  } catch {
    return [];
  }
}

export function saveSessions(sessions: Session[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = sessions.slice(0, MAX_SESSIONS).map((s) => ({
      ...s,
      messages: s.messages.slice(-MAX_MESSAGES),
    }));
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable
  }
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") {
    return {
      defaultModel: "glm-4-plus",
      defaultMode: "chat",
      extendedThinking: false,
      codeReview: false,
      planningMode: false,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      return {
        defaultModel: "glm-4-plus",
        defaultMode: "chat",
        extendedThinking: false,
        codeReview: false,
        planningMode: false,
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      defaultModel: "glm-4-plus",
      defaultMode: "chat",
      extendedThinking: false,
      codeReview: false,
      planningMode: false,
    };
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable
  }
}

export function loadActiveSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
  } catch {
    return null;
  }
}

export function saveActiveSessionId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    }
  } catch {
    // Storage unavailable
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English, ~2-3 for Spanish
  return Math.ceil(text.length / 3.5);
}

export function exportSessionAsMarkdown(session: Session): void {
  const lines: string[] = [
    `# ${session.title}`,
    "",
    `**Fecha de creación:** ${new Date(session.createdAt).toLocaleString("es-ES")}`,
    `**Modo:** ${session.mode}`,
    `**Modelo:** ${session.model}`,
    "",
    "---",
    "",
  ];

  for (const msg of session.messages) {
    if (msg.role === "system") continue;
    const role = msg.role === "user" ? "**Tú**" : "**HJ-CodingIA**";
    const time = new Date(msg.timestamp).toLocaleTimeString("es-ES");

    if (msg.isImage && msg.imageData) {
      lines.push(`${role} *(${time})*:`);
      lines.push("");
      lines.push(`![Imagen generada](data:image/png;base64,${msg.imageData.substring(0, 50)}...)`);
      lines.push("");
    } else {
      lines.push(`${role} *(${time})*:`);
      lines.push("");
      lines.push(msg.content);
      lines.push("");
    }
  }

  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${session.title.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]/g, "_")}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
