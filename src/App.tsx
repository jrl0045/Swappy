import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Navbar } from './components/Navbar';
import { Feed } from './components/Feed';
import { ItemDetail } from './components/ItemDetail';
import { RentalModal } from './components/RentalModal';
import { ContactModal } from './components/ContactModal';
import { ListItemModal } from './components/ListItemModal';
import { MessagesModal } from './components/MessagesModal';
import { NotificationsModal } from './components/NotificationsModal';
import { Profile } from './components/Profile';
import { PublicProfile } from './components/PublicProfile';
import { Favorites } from './components/Favorites';
import { AuthModal } from './components/AuthModal';
import { BottomNav } from './components/BottomNav';
import { RentalItem } from './data';
import { fetchItemById } from './lib/api';
import { LanguageContext } from './LanguageContext';
import { Lang, translations, TranslationKey } from './i18n';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

function AppContent() {
  const [view, setView] = useState('home');
  const [selectedItem, setSelectedItem] = useState<RentalItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [publicProfileUserId, setPublicProfileUserId] = useState<string | null>(null);
  const prevViewRef = useRef<string>('home');

  const [isRentalModalOpen, setIsRentalModalOpen] = useState(false);
  const [rentalStartDate, setRentalStartDate] = useState<Date | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isListItemModalOpen, setIsListItemModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [messagesTarget, setMessagesTarget] = useState<{userId: string; itemId?: string} | undefined>();

  const { user } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let itemId = params.get('item');
    if (itemId) {
      // Clean up UUID if it was mangled by app spaces (Whatsapp/Desktop share)
      const match = itemId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
      if (match) itemId = match[0];

      fetchItemById(itemId).then(item => {
        setSelectedItem(item);
        setView('item');
        window.history.replaceState({}, '', '/');
      }).catch(console.error);
    }
  }, []);

  const handleSelectItem = (item: RentalItem) => { setSelectedItem(item); setView('item'); };
  const handleBack = () => { setSelectedItem(null); setView('home'); };

  const handleViewProfile = (userId: string) => {
    prevViewRef.current = view;
    setPublicProfileUserId(userId);
    setView('publicProfile');
  };

  const handleBackFromPublicProfile = () => {
    setPublicProfileUserId(null);
    setView(prevViewRef.current === 'publicProfile' ? 'home' : prevViewRef.current);
  };

  const handleSelectItemFromPublicProfile = (item: RentalItem) => {
    setSelectedItem(item);
    setView('item');
  };

  const handleSendMessageFromProfile = (targetUserId: string) => {
    requireAuth(() => openMessages({userId: targetUserId}));
  };

  const requireAuth = (action: () => void) => {
    if (!user) { setAuthModalMode('login'); setIsAuthModalOpen(true); } else action();
  };

  const openMessages = (target?: {userId: string; itemId?: string}) => { 
    setIsRentalModalOpen(false); 
    setRentalStartDate(null); 
    setMessagesTarget(target);
    setView('messages'); 
  };

  const handleSetView = (v: string) => {
    if (v === 'profile' || v === 'favorites') {
      requireAuth(() => { setView(v); setSearchQuery(''); });
    } else {
      setView(v);
      if (v !== 'home') setSearchQuery('');
    }
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (view !== 'home') setView('home');
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans flex flex-col">

        {view !== 'messages' && (
          <>
            <Navbar
              setView={handleSetView}
              onListItem={() => requireAuth(() => setIsListItemModalOpen(true))}
              onMessages={() => requireAuth(() => openMessages())}
              onNotifications={() => requireAuth(() => setIsNotificationsOpen(true))}
              onLogin={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }}
              onRegister={() => { setAuthModalMode('register'); setIsAuthModalOpen(true); }}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
            />
            <BottomNav
              view={view}
              setView={handleSetView}
              onListItem={() => requireAuth(() => setIsListItemModalOpen(true))}
              onMessages={() => requireAuth(() => openMessages())}
              onLogin={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }}
            />
          </>
        )}

        <main className={`flex-1 ${view !== 'messages' ? 'pb-[calc(5rem+env(safe-area-inset-bottom))]' : ''}`}>
          <AnimatePresence mode="wait">
            {view === 'home' && (
              <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Feed
                  onSelectItem={handleSelectItem}
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
                />
              </motion.div>
            )}
            {view === 'item' && selectedItem && (
              <motion.div key="item" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ItemDetail
                  item={selectedItem} onBack={handleBack}
                  onRent={(date) => requireAuth(() => { setRentalStartDate(date || null); setIsRentalModalOpen(true); })}
                  onContact={() => requireAuth(() => setIsContactModalOpen(true))}
                  onViewProfile={handleViewProfile}
                />
              </motion.div>
            )}
            {view === 'publicProfile' && publicProfileUserId && (
              <motion.div key="publicProfile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <PublicProfile
                  userId={publicProfileUserId}
                  onBack={handleBackFromPublicProfile}
                  onSelectItem={handleSelectItemFromPublicProfile}
                  onSendMessage={handleSendMessageFromProfile}
                />
              </motion.div>
            )}
            {view === 'profile' && user && (
              <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Profile onListItem={() => setIsListItemModalOpen(true)} />
              </motion.div>
            )}
            {view === 'favorites' && user && (
              <motion.div key="favorites" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Favorites onSelectItem={handleSelectItem} onBack={handleBack} />
              </motion.div>
            )}
            {view === 'messages' && user && (
              <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-screen">
                <MessagesModal onClose={() => { setView('home'); setMessagesTarget(undefined); }} targetUserId={messagesTarget?.userId} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {isAuthModalOpen && <AuthModal initialMode={authModalMode} onClose={() => setIsAuthModalOpen(false)} />}
          {isRentalModalOpen && selectedItem && (
            <RentalModal item={selectedItem} initialDate={rentalStartDate}
              onClose={() => { setIsRentalModalOpen(false); setRentalStartDate(null); }}
              onOpenMessages={() => { if (selectedItem.owner?.id) requireAuth(() => openMessages({userId: selectedItem.owner.id, itemId: selectedItem.id})); }} />
          )}
          {isContactModalOpen && selectedItem && <ContactModal item={selectedItem} onClose={() => setIsContactModalOpen(false)} />}
          {isListItemModalOpen && <ListItemModal onClose={() => setIsListItemModalOpen(false)} />}
          {isNotificationsOpen && <NotificationsModal onClose={() => setIsNotificationsOpen(false)} />}
        </AnimatePresence>
      </div>
  );
}

export default function App() {
  const [lang, setLang] = useState<Lang>('es');
  const t = (key: TranslationKey) => translations[lang as Lang][key];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </LanguageContext.Provider>
  );
}
