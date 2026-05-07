import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { RAILWAY_URL } from '../constants/tokens';
import { setCoupleSession, setVendorSession } from '../utils/session';
import { isBiometricAvailable, isBiometricEnabled, authenticateWithBiometric } from '../utils/biometric';

const { width: W, height: H } = Dimensions.get('window');
const BACKEND = RAILWAY_URL;

type Screen =
  | 'entry'
  | 'exploring'
  | 'request_who'
  | 'request_dreamer'
  | 'request_maker'
  | 'request_done'
  | 'invite_code'
  | 'invite_phone'
  | 'invite_otp'
  | 'signin_phone'
  | 'signin_otp';

type Role = 'Dreamer' | 'Maker';
type DateStatus = 'exact' | 'season' | 'browsing' | null;
type Season = 'jan_mar' | 'apr_jun' | 'jul_sep' | 'oct_jan' | null;

interface ExploringPhoto {
  id: string;
  image_url: string;
  display_order: number;
  caption: string | null;
}

const MAKER_CATEGORIES = ['Photographer', 'MUA', 'Designer', 'Jeweller', 'Venue', 'Decorator', 'Event Manager', 'Choreographer', 'Other'];
const SEASONS = [
  { key: 'jan_mar', label: 'Jan – Mar' },
  { key: 'apr_jun', label: 'Apr – Jun' },
  { key: 'jul_sep', label: 'Jul – Sep' },
  { key: 'oct_jan', label: 'Oct – Jan' },
];

