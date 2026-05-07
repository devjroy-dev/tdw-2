#!/bin/bash
# patch_profile_fix.sh
# Fixes malformed closing in app/(couple)/profile.tsx
# Run from: /workspaces/tdw-2

set -e
FILE="app/(couple)/profile.tsx"

echo "=== SAFETY CHECKS ==="
if [ ! -f "$FILE" ]; then echo "ERROR: $FILE not found."; exit 1; fi

python3 << 'PYEOF'
content = open('app/(couple)/profile.tsx', 'r').read()

bad = '      </ScrollView>\n\n  );\\n}'
good = '      </ScrollView>\n    </View>\n  );\n}'

if bad not in content:
    print("ERROR: Pattern not found — already fixed or different issue.")
    exit(1)

fixed = content.replace(bad, good, 1)
open('app/(couple)/profile.tsx', 'w').write(fixed)
print("Fixed.")
PYEOF

echo ""
echo "=== VERIFICATION ==="
sed -n '249,258p' "app/(couple)/profile.tsx"
echo ""
echo "=== DONE ==="
echo "Run:"
echo "  git add app/\(couple\)/profile.tsx"
echo "  git commit -m 'fix: malformed closing in profile.tsx'"
echo "  git push"
echo "  eas update --branch production --message 'revert: frontend to V8 clean state'"
