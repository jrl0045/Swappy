import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, MapPin, Star, ShieldCheck, Calendar, Clock, Award, CheckCircle, ChevronLeft, ChevronRight, MessageCircle, Loader2, UserRound, Package, Heart, Share2 } from 'lucide-react';
import { RentalItem } from '../data';
import { fetchRentalsForItem, fetchReviews, ReviewData, fetchItemLikesCount, likeItem, unlikeItem, fetchUserLikedItemIds } from '../lib/api';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ShareModal } from './ShareModal';

// ─── Imagen con fallback ──────────────────────────────────────────────────────

function ItemImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${className ?? ''}`}>
        <Package size={40} className="text-gray-300" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} referrerPolicy="no-referrer" onError={() => setError(true)} />;
}

// ─── Pickup zone map ──────────────────────────────────────────────────────────

function PickupZoneMap({ lat, lng, location }: { lat: number; lng: number; location: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css'; link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!(window as any).L) {
        await new Promise<void>(res => {
          const s = document.createElement('script');
          s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          s.onload = () => res();
          document.head.appendChild(s);
        });
      }
      if (!mapRef.current || mapInstance.current) return;
      const L = (window as any).L;
      mapInstance.current = L.map(mapRef.current, {
        center: [lat, lng], zoom: 14,
        zoomControl: false, dragging: false,
        scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(mapInstance.current);
      L.circle([lat, lng], {
        radius: 300, color: '#0f766e', fillColor: '#0f766e',
        fillOpacity: 0.15, weight: 2, opacity: 0.4,
      }).addTo(mapInstance.current);
      L.circleMarker([lat, lng], {
        radius: 6, color: '#0f766e', fillColor: '#0f766e', fillOpacity: 0.7, weight: 2,
      }).addTo(mapInstance.current);
    };
    load();
    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, [lat, lng]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ isolation: 'isolate' }}>
      <div className="p-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
          <MapPin size={14} className="text-accent" />
          Zona de recogida aproximada
        </h3>
        <p className="text-xs text-gray-500">{location}</p>
      </div>
      <div ref={mapRef} style={{ height: 180 }} />
      <div className="px-4 py-3 bg-accent/5 border-t border-accent/10 flex items-start gap-2">
        <MessageCircle size={13} className="text-accent shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600">
          El punto exacto de encuentro se acuerda con el propietario{' '}
          <span className="font-semibold text-accent">por el chat</span> una vez confirmado el alquiler.
        </p>
      </div>
    </div>
  );
}

// ─── Availability Calendar ────────────────────────────────────────────────────

function AvailabilityCalendar({ itemId, onSelectDay }: { itemId: string; onSelectDay?: (date: Date) => void }) {
  const { t } = useLanguage();
  const [monthOffset, setMonthOffset] = useState(0);
  const [bookedRanges, setBookedRanges] = useState<{ start: Date; end: Date }[]>([]);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  useEffect(() => {
    fetchRentalsForItem(itemId).then(rentals =>
      setBookedRanges(rentals.map(r => ({ start: new Date(r.startDate), end: new Date(r.endDate) })))
    );
  }, [itemId]);

  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthNames = t('monthNames') as string[];
  const dayNames = t('dayNamesShort') as string[];
  const startDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const isBooked = (d: number) => {
    const date = new Date(year, month, d);
    return bookedRanges.some(r => date >= r.start && date <= r.end);
  };

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(<div key={`e-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const isCurrent = monthOffset === 0;
    const isPast = isCurrent && d < today.getDate();
    const booked = isBooked(d);
    const isToday = isCurrent && d === today.getDate();
    cells.push(
      <div key={d}
        onClick={() => { if (!isPast && !booked && onSelectDay) onSelectDay(new Date(year, month, d)); }}
        className={`aspect-square flex items-center justify-center text-sm rounded-lg font-medium transition-colors ${
          isPast ? 'text-gray-300'
          : booked ? 'bg-red-50 text-red-400 line-through'
          : isToday ? 'bg-accent text-white hover:bg-accent-dark cursor-pointer'
          : 'text-gray-700 hover:bg-accent/10 cursor-pointer'
        }`}>{d}</div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{monthNames[month]} {year}</h3>
        <div className="flex gap-1">
          <button onClick={() => setMonthOffset(Math.max(0, monthOffset - 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><ChevronLeft size={16} /></button>
          <button onClick={() => setMonthOffset(monthOffset + 1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((d: string) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{cells}</div>
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-accent" /><span>{t('today')}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-accent/10 border border-accent/20" /><span>{t('available')}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-50 border border-red-100" /><span>{t('unavailable')}</span></div>
      </div>
    </div>
  );
}

// ─── Reviews Section ──────────────────────────────────────────────────────────

function ReviewsSection({ itemId }: { itemId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews(itemId).then(data => { setReviews(data); setLoading(false); });
  }, [itemId]);

  const fmt = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const avg = reviews.length > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold">Valoraciones</h3>
        {avg !== null && (
          <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-full">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="font-bold text-gray-900 text-sm">{avg}</span>
            <span className="text-xs text-gray-500">({reviews.length})</span>
          </div>
        )}
      </div>
      {user && (
        <div className="bg-accent/5 border border-accent/10 rounded-xl p-3 mb-5 flex items-start gap-2">
          <CheckCircle size={15} className="text-accent shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600">
            Para dejar una valoración, finaliza el alquiler desde{' '}
            <span className="font-semibold text-accent">Perfil → Mis alquileres</span>.
          </p>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="text-accent animate-spin" /></div>
      ) : reviews.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-6">Aún no hay valoraciones. ¡Sé el primero en alquilarlo!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="flex gap-3">
              {review.reviewerAvatar
                ? <img src={review.reviewerAvatar} alt={review.reviewerName}
                    className="w-9 h-9 rounded-full shrink-0 object-cover" referrerPolicy="no-referrer" />
                : <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                    <UserRound size={16} />
                  </div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm">{review.reviewerName}</span>
                  <span className="text-xs text-gray-400">{fmt(review.createdAt)}</span>
                </div>
                <div className="flex gap-0.5 mb-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={12} className={s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                  ))}
                </div>
                {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ItemDetail ──────────────────────────────────────────────────────────

export function ItemDetail({ item, onBack, onRent, onContact, onViewProfile }: {
  item: RentalItem; onBack: () => void; onRent: (date?: Date) => void; onContact: () => void; onViewProfile?: (ownerId: string) => void;
}) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isOwn = user?.id === item.owner?.id;

  useEffect(() => {
    fetchItemLikesCount(item.id).then(setLikesCount).catch(() => {});
    if (user) {
      fetchUserLikedItemIds(user.id).then(ids => setIsLiked(ids.has(item.id))).catch(() => {});
    }
  }, [item.id, user]);

  const handleShare = () => setIsShareModalOpen(true);

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pb-8 ${isOwn ? 'pb-20' : 'pb-44'}`}>

      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors">
          <ArrowLeft size={20} />
          <span className="font-medium">{t('backToMarketplace')}</span>
        </button>
        <button onClick={handleShare} className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm hover:border-accent hover:text-accent">
          <Share2 size={16} />
          <span className="font-medium text-sm">Compartir</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Left */}
        <div className="lg:col-span-3 space-y-6">

          {/* Imágenes */}
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="aspect-[4/3] overflow-hidden">
              <ItemImage src={item.images[selectedImage]} alt={item.title} className="w-full h-full object-cover" />
            </div>
            {item.images.length > 1 && (
              <div className="flex gap-2 p-4">
                {item.images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === i ? 'border-accent shadow-md' : 'border-gray-100 opacity-60 hover:opacity-100'}`}>
                    <ItemImage src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Descripción */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold mb-3">{t('aboutThisItem')}</h3>
            <p className="text-gray-600 leading-relaxed mb-6">{item.description}</p>
            {item.features.length > 0 && (
              <>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('whatsIncluded')}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {item.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle size={14} className="text-accent shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Zona de recogida */}
          {item.lat && item.lng
            ? <PickupZoneMap lat={item.lat} lng={item.lng} location={item.location} />
            : (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-3">
                <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin size={16} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-0.5">Zona de recogida: {item.location}</p>
                  <p className="text-xs text-gray-500">El punto exacto se coordina por el chat tras confirmar el alquiler.</p>
                  <button onClick={onContact}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
                    <MessageCircle size={12} /> Preguntar al propietario
                  </button>
                </div>
              </div>
            )}

          {/* Propietario */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold mb-4">{t('aboutTheOwner')}</h3>
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-4 ${!isOwn && onViewProfile ? 'cursor-pointer group/owner' : ''}`}
                onClick={() => { if (!isOwn && onViewProfile) onViewProfile(item.owner.id); }}>
                <div className="relative">
                  {item.owner.avatar
                    ? <img src={item.owner.avatar} alt={item.owner.name}
                        className="w-14 h-14 rounded-full object-cover group-hover/owner:ring-2 group-hover/owner:ring-accent/40 transition-all" referrerPolicy="no-referrer" />
                    : <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover/owner:ring-2 group-hover/owner:ring-accent/40 transition-all">
                        <UserRound size={24} />
                      </div>}
                  {item.owner.verified && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center border-2 border-white">
                      <CheckCircle size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-1.5 group-hover/owner:text-accent transition-colors">
                    {item.owner.name}
                    {item.owner.verified && (
                      <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">{t('verified')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      <span className="font-medium text-gray-700">{item.owner.rating}</span>
                      <span>({item.owner.reviews})</span>
                    </div>
                    <span>·</span>
                    <span>{t('memberSince')} {item.owner.memberSince}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {!isOwn && onViewProfile && (
                  <button onClick={() => onViewProfile(item.owner.id)}
                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors flex items-center gap-2">
                    <UserRound size={14} />
                    {t('viewProfile')}
                  </button>
                )}
                {!isOwn && (
                  <button onClick={onContact}
                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors flex items-center gap-2">
                    <MessageCircle size={14} />
                    {t('contact')}
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock size={14} className="text-accent" />
                <span>{t('responseRate')}: {item.owner.responseRate}%</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Award size={14} className="text-accent" />
                <span>{item.owner.reviews} {t('reviews')}</span>
              </div>
            </div>
          </div>

          <ReviewsSection itemId={item.id} />
        </div>

        {/* Right */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gray-900">€{item.pricePerDay}</span>
                <span className="text-gray-400">{t('perDay')}</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={() => {
                  if (!user) return;
                  const wasLiked = isLiked;
                  setIsLiked(!wasLiked);
                  setLikesCount(c => wasLiked ? Math.max(0, c - 1) : c + 1);
                  
                  if (!wasLiked) showToast('Te gusta esta publicación', 'like');

                  (wasLiked ? unlikeItem(user.id, item.id) : likeItem(user.id, item.id))
                    .catch(() => {
                      setIsLiked(wasLiked);
                      setLikesCount(c => wasLiked ? c + 1 : Math.max(0, c - 1));
                    });
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full border transition-all hover:scale-105 ${
                  isLiked
                    ? 'bg-red-50 border-red-200 text-red-500'
                    : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-red-400 hover:border-red-200'
                }`}>
                <Heart size={18} className={isLiked ? 'fill-red-500' : ''} />
                {likesCount > 0 && <span className="text-sm font-medium">{likesCount}</span>}
              </motion.button>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
              <span className="font-medium text-gray-700">{item.rating}</span>
              <span>·</span>
              <span>{item.totalRentals} {t('rentals')}</span>
              <span>·</span>
              <div className="flex items-center gap-1">
                <MapPin size={12} />
                <span>{item.location}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">{item.category}</span>
              {isOwn ? (
                <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">Tu objeto</span>
              ) : item.available ? (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {t('availableForRent')}
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">{t('currentlyRented')}</span>
              )}
            </div>

            {isOwn ? (
              <div className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 bg-gray-100 text-gray-500 cursor-default">
                Este es tu objeto publicado
              </div>
            ) : (
              <button onClick={() => onRent()} disabled={!item.available}
                className={`w-full py-4 rounded-2xl text-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                  item.available
                    ? 'bg-accent text-white hover:bg-accent-dark shadow-lg shadow-accent/20 hover:shadow-xl hover:-translate-y-0.5'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}>
                <Calendar size={20} />
                {item.available ? t('rentThisItem') : t('notAvailable')}
              </button>
            )}

            <div className="mt-4 p-4 bg-accent/5 rounded-xl border border-accent/10">
              <div className="flex items-center gap-2 text-sm font-medium text-accent mb-2">
                <ShieldCheck size={16} />
                <span>{t('safeRentalGuaranteed')}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{t('safeRentalDescription')}</p>
            </div>
          </div>

          <AvailabilityCalendar itemId={item.id} onSelectDay={(date) => { if (!isOwn) onRent(date); }} />
        </div>
      </div>
    </motion.div>

    {/* Barra de reserva fija en móvil (por debajo de lg, encima de la bottom nav) */}
    {!isOwn && (
      <div className="lg:hidden fixed bottom-16 sm:bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-xl px-4 py-3 flex items-center gap-3">
        <div className="shrink-0">
          <div className="text-xl font-bold text-gray-900">
            €{item.pricePerDay}
            <span className="text-sm font-normal text-gray-400">/día</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
            <Star size={11} className="text-yellow-400 fill-yellow-400" />
            <span className="font-medium text-gray-700">{item.rating}</span>
            <span>·</span>
            <span>{item.totalRentals} alquileres</span>
          </div>
        </div>
        <button
          onClick={() => onRent()}
          disabled={!item.available}
          className={`flex-1 py-3 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 transition-all ${
            item.available
              ? 'bg-accent text-white hover:bg-accent-dark shadow-md shadow-accent/20'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Calendar size={18} />
          {item.available ? t('rentThisItem') : t('notAvailable')}
        </button>
      </div>
    )}

    <AnimatePresence>
      {isShareModalOpen && (
        <ShareModal
          title={item.title}
          url={`${window.location.origin}/?item=${item.id}`}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </AnimatePresence>
  </>
);
}
