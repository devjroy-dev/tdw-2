import os

BASE = '/workspaces/tdw-2/web/app'

fixes = [
    # couple/plan — amount input inside expense sheet
    (
        'couple/plan/page.tsx',
        'inputMode="numeric" placeholder="0"\n            style={{ ...fieldInput, paddingLeft: 18 }}\n            autoFocus\n            onFocus={e => { e.currentTarget.style.borderBottomColor',
        'inputMode="numeric" placeholder="0"\n            style={{ ...fieldInput, paddingLeft: 18 }}\n            onFocus={e => { e.currentTarget.style.borderBottomColor',
    ),
    # couple/plan — budget input inside set-budget sheet
    (
        'couple/plan/page.tsx',
        'inputMode="numeric" placeholder="0"\n            autoFocus\n            style={{ ...fieldInput, paddingLeft: 22, fontSize: 22 }}',
        'inputMode="numeric" placeholder="0"\n            style={{ ...fieldInput, paddingLeft: 22, fontSize: 22 }}',
    ),
    # admin/featured — search input inside Add Vendor panel
    (
        'admin/featured/page.tsx',
        'placeholder="Type a maker name\u2026" autoFocus style=',
        'placeholder="Type a maker name\u2026" style=',
    ),
]

changed = 0
for rel_path, old, new in fixes:
    path = os.path.join(BASE, rel_path)
    if not os.path.exists(path):
        print(f"  SKIP (not found): {rel_path}")
        continue
    with open(path, 'r') as f:
        c = f.read()
    if old in c:
        c = c.replace(old, new)
        with open(path, 'w') as f:
            f.write(c)
        changed += 1
        print(f"✓ {rel_path}")
    else:
        print(f"  (already fixed or not found): {rel_path}")

print(f"\nDone — {changed} files updated")
