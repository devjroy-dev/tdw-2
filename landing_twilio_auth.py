"""
FRONTEND PATCH — Landing page pure Twilio auth
Repo: tdw-2

Replaces the Firebase-hybrid OTP flow with pure Twilio Verify.
- sendOtp → /api/v2/vendor/auth/send-otp (Maker) or /api/v2/couple/auth/send-otp (Dreamer)
- verifyOtp → /api/v2/vendor/auth/verify-otp or /api/v2/couple/auth/verify-otp
- After verify → upsert → check pin_set → redirect to pin or pin-login
- handleSignIn (returning member) → pin-status check → skip OTP → go direct to pin-login

Run from: /workspaces/tdw-2
Command:  python3 landing_twilio_auth.py
"""

with open('web/app/page.tsx', 'r') as f:
    src = f.read()

changes = []

# ── 1. Replace sendOtp function ────────────────────────────────────────────────
OLD_SEND = """  const sendOtp = async (phoneNum: string) => {
    try {
      const r = await fetch(`${BACKEND}/api/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNum.replace(/\\D/g, '') }),
      });
      const d = await r.json();
      if (d.sessionInfo) localStorage.setItem('otp_session', d.sessionInfo);
      setScreen(screen === 'signin_phone' ? 'signin_otp' : 'invite_otp');
    } catch { showToast('Could not send code. Try again.'); }
  };"""

NEW_SEND = """  const sendOtp = async (phoneNum: string) => {
    const isVendor = role === 'Maker';
    const bare = phoneNum.replace(/\\D/g, '').slice(-10);
    const endpoint = isVendor
      ? `${BACKEND}/api/v2/vendor/auth/send-otp`
      : `${BACKEND}/api/v2/couple/auth/send-otp`;
    try {
      const r = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: bare }),
      });
      const d = await r.json();
      if (!d.success) { showToast(d.error || 'Could not send code. Try again.'); return; }
      setScreen(screen === 'signin_phone' ? 'signin_otp' : 'invite_otp');
    } catch { showToast('Could not send code. Try again.'); }
  };"""

if OLD_SEND in src:
    src = src.replace(OLD_SEND, NEW_SEND)
    changes.append('✓ sendOtp → pure Twilio endpoints')
else:
    changes.append('✗ sendOtp pattern not found')

# ── 2. Replace verifyOtp function ──────────────────────────────────────────────
OLD_VERIFY = """  const verifyOtp = async () => {
    try {
      const isVendor = role === 'Maker';
      const res = await fetch(`${BACKEND}/api/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionInfo: localStorage.getItem('otp_session') || 'admin_sdk_' + phone.replace(/\\D/g, ''),
          code: otp.join(''),
        }),
      });
      const d = await res.json();
      if (d.success) {
        const sessionKey = isVendor ? 'vendor_web_session' : 'couple_web_session';
        const cleanPhone = phone.replace(/\\D/g, '').slice(-10);
        let supabaseId = d.localId;
        let pinSet = false;
        let upsertData: any = null;
        try {
          const upsertRes = await fetch(`${BACKEND}/api/v2/${isVendor ? 'vendor' : 'couple'}/upsert`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanPhone, tier: 'essential', invite_code: inviteCode }),
          });
          upsertData = await upsertRes.json();
          if (upsertData.success) {
            supabaseId = upsertData.vendorId || upsertData.userId || supabaseId;
            pinSet = !!upsertData.pin_set;
          }
        } catch {}
        const sessionData = {
          idToken: d.idToken, localId: supabaseId,
          phoneNumber: d.phoneNumber, vendorId: supabaseId,
          userId: supabaseId, id: supabaseId, phone: cleanPhone,
          pin_set: pinSet,
          dreamer_type: upsertData?.dreamer_type || 'basic',
          name: upsertData?.name || null,
        };
        localStorage.setItem(sessionKey, JSON.stringify(sessionData));
        localStorage.setItem(isVendor ? 'vendor_session' : 'couple_session', JSON.stringify(sessionData));
        router.push(pinSet
          ? (isVendor ? '/vendor/pin-login' : '/couple/pin-login')
          : (isVendor ? '/vendor/pin' : '/couple/pin'));
      } else {
        showToast(d.error || 'Incorrect code.');
      }
    } catch { showToast('Verification failed.'); }
  };"""

