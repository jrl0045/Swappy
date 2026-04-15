import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Heart, UserPlus, Info } from 'lucide-react';

export type ToastType = 'success' | 'like' | 'follow' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none items-center">
        <AnimatePresence>
          {toasts.map(toast => {
            const getIcon = () => {
              if (toast.type === 'like') return <Heart size={16} className="text-red-500 fill-red-500" />;
              if (toast.type === 'follow') return <UserPlus size={16} className="text-blue-500" />;
              if (toast.type === 'success') return <CheckCircle2 size={16} className="text-emerald-500" />;
              return <Info size={16} className="text-gray-500" />;
            };
            
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="bg-white/90 backdrop-blur-md border border-gray-100 shadow-xl shadow-black/5 flex items-center gap-2.5 px-4 py-2.5 rounded-full pointer-events-auto min-w-[200px] justify-center"
              >
                {getIcon()}
                <span className="text-sm font-medium text-gray-800">{toast.message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
