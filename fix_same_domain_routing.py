"""
FIX — Stay on same domain, use router.push not window.location.href
Repo: tdw-2

thedreamwedding.in and app.thedreamwedding.in are the SAME Next.js deployment
on Vercel. They share the same localStorage when accessed from the same origin.

The bug: handleSignIn and verifyOtp used window.location.href to
app.thedreamwedding.in which is a cross-domain navigation.
If the user is on thedreamwedding.in, this crosses to a different origin
and localStorage is not shared.

Fix: use router.push('/vendor/pin-login') instead.
This stays on the same origin (whatever domain the user is on)
and localStorage is fully shared.

Run from: /workspaces/tdw-2
Command:  python3 fix_same_domain_routing.py
"""

with open('web/app/page.tsx', 'r') as f:
    src = f.read()

changes = []

# Check if useRouter is already imported
if "useRouter" not in src:
    src = src.replace(
        "import { useEffect, useRef, useState, useCallback } from 'react';",
        "import { useEffect, useRef, useState, useCallback } from 'react';\nimport { useRouter } from 'next/navigation';"
    )
    changes.append('✓ useRouter import added')

# Add router to component
if 'const router = useRouter()' not in src:
    src = src.replace(
        "  const [screen, setScreen] = useState<Screen>('entry');",
        "  const router = useRouter();\n  const [screen, setScreen] = useState<Screen>('entry');"
    )
    changes.append('✓ router instance added')

# Fix handleSignIn - replace window.location.href with router.push
# AND remove the URL params (not needed since same domain)
OLD_SIGNIN_REDIRECT = """        const params = new URLSearchParams({
          uid: sd.id,
          phone: bare,
          pin_set: 'true',
        });
        window.location.href = isVendor
          ? 'https://app.thedreamwedding.in/vendor/pin-login?' + params.toString()
          : 'https://app.thedreamwedding.in/couple/pin-login?' + params.toString();"""

NEW_SIGNIN_REDIRECT = """        router.push(isVendor ? '/vendor/pin-login' : '/couple/pin-login');"""

if OLD_SIGNIN_REDIRECT in src:
    src = src.replace(OLD_SIGNIN_REDIRECT, NEW_SIGNIN_REDIRECT)
    changes.append('✓ handleSignIn: router.push (same domain)')
else:
    # Try the older pattern without URL params
    OLD2 = """        window.location.href = isVendor
          ? 'https://app.thedreamwedding.in/vendor/pin-login'
          : 'https://app.thedreamwedding.in/couple/pin-login';"""
    if OLD2 in src:
        src = src.replace(OLD2, "        router.push(isVendor ? '/vendor/pin-login' : '/couple/pin-login');")
        changes.append('✓ handleSignIn: router.push (same domain) — v2')
    else:
        changes.append('✗ handleSignIn redirect not found')

# Fix verifyOtp - replace window.location.href with router.push
OLD_VERIFY_REDIRECT = """      const qp = new URLSearchParams({
        uid: record.id,
        phone: bare,
        pin_set: String(pinSet),
        name: record.name || '',
        category: record.category || '',
      });
      window.location.href = pinSet
        ? (isVendor ? 'https://app.thedreamwedding.in/vendor/pin-login?' + qp : 'https://app.thedreamwedding.in/couple/pin-login?' + qp)
        : (isVendor ? 'https://app.thedreamwedding.in/vendor/pin?' + qp : 'https://app.thedreamwedding.in/couple/pin?' + qp);"""

NEW_VERIFY_REDIRECT = """      router.push(pinSet
        ? (isVendor ? '/vendor/pin-login' : '/couple/pin-login')
        : (isVendor ? '/vendor/pin' : '/couple/pin'));"""

if OLD_VERIFY_REDIRECT in src:
    src = src.replace(OLD_VERIFY_REDIRECT, NEW_VERIFY_REDIRECT)
    changes.append('✓ verifyOtp: router.push (same domain)')
else:
    OLD_V2 = """      window.location.href = pinSet
        ? (isVendor ? 'https://app.thedreamwedding.in/vendor/pin-login' : 'https://app.thedreamwedding.in/couple/pin-login')
        : (isVendor ? 'https://app.thedreamwedding.in/vendor/pin' : 'https://app.thedreamwedding.in/couple/pin');"""
    if OLD_V2 in src:
        src = src.replace(OLD_V2, NEW_VERIFY_REDIRECT)
        changes.append('✓ verifyOtp: router.push (same domain) — v2')
    else:
        changes.append('✗ verifyOtp redirect not found')

with open('web/app/page.tsx', 'w') as f:
    f.write(src)

# Restore vendor/pin-login to clean version WITHOUT URL param logic
# (not needed since same domain, and the URL param code could cause issues)
with open('web/app/vendor/pin-login/page.tsx', 'r') as f:
    src = f.read()

OLD_PARAM_GUARD = """      // Check URL params first (cross-domain session handoff from thedreamwedding.in)
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

      const s = JSON.parse(localStorage.getItem('vendor_web_session') || localStorage.getItem('vendor_session') || '{}');"""

OLD_CLEAN = """      const s = JSON.parse(localStorage.getItem('vendor_web_session') || localStorage.getItem('vendor_session') || '{}');"""

if OLD_PARAM_GUARD in src:
    src = src.replace(OLD_PARAM_GUARD, OLD_CLEAN)
    with open('web/app/vendor/pin-login/page.tsx', 'w') as f:
        f.write(src)
    changes.append('✓ vendor/pin-login: URL param logic removed (not needed)')
else:
    changes.append('— vendor/pin-login: already clean')

# Same for vendor/pin
with open('web/app/vendor/pin/page.tsx', 'r') as f:
    src = f.read()

OLD_PIN_PARAM = """      // Check URL params first (cross-domain session handoff from thedreamwedding.in)
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

      const s = JSON.parse(localStorage.getItem('vendor_web_session') || localStorage.getItem('vendor_session') || '{}');"""

OLD_PIN_CLEAN = """      const s = JSON.parse(localStorage.getItem('vendor_web_session') || localStorage.getItem('vendor_session') || '{}');"""

if OLD_PIN_PARAM in src:
    src = src.replace(OLD_PIN_PARAM, OLD_PIN_CLEAN)
    with open('web/app/vendor/pin/page.tsx', 'w') as f:
        f.write(src)
    changes.append('✓ vendor/pin: URL param logic removed (not needed)')
else:
    changes.append('— vendor/pin: already clean')

print('\nSame-domain routing fix\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Fix: use router.push (same domain) — no cross-domain localStorage issue" && git push')
