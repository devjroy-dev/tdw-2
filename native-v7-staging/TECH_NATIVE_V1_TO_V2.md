# THE DREAM WEDDING — TECH NATIVE V1 HANDOVER
## TECH_NATIVE_V1_TO_V2.md
### Written: May 6, 2026 by Tech Native V1
### For: Tech Native V2 | Via: Dev Roy

---

## SESSION SUMMARY

Tech Native V1 built all three phases of the auth foundation as directed by MANAGER_NATIVE_V1_TO_TECH_NATIVE_V1.md.

---

## PHASE 1 — REPO CLEANUP

**Status: Script delivered. Dev must run before deploying ZIP.**

A shell script `phase1-cleanup.sh` is included in the ZIP root (not in `deploy/`). Dev runs it first:

```bash
cd /workspaces/tdw-2
bash phase1-cleanup.sh
```

This moves all scaffold files listed in the directive to `archive/old-scaffold/`. Safe — uses `2>/dev/null` so no errors if files don't exist. Does not touch:
- `components/external-link.tsx`
- `components/haptic-tab.tsx`
- `components/themed-text.tsx`
- `components/themed-view.tsx`
- `components/ui/`
- `hooks/`
- `web/` (PWA — never touched)

---

## PHASE 2 — EXPO FOUNDATION

**Status: Complete. All files delivered in ZIP.**

Files created:
- `constants/tokens.ts` — full design system tokens (Colors, Fonts, Radius, RAILWAY_URL)
- `utils/session.ts` — AsyncStorage read/write for couple_session and vendor_session
- `utils/biometric.ts` — expo-local-authentication wrapper with AsyncStorage flag
- `app/_layout.tsx` — root layout: CormorantGaramond + DMSans font loading, SplashScreen, StatusBar dark, Stack navigator with fade animation
- `.env.local` — EXPO_PUBLIC_ vars for Railway URL, Cloudinary cloud and preset

**Font note:** The directive specifies `Jost` for labels in project memory but the font loading in `_layout.tsx` (per directive) only loads CormorantGaramond and DMSans. All `Fonts.label` references use `DMSans_400Regular` for now. **If Dev wants Jost loaded, add it to `_layout.tsx` and `constants/tokens.ts` in V2.** The design system specifies Jost for section headers and labels — this is a gap to close.

---

## PHASE 3 — AUTH FLOW

**Status: Complete. All files delivered in ZIP.**

### Files created

```
app/index.tsx              — Landing: session check → biometric → route
app/couple-login.tsx       — Phone entry, +91 prefix, shake on error
app/couple-otp.tsx         — 6-box OTP, auto-advance, resend 60s, biometric offer
app/couple-onboarding.tsx  — New user: names, date, segments, checklist seed, events seed
app/vendor-login.tsx       — Same as couple login, vendor endpoint
app/vendor-otp.tsx         — Same as couple OTP + holding screen for unregistered vendors
app/(couple)/_layout.tsx   — TODAY · PLAN · CIRCLE tabs
app/(couple)/today.tsx     — Placeholder
app/(couple)/plan.tsx      — Placeholder
app/(couple)/circle.tsx    — Placeholder
app/(vendor)/_layout.tsx   — TODAY · CLIENTS · STUDIO tabs
app/(vendor)/today.tsx     — Placeholder
app/(vendor)/clients.tsx   — Placeholder
app/(vendor)/studio.tsx    — Placeholder
```

### Endpoints called (not curl-verifiable from sandbox — Railway blocked by egress proxy)

Built to these contracts based on the PWA's proven integration:

| Screen | Method | Endpoint | Body |
|---|---|---|---|
| couple-login | POST | `/api/v2/couple/auth/send-otp` | `{ phone }` |
| couple-otp | POST | `/api/v2/couple/auth/verify-otp` | `{ phone, otp }` |
| couple-onboarding | POST | `/api/v2/couple/onboarding` | `{ name, partnerName, weddingDate, segment, liveIn, weddingIn, coupleId }` |
| couple-onboarding | POST | `/api/couple/checklist/seed/:coupleId` | (no body) |
| couple-onboarding | POST | `/api/couple/events/seed` | `{ coupleId }` |
| vendor-login | POST | `/api/v2/vendor/auth/send-otp` | `{ phone }` |
| vendor-otp | POST | `/api/v2/vendor/auth/verify-otp` | `{ phone, otp }` |

**⚠️ BLOCKER FOR DEV TO VERIFY AT DEPLOY TIME:**

1. **Couple onboarding endpoint** — The PWA may use a different path for the couple profile update. Dev must check Railway logs after first onboarding submit and confirm the correct path. If it 404s, find the correct endpoint from the PWA source and surface to V2.

2. **Events seed endpoint** — `/api/couple/events/seed` is inferred from pattern. If it doesn't exist, the call fails silently (non-blocking, wrapped in try/catch with console.warn). Events won't seed but the user still reaches Today. Dev should check Railway logs and confirm this endpoint exists. If not, V2 will need to find or create it.

3. **`isNewUser` flag** — The OTP verify response is expected to include `isNewUser: true/false` to decide whether to route new users to onboarding or existing users to Today. If the backend doesn't return this flag, the OTP screen will always route to Today and skip onboarding. Dev must check the actual verify-otp response shape from Railway logs when testing with Dev test couple `8757788550`.

