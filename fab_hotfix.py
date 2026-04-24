"""
FAB HOTFIX — Module not found: Can't resolve '@/app/components/DreamAiFAB'
Repo: tdw-2

The @ alias in this project maps to web/ (tsconfig: "@/*": ["./*"]).
So @/app/components/DreamAiFAB should resolve to web/app/components/DreamAiFAB.
However Vercel's build was failing to resolve the alias from inside layout files.

Fix: use relative imports instead.
  vendor/layout.tsx:  "../components/DreamAiFAB"
  couple/layout.tsx:  "../components/DreamAiFAB"

Run from: /workspaces/tdw-2
Command:  python3 fab_hotfix.py
"""

changes = []

with open('web/app/vendor/layout.tsx', 'r') as f:
    src = f.read()
OLD = 'import DreamAiFAB from "@/app/components/DreamAiFAB";'
NEW = 'import DreamAiFAB from "../components/DreamAiFAB";'
if OLD in src:
    src = src.replace(OLD, NEW)
    with open('web/app/vendor/layout.tsx', 'w') as f: f.write(src)
    changes.append('✓ vendor/layout.tsx — relative import applied')
elif NEW in src:
    changes.append('✓ vendor/layout.tsx — already fixed')
else:
    changes.append('✗ vendor/layout.tsx — pattern not found, check manually')

with open('web/app/couple/layout.tsx', 'r') as f:
    src = f.read()
OLD = "import DreamAiFAB from '@/app/components/DreamAiFAB';"
NEW = "import DreamAiFAB from '../components/DreamAiFAB';"
if OLD in src:
    src = src.replace(OLD, NEW)
    with open('web/app/couple/layout.tsx', 'w') as f: f.write(src)
    changes.append('✓ couple/layout.tsx — relative import applied')
elif NEW in src:
    changes.append('✓ couple/layout.tsx — already fixed')
else:
    changes.append('✗ couple/layout.tsx — pattern not found, check manually')

print('\nFAB import hotfix — complete\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Hotfix: DreamAiFAB relative import — resolves Vercel module not found" && git push')
