#!/bin/bash
set -e
REPO="/workspaces/tdw-2"
echo "Applying exploring photos admin page fix — frontend..."
mkdir -p "$REPO/web/app/admin/exploring"
cp "$(dirname "$0")/web/app/admin/exploring/page.tsx" "$REPO/web/app/admin/exploring/page.tsx"
echo "✓ admin/exploring/page.tsx"
cd "$REPO"
git add -A
git commit -m "Fix: exploring photos admin — proper upload UX with compression and progress"
git push
echo "✓ Frontend deployed"
