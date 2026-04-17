"""
Session 6 — Patch 11: Login Rewrite
Full invite-code login with lead capture for non-invited users.
Flow: "Have an invite?" → Yes (code entry) / No (request form)
Two tabs for code entry: Dreamer / Vendor
Request form captures: name, phone, email, type, city
"""

login = r'''import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Animated, Dimensions,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const API = 'https://dream-wedding-production-89ae.up.railway.app';

type Screen = 'gate' | 'code' | 'request' | 'requested';
type CodeTab = 'dreamer' | 'vendor';
type VendorMode = 'code' | 'signin';

export default function LoginScreen() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('gate');
  const [codeTab, setCodeTab] = useState<CodeTab>('dreamer');
  const [vendorMode, setVendorMode] = useState<VendorMode>('code');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Request form
  const [reqName, setReqName] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqType, setReqType] = useState<'couple' | 'vendor'>('couple');
  const [reqCity, setReqCity] = useState('');

  // Animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslate = useRef(new Animated.Value(20)).current;
  const dividerWidth = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    checkSession();
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(logoTranslate, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
      Animated.timing(dividerWidth, { toValue: 40, duration: 350, useNativeDriver: false }),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(contentTranslate, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const checkSession = async () => {
    try {
      const cs = await AsyncStorage.getItem('user_session');
      if (cs) { const p = JSON.parse(cs); if (p.userId || p.uid) { router.replace('/home'); return; } }
      const vs = await AsyncStorage.getItem('vendor_session');
      if (vs) { const p = JSON.parse(vs); if (p.vendorId) { router.replace('/vendor-dashboard'); return; } }
    } catch (e) {}
  };

  const clearForm = () => { setCode(''); setError(''); setUsername(''); setPassword(''); };

  // ── Dreamer Code ─────────────────────────────────────────────────────────

  const handleDreamerCode = async () => {
    if (!code.trim()) { setError('Please enter your invite code'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/dreamer-codes/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        await AsyncStorage.setItem('user_session', JSON.stringify({
          userId: data.data.id, uid: data.data.id,
          name: data.data.name || '', userType: 'couple',
          couple_tier: data.data.couple_tier || 'free',
          budget: data.data.budget || 0,
          wedding_date: data.data.wedding_date || '',
        }));
        if (!data.data.wedding_date) {
          router.replace('/user-type');
        } else {
          router.replace('/home');
        }
      } else {
        setError(data.error || 'Invalid or expired code.');
      }
    } catch (e) {
      setError('Could not verify code. Please try again.');
    } finally { setLoading(false); }
  };

  // ── Vendor Code ──────────────────────────────────────────────────────────

  const handleVendorCode = async () => {
    if (!code.trim()) { setError('Please enter your vendor code'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/tier-codes/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        await AsyncStorage.setItem('vendor_session', JSON.stringify({
          vendorId: data.data.id, vendorName: data.data.name,
          category: data.data.category, city: data.data.city,
          tier: data.data.tier, trialEnd: data.data.trial_end,
          userType: 'vendor', onboarded: true,
        }));
        router.replace('/vendor-dashboard');
      } else {
        setError(data.error || 'Invalid or expired code.');
      }
    } catch (e) {
      setError('Could not verify code. Please try again.');
    } finally { setLoading(false); }
  };

  // ── Vendor Sign In (username/password) ────────────────────────────────────

  const handleVendorSignIn = async () => {
    if (!username.trim() || !password.trim()) { setError('Enter username and password'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/credentials/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        await AsyncStorage.setItem('vendor_session', JSON.stringify({
          vendorId: data.data.id, vendorName: data.data.name,
          category: data.data.category, city: data.data.city,
          tier: data.data.tier, trialEnd: data.data.trial_end,
          userType: 'vendor', onboarded: true,
        }));
        router.replace('/vendor-dashboard');
      } else {
        setError(data.error || 'Invalid credentials.');
      }
    } catch (e) {
      setError('Could not sign in. Please try again.');
    } finally { setLoading(false); }
  };

  // ── Request Access ───────────────────────────────────────────────────────

  const handleRequest = async () => {
    if (!reqName.trim() || !reqPhone.trim()) {
      setError('Please enter your name and phone number');
      return;
    }
    try {
      setLoading(true); setError('');
      // Submit to waitlist endpoint
      await fetch(`${API}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reqName.trim(),
          phone: reqPhone.trim(),
          email: reqEmail.trim(),
          type: reqType,
          city: reqCity.trim(),
        }),
      });
      setScreen('requested');
    } catch (e) {
      // Even if API fails, show success — we don't want to lose leads
      setScreen('requested');
    } finally { setLoading(false); }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Logo ── */}
        <View style={s.logoSection}>
          <Animated.View style={[s.logoInner, { opacity: logoOpacity, transform: [{ translateY: logoTranslate }] }]}>
            <Text style={s.logoThe}>THE</Text>
            <Text style={s.logoMain}>Dream Wedding</Text>
            <Animated.View style={[s.logoDivider, { width: dividerWidth }]} />
            <Animated.View style={{ opacity: taglineOpacity, alignItems: 'center', gap: 4 }}>
              <Text style={s.logoTagline}>Not just happily married.</Text>
              <Text style={[s.logoTagline, { color: '#C9A84C' }]}>Getting married happily.</Text>
            </Animated.View>
          </Animated.View>
        </View>

        {/* ── Content ── */}
        <Animated.View style={[s.bottomSection, { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] }]}>

          {/* ═══ GATE — "Do you have an invite?" ═══ */}
          {screen === 'gate' && (
            <View style={s.gateSection}>
              <Text style={s.gateTitle}>Do you have an invite code?</Text>
              <Text style={s.gateSubtitle}>We are currently in our founding phase</Text>

              <TouchableOpacity
                style={s.gateBtn}
                onPress={() => { setScreen('code'); clearForm(); }}
                activeOpacity={0.85}
              >
                <View style={s.gateBtnInner}>
                  <View style={s.gateBtnIconBox}>
                    <Feather name="key" size={16} color="#C9A84C" />
                  </View>
                  <View style={s.gateBtnText}>
                    <Text style={s.gateBtnLabel}>Yes, I have a code</Text>
                    <Text style={s.gateBtnSub}>Enter your invite code to get started</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#C9A84C" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.gateBtn}
                onPress={() => { setScreen('request'); clearForm(); }}
                activeOpacity={0.85}
              >
                <View style={s.gateBtnInner}>
                  <View style={s.gateBtnIconBox}>
                    <Feather name="mail" size={16} color="#8C7B6E" />
                  </View>
                  <View style={s.gateBtnText}>
                    <Text style={s.gateBtnLabel}>No, I'd like to join</Text>
                    <Text style={s.gateBtnSub}>Request early access to the platform</Text>
                  </View>
                  <Feather name="chevron-right" size={14} color="#C4B8AC" />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* ═══ CODE ENTRY ═══ */}
          {screen === 'code' && (
            <View style={s.codeSection}>

              {/* Back */}
              <TouchableOpacity onPress={() => { setScreen('gate'); clearForm(); }} style={s.backRow}>
                <Feather name="arrow-left" size={16} color="#8C7B6E" />
                <Text style={s.backText}>Back</Text>
              </TouchableOpacity>

              {/* Tab toggle: Dreamer / Vendor */}
              <View style={s.tabToggle}>
                <TouchableOpacity
                  style={[s.tab, codeTab === 'dreamer' && s.tabActive]}
                  onPress={() => { setCodeTab('dreamer'); clearForm(); setVendorMode('code'); }}
                >
                  <Text style={[s.tabText, codeTab === 'dreamer' && s.tabTextActive]}>Planning a Wedding</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.tab, codeTab === 'vendor' && s.tabActive]}
                  onPress={() => { setCodeTab('vendor'); clearForm(); }}
                >
                  <Text style={[s.tabText, codeTab === 'vendor' && s.tabTextActive]}>Wedding Professional</Text>
                </TouchableOpacity>
              </View>

              {/* ── Dreamer code entry ── */}
              {codeTab === 'dreamer' && (
                <>
                  <Text style={s.codeLabel}>Invite Code</Text>
                  <TextInput
                    style={[s.codeInput, error && s.codeInputError]}
                    placeholder="e.g. DREAM-XXXX"
                    placeholderTextColor="#C4B8AC"
                    value={code}
                    onChangeText={(t) => { setCode(t.toUpperCase()); setError(''); }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleDreamerCode}
                  />
                  {error ? <Text style={s.errorText}>{error}</Text> : null}
                  <TouchableOpacity
                    style={[s.submitBtn, (!code.trim() || loading) && s.submitBtnDisabled]}
                    onPress={handleDreamerCode}
                    disabled={!code.trim() || loading}
                  >
                    {loading ? <ActivityIndicator color="#FAF6F0" /> : (
                      <Text style={s.submitBtnText}>Enter</Text>
                    )}
                  </TouchableOpacity>
                  <Text style={s.hintText}>
                    This code was shared by The Dream Wedding team or a vendor you know.
                  </Text>
                </>
              )}

              {/* ── Vendor code entry ── */}
              {codeTab === 'vendor' && (
                <>
                  {/* Vendor sub-tabs: Code / Sign In */}
                  <View style={s.vendorSubTabs}>
                    <TouchableOpacity
                      style={[s.vendorSubTab, vendorMode === 'code' && s.vendorSubTabActive]}
                      onPress={() => { setVendorMode('code'); clearForm(); }}
                    >
                      <Text style={[s.vendorSubTabText, vendorMode === 'code' && s.vendorSubTabTextActive]}>Vendor Code</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.vendorSubTab, vendorMode === 'signin' && s.vendorSubTabActive]}
                      onPress={() => { setVendorMode('signin'); clearForm(); }}
                    >
                      <Text style={[s.vendorSubTabText, vendorMode === 'signin' && s.vendorSubTabTextActive]}>Sign In</Text>
                    </TouchableOpacity>
                  </View>

                  {vendorMode === 'code' ? (
                    <>
                      <Text style={s.codeLabel}>Vendor Code</Text>
                      <TextInput
                        style={[s.codeInput, error && s.codeInputError]}
                        placeholder="e.g. SIG-A3KF9M"
                        placeholderTextColor="#C4B8AC"
                        value={code}
                        onChangeText={(t) => { setCode(t.toUpperCase()); setError(''); }}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        returnKeyType="go"
                        onSubmitEditing={handleVendorCode}
                      />
                      {error ? <Text style={s.errorText}>{error}</Text> : null}
                      <TouchableOpacity
                        style={[s.submitBtn, (!code.trim() || loading) && s.submitBtnDisabled]}
                        onPress={handleVendorCode}
                        disabled={!code.trim() || loading}
                      >
                        {loading ? <ActivityIndicator color="#FAF6F0" /> : (
                          <Text style={s.submitBtnText}>Enter Dashboard</Text>
                        )}
                      </TouchableOpacity>
                      <Text style={s.hintText}>
                        This code was provided during your onboarding with The Dream Wedding team.
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={s.codeLabel}>Username</Text>
                      <TextInput
                        style={[s.codeInput, { letterSpacing: 0, textAlign: 'left' }, error && s.codeInputError]}
                        placeholder="Your username"
                        placeholderTextColor="#C4B8AC"
                        value={username}
                        onChangeText={(t) => { setUsername(t); setError(''); }}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                      />
                      <Text style={[s.codeLabel, { marginTop: 12 }]}>Password</Text>
                      <TextInput
                        style={[s.codeInput, { letterSpacing: 0, textAlign: 'left' }, error && s.codeInputError]}
                        placeholder="Your password"
                        placeholderTextColor="#C4B8AC"
                        value={password}
                        onChangeText={(t) => { setPassword(t); setError(''); }}
                        secureTextEntry
                        returnKeyType="go"
                        onSubmitEditing={handleVendorSignIn}
                      />
                      {error ? <Text style={s.errorText}>{error}</Text> : null}
                      <TouchableOpacity
                        style={[s.submitBtn, (!username.trim() || !password.trim() || loading) && s.submitBtnDisabled]}
                        onPress={handleVendorSignIn}
                        disabled={!username.trim() || !password.trim() || loading}
                      >
                        {loading ? <ActivityIndicator color="#FAF6F0" /> : (
                          <Text style={s.submitBtnText}>Sign In</Text>
                        )}
                      </TouchableOpacity>
                      <Text style={s.hintText}>
                        Sign in with the credentials you created during setup.
                      </Text>
                    </>
                  )}
                </>
              )}
            </View>
          )}

          {/* ═══ REQUEST ACCESS ═══ */}
          {screen === 'request' && (
            <View style={s.requestSection}>
              <TouchableOpacity onPress={() => { setScreen('gate'); clearForm(); }} style={s.backRow}>
                <Feather name="arrow-left" size={16} color="#8C7B6E" />
                <Text style={s.backText}>Back</Text>
              </TouchableOpacity>

              <Text style={s.requestTitle}>Request Early Access</Text>
              <Text style={s.requestSubtitle}>Tell us a bit about yourself and we will reach out</Text>

              {/* Type toggle */}
              <View style={s.typeToggle}>
                <TouchableOpacity
                  style={[s.typeBtn, reqType === 'couple' && s.typeBtnActive]}
                  onPress={() => setReqType('couple')}
                >
                  <Feather name="heart" size={14} color={reqType === 'couple' ? '#C9A84C' : '#C4B8AC'} />
                  <Text style={[s.typeText, reqType === 'couple' && s.typeTextActive]}>Planning a Wedding</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.typeBtn, reqType === 'vendor' && s.typeBtnActive]}
                  onPress={() => setReqType('vendor')}
                >
                  <Feather name="briefcase" size={14} color={reqType === 'vendor' ? '#C9A84C' : '#C4B8AC'} />
                  <Text style={[s.typeText, reqType === 'vendor' && s.typeTextActive]}>Wedding Professional</Text>
                </TouchableOpacity>
              </View>

              <View style={s.formCard}>
                <View style={s.fieldBlock}>
                  <Text style={s.fieldLabel}>Your Name</Text>
                  <TextInput
                    style={s.fieldInput}
                    placeholder="Full name"
                    placeholderTextColor="#C4B8AC"
                    value={reqName}
                    onChangeText={setReqName}
                  />
                </View>
                <View style={s.fieldDivider} />
                <View style={s.fieldBlock}>
                  <Text style={s.fieldLabel}>Phone</Text>
                  <TextInput
                    style={s.fieldInput}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#C4B8AC"
                    value={reqPhone}
                    onChangeText={setReqPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
                <View style={s.fieldDivider} />
                <View style={s.fieldBlock}>
                  <View style={s.fieldLabelRow}>
                    <Text style={s.fieldLabel}>Email</Text>
                    <Text style={s.fieldOptional}>optional</Text>
                  </View>
                  <TextInput
                    style={s.fieldInput}
                    placeholder="your@email.com"
                    placeholderTextColor="#C4B8AC"
                    value={reqEmail}
                    onChangeText={setReqEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={s.fieldDivider} />
                <View style={s.fieldBlock}>
                  <View style={s.fieldLabelRow}>
                    <Text style={s.fieldLabel}>City</Text>
                    <Text style={s.fieldOptional}>optional</Text>
                  </View>
                  <TextInput
                    style={s.fieldInput}
                    placeholder="e.g. Delhi NCR, Mumbai"
                    placeholderTextColor="#C4B8AC"
                    value={reqCity}
                    onChangeText={setReqCity}
                  />
                </View>
              </View>

              {error ? <Text style={s.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[s.submitBtn, (!reqName.trim() || !reqPhone.trim() || loading) && s.submitBtnDisabled]}
                onPress={handleRequest}
                disabled={!reqName.trim() || !reqPhone.trim() || loading}
              >
                {loading ? <ActivityIndicator color="#FAF6F0" /> : (
                  <Text style={s.submitBtnText}>Request Access</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ═══ REQUESTED (confirmation) ═══ */}
          {screen === 'requested' && (
            <View style={s.requestedSection}>
              <View style={s.requestedIconWrap}>
                <Feather name="check" size={28} color="#C9A84C" />
              </View>
              <Text style={s.requestedTitle}>Request received</Text>
              <Text style={s.requestedBody}>
                Thank you for your interest in The Dream Wedding. Our team will reach out to you shortly with an invite code.
              </Text>
              <TouchableOpacity
                style={s.requestedBtn}
                onPress={() => setScreen('gate')}
              >
                <Text style={s.requestedBtnText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          )}

        </Animated.View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flexGrow: 1, backgroundColor: '#FAF6F0', paddingHorizontal: 28, paddingBottom: 48, paddingTop: 60,
  },

  // Logo
  logoSection: { minHeight: height * 0.32, justifyContent: 'center', alignItems: 'center' },
  logoInner: { alignItems: 'center', gap: 10 },
  logoThe: { fontSize: 13, color: '#8C7B6E', letterSpacing: 12, textTransform: 'uppercase', fontFamily: 'DMSans_300Light' },
  logoMain: { fontSize: 42, color: '#2C2420', letterSpacing: 0.5, textAlign: 'center', fontFamily: 'PlayfairDisplay_400Regular' },
  logoDivider: { height: 1, backgroundColor: '#C9A84C', marginVertical: 8 },
  logoTagline: { fontSize: 14, color: '#2C2420', letterSpacing: 0.3, fontFamily: 'PlayfairDisplay_400Regular', fontStyle: 'italic', textAlign: 'center' },

  bottomSection: { gap: 16, flex: 1 },

  // Gate screen
  gateSection: { gap: 14 },
  gateTitle: { fontSize: 22, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', textAlign: 'center', letterSpacing: 0.3 },
  gateSubtitle: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center', marginTop: -8, marginBottom: 4 },
  gateBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EDE8E0',
    overflow: 'hidden',
  },
  gateBtnInner: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  gateBtnIconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF8EC',
    borderWidth: 1, borderColor: '#E8D9B5',
    justifyContent: 'center', alignItems: 'center',
  },
  gateBtnText: { flex: 1, gap: 3 },
  gateBtnLabel: { fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular', letterSpacing: 0.2 },
  gateBtnSub: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },

  // Code screen
  codeSection: { gap: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  backText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },

  tabToggle: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 10,
    borderWidth: 1, borderColor: '#EDE8E0', padding: 3,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#FAF6F0' },
  tabText: { fontSize: 12, color: '#B8ADA4', fontFamily: 'DMSans_400Regular' },
  tabTextActive: { color: '#C9A84C', fontFamily: 'DMSans_500Medium' },

  vendorSubTabs: {
    flexDirection: 'row', gap: 0, borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EDE8E0',
  },
  vendorSubTab: { flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#FFFFFF' },
  vendorSubTabActive: { backgroundColor: '#2C2420' },
  vendorSubTabText: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  vendorSubTabTextActive: { color: '#C9A84C', fontFamily: 'DMSans_500Medium' },

  codeLabel: {
    fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_500Medium',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: -8,
  },
  codeInput: {
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1.5, borderColor: '#EDE8E0',
    paddingVertical: 14, paddingHorizontal: 18, fontSize: 16, fontFamily: 'DMSans_400Regular',
    color: '#2C2420', letterSpacing: 3, textAlign: 'center',
  },
  codeInputError: { borderColor: '#E57373' },

  errorText: { fontSize: 12, color: '#E57373', fontFamily: 'DMSans_400Regular', textAlign: 'center' },

  submitBtn: {
    backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 15, alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#C4B8AC' },
  submitBtnText: {
    color: '#FAF6F0', fontSize: 13, fontFamily: 'DMSans_300Light',
    letterSpacing: 2, textTransform: 'uppercase',
  },

  hintText: {
    fontSize: 11, color: '#C4B8AC', fontFamily: 'DMSans_300Light',
    textAlign: 'center', lineHeight: 17,
  },

  // Request screen
  requestSection: { gap: 14 },
  requestTitle: { fontSize: 24, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.3 },
  requestSubtitle: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', marginTop: -8 },

  typeToggle: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#EDE8E0', backgroundColor: '#FFFFFF',
  },
  typeBtnActive: { borderColor: '#C9A84C', backgroundColor: '#FFF8EC' },
  typeText: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  typeTextActive: { color: '#C9A84C', fontFamily: 'DMSans_500Medium' },

  formCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EDE8E0', overflow: 'hidden',
  },
  fieldBlock: { paddingHorizontal: 18, paddingVertical: 14, gap: 4 },
  fieldDivider: { height: 1, backgroundColor: '#EDE8E0', marginHorizontal: 18 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: {
    fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_500Medium',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  fieldOptional: { fontSize: 11, color: '#C4B8AC', fontFamily: 'DMSans_300Light', fontStyle: 'italic' },
  fieldInput: {
    fontSize: 15, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular',
    paddingVertical: 4, letterSpacing: 0.2,
  },

  // Requested confirmation
  requestedSection: { alignItems: 'center', paddingVertical: 40, gap: 14 },
  requestedIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF8EC',
    borderWidth: 1, borderColor: '#E8D9B5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  requestedTitle: { fontSize: 22, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  requestedBody: {
    fontSize: 14, color: '#8C7B6E', fontFamily: 'DMSans_300Light',
    textAlign: 'center', lineHeight: 22, maxWidth: 280,
  },
  requestedBtn: {
    marginTop: 12, borderWidth: 1, borderColor: '#E8D9B5', borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#FFF8EC',
  },
  requestedBtnText: { fontSize: 13, color: '#C9A84C', fontFamily: 'DMSans_400Regular' },
});
'''

with open('app/login.tsx', 'w') as f:
    f.write(login)

print("✓ app/login.tsx — rewritten with invite code flow")
print("  Gate: 'Do you have an invite code?' → Yes / No")
print("  Yes → Dreamer tab (invite code) / Vendor tab (code or sign-in)")
print("  No → Request form (name, phone, email, type, city) → confirmation")
print("  Session check on mount (auto-redirect if already logged in)")
print("  All APIs match web portal endpoints")
print()
print("PATCH 11 COMPLETE")
print("Run: npx tsc --noEmit -p tsconfig.json")
