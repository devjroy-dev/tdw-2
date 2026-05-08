# FROST — Complete Shell Drop

This ZIP contains the complete UI shell for Frost — every screen, every component, every interaction primitive — built from the locked design tokens. After this lands, no future session needs to make aesthetic decisions. Wiring real data into placeholder slots is all that's left.

## What's in the box

### `constants/frost.ts` — single source of truth
Every color, font, type ramp value, spacing unit, radius, animation timing, and copy string. Locked. Edit values here, never inline anywhere else.

### `components/frost/` — primitives
- **FrostPane** — layered greyscale-frosted material (image + greyscale + blur)
- **UnveilCanvas** — hairline-bordered tap region with eyebrow + long-press + press-scale
- **RotatingImage** — cross-fade gallery
- **FrostCanvasShell** — universal full-bleed canvas wrapper (eyebrow + close X + safe area + bottom bar)
- **FrostDreamMessages** — three message-row primitives (AILine, PersonAction, InlineEvent)
- **FrostConfirmCard** — composite-tool confirmation primitive (Confirm/Cancel + Done state)
- **JourneyTile** — tool tile for Journey grid

### `app/(frost)/` — routes
- **`_layout.tsx`** — Stack navigator, no header, fade animations
- **`landing.tsx`** — the home: countdown + 3 boxes + Journey bar
- **`canvas/muse.tsx`** — full-bleed Muse canvas
- **`canvas/discover.tsx`** — full-bleed Discover (beta) canvas
- **`canvas/dream.tsx`** — Dream conversational canvas with composer
- **`canvas/journey.tsx`** — Journey tool grid
- **`canvas/journey/vendors.tsx`** — vendor list
- **`canvas/journey/vendor/[id].tsx`** — per-vendor profile (the heaviest screen)
- **`canvas/journey/reminders.tsx`** — personal reminders
- **`canvas/journey/receipts.tsx`** — OCR receipts filed per vendor
- **`canvas/journey/broadcast.tsx`** — phone-book broadcast
- **`canvas/journey/settings.tsx`** — single-screen settings

## Install

```bash
cd /workspaces/tdw-2

# Drop frost-shell.zip at the repo root, then:
unzip -o frost-shell.zip && cp -r deploy/* . && rm -rf deploy frost-shell.zip

# Make sure expo-blur is installed (idempotent if already there):
npm install expo-blur
```

## Preview

```bash
npx expo start --web
```

Open the URL in mobile-view Chrome (DevTools → device toolbar → iPhone 14 Pro). Then either:

- Edit `app/index.tsx` to redirect to `/(frost)/landing` (use `frost-preview-on.zip` if you have it)
- Or deep-link via Expo Go: `exp://...your-tunnel.../--/(frost)/landing`

## Test routes

From `landing`:
- Long-press MUSE box → `/canvas/muse`
- Long-press DISCOVER box → `/canvas/discover`
- Long-press DREAM box → `/canvas/dream`
- Tap "Journey" bar → `/canvas/journey`

From `journey`:
- Tap Vendors → list → tap a vendor → profile
- Tap Reminders / Receipts / Broadcast / Settings → respective subroutes

Every canvas has the standard top bar (eyebrow + close X) handled by `FrostCanvasShell`.

## What's wired (real data)
**Nothing.** This shell is structure-only. Every list and detail uses placeholder content.

## What's NOT wired (intentionally)
- The reveal animation (long-press currently does a stack-fade; full frost-lifts-and-color-floods animation comes in v1.1)
- Real Muse saves, Discover featured vendors, Dream chat, vendor list — all backend wiring deferred
- Composite tool confirmation cards (the primitive is built; wiring to actual `book_vendor` etc happens in v1.6)
- DreamAi compose bar (renders + clears input, but doesn't POST anywhere yet)

## Backend impact
**ZERO.** This is frontend-only. No `dream-wedding` ZIP is required. First backend ZIP is v1.6 when bride DreamAi gets composite tools.

## What to do next

1. Install this shell. Look at every screen on your phone. Confirm aesthetic.
2. If anything is off, **fix it in `constants/frost.ts`**. One file, one source of truth. Never inline.
3. When aesthetic is locked: build the **reveal animation** (v1.1) — `<UnveilTransition>` component that handles long-press → blur-lift + greyscale-to-color + scale-to-fullscreen.
4. After reveal animation: backend ZIP for **bride DreamAi** (v1.6) — composite tools, single-confirmation pattern, honest unknowns.
5. Then: native parity (Android greyscale via color-matrix package), production builds, App Store / Play Store.

## File count

| Category | Files |
|---|---|
| Tokens | 1 |
| Primitives | 7 |
| Routes | 12 |
| **Total** | **20 files** |

That's the entire shell.
