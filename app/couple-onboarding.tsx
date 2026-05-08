import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { RAILWAY_URL } from '../constants/tokens';
import { getCoupleSession, setCoupleSession } from '../utils/session';
import { isBiometricAvailable, setBiometricEnabled } from '../utils/biometric';

const API = RAILWAY_URL;
const GOLD = '#C9A84C';

// Same India city set as PWA for segment detection
const INDIA_CITY_SET = new Set([
  'India','Delhi','Mumbai','Bangalore','Chennai','Hyderabad','Kolkata','Jaipur','Udaipur',
  'Pune','Ahmedabad','Chandigarh','Lucknow','Kochi','Goa','Amritsar','Surat','Jodhpur',
  'Agra','Varanasi','Bhopal','Indore','Nagpur','Coimbatore','Madurai','Visakhapatnam',
  'Noida','Gurgaon','Faridabad','Thane','Navi Mumbai',
]);
const isIndiaCity = (v: string) => INDIA_CITY_SET.has(v) || v === 'India';

const WEDDING_STYLES = ['Hindu','Muslim','Christian','Sikh','Jain','Buddhist','Jewish','Civil','Fusion','Other'];
const SEASONS = [
  { label: 'Jan – Mar', value: 'Q1' },
  { label: 'Apr – Jun', value: 'Q2' },
  { label: 'Jul – Sep', value: 'Q3' },
  { label: 'Oct – Dec', value: 'Q4' },
];

type DateMode = 'exact' | 'rough' | 'exploring' | null;

