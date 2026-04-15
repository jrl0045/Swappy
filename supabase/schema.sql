-- ============================================================================
-- Swappy Database Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- ─── Profiles table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  member_since TEXT NOT NULL DEFAULT '',
  response_rate INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Items table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  price_per_day NUMERIC(10,2) NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  available BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  total_rentals INTEGER NOT NULL DEFAULT 0,
  features TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Rentals table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  insurance_tier TEXT NOT NULL DEFAULT 'none',
  total_price NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_items_owner_id ON items(owner_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_available ON items(available);
CREATE INDEX IF NOT EXISTS idx_rentals_item_id ON rentals(item_id);
CREATE INDEX IF NOT EXISTS idx_rentals_renter_id ON rentals(renter_id);

-- ─── Row Level Security (open for development) ─────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public read items" ON items FOR SELECT USING (true);
CREATE POLICY "Public read rentals" ON rentals FOR SELECT USING (true);

-- Allow insert/update/delete for development (restrict later with auth)
CREATE POLICY "Public insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update profiles" ON profiles FOR UPDATE USING (true);
CREATE POLICY "Public insert items" ON items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update items" ON items FOR UPDATE USING (true);
CREATE POLICY "Public delete items" ON items FOR DELETE USING (true);
CREATE POLICY "Public insert rentals" ON rentals FOR INSERT WITH CHECK (true);
-- Allow update rentals
CREATE POLICY "Public update rentals" ON rentals FOR UPDATE USING (true);

-- ─── Messages table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Public insert messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update messages" ON messages FOR UPDATE USING (true);

-- ─── Storage Buckets ─────────────────────────────────────────────────────────

-- Create the storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('FotosPerfil', 'FotosPerfil', true),
  ('FotosProductos', 'FotosProductos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read images
CREATE POLICY "Public Read FotosPerfil" ON storage.objects FOR SELECT USING (bucket_id = 'FotosPerfil');
CREATE POLICY "Public Read FotosProductos" ON storage.objects FOR SELECT USING (bucket_id = 'FotosProductos');

-- Allow public/auth to upload images (adjust for security later)
CREATE POLICY "Public Upload FotosPerfil" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'FotosPerfil');
CREATE POLICY "Public Upload FotosProductos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'FotosProductos');

-- Allow delete
CREATE POLICY "Public Delete FotosPerfil" ON storage.objects FOR DELETE USING (bucket_id = 'FotosPerfil');
CREATE POLICY "Public Delete FotosProductos" ON storage.objects FOR DELETE USING (bucket_id = 'FotosProductos');
