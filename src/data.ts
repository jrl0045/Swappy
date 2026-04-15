export const categories = [
  { name: "All", icon: "🏠" },
  { name: "Tools", icon: "🔧" },
  { name: "Camping", icon: "⛺" },
  { name: "Electronics", icon: "💻" },
  { name: "Kitchen", icon: "🍳" },
  { name: "Sports", icon: "⚽" },
  { name: "Garden", icon: "🌿" },
  { name: "Photography", icon: "📷" },
];

export interface Owner {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviews: number;
  verified: boolean;
  memberSince: string;
  responseRate: number;
}

export interface RentalItem {
  id: string;
  title: string;
  images: string[];
  pricePerDay: number;
  location: string;
  lat?: number;
  lng?: number;
  category: string;
  description: string;
  available: boolean;
  rating: number;
  totalRentals: number;
  likesCount?: number;
  owner: Owner;
  features: string[];
}
