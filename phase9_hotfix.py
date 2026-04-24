"""
PHASE 9 HOTFIX — TypeScript type error in admin/preview/page.tsx line 72

Error: 'SlottedVendor | AvailableVendor' is not assignable to 'AvailableVendor'
       Property 'tier' is missing in type 'SlottedVendor'

Cause: removeFromSlot() added a SlottedVendor (no 'tier' field) back into
available[] which is typed as AvailableVendor[] (requires 'tier').

Fix: merge both interfaces into a single Vendor interface where display_order
is optional. SlottedVendor = Vendor & { display_order: number }.
AvailableVendor = Vendor. Both are compatible.

Run from: /workspaces/tdw-2
Command:  python3 phase9_hotfix.py
"""

PATH = 'web/app/admin/preview/page.tsx'
with open(PATH, 'r') as f:
    src = f.read()

OLD = """interface SlottedVendor { id: string; name: string; category: string; city: string; display_order: number; }
interface AvailableVendor { id: string; name: string; category: string; city: string; tier: string; }"""

NEW = """// Single interface covers both slotted and available states.
// display_order is optional so AvailableVendors (without a slot) still satisfy it.
interface Vendor { id: string; name: string; category: string; city: string; tier: string; display_order?: number; }
type SlottedVendor   = Vendor & { display_order: number };
type AvailableVendor = Vendor;"""

if OLD in src:
    src = src.replace(OLD, NEW)
    with open(PATH, 'w') as f:
        f.write(src)
    print('✓ Fixed: SlottedVendor/AvailableVendor type conflict resolved')
    print('\nNext: git add -A && git commit -m "Hotfix: TypeScript type error in admin preview page" && git push')
elif NEW in src:
    print('✓ Already fixed — nothing to do.')
else:
    print('✗ Pattern not found — check admin/preview/page.tsx manually.')
