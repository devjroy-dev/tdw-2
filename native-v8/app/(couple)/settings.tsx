/**
 * TDW Native V8 — Couple Full Settings Screen
 * Entry: router.push('/(couple)/settings') from profile.tsx Settings row
 *
 * Five sections per Manager directive:
 *   1. Identity     — name, partner, wedding date, city, photo (Cloudinary)
 *   2. Preferences  — events pills, guest count, budget visibility
 *   3. Discovery    — category toggles, discovery city
 *   4. Notifications — UI toggles + time picker (AsyncStorage only, V9 wires push)
 *   5. Account      — tier, upgrade CTA, WhatsApp, sign out
 *
 * Save pattern: explicit SAVE button per section (matches PWA pattern)
 *
 * Endpoints:
 *   GET  /api/v2/couple/profile/:userId  — load profile
 *   GET  /api/users/:userId              — load residence/wedding city + phone
 *   PATCH /api/v2/couple/profile/:userId — save identity, prefs, discovery, phone
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
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Fonts, Radius, RAILWAY_URL } from '../../constants/tokens';

// ─── Constants ────────────────────────────────────────────────────────────────

const API = RAILWAY_URL;
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dccso5ljv/image/upload';
const CLOUDINARY_PRESET = 'dream_wedding_uploads';
const JOST = 'Jost_300Light';

const EVENTS = ['Mehendi', 'Sangeet', 'Haldi', 'Reception', 'Cocktail', 'Engagement', 'Other'] as const;
type WeddingEvent = typeof EVENTS[number];

const CATEGORIES = ['MUA', 'Photographer', 'Jeweller', 'Designer', 'Decorator', 'Venue'] as const;
type DiscoveryCat = typeof CATEGORIES[number];

const TIER_PERKS: Record<string, string> = {
  lite: '10 DreamAi queries · Discovery · Guest list',
  signature: '25 DreamAi queries · Full plan suite · Priority support',
  platinum: '50 DreamAi queries · Couture access · Memory Box',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  return json.secure_url;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children.toUpperCase()}</Text>;
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function GoldSwitch({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#D8D4CE', true: Colors.gold }}
      thumbColor={Colors.card}
      ios_backgroundColor="#D8D4CE"
    />
  );
}

function Pill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.pill, selected && styles.pillActive]}
      activeOpacity={0.75}
    >
      <Text style={[styles.pillText, selected && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SaveButton({
  label, onPress, saving, saved,
}: {
  label: string; onPress: () => void; saving: boolean; saved: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={saving}
      style={[styles.saveBtn, saved && styles.saveBtnSaved]}
      activeOpacity={0.85}
    >
      {saving
        ? <ActivityIndicator size="small" color={Colors.background} />
        : <Text style={styles.saveBtnText}>{saved ? '✓  SAVED' : label.toUpperCase()}</Text>
      }
    </TouchableOpacity>
  );
}

function InputField({
  value, onChangeText, placeholder, keyboardType, maxLength,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  maxLength?: number;
}) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.muted}
      keyboardType={keyboardType ?? 'default'}
      maxLength={maxLength}
      returnKeyType="done"
    />
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [tier, setTier] = useState<'lite' | 'signature' | 'platinum'>('lite');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);

  // ─── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => { void init(); }, []);

  async function init() {
    try {
      const raw =
        (await AsyncStorage.getItem('couple_session')) ??
        (await AsyncStorage.getItem('couple_web_session'));
      if (!raw) { router.replace('/'); return; }
      const session = JSON.parse(raw);
      if (!session?.id) { router.replace('/'); return; }
      setUserId(session.id);

      // Load notif prefs
      const notifRaw = await AsyncStorage.getItem('notif_prefs');
      if (notifRaw) {
        try {
          const np = JSON.parse(notifRaw);
          if (np.taskReminders !== undefined) setNotifTaskReminders(np.taskReminders);
          if (np.vendorReplies !== undefined) setNotifVendorReplies(np.vendorReplies);
          if (np.paymentAlerts !== undefined) setNotifPaymentAlerts(np.paymentAlerts);
          if (np.dreamAiBriefing !== undefined) setNotifDreamAi(np.dreamAiBriefing);
          if (np.morningTime) setMorningTime(np.morningTime);
        } catch {}
      }

      const bv = await AsyncStorage.getItem('budget_visible');
      if (bv !== null) setBudgetVisible(bv !== 'false');

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
          // Read couple_tier only — NEVER dreamer_type
          const rawTier = pd.couple_tier || pd.tier || 'lite';
          setTier(['lite', 'signature', 'platinum'].includes(rawTier) ? rawTier as any : 'lite');
          if (pd.wedding_date) {
            setDateIso(pd.wedding_date);
            const d = new Date(pd.wedding_date);
            if (!isNaN(d.getTime())) setSelectedDate(d);
          }
          if (pd.photo_url) setSavedPhotoUrl(pd.photo_url);
          if (pd.guest_count != null) setGuestCount(String(pd.guest_count));
          if (Array.isArray(pd.wedding_events)) {
            setSelectedEvents(pd.wedding_events.filter((e: string): e is WeddingEvent => (EVENTS as readonly string[]).includes(e)));
          }
          if (Array.isArray(pd.discovery_categories)) {
            setSelectedCats(pd.discovery_categories.filter((c: string): c is DiscoveryCat => (CATEGORIES as readonly string[]).includes(c)));
          }
          if (pd.discovery_city) setDiscoveryCity(pd.discovery_city);
        }
      }

      if (userRes.status === 'fulfilled') {
        const ud = userRes.value?.data ?? userRes.value;
        if (ud) {
          if (ud.residence_country) setIdentityCity(prev => prev || ud.residence_country);
          if (ud.wedding_country) setDiscoveryCity(prev => prev || ud.wedding_country);
          if (ud.phone) setWhatsappNumber(ud.phone);
        }
      }
    } catch (e) {
      console.error('[Settings init]', e);
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

  // ─── Section 1 save ────────────────────────────────────────────────────────

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

  // ─── Section 2 save ────────────────────────────────────────────────────────

  async function savePreferences() {
    if (!userId) return;
    setPrefsSaving(true);
    try {
      await AsyncStorage.setItem('budget_visible', budgetVisible ? 'true' : 'false');
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

  // ─── Section 3 save ────────────────────────────────────────────────────────

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

  // ─── Section 4 — notif helpers ─────────────────────────────────────────────

  async function persistNotif(patch: Record<string, any>) {
    const current = {
      taskReminders: notifTaskReminders,
      vendorReplies: notifVendorReplies,
      paymentAlerts: notifPaymentAlerts,
      dreamAiBriefing: notifDreamAi,
      morningTime,
      ...patch,
    };
    await AsyncStorage.setItem('notif_prefs', JSON.stringify(current));
    Haptics.selectionAsync();
  }

  // ─── Section 5 — account save ──────────────────────────────────────────────

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

  // ─── Sign out ──────────────────────────────────────────────────────────────

  function handleSignOut() {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out', style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['couple_session', 'couple_web_session']);
            router.replace('/');
          },
        },
      ],
      { cancelable: true }
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  const displayPhoto = localPhotoUri ?? savedPhotoUrl;
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const isPlat = tier === 'platinum';

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>

      {!!toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 48 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Editorial line */}
          <Text style={styles.editorial}>
            The more you tell us, the better we find.
          </Text>

          {/* ── Section 1: Identity ─────────────────────────────────────── */}
          <SectionLabel>Identity</SectionLabel>
          <Card>
            {/* Photo */}
            <TouchableOpacity onPress={pickPhoto} style={styles.photoRow} activeOpacity={0.8}>
              <View style={styles.avatar}>
                {displayPhoto
                  ? <Image source={{ uri: displayPhoto }} style={styles.avatarImg} />
                  : <Text style={styles.avatarInitial}>{(identityName || 'D')[0].toUpperCase()}</Text>
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Profile photo</Text>
                <Text style={styles.rowSub}>Tap to change</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <Divider />
            <FieldLabel>Bride's name</FieldLabel>
            <InputField value={identityName} onChangeText={setIdentityName} placeholder="Your name" />

            <Divider />
            <FieldLabel>Partner's name</FieldLabel>
            <InputField value={identityPartner} onChangeText={setIdentityPartner} placeholder="Their name" />

            <Divider />
            <FieldLabel>Wedding date</FieldLabel>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateTrigger} activeOpacity={0.8}>
              <Text style={[styles.dateText, !dateIso && styles.datePlaceholder]}>
                {dateIso ? formatDisplayDate(dateIso) : 'Select date'}
              </Text>
            </TouchableOpacity>
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
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.doneBtn} activeOpacity={0.8}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            )}

            <Divider />
            <FieldLabel>City</FieldLabel>
            <InputField value={identityCity} onChangeText={setIdentityCity} placeholder="Your city" />
          </Card>
          <SaveButton label="Save identity" onPress={saveIdentity} saving={identitySaving} saved={identitySaved} />

          {/* ── Section 2: Wedding preferences ─────────────────────────── */}
          <SectionLabel>Wedding preferences</SectionLabel>
          <Card>
            <FieldLabel>Events you are planning</FieldLabel>
            <View style={styles.pillRow}>
              {EVENTS.map(e => (
                <Pill key={e} label={e} selected={selectedEvents.includes(e)} onPress={() => toggleEvent(e)} />
              ))}
            </View>

            <Divider />
            <FieldLabel>Estimated guest count</FieldLabel>
            <InputField
              value={guestCount}
              onChangeText={setGuestCount}
              placeholder="e.g. 300"
              keyboardType="number-pad"
              maxLength={5}
            />

            <Divider />
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Show budget figures</Text>
                <Text style={styles.rowSub}>Hide or reveal amounts across the app</Text>
              </View>
              <GoldSwitch
                value={budgetVisible}
                onValueChange={v => { setBudgetVisible(v); Haptics.selectionAsync(); }}
              />
            </View>
          </Card>
          <SaveButton label="Save preferences" onPress={savePreferences} saving={prefsSaving} saved={prefsSaved} />

          {/* ── Section 3: Discovery ────────────────────────────────────── */}
          <SectionLabel>Discovery preferences</SectionLabel>
          <Text style={styles.sectionHint}>
            The more you select, the smarter your feed — and the better DreamAi understands you.
          </Text>
          <Card>
            <FieldLabel>Categories you care about</FieldLabel>
            <View style={styles.pillRow}>
              {CATEGORIES.map(c => (
                <Pill key={c} label={c} selected={selectedCats.includes(c)} onPress={() => toggleCat(c)} />
              ))}
            </View>

            <Divider />
            <FieldLabel>City for discovery</FieldLabel>
            <InputField value={discoveryCity} onChangeText={setDiscoveryCity} placeholder="e.g. Delhi, Mumbai" />
          </Card>
          <SaveButton label="Save discovery" onPress={saveDiscovery} saving={discoverySaving} saved={discoverySaved} />

          {/* ── Section 4: Notifications ────────────────────────────────── */}
          <SectionLabel>Notifications</SectionLabel>
          <Text style={styles.sectionHint}>
            Push wiring activates in the next update. Preferences are saved.
          </Text>
          <Card>
            {([
              { label: 'Task reminders', sub: 'Get reminded before tasks are due', value: notifTaskReminders, set: setNotifTaskReminders, key: 'taskReminders' },
              { label: 'Vendor reply alerts', sub: 'Know when a vendor responds', value: notifVendorReplies, set: setNotifVendorReplies, key: 'vendorReplies' },
              { label: 'Payment due alerts', sub: 'Never miss a payment milestone', value: notifPaymentAlerts, set: setNotifPaymentAlerts, key: 'paymentAlerts' },
              { label: 'DreamAi proactive briefing', sub: 'AI nudges based on your plan', value: notifDreamAi, set: setNotifDreamAi, key: 'dreamAiBriefing' },
            ] as { label: string; sub: string; value: boolean; set: (v: boolean) => void; key: string }[]).map((item, i, arr) => (
              <View key={item.label}>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    <Text style={styles.rowSub}>{item.sub}</Text>
                  </View>
                  <GoldSwitch
                    value={item.value}
                    onValueChange={v => { item.set(v); persistNotif({ [item.key]: v }); }}
                  />
                </View>
                {i < arr.length - 1 && <Divider />}
              </View>
            ))}

            <Divider />

            {/* Morning time */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Morning briefing time</Text>
                <Text style={styles.rowSub}>When DreamAi briefs you each morning</Text>
              </View>
              <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.timeChip} activeOpacity={0.8}>
                <Text style={styles.timeChipText}>{morningTime}</Text>
              </TouchableOpacity>
            </View>
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
                    persistNotif({ morningTime: t });
                  }
                }}
              />
            )}
            {Platform.OS === 'ios' && showTimePicker && (
              <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.doneBtn} activeOpacity={0.8}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            )}
          </Card>

          {/* ── Section 5: Account ──────────────────────────────────────── */}
          <SectionLabel>Account</SectionLabel>
          <Card>
            {/* Tier */}
            <View style={styles.tierRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{tierLabel}</Text>
                <Text style={styles.rowSub}>{TIER_PERKS[tier] ?? ''}</Text>
              </View>
              <View style={[styles.tierBadge, isPlat && styles.tierBadgePlat]}>
                <Text style={[styles.tierBadgeText, isPlat && styles.tierBadgeTextPlat]}>
                  {tierLabel.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Upgrade CTA — always visible for non-Platinum, disabled */}
            {!isPlat && (
              <>
                <Divider />
                <View style={styles.upgradeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>
                      Upgrade to {tier === 'lite' ? 'Signature' : 'Platinum'}
                    </Text>
                    <Text style={styles.upgradePriceText}>
                      {tier === 'lite' ? '₹999' : '₹2,999'} one-time
                    </Text>
                  </View>
                  <View style={styles.upgradeBadge}>
                    <Text style={styles.upgradeBadgeText}>Available from August 1</Text>
                  </View>
                </View>
              </>
            )}

            <Divider />
            <FieldLabel>WhatsApp number</FieldLabel>
            <InputField
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
              placeholder="+91 XXXXX XXXXX"
              keyboardType="phone-pad"
              maxLength={15}
            />
          </Card>
          <SaveButton label="Save account" onPress={saveAccount} saving={accountSaving} saved={accountSaved} />

          {/* Sign out */}
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutRow} activeOpacity={0.7}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  toast: {
    position: 'absolute', top: 64, alignSelf: 'center',
    backgroundColor: Colors.dark, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, zIndex: 999,
  },
  toastText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: { width: 40 },
  backArrow: { fontFamily: Fonts.body, fontSize: 22, color: Colors.ink },
  headerTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.ink },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },

  editorial: {
    fontFamily: Fonts.body, fontSize: 12, color: Colors.muted,
    fontStyle: 'italic', marginBottom: 28,
  },

  sectionLabel: {
    fontFamily: JOST, fontSize: 9, letterSpacing: 2.5,
    color: Colors.muted, marginBottom: 10, marginTop: 4,
  },
  sectionHint: {
    fontFamily: Fonts.body, fontSize: 12, color: Colors.muted,
    marginBottom: 10, lineHeight: 18,
  },

  fieldLabel: {
    fontFamily: Fonts.body, fontSize: 11, color: Colors.muted,
    marginBottom: 6, marginTop: 2,
  },

  card: {
    backgroundColor: Colors.card, borderRadius: Radius.card,
    borderWidth: 0.5, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12,
  },

  divider: {
    height: 0.5, backgroundColor: Colors.border,
    marginVertical: 14, marginHorizontal: -16,
  },

  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 2 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.dark,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarInitial: { fontFamily: Fonts.display, fontSize: 20, color: Colors.background },
  chevron: { fontFamily: Fonts.body, fontSize: 22, color: Colors.border },

  input: {
    fontFamily: Fonts.body, fontSize: 14, color: Colors.ink,
    paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border,
  },

  dateTrigger: { paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  dateText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.ink },
  datePlaceholder: { color: Colors.muted },
  doneBtn: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
  doneBtnText: { fontFamily: Fonts.label, fontSize: 13, color: Colors.gold },

  saveBtn: {
    height: 44, borderRadius: Radius.pill, backgroundColor: Colors.dark,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  saveBtnSaved: { backgroundColor: '#2D7A4F' },
  saveBtnText: { fontFamily: JOST, fontSize: 10, letterSpacing: 2, color: Colors.background },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 4 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.pill,
    borderWidth: 0.5, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  pillActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '18' },
  pillText: { fontFamily: Fonts.label, fontSize: 11, color: Colors.muted },
  pillTextActive: { color: Colors.gold },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 2 },
  rowLabel: { fontFamily: Fonts.body, fontSize: 14, color: Colors.ink, marginBottom: 2 },
  rowSub: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },

  timeChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 0.5, borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  timeChipText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.ink },

  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 2 },
  tierBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 0.5, borderColor: Colors.gold,
  },
  tierBadgePlat: { borderColor: Colors.dark },
  tierBadgeText: { fontFamily: JOST, fontSize: 9, letterSpacing: 1.5, color: Colors.gold },
  tierBadgeTextPlat: { color: Colors.dark },

  upgradeRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 2 },
  upgradePriceText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 2 },
  upgradeBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    borderWidth: 0.5, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  upgradeBadgeText: { fontFamily: Fonts.body, fontSize: 9, color: Colors.muted },

  signOutRow: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  signOutText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted },
});
