# Frost · Dream Wired (ZIP 2)

This is **ZIP 2 of 3** in the bride DreamAi engine. ZIP 1 (`frost-dreamai-v1.zip`) shipped the backend endpoints. This ZIP wires the Frost frontend to them.

## What this drop does

- **Dream canvas** is now fully alive: the composer POSTs to `/api/v2/dreamai/bride-chat`, AI responses render with summary cards + Yes/No follow-up bubbles, Circle activity merges into the same stream
- **Landing's idle Dream box** pulls live Haiku-generated lines from `/api/v2/dreamai/bride-idle/:userId` (still falls back to static pool while loading)
- Two new component primitives so future Claude doesn't redesign the chat UI: `<DreamYesNo>` and `<DreamSummaryCard>`
- A real API service layer at `services/frostApi.ts`

## Files (5)

| File | What it does |
|---|---|
| `services/frostApi.ts` | NEW. API client. Wraps bride-chat, bride-followup, bride-idle, fetchCircleActivity. Reads couple_id from AsyncStorage `user_session`. |
| `components/frost/DreamYesNo.tsx` | NEW. Single Yes/No prompt bubble. Tap → calls bride-followup → collapses to gold "✓ Yes" badge → reply line appended to stream. |
| `components/frost/DreamSummaryCard.tsx` | NEW. Renders the structured `summaryLines` from a composite tool result. FrostedSurface 'panel' mode, gold-dot bullets. |
| `app/(frost)/canvas/dream.tsx` | REWRITTEN. Wired to bride-chat. Polls Circle every 30s. User messages render as right-aligned dark bubbles. Auto-scrolls. |
| `app/(frost)/landing.tsx` | UPDATED. Idle lines pull from bride-idle on mount + every 30 minutes. Falls back to FrostCopy.idlePool while loading. |

## Install

```bash
cd /workspaces/tdw-2

# Drop frost-dream-wired.zip at repo root, then:
unzip -o frost-dream-wired.zip && cp -r deploy/* . && rm -rf deploy frost-dream-wired.zip
```

No new npm dependencies. Hot-reloads.

## Prerequisites

- **ZIP 1 (`frost-dreamai-v1.zip`) must be deployed and live on Railway first.** The frontend will throw 404s otherwise.
- The bride must be signed in (AsyncStorage has `user_session` with `id`). Use the demo couple `1acdf38f-e69a-4f5e-b5b2-34c32fe52988` for testing.

## Test it

1. **Landing**: open `/(frost)/landing`. The two idle lines in the Dream box should refresh from Haiku within ~2 seconds of mount. They'll be context-aware — referencing your days-till-wedding, vendors booked, etc.

2. **Dream canvas**: tap (or long-press) the Dream box → opens `/(frost)/canvas/dream`. You'll see a date header, a soft greeting from DreamAi, and any historical Circle messages.

3. **Type something simple**: `What are some good photographers in Delhi?` → should see the AI reply with vendor list.

4. **The big test — the composite tool**: type `I just booked Swati Tomar for 1 lakh, paid 30k advance`. You should see:
   - Your message bubble (dark, right-aligned)
   - DreamAi reply: `✓ Done. Swati Tomar is locked in.`
   - Summary card with 4 gold-dot bullets (vendor locked / total / advance / balance reminder)
   - Two Yes/No follow-up bubbles trickling in:
     - "Want me to draft a thank-you note to Swati Tomar?" → [Yes, draft it] [Not now]
     - "Should I let your Circle know that Swati Tomar is locked in?" → [Share] [Keep private]
   - Tap any Yes/No → button collapses to gold "✓ {choice}" badge → AI reply appended

5. **Honest unknowns test**: type `Booked someone for 50k`. Should ask which vendor and what category.

6. **Circle merge test**: if your demo couple has any rows in `circle_messages` or `co_planner` tables, those will appear in the stream chronologically.

## Known limitations (carry to ZIP 3 / v1.7)

1. **No streaming**. Haiku replies arrive all-at-once after the request completes. Streaming with SSE is a v1.7 polish.
2. **Circle polling is 30s.** Acceptable for now. WebSocket sub for real-time activity is a v1.8 polish.
3. **Followup context heuristic**. The frontend extracts vendor name with a regex (`first capitalised proper noun`). Works for "Booked Swati Tomar..." but fails for "I locked in the photographer". The backend itself doesn't actually use this context for v1, so failures are silent. Will tighten in ZIP 3 by having the backend return context in the followup payload.
4. **Wedding date is hardcoded** (Sept 25, 2026). Wires to user profile when auth lands properly in v1.7.
5. **Idle endpoint refresh** is 30 minutes on the client + hour-bucket cache on backend. So worst case the bride sees the same lines for ~90 minutes.

## What ZIP 3 will add

Backend ZIP, additive to `dream-wedding`:
- `log_payment` composite (record any payment to a vendor — auto-updates expense + advance_paid + checks balance)
- `settle_balance` composite (the "I paid the rest" case — closes out the expense entry)
- `broadcast_to_circle` composite (writes a system event to circle_messages so Circle sees the AI-narrated update)
- `ocr_receipt` flow (image upload → Haiku Vision OCR → confirm card → file under vendor)

Each as a small additive ZIP with its own verify grep, ship them only after we see ZIP 1+2 working end-to-end on real bride data.
