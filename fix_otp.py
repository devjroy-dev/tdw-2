"""
OTP FIXES — Landing page
Repo: tdw-2

Fix 1: otp state not reset when screen changes to OTP screen
  If user gets wrong code, retries, the old digits are still in the boxes.
  They hit Verify again with stale code → always wrong.
  Fix: useEffect resets otp to ['','','','','',''] when screen becomes otp.

Fix 2: Add Resend code link on OTP screen
  No way to get a new code if the first one doesn't arrive.

Fix 3: autoComplete="one-time-code" on ALL 6 inputs (not just first)
  iOS fills each box individually. Android pastes into first box.
  handleOtpInput uses val.slice(-1) which handles single chars fine.
  But on Android paste of "123456" into box 0: val="123456", slice(-1)="6"
  Only last digit stored. Fix: detect multi-char paste and distribute.

Run from: /workspaces/tdw-2
Command:  python3 fix_otp.py
"""

with open('web/app/page.tsx', 'r') as f:
    src = f.read()

changes = []

# Fix 1: Reset otp when screen changes to OTP screen
# Find the useEffect block and add otp reset
OLD_SCREEN_EFFECT = "  const startCarousel = useCallback(() => {"

NEW_RESET = """  // Reset OTP digits whenever OTP screen appears
  useEffect(() => {
    if (screen === 'signin_otp' || screen === 'invite_otp') {
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    }
  }, [screen]);

  const startCarousel = useCallback(() => {"""

if OLD_SCREEN_EFFECT in src:
    src = src.replace(OLD_SCREEN_EFFECT, NEW_RESET)
    changes.append('✓ OTP state reset on screen change + auto-focus first box')
else:
    changes.append('✗ startCarousel anchor not found')

# Fix 2: handleOtpInput — handle paste of full 6-digit code
OLD_OTP_INPUT = """  const handleOtpInput = (i: number, val: string) => {
    const n = [...otp]; n[i] = val.slice(-1); setOtp(n);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };"""

NEW_OTP_INPUT = """  const handleOtpInput = (i: number, val: string) => {
    // Handle paste of full 6-digit code (Android SMS autofill)
    const digits = val.replace(/\\D/g, '');
    if (digits.length > 1) {
      const n = ['', '', '', '', '', ''];
      digits.split('').slice(0, 6).forEach((d, idx) => { n[idx] = d; });
      setOtp(n);
      otpRefs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }
    const n = [...otp]; n[i] = digits.slice(-1); setOtp(n);
    if (digits && i < 5) otpRefs.current[i + 1]?.focus();
  };"""

if OLD_OTP_INPUT in src:
    src = src.replace(OLD_OTP_INPUT, NEW_OTP_INPUT)
    changes.append('✓ handleOtpInput: handles full-code paste (Android autofill)')
else:
    changes.append('✗ handleOtpInput pattern not found')

# Fix 3: Add Resend link below the Verify button on OTP screen
OLD_VERIFY_BTN = "                <GoldBtn label=\"Verify →\" onClick={verifyOtp} disabled={otp.join('').length < 6} />"
NEW_VERIFY_BTN = """                <GoldBtn label="Verify →" onClick={verifyOtp} disabled={otp.join('').length < 6} />
                <button
                  onClick={() => { setOtp(['', '', '', '', '', '']); sendOtp(phone); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', touchAction: 'manipulation', fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(248,247,245,0.3)', marginTop: 12, display: 'block', width: '100%' }}
                >Resend code</button>"""

if OLD_VERIFY_BTN in src:
    src = src.replace(OLD_VERIFY_BTN, NEW_VERIFY_BTN)
    changes.append('✓ Resend code button added below Verify')
else:
    changes.append('✗ Verify button pattern not found')

with open('web/app/page.tsx', 'w') as f:
    f.write(src)

print('\nOTP fixes\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Fix: OTP reset on screen change, paste handling, resend button" && git push')
