#!/bin/bash
# Phase 1 — Archive old scaffold files
# Run from /workspaces/tdw-2 BEFORE deploying the ZIP
# Safe — 2>/dev/null means no error if file doesn't exist

echo "=== TDW Native Phase 1: Archiving old scaffold ==="

mkdir -p archive/old-scaffold
mkdir -p archive/old-scaffold/planner-components

# app/ scaffold files
mv app/swipe.tsx archive/old-scaffold/ 2>/dev/null
mv app/swipe.tsx.backup archive/old-scaffold/ 2>/dev/null
mv app/home.tsx archive/old-scaffold/ 2>/dev/null
mv app/vendor-dashboard.tsx archive/old-scaffold/ 2>/dev/null
mv app/vendor-dashboard.tsx.backup2 archive/old-scaffold/ 2>/dev/null
mv app/bts-planner.tsx archive/old-scaffold/ 2>/dev/null
mv app/bts-planner.tsx.backup archive/old-scaffold/ 2>/dev/null
mv app/inquiry.tsx archive/old-scaffold/ 2>/dev/null
mv app/inquiry.tsx.backup archive/old-scaffold/ 2>/dev/null
mv app/access-gate.tsx archive/old-scaffold/ 2>/dev/null
mv app/compare.tsx archive/old-scaffold/ 2>/dev/null
mv app/curated-suggestions.tsx archive/old-scaffold/ 2>/dev/null
mv app/destination-weddings.tsx archive/old-scaffold/ 2>/dev/null
mv app/filter.tsx archive/old-scaffold/ 2>/dev/null
mv app/get-inspired.tsx archive/old-scaffold/ 2>/dev/null
mv app/look-book.tsx archive/old-scaffold/ 2>/dev/null
mv app/lookalike.tsx archive/old-scaffold/ 2>/dev/null
mv app/luxury-browse.tsx archive/old-scaffold/ 2>/dev/null
mv app/messaging.tsx archive/old-scaffold/ 2>/dev/null
mv app/modal.tsx archive/old-scaffold/ 2>/dev/null
mv app/moodboard.tsx archive/old-scaffold/ 2>/dev/null
mv app/notifications.tsx archive/old-scaffold/ 2>/dev/null
mv app/payment-success.tsx archive/old-scaffold/ 2>/dev/null
mv app/payment.tsx archive/old-scaffold/ 2>/dev/null
mv app/profile.tsx archive/old-scaffold/ 2>/dev/null
mv app/special-offers.tsx archive/old-scaffold/ 2>/dev/null
mv app/spotlight.tsx archive/old-scaffold/ 2>/dev/null
mv app/user-type.tsx archive/old-scaffold/ 2>/dev/null
mv app/vendor-preview.tsx archive/old-scaffold/ 2>/dev/null
mv app/vendor-profile.tsx archive/old-scaffold/ 2>/dev/null
mv app/vendor-onboarding.tsx archive/old-scaffold/ 2>/dev/null
mv app/vendor-login.tsx archive/old-scaffold/ 2>/dev/null
mv app/wedding-website.tsx archive/old-scaffold/ 2>/dev/null

# Tool components
mv app/BudgetTool.tsx archive/old-scaffold/ 2>/dev/null
mv app/ChecklistTool.tsx archive/old-scaffold/ 2>/dev/null
mv app/DecisionLogTool.tsx archive/old-scaffold/ 2>/dev/null
mv app/DreamAiTool.tsx archive/old-scaffold/ 2>/dev/null
mv app/GuestsTool.tsx archive/old-scaffold/ 2>/dev/null
mv app/MyVendorsTool.tsx archive/old-scaffold/ 2>/dev/null
mv app/PaymentsTool.tsx archive/old-scaffold/ 2>/dev/null
mv app/RegistryTool.tsx archive/old-scaffold/ 2>/dev/null
mv app/WebsiteTool.tsx archive/old-scaffold/ 2>/dev/null

# Components
mv components/planner archive/old-scaffold/planner-components 2>/dev/null
mv components/BottomNav.tsx archive/old-scaffold/ 2>/dev/null
mv components/DreamAiFab.tsx archive/old-scaffold/ 2>/dev/null
mv components/SkeletonLoader.tsx archive/old-scaffold/ 2>/dev/null
mv components/hello-wave.tsx archive/old-scaffold/ 2>/dev/null
mv components/parallax-scroll-view.tsx archive/old-scaffold/ 2>/dev/null

echo "=== Phase 1 complete. Scaffold archived. ==="
echo "Files kept: components/external-link.tsx, haptic-tab.tsx, themed-text.tsx, themed-view.tsx, ui/, hooks/"
echo ""
echo "Now deploy the ZIP:"
echo "  unzip -o tdw-native-phase1-2-3.zip && cp -r deploy/* . && rm -rf deploy tdw-native-phase1-2-3.zip"
