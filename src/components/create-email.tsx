'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Copy, RefreshCw, Sparkles, ArrowRight, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Domain } from '@/lib/types';

interface CreateEmailProps {
  onCreateAccount: (address: string, password: string) => Promise<void>;
  isCreating: boolean;
}

function generateRandomUsername(): string {
  const adjectives = ['rapido', 'seguro', 'nuevo', 'fresco', 'cool', 'top', 'pro', 'mega', 'super', 'ultra'];
  const nouns = ['correo', 'mail', 'msg', 'box', 'net', 'web', 'app', 'dev', 'user', 'code'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9999);
  return `${adj}.${noun}${num}`;
}

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function CreateEmail({ onCreateAccount, isCreating }: CreateEmailProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);
  const [customMode, setCustomMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadDomains = useCallback(async () => {
    setIsLoadingDomains(true);
    try {
      const res = await fetch('/api/domains');
      const data = await res.json();
      const domainList = data['hydra:member'] || [];
      setDomains(domainList);
      if (domainList.length > 0) {
        setSelectedDomain(domainList[0].domain);
      }
    } catch {
      toast.error('Error al cargar dominios');
    } finally {
      setIsLoadingDomains(false);
    }
  }, []);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  const handleAutoGenerate = () => {
    const user = generateRandomUsername();
    setUsername(user);
    setCustomMode(false);
  };

  const handleCreate = async () => {
    if (!username || !selectedDomain) {
      toast.error('Ingresa un nombre de usuario');
      return;
    }
    const address = `${username}@${selectedDomain}`;
    const password = generatePassword();
    await onCreateAccount(address, password);
  };

  const previewAddress = username && selectedDomain ? `${username}@${selectedDomain}` : '';

  const copyPreview = async () => {
    if (!previewAddress) return;
    try {
      await navigator.clipboard.writeText(previewAddress);
      setCopied(true);
      toast.success('Dirección copiada al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg"
      >
        <div className="glass rounded-2xl p-6 sm:p-8 glow-brand">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/25"
            >
              <Mail className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Crear correo temporal
            </h2>
            <p className="text-white/50 text-sm">
              Genera un correo instantáneo para recibir mensajes
            </p>
          </div>

          {/* Domain Selector */}
          {isLoadingDomains ? (
            <div className="space-y-3 mb-6">
              <div className="animate-shimmer h-10 rounded-lg" />
              <div className="animate-shimmer h-10 rounded-lg" />
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center py-6 mb-6">
              <p className="text-white/50 text-sm">No hay dominios disponibles</p>
              <button
                onClick={loadDomains}
                className="mt-3 text-indigo-400 text-sm hover:text-indigo-300 transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {/* Domain select */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">
                  Dominio
                </label>
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all appearance-none cursor-pointer"
                >
                  {domains.map((d) => (
                    <option key={d.id} value={d.domain} className="bg-gray-900">
                      @{d.domain}
                    </option>
                  ))}
                </select>
              </div>

              {/* Username */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-white/40 uppercase tracking-wider font-medium">
                    Nombre de usuario
                  </label>
                  <button
                    onClick={handleAutoGenerate}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Auto-generar
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase());
                      setCustomMode(true);
                    }}
                    placeholder="tu-nombre"
                    className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-white/20"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreate();
                    }}
                  />
                </div>
              </div>

              {/* Preview */}
              <AnimatePresence>
                {previewAddress && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
                  >
                    <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-sm text-indigo-300 font-mono truncate flex-1">
                      {previewAddress}
                    </span>
                    <button
                      onClick={copyPreview}
                      className="shrink-0 p-1 rounded hover:bg-white/[0.06] transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-white/40" />
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Create Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreate}
            disabled={isCreating || !username || !selectedDomain}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                Crear correo temporal
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>

          {/* Refresh domains */}
          <button
            onClick={loadDomains}
            disabled={isLoadingDomains}
            className="w-full mt-3 py-2 text-xs text-white/30 hover:text-white/50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingDomains ? 'animate-spin' : ''}`} />
            Actualizar dominios
          </button>
        </div>
      </motion.div>
    </div>
  );
}
