'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Search, Inbox as InboxIcon, Filter, Clock, Paperclip } from 'lucide-react';
import type { MailMessage } from '@/lib/types';
import { useRef, useState } from 'react';

interface InboxProps {
  messages: MailMessage[];
  isLoading: boolean;
  onSelectMessage: (message: MailMessage) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterUnread: boolean;
  onFilterUnreadChange: (val: boolean) => void;
}

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(address: string): string {
  const colors = [
    'from-indigo-500 to-blue-500',
    'from-purple-500 to-pink-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-rose-500 to-red-500',
    'from-cyan-500 to-sky-500',
    'from-violet-500 to-fuchsia-500',
  ];
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function Inbox({
  messages,
  isLoading,
  onSelectMessage,
  searchQuery,
  onSearchChange,
  filterUnread,
  onFilterUnreadChange,
}: InboxProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [showSearch, setShowSearch] = useState(false);

  // Filter messages
  const filtered = messages.filter((msg) => {
    const matchesSearch =
      !searchQuery ||
      msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.from.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.from.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterUnread || !msg.seen;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search & Filter Bar */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Buscar por asunto o remitente..."
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (e.target.value) setShowSearch(true);
              }}
              onFocus={() => setShowSearch(true)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-white/20"
            />
          </div>
          <button
            onClick={() => onFilterUnreadChange(!filterUnread)}
            className={`p-2 rounded-lg border transition-all ${
              filterUnread
                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60'
            }`}
            title="Filtrar no leídos"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
        {(searchQuery || filterUnread) && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">
              {filtered.length} de {messages.length} mensajes
            </span>
            <button
              onClick={() => {
                onSearchChange('');
                onFilterUnreadChange(false);
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Message List */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-2 pb-2">
        {isLoading && messages.length === 0 ? (
          <div className="space-y-2 p-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-shimmer rounded-xl h-20" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            hasFilters={!!searchQuery || filterUnread}
            totalMessages={messages.length}
          />
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-1">
              {filtered.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.03, duration: 0.2 }}
                  onClick={() => onSelectMessage(msg)}
                  className={`group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    !msg.seen
                      ? 'bg-white/[0.04] hover:bg-white/[0.07] border border-indigo-500/10'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(
                      msg.from.address
                    )} flex items-center justify-center shrink-0 text-xs font-bold text-white shadow-lg`}
                  >
                    {getInitials(msg.from.name || msg.from.address)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span
                        className={`text-sm truncate ${
                          !msg.seen ? 'font-semibold text-white' : 'text-white/70'
                        }`}
                      >
                        {msg.from.name || msg.from.address}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <Paperclip className="w-3 h-3 text-white/30" />
                        )}
                        <span className="text-[11px] text-white/30">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                    <p
                      className={`text-sm truncate mb-0.5 ${
                        !msg.seen ? 'text-white/80' : 'text-white/50'
                      }`}
                    >
                      {msg.subject || '(Sin asunto)'}
                    </p>
                    <p className="text-xs text-white/30 truncate">{msg.intro}</p>
                  </div>

                  {/* Unread dot */}
                  {!msg.seen && (
                    <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 mt-2 animate-pulse-dot" />
                  )}
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function EmptyState({ hasFilters, totalMessages }: { hasFilters: boolean; totalMessages: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4"
      >
        {hasFilters ? (
          <Search className="w-8 h-8 text-white/20" />
        ) : (
          <InboxIcon className="w-8 h-8 text-white/20" />
        )}
      </motion.div>
      <h3 className="text-white/60 font-medium mb-1">
        {hasFilters
          ? 'Sin resultados'
          : 'Bandeja vacía'}
      </h3>
      <p className="text-white/30 text-sm text-center max-w-xs">
        {hasFilters
          ? 'No se encontraron mensajes con los filtros actuales'
          : 'Los correos que recibas aparecerán aquí automáticamente'}
      </p>
      {!hasFilters && (
        <div className="flex items-center gap-1.5 mt-4 text-white/20 text-xs">
          <Clock className="w-3 h-3" />
          <span>Actualización automática cada 5 segundos</span>
        </div>
      )}
    </div>
  );
}
