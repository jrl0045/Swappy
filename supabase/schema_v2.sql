-- ============================================================================
-- Swappy Schema V2 — New features
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- ─── Reviews table (item reviews) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  rental_id UUID REFERENCES rentals(id) ON DELETE SET NULL,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_item_id ON reviews(item_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Public insert reviews" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update reviews" ON reviews FOR UPDATE USING (true);

-- ─── User reviews table (RF-CAL-01 / RF-CAL-02) ─────────────────────────────
-- Stores ratings between users (renter rates owner, owner rates renter)
CREATE TABLE IF NOT EXISTS user_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner_rates_renter', 'renter_rates_owner')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rental_id, reviewer_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_reviews_rental ON user_reviews(rental_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewed ON user_reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewer ON user_reviews(reviewer_id);

ALTER TABLE user_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read user_reviews" ON user_reviews FOR SELECT USING (true);
CREATE POLICY "Public insert user_reviews" ON user_reviews FOR INSERT WITH CHECK (true);

-- ─── Storage bucket for item images ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read item-images" ON storage.objects FOR SELECT USING (bucket_id = 'item-images');
CREATE POLICY "Public insert item-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'item-images');
CREATE POLICY "Public update item-images" ON storage.objects FOR UPDATE USING (bucket_id = 'item-images');
CREATE POLICY "Public delete item-images" ON storage.objects FOR DELETE USING (bucket_id = 'item-images');
