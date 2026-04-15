-- ============================================================================
-- Swappy Seed Data (idempotent — safe to run multiple times)
-- Run this AFTER schema.sql in Supabase Dashboard → SQL Editor
-- ============================================================================

-- ─── Profiles (Owners) ─────────────────────────────────────────────────────

INSERT INTO profiles (id, name, avatar_url, rating, reviews_count, verified, member_since, response_rate, location) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alex Developer', 'https://i.pravatar.cc/150?u=me', 4.9, 42, true, '2023', 95, 'Madrid, Chamberí'),
  ('00000000-0000-0000-0000-000000000002', 'Carlos García', 'https://i.pravatar.cc/150?u=carlos', 4.9, 124, true, '2024', 98, 'Madrid, Centro'),
  ('00000000-0000-0000-0000-000000000003', 'María López', 'https://i.pravatar.cc/150?u=maria', 5.0, 89, true, '2023', 100, 'Barcelona, Gracia'),
  ('00000000-0000-0000-0000-000000000004', 'Andrea Ruiz', 'https://i.pravatar.cc/150?u=andrea', 4.9, 156, true, '2023', 95, 'Valencia, Ruzafa'),
  ('00000000-0000-0000-0000-000000000005', 'Javier Moreno', 'https://i.pravatar.cc/150?u=javier', 4.8, 210, true, '2024', 92, 'Sevilla, Triana'),
  ('00000000-0000-0000-0000-000000000006', 'Lucía Fernández', 'https://i.pravatar.cc/150?u=lucia', 5.0, 56, true, '2024', 100, 'Bilbao, Casco Viejo'),
  ('00000000-0000-0000-0000-000000000007', 'Pablo Navarro', 'https://i.pravatar.cc/150?u=pablo', 4.6, 34, false, '2025', 88, 'Málaga, Centro'),
  ('00000000-0000-0000-0000-000000000008', 'Fernando Torres', 'https://i.pravatar.cc/150?u=fernando', 4.7, 78, true, '2023', 94, 'Zaragoza, La Almozara'),
  ('00000000-0000-0000-0000-000000000009', 'Elena Vega', 'https://i.pravatar.cc/150?u=elena', 5.0, 92, true, '2023', 97, 'San Sebastián')
ON CONFLICT (id) DO NOTHING;

-- ─── Items (Feed items) ────────────────────────────────────────────────────

