-- ============================================================================
-- Swappy Schema V3 — Geolocalización + Dirección exacta de recogida
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- Coordenadas para el mapa
ALTER TABLE items ADD COLUMN IF NOT EXISTS lat NUMERIC(9,6);
ALTER TABLE items ADD COLUMN IF NOT EXISTS lng NUMERIC(9,6);

-- Dirección exacta de recogida escrita por el propietario
-- (incluye número de portal, piso, etc. que Nominatim no siempre devuelve)
ALTER TABLE items ADD COLUMN IF NOT EXISTS pickup_address TEXT;

CREATE INDEX IF NOT EXISTS idx_items_lat_lng ON items(lat, lng);
