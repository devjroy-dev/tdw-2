# TDW Session 10 Handover
Date: April 21, 2026
HEAD commit: (run `git rev-parse --short HEAD` to fill)

## What was built
- Plan screen auth wired — reads `couple_session` from localStorage (same key as v1)
- No session → soft centered message "Sign in to view your plan." No redirect
- Real userId passed to all 4 Railway endpoints (tasks, money, guests, events)
- Events detail sheet — tap any event card → 85vh bottom sheet slides up
  - Animated enter (400ms ease) / exit (280ms)
  - Drag handle + backdrop dismiss
  - Three sub-tabs: Tasks · Vendors · Guests, each filtered to that event
  - Vendors derived from expenses table via event_name match
- Today screen subtext fallback changed from 'wedding' → 'Sangeet'
- Demo data seeded in Supabase:
  - 5 events (Mehendi, Haldi, Sangeet, Ceremony, Reception)
  - 8 tasks across events
  - 6 expenses (4 committed, 2 paid)
  - 10 guests with mixed RSVP status
  - couple_profiles budget set to ₹50L
  - Demo couple UUID: 00000000-0000-0000-0000-000000000001

## Files modified
- web/app/couple/plan/page.tsx (auth + Events detail sheet)
- web/app/couple/today/page.tsx (Sangeet subtext fix)

## New tables created in Supabase
- couple_profiles
- events
- couple_tasks
- expenses
- guests (patched: added couple_id, events[], rsvp_status columns)

## SQL run
Yes — all 5 tables created, demo data seeded

## Working
- Plan screen shows real data when couple_session exists in localStorage
- Events tab: tap card → detail sheet with Tasks/Vendors/Guests sub-tabs
- Today screen says "X days to your Sangeet"

## Not working / Pending
- couple_tasks endpoint does `.select('*, events(name)')` — foreign key
  relationship between couple_tasks.event_id and events.id not yet set;
  falls back to event_name field which works fine with seeded data
- No login flow in v2 yet — to test with demo data, manually set
  localStorage in browser console:
  localStorage.setItem('couple_session', JSON.stringify({id:'00000000-0000-0000-0000-000000000001',name:'Priya'}))

## Next session goal
- Build couple login/signup flow for v2
- Wire Today screen to real data (currently still uses DEMO_USER_ID)
- Add session handover between Today and Plan screens
