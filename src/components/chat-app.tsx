"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Menu,
  Copy,
  Check,
  Download,
  RefreshCw,
  StopCircle,
  MessageCircle,
  Code2,
  Image,
  Sparkles,
  Zap,
  BookOpen,
  Lightbulb,
  ChevronDown,
  Trash2,
  FileText,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { Sidebar } from "./sidebar";
import { MarkdownRenderer } from "./markdown-renderer";
import { ModelSelector } from "./model-selector";
import { Session, Message, Mode, Settings } from "@/lib/types";
import { MODELS, MODE_SYSTEM_PROMPTS, MODE_LABELS, MODE_COLORS, DEFAULT_MODEL } from "@/lib/models";
import {
  loadSessions,
  saveSessions,
  loadSettings,
  saveSettings,
  loadActiveSessionId,
  saveActiveSessionId,
  generateId,
  estimateTokens,
  exportSessionAsMarkdown,
} from "@/lib/storage";

const WELCOME_SUGGESTIONS = [
  {
    mode: "chat" as Mode,
    icon: <MessageCircle className="w-5 h-5" />,
    title: "Chat General",
    description: "Pregúntame lo que quieras",
    prompt: "¡Hola! ¿En qué puedes ayudarme?",
  },
  {
    mode: "codigo" as Mode,
    icon: <Code2 className="w-5 h-5" />,
    title: "Programación",
    description: "Escribe y revisa código",
    prompt: "Ayúdame a crear una API REST con Node.js y Express",
  },
  {
    mode: "imagen" as Mode,
    icon: <Image className="w-5 h-5" />,
    title: "Generar Imagen",
    description: "Crea imágenes con IA",
    prompt: "Un atardecer en una ciudad futurista con rascacielos de cristal",
  },
];

const SLASH_COMMANDS = [
  { cmd: "/ayuda", desc: "Mostrar comandos disponibles" },
  { cmd: "/limpiar", desc: "Limpiar chat actual" },
  { cmd: "/modelo [id]", desc: "Cambiar modelo de IA" },
  { cmd: "/modo [chat|codigo|imagen]", desc: "Cambiar modo de conversación" },
  { cmd: "/exportar", desc: "Exportar conversación como Markdown" },
  { cmd: "/pensar", desc: "Activar/desactivar pensamiento extendido" },
  { cmd: "/revisar", desc: "Activar modo revisión de código" },
  { cmd: "/planear", desc: "Activar modo planificación" },
];

