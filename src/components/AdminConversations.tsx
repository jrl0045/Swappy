import { useState, useEffect, useRef } from 'react';
import { fetchAllMessagesAdmin, MessageData } from '../lib/api';
import { X, Search, Package, Calendar, Clock, ShieldCheck } from 'lucide-react';

interface AdminConversation {
  id: string;
  userAId: string;
  userAName: string;
  userAAvatar: string;
  userBId: string;
  userBName: string;
  userBAvatar: string;
  itemId: string | null;
  itemTitle: string | null;
  itemImage: string | null;
  ownerId?: string;
  messages: MessageData[];
  lastUpdated: string;
}

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
  pending:   { label: 'Pendiente', bg: 'bg-yellow-50',  text: 'text-yellow-700',  dot: 'bg-yellow-400',  border: 'border-yellow-200' },
  confirmed: { label: 'Confirmado', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  cancelled: { label: 'Rechazado',  bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-400',     border: 'border-red-200' },
};

function AdminRentalCard({ payload }: { payload: RentalRequestPayload }) {
  const cfg = statusConfig[payload.status] || statusConfig.pending;
  const fmt = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className={`rounded-2xl border-2 ${cfg.border} overflow-hidden w-full max-w-xs shadow-sm bg-white`}>
      <div className={`${cfg.bg} px-3 py-2 flex items-center gap-2`}>
        <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
        <span className={`text-[11px] font-bold ${cfg.text} uppercase tracking-wide`}>{cfg.label}</span>
      </div>
      <div className="bg-white p-3 flex items-center gap-3 border-b border-gray-100">
        {payload.itemImage ? (
          <img src={payload.itemImage} alt={payload.itemTitle} className="w-12 h-12 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"><Package size={18} className="text-gray-300" /></div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{payload.itemTitle}</p>
          <p className="text-sm font-bold text-accent">€{payload.totalPrice.toFixed(2)} total</p>
        </div>
      </div>
      <div className="bg-white px-3 py-2.5 space-y-1.5">
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
    </div>
  );
}

function AdminChatModal({ conv, onClose }: { conv: AdminConversation; onClose: () => void }) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const latestRentalStatus: Record<string, 'pending' | 'confirmed' | 'cancelled'> = {};
  for (const m of conv.messages) {
    const p = parseRentalRequest(m.content);
    if (p) latestRentalStatus[p.rentalId] = p.status;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white z-10 shrink-0">
          <div>
            <h3 className="font-bold text-lg text-gray-900">
              Chat: {conv.userAName} & {conv.userBName}
            </h3>
            {conv.itemTitle && <p className="text-sm text-accent font-medium">{conv.itemTitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50/50">
          {conv.messages.map((msg, idx) => {
            const showDate = idx === 0 || new Date(msg.createdAt).toDateString() !== new Date(conv.messages[idx - 1].createdAt).toDateString();
            const p = parseRentalRequest(msg.content);
            const effectivePayload = p ? { ...p, status: latestRentalStatus[p.rentalId] ?? p.status } : null;

            const isUserA = msg.senderId === conv.userAId;

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[11px] text-gray-400 font-medium shrink-0 uppercase tracking-wider">
                      {new Date(msg.createdAt).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}
                
                <div className={`flex flex-col ${isUserA ? 'items-end' : 'items-start'} mb-1`}>
                  <span className="text-[10px] text-gray-500 mb-1 px-1 font-medium">{msg.senderName}</span>
                  
                  {effectivePayload ? (
                    <AdminRentalCard payload={effectivePayload} />
                  ) : (
                    <div className={`px-4 py-2.5 text-sm rounded-2xl max-w-[80%] ${
                      isUserA 
                        ? 'bg-accent text-white rounded-br-sm' 
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                    }`}>
                      {msg.content}
                    </div>
                  )}
                  <span className="text-[10px] text-gray-400 mt-1 px-1">
                    {new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}

export function AdminConversations() {
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [selectedConv, setSelectedConv] = useState<AdminConversation | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await fetchAllMessagesAdmin();
      const groups = new Map<string, AdminConversation>();

      data.forEach(msg => {
        const u1 = msg.senderId < msg.receiverId ? msg.senderId : msg.receiverId;
        const u2 = msg.senderId < msg.receiverId ? msg.receiverId : msg.senderId;
        const u1Name = msg.senderId < msg.receiverId ? msg.senderName : msg.receiverName;
        const u1Avatar = msg.senderId < msg.receiverId ? msg.senderAvatar : msg.receiverAvatar;
        const u2Name = msg.senderId < msg.receiverId ? msg.receiverName : msg.senderName;
        const u2Avatar = msg.senderId < msg.receiverId ? msg.receiverAvatar : msg.senderAvatar;
        
        const key = `${u1}-${u2}-${msg.itemId || 'no-item'}`;
        
        if (!groups.has(key)) {
          groups.set(key, {
            id: key,
            userAId: u1, userAName: u1Name, userAAvatar: u1Avatar,
            userBId: u2, userBName: u2Name, userBAvatar: u2Avatar,
            itemId: msg.itemId, itemTitle: msg.itemTitle, itemImage: null,
            messages: [],
            lastUpdated: msg.createdAt,
          });
        }
        const conv = groups.get(key)!;
        conv.messages.push(msg);
        
        if (new Date(msg.createdAt) > new Date(conv.lastUpdated)) {
          conv.lastUpdated = msg.createdAt;
        }

        if (msg.content.startsWith('__RENTAL_REQUEST__')) {
          try {
            const p = JSON.parse(msg.content.replace('__RENTAL_REQUEST__', ''));
            if (p.itemImage && !conv.itemImage) conv.itemImage = p.itemImage;
            if (p.itemTitle && !conv.itemTitle) conv.itemTitle = p.itemTitle;
            conv.ownerId = msg.receiverId;
          } catch {}
        }
      });

      const convsArray = Array.from(groups.values()).sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
      convsArray.forEach(c => c.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      
      setConversations(convsArray);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
    setLoading(false);
  };

  const filteredConvs = conversations.filter(c => {
    const uFilter = userFilter.toLowerCase();
    const matchUser = c.userAName.toLowerCase().includes(uFilter) || c.userBName.toLowerCase().includes(uFilter);
    
    const convDate = new Date(c.lastUpdated);
    let matchDate = true;
    if (startDate) {
      matchDate = matchDate && convDate >= new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      matchDate = matchDate && convDate < end;
    }
    
    return matchUser && matchDate;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Conversaciones</h2>
          <p className="text-sm text-gray-500">Consulta los mensajes intercambiados en la plataforma</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar usuario..." 
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full md:w-36 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <span className="text-gray-400">-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full md:w-36 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">Cargando conversaciones...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-900">Fecha</th>
                <th className="px-6 py-4 font-medium text-gray-900">Dueño / Solicitante</th>
                <th className="px-6 py-4 font-medium text-gray-900">Tarjeta del Anuncio</th>
                <th className="px-6 py-4 font-medium text-gray-900">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredConvs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron conversaciones con esos filtros.
                  </td>
                </tr>
              ) : (
                filteredConvs.map(conv => {
                  let ownerName = 'Desconocido';
                  let requesterName = 'Desconocido';
                  
                  if (conv.ownerId) {
                    if (conv.ownerId === conv.userAId) {
                      ownerName = conv.userAName;
                      requesterName = conv.userBName;
                    } else {
                      ownerName = conv.userBName;
                      requesterName = conv.userAName;
                    }
                  } else {
                    ownerName = conv.userAName;
                    requesterName = conv.userBName;
                  }

                  return (
                    <tr key={conv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {new Date(conv.lastUpdated).toLocaleString('es-ES', { 
                          day: '2-digit', month: '2-digit', year: 'numeric', 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-accent uppercase w-16">Dueño:</span>
                            <span className="font-medium text-gray-900 truncate max-w-[120px]">{ownerName}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase w-16">Interesado:</span>
                            <span className="text-gray-700 truncate max-w-[120px]">{requesterName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {conv.itemId || conv.itemTitle ? (
                          <button 
                            onClick={() => setSelectedConv(conv)}
                            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-2 hover:border-accent hover:shadow-sm transition-all text-left max-w-[200px] group"
                          >
                            {conv.itemImage ? (
                              <img src={conv.itemImage} alt={conv.itemTitle || ''} className="w-10 h-10 rounded-lg object-cover shrink-0" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                                <Package size={16} className="text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-gray-900 truncate">{conv.itemTitle || 'Sin título'}</p>
                              <p className="text-[10px] text-accent font-medium mt-0.5 group-hover:underline">Ver conversación</p>
                            </div>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400 italic text-xs">
                            <Package size={14} /> Mensaje directo
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setSelectedConv(conv)}
                          className="px-4 py-2 bg-accent/10 text-accent hover:bg-accent hover:text-white rounded-xl text-xs font-semibold transition-colors"
                        >
                          Ver Chat
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedConv && (
        <AdminChatModal conv={selectedConv} onClose={() => setSelectedConv(null)} />
      )}
    </div>
  );
}

