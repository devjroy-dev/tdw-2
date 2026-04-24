"""
HOTFIX — Landing page: remove slide blur, make strip glassy
Run from: /workspaces/tdw-2
Command:  python3 fix_landing_glass.py
"""

with open('web/app/page.tsx', 'r') as f:
    src = f.read()

changes = []

# 1. Remove blur from carousel slides entirely
OLD_BLUR = """          filter: screen !== 'exploring' ? 'blur(4px)' : 'none',
          transform: 'scale(1.04)', // slight scale to hide blur edges"""
NEW_BLUR = """          filter: 'none',"""

if OLD_BLUR in src:
    src = src.replace(OLD_BLUR, NEW_BLUR)
    changes.append('✓ Slide blur removed — images sharp again')
else:
    changes.append('✗ Slide blur pattern not found')

# 2. Make the strip background more transparent / glassy
OLD_BG = "              background: 'rgba(12,10,9,0.75)',"
NEW_BG = "              background: 'rgba(12,10,9,0.35)',"

if OLD_BG in src:
    src = src.replace(OLD_BG, NEW_BG)
    changes.append('✓ Strip background made glassy (0.35 opacity)')
else:
    changes.append('✗ Strip background pattern not found')

# 3. Also reduce the dark overlay on the main page so images show through
OLD_OVERLAY = "        <div style={{ ...S, zIndex: 3, background: 'rgba(12,10,9,0.35)', pointerEvents: 'none' }} />"
NEW_OVERLAY = "        <div style={{ ...S, zIndex: 3, background: 'rgba(12,10,9,0.15)', pointerEvents: 'none' }} />"

if OLD_OVERLAY in src:
    src = src.replace(OLD_OVERLAY, NEW_OVERLAY)
    changes.append('✓ Dark overlay lightened so images show through')
else:
    changes.append('✗ Overlay pattern not found')

with open('web/app/page.tsx', 'w') as f:
    f.write(src)

print('\nLanding glass fix\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Fix: landing page — no slide blur, glassy strip, lighter overlay" && git push')
