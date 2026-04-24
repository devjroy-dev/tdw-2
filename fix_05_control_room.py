import os, shutil

BASE = '/workspaces/tdw-2/web/app/admin'

# ── 1. Create control room directory and copy the page ─────────────────────────
cr_dir = os.path.join(BASE, 'control-room')
os.makedirs(cr_dir, exist_ok=True)

# The page file should be in the same folder as this script
script_dir = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(script_dir, 'control_room_page.tsx')

if os.path.exists(src):
    shutil.copy(src, os.path.join(cr_dir, 'page.tsx'))
    print("✓ admin/control-room/page.tsx — created")
else:
    print(f"✗ Source file not found at: {src}")
    print("  Make sure control_room_page.tsx is in the same folder as this script")
    exit(1)

# ── 2. Update admin nav ────────────────────────────────────────────────────────
layout_path = os.path.join(BASE, 'layout.tsx')
with open(layout_path, 'r') as f:
    c = f.read()

# Check if control-room is already in nav
if '/admin/control-room' in c:
    print("  (Control Room already in nav)")
else:
    # Add Control Room to OVERVIEW group
    old = "{ group: 'OVERVIEW', items: [\n    { label: 'Command Centre', path: '/admin/dashboard', icon: '◈' },\n  ]},"
    new = "{ group: 'OVERVIEW', items: [\n    { label: 'Command Centre', path: '/admin/dashboard', icon: '◈' },\n    { label: 'Control Room', path: '/admin/control-room', icon: '◐' },\n  ]},"

    if old in c:
        c = c.replace(old, new)
        with open(layout_path, 'w') as f:
            f.write(c)
        print("✓ admin/layout.tsx — Control Room added to nav")
    else:
        # Try the original single-item format
        old2 = "{ group: 'OVERVIEW', items: [{ label: 'Command Centre', path: '/admin/dashboard', icon: '◈' }]},"
        new2 = "{ group: 'OVERVIEW', items: [\n    { label: 'Command Centre', path: '/admin/dashboard', icon: '◈' },\n    { label: 'Control Room', path: '/admin/control-room', icon: '◐' },\n  ]},"
        if old2 in c:
            c = c.replace(old2, new2)
            with open(layout_path, 'w') as f:
                f.write(c)
            print("✓ admin/layout.tsx — Control Room added to nav")
        else:
            print("  Could not find nav pattern — add manually:")
            print("  In layout.tsx, add: { label: 'Control Room', path: '/admin/control-room', icon: '◐' }")

# ── Also add the Cover Placement to nav if not already there ───────────────────
with open(layout_path, 'r') as f:
    c = f.read()

if '/admin/cover' not in c:
    old_platform = "{ group: 'PLATFORM', items: [\n    { label: 'Messages', path: '/admin/messages', icon: '💬' },"
    new_platform = "{ group: 'PLATFORM', items: [\n    { label: 'Cover Placement', path: '/admin/cover', icon: '⬡' },\n    { label: 'Messages', path: '/admin/messages', icon: '💬' },"
    if old_platform in c:
        c = c.replace(old_platform, new_platform)
        with open(layout_path, 'w') as f:
            f.write(c)
        print("✓ admin/layout.tsx — Cover Placement added to nav")
    else:
        print("  Note: Cover Placement may already be in nav or nav structure differs")
else:
    print("  (Cover Placement already in nav)")

print("\nDone. Run: git add -A && git commit -m 'Admin: Control Room + Cover Placement in nav' && git push")
