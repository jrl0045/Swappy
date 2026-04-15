-- ============================================================================
-- Swappy Schema V4 — Follows + Likes
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- ─── Follows table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_id, followed_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed ON follows(followed_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Public insert follows" ON follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete follows" ON follows FOR DELETE USING (true);

-- ─── Likes table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_item ON likes(item_id);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Public insert likes" ON likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete likes" ON likes FOR DELETE USING (true);
