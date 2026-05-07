# Frost — v0

The Dream Wedding · Frost. The bride product.

## What this is

The first preview build of Frost — the bride's redesigned native app. One landing page, full-bleed canvases, frosted glass, gold reserved for the countdown, no tabs, no chrome.

This drop runs **alongside** the existing `app/(couple)/` route group. Nothing in the live couple app is touched. Frost lives at `app/(frost)/` and is reachable only by direct route.

## How to preview

Once the ZIP is unzipped and `expo-blur` is installed:

```bash
npm install expo-blur
npx expo start
```

Then in Expo Go, deep-link or temporarily edit `app/index.tsx` to push `/(frost)/landing` instead of the usual entry point. Or visit the route directly via a dev launcher.

For a one-tap preview, paste this into a Codespaces terminal and follow the QR:

```bash
cd /workspaces/tdw-2 && npx expo start --tunnel
```

## v0 contents

| File | Purpose |
|---|---|
| `app/(frost)/_layout.tsx` | Stack navigator, no header, fade animation, Frost background |
| `app/(frost)/landing.tsx` | The home — countdown, two boxes, DreamAi line, Journey bar |
| `app/(frost)/canvas/muse.tsx` | Stub — full-bleed Muse reveal with a single hero image |
| `app/(frost)/canvas/discover.tsx` | Stub — full-bleed Discover beta preview |
| `app/(frost)/canvas/dream.tsx` | Stub — DreamAi + Circle merged surface (placeholder) |
| `app/(frost)/canvas/journey.tsx` | Stub — Journey working canvas (placeholder) |
| `components/frost/UnveilCanvas.tsx` | The signature primitive — frosted glass over child, long-press to unveil |
| `components/frost/RotatingImage.tsx` | Cross-fades a list of image URIs |

## Gestures

- **Long-press Muse box** (≥420ms) → `/(frost)/canvas/muse`
- **Long-press Discover box** (≥420ms) → `/(frost)/canvas/discover`
- **Long-press DreamAi line** (≥420ms) → `/(frost)/canvas/dream`
- **Tap Journey bar** → `/(frost)/canvas/journey`
- **Close (X) on any canvas** → back to landing

## What's locked in v0

- **Wedding date:** 25 September 2026 (hardcoded for the preview)
- **Frosted grey background:** `#F4F2EE`
- **Gold reserved for countdown only:** `#C9A84C`
- **3 placeholder images** rotating in both Muse and Discover boxes (Unsplash editorial)
- **Static DreamAi idle line:** *"The light in October will be the colour of old letters."*

## What's not in v0 (deliberately)

- No backend wiring — Muse box doesn't pull real saves yet, Discover doesn't pull featured vendors, DreamAi line doesn't call Haiku
- No real reveal animation (long-press just navigates with the stack's fade); the "blur lifts and color swells" animation comes in v0.1 once the basic aesthetic is approved
- No real Discover magazine, Muse gallery, Dream conversation, or Journey tools — these are stubs
- Android frost effect is a flat translucent overlay (real BlurView only renders on iOS in v0)

## What I want feedback on

Open the landing on your real phone. Look at it for two minutes. Then long-press one of the boxes. Tell me:

1. **Does the frosted-grey + gold + grayscale palette feel right?** Or does it feel sterile / too cold?
2. **Is the countdown the right size and weight?** Too big? Too small? Wrong rhythm?
3. **Are the two boxes the right shape?** Too tall? Too symmetric?
4. **Does the Journey bar at the bottom feel like a door — or a footer?**
5. **Does the long-press gesture feel natural?** Or does it feel hidden?

Once you've answered those, we tune the v0.1.

## Backend

**Untouched.** No `dream-wedding` ZIP needed for this drop. Frost v0 has zero API calls.

## Install rule

Standard Frost/TDW install procedure:

```bash
unzip -o frost-v0.zip && cp -r deploy/* . && rm -rf deploy frost-v0.zip
npm install expo-blur
git add -A && git commit -m "feat: Frost v0 — landing + canvas stubs + UnveilCanvas primitive" && git push
```

Then verify:

```bash
ls app/\(frost\)/ && ls components/frost/
```

Should show: `_layout.tsx canvas landing.tsx` and `RotatingImage.tsx UnveilCanvas.tsx`.
