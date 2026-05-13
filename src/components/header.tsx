'use client';

import { Mail, Signal } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  activeAccount: { address: string } | null;
  totalUnread: number;
  isPolling: boolean;
}

export default function Header({ activeAccount, totalUnread, isPolling }: HeaderProps) {
  return (
    <header className="glass sticky top-0 z-50 border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className="relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Mail className="w-5 h-5 text-white" />
            </div>
            {totalUnread > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              >
                {totalUnread > 9 ? '9+' : totalUnread}
              </motion.div>
            )}
          </motion.div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Hache<span className="text-indigo-400">Mail</span>
            </h1>
            <p className="text-[11px] text-white/40 hidden sm:block">
              Correo temporal seguro
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeAccount && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]"
            >
              <div className={`w-2 h-2 rounded-full ${isPolling ? 'bg-green-400 animate-pulse-dot' : 'bg-yellow-400'}`} />
              <span className="text-xs text-white/60 truncate max-w-[200px]">
                {activeAccount.address}
              </span>
            </motion.div>
          )}
          {isPolling && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
              <Signal className="w-3 h-3 text-green-400" />
              <span className="text-[10px] text-green-400 font-medium">EN VIVO</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
