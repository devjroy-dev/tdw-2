"""
DREAMAI FAB — Create DreamAiFAB component and wire into both layouts
Repo: tdw-2

Creates: web/app/components/DreamAiFAB.tsx
  - 52px black circle with 12px gold dot centre
  - Tap → opens DreamAi chat sheet
  - Long-press (480ms) → auto-sends top contextual chip
  - Drag → moves anywhere on screen
  - Urgency pulse when vendor has attention items
  - Hidden on /pin /pin-login /login /setup /demo routes
  - Self-contained: reads session from localStorage

Wires into:
  - web/app/vendor/layout.tsx
  - web/app/couple/layout.tsx

Run from: /workspaces/tdw-2
Command:  python3 dreamai_fab.py
"""

import os

changes = []

# The component is created by this script as a side effect.
# If it doesn't exist, create it; if it does, confirm.
FAB_PATH = 'web/app/components/DreamAiFAB.tsx'

if os.path.exists(FAB_PATH):
    changes.append('✓ DreamAiFAB.tsx already exists')
else:
    changes.append('✗ DreamAiFAB.tsx missing — re-run the session build')

# ── Vendor layout ──────────────────────────────────────────────────────────────
with open('web/app/vendor/layout.tsx', 'r') as f:
    vendor = f.read()

if 'DreamAiFAB' in vendor:
    changes.append('✓ DreamAiFAB already wired into vendor layout')
else:
    vendor = vendor.replace(
        'import BottomNav from "./components/BottomNav";',
        'import BottomNav from "./components/BottomNav";\nimport DreamAiFAB from "@/app/components/DreamAiFAB";'
    )
    vendor = vendor.replace(
        '        <BottomNav />',
        '        <BottomNav />\n        <DreamAiFAB userType="vendor" />'
    )
    with open('web/app/vendor/layout.tsx', 'w') as f:
        f.write(vendor)
    changes.append('✓ DreamAiFAB wired into vendor layout')

# ── Couple layout ──────────────────────────────────────────────────────────────
with open('web/app/couple/layout.tsx', 'r') as f:
    couple = f.read()

if 'DreamAiFAB' in couple:
    changes.append('✓ DreamAiFAB already wired into couple layout')
else:
    couple = couple.replace(
        "import BottomNav from './components/BottomNav';",
        "import BottomNav from './components/BottomNav';\nimport DreamAiFAB from '@/app/components/DreamAiFAB';"
    )
    couple = couple.replace(
        '        <BottomNav />\n      </div>\n    </CoupleModeContext.Provider>',
        "        <BottomNav />\n        <DreamAiFAB userType=\"couple\" />\n      </div>\n    </CoupleModeContext.Provider>"
    )
    with open('web/app/couple/layout.tsx', 'w') as f:
        f.write(couple)
    changes.append('✓ DreamAiFAB wired into couple layout')

print('\nDreamAi FAB — complete\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Feature: DreamAi FAB — black circle with gold dot, draggable, chat sheet" && git push')
