-- Session 11 — Photo approvals categorization
-- Adds 'category' column so admin Photos folder can show separate queues for:
-- carousel, spotlight, style_file, look_book, this_weeks_pricing
-- (Hero is auto-approved, no admin queue needed for it)

ALTER TABLE photo_approvals
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS image_id UUID;

-- Backfill any existing rows to default 'carousel' if uncategorized
UPDATE photo_approvals SET category = 'carousel' WHERE category IS NULL;

-- Index for quick admin queue queries
CREATE INDEX IF NOT EXISTS idx_photo_approvals_category_status
  ON photo_approvals (category, status);

-- featured_boards table (in case it doesn't exist) + extra columns
CREATE TABLE IF NOT EXISTS featured_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID,
  board TEXT NOT NULL,
  image_url TEXT,
  image_id UUID,
  title TEXT,
  description TEXT,
  promo_text TEXT,
  promo_price TEXT,
  category TEXT,
  city TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE featured_boards
  ADD COLUMN IF NOT EXISTS image_id UUID,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_featured_boards_board
  ON featured_boards (board);

NOTIFY pgrst, 'reload schema';

