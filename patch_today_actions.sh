#!/bin/bash
# patch_today_actions.sh
# Restores quick action wiring and DISCOVER pill from V8.1
# Run from: /workspaces/tdw-2

set -e
FILE="app/(couple)/today.tsx"

echo "=== SAFETY CHECKS ==="
if [ ! -f "$FILE" ]; then echo "ERROR: $FILE not found."; exit 1; fi
if ! grep -q "onTap: () => {}" "$FILE"; then echo "ERROR: Pattern not found."; exit 1; fi
echo "Checks passed."

python3 << 'PYEOF'
content = open('app/(couple)/today.tsx', 'r').read()

# Fix 1: Quick actions
old_actions = """  const quickActions = [
    { label: '+ Expense', icon: '₹', onTap: () => {} },
    { label: '+ Task',    icon: '✓', onTap: () => {} },
    { label: 'Family',   icon: '◎', onTap: () => router.push('/(couple)/circle') },
    { label: '+ Muse',   icon: '✦', onTap: () => {} },
    { label: 'Find Makers', icon: '⌕', onTap: () => {}, coming: true },
  ];"""

new_actions = """  const quickActions = [
    { label: '+ Expense', icon: '₹', onTap: () => router.push({ pathname: '/(couple)/plan', params: { tab: 'money', action: 'add-expense' } } as any) },
    { label: '+ Task',    icon: '✓', onTap: () => router.push({ pathname: '/(couple)/plan', params: { tab: 'tasks', action: 'add-task' } } as any) },
    { label: 'Family',   icon: '◎', onTap: () => router.push('/(couple)/circle') },
    { label: '+ Muse',   icon: '✦', onTap: () => router.push({ pathname: '/(couple)/plan', params: { tab: 'muse' } } as any) },
    { label: 'Find Makers', icon: '⌕', onTap: () => {}, coming: true },
  ];"""

# Fix 2: DISCOVER pill in loading state
old_discover_loading = """            <View style={styles.pill}><Text style={styles.pillText}>DISCOVER</Text></View>"""
new_discover_loading = """            <TouchableOpacity style={styles.pill} onPress={() => router.push('/(couple)/discover')}><Text style={styles.pillText}>DISCOVER</Text></TouchableOpacity>"""

# Fix 3: DISCOVER pill in main render
old_discover_main = """          <TouchableOpacity style={styles.pill}>
            <Text style={styles.pillText}>DISCOVER</Text>
          </TouchableOpacity>"""
new_discover_main = """          <TouchableOpacity style={styles.pill} onPress={() => router.push('/(couple)/discover')}>
            <Text style={styles.pillText}>DISCOVER</Text>
          </TouchableOpacity>"""

if old_actions not in content:
    print("ERROR: quick actions pattern not found.")
    exit(1)

content = content.replace(old_actions, new_actions, 1)
content = content.replace(old_discover_loading, new_discover_loading, 1)
content = content.replace(old_discover_main, new_discover_main, 1)

open('app/(couple)/today.tsx', 'w').write(content)
print("All patches applied.")
PYEOF

echo ""
echo "=== VERIFICATION ==="
grep -n "onTap\|DISCOVER.*push\|discover.*push" "$FILE" | head -10
echo ""
echo "=== DONE ==="
echo "Run:"
echo "  git add app/\(couple\)/today.tsx"
echo "  git commit -m 'fix: wire quick actions and DISCOVER pill in today.tsx'"
echo "  git push"
echo "  eas update --branch production --message 'fix: quick actions and discover pill wired'"