export default function CoupleOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const nameRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [dateMode, setDateMode] = useState<DateMode>(null);
  const [exactDate, setExactDate] = useState('');
  const [roughSeason, setRoughSeason] = useState('');
  const [residenceCountry, setResidenceCountry] = useState('India');
  const [weddingCountry, setWeddingCountry] = useState('India');
  const [weddingStyle, setWeddingStyle] = useState('Hindu');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [showBiometricOffer, setShowBiometricOffer] = useState(false);
  const [slides, setSlides] = useState<string[]>([]);
  const [slide, setSlide] = useState(0);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  useEffect(() => {
    getCoupleSession().then(s => {
      if (!s?.id && !s?.userId) { router.replace('/'); return; }
      // Already has name — skip to PIN
      if (s?.name) { router.replace('/couple-pin'); return; }
    });
    fetch(`${API}/api/v2/cover-photos`)
      .then(r => r.json())
      .then(d => { if (d.photos?.length) setSlides(d.photos.map((p: any) => p.image_url)); })
      .catch(() => {});
    setTimeout(() => nameRef.current?.focus(), 300);
  }, []);

  // Carousel rotation — separate effect so the interval reads the live slides count.
  // (Putting it in the mount effect captures slides.length === 0 forever.)
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setSlide(p => (p + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides.length]);

  const buildWeddingDate = (): string | null => {
    if (dateMode === 'exact' && exactDate) return exactDate;
    if (dateMode === 'rough' && roughSeason) {
      const year = new Date().getFullYear();
      const map: Record<string, string> = {
        Q1: `${year}-02-01`, Q2: `${year}-05-01`,
        Q3: `${year}-08-01`, Q4: `${year}-11-01`,
      };
      return map[roughSeason] || null;
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!name.trim()) { showToast('Please enter your name'); return; }
    setLoading(true);
    try {
      const session = await getCoupleSession();
      const userId = session?.id || session?.userId;
      const phone = session?.phone;

      // EXACT PWA field names — snake_case
      const r = await fetch(`${API}/api/v2/couple/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          phone,
          name: name.trim(),
          partner_name: partnerName.trim() || null,
          wedding_date: buildWeddingDate(),
          residence_country: residenceCountry,
          wedding_country: weddingCountry,
          wedding_style: weddingStyle.toLowerCase(),
          user_segment: (isIndiaCity(residenceCountry) && isIndiaCity(weddingCountry))
            ? 'india'
            : (!isIndiaCity(residenceCountry))
              ? (isIndiaCity(weddingCountry) ? 'nri' : 'global')
              : 'india',
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || 'Failed');

      await setCoupleSession({ ...session, name: name.trim(), partner_name: partnerName.trim() || null });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Offer biometric if available
      const bioAvailable = await isBiometricAvailable();
      if (bioAvailable) {
        setShowBiometricOffer(true);
      } else {
        router.replace('/couple-pin');
      }
    } catch { showToast('Could not save. Try again.'); }
    finally { setLoading(false); }
  };

  async function handleBiometricEnable() {
    await setBiometricEnabled(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/couple-pin');
  }

  if (showBiometricOffer) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }]}>
        <Text style={styles.bioSparkle}>✦</Text>
        <Text style={styles.bioTitle}>Sign in faster next time</Text>
        <Text style={styles.bioBody}>Use Face ID or fingerprint to open The Dream Wedding instantly.</Text>
        <TouchableOpacity style={styles.bioEnableBtn} onPress={handleBiometricEnable} activeOpacity={0.85}>
          <Text style={styles.bioEnableText}>ENABLE</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/couple-pin')}>
          <Text style={styles.bioLaterText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Carousel background */}
      {slides.map((src, i) => (
        <Image key={i} source={{ uri: src }} style={[styles.slide, { opacity: i === slide ? 0.5 : 0 }]} resizeMode="cover" />
      ))}
      <View style={styles.darkOverlay} />

      {/* Toast */}
      {!!toast && (
        <View style={[styles.toast, { top: insets.top + 24 }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.panel, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.brandName}>The Dream Wedding</Text>
        <Text style={styles.brandTag}>YOUR JOURNEY BEGINS</Text>
        <Text style={styles.heading}>Let's get to know you.</Text>
        <Text style={styles.subheading}>A few details so we can make this feel personal.</Text>

        {/* Your name */}
        <Text style={styles.fieldLabel}>YOUR NAME <Text style={{ color: GOLD }}>*</Text></Text>
        <TextInput
          ref={nameRef}
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="rgba(248,247,245,0.25)"
          autoCapitalize="words"
          returnKeyType="next"
        />
        <View style={styles.inputUnderline} />

        <View style={{ height: 24 }} />

        {/* Partner name */}
        <Text style={styles.fieldLabel}>PARTNER'S NAME <Text style={{ color: 'rgba(248,247,245,0.3)', fontSize: 7 }}>(OPTIONAL)</Text></Text>
        <TextInput
          style={styles.textInput}
          value={partnerName}
          onChangeText={setPartnerName}
          placeholder="Partner's name (optional)"
          placeholderTextColor="rgba(248,247,245,0.25)"
          autoCapitalize="words"
          returnKeyType="next"
        />
        <View style={styles.inputUnderline} />

        <View style={{ height: 24 }} />

        {/* Wedding date */}
        <Text style={styles.fieldLabel}>WEDDING DATE</Text>
        <View style={{ gap: 10, marginBottom: dateMode ? 16 : 24 }}>
          {[
            { mode: 'exact' as DateMode, label: 'Yes — I have a date' },
            { mode: 'rough' as DateMode, label: 'Roughly — give or take a season' },
            { mode: 'exploring' as DateMode, label: 'Just exploring for now' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.mode!}
              style={styles.radioRow}
              onPress={() => { setDateMode(opt.mode); setExactDate(''); setRoughSeason(''); }}
            >
              <View style={[styles.radioOuter, dateMode === opt.mode && styles.radioOuterActive]}>
                {dateMode === opt.mode && <View style={styles.radioInner} />}
              </View>
              <Text style={[styles.radioLabel, dateMode === opt.mode && styles.radioLabelActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Exact date — simple text input matching PWA */}
        {dateMode === 'exact' && (
          <View style={{ marginBottom: 20 }}>
            <TextInput
              style={styles.dateInput}
              value={exactDate}
              onChangeText={setExactDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="rgba(248,247,245,0.3)"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        )}

        {/* Season picker */}
        {dateMode === 'rough' && (
          <View style={styles.seasonGrid}>
            {SEASONS.map(s => (
              <TouchableOpacity
                key={s.value}
                style={[styles.seasonBtn, roughSeason === s.value && styles.seasonBtnActive]}
                onPress={() => setRoughSeason(s.value)}
              >
                <Text style={[styles.seasonText, roughSeason === s.value && styles.seasonTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 4 }} />

        {/* Where do you live */}
        <Text style={styles.fieldLabel}>WHERE DO YOU LIVE?</Text>
        <View style={styles.pillRow}>
          {['India', 'Outside India'].map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.pill, residenceCountry === opt && styles.pillActive]}
              onPress={() => setResidenceCountry(opt)}
            >
              <Text style={[styles.pillText, residenceCountry === opt && styles.pillTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 20 }} />

        {/* Where will your wedding be */}
        <Text style={styles.fieldLabel}>WHERE WILL YOUR WEDDING BE?</Text>
        <View style={styles.pillRow}>
          {['India', 'Outside India', 'Not sure'].map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.pill, weddingCountry === opt && styles.pillActive]}
              onPress={() => setWeddingCountry(opt)}
            >
              <Text style={[styles.pillText, weddingCountry === opt && styles.pillTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 20 }} />

        {/* Wedding style */}
        <Text style={styles.fieldLabel}>WHAT'S YOUR WEDDING STYLE?</Text>
        <View style={styles.pillRow}>
          {WEDDING_STYLES.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.pill, weddingStyle === opt && styles.pillActive]}
              onPress={() => setWeddingStyle(opt)}
            >
              <Text style={[styles.pillText, weddingStyle === opt && styles.pillTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />

        {/* CTA */}
        <TouchableOpacity
          style={[styles.cta, (!name.trim() || loading) && styles.ctaDisabled]}
          onPress={handleSubmit}
          disabled={!name.trim() || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{loading ? 'SAVING…' : "LET'S GO →"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0C0A09' },
  slide: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  darkOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12,10,9,0.5)' },
  toast: {
    position: 'absolute', left: '10%', right: '10%', zIndex: 100,
    backgroundColor: 'rgba(201,168,76,0.12)', borderRadius: 100,
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.3)',
    padding: 10, alignItems: 'center',
  },
  toastText: { fontFamily: 'DMSans_300Light', fontSize: 13, color: GOLD },
  scroll: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  panel: {
    backgroundColor: 'rgba(12,10,9,0.32)',
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  brandName: { fontFamily: 'CormorantGaramond_300Light', fontSize: 14, color: 'rgba(248,247,245,0.5)', fontStyle: 'italic', marginBottom: 2 },
  brandTag: { fontFamily: 'DMSans_300Light', fontSize: 6, letterSpacing: 5, textTransform: 'uppercase', color: GOLD, marginBottom: 22 },
  heading: { fontFamily: 'CormorantGaramond_300Light', fontSize: 26, color: '#F8F7F5', marginBottom: 4, lineHeight: 30 },
  subheading: { fontFamily: 'DMSans_300Light', fontSize: 13, color: 'rgba(248,247,245,0.4)', marginBottom: 28, lineHeight: 20 },
  fieldLabel: { fontFamily: 'DMSans_300Light', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(248,247,245,0.4)', marginBottom: 8 },
  textInput: { fontFamily: 'DMSans_300Light', fontSize: 16, color: '#F8F7F5', paddingBottom: 8 },
  inputUnderline: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  dateInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10, padding: 12,
    fontFamily: 'DMSans_300Light', fontSize: 15, color: '#F8F7F5',
  },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  radioOuterActive: { borderWidth: 1.5, borderColor: GOLD },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: GOLD },
  radioLabel: { fontFamily: 'DMSans_300Light', fontSize: 14, color: 'rgba(248,247,245,0.5)' },
  radioLabelActive: { color: '#F8F7F5' },
  seasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  seasonBtn: {
    width: '47%', paddingVertical: 11, borderRadius: 10,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
  },
  seasonBtnActive: { borderColor: GOLD, backgroundColor: 'rgba(201,168,76,0.12)' },
  seasonText: { fontFamily: 'DMSans_300Light', fontSize: 13, color: 'rgba(248,247,245,0.55)' },
  seasonTextActive: { color: GOLD },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 100,
    paddingHorizontal: 16, paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pillActive: { borderColor: GOLD, backgroundColor: 'rgba(201,168,76,0.12)' },
  pillText: { fontFamily: 'DMSans_300Light', fontSize: 13, color: 'rgba(248,247,245,0.55)' },
  pillTextActive: { color: GOLD },
  cta: {
    height: 52, backgroundColor: GOLD, borderRadius: 100,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: 'rgba(201,168,76,0.3)' },
  ctaText: { fontFamily: 'DMSans_300Light', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#0C0A09' },
  // Biometric offer
  bioSparkle: { fontSize: 24, color: GOLD, marginBottom: 24 },
  bioTitle: { fontFamily: 'CormorantGaramond_300Light', fontSize: 28, color: '#F8F7F5', textAlign: 'center', marginBottom: 12 },
  bioBody: { fontFamily: 'DMSans_300Light', fontSize: 14, color: 'rgba(248,247,245,0.5)', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  bioEnableBtn: { backgroundColor: GOLD, height: 52, borderRadius: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 20, width: '100%' },
  bioEnableText: { fontFamily: 'DMSans_300Light', fontSize: 10, color: '#0C0A09', letterSpacing: 2, textTransform: 'uppercase' },
  bioLaterText: { fontFamily: 'DMSans_300Light', fontSize: 13, color: 'rgba(248,247,245,0.4)', textDecorationLine: 'underline' },
});
