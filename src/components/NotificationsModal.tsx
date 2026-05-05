import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Calendar, Check, Loader2, Package, Heart, UserPlus } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../context/AuthContext';
import { fetchIncomingRentals, fetchInbox, updateRentalStatus, sendMessage, RentalWithDetails, fetchNotifications, markNotificationsAsRead, NotificationData } from '../lib/api';

export function NotificationsModal({ onClose }: { onClose: () => void }) {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [rentals, setRentals] = useState<RentalWithDetails[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    try {
      const [rentalsData, notifsData] = await Promise.all([
        fetchIncomingRentals(user.id),
        fetchNotifications(user.id)
      ]);
      setRentals(rentalsData);
      setNotifications(notifsData);
      markNotificationsAsRead(user.id).catch(console.error);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const handleAction = async (rental: RentalWithDetails, status: 'confirmed' | 'cancelled') => {
    if (!user) return;
    // Guard: only act on pending rentals
    if (rental.status !== 'pending') return;
    setActionLoadingId(rental.id);
    try {
      // 1. Update rental status in DB
      await updateRentalStatus(rental.id, status);

      // 2. Find the original __RENTAL_REQUEST__ message for this rental
      //    so we can build the updated embed payload
      const inbox = await fetchInbox(user.id);
      const originalMsg = inbox.find(m => {
        if (!m.content.startsWith('__RENTAL_REQUEST__')) return false;
        try {
          const p = JSON.parse(m.content.replace('__RENTAL_REQUEST__', ''));
          return p.rentalId === rental.id;
        } catch { return false; }
      });

      if (originalMsg) {
        const originalPayload = JSON.parse(originalMsg.content.replace('__RENTAL_REQUEST__', ''));
        const updatedPayload = JSON.stringify({ ...originalPayload, status });
        // 3. Send updated embed to the renter so they see the new status in chat
        await sendMessage({
          senderId: user.id,
          receiverId: rental.renterId,
          itemId: rental.itemId || undefined,
          content: `__RENTAL_REQUEST__${updatedPayload}`,
        });
      }

      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' });

  const pendingRentals = rentals.filter(r => r.status === 'pending');
  const otherRentals = rentals.filter(r => r.status !== 'pending');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-semibold">{t('notifications')}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={32} className="text-accent animate-spin" />
            </div>
          ) : pendingRentals.length === 0 && otherRentals.length === 0 && notifications.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Bell size={28} className="text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{t('noPendingRequests')}</h3>
              <p className="text-sm text-gray-500 max-w-xs">{t('noPendingRequestsDesc')}</p>
            </div>
          ) : (
            <div>
              {/* Solicitudes pendientes */}
              {pendingRentals.length > 0 && (
                <div>
                  <div className="px-5 pt-4 pb-2">
                    <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      {t('pendingRequests')} ({pendingRentals.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    <AnimatePresence mode="popLayout">
                      {pendingRentals.map(rental => (
                        <motion.div key={rental.id} layout
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                          className="p-4 bg-amber-50/50">
                          <div className="flex gap-3 mb-3">
                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                              {rental.itemImage
                                ? <img src={rental.itemImage} alt={rental.itemTitle} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                : <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-gray-300" /></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900">
                                <span className="font-semibold">{rental.renterName}</span>{' '}
                                <span className="text-gray-500">{t('wantsToRent')}</span>
                              </p>
                              <p className="text-sm font-medium text-gray-900 truncate">{rental.itemTitle}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <Calendar size={11} />
                                <span>{formatDate(rental.startDate)} → {formatDate(rental.endDate)}</span>
                                <span className="font-bold text-accent">€{rental.totalPrice.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleAction(rental, 'cancelled')} disabled={actionLoadingId === rental.id}
                              className="flex-1 py-2.5 px-4 rounded-xl bg-white border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                              <X size={16} />
                              {t('reject')}
                            </button>
                            <button onClick={() => handleAction(rental, 'confirmed')} disabled={actionLoadingId === rental.id}
                              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                              {actionLoadingId === rental.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                              {t('accept')}
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* System Notifications */}
              {notifications.length > 0 && (
                <div>
                  <div className="px-5 pt-4 pb-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Actividad</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {notifications.map(notif => (
                      <div key={notif.id} className={`p-4 flex items-center gap-3 ${!notif.read ? 'bg-blue-50/30' : ''}`}>
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gray-100 relative">
                          {notif.actorAvatar ? (
                            <img src={notif.actorAvatar} alt={notif.actorName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-accent text-white font-bold">
                              {notif.actorName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border border-white flex items-center justify-center ${notif.type === 'like' ? 'bg-red-500' : 'bg-blue-500'}`}>
                            {notif.type === 'like' ? <Heart size={8} className="text-white fill-white" /> : <UserPlus size={8} className="text-white" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            <span className="font-semibold">{notif.actorName}</span>{' '}
                            {notif.type === 'like' && (
                              <span>le ha gustado tu producto <span className="font-medium text-gray-700">{notif.itemTitle}</span></span>
                            )}
                            {notif.type === 'follow' && (
                              <span>ha empezado a seguirte</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatDate(notif.createdAt)}</p>
                        </div>
                        {notif.itemImage && (
                          <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 ml-2">
                            <img src={notif.itemImage} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historial reciente */}
              {otherRentals.length > 0 && (
                <div>
                  <div className="px-5 pt-4 pb-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('rentalHistory')}</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {otherRentals.slice(0, 10).map(rental => {
                      const statusColors: Record<string, string> = {
                        confirmed: 'bg-emerald-50 text-emerald-700',
                        active: 'bg-blue-50 text-blue-700',
                        completed: 'bg-gray-100 text-gray-600',
                        cancelled: 'bg-red-50 text-red-600',
                      };
                      const statusLabels: Record<string, string> = {
                        confirmed: t('statusConfirmed') as string,
                        active: t('statusActive') as string,
                        completed: t('statusCompleted') as string,
                        cancelled: t('statusCancelled') as string,
                      };
                      return (
                        <div key={rental.id} className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                            {rental.itemImage
                              ? <img src={rental.itemImage} alt={rental.itemTitle} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              : <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-gray-300" /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{rental.itemTitle}</p>
                            <p className="text-xs text-gray-500">{rental.renterName} · {formatDate(rental.startDate)}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${statusColors[rental.status] || 'bg-gray-100 text-gray-600'}`}>
                            {statusLabels[rental.status] || rental.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-full font-medium text-gray-600 hover:bg-gray-200 transition-colors">
            {t('close')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
