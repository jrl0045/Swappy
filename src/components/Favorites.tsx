import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Heart, MapPin, Star, Loader2, ArrowLeft, Package, TrendingUp } from 'lucide-react';
import { RentalItem } from '../data';
import { fetchLikedItems, unlikeItem, likeItem, fetchUserLikedItemIds } from '../lib/api';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

function ItemImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${className ?? ''}`}>
        <Package size={32} className="text-gray-300" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} referrerPolicy="no-referrer" onError={() => setError(true)} />;
}

export function Favorites({ onSelectItem, onBack }: {
  onSelectItem: (item: RentalItem) => void;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [items, setItems] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const initialLikedIds = useRef<Set<string>>(new Set());

  const loadFavorites = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [data, likedIdsData] = await Promise.all([
        fetchLikedItems(user.id),
        fetchUserLikedItemIds(user.id)
      ]);
      setItems(data);
      const likedSet = new Set(likedIdsData);
      setLikedIds(likedSet);
      initialLikedIds.current = new Set(likedIdsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFavorites(); }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-6">
        <ArrowLeft size={20} />
        <span className="font-medium">{t('backToItem')}</span>
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
          <Heart size={24} className="text-red-500 fill-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('favorites')}</h1>
          <p className="text-sm text-gray-500">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={32} className="text-accent animate-spin mb-4" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-5">
            <Heart size={36} className="text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('noFavorites')}</h3>
          <p className="text-sm text-gray-400 max-w-xs">{t('noFavoritesDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item, index) => (
            <motion.div key={item.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.03 }}
              className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-black/5 transition-all duration-300 cursor-pointer flex flex-col"
              onClick={() => onSelectItem(item)}>
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                <ItemImage src={item.images[0]} alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

                {/* Availability */}
                <div className={`absolute top-3 left-3 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm ${
                  item.available ? 'bg-emerald-50/90 text-emerald-700' : 'bg-gray-100/90 text-gray-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${item.available ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  <span>{item.available ? t('available') : t('rented')}</span>
                </div>

                {/* Rating + Heart */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
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
                      
                      setLikedIds(prev => {
                        const next = new Set(prev);
                        isLiked ? next.delete(item.id) : next.add(item.id);
                        return next;
                      });

                      if (!isLiked) showToast('Te gusta esta publicación', 'like');

                      (isLiked ? unlikeItem(user.id, item.id) : likeItem(user.id, item.id))
                        .catch(() => {
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
                  <div className="flex items-center gap-1 shrink-0">
                    <TrendingUp size={12} />
                    <span>{item.totalRentals} {t('rentals')}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
