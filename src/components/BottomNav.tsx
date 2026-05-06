import { Home, Heart, Plus, MessageCircle, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUnreadCounts } from '../hooks/useUnreadCounts';

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full border-2 border-white leading-none">
      {count > 9 ? '+9' : count}
    </span>
  );
}

export function BottomNav({ view, setView, onListItem, onMessages, onLogin }: {
  view: string;
  setView: (v: string) => void;
  onListItem: () => void;
  onMessages: () => void;
  onLogin: () => void;
}) {
  const { user, profile } = useAuth();
  const { unreadMessages } = useUnreadCounts();

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-100 flex items-stretch h-16 pb-[env(safe-area-inset-bottom)] box-content">
      {/* Inicio */}
      <button
        onClick={() => setView('home')}
        className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors ${view === 'home' ? 'text-accent' : 'text-gray-400'}`}
      >
        <Home size={22} />
        <span className="text-[10px] font-medium">Inicio</span>
      </button>

      {/* Guardados */}
      <button
        onClick={() => user ? setView('favorites') : onLogin()}
        className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors ${view === 'favorites' ? 'text-accent' : 'text-gray-400'}`}
      >
        <Heart size={22} />
        <span className="text-[10px] font-medium">Guardados</span>
      </button>

      {/* Publicar — FAB central */}
      <button
        onClick={onListItem}
        className="flex flex-col items-center justify-center flex-1 gap-0.5 text-gray-400"
      >
        <div className="w-11 h-11 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/30 -mt-5">
          <Plus size={22} className="text-white" />
        </div>
      </button>

      {/* Mensajes */}
      <button
        onClick={() => user ? onMessages() : onLogin()}
        className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors ${view === 'messages' ? 'text-accent' : 'text-gray-400'}`}
      >
        <div className="relative">
          <MessageCircle size={22} />
          <Badge count={unreadMessages} />
        </div>
        <span className="text-[10px] font-medium">Mensajes</span>
      </button>

      {/* Perfil */}
      <button
        onClick={() => user ? setView('profile') : onLogin()}
        className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors ${view === 'profile' ? 'text-accent' : 'text-gray-400'}`}
      >
        {user && profile?.avatarUrl
          ? <img src={profile.avatarUrl} alt="Perfil" className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
          : <UserRound size={22} />}
        <span className="text-[10px] font-medium">{user ? 'Perfil' : 'Entrar'}</span>
      </button>
    </nav>
  );
}
