"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  Send, Loader2, Menu, Sparkles, Copy, Check,
  Download, RefreshCw, Bot, Code2, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "./markdown-renderer";
import { Sidebar } from "./sidebar";
import {
  type Message, type ChatSession, type AIMode, SLASH_COMMANDS, AVAILABLE_MODELS,
  SYSTEM_PROMPTS, getProviderForModel, generateId, estimateTokens, exportToMarkdown,
  saveSessionsToStorage, loadSessionsFromStorage,
  saveActiveSession, loadActiveSession,
  saveModel, loadModel,
  saveMode, loadMode,
} from "@/lib/chat";

export function HJCodingIAApp() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState("minimax-free");
  const [aiMode, setAiMode] = useState<AIMode>("chat");
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [messageAnimations, setMessageAnimations] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages || [];
  const totalTokens = messages.reduce((acc, m) => acc + estimateTokens(m.content), 0);
  const currentModelInfo = AVAILABLE_MODELS.find((m) => m.id === currentModel);

  // ─── Load from localStorage ───
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const savedSessions = loadSessionsFromStorage();
    const savedActive = loadActiveSession();
    const savedModel = loadModel();
    const savedMode = loadMode();
    if (savedSessions.length > 0) {
      setSessions(savedSessions);
      if (savedActive && savedSessions.some(s => s.id === savedActive)) {
        setActiveSessionId(savedActive);
      } else {
        setActiveSessionId(savedSessions[0].id);
      }
    }
    if (savedModel && AVAILABLE_MODELS.some(m => m.id === savedModel)) {
      setCurrentModel(savedModel);
    }
    setAiMode(savedMode);
  }, []);

  // ─── Save to localStorage ───
  useEffect(() => { if (sessions.length > 0) saveSessionsToStorage(sessions); }, [sessions]);
  useEffect(() => { saveActiveSession(activeSessionId); }, [activeSessionId]);
  useEffect(() => { saveModel(currentModel); }, [currentModel]);
  useEffect(() => { saveMode(aiMode); }, [aiMode]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, streamingContent, scrollToBottom]);

  const createNewSession = useCallback(() => {
    const id = generateId();
    const session: ChatSession = { id, title: "Nueva conversación", messages: [], createdAt: Date.now(), updatedAt: Date.now(), model: currentModel, mode: aiMode };
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(id);
    setStreamingContent("");
  }, [currentModel, aiMode]);

  useEffect(() => { if (sessions.length === 0) createNewSession(); }, [sessions.length, createNewSession]);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => { const next = prev.filter((s) => s.id !== id); saveSessionsToStorage(next); return next; });
    if (activeSessionId === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
      if (remaining.length === 0) createNewSession();
    }
  }, [activeSessionId, sessions, createNewSession]);

  const addMessage = useCallback((role: Message["role"], content: string) => {
    if (!activeSessionId) return;
    const msgId = generateId();
    const msg: Message = { id: msgId, role, content, timestamp: Date.now() };
    setMessageAnimations((prev) => new Set(prev).add(msgId));
    setSessions((prev) => prev.map((s) => {
      if (s.id !== activeSessionId) return s;
      const updated = { ...s, messages: [...s.messages, msg], updatedAt: Date.now() };
      if (s.title === "Nueva conversación" && role === "user" && s.messages.length === 0) {
        updated.title = content.length > 35 ? content.slice(0, 35) + "..." : content;
      }
      return updated;
    }));
    setTimeout(() => { setMessageAnimations((prev) => { const next = new Set(prev); next.delete(msgId); return next; }); }, 500);
  }, [activeSessionId]);

  const handleSlashCommand = useCallback((cmd: string) => {
    const parts = cmd.trim().split(" ");
    const command = parts[0].toLowerCase();
    switch (command) {
      case "/ayuda":
        addMessage("assistant", `## Comandos disponibles\n\n${SLASH_COMMANDS.map((c) => `- **${c.name}** — ${c.desc}`).join("\n")}\n\nEscribe cualquier comando para usarlo.`);
        break;
      case "/limpiar":
        setSessions((prev) => prev.map((s) => s.id === activeSessionId ? { ...s, messages: [] } : s));
        break;
      case "/modelo": {
        const modelName = parts[1];
        if (modelName && AVAILABLE_MODELS.some((m) => m.id === modelName)) {
          setCurrentModel(modelName);
          addMessage("assistant", `Modelo cambiado a **${AVAILABLE_MODELS.find((m) => m.id === modelName)?.name}**.`);
        } else {
          addMessage("assistant", `## Modelos disponibles\n\n${AVAILABLE_MODELS.map((m) => `- **${m.name}** (\`${m.id}\`) — ${m.description}`).join("\n")}\n\nUsa \`/modelo <id>\` para cambiar.`);
        }
        break;
      }
      case "/modo": {
        const newMode = parts[1];
        if (newMode === 'chat' || newMode === 'codigo' || newMode === 'code') {
          const m = newMode === 'chat' ? 'chat' : 'code';
          setAiMode(m);
          addMessage("assistant", `Modo cambiado a **${m === 'chat' ? 'Chat (texto simple)' : 'Código (programación)'}**.`);
        } else {
          addMessage("assistant", `Usa \`/modo chat\` para texto simple o \`/modo codigo\` para programación.`);
        }
        break;
      }
      case "/exportar": {
        const md = exportToMarkdown(messages);
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `hj-ia-sesion-${Date.now()}.md`; a.click();
        URL.revokeObjectURL(url);
        addMessage("assistant", "Sesión exportada como archivo Markdown.");
        break;
      }
      case "/pensar":
        setThinkingEnabled((prev) => !prev);
        addMessage("assistant", `Pensamiento extendido ${thinkingEnabled ? "desactivado" : "activado"}.`);
        break;
      case "/revisar":
        addMessage("assistant", "Modo revisión activado. Pega tu código y haré una revisión completa.");
        break;
      case "/planear":
        addMessage("assistant", "Modo planificación activado. Describe lo que quieres construir y crearé un plan detallado.");
        break;
      default:
        addMessage("assistant", `Comando desconocido: **${command}**. Escribe \`/ayuda\` para ver los comandos disponibles.`);
    }
  }, [activeSessionId, addMessage, currentModel, messages, thinkingEnabled]);

  const sendMessage = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    if (trimmed.startsWith("/")) { handleSlashCommand(trimmed); setInputValue(""); setShowCommands(false); return; }

    addMessage("user", trimmed);
    setInputValue(""); setShowCommands(false); setIsLoading(true); setStreamingContent("");

    const chatMessages = [
      ...messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: trimmed },
    ];

    let systemSuffix = "";
    if (thinkingEnabled) systemSuffix += "\n\nPiensa paso a paso antes de responder. Muestra tu proceso de razonamiento.";

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatMessages, model: currentModel, systemSuffix, mode: aiMode }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error del servidor: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Sin respuesta del stream");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        setStreamingContent(fullContent);
      }

      if (fullContent.trim()) addMessage("assistant", fullContent);
      else addMessage("assistant", "No se recibió respuesta. Intenta de nuevo.");
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        if (streamingContent.trim()) addMessage("assistant", streamingContent);
      } else {
        const errMsg = error instanceof Error ? error.message : "Error desconocido";
        addMessage("assistant", `## Error\n\n\`${errMsg}\`\n\nIntenta de nuevo o cambia de modelo.`);
      }
    } finally {
      setIsLoading(false); setStreamingContent(""); abortControllerRef.current = null;
    }
  }, [inputValue, isLoading, addMessage, messages, thinkingEnabled, currentModel, aiMode, handleSlashCommand, streamingContent]);

  const regenerateLastMessage = useCallback(async () => {
    if (isLoading || messages.length < 2) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;
    setSessions((prev) => prev.map((s) => {
      if (s.id !== activeSessionId) return s;
      const msgs = [...s.messages];
      if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") msgs.pop();
      return { ...s, messages: msgs, updatedAt: Date.now() };
    }));
    setInputValue(lastUserMsg.content);
    setTimeout(() => { setInputValue(lastUserMsg.content); }, 0);
  }, [isLoading, messages, activeSessionId]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value); setShowCommands(value.startsWith("/"));
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  const handleCopy = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); });
  }, []);

  const filteredCommands = showCommands ? SLASH_COMMANDS.filter((c) => c.name.toLowerCase().startsWith(inputValue.toLowerCase())) : [];
  const inputTokenCount = estimateTokens(inputValue);

  const chatQuickActions = [
    { icon: "💬", title: "Preguntar", desc: "Hazme cualquier pregunta", prompt: "¿Quién ganó el mundial de 2022?" },
    { icon: "✍️", title: "Escribir", desc: "Redactar textos", prompt: "Ayúdame a escribir un correo profesional para solicitar un aumento de sueldo" },
    { icon: "🧠", title: "Analizar", desc: "Razonar y analizar", prompt: "Explícame las ventajas y desventajas de la inteligencia artificial en la educación" },
    { icon: "🌍", title: "Traducir", desc: "Traducir textos", prompt: "Traduce al inglés: Buenos días, me gustaría agendar una reunión para la próxima semana" },
  ];

  const codeQuickActions = [
    { icon: "💻", title: "Crear app", desc: "Construir una aplicación", prompt: "Ayúdame a crear una API REST con Node.js y Express que maneje usuarios y autenticación" },
    { icon: "🐛", title: "Debuggear", desc: "Encontrar errores", prompt: "Mi código da un error 'Cannot read property of undefined', ¿cómo lo soluciono?" },
    { icon: "🏗️", title: "Arquitectura", desc: "Diseñar sistemas", prompt: "Diseña la arquitectura de un sistema de e-commerce con microservicios" },
    { icon: "🧪", title: "Testing", desc: "Escribir tests", prompt: "Escribe tests unitarios completos para una función que valida emails" },
  ];

  const quickActions = aiMode === 'chat' ? chatQuickActions : codeQuickActions;
  const modeLabel = aiMode === 'chat' ? 'Chat' : 'Código';
  const ModeIcon = aiMode === 'chat' ? MessageCircle : Code2;

  return (
    <div className="h-screen flex bg-[#030303] overflow-hidden">
      <Sidebar
        sessions={sessions} activeSessionId={activeSessionId} currentModel={currentModel}
        totalTokens={totalTokens} thinkingEnabled={thinkingEnabled} aiMode={aiMode}
        onSelectSession={setActiveSessionId} onNewSession={createNewSession}
        onDeleteSession={deleteSession} onModelChange={setCurrentModel}
        onThinkingToggle={() => setThinkingEnabled((p) => !p)}
        onModeChange={setAiMode}
        isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#080808]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-white/[0.06] text-neutral-500 hover:text-white transition-all">
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#e91e63]/15 flex items-center justify-center">
                <ModeIcon className="w-3.5 h-3.5 text-[#e91e63]" />
              </div>
              <span className="text-sm font-medium text-neutral-300">{activeSession?.title || `HJ IA — ${modeLabel}`}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center bg-white/[0.04] rounded-lg border border-white/[0.06] p-0.5">
              <button onClick={() => setAiMode('chat')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${aiMode === 'chat' ? 'bg-[#e91e63]/15 text-[#e91e63] border border-[#e91e63]/20' : 'text-neutral-500 hover:text-neutral-300 border border-transparent'}`}>
                <MessageCircle className="w-3 h-3" /> Chat
              </button>
              <button onClick={() => setAiMode('code')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${aiMode === 'code' ? 'bg-[#e91e63]/15 text-[#e91e63] border border-[#e91e63]/20' : 'text-neutral-500 hover:text-neutral-300 border border-transparent'}`}>
                <Code2 className="w-3 h-3" /> Código
              </button>
            </div>
            <Badge variant="outline" className="text-[10px] border-white/[0.08] text-neutral-400 bg-white/[0.02]">{currentModelInfo?.name}</Badge>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center px-6 relative">
              <div className="absolute inset-0 grid-bg opacity-30" />
              <div className="glow-orb w-72 h-72 bg-[#e91e63] top-1/4 left-1/3" />
              <div className="glow-orb w-56 h-56 bg-[#e91e63] bottom-1/3 right-1/4" />
              <div className="relative z-10 flex flex-col items-center max-w-2xl w-full">
                <div className="relative mb-6">
                  <div className="absolute -inset-6 bg-[#e91e63]/8 rounded-full blur-3xl animate-pulse-glow" />
                  <img src="/hj-codingia-logo.png" alt="HJ IA" className="relative w-20 h-20 animate-float drop-shadow-[0_0_25px_rgba(233,30,99,0.25)]" />
                </div>
                <h2 className="text-3xl font-bold mb-2">Hola, soy <span className="text-gradient">HJ IA</span></h2>
                <p className="text-neutral-500 text-sm text-center max-w-md mb-2 leading-relaxed">
                  {aiMode === 'chat'
                    ? 'Tu asistente de IA para todo. Pregunta lo que quieras — curiosidades, textos, análisis, conversación.'
                    : 'Tu asistente de programación. Escribe código, debuggea, diseña arquitectura — todo lo que necesites.'}
                </p>
                <div className="flex items-center gap-2 mb-6">
                  <Badge variant="outline" className="text-[10px] border-[#e91e63]/20 text-[#e91e63]/80 bg-[#e91e63]/5">
                    <ModeIcon className="w-3 h-3 mr-1" /> {modeLabel}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-white/[0.08] text-neutral-500 bg-white/[0.02]">
                    {currentModelInfo?.name}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2.5 w-full max-w-lg">
                  {quickActions.map((item) => (
                    <button key={item.title} onClick={() => { setInputValue(item.prompt); inputRef.current?.focus(); }} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#e91e63]/25 hover:bg-[#e91e63]/5 transition-all text-left group">
                      <span className="text-xl group-hover:scale-110 transition-transform flex-shrink-0">{item.icon}</span>
                      <div>
                        <div className="text-[13px] font-medium text-neutral-200 group-hover:text-white transition-colors">{item.title}</div>
                        <div className="text-[11px] text-neutral-600 group-hover:text-neutral-400 transition-colors">{item.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-neutral-700 mt-6 tracking-wider uppercase">Potenciado por OpenCode Zen</p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
              {messages.map((msg, index) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""} ${messageAnimations.has(msg.id) ? "animate-slide-up" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#e91e63]/10 border border-[#e91e63]/20 flex items-center justify-center mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#e91e63]" />
                    </div>
                  )}
                  <div className={`group relative max-w-[85%] rounded-2xl ${msg.role === "user" ? "bg-[#e91e63]/8 border border-[#e91e63]/15 px-4 py-2.5" : "bg-[#0a0a0a] border border-white/[0.06] px-4 py-3"}`}>
                    {msg.role === "user" ? <p className="text-sm text-neutral-200 whitespace-pre-wrap">{msg.content}</p> : <MarkdownRenderer content={msg.content} />}
                    <div className="flex items-center gap-1 mt-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleCopy(msg.id, msg.content)} className="p-1 rounded hover:bg-white/[0.06] text-neutral-600 hover:text-neutral-300 transition-all" title="Copiar">
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                      {msg.role === "assistant" && (
                        <>
                          <button onClick={() => { const blob = new Blob([msg.content], { type: "text/markdown" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `hj-ia-${msg.id}.md`; a.click(); URL.revokeObjectURL(url); }} className="p-1 rounded hover:bg-white/[0.06] text-neutral-600 hover:text-neutral-300 transition-all" title="Descargar"><Download className="w-3 h-3" /></button>
                          {index === messages.length - 1 && <button onClick={regenerateLastMessage} className="p-1 rounded hover:bg-white/[0.06] text-neutral-600 hover:text-neutral-300 transition-all" title="Regenerar"><RefreshCw className="w-3 h-3" /></button>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && streamingContent && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#e91e63]/10 border border-[#e91e63]/20 flex items-center justify-center mt-0.5"><Sparkles className="w-3.5 h-3.5 text-[#e91e63]" /></div>
                  <div className="max-w-[85%] rounded-2xl bg-[#0a0a0a] border border-white/[0.06] px-4 py-3">
                    <MarkdownRenderer content={streamingContent} />
                    <span className="inline-block w-1.5 h-4 bg-[#e91e63] animate-typing-cursor ml-0.5 align-middle" />
                  </div>
                </div>
              )}
              {isLoading && !streamingContent && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#e91e63]/10 border border-[#e91e63]/20 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-[#e91e63] animate-pulse" /></div>
                  <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 text-[#e91e63] animate-spin" /><span className="text-xs text-neutral-500">Pensando...</span></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-white/[0.06] bg-[#080808]/80 backdrop-blur-xl px-4 py-3">
          <div className="max-w-3xl mx-auto">
            {showCommands && filteredCommands.length > 0 && (
              <div className="mb-2 rounded-lg bg-[#0a0a0a] border border-white/[0.08] overflow-hidden animate-fade-in">
                {filteredCommands.map((cmd) => (
                  <button key={cmd.name} onClick={() => { setInputValue(cmd.name + " "); setShowCommands(false); inputRef.current?.focus(); }} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/[0.04] transition-colors text-left">
                    <code className="text-xs font-mono text-[#e91e63] bg-[#e91e63]/8 px-1.5 py-0.5 rounded">{cmd.name}</code>
                    <span className="text-xs text-neutral-500">{cmd.desc}</span>
                    <Badge variant="outline" className="text-[9px] border-white/[0.06] text-neutral-600 ml-auto">{cmd.category}</Badge>
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={sendMessage} className="relative flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef} value={inputValue} onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={aiMode === 'chat' ? "Escribe tu mensaje... ( / para comandos)" : "Describe tu código o problema... ( / para comandos)"}
                  rows={1}
                  className="w-full resize-none rounded-2xl bg-[#0a0a0a] border border-white/[0.08] focus:border-[#e91e63]/40 focus:ring-1 focus:ring-[#e91e63]/20 px-4 pr-16 py-3 text-sm text-neutral-200 placeholder:text-neutral-600 transition-all outline-none"
                  style={{ minHeight: "46px", maxHeight: "200px", height: "auto" }}
                  onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 200)}px`; }}
                  disabled={isLoading}
                />
                <div className="absolute right-3 bottom-2.5 flex items-center gap-2">
                  <span className="text-[10px] text-neutral-700 font-mono">~{inputTokenCount}</span>
                </div>
              </div>
              <Button type="submit" disabled={isLoading || !inputValue.trim()} className="bg-[#e91e63] hover:bg-[#ff2a76] text-white h-[46px] w-[46px] rounded-2xl shadow-lg shadow-[#e91e63]/20 p-0 flex items-center justify-center">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
            <div className="flex items-center justify-between mt-1.5 text-[10px] text-neutral-700">
              <div className="flex items-center gap-2">
                <ModeIcon className="w-3 h-3" />
                <span>{modeLabel} · {currentModelInfo?.name}</span>
                {thinkingEnabled && <span className="text-purple-400">🧠</span>}
              </div>
              <div className="flex items-center gap-3">
                <span>~{totalTokens.toLocaleString()} tokens</span>
                <span>{messages.length} msgs</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
