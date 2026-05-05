import { Search, MessageCircle, Bell, Plus, Globe, UserRound, LogOut, X, Heart } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useUnreadCounts } from '../hooks/useUnreadCounts';
import logo from '../assets/logo.png';

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 9 ? '+9' : String(count);
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white shadow-sm leading-none">
      {label}
    </span>
  );
}

export function Navbar({ setView, onListItem, onMessages, onNotifications, onLogin, onRegister, searchQuery, onSearchChange }: {
  setView: (view: string) => void;
  onListItem: () => void;
  onMessages: () => void;
  onNotifications: () => void;
  onLogin: () => void;
  onRegister: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const { lang, setLang, t } = useLanguage();
  const { user, signOut, profile } = useAuth();
  const { unreadMessages, pendingRentals } = useUnreadCounts();

  const handleSearchChange = (val: string) => {
    onSearchChange(val);
    if (val.trim()) setView('home');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-28 gap-2 sm:gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => { setView('home'); onSearchChange(''); }}>
            <img src={logo} alt="Swappy Logo" className="h-12 sm:h-24 w-auto" />
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-accent transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) setView('home'); }}
                className="block w-full pl-10 pr-8 py-2.5 border border-gray-200 rounded-full leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
                placeholder={t('searchPlaceholder') as string}
              />
              {searchQuery && (
                <button onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Icons & Actions */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
              className="flex items-center gap-1.5 px-3 py-2 text-gray-500 hover:text-accent hover:bg-accent/5 rounded-full text-sm font-medium transition-colors"
              title={t('language') as string}>
              <Globe size={16} />
              <span className="hidden sm:inline uppercase">{lang}</span>
            </button>
            <button onClick={onListItem}
              className="hidden md:flex items-center gap-2 bg-accent/10 text-accent hover:bg-accent hover:text-white px-4 py-2 rounded-full text-sm font-medium transition-colors">
              <Plus size={18} />
              <span>{t('listAnItem')}</span>
            </button>

            {user ? (
              <>
                <button onClick={onMessages} className="hidden sm:flex p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-full transition-colors relative">
                  <MessageCircle size={22} />
                  <Badge count={unreadMessages} />
                </button>
                <button onClick={onNotifications} className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-full transition-colors relative hidden sm:block">
                  <Bell size={22} />
                  <Badge count={pendingRentals} />
                </button>
                <button onClick={() => setView('favorites')} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors hidden sm:block"
                  title={t('favorites') as string}>
                  <Heart size={22} />
                </button>
                <button className="hidden sm:flex w-9 h-9 rounded-full border border-gray-200 hover:border-accent transition-all overflow-hidden bg-gray-50 items-center justify-center p-0"
                  onClick={() => setView('profile')}>
                  {profile?.avatarUrl
                    ? <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : <UserRound size={18} className="text-gray-400" />}
                </button>
                <button onClick={async () => { await signOut(); setView('home'); }}
                  className="hidden sm:flex p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title={t('logOut') as string}>
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-2">
                <button onClick={onRegister}
                  className="hidden sm:inline-block px-4 py-2 rounded-full text-sm font-semibold border border-gray-200 text-gray-700 hover:border-accent hover:text-accent transition-colors">
                  {t('register')}
                </button>
                <button onClick={onLogin}
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-accent text-white hover:bg-accent-dark shadow-sm transition-colors">
                  {t('login')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
