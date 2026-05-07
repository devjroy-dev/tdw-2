#!/usr/bin/env python3
"""
Fix two things:
1. couple-pin-login.tsx — session guard rejects phone-only session, causing redirect loop
2. utils/session.ts — AsyncStorage fails silently on web, add Platform-aware storage
"""

# ── Fix 1: couple-pin-login.tsx session guard ─────────────────────────────
PIN_PATH = 'app/couple-pin-login.tsx'

with open(PIN_PATH, 'r') as f:
    pin_content = f.read()

# Allow phone-only session (before PIN verify, session only has phone)
pin_content = pin_content.replace(
    'if (!s?.id && !s?.userId) { router.replace(\'/\'); return; }',
    'if (!s?.id && !s?.userId && !s?.phone) { router.replace(\'/\'); return; }'
)

with open(PIN_PATH, 'w') as f:
    f.write(pin_content)

print('✅ Fix 1: couple-pin-login.tsx session guard fixed')

# ── Fix 2: utils/session.ts — web-safe storage ────────────────────────────
SESSION_PATH = 'utils/session.ts'

NEW_SESSION = """import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COUPLE_KEY = 'couple_session';
const VENDOR_KEY = 'vendor_session';

const webStore: Record<string, string> = {};

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return webStore[key] ?? null; }
  }
  return AsyncStorage.getItem(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch { webStore[key] = value; }
    return;
  }
  return AsyncStorage.setItem(key, value);
}

async function storageRemove(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(key); } catch { delete webStore[key]; }
    return;
  }
  return AsyncStorage.removeItem(key);
}

export async function getCoupleSession() {
  try {
    const raw = await storageGet(COUPLE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function setCoupleSession(data: object) {
  await storageSet(COUPLE_KEY, JSON.stringify(data));
}

export async function clearCoupleSession() {
  await storageRemove(COUPLE_KEY);
}

export async function getVendorSession() {
  try {
    const raw = await storageGet(VENDOR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function setVendorSession(data: object) {
  await storageSet(VENDOR_KEY, JSON.stringify(data));
}

export async function clearVendorSession() {
  await storageRemove(VENDOR_KEY);
}
"""

with open(SESSION_PATH, 'w') as f:
    f.write(NEW_SESSION)

print('✅ Fix 2: utils/session.ts — web-safe storage written')
print('')
print('DEPLOY:')
print('git add app/couple-pin-login.tsx utils/session.ts app/index.tsx')
print('git commit -m "fix: login — pin-status fields + session guard + web storage"')
print('git push origin main')
print('eas update --branch production --message "Fix login flow completely"')
