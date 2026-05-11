import { supabase } from './supabase';
import { DbItem, DbProfile, DbRental, DbReview } from './database.types';
import { RentalItem, Owner } from '../data';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** "Mayo 2025" desde una fecha ISO */
function formatMemberSince(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

// ─── Converters ─────────────────────────────────────────────────────────────

function dbProfileToOwner(profile: DbProfile): Owner {
  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar_url,
    rating: profile.rating,
    reviews: profile.reviews_count,
    verified: profile.verified,
    memberSince: profile.member_since || formatMemberSince(profile.created_at),
    responseRate: profile.response_rate,
    isBanned: profile.is_banned,
    isAdmin: profile.is_admin,
  };
}

function dbItemToRentalItem(item: DbItem): RentalItem {
  return {
    id: item.id,
    title: item.title,
    images: item.images,
    pricePerDay: item.price_per_day,
    location: item.location,
    lat: item.lat ?? undefined,
    lng: item.lng ?? undefined,
    category: item.category,
    description: item.description,
    available: item.available,
    rating: item.rating,
    totalRentals: item.total_rentals,
    likesCount: item.likes_count ?? 0,
    owner: item.owner ? dbProfileToOwner(item.owner) : {
      id: '', name: 'Unknown', avatar: '', rating: 0,
      reviews: 0, verified: false, memberSince: '', responseRate: 0,
    },
    features: item.features,
    createdAt: item.created_at,
    isActive: item.is_active !== false, // Default true if undefined
  };
}

// ─── Geocoding (Nominatim — free, no API key) ────────────────────────────────

export interface GeoResult {
  display_name: string;
  lat: string;
  lng: string;
}

