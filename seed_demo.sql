-- TDW v2 Session 10 Demo Seed
-- Demo couple UUID: 00000000-0000-0000-0000-000000000001
-- Safe to re-run — all inserts use ON CONFLICT DO NOTHING

-- ─── Events ─────────────────────────────────────────────────────────────────
INSERT INTO events (id, couple_id, name, date, venue, task_count, vendor_count, guest_count)
VALUES
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Mehendi',  (CURRENT_DATE + INTERVAL '35 days')::date,  'The Leela Palace, New Delhi',       3, 2,  60),
  ('a1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Haldi',    (CURRENT_DATE + INTERVAL '37 days')::date,  'Home — Sujan Singh Park, Delhi',     2, 1,  40),
  ('a1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Sangeet',  (CURRENT_DATE + INTERVAL '40 days')::date,  'ITC Maurya Grand Ballroom',          3, 3, 120),
  ('a1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Ceremony', (CURRENT_DATE + INTERVAL '42 days')::date,  'Umaid Bhawan Palace, Jodhpur',       2, 4, 180),
  ('a1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Reception',(CURRENT_DATE + INTERVAL '44 days')::date,  'The Taj Mahal Hotel, New Delhi',     3, 5, 250)
ON CONFLICT DO NOTHING;

-- ─── Tasks ───────────────────────────────────────────────────────────────────
INSERT INTO couple_tasks (id, couple_id, title, event_name, due_date, status, priority)
VALUES
  ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Book bridal MUA',           'Ceremony',  (CURRENT_DATE + INTERVAL '5 days')::date,  'pending',     'high'),
  ('b1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Confirm catering menu',     'Reception', (CURRENT_DATE + INTERVAL '7 days')::date,  'in_progress', 'high'),
  ('b1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Send invitations',          'Sangeet',   (CURRENT_DATE + INTERVAL '10 days')::date, 'pending',     'high'),
  ('b1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Finalise lehenga fitting',  'Ceremony',  (CURRENT_DATE + INTERVAL '12 days')::date, 'pending',     'high'),
  ('b1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Book DJ for Sangeet',       'Sangeet',   (CURRENT_DATE + INTERVAL '8 days')::date,  'done',        'medium'),
  ('b1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Arrange transport',         'Reception', (CURRENT_DATE + INTERVAL '20 days')::date, 'pending',     'medium'),
  ('b1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Confirm florals',           'Mehendi',   (CURRENT_DATE + INTERVAL '15 days')::date, 'in_progress', 'medium'),
  ('b1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Hair trial appointment',    'Ceremony',  (CURRENT_DATE + INTERVAL '18 days')::date, 'pending',     'low')
ON CONFLICT DO NOTHING;

-- ─── Expenses ────────────────────────────────────────────────────────────────
INSERT INTO expenses (id, couple_id, amount, status, due_date, vendor_name, purpose, event_name)
VALUES
  ('c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 150000, 'committed', (CURRENT_DATE + INTERVAL '3 days')::date,  'Swati Roy MUA',          'Bridal makeup + trial',      'Ceremony'),
  ('c1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',  75000, 'committed', (CURRENT_DATE + INTERVAL '5 days')::date,  'Madhu Florals',          'Mehendi decor florals',      'Mehendi'),
  ('c1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',  50000, 'committed', (CURRENT_DATE + INTERVAL '22 days')::date, 'Beats by Karan DJ',      'Sangeet DJ full night',      'Sangeet'),
  ('c1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 120000, 'committed', (CURRENT_DATE + INTERVAL '28 days')::date, 'Regal Caterers',         'Catering advance',           'Reception'),
  ('c1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',  80000, 'paid',      (CURRENT_DATE - INTERVAL '10 days')::date, 'Pixels by Arjun',        'Photography booking advance','Ceremony'),
  ('c1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001',  25000, 'paid',      (CURRENT_DATE - INTERVAL '5 days')::date,  'Mehendi by Priya',       'Mehendi artist booking',     'Mehendi')
ON CONFLICT DO NOTHING;

-- ─── Budget ───────────────────────────────────────────────────────────────────
UPDATE couple_profiles
SET total_budget = 5000000
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- ─── Guests ──────────────────────────────────────────────────────────────────
INSERT INTO guests (id, couple_id, name, phone, events, rsvp_status)
VALUES
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Sunita Sharma',    '+919876543210', ARRAY['Mehendi','Sangeet','Ceremony','Reception'], 'confirmed'),
  ('d1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Rakesh Mehra',     '+919876543211', ARRAY['Sangeet','Ceremony','Reception'],           'confirmed'),
  ('d1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Priya Kapoor',     '+919876543212', ARRAY['Mehendi','Haldi','Sangeet'],               'confirmed'),
  ('d1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Ananya Gupta',     '+919876543213', ARRAY['Ceremony','Reception'],                    'pending'),
  ('d1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Vikram Singhania', '+919876543214', ARRAY['Sangeet','Ceremony','Reception'],           'pending'),
  ('d1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Deepa Nair',       '+919876543215', ARRAY['Mehendi','Haldi','Sangeet','Ceremony'],    'confirmed'),
  ('d1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Rohit Verma',      '+919876543216', ARRAY['Ceremony','Reception'],                    'declined'),
  ('d1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Kavita Joshi',     '+919876543217', ARRAY['Haldi','Sangeet','Ceremony','Reception'],  'pending'),
  ('d1000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Arun Bhatia',      '+919876543218', ARRAY['Sangeet','Ceremony'],                      'confirmed'),
  ('d1000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Meena Pillai',     '+919876543219', ARRAY['Mehendi','Sangeet','Reception'],            'pending')
ON CONFLICT DO NOTHING;
