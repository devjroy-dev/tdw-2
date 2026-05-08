# ZIP 7 — Backend wiring for Discover Heroes

The native and admin sides are done in this ZIP. **You need to add five things to
the `dream-wedding` (Railway/Express) repo and one Supabase migration.** No SQL
or routes from this ZIP touch the backend automatically.

This is a stable, additive change — nothing existing breaks if you skip it.
The native app simply shows the empty state ("Discover, momentarily.") until
the route exists and at least one hero is `is_active = true`.

---

## 1. Supabase migration — new table

Run this in the Supabase SQL editor on project `nqcdfzbvlrcrjineoudp`:

```sql
CREATE TABLE IF NOT EXISTS discover_heroes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  display_order int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  caption text,
  vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discover_heroes_active_order
  ON discover_heroes (is_active, display_order);
```

Notes:
- `vendor_id` is nullable so you can run editorial heroes that are not tied to
  a paid placement. Add a paid-placement field later if/when you want to track it.
- 5 rows max in the admin UI (enforced client-side, not in SQL — the table can
  store more, but the admin "Add hero" button hides at 5).

---

## 2. Supabase Storage — bucket

Heroes upload to the existing `cover-photos` bucket (already public, working).
**No new bucket needed.** The upload route below points at `cover-photos/heroes/`
as a folder convention.

If you'd rather isolate the uploads in a `discover-heroes` bucket, create it
in the Supabase dashboard with **Public bucket: ON** and update the upload
route accordingly. Either way works.

---

## 3. Backend routes — paste into `dream-wedding/server.js`

Convention matches the existing cover-photos and exploring-photos endpoints.
Admin write routes require the `x-admin-password` header (`Mira@2551354`); the
public read route is unauthenticated.

```javascript
// ─── Discover Heroes ─────────────────────────────────────────────────────────

// GET /api/v2/discover-heroes — public read (used by Frost native canvas)
app.get('/api/v2/discover-heroes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('discover_heroes')
      .select('id, image_url, display_order, caption, vendor_id, is_active, created_at')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(5);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[discover-heroes] GET error:', err);
    res.status(500).json({ success: false, error: err.message, data: [] });
  }
});

// GET /api/v2/admin/discover-heroes — admin read (sees inactive ones too)
app.get('/api/v2/admin/discover-heroes', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('discover_heroes')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v2/admin/discover-heroes — create
app.post('/api/v2/admin/discover-heroes', requireAdmin, async (req, res) => {
  try {
    const { image_url, display_order, caption, vendor_id, is_active } = req.body;
    if (!image_url) return res.status(400).json({ success: false, error: 'image_url required' });
    const { data, error } = await supabase
      .from('discover_heroes')
      .insert({
        image_url,
        display_order: display_order || 1,
        caption: caption || null,
        vendor_id: vendor_id || null,
        is_active: is_active !== false,
      })
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v2/admin/discover-heroes/:id — update fields (caption, order, active, image_url)
app.put('/api/v2/admin/discover-heroes/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    const allowed = ['image_url', 'display_order', 'caption', 'vendor_id', 'is_active'];
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('discover_heroes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v2/admin/discover-heroes/:id
app.delete('/api/v2/admin/discover-heroes/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('discover_heroes').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v2/admin/discover-heroes/upload — multipart upload to Supabase Storage
// Mirrors the existing cover-photos upload handler — same multer + Supabase pattern.
app.post(
  '/api/v2/admin/discover-heroes/upload',
  requireAdmin,
  upload.single('file'),  // assumes existing multer middleware is named `upload`
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No file' });
      const fileName = `heroes/hero_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('cover-photos')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype || 'image/jpeg',
          cacheControl: '31536000',
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from('cover-photos').getPublicUrl(fileName);
      res.json({ success: true, url: pub.publicUrl });
    } catch (err) {
      console.error('[discover-heroes upload] error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);
```

### `requireAdmin` middleware

If your codebase already has an admin auth middleware (e.g. used by
`/api/v2/admin/cover-photos`), reuse that. The shape is:

```javascript
function requireAdmin(req, res, next) {
  const pwd = req.header('x-admin-password');
  if (pwd !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: 'unauthorized' });
  }
  next();
}
```

---

## 4. Verification

After deploying:

```bash
# Public read (should return 200, empty array if no heroes yet)
curl https://dream-wedding-production-89ae.up.railway.app/api/v2/discover-heroes

# Admin read (should return 200 with admin password)
curl -H "x-admin-password: Mira@2551354" \
  https://dream-wedding-production-89ae.up.railway.app/api/v2/admin/discover-heroes
```

Then go to `vendor.thedreamwedding.in/admin/discover-heroes`, upload 1–5 heroes,
mark active, save order. Open the Frost native canvas → tap Discover. Should
show your heroes crossfading every ~6 seconds. With 0 heroes → empty state
("Discover, momentarily.").

---

## 5. What this ZIP does NOT do

- **No fallback to hardcoded Unsplash placeholders.** Per spec, native shows
  the empty state until admin populates. The `DiscoverHeroes` constant in
  `constants/frost.ts` is no longer imported anywhere; you can delete it
  later if you want, but it's harmless dead code for now.
- **No auto-sync of paid placement billing.** When you add `is_paid` /
  `amount_paid` columns later (matching cover_photos), wire them through the
  `allowed` array in the PUT route and add the corresponding fields in
  `addForm` / `update` calls in the admin page.
- **No analytics on hero impressions/clicks.** If you want this, add an
  `impressions` int column and a POST `/api/v2/discover-heroes/:id/impression`
  fire-and-forget endpoint.
