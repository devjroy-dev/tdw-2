"""
HOTFIX — DreamAiFAB.tsx was never committed to git
Vercel couldn't find it: "Module not found: Can't resolve '../components/DreamAiFAB'"

The file exists locally but was untracked (??). This script:
  1. Confirms the file exists at the correct path
  2. Verifies the import paths in both layouts are correct

The real fix is just: git add -A && git commit && git push

Run from: /workspaces/tdw-2
Command:  python3 fab_commit_fix.py
"""

import os

changes = []

FAB_PATH = 'web/app/components/DreamAiFAB.tsx'

# Confirm file exists
if os.path.exists(FAB_PATH):
    changes.append(f'✓ {FAB_PATH} exists — ready to commit')
else:
    changes.append(f'✗ {FAB_PATH} MISSING — the file needs to be re-created')

# Confirm vendor layout import path
with open('web/app/vendor/layout.tsx', 'r') as f:
    vendor = f.read()
# vendor/layout.tsx is at web/app/vendor/ so ../components/ = web/app/components/ ✓
if '"../components/DreamAiFAB"' in vendor or "'../components/DreamAiFAB'" in vendor:
    changes.append('✓ Vendor layout import path correct (../components/DreamAiFAB)')
elif '@/app/components/DreamAiFAB' in vendor:
    changes.append('✓ Vendor layout uses @/ alias — also fine')
else:
    # Fix to use @/ alias which is unambiguous
    vendor = vendor.replace(
        'import DreamAiFAB from "../components/DreamAiFAB";',
        'import DreamAiFAB from "@/app/components/DreamAiFAB";'
    )
    with open('web/app/vendor/layout.tsx', 'w') as f:
        f.write(vendor)
    changes.append('✓ Vendor layout import fixed to @/ alias')

# Confirm couple layout import path
with open('web/app/couple/layout.tsx', 'r') as f:
    couple = f.read()
if "'../components/DreamAiFAB'" in couple or '"../components/DreamAiFAB"' in couple:
    changes.append('✓ Couple layout import path correct (../components/DreamAiFAB)')
elif '@/app/components/DreamAiFAB' in couple:
    changes.append('✓ Couple layout uses @/ alias — also fine')
else:
    couple = couple.replace(
        "import DreamAiFAB from '../components/DreamAiFAB';",
        "import DreamAiFAB from '@/app/components/DreamAiFAB';"
    )
    with open('web/app/couple/layout.tsx', 'w') as f:
        f.write(couple)
    changes.append('✓ Couple layout import fixed to @/ alias')

print('\nFAB commit fix\n')
for c in changes:
    print(c)

print("""
The file was untracked — Vercel never received it.
Fix: git add -A && git commit -m "Hotfix: add DreamAiFAB.tsx to repo — was untracked" && git push
""")