export async function geocodeSearch(query: string): Promise<GeoResult[]> {
  if (!query.trim()) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=es&accept-language=es`;
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
    const data = await res.json();
    return data.map((r: any) => ({ display_name: r.display_name, lat: r.lat, lng: r.lon }));
  } catch { return []; }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const parts = [
      data.address?.road,
      data.address?.city || data.address?.town || data.address?.village,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 2).join(',') || '';
  } catch { return ''; }
}

// ─── Items API ───────────────────────────────────────────────────────────────

export async function fetchItems(category?: string, search?: string, currentUserId?: string): Promise<RentalItem[]> {
  let query = supabase
    .from('items')
    .select('*, owner:profiles!inner(*)')
    .order('created_at', { ascending: false });

  if (category && category !== 'All') query = query.eq('category', category);
  if (search && search.trim()) query = query.ilike('title', `%${search.trim()}%`);

  const { data, error } = await query;
  if (error) { console.error('Error fetching items:', error); return []; }
  
  let items = (data as DbItem[]).map(dbItemToRentalItem);
  
  // Apply visibility rules:
  // Item is visible if active and owner is not banned, OR if the current user is the owner.
  items = items.filter(item => {
    const isOwner = currentUserId === item.owner.id;
    const isActive = item.isActive !== false && !item.owner.isBanned;
    return isActive || isOwner;
  });

  return items;
}

export async function fetchMyListings(ownerId: string): Promise<RentalItem[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*, owner:profiles!owner_id(*)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) { console.error('Error fetching my listings:', error); throw error; }
  return (data as DbItem[]).map(dbItemToRentalItem);
}

export async function fetchItemById(id: string): Promise<RentalItem> {
  const { data, error } = await supabase
    .from('items')
    .select('*, owner:profiles!owner_id(*)')
    .eq('id', id)
    .single();
  if (error) {
    console.error('Error fetching item:', error);
    throw error;
  }
  return dbItemToRentalItem(data as DbItem);
}

export async function createItem(item: {
  ownerId: string; title: string; description: string; pricePerDay: number;
  category: string; location: string; lat?: number; lng?: number;
  images?: string[]; features?: string[];
}): Promise<RentalItem> {
  const { data, error } = await supabase
    .from('items')
    .insert({
      owner_id: item.ownerId, title: item.title, description: item.description,
      price_per_day: item.pricePerDay, category: item.category, location: item.location,
      lat: item.lat ?? null, lng: item.lng ?? null,
      images: item.images || [], features: item.features || [],
    })
    .select('*, owner:profiles!owner_id(*)')
    .single();
  if (error) { console.error('Error creating item:', error); throw error; }
  return dbItemToRentalItem(data as DbItem);
}

export async function updateItem(itemId: string, updates: {
  title?: string; description?: string; pricePerDay?: number; category?: string;
  location?: string; lat?: number; lng?: number;
  images?: string[]; features?: string[]; available?: boolean;
}): Promise<void> {
  const dbUpdates: any = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.pricePerDay !== undefined) dbUpdates.price_per_day = updates.pricePerDay;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.location !== undefined) dbUpdates.location = updates.location;
  if (updates.lat !== undefined) dbUpdates.lat = updates.lat;
  if (updates.lng !== undefined) dbUpdates.lng = updates.lng;
  if (updates.images !== undefined) dbUpdates.images = updates.images;
  if (updates.features !== undefined) dbUpdates.features = updates.features;
  if (updates.available !== undefined) dbUpdates.available = updates.available;
  const { error } = await supabase.from('items').update(dbUpdates).eq('id', itemId);
  if (error) { console.error('Error updating item:', error); throw error; }
}

export async function deleteItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', itemId);
  if (error) { console.error('Error deleting item:', error); throw error; }
}

// ─── Rentals API ─────────────────────────────────────────────────────────────

export async function createRental(rental: {
  itemId: string; renterId: string; ownerId: string; startDate: string; endDate: string;
  insuranceTier: string; totalPrice: number; days: number; itemTitle: string; itemImage: string;
}): Promise<void> {
  const { data: rentalData, error } = await supabase.from('rentals').insert({
    item_id: rental.itemId, renter_id: rental.renterId,
    start_date: rental.startDate, end_date: rental.endDate,
    insurance_tier: rental.insuranceTier, total_price: rental.totalPrice, status: 'pending',
  }).select('id').single();
  if (error) { console.error('Error creating rental:', error); throw error; }

  const rentalPayload = JSON.stringify({
    type: 'RENTAL_REQUEST', rentalId: rentalData.id,
    startDate: rental.startDate, endDate: rental.endDate, days: rental.days,
    totalPrice: rental.totalPrice, insuranceTier: rental.insuranceTier,
    itemImage: rental.itemImage, itemTitle: rental.itemTitle, status: 'pending',
  });
  const { error: msgError } = await supabase.from('messages').insert({
    sender_id: rental.renterId, receiver_id: rental.ownerId,
    item_id: rental.itemId, content: `__RENTAL_REQUEST__${rentalPayload}`,
  });
  if (msgError) console.error('Error sending rental request message:', msgError);
}

export async function fetchRentalsForItem(itemId: string): Promise<{ startDate: string; endDate: string }[]> {
  const { data, error } = await supabase
    .from('rentals').select('start_date, end_date')
    .eq('item_id', itemId).in('status', ['confirmed', 'active']);
  if (error) { console.error('Error fetching rentals for item:', error); return []; }
  return (data || []).map((r: any) => ({ startDate: r.start_date, endDate: r.end_date }));
}

export interface RentalWithDetails {
  id: string; itemId: string; itemTitle: string; itemImage: string;
  itemLat?: number; itemLng?: number; itemLocation?: string;
  startDate: string; endDate: string; totalPrice: number; status: string;
  insuranceTier: string; createdAt: string; ownerName: string; ownerId: string;
  renterId: string; renterName?: string;
}

export async function fetchMyRentals(renterId: string): Promise<RentalWithDetails[]> {
  const { data, error } = await supabase
    .from('rentals')
    .select('*, item:items!item_id(id, title, images, owner_id, location, lat, lng, owner:profiles!owner_id(id, name))')
    .eq('renter_id', renterId)
    .order('created_at', { ascending: false });
  if (error) { console.error('Error fetching my rentals:', error); throw error; }
  return (data || []).map((r: any) => ({
    id: r.id, itemId: r.item?.id || r.item_id,
    itemTitle: r.item?.title || 'Unknown Item', itemImage: r.item?.images?.[0] || '',
    itemLat: r.item?.lat, itemLng: r.item?.lng, itemLocation: r.item?.location,
    startDate: r.start_date, endDate: r.end_date, totalPrice: r.total_price,
    status: r.status, insuranceTier: r.insurance_tier, createdAt: r.created_at,
    ownerName: r.item?.owner?.name || 'Unknown', ownerId: r.item?.owner?.id || '',
    renterId: r.renter_id,
  }));
}

export async function fetchIncomingRentals(ownerId: string): Promise<RentalWithDetails[]> {
  const { data, error } = await supabase
    .from('rentals')
    .select('*, item:items!inner(id, title, images, owner_id, location, lat, lng), renter:profiles!renter_id(id, name)')
    .eq('items.owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) { console.error('Error fetching incoming rentals:', error); throw error; }
  return (data || []).map((r: any) => ({
    id: r.id, itemId: r.item?.id || r.item_id,
    itemTitle: r.item?.title || 'Unknown Item', itemImage: r.item?.images?.[0] || '',
    itemLat: r.item?.lat, itemLng: r.item?.lng, itemLocation: r.item?.location,
    startDate: r.start_date, endDate: r.end_date, totalPrice: r.total_price,
    status: r.status, insuranceTier: r.insurance_tier, createdAt: r.created_at,
    ownerName: 'Tú', ownerId, renterId: r.renter?.id || r.renter_id,
    renterName: r.renter?.name || 'Unknown',
  }));
}

export async function updateRentalStatus(rentalId: string, status: string): Promise<void> {
  const { error } = await supabase.from('rentals').update({ status }).eq('id', rentalId);
  if (error) { console.error('Error updating rental status:', error); throw error; }
}

export async function completeRental(rentalId: string, itemId: string): Promise<void> {
  const { error } = await supabase.from('rentals').update({ status: 'completed' }).eq('id', rentalId);
  if (error) { console.error('Error completing rental:', error); throw error; }
  await supabase.from('items').update({ available: true }).eq('id', itemId);
  const { data: item } = await supabase.from('items').select('total_rentals').eq('id', itemId).single();
  if (item) await supabase.from('items').update({ total_rentals: (item.total_rentals || 0) + 1 }).eq('id', itemId);
}

// ─── Reviews API ─────────────────────────────────────────────────────────────

export interface ReviewData {
  id: string; rating: number; comment: string | null;
  createdAt: string; reviewerName: string; reviewerAvatar: string;
}

export async function checkCanReviewItem(itemId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('rentals').select('end_date, status')
    .eq('item_id', itemId).eq('renter_id', userId).in('status', ['confirmed', 'completed']);
  if (error || !data || data.length === 0) return false;
  return data.some(r => new Date(r.end_date) < new Date());
}

export async function fetchReviews(itemId: string): Promise<ReviewData[]> {
  const { data, error } = await supabase
    .from('reviews').select('*, reviewer:profiles!reviewer_id(name, avatar_url)')
    .eq('item_id', itemId).order('created_at', { ascending: false });
  if (error) { console.error('Error fetching reviews:', error); return []; }
  return (data || []).map((r: any) => ({
    id: r.id, rating: r.rating, comment: r.comment, createdAt: r.created_at,
    reviewerName: r.reviewer?.name || 'Anonymous', reviewerAvatar: r.reviewer?.avatar_url || '',
  }));
}

export async function createReview(review: {
  itemId: string; reviewerId: string; rating: number; comment?: string; rentalId?: string;
}): Promise<void> {
  const { error } = await supabase.from('reviews').insert({
    item_id: review.itemId, reviewer_id: review.reviewerId,
    rating: review.rating, comment: review.comment || null, rental_id: review.rentalId || null,
  });
  if (error) { console.error('Error creating review:', error); throw error; }
  const { data: reviews } = await supabase.from('reviews').select('rating').eq('item_id', review.itemId);
  if (reviews && reviews.length > 0) {
    const avg = reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length;
    await supabase.from('items').update({ rating: Math.round(avg * 10) / 10 }).eq('id', review.itemId);
  }
}

// ─── User Reviews API ─────────────────────────────────────────────────────────

export interface UserReviewData {
  id: string; rentalId: string; reviewerId: string; reviewedId: string;
  role: 'owner_rates_renter' | 'renter_rates_owner'; rating: number;
  comment: string | null; createdAt: string;
  reviewerName?: string; reviewerAvatar?: string; createdAtStr?: string;
}

export async function createUserReview(review: {
  rentalId: string; reviewerId: string; reviewedId: string;
  role: 'owner_rates_renter' | 'renter_rates_owner'; rating: number; comment?: string;
}): Promise<void> {
  const { error } = await supabase.from('user_reviews').insert({
    rental_id: review.rentalId, reviewer_id: review.reviewerId,
    reviewed_id: review.reviewedId, role: review.role,
    rating: review.rating, comment: review.comment || null,
  });
  if (error) {
    if (error.code === '23505') { console.warn('User review already submitted'); return; }
    console.error('Error creating user review:', error); throw error;
  }
  const { data: allReviews } = await supabase
    .from('user_reviews').select('rating').eq('reviewed_id', review.reviewedId);
  if (allReviews && allReviews.length > 0) {
    const avg = allReviews.reduce((s: number, r: any) => s + r.rating, 0) / allReviews.length;
    await supabase.from('profiles').update({
      rating: Math.round(avg * 10) / 10, reviews_count: allReviews.length,
    }).eq('id', review.reviewedId);
  }
}

export async function fetchUserReviewsForRental(rentalId: string): Promise<UserReviewData[]> {
  const { data, error } = await supabase.from('user_reviews').select('*').eq('rental_id', rentalId);
  if (error) { console.error('Error fetching user reviews:', error); return []; }
  return (data || []).map((r: any) => ({
    id: r.id, rentalId: r.rental_id, reviewerId: r.reviewer_id, reviewedId: r.reviewed_id,
    role: r.role, rating: r.rating, comment: r.comment, createdAt: r.created_at,
  }));
}

/** Obtiene todas las valoraciones recibidas por un usuario (para la pestaña Reviews del perfil) */
export async function fetchUserReviewsReceived(userId: string): Promise<UserReviewData[]> {
  const { data, error } = await supabase
    .from('user_reviews')
    .select('*, reviewer:profiles!reviewer_id(name, avatar_url)')
    .eq('reviewed_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('Error fetching received reviews:', error); return []; }
  return (data || []).map((r: any) => ({
    id: r.id, rentalId: r.rental_id, reviewerId: r.reviewer_id, reviewedId: r.reviewed_id,
    role: r.role, rating: r.rating, comment: r.comment, createdAt: r.created_at,
    reviewerName: r.reviewer?.name || 'Anónimo',
    reviewerAvatar: r.reviewer?.avatar_url || '',
  }));
}

// ─── Profile API ─────────────────────────────────────────────────────────────

export interface ProfileData {
  id: string; name: string; avatarUrl: string; rating: number; reviewsCount: number;
  verified: boolean; memberSince: string; responseRate: number; location: string; bio: string;
  isBanned?: boolean; isAdmin?: boolean;
}

export async function fetchProfile(profileId: string): Promise<ProfileData | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', profileId).single();
  if (error) { console.error('Error fetching profile:', error); return null; }
  const p = data as DbProfile;
  return {
    id: p.id, name: p.name, avatarUrl: p.avatar_url, rating: p.rating,
    reviewsCount: p.reviews_count, verified: p.verified,
    // Si member_since está vacío, calcularlo del created_at
    memberSince: p.member_since || formatMemberSince(p.created_at),
    responseRate: p.response_rate, location: p.location || '', bio: p.bio || '',
    isBanned: p.is_banned, isAdmin: p.is_admin,
  };
}

export async function updateProfile(profileId: string, updates: {
  name?: string; location?: string; bio?: string; avatarUrl?: string;
}): Promise<void> {
  const dbUpdates: any = { id: profileId };
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.location !== undefined) dbUpdates.location = updates.location;
  if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
  if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
  const { error } = await supabase.from('profiles').upsert(dbUpdates, { onConflict: 'id' });
  if (error) { console.error('Error updating profile:', error); throw error; }
}

// ─── Image Upload ────────────────────────────────────────────────────────────

export async function uploadImage(file: File, bucket: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const { error } = await supabase.storage.from(bucket).upload(fileName, file);
  if (error) { console.error(`Error uploading image to ${bucket}:`, error); throw error; }
  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}

// ─── Messaging API ────────────────────────────────────────────────────────────

export interface MessageData {
  id: string; senderId: string; receiverId: string; itemId: string | null; content: string;
  read: boolean; createdAt: string; senderName: string; senderAvatar: string;
  receiverName: string; receiverAvatar: string; itemTitle: string | null;
}

export async function fetchInbox(userId: string): Promise<MessageData[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(name, avatar_url), receiver:profiles!receiver_id(name, avatar_url), item:items!item_id(title)')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) { console.error('Error fetching inbox:', error); return []; }
  return (data || []).map((m: any) => ({
    id: m.id, senderId: m.sender_id, receiverId: m.receiver_id, itemId: m.item_id,
    content: m.content, read: m.read, createdAt: m.created_at,
    senderName: m.sender?.name || 'Unknown', senderAvatar: m.sender?.avatar_url || '',
    receiverName: m.receiver?.name || 'Unknown', receiverAvatar: m.receiver?.avatar_url || '',
    itemTitle: m.item?.title || null,
  }));
}

export async function sendMessage(msg: {
  senderId: string; receiverId: string; itemId?: string; content: string;
}): Promise<void> {
  const { error } = await supabase.from('messages').insert({
    sender_id: msg.senderId, receiver_id: msg.receiverId,
    item_id: msg.itemId || null, content: msg.content,
  });
  if (error) { console.error('Error sending message:', error); throw error; }
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  const { error } = await supabase.from('messages').update({ read: true }).eq('id', messageId);
  if (error) console.error('Error marking message as read:', error);
}

export function subscribeToMessages(userId: string, onUpdate: () => void) {
  return supabase
    .channel('public:messages')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `receiver_id=eq.${userId}`,
    }, () => onUpdate())
    .subscribe();
}

// ─── Follows API ──────────────────────────────────────────────────────────────

export async function followUser(followerId: string, followedId: string): Promise<void> {
  const { error } = await supabase.from('follows').insert({ follower_id: followerId, followed_id: followedId });
  if (error && error.code !== '23505') { console.error('Error following user:', error); throw error; }
  
  if (!error) {
    supabase.from('notifications').insert({
      user_id: followedId, actor_id: followerId, type: 'follow'
    }).then();
  }
}

export async function unfollowUser(followerId: string, followedId: string): Promise<void> {
  const { error } = await supabase.from('follows').delete()
    .eq('follower_id', followerId).eq('followed_id', followedId);
  if (error) { console.error('Error unfollowing user:', error); throw error; }
}

export async function checkIsFollowing(followerId: string, followedId: string): Promise<boolean> {
  const { data, error } = await supabase.from('follows').select('id')
    .eq('follower_id', followerId).eq('followed_id', followedId).maybeSingle();
  if (error) { console.error('Error checking follow:', error); return false; }
  return !!data;
}

export async function fetchFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followed_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return { followers: followers || 0, following: following || 0 };
}

// ─── Likes API ────────────────────────────────────────────────────────────────

export async function likeItem(userId: string, itemId: string): Promise<void> {
  const { error } = await supabase.from('likes').insert({ user_id: userId, item_id: itemId });
  if (error && error.code !== '23505') { console.error('Error liking item:', error); throw error; }

  if (!error) {
    const { data } = await supabase.from('items').select('owner_id').eq('id', itemId).single();
    if (data?.owner_id && data.owner_id !== userId) {
      supabase.from('notifications').insert({
        user_id: data.owner_id, actor_id: userId, type: 'like', item_id: itemId
      }).then();
    }
  }
}

export async function unlikeItem(userId: string, itemId: string): Promise<void> {
  const { error } = await supabase.from('likes').delete()
    .eq('user_id', userId).eq('item_id', itemId);
  if (error) { console.error('Error unliking item:', error); throw error; }
}

export async function fetchUserLikedItemIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('likes').select('item_id').eq('user_id', userId);
  if (error) { console.error('Error fetching liked IDs:', error); return new Set(); }
  return new Set((data || []).map((r: any) => r.item_id));
}

export async function fetchLikedItems(userId: string): Promise<RentalItem[]> {
  const { data: likeRows, error: likesErr } = await supabase
    .from('likes').select('item_id').eq('user_id', userId).order('created_at', { ascending: false });
  if (likesErr || !likeRows || likeRows.length === 0) return [];

  const itemIds = likeRows.map((r: any) => r.item_id);
  const { data, error } = await supabase
    .from('items').select('*, owner:profiles!owner_id(*)')
    .in('id', itemIds);
  if (error) { console.error('Error fetching liked items:', error); return []; }

  // Preserve the order from likes (most recent first)
  const itemMap = new Map((data as DbItem[]).map(i => [i.id, dbItemToRentalItem(i)]));
  return itemIds.map(id => itemMap.get(id)).filter(Boolean) as RentalItem[];
}

export async function fetchItemLikesCount(itemId: string): Promise<number> {
  const { count, error } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('item_id', itemId);
  if (error) { console.error('Error fetching likes count:', error); return 0; }
  return count || 0;
}

// ─── Notifications API ────────────────────────────────────────────────────────

export interface NotificationData {
  id: string;
  userId: string;
  actorId: string;
  actorName: string;
  actorAvatar: string;
  type: 'like' | 'follow';
  itemId?: string;
  itemTitle?: string;
  itemImage?: string;
  read: boolean;
  createdAt: string;
}

export async function fetchNotifications(userId: string): Promise<NotificationData[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:profiles!actor_id(name, avatar_url), item:items!item_id(title, images)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) { console.error('Error fetching notifications:', error); return []; }
  return data.map((n: any) => ({
    id: n.id,
    userId: n.user_id,
    actorId: n.actor_id,
    actorName: n.actor?.name || 'Usuario activo',
    actorAvatar: n.actor?.avatar_url || '',
    type: n.type,
    itemId: n.item_id,
    itemTitle: n.item?.title,
    itemImage: n.item?.images?.[0] || '',
    read: n.read,
    createdAt: n.created_at,
  }));
}

export async function markNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
}

// ─── Admin API ────────────────────────────────────────────────────────────────

export async function fetchAllProfiles(): Promise<ProfileData[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Error fetching all profiles:', error); return []; }
  return (data || []).map((p: any) => ({
    id: p.id, name: p.name, avatarUrl: p.avatar_url, rating: p.rating,
    reviewsCount: p.reviews_count, verified: p.verified,
    memberSince: p.member_since || formatMemberSince(p.created_at),
    responseRate: p.response_rate, location: p.location || '', bio: p.bio || '',
    isBanned: p.is_banned, isAdmin: p.is_admin,
  }));
}

export async function fetchProfilesPaginated(page: number, pageSize: number): Promise<{ data: ProfileData[], count: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) { console.error('Error fetching profiles:', error); return { data: [], count: 0 }; }
  const profiles = (data || []).map((p: any) => ({
    id: p.id, name: p.name, avatarUrl: p.avatar_url, rating: p.rating,
    reviewsCount: p.reviews_count, verified: p.verified,
    memberSince: p.member_since || formatMemberSince(p.created_at),
    responseRate: p.response_rate, location: p.location || '', bio: p.bio || '',
    isBanned: p.is_banned, isAdmin: p.is_admin,
  }));
  return { data: profiles, count: count || 0 };
}

export async function fetchItemsAdminPaginated(page: number, pageSize: number): Promise<{ data: RentalItem[], count: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await supabase
    .from('items')
    .select('*, owner:profiles!owner_id(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) { console.error('Error fetching items admin:', error); return { data: [], count: 0 }; }
  const items = (data as DbItem[]).map(dbItemToRentalItem);
  return { data: items, count: count || 0 };
}

export async function updateUserBanStatus(userId: string, isBanned: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ is_banned: isBanned }).eq('id', userId);
  if (error) { console.error('Error updating user ban status:', error); throw error; }
}

export async function updateItemActiveStatus(itemId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('items').update({ is_active: isActive }).eq('id', itemId);
  if (error) { console.error('Error updating item active status:', error); throw error; }
}

export async function fetchCategories(): Promise<{ id: string; name: string; icon: string; isActive: boolean }[]> {
  const { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true });
  if (error) { console.error('Error fetching categories:', error); return []; }
  return (data || []).map((c: any) => ({ id: c.id, name: c.name, icon: c.icon || '', isActive: c.is_active !== false }));
}

export async function createCategory(name: string, icon: string): Promise<void> {
  const { error } = await supabase.from('categories').insert({ name, icon, is_active: true });
  if (error) { console.error('Error creating category:', error); throw error; }
}

export async function updateCategory(id: string, updates: { name?: string; icon?: string; isActive?: boolean }): Promise<void> {
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  const { error } = await supabase.from('categories').update(dbUpdates).eq('id', id);
  if (error) { console.error('Error updating category:', error); throw error; }
}
