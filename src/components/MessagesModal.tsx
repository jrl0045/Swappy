import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Loader2, Calendar, ShieldCheck, Check, Clock, Package, Search, UserRound, X, MessageCircle, MapPin } from 'lucide-react';
import { fetchInbox, sendMessage, markMessageAsRead, subscribeToMessages, updateRentalStatus, fetchProfile, MessageData } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface RentalRequestPayload {
  type: 'RENTAL_REQUEST';
  rentalId: string;
  startDate: string;
  endDate: string;
  days: number;
  totalPrice: number;
  insuranceTier: string;
  itemImage: string;
  itemTitle: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

function parseRentalRequest(content: string): RentalRequestPayload | null {
  if (!content.startsWith('__RENTAL_REQUEST__')) return null;
  try { return JSON.parse(content.replace('__RENTAL_REQUEST__', '')); }
  catch { return null; }
}

const insuranceLabels: Record<string, string> = {
  none: 'Sin protección', basic: 'Básica', full: 'Completa', premium: 'Premium',
};

const statusConfig = {
  pending:   { label: 'Pendiente de confirmación', bg: 'bg-yellow-50',  text: 'text-yellow-700',  dot: 'bg-yellow-400',  border: 'border-yellow-200' },
  confirmed: { label: 'Alquiler confirmado',        bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  cancelled: { label: 'Solicitud rechazada',        bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-400',     border: 'border-red-200' },
};

interface Conversation {
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string;
  itemId: string | null;
  itemTitle: string | null;
  itemImage: string | null;
  lastMessage: MessageData;
  messages: MessageData[];
  pendingRentals: number;
  unread: number;
}

// ─── Rental embed card ────────────────────────────────────────────────────────

function RentalRequestCard({ payload, isOwner, onAction, actionLoading }: {
  payload: RentalRequestPayload;
  isOwner: boolean;
  onAction: (rentalId: string, status: 'confirmed' | 'cancelled') => Promise<void>;
  actionLoading: string | null;
}) {
  const cfg = statusConfig[payload.status] ?? statusConfig.pending;
  const isPending = payload.status === 'pending';
  const isConfirmed = payload.status === 'confirmed';
  const fmt = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className={`rounded-2xl border-2 ${cfg.border} overflow-hidden w-full max-w-xs shadow-sm`}>

      {/* Status header */}
      <div className={`${cfg.bg} px-3 py-2 flex items-center gap-2`}>
        <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
        <span className={`text-[11px] font-bold ${cfg.text} uppercase tracking-wide`}>{cfg.label}</span>
      </div>

      {/* Item */}
      <div className="bg-white p-3 flex items-center gap-3 border-b border-gray-100">
        {payload.itemImage
          ? <img src={payload.itemImage} alt={payload.itemTitle} className="w-12 h-12 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
          : <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"><Package size={18} className="text-gray-300" /></div>}
        <div className="min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{payload.itemTitle}</p>
          <p className="text-sm font-bold text-accent">€{payload.totalPrice.toFixed(2)} total</p>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white px-3 py-2.5 space-y-1.5 border-b border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Calendar size={11} className="text-accent shrink-0" />
          <span>{fmt(payload.startDate)} → {fmt(payload.endDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock size={11} className="shrink-0" />
          <span>{payload.days} {payload.days === 1 ? 'día' : 'días'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <ShieldCheck size={11} className="shrink-0" />
          <span>Protección {insuranceLabels[payload.insuranceTier] ?? payload.insuranceTier}</span>
        </div>
      </div>

      {/* Acciones para el propietario (solo si pendiente) */}
      {isOwner && isPending && (
        <div className="bg-white p-2.5 flex gap-2">
          <button onClick={() => onAction(payload.rentalId, 'cancelled')} disabled={actionLoading === payload.rentalId}
            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
            <X size={12} /> Rechazar
          </button>
          <button onClick={() => onAction(payload.rentalId, 'confirmed')} disabled={actionLoading === payload.rentalId}
            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
            {actionLoading === payload.rentalId ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Confirmar
          </button>
        </div>
      )}

      {/* Estado final para el arrendatario */}
      {!isOwner && !isPending && (
        <div className={`${cfg.bg} px-3 py-2.5 flex items-center gap-2`}>
          {isConfirmed
            ? <Check size={13} className="text-emerald-600 shrink-0" />
            : <X size={13} className="text-red-500 shrink-0" />}
          <span className={`text-xs font-semibold ${cfg.text}`}>
            {isConfirmed ? '¡El propietario confirmó tu alquiler!' : 'El propietario rechazó esta solicitud'}
          </span>
        </div>
      )}

      {/* Estado final para el propietario (ya actuó) */}
      {isOwner && !isPending && (
        <div className={`${cfg.bg} px-3 py-2.5 flex items-center gap-2`}>
          {isConfirmed
            ? <Check size={13} className="text-emerald-600 shrink-0" />
            : <X size={13} className="text-red-500 shrink-0" />}
          <span className={`text-xs font-semibold ${cfg.text}`}>
            {isConfirmed ? 'Confirmaste este alquiler' : 'Rechazaste esta solicitud'}
          </span>
        </div>
      )}

      {/* Si confirmado: recordatorio de coordinar recogida */}
      {isConfirmed && (
        <div className="bg-accent/5 border-t border-accent/10 px-3 py-2 flex items-start gap-1.5">
          <MessageCircle size={11} className="text-accent shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-600">
            {isOwner
              ? 'Acuerda con el arrendatario el punto de encuentro y horario.'
              : 'Acuerda el punto de encuentro y horario con el propietario por aquí.'}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── MessagesModal ────────────────────────────────────────────────────────────

export function MessagesModal({ onClose, targetUserId }: { onClose: () => void, targetUserId?: string }) {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) return;
    loadInbox();
    const sub = subscribeToMessages(user.id, loadInbox);
    return () => { sub.unsubscribe(); };
  }, [user, targetUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (activeConv && user) {
      activeConv.messages
        .filter(m => !m.read && m.receiverId === user.id)
        .forEach(m => markMessageAsRead(m.id));
    }
  }, [activeConv?.messages?.length]);

  const loadInbox = async () => {
    if (!user) return;
    const data = await fetchInbox(user.id);
    const groups = new Map<string, Conversation>();

    data.forEach(msg => {
      const isSender = msg.senderId === user.id;
      const otherId = isSender ? msg.receiverId : msg.senderId;
      const otherName = isSender ? msg.receiverName : msg.senderName;
      const otherAvatar = isSender ? msg.receiverAvatar : msg.senderAvatar;
      const convKey = `${otherId}-${msg.itemId || 'no-item'}`;

      if (!groups.has(convKey)) {
        groups.set(convKey, {
          otherUserId: otherId, otherUserName: otherName, otherUserAvatar: otherAvatar,
          itemId: msg.itemId, itemTitle: msg.itemTitle, itemImage: null,
          lastMessage: msg, messages: [], pendingRentals: 0, unread: 0,
        });
      }
      const conv = groups.get(convKey)!;
      conv.messages.push(msg);
      // Keep most recent as lastMessage
      if (new Date(msg.createdAt) > new Date(conv.lastMessage.createdAt)) {
        conv.lastMessage = msg;
      }
    });

    const sorted = Array.from(groups.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );

    sorted.forEach(conv => {
      conv.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      // Count pending requests where this user is the owner (receiver of the request)
      conv.pendingRentals = conv.messages.filter(m => {
        if (m.receiverId !== user.id) return false;
        const p = parseRentalRequest(m.content);
        return p?.status === 'pending';
      }).length;

      conv.unread = conv.messages.filter(m => !m.read && m.receiverId === user.id).length;

      // Grab item image from first rental request found
      const rentalMsg = conv.messages.find(m => parseRentalRequest(m.content));
      if (rentalMsg) {
        const p = parseRentalRequest(rentalMsg.content);
        if (p) conv.itemImage = p.itemImage;
      }
    });

    // Handle deep link target
    let finalConvs = sorted;
    let initialActive = activeConv ? sorted.find(c => c.otherUserId === activeConv.otherUserId && c.itemId === activeConv.itemId) : null;

    if (targetUserId && targetUserId !== user.id) {
      const existing = sorted.find(c => c.otherUserId === targetUserId && !c.itemId) || sorted.find(c => c.otherUserId === targetUserId);
      if (existing) {
        initialActive = existing;
      } else {
        try {
          const profile = await fetchProfile(targetUserId);
          if (profile) {
            const emptyConv: Conversation = {
              otherUserId: targetUserId,
              otherUserName: profile.name,
              otherUserAvatar: profile.avatarUrl || '',
              itemId: null, itemTitle: null, itemImage: null,
              lastMessage: { id: '', senderId: user.id, receiverId: targetUserId, content: '', read: true, createdAt: new Date().toISOString() } as any,
              messages: [], pendingRentals: 0, unread: 0,
            };
            finalConvs = [emptyConv, ...sorted];
            initialActive = emptyConv;
          }
        } catch (e) { console.error('Failed to resolve target user', e); }
      }
    }

    setConversations(finalConvs);
    if (initialActive) setActiveConv(initialActive);

    setLoading(false);
  };

  const handleSend = async () => {
    if (!reply.trim() || !user || !activeConv) return;
    setSending(true);
    try {
      await sendMessage({ senderId: user.id, receiverId: activeConv.otherUserId, itemId: activeConv.itemId || undefined, content: reply.trim() });
      setReply('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      await loadInbox();
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const handleRentalAction = async (rentalId: string, newStatus: 'confirmed' | 'cancelled') => {
    if (!user || !activeConv) return;
    // Guard: prevent action if already confirmed or cancelled
    const alreadyActioned = activeConv.messages.some(m => {
      const p = parseRentalRequest(m.content);
      return p?.rentalId === rentalId && p.status !== 'pending';
    });
    if (alreadyActioned) return;
    setActionLoading(rentalId);
    try {
      // 1. Update rental status in DB
      await updateRentalStatus(rentalId, newStatus);

      // 2. Find the original rental request message to copy its payload
      const originalMsg = activeConv.messages.find(m => {
        const p = parseRentalRequest(m.content);
        return p?.rentalId === rentalId;
      });

      if (originalMsg) {
        const originalPayload = parseRentalRequest(originalMsg.content)!;
        // 3. Send a NEW embed message with the updated status
        //    — sent FROM owner TO renter so renter sees it in their chat
        const updatedPayload = JSON.stringify({ ...originalPayload, status: newStatus });
        await sendMessage({
          senderId: user.id,
          receiverId: activeConv.otherUserId,
          itemId: activeConv.itemId || undefined,
          content: `__RENTAL_REQUEST__${updatedPayload}`,
        });
      }

      await loadInbox();
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const isOwnerInConv = (conv: Conversation) =>
    conv.messages.some(m => parseRentalRequest(m.content) !== null && m.receiverId === user?.id);

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReply(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const filteredConvs = conversations.filter(c =>
    c.otherUserName.toLowerCase().includes(search.toLowerCase()) ||
    (c.itemTitle ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const fmtTime = (d: string) => {
    const date = new Date(d);
    const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    if (diffDays < 7) return date.toLocaleDateString('es-ES', { weekday: 'short' });
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const getPreview = (conv: Conversation) => {
    const last = conv.lastMessage;
    const p = parseRentalRequest(last.content);
    if (p) {
      const label = p.status === 'confirmed' ? '✅ Alquiler confirmado' : p.status === 'cancelled' ? '❌ Solicitud rechazada' : '📦 Solicitud de alquiler';
      return label;
    }
    const prefix = last.senderId === user?.id ? 'Tú: ' : '';
    return `${prefix}${last.content}`;
  };

  // Most recent rental payload in the active conversation
  const activeRentalPayload = activeConv
    ? (() => {
        const rentalMsgs = activeConv.messages.filter(m => parseRentalRequest(m.content));
        if (!rentalMsgs.length) return null;
        return parseRentalRequest(rentalMsgs[rentalMsgs.length - 1].content);
      })()
    : null;

  // Latest status per rentalId — used to override old 'pending' cards after confirmation/rejection
  const latestRentalStatus: Record<string, 'pending' | 'confirmed' | 'cancelled'> = {};
  if (activeConv) {
    for (const m of activeConv.messages) {
      const p = parseRentalRequest(m.content);
      if (p) latestRentalStatus[p.rentalId] = p.status;
    }
  }
  const convIsOwner = activeConv ? isOwnerInConv(activeConv) : false;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 h-14 border-b border-gray-100 shrink-0">
        <button onClick={onClose} className="p-2 -ml-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
          <X size={20} />
        </button>
        <span className="font-semibold text-base text-gray-900">Mensajes</span>
      </div>

      <div className="flex flex-1 min-h-0">

        {/* ── LEFT: lista de conversaciones ── */}
        <div className={`w-full sm:w-[320px] lg:w-[360px] border-r border-gray-100 flex flex-col shrink-0 ${activeConv ? 'hidden sm:flex' : 'flex'}`}>
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conversación..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full"><Loader2 size={28} className="text-accent animate-spin" /></div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <MessageCircle size={26} className="text-gray-300" />
                </div>
                <p className="font-semibold text-gray-700 mb-1">Sin conversaciones</p>
                <p className="text-sm text-gray-400">Cuando contactes con alguien, aparecerá aquí.</p>
              </div>
            ) : (
              filteredConvs.map(conv => {
                const isActive = activeConv?.otherUserId === conv.otherUserId && activeConv?.itemId === conv.itemId;
                return (
                  <button key={`${conv.otherUserId}-${conv.itemId}`} onClick={() => setActiveConv(conv)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left border-b border-gray-50 ${isActive ? 'bg-accent/5 border-l-2 border-l-accent' : 'hover:bg-gray-50'}`}>
                    <div className="relative shrink-0">
                      {conv.otherUserAvatar
                        ? <img src={conv.otherUserAvatar} alt={conv.otherUserName} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                        : <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-lg">{conv.otherUserName.charAt(0).toUpperCase()}</div>}
                      {conv.pendingRentals > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">{conv.pendingRentals}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1 mb-0.5">
                        <span className={`text-sm truncate ${conv.unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>{conv.otherUserName}</span>
                        <span className="text-[11px] text-gray-400 shrink-0">{fmtTime(conv.lastMessage.createdAt)}</span>
                      </div>
                      {conv.itemTitle && <p className="text-[10px] text-accent font-semibold truncate mb-0.5 uppercase tracking-wide">{conv.itemTitle}</p>}
                      <p className={`text-xs truncate ${conv.unread > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>{getPreview(conv)}</p>
                    </div>
                    {conv.unread > 0 && <span className="w-2 h-2 bg-accent rounded-full shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── CENTER: hilo ── */}
        <div className={`flex-1 flex flex-col min-w-0 ${!activeConv ? 'hidden sm:flex' : 'flex'}`}>
          {!activeConv ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-5">
                <MessageCircle size={36} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Selecciona una conversación</h3>
              <p className="text-sm text-gray-400 max-w-xs">Elige una conversación de la izquierda para leer y responder mensajes</p>
            </div>
          ) : (
            <>
              {/* Header del hilo */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 shrink-0">
                <button onClick={() => setActiveConv(null)} className="sm:hidden p-1 -ml-1 text-gray-400 hover:bg-gray-100 rounded-full">
                  <X size={18} />
                </button>
                {activeConv.otherUserAvatar
                  ? <img src={activeConv.otherUserAvatar} alt={activeConv.otherUserName} className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                  : <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold">{activeConv.otherUserName.charAt(0)}</div>}
                <div>
                  <p className="font-semibold text-sm text-gray-900 leading-tight">{activeConv.otherUserName}</p>
                  {activeConv.itemTitle && <p className="text-xs text-accent font-medium">{activeConv.itemTitle}</p>}
                </div>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/30">
                {activeConv.messages.map((msg, idx) => {
                  const isMe = msg.senderId === user?.id;
                  const rentalPayload = parseRentalRequest(msg.content);
                  const showDate = idx === 0 || new Date(msg.createdAt).toDateString() !== new Date(activeConv.messages[idx - 1].createdAt).toDateString();
                  const effectivePayload = rentalPayload
                    ? { ...rentalPayload, status: latestRentalStatus[rentalPayload.rentalId] ?? rentalPayload.status }
                    : null;

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex items-center gap-3 my-3">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-[11px] text-gray-400 font-medium shrink-0">
                            {new Date(msg.createdAt).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                      )}

                      {effectivePayload ? (
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <p className="text-[11px] text-gray-400 mb-1.5 px-1">
                            {effectivePayload.status === 'pending'
                              ? (isMe ? 'Solicitud enviada' : 'Nueva solicitud de alquiler')
                              : effectivePayload.status === 'confirmed'
                                ? (isMe ? '✅ Confirmaste el alquiler' : '✅ El propietario confirmó tu alquiler')
                                : (isMe ? '❌ Rechazaste la solicitud' : '❌ El propietario rechazó tu solicitud')
                            }
                          </p>
                          <RentalRequestCard
                            payload={effectivePayload}
                            isOwner={convIsOwner}
                            onAction={handleRentalAction}
                            actionLoading={actionLoading}
                          />
                          <span className="text-[10px] text-gray-400 mt-1 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className="flex flex-col max-w-[70%]">
                            <div className={`px-4 py-2.5 text-sm rounded-2xl ${
                              isMe ? 'bg-accent text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                            }`}>
                              {msg.content}
                            </div>
                            <span className={`text-[10px] text-gray-400 mt-0.5 ${isMe ? 'text-right' : 'text-left'} px-1`}>
                              {new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply bar */}
              <div className="px-4 py-3 bg-white border-t border-gray-100 shrink-0">
                <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10 transition-all">
                  <textarea ref={textareaRef} value={reply} onChange={autoResize}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Escribe un mensaje..." rows={1}
                    className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none min-h-[24px] py-1"
                    style={{ maxHeight: '120px' }} />
                  <button onClick={handleSend} disabled={!reply.trim() || sending}
                    className={`p-2 rounded-xl flex items-center justify-center transition-all shrink-0 ${reply.trim() && !sending ? 'bg-accent text-white hover:bg-accent-dark' : 'text-gray-300 cursor-not-allowed'}`}>
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5 px-1">Quédate en Swappy. No compartas datos de contacto ni bancarios.</p>
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT: panel lateral (desktop) ── */}
        {activeConv && (
          <div className="hidden lg:flex w-[280px] border-l border-gray-100 flex-col shrink-0">
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Objeto</p>
              {activeConv.itemImage ? (
                <img src={activeConv.itemImage} alt={activeConv.itemTitle ?? ''} className="w-full aspect-square object-cover rounded-2xl mb-3" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full aspect-square bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <Package size={32} className="text-gray-300" />
                </div>
              )}
              {activeConv.itemTitle && <p className="font-semibold text-sm text-gray-900 mb-2">{activeConv.itemTitle}</p>}
              {activeRentalPayload && (() => {
                const cfg = statusConfig[activeRentalPayload.status];
                return (
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </div>
                );
              })()}
            </div>
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Usuario</p>
              <div className="flex items-center gap-3">
                {activeConv.otherUserAvatar
                  ? <img src={activeConv.otherUserAvatar} alt={activeConv.otherUserName} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                  : <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold">{activeConv.otherUserName.charAt(0)}</div>}
                <div>
                  <p className="font-semibold text-sm text-gray-900">{activeConv.otherUserName}</p>
                  <p className="text-xs text-gray-400">Miembro de Swappy</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
