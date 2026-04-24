"""
FIX — Vendor name stored in session after PIN login
Repo: tdw-2 (frontend) + dream-wedding (backend)

After PIN login, verify-pin only returned { success, userId }.
The today page showed "Good morning, Maker" instead of the vendor's name.

Backend fix (fix_verify_pin.py in dream-wedding):
  verify-pin now returns name, category, tier, phone.

Frontend fix (this file, in tdw-2):
  pin-login stores those fields in localStorage session so today page
  can read vendorName and show the correct greeting.

Run from: /workspaces/tdw-2
Command:  python3 fix_pin_session.py
"""

with open('web/app/vendor/pin-login/page.tsx', 'r') as f:
    src = f.read()

changes = []

OLD = """      if (d.success) {
        router.replace('/vendor/today');"""

NEW = """      if (d.success) {
        const updated = {
          ...session,
          id: d.userId || session.id,
          userId: d.userId || session.userId,
          vendorId: d.userId || session.vendorId,
          vendorName: d.name || session.vendorName || session.name || '',
          name: d.name || session.name || '',
          category: d.category || session.category || '',
          tier: d.tier || session.tier || '',
          pin_set: true,
        };
        localStorage.setItem('vendor_web_session', JSON.stringify(updated));
        localStorage.setItem('vendor_session', JSON.stringify(updated));
        router.replace('/vendor/today');"""

if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('✓ pin-login: vendor name/category/tier stored in session')
elif 'vendorName: d.name' in src:
    changes.append('✓ Already fixed')
else:
    changes.append('✗ Pattern not found')
    # Show context
    idx = src.find('d.success')
    if idx > 0:
        print(f'Found d.success at: {repr(src[idx:idx+80])}')

with open('web/app/vendor/pin-login/page.tsx', 'w') as f:
    f.write(src)

print('\nPin session fix\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Fix: vendor name/category/tier stored in session after PIN login" && git push')
