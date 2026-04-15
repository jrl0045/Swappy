-- schema_v5.sql
-- Nuevas tablas y contadores para Swappy

-- 1. Añadir contadores globales a las tablas base
ALTER TABLE items ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count INTEGER NOT NULL DEFAULT 0;

-- Recalcular valores si ya existían para consistencia (opcional pero seguro)
UPDATE items 
SET likes_count = (SELECT COUNT(*) FROM likes WHERE likes.item_id = items.id);

UPDATE profiles 
SET followers_count = (SELECT COUNT(*) FROM follows WHERE follows.followed_id = profiles.id),
    following_count = (SELECT COUNT(*) FROM follows WHERE follows.follower_id = profiles.id);


-- 2. Triggers para likes
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE items SET likes_count = likes_count + 1 WHERE id = NEW.item_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE items SET likes_count = likes_count - 1 WHERE id = OLD.item_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_likes_count ON likes;
CREATE TRIGGER trigger_update_likes_count
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION update_likes_count();


-- 3. Triggers para followers
CREATE OR REPLACE FUNCTION update_follows_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.followed_id;
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET followers_count = followers_count - 1 WHERE id = OLD.followed_id;
    UPDATE profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_follows_count ON follows;
CREATE TRIGGER trigger_update_follows_count
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_follows_count();


-- 4. Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,   -- Quien recibe
    actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,  -- Quien hace la acción
    type TEXT NOT NULL CHECK (type IN ('like', 'follow')),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,               -- Opcional (para likes)
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Any authenticated user can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Activar realtime para notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