export default function LandingScreen() {
  const insets = useSafeAreaInsets();

  // Carousel
  const [slides, setSlides] = useState<string[]>([]);
  const [cur, setCur] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Panel state
  const [screen, setScreen] = useState<Screen>('entry');
  const [entryExpanded, setEntryExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  // Role
  const [role, setRole] = useState<Role | null>(null);

  // Toast
  const [toast, setToast] = useState('');

  // Request form
  const [reqName, setReqName] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqInstagram, setReqInstagram] = useState('');
  const [reqCategory, setReqCategory] = useState('Photographer');
  const [reqCategoryOther, setReqCategoryOther] = useState('');
  const [dateStatus, setDateStatus] = useState<DateStatus>(null);
  const [exactDate, setExactDate] = useState('');
  const [season, setSeason] = useState<Season>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editSecondsLeft, setEditSecondsLeft] = useState(0);
  const editTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Invite / OTP
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  // Exploring
  const [exploringPhotos, setExploringPhotos] = useState<ExploringPhoto[]>([]);
  const [exploringIdx, setExploringIdx] = useState(0);
  const [exploringDone, setExploringDone] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Session check on mount
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const { getCoupleSession, getVendorSession } = await import('../utils/session');
      const [cs, vs] = await Promise.all([getCoupleSession(), getVendorSession()]);
      // Only route to Today if session has a real userId — not a partial PIN-pending session
      const csValid = cs?.id || cs?.userId;
      const vsValid = vs?.id || vs?.userId || vs?.vendorId;
      if (csValid || vsValid) {
        const bioEnabled = await isBiometricEnabled();
        if (bioEnabled) {
          const ok = await authenticateWithBiometric();
          if (ok) {
            router.replace(csValid ? '/(couple)/today' : '/(vendor)/today');
            return;
          }
        } else {
          router.replace(csValid ? '/(couple)/today' : '/(vendor)/today');
          return;
        }
      }
    } catch {}
  }

  // Carousel
  const startCarousel = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => setCur(c => (c + 1) % Math.max(slides.length, 1)), 4000);
  }, [slides.length]);

  const pauseCarousel = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => {
    fetch(`${BACKEND}/api/v2/cover-photos`)
      .then(r => r.json())
      .then(d => { if (d.photos?.length) setSlides(d.photos.map((p: any) => p.image_url)); })
      .catch(() => {});
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (editTimerRef.current) clearInterval(editTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (screen === 'exploring') pauseCarousel();
    else startCarousel();
  }, [screen, slides.length]);

  // Expand animation
  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: entryExpanded ? 1 : 0,
      duration: 440,
      useNativeDriver: false,
    }).start();
  }, [entryExpanded]);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 3000);
  };

  // Just exploring
  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    setExploringIdx(0);
    setExploringDone(false);
    try {
      const r = await fetch(`${BACKEND}/api/v2/exploring-photos`);
      const d = await r.json();
      if (d.success && d.photos?.length) {
        setExploringPhotos(d.photos);
      } else {
        const r2 = await fetch(`${BACKEND}/api/v2/preview-vendors`);
        const d2 = await r2.json();
        if (d2.success && d2.data?.length) {
          const fallback = d2.data
            .filter((v: any) => v.featured_photos?.[0] || v.portfolio_images?.[0])
            .map((v: any, i: number) => ({
              id: v.id,
              image_url: v.featured_photos?.[0] || v.portfolio_images?.[0] || '',
              display_order: i + 1,
              caption: null,
            }));
          setExploringPhotos(fallback);
        } else {
          setExploringDone(true);
        }
      }
    } catch { setExploringDone(true); }
    setLoadingPreview(false);
  }, []);

  const startExploring = () => {
    setScreen('exploring');
    setExploringIdx(0);
    setExploringDone(false);
    setExploringPhotos([]);
    loadPreview();
  };

  const nextExploring = () => {
    if (exploringIdx >= exploringPhotos.length - 1) setExploringDone(true);
    else setExploringIdx(i => i + 1);
  };

  // Request submit
  const submitRequest = async (isEdit = false) => {
    if (!reqPhone.trim() || submitting) return;
    setSubmitting(true);
    try {
      const payload: any = {
        phone: reqPhone.replace(/\D/g, ''),
        instagram: reqInstagram || null,
        role: role === 'Dreamer' ? 'dreamer' : 'maker',
        name: reqName || null,
      };
      if (role === 'Maker') {
        payload.category = reqCategory;
        payload.category_other = reqCategory === 'Other' ? reqCategoryOther : null;
      }
      if (dateStatus === 'exact' && exactDate) {
        payload.wedding_date = exactDate;
        payload.wedding_date_status = 'exact';
      } else if (dateStatus === 'season' && season) {
        payload.wedding_date_season = season;
        payload.wedding_date_status = 'season';
      } else if (dateStatus === 'browsing') {
        payload.wedding_date_status = 'browsing';
      }
      await fetch(`${BACKEND}/api/v2/waitlist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!isEdit) {
        setScreen('request_done');
        setEditSecondsLeft(60);
        editTimerRef.current = setInterval(() => {
          setEditSecondsLeft(s => { if (s <= 1) { clearInterval(editTimerRef.current!); return 0; } return s - 1; });
        }, 1000);
      } else {
        showToast('Details updated.');
      }
    } catch { showToast('Could not submit. Try again.'); }
    setSubmitting(false);
  };

  // OTP handlers
  const handleOtpInput = (i: number, val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length > 1) {
      const n = ['', '', '', '', '', ''];
      digits.split('').slice(0, 6).forEach((d, idx) => { n[idx] = d; });
      setOtp(n);
      otpRefs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }
    const n = [...otp]; n[i] = digits.slice(-1); setOtp(n);
    if (digits && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKey = (i: number, key: string) => {
    if (key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const sendOtp = async (phoneNum: string) => {
    const isVendor = role === 'Maker';
    const bare = phoneNum.replace(/\D/g, '').slice(-10);
    const endpoint = isVendor
      ? `${BACKEND}/api/v2/vendor/auth/send-otp`
      : `${BACKEND}/api/v2/couple/auth/send-otp`;
    try {
      const r = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: bare }),
      });
      const d = await r.json();
      if (!d.success) { showToast(d.error || 'Could not send code. Try again.'); return; }
      setScreen(screen === 'signin_phone' ? 'signin_otp' : 'invite_otp');
    } catch { showToast('Could not send code. Try again.'); }
  };

  const verifyOtp = async () => {
    const isVendor = role === 'Maker';
    const bare = phone.replace(/\D/g, '').slice(-10);
    const endpoint = isVendor
      ? `${BACKEND}/api/v2/vendor/auth/verify-otp`
      : `${BACKEND}/api/v2/couple/auth/verify-otp`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: bare, code: otp.join('') }),
      });
      const d = await res.json();
      if (!d.success) {
        const err = d.error || '';
        if (err.toLowerCase().includes('no account') || err.toLowerCase().includes('not found') || err.toLowerCase().includes('no vendor')) {
          setScreen('request_who');
          showToast('No account found. Request an invite to join.');
          return;
        }
        showToast(err || 'Incorrect code.');
        return;
      }
      const record = d.vendor || d.user || d.couple || d.data;
      if (!record) {
        setScreen('request_who');
        showToast('No account found. Request an invite to join.');
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const sessionData = {
        id: record.id, userId: record.id, vendorId: record.id,
        phone: bare, pin_set: !!record.pin_set,
        name: record.name || null,
        category: record.category || null,
        tier: record.tier || null,
      };
      if (isVendor) {
        await setVendorSession(sessionData);
        const needsOnboarding = !record.pin_set && !record.name;
        router.replace(needsOnboarding ? '/(vendor)/onboarding' : (record.pin_set ? '/(vendor)/pin-login' : '/(vendor)/pin'));
      } else {
        await setCoupleSession(sessionData);
        const needsOnboarding = !record.pin_set && !record.name;
        router.replace(needsOnboarding ? '/(couple)/onboarding' : (record.pin_set ? '/couple-pin-login' : '/couple-pin'));
      }
    } catch { showToast('Verification failed.'); }
  };

  const handleSignIn = async () => {
    const isVendor = role === 'Maker';
    const bare = phone.replace(/\D/g, '').slice(-10);
    try {
      const r = await fetch(`${BACKEND}/api/v2/auth/pin-status?userId=_&role=${isVendor ? 'vendor' : 'couple'}&phone=${bare}`);
      const d = await r.json();
      // Backend returns { exists, hasPin } — not { userId, found, pin_set }
      if (!d.exists) {
        setScreen('request_who');
        showToast('No account found — request an invite to join.');
        return;
      }
      if (d.hasPin) {
        // Account exists and has a PIN — store minimal session and go to PIN screen.
        // Backend does not return userId in this response; pin screen reads it via phone.
        const sd = { phone: bare, pin_set: true };
        if (isVendor) await setVendorSession(sd);
        else await setCoupleSession(sd);
        router.replace(isVendor ? '/(vendor)/pin-login' : '/couple-pin-login');
        return;
      }
      // Account exists but no PIN set — send OTP to complete setup
      sendOtp(phone);
    } catch { showToast('Could not connect. Try again.'); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>

      {/* Carousel — full bleed background */}
      {slides.length > 0 ? slides.map((url, i) => (
        <Image
          key={i}
          source={{ uri: url }}
          style={[styles.slide, { opacity: screen === 'exploring' ? 0 : (i === cur ? 1 : 0) }]}
          resizeMode="cover"
        />
      )) : (
        <View style={[styles.slide, { backgroundColor: '#1a1a1a' }]} />
      )}

      {/* Vignette */}
      <View style={styles.vignette} pointerEvents="none" />

      {/* Dark overlay */}
      {screen !== 'exploring' && (
        <View style={styles.overlay} pointerEvents="none" />
      )}

      {/* Toast */}
      {!!toast && (
        <View style={[styles.toast, { top: insets.top + 16 }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* ── ENTRY STRIP ─────────────────────────────────────────────────── */}
      {screen === 'entry' && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => { if (!entryExpanded) setEntryExpanded(true); }}
          style={[styles.entryStrip, { paddingBottom: insets.bottom + (entryExpanded ? 28 : 16) }]}
        >
          {/* Brand row */}
          <View style={styles.brandRow}>
            <View>
              <Text style={styles.wordmark}>The Dream Wedding</Text>
              <Text style={styles.tagline}>THE CURATED WEDDING OS</Text>
            </View>
            {!entryExpanded && (
              <Text style={styles.tapHint}>tap</Text>
            )}
          </View>

          {/* Buttons — animate in */}
          <Animated.View style={{
            maxHeight: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 260] }),
            overflow: 'hidden',
          }}>
            <View style={{ paddingTop: 20, gap: 8 }}>
              {/* I have an invite — gold primary */}
              <TouchableOpacity
                style={styles.inviteBtn}
                onPress={() => { setRole(null); setScreen('invite_code'); }}
                activeOpacity={0.85}
              >
                <Text style={styles.inviteBtnText}>I HAVE AN INVITE</Text>
              </TouchableOpacity>

              {/* Request an invite — ghost outlined */}
              <TouchableOpacity
                style={styles.requestBtn}
                onPress={() => setScreen('request_who')}
                activeOpacity={0.85}
              >
                <Text style={styles.requestBtnText}>REQUEST AN INVITE</Text>
              </TouchableOpacity>

              {/* Sign in + Just exploring — side by side ghost */}
              <View style={styles.ghostRow}>
                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={() => { setRole(null); setScreen('signin_phone'); }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.ghostBtnText}>SIGN IN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); startExploring(); }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.ghostBtnText}>JUST EXPLORING</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* ── GLASS PANEL — all non-entry, non-exploring screens ──────────── */}
      {screen !== 'entry' && screen !== 'exploring' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.glassPanelWrap}
        >
          <ScrollView
            style={styles.glassPanel}
            contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* ── REQUEST WHO ────────────────────────────────────────────── */}
            {screen === 'request_who' && (
              <>
                <BackBtn onPress={() => setScreen('entry')} />
                <Text style={styles.panelHeading}>Request an invite.</Text>
                <Text style={styles.panelSubheading}>Are you a:</Text>
                <DotOption label="Dreamer" sublabel="Planning a wedding" selected={role === 'Dreamer'} onSelect={() => setRole('Dreamer')} />
                <DotOption label="Maker" sublabel="A wedding professional" selected={role === 'Maker'} onSelect={() => setRole('Maker')} />
                <GoldBtn label="CONTINUE →" onPress={() => setScreen(role === 'Dreamer' ? 'request_dreamer' : 'request_maker')} disabled={!role} />
              </>
            )}

            {/* ── REQUEST DREAMER ─────────────────────────────────────────── */}
            {screen === 'request_dreamer' && (
              <>
                <BackBtn onPress={() => setScreen('request_who')} />
                <Text style={styles.panelHeading}>Your details.</Text>
                <FieldLabel text="YOUR NAME" />
                <GlassInput value={reqName} onChangeText={setReqName} placeholder="Full name" />
                <FieldLabel text="PHONE" />
                <PhoneInput value={reqPhone} onChangeText={v => setReqPhone(v.replace(/\D/g, '').slice(0, 10))} />
                <FieldLabel text="INSTAGRAM" />
                <GlassInput value={reqInstagram} onChangeText={setReqInstagram} placeholder="@yourhandle" />
                <FieldLabel text="WEDDING DATE" />
                <DotOption label="Yes — I know the date" selected={dateStatus === 'exact'} onSelect={() => setDateStatus('exact')} />
                <DotOption label="Roughly — a season" selected={dateStatus === 'season'} onSelect={() => setDateStatus('season')} />
                {dateStatus === 'season' && (
                  <View style={styles.seasonGrid}>
                    {SEASONS.map(s => (
                      <TouchableOpacity key={s.key} style={[styles.seasonBtn, season === s.key && styles.seasonBtnActive]} onPress={() => setSeason(s.key as Season)}>
                        <Text style={[styles.seasonBtnText, season === s.key && styles.seasonBtnTextActive]}>{s.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <DotOption label="Just browsing" selected={dateStatus === 'browsing'} onSelect={() => setDateStatus('browsing')} />
                <GoldBtn label={submitting ? 'SUBMITTING...' : 'REQUEST INVITE →'} onPress={() => submitRequest()} disabled={!reqPhone.trim() || submitting} />
              </>
            )}

            {/* ── REQUEST MAKER ───────────────────────────────────────────── */}
            {screen === 'request_maker' && (
              <>
                <BackBtn onPress={() => setScreen('request_who')} />
                <Text style={styles.panelHeading}>Your details.</Text>
                <FieldLabel text="BUSINESS / STUDIO NAME" />
                <GlassInput value={reqName} onChangeText={setReqName} placeholder="Your name or studio" />
                <FieldLabel text="PHONE" />
                <PhoneInput value={reqPhone} onChangeText={v => setReqPhone(v.replace(/\D/g, '').slice(0, 10))} />
                <FieldLabel text="INSTAGRAM" />
                <GlassInput value={reqInstagram} onChangeText={setReqInstagram} placeholder="@yourhandle" />
                <FieldLabel text="CATEGORY" />
                <View style={styles.categoryWrap}>
                  {MAKER_CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat} style={[styles.categoryPill, reqCategory === cat && styles.categoryPillActive]} onPress={() => setReqCategory(cat)}>
                      <Text style={[styles.categoryPillText, reqCategory === cat && styles.categoryPillTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {reqCategory === 'Other' && (
                  <>
                    <FieldLabel text="TELL US YOUR SPECIALITY" />
                    <GlassInput value={reqCategoryOther} onChangeText={setReqCategoryOther} placeholder="e.g. Mehndi artist" />
                  </>
                )}
                <GoldBtn label={submitting ? 'SUBMITTING...' : 'REQUEST INVITE →'} onPress={() => submitRequest()} disabled={!reqPhone.trim() || submitting} />
              </>
            )}

            {/* ── REQUEST DONE ────────────────────────────────────────────── */}
            {screen === 'request_done' && (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={styles.receivedText}>Received.</Text>
                <Text style={styles.receivedSub}>We verify every profile personally.{'\n'}We'll reach out on Instagram or WhatsApp.</Text>
                {editSecondsLeft > 0 && (
                  <View style={{ width: '100%', marginTop: 24 }}>
                    <View style={styles.editProgressBg}>
                      <View style={[styles.editProgressBar, { width: `${(editSecondsLeft / 60) * 100}%` }]} />
                    </View>
                    <TouchableOpacity onPress={() => setScreen(role === 'Dreamer' ? 'request_dreamer' : 'request_maker')}>
                      <Text style={styles.editLink}>Made a mistake? Edit your details → ({editSecondsLeft}s)</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* ── INVITE CODE ─────────────────────────────────────────────── */}
            {screen === 'invite_code' && (
              <>
                <BackBtn onPress={() => setScreen('entry')} />
                <Text style={styles.panelHeading}>Enter your invite.</Text>
                <Text style={styles.panelSubheading}>Your code unlocks access.</Text>
                <FieldLabel text="ARE YOU A" />
                <View style={styles.roleRow}>
                  {(['Dreamer', 'Maker'] as Role[]).map(r => (
                    <TouchableOpacity key={r} style={[styles.rolePill, role === r && styles.rolePillActive]} onPress={() => setRole(r)}>
                      <Text style={[styles.rolePillText, role === r && styles.rolePillTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <FieldLabel text="INVITE CODE" />
                <TextInput
                  value={inviteCode}
                  onChangeText={v => { setInviteCode(v.toUpperCase()); setInviteError(''); }}
                  placeholder="XXXXXX"
                  placeholderTextColor="rgba(248,247,245,0.3)"
                  maxLength={8}
                  autoCapitalize="characters"
                  style={[styles.glassInput, { textAlign: 'center', letterSpacing: 8, fontSize: 20 }]}
                />
                {!!inviteError && <Text style={styles.errorText}>{inviteError}</Text>}
                <GoldBtn label="CONTINUE →" onPress={async () => {
                  if (!inviteCode.trim() || !role) { setInviteError('Select Dreamer or Maker and enter your code.'); return; }
                  try {
                    const r = await fetch(`${BACKEND}/api/v2/invite/validate`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ code: inviteCode.trim(), role: role === 'Dreamer' ? 'dreamer' : 'vendor' }),
                    });
                    const d = await r.json();
                    if (d.valid) setScreen('invite_phone');
                    else setInviteError(d.error || 'Invalid or expired code.');
                  } catch { setInviteError('Could not verify code. Try again.'); }
                }} disabled={!inviteCode.trim() || !role} />
              </>
            )}

            {/* ── INVITE PHONE ────────────────────────────────────────────── */}
            {screen === 'invite_phone' && (
              <>
                <BackBtn onPress={() => setScreen('invite_code')} />
                <Text style={styles.panelHeading}>Welcome. Let's begin.</Text>
                <Text style={styles.panelSubheading}>Enter your number. We'll send a code.</Text>
                <FieldLabel text="PHONE NUMBER" />
                <PhoneInput value={phone} onChangeText={v => setPhone(v.replace(/\D/g, '').slice(0, 10))} />
                <GoldBtn label="SEND CODE →" onPress={() => sendOtp(phone)} disabled={phone.length < 10} />
              </>
            )}

            {/* ── OTP ─────────────────────────────────────────────────────── */}
            {(screen === 'invite_otp' || screen === 'signin_otp') && (
              <>
                <BackBtn onPress={() => setScreen(screen === 'invite_otp' ? 'invite_phone' : 'signin_phone')} />
                <Text style={styles.panelHeading}>Check your messages.</Text>
                <Text style={styles.panelSubheading}>Enter the 6-digit code we sent you.</Text>
                <View style={styles.otpRow}>
                  {otp.map((v, i) => (
                    <TextInput
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      value={v}
                      onChangeText={val => handleOtpInput(i, val)}
                      onKeyPress={({ nativeEvent }) => handleOtpKey(i, nativeEvent.key)}
                      keyboardType="number-pad"
                      maxLength={1}
                      textAlign="center"
                      caretHidden
                      style={styles.otpBox}
                    />
                  ))}
                </View>
                <GoldBtn label="VERIFY →" onPress={verifyOtp} disabled={otp.join('').length < 6} />
                <TouchableOpacity onPress={() => { setOtp(['', '', '', '', '', '']); sendOtp(phone); }} style={{ marginTop: 16 }}>
                  <Text style={styles.resendText}>RESEND CODE</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── SIGN IN ─────────────────────────────────────────────────── */}
            {screen === 'signin_phone' && (
              <>
                <BackBtn onPress={() => setScreen('entry')} />
                <Text style={styles.panelHeading}>Welcome back.</Text>
                <Text style={styles.panelSubheading}>Are you a:</Text>
                <View style={styles.roleRow}>
                  {(['Dreamer', 'Maker'] as Role[]).map(r => (
                    <TouchableOpacity key={r} style={[styles.rolePill, role === r && styles.rolePillActive]} onPress={() => setRole(r)}>
                      <Text style={[styles.rolePillText, role === r && styles.rolePillTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <FieldLabel text="PHONE NUMBER" />
                <PhoneInput value={phone} onChangeText={v => setPhone(v.replace(/\D/g, '').slice(0, 10))} />
                <GoldBtn label="CONTINUE →" onPress={handleSignIn} disabled={phone.length < 10 || !role} />
              </>
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── JUST EXPLORING ──────────────────────────────────────────────── */}
      {screen === 'exploring' && (
        <View style={StyleSheet.absoluteFill}>
          {loadingPreview && (
            <View style={styles.exploringLoading}>
              <Text style={styles.exploringLoadingText}>Curating your preview...</Text>
            </View>
          )}

          {!loadingPreview && !exploringDone && exploringPhotos[exploringIdx] && (
            <>
              <Image
                source={{ uri: exploringPhotos[exploringIdx].image_url }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              {/* Gradient overlay */}
              <View style={styles.exploringGradient} pointerEvents="none" />

              {/* Back button */}
              <TouchableOpacity
                style={[styles.exploringBack, { top: insets.top + 20 }]}
                onPress={() => setScreen('entry')}
              >
                <Text style={{ color: '#F8F7F5', fontSize: 18 }}>←</Text>
              </TouchableOpacity>

              {/* Progress dots */}
              <View style={[styles.progressDots, { top: insets.top + 28 }]}>
                {exploringPhotos.map((_, i) => (
                  <View key={i} style={[styles.dot, i === exploringIdx && styles.dotActive]} />
                ))}
              </View>

              {/* TDW branding top right */}
              <View style={[styles.exploringBrand, { top: insets.top + 24 }]}>
                <Text style={styles.exploringBrandName}>The Dream Wedding</Text>
                <Text style={styles.exploringBrandTag}>India's First Wedding OS</Text>
              </View>

              {/* Bottom CTA */}
              <View style={[styles.exploringBottom, { paddingBottom: insets.bottom + 24 }]}>
                {exploringPhotos[exploringIdx].caption && (
                  <Text style={styles.exploringCaption}>{exploringPhotos[exploringIdx].caption}</Text>
                )}
                <Text style={styles.exploringCounter}>{exploringIdx + 1} of {exploringPhotos.length}</Text>
                <View style={styles.exploringBtnRow}>
                  <TouchableOpacity style={styles.exploringNextBtn} onPress={nextExploring} activeOpacity={0.85}>
                    <Text style={styles.exploringNextBtnText}>
                      {exploringIdx >= exploringPhotos.length - 1 ? 'SEE THE FULL CATALOGUE →' : 'NEXT →'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.exploringRequestBtn} onPress={() => setScreen('request_who')} activeOpacity={0.85}>
                    <Text style={styles.exploringRequestBtnText}>Request invite</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* End of exploring — motto + invite CTA */}
          {!loadingPreview && exploringDone && (
            <>
              {exploringPhotos.length > 0 && (
                <Image source={{ uri: exploringPhotos[exploringPhotos.length - 1]?.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              )}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12,10,9,0.72)' }]} />
              <View style={styles.exploringEndContent}>
                <Text style={styles.exploringEndEyebrow}>India's First Wedding OS</Text>
                <Text style={styles.motto1}>Not just happily married.</Text>
                <Text style={styles.motto2}>Getting married{' '}
                  <Text style={{ color: '#C9A84C', fontStyle: 'italic' }}>happily.</Text>
                </Text>
                <Text style={styles.exploringEndBody}>
                  Every Maker on TDW is personally curated. Interested in an invite to India's first curated wedding OS?
                </Text>
                <TouchableOpacity style={styles.exploringEndInviteBtn} onPress={() => setScreen('request_who')} activeOpacity={0.85}>
                  <Text style={styles.exploringEndInviteBtnText}>REQUEST AN INVITE →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exploringEndBackBtn} onPress={() => setScreen('entry')} activeOpacity={0.85}>
                  <Text style={styles.exploringEndBackBtnText}>← BACK TO HOME</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingBottom: 12 }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
      <Text style={{ fontFamily: 'DMSans_300Light', fontSize: 18, color: 'rgba(248,247,245,0.5)' }}>←</Text>
    </TouchableOpacity>
  );
}

function GoldBtn({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress} disabled={disabled} activeOpacity={0.85}
      style={[{ width: '100%', height: 52, borderRadius: 100, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
        { backgroundColor: disabled ? 'rgba(201,168,76,0.3)' : '#C9A84C' }]}
    >
      <Text style={{ fontFamily: 'DMSans_300Light', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: disabled ? 'rgba(12,10,9,0.4)' : '#0C0A09' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function DotOption({ label, sublabel, selected, onSelect }: { label: string; sublabel?: string; selected: boolean; onSelect: () => void }) {
  return (
    <TouchableOpacity onPress={onSelect} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }} activeOpacity={0.8}>
      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: selected ? '#C9A84C' : 'rgba(248,247,245,0.5)', backgroundColor: selected ? '#C9A84C' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {selected && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#0C0A09' }} />}
      </View>
      <View>
        <Text style={{ fontFamily: 'DMSans_300Light', fontSize: 15, color: '#F8F7F5' }}>{label}</Text>
        {sublabel && <Text style={{ fontFamily: 'DMSans_300Light', fontSize: 11, color: 'rgba(248,247,245,0.5)', marginTop: 2 }}>{sublabel}</Text>}
      </View>
    </TouchableOpacity>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={{ fontFamily: 'DMSans_300Light', fontSize: 8, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(248,247,245,0.5)', marginBottom: 6 }}>{text}</Text>;
}

function GlassInput({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  return (
    <TextInput
      value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor="rgba(248,247,245,0.3)"
      style={styles.glassInput}
    />
  );
}

function PhoneInput({ value, onChangeText }: { value: string; onChangeText: (v: string) => void }) {
  return (
    <View style={styles.phoneRow}>
      <Text style={styles.phonePrefix}>🇮🇳 +91</Text>
      <TextInput
        value={value} onChangeText={onChangeText}
        placeholder="00000 00000" placeholderTextColor="rgba(248,247,245,0.3)"
        keyboardType="phone-pad" maxLength={10}
        style={[styles.glassInput, { flex: 1, borderBottomWidth: 0, marginBottom: 0 }]}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0C0A09' },
  slide: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  vignette: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2,
    // Approximate vignette with a semi-transparent dark edge
    backgroundColor: 'transparent',
  },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 3, backgroundColor: 'rgba(12,10,9,0.15)' },
  toast: {
    position: 'absolute', left: '10%', right: '10%', zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 100,
    padding: 10, alignItems: 'center',
  },
  toastText: { fontFamily: 'DMSans_300Light', fontSize: 13, color: '#F8F7F5' },

  // Entry strip
  entryStrip: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
    backgroundColor: 'rgba(12,10,9,0.35)',
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24, paddingTop: 14,
  },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  wordmark: {
    fontFamily: 'CormorantGaramond_300Light', fontSize: 20,
    color: '#F8F7F5', fontStyle: 'italic', letterSpacing: 0.4,
  },
  tagline: {
    fontFamily: 'DMSans_300Light', fontSize: 7, letterSpacing: 5,
    textTransform: 'uppercase', color: '#C9A84C', marginTop: 4,
  },
  tapHint: {
    fontFamily: 'DMSans_300Light', fontSize: 8, letterSpacing: 3,
    textTransform: 'uppercase', color: 'rgba(248,247,245,0.28)',
  },
  inviteBtn: {
    width: '100%', height: 48, backgroundColor: '#C9A84C',
    borderRadius: 100, alignItems: 'center', justifyContent: 'center',
  },
  inviteBtnText: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: '#0C0A09' },
  requestBtn: {
    width: '100%', height: 48, backgroundColor: 'transparent',
    borderWidth: 0.5, borderColor: 'rgba(248,247,245,0.25)',
    borderRadius: 100, alignItems: 'center', justifyContent: 'center',
  },
  requestBtnText: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: '#F8F7F5' },
  ghostRow: { flexDirection: 'row', gap: 8 },
  ghostBtn: {
    flex: 1, height: 42, backgroundColor: 'transparent',
    borderWidth: 0.5, borderColor: 'rgba(248,247,245,0.12)',
    borderRadius: 100, alignItems: 'center', justifyContent: 'center',
  },
  ghostBtnText: { fontFamily: 'DMSans_300Light', fontSize: 8, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(248,247,245,0.45)' },

  // Glass panel
  glassPanelWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, maxHeight: H * 0.85 },
  glassPanel: {
    backgroundColor: 'rgba(12,10,9,0.3)',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  panelHeading: { fontFamily: 'CormorantGaramond_300Light', fontSize: 20, color: '#F8F7F5', marginBottom: 4, lineHeight: 24 },
  panelSubheading: { fontFamily: 'DMSans_300Light', fontSize: 13, color: 'rgba(248,247,245,0.55)', marginBottom: 12 },
  glassInput: {
    fontFamily: 'DMSans_300Light', fontSize: 15, color: '#F8F7F5',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 8, marginBottom: 16, backgroundColor: 'transparent',
  },
  phoneRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)', marginBottom: 16 },
  phonePrefix: { fontFamily: 'DMSans_300Light', fontSize: 13, color: 'rgba(248,247,245,0.5)', paddingRight: 10, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)', marginRight: 10 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  rolePill: { flex: 1, height: 40, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  rolePillActive: { backgroundColor: '#C9A84C' },
  rolePillText: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(248,247,245,0.6)' },
  rolePillTextActive: { color: '#0C0A09' },
  seasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  seasonBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  seasonBtnActive: { backgroundColor: '#C9A84C' },
  seasonBtnText: { fontFamily: 'DMSans_300Light', fontSize: 10, letterSpacing: 1.5, color: 'rgba(248,247,245,0.7)' },
  seasonBtnTextActive: { color: '#0C0A09' },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  categoryPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.08)' },
  categoryPillActive: { backgroundColor: '#C9A84C' },
  categoryPillText: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(248,247,245,0.7)' },
  categoryPillTextActive: { color: '#0C0A09' },
  receivedText: { fontFamily: 'CormorantGaramond_300Light', fontSize: 38, color: '#F8F7F5', fontStyle: 'italic', marginBottom: 12 },
  receivedSub: { fontFamily: 'DMSans_300Light', fontSize: 13, color: 'rgba(248,247,245,0.6)', textAlign: 'center', lineHeight: 22 },
  editProgressBg: { height: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1, marginBottom: 10 },
  editProgressBar: { height: 2, backgroundColor: '#C9A84C', borderRadius: 1 },
  editLink: { fontFamily: 'DMSans_300Light', fontSize: 12, color: 'rgba(248,247,245,0.5)', fontStyle: 'italic', textAlign: 'center' },
  errorText: { fontFamily: 'DMSans_300Light', fontSize: 11, color: '#E57373', marginBottom: 12, textAlign: 'center' },
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 16 },
  otpBox: {
    width: 40, height: 48, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'transparent', fontFamily: 'DMSans_300Light', fontSize: 20, color: '#F8F7F5',
  },
  resendText: { fontFamily: 'DMSans_300Light', fontSize: 8, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(248,247,245,0.3)', textAlign: 'center' },

  // Exploring
  exploringLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  exploringLoadingText: { fontFamily: 'CormorantGaramond_300Light', fontSize: 20, color: 'rgba(248,247,245,0.6)', fontStyle: 'italic' },
  exploringGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)' },
  exploringBack: {
    position: 'absolute', left: 20, zIndex: 30,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  progressDots: { position: 'absolute', left: 0, right: 0, zIndex: 30, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { width: 20, backgroundColor: '#C9A84C' },
  exploringBrand: { position: 'absolute', right: 20, zIndex: 30, alignItems: 'flex-end' },
  exploringBrandName: { fontFamily: 'CormorantGaramond_300Light', fontSize: 13, color: 'rgba(248,247,245,0.7)', fontStyle: 'italic' },
  exploringBrandTag: { fontFamily: 'DMSans_300Light', fontSize: 6, letterSpacing: 3, textTransform: 'uppercase', color: '#C9A84C', marginTop: 2 },
  exploringBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30, paddingHorizontal: 20 },
  exploringCaption: { fontFamily: 'CormorantGaramond_300Light', fontSize: 14, color: 'rgba(248,247,245,0.6)', fontStyle: 'italic', marginBottom: 12 },
  exploringCounter: { fontFamily: 'DMSans_300Light', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(248,247,245,0.35)', marginBottom: 10 },
  exploringBtnRow: { flexDirection: 'row', gap: 10 },
  exploringNextBtn: { flex: 1, height: 50, backgroundColor: '#C9A84C', borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  exploringNextBtnText: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', color: '#0C0A09' },
  exploringRequestBtn: { height: 50, paddingHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 100, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  exploringRequestBtnText: { fontFamily: 'DMSans_300Light', fontSize: 8, color: 'rgba(248,247,245,0.7)', letterSpacing: 1.5 },
  exploringEndContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, zIndex: 10 },
  exploringEndEyebrow: { fontFamily: 'CormorantGaramond_300Light', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: '#C9A84C', marginBottom: 16 },
  motto1: { fontFamily: 'CormorantGaramond_300Light', fontSize: 32, color: '#F8F7F5', textAlign: 'center', lineHeight: 38 },
  motto2: { fontFamily: 'CormorantGaramond_300Light', fontSize: 32, color: '#F8F7F5', textAlign: 'center', lineHeight: 38, marginBottom: 24 },
  exploringEndBody: { fontFamily: 'DMSans_300Light', fontSize: 14, color: 'rgba(248,247,245,0.55)', textAlign: 'center', lineHeight: 24, marginBottom: 36, maxWidth: 300 },
  exploringEndInviteBtn: { width: '100%', maxWidth: 340, height: 54, backgroundColor: '#C9A84C', borderRadius: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  exploringEndInviteBtnText: { fontFamily: 'DMSans_300Light', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#0C0A09' },
  exploringEndBackBtn: { width: '100%', maxWidth: 340, height: 46, backgroundColor: 'transparent', borderRadius: 100, borderWidth: 0.5, borderColor: 'rgba(248,247,245,0.2)', alignItems: 'center', justifyContent: 'center' },
  exploringEndBackBtnText: { fontFamily: 'DMSans_300Light', fontSize: 8, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(248,247,245,0.4)' },
});
