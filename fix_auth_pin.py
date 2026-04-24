"""
AUTH FLOW + PIN PAGE FIXES
Repo: tdw-2

Fix 1 — thedreamwedding.in signin skips back to landing:
  handleSignIn had a duplicate pin-status API call in a second try block.
  The logic was: first call checks pin_set, second call (incorrectly) runs again.
  Clean single call: no userId → request_who, has PIN → pin-login, no PIN → sendOtp.

Fix 2 — app.thedreamwedding.in pin page always resets to slide 1:
  useState(0) always starts at first slide on page load.
  Fixed to useState(() => Math.random() * SLIDES.length) — starts at a random slide.

Run from: /workspaces/tdw-2
Command:  python3 fix_auth_pin.py
"""

import re

with open('web/app/page.tsx', 'r') as f:
    src = f.read()

changes = []

OLD_SIGNIN = """  const handleSignIn = async () => {
    const isVendor = role === 'Maker';
    const bare = phone.replace(/\\D/g, '').slice(-10);
    try {
      const r = await fetch(`${BACKEND}/api/v2/auth/pin-status?userId=_&role=${isVendor ? 'vendor' : 'couple'}&phone=${bare}`);
      const d = await r.json();
      if (d.pin_set && d.userId) {
        // Has a PIN — skip OTP, go straight to pin-login
        const sessionKey = isVendor ? 'vendor_web_session' : 'couple_web_session';
        const sd = {
          id: d.userId, userId: d.userId, vendorId: d.userId,
          phone: bare, pin_set: true,
        };
        localStorage.setItem(sessionKey, JSON.stringify(sd));
        localStorage.setItem(isVendor ? 'vendor_session' : 'couple_session', JSON.stringify(sd));
        window.location.href = isVendor ? 'https://app.thedreamwedding.in/vendor/pin-login' : 'https://app.thedreamwedding.in/couple/pin-login';
        return;
      }
    } catch {}
    // Number not found at all — check if they have an account before sending OTP
    // pin-status returns pin_set=false and no userId when number doesn't exist
    try {
      const bare = phone.replace(/\\D/g, '').slice(-10);
      const isVendor = role === 'Maker';
      const r2 = await fetch(`${BACKEND}/api/v2/auth/pin-status?userId=_&role=${isVendor ? 'vendor' : 'couple'}&phone=${bare}`);
      const d2 = await r2.json();
      if (!d2.userId && !d2.pin_set) {
        // No account exists — go to request invite
        setScreen('request_who');
        showToast('No account found. Request an invite to join.');
        return;
      }
    } catch {}
    sendOtp(phone);
  };"""

NEW_SIGNIN = """  const handleSignIn = async () => {
    const isVendor = role === 'Maker';
    const bare = phone.replace(/\\D/g, '').slice(-10);
    try {
      const r = await fetch(`${BACKEND}/api/v2/auth/pin-status?userId=_&role=${isVendor ? 'vendor' : 'couple'}&phone=${bare}`);
      const d = await r.json();

      if (!d.userId) {
        // Number not in system — send to request invite
        setScreen('request_who');
        showToast('No account found — request an invite to join.');
        return;
      }

      if (d.pin_set && d.userId) {
        // Has PIN — write session, go to pin-login
        const sessionKey = isVendor ? 'vendor_web_session' : 'couple_web_session';
        const sd = { id: d.userId, userId: d.userId, vendorId: d.userId, phone: bare, pin_set: true };
        localStorage.setItem(sessionKey, JSON.stringify(sd));
        localStorage.setItem(isVendor ? 'vendor_session' : 'couple_session', JSON.stringify(sd));
        window.location.href = isVendor
          ? 'https://app.thedreamwedding.in/vendor/pin-login'
          : 'https://app.thedreamwedding.in/couple/pin-login';
        return;
      }

      // Account exists but no PIN — send OTP to complete setup
      sendOtp(phone);
    } catch {
      showToast('Could not connect. Try again.');
    }
  };"""

if 'No account found. Request an invite to join.' in src and '// Number not found at all' in src:
    src = src.replace(OLD_SIGNIN, NEW_SIGNIN)
    changes.append('✓ handleSignIn: single clean pin-status check')
elif NEW_SIGNIN in src:
    changes.append('✓ handleSignIn: already fixed')
else:
    changes.append('✗ handleSignIn: pattern not found')

with open('web/app/page.tsx', 'w') as f:
    f.write(src)

# Fix pin pages
for path in ['web/app/vendor/pin/page.tsx', 'web/app/vendor/pin-login/page.tsx']:
    with open(path, 'r') as f:
        s = f.read()
    new_s = re.sub(
        r"const \[slide, setSlide\]\s*=\s*useState\(0\);",
        "const [slide, setSlide]   = useState(() => Math.floor(Math.random() * SLIDES.length));",
        s
    )
    if new_s != s:
        with open(path, 'w') as f:
            f.write(new_s)
        changes.append(f'✓ {path}: random start slide')
    elif 'Math.random()' in s:
        changes.append(f'✓ {path}: already random')
    else:
        changes.append(f'✗ {path}: slide pattern not found')

print('\nAuth + pin fixes\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Fix: signin flow clean, pin pages random slide start" && git push')
