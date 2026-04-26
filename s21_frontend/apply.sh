#!/bin/bash
set -e
PATCH_DIR="$(dirname "$0")"
REPO="/workspaces/tdw-2"
echo "Applying Session 21 — Just Exploring frontend..."
cp "$PATCH_DIR/web/app/page.tsx" "$REPO/web/app/page.tsx"
echo "✓ page.tsx (landing page)"
cp "$PATCH_DIR/web/app/admin/layout.tsx" "$REPO/web/app/admin/layout.tsx"
echo "✓ admin/layout.tsx (nav item)"
mkdir -p "$REPO/web/app/admin/exploring"
cp "$PATCH_DIR/web/app/admin/exploring/page.tsx" "$REPO/web/app/admin/exploring/page.tsx"
echo "✓ admin/exploring/page.tsx (new admin page)"
cd "$REPO"
git add -A
git commit -m "Feat: Just Exploring editorial photo flow + admin photo management page"
git push
echo "✓ Frontend deployed."
