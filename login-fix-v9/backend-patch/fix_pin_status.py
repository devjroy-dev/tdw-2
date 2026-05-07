#!/usr/bin/env python3
"""
V9 Login Fix — backend patch
Fixes pin-status and verify-pin handlers in dream-wedding/backend/server.js

Run from /workspaces/dream-wedding:
  python3 fix_pin_status.py

Makes a backup at backend/server.js.bak before patching.
"""

import re
import shutil
import sys

SERVERJS = 'backend/server.js'
BACKUP   = 'backend/server.js.bak'

OLD_PIN_STATUS = '''// V9 restore: pin-status endpoint
app.get('/api/v2/auth/pin-status', async (req, res) => {
  try {
    let { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    if (!phone.startsWith('+')) phone = '+91' + phone.replace(/^0+/, '');
    const { data, error } = await supabase
      .from('users')
      .select('id, pin_hash')
      .eq('phone', phone)
      .single();
    if (error || !data) return res.json({ exists: false, hasPin: false });
    return res.json({ exists: true, hasPin: !!data.pin_hash });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});'''

NEW_PIN_STATUS = '''// V9 login fix: pin-status endpoint — role-aware, correct column names, correct phone normalisation
app.get('/api/v2/auth/pin-status', async (req, res) => {
  try {
    const { role } = req.query;
    let { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Phone required' });

    if (role === 'vendor') {
      // Vendors store phone as bare 10-digit number (no +91 prefix)
      const barePhone = phone.replace(/\\D/g, '').slice(-10);
      const { data, error } = await supabase
        .from('vendors')
        .select('id, pin_hash, password_hash')
        .eq('phone', barePhone)
        .maybeSingle();
      if (error || !data) return res.json({ exists: false, hasPin: false });
      return res.json({ exists: true, hasPin: !!(data.pin_hash || data.password_hash) });
    } else {
      // Couples store phone as +91XXXXXXXXXX
      const normalised = '+91' + phone.replace(/\\D/g, '').slice(-10);
      const { data, error } = await supabase
        .from('users')
        .select('id, pin_hash, password_hash')
        .eq('phone', normalised)
        .maybeSingle();
      if (error || !data) return res.json({ exists: false, hasPin: false });
      return res.json({ exists: true, hasPin: !!(data.pin_hash || data.password_hash) });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});'''

OLD_VERIFY_PIN = '''    const cleanPhone = '+91' + phone.replace(/\\D/g, '').replace(/^\\+?91/, '');
    const table = role === 'vendor' ? 'vendors' : 'users';
    const { data, error } = await supabase
      .from(table)
      .select('id, password_hash, couple_tier, name')
      .eq('phone', cleanPhone)
      .maybeSingle();'''

NEW_VERIFY_PIN = '''    // Couples: +91XXXXXXXXXX — Vendors: bare 10-digit number
    const table = role === 'vendor' ? 'vendors' : 'users';
    const cleanPhone = role === 'vendor'
      ? phone.replace(/\\D/g, '').slice(-10)
      : '+91' + phone.replace(/\\D/g, '').slice(-10);
    const { data, error } = await supabase
      .from(table)
      .select('id, password_hash, pin_hash, couple_tier, name')
      .eq('phone', cleanPhone)
      .maybeSingle();'''

def patch(path, old, new, label):
    with open(path, 'r') as f:
        src = f.read()
    if old not in src:
        print(f'ERROR: Could not find {label} — aborting. File may have changed.')
        sys.exit(1)
    count = src.count(old)
    if count > 1:
        print(f'ERROR: {label} appears {count} times — aborting. Must appear exactly once.')
        sys.exit(1)
    patched = src.replace(old, new)
    with open(path, 'w') as f:
        f.write(patched)
    print(f'OK: {label} patched.')

# Backup first
shutil.copy(SERVERJS, BACKUP)
print(f'Backup written to {BACKUP}')

# Apply patches
patch(SERVERJS, OLD_PIN_STATUS, NEW_PIN_STATUS, 'pin-status handler')
patch(SERVERJS, OLD_VERIFY_PIN, NEW_VERIFY_PIN, 'verify-pin phone normalisation')

print('Done. Verify with:')
print('  grep -n "pin-status\\|verify-pin" backend/server.js')
print('Then deploy: git add backend/server.js && git commit -m "fix: pin-status role-aware + verify-pin vendor phone normalisation" && git push origin main')
print('Then curl both accounts and check Railway logs before declaring success.')
