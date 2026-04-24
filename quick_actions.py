"""
FEATURE: Quick Actions strip — Vendor Today page
File: web/app/vendor/today/page.tsx

Adds a horizontally scrollable pill strip between the hero greeting
and the DreamAi nudge. 6 universal actions + 1 category-specific action.
DreamAi pill is the only dark pill (#111 background).
Press state: scale(0.96) on pointerDown, snappy release.

Run from: /workspaces/tdw-2
Command:  python3 quick_actions.py
"""

PATH = 'web/app/vendor/today/page.tsx'
with open(PATH, 'r') as f:
    src = f.read()

changes = []

# ── 1. Add useRouter import ────────────────────────────────────────────────────
OLD_IMPORT = "'use client';\n\nimport React, { useEffect, useState, useRef } from 'react';"
NEW_IMPORT = "'use client';\n\nimport React, { useEffect, useState, useRef } from 'react';\nimport { useRouter } from 'next/navigation';"

if NEW_IMPORT in src:
    changes.append('✓ useRouter already imported')
elif OLD_IMPORT in src:
    src = src.replace(OLD_IMPORT, NEW_IMPORT)
    changes.append('✓ useRouter import added')
else:
    changes.append('✗ import pattern not found — add manually: import { useRouter } from "next/navigation"')

# ── 2. Add QuickActions component ──────────────────────────────────────────────
OLD_MAIN = "// ─── Main Page ────────────────────────────────────────────────────────────────"

NEW_QUICKACTIONS = """// ─── Quick Actions ───────────────────────────────────────────────────────────
// Horizontally scrollable pill strip — one tap, no confirmations.
// Sits between the hero greeting and the DreamAi nudge card.
function QuickActions({
  onDreamAi,
  category,
}: {
  onDreamAi: () => void;
  category?: string;
}) {
  const router = useRouter();

  const universalActions = [
    { label: 'New Client',  icon: '＋', action: () => router.push('/vendor/clients?action=new') },
    { label: 'New Invoice', icon: '₹',  action: () => router.push('/vendor/money?action=invoice') },
    { label: 'Block Date',  icon: '◻',  action: () => router.push('/vendor/studio/calendar?action=block') },
    { label: 'Ask DreamAi',icon: '✦',  action: onDreamAi },
    { label: 'Broadcast',   icon: '◉',  action: () => router.push('/vendor/studio/broadcast') },
    { label: 'Leads',       icon: '↗',  action: () => router.push('/vendor/leads') },
  ];

  const categoryAction = ({
    photographer:  { label: 'Add Shoot',    icon: '◈', action: () => router.push('/vendor/studio/calendar?action=shoot') },
    videographer:  { label: 'Add Shoot',    icon: '◈', action: () => router.push('/vendor/studio/calendar?action=shoot') },
    mua:           { label: 'Add Trial',    icon: '◎', action: () => router.push('/vendor/clients?action=trial') },
    decorator:     { label: 'Site Visit',   icon: '⬡', action: () => router.push('/vendor/studio/calendar?action=visit') },
    venue:         { label: 'Book Tour',    icon: '⬡', action: () => router.push('/vendor/clients?action=tour') },
    event_manager: { label: 'New Brief',    icon: '◐', action: () => router.push('/vendor/clients?action=brief') },
    choreographer: { label: 'Book Session', icon: '◉', action: () => router.push('/vendor/studio/calendar?action=session') },
    mehendi:       { label: 'Add Booking',  icon: '✦', action: () => router.push('/vendor/clients?action=new') },
    caterer:       { label: 'Menu Call',    icon: '◻', action: () => router.push('/vendor/clients?action=call') },
    designer:      { label: 'Book Fitting', icon: '◎', action: () => router.push('/vendor/clients?action=fitting') },
    jeweller:      { label: 'Book Viewing', icon: '◎', action: () => router.push('/vendor/clients?action=viewing') },
  } as Record<string, { label: string; icon: string; action: () => void }>)[category?.toLowerCase() || '']
    || { label: 'Add Task', icon: '◐', action: () => router.push('/vendor/studio/calendar') };

  const allActions = [...universalActions, categoryAction];

  return (
    <div style={{ padding: '0 20px', marginBottom: 28 }}>
      <p style={{
        fontFamily: "'Jost', sans-serif",
        fontSize: 9, fontWeight: 300,
        letterSpacing: '0.25em', textTransform: 'uppercase',
        color: '#888580', margin: '0 0 12px',
      }}>QUICK ACTIONS</p>

      <div style={{
        display: 'flex', gap: 8,
        overflowX: 'auto', scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 4,
        marginRight: -20,
        paddingRight: 20,
      }}>
        {allActions.map((a, i) => (
          <button
            key={i}
            onClick={a.action}
            style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 6,
              height: 38, padding: '0 14px',
              background: a.label === 'Ask DreamAi' ? '#111111' : '#FFFFFF',
              border: a.label === 'Ask DreamAi'
                ? '1px solid #111111'
                : '0.5px solid #E2DED8',
              borderRadius: 100,
              cursor: 'pointer',
              touchAction: 'manipulation',
              willChange: 'transform',
              transition: 'transform 120ms ease',
            }}
            onPointerDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)'; }}
            onPointerUp={e =>   { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            onPointerLeave={e =>{ (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          >
            <span style={{ fontSize: 12, color: '#C9A84C', lineHeight: 1 }}>{a.icon}</span>
            <span style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 9,
              fontWeight: a.label === 'Ask DreamAi' ? 400 : 300,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: a.label === 'Ask DreamAi' ? '#F8F7F5' : '#111111',
              whiteSpace: 'nowrap',
            }}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────"""

if '// ─── Quick Actions' in src:
    changes.append('✓ QuickActions component already present')
elif OLD_MAIN in src:
    src = src.replace(OLD_MAIN, NEW_QUICKACTIONS)
    changes.append('✓ QuickActions component added')
else:
    changes.append('✗ Main Page marker not found')

# ── 3. Insert <QuickActions /> in JSX ─────────────────────────────────────────
OLD_NUDGE = """        {/* DreamAi Nudge */}
        {nudge && ("""

NEW_NUDGE = """        {/* Quick Actions */}
        <QuickActions
          onDreamAi={() => openDreamAi()}
          category={session.category}
        />

        {/* DreamAi Nudge */}
        {nudge && ("""

if '<QuickActions' in src:
    changes.append('✓ <QuickActions /> already in JSX')
elif OLD_NUDGE in src:
    src = src.replace(OLD_NUDGE, NEW_NUDGE)
    changes.append('✓ <QuickActions /> inserted before DreamAi Nudge')
else:
    changes.append('✗ DreamAi Nudge JSX pattern not found')

with open(PATH, 'w') as f:
    f.write(src)

print('\nQuick Actions — complete\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Feature: Quick Actions strip on Vendor Today page" && git push')