4. **Auth token** — The onboarding POST uses `Authorization: Bearer ${session.token}`. If the session object uses a different key (e.g. `session.accessToken`, `session.jwt`), this will 401. Dev must confirm exact response shape from verify-otp.

---

## BACKEND ENDPOINT VERIFICATION — REQUIRED BEFORE APK TEST

Dev runs these from Codespace after deploying:

```bash
# Health
curl https://dream-wedding-production-89ae.up.railway.app/health

# Couple OTP send (test account)
curl -X POST https://dream-wedding-production-89ae.up.railway.app/api/v2/couple/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "8757788550"}'
# Expected: { success: true } or similar

# Vendor OTP send (test account)
curl -X POST https://dream-wedding-production-89ae.up.railway.app/api/v2/vendor/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9888294440"}'
# Expected: { success: true } or similar
```

After entering OTPs on device, check Railway logs for:
- exact verify-otp response shape (especially `isNewUser` and `token`/`accessToken` key)
- any SQL errors
- any 404s on onboarding/seed endpoints

**Surface all findings to V2 via this handover.**

---

## DEPLOY SEQUENCE FOR DEV

Run in `/workspaces/tdw-2` in exact order:

```bash
# Step 1 — Phase 1 cleanup (run first, before ZIP)
bash phase1-cleanup.sh

# Step 2 — Deploy ZIP
unzip -o tdw-native-phase1-2-3.zip && cp -r deploy/* . && rm -rf deploy tdw-native-phase1-2-3.zip

# Step 3 — Commit
git add -A
git commit -m "feat: native auth flow — landing, OTP, onboarding, biometric, navigation shell"
git push origin main

# Step 4 — EAS Android APK
eas build --platform android --profile preview
```

---

## KNOWN GAPS / ISSUES FOR V2 TO RESOLVE

1. **Jost font not loaded** — project memory specifies Jost for section headers and labels. `_layout.tsx` only loads CormorantGaramond + DMSans per directive. V2 should add `@expo-google-fonts/jost` to font loading and update `Fonts.label` in tokens. Check if package is already in `package.json` before installing.

2. **`@react-native-community/datetimepicker`** — Used in `couple-onboarding.tsx`. This package is not explicitly listed in project memory's tech stack. Check if it's in `package.json`. If not, install: `npx expo install @react-native-community/datetimepicker`. Dev should verify before first build.

3. **Biometric on Android (Galaxy S24)** — Android biometric requires `USE_BIOMETRIC` and `USE_FINGERPRINT` permissions in `app.json`/`AndroidManifest`. expo-local-authentication should handle this automatically in managed workflow, but Dev should verify in Railway logs if biometric prompt doesn't appear.

4. **SafeAreaProvider** — `useSafeAreaInsets()` requires `SafeAreaProvider` at the root. If it's not already in `app/_layout.tsx` or `app.json`, add `<SafeAreaProvider>` wrapper around the Stack in `_layout.tsx`. Check if `react-native-safe-area-context` is configured in the existing Expo setup.

5. **Onboarding segment logic** — "India + Not sure" → treated as `nri`. This is a provisional decision. If Dev wants different logic (e.g. `india_global` or a separate segment), surface to Manager in V2 handover.

---

## BIOMETRIC STATUS

Cannot verify on Galaxy S24 from this session — biometric test requires physical device with OTP flow complete. Dev confirms at APK test. The logic is:
- First login: `isBiometricAvailable()` → if true → offer sheet → `setBiometricEnabled(true)` or skip
- Subsequent opens: `isBiometricEnabled()` + `authenticateWithBiometric()` → skip OTP if success

---

## WHAT V2 BUILDS

Per Manager directive: **Couple Today screen — full pixel-perfect port.**

V2 inputs needed from Dev before starting:
1. Confirmed APK installs and runs on Galaxy S24 ✓/✗
2. Exact verify-otp response shape (from Railway logs)
3. Confirmed onboarding endpoint path
4. Confirmed events seed endpoint path or confirmation it needs to be built
5. Whether Jost font is in package.json
6. Whether `@react-native-community/datetimepicker` is in package.json

---

## ZIP CONTENTS

```
tdw-native-phase1-2-3.zip
├── phase1-cleanup.sh              ← Run FIRST in Codespace
└── deploy/
    ├── .env.local
    ├── app/
    │   ├── _layout.tsx
    │   ├── index.tsx
    │   ├── couple-login.tsx
    │   ├── couple-otp.tsx
    │   ├── couple-onboarding.tsx
    │   ├── vendor-login.tsx
    │   ├── vendor-otp.tsx
    │   ├── (couple)/
    │   │   ├── _layout.tsx
    │   │   ├── today.tsx
    │   │   ├── plan.tsx
    │   │   └── circle.tsx
    │   └── (vendor)/
    │       ├── _layout.tsx
    │       ├── today.tsx
    │       ├── clients.tsx
    │       └── studio.tsx
    ├── constants/
    │   └── tokens.ts
    └── utils/
        ├── session.ts
        └── biometric.ts
```

---

## GIT COMMIT HASH / EAS BUILD ID

To be filled by Dev after deploy:
- Git commit: `[Dev fills after git push]`
- EAS Build ID: `[Dev fills after eas build completes]`
- APK install confirmed on Galaxy S24: `[Dev fills: YES/NO + any errors]`

---

*TECH_NATIVE_V1_TO_V2.md*
*May 6, 2026 — Tech Native V1*
*Next session: Couple Today screen — full pixel-perfect port*
