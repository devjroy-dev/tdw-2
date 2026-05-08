# Frost · v1.5 (ZIP 6) — Surprise Me frontend + proper Muse canvas

Frontend ZIP. 6 files. Wires the ZIP 5 Surprise Me backend into Frost's UI.

## What this drop does

### The Muse canvas is now real
Previously a stub showing a hero placeholder. Now:
- Fetches the bride's actual saves from `/api/couple/muse/:userId`
- Renders them in a 2-column staggered grid with alternating heights for editorial rhythm
- Tap a tile → expands full-bleed (with optional note overlay), tap to dismiss
- Filter chips along the top: All / Haldi / Mehendi / Sangeet / Reception / Wedding
- Pull-to-refresh
- **Empty state** when she has zero saves — gentle hero CTA pulling her toward Surprise Me

### Surprise Me — two surfaces, one engine

**Surface 1: Muse canvas button**
Gold pill button at top-right of the Muse canvas reading "Surprise Me". Tapping opens a full-bleed overlay that:
- Fetches 6-8 suggestions via `/api/v2/frost/surprise-me`
- Shows them one-at-a-time with prev/next navigation + progress dots at top
- Each card displays the image full-bleed with source tag (PINTEREST / WEB / TDW VENDOR), optional caption, and the bride's taste summary up top
- Tap "Save to Muse" pill → routes through `bride-chat` → `save_to_muse` tool → row appears in her grid
- Once saved, the button collapses to a "Saved" gold-tinted state and won't re-fire
- Empty state with "Try again" if zero suggestions returned

**Surface 2: DreamAi voice command**
When the bride says *"surprise me"* / *"reception ideas"* / similar in Dream chat, the response now includes a `suggestions` array which renders as a horizontal carousel **inline in the chat stream**. Each card is mini-sized with image + source label + small "Save" button. Tapping save calls `save_to_muse` directly — same backend path as the overlay.

Both surfaces use the same `saveToMuse()` API helper, which routes through `/api/v2/dreamai/bride-chat` so the URL detector + tool router on the backend is the single code path. No duplication.

## Files

| File | What it does | Status |
|---|---|---|
| `services/frostApi.ts` | EXTENDED. Adds `MuseSave`, `SurpriseSuggestion`, `SurpriseMeResponse` types + `fetchMuseSaves()`, `surpriseMe()`, `saveToMuse()`. `BrideChatResponse` now includes optional `suggestions` and `tasteSummary`. | Replaces existing |
| `components/frost/MuseGrid.tsx` | NEW. 2-column staggered grid with hairline-bordered tiles, ceremony-tag chips, optional vendor name bar. | New |
| `components/frost/SurpriseMeOverlay.tsx` | NEW. Full-bleed overlay with one-card-at-a-time browsing, save controls, progress dots, taste summary. | New |
| `components/frost/DreamSuggestionsCarousel.tsx` | NEW. Horizontal mini-carousel for inline Dream chat suggestions. | New |
| `app/(frost)/canvas/muse.tsx` | REWRITTEN. Real fetch, grid, filters, empty state, expand overlay, Surprise Me button. | Replaces stub |
| `app/(frost)/canvas/dream.tsx` | EXTENDED. Adds `suggestions` message kind to stream, renders `<DreamSuggestionsCarousel>` when bride-chat returns suggestions. | Surgical patch |

No new npm dependencies.

## Install

```bash
cd /workspaces/tdw-2

unzip -o frost-v1.5.zip && cp -r deploy/* . && rm -rf deploy frost-v1.5.zip

# Verify the 6 files landed:
ls services/frostApi.ts \
   components/frost/MuseGrid.tsx \
   components/frost/SurpriseMeOverlay.tsx \
   components/frost/DreamSuggestionsCarousel.tsx \
   app/\(frost\)/canvas/muse.tsx \
   app/\(frost\)/canvas/dream.tsx

# Commit:
git add -A
git commit -m "feat: Frost v1.5 — Surprise Me UI + proper Muse canvas grid (ZIP 6)"
git push
```

`git push` here is for version control — the native app doesn't deploy via push. To preview:

```bash
npx expo start --web
```

Open in mobile-view Chrome.

## Test routes

1. **Open Frost landing** → long-press the Muse box → opens new Muse canvas
2. **First-time experience (empty Muse)** — if your demo couple has no saves, you'll see the empty state. Tap "Surprise Me" CTA.
3. **First-time experience (existing saves)** — your demo couple has 4 existing saves (verified in earlier curls). You'll see them in the grid. Tap any tile to expand.
4. **Surprise Me overlay** — tap the gold pill top-right. Should show "Looking for ideas…" briefly, then suggestion #1 appears with its image full-bleed. Use chevron buttons to navigate. Tap "Save to Muse" — it should change to "Saved" with gold heart.
5. **Filter by ceremony** — tap the "Reception" chip. Grid filters client-side. Surprise Me overlay opened from this state will pre-target reception suggestions.
6. **DreamAi voice path** — open Dream canvas. Type "surprise me with reception ideas". Should see your message bubble, then AI reply, then the inline suggestions carousel.
7. **Save from Dream** — tap "Save" on any suggestion card. Refresh Muse → it should appear in the grid.

## Known limitations / followups

1. **Surprise Me overlay loads sequentially, not all-at-once.** The first card appears as soon as suggestions return. Future polish: prefetch images for the next 2 cards so navigation is instant.

2. **No swipe gesture in the overlay yet** — bride uses chevron buttons. Adding swipe-left/right is a 30-line addition for v1.6.

3. **Saved suggestions don't flow back into the overlay's "this card is saved" state if the bride saves the same image elsewhere.** Per-overlay session only. Acceptable for v1.

4. **Pinterest URLs in saves are stored as-is.** The Muse grid will try to render `https://www.pinterest.com/pin/...` as an image, which fails because Pinterest pin URLs are HTML pages, not images. This is mainly an issue for legacy ZIP-4-era saves where the bride pasted a Pinterest pin URL. ZIP 5's Surprise Me always returns direct CDN URLs (`i.pinimg.com/...`) which render correctly.

5. **Expanded view is a simple full-bleed image.** Eventually it should also show: vendor link if vendor_id present, "remove from Muse" affordance, "save to Pinterest" share affordance. v1.7 polish.

6. **Filter chips only filter client-side** — every chip shows the count of saves matching it. With many saves this could lag. Server-side filtering is a v1.8 optimization.

## Roadmap after this

- **ZIP 7 (frontend, v1.6)** — Dream composer image picker → Cloudinary upload → triggers OCR receipt flow + image-to-Muse flow; swipe gesture in Surprise Me overlay
- **ZIP 8 (backend, v1.7)** — Pinterest official API once dev account approved
- **ZIP 9 (backend, v1.8)** — Instagram Graph API hashtag search, streaming responses (SSE)
- **ZIP 10+ (backend)** — Commerce site partnerships
- **v2.0** — Native production builds + App Store + Play Store

## Deferred items flagged for handover

- Pinterest official API integration (post dev account + production review)
- Instagram Graph API hashtag search (post Meta Business approval)
- Commerce site APIs (Aza, Pernia's Pop-Up, Ogaan, etc.)
- Reveal animation (long-press box → blur-lift + greyscale-to-color + scale-to-fullscreen) — still pending from way back
- Vendor-side `_layout.tsx` Discovery routing bug (parked since vendor side is stable)
