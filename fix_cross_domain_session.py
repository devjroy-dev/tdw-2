"""
FIX — Cross-domain session passing
Repo: tdw-2

THE ROOT CAUSE:
thedreamwedding.in and app.thedreamwedding.in are different domains.
localStorage is NOT shared between them.

When handleSignIn on thedreamwedding.in writes session to localStorage
and then does window.location.href to app.thedreamwedding.in/vendor/pin-login,
the pin-login page reads EMPTY localStorage and redirects back to /.

Fix: pass session data as URL params in the redirect.
pin-login and pin pages read from URL params first, write to localStorage,
then proceed normally.

Run from: /workspaces/tdw-2
Command:  python3 fix_cross_domain_session.py
"""

import re

with open('web/app/page.tsx', 'r') as f:
    src = f.read()

changes = []

# Fix handleSignIn — pass session as URL params
OLD_REDIRECT = """        window.location.href = isVendor
          ? 'https://app.thedreamwedding.in/vendor/pin-login'
          : 'https://app.thedreamwedding.in/couple/pin-login';"""

NEW_REDIRECT = """        const params = new URLSearchParams({
          uid: sd.id,
          phone: bare,
          pin_set: 'true',
        });
        window.location.href = isVendor
          ? 'https://app.thedreamwedding.in/vendor/pin-login?' + params.toString()
          : 'https://app.thedreamwedding.in/couple/pin-login?' + params.toString();"""

if OLD_REDIRECT in src:
    src = src.replace(OLD_REDIRECT, NEW_REDIRECT)
    changes.append('✓ handleSignIn: session passed via URL params to app domain')
else:
    changes.append('✗ handleSignIn redirect pattern not found')

# Fix verifyOtp — also pass session as URL params for new user PIN setup
OLD_VERIFY_REDIRECT = """      window.location.href = pinSet
        ? (isVendor ? 'https://app.thedreamwedding.in/vendor/pin-login' : 'https://app.thedreamwedding.in/couple/pin-login')
        : (isVendor ? 'https://app.thedreamwedding.in/vendor/pin' : 'https://app.thedreamwedding.in/couple/pin');"""

NEW_VERIFY_REDIRECT = """      const qp = new URLSearchParams({
        uid: record.id,
        phone: bare,
        pin_set: String(pinSet),
        name: record.name || '',
        category: record.category || '',
      });
      window.location.href = pinSet
        ? (isVendor ? 'https://app.thedreamwedding.in/vendor/pin-login?' + qp : 'https://app.thedreamwedding.in/couple/pin-login?' + qp)
        : (isVendor ? 'https://app.thedreamwedding.in/vendor/pin?' + qp : 'https://app.thedreamwedding.in/couple/pin?' + qp);"""

if OLD_VERIFY_REDIRECT in src:
    src = src.replace(OLD_VERIFY_REDIRECT, NEW_VERIFY_REDIRECT)
    changes.append('✓ verifyOtp: session passed via URL params')
else:
    changes.append('✗ verifyOtp redirect pattern not found')

with open('web/app/page.tsx', 'w') as f:
    f.write(src)

print('\nCross-domain session fix — page.tsx\n')
for c in changes:
    print(c)

# Now fix vendor/pin-login to read from URL params first
with open('web/app/vendor/pin-login/page.tsx', 'r') as f:
    src = f.read()

OLD_GUARD = """  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('vendor_web_session') || localStorage.getItem('vendor_session') || '{}');
      if (!s?.pin_set) { router.replace('/'); return; }
      if (s?.name || s?.vendorName) setName(s.name || s.vendorName);
    } catch { router.replace('/'); return; }
    pinRefs.current[0]?.focus();
  }, []);"""

NEW_GUARD = """  useEffect(() => {
    try {
      // Check URL params first (cross-domain session handoff from thedreamwedding.in)
      const params = new URLSearchParams(window.location.search);
      const uid = params.get('uid');
      const phone = params.get('phone');
      const pinSetParam = params.get('pin_set');
      const nameParam = params.get('name');

      if (uid && pinSetParam === 'true') {
        // Write session from URL params then clean URL
        const sd = { id: uid, userId: uid, vendorId: uid, phone, pin_set: true, vendorName: nameParam || '', name: nameParam || '' };
        localStorage.setItem('vendor_web_session', JSON.stringify(sd));
        localStorage.setItem('vendor_session', JSON.stringify(sd));
        if (nameParam) setName(nameParam);
        window.history.replaceState({}, '', '/vendor/pin-login');
        pinRefs.current[0]?.focus();
        return;
      }

      const s = JSON.parse(localStorage.getItem('vendor_web_session') || localStorage.getItem('vendor_session') || '{}');
      if (!s?.pin_set) { router.replace('/'); return; }
      if (s?.name || s?.vendorName) setName(s.name || s.vendorName);
    } catch { router.replace('/'); return; }
    pinRefs.current[0]?.focus();
  }, []);"""

