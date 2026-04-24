"""
LANDING PAGE ENTRY STRIP — writes directly to page.tsx
Replaces the centred glass panel entry screen with a minimal bottom strip.

Run from: /workspaces/tdw-2
Command:  python3 landing_entry.py
"""

with open('web/app/page.tsx', 'r') as f:
    src = f.read()

changes = []

# ── 1. Add entryExpanded state ─────────────────────────────────────────────────
OLD_STATE = "  const [previewDone, setPreviewDone]   = useState(false);"
NEW_STATE  = "  const [previewDone, setPreviewDone]   = useState(false);\n  const [entryExpanded, setEntryExpanded] = useState(false);"
if 'entryExpanded' in src:
    changes.append('✓ entryExpanded state already present')
elif OLD_STATE in src:
    src = src.replace(OLD_STATE, NEW_STATE)
    changes.append('✓ entryExpanded state added')
else:
    changes.append('✗ state anchor not found')

# ── 2. Add breathe keyframe ────────────────────────────────────────────────────
OLD_CSS = "        ::-webkit-scrollbar { display: none; }\n      `}</style>"
NEW_CSS  = "        ::-webkit-scrollbar { display: none; }\n        @keyframes breathe { 0%,100%{opacity:0.22} 50%{opacity:0.45} }\n      `}</style>"
if 'breathe' in src:
    changes.append('✓ breathe animation already present')
elif OLD_CSS in src:
    src = src.replace(OLD_CSS, NEW_CSS)
    changes.append('✓ breathe animation added')
else:
    changes.append('✗ CSS anchor not found')

# ── 3. Remove top motto block if present ───────────────────────────────────────
MOTTO_BLOCK = """{/* ── Motto — always at top ─────────────────────────────────────────── */}
      {screen !== 'exploring' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          padding: '20px 24px', textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <p style={{
            fontFamily: \"'Cormorant Garamond', serif\", fontStyle: 'italic',
            fontWeight: 300, fontSize: 16, color: '#C9A84C',
            letterSpacing: '0.04em', lineHeight: 1.6, margin: 0,
          }}>{MOTTO}</p>
        </div>
      )}"""
if MOTTO_BLOCK in src:
    src = src.replace(MOTTO_BLOCK, '')
    changes.append('✓ Top motto block removed')
else:
    changes.append('— Top motto already removed')

# ── 4. Replace the centred glass panel entry with bottom strip ─────────────────
# The old phase 9 entry panel sits inside a centred flex container.
# We replace just the entry panel + its container with the new bottom strip.

OLD_GLASS = """      {/* ── Glass panel — centred on screen ───────────────────────────────── */}
      {screen !== 'exploring' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '80px 24px 40px',
        }}>
          <div style={{ ...GLASS, width: '100%', maxWidth: 400, padding: '28px 24px 32px' }}>

            {/* ── ENTRY PANEL ──────────────────────────────────────────────── */}
            {screen === 'entry' && (
              <>
                <p style={{
                  fontFamily: \"'Cormorant Garamond', serif\", fontWeight: 300,
                  fontSize: 32, color: '#F8F7F5', margin: '0 0 6px', lineHeight: 1.1,
                }}>The Dream Wedding</p>
                <p style={{
                  fontFamily: \"'Jost', sans-serif\", fontWeight: 200, fontSize: 8,
                  letterSpacing: '0.3em', textTransform: 'uppercase',
                  color: 'rgba(248,247,245,0.4)', margin: '0 0 28px',
                }}>THE CURATED WEDDING OS</p>

                <DotOption
                  label=\"Yes — I have an invite\"
                  selected={false}
                  onSelect={() => { setRole(null); setScreen('invite_code'); }}
                />
                <DotOption
                  label=\"No — I'd like one\"
                  selected={false}
                  onSelect={() => setScreen('request_who')}
                />
                <DotOption
                  label=\"Just exploring\"
                  sublabel=\"See what's possible\"
                  selected={false}
                  onSelect={startExploring}
                />

                <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.1)', margin: '20px 0 14px' }} />
                <button onClick={() => { setRole(null); setScreen('signin_phone'); }} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: \"'Jost', sans-serif\", fontSize: 8, fontWeight: 200,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: 'rgba(248,247,245,0.35)', width: '100%',
                }}>Already a member — Sign in</button>
              </>
            )}"""

