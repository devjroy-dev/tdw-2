# Frost Shell v2 — Total Frost + Discover Proper + Messages

This drop is **additive** to `frost-shell.zip` (the v1 shell already installed). It overwrites a few files and adds new ones. The deltas:

## What changed

### New primitive
- **`components/frost/FrostedSurface.tsx`** — universal frosted material wrapper (button | composer | panel). Replaces white card backgrounds throughout Frost. Three modes for different intensities.

### Updated tokens
- **`constants/frost.ts`** — adds `buttonFrostTint`, `composerFrostTint`, `goldMuted` border params. Adds 5 paid `DiscoverHeroes` for the carousel. Adds Discover overlay copy. Adds animation timings for hero carousel + More overlay + swipe threshold.

### Discover canvas — fully rebuilt
- **`canvas/discover.tsx`** — full-bleed hero carousel of 5 paid spots cycling through. Small frosted gold-tinted More pill at top-right (with rotating + icon to indicate state). Tap More → frosted overlay slides in over the heroes → reveals 4 navigation buttons (Blind Swipe, My Feed, Couture, Categories) using FrostedSurface.

### Discover sub-routes (NEW)
- **`canvas/discover/blind-swipe.tsx`** — full-bleed swipe feed with the original native swipe grammar exactly preserved:
  - Vertical = next/previous vendor
  - Horizontal = next/previous photo
  - Single tap = detail overlay
  - Double tap = save to Muse with heart animation + toast
  - Down swipe with overlay open = dismiss overlay
- **`canvas/discover/feed.tsx`** — vertical scroll of curated vendors
- **`canvas/discover/couture.tsx`** — atelier reservations
- **`canvas/discover/categories.tsx`** — frosted grid of categories

### Journey rebuilt with total frost
- **`components/frost/JourneyTile.tsx`** — uses FrostedSurface instead of white card
- **`canvas/journey.tsx`** — adds Messages tile to grid (6 tiles total)
- **`canvas/journey/vendors.tsx`** — frosted rows
- **`canvas/journey/vendor/[id].tsx`** — frosted section panels
- **`canvas/journey/reminders.tsx`** — frosted rows
- **`canvas/journey/receipts.tsx`** — frosted rows
- **`canvas/journey/broadcast.tsx`** — frosted rows
- **`canvas/journey/settings.tsx`** — frosted field rows
- **`canvas/journey/messages.tsx`** — NEW. One-on-one threads with vendors. Tap a thread → vendor profile.

### Dream canvas
- **`canvas/dream.tsx`** — composer at the bottom now wrapped in FrostedSurface 'composer' mode (darker frost), not solid white. Maintains atmosphere.

## What didn't change

- Landing — already perfect, untouched
- UnveilCanvas — untouched
- RotatingImage — untouched
- FrostCanvasShell — untouched (the shell already has correct top bar handling)
- FrostDreamMessages — untouched
- FrostConfirmCard — untouched
- FrostPane — untouched

## Install

```bash
cd /workspaces/tdw-2

# Drop frost-shell-v2.zip at repo root, then:
unzip -o frost-shell-v2.zip && cp -r deploy/* . && rm -rf deploy frost-shell-v2.zip
```

No new npm dependencies. Hot-reloads instantly.

## Test routes

After deploying, browse to these in Expo web:

1. **Landing** → `/(frost)/landing` (unchanged, looks the same)
2. **Long-press Discover box** → `/(frost)/canvas/discover`
   - You should see hero carousel cycling through 5 paid spots
   - Tap "More" pill at top-right
   - Frosted overlay covers heroes, reveals 4 navigation buttons
   - Tap "Blind Swipe" → enters the gestural feed
   - Try: vertical swipe = next vendor, horizontal swipe = next photo, double-tap = save to Muse, single tap = detail overlay
3. **Tap Journey bar** → see 6 frosted tiles including new Messages
4. **Tap Messages** → frosted thread list
5. **Tap any other Journey tile** → all frosted now, no white cards anywhere
6. **Long-press Dream** → composer at bottom is darker frost panel

## Two known notes

1. **Discover heroes are placeholders.** Replace `DiscoverHeroes` array in `constants/frost.ts` with real curated paid-spot images.
2. **The blind-swipe vendors are placeholders.** v1.3 will wire `/api/v2/discover/feed` (existing endpoint, no backend ZIP needed) and `POST /api/couple/muse/save`.

## Backend impact

**ZERO.** Still frontend-only.
