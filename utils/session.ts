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
  await AsyncStorage.removeItem(COUPLE_KEY);
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
