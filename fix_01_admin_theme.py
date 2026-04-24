import os

BASE = '/workspaces/tdw-2/web/app/admin'

# ── Layout ────────────────────────────────────────────────────────────────────
layout_path = os.path.join(BASE, 'layout.tsx')
with open(layout_path, 'r') as f:
    c = f.read()

c = c.replace("background: #0C0A09; color: #F8F7F5;", "background: #FFFFFF; color: #111111;")
c = c.replace("::-webkit-scrollbar-thumb { background: #2A2825;", "::-webkit-scrollbar-thumb { background: #E2DED8;")
c = c.replace("input, select, textarea { color: #F8F7F5 !important; background: transparent !important; }", "input, select, textarea { color: #111111 !important; background: transparent !important; }")
c = c.replace("input::placeholder { color: rgba(248,247,245,0.35) !important; }", "input::placeholder { color: rgba(0,0,0,0.3) !important; }")
c = c.replace("const BG = '#0C0A09';", "const BG = '#FFFFFF';")
c = c.replace("const BG2 = '#161412';", "const BG2 = '#F8F7F5';")
c = c.replace("const BG3 = '#1E1C1A';", "const BG3 = '#F0EEE8';")
c = c.replace("const BORDER = 'rgba(248,247,245,0.08)';", "const BORDER = '#E2DED8';")
c = c.replace("const TEXT = '#F8F7F5';", "const TEXT = '#111111';")
c = c.replace("const MUTED = 'rgba(248,247,245,0.45)';", "const MUTED = '#888580';")
c = c.replace("color: 'rgba(248,247,245,0.25)'", "color: '#BBBBBB'")

with open(layout_path, 'w') as f:
    f.write(c)
print("✓ layout.tsx")

# ── Generic fixes for all page files ─────────────────────────────────────────
PAGES = [
    'dashboard/page.tsx', 'dreamers/page.tsx', 'makers/page.tsx',
    'invites/page.tsx', 'messages/page.tsx', 'images/page.tsx',
    'featured/page.tsx', 'money/page.tsx', 'revenue/page.tsx',
    'subscriptions/page.tsx', 'data/page.tsx', 'health/page.tsx',
]

