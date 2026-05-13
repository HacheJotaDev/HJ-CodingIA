'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Trash2,
  Copy,
  Download,
  Paperclip,
  Clock,
  User,
  Mail,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import type { MailMessage } from '@/lib/types';

interface MessageViewProps {
  message: MailMessage;
  onBack: () => void;
  onDelete: (id: string) => void;
  activeToken: string;
}

function sanitizeHtml(html: string): string {
  let sanitized = html;

  // Remove script tags and content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Remove object and embed tags
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^>]*>/gi, '');

  // Remove on* event handlers
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');

  // Remove javascript: URLs
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');

  // Remove data: URLs in src that could be malicious
  sanitized = sanitized.replace(/src\s*=\s*["']data:text\/html[^"']*["']/gi, 'src=""');

  // Add target="_blank" and rel to all links
  sanitized = sanitized.replace(
    /<a\s+/gi,
    '<a target="_blank" rel="noopener noreferrer" '
  );

  return sanitized;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function MessageView({ message, onBack, onDelete, activeToken }: MessageViewProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showHtml, setShowHtml] = useState(true);

  const hasHtml = message.html && message.html.length > 0;
  const hasText = !!message.text;
  const hasAttachments = message.attachments && message.attachments.length > 0;

  const sanitizedHtml = useMemo(() => {
    if (!hasHtml) return '';
    return sanitizeHtml(message.html!.join(''));
  }, [message.html, hasHtml]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(message.id);
      toast.success('Mensaje eliminado');
      onBack();
    } catch {
      toast.error('Error al eliminar mensaje');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyContent = async () => {
    const content = message.text || message.subject || '';
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Contenido copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success('Correo copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const downloadAttachment = (attachment: { downloadUrl: string; filename: string }) => {
    const url = `https://api.mail.tm${attachment.downloadUrl}`;
    window.open(url, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={copyContent}
            className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-all"
            title="Copiar contenido"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all disabled:opacity-50"
            title="Eliminar mensaje"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-white/[0.04]">
        <h2 className="text-lg font-semibold text-white mb-3">
          {message.subject || '(Sin asunto)'}
        </h2>

        <div className="space-y-2">
          {/* From */}
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-white/30 shrink-0" />
            <span className="text-xs text-white/30 w-12 shrink-0">De:</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm text-white/80 truncate">
                {message.from.name || message.from.address}
              </span>
              {message.from.name && (
                <button
                  onClick={() => copyEmail(message.from.address)}
                  className="text-xs text-white/30 hover:text-indigo-400 transition-colors truncate"
                >
                  &lt;{message.from.address}&gt;
                </button>
              )}
            </div>
          </div>

          {/* To */}
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-white/30 shrink-0" />
            <span className="text-xs text-white/30 w-12 shrink-0">Para:</span>
            <span className="text-sm text-white/50 truncate">
              {message.to.map((t) => t.address).join(', ')}
            </span>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-white/30 shrink-0" />
            <span className="text-xs text-white/30 w-12 shrink-0">Fecha:</span>
            <span className="text-sm text-white/50">
              {formatDate(message.createdAt)}
            </span>
          </div>
        </div>

        {/* Attachments */}
        {hasAttachments && (
          <div className="mt-3 pt-3 border-t border-white/[0.04]">
            <p className="text-xs text-white/40 mb-2 flex items-center gap-1.5">
              <Paperclip className="w-3 h-3" />
              {message.attachments.length} archivo{message.attachments.length > 1 ? 's' : ''} adjunto{message.attachments.length > 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              {message.attachments.map((att) => (
                <button
                  key={att.id}
                  onClick={() => downloadAttachment(att)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/60 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                >
                  <Paperclip className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">{att.filename}</span>
                  <Download className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content Toggle */}
      {hasHtml && hasText && (
        <div className="px-4 sm:px-6 pt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHtml(true)}
              className={`px-3 py-1 rounded-md text-xs transition-all ${
                showHtml
                  ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              HTML
            </button>
            <button
              onClick={() => setShowHtml(false)}
              className={`px-3 py-1 rounded-md text-xs transition-all ${
                !showHtml
                  ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Texto
            </button>
            <div className="flex items-center gap-1 ml-auto text-white/20">
              <Shield className="w-3 h-3" />
              <span className="text-[10px]">HTML sanitizado</span>
            </div>
          </div>
        </div>
      )}

      {/* Message Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {showHtml && hasHtml ? (
          <div
            className="email-content text-white/80 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : hasText ? (
          <pre className="whitespace-pre-wrap text-white/80 text-sm leading-relaxed font-sans">
            {message.text}
          </pre>
        ) : hasHtml ? (
          <div
            className="email-content text-white/80 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : (
          <p className="text-white/30 text-sm text-center py-8">
            Este mensaje no tiene contenido visible
          </p>
        )}
      </div>
    </motion.div>
  );
}