NEW_STRIP = """      {/* ── Entry strip — bottom of screen, tappable ─────────────────────── */}
      {screen === 'entry' && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, overflow: 'hidden' }}>
          <div
            onClick={() => setEntryExpanded(true)}
            style={{
              background: 'rgba(12,10,9,0.75)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              borderTop: '0.5px solid rgba(255,255,255,0.1)',
              padding: entryExpanded
                ? '20px 24px calc(env(safe-area-inset-bottom, 16px) + 28px)'
                : '14px 24px calc(env(safe-area-inset-bottom, 12px) + 16px)',
              transition: 'padding 400ms cubic-bezier(0.22,1,0.36,1)',
              cursor: entryExpanded ? 'default' : 'pointer',
            }}
          >
            {/* Brand row — always visible */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <p style={{
                  fontFamily: \"'Cormorant Garamond', serif\", fontStyle: 'italic',
                  fontWeight: 300, fontSize: 20, color: '#F8F7F5',
                  margin: 0, lineHeight: 1.15, letterSpacing: '0.02em',
                }}>The Dream Wedding</p>
                <p style={{
                  fontFamily: \"'Jost', sans-serif\", fontWeight: 200, fontSize: 7,
                  letterSpacing: '0.32em', textTransform: 'uppercase',
                  color: '#C9A84C', margin: '4px 0 0',
                }}>THE CURATED WEDDING OS</p>
              </div>
              {!entryExpanded && (
                <p style={{
                  fontFamily: \"'Jost', sans-serif\", fontWeight: 200, fontSize: 8,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: 'rgba(248,247,245,0.28)', margin: 0,
                  animation: 'breathe 3s ease-in-out infinite',
                }}>tap</p>
              )}
            </div>

            {/* Buttons — animate in on expand */}
            <div style={{
              maxHeight: entryExpanded ? '240px' : '0px',
              overflow: 'hidden',
              transition: 'max-height 440ms cubic-bezier(0.22,1,0.36,1)',
            }}>
              <div style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={e => { e.stopPropagation(); setRole(null); setScreen('invite_code'); }}
                  style={{
                    width: '100%', height: 48, background: '#C9A84C', border: 'none',
                    borderRadius: 100, cursor: 'pointer', touchAction: 'manipulation',
                    fontFamily: \"'Jost', sans-serif\", fontSize: 9, fontWeight: 400,
                    letterSpacing: '0.22em', textTransform: 'uppercase', color: '#0C0A09',
                  }}
                >I have an invite</button>

                <button
                  onClick={e => { e.stopPropagation(); setScreen('request_who'); }}
                  style={{
                    width: '100%', height: 48, background: 'transparent',
                    border: '0.5px solid rgba(248,247,245,0.25)', borderRadius: 100,
                    cursor: 'pointer', touchAction: 'manipulation',
                    fontFamily: \"'Jost', sans-serif\", fontSize: 9, fontWeight: 300,
                    letterSpacing: '0.22em', textTransform: 'uppercase', color: '#F8F7F5',
                  }}
                >Request an invite</button>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setRole(null); setScreen('signin_phone'); }}
                    style={{
                      flex: 1, height: 42, background: 'transparent',
                      border: '0.5px solid rgba(248,247,245,0.12)', borderRadius: 100,
                      cursor: 'pointer', touchAction: 'manipulation',
                      fontFamily: \"'Jost', sans-serif\", fontSize: 8, fontWeight: 200,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      color: 'rgba(248,247,245,0.45)',
                    }}
                  >Sign in</button>
                  <button
                    onClick={e => { e.stopPropagation(); startExploring(); }}
                    style={{
                      flex: 1, height: 42, background: 'transparent',
                      border: '0.5px solid rgba(248,247,245,0.12)', borderRadius: 100,
                      cursor: 'pointer', touchAction: 'manipulation',
                      fontFamily: \"'Jost', sans-serif\", fontSize: 8, fontWeight: 200,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      color: 'rgba(248,247,245,0.45)',
                    }}
                  >Just exploring</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Glass panel — all non-entry, non-exploring screens ──────────────── */}
      {screen !== 'exploring' && screen !== 'entry' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '80px 24px 40px',
        }}>
          <div style={{ ...GLASS, width: '100%', maxWidth: 400, padding: '28px 24px 32px' }}>

            {screen === 'entry' && null /* entry handled above */}"""

if 'Entry strip — bottom of screen' in src:
    changes.append('✓ Bottom strip already present — no change needed')
elif OLD_GLASS in src:
    src = src.replace(OLD_GLASS, NEW_STRIP)
    changes.append('✓ Centred glass entry replaced with bottom strip')
else:
    # Try to find what's actually there
    idx = src.find('Glass panel — centred')
    if idx > 0:
        changes.append(f'✗ Found glass panel at {idx} but pattern mismatch — check manually')
    else:
        changes.append('✗ Glass panel pattern not found — page may already be updated')

with open('web/app/page.tsx', 'w') as f:
    f.write(src)

print('\nLanding entry strip patch\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Design: landing page bottom strip entry" && git push')
