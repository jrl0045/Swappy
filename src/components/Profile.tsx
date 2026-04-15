import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MapPin, Settings, Package, Clock, Plus, ShieldCheck, TrendingUp, Loader2, ShoppingBag, LogOut, UserRound, Users } from 'lucide-react';
import { RentalItem } from '../data';
import { fetchMyListings, fetchProfile, fetchUserReviewsReceived, fetchFollowCounts, ProfileData, UserReviewData } from '../lib/api';
import { EditProfileModal } from './EditProfileModal';
import { EditItemModal } from './EditItemModal';
import { MyRentals } from './MyRentals';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../context/AuthContext';

type ProfileTab = 'listings' | 'rentals' | 'reviews';

// ─── Pestaña Reviews ──────────────────────────────────────────────────────────

function ReviewsTab({ userId }: { userId: string }) {
  const [reviews, setReviews] = useState<UserReviewData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserReviewsReceived(userId).then(data => {
      setReviews(data);
      setLoading(false);
    });
  }, [userId]);

  const avg = reviews.length > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  const fmt = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={28} className="text-accent animate-spin" /></div>;

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <Star size={28} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Sin valoraciones aún</h3>
        <p className="text-sm text-gray-500">Las opiniones de otros usuarios aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-100">
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-900">{avg}</div>
          <div className="flex gap-0.5 justify-center mt-1">
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={14} className={s <= Math.round(avg || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{reviews.length} {reviews.length === 1 ? 'opinión' : 'opiniones'}</div>
        </div>
        <div className="flex-1 space-y-1.5">
          {[5,4,3,2,1].map(star => {
            const count = reviews.filter(r => r.rating === star).length;
            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-2">{star}</span>
                <Star size={10} className="text-yellow-400 fill-yellow-400 shrink-0" />
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-4">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {reviews.map(review => (
          <div key={review.id} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              {review.reviewerAvatar
                ? <img src={review.reviewerAvatar} alt={review.reviewerName} className="w-10 h-10 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                : <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0 text-accent font-semibold">
                    {(review.reviewerName || '?').charAt(0).toUpperCase()}
                  </div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm text-gray-900">{review.reviewerName}</p>
                  <span className="text-xs text-gray-400 shrink-0">{fmt(review.createdAt)}</span>
                </div>
                <div className="flex gap-0.5 mt-0.5">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={12} className={s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                  ))}
                </div>
              </div>
            </div>
            {review.comment && (
              <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
            )}
            <div className="mt-2">
              <span className="inline-block text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                {review.role === 'renter_rates_owner' ? 'Como propietario' : 'Como arrendatario'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export function Profile({ onListItem }: { onListItem: () => void }) {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const [listings, setListings] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalItem | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('listings');
  const [followCounts, setFollowCounts] = useState<{ followers: number; following: number }>({ followers: 0, following: 0 });

  const loadData = () => {
    if (!user) return;
    Promise.all([fetchMyListings(user.id), fetchProfile(user.id), fetchFollowCounts(user.id)])
      .then(([items, prof, counts]) => { setListings(items); setProfile(prof); setFollowCounts(counts); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [user]);

  if (loading || !user) {
    return <div className="flex justify-center py-20"><Loader2 size={32} className="text-accent animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="bg-white rounded-3xl border border-gray-100 p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-6 shadow-sm">
        <div className="relative">
          {profile?.avatarUrl
            ? <img src={profile.avatarUrl} alt={profile?.name} className="w-28 h-28 rounded-full border-4 border-white shadow-lg object-cover" referrerPolicy="no-referrer" />
            : <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg bg-gray-50 flex items-center justify-center text-gray-300"><UserRound size={48} /></div>}
          {profile?.verified && (
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-accent rounded-full flex items-center justify-center border-2 border-white">
              <ShieldCheck size={14} className="text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
            <h1 className="text-3xl font-semibold">{profile?.name}</h1>
            {profile?.verified && (
              <span className="text-xs bg-accent/10 text-accent px-2.5 py-1 rounded-full font-medium">{t('verified')}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-500 mb-4">
            <div className="flex items-center gap-1">
              <MapPin size={16} />
              <span>{profile?.location || t('locationNotSet')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
              <span className="font-medium text-gray-900">{profile?.rating || 0}</span>
              <span>({profile?.reviewsCount || 0} {t('reviews')})</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={16} />
              <span>{t('memberSince')} {profile?.memberSince || ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={16} />
              <span className="font-medium text-gray-900">{followCounts.followers}</span>
              <span>{t('followers')}</span>
              <span>·</span>
              <span className="font-medium text-gray-900">{followCounts.following}</span>
              <span>{t('followingCount')}</span>
            </div>
          </div>
          {profile?.bio
            ? <p className="text-gray-600 max-w-2xl">{profile.bio}</p>
            : <p className="text-gray-400 max-w-2xl italic text-sm">{t('noBio')}</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsEditOpen(true)}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-full font-medium transition-colors">
            {t('editProfile')}
          </button>
          <button onClick={async () => { await signOut(); }}
            className="flex items-center justify-center px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-colors"
            title={t('logOut') as string}>
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <div className="text-2xl font-bold text-accent mb-1">{listings.length}</div>
          <div className="text-sm text-gray-500 font-medium">{t('activeListings')}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <div className="text-2xl font-bold text-accent mb-1">{listings.reduce((s, i) => s + i.totalRentals, 0)}</div>
          <div className="text-sm text-gray-500 font-medium">{t('totalRentals')}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <div className="text-2xl font-bold text-accent mb-1">{profile?.responseRate || 0}%</div>
          <div className="text-sm text-gray-500 font-medium">{t('responseRateLabel')}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-gray-200 mb-8">
        {([
          { key: 'listings', icon: Package,     label: `${t('activeListings')} (${listings.length})` },
          { key: 'rentals',  icon: ShoppingBag, label: t('myRentals') as string },
          { key: 'reviews',  icon: Star,        label: t('reviewsTabTitle') as string },
        ] as { key: ProfileTab; icon: any; label: string }[]).map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`pb-4 border-b-2 font-medium flex items-center gap-2 transition-colors ${
              activeTab === key ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <Icon size={18} />{label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'listings' && (
          <motion.div key="listings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {listings.map((item, index) => (
                <motion.div key={item.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    <img src={item.images[0]} alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                    <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.available ? 'bg-emerald-50/90 text-emerald-700' : 'bg-gray-100/90 text-gray-500'
                    }`}>
                      {item.available ? t('available') : t('rented')}
                    </div>
                    <div className="absolute top-2 right-2">
                      <button onClick={e => { e.stopPropagation(); setEditingItem(item); }}
                        className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:text-accent shadow-sm transition-colors">
                        <Settings size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 truncate mb-1">{item.title}</h3>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-accent">€{item.pricePerDay}<span className="text-xs text-gray-400 font-normal"> {t('perDay')}</span></div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <TrendingUp size={12} />
                        <span>{item.totalRentals} {t('rentals')}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: listings.length * 0.05 }}
                onClick={onListItem}
                className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center aspect-square hover:border-accent hover:bg-accent/5 transition-colors cursor-pointer text-gray-500 hover:text-accent">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                  <Plus size={24} />
                </div>
                <span className="font-medium">{t('listAnItem')}</span>
              </motion.div>
            </div>
          </motion.div>
        )}

        {activeTab === 'rentals' && (
          <motion.div key="rentals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MyRentals />
          </motion.div>
        )}

        {activeTab === 'reviews' && (
          <motion.div key="reviews" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ReviewsTab userId={user.id} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditOpen && (
          <EditProfileModal
            profile={profile || { id: user.id, name: user.email?.split('@')[0] || 'User', avatarUrl: '', rating: 0, reviewsCount: 0, verified: false, memberSince: '', responseRate: 0, location: '', bio: '' }}
            onClose={() => setIsEditOpen(false)}
            onSaved={updated => setProfile(updated)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {editingItem && (
          <EditItemModal item={editingItem} onClose={() => setEditingItem(null)} onUpdated={loadData} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
