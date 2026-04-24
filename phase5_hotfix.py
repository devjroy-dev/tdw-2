"""
PHASE 5 HOTFIX — Syntax error in discovery/dash/page.tsx
Line 320: apostrophes inside single-quoted strings broke the build.
"You're" and "We'll" — fixed by switching to double quotes.

Run from: /workspaces/tdw-2
Command:  python3 phase5_hotfix.py
"""

PATH = 'web/app/vendor/discovery/dash/page.tsx'
with open(PATH, 'r') as f:
    src = f.read()

OLD = """        showToast(d.auto_approved
          ? '✓ You're live! Couples can discover you now.'
          : '✓ Submitted. We'll be in touch within 48 hours.');"""

NEW = """        showToast(d.auto_approved
          ? "✓ You're live! Couples can discover you now."
          : "✓ Submitted. We'll be in touch within 48 hours.");"""

if OLD in src:
    src = src.replace(OLD, NEW)
    with open(PATH, 'w') as f:
        f.write(src)
    print('✓ Fixed: apostrophes in toast strings — single quotes → double quotes')
    print('\nNext: git add -A && git commit -m "Hotfix: apostrophe syntax error in discover dash line 320" && git push')
else:
    print('✗ Pattern not found — already fixed or file differs. Check line 320 manually.')
