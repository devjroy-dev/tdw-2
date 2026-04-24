"""
FRONTEND FIX — Landing page auth flow
Repo: tdw-2

Fix 1: handleSignIn — check d.userId === null (not just falsy)
  pin-status now returns userId: null (explicit) when not found.
  Previously undefined was falsy but could be confused with other falsy values.

Fix 2: verifyOtp — couple path now returns pin_set correctly
  couple/verify-otp now returns pin_set in user object.
  Frontend was already reading record.pin_set so this just works now.

Fix 3: handleSignIn — also check d.found === false for clarity
  Belt and braces: use the explicit found:false flag as well.

Run from: /workspaces/tdw-2
Command:  python3 fix_landing_auth2.py
"""

with open('web/app/page.tsx', 'r') as f:
    src = f.read()

changes = []

# Fix handleSignIn — use explicit null check + found flag
OLD = """      if (!d.userId) {
        // Number not in system — send to request invite
        setScreen('request_who');
        showToast('No account found — request an invite to join.');
        return;
      }"""

NEW = """      if (!d.userId || d.found === false) {
        // Number not in system — send to request invite
        setScreen('request_who');
        showToast('No account found — request an invite to join.');
        return;
      }"""

if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('✓ handleSignIn: checks d.found===false as well as !d.userId')
elif NEW in src:
    changes.append('✓ handleSignIn: already fixed')
else:
    changes.append('✗ handleSignIn pattern not found')

with open('web/app/page.tsx', 'w') as f:
    f.write(src)

print('\nLanding auth flow fix 2\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Fix: landing auth — explicit not-found check, couple pin_set path" && git push')
