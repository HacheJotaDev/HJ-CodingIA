"use client";

import { useState, useMemo, useCallback } from "react";
import {
  MessageSquare, Plus, Trash2, Settings, ChevronLeft, X, Zap,
  Brain, Clock, Search, ChevronDown, ChevronRight, Key, Eye,
  EyeOff, Check, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AVAILABLE_MODELS, PROVIDERS, getModelsByProvider, type ChatSession } from "@/lib/chat";
import { getApiKeys, saveApiKeys, hasApiKeyForProvider, type ApiKeys } from "@/lib/api-keys";
import { ProviderBadge } from "./provider-badge";

interface SidebarProps {
  sessions: ChatSession[]; activeSessionId: string | null; currentModel: string;
  totalTokens: number; speechMode: string; thinkingEnabled: boolean;
  onSelectSession: (id: string) => void; onNewSession: () => void;
  onDeleteSession: (id: string) => void; onModelChange: (model: string) => void;
  onSpeechModeChange: (mode: string) => void; onThinkingToggle: () => void;
  isOpen: boolean; onToggle: () => void;
}

export function Sidebar({
  sessions, activeSessionId, currentModel, totalTokens,
  speechMode, thinkingEnabled, onSelectSession, onNewSession,
  onDeleteSession, onModelChange, onSpeechModeChange, onThinkingToggle,
  isOpen, onToggle,
}: SidebarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [expandedProviders, setExpandedProviders] = useState<string[]>(PROVIDERS.map((p) => p.id));
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => getApiKeys());
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keysSaved, setKeysSaved] = useState(false);

  const currentModelInfo = AVAILABLE_MODELS.find((m) => m.id === currentModel);
  const currentProvider = currentModelInfo ? PROVIDERS.find((p) => p.id === currentModelInfo.provider) : undefined;

  const filteredSessions = useMemo(() => {
    if (!sessionSearch.trim()) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(sessionSearch.toLowerCase()));
  }, [sessions, sessionSearch]);

  const toggleProvider = (providerId: string) => {
    setExpandedProviders((prev) => prev.includes(providerId) ? prev.filter((id) => id !== providerId) : [...prev, providerId]);
  };

  const handleSaveApiKeys = useCallback(() => { saveApiKeys(apiKeys); setKeysSaved(true); setTimeout(() => setKeysSaved(false), 2000); }, [apiKeys]);
  const handleKeyChange = useCallback((provider: string, value: string) => { setApiKeys((prev) => ({ ...prev, [provider]: value })); setKeysSaved(false); }, []);
  const toggleShowKey = useCallback((provider: string) => { setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] })); }, []);
  const apiKeyProviders = PROVIDERS.filter((p) => !p.free);

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" onClick={onToggle} />}
      <aside className={`fixed md:relative z-50 top-0 left-0 h-full transition-all duration-300 ease-in-out ${isOpen ? "w-72" : "w-0 md:w-12"} overflow-hidden bg-[#080808] border-r border-white/[0.06] flex flex-col`}>
        {!isOpen ? (
          <div className="flex flex-col items-center py-4 gap-3">
            <button onClick={onToggle} className="p-2 rounded-lg hover:bg-white/[0.06] text-neutral-500 hover:text-white transition-all"><ChevronLeft className="w-4 h-4 rotate-180" /></button>
            <button onClick={onToggle} className="p-2 rounded-lg hover:bg-white/[0.06] text-neutral-500 hover:text-white transition-all"><MessageSquare className="w-4 h-4" /></button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <img src="/hj-codingia-logo.png" alt="HJ CodingIA" className="w-7 h-7" />
                <span className="font-bold tracking-wider text-sm">HJ CODINGIA</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-neutral-500 hover:text-white transition-all md:hidden"><X className="w-4 h-4" /></button>
                <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-neutral-500 hover:text-white transition-all hidden md:block"><ChevronLeft className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="px-3 py-3">
              <Button onClick={onNewSession} className="w-full bg-[#e91e63]/10 hover:bg-[#e91e63]/20 border border-[#e91e63]/20 text-[#e91e63] hover:text-[#ff2a76] justify-start gap-2 text-sm font-medium">
                <Plus className="w-4 h-4" /> New Chat
              </Button>
            </div>

            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-600" />
                <input type="text" value={sessionSearch} onChange={(e) => setSessionSearch(e.target.value)} placeholder="Search sessions..." className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-[#e91e63]/30 transition-colors" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-1">
              <div className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest px-2 mb-2">Sessions</div>
              {filteredSessions.map((session) => (
                <div key={session.id} className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${activeSessionId === session.id ? "bg-[#e91e63]/10 border border-[#e91e63]/20 text-white" : "hover:bg-white/[0.04] text-neutral-400 border border-transparent"}`} onClick={() => onSelectSession(session.id)}>
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-xs truncate flex-1">{session.title}</span>
                  <span className="text-[9px] text-neutral-600 flex-shrink-0">{session.messages.length}</span>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/[0.06] text-neutral-600 hover:text-red-400 transition-all"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>

            <div className="border-t border-white/[0.06]">
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${currentProvider?.free || (currentProvider && hasApiKeyForProvider(currentProvider.id)) ? "bg-green-500" : "bg-yellow-500"}`} />
                  <span className="text-[10px] text-neutral-500 font-mono">{currentModelInfo?.name || currentModel}</span>
                </div>
                <span className="text-[10px] text-neutral-600 font-mono">~{totalTokens.toLocaleString()} tokens</span>
              </div>

              {currentProvider && (
                <div className="px-4 pb-2 flex items-center gap-2">
                  <ProviderBadge providerId={currentProvider.id} size="sm" />
                  {currentProvider.free ? <span className="text-[9px] text-green-400">Free</span> : !hasApiKeyForProvider(currentProvider.id) ? <span className="text-[9px] text-yellow-500 flex items-center gap-0.5"><Key className="w-2.5 h-2.5" /> Key needed</span> : null}
                </div>
              )}

              {(speechMode !== "normal" || thinkingEnabled) && (
                <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
                  {speechMode !== "normal" && <Badge variant="outline" className="text-[10px] border-[#e91e63]/30 text-[#e91e63] bg-[#e91e63]/5 py-0">{speechMode === "caveman" ? "🦣 Caveman" : "🪨 Rocky"}</Badge>}
                  {thinkingEnabled && <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400 bg-purple-500/5 py-0"><Brain className="w-2.5 h-2.5 mr-1" />Thinking</Badge>}
                </div>
              )}

              <button onClick={() => { setShowApiKeys(!showApiKeys); setShowSettings(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-xs text-neutral-500 hover:text-white hover:bg-white/[0.03] transition-all border-t border-white/[0.06]">
                <Key className="w-3.5 h-3.5" /> API Keys <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showApiKeys ? "rotate-180" : ""}`} />
              </button>

              {showApiKeys && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06] pt-3 animate-fade-in max-h-80 overflow-y-auto">
                  <p className="text-[10px] text-neutral-600 leading-relaxed">Free models work without any key. Add keys for premium providers (OpenAI, Anthropic, etc.). Keys are stored locally in your browser.</p>
                  {apiKeyProviders.map((provider) => (
                    <div key={provider.id}>
                      <label className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 flex items-center gap-1.5" style={{ color: provider.color }}>
                        <span>{provider.icon}</span> {provider.name}
                        {hasApiKeyForProvider(provider.id) && <Check className="w-2.5 h-2.5 text-green-400" />}
                      </label>
                      <div className="relative">
                        <input type={showKeys[provider.id] ? "text" : "password"} value={apiKeys[provider.id as keyof ApiKeys] || ""} onChange={(e) => handleKeyChange(provider.id, e.target.value)} placeholder={`Enter ${provider.name} API key...`} className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pr-8 pl-3 py-2 text-xs text-neutral-300 placeholder:text-neutral-700 focus:outline-none focus:border-[#e91e63]/30 transition-colors font-mono" />
                        <button onClick={() => toggleShowKey(provider.id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-neutral-600 hover:text-neutral-400 transition-colors">
                          {showKeys[provider.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <Button onClick={handleSaveApiKeys} className={`w-full text-sm font-medium transition-all ${keysSaved ? "bg-green-500/20 border border-green-500/30 text-green-400" : "bg-[#e91e63]/10 hover:bg-[#e91e63]/20 border border-[#e91e63]/20 text-[#e91e63] hover:text-[#ff2a76]"}`}>
                    {keysSaved ? <><Check className="w-4 h-4 mr-1" /> Saved!</> : "Save API Keys"}
                  </Button>
                </div>
              )}

              <button onClick={() => { setShowSettings(!showSettings); setShowApiKeys(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-xs text-neutral-500 hover:text-white hover:bg-white/[0.03] transition-all border-t border-white/[0.06]">
                <Settings className="w-3.5 h-3.5" /> Settings <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showSettings ? "rotate-180" : ""}`} />
              </button>

              {showSettings && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/[0.06] pt-3 animate-fade-in max-h-96 overflow-y-auto">
                  <div>
                    <label className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest mb-2 block">Model</label>
                    <div className="space-y-2">
                      {PROVIDERS.map((provider) => {
                        const models = getModelsByProvider(provider.id);
                        if (models.length === 0) return null;
                        const isExpanded = expandedProviders.includes(provider.id);
                        const hasKey = provider.free || hasApiKeyForProvider(provider.id);
                        return (
                          <div key={provider.id}>
                            <button onClick={() => toggleProvider(provider.id)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.03] transition-colors text-left">
                              {isExpanded ? <ChevronDown className="w-3 h-3 text-neutral-600" /> : <ChevronRight className="w-3 h-3 text-neutral-600" />}
                              <span className="text-[10px]" style={{ color: provider.color }}>{provider.icon}</span>
                              <span className="text-[11px] font-medium text-neutral-400">{provider.name}</span>
                              <span className="ml-auto">{provider.free ? <span className="text-[9px] text-green-400">FREE</span> : hasKey ? <Check className="w-3 h-3 text-green-400" /> : <AlertCircle className="w-3 h-3 text-yellow-500" />}</span>
                            </button>
                            {isExpanded && (
                              <div className="ml-3 space-y-1 mt-1">
                                {models.map((m) => (
                                  <button key={m.id} onClick={() => onModelChange(m.id)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${currentModel === m.id ? "bg-[#e91e63]/10 border border-[#e91e63]/20" : "hover:bg-white/[0.04] border border-transparent"}`}>
                                    <Zap className={`w-3.5 h-3.5 ${currentModel === m.id ? "text-[#e91e63]" : "text-neutral-600"}`} />
                                    <div>
                                      <div className={`text-xs font-medium ${currentModel === m.id ? "text-white" : "text-neutral-300"}`}>{m.name}</div>
                                      <div className="text-[10px] text-neutral-600">{m.description}</div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest mb-2 block">Speech Mode</label>
                    <div className="flex gap-1.5">
                      {[{ id: "normal", label: "Normal", icon: "💬" }, { id: "caveman", label: "Caveman", icon: "🦣" }, { id: "rocky", label: "Rocky", icon: "🪨" }].map((mode) => (
                        <button key={mode.id} onClick={() => onSpeechModeChange(mode.id)} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs transition-all ${speechMode === mode.id ? "bg-[#e91e63]/10 border border-[#e91e63]/20 text-white" : "hover:bg-white/[0.04] border border-transparent text-neutral-500"}`}>
                          <span className="text-sm">{mode.icon}</span><span className="text-[10px]">{mode.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Brain className="w-3.5 h-3.5 text-neutral-600" /><span className="text-xs text-neutral-400">Extended Thinking</span></div>
                    <button onClick={onThinkingToggle} className={`w-9 h-5 rounded-full transition-all ${thinkingEnabled ? "bg-[#e91e63]" : "bg-white/[0.08]"}`}>
                      <div className={`w-3.5 h-3.5 rounded-full bg-white transition-all mt-[3px] ${thinkingEnabled ? "ml-[19px]" : "ml-[3px]"}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-600">
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>~{totalTokens.toLocaleString()} tokens this session</span></div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
