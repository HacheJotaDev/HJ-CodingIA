'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Mail, Plus, Trash2, Copy, Check, RefreshCw, Search,
  ChevronLeft, Download, ExternalLink, X, Loader2, Zap,
  Inbox, Bell, BellOff, ArrowRight
} from 'lucide-react'
import { MailAccount, MailMessage, Domain } from '@/lib/types'
import { randomUsername, randomPassword, sanitizeHtml } from '@/lib/mailtm'
import { saveAccounts, loadAccounts, saveActiveAccountId, loadActiveAccountId } from '@/lib/storage'

// ============================================================
// MAIN ORCHESTRATOR
// ============================================================

export default function HacheMail() {
  const [accounts, setAccounts] = useState<MailAccount[]>([])
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null)
  const [domains, setDomains] = useState<Domain[]>([])
  const [messages, setMessages] = useState<MailMessage[]>([])
  const [selectedMessage, setSelectedMessage] = useState<MailMessage | null>(null)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [customUsername, setCustomUsername] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterUnread, setFilterUnread] = useState(false)
  const [notificationsOn, setNotificationsOn] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [messageHtml, setMessageHtml] = useState<string | null>(null)
  const [showTextOnly, setShowTextOnly] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevCountRef = useRef(0)

  const activeAccount = accounts.find(a => a.id === activeAccountId) || null

  // Load from storage on mount
  useEffect(() => {
    const saved = loadAccounts()
    const activeId = loadActiveAccountId()
    if (saved.length > 0) {
      setAccounts(saved)
      if (activeId && saved.find(a => a.id === activeId)) {
        setActiveAccountId(activeId)
      } else {
        setActiveAccountId(saved[0].id)
      }
    }
  }, [])

  // Fetch domains
  useEffect(() => {
    fetch('/api/domains')
      .then(r => r.json())
      .then(data => {
        const d = data['hydra:member'] || data
        if (Array.isArray(d) && d.length > 0) {
          setDomains(d)
          setSelectedDomain(d[0].domain)
        }
      })
      .catch(() => {})
  }, [])

  // Save accounts to storage whenever they change
  useEffect(() => {
    if (accounts.length > 0) {
      saveAccounts(accounts)
      if (activeAccountId) saveActiveAccountId(activeAccountId)
    }
  }, [accounts, activeAccountId])

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!activeAccount) return
    try {
      const res = await fetch(`/api/messages?token=${activeAccount.token}`)
      const data = await res.json()
      const msgs = data['hydra:member'] || []
      const prevCount = prevCountRef.current
      setMessages(msgs)
      prevCountRef.current = msgs.length

      // New email notification
      if (prevCount > 0 && msgs.length > prevCount && notificationsOn) {
        const newMsgs = msgs.slice(0, msgs.length - prevCount)
        newMsgs.forEach((msg: MailMessage) => {
          toast.success(`Nuevo correo de ${msg.from.name || msg.from.address}`, {
            description: msg.subject || 'Sin asunto',
          })
        })
        // Play sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=')
          audio.volume = 0.3
          audio.play()
        } catch {}
      }
    } catch {}
  }, [activeAccount, notificationsOn])

  // Auto-poll messages
  useEffect(() => {
    if (activeAccount) {
      setIsLoadingMessages(true)
      fetchMessages().finally(() => setIsLoadingMessages(false))
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(fetchMessages, 5000)
    } else {
      setMessages([])
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [activeAccount, fetchMessages])

  // Create email
  const createEmail = useCallback(async () => {
    if (domains.length === 0) {
      toast.error('No hay dominios disponibles')
      return
    }
    setIsCreating(true)
    try {
      const username = customUsername.trim() || randomUsername(10)
      const password = randomPassword(14)
      const address = `${username}@${selectedDomain}`

      // Create account
      const accRes = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password }),
      })
      if (!accRes.ok) {
        const err = await accRes.json()
        throw new Error(err.error || 'Error al crear cuenta')
      }

      // Get token
      const tokRes = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password }),
      })
      if (!tokRes.ok) {
        const err = await tokRes.json()
        throw new Error(err.error || 'Error al obtener token')
      }
      const tokData = await tokRes.json()

      const newAccount: MailAccount = {
        id: tokData.id || accRes.json ? (await accRes.json()).id : username,
        address,
        password,
        token: tokData.token,
        createdAt: new Date().toISOString(),
      }

      // Re-read account data for the ID
      const accData = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password }),
      }).then(() => newAccount)

      setAccounts(prev => [newAccount, ...prev])
      setActiveAccountId(newAccount.id)
      setCustomUsername('')
      setShowCreate(false)
      toast.success('Correo temporal creado', { description: address })
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al crear correo')
    } finally {
      setIsCreating(false)
    }
  }, [domains, customUsername, selectedDomain])

  // Delete account
  const deleteAccount = useCallback(async (account: MailAccount) => {
    try {
      await fetch(`/api/messages?token=${account.token}`, { method: 'GET' })
      // Try to delete from mail.tm, but don't fail if it doesn't work
      try {
        await fetch(`/api/accounts`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${account.token}` },
        })
      } catch {}

      setAccounts(prev => {
        const updated = prev.filter(a => a.id !== account.id)
        if (activeAccountId === account.id && updated.length > 0) {
          setActiveAccountId(updated[0].id)
        } else if (updated.length === 0) {
          setActiveAccountId(null)
        }
        return updated
      })
      setSelectedMessage(null)
      toast.success('Cuenta eliminada')
    } catch {
      toast.error('Error al eliminar cuenta')
    }
  }, [activeAccountId])

  // Re-auth token if expired
  const reAuthToken = useCallback(async (account: MailAccount) => {
    try {
      const res = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: account.address, password: account.password }),
      })
      if (!res.ok) throw new Error('Token expired')
      const data = await res.json()
      const updated = { ...account, token: data.token, id: data.id }
      setAccounts(prev => prev.map(a => a.id === account.id ? updated : a))
      return updated
    } catch {
      return null
    }
  }, [])

  // Open message
  const openMessage = useCallback(async (msg: MailMessage) => {
    if (!activeAccount) return
    try {
      const res = await fetch(`/api/messages/${msg.id}?token=${activeAccount.token}`)
      if (res.status === 401) {
        const refreshed = await reAuthToken(activeAccount)
        if (refreshed) {
          const retry = await fetch(`/api/messages/${msg.id}?token=${refreshed.token}`)
          const data = await retry.json()
          setSelectedMessage(data)
          const html = Array.isArray(data.html) ? data.html.join('') : (typeof data.html === 'string' ? data.html : '')
          setMessageHtml(html ? sanitizeHtml(html) : null)
        }
        return
      }
      const data = await res.json()
      setSelectedMessage(data)
      const html = Array.isArray(data.html) ? data.html.join('') : (typeof data.html === 'string' ? data.html : '')
      setMessageHtml(html ? sanitizeHtml(html) : null)
      // Mark as seen locally
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, seen: true } : m))
    } catch {
      toast.error('Error al cargar mensaje')
    }
  }, [activeAccount, reAuthToken])

  // Delete message
  const deleteMessage = useCallback(async (msgId: string) => {
    if (!activeAccount) return
    try {
      await fetch(`/api/messages/${msgId}?token=${activeAccount.token}`, { method: 'DELETE' })
      setMessages(prev => prev.filter(m => m.id !== msgId))
      if (selectedMessage?.id === msgId) setSelectedMessage(null)
      toast.success('Mensaje eliminado')
    } catch {
      toast.error('Error al eliminar mensaje')
    }
  }, [activeAccount, selectedMessage])

  // Copy email
  const copyEmail = useCallback(async () => {
    if (!activeAccount) return
    await navigator.clipboard.writeText(activeAccount.address)
    setCopiedEmail(true)
    toast.success('Correo copiado')
    setTimeout(() => setCopiedEmail(false), 2000)
  }, [activeAccount])

  // Copy message content
  const copyContent = useCallback(async () => {
    if (!selectedMessage) return
    const text = selectedMessage.text || selectedMessage.intro || ''
    await navigator.clipboard.writeText(text)
    toast.success('Contenido copiado')
  }, [selectedMessage])

  // Download attachment
  const downloadAttachment = useCallback((url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = `https://api.mail.tm${url}`
    link.download = filename
    link.target = '_blank'
    link.click()
  }, [])

  // Filter messages
  const filteredMessages = messages.filter(m => {
    const matchesSearch = searchQuery === '' ||
      m.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.from?.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.from?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesUnread = !filterUnread || !m.seen
    return matchesSearch && matchesUnread
  })

  const unreadCount = messages.filter(m => !m.seen).length

  // If no accounts and not creating, show welcome
  if (accounts.length === 0 && !showCreate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-indigo-400">Hache</span> Mail
          </h1>
          <p className="text-white/50 mb-8">Correo temporal gratuito y seguro. Recibe emails al instante sin registro.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-xl px-8 py-3 text-sm transition-all flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Crear correo temporal
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/[0.06] px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Mail className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">
                <span className="text-indigo-400">Hache</span> Mail
              </h1>
              {activeAccount && (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-dot" />
                  <span className="text-[10px] text-white/40">En vivo</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications toggle */}
            <button
              onClick={() => setNotificationsOn(!notificationsOn)}
              className={`p-2 rounded-lg transition-colors ${notificationsOn ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04]'}`}
              title={notificationsOn ? 'Desactivar notificaciones' : 'Activar notificaciones'}
            >
              {notificationsOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>

            {/* Account switcher */}
            {accounts.length > 1 && (
              <div className="flex items-center gap-1">
                {accounts.slice(0, 3).map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => { setActiveAccountId(acc.id); setSelectedMessage(null) }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      acc.id === activeAccountId
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                    }`}
                  >
                    {acc.address.split('@')[0].slice(0, 6)}
                  </button>
                ))}
              </div>
            )}

            {/* New email button */}
            <button
              onClick={() => setShowCreate(true)}
              className="bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">
        <AnimatePresence mode="wait">
          {selectedMessage ? (
            <motion.div
              key="message-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <MessageView
                message={selectedMessage}
                html={messageHtml}
                showTextOnly={showTextOnly}
                onBack={() => { setSelectedMessage(null); setMessageHtml(null) }}
                onDelete={() => deleteMessage(selectedMessage.id)}
                onCopy={copyContent}
                onToggleView={() => setShowTextOnly(!showTextOnly)}
                onDownloadAttachment={downloadAttachment}
              />
            </motion.div>
          ) : (
            <motion.div
              key="inbox"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Active email card */}
              {activeAccount && (
                <div className="glass rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-mono text-white/90 truncate">{activeAccount.address}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-white/30">
                            {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo leído'}
                            {messages.length > 0 ? ` · ${messages.length} total` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={copyEmail}
                        className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                        title="Copiar correo"
                      >
                        {copiedEmail ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-white/40" />}
                      </button>
                      <button
                        onClick={() => fetchMessages()}
                        className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/60 transition-colors"
                        title="Actualizar"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteAccount(activeAccount)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
                        title="Eliminar cuenta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Search and filters */}
              {activeAccount && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Buscar por asunto o remitente..."
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => setFilterUnread(!filterUnread)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      filterUnread ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-white/40 hover:text-white/60 border border-white/[0.06]'
                    }`}
                  >
                    No leídos
                  </button>
                </div>
              )}

              {/* Message list */}
              {isLoadingMessages && messages.length === 0 ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="glass rounded-xl p-4">
                      <div className="shimmer h-4 w-32 rounded mb-2" />
                      <div className="shimmer h-3 w-64 rounded mb-1" />
                      <div className="shimmer h-3 w-48 rounded" />
                    </div>
                  ))}
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="text-center py-16">
                  <Inbox className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <p className="text-white/30 text-sm">
                    {searchQuery ? 'Sin resultados' : 'Sin correos aún'}
                  </p>
                  <p className="text-white/15 text-xs mt-1">
                    {searchQuery ? 'Intenta con otra búsqueda' : 'Los mensajes aparecerán aquí automáticamente'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredMessages.map((msg, idx) => (
                    <motion.button
                      key={msg.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => openMessage(msg)}
                      className={`w-full text-left glass rounded-xl p-3.5 hover:bg-white/[0.05] transition-all group ${
                        !msg.seen ? 'border-indigo-500/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                          !msg.seen ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/[0.04] text-white/40'
                        }`}>
                          {(msg.from?.name || msg.from?.address || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm truncate ${!msg.seen ? 'font-semibold text-white/90' : 'text-white/60'}`}>
                              {msg.from?.name || msg.from?.address || 'Desconocido'}
                            </p>
                            <span className="text-[10px] text-white/25 shrink-0">
                              {formatTime(msg.createdAt)}
                            </span>
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${!msg.seen ? 'text-white/70' : 'text-white/40'}`}>
                            {msg.subject || 'Sin asunto'}
                          </p>
                          {msg.intro && (
                            <p className="text-[11px] text-white/25 truncate mt-0.5">{msg.intro}</p>
                          )}
                        </div>
                        {!msg.seen && (
                          <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2" />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Create email modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold">Crear correo temporal</h2>
                <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-white/[0.06]">
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Nombre de usuario</label>
                  <div className="flex gap-2 mt-1.5">
                    <input
                      type="text"
                      value={customUsername}
                      onChange={e => setCustomUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                      placeholder={randomUsername(8)}
                      className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-indigo-500/50 font-mono transition-colors"
                    />
                    <select
                      value={selectedDomain}
                      onChange={e => setSelectedDomain(e.target.value)}
                      className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-indigo-500/50 transition-colors"
                    >
                      {domains.map(d => (
                        <option key={d.id} value={d.domain} className="bg-[#1a1a2e]">@{d.domain}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-xs text-indigo-400">
                    <Zap className="w-3.5 h-3.5" />
                    <span>La contraseña se genera automáticamente</span>
                  </div>
                </div>

                {customUsername && selectedDomain && (
                  <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                    <p className="text-xs text-white/30 mb-1">Tu correo será</p>
                    <p className="font-mono text-sm text-indigo-400">{customUsername}@{selectedDomain}</p>
                  </div>
                )}

                <button
                  onClick={createEmail}
                  disabled={isCreating || domains.length === 0}
                  className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-all flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      Generar correo
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// MESSAGE VIEW
// ============================================================

function MessageView({
  message,
  html,
  showTextOnly,
  onBack,
  onDelete,
  onCopy,
  onToggleView,
  onDownloadAttachment,
}: {
  message: MailMessage
  html: string | null
  showTextOnly: boolean
  onBack: () => void
  onDelete: () => void
  onCopy: () => void
  onToggleView: () => void
  onDownloadAttachment: (url: string, filename: string) => void
}) {
  return (
    <div className="space-y-4">
      {/* Back button + actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver
        </button>
        <div className="flex items-center gap-1">
          <button onClick={onCopy} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/60 transition-colors" title="Copiar contenido">
            <Copy className="w-4 h-4" />
          </button>
          {html && (
            <button onClick={onToggleView} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-colors border border-white/[0.06]">
              {showTextOnly ? 'HTML' : 'Texto'}
            </button>
          )}
          <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors" title="Eliminar">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message header */}
      <div className="glass rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-3">{message.subject || 'Sin asunto'}</h2>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-white/30">De:</span>
            <span className="text-white/70">
              {message.from?.name && <span className="font-medium">{message.from.name} </span>}
              <span className="text-white/40">&lt;{message.from?.address}&gt;</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/30">Fecha:</span>
            <span className="text-white/50">{new Date(message.createdAt).toLocaleString('es')}</span>
          </div>
        </div>
      </div>

      {/* Attachments */}
      {message.attachments && message.attachments.length > 0 && (
        <div className="glass rounded-xl p-3">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Adjuntos ({message.attachments.length})</p>
          <div className="flex flex-wrap gap-2">
            {message.attachments.map(att => (
              <button
                key={att.id}
                onClick={() => onDownloadAttachment(att.downloadUrl, att.filename)}
                className="flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white/60 hover:text-white/80 transition-colors"
              >
                <Download className="w-3 h-3" />
                {att.filename}
                <span className="text-white/25">({formatSize(att.size)})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message body */}
      <div className="glass rounded-xl p-4">
        {showTextOnly ? (
          <pre className="whitespace-pre-wrap text-sm text-white/80 font-sans">{message.text || message.intro || 'Sin contenido'}</pre>
        ) : html ? (
          <div className="email-content" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className="whitespace-pre-wrap text-sm text-white/80 font-sans">{message.text || message.intro || 'Sin contenido'}</pre>
        )}
      </div>
    </div>
  )
}

// ============================================================
// HELPERS
// ============================================================

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Ahora'
  if (diffMin < 60) return `${diffMin}m`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
