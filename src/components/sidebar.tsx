"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Trash2,
  MessageCircle,
  Code2,
  Image,
  X,
  Settings,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { Session, Mode } from "@/lib/types";
import { MODE_LABELS, MODE_COLORS } from "@/lib/models";
import { ModelSelector } from "./model-selector";

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  currentMode: Mode;
  currentModel: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onModeChange: (mode: Mode) => void;
  onModelChange: (modelId: string) => void;
  extendedThinking: boolean;
  onToggleThinking: () => void;
  codeReview: boolean;
  onToggleCodeReview: () => void;
  planningMode: boolean;
  onTogglePlanning: () => void;
}

const modeIcons: Record<Mode, React.ReactNode> = {
  chat: <MessageCircle className="w-4 h-4" />,
  codigo: <Code2 className="w-4 h-4" />,
  imagen: <Image className="w-4 h-4" />,
};

export function Sidebar({
  sessions,
  activeSessionId,
  currentMode,
  currentModel,
  isOpen,
  onToggle,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onModeChange,
  onModelChange,
  extendedThinking,
  onToggleThinking,
  codeReview,
  onToggleCodeReview,
  planningMode,
  onTogglePlanning,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : -320,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 250 }}
        className={`fixed lg:relative top-0 left-0 h-full z-50 w-[300px] flex flex-col glass`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e91e63] flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">HJ-CodingIA</h1>
              <p className="text-[10px] text-white/40">Asistente de IA</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/50 hover:text-white/80 lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode switcher */}
        <div className="p-3 border-b border-white/[0.06]">
          <div className="flex gap-1 p-1 rounded-lg bg-white/[0.03]">
            {(["chat", "codigo", "imagen"] as Mode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onModeChange(mode)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-all ${
                  currentMode === mode
                    ? "bg-white/[0.08] text-white shadow-sm"
                    : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
                }`}
                style={
                  currentMode === mode
                    ? { color: MODE_COLORS[mode] }
                    : undefined
                }
              >
                {modeIcons[mode]}
                <span>{MODE_LABELS[mode]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* New session button */}
        <div className="p-3">
          <button
            onClick={onNewSession}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#e91e63]/10 hover:bg-[#e91e63]/20 border border-[#e91e63]/20 transition-all text-[#e91e63] text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Nueva conversación
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar conversaciones..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-[#e91e63]/30 focus:ring-1 focus:ring-[#e91e63]/20 transition-all"
            />
          </div>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto px-3 pb-2 min-h-0">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-white/25 text-xs">
              {searchQuery ? "Sin resultados" : "Sin conversaciones"}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                    activeSessionId === session.id
                      ? "bg-white/[0.08] border border-white/[0.08]"
                      : "hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: MODE_COLORS[session.mode] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/80 truncate">
                      {session.title}
                    </div>
                    <div className="text-[10px] text-white/30 mt-0.5">
                      {session.messages.length} msgs ·{" "}
                      {new Date(session.updatedAt).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom section */}
        <div className="border-t border-white/[0.06] p-3 space-y-2">
          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors text-white/50 hover:text-white/70 text-sm"
          >
            <Settings className="w-4 h-4" />
            <span>Configuración</span>
          </button>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-1">
                  <div className="px-1 py-1">
                    <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">
                      Modelo
                    </div>
                    <ModelSelector
                      selectedModel={currentModel}
                      onModelChange={onModelChange}
                    />
                  </div>

                  <SettingToggle
                    label="Pensamiento extendido"
                    active={extendedThinking}
                    onToggle={onToggleThinking}
                  />
                  <SettingToggle
                    label="Revisión de código"
                    active={codeReview}
                    onToggle={onToggleCodeReview}
                  />
                  <SettingToggle
                    label="Modo planificación"
                    active={planningMode}
                    onToggle={onTogglePlanning}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapse button for desktop */}
          <button
            onClick={onToggle}
            className="hidden lg:flex w-full items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors text-white/30 hover:text-white/50 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Colapsar</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}

function SettingToggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
    >
      <span className="text-xs text-white/50">{label}</span>
      <div
        className={`w-8 h-4.5 rounded-full transition-all relative ${
          active ? "bg-[#e91e63]" : "bg-white/10"
        }`}
      >
        <div
          className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${
            active ? "left-4" : "left-0.5"
          }`}
        />
      </div>
    </button>
  );
}
