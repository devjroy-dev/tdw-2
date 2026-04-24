import os

path = '/workspaces/tdw-2/web/app/page.tsx'

with open(path, 'r') as f:
    c = f.read()

old = "cursor: 'pointer', marginBottom: 12, touchAction: 'manipulation' }}>Send code</button>"
new = "cursor: 'pointer', marginBottom: 12, touchAction: 'manipulation' }}>{screen === 'signin' ? 'Continue' : 'Send code'}</button>"

if old in c:
    c = c.replace(old, new)
    with open(path, 'w') as f:
        f.write(c)
    print("✓ page.tsx — Sign in button now says 'Continue'")
else:
    print("  (already fixed or not found)")
