import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, MessageCircle, Twitter, Mail } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export function ShareModal({ title, url, onClose }: { title: string, url: string, onClose: () => void }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(`Echa un vistazo a "${title}" en Swappy!`);

  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: <MessageCircle size={20} className="text-white fill-white" />,
      color: 'bg-green-500 hover:bg-green-600',
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      name: 'X (Twitter)',
      icon: <Twitter size={20} className="text-white fill-white" />,
      color: 'bg-black hover:bg-gray-800',
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      name: 'Email',
      icon: <Mail size={20} className="text-white" />,
      color: 'bg-blue-500 hover:bg-blue-600',
      href: `mailto:?subject=${encodedTitle}&body=Mira este increíble producto:%0A${encodedUrl}`,
    }
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Compartir producto</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Link Box */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-2">Enlace directo</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2">
            <div className="flex-1 overflow-x-auto whitespace-nowrap text-sm text-gray-500 px-2 scrollbar-none">
              {url}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors shrink-0"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Share Apps */}
        <p className="text-sm font-semibold text-gray-700 mb-3">Compartir en</p>
        <div className="grid grid-cols-3 gap-3">
          {shareLinks.map(link => (
            <a
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${link.color} flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-transform hover:scale-105 active:scale-95`}
            >
              {link.icon}
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">{link.name}</span>
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
