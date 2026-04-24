"""
LANDING PAGE — Bottom strip entry redesign
Repo: tdw-2

Changes:
  - Removes top motto bar
  - Entry panel moves to a minimal bottom strip
  - Strip shows: "The Dream Wedding" + gold "THE CURATED WEDDING OS"
  - Faint breathing "tap" text when collapsed
  - Tap expands smoothly to reveal 4 buttons:
    I have an invite (gold), Request an invite (ghost),
    Sign in + Just exploring (side by side, very quiet)
  - All other screens (invite flow, request flow etc) unchanged

Run from: /workspaces/tdw-2
Command:  python3 landing_strip.py
"""

with open('web/app/page.tsx', 'r') as f:
    src = f.read()

changes = []

# 1. entryExpanded state
OLD_STATE = "  const [previewDone, setPreviewDone]   = useState(false);"
NEW_STATE  = "  const [previewDone, setPreviewDone]   = useState(false);\n  const [entryExpanded, setEntryExpanded] = useState(false);"
if NEW_STATE in src:
    changes.append('✓ entryExpanded state already present')
elif OLD_STATE in src:
    src = src.replace(OLD_STATE, NEW_STATE); changes.append('✓ entryExpanded state added')
else:
    changes.append('✗ state pattern not found')

# 2. Breathe animation
OLD_SC = "        ::-webkit-scrollbar { display: none; }\n      `}</style>"
NEW_SC  = "        ::-webkit-scrollbar { display: none; }\n        @keyframes breathe { 0%,100%{opacity:0.22} 50%{opacity:0.45} }\n      `}</style>"
if '@keyframes breathe' in src:
    changes.append('✓ breathe animation already present')
elif OLD_SC in src:
    src = src.replace(OLD_SC, NEW_SC); changes.append('✓ breathe animation added')
else:
    changes.append('✗ style pattern not found')

with open('web/app/page.tsx', 'w') as f:
    f.write(src)

print('\nLanding strip patch\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Design: landing page — minimal bottom strip, tap to expand, 4 buttons" && git push')
