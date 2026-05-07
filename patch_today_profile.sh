#!/bin/bash
# patch_today_profile.sh
# Wires profile circle to navigate to profile screen in today.tsx
# Run from: /workspaces/tdw-2

set -e
FILE="app/(couple)/today.tsx"

echo "=== SAFETY CHECKS ==="
if [ ! -f "$FILE" ]; then echo "ERROR: $FILE not found."; exit 1; fi
echo "Checks passed."

python3 << 'PYEOF'
content = open('app/(couple)/today.tsx', 'r').read()

# Fix loading state profile circle
old1 = """          <View style={styles.profileCircle}>
            <Text style={styles.profileInitial}>{session?.name?.[0]?.toUpperCase() || 'D'}</Text>
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>"""

new1 = """          <TouchableOpacity style={styles.profileCircle} onPress={() => router.push('/(couple)/profile')}>
            <Text style={styles.profileInitial}>{session?.name?.[0]?.toUpperCase() || 'D'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>"""

# Fix main render profile circle
old2 = """        <View style={styles.profileCircle}>
          <Text style={styles.profileInitial}>{session?.name?.[0]?.toUpperCase() || 'D'}</Text>
        </View>"""

new2 = """        <TouchableOpacity style={styles.profileCircle} onPress={() => router.push('/(couple)/profile')}>
          <Text style={styles.profileInitial}>{session?.name?.[0]?.toUpperCase() || 'D'}</Text>
        </TouchableOpacity>"""

if old1 not in content:
    print("WARNING: loading state pattern not found — skipping")
else:
    content = content.replace(old1, new1, 1)
    print("Loading state profile circle wired.")

if old2 not in content:
    print("ERROR: main render profile circle pattern not found.")
    exit(1)

content = content.replace(old2, new2, 1)
print("Main render profile circle wired.")

open('app/(couple)/today.tsx', 'w').write(content)
print("Done.")
PYEOF

echo ""
echo "=== VERIFICATION ==="
grep -n "profileCircle.*onPress\|onPress.*profile\|push.*profile" "$FILE" | head -5
echo ""
echo "=== DONE ==="
echo "Run:"
echo "  git add app/\(couple\)/today.tsx"
echo "  git commit -m 'fix: wire profile circle to navigate to profile screen'"
echo "  git push"
echo "  eas update --branch production --message 'fix: profile circle and quick actions wired'"
