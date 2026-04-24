"""
LANDING PAGE — Move all screens to bottom strip
Repo: tdw-2

Changes the non-entry glass panel from centred to bottom-anchored.
All screens (signin, OTP, invite, request forms) now appear at the bottom
like the entry strip, keeping the full carousel visible above.

Run from: /workspaces/tdw-2
Command:  python3 landing_bottom_screens.py
"""

with open('web/app/page.tsx', 'r') as f:
    src = f.read()

# Replace centred panel with bottom-anchored panel
OLD = """      {/* ── Glass panel — all other screens ──────────────────────────────── */}
      {screen !== 'exploring' && screen !== 'entry' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '80px 24px 40px',
        }}>
          <div style={{ ...GLASS, width: '100%', maxWidth: 400, padding: '28px 24px 32px' }}>

            {/* placeholder — entry removed from here */}
            {screen === 'entry' && null}"""

NEW = """      {/* ── Glass panel — all non-entry screens, anchored to bottom ────────── */}
      {screen !== 'exploring' && screen !== 'entry' && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
          maxHeight: '85vh', overflowY: 'auto',
        }}>
          <div style={{
            background: 'rgba(12,10,9,0.3)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            borderTop: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '20px 20px 0 0',
            padding: '24px 24px calc(env(safe-area-inset-bottom, 16px) + 24px)',
            width: '100%', boxSizing: 'border-box',
          }}>"""

if OLD in src:
    src = src.replace(OLD, NEW)
    print('✓ Panel moved to bottom')
else:
    print('✗ Pattern not found')
    # Debug
    idx = src.find('Glass panel — all other')
    print(f'  Found at char {idx}')

# Also close the div correctly — the old wrapper had two closing divs, new has two
# Check the closing structure is still valid
# (The inner content divs close themselves, the two wrapper divs just change position)

with open('web/app/page.tsx', 'w') as f:
    f.write(src)

print('\nNext: git add -A && git commit -m "Design: all landing screens anchored to bottom" && git push')
