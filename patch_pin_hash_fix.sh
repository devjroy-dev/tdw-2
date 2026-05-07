#!/bin/bash
# patch_pin_hash_fix.sh
# Fixes pin-status and verify-pin to use pin_hash instead of password_hash
# Adds missing set-pin endpoint
# Run from: /workspaces/tdw-2

set -e
FILE="backend/server.js"

echo "=== SAFETY CHECKS ==="
if [ ! -f "$FILE" ]; then echo "ERROR: $FILE not found."; exit 1; fi
EXPRESS_COUNT=$(grep -c "const express" "$FILE" || true)
echo "express count: $EXPRESS_COUNT (expected 1)"
if [ "$EXPRESS_COUNT" -ne 1 ]; then echo "ERROR: express count wrong."; exit 1; fi
if grep -q "v2/auth/set-pin" "$FILE"; then echo "ERROR: set-pin already exists."; exit 1; fi
echo "Checks passed."

python3 << 'PYEOF'
content = open('backend/server.js', 'r').read()

# Fix 1: pin-status — replace password_hash with pin_hash in the endpoint
old_pin_status = """app.get('/api/v2/auth/pin-status', async (req, res) => {
  try {
    const { phone, role } = req.query;
    if (!phone) return res.status(400).json({ found: false, pin_set: false, userId: null });

    const bare = ('' + phone).replace(/\\D/g, '').slice(-10);

    if (role === 'vendor') {
      // Vendors: phone stored as bare 10-digit in vendors table
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id, password_hash, name')
        .eq('phone', bare)
        .maybeSingle();

      if (!vendor) return res.json({ found: false, pin_set: false, userId: null });

      return res.json({
        found: true,
        userId: vendor.id,
        pin_set: !!vendor.password_hash,
        name: vendor.name || null,
      });
    }

    // Couples: phone stored as +91XXXXXXXXXX in users table
    const fullPhone = '+91' + bare;
    const { data: user } = await supabase
      .from('users')
      .select('id, password_hash, name, couple_tier')
      .eq('phone', fullPhone)
      .maybeSingle();

    if (!user) return res.json({ found: false, pin_set: false, userId: null });

    return res.json({
      found: true,
      userId: user.id,
      pin_set: !!user.password_hash,
      name: user.name || null,
      couple_tier: user.couple_tier || 'lite',
    });

  } catch (error) {
    console.error('[pin-status] error:', error.message);
    res.status(500).json({ found: false, pin_set: false, userId: null });
  }
});"""

new_pin_status = """app.get('/api/v2/auth/pin-status', async (req, res) => {
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
  } catch (error) {
    console.error('[pin-status] error:', error.message);
    res.status(500).json({ found: false, pin_set: false, userId: null });
  }
});"""

# Fix 2: verify-pin — replace password_hash with pin_hash
old_verify_pin = """app.post('/api/v2/auth/verify-pin', async (req, res) => {
  try {
    const { userId, pin, role, phone } = req.body;
    if (!pin) return res.status(400).json({ success: false, error: 'PIN required' });

    if (role === 'vendor') {
      // Look up by userId or phone
      let vendor = null;
      if (userId) {
        const { data } = await supabase.from('vendors').select('id, password_hash, name, vendor_tier').eq('id', userId).maybeSingle();
        vendor = data;
      }
      if (!vendor && phone) {
        const bare = ('' + phone).replace(/\\D/g, '').slice(-10);
        const { data } = await supabase.from('vendors').select('id, password_hash, name, vendor_tier').eq('phone', bare).maybeSingle();
        vendor = data;
      }
      if (!vendor || !vendor.password_hash) return res.json({ success: false, error: 'Account not found' });

      const match = await require('bcryptjs').compare(pin, vendor.password_hash);
      if (!match) return res.json({ success: false, error: 'Incorrect PIN' });

      // Get subscription tier
      const { data: sub } = await supabase
        .from('vendor_subscriptions')
        .select('tier')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return res.json({
        success: true,
        userId: vendor.id,
        name: vendor.name || null,
        vendor_tier: sub?.tier || vendor.vendor_tier || 'essential',
      });
    }

    // Couple
    let user = null;
    if (userId) {
      const { data } = await supabase.from('users').select('id, password_hash, name, couple_tier').eq('id', userId).maybeSingle();
      user = data;
    }
    if (!user && phone) {
      const bare = ('' + phone).replace(/\\D/g, '').slice(-10);
      const fullPhone = '+91' + bare;
      const { data } = await supabase.from('users').select('id, password_hash, name, couple_tier').eq('phone', fullPhone).maybeSingle();
      user = data;
    }
    if (!user || !user.password_hash) return res.json({ success: false, error: 'Account not found' });

    const match = await require('bcryptjs').compare(pin, user.password_hash);
    if (!match) return res.json({ success: false, error: 'Incorrect PIN' });

    return res.json({
      success: true,
      userId: user.id,
      name: user.name || null,
      couple_tier: user.couple_tier || 'lite',
      dreamer_type: user.couple_tier || 'lite',
    });

  } catch (error) {
    console.error('[verify-pin] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});"""

new_verify_pin = """app.post('/api/v2/auth/verify-pin', async (req, res) => {
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
  } catch (error) {
    console.error('[verify-pin] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v2/auth/set-pin — first-time PIN creation after OTP
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
  } catch (error) {
    console.error('[set-pin] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});"""

if old_pin_status not in content:
    print("ERROR: Could not find existing pin-status body to replace.")
    exit(1)
if old_verify_pin not in content:
    print("ERROR: Could not find existing verify-pin body to replace.")
    exit(1)

content = content.replace(old_pin_status, new_pin_status, 1)
content = content.replace(old_verify_pin, new_verify_pin, 1)
open('backend/server.js', 'w').write(content)
print("All patches applied.")
PYEOF

echo ""
echo "=== VERIFICATION ==="
echo "pin_hash references in pin auth endpoints:"
grep -n "pin_hash" "$FILE" | grep -v "moodboard\|trending\|ds/messages"
echo ""
echo "All three endpoints:"
grep -n "v2/auth/pin-status\|v2/auth/set-pin\|v2/auth/verify-pin" "$FILE"
echo ""
echo "=== DONE ==="
echo "Run:"
echo "  git add backend/server.js"
echo "  git commit -m 'fix: pin auth endpoints use pin_hash; add set-pin'"
echo "  git push"
echo ""
echo "After Railway deploys, test:"
echo "  curl 'https://dream-wedding-production-89ae.up.railway.app/api/v2/auth/pin-status?phone=8757788550&role=couple'"
