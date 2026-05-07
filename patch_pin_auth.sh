#!/bin/bash
# patch_pin_auth.sh
# Adds two missing endpoints to backend/server.js:
#
# 1. GET /api/v2/auth/pin-status?phone=&role=
#    PWA + native sign-in flow: phone → check account → go to PIN
#    Returns: { userId, found, pin_set }
#
# 2. POST /api/v2/auth/verify-pin
#    PIN screen calls this to verify entered PIN
#    Body: { userId, pin, role, phone }
#    Returns: { success, userId, name, couple_tier }
#
# Schema:
#   Couples: users table, phone = +91XXXXXXXXXX, PIN = password_hash (bcrypt)
#   Vendors: vendors table, phone = bare 10-digit, PIN = password_hash (bcrypt)
#
# Run from: /workspaces/tdw-2

set -e

FILE="backend/server.js"

echo "=== SAFETY CHECKS ==="

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found. Are you in /workspaces/tdw-2?"
  exit 1
fi

EXPRESS_COUNT=$(grep -c "const express" "$FILE" || true)
echo "express declarations: $EXPRESS_COUNT (expected 1)"
if [ "$EXPRESS_COUNT" -ne 1 ]; then
  echo "ERROR: Unexpected express count. Aborting."
  exit 1
fi

if grep -q "v2/auth/pin-status" "$FILE"; then
  echo "ERROR: /api/v2/auth/pin-status already exists. Aborting."
  exit 1
fi

if grep -q "v2/auth/verify-pin" "$FILE"; then
  echo "ERROR: /api/v2/auth/verify-pin already exists. Aborting."
  exit 1
fi

# Confirm bcrypt is available
if ! grep -q "require.*bcrypt" "$FILE"; then
  echo "ERROR: bcrypt not found in server.js. Aborting."
  exit 1
fi

echo "Safety checks passed."
echo ""
echo "=== APPLYING PATCH ==="

python3 << 'PYEOF'
content = open('backend/server.js', 'r').read()

# Insert before PUSH NOTIFICATIONS section
marker = '// ==================\n// PUSH NOTIFICATIONS'
if marker not in content:
    # Try alternate marker
    marker = '// PUSH NOTIFICATIONS'
    if marker not in content:
        print("ERROR: Could not find insertion marker in server.js")
        exit(1)

new_endpoints = '''
// ─── GET /api/v2/auth/pin-status ─────────────────────────────────────────────
// Sign-in flow step 1: check if phone has an account and PIN set
// Query: phone (10-digit bare), role (couple|vendor)
// Returns: { userId, found, pin_set }
app.get('/api/v2/auth/pin-status', async (req, res) => {
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
});

// ─── POST /api/v2/auth/verify-pin ────────────────────────────────────────────
// Sign-in flow step 2: verify the PIN entered on the PIN screen
// Body: { userId, pin, role, phone }
// Returns: { success, userId, name, couple_tier }
app.post('/api/v2/auth/verify-pin', async (req, res) => {
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
});

'''

patched = content.replace(marker, new_endpoints + marker, 1)
open('backend/server.js', 'w').write(patched)
print("Patch applied successfully.")
PYEOF

echo ""
echo "=== VERIFICATION ==="
echo "--- pin-status ---"
grep -n "v2/auth/pin-status" "$FILE"
echo "--- verify-pin ---"
grep -n "v2/auth/verify-pin" "$FILE"
echo ""
echo "=== DONE ==="
echo "Next steps:"
echo "  git add backend/server.js"
echo "  git commit -m 'feat: add pin-status and verify-pin endpoints — native sign-in flow'"
echo "  git push"
echo ""
echo "Railway will auto-deploy on push. Watch Railway logs after deploy."
echo "Test with:"
echo "  curl 'https://dream-wedding-production-89ae.up.railway.app/api/v2/auth/pin-status?phone=8757788550&role=couple'"
