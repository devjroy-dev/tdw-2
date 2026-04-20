-- TDW v2 Demo Seed — schema verified Apr 21 2026
-- couple UUID: 00000000-0000-0000-0000-000000000001
-- Safe to re-run

ALTER TABLE couple_events ADD COLUMN IF NOT EXISTS venue TEXT, ADD COLUMN IF NOT EXISTS task_count INT DEFAULT 0, ADD COLUMN IF NOT EXISTS vendor_count INT DEFAULT 0, ADD COLUMN IF NOT EXISTS guest_count INT DEFAULT 0;
ALTER TABLE couple_guests ADD COLUMN IF NOT EXISTS events TEXT[], ADD COLUMN IF NOT EXISTS rsvp_status TEXT DEFAULT 'pending';
CREATE TABLE IF NOT EXISTS couple_profiles (user_id UUID PRIMARY KEY, total_budget BIGINT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now());

INSERT INTO users (id, phone, name, email) VALUES ('00000000-0000-0000-0000-000000000001', '+919999999999', 'Priya Demo', 'demo@thedreamwedding.in') ON CONFLICT (id) DO NOTHING;
INSERT INTO couple_profiles (user_id, total_budget) VALUES ('00000000-0000-0000-0000-000000000001', 5000000) ON CONFLICT (user_id) DO UPDATE SET total_budget = 5000000;

INSERT INTO couple_events (id, couple_id, event_type, event_name, event_date, venue, event_city, task_count, vendor_count, guest_count) VALUES
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'mehendi',   'Mehendi',   (CURRENT_DATE + INTERVAL '35 days')::date, 'The Leela Palace, New Delhi',    'Delhi',   3, 2,  60),
  ('a1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'haldi',     'Haldi',     (CURRENT_DATE + INTERVAL '37 days')::date, 'Home — Sujan Singh Park, Delhi', 'Delhi',   2, 1,  40),
  ('a1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'sangeet',   'Sangeet',   (CURRENT_DATE + INTERVAL '40 days')::date, 'ITC Maurya Grand Ballroom',      'Delhi',   3, 3, 120),
  ('a1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'ceremony',  'Ceremony',  (CURRENT_DATE + INTERVAL '42 days')::date, 'Umaid Bhawan Palace, Jodhpur',   'Jodhpur', 2, 4, 180),
  ('a1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'reception', 'Reception', (CURRENT_DATE + INTERVAL '44 days')::date, 'The Taj Mahal Hotel, New Delhi', 'Delhi',   3, 5, 250)
ON CONFLICT (id) DO NOTHING;

INSERT INTO couple_checklist (id, couple_id, event, text, priority, is_complete, due_date) VALUES
  ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Ceremony',  'Book bridal MUA',          'high',   false, (CURRENT_DATE + INTERVAL '5 days')::date),
  ('b1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Reception', 'Confirm catering menu',    'high',   false, (CURRENT_DATE + INTERVAL '7 days')::date),
  ('b1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Sangeet',   'Send invitations',         'high',   false, (CURRENT_DATE + INTERVAL '10 days')::date),
  ('b1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Ceremony',  'Finalise lehenga fitting', 'high',   false, (CURRENT_DATE + INTERVAL '12 days')::date),
  ('b1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Sangeet',   'Book DJ for Sangeet',      'medium', true,  (CURRENT_DATE + INTERVAL '8 days')::date),
  ('b1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Reception', 'Arrange transport',        'medium', false, (CURRENT_DATE + INTERVAL '20 days')::date),
  ('b1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Mehendi',   'Confirm florals',          'medium', false, (CURRENT_DATE + INTERVAL '15 days')::date),
  ('b1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Ceremony',  'Hair trial appointment',   'low',    false, (CURRENT_DATE + INTERVAL '18 days')::date)
ON CONFLICT (id) DO NOTHING;

INSERT INTO couple_expenses (id, couple_id, event, vendor_name, description, category, actual_amount, payment_status) VALUES
  ('c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Ceremony',  'Swati Roy MUA',     'Bridal makeup + trial',       'Beauty',      150000, 'committed'),
  ('c1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Mehendi',   'Madhu Florals',     'Mehendi decor florals',       'Decor',        75000, 'committed'),
  ('c1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Sangeet',   'Beats by Karan DJ', 'Sangeet DJ full night',       'Music',        50000, 'committed'),
  ('c1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Reception', 'Regal Caterers',    'Catering advance',            'Catering',    120000, 'committed'),
  ('c1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Ceremony',  'Pixels by Arjun',   'Photography booking advance', 'Photography',  80000, 'paid'),
  ('c1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Mehendi',   'Mehendi by Priya',  'Mehendi artist booking',      'Beauty',       25000, 'paid')
ON CONFLICT (id) DO NOTHING;

INSERT INTO couple_guests (id, couple_id, name, phone, events, rsvp_status) VALUES
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Sunita Sharma',    '+919876543210', ARRAY['Mehendi','Sangeet','Ceremony','Reception'], 'confirmed'),
  ('d1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Rakesh Mehra',     '+919876543211', ARRAY['Sangeet','Ceremony','Reception'],            'confirmed'),
  ('d1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Priya Kapoor',     '+919876543212', ARRAY['Mehendi','Haldi','Sangeet'],                'confirmed'),
  ('d1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Ananya Gupta',     '+919876543213', ARRAY['Ceremony','Reception'],                     'pending'),
  ('d1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Vikram Singhania', '+919876543214', ARRAY['Sangeet','Ceremony','Reception'],            'pending'),
  ('d1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Deepa Nair',       '+919876543215', ARRAY['Mehendi','Haldi','Sangeet','Ceremony'],     'confirmed'),
  ('d1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Rohit Verma',      '+919876543216', ARRAY['Ceremony','Reception'],                     'declined'),
  ('d1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Kavita Joshi',     '+919876543217', ARRAY['Haldi','Sangeet','Ceremony','Reception'],   'pending'),
  ('d1000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Arun Bhatia',      '+919876543218', ARRAY['Sangeet','Ceremony'],                       'confirmed'),
  ('d1000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Meena Pillai',     '+919876543219', ARRAY['Mehendi','Sangeet','Reception'],             'pending')
ON CONFLICT (id) DO NOTHING;