INSERT INTO items (owner_id, title, images, price_per_day, location, category, description, available, rating, total_rentals, features) VALUES
  (
    '00000000-0000-0000-0000-000000000002',
    'Bosch Professional Drill GSB 18V',
    ARRAY['https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=800&auto=format&fit=crop','https://images.unsplash.com/photo-1572981779307-38b8cabb2407?q=80&w=800&auto=format&fit=crop','https://images.unsplash.com/photo-1530124566582-a45a7c2ec644?q=80&w=800&auto=format&fit=crop'],
    8, 'Madrid, Centro', 'Tools',
    'Professional Bosch cordless drill, perfect for any home project. Comes with 2 batteries, charger, and a full bit set. Ideal for drilling into wood, metal, or masonry.',
    true, 4.9, 47,
    ARRAY['2 batteries', 'Charger included', 'Bit set', 'Carry case']
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '4-Person Camping Tent — Waterproof',
    ARRAY['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=800&auto=format&fit=crop','https://images.unsplash.com/photo-1478827536114-da961b7f86d2?q=80&w=800&auto=format&fit=crop','https://images.unsplash.com/photo-1510312305653-8ed496efae75?q=80&w=800&auto=format&fit=crop'],
    15, 'Barcelona, Gracia', 'Camping',
    'Spacious 4-person tent, fully waterproof with double-layer construction. Easy setup in under 10 minutes. Perfect for weekend getaways in nature.',
    true, 4.8, 32,
    ARRAY['Waterproof', '4-person', 'Easy setup', 'Includes stakes']
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'Sony Alpha A7III — Full Camera Kit',
    ARRAY['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop','https://images.unsplash.com/photo-1502920917128-1aa500764cbd?q=80&w=800&auto=format&fit=crop','https://images.unsplash.com/photo-1495707902641-75cac588d2e9?q=80&w=800&auto=format&fit=crop'],
    35, 'Valencia, Ruzafa', 'Photography',
    'Full-frame mirrorless camera with 28-70mm lens, 2 extra batteries, and 128GB SD card. Perfect for events, travel, or content creation.',
    true, 5.0, 68,
    ARRAY['28-70mm lens', '2 batteries', '128GB SD card', 'Carry bag']
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'Mountain Bike — Trek Marlin 7',
    ARRAY['https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?q=80&w=800&auto=format&fit=crop','https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=800&auto=format&fit=crop','https://images.unsplash.com/photo-1571068316344-75bc76f77890?q=80&w=800&auto=format&fit=crop'],
    20, 'Sevilla, Triana', 'Sports',
    'High-performance mountain bike, size M. Recently serviced with new tires. Ideal for trails, mountains, or weekend rides around the city.',
    true, 4.7, 53,
    ARRAY['Size M frame', 'Helmet included', 'Lock included', 'Recently serviced']
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'KitchenAid Stand Mixer — Artisan',
    ARRAY['https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?q=80&w=800&auto=format&fit=crop','https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=800&auto=format&fit=crop','https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?q=80&w=800&auto=format&fit=crop'],
    12, 'Bilbao, Casco Viejo', 'Kitchen',
    'Professional-grade KitchenAid Artisan mixer. Comes with whisk, dough hook, and flat beater attachments. Perfect for baking projects and dinner parties.',
    true, 4.9, 29,
    ARRAY['3 attachments', '4.8L bowl', '10 speeds', 'Sanitized after use']
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    'Portable Projector — 4K HDR',
    ARRAY['https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=800&auto=format&fit=crop','https://images.unsplash.com/photo-1585503418462-160d001d7dcf?q=80&w=800&auto=format&fit=crop','https://images.unsplash.com/photo-1626379953822-baec19c3accd?q=80&w=800&auto=format&fit=crop'],
    18, 'Málaga, Centro', 'Electronics',
    'Compact 4K HDR projector with built-in speakers. Projects up to 120 inches. Great for movie nights, presentations, or watching the game with friends.',
    false, 4.6, 41,
    ARRAY['4K HDR', 'Built-in speakers', 'HDMI cable', 'Tripod included']
  ),
  (
    '00000000-0000-0000-0000-000000000008',
    'Pressure Washer — Kärcher K5',
    ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=800&auto=format&fit=crop','https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800&auto=format&fit=crop'],
    22, 'Zaragoza, La Almozara', 'Garden',
    'Powerful Kärcher K5 pressure washer. Perfect for cleaning patios, driveways, cars, and garden furniture. Comes with multiple nozzles.',
    true, 4.8, 37,
    ARRAY['Multiple nozzles', '10m hose', 'Detergent tank', 'Wheeled']
  ),
  (
    '00000000-0000-0000-0000-000000000009',
    'Stand-Up Paddleboard — Inflatable',
    ARRAY['https://images.unsplash.com/photo-1526188717906-ab4a2f949f53?q=80&w=800&auto=format&fit=crop','https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=800&auto=format&fit=crop'],
    25, 'San Sebastián', 'Sports',
    'Premium inflatable SUP board. Includes paddle, pump, and carry bag. Lightweight and easy to transport. Perfect for calm waters and coastal fun.',
    true, 4.9, 61,
    ARRAY['Paddle included', 'Pump included', 'Carry bag', 'Leash']
  );

-- ─── My Listings (Alex Developer) ──────────────────────────────────────────

INSERT INTO items (owner_id, title, images, price_per_day, location, category, description, available, rating, total_rentals, features) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Electric Scooter — Xiaomi Pro 2',
    ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=800&auto=format&fit=crop'],
    10, 'Madrid, Chamberí', 'Electronics',
    'Xiaomi Pro 2 electric scooter in great condition.',
    true, 4.8, 23,
    ARRAY['45km range', '25km/h max', 'Charger included']
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Camping Cooking Set',
    ARRAY['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=800&auto=format&fit=crop'],
    6, 'Madrid, Chamberí', 'Camping',
    'Complete camping cookware set for 4 people.',
    true, 4.7, 15,
    ARRAY['Pots & pans', 'Utensils', 'Carry bag']
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'DJI Mini 3 Pro Drone',
    ARRAY['https://images.unsplash.com/photo-1579829366248-204fe8413f31?q=80&w=800&auto=format&fit=crop'],
    30, 'Madrid, Chamberí', 'Electronics',
    'DJI Mini 3 Pro with Fly More Combo.',
    false, 5.0, 19,
    ARRAY['4K camera', '3 batteries', 'Controller']
  );