export function ChatApp() {
  // State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<Mode>("chat");
  const [currentModel, setCurrentModel] = useState(DEFAULT_MODEL);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settings, setSettings] = useState<Settings>({
    defaultModel: DEFAULT_MODEL,
    defaultMode: "chat",
    extendedThinking: false,
    codeReview: false,
    planningMode: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Computed
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const messages = activeSession?.messages || [];

  // Load from storage
  useEffect(() => {
    const loadedSessions = loadSessions();
    const loadedSettings = loadSettings();
    const loadedActiveId = loadActiveSessionId();

    setSessions(loadedSessions);
    setSettings(loadedSettings);
    setCurrentModel(loadedSettings.defaultModel);
    setCurrentMode(loadedSettings.defaultMode);

    if (loadedActiveId && loadedSessions.find((s) => s.id === loadedActiveId)) {
      setActiveSessionId(loadedActiveId);
    }

    // On mobile, sidebar closed by default
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  // Save sessions when changed
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  // Save active session id
  useEffect(() => {
    saveActiveSessionId(activeSessionId);
  }, [activeSessionId]);

  // Save settings when changed
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Auto scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  // Create new session
  const createNewSession = useCallback(
    (mode?: Mode) => {
      const newSession: Session = {
        id: generateId(),
        title: "Nueva conversación",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mode: mode || currentMode,
        model: currentModel,
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      return newSession.id;
    },
    [currentMode, currentModel]
  );

  // Update session
  const updateSession = useCallback(
    (sessionId: string, updates: Partial<Session>) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, ...updates, updatedAt: Date.now() } : s
        )
      );
    },
    []
  );

  // Handle send message
  const sendMessage = useCallback(
    async (content: string, targetSessionId?: string) => {
      if (!content.trim() || isStreaming) return;

      // Check for slash commands
      if (content.trim().startsWith("/")) {
        handleSlashCommand(content.trim());
        return;
      }

      let sessionId = targetSessionId || activeSessionId;

      // Create session if none active
      if (!sessionId) {
        sessionId = createNewSession(currentMode);
      }

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };

      // Add user message
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === sessionId) {
            const updated = {
              ...s,
              messages: [...s.messages, userMessage],
              updatedAt: Date.now(),
            };
            // Auto-title from first message
            if (s.messages.length === 0) {
              updated.title =
                content.trim().substring(0, 50) +
                (content.trim().length > 50 ? "..." : "");
            }
            return updated;
          }
          return s;
        })
      );

      setInputValue("");

      // Image generation mode
      if (currentMode === "imagen") {
        await generateImage(content.trim(), sessionId!);
        return;
      }

      // Chat/Code mode - stream response
      setIsStreaming(true);
      setStreamingContent("");

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const session = sessions.find((s) => s.id === sessionId) || activeSession;
        const previousMessages = (session?.messages || [])
          .concat(userMessage)
          .filter((m) => m.role !== "system" && !m.isImage)
          .map((m) => ({ role: m.role, content: m.content }));

        let systemSuffix = "";
        if (settings.extendedThinking) {
          systemSuffix +=
            "\n\nPor favor, piensa paso a paso antes de responder. Muestra tu razonamiento detallado.";
        }
        if (settings.codeReview && currentMode === "codigo") {
          systemSuffix +=
            "\n\nEstás en modo revisión de código. Analiza el código del usuario buscando: bugs, vulnerabilidades de seguridad, problemas de rendimiento, mala prácticas y sugerencias de mejora. Sé exhaustivo.";
        }
        if (settings.planningMode) {
          systemSuffix +=
            "\n\nEstás en modo planificación. Ayuda al usuario a crear un plan detallado paso a paso para su proyecto o tarea. Incluye estimaciones de tiempo y dependencias.";
        }

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: previousMessages,
            model: currentModel,
            mode: currentMode,
            systemSuffix: systemSuffix || undefined,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No se pudo leer la respuesta");

        let fullContent = "";
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          setStreamingContent(fullContent);
        }

        // Add assistant message
        const assistantMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: fullContent,
          timestamp: Date.now(),
        };

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === sessionId) {
              return {
                ...s,
                messages: [...s.messages, userMessage, assistantMessage],
                updatedAt: Date.now(),
              };
            }
            return s;
          })
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // User cancelled
          if (streamingContent) {
            const partialMessage: Message = {
              id: generateId(),
              role: "assistant",
              content: streamingContent + "\n\n*[Generación cancelada]*",
              timestamp: Date.now(),
            };
            setSessions((prev) =>
              prev.map((s) => {
                if (s.id === sessionId) {
                  return {
                    ...s,
                    messages: [...s.messages, userMessage, partialMessage],
                    updatedAt: Date.now(),
                  };
                }
                return s;
              })
            );
          }
          toast.info("Generación cancelada");
        } else {
          const errorMessage =
            err instanceof Error ? err.message : "Error desconocido";
          toast.error(`Error: ${errorMessage}`);

          // Add error message
          const errMessage: Message = {
            id: generateId(),
            role: "assistant",
            content: `⚠️ Error: ${errorMessage}. Por favor, intenta de nuevo.`,
            timestamp: Date.now(),
          };
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === sessionId) {
                return {
                  ...s,
                  messages: [...s.messages, userMessage, errMessage],
                  updatedAt: Date.now(),
                };
              }
              return s;
            })
          );
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortControllerRef.current = null;
      }
    },
    [
      activeSessionId,
      activeSession,
      currentMode,
      currentModel,
      isStreaming,
      sessions,
      settings,
      createNewSession,
      streamingContent,
    ]
  );

  // Generate image
  const generateImage = useCallback(
    async (prompt: string, sessionId: string) => {
      setIsStreaming(true);
      setStreamingContent("");

      try {
        const response = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, size: "1024x1024" }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const imageMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: `🖼️ Imagen generada para: "${prompt}"`,
          timestamp: Date.now(),
          isImage: true,
          imageData: data.imageData,
        };

        // Re-read current sessions to get the latest
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === sessionId) {
              const existing = s.messages;
              return {
                ...s,
                messages: [...existing, imageMessage],
                updatedAt: Date.now(),
              };
            }
            return s;
          })
        );

        toast.success("Imagen generada correctamente");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error generando imagen";
        toast.error(`Error: ${errorMessage}`);

        const errMsg: Message = {
          id: generateId(),
          role: "assistant",
          content: `⚠️ No se pudo generar la imagen: ${errorMessage}`,
          timestamp: Date.now(),
        };
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === sessionId) {
              return {
                ...s,
                messages: [...s.messages, errMsg],
                updatedAt: Date.now(),
              };
            }
            return s;
          })
        );
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
      }
    },
    []
  );

  // Slash commands
  const handleSlashCommand = useCallback(
    (input: string) => {
      setInputValue("");
      const parts = input.split(" ");
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1).join(" ");

      switch (cmd) {
        case "/ayuda":
          toast.info(
            <div className="space-y-1">
              <p className="font-semibold text-sm">Comandos disponibles:</p>
              {SLASH_COMMANDS.map((c) => (
                <p key={c.cmd} className="text-xs">
                  <code className="text-[#e91e63]">{c.cmd}</code> — {c.desc}
                </p>
              ))}
            </div>,
            { duration: 8000 }
          );
          break;

        case "/limpiar":
          if (activeSessionId) {
            updateSession(activeSessionId, { messages: [] });
            toast.success("Chat limpiado");
          }
          break;

        case "/modelo":
          if (args) {
            const model = MODELS.find(
              (m) => m.id === args || m.name.toLowerCase() === args.toLowerCase()
            );
            if (model) {
              setCurrentModel(model.id);
              toast.success(`Modelo cambiado a ${model.name}`);
            } else {
              toast.error(
                `Modelo no encontrado. Disponibles: ${MODELS.map((m) => m.id).join(", ")}`
              );
            }
          } else {
            toast.info(
              `Modelo actual: ${currentModel}. Uso: /modelo [${MODELS.map((m) => m.id).join("|")}]`
            );
          }
          break;

        case "/modo":
          if (args) {
            const modeMap: Record<string, Mode> = {
              chat: "chat",
              codigo: "codigo",
              imagen: "imagen",
              code: "codigo",
              image: "imagen",
            };
            const mode = modeMap[args.toLowerCase()];
            if (mode) {
              setCurrentMode(mode);
              toast.success(`Modo cambiado a ${MODE_LABELS[mode]}`);
            } else {
              toast.error("Modos disponibles: chat, codigo, imagen");
            }
          } else {
            toast.info(
              `Modo actual: ${MODE_LABELS[currentMode]}. Uso: /modo [chat|codigo|imagen]`
            );
          }
          break;

        case "/exportar":
          if (activeSession) {
            exportSessionAsMarkdown(activeSession);
            toast.success("Conversación exportada");
          } else {
            toast.error("No hay conversación activa");
          }
          break;

        case "/pensar":
          setSettings((prev) => {
            const next = { ...prev, extendedThinking: !prev.extendedThinking };
            toast.success(
              `Pensamiento extendido ${next.extendedThinking ? "activado" : "desactivado"}`
            );
            return next;
          });
          break;

        case "/revisar":
          setSettings((prev) => {
            const next = { ...prev, codeReview: !prev.codeReview };
            toast.success(
              `Revisión de código ${next.codeReview ? "activada" : "desactivada"}`
            );
            return next;
          });
          break;

        case "/planear":
          setSettings((prev) => {
            const next = { ...prev, planningMode: !prev.planningMode };
            toast.success(
              `Modo planificación ${next.planningMode ? "activado" : "desactivado"}`
            );
            return next;
          });
          break;

        default:
          toast.error(`Comando desconocido: ${cmd}. Escribe /ayuda para ver los comandos.`);
      }
    },
    [activeSessionId, activeSession, currentModel, currentMode, updateSession]
  );

  // Regenerate last response
  const regenerateLastResponse = useCallback(() => {
    if (!activeSession || isStreaming) return;
    const msgs = activeSession.messages;
    if (msgs.length < 2) return;

    // Find last user message
    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return;

    const lastUserMsg = msgs[lastUserIdx];

    // Remove messages after and including the last assistant response
    const trimmedMessages = msgs.slice(0, lastUserIdx);
    updateSession(activeSession.id, { messages: trimmedMessages });

    // Resend
    setTimeout(() => {
      sendMessage(lastUserMsg.content, activeSession.id);
    }, 100);
  }, [activeSession, isStreaming, sendMessage, updateSession]);

  // Abort streaming
  const abortStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Copy message
  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast.success("Copiado al portapapeles");
    });
  }, []);

  // Download message
  const downloadMessage = useCallback((content: string, index: number) => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mensaje_${index + 1}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Download image
  const downloadImage = useCallback((imageData: string, index: number) => {
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${imageData}`;
    a.download = `imagen_${index + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // Handle mode change
  const handleModeChange = useCallback((mode: Mode) => {
    setCurrentMode(mode);
    if (activeSessionId) {
      updateSession(activeSessionId, { mode });
    }
  }, [activeSessionId, updateSession]);

  // Handle model change
  const handleModelChange = useCallback(
    (modelId: string) => {
      setCurrentModel(modelId);
      if (activeSessionId) {
        updateSession(activeSessionId, { model: modelId });
      }
    },
    [activeSessionId, updateSession]
  );

  // Delete session
  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
      toast.success("Conversación eliminada");
    },
    [activeSessionId]
  );

  // Key handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  // Token count
  const totalTokens = messages.reduce(
    (acc, m) => acc + estimateTokens(m.content),
    0
  );

  return (
    <div className="h-screen flex bg-[#09090b] text-white overflow-hidden">
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: "#1a1a2e",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "white",
          },
        }}
      />

      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        currentMode={currentMode}
        currentModel={currentModel}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          const session = sessions.find((s) => s.id === id);
          if (session) {
            setCurrentMode(session.mode);
            setCurrentModel(session.model);
          }
          if (window.innerWidth < 1024) setSidebarOpen(false);
        }}
        onNewSession={() => createNewSession()}
        onDeleteSession={deleteSession}
        onModeChange={handleModeChange}
        onModelChange={handleModelChange}
        extendedThinking={settings.extendedThinking}
        onToggleThinking={() =>
          setSettings((p) => ({ ...p, extendedThinking: !p.extendedThinking }))
        }
        codeReview={settings.codeReview}
        onToggleCodeReview={() =>
          setSettings((p) => ({ ...p, codeReview: !p.codeReview }))
        }
        planningMode={settings.planningMode}
        onTogglePlanning={() =>
          setSettings((p) => ({ ...p, planningMode: !p.planningMode }))
        }
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] glass-light">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-white/50 hover:text-white/80"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: MODE_COLORS[currentMode] }}
              />
              <span className="text-sm font-medium text-white/70">
                {MODE_LABELS[currentMode]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ModelSelector
              selectedModel={currentModel}
              onModelChange={handleModelChange}
            />
            {totalTokens > 0 && (
              <span className="text-[10px] text-white/25 px-2">
                ~{totalTokens} tokens
              </span>
            )}
          </div>
        </header>

        {/* Chat messages */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto min-h-0"
        >
          {messages.length === 0 && !isStreaming ? (
            /* Welcome screen */
            <WelcomeScreen
              currentMode={currentMode}
              onSuggestionClick={(prompt, mode) => {
                if (mode !== currentMode) {
                  handleModeChange(mode);
                }
                const sid = activeSessionId || createNewSession(mode);
                setTimeout(() => sendMessage(prompt, sid), 50);
              }}
              onSendMessage={(prompt) => sendMessage(prompt)}
            />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-1">
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  index={idx}
                  onCopy={copyMessage}
                  onDownload={downloadMessage}
                  onDownloadImage={downloadImage}
                />
              ))}

              {/* Streaming content */}
              {isStreaming && streamingContent && (
                <div className="flex gap-3 py-4">
                  <div className="w-7 h-7 rounded-lg bg-[#e91e63]/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#e91e63]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="typing-cursor">
                      <MarkdownRenderer content={streamingContent} />
                    </div>
                  </div>
                </div>
              )}

              {/* Image loading */}
              {isStreaming && currentMode === "imagen" && !streamingContent && (
                <div className="flex gap-3 py-4">
                  <div className="w-7 h-7 rounded-lg bg-[#f59e0b]/20 flex items-center justify-center flex-shrink-0 mt-1 animate-pulse-brand">
                    <Image className="w-3.5 h-3.5 text-[#f59e0b]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-[#e91e63]/30 border-t-[#e91e63] rounded-full animate-spin" />
                      <span className="text-sm text-white/50">
                        Generando imagen...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat loading (non-image, no content yet) */}
              {isStreaming && currentMode !== "imagen" && !streamingContent && (
                <div className="flex gap-3 py-4">
                  <div className="w-7 h-7 rounded-lg bg-[#e91e63]/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#e91e63] animate-pulse-brand" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e91e63]/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e91e63]/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e91e63]/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-white/30">Pensando...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-white/[0.06] p-4">
          <div className="max-w-3xl mx-auto">
            {/* Action buttons row */}
            {messages.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                {isStreaming ? (
                  <button
                    onClick={abortStreaming}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    Detener
                  </button>
                ) : (
                  <>
                    {messages.length >= 2 && (
                      <button
                        onClick={regenerateLastResponse}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/70 text-xs transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Regenerar
                      </button>
                    )}
                    {activeSessionId && (
                      <button
                        onClick={() => {
                          updateSession(activeSessionId, { messages: [] });
                          toast.success("Chat limpiado");
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/70 text-xs transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Limpiar
                      </button>
                    )}
                    {activeSession && (
                      <button
                        onClick={() => {
                          exportSessionAsMarkdown(activeSession);
                          toast.success("Exportado");
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/70 text-xs transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Exportar
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Input box */}
            <div className="relative flex items-end gap-2 p-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] focus-within:border-[#e91e63]/30 focus-within:ring-1 focus-within:ring-[#e91e63]/20 transition-all">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  currentMode === "imagen"
                    ? "Describe la imagen que quieres generar..."
                    : currentMode === "codigo"
                    ? "Escribe tu consulta de programación..."
                    : "Escribe un mensaje... (/ para comandos)"
                }
                rows={1}
                disabled={isStreaming}
                className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/25 px-3 py-2 focus:outline-none resize-none disabled:opacity-50 max-h-[200px]"
              />
              <button
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || isStreaming}
                className="p-2.5 rounded-xl bg-[#e91e63] hover:bg-[#d81b60] text-white transition-all disabled:opacity-30 disabled:hover:bg-[#e91e63] flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Slash command hint */}
            {inputValue.startsWith("/") && !inputValue.includes(" ") && (
              <div className="mt-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                  Comandos
                </div>
                {SLASH_COMMANDS.filter((c) =>
                  c.cmd.startsWith(inputValue.toLowerCase())
                ).map((c) => (
                  <button
                    key={c.cmd}
                    onClick={() => setInputValue(c.cmd + " ")}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.04] text-left transition-colors"
                  >
                    <code className="text-xs text-[#e91e63]">{c.cmd}</code>
                    <span className="text-xs text-white/40">{c.desc}</span>
                  </button>
                ))}
              </div>
            )}

            <p className="text-center text-[10px] text-white/15 mt-2">
              HJ-CodingIA puede cometer errores. Verifica la información importante.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Welcome Screen */
function WelcomeScreen({
  currentMode,
  onSuggestionClick,
  onSendMessage,
}: {
  currentMode: Mode;
  onSuggestionClick: (prompt: string, mode: Mode) => void;
  onSendMessage: (prompt: string) => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#e91e63] to-[#c2185b] flex items-center justify-center glow-brand mb-4">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">HJ-CodingIA</h1>
          <p className="text-white/40 text-sm">
            Tu asistente de inteligencia artificial avanzado
          </p>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8"
        >
          {WELCOME_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.mode}
              onClick={() =>
                onSuggestionClick(suggestion.prompt, suggestion.mode)
              }
              className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all text-left"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                style={{
                  backgroundColor: `${MODE_COLORS[suggestion.mode]}15`,
                  color: MODE_COLORS[suggestion.mode],
                }}
              >
                {suggestion.icon}
              </div>
              <div>
                <div className="text-sm font-medium text-white/80">
                  {suggestion.title}
                </div>
                <div className="text-xs text-white/30 mt-0.5">
                  {suggestion.description}
                </div>
              </div>
            </button>
          ))}
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {[
            { icon: <Zap className="w-3 h-3" />, text: "6 modelos GLM" },
            { icon: <Code2 className="w-3 h-3" />, text: "Modo código" },
            { icon: <Image className="w-3 h-3" />, text: "Generación de imágenes" },
            { icon: <BookOpen className="w-3 h-3" />, text: "Markdown avanzado" },
            { icon: <Lightbulb className="w-3 h-3" />, text: "Pensamiento extendido" },
          ].map((feature) => (
            <span
              key={feature.text}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.04] text-[10px] text-white/30"
            >
              {feature.icon}
              {feature.text}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

/* Message Bubble */
function MessageBubble({
  message,
  index,
  onCopy,
  onDownload,
  onDownloadImage,
}: {
  message: Message;
  index: number;
  onCopy: (content: string) => void;
  onDownload: (content: string, index: number) => void;
  onDownloadImage: (imageData: string, index: number) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = () => {
    onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`group flex gap-3 py-4 ${
        isUser ? "flex-row-reverse" : ""
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 ${
          isUser
            ? "bg-white/[0.08]"
            : message.isImage
            ? "bg-[#f59e0b]/20"
            : "bg-[#e91e63]/20"
        }`}
      >
        {isUser ? (
          <span className="text-xs font-bold text-white/60">T</span>
        ) : message.isImage ? (
          <Image className="w-3.5 h-3.5 text-[#f59e0b]" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-[#e91e63]" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isUser ? "text-right" : ""}`}>
        {/* Label */}
        <div
          className={`text-[10px] text-white/25 mb-1 ${
            isUser ? "text-right" : ""
          }`}
        >
          {isUser ? "Tú" : "HJ-CodingIA"} ·{" "}
          {new Date(message.timestamp).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        {/* Message content */}
        <div
          className={`inline-block max-w-full text-left ${
            isUser
              ? "bg-white/[0.06] rounded-2xl rounded-tr-md px-4 py-2.5"
              : ""
          }`}
        >
          {message.isImage && message.imageData ? (
            <div className="space-y-2">
              <p className="text-sm text-white/60">{message.content}</p>
              <div className="relative group/img inline-block">
                <img
                  src={`data:image/png;base64,${message.imageData}`}
                  alt={message.content}
                  className="max-w-full rounded-xl border border-white/[0.06] shadow-lg"
                  style={{ maxHeight: "400px" }}
                />
                <button
                  onClick={() => onDownloadImage(message.imageData!, index)}
                  className="absolute bottom-2 right-2 p-2 rounded-lg bg-black/60 text-white/70 hover:text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : isUser ? (
            <p className="text-sm text-white/90 whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>

        {/* Actions */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`flex items-center gap-1 mt-1 ${
                isUser ? "justify-end" : ""
              }`}
            >
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-white/[0.06] text-white/20 hover:text-white/50 transition-colors"
                title="Copiar"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
              {!isUser && (
                <button
                  onClick={() => onDownload(message.content, index)}
                  className="p-1 rounded hover:bg-white/[0.06] text-white/20 hover:text-white/50 transition-colors"
                  title="Descargar"
                >
                  <Download className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
