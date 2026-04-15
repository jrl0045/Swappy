import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function useUnreadCounts() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingRentals, setPendingRentals] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fetchCounts = async () => {
    if (!user) {
      setUnreadMessages(0);
      setPendingRentals(0);
      setUnreadNotifications(0);
      return;
    }

    // Unread messages count
    const { count: msgCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('read', false);

    setUnreadMessages(msgCount || 0);

    // Pending incoming rentals count (items owned by user with pending status)
    const { data: myItems } = await supabase
      .from('items')
      .select('id')
      .eq('owner_id', user.id);

    if (myItems && myItems.length > 0) {
      const itemIds = myItems.map(i => i.id);
      const { count: rentalCount } = await supabase
        .from('rentals')
        .select('*', { count: 'exact', head: true })
        .in('item_id', itemIds)
        .eq('status', 'pending');

      setPendingRentals(rentalCount || 0);
    } else {
      setPendingRentals(0);
    }

    // Unread system notifications
    const { count: notifCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
      
    setUnreadNotifications(notifCount || 0);
  };

  useEffect(() => {
    fetchCounts();

    if (!user) return;

    // Subscribe to new messages
    const msgSubscription = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => fetchCounts()
      )
      .subscribe();

    // Subscribe to rental status changes
    const rentalSubscription = supabase
      .channel('pending-rentals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rentals',
        },
        () => fetchCounts()
      )
      .subscribe();

    // Subscribe to notifications
    const notifSubscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          fetchCounts();
          const n = payload.new;
          if (n.type === 'like') showToast('A alguien le ha gustado tu producto', 'like');
          if (n.type === 'follow') showToast('Tienes un nuevo seguidor', 'follow');
        }
      )
      .subscribe();

    return () => {
      msgSubscription.unsubscribe();
      rentalSubscription.unsubscribe();
      notifSubscription.unsubscribe();
    };
  }, [user]);

  return { unreadMessages, pendingRentals, unreadNotifications, refetch: fetchCounts };
}
