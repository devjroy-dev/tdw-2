# Frost Native Routing — Build Guide

## What changed

Four files patched, no logic removed:

- `app.json` — identifiers updated to `in.thedreamwedding.dreamer` (both iOS and Android)
- `app/_layout.tsx` — `SplashScreen.preventAutoHideAsync()` wrapped in try/catch to prevent Apr 14 crash pattern
- `app/couple-otp.tsx` — post-OTP success routes couples to `/(frost)/landing` instead of `/(couple)/today`
- `app/couple-pin-login.tsx` — post-PIN verify routes couples to `/(frost)/landing`
- `app/couple-pin.tsx` — post-PIN setup (new users) routes couples to `/(frost)/landing`

Vendor routing is untouched. co_planner routing is untouched. The routing decision uses `dreamer_type === 'couple'` from the session object — the same field the backend already sets.

## How to build the APK

```bash
cd /workspaces/tdw-2
eas build --platform android --profile preview
```

EAS will give you a build URL. Download the `.apk` and side-load on your Android device.

## How to install on Android

1. Download the APK from the EAS build URL
2. On your Android phone: Settings → Security → Allow unknown sources (or "Install unknown apps" for the browser you'll use to download)
3. Open the APK file and tap Install
4. Open The Dream Wedding app

## First-run checklist on native

Test these in order:

1. **Login flow** — enter `+918757788550`, receive OTP, enter it → should land on Frost landing (not the old couple today screen)
2. **PIN login** — once PIN is set, close and reopen app → PIN screen → Frost landing
3. **All four canvases** — Muse, Discover, Dream, Journey — tap each from the bottom nav
4. **Surprise Me** — tap on Muse canvas, verify 6 cards load (3 web + 3 vendor)
5. **Camera permission** — try OCR receipt in Journey → should prompt for camera access
6. **Push notifications** — should prompt on first launch
7. **Deep link** — tap a Circle invite link, verify it opens the app

## Known gotchas

- **Expo updates** — the app is configured for OTA updates on the `production` channel. First native build will not auto-update until you push an OTA update via `eas update`.
- **Google Sign-In** — `@react-native-google-signin/google-signin` is installed but `GoogleSignin.configure()` must NOT be called at module level (Apr 14 crash pattern). If you see a crash on startup, check for module-level GoogleSignin calls.
- **Status bar** — configured as `dark` on `#F8F7F5` background. On some Android devices the status bar may appear white — test on your specific device.
- **BlurView (FrostedSurface)** — expo-blur renders correctly on iOS and Android. On Android the blur intensity may look slightly different from iOS — this is expected.
