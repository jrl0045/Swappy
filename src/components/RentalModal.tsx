import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, ShieldCheck, CheckCircle2, ChevronLeft, ChevronRight, Lock, CreditCard, ArrowLeft, Shield, Zap, MessageCircle, MapPin } from 'lucide-react';
import { RentalItem } from '../data';
import { createRental, fetchRentalsForItem } from '../lib/api';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../context/AuthContext';

// ─── Calendar picker ──────────────────────────────────────────────────────────

function CalendarPicker({ startDate, endDate, onSelectDate, blockedDates }: {
  startDate: Date | null; endDate: Date | null;
  onSelectDate: (d: Date) => void;
  blockedDates: { start: Date; end: Date }[];
}) {
  const { t } = useLanguage();
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date(); today.setHours(0,0,0,0);
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear(); const month = viewDate.getMonth();
  const monthNames = t('monthNames') as string[];
  const dayNames = t('dayNamesShort') as string[];
  const startDOW = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const isBlocked = (d: number) => {
    const date = new Date(year, month, d);
    return blockedDates.some(r => date >= r.start && date <= r.end);
  };
  const isStart = (d: number) => startDate?.getTime() === new Date(year, month, d).getTime();
  const isEnd = (d: number) => endDate?.getTime() === new Date(year, month, d).getTime();
  const isInRange = (d: number) => {
    if (!startDate || !endDate) return false;
    const date = new Date(year, month, d);
    return date > startDate && date < endDate;
  };

  const cells = [];
  for (let i = 0; i < startDOW; i++) cells.push(<div key={`e-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const isPast = date < today;
    const blocked = isBlocked(d);
    const selected = isStart(d) || isEnd(d);
    const inRange = isInRange(d);
    cells.push(
      <button key={d} disabled={isPast || blocked} onClick={() => onSelectDate(date)}
        className={`aspect-square flex items-center justify-center text-sm rounded-lg font-medium transition-all ${
          blocked ? 'bg-red-50 text-red-300 line-through cursor-not-allowed'
          : isPast ? 'text-gray-300 cursor-not-allowed'
          : selected ? 'bg-accent text-white shadow-md'
          : inRange ? 'bg-accent/10 text-accent'
          : 'text-gray-700 hover:bg-accent/10 cursor-pointer'
        }`}>{d}</button>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 text-sm">{monthNames[month]} {year}</h4>
        <div className="flex gap-1">
          <button onClick={() => setMonthOffset(Math.max(0, monthOffset - 1))} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><ChevronLeft size={14} /></button>
          <button onClick={() => setMonthOffset(monthOffset + 1)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><ChevronRight size={14} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map((d: string) => <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1 uppercase">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">{cells}</div>
    </div>
  );
}

// ─── Insurance ────────────────────────────────────────────────────────────────

type InsuranceTier = 'none' | 'basic' | 'full' | 'premium';
const insurancePrices: Record<InsuranceTier, number> = { none: 0, basic: 1.5, full: 3, premium: 5 };

// ─── Main RentalModal ─────────────────────────────────────────────────────────

export function RentalModal({ item, initialDate, onClose, onOpenMessages }: {
  item: RentalItem; initialDate?: Date | null;
  onClose: () => void; onOpenMessages?: () => void;
}) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const today = new Date(); today.setHours(0,0,0,0);

  const [step, setStep] = useState<'dates' | 'payment' | 'success'>('dates');
  const [startDate, setStartDate] = useState<Date | null>(initialDate || null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectingEnd, setSelectingEnd] = useState(!!initialDate);
  const [insurance, setInsurance] = useState<InsuranceTier>('full');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');
  const [cardHolder, setCardHolder] = useState('Juan Pérez');
  const [isProcessing, setIsProcessing] = useState(false);
  const [blockedDates, setBlockedDates] = useState<{ start: Date; end: Date }[]>([]);

  useEffect(() => {
    fetchRentalsForItem(item.id).then(rentals =>
      setBlockedDates(rentals.map(r => ({ start: new Date(r.startDate), end: new Date(r.endDate) })))
    );
  }, [item.id]);

  const handleSelectDate = (date: Date) => {
    if (!selectingEnd || !startDate) { setStartDate(date); setEndDate(null); setSelectingEnd(true); }
    else if (date <= startDate) { setStartDate(date); setEndDate(null); }
    else { setEndDate(date); setSelectingEnd(false); }
  };

  const calculation = useMemo(() => {
    if (!startDate || !endDate) return null;
    const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
    if (diff < 1) return null;
    const rentalCost = diff * item.pricePerDay;
    const insuranceCost = diff * insurancePrices[insurance];
    const serviceFee = Math.round(rentalCost * 0.1 * 100) / 100;
    return { days: diff, rentalCost, insuranceCost, serviceFee, total: rentalCost + insuranceCost + serviceFee };
  }, [startDate, endDate, insurance, item.pricePerDay]);

  const fmt = (d: Date | null) => d ? d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—';

  const handleConfirmPayment = async () => {
    if (!startDate || !endDate || !calculation) return;
    setIsProcessing(true);
    try {
      if (!user) throw new Error('Debes iniciar sesión para alquilar.');
      await createRental({
        itemId: item.id, renterId: user.id, ownerId: item.owner.id,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        insuranceTier: insurance, totalPrice: calculation.total,
        days: calculation.days, itemTitle: item.title, itemImage: item.images[0] || '',
      });
    } catch (err) { console.error('Rental creation failed:', err); }
    setIsProcessing(false);
    setStep('success');
  };

  const insuranceTiers: { key: InsuranceTier; icon: any; priceKey: number }[] = [
    { key: 'none', icon: X, priceKey: 0 },
    { key: 'basic', icon: Shield, priceKey: 1.5 },
    { key: 'full', icon: ShieldCheck, priceKey: 3 },
    { key: 'premium', icon: Zap, priceKey: 5 },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}>

        <AnimatePresence mode="wait">

          {/* ── SUCCESS ── */}
          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-8 flex flex-col items-center text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
                <CheckCircle2 size={64} className="text-accent mb-4" />
              </motion.div>
              <h2 className="text-2xl font-semibold mb-2">¡Solicitud enviada!</h2>
              <p className="text-gray-500 text-sm mb-6 max-w-xs">
                Tu solicitud ha sido enviada a <span className="font-semibold text-gray-700">{item.owner.name}</span>. Te confirmará por el chat.
              </p>

              {/* Zona de recogida */}
              <div className="w-full bg-gray-50 rounded-2xl p-4 mb-4 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin size={15} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Zona de recogida</p>
                    <p className="text-xs text-gray-500">{item.location}</p>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <MessageCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <span className="font-semibold">Importante:</span> una vez que el propietario confirme el alquiler, acuerda con él el <span className="font-semibold">punto exacto de encuentro y el horario</span> a través del chat.
                  </p>
                </div>
              </div>

              {/* Chat CTA */}
              <div className="w-full bg-accent/5 border border-accent/15 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-accent/10 rounded-full flex items-center justify-center shrink-0">
                    <MessageCircle size={18} className="text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">Sigue el proceso en el chat</p>
                    <p className="text-xs text-gray-500">Aprobación + punto de encuentro + horario</p>
                  </div>
                </div>
                <button onClick={() => { onClose(); onOpenMessages?.(); }}
                  className="w-full py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark transition-colors flex items-center justify-center gap-2">
                  <MessageCircle size={16} />
                  Abrir chat con {item.owner.name}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Lock size={11} />
                <span>Pago de €{calculation?.total.toFixed(2)} pendiente de confirmación</span>
              </div>
            </motion.div>
          )}

          {/* ── PAYMENT ── */}
          {step === 'payment' && (
            <motion.div key="payment" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
              className="flex flex-col" style={{ maxHeight: '90vh' }}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setStep('dates')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><ArrowLeft size={18} /></button>
                  <div>
                    <h2 className="text-lg font-semibold">{t('paymentDetails')}</h2>
                    <p className="text-xs text-gray-500">{t('orderSummary')}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              <div className="overflow-y-auto p-5 space-y-4" style={{ maxHeight: 'calc(90vh - 160px)' }}>
                <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={item.images[0]} alt={item.title} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.title}</div>
                      <div className="text-xs text-gray-500">{fmt(startDate)} → {fmt(endDate)}</div>
                    </div>
                  </div>
                  {calculation && (
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">€{item.pricePerDay} × {calculation.days} {calculation.days === 1 ? t('day') : t('days')}</span><span>€{calculation.rentalCost.toFixed(2)}</span></div>
                      {calculation.insuranceCost > 0 && <div className="flex justify-between"><span className="text-gray-500">{t('protectionFee')}</span><span>€{calculation.insuranceCost.toFixed(2)}</span></div>}
                      <div className="flex justify-between"><span className="text-gray-500">{t('serviceFee')}</span><span>€{calculation.serviceFee.toFixed(2)}</span></div>
                      <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold"><span>{t('total')}</span><span className="text-accent text-lg">€{calculation.total.toFixed(2)}</span></div>
                    </div>
                  )}
                </div>

                {/* Aviso punto de encuentro */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <MapPin size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Zona de recogida: <span className="font-semibold">{item.location}</span>. El punto exacto de encuentro se acuerda con el propietario por el chat tras la confirmación.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">{t('cardNumber')}</label>
                    <div className="relative">
                      <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">{t('expiryDate')}</label>
                      <input type="text" value={expiry} onChange={e => setExpiry(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 bg-white font-mono" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">{t('cvv')}</label>
                      <input type="text" value={cvv} onChange={e => setCvv(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 bg-white font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">{t('cardHolder')}</label>
                    <input type="text" value={cardHolder} onChange={e => setCardHolder(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 bg-white" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
                  <Lock size={12} /><span>{t('paymentSecure')}</span>
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 bg-gray-50/50 shrink-0">
                <button onClick={handleConfirmPayment} disabled={isProcessing}
                  className="w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 bg-accent text-white hover:bg-accent-dark shadow-lg shadow-accent/20 disabled:opacity-60">
                  {isProcessing
                    ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /><span>Enviando...</span></>
                    : <><Lock size={18} />{t('confirmAndPay')} · €{calculation?.total.toFixed(2)}</>}
                </button>
                <p className="text-center text-xs text-gray-400 mt-2">El cargo se realizará cuando el propietario confirme el alquiler</p>
              </div>
            </motion.div>
          )}

          {/* ── DATES ── */}
          {step === 'dates' && (
            <motion.div key="dates" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
              className="flex flex-col" style={{ maxHeight: '90vh' }}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="text-lg font-semibold">{t('rentThisItemModal')}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{t('selectYourDates')}</p>
                </div>
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              <div className="overflow-y-auto p-5 space-y-4" style={{ maxHeight: 'calc(90vh - 160px)' }}>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <img src={item.images[0]} alt={item.title} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{item.title}</h4>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <MapPin size={11} className="text-accent" />
                      <span>{item.location}</span>
                    </div>
                    <div className="text-accent font-bold text-sm">€{item.pricePerDay}<span className="text-xs text-gray-400 font-normal"> {t('perDay')}</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2.5 rounded-xl border-2 transition-all ${!selectingEnd && !endDate ? 'border-accent bg-accent/5' : 'border-gray-100'}`}>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">{t('startDate')}</div>
                    <div className="font-semibold text-sm">{startDate ? fmt(startDate) : t('selectStartDate')}</div>
                  </div>
                  <div className={`p-2.5 rounded-xl border-2 transition-all ${selectingEnd ? 'border-accent bg-accent/5' : 'border-gray-100'}`}>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">{t('endDate')}</div>
                    <div className="font-semibold text-sm">{endDate ? fmt(endDate) : t('selectEndDate')}</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-3">
                  <CalendarPicker startDate={startDate} endDate={endDate} onSelectDate={handleSelectDate} blockedDates={blockedDates} />
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('insuranceAddons')}</h4>
                  <div className="space-y-1.5">
                    {insuranceTiers.map(({ key, icon: Icon, priceKey }) => {
                      const nameKey = key === 'none' ? 'noProtection' : key === 'basic' ? 'basicProtection' : key === 'full' ? 'fullProtection' : 'premiumProtection';
                      const descKey = key === 'none' ? undefined : key === 'basic' ? 'basicProtectionDesc' : key === 'full' ? 'fullProtectionDesc' : 'premiumProtectionDesc';
                      const isSelected = insurance === key;
                      return (
                        <div key={key} onClick={() => setInsurance(key)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-accent bg-accent/5' : 'border-gray-100 hover:border-gray-200'}`}>
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-accent/10' : 'bg-gray-100'}`}>
                            <Icon size={14} className={isSelected ? 'text-accent' : 'text-gray-400'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm">{t(nameKey as any)}</span>
                              {key === 'full' && <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-semibold">{t('recommended')}</span>}
                            </div>
                            {descKey && <div className="text-[11px] text-gray-500">{t(descKey as any)}</div>}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-semibold text-xs">{priceKey > 0 ? `€${priceKey}` : '—'}</div>
                            {priceKey > 0 && <div className="text-[9px] text-gray-400">{t('perDay')}</div>}
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-accent' : 'border-gray-300'}`}>
                            {isSelected && <div className="w-2 h-2 bg-accent rounded-full" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {calculation && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 bg-gray-50 rounded-2xl p-4">
                    <div className="flex justify-between text-sm"><span className="text-gray-500">€{item.pricePerDay} × {calculation.days} {calculation.days === 1 ? t('day') : t('days')}</span><span>€{calculation.rentalCost.toFixed(2)}</span></div>
                    {calculation.insuranceCost > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">{t('protectionFee')}</span><span>€{calculation.insuranceCost.toFixed(2)}</span></div>}
                    <div className="flex justify-between text-sm"><span className="text-gray-500">{t('serviceFee')}</span><span>€{calculation.serviceFee.toFixed(2)}</span></div>
                    <div className="flex justify-between pt-2 border-t border-gray-200"><span className="font-semibold">{t('total')}</span><span className="font-bold text-lg text-accent">€{calculation.total.toFixed(2)}</span></div>
                  </motion.div>
                )}
              </div>

              <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                <button onClick={onClose} className="px-5 py-3 rounded-full font-medium text-gray-600 hover:bg-gray-200">{t('cancel')}</button>
                <button onClick={() => calculation && setStep('payment')} disabled={!calculation}
                  className={`px-6 py-3 rounded-full font-medium flex items-center gap-2 transition-all ${calculation ? 'bg-accent text-white hover:bg-accent-dark shadow-lg shadow-accent/20' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                  <CreditCard size={16} />
                  {t('proceedToPayment')}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
