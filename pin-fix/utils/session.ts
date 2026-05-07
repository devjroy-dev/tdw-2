import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COUPLE_KEY = 'couple_session';
const VENDOR_KEY = 'vendor_session';

// Web-safe storage abstraction
// Native: AsyncStorage (persistent across app restarts)
// Web: localStorage (persistent across page reloads, same origin)
// Web fallback: in-memory (if localStorage unavailable — e.g. private browsing)
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
