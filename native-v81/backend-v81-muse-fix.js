// ══════════════════════════════════════════════════════════════════════════════
// V8.1 BACKEND FIX — Muse endpoint includes all saves (not just vendor saves)
// Replace the existing GET /api/couple/muse/:couple_id handler in backend/server.js
// The current handler filters with .not('vendor_id', 'is', null) which excludes
// camera captures and image-only saves. Remove that filter.
// ══════════════════════════════════════════════════════════════════════════════

// FIND this block in backend/server.js (around line 8981):
//   app.get('/api/couple/muse/:couple_id', async (req, res) => {
//     ...
//     const { data: saves } = await supabase.from('moodboard_items')
//       .select('*').eq('user_id', couple_id).not('vendor_id', 'is', null)   <-- REMOVE THIS FILTER
//       .order('created_at', { ascending: false });
//     ...
//   });
//
// REPLACE the entire handler with this:

app.get('/api/couple/muse/:couple_id', async (req, res) => {
  try {
    const { couple_id } = req.params;
    if (!couple_id) return res.status(400).json({ success: false, error: 'couple_id required' });

    // Fetch ALL muse saves — vendor saves AND image/camera saves
    const { data: saves } = await supabase.from('moodboard_items')
      .select('*')
      .eq('user_id', couple_id)
      .order('created_at', { ascending: false });

    // Enrich vendor saves with vendor data
    const vendorIds = [...new Set((saves || []).map(s => s.vendor_id).filter(Boolean))];
    let vendorMap = {};
    if (vendorIds.length > 0) {
      const { data: vendors } = await supabase.from('vendors')
        .select('id, name, category, city, portfolio_images, featured_photos, starting_price, rating')
        .in('id', vendorIds);
      (vendors || []).forEach(v => { vendorMap[v.id] = v; });
    }

    const enriched = (saves || []).map(s => ({
      ...s,
      vendor: s.vendor_id ? (vendorMap[s.vendor_id] || null) : null,
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
