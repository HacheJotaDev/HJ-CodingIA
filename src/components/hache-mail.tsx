'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  RefreshCw,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';

import Header from './header';
import CreateEmail from './create-email';
import Inbox from './inbox';
import MessageView from './message-view';
import AccountSwitcher from './account-switcher';

import type { MailAccount, MailMessage } from '@/lib/types';
import {
  loadAccounts,
  addAccount as storageAddAccount,
  removeAccount as storageRemoveAccount,
  updateAccountToken,
  saveActiveAccount,
  loadActiveAccount,
} from '@/lib/storage';

type ViewMode = 'create' | 'inbox' | 'message';

export default function HacheMail() {
  // State
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MailMessage | null>(null);
  const [view, setView] = useState<ViewMode>('create');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnread, setFilterUnread] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousMessageCountRef = useRef<number>(0);

  // Get active account
  const activeAccount = accounts.find((a) => a.id === activeAccountId) || null;
  const totalUnread = messages.filter((m) => !m.seen).length;

  // Load saved state on mount
  useEffect(() => {
    const savedAccounts = loadAccounts();
    const savedActiveId = loadActiveAccount();

    if (savedAccounts.length > 0) {
      setAccounts(savedAccounts);
      if (savedActiveId && savedAccounts.find((a) => a.id === savedActiveId)) {
        setActiveAccountId(savedActiveId);
      } else {
        setActiveAccountId(savedAccounts[0].id);
        saveActiveAccount(savedAccounts[0].id);
      }
      setView('inbox');
    }
  }, []);

  // Load sound/notification preferences
  useEffect(() => {
    try {
      const soundPref = localStorage.getItem('hachemail_sound');
      const notifPref = localStorage.getItem('hachemail_notif');
      if (soundPref) setSoundEnabled(soundPref === 'true');
      if (notifPref) setNotificationsEnabled(notifPref === 'true');
    } catch {
      // ignore
    }
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch {
      // audio not available
    }
  }, [soundEnabled]);

  // Send browser notification
  const sendBrowserNotification = useCallback(
    (count: number) => {
      if (!notificationsEnabled || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      try {
        new Notification('Hache Mail - Nuevo correo', {
          body: `Tienes ${count} mensaje${count > 1 ? 's' : ''} nuevo${count > 1 ? 's' : ''}`,
          icon: '/logo.svg',
        });
      } catch {
        // notifications not supported
      }
    },
    [notificationsEnabled]
  );

  // Fetch messages
  const fetchMessages = useCallback(
    async (token: string, silent: boolean = false) => {
      if (!silent) setIsLoadingMessages(true);
      try {
        const res = await fetch(`/api/messages?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          if (res.status === 401) {
            // Token expired, try to re-auth
            await reAuthenticate();
            return;
          }
          throw new Error('Error al obtener mensajes');
        }
        const data = await res.json();
        const newMessages: MailMessage[] = data['hydra:member'] || [];
        const newCount = newMessages.filter((m) => !m.seen).length;

        setMessages((prev) => {
          // Check for new messages
          const prevIds = new Set(prev.map((m) => m.id));
          const actuallyNew = newMessages.filter((m) => !prevIds.has(m.id));
          if (actuallyNew.length > 0 && prev.length > 0) {
            playNotificationSound();
            sendBrowserNotification(actuallyNew.length);
            toast.success(`${actuallyNew.length} mensaje${actuallyNew.length > 1 ? 's' : ''} nuevo${actuallyNew.length > 1 ? 's' : ''}`);
          }
          return newMessages;
        });

        previousMessageCountRef.current = newMessages.length;
      } catch (error) {
        if (!silent) {
          toast.error('Error al cargar mensajes');
        }
      } finally {
        if (!silent) setIsLoadingMessages(false);
      }
    },
    [playNotificationSound, sendBrowserNotification]
  );

  // Re-authenticate
  const reAuthenticate = useCallback(async () => {
    if (!activeAccount) return;
    try {
      const res = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: activeAccount.address,
          password: activeAccount.password,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        updateAccountToken(activeAccount.id, data.token);
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === activeAccount.id ? { ...a, token: data.token } : a
          )
        );
        toast.success('Sesión renovada');
      } else {
        toast.error('Sesión expirada. Crea una nueva cuenta.');
      }
    } catch {
      toast.error('Error de conexión');
    }
  }, [activeAccount]);

  // Poll for new messages
  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (activeAccount && view !== 'create') {
      setIsPolling(true);
      // Initial fetch
      fetchMessages(activeAccount.token);
      // Poll every 5 seconds
      pollIntervalRef.current = setInterval(() => {
        fetchMessages(activeAccount.token, true);
      }, 5000);
    } else {
      setIsPolling(false);
      setMessages([]);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [activeAccount, view, fetchMessages]);

  // Create account
  const handleCreateAccount = async (address: string, password: string) => {
    setIsCreating(true);
    try {
      // Create account on mail.tm
      const accountRes = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password }),
      });

      if (!accountRes.ok) {
        const errData = await accountRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al crear cuenta');
      }

      const accountData = await accountRes.json();

      // Get token
      const tokenRes = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password }),
      });

      if (!tokenRes.ok) {
        throw new Error('Cuenta creada pero error al obtener token');
      }

      const tokenData = await tokenRes.json();

      const newAccount: MailAccount = {
        id: accountData.id,
        address,
        password,
        token: tokenData.token,
        createdAt: new Date().toISOString(),
      };

      const updatedAccounts = storageAddAccount(newAccount);
      setAccounts(updatedAccounts);
      setActiveAccountId(newAccount.id);
      setView('inbox');
      toast.success('¡Correo temporal creado!', {
        description: address,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear cuenta');
    } finally {
      setIsCreating(false);
    }
  };

  // Switch account
  const handleSwitchAccount = (id: string) => {
    setActiveAccountId(id);
    saveActiveAccount(id);
    setSelectedMessage(null);
    setMessages([]);
    setSearchQuery('');
    setFilterUnread(false);
    setView('inbox');
  };

  // Delete account
  const handleDeleteAccount = async (id: string) => {
    const account = accounts.find((a) => a.id === id);
    if (!account) return;

    try {
      // Try to delete from mail.tm
      await fetch(`/api/accounts`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${account.token}`,
        },
        body: JSON.stringify({ accountId: id }),
      });
    } catch {
      // Ignore - account might already be gone
    }

    const updatedAccounts = storageRemoveAccount(id);
    setAccounts(updatedAccounts);

    if (id === activeAccountId) {
      if (updatedAccounts.length > 0) {
        setActiveAccountId(updatedAccounts[0].id);
        saveActiveAccount(updatedAccounts[0].id);
        setView('inbox');
      } else {
        setActiveAccountId(null);
        setView('create');
      }
      setSelectedMessage(null);
      setMessages([]);
    }

    toast.success('Cuenta eliminada');
  };

  // Select message
  const handleSelectMessage = async (msg: MailMessage) => {
    setSelectedMessage(msg);
    setView('message');

    // Mark as read in local state
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, seen: true } : m))
    );

    // Fetch full message
    if (activeAccount) {
      try {
        const res = await fetch(
          `/api/messages/${msg.id}?token=${encodeURIComponent(activeAccount.token)}`
        );
        if (res.ok) {
          const fullMessage = await res.json();
          setSelectedMessage(fullMessage);
        }
      } catch {
        // Use the preview message
      }
    }
  };

  // Delete message
  const handleDeleteMessage = async (id: string) => {
    if (!activeAccount) return;
    try {
      const res = await fetch(
        `/api/messages/${id}?token=${encodeURIComponent(activeAccount.token)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Error al eliminar');
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch {
      throw new Error('Error al eliminar mensaje');
    }
  };

  // Refresh messages manually
  const handleRefresh = async () => {
    if (!activeAccount || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetchMessages(activeAccount.token);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Copy email address
  const copyEmailAddress = async () => {
    if (!activeAccount) return;
    try {
      await navigator.clipboard.writeText(activeAccount.address);
      setCopiedEmail(true);
      toast.success('Dirección copiada al portapapeles');
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  // Toggle sound
  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    try {
      localStorage.setItem('hachemail_sound', String(newVal));
    } catch {
      // ignore
    }
    toast.success(newVal ? 'Sonido activado' : 'Sonido desactivado');
  };

  // Toggle notifications
  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast.error('Permiso de notificación denegado');
          return;
        }
      }
      setNotificationsEnabled(true);
      try {
        localStorage.setItem('hachemail_notif', 'true');
      } catch {
        // ignore
      }
      toast.success('Notificaciones activadas');
    } else {
      setNotificationsEnabled(false);
      try {
        localStorage.setItem('hachemail_notif', 'false');
      } catch {
        // ignore
      }
      toast.success('Notificaciones desactivadas');
    }
  };

  // Navigate to create new account
  const goToCreate = () => {
    setView('create');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        activeAccount={activeAccount}
        totalUnread={totalUnread}
        isPolling={isPolling}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto">
        {/* Toolbar (only when account active) */}
        {activeAccount && view !== 'create' && (
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <AccountSwitcher
                accounts={accounts}
                activeAccountId={activeAccountId}
                onSwitchAccount={handleSwitchAccount}
                onDeleteAccount={handleDeleteAccount}
                onCreateNew={goToCreate}
              />
            </div>

            <div className="flex items-center gap-1">
              {/* Copy email */}
              <button
                onClick={copyEmailAddress}
                className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-all"
                title="Copiar dirección"
              >
                {copiedEmail ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              {/* Sound toggle */}
              <button
                onClick={toggleSound}
                className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-all"
                title={soundEnabled ? 'Desactivar sonido' : 'Activar sonido'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </button>

              {/* Notifications toggle */}
              <button
                onClick={toggleNotifications}
                className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-all"
                title={
                  notificationsEnabled
                    ? 'Desactivar notificaciones'
                    : 'Activar notificaciones'
                }
              >
                {notificationsEnabled ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
              </button>

              {/* Refresh */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-all disabled:opacity-50"
                title="Actualizar mensajes"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </button>

              {/* Delete account */}
              <button
                onClick={() => {
                  if (activeAccountId) handleDeleteAccount(activeAccountId);
                }}
                className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all"
                title="Eliminar cuenta"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {view === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-[calc(100vh-120px)]"
            >
              {accounts.length > 0 && (
                <div className="px-4 sm:px-6 py-3">
                  <button
                    onClick={() => {
                      if (activeAccount) setView('inbox');
                    }}
                    className="text-sm text-white/40 hover:text-white/60 transition-colors flex items-center gap-1"
                  >
                    ← Volver a la bandeja
                  </button>
                </div>
              )}
              <CreateEmail
                onCreateAccount={handleCreateAccount}
                isCreating={isCreating}
              />
            </motion.div>
          )}

          {view === 'inbox' && activeAccount && (
            <motion.div
              key="inbox"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-[calc(100vh-120px)]"
            >
              <Inbox
                messages={messages}
                isLoading={isLoadingMessages}
                onSelectMessage={handleSelectMessage}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filterUnread={filterUnread}
                onFilterUnreadChange={setFilterUnread}
              />
            </motion.div>
          )}

          {view === 'message' && selectedMessage && activeAccount && (
            <motion.div
              key="message"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-[calc(100vh-120px)]"
            >
              <MessageView
                message={selectedMessage}
                onBack={() => {
                  setSelectedMessage(null);
                  setView('inbox');
                }}
                onDelete={handleDeleteMessage}
                activeToken={activeAccount.token}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/[0.04] py-4 px-6 text-center">
        <p className="text-xs text-white/20">
          Hache<span className="text-indigo-400/40">Mail</span> — Correo temporal seguro • Los correos se eliminan automáticamente
        </p>
      </footer>
    </div>
  );
}
