import AsyncStorage from '@react-native-async-storage/async-storage';

const COUPLE_KEY = 'couple_session';
const VENDOR_KEY = 'vendor_session';

export async function getCoupleSession() {
  try {
    const raw = await AsyncStorage.getItem(COUPLE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function setCoupleSession(data: object) {
  await AsyncStorage.setItem(COUPLE_KEY, JSON.stringify(data));
}

export async function clearCoupleSession() {
  // Clear primary session
  await AsyncStorage.removeItem(COUPLE_KEY);

  // Clear known auxiliary keys that hold preferences/state tied to the user
  const auxKeys = [
    'notif_prefs',
    'budget_visible',
    'couple_default_home',
  ];
  await Promise.all(auxKeys.map(k => AsyncStorage.removeItem(k).catch(() => {})));

  // Clear all @frost.* keys (home mode, muselook, dismissed hints, etc.)
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const frostKeys = allKeys.filter(k => k.startsWith('@frost.'));
    if (frostKeys.length) {
      await AsyncStorage.multiRemove(frostKeys);
    }
  } catch {
    // Best-effort cleanup; don't fail sign-out if AsyncStorage misbehaves
  }
}

export async function getVendorSession() {
  try {
    const raw = await AsyncStorage.getItem(VENDOR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function setVendorSession(data: object) {
  await AsyncStorage.setItem(VENDOR_KEY, JSON.stringify(data));
}

export async function clearVendorSession() {
  await AsyncStorage.removeItem(VENDOR_KEY);
}
