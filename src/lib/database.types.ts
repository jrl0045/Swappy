// TypeScript types matching our Supabase schema

export interface DbProfile {
  id: string;
  name: string;
  avatar_url: string;
  rating: number;
  reviews_count: number;
  verified: boolean;
  member_since: string;
  response_rate: number;
  location: string | null;
  bio: string | null;
  created_at: string;
  followers_count?: number;
  following_count?: number;
}

export interface DbItem {
  id: string;
  owner_id: string;
  title: string;
  images: string[];
  price_per_day: number;
  location: string;
  lat: number | null;
  lng: number | null;
  category: string;
  description: string;
  available: boolean;
  rating: number;
  total_rentals: number;
  features: string[];
  created_at: string;
  // Joined field
  owner?: DbProfile;
  likes_count?: number;
}

export interface DbRental {
  id: string;
  item_id: string;
  renter_id: string;
  start_date: string;
  end_date: string;
  insurance_tier: string;
  total_price: number;
  status: string;
  created_at: string;
  // Joined fields
  item?: DbItem;
  renter?: DbProfile;
}

export interface DbReview {
  id: string;
  item_id: string;
  rental_id: string | null;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  // Joined
  reviewer?: DbProfile;
}
