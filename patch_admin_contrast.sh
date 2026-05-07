#!/bin/bash
# patch_admin_contrast.sh
# Fixes: black text on black background across ALL admin pages
# Root cause: color: '#111111' copied alongside background: '#111111' everywhere
# Fix: replace color: '#111111' with color: '#F8F7F5' wherever background is '#111111'
# Strategy: sed pass on all admin page.tsx and layout.tsx files
# Run from: /workspaces/tdw-2

set -e

ADMIN_DIR="web/app/admin"

echo "=== SAFETY CHECKS ==="

if [ ! -d "$ADMIN_DIR" ]; then
  echo "ERROR: $ADMIN_DIR not found. Are you in /workspaces/tdw-2?"
  exit 1
fi

COUNT=$(grep -rn "background: '#111111'.*color: '#111111'\|color: '#111111'.*background: '#111111'" "$ADMIN_DIR" 2>/dev/null | wc -l)
echo "Found $COUNT black-on-black instances across admin pages"

if [ "$COUNT" -eq 0 ]; then
  echo "ERROR: No instances found — already fixed or wrong directory."
  exit 1
fi

echo "Safety checks passed."
echo ""
echo "=== APPLYING PATCH ==="

# Get all admin tsx files
FILES=$(find "$ADMIN_DIR" -name "*.tsx" | sort)

FIXED=0
for FILE in $FILES; do
  BEFORE=$(grep -c "background: '#111111'.*color: '#111111'\|color: '#111111'.*background: '#111111'" "$FILE" 2>/dev/null || true)
  if [ "$BEFORE" -gt 0 ]; then
    echo "  Patching $FILE ($BEFORE instances)..."
    
    # Fix pattern 1: background: '#111111', color: '#111111' 
    # Replace color: '#111111' with color: '#F8F7F5' only in lines that also have background: '#111111'
    # We use perl for reliable in-place multi-pattern replacement
    perl -i -pe "
      if (/background: '#111111'/) {
        s/color: '#111111'/color: '#F8F7F5'/g
      }
    " "$FILE"
    
    FIXED=$((FIXED + BEFORE))
  fi
done

echo ""
echo "=== VERIFICATION ==="
REMAINING=$(grep -rn "background: '#111111'.*color: '#111111'\|color: '#111111'.*background: '#111111'" "$ADMIN_DIR" 2>/dev/null | wc -l)
echo "Remaining black-on-black instances: $REMAINING"

if [ "$REMAINING" -gt 0 ]; then
  echo "WARNING — unfixed instances:"
  grep -rn "background: '#111111'.*color: '#111111'\|color: '#111111'.*background: '#111111'" "$ADMIN_DIR" 2>/dev/null
else
  echo "✓ All black-on-black instances fixed."
fi

echo ""
echo "Fixed $FIXED instances across admin pages."
echo ""
echo "=== SPOT CHECK — makers page line 11 ==="
sed -n '11p' "$ADMIN_DIR/makers/page.tsx"
echo ""
echo "=== SPOT CHECK — dashboard page line 22 ==="
sed -n '22p' "$ADMIN_DIR/dashboard/page.tsx"
echo ""
echo "=== DONE ==="
echo "This is a PWA change — needs git commit + push to deploy via Vercel."
echo "Run:"
echo "  git add web/app/admin/"
echo "  git commit -m 'fix: admin contrast — cream text on dark backgrounds across all pages'"
echo "  git push"
echo ""
echo "NOTE: Vercel PWA builds are failing (known P2 bug). Dev may need to deploy manually."
echo "For immediate testing: npm run dev in /workspaces/tdw-2/web"
