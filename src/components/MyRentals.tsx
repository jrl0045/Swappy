import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, Package, ShieldCheck, Loader2, Check, X, Star, CheckCircle2, Send, ChevronRight, AlertCircle, RotateCcw } from 'lucide-react';
import {
  fetchMyRentals, fetchIncomingRentals, updateRentalStatus,
  completeRental, createReview, createUserReview, fetchUserReviewsForRental,
  RentalWithDetails,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';

const statusConfig: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  pending:   { bg: 'bg-yellow-50',  text: 'text-yellow-700',  dot: 'bg-yellow-400',  label: 'Pendiente' },
  confirmed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Confirmado' },
  active:    { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-400',    label: 'Activo' },
  completed: { bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400',    label: 'Completado' },
  cancelled: { bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-400',     label: 'Cancelado' },
};

const insuranceLabels: Record<string, string> = {
  none: 'Sin protección', basic: 'Básica', full: 'Completa', premium: 'Premium',
};

const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

function isExpired(endDate: string): boolean {
  const end = new Date(endDate); end.setHours(0,0,0,0);
  return end < today();
}

function daysUntilEnd(endDate: string): number {
  const end = new Date(endDate); end.setHours(0,0,0,0);
  return Math.ceil((end.getTime() - today().getTime()) / 86400000);
}

// ─── Star input ───────────────────────────────────────────────────────────────

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button"
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => onChange(s)}
          className="transition-transform hover:scale-110">
          <Star size={22} className={`transition-colors ${s <= (hover || value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

type ReviewStep = 'item' | 'owner' | 'renter' | 'done';

function TripleReviewModal({ rental, isOwner, userId, onClose, onDone }: {
  rental: RentalWithDetails; isOwner: boolean; userId: string;
  onClose: () => void; onDone: () => void;
}) {
  const [step, setStep] = useState<ReviewStep>(isOwner ? 'renter' : 'item');
  const [itemRating, setItemRating] = useState(0);
  const [itemComment, setItemComment] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renterName = rental.renterName || 'el arrendatario';
  const ownerName  = rental.ownerName  || 'el propietario';

  const isDuplicate = (msg: string) =>
    msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505');

  const handleItemNext = async () => {
    if (itemRating === 0 || loading) return;
    setError(null); setLoading(true);
    try {
      await createReview({ itemId: rental.itemId, reviewerId: userId, rating: itemRating, comment: itemComment.trim() || undefined, rentalId: rental.id });
    } catch (e: any) {
      const msg = e?.message || JSON.stringify(e);
      if (!isDuplicate(msg)) { setError(`Error: ${msg}`); setLoading(false); return; }
    }
    setLoading(false); setStep('owner');
  };

  const handleUserSubmit = async () => {
    if (userRating === 0 || loading) return;
    setError(null); setLoading(true);
    try {
      await createUserReview({
        rentalId: rental.id, reviewerId: userId,
        reviewedId: isOwner ? rental.renterId : rental.ownerId,
        role: isOwner ? 'owner_rates_renter' : 'renter_rates_owner',
        rating: userRating, comment: userComment.trim() || undefined,
      });
    } catch (e: any) {
      const msg = e?.message || JSON.stringify(e);
      if (!isDuplicate(msg)) { setError(`Error: ${msg}`); setLoading(false); return; }
    }
    setLoading(false); setStep('done');
  };

  const closeBtn = <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={18} /></button>;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        {step === 'item' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] text-accent font-semibold uppercase tracking-wider">Paso 1 de 2</p>{closeBtn}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">¿Cómo estaba el objeto?</h2>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
              {rental.itemImage
                ? <img src={rental.itemImage} alt={rental.itemTitle} className="w-12 h-12 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                : <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"><Package size={18} className="text-gray-400" /></div>}
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{rental.itemTitle}</p>
                <p className="text-xs text-gray-500">Propietario: {ownerName}</p>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-2">Puntuación del objeto</p>
            <StarInput value={itemRating} onChange={setItemRating} />
            <textarea value={itemComment} onChange={e => setItemComment(e.target.value)}
              placeholder="¿Estaba en buen estado? (opcional)"
              className="w-full mt-3 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none h-20 bg-white" />
            <button type="button" onClick={handleItemNext} disabled={itemRating === 0 || loading}
              className={`mt-4 w-full py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all ${itemRating > 0 && !loading ? 'bg-accent text-white hover:bg-accent-dark' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
              Siguiente: valorar a {ownerName}
            </button>
          </div>
        )}

        {step === 'owner' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] text-accent font-semibold uppercase tracking-wider">Paso 2 de 2</p>{closeBtn}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">¿Cómo fue {ownerName}?</h2>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-lg shrink-0">{ownerName.charAt(0).toUpperCase()}</div>
              <div><p className="font-semibold text-sm">{ownerName}</p><p className="text-xs text-gray-500">Propietario del objeto</p></div>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-2">Puntuación</p>
            <StarInput value={userRating} onChange={setUserRating} />
            <textarea value={userComment} onChange={e => setUserComment(e.target.value)}
              placeholder="¿Fue atento? ¿El objeto estaba como describía? (opcional)"
              className="w-full mt-3 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none h-20 bg-white" />
            <button type="button" onClick={handleUserSubmit} disabled={userRating === 0 || loading}
              className={`mt-4 w-full py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all ${userRating > 0 && !loading ? 'bg-accent text-white hover:bg-accent-dark' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              Enviar valoración
            </button>
          </div>
        )}

        {step === 'renter' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] text-accent font-semibold uppercase tracking-wider">Valorar arrendatario</p>{closeBtn}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">¿Cómo fue {renterName}?</h2>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-lg shrink-0">{renterName.charAt(0).toUpperCase()}</div>
              <div><p className="font-semibold text-sm">{renterName}</p><p className="text-xs text-gray-500">Arrendatario del alquiler</p></div>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-2">Puntuación</p>
            <StarInput value={userRating} onChange={setUserRating} />
            <textarea value={userComment} onChange={e => setUserComment(e.target.value)}
              placeholder="¿Cuidó bien el objeto? ¿Fue puntual? (opcional)"
              className="w-full mt-3 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none h-20 bg-white" />
            <button type="button" onClick={handleUserSubmit} disabled={userRating === 0 || loading}
              className={`mt-4 w-full py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all ${userRating > 0 && !loading ? 'bg-accent text-white hover:bg-accent-dark' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              Enviar valoración
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="p-10 flex flex-col items-center text-center">
            <CheckCircle2 size={72} className="text-accent mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">¡Valoraciones enviadas!</h2>
            <p className="text-gray-500 text-sm mb-6">Gracias por contribuir a la comunidad de Swappy.</p>
            <button onClick={onDone} className="px-8 py-3 bg-accent text-white rounded-2xl font-semibold hover:bg-accent-dark transition-colors">Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Rental Card ─────────────────────────────────────────────────────────────

function RentalCard({ rental, isIncoming, onAction, onEarlyReturn, onReview, actionLoadingId, completingId, reviewedRentals }: {
  rental: RentalWithDetails; isIncoming: boolean; userId: string;
  onAction: (id: string, status: 'confirmed' | 'cancelled') => Promise<void>;
  onEarlyReturn: (r: RentalWithDetails) => void;
  onReview: (r: RentalWithDetails) => void;
  actionLoadingId: string | null; completingId: string | null;
  reviewedRentals: Set<string>;
}) {
  const fmt = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const days = Math.max(1, Math.ceil((new Date(rental.endDate).getTime() - new Date(rental.startDate).getTime()) / 86400000));
  const expired = isExpired(rental.endDate);
  const effectiveStatus = (rental.status === 'confirmed' || rental.status === 'active') && expired ? 'completed' : rental.status;
  const statusCfg = statusConfig[effectiveStatus] || statusConfig.pending;
  const counterpart = isIncoming ? (rental.renterName || '—') : rental.ownerName;
  const remaining = daysUntilEnd(rental.endDate);
  const isActive = (rental.status === 'confirmed' || rental.status === 'active') && !expired;
  const canEarlyReturn = isActive && remaining > 0;
  const canReview = effectiveStatus === 'completed' && !reviewedRentals.has(rental.id);
  const isReviewed = effectiveStatus === 'completed' && reviewedRentals.has(rental.id);

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        <div className="w-full sm:w-24 h-28 sm:h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative">
          {rental.itemImage
            ? <img src={rental.itemImage} alt={rental.itemTitle} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            : <div className="w-full h-full flex items-center justify-center"><Package size={24} className="text-gray-300" /></div>}
          <div className={`sm:hidden absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${statusCfg.bg} ${statusCfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{rental.itemTitle}</h3>
            <span className={`hidden sm:inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            <span className="font-medium text-gray-700">{isIncoming ? 'Solicitado por: ' : 'Propietario: '}</span>
            <span className="font-semibold text-gray-800">{counterpart}</span>
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Calendar size={11} className="text-accent" />{fmt(rental.startDate)} → {fmt(rental.endDate)}</span>
            <span className="flex items-center gap-1"><Clock size={11} />{days} {days === 1 ? 'día' : 'días'}</span>
            <span className="flex items-center gap-1"><ShieldCheck size={11} />{insuranceLabels[rental.insuranceTier] || rental.insuranceTier}</span>
          </div>
          {isActive && (
            <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${remaining <= 1 ? 'bg-orange-50 text-orange-600' : 'bg-accent/5 text-accent'}`}>
              <Clock size={11} />
              {remaining === 0 ? 'Último día hoy' : remaining === 1 ? 'Devolver mañana' : `${remaining} días restantes`}
            </div>
          )}
          {expired && effectiveStatus === 'completed' && rental.status !== 'completed' && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">
              <CheckCircle2 size={11} /> Finalizado automáticamente
            </div>
          )}
        </div>
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 sm:border-l border-gray-100 pt-3 sm:pt-0 sm:pl-4 shrink-0 gap-2">
          <div className="text-right">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-0.5">Total</div>
            <div className="text-base font-bold text-accent">€{rental.totalPrice.toFixed(2)}</div>
          </div>
          {isIncoming && rental.status === 'pending' && (
            <div className="flex gap-2">
              <button onClick={() => onAction(rental.id, 'cancelled')} disabled={actionLoadingId === rental.id}
                className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors disabled:opacity-50">
                <X size={15} />
              </button>
              <button onClick={() => onAction(rental.id, 'confirmed')} disabled={actionLoadingId === rental.id}
                className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors disabled:opacity-50">
                {actionLoadingId === rental.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              </button>
            </div>
          )}
          {canEarlyReturn && (
            <button onClick={() => onEarlyReturn(rental)} disabled={completingId === rental.id}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center gap-1.5">
              {completingId === rental.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              Devolver antes
            </button>
          )}
          {canReview && (
            <button onClick={() => onReview(rental)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-all flex items-center gap-1.5">
              <Star size={12} className="fill-yellow-400 text-yellow-400" /> Valorar
            </button>
          )}
          {isReviewed && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <CheckCircle2 size={12} className="text-emerald-500" /> Valorado
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Early return confirm ─────────────────────────────────────────────────────

function EarlyReturnConfirm({ rental, onConfirm, onCancel, loading }: {
  rental: RentalWithDetails; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
            <RotateCcw size={20} className="text-orange-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Devolución anticipada</h2>
            <p className="text-xs text-gray-500">El alquiler se marcará como finalizado</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 mb-5 text-sm text-gray-600">
          ¿Confirmas que ya has devuelto <span className="font-semibold text-gray-900">{rental.itemTitle}</span>? Esta acción no se puede deshacer.
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main MyRentals ───────────────────────────────────────────────────────────

type Tab = 'active' | 'incoming' | 'history';

export function MyRentals() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [outgoing, setOutgoing] = useState<RentalWithDetails[]>([]);
  const [incoming, setIncoming] = useState<RentalWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<{ rental: RentalWithDetails; isOwner: boolean } | null>(null);
  const [earlyReturnRental, setEarlyReturnRental] = useState<RentalWithDetails | null>(null);
  const [reviewedRentals, setReviewedRentals] = useState<Set<string>>(new Set());

  const loadData = async () => {
    if (!user) return;
    try {
      const [outData, inData] = await Promise.all([
        fetchMyRentals(user.id),
        fetchIncomingRentals(user.id),
      ]);

      // Deduplicar por rental.id antes de auto-completar
      const allById = new Map<string, RentalWithDetails>();
      [...outData, ...inData].forEach(r => { if (!allById.has(r.id)) allById.set(r.id, r); });
      const unique = Array.from(allById.values());

      const expired = unique.filter(
        r => (r.status === 'confirmed' || r.status === 'active') && isExpired(r.endDate) && r.itemId
      );

      if (expired.length > 0) {
        await Promise.all(expired.map(r => completeRental(r.id, r.itemId).catch(() => {})));
        const [fresh1, fresh2] = await Promise.all([fetchMyRentals(user.id), fetchIncomingRentals(user.id)]);
        setOutgoing(fresh1);
        setIncoming(fresh2);
        await loadReviewed([...fresh1, ...fresh2]);
      } else {
        setOutgoing(outData);
        setIncoming(inData);
        await loadReviewed([...outData, ...inData]);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadReviewed = async (all: RentalWithDetails[]) => {
    if (!user) return;
    const completed = all.filter(r => r.status === 'completed');
    const checks = await Promise.all(completed.map(r => fetchUserReviewsForRental(r.id)));
    const reviewed = new Set<string>();
    checks.forEach((revs, i) => {
      if (revs.some(rv => rv.reviewerId === user.id)) reviewed.add(completed[i].id);
    });
    setReviewedRentals(reviewed);
  };

  useEffect(() => { loadData(); }, [user]);

  const handleAction = async (rentalId: string, status: 'confirmed' | 'cancelled') => {
    setActionLoadingId(rentalId);
    try { await updateRentalStatus(rentalId, status); await loadData(); }
    catch (e) { console.error(e); }
    finally { setActionLoadingId(null); }
  };

  const handleEarlyReturn = async () => {
    if (!earlyReturnRental) return;
    setCompletingId(earlyReturnRental.id);
    try {
      await completeRental(earlyReturnRental.id, earlyReturnRental.itemId);
      setEarlyReturnRental(null);
      await loadData();
      const isOwner = incoming.some(r => r.id === earlyReturnRental.id);
      setReviewModal({ rental: { ...earlyReturnRental, status: 'completed' }, isOwner });
    } catch (e) { console.error(e); }
    finally { setCompletingId(null); }
  };

  const handleOpenReview = (rental: RentalWithDetails) => {
    const isOwner = incoming.some(r => r.id === rental.id);
    setReviewModal({ rental, isOwner });
  };

  const activeOut = outgoing.filter(r => ['pending', 'confirmed', 'active'].includes(r.status));
  const historyOut = outgoing.filter(r => ['completed', 'cancelled'].includes(r.status));
  const historyIn = incoming.filter(r => ['completed', 'cancelled'].includes(r.status));
  const pendingIncoming = incoming.filter(r => r.status === 'pending').length;

  // Historial: deduplicar por id (un alquiler donde el usuario es propietario y arrendatario a la vez no debería ocurrir, pero por seguridad)
  const historyAll = Array.from(
    new Map([...historyOut, ...historyIn].map(r => [r.id, r])).values()
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'active',   label: 'Mis alquileres' },
    { key: 'incoming', label: 'Solicitudes', badge: pendingIncoming || undefined },
    { key: 'history',  label: 'Historial' },
  ];

  const tabContent: Record<Tab, { rentals: RentalWithDetails[]; isIncoming: boolean; empty: string }> = {
    active:   { rentals: activeOut, isIncoming: false, empty: 'No tienes alquileres activos.' },
    incoming: { rentals: incoming.filter(r => !['completed','cancelled'].includes(r.status)), isIncoming: true, empty: 'No tienes solicitudes recibidas.' },
    history:  { rentals: historyAll, isIncoming: false, empty: 'Aún no tienes alquileres completados.' },
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={32} className="text-accent animate-spin" /></div>;

  const { rentals, isIncoming, empty } = tabContent[activeTab];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 p-1.5 bg-gray-100 rounded-xl w-full sm:w-fit">
        {tabs.map(({ key, label, badge }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
            {badge ? <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent text-white">{badge}</span> : null}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }} className="min-h-[200px]">
          {rentals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4"><Package size={28} className="text-gray-400" /></div>
              <p className="text-gray-500 text-sm">{empty}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {rentals.map(rental => (
                  <RentalCard key={rental.id} rental={rental} isIncoming={isIncoming} userId={user!.id}
                    onAction={handleAction} onEarlyReturn={r => setEarlyReturnRental(r)}
                    onReview={handleOpenReview} actionLoadingId={actionLoadingId}
                    completingId={completingId} reviewedRentals={reviewedRentals} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {earlyReturnRental && (
          <EarlyReturnConfirm rental={earlyReturnRental} onConfirm={handleEarlyReturn}
            onCancel={() => setEarlyReturnRental(null)} loading={completingId === earlyReturnRental.id} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reviewModal && (
          <TripleReviewModal rental={reviewModal.rental} isOwner={reviewModal.isOwner} userId={user!.id}
            onClose={() => setReviewModal(null)} onDone={async () => { setReviewModal(null); await loadData(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
