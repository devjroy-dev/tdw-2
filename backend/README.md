# Backend lives in a separate repo

The TDW backend (Express + Supabase + DreamAi tools) is deployed from the **dream-wedding** repository — NOT from this repo.

- GitHub: https://github.com/devjroy-dev/dream-wedding
- Production URL: https://dream-wedding-production-89ae.up.railway.app
- Railway service is connected to the dream-wedding repo, not tdw-2.

The previous `backend/server.js` and `server.js` files in this repo (~10,000 lines each) were stale snapshots from a May 2026 monorepo experiment. They never deployed. They have been removed to prevent confusion.

To work on backend code, clone the dream-wedding repo:
```
git clone https://github.com/devjroy-dev/dream-wedding /workspaces/dream-wedding
cd /workspaces/dream-wedding
git checkout test/v3-vendor-dreamai
```

This repo (tdw-2) is for:
- /app   — Expo native bride + vendor app
- /web   — Next.js PWA (couple + vendor + admin web surfaces)
- /utils, /components, /constants, /hooks, /services — shared frontend code
- /backend — see this README (no code lives here)
- /server.js — removed, see above

Last verified: May 11, 2026.