NEW_VERIFY = """  const verifyOtp = async () => {
    const isVendor = role === 'Maker';
    const bare = phone.replace(/\\D/g, '').slice(-10);
    const endpoint = isVendor
      ? `${BACKEND}/api/v2/vendor/auth/verify-otp`
      : `${BACKEND}/api/v2/couple/auth/verify-otp`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: bare, code: otp.join('') }),
      });
      const d = await res.json();
      if (!d.success) { showToast(d.error || 'Incorrect code.'); return; }

      // d.vendor or d.user contains the record
      const record = d.vendor || d.user;
      if (!record) { showToast('Account not found.'); return; }

      const sessionKey = isVendor ? 'vendor_web_session' : 'couple_web_session';
      const pinSet = !!record.pin_set;
      const sessionData = {
        id: record.id, userId: record.id, vendorId: record.id,
        phone: bare,
        pin_set: pinSet,
        vendorName: record.name || null,
        name: record.name || null,
        category: record.category || null,
        tier: record.tier || null,
        dreamer_type: (record as any).dreamer_type || 'basic',
      };
      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      localStorage.setItem(isVendor ? 'vendor_session' : 'couple_session', JSON.stringify(sessionData));
      router.push(pinSet
        ? (isVendor ? '/vendor/pin-login' : '/couple/pin-login')
        : (isVendor ? '/vendor/pin' : '/couple/pin'));
    } catch { showToast('Verification failed.'); }
  };"""

if OLD_VERIFY in src:
    src = src.replace(OLD_VERIFY, NEW_VERIFY)
    changes.append('✓ verifyOtp → pure Twilio, no Firebase, correct session shape')
else:
    changes.append('✗ verifyOtp pattern not found')

# ── 3. Replace handleSignIn ────────────────────────────────────────────────────
# The existing handleSignIn already calls pin-status correctly — just ensure
# it uses bare phone and the correct role mapping
OLD_SIGNIN = """  const handleSignIn = async () => {
    const cleanPhone = phone.replace(/\\D/g, '').slice(-10);
    try {
      const r = await fetch(`${BACKEND}/api/v2/auth/pin-status?userId=_&role=${role === 'Dreamer' ? 'couple' : 'vendor'}&phone=${cleanPhone}`);
      const d = await r.json();
      if (d.pin_set) {
        const isVendor = role === 'Maker';
        const sessionKey = isVendor ? 'vendor_web_session' : 'couple_web_session';
        const existing = JSON.parse(localStorage.getItem(sessionKey) || '{}');
        const sd = { ...existing, phone: cleanPhone, pin_set: true, id: d.userId || cleanPhone, userId: d.userId || cleanPhone, vendorId: d.userId || cleanPhone };
        localStorage.setItem(sessionKey, JSON.stringify(sd));
        localStorage.setItem(isVendor ? 'vendor_session' : 'couple_session', JSON.stringify(sd));
        router.push(isVendor ? '/vendor/pin-login' : '/couple/pin-login');
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
      if (d.pin_set && d.userId) {
        // Has a PIN — skip OTP, go straight to pin-login
        const sessionKey = isVendor ? 'vendor_web_session' : 'couple_web_session';
        const sd = {
          id: d.userId, userId: d.userId, vendorId: d.userId,
          phone: bare, pin_set: true,
        };
        localStorage.setItem(sessionKey, JSON.stringify(sd));
        localStorage.setItem(isVendor ? 'vendor_session' : 'couple_session', JSON.stringify(sd));
        router.push(isVendor ? '/vendor/pin-login' : '/couple/pin-login');
        return;
      }
    } catch {}
    // No PIN set or new user — send OTP
    sendOtp(phone);
  };"""

if OLD_SIGNIN in src:
    src = src.replace(OLD_SIGNIN, NEW_SIGNIN)
    changes.append('✓ handleSignIn → returns user to pin-login if PIN set, no OTP needed')
else:
    changes.append('✗ handleSignIn pattern not found')

with open('web/app/page.tsx', 'w') as f:
    f.write(src)

print('\nLanding Twilio auth rewire\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Fix: landing page pure Twilio auth — no Firebase, correct PIN redirect" && git push')
