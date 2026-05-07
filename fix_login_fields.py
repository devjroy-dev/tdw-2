#!/usr/bin/env python3
"""Fix pin-status response shape in app/index.tsx"""

PATH = 'app/index.tsx'

with open(PATH, 'r') as f:
    content = f.read()

# Fix 1 — line 342: wrong field names for account check
content = content.replace(
    'if (!d.userId || d.found === false)',
    'if (!d.exists || d.exists === false)'
)

# Fix 2 — line 347: corrupted by previous sed — restore and fix
# Find the corrupted line and replace with correct version
import re

# Replace the corrupted line 347 entirely
content = re.sub(
    r'if \(d\.hasPin if \(d\.pin_set && d\.userId\)if \(d\.pin_set && d\.userId\) d\.exists\)',
    'if (d.hasPin && d.exists)',
    content
)

# Also handle the case where it wasn't corrupted yet
content = content.replace(
    'if (d.pin_set && d.userId)',
    'if (d.hasPin && d.exists)'
)

with open(PATH, 'w') as f:
    f.write(content)

print('✅ Done')
print('Verify:')

lines = content.split('\n')
for i, line in enumerate(lines[338:352], start=339):
    print(f'{i}: {line}')
