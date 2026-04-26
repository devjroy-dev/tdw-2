#!/bin/bash
# Run from the ROOT of tdw-2 repo
# Usage: bash session21_patch/apply.sh

set -e
PATCH_DIR="$(dirname "$0")"
REPO_ROOT="$(pwd)"

echo "Applying Session 21 patches from $PATCH_DIR to $REPO_ROOT..."

cp "$PATCH_DIR/web/app/vendor/discovery/dash/page.tsx" "$REPO_ROOT/web/app/vendor/discovery/dash/page.tsx"
echo "✓ Fix 1 — Discovery Dash endpoint"

cp "$PATCH_DIR/web/app/couple/layout.tsx" "$REPO_ROOT/web/app/couple/layout.tsx"
echo "✓ Fix 3 — Couple mode toggle pathname sync"

cp "$PATCH_DIR/web/app/vendor/today/page.tsx" "$REPO_ROOT/web/app/vendor/today/page.tsx"
echo "✓ Fix 4 — PWA restore whitelist"

echo ""
echo "All patches applied. Running commit..."
git add -A
git commit -m "Fix: Discovery Dash endpoint, couple toggle pathname sync, PWA restore whitelist"
git push
echo ""
echo "✓ Deployed."
