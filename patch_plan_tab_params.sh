#!/bin/bash
# patch_plan_tab_params.sh
# Makes plan.tsx read incoming tab param so quick actions open correct tab
# Run from: /workspaces/tdw-2

set -e
FILE="app/(couple)/plan.tsx"

echo "=== SAFETY CHECKS ==="
if [ ! -f "$FILE" ]; then echo "ERROR: $FILE not found."; exit 1; fi
if grep -q "useLocalSearchParams" "$FILE"; then echo "ERROR: already patched."; exit 1; fi
echo "Checks passed."

python3 << 'PYEOF'
content = open('app/(couple)/plan.tsx', 'r').read()

# 1. Add useLocalSearchParams to expo-router import
old_import = "import { useFocusEffect, router } from 'expo-router';"
new_import = "import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';"
if old_import not in content:
    print("ERROR: expo-router import not found.")
    exit(1)
content = content.replace(old_import, new_import, 1)

# 2. Add useEffect to react import
old_react = "import { useFocusEffect, useCallback"
new_react = "import { useFocusEffect, useCallback, useEffect"
content = content.replace(old_react, new_react, 1)

# 3. Read tab param and set activeTab on mount
old_state = "  const [activeTab, setActiveTab] = useState<Tab>('tasks');"
new_state = """  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  useEffect(() => { if (tab) setActiveTab(tab as Tab); }, [tab]);"""
if old_state not in content:
    print("ERROR: activeTab useState not found.")
    exit(1)
content = content.replace(old_state, new_state, 1)

open('app/(couple)/plan.tsx', 'w').write(content)
print("Patch applied.")
PYEOF

echo ""
echo "=== VERIFICATION ==="
grep -n "useLocalSearchParams\|useEffect.*tab\|tab.*setActiveTab" "$FILE" | head -5
echo ""
echo "=== DONE ==="
echo "Run:"
echo "  git add app/\(couple\)/plan.tsx"
echo "  git commit -m 'fix: plan.tsx reads tab param — quick actions open correct tab'"
echo "  git push"
echo "  eas update --branch production --message 'fix: quick actions open correct plan tab'"
