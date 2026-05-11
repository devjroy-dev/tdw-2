/**
 * Frost · Journey · Settings (v3 — fully wired)
 *
 * Five sections (mirrors app/(couple)/settings.tsx, restyled into Frost):
 *   1. Identity      — photo, bride name, partner name, wedding date, city
 *   2. Wedding prefs — events pills, guest count, budget visibility
 *   3. Discovery     — category toggles, discovery city
 *   4. Notifications — toggles + morning briefing time (AsyncStorage only)
 *   5. Account       — tier, upgrade CTA (disabled), WhatsApp, sign out
 *
 * Save pattern: explicit SAVE button per section.
 *
 * Endpoints:
 *   GET   /api/v2/couple/profile/:userId  — load profile
 *   GET   /api/users/:userId              — load residence/wedding city + phone
 *   PATCH /api/v2/couple/profile/:userId  — save identity/prefs/discovery/phone
 *
 * Sign-out goes through clearCoupleSession() from utils/session.ts — the
 * canonical session module. The bare AsyncStorage key must not be touched
 * directly from screens.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronRight, LogOut } from 'lucide-react-native';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostFonts, FrostSpace, FrostRadius,
} from '../../../../constants/frost';
import { MUSE_LOOKS } from '../../../../constants/museTokens';
import { useMuseLook } from '../../../../hooks/useMuseLook';
import { RAILWAY_URL } from '../../../../constants/tokens';
import { clearCoupleSession, getCoupleSession } from '../../../../utils/session';

// ─── Constants ───────────────────────────────────────────────────────────────

const API = RAILWAY_URL;
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dccso5ljv/image/upload';
const CLOUDINARY_PRESET = 'dream_wedding_uploads';

const EVENTS = ['Mehendi', 'Sangeet', 'Haldi', 'Reception', 'Cocktail', 'Engagement', 'Other'] as const;
type WeddingEvent = typeof EVENTS[number];

const CATEGORIES = ['MUA', 'Photographer', 'Jeweller', 'Designer', 'Decorator', 'Venue'] as const;
type DiscoveryCat = typeof CATEGORIES[number];

type Tier = 'lite' | 'signature' | 'platinum';

const TIER_PERKS: Record<Tier, string> = {
  lite:      '10 DreamAi queries · Discovery · Guest list',
  signature: '25 DreamAi queries · Full plan suite · Priority support',
  platinum:  '50 DreamAi queries · Couture access · Memory Box',
};

const NOTIF_KEY = 'notif_prefs';
const BUDGET_KEY = 'budget_visible';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function uploadToCloudinary(uri: string): Promise<string> {
  const filename = uri.split('/').pop() ?? 'photo.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const form = new FormData();
  form.append('file', { uri, name: filename, type: mimeType } as any);
  form.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
  const json = await res.json();
  if (!json.secure_url) throw new Error('Upload failed');
  return json.secure_url as string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function Row({ children, onPress, disabled }: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <FrostedSurface
      mode="button"
      onPress={onPress}
      disabled={disabled}
      radius={FrostRadius.md}
      style={{ marginBottom: FrostSpace.l }}
    >
      <View style={styles.rowInner}>{children}</View>
    </FrostedSurface>
  );
}

function Pill({ label, selected, onPress }: {
  label: string; selected: boolean; onPress: () => void;
}) {
  return (
    <FrostedSurface
      mode="button"
      onPress={onPress}
      radius={FrostRadius.pill}
      style={styles.pillOuter}
    >
      <View style={styles.pillInner}>
        <Text style={[styles.pillText, selected && styles.pillTextActive]}>
          {label}
        </Text>
      </View>
    </FrostedSurface>
  );
}

function GoldSwitch({ value, onValueChange }: {
  value: boolean; onValueChange: (v: boolean) => void;
}) {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: tokens.hairline, true: FrostColors.goldTrue }}
      thumbColor={FrostColors.white}
      ios_backgroundColor={tokens.hairline}
    />
  );
}

function SaveButton({ label, onPress, saving, saved, inkColor }: {
  label: string; onPress: () => void; saving: boolean; saved: boolean;
  inkColor: string;
}) {
  return (
    <FrostedSurface
      mode="button"
      onPress={onPress}
      disabled={saving}
      radius={FrostRadius.pill}
      style={styles.saveBtnOuter}
    >
      <View style={styles.saveBtnInner}>
        {saving ? (
          <ActivityIndicator size="small" color={inkColor} />
        ) : (
          <Text style={[styles.saveBtnText, { color: inkColor }]}>
            {saved ? '✓  SAVED' : label.toUpperCase()}
          </Text>
        )}
      </View>
    </FrostedSurface>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function JourneySettings() {
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];

  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Section 1 — Identity
  const [identityName, setIdentityName] = useState('');
  const [identityPartner, setIdentityPartner] = useState('');
  const [identityCity, setIdentityCity] = useState('');
  const [dateIso, setDateIso] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [savedPhotoUrl, setSavedPhotoUrl] = useState<string | undefined>(undefined);
  const [identitySaving, setIdentitySaving] = useState(false);
  const [identitySaved, setIdentitySaved] = useState(false);

  // Section 2 — Wedding preferences
  const [selectedEvents, setSelectedEvents] = useState<WeddingEvent[]>([]);
  const [guestCount, setGuestCount] = useState('');
  const [budgetVisible, setBudgetVisible] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Section 3 — Discovery
  const [selectedCats, setSelectedCats] = useState<DiscoveryCat[]>([]);
  const [discoveryCity, setDiscoveryCity] = useState('');
  const [discoverySaving, setDiscoverySaving] = useState(false);
  const [discoverySaved, setDiscoverySaved] = useState(false);

  // Section 4 — Notifications (AsyncStorage only)
  const [notifTaskReminders, setNotifTaskReminders] = useState(true);
  const [notifVendorReplies, setNotifVendorReplies] = useState(true);
  const [notifPaymentAlerts, setNotifPaymentAlerts] = useState(true);
  const [notifDreamAi, setNotifDreamAi] = useState(true);
  const [morningTime, setMorningTime] = useState('08:00');
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Section 5 — Account
  const [tier, setTier] = useState<Tier>('lite');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);

  // ─── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => { void init(); }, []);

  async function init() {
    try {
      const session = await getCoupleSession();
      if (!session?.id) { router.replace('/couple-login' as any); return; }
      setUserId(session.id);

      // Load notif prefs (AsyncStorage)
      try {
        const notifRaw = await AsyncStorage.getItem(NOTIF_KEY);
        if (notifRaw) {
          const np = JSON.parse(notifRaw);
          if (np.taskReminders !== undefined)    setNotifTaskReminders(np.taskReminders);
          if (np.vendorReplies !== undefined)    setNotifVendorReplies(np.vendorReplies);
          if (np.paymentAlerts !== undefined)    setNotifPaymentAlerts(np.paymentAlerts);
          if (np.dreamAiBriefing !== undefined)  setNotifDreamAi(np.dreamAiBriefing);
          if (np.morningTime)                    setMorningTime(np.morningTime);
        }
      } catch {}

      try {
        const bv = await AsyncStorage.getItem(BUDGET_KEY);
        if (bv !== null) setBudgetVisible(bv !== 'false');
      } catch {}

      // Fetch profile + user data in parallel
      const [profileRes, userRes] = await Promise.allSettled([
        fetch(`${API}/api/v2/couple/profile/${session.id}`).then(r => r.json()),
        fetch(`${API}/api/users/${session.id}`).then(r => r.json()),
      ]);

      if (profileRes.status === 'fulfilled') {
        const pd = profileRes.value?.couple ?? profileRes.value?.data ?? profileRes.value;
        if (pd) {
          if (pd.name) setIdentityName(pd.name);
          if (pd.partner_name) setIdentityPartner(pd.partner_name);
          // Tier reads couple_tier only — NEVER dreamer_type
          const rawTier = pd.couple_tier;
          if (rawTier === 'lite' || rawTier === 'signature' || rawTier === 'platinum') {
            setTier(rawTier);
          }
          if (pd.wedding_date) {
            setDateIso(pd.wedding_date);
            const d = new Date(pd.wedding_date);
            if (!isNaN(d.getTime())) setSelectedDate(d);
          }
          if (pd.photo_url) setSavedPhotoUrl(pd.photo_url);
          if (pd.guest_count != null) setGuestCount(String(pd.guest_count));
          if (Array.isArray(pd.wedding_events)) {
            setSelectedEvents(pd.wedding_events.filter((e: string): e is WeddingEvent =>
              (EVENTS as readonly string[]).includes(e),
            ));
          }
          if (Array.isArray(pd.discovery_categories)) {
            setSelectedCats(pd.discovery_categories.filter((c: string): c is DiscoveryCat =>
              (CATEGORIES as readonly string[]).includes(c),
            ));
          }
          if (pd.discovery_city) setDiscoveryCity(pd.discovery_city);
        }
      }

      if (userRes.status === 'fulfilled') {
        const ud = userRes.value?.data ?? userRes.value;
        if (ud) {
          if (ud.residence_country) setIdentityCity(prev => prev || ud.residence_country);
          if (ud.wedding_country)   setDiscoveryCity(prev => prev || ud.wedding_country);
          if (ud.phone)             setWhatsappNumber(ud.phone);
        }
      }
    } catch (e) {
      console.error('[Frost Settings init]', e);
    } finally {
      setLoading(false);
    }
  }

  // ─── Toast ─────────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }

  function flashSaved(setter: (v: boolean) => void) {
    setter(true);
    setTimeout(() => setter(false), 2500);
  }

  // ─── Photo ─────────────────────────────────────────────────────────────────

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showToast('Camera roll access needed.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setLocalPhotoUri(result.assets[0].uri);
    }
  }

  // ─── Section saves ─────────────────────────────────────────────────────────

  async function saveIdentity() {
    if (!userId) return;
    setIdentitySaving(true);
    try {
      let photoUrl = savedPhotoUrl;
      if (localPhotoUri) {
        try {
          photoUrl = await uploadToCloudinary(localPhotoUri);
          setSavedPhotoUrl(photoUrl);
          setLocalPhotoUri(null);
        } catch { showToast('Photo upload failed — other changes will save.'); }
      }
      const payload: Record<string, any> = {
        name: identityName.trim(),
        partner_name: identityPartner.trim(),
        residence_country: identityCity.trim(),
      };
      if (dateIso) payload.wedding_date = dateIso;
      if (photoUrl) payload.photo_url = photoUrl;

      const res = await fetch(`${API}/api/v2/couple/profile/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Save failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      flashSaved(setIdentitySaved);
      showToast('Identity saved.');
    } catch (e: any) {
      showToast(e?.message ?? 'Could not save. Try again.');
    } finally { setIdentitySaving(false); }
  }

  async function savePreferences() {
    if (!userId) return;
    setPrefsSaving(true);
    try {
      await AsyncStorage.setItem(BUDGET_KEY, budgetVisible ? 'true' : 'false');
      const payload: Record<string, any> = { wedding_events: selectedEvents };
      if (guestCount !== '') {
        const n = parseInt(guestCount, 10);
        if (!isNaN(n)) payload.guest_count = n;
      }
      const res = await fetch(`${API}/api/v2/couple/profile/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Save failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      flashSaved(setPrefsSaved);
      showToast('Preferences saved.');
    } catch (e: any) {
      showToast(e?.message ?? 'Could not save. Try again.');
    } finally { setPrefsSaving(false); }
  }

  async function saveDiscovery() {
    if (!userId) return;
    setDiscoverySaving(true);
    try {
      const res = await fetch(`${API}/api/v2/couple/profile/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discovery_categories: selectedCats, discovery_city: discoveryCity.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Save failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      flashSaved(setDiscoverySaved);
      showToast('Discovery preferences saved.');
    } catch (e: any) {
      showToast(e?.message ?? 'Could not save. Try again.');
    } finally { setDiscoverySaving(false); }
  }

  async function persistNotif(patch: Record<string, any>) {
    const current = {
      taskReminders:   notifTaskReminders,
      vendorReplies:   notifVendorReplies,
      paymentAlerts:   notifPaymentAlerts,
      dreamAiBriefing: notifDreamAi,
      morningTime,
      ...patch,
    };
    try { await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(current)); } catch {}
    Haptics.selectionAsync();
  }

  async function saveAccount() {
    if (!userId) return;
    setAccountSaving(true);
    try {
      const clean = whatsappNumber.replace(/\D/g, '').slice(-10);
      if (clean.length !== 10) { showToast('Enter a valid 10-digit number.'); return; }
      const fullPhone = '+91' + clean;
      const res = await fetch(`${API}/api/v2/couple/profile/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Save failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      flashSaved(setAccountSaved);
      showToast('WhatsApp number updated.');
    } catch (e: any) {
      showToast(e?.message ?? 'Could not save. Try again.');
    } finally { setAccountSaving(false); }
  }

  // ─── Sign out — uses clearCoupleSession, not direct AsyncStorage ──────────

  function handleSignOut() {
    Alert.alert(
      'Sign out',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await clearCoupleSession();
            router.replace('/couple-login' as any);
          },
        },
      ],
      { cancelable: true },
    );
  }

  // ─── Pill togglers ─────────────────────────────────────────────────────────

  function toggleEvent(e: WeddingEvent) {
    Haptics.selectionAsync();
    setSelectedEvents(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  }

  function toggleCat(c: DiscoveryCat) {
    Haptics.selectionAsync();
    setSelectedCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <FrostCanvasShell eyebrow="JOURNEY · SETTINGS" mode="frost">
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={FrostColors.goldTrue} />
        </View>
      </FrostCanvasShell>
    );
  }

  const displayPhoto = localPhotoUri ?? savedPhotoUrl;
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const isPlat = tier === 'platinum';

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <FrostCanvasShell eyebrow="JOURNEY · SETTINGS" mode="frost">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Heading */}
          <Text style={[styles.heading, { color: tokens.ink }]}>Yours.</Text>
          <Text style={[styles.editorial, { color: tokens.soft }]}>The more you tell us, the better we find.</Text>

          {/* ── Section 1: Identity ─────────────────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel>IDENTITY</SectionLabel>

            <Row onPress={pickPhoto}>
              <View style={styles.photoRow}>
                <View style={styles.avatar}>
                  {displayPhoto ? (
                    <Image source={{ uri: displayPhoto }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarInitial}>
                      {(identityName || 'D')[0].toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: tokens.ink }]}>Profile photo</Text>
                  <Text style={[styles.rowSub, { color: tokens.soft }]}>Tap to change</Text>
                </View>
                <ChevronRight size={18} color={FrostColors.hairline} strokeWidth={1.5} />
              </View>
            </Row>

            <Row>
              <FieldLabel>Bride&apos;s name</FieldLabel>
              <TextInput
                style={[styles.input, { color: tokens.ink }]}
                value={identityName}
                onChangeText={setIdentityName}
                placeholder="Your name"
                placeholderTextColor={tokens.soft}
                returnKeyType="done"
              />
            </Row>

            <Row>
              <FieldLabel>Partner&apos;s name</FieldLabel>
              <TextInput
                style={[styles.input, { color: tokens.ink }]}
                value={identityPartner}
                onChangeText={setIdentityPartner}
                placeholder="Their name"
                placeholderTextColor={tokens.soft}
                returnKeyType="done"
              />
            </Row>

            <Row onPress={() => setShowDatePicker(true)}>
              <FieldLabel>Wedding date</FieldLabel>
              <Text style={[styles.input, { color: dateIso ? tokens.ink : FrostColors.muted }]}>
                {dateIso ? formatDisplayDate(dateIso) : 'Select date'}
              </Text>
            </Row>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_, date) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (date) { setSelectedDate(date); setDateIso(toISODate(date)); }
                }}
              />
            )}
            {Platform.OS === 'ios' && showDatePicker && (
              <FrostedSurface
                mode="button"
                onPress={() => setShowDatePicker(false)}
                radius={FrostRadius.pill}
                style={styles.pickerDoneOuter}
              >
                <View style={styles.pickerDoneInner}>
                  <Text style={styles.pickerDoneText}>DONE</Text>
                </View>
              </FrostedSurface>
            )}

            <Row>
              <FieldLabel>Wedding city</FieldLabel>
              <TextInput
                style={[styles.input, { color: tokens.ink }]}
                value={identityCity}
                onChangeText={setIdentityCity}
                placeholder="Your city"
                placeholderTextColor={tokens.soft}
                returnKeyType="done"
              />
            </Row>

            <SaveButton
              label="Save identity"
              onPress={saveIdentity}
              saving={identitySaving}
              saved={identitySaved}
              inkColor={tokens.ink}
            />
          </View>

          {/* ── Section 2: Wedding preferences ─────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel>WEDDING PREFERENCES</SectionLabel>

            <Row>
              <FieldLabel>Events you are planning</FieldLabel>
              <View style={styles.pillRow}>
                {EVENTS.map(e => (
                  <Pill
                    key={e}
                    label={e}
                    selected={selectedEvents.includes(e)}
                    onPress={() => toggleEvent(e)}
                  />
                ))}
              </View>
            </Row>

            <Row>
              <FieldLabel>Estimated guest count</FieldLabel>
              <TextInput
                style={[styles.input, { color: tokens.ink }]}
                value={guestCount}
                onChangeText={setGuestCount}
                placeholder="e.g. 300"
                placeholderTextColor={tokens.soft}
                keyboardType="number-pad"
                maxLength={5}
                returnKeyType="done"
              />
            </Row>

            <Row>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: tokens.ink }]}>Show budget figures</Text>
                  <Text style={[styles.rowSub, { color: tokens.soft }]}>Hide or reveal amounts across the app</Text>
                </View>
                <GoldSwitch
                  value={budgetVisible}
                  onValueChange={v => { setBudgetVisible(v); Haptics.selectionAsync(); }}
                />
              </View>
            </Row>

            <SaveButton
              label="Save preferences"
              onPress={savePreferences}
              saving={prefsSaving}
              saved={prefsSaved}
              inkColor={tokens.ink}
            />
          </View>

          {/* ── Section 3: Discovery ────────────────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel>DISCOVERY PREFERENCES</SectionLabel>
            <Text style={styles.sectionHint}>
              The more you select, the smarter your feed — and the better DreamAi understands you.
            </Text>

            <Row>
              <FieldLabel>Categories you care about</FieldLabel>
              <View style={styles.pillRow}>
                {CATEGORIES.map(c => (
                  <Pill
                    key={c}
                    label={c}
                    selected={selectedCats.includes(c)}
                    onPress={() => toggleCat(c)}
                  />
                ))}
              </View>
            </Row>

            <Row>
              <FieldLabel>City for discovery</FieldLabel>
              <TextInput
                style={[styles.input, { color: tokens.ink }]}
                value={discoveryCity}
                onChangeText={setDiscoveryCity}
                placeholder="e.g. Delhi, Mumbai"
                placeholderTextColor={tokens.soft}
                returnKeyType="done"
              />
            </Row>

            <SaveButton
              label="Save discovery"
              onPress={saveDiscovery}
              saving={discoverySaving}
              saved={discoverySaved}
              inkColor={tokens.ink}
            />
          </View>

          {/* ── Section 4: Notifications ────────────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel>NOTIFICATIONS</SectionLabel>
            <Text style={styles.sectionHint}>
              Push wiring activates in the next update. Preferences are saved.
            </Text>

            {([
              { label: 'Task reminders',           sub: 'Get reminded before tasks are due', value: notifTaskReminders, set: setNotifTaskReminders, key: 'taskReminders'   },
              { label: 'Vendor reply alerts',      sub: 'Know when a vendor responds',       value: notifVendorReplies, set: setNotifVendorReplies, key: 'vendorReplies'   },
              { label: 'Payment due alerts',       sub: 'Never miss a payment milestone',    value: notifPaymentAlerts, set: setNotifPaymentAlerts, key: 'paymentAlerts'   },
              { label: 'DreamAi briefing',         sub: 'AI nudges based on your plan',      value: notifDreamAi,       set: setNotifDreamAi,       key: 'dreamAiBriefing' },
            ] as { label: string; sub: string; value: boolean; set: (v: boolean) => void; key: string }[]).map((item) => (
              <Row key={item.key}>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, { color: tokens.ink }]}>{item.label}</Text>
                    <Text style={[styles.rowSub, { color: tokens.soft }]}>{item.sub}</Text>
                  </View>
                  <GoldSwitch
                    value={item.value}
                    onValueChange={v => { item.set(v); persistNotif({ [item.key]: v }); }}
                  />
                </View>
              </Row>
            ))}

            <Row onPress={() => setShowTimePicker(true)}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: tokens.ink }]}>Morning briefing time</Text>
                  <Text style={[styles.rowSub, { color: tokens.soft }]}>When DreamAi briefs you each morning</Text>
                </View>
                <Text style={[styles.timeChip, { color: tokens.ink }]}>{morningTime}</Text>
              </View>
            </Row>

            {showTimePicker && (
              <DateTimePicker
                value={(() => {
                  const [h, m] = morningTime.split(':').map(Number);
                  const d = new Date(); d.setHours(h, m, 0, 0); return d;
                })()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  if (Platform.OS === 'android') setShowTimePicker(false);
                  if (date) {
                    const t = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                    setMorningTime(t);
                    void persistNotif({ morningTime: t });
                  }
                }}
              />
            )}
            {Platform.OS === 'ios' && showTimePicker && (
              <FrostedSurface
                mode="button"
                onPress={() => setShowTimePicker(false)}
                radius={FrostRadius.pill}
                style={styles.pickerDoneOuter}
              >
                <View style={styles.pickerDoneInner}>
                  <Text style={styles.pickerDoneText}>DONE</Text>
                </View>
              </FrostedSurface>
            )}
          </View>

          {/* ── Section 5: Account ──────────────────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel>ACCOUNT</SectionLabel>

            <Row>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: tokens.ink }]}>{tierLabel}</Text>
                  <Text style={[styles.rowSub, { color: tokens.soft }]}>{TIER_PERKS[tier]}</Text>
                </View>
                <View style={styles.tierBadge}>
                  <Text style={styles.tierBadgeText}>{tierLabel.toUpperCase()}</Text>
                </View>
              </View>
            </Row>

            {!isPlat && (
              <Row disabled>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, { color: tokens.ink }]}>
                      Upgrade to {tier === 'lite' ? 'Signature' : 'Platinum'}
                    </Text>
                    <Text style={[styles.rowSub, { color: tokens.soft }]}>
                      {tier === 'lite' ? '₹999' : '₹2,999'} one-time
                    </Text>
                  </View>
                  <Text style={styles.upgradeBadge}>Available from August 1</Text>
                </View>
              </Row>
            )}

            <Row>
              <FieldLabel>WhatsApp number</FieldLabel>
              <TextInput
                style={[styles.input, { color: tokens.ink }]}
                value={whatsappNumber}
                onChangeText={setWhatsappNumber}
                placeholder="+91 XXXXX XXXXX"
                placeholderTextColor={tokens.soft}
                keyboardType="phone-pad"
                maxLength={15}
                returnKeyType="done"
              />
            </Row>

            <SaveButton
              label="Save account"
              onPress={saveAccount}
              saving={accountSaving}
              saved={accountSaved}
              inkColor={tokens.ink}
            />

            {/* Sign out */}
            <FrostedSurface
              mode="button"
              onPress={handleSignOut}
              radius={FrostRadius.pill}
              style={styles.signOutOuter}
            >
              <View style={styles.signOutInner}>
                <LogOut size={16} color={tokens.ink} strokeWidth={1.5} />
                <Text style={[styles.signOutText, { color: tokens.ink }]}>Sign out</Text>
              </View>
            </FrostedSurface>
          </View>

          {/* Toast */}
          {!!toast && (
            <View style={styles.toast} pointerEvents="none">
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </FrostCanvasShell>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: {
    paddingHorizontal: FrostSpace.xxl,
    paddingTop: FrostSpace.xl,
    paddingBottom: FrostSpace.huge,
  },

  heading: {
    ...FrostType.displayM,
    fontStyle: 'italic',
    fontFamily: FrostFonts.display,
  },
  editorial: {
    fontFamily: FrostFonts.body,
    fontSize: 13,
    fontStyle: 'italic',
    color: FrostColors.muted,
    marginTop: FrostSpace.xs,
    marginBottom: FrostSpace.xl,
  },

  section: {
    marginBottom: FrostSpace.xl,
  },
  sectionLabel: {
    ...FrostType.eyebrowSmall,
    letterSpacing: 1.6,
    marginBottom: FrostSpace.m,
  },
  sectionHint: {
    fontFamily: FrostFonts.body,
    fontSize: 12,
    color: FrostColors.muted,
    lineHeight: 18,
    marginBottom: FrostSpace.m,
  },

  rowInner: {
    paddingVertical: FrostSpace.m,
    paddingHorizontal: FrostSpace.l,
  },

  rowLabel: {
    fontFamily: FrostFonts.bodyMedium,
    fontSize: 14,
    color: FrostColors.ink,
    marginBottom: 2,
  },
  rowSub: {
    fontFamily: FrostFonts.body,
    fontSize: 11,
    color: FrostColors.muted,
  },

  fieldLabel: {
    fontFamily: FrostFonts.label,
    fontSize: 9,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: FrostColors.muted,
    marginBottom: FrostSpace.s,
  },

  input: {
    fontFamily: FrostFonts.body,
    fontSize: 15,
    color: FrostColors.ink,
    paddingVertical: 4,
  },
  inputPlaceholder: { color: FrostColors.muted },

  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FrostSpace.m,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: FrostColors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarInitial: {
    fontFamily: FrostFonts.display,
    fontSize: 18,
    color: FrostColors.white,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FrostSpace.m,
  },

  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: FrostSpace.s,
  },
  pillOuter: { marginBottom: 0 },
  pillInner: {
    paddingHorizontal: FrostSpace.m,
    paddingVertical: 6,
  },
  pillText: {
    fontFamily: FrostFonts.label,
    fontSize: 11,
    letterSpacing: 0.6,
    color: FrostColors.muted,
  },
  pillTextActive: {
    fontFamily: FrostFonts.labelMedium,
    color: FrostColors.goldTrue,
  },

  saveBtnOuter: {
    marginTop: FrostSpace.s,
    marginBottom: 0,
  },
  saveBtnInner: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: FrostSpace.l,
  },
  saveBtnText: {
    fontFamily: FrostFonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: FrostColors.ink,
  },

  pickerDoneOuter: {
    alignSelf: 'flex-end',
    marginBottom: FrostSpace.m,
  },
  pickerDoneInner: {
    paddingHorizontal: FrostSpace.l,
    paddingVertical: FrostSpace.s,
  },
  pickerDoneText: {
    fontFamily: FrostFonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: FrostColors.goldTrue,
  },

  timeChip: {
    fontFamily: FrostFonts.bodyMedium,
    fontSize: 13,
    color: FrostColors.ink,
    paddingHorizontal: FrostSpace.m,
    paddingVertical: 4,
  },

  tierBadge: {
    paddingHorizontal: FrostSpace.s + 2,
    paddingVertical: 4,
    borderRadius: FrostRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.goldMuted,
  },
  tierBadgeText: {
    fontFamily: FrostFonts.label,
    fontSize: 9,
    letterSpacing: 1.6,
    color: FrostColors.goldTrue,
  },

  upgradeBadge: {
    fontFamily: FrostFonts.label,
    fontSize: 9,
    letterSpacing: 0.4,
    color: FrostColors.muted,
  },

  signOutOuter: {
    marginTop: FrostSpace.xl,
    marginBottom: 0,
  },
  signOutInner: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FrostSpace.s,
  },
  signOutText: {
    fontFamily: FrostFonts.bodyMedium,
    fontSize: 14,
    // color applied inline via tokens.ink — mode-aware
  },

  toast: {
    alignSelf: 'center',
    paddingHorizontal: FrostSpace.l,
    paddingVertical: FrostSpace.s,
    borderRadius: FrostRadius.pill,
    backgroundColor: FrostColors.ink,
    marginTop: FrostSpace.xl,
  },
  toastText: {
    fontFamily: FrostFonts.body,
    fontSize: 12,
    color: FrostColors.white,
  },
});
