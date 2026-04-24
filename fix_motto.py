"""
GAP FIX — Vendor motto update
Repo: tdw-2

Changes:
  1. vendor/pin/page.tsx      — replace motto
  2. vendor/pin-login/page.tsx — replace motto

Old: "Behind every dream, there is a Maker."
New: "Every product is a catalogue. Every appointment is a sale."

Run from: /workspaces/tdw-2
Command:  python3 fix_motto.py
"""

OLD = 'Behind every dream, there is a Maker.'
NEW = 'Every product is a catalogue. Every appointment is a sale.'

changes = []

for path in [
    'web/app/vendor/pin/page.tsx',
    'web/app/vendor/pin-login/page.tsx',
]:
    with open(path, 'r') as f:
        src = f.read()
    if OLD in src:
        src = src.replace(OLD, NEW)
        with open(path, 'w') as f:
            f.write(src)
        changes.append(f'✓ Motto updated in {path}')
    else:
        changes.append(f'✗ Pattern not found in {path}')

print('\nMotivation fix complete\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Fix: vendor motto updated on pin + pin-login pages" && git push')
