"""
PHASE 3 HOTFIX — React hooks rule violation in vendor/today/page.tsx
React error #310: "Rendered more hooks than during previous render"

Cause: card1Done, card2Done, card3Done useState calls were placed AFTER
two early return statements (if session===undefined / if !session).
React counts hooks in order on every render. When session is undefined
on first render → early return → only N hooks. On next render when
session loads → no early return → N+3 hooks → crash.

Fix: move the three useState calls to the top with all other state declarations,
before any early returns.

Run from: /workspaces/tdw-2
Command:  python3 phase3_hotfix.py
"""

PATH = 'web/app/vendor/today/page.tsx'
with open(PATH, 'r') as f:
    src = f.read()

OLD_BOTTOM = """  // Onboarding card completion flags (localStorage)
  const [card1Done, setCard1Done] = React.useState(false);
  const [card2Done, setCard2Done] = React.useState(false);
  const [card3Done, setCard3Done] = React.useState(
    typeof window !== 'undefined' && !!localStorage.getItem('whatsapp_activated')
  );"""

OLD_TOP = """  const [showIntroCard, setShowIntroCard]     = useState(false);
  const [introDismissed, setIntroDismissed]   = useState(false);"""

NEW_TOP = """  const [showIntroCard, setShowIntroCard]     = useState(false);
  const [introDismissed, setIntroDismissed]   = useState(false);
  // Onboarding card completion flags — must stay here, not after early returns (Rules of Hooks)
  const [card1Done, setCard1Done] = useState(false);
  const [card2Done, setCard2Done] = useState(false);
  const [card3Done, setCard3Done] = useState(
    typeof window !== 'undefined' && !!localStorage.getItem('whatsapp_activated')
  );"""

if OLD_BOTTOM not in src and NEW_TOP in src:
    print('✓ Already fixed — nothing to do.')
elif OLD_BOTTOM in src and OLD_TOP in src:
    src = src.replace(OLD_BOTTOM, '')
    src = src.replace(OLD_TOP, NEW_TOP)
    with open(PATH, 'w') as f:
        f.write(src)
    print('✓ Fixed: card1/2/3Done useState moved above early returns — React error #310 resolved')
    print('\nNext: git add -A && git commit -m "Hotfix: hooks rule violation in today page — card state above early returns" && git push')
else:
    print('✗ Pattern mismatch — file may already be patched or differs. Check manually.')
    if OLD_BOTTOM not in src: print('  (bottom pattern not found)')
    if OLD_TOP not in src:    print('  (top pattern not found)')
