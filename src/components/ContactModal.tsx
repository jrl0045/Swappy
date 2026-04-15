import { useState } from 'react';
import { motion } from 'motion/react';
import { X, MessageCircle, CheckCircle2, Clock, Star, Loader2, UserRound } from 'lucide-react';
import { RentalItem } from '../data';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../context/AuthContext';
import { sendMessage } from '../lib/api';

export function ContactModal({ item, onClose }: { item: RentalItem; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { t } = useLanguage();
  const { user } = useAuth();

  const handleSend = async () => {
    if (!message.trim() || !user) return;
    setLoading(true);
    setError(null);
    try {
      await sendMessage({ senderId: user.id, receiverId: item.owner.id, itemId: item.id, content: message.trim() });
      setIsSent(true);
      setTimeout(() => onClose(), 2500);
    } catch (e: any) {
      setLoading(false);
      if (e.message?.includes('uuid') || e.message?.includes('foreign key')) {
        setError('Este perfil es de demostración. No está registrado en la base de datos.');
      } else {
        setError('No se pudo enviar el mensaje. Inténtalo de nuevo.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {isSent ? (
          <div className="p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
              <CheckCircle2 size={64} className="text-accent mb-4" />
            </motion.div>
            <h2 className="text-2xl font-semibold mb-2">{t('messageSent')}</h2>
            <p className="text-gray-500">{item.owner.name} {t('messageSentDesc')}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold">{t('contactSeller')}</h2>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Owner Info — con fallback para avatar vacío */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                {item.owner.avatar
                  ? <img src={item.owner.avatar} alt={item.owner.name} className="w-12 h-12 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                  : <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0 text-accent font-semibold text-lg">
                      {item.owner.name.charAt(0).toUpperCase()}
                    </div>}
                <div className="flex-1">
                  <div className="font-semibold">{item.owner.name}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <span>{item.owner.rating}</span>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{t('typicallyResponds')} 2 {t('hours')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Item Reference */}
              <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-xl border border-accent/10">
                {item.images[0]
                  ? <img src={item.images[0]} alt={item.title} className="w-10 h-10 rounded-lg object-cover shrink-0" referrerPolicy="no-referrer" />
                  : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0"><UserRound size={16} className="text-gray-400" /></div>}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.title}</div>
                  <div className="text-xs text-accent font-semibold">€{item.pricePerDay} {t('perDay')}</div>
                </div>
              </div>

              {/* Message */}
              <div>
                <textarea value={message} onChange={e => { setMessage(e.target.value); setError(null); }}
                  placeholder={t('messagePlaceholder') as string}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none h-32 bg-white" />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-xs px-4 py-3 rounded-xl border border-red-100">{error}</div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={onClose} disabled={loading}
                className="px-6 py-3 rounded-full font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                {t('cancel')}
              </button>
              <button onClick={handleSend} disabled={!message.trim() || loading}
                className={`px-8 py-3 rounded-full font-medium flex items-center gap-2 transition-all ${
                  message.trim() && !loading ? 'bg-accent text-white hover:bg-accent-dark shadow-lg shadow-accent/20' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
                {loading ? 'Enviando...' : t('sendMessage')}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
