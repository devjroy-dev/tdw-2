"""
LANDING PAGE — All screen fixes
Repo: tdw-2

Fixes:
1. All screens (sign-in, OTP, invite, request) → bottom-anchored glass strip
2. All screen content compact — 20px headings, tight margins, minimal padding
3. OTP keyboard — autoFocus=false, inputMode=numeric stops keyboard jumping on mount
4. Carousel — interval never restarts so slide position preserved across screens
5. Unknown number → request_who screen (redirect)

Run from: /workspaces/tdw-2
Command:  python3 fix_screens_final.py
"""

with open('web/app/page.tsx', 'r') as f:
    src = f.read()

changes = []

# ── 1. Glass panel → bottom anchored ──────────────────────────────────────────
OLD_PANEL = """      {/* ── Glass panel — all non-entry, non-exploring screens ──────────────── */}
      {screen !== 'exploring' && screen !== 'entry' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '80px 24px 40px',
        }}>
          <div style={{ ...GLASS, width: '100%', maxWidth: 400, padding: '28px 24px 32px' }}>

            {/* entry screen handled by bottom strip above */}"""

NEW_PANEL = """      {/* ── Glass panel — all non-entry, non-exploring screens — BOTTOM ─────── */}
      {screen !== 'exploring' && screen !== 'entry' && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
          maxHeight: '80vh', overflowY: 'auto',
        }}>
          <div style={{
            background: 'rgba(12,10,9,0.3)',
            backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
            borderTop: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '20px 20px 0 0',
            padding: '16px 20px calc(env(safe-area-inset-bottom, 10px) + 16px)',
            boxSizing: 'border-box',
          }}>"""

if NEW_PANEL in src:
    changes.append('✓ Panel already bottom-anchored')
elif OLD_PANEL in src:
    src = src.replace(OLD_PANEL, NEW_PANEL)
    changes.append('✓ Panel → bottom-anchored, compact')
else:
    changes.append('✗ Panel pattern not found')

# ── 2. Compact headings ────────────────────────────────────────────────────────
compactions = [
    ("fontSize: 26, color: '#F8F7F5', margin: '0 0 20px', lineHeight: 1.15,",
     "fontSize: 20, color: '#F8F7F5', margin: '0 0 12px', lineHeight: 1.15,"),
    ("fontSize: 26, color: '#F8F7F5', margin: '0 0 20px'",
     "fontSize: 20, color: '#F8F7F5', margin: '0 0 12px'"),
    ("fontSize: 26, color: '#F8F7F5', margin: '0 0 6px'",
     "fontSize: 20, color: '#F8F7F5', margin: '0 0 4px'"),
    ("color: 'rgba(248,247,245,0.6)', margin: '0 0 20px'",
     "color: 'rgba(248,247,245,0.55)', margin: '0 0 12px'"),
    ("color: 'rgba(248,247,245,0.5)', margin: '0 0 20px'",
     "color: 'rgba(248,247,245,0.5)', margin: '0 0 12px'"),
    ("color: 'rgba(248,247,245,0.5)', margin: '0 0 28px'",
     "color: 'rgba(248,247,245,0.5)', margin: '0 0 16px'"),
    ("display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28",
     "display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16"),
    ("display: 'flex', gap: 8, marginBottom: 20",
     "display: 'flex', gap: 8, marginBottom: 12"),
    ("borderBottom: '1px solid rgba(255,255,255,0.3)', marginBottom: 20",
     "borderBottom: '1px solid rgba(255,255,255,0.2)', marginBottom: 12"),
]
for old, new in compactions:
    if old in src:
        count = src.count(old)
        src = src.replace(old, new)
        changes.append(f'✓ Compact ({count}x): {old[:45]!r}')

# ── 3. OTP inputs — no autoFocus, inputMode numeric ───────────────────────────
OLD_OTP = """                      type=\"tel\" maxLength={1}
                      style={{
                        width: 40, height: 48, border: 'none',
                        borderBottom: '1.5px solid rgba(255,255,255,0.4)',
                        background: 'transparent', outline: 'none',
                        fontFamily: \"'DM Sans', sans-serif\", fontWeight: 400,
                        fontSize: 20, color: '#F8F7F5', textAlign: 'center',
                      }}"""
NEW_OTP = """                      type="tel" inputMode="numeric" maxLength={1}
                      autoComplete="one-time-code" autoFocus={false}
                      style={{
                        width: 36, height: 44, border: 'none',
                        borderBottom: '1.5px solid rgba(255,255,255,0.35)',
                        background: 'transparent', outline: 'none',
                        fontFamily: \"'DM Sans', sans-serif\", fontWeight: 400,
                        fontSize: 18, color: '#F8F7F5', textAlign: 'center',
                      }}"""

if 'autoFocus={false}' in src:
    changes.append('✓ OTP inputs already fixed')
elif OLD_OTP in src:
    src = src.replace(OLD_OTP, NEW_OTP)
    changes.append('✓ OTP: autoFocus=false, inputMode=numeric')
else:
    changes.append('✗ OTP input pattern not found')

# ── 4. Carousel — never restart interval ──────────────────────────────────────
OLD_CAR = """  const startCarousel = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    // Slower rotation on landing — 4s per slide
    intervalRef.current = setInterval(() => setCur(c => (c + 1) % slidesRef.current.length), 4000);
  }, []);"""
NEW_CAR = """  const startCarousel = useCallback(() => {
    if (intervalRef.current) return; // already running — preserve slide position
    intervalRef.current = setInterval(() => setCur(c => (c + 1) % slidesRef.current.length), 4000);
  }, []);"""

if 'already running' in src:
    changes.append('✓ Carousel already fixed')
elif OLD_CAR in src:
    src = src.replace(OLD_CAR, NEW_CAR)
    changes.append('✓ Carousel: slide position preserved across screens')
else:
    changes.append('✗ Carousel pattern not found')

# ── 5. Unknown number → request_who ───────────────────────────────────────────
OLD_ERR = "      if (!d.success) { showToast(d.error || 'Incorrect code.'); return; }"
NEW_ERR = """      if (!d.success) {
        const err = d.error || '';
        if (err.toLowerCase().includes('no account') || err.toLowerCase().includes('not found') || err.toLowerCase().includes('no vendor')) {
          setScreen('request_who');
          showToast('No account found — request an invite to join.');
          return;
        }
        showToast(err || 'Incorrect code.'); return;
      }"""

OLD_NOTFOUND = "      const record = d.vendor || d.user;\n      if (!record) { showToast('Account not found.'); return; }"
NEW_NOTFOUND = """      const record = d.vendor || d.user;
      if (!record) { setScreen('request_who'); showToast('No account found — request an invite.'); return; }"""

if 'request_who' in src and 'No account found' in src:
    changes.append('✓ Unknown number redirect already applied')
else:
    if OLD_ERR in src:
        src = src.replace(OLD_ERR, NEW_ERR); changes.append('✓ Error → request_who')
    if OLD_NOTFOUND in src:
        src = src.replace(OLD_NOTFOUND, NEW_NOTFOUND); changes.append('✓ No record → request_who')

with open('web/app/page.tsx', 'w') as f:
    f.write(src)

print('\nLanding screens final fix\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Fix: screens bottom-anchored, compact, no keyboard jump, carousel preserved" && git push')
