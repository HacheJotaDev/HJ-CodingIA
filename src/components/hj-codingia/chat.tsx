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
  Send, Loader2, Menu, Terminal, Sparkles, Copy, Check,
  Download, Paperclip, RefreshCw, Key, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "./markdown-renderer";
import { Sidebar } from "./sidebar";
import { ProviderBadge } from "./provider-badge";
import {
  type Message, type ChatSession, SLASH_COMMANDS, AVAILABLE_MODELS,
  PROVIDERS, getProviderForModel, generateId, estimateTokens, exportToMarkdown, isModelFree,
} from "@/lib/chat";
import { getApiKeyForProvider } from "@/lib/api-keys";

export function HJCodingIAApp() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState("minimax-free");
  const [speechMode, setSpeechMode] = useState("normal");
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [messageAnimations, setMessageAnimations] = useState<Set<string>>(new Set());
  const [apiKeyWarning, setApiKeyWarning] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages || [];
  const totalTokens = messages.reduce((acc, m) => acc + estimateTokens(m.content), 0);
  const currentModelInfo = AVAILABLE_MODELS.find((m) => m.id === currentModel);
  const currentProvider = currentModelInfo ? getProviderForModel(currentModel) : undefined;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamingContent, scrollToBottom]);

  const createNewSession = useCallback(() => {
    const id = generateId();
    const session: ChatSession = { id, title: "New Session", messages: [], createdAt: Date.now(), updatedAt: Date.now(), model: currentModel };
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(id);
    setStreamingContent("");
  }, [currentModel]);

  useEffect(() => { if (sessions.length === 0) createNewSession(); }, [sessions.length, createNewSession]);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
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
      if (s.title === "New Session" && role === "user" && s.messages.length === 0) {
        updated.title = content.length > 40 ? content.slice(0, 40) + "..." : content;
      }
      return updated;
    }));
    setTimeout(() => {
      setMessageAnimations((prev) => { const next = new Set(prev); next.delete(msgId); return next; });
    }, 600);
  }, [activeSessionId]);

  const handleSlashCommand = useCallback((cmd: string) => {
    const parts = cmd.trim().split(" ");
    const command = parts[0].toLowerCase();
    switch (command) {
      case "/help":
        addMessage("assistant", `## Available Commands\n\n${SLASH_COMMANDS.map((c) => `- **${c.name}** — ${c.desc}`).join("\n")}\n\nType any command in the input box to use it.`);
        break;
      case "/clear":
        setSessions((prev) => prev.map((s) => s.id === activeSessionId ? { ...s, messages: [] } : s));
        break;
      case "/compact": {
        const history = messages.map((m) => m.content).join("\n");
        addMessage("assistant", `## Session Compacted\n\nPrevious conversation (${estimateTokens(history).toLocaleString()} tokens) has been noted. Starting fresh with context preserved.`);
        break;
      }
      case "/model": {
        const modelName = parts[1];
        if (modelName && AVAILABLE_MODELS.some((m) => m.id === modelName)) {
          setCurrentModel(modelName);
          addMessage("assistant", `Model switched to **${AVAILABLE_MODELS.find((m) => m.id === modelName)?.name}**.`);
        } else {
          addMessage("assistant", `## Available Models\n\n${PROVIDERS.map((p) => {
            const models = AVAILABLE_MODELS.filter((m) => m.provider === p.id);
            return `### ${p.icon} ${p.name}\n${models.map((m) => `- **${m.name}** (\`${m.id}\`) — ${m.description}`).join("\n")}`;
          }).join("\n\n")}\n\nUse \`/model <id>\` to switch.`);
        }
        break;
      }
      case "/caveman": setSpeechMode("caveman"); addMessage("assistant", "🦣 Caveman mode ON. Responses compressed."); break;
      case "/rocky": setSpeechMode("rocky"); addMessage("assistant", "🪨 Rocky mode ON. Alien grammar activated."); break;
      case "/normal": setSpeechMode("normal"); addMessage("assistant", "💬 Normal mode. Standard responses restored."); break;
      case "/cost":
        addMessage("assistant", `## Session Cost Estimate\n\n- **Tokens used:** ~${totalTokens.toLocaleString()}\n- **Messages:** ${messages.length}\n- **Model:** ${currentModelInfo?.name || currentModel}\n- **Provider:** ${currentProvider?.name || "Unknown"}\n- **Speech mode:** ${speechMode}`);
        break;
      case "/export": {
        const md = exportToMarkdown(messages);
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `hj-codingia-session-${Date.now()}.md`; a.click();
        URL.revokeObjectURL(url);
        addMessage("assistant", "📥 Session exported as Markdown file.");
        break;
      }
      case "/think":
        setThinkingEnabled((prev) => !prev);
        addMessage("assistant", `🧠 Extended thinking ${thinkingEnabled ? "disabled" : "enabled"}.`);
        break;
      case "/review":
        addMessage("assistant", "🔍 Review mode activated. Paste your code and I'll perform a thorough code review covering security, performance, maintainability, and best practices.");
        break;
      case "/plan":
        addMessage("assistant", "📋 Planning mode activated. Describe what you want to build and I'll create a detailed implementation plan before writing any code.");
        break;
      case "/agents":
        addMessage("assistant", `## Available AI Agents\n\n${["- **Code Writer** — Generates and refactors code", "- **Debugger** — Diagnoses and fixes issues", "- **Architect** — Designs system architecture", "- **Reviewer** — Performs code reviews", "- **Planner** — Creates implementation plans", "- **Tester** — Generates test suites"].join("\n")}\n\nUse \`/plan\` or \`/review\` to activate specific agent modes.`);
        break;
      case "/goals":
        addMessage("assistant", "🎯 Goal tracking is available for this session. Describe what you want to accomplish and I'll help you track progress against your objectives.");
        break;
      default:
        addMessage("assistant", `Unknown command: **${command}**. Type \`/help\` to see available commands.`);
    }
  }, [activeSessionId, addMessage, currentModel, currentModelInfo, currentProvider, messages, speechMode, thinkingEnabled, totalTokens]);

  const sendMessage = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    if (trimmed.startsWith("/")) { handleSlashCommand(trimmed); setInputValue(""); setShowCommands(false); return; }

    const providerId = currentProvider?.id || "free";
    const apiKey = getApiKeyForProvider(providerId);
    const modelIsFree = isModelFree(currentModel);

    if (!apiKey && !modelIsFree) {
      setApiKeyWarning(`No API key for ${currentProvider?.name}. Switch to a free model or add your key in Settings.`);
      return;
    }

    addMessage("user", trimmed);
    setInputValue(""); setShowCommands(false); setIsLoading(true); setStreamingContent(""); setApiKeyWarning(null);

    const chatMessages = [
      ...messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: trimmed },
    ];

    let systemSuffix = "";
    if (speechMode === "caveman") systemSuffix = "\n\nIMPORTANT: Respond in caveman speech mode. Strip pleasantries, articles, transitional phrases. Use dense, telegraphic output.";
    else if (speechMode === "rocky") systemSuffix = '\n\nIMPORTANT: Respond in Rocky speech mode (from Project Hail Mary). Use distinctive pidgin English like "Yes! Good! Rocky know this!" etc.';
    if (thinkingEnabled) systemSuffix += "\n\nThink step by step before answering. Show your reasoning process.";

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages, model: currentModel, systemSuffix,
          apiKey: modelIsFree ? undefined : (apiKey || undefined),
          provider: modelIsFree ? undefined : providerId,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `API error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

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
      else addMessage("assistant", "No response received. Please try again.");
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        if (streamingContent.trim()) addMessage("assistant", streamingContent);
      } else {
        const errMsg = error instanceof Error ? error.message : "Unknown error occurred";
        addMessage("assistant", `## Error\n\n\`${errMsg}\`\n\nPlease try again. Free models work without API keys.`);
      }
    } finally {
      setIsLoading(false); setStreamingContent(""); abortControllerRef.current = null;
    }
  }, [inputValue, isLoading, addMessage, messages, speechMode, thinkingEnabled, currentModel, currentProvider, handleSlashCommand, streamingContent]);

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
    setInputValue(value); setApiKeyWarning(null); setShowCommands(value.startsWith("/"));
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  const handleCopy = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); });
  }, []);

  const filteredCommands = showCommands ? SLASH_COMMANDS.filter((c) => c.name.toLowerCase().startsWith(inputValue.toLowerCase())) : [];
  const inputTokenCount = estimateTokens(inputValue);
  const needsApiKey = !isModelFree(currentModel) && currentProvider && !currentProvider.free && !getApiKeyForProvider(currentProvider.id);

  return (
    <div className="h-screen flex bg-[#030303] overflow-hidden">
      <Sidebar sessions={sessions} activeSessionId={activeSessionId} currentModel={currentModel} totalTokens={totalTokens} speechMode={speechMode} thinkingEnabled={thinkingEnabled} onSelectSession={setActiveSessionId} onNewSession={createNewSession} onDeleteSession={deleteSession} onModelChange={setCurrentModel} onSpeechModeChange={setSpeechMode} onThinkingToggle={() => setThinkingEnabled((p) => !p)} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#080808]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-white/[0.06] text-neutral-500 hover:text-white transition-all"><Menu className="w-4 h-4" /></button>
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#e91e63]" />
              <span className="text-sm font-medium text-neutral-300">{activeSession?.title || "HJ CodingIA"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ProviderBadge modelId={currentModel} size="sm" />
            <Badge variant="outline" className="text-[10px] border-white/[0.08] text-neutral-500 bg-white/[0.02]">{currentModelInfo?.name}</Badge>
            {needsApiKey ? <div className="w-2 h-2 rounded-full bg-yellow-500" /> : <div className="w-2 h-2 rounded-full bg-green-500" />}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center px-6 relative">
              <div className="absolute inset-0 grid-bg opacity-50" />
              <div className="glow-orb w-64 h-64 bg-[#e91e63] top-1/4 left-1/3" />
              <div className="glow-orb w-48 h-48 bg-[#e91e63] bottom-1/3 right-1/4" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative mb-8">
                  <div className="absolute -inset-8 bg-[#e91e63]/10 rounded-full blur-3xl animate-pulse-glow" />
                  <img src="/hj-codingia-logo.png" alt="HJ CodingIA" className="relative w-24 h-24 animate-float drop-shadow-[0_0_30px_rgba(233,30,99,0.3)]" />
                </div>
                <h2 className="text-3xl font-bold mb-3">Welcome to <span className="text-gradient">HJ CodingIA</span></h2>
                <p className="text-neutral-500 text-sm text-center max-w-lg mb-10 leading-relaxed">Your professional AI coding assistant. Write code, debug, refactor, plan, and ship — all in your browser. No API key needed.</p>
                <div className="mb-6 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 max-w-md w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🆓</span>
                    <span className="text-sm font-medium text-green-300">100% Free — No API key needed</span>
                  </div>
                  <p className="text-xs text-green-200/60 mt-1">Powered by OpenCode Zen free models. Works like claurst — no keys, no config. Just chat and code.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
                  {[
                    { icon: "💻", title: "Build an App", desc: "Describe a web app you want to build", prompt: "Help me build a modern web application with user authentication and a dashboard" },
                    { icon: "🐛", title: "Debug Code", desc: "Paste code that needs debugging", prompt: "Help me debug this code, it's throwing an error" },
                    { icon: "🏗️", title: "Architecture", desc: "Design system architecture", prompt: "Design a microservices architecture for an e-commerce application" },
                    { icon: "🧪", title: "Write Tests", desc: "Generate test suites", prompt: "Write comprehensive unit tests for my API endpoints" },
                  ].map((item) => (
                    <button key={item.title} onClick={() => { setInputValue(item.prompt); inputRef.current?.focus(); }} className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#e91e63]/30 hover:bg-[#e91e63]/5 transition-all text-left group border-glow">
                      <span className="text-2xl group-hover:scale-110 transition-transform flex-shrink-0 mt-0.5">{item.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">{item.title}</div>
                        <div className="text-[11px] text-neutral-600 group-hover:text-neutral-400 transition-colors mt-0.5">{item.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-neutral-700 mt-8 tracking-wider uppercase">Powered by OpenCode Zen • Free AI • No API key needed</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg, index) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""} ${messageAnimations.has(msg.id) ? "animate-slide-up" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#e91e63]/10 border border-[#e91e63]/20 flex items-center justify-center mt-1">
                      <Sparkles className="w-4 h-4 text-[#e91e63]" />
                    </div>
                  )}
                  <div className={`group relative max-w-[85%] rounded-xl ${msg.role === "user" ? "bg-[#e91e63]/10 border border-l-2 border-l-[#e91e63]/40 border-r-white/[0.06] border-t-white/[0.06] border-b-white/[0.06] px-4 py-3" : "bg-[#0a0a0a] border border-white/[0.06] px-5 py-4"}`}>
                    {msg.role === "user" ? <p className="text-sm text-neutral-200 whitespace-pre-wrap">{msg.content}</p> : <MarkdownRenderer content={msg.content} />}
                    <div className="flex items-center gap-1 mt-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleCopy(msg.id, msg.content)} className="p-1 rounded hover:bg-white/[0.06] text-neutral-600 hover:text-neutral-300 transition-all" title="Copy">
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                      {msg.role === "assistant" && (
                        <>
                          <button onClick={() => { const blob = new Blob([msg.content], { type: "text/markdown" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `hj-codingia-${msg.id}.md`; a.click(); URL.revokeObjectURL(url); }} className="p-1 rounded hover:bg-white/[0.06] text-neutral-600 hover:text-neutral-300 transition-all" title="Download"><Download className="w-3 h-3" /></button>
                          {index === messages.length - 1 && <button onClick={regenerateLastMessage} className="p-1 rounded hover:bg-white/[0.06] text-neutral-600 hover:text-neutral-300 transition-all" title="Regenerate"><RefreshCw className="w-3 h-3" /></button>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && streamingContent && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#e91e63]/10 border border-[#e91e63]/20 flex items-center justify-center mt-1"><Sparkles className="w-4 h-4 text-[#e91e63]" /></div>
                  <div className="max-w-[85%] rounded-xl bg-[#0a0a0a] border border-white/[0.06] px-5 py-4">
                    <MarkdownRenderer content={streamingContent} />
                    <span className="inline-block w-2 h-4 bg-[#e91e63] animate-typing-cursor ml-0.5 align-middle" />
                  </div>
                </div>
              )}
              {isLoading && !streamingContent && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#e91e63]/10 border border-[#e91e63]/20 flex items-center justify-center"><Sparkles className="w-4 h-4 text-[#e91e63] animate-pulse" /></div>
                  <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl px-5 py-4">
                    <div className="flex items-center gap-3"><Loader2 className="w-4 h-4 text-[#e91e63] animate-spin" /><span className="text-sm text-neutral-500">Thinking...</span></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {apiKeyWarning && (
          <div className="px-4 py-2 bg-yellow-500/10 border-t border-yellow-500/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <span className="text-xs text-yellow-300 flex-1">{apiKeyWarning}</span>
            <button onClick={() => setApiKeyWarning(null)} className="text-xs text-yellow-400 hover:text-yellow-300">✕</button>
          </div>
        )}

        <div className="border-t border-white/[0.06] bg-[#080808]/80 backdrop-blur-xl px-4 py-3">
          <div className="max-w-4xl mx-auto">
            {showCommands && filteredCommands.length > 0 && (
              <div className="mb-2 rounded-lg bg-[#0a0a0a] border border-white/[0.08] overflow-hidden animate-fade-in">
                {filteredCommands.map((cmd) => (
                  <button key={cmd.name} onClick={() => { setInputValue(cmd.name + " "); setShowCommands(false); inputRef.current?.focus(); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left">
                    <code className="text-xs font-mono text-[#e91e63] bg-[#e91e63]/8 px-1.5 py-0.5 rounded">{cmd.name}</code>
                    <span className="text-xs text-neutral-500">{cmd.desc}</span>
                    <Badge variant="outline" className="text-[9px] border-white/[0.06] text-neutral-600 ml-auto">{cmd.category}</Badge>
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={sendMessage} className="relative flex items-end gap-2">
              <div className="flex-1 relative">
                <div className="absolute left-3 bottom-3 z-10">
                  <button type="button" className="p-0.5 text-neutral-600 hover:text-neutral-400 transition-colors" title="Attach file (coming soon)"><Paperclip className="w-4 h-4" /></button>
                </div>
                <textarea ref={inputRef} value={inputValue} onChange={(e) => handleInputChange(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask HJ CodingIA anything... (type / for commands)" rows={1} className="w-full resize-none rounded-xl bg-[#0a0a0a] border border-white/[0.08] focus:border-[#e91e63]/40 focus:ring-1 focus:ring-[#e91e63]/20 pl-10 pr-20 py-3 text-sm text-neutral-200 placeholder:text-neutral-600 font-mono transition-all outline-none" style={{ minHeight: "46px", maxHeight: "200px", height: "auto" }} onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 200)}px`; }} disabled={isLoading} />
                <div className="absolute right-3 bottom-2 flex items-center gap-2">
                  <span className="text-[10px] text-neutral-700 font-mono">~{inputTokenCount} tok</span>
                </div>
              </div>
              <Button type="submit" disabled={isLoading || !inputValue.trim()} className="bg-[#e91e63] hover:bg-[#ff2a76] text-white h-[46px] px-4 shadow-lg shadow-[#e91e63]/20">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
            <div className="flex items-center justify-between mt-2 text-[10px] text-neutral-700">
              <div className="flex items-center gap-3">
                <ProviderBadge modelId={currentModel} size="sm" />
                <span>{currentModelInfo?.name}</span>
                {needsApiKey && <span className="text-yellow-500 flex items-center gap-1"><Key className="w-2.5 h-2.5" /> Key needed</span>}
                {speechMode !== "normal" && <span className="text-[#e91e63]">{speechMode === "caveman" ? "🦣" : "🪨"} {speechMode}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span>~{totalTokens.toLocaleString()} tokens</span>
                <span>{messages.length} messages</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
