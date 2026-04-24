"""
HOTFIX — page.tsx line 547 TypeScript error
'screen === entry' inside a block that already guards screen !== entry.
Remove the dead null check.

Run from: /workspaces/tdw-2
Command:  python3 fix_landing_ts.py
"""

with open('web/app/page.tsx', 'r') as f:
    src = f.read()

OLD = "            {screen === 'entry' && null /* entry handled above */}"
NEW = "            {/* entry screen handled by bottom strip above */}"

if OLD in src:
    src = src.replace(OLD, NEW)
    with open('web/app/page.tsx', 'w') as f:
        f.write(src)
    print('✓ Fixed: dead entry comparison removed')
    print('\nNext: git add -A && git commit -m "Hotfix: remove dead screen===entry comparison in page.tsx" && git push')
else:
    print('✗ Pattern not found — already fixed or line differs')
    # Show context around the area
    idx = src.find("entry handled above")
    if idx > 0:
        print(f'Found nearby at: {repr(src[idx-50:idx+80])}')
