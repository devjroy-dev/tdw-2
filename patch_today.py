#!/usr/bin/env python3
"""
TDW V5 — patch_today.py
Wires the ✦ AI pill in today.tsx to navigate to DreamAi.
Also wires the PLAN pill to navigate to Plan tab.

Run from tdw-2 repo root:
    python3 zip2/patch_today.py
"""

import shutil, sys

TARGET = "app/(couple)/today.tsx"
BACKUP = "app/(couple)/today.tsx.bak"

print(f"Reading {TARGET}...")
with open(TARGET, "r", encoding="utf-8") as f:
    content = f.read()
print(f"  {len(content)} chars read.")

shutil.copy(TARGET, BACKUP)
print(f"  Backup saved to {BACKUP}")

# Anchor: the exact unwired pill group in today.tsx
OLD = """          <TouchableOpacity style={[styles.pill, styles.pillActive]}>
            <Text style={[styles.pillText, styles.pillTextActive]}>PLAN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pillAi}>
            <Text style={styles.pillAiText}>✦ AI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pill}>
            <Text style={styles.pillText}>DISCOVER</Text>
          </TouchableOpacity>"""

NEW = """          <TouchableOpacity style={[styles.pill, styles.pillActive]} onPress={() => router.replace('/(couple)/plan')}>
            <Text style={[styles.pillText, styles.pillTextActive]}>PLAN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pillAi} onPress={() => router.replace('/(couple)/dreamai')}>
            <Text style={styles.pillAiText}>✦ AI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pill}>
            <Text style={styles.pillText}>DISCOVER</Text>
          </TouchableOpacity>"""

if OLD not in content:
    print("ERROR: Could not find pill nav anchor in today.tsx. File may have shifted.")
    sys.exit(1)

content = content.replace(OLD, NEW, 1)
print("  ✓ AI pill wired to dreamai. PLAN pill wired to plan.")

# Check router is imported
if "router" not in content:
    print("  ✗ WARNING: 'router' not imported in today.tsx — add to expo-router import manually.")
else:
    print("  ✓ router already imported.")

with open(TARGET, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nDone. Backup at {BACKUP}")
print("Next: git add -A && git commit -m 'V5: wire AI pill in today.tsx' && git push origin main && npm run web")