REPLACEMENTS = [
    ("background: '#0C0A09'",   "background: '#F8F7F5'"),
    ("background: '#161412'",   "background: '#FFFFFF'"),
    ("background: '#1E1C1A'",   "background: '#F8F7F5'"),
    ("background: \"#161412\"", "background: '#FFFFFF'"),
    ("background: \"#0C0A09\"", "background: '#F8F7F5'"),
    ("color: '#F8F7F5'",        "color: '#111111'"),
    ("color: \"#F8F7F5\"",      "color: '#111111'"),
    ("color: '#FFFFFF'",        "color: '#111111'"),
    ("color: 'rgba(248,247,245,0.4)'",  "color: '#888580'"),
    ("color: 'rgba(248,247,245,0.55)'", "color: '#555250'"),
    ("color: 'rgba(248,247,245,0.45)'", "color: '#888580'"),
    ("color: \"rgba(248,247,245,0.4)\"","color: '#888580'"),
    ("background: 'linear-gradient(90deg,#1E1C1A 25%,#2A2825 50%,#1E1C1A 75%)'",
     "background: 'linear-gradient(90deg,#F0EEE8 25%,#E8E5DF 50%,#F0EEE8 75%)'"),
    ("background: \"linear-gradient(90deg,#1E1C1A 25%,#2A2825 50%,#1E1C1A 75%)\"",
     "background: 'linear-gradient(90deg,#F0EEE8 25%,#E8E5DF 50%,#F0EEE8 75%)'"),
    ("border: '1px solid rgba(248,247,245,0.1)'",   "border: '1px solid #E2DED8'"),
    ("border: '0.5px solid rgba(248,247,245,0.08)'","border: '0.5px solid #E2DED8'"),
    ("border: '1px solid rgba(248,247,245,0.08)'",  "border: '1px solid #E2DED8'"),
    ("borderTop: '0.5px solid rgba(248,247,245,0.06)'",  "borderTop: '0.5px solid #E8E5DF'"),
    ("borderBottom: '0.5px solid rgba(248,247,245,0.06)'","borderBottom: '0.5px solid #E8E5DF'"),
    ("borderBottom: '0.5px solid rgba(248,247,245,0.08)'","borderBottom: '0.5px solid #E2DED8'"),
    ("background: '#0C0A09'",   "background: '#F8F7F5'"),   # repeat after border fixes
    ("(e.currentTarget as HTMLTableRowElement).style.background = '#1E1C1A'",
     "(e.currentTarget as HTMLTableRowElement).style.background = '#F8F7F5'"),
    ("(e.currentTarget as HTMLDivElement).style.background = '#1E1C1A'",
     "(e.currentTarget as HTMLDivElement).style.background = '#F8F7F5'"),
    ("background: '#FFF'",     "background: '#FFFFFF'"),
    ("background: '#111'",     "background: '#111111'"),
    # Drawer / modal text that was cream on white
    ("color: '#F8F7F5', margin: '0 0 8px' }}>Delete this Dreamer?",
     "color: '#111111', margin: '0 0 8px' }}>Delete this Dreamer?"),
    ("color: '#F8F7F5', margin: '0 0 8px' }}>Delete this Maker?",
     "color: '#111111', margin: '0 0 8px' }}>Delete this Maker?"),
    ("color: 'rgba(248,247,245,0.4)', margin: '0 0 20px'",
     "color: '#555250', margin: '0 0 20px'"),
    ("color: 'rgba(248,247,245,0.4)', margin: '0 0 8px' }}>Type DELETE",
     "color: '#555250', margin: '0 0 8px' }}>Type DELETE"),
    ("color: 'rgba(248,247,245,0.4)', cursor: 'pointer' }}>Cancel",
     "color: '#555250', cursor: 'pointer' }}>Cancel"),
    ("color: 'rgba(248,247,245,0.4)', fontSize: 18 }}>✕",
     "color: '#888580', fontSize: 18 }}>✕"),
    ("color: 'rgba(248,247,245,0.4)', letterSpacing: '0.2em'",
     "color: '#888580', letterSpacing: '0.2em'"),
    ("color: 'rgba(248,247,245,0.4)', letterSpacing: '0.25em'",
     "color: '#888580', letterSpacing: '0.25em'"),
    ("color: 'rgba(248,247,245,0.4)', whiteSpace: 'nowrap'",
     "color: '#888580', whiteSpace: 'nowrap'"),
    ("color: 'rgba(248,247,245,0.4)', margin: '8px 0 0'",
     "color: '#888580', margin: '8px 0 0'"),
    ("background: '#1E1C1A', border: 'none', borderRadius: 8",
     "background: '#F0EEE8', border: 'none', borderRadius: 8"),
    # Stats mini-cards in drawer
    ("background: '#0C0A09', borderRadius: 8",
     "background: '#F0EEE8', borderRadius: 8"),
    # Table headers
    ("background: '#0C0A09' }}>",  "background: '#F8F7F5' }}>"),
    # Search inputs
    ("color: '#F8F7F5', padding: '8px 0', outline: 'none' }}",
     "color: '#111111', padding: '8px 0', outline: 'none' }}"),
    ("color: '#F8F7F5', padding: '6px 0', outline: 'none'",
     "color: '#111111', padding: '6px 0', outline: 'none'"),
    # Empty states
    ("color: 'rgba(248,247,245,0.4)' }}>No Dreamers found.",
     "color: '#888580' }}>No Dreamers found."),
    ("color: 'rgba(248,247,245,0.4)' }}>No Makers found.",
     "color: '#888580' }}>No Makers found."),
    ("color: 'rgba(248,247,245,0.4)' }}>No active",
     "color: '#888580' }}>No active"),
    # Shimmer track colors
    ("background: '#1E1C1A', borderRadius: 3",
     "background: '#E2DED8', borderRadius: 3"),
    # Drawer backgrounds
    ("background: '#161412', borderLeft: '1px solid #E2DED8'",
     "background: '#FFFFFF', borderLeft: '1px solid #E2DED8'"),
    ("background: '#161412', borderRadius: 16, padding: 28",
     "background: '#FFFFFF', borderRadius: 16, padding: 28"),
    ("background: '#161412', border: '1px solid rgba(248,247,245,0.1)', borderRadius: 14",
     "background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14"),
    ("background: '#161412', border: '1px solid rgba(248,247,245,0.1)', borderRadius: 12",
     "background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12"),
    ("background: '#161412', border: '1px solid rgba(248,247,245,0.1)', borderRadius: 12, padding: 48",
     "background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 48"),
    ("background: '#161412', border: '1px solid rgba(248,247,245,0.1)', borderRadius: 12, padding: 60",
     "background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 60"),
    ("background: '#161412', border: '1px solid rgba(248,247,245,0.1)', borderRadius: 12, overflow: 'auto'",
     "background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, overflow: 'auto'"),
    ("background: '#161412', border: '1px solid rgba(248,247,245,0.1)', borderRadius: 12, overflow: 'hidden'",
     "background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, overflow: 'hidden'"),
    ("background: '#161412', border: '1px solid rgba(248,247,245,0.1)', borderRadius: 14, padding: 20, marginBottom: 20",
     "background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14, padding: 20, marginBottom: 20"),
    ("background: '#161412', border: '1px solid rgba(248,247,245,0.1)', borderRadius: 14, padding: 24",
     "background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14, padding: 24"),
    ("background: '#161412', border: '1px solid rgba(248,247,245,0.1)', borderRadius: 14, padding: 24, marginBottom: 20",
     "background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14, padding: 24, marginBottom: 20"),
    # Featured page dark panels
    ("background: '#161412', border: '1px solid #C9A84C'",
     "background: '#FFFEF8', border: '1px solid #C9A84C'"),
    ("background: '#0C0A09', borderRadius: 8, cursor: 'pointer'",
     "background: '#F8F7F5', borderRadius: 8, cursor: 'pointer'"),
    ("background: '#0C0A09', border: '1px solid rgba(248,247,245,0.1)'",
     "background: '#F0EEE8', border: '1px solid #E2DED8'"),
    # Flagged messages
    ("background: '#161412', border: '1px solid #FFEBEE'",
     "background: '#FFFBFB', border: '1px solid #FFEBEE'"),
    ("background: '#161412', border: '1px solid rgba(248,247,245,0.1)', borderLeft: '3px solid #9B4545'",
     "background: '#FFFBFB', border: '1px solid #FFEBEE', borderLeft: '3px solid #9B4545'"),
    # Image card
    ("border: '1px solid rgba(248,247,245,0.1)', background: '#0C0A09'",
     "border: '1px solid #E2DED8', background: '#F8F7F5'"),
    # Reject modal dark buttons
    ("background: rejectReason === r ? '#111' : '#F4F1EC', color: rejectReason === r ? '#F8F7F5' : '#111'",
     "background: rejectReason === r ? '#111111' : '#F4F1EC', color: rejectReason === r ? '#FFFFFF' : '#111111'"),
    # MRR card
    ("background: '#FFFEF8', border: '1px solid #E2DED8', borderRadius: 10",
     "background: '#FFFEF8', border: '1px solid #C9A84C', borderRadius: 10"),
    # Subscriptions table header
    ("background: '#0C0A09'",  "background: '#F8F7F5'"),
]

changed = 0
for page in PAGES:
    path = os.path.join(BASE, page)
    if not os.path.exists(path):
        print(f"  SKIP (not found): {page}")
        continue
    with open(path, 'r') as f:
        c = f.read()
    original = c
    for old, new in REPLACEMENTS:
        c = c.replace(old, new)
    if c != original:
        with open(path, 'w') as f:
            f.write(c)
        changed += 1
        print(f"✓ {page}")
    else:
        print(f"  (no changes) {page}")

print(f"\nDone — {changed} files updated")
