'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Plus,
  Trash2,
  Mail,
  Check,
  Copy,
  User,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import type { MailAccount } from '@/lib/types';

interface AccountSwitcherProps {
  accounts: MailAccount[];
  activeAccountId: string | null;
  onSwitchAccount: (id: string) => void;
  onDeleteAccount: (id: string) => void;
  onCreateNew: () => void;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Recién creado';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function AccountSwitcher({
  accounts,
  activeAccountId,
  onSwitchAccount,
  onDeleteAccount,
  onCreateNew,
}: AccountSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeAccount = accounts.find((a) => a.id === activeAccountId);

  const copyAddress = async (e: React.MouseEvent, address: string, id: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopiedId(id);
      toast.success('Dirección copiada');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteAccount(id);
  };

  if (accounts.length === 0) return null;

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all text-sm"
      >
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Mail className="w-3 h-3 text-white" />
        </div>
        <span className="text-white/70 truncate max-w-[140px] sm:max-w-[200px]">
          {activeAccount?.address || 'Seleccionar cuenta'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-white/30 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 glass rounded-xl overflow-hidden z-50 shadow-xl shadow-black/30"
            >
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-medium text-white/80">
                  Cuentas ({accounts.length})
                </h3>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    onClick={() => {
                      onSwitchAccount(account.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-white/[0.04] ${
                      account.id === activeAccountId ? 'bg-indigo-500/5' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        account.id === activeAccountId
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                          : 'bg-white/[0.06]'
                      }`}
                    >
                      {account.id === activeAccountId ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <User className="w-4 h-4 text-white/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate font-mono">
                        {account.address}
                      </p>
                      <p className="text-[11px] text-white/30">
                        {formatRelativeTime(account.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => copyAddress(e, account.address, account.id)}
                        className="p-1.5 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all"
                      >
                        {copiedId === account.id ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, account.id)}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 py-3 border-t border-white/[0.06]">
                <button
                  onClick={() => {
                    onCreateNew();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm hover:bg-indigo-500/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nueva cuenta
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
