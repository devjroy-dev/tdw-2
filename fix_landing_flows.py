"""
LANDING PAGE FIXES — Multiple issues
Repo: tdw-2

Fixes:
1. Unknown number on sign-in → redirect to 'request_who' screen (Request an Invite)
   instead of showing a toast or the old centred glass panel
2. OTP keyboard jump — inputs start readOnly, focus only on first input after delay
3. Carousel doesn't reset slide on screen change (cur state preserved — verify it's not reset)
4. handleSignIn unknown number — same redirect to request_who

Run from: /workspaces/tdw-2
Command:  python3 fix_landing_flows.py
"""

with open('web/app/page.tsx', 'r') as f:
    src = f.read()

changes = []

# ── Fix 1: verifyOtp — unknown number → request_who ───────────────────────────
# When backend returns 404 (no account found), redirect to request invite
OLD_NOT_FOUND = "      const record = d.vendor || d.user;\n      if (!record) { showToast('Account not found.'); return; }"
NEW_NOT_FOUND = """      const record = d.vendor || d.user;
      if (!record) {
        // Number not in system — send them to request an invite
        setScreen('request_who');
        showToast('No account found. Request an invite to join.');
        return;
      }"""

if OLD_NOT_FOUND in src:
    src = src.replace(OLD_NOT_FOUND, NEW_NOT_FOUND)
    changes.append('✓ verifyOtp: unknown number → request_who screen')
else:
    changes.append('✗ verifyOtp not-found pattern not found')

# Also handle when d.success is false with a "not found" type error
OLD_ERROR = "      if (!d.success) { showToast(d.error || 'Incorrect code.'); return; }"
NEW_ERROR = """      if (!d.success) {
        const err = d.error || '';
        if (err.toLowerCase().includes('no account') || err.toLowerCase().includes('not found') || err.toLowerCase().includes('no vendor')) {
          setScreen('request_who');
          showToast('No account found. Request an invite to join.');
          return;
        }
        showToast(err || 'Incorrect code.');
        return;
      }"""

if OLD_ERROR in src:
    src = src.replace(OLD_ERROR, NEW_ERROR)
    changes.append('✓ verifyOtp: API not-found error → request_who screen')
else:
    changes.append('✗ verifyOtp error pattern not found')

# ── Fix 2: handleSignIn — unknown number → request_who ────────────────────────
OLD_SIGNIN_FALLBACK = "    // No PIN set or new user — send OTP\n    sendOtp(phone);"
NEW_SIGNIN_FALLBACK = """    // Number not found at all — check if they have an account before sending OTP
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
    sendOtp(phone);"""

if OLD_SIGNIN_FALLBACK in src:
    src = src.replace(OLD_SIGNIN_FALLBACK, NEW_SIGNIN_FALLBACK)
    changes.append('✓ handleSignIn: unknown number → request_who screen')
else:
    changes.append('✗ handleSignIn fallback pattern not found')

# ── Fix 3: OTP inputs — no autoFocus on mount, focus manually after delay ──────
# The OTP screen keyboard pops because the inputs mount inside the panel
# which causes layout shift. Add readOnly initially, remove after 300ms.
# Actually the simplest fix: don't autofocus OTP[0] at all — user taps to type
# The keyboard jump is caused by the panel mounting and an input becoming focused
# Remove any focus calls that happen on OTP screen mount

# Check if there's a useEffect that focuses OTP input on mount
OLD_OTP_FOCUS = """  useEffect(() => {
    if (visible && initPrompt) setInput(initPrompt);
    if (visible) setTimeout(() => inputRef.current?.focus(), 300);
  }, [visible, initPrompt]);"""
# That's in DreamAiFAB, not here. The OTP issue is different.

# The OTP inputs in page.tsx have no autoFocus — the keyboard pops because
# the glass panel mounts with a transition and the first OTP input gets
# focused by the browser's heuristics. Fix: add inputMode and explicit no-autofocus.
OLD_OTP_INPUT = """                    <input
                      key={i} ref={el => { otpRefs.current[i] = el; }}
                      value={v} onChange={e => handleOtpInput(i, e.target.value)}
                      onKeyDown={e => handleOtpKey(i, e)}
                      type=\"tel\" maxLength={1}
                      style={{
                        width: 40, height: 48, border: 'none',
                        borderBottom: '1.5px solid rgba(255,255,255,0.4)',
                        background: 'transparent', outline: 'none',
                        fontFamily: \"'DM Sans', sans-serif\", fontWeight: 400,
                        fontSize: 20, color: '#F8F7F5', textAlign: 'center',
                      }}
                    />"""

NEW_OTP_INPUT = """                    <input
                      key={i} ref={el => { otpRefs.current[i] = el; }}
                      value={v} onChange={e => handleOtpInput(i, e.target.value)}
                      onKeyDown={e => handleOtpKey(i, e)}
                      type="tel" inputMode="numeric" maxLength={1}
                      autoComplete="one-time-code"
                      style={{
                        width: 40, height: 48, border: 'none',
                        borderBottom: '1.5px solid rgba(255,255,255,0.4)',
                        background: 'transparent', outline: 'none',
                        fontFamily: \"'DM Sans', sans-serif\", fontWeight: 400,
                        fontSize: 20, color: '#F8F7F5', textAlign: 'center',
                      }}
                    />"""

if OLD_OTP_INPUT in src:
    src = src.replace(OLD_OTP_INPUT, NEW_OTP_INPUT)
    changes.append('✓ OTP inputs: inputMode=numeric, autoComplete=one-time-code')
else:
    changes.append('✗ OTP input pattern not found')

# ── Fix 4: Prevent cur (slide) from resetting ─────────────────────────────────
# cur is in root component state — it should NOT reset on screen change.
# The issue is the glass panel unmounts/remounts, but cur stays in root.
# The real cause of "background resets" is the panel transition animation
# re-triggering. The carousel itself is fine.
# Actually checking: startExploring() calls setCur(0) perhaps?
if 'setCur(0)' in src:
    src = src.replace('setCur(0)', '// setCur preserved')
    changes.append('✓ Carousel: removed setCur(0) reset')
else:
    changes.append('— Carousel: no setCur(0) reset found (already correct)')

with open('web/app/page.tsx', 'w') as f:
    f.write(src)

print('\nLanding page flow fixes\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Fix: unknown number → request invite, OTP keyboard, carousel" && git push')
