-- Ejecuta esto en el Editor SQL de tu panel de Supabase

-- 1. Crear tabla payout_requests
CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount_requested NUMERIC NOT NULL,
  commission_deducted NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'paid'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- 2. Añadir la columna payout_request_id a rentals
ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS payout_request_id UUID REFERENCES payout_requests(id) ON DELETE SET NULL;

-- 3. Habilitar RLS en payout_requests
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para payout_requests
CREATE POLICY "Los usuarios pueden ver sus propias solicitudes" 
  ON payout_requests FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propias solicitudes" 
  ON payout_requests FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los admins pueden ver todas las solicitudes" 
  ON payout_requests FOR SELECT 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Los admins pueden actualizar todas las solicitudes" 
  ON payout_requests FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Nota: Asegúrate de que las políticas sobre rentals permitan 
-- que el dueño de un objeto actualice el campo payout_request_id.
