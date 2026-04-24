"""
FIX — Landing page redirects after auth go to app.thedreamwedding.in
Repo: tdw-2

After OTP verify or sign-in PIN check, the landing page was doing
router.push('/vendor/pin-login') which stays on thedreamwedding.in
(no vendor routes there) and hits the v1 retirement page.

Fix: use window.location.href with the explicit app domain.

Run from: /workspaces/tdw-2
Command:  python3 fix_landing_redirect.py
"""

APP = 'https://app.thedreamwedding.in'

with open('web/app/page.tsx', 'r') as f:
    src = f.read()

changes = []

# verifyOtp redirect
OLD1 = f"      window.location.href = pinSet\n        ? (isVendor ? '{APP}/vendor/pin-login' : '{APP}/couple/pin-login')\n        : (isVendor ? '{APP}/vendor/pin' : '{APP}/couple/pin');"

if OLD1 in src:
    changes.append('✓ verifyOtp redirect already points to app domain')
else:
    # Try applying
    OLD_ROUTER = "      router.push(pinSet\n        ? (isVendor ? '/vendor/pin-login' : '/couple/pin-login')\n        : (isVendor ? '/vendor/pin' : '/couple/pin'));"
    NEW_HREF = f"      window.location.href = pinSet\n        ? (isVendor ? '{APP}/vendor/pin-login' : '{APP}/couple/pin-login')\n        : (isVendor ? '{APP}/vendor/pin' : '{APP}/couple/pin');"
    if OLD_ROUTER in src:
        src = src.replace(OLD_ROUTER, NEW_HREF)
        changes.append('✓ verifyOtp redirect → app.thedreamwedding.in')
    else:
        changes.append('✗ verifyOtp redirect pattern not found')

# handleSignIn redirect
OLD2 = f"        window.location.href = isVendor ? '{APP}/vendor/pin-login' : '{APP}/couple/pin-login';"
if OLD2 in src:
    changes.append('✓ handleSignIn redirect already points to app domain')
else:
    OLD_R2 = "        router.push(isVendor ? '/vendor/pin-login' : '/couple/pin-login');"
    NEW_H2 = f"        window.location.href = isVendor ? '{APP}/vendor/pin-login' : '{APP}/couple/pin-login';"
    if OLD_R2 in src:
        src = src.replace(OLD_R2, NEW_H2)
        changes.append('✓ handleSignIn redirect → app.thedreamwedding.in')
    else:
        changes.append('✗ handleSignIn redirect pattern not found')

with open('web/app/page.tsx', 'w') as f:
    f.write(src)

print('\nLanding redirect fix\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Fix: post-auth redirects go to app.thedreamwedding.in not v1" && git push')
