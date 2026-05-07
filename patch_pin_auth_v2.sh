#!/bin/bash
# patch_pin_auth.sh — v2
# Adds three PIN auth endpoints using pin_hash (NOT password_hash)
# GET  /api/v2/auth/pin-status
# POST /api/v2/auth/set-pin
# POST /api/v2/auth/verify-pin
# Run from: /workspaces/tdw-2

set -e
FILE="backend/server.js"

echo "=== SAFETY CHECKS ==="
if [ ! -f "$FILE" ]; then echo "ERROR: $FILE not found."; exit 1; fi
EXPRESS_COUNT=$(grep -c "const express" "$FILE" || true)
echo "express count: $EXPRESS_COUNT (expected 1)"
if [ "$EXPRESS_COUNT" -ne 1 ]; then echo "ERROR: express count wrong."; exit 1; fi
if grep -q "v2/auth/pin-status" "$FILE"; then echo "ERROR: pin-status already exists."; exit 1; fi
if grep -q "v2/auth/set-pin" "$FILE"; then echo "ERROR: set-pin already exists."; exit 1; fi
if grep -q "v2/auth/verify-pin" "$FILE"; then echo "ERROR: verify-pin already exists."; exit 1; fi
if ! grep -q "require.*bcrypt" "$FILE"; then echo "ERROR: bcrypt not found."; exit 1; fi
echo "All checks passed."

python3 << 'PYEOF'
content = open('backend/server.js', 'r').read()
marker = '// ==================\n// PUSH NOTIFICATIONS'
if marker not in content:
    print("ERROR: Marker not found.")
    exit(1)

endpoints = '''
// ─── PIN AUTH — native app + PWA ─────────────────────────────────────────────
// Uses pin_hash column. password_hash is legacy, untouched.
// Couples: users table, phone = +91XXXXXXXXXX
// Vendors: vendors table, phone = bare 10-digit

// GET /api/v2/auth/pin-status?phone=&role=
app.get('/api/v2/auth/pin-status', async (req, res) => {
  try {
    const { phone, role } = req.query;
    if (!phone) return res.status(400).json({ found: false, pin_set: false, userId: null });
    const bare = ('' + phone).replace(/\\D/g, '').slice(-10);
    if (role === 'vendor') {
      const { data: vendor } = await supabase.from('vendors').select('id, pin_hash, name').eq('phone', bare).maybeSingle();
      if (!vendor) return res.json({ found: false, pin_set: false, userId: null });
      return res.json({ found: true, userId: vendor.id, pin_set: !!vendor.pin_hash, name: vendor.name || null });
    }
    const { data: user } = await supabase.from('users').select('id, pin_hash, name, couple_tier').eq('phone', '+91' + bare).maybeSingle();
    if (!user) return res.json({ found: false, pin_set: false, userId: null });
    return res.json({ found: true, userId: user.id, pin_set: !!user.pin_hash, name: user.name || null, couple_tier: user.couple_tier || 'lite' });
  } catch (e) { console.error('[pin-status]', e.message); res.status(500).json({ found: false, pin_set: false, userId: null }); }
});

// POST /api/v2/auth/set-pin — first-time PIN creation
// Body: { userId, pin, role, phone }
app.post('/api/v2/auth/set-pin', async (req, res) => {
  try {
    const { userId, pin, role, phone } = req.body;
    if (!pin || !/^\\d{4}$/.test(pin)) return res.status(400).json({ success: false, error: 'PIN must be 4 digits' });
    const pinHash = await bcrypt.hash(pin, 10);
    if (role === 'vendor') {
      let vid = userId;
      if (!vid && phone) { const bare = ('' + phone).replace(/\\D/g, '').slice(-10); const { data } = await supabase.from('vendors').select('id').eq('phone', bare).maybeSingle(); vid = data?.id; }
      if (!vid) return res.status(404).json({ success: false, error: 'Vendor not found' });
      const { error } = await supabase.from('vendors').update({ pin_hash: pinHash }).eq('id', vid);
      if (error) throw error;
      return res.json({ success: true });
    }
    let uid = userId;
    if (!uid && phone) { const bare = ('' + phone).replace(/\\D/g, '').slice(-10); const { data } = await supabase.from('users').select('id').eq('phone', '+91' + bare).maybeSingle(); uid = data?.id; }
    if (!uid) return res.status(404).json({ success: false, error: 'User not found' });
    const { error } = await supabase.from('users').update({ pin_hash: pinHash }).eq('id', uid);
    if (error) throw error;
    return res.json({ success: true });
  } catch (e) { console.error('[set-pin]', e.message); res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/v2/auth/verify-pin — PIN login
// Body: { userId, pin, role, phone }
app.post('/api/v2/auth/verify-pin', async (req, res) => {
  try {
    const { userId, pin, role, phone } = req.body;
    if (!pin) return res.status(400).json({ success: false, error: 'PIN required' });
    if (role === 'vendor') {
      let vendor = null;
      if (userId) { const { data } = await supabase.from('vendors').select('id, pin_hash, name').eq('id', userId).maybeSingle(); vendor = data; }
      if (!vendor && phone) { const bare = ('' + phone).replace(/\\D/g, '').slice(-10); const { data } = await supabase.from('vendors').select('id, pin_hash, name').eq('phone', bare).maybeSingle(); vendor = data; }
      if (!vendor || !vendor.pin_hash) return res.json({ success: false, error: 'Account not found' });
      const match = await bcrypt.compare(pin, vendor.pin_hash);
      if (!match) return res.json({ success: false, error: 'Incorrect PIN' });
      const { data: sub } = await supabase.from('vendor_subscriptions').select('tier').eq('vendor_id', vendor.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      return res.json({ success: true, userId: vendor.id, name: vendor.name || null, vendor_tier: sub?.tier || 'essential' });
    }
    let user = null;
    if (userId) { const { data } = await supabase.from('users').select('id, pin_hash, name, couple_tier').eq('id', userId).maybeSingle(); user = data; }
    if (!user && phone) { const bare = ('' + phone).replace(/\\D/g, '').slice(-10); const { data } = await supabase.from('users').select('id, pin_hash, name, couple_tier').eq('phone', '+91' + bare).maybeSingle(); user = data; }
    if (!user || !user.pin_hash) return res.json({ success: false, error: 'Account not found' });
    const match = await bcrypt.compare(pin, user.pin_hash);
    if (!match) return res.json({ success: false, error: 'Incorrect PIN' });
    return res.json({ success: true, userId: user.id, name: user.name || null, couple_tier: user.couple_tier || 'lite', dreamer_type: user.couple_tier || 'lite' });
  } catch (e) { console.error('[verify-pin]', e.message); res.status(500).json({ success: false, error: e.message }); }
});

'''

patched = content.replace(marker, endpoints + marker, 1)
open('backend/server.js', 'w').write(patched)
print("Patch applied.")
PYEOF

echo ""
echo "=== VERIFICATION ==="
grep -n "v2/auth/pin-status\|v2/auth/set-pin\|v2/auth/verify-pin" "$FILE"
echo ""
echo "=== DONE ==="
echo "Run:"
echo "  git add backend/server.js"
echo "  git commit -m 'feat: add pin-status, set-pin, verify-pin — pin_hash based auth'"
echo "  git push"
echo ""
echo "After Railway deploys (~30s), test:"
echo "  curl 'https://dream-wedding-production-89ae.up.railway.app/api/v2/auth/pin-status?phone=8757788550&role=couple'"
