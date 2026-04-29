import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Star, Search, Sparkles, LayoutGrid, Map, X, Package, Navigation, ChevronUp, Heart } from 'lucide-react';
import { categories, RentalItem } from '../data';
import { fetchItems, fetchUserLikedItemIds, likeItem, unlikeItem } from '../lib/api';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const categoryKeyMap: Record<string, string> = {
  "All": "catAll", "Tools": "catTools", "Camping": "catCamping",
  "Electronics": "catElectronics", "Kitchen": "catKitchen",
  "Sports": "catSports", "Garden": "catGarden", "Photography": "catPhotography",
};

// ─── Imagen con fallback ──────────────────────────────────────────────────────

function ItemImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${className ?? ''}`}>
        <Package size={32} className="text-gray-300" />
      </div>
    );
  }
  return (
    <img src={src} alt={alt} className={className} referrerPolicy="no-referrer"
      onError={() => setError(true)} />
  );
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

function ProductSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-4 flex flex-col gap-2">
        <div className="h-4 bg-gray-200 rounded-full w-3/4" />
        <div className="h-4 bg-gray-200 rounded-full w-1/2" />
        <div className="h-3 bg-gray-100 rounded-full w-1/3 mt-2" />
      </div>
    </div>
  );
}

// ─── Badge "Nuevo" ────────────────────────────────────────────────────────────

function NewBadge({ createdAt }: { createdAt?: string }) {
  if (!createdAt) return null;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  if (new Date(createdAt) < sevenDaysAgo) return null;
  return (
    <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
      Nuevo
    </span>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-28 h-28 mb-6">
        <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="40" cy="40" r="26" stroke="#E5E7EB" strokeWidth="3" />
          <line x1="59" y1="59" x2="78" y2="78" stroke="#D1D5DB" strokeWidth="4" strokeLinecap="round" />
          <path d="M32 32l16 16M48 32L32 48" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-gray-700 font-semibold text-lg mb-1">{title}</p>
      <p className="text-gray-400 text-sm max-w-xs mx-auto">{subtitle}</p>
    </div>
  );
}

// ─── Distancia Haversine ──────────────────────────────────────────────────────

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

// ─── Map view ─────────────────────────────────────────────────────────────────

function MapView({ items, onSelectItem }: { items: RentalItem[]; onSelectItem: (item: RentalItem) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<{ marker: any; item: RentalItem }[]>([]);
  const [selectedItem, setSelectedItem] = useState<RentalItem | null>(null);

  const highlightMarker = (itemId: string | null) => {
    markersRef.current.forEach(({ marker }) => {
      const el = marker.getElement();
      if (!el) return;
      const isSelected = itemId !== null && marker._itemId === itemId;
      const pin = el.querySelector('.map-pin') as HTMLElement | null;
      const caret = el.querySelectorAll('div')[2] as HTMLElement | null;
      if (pin) {
        pin.style.background = isSelected ? '#0f766e' : 'white';
        pin.style.color = isSelected ? 'white' : '#0f766e';
        pin.style.transform = isSelected ? 'scale(1.1)' : '';
        pin.style.boxShadow = isSelected ? '0 4px 16px rgba(15,118,110,0.4)' : '0 2px 12px rgba(0,0,0,0.2)';
      }
      if (caret) {
        caret.style.borderTopColor = isSelected ? '#0f766e' : '#0f766e';
      }
    });
  };

  useEffect(() => {
    const loadMap = async () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css'; link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!(window as any).L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }
      const L = (window as any).L;
      if (!mapRef.current) return;
      if (!leafletMap.current) {
        leafletMap.current = L.map(mapRef.current).setView([40.4168, -3.7038], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
        }).addTo(leafletMap.current);
      }
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      setSelectedItem(null);
      const withCoords = items.filter(i => i.lat && i.lng);
      if (withCoords.length > 0) {
        const bounds: [number, number][] = [];
        withCoords.forEach(item => {
          const price = Number.isInteger(item.pricePerDay) ? item.pricePerDay : item.pricePerDay.toFixed(0);
          const icon = L.divIcon({
            className: '',
            // translate(-50%, -100%) anchors the tip of the caret to the coordinate
            html: `<div style="transform:translate(-50%,-100%);display:inline-block;cursor:pointer">
              <div class="map-pin" style="background:white;border:2px solid #0f766e;border-radius:20px;padding:4px 10px;white-space:nowrap;font-size:12px;font-weight:700;color:#0f766e;box-shadow:0 2px 12px rgba(0,0,0,0.2);transition:background 0.15s,color 0.15s,transform 0.15s">
                €${price}/día
              </div>
              <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid #0f766e;margin:0 auto;margin-top:-1px"></div>
            </div>`,
            iconAnchor: [0, 0],
          });
          const marker = L.marker([item.lat!, item.lng!], { icon })
            .addTo(leafletMap.current)
            .on('click', () => {
              setSelectedItem(item);
              highlightMarker(item.id);
            });
          marker._itemId = item.id;
          markersRef.current.push({ marker, item });
          bounds.push([item.lat!, item.lng!]);
        });
        if (bounds.length > 1) leafletMap.current.fitBounds(bounds, { padding: [60, 60] });
        else if (bounds.length === 1) leafletMap.current.setView(bounds[0], 13);
      }
    };
    loadMap();
  }, [items]);

  useEffect(() => {
    return () => {
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }
    };
  }, []);

  const withCoords = items.filter(i => i.lat && i.lng);
  return (
    <div>
      {withCoords.length === 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
          <MapPin size={15} className="shrink-0" />
          {items.length > 0 ? 'Estos objetos no tienen ubicación en mapa. Al publicar, selecciona una ubicación.' : 'No hay objetos con ubicación en el mapa.'}
        </div>
      )}
      <div className="relative">
        {/* isolation:isolate confines Leaflet z-indexes so notifications/modals render above the map */}
        <div ref={mapRef} className="rounded-2xl overflow-hidden border border-gray-200" style={{ height: 560, isolation: 'isolate' }} />

        {/* Selected item preview card — sibling of the map div, stacks above it naturally */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              key={selectedItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm pointer-events-auto"
            >
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex gap-3 p-3 border border-gray-100">
                {/* Thumbnail */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {selectedItem.images[0]
                    ? <img src={selectedItem.images[0]} alt={selectedItem.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : <div className="w-full h-full flex items-center justify-center"><Package size={24} className="text-gray-300" /></div>
                  }
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <p className="font-semibold text-sm text-gray-900 truncate">{selectedItem.title}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin size={10} className="shrink-0 text-accent" />{selectedItem.location}
                    </p>
                    {selectedItem.rating > 0 && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Star size={10} className="text-yellow-400 fill-yellow-400 shrink-0" />
                        {selectedItem.rating}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-sm font-bold text-accent">€{selectedItem.pricePerDay}<span className="text-xs font-normal text-gray-400">/día</span></span>
                    <button
                      onClick={() => onSelectItem(selectedItem)}
                      className="bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-teal-700 transition-colors shrink-0"
                    >
                      Ver detalle
                    </button>
                  </div>
                </div>
                {/* Close */}
                <button
                  onClick={() => { setSelectedItem(null); highlightMarker(null); }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <X size={12} className="text-gray-500" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main Feed ────────────────────────────────────────────────────────────────

interface FeedProps {
  onSelectItem: (item: RentalItem) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export function Feed({ onSelectItem, searchQuery = '', onSearchChange }: FeedProps) {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('All');
  const [items, setItems] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const initialLikedIds = useRef<Set<string>>(new Set());
  const { t } = useLanguage();
  const { showToast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSearch = useRef(searchQuery);

  // Scroll-to-top visibility
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const load = useCallback((category: string, search: string) => {
    let cancelled = false;
    setLoading(true); setError(null);
    fetchItems(category, search)
      .then(data => { if (!cancelled) { setItems(data); setLoading(false); } })
      .catch(err => { if (!cancelled) { setError(err.message || 'Error'); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { return load(activeCategory, searchQuery); }, [activeCategory]);

  // Load liked item IDs
  useEffect(() => {
    if (user) {
      fetchUserLikedItemIds(user.id).then(ids => {
        setLikedIds(ids);
        initialLikedIds.current = new Set(ids);
      }).catch(() => {});
    } else {
      setLikedIds(new Set());
      initialLikedIds.current = new Set();
    }
  }, [user]);

  useEffect(() => {
    if (searchQuery === prevSearch.current) return;
    prevSearch.current = searchQuery;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(activeCategory, searchQuery), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortByDistance(true);
      },
      () => setSortByDistance(false)
    );
  };

  // Items ordenados opcionalmente por distancia
  const displayItems = (() => {
    if (!sortByDistance || !userCoords) return items;
    return [...items].sort((a, b) => {
      const dA = a.lat && a.lng ? distanceKm(userCoords.lat, userCoords.lng, a.lat, a.lng) : 99999;
      const dB = b.lat && b.lng ? distanceKm(userCoords.lat, userCoords.lng, b.lat, b.lng) : 99999;
      return dA - dB;
    });
  })();

  const clearSearch = () => { if (onSearchChange) onSearchChange(''); };

  return (
    <div>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-48 h-48 bg-teal-300 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-white/20">
              <Sparkles size={14} />
              <span>{t('accessOverOwnership')}</span>
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight tracking-tight">
              {t('heroTitle1')}<br />
              <span className="text-teal-300">{t('heroTitle2')}</span>
            </h1>
            <p className="text-lg md:text-xl text-teal-100 mb-8 max-w-2xl mx-auto">{t('heroSubtitle')}</p>
            <div className="relative max-w-xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input type="text" value={searchQuery}
                onChange={e => onSearchChange?.(e.target.value)}
                className="block w-full pl-12 pr-10 py-4 bg-white text-gray-900 rounded-2xl text-base placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-teal-500/30 shadow-2xl"
                placeholder={t('heroSearch') as string} />
              {searchQuery && (
                <button onClick={clearSearch} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Categories + controles */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex overflow-x-auto hide-scrollbar gap-3 flex-1 pb-1">
            {categories.map(cat => (
              <button key={cat.name} onClick={() => setActiveCategory(cat.name)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  activeCategory === cat.name
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-accent hover:text-accent hover:bg-accent/5'
                }`}>
                <span>{cat.icon}</span>
                {t(categoryKeyMap[cat.name] as any)}
              </button>
            ))}
          </div>

          {/* Botón cercanía */}
          <button onClick={handleGeolocate}
            title={sortByDistance ? 'Ordenado por cercanía' : 'Ordenar por cercanía'}
            className={`p-2.5 rounded-full border transition-all shrink-0 ${
              sortByDistance
                ? 'bg-accent text-white border-accent shadow-sm'
                : 'bg-white border-gray-200 text-gray-400 hover:text-accent hover:border-accent'
            }`}>
            <Navigation size={16} />
          </button>

          {/* Toggle lista/mapa */}
          <div className="flex items-center bg-white border border-gray-200 rounded-full p-1 shrink-0">
            <button onClick={() => setViewMode('grid')}
              className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-accent text-white' : 'text-gray-400 hover:text-gray-600'}`}
              title="Vista lista"><LayoutGrid size={16} /></button>
            <button onClick={() => setViewMode('map')}
              className={`p-2 rounded-full transition-all ${viewMode === 'map' ? 'bg-accent text-white' : 'text-gray-400 hover:text-gray-600'}`}
              title="Vista mapa"><Map size={16} /></button>
          </div>
        </div>

        {/* Header resultados */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
            {searchQuery
              ? <><span>Resultados para</span><span className="bg-accent/10 text-accent px-2 py-0.5 rounded-full text-sm">"{searchQuery}"</span></>
              : activeCategory === 'All' ? t('allItemsNearYou') : t(categoryKeyMap[activeCategory] as any)}
            {!loading && <span className="text-gray-400 font-normal text-base">({displayItems.length})</span>}
            {sortByDistance && userCoords && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                <Navigation size={10} /> Por cercanía
              </span>
            )}
          </h2>
          {searchQuery && (
            <button onClick={clearSearch} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 shrink-0">
              <X size={12} /> Limpiar
            </button>
          )}
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-red-500 text-sm mb-2">Error: {error}</p>
            <button onClick={() => load(activeCategory, searchQuery)} className="text-accent text-sm font-medium hover:underline">Reintentar</button>
          </div>
        )}

        {!loading && !error && viewMode === 'map' && (
          <MapView items={displayItems} onSelectItem={onSelectItem} />
        )}

        {!loading && !error && viewMode === 'grid' && (
          <>
            {displayItems.length === 0 && (
              <EmptyState
                title="Sin resultados"
                subtitle="Prueba con otro término o categoría"
              />
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {displayItems.map((item, index) => {
                const isOwn = user?.id === item.owner?.id;
                const dist = sortByDistance && userCoords && item.lat && item.lng
                  ? distanceKm(userCoords.lat, userCoords.lng, item.lat, item.lng)
                  : null;

                return (
                  <motion.div key={item.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.03 }}
                    className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-black/5 transition-all duration-300 cursor-pointer flex flex-col"
                    onClick={() => onSelectItem(item)}>
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      <ItemImage
                        src={item.images[0]}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Badge disponibilidad */}
                      <div className={`absolute top-3 left-3 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm ${
                        isOwn ? 'bg-accent/90 text-white'
                        : item.available ? 'bg-emerald-50/90 text-emerald-700'
                        : 'bg-gray-100/90 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOwn ? 'bg-white' : item.available ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        <span>{isOwn ? 'Tu objeto' : item.available ? t('available') : t('rented')}</span>
                      </div>

                      {/* Rating + Heart + Badge Nuevo */}
                      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                        <NewBadge createdAt={item.createdAt} />
                        <div className="flex items-center gap-1.5">
                        {item.rating > 0 && (
                          <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm">
                            <Star size={10} className="text-yellow-400 fill-yellow-400" />
                            <span>{item.rating}</span>
                          </div>
                        )}
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) return;
                            const isLiked = likedIds.has(item.id);
                            // Optimistic update
                            setLikedIds(prev => {
                              const next = new Set(prev);
                              isLiked ? next.delete(item.id) : next.add(item.id);
                              return next;
                            });
                            
                            if (!isLiked) showToast('Te gusta esta publicación', 'like');

                            (isLiked ? unlikeItem(user.id, item.id) : likeItem(user.id, item.id))
                              .catch(() => {
                                // Revert on error
                                setLikedIds(prev => {
                                  const next = new Set(prev);
                                  isLiked ? next.add(item.id) : next.delete(item.id);
                                  return next;
                                });
                              });
                          }}
                          className="bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center gap-1 shadow-sm hover:scale-105 transition-transform z-10 px-2.5 py-1.5 min-w-[32px] min-h-[32px]">
                          <Heart size={14} className={likedIds.has(item.id) ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
                          {(() => {
                            const initial = initialLikedIds.current.has(item.id);
                            const current = likedIds.has(item.id);
                            let c = item.likesCount || 0;
                            if (initial && !current) c = Math.max(0, c - 1);
                            if (!initial && current) c += 1;
                            return c > 0 ? <span className="text-xs font-semibold text-gray-700">{c}</span> : null;
                          })()}
                        </motion.button>
                        </div>
                      </div>

                      {/* Hover CTA — solo si no es propio */}
                      {!isOwn && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                          <button className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                            {t('rentNow')}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-medium text-gray-900 line-clamp-2 leading-tight mb-1">{item.title}</h3>
                      <div className="text-base font-bold text-accent mb-3">
                        €{item.pricePerDay}<span className="text-xs font-normal text-gray-400"> {t('perDay')}</span>
                      </div>
                      <div className="mt-auto flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1 min-w-0">
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </div>
                        {dist !== null
                          ? <span className="text-accent font-medium shrink-0 ml-1">{formatDistance(dist)}</span>
                          : <span className="shrink-0">{item.totalRentals} {t('rentals')}</span>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Botón volver arriba */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-40 w-11 h-11 bg-accent text-white rounded-full shadow-lg shadow-accent/30 flex items-center justify-center hover:bg-accent-dark transition-colors"
            title="Volver arriba">
            <ChevronUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
