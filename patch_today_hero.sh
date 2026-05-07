#!/bin/bash
# patch_today_hero.sh
# Fixes: Cannot read properties of undefined (reading 'state')
# Root cause: data?.hero.state — hero not guarded with optional chain
# Fix: data?.hero?.state on all 3 occurrences in today.tsx
# Run from: /workspaces/tdw-2

set -e

FILE="app/(couple)/today.tsx"

echo "=== SAFETY CHECKS ==="

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found. Are you in /workspaces/tdw-2?"
  exit 1
fi

COUNT=$(grep -c "data?.hero\." "$FILE" || true)
echo "Found $COUNT occurrences of data?.hero. to fix"

if [ "$COUNT" -eq 0 ]; then
  echo "ERROR: Pattern not found — already fixed or wrong file."
  exit 1
fi

echo "Safety checks passed."
echo ""
echo "=== APPLYING PATCH ==="

# Fix all three occurrences
sed -i "s/data?\.hero\.state/data?.hero?.state/g" "$FILE"
sed -i "s/data?\.hero\.days_until/data?.hero?.days_until/g" "$FILE"

echo "Patch applied."
echo ""
echo "=== VERIFICATION ==="
echo "--- Lines 268-295 ---"
sed -n '268,295p' "$FILE"
echo ""
echo "--- Checking no bare data?.hero. remains ---"
REMAINING=$(grep -c "data?\.hero\." "$FILE" || true)
if [ "$REMAINING" -gt 0 ]; then
  echo "WARNING: $REMAINING unpatched occurrences remain:"
  grep -n "data?\.hero\." "$FILE"
else
  echo "✓ All occurrences fixed."
fi
echo ""
echo "=== DONE ==="
echo "Next: eas update --branch production --message 'fix: optional chain on hero in today.tsx — crash fix'"