if OLD_GUARD in src:
    src = src.replace(OLD_GUARD, NEW_GUARD)
    with open('web/app/vendor/pin-login/page.tsx', 'w') as f:
        f.write(src)
    changes.append('✓ vendor/pin-login: reads session from URL params first')
else:
    changes.append('✗ vendor/pin-login guard pattern not found')

# Fix vendor/pin to read from URL params
with open('web/app/vendor/pin/page.tsx', 'r') as f:
    src = f.read()

OLD_PIN_GUARD = """  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('vendor_web_session') || localStorage.getItem('vendor_session') || '{}');
      if (s?.pin_set) { router.replace('/vendor/today'); return; }
    } catch {}
    pinRefs.current[0]?.focus();
  }, []);"""

NEW_PIN_GUARD = """  useEffect(() => {
    try {
      // Check URL params first (cross-domain session handoff from thedreamwedding.in)
      const params = new URLSearchParams(window.location.search);
      const uid = params.get('uid');
      const phone = params.get('phone');
      const pinSetParam = params.get('pin_set');

      if (uid) {
        const sd = { id: uid, userId: uid, vendorId: uid, phone, pin_set: pinSetParam === 'true' };
        localStorage.setItem('vendor_web_session', JSON.stringify(sd));
        localStorage.setItem('vendor_session', JSON.stringify(sd));
        window.history.replaceState({}, '', '/vendor/pin');
        if (pinSetParam === 'true') { router.replace('/vendor/today'); return; }
        pinRefs.current[0]?.focus();
        return;
      }

      const s = JSON.parse(localStorage.getItem('vendor_web_session') || localStorage.getItem('vendor_session') || '{}');
      if (s?.pin_set) { router.replace('/vendor/today'); return; }
    } catch {}
    pinRefs.current[0]?.focus();
  }, []);"""

if OLD_PIN_GUARD in src:
    src = src.replace(OLD_PIN_GUARD, NEW_PIN_GUARD)
    with open('web/app/vendor/pin/page.tsx', 'w') as f:
        f.write(src)
    changes.append('✓ vendor/pin: reads session from URL params first')
else:
    changes.append('✗ vendor/pin guard pattern not found')

# Fix couple/pin-login too
with open('web/app/couple/pin-login/page.tsx', 'r') as f:
    src = f.read()

OLD_COUPLE_GUARD = """      const s = JSON.parse(localStorage.getItem('couple_web_session') || localStorage.getItem('couple_session') || '{}');
      if ((!s?.id && !s?.userId) || !s?.pin_set) { router.replace('/couple/login'); return; }"""

NEW_COUPLE_GUARD = """      // Check URL params first (cross-domain session handoff)
      const params = new URLSearchParams(window.location.search);
      const uid = params.get('uid');
      const phone = params.get('phone');
      const pinSetParam = params.get('pin_set');
      if (uid && pinSetParam === 'true') {
        const sd = { id: uid, userId: uid, phone, pin_set: true };
        localStorage.setItem('couple_web_session', JSON.stringify(sd));
        localStorage.setItem('couple_session', JSON.stringify(sd));
        window.history.replaceState({}, '', '/couple/pin-login');
        pinRefs.current[0]?.focus();
        return;
      }
      const s = JSON.parse(localStorage.getItem('couple_web_session') || localStorage.getItem('couple_session') || '{}');
      if ((!s?.id && !s?.userId) || !s?.pin_set) { router.replace('/couple/login'); return; }"""

if OLD_COUPLE_GUARD in src:
    src = src.replace(OLD_COUPLE_GUARD, NEW_COUPLE_GUARD)
    with open('web/app/couple/pin-login/page.tsx', 'w') as f:
        f.write(src)
    changes.append('✓ couple/pin-login: reads session from URL params first')
else:
    changes.append('✗ couple/pin-login guard pattern not found')

print('\nAll cross-domain session fixes\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Fix: cross-domain session via URL params — thedreamwedding.in → app domain" && git push')
