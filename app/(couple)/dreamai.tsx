import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, Animated, Easing,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RAILWAY_URL } from '../../constants/tokens';
import { getCoupleSession } from '../../utils/session';

const API = RAILWAY_URL;
const GOLD   = '#C9A84C';
const BG     = '#FFFFFF';
const BGMSG  = '#F8F7F5';
const BORDER = '#E2DED8';
const MUTED  = '#8C8480';
const DARK   = '#111111';
const INK    = '#0C0A09';
const CARD   = '#FFFFFF';

const CG300 = 'CormorantGaramond_300Light';
const DM300 = 'DMSans_300Light';
const DM400 = 'DMSans_400Regular';

const CLOUDINARY_CLOUD  = 'dccso5ljv';
const CLOUDINARY_PRESET = 'dream_wedding_uploads';
const JUST_DO_IT_KEY    = 'dreamai_just_do_it_couple';

// ── Types ──────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  actionType?: string;
  actionLabel?: string;
  actionPreview?: string;
  actionParams?: Record<string, any>;
  extraActions?: Array<{ type: string; label: string; preview: string; params: Record<string, any> }>;
  actionDone?: boolean;
}

// ── ACTION tag parser — identical to vendor side ───────────────────────────
function parseSingleActionTag(tag: string) {
  const tagContent = tag.slice(8, -1);
  const firstPipe  = tagContent.indexOf('|');
  const secondPipe = tagContent.indexOf('|', firstPipe + 1);
  const lastBrace  = tagContent.lastIndexOf('{');
  if (firstPipe === -1 || secondPipe === -1 || lastBrace === -1) return null;
  const type      = tagContent.slice(0, firstPipe);
  const label     = tagContent.slice(firstPipe + 1, secondPipe);
  const preview   = tagContent.slice(secondPipe + 1, lastBrace - 1).trim();
  const paramsStr = tagContent.slice(lastBrace);
  let params: Record<string, any> = {};
  try { params = JSON.parse(paramsStr); } catch {}
  return { type, label, preview, params };
}

function parseActionTags(text: string) {
  const tagRegex = /\[ACTION:[^\[\]]*\{[^\[\]]*\}\]/g;
  const matches  = [...text.matchAll(tagRegex)];
  if (matches.length === 0) return null;
  const cleanText = text.replace(tagRegex, '').trim();
  const actions   = matches.map(m => parseSingleActionTag(m[0])).filter(Boolean) as any[];
  if (actions.length === 0) return null;
  const [first, ...rest] = actions;
  return { ...first, cleanText, extraActions: rest };
}

// ── Multi-action heuristic ─────────────────────────────────────────────────
function impliesMultipleActions(text: string): boolean {
  const keywords = ['and', 'also', 'then', 'plus', 'aur', 'bhi', 'saath',
    'create', 'add', 'book', 'lock', 'task', 'expense', 'guest', 'new'];
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

// ── Context-aware quick prompts ────────────────────────────────────────────
function getQuickPrompts(ctx: any): string[] {
  if (!ctx) return [
    "What's overdue this week?",
    "How much have I spent so far?",
    "Which vendors have I booked?",
    "What's next on my checklist?",
  ];
  const prompts: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const pendingList = ctx.tasks?.pending_list || [];
  const overdue = pendingList.filter((t: any) => t.due_date && t.due_date < today);
  prompts.push(overdue.length > 0 ? `What's overdue? (${overdue.length} tasks)` : "What's overdue this week?");
  const budget = ctx.budget;
  prompts.push(budget?.total > 0 ? `How much have I spent? (Rs ${(budget.committed || 0).toLocaleString('en-IN')} of Rs ${budget.total.toLocaleString('en-IN')})` : "How much have I spent so far?");
  const bookedCount = ctx.vendors?.booked || 0;
  prompts.push(bookedCount > 0 ? `Which vendors have I booked? (${bookedCount} booked)` : "Which vendors have I booked?");
  prompts.push("What should I do next?");
  return prompts;
}

// ── Bold text renderer ─────────────────────────────────────────────────────
function BoldText({ text, style }: { text: string; style: any }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <Text key={i} style={{ fontFamily: DM400 }}>{part.slice(2, -2)}</Text>
          : <Text key={i}>{part}</Text>
      )}
    </Text>
  );
}

// ── Animated typing dots ───────────────────────────────────────────────────
function TypingDots() {
  const anims = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(anim, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 5, padding: 8, alignItems: 'center' }}>
      {anims.map((anim, i) => (
        <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#C9A84C', opacity: anim, transform: [{ scale: anim }] }} />
      ))}
    </View>
  );
}

// ── Animated message bubble ────────────────────────────────────────────────
function MessageFade({ children }: { children: React.ReactNode }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(6)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
}

// ── Animated Just Do It toggle ─────────────────────────────────────────────
function JustDoItToggle({ justDoIt, onToggle }: { justDoIt: boolean; onToggle: () => void }) {
  const thumbAnim = useRef(new Animated.Value(justDoIt ? 14 : 2)).current;
  useEffect(() => {
    Animated.timing(thumbAnim, {
      toValue: justDoIt ? 14 : 2,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [justDoIt]);
  return (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} activeOpacity={0.85} onPress={onToggle}>
      <Text style={{ fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: justDoIt ? '#C9A84C' : '#B8B4AE' }}>Just do it</Text>
      <View style={{ width: 32, height: 18, borderRadius: 9, borderWidth: 1, borderColor: justDoIt ? '#C9A84C' : '#D4D0CA', backgroundColor: justDoIt ? 'rgba(201,168,76,0.15)' : '#E8E5DF', position: 'relative' }}>
        <Animated.View style={{ position: 'absolute', top: 2, left: thumbAnim, width: 12, height: 12, borderRadius: 6, backgroundColor: justDoIt ? '#C9A84C' : '#B8B4AE' }} />
      </View>
    </TouchableOpacity>
  );
}

// ── Top pill nav ───────────────────────────────────────────────────────────
function TopPillNav() {
  return (
    <View style={styles.topPillNav}>
      <TouchableOpacity style={styles.topPill} activeOpacity={0.85} onPress={() => router.replace('/(couple)/plan')}>
        <Text style={styles.topPillText}>PLAN</Text>
      </TouchableOpacity>
      <View style={[styles.topPill, styles.topPillActive]}>
        <Text style={[styles.topPillText, styles.topPillTextAi]}>✦ AI</Text>
      </View>
      <TouchableOpacity style={styles.topPill} activeOpacity={0.85}>
        <Text style={styles.topPillText}>DISCOVER</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Action card — identical to vendor side ─────────────────────────────────
function ActionCard({ msg, userId, onConfirm, onDismiss }: {
  msg: ChatMessage;
  userId: string;
  onConfirm: (result: string) => void;
  onDismiss: () => void;
}) {
  const [executing, setExecuting] = useState(false);

  // Couple-side action endpoints
  const ACTION_ENDPOINTS: Record<string, string> = {
    add_expense:           '/api/couple/expenses',
    add_guest:             '/api/couple/guests',
    add_vendor:            '/api/couple/vendors',
    update_vendor_status:  '/api/v2/dreamai/couple-action/update-vendor-status',
    mark_expense_paid:     '/api/v2/dreamai/couple-action/mark-expense-paid',
    complete_task:         '/api/v2/dreamai/couple-action/complete-task',
    send_enquiry:          '/api/v2/dreamai/couple-action/send-enquiry',
    save_to_muse:          '/api/couple/muse',
  };

  async function execute() {
    if (!msg.actionType || executing) return;
    const ep = ACTION_ENDPOINTS[msg.actionType];
    if (!ep) { onConfirm('Action completed.'); return; }
    setExecuting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const r = await fetch(API + ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_id: userId, userId, ...(msg.actionParams || {}) }),
      });
      const d = await r.json();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onConfirm(d.message || d.reply || '✓ Done.');
    } catch {
      onConfirm('Could not complete. Please try again.');
    } finally {
      setExecuting(false);
    }
  }

  return (
    <View style={styles.actionCard}>
      <Text style={styles.actionCardLabel}>✦ Action Preview</Text>
      <Text style={styles.actionCardPreview}>{msg.actionPreview}</Text>
      <View style={styles.actionCardButtons}>
        <TouchableOpacity
          style={[styles.actionConfirmBtn, executing && styles.actionConfirmBtnBusy]}
          activeOpacity={0.85}
          onPress={execute}
          disabled={executing}
        >
          <Text style={styles.actionConfirmText}>{executing ? '...' : 'Confirm'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCancelBtn} activeOpacity={0.85} onPress={onDismiss}>
          <Text style={styles.actionCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function CoupleDreamAiScreen() {
  const insets = useSafeAreaInsets();

  const [session,        setSession]        = useState<any>(null);
  const [messages,       setMessages]       = useState<ChatMessage[]>([]);
  const [input,          setInput]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [context,        setContext]        = useState<any>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [justDoIt,       setJustDoIt]       = useState(false);

  const bottomRef      = useRef<ScrollView>(null);
  const inputRef       = useRef<TextInput>(null);
  const originalMsgRef = useRef<string>('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function init() {
        const s = await getCoupleSession();
        if (cancelled || !s) return;
        setSession(s);

        const stored = await AsyncStorage.getItem(JUST_DO_IT_KEY).catch(() => null);
        if (!cancelled) setJustDoIt(stored === 'true');

        try {
          const r = await fetch(`${API}/api/v2/dreamai/couple-context/${s.id}`);
          const d = await r.json();
          if (!cancelled) { setContext(d); setContextLoading(false); }
        } catch {
          if (!cancelled) setContextLoading(false);
        }
      }
      init();
      return () => { cancelled = true; };
    }, [])
  );

  // Proactive briefing — fires once after context loads, only if no messages yet
  useEffect(() => {
    if (!context || messages.length > 0) return;

    const urgent: string[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const in7   = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    // Tasks overdue — from tasks.pending_list
    const pendingList = context.tasks?.pending_list || [];
    const overdue = pendingList.filter((t: any) => t.due_date && t.due_date < today);
    if (overdue.length > 0) urgent.push(`${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`);

    // Upcoming payments — from upcoming_payments array
    const upcoming = (context.upcoming_payments || []).filter((p: any) => p.due_date && p.due_date <= in7);
    if (upcoming.length > 0) urgent.push(`${upcoming.length} payment${upcoming.length > 1 ? 's' : ''} due this week`);

    // Vendors not yet booked — from vendors.pending
    const pendingVendors = context.vendors?.pending || 0;
    if (pendingVendors > 0) urgent.push(`${pendingVendors} vendor${pendingVendors > 1 ? 's' : ''} still in negotiation`);

    if (urgent.length === 0) return;

    const name = context.couple?.name?.split(' ')[0] || 'Dreamer';
    const briefing = `Good to see you, ${name}. You have ${urgent.join(', ')}. How would you like to handle it?`;
    setMessages([{ id: 'briefing', role: 'ai', text: briefing }]);
  }, [context]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, loading]);

  async function toggleJustDoIt() {
    const newVal = !justDoIt;
    setJustDoIt(newVal);
    await AsyncStorage.setItem(JUST_DO_IT_KEY, String(newVal)).catch(() => {});
    Haptics.selectionAsync();
  }

  async function refreshContext() {
    if (!session?.id) return;
    try {
      const r = await fetch(`${API}/api/v2/dreamai/couple-context/${session.id}`);
      const d = await r.json();
      setContext(d);
    } catch {}
  }

  // ── Send message ─────────────────────────────────────────────────────────
  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading || !session) return;
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (msg !== 'Continue with any remaining actions from my last request.') {
      originalMsgRef.current = msg;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Last 10 messages as history — multi-turn context
      const history = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        text: m.text,
      }));

      const r = await fetch(`${API}/api/v2/dreamai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.id,
          userType: 'couple',
          message: msg,
          context,
          history,
        }),
      });
      const d = await r.json();
      const replyText = d.reply || 'Something went wrong. Please try again.';
      const parsed    = parseActionTags(replyText);
      const cleanText = parsed
        ? parsed.cleanText
        : replyText.replace(/\[ACTION:[^\]]+\]/g, '').trim();

      if (parsed && justDoIt) {
        // JUST DO IT MODE — find endpoint and execute immediately
        const ACTION_ENDPOINTS: Record<string, string> = {
          add_expense:          '/api/couple/expenses',
          add_guest:            '/api/couple/guests',
          add_vendor:           '/api/couple/vendors',
          update_vendor_status: '/api/v2/dreamai/couple-action/update-vendor-status',
          mark_expense_paid:    '/api/v2/dreamai/couple-action/mark-expense-paid',
          complete_task:        '/api/v2/dreamai/couple-action/complete-task',
          send_enquiry:         '/api/v2/dreamai/couple-action/send-enquiry',
          save_to_muse:         '/api/couple/muse',
        };
        const ep = ACTION_ENDPOINTS[parsed.type];
        if (ep) {
          try {
            const execR = await fetch(API + ep, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ couple_id: session.id, userId: session.id, ...parsed.params }),
            });
            const execD = await execR.json();
            const resultText = (cleanText ? cleanText + '\n\n' : '') + '✓ ' + (execD.message || execD.reply || 'Done.');
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: resultText }]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await refreshContext();
          } catch {
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: cleanText || 'Could not complete that action.' }]);
          }
          if (impliesMultipleActions(originalMsgRef.current)) {
            setLoading(false);
            await send('Continue with any remaining actions from my last request.');
            return;
          }
        } else {
          setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: cleanText }]);
        }
      } else if (parsed) {
        // Normal mode — show action card
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: cleanText,
          actionType:    parsed.type,
          actionLabel:   parsed.label,
          actionPreview: parsed.preview,
          actionParams:  parsed.params,
          extraActions:  parsed.extraActions || [],
        }]);
      } else {
        // Retry on bare "Done."
        let finalText = cleanText;
        if (finalText.trim() === 'Done.' || finalText.trim() === 'Done') {
          try {
            const retry = await fetch(`${API}/api/v2/dreamai/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: session.id, userType: 'couple', message: msg, context, history }),
            });
            const rj = await retry.json();
            if (rj.reply && rj.reply.trim() !== 'Done.' && rj.reply.trim() !== 'Done') {
              finalText = rj.reply;
            }
          } catch {}
        }
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: finalText }]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: 'Unable to reach DreamAi. Please check your connection.' }]);
    }
    setLoading(false);
  }

  // ── Image handling ────────────────────────────────────────────────────────
  async function handleImageAttach() {
    if (uploadingImage || loading) return;
    Alert.alert('Attach image', 'Choose source', [
      { text: 'Camera',        onPress: () => pickImage('camera')  },
      { text: 'Photo Library', onPress: () => pickImage('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function pickImage(source: 'camera' | 'library') {
    const { status } = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', `Please allow ${source === 'camera' ? 'camera' : 'photo'} access.`);
      return;
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, base64: true });

    if (result.canceled || !result.assets?.[0]) return;
    await processImage(result.assets[0]);
  }

  async function processImage(asset: ImagePicker.ImagePickerAsset) {
    if (!session) return;
    setUploadingImage(true);
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: '📷 Image' }]);

    try {
      const formData = new FormData();
      formData.append('file', { uri: asset.uri, type: 'image/jpeg', name: 'upload.jpg' } as any);
      formData.append('upload_preset', CLOUDINARY_PRESET);
      const cloudRes  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: formData });
      const cloudJson = await cloudRes.json();
      const imageUrl  = cloudJson.secure_url;
      if (!imageUrl) throw new Error('Upload failed');

      const r = await fetch(`${API}/api/v2/dreamai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.id,
          userType: 'couple',
          message: `I sent an image. The uploaded URL is: ${imageUrl}\n\nPlease classify it: if it looks like a receipt or invoice, log it as an expense using add_expense. If it looks like wedding inspiration (decor, fashion, makeup, venue, photography), save it to my Muse board using save_to_muse with source_url set to "${imageUrl}".`,
          context,
          image_base64:    asset.base64,
          image_media_type: 'image/jpeg',
        }),
      });
      const json = await r.json();
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: json.reply || 'Image processed!' }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: 'Could not process image. Please try again.' }]);
    } finally {
      setUploadingImage(false);
    }
  }

  const quickPrompts = getQuickPrompts(context);
  const showChips    = (messages.length === 0 || messages[messages.length - 1]?.role === 'ai') && !loading;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TopPillNav />

      {/* Header: status dot + Just Do It toggle */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusDot, { backgroundColor: contextLoading ? 'rgba(201,168,76,0.3)' : GOLD }]} />
          <Text style={[styles.statusText, { color: contextLoading ? 'rgba(201,168,76,0.4)' : GOLD }]}>
            {contextLoading ? 'Loading your data...' : 'DreamAi · Live'}
          </Text>
        </View>
        <JustDoItToggle justDoIt={justDoIt} onToggle={toggleJustDoIt} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Messages */}
        <ScrollView
          ref={bottomRef}
          style={styles.messageArea}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Empty state */}
          {messages.length === 0 && !contextLoading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyGreeting}>
                {context?.user?.name ? `Good to see you, ${context.user.name.split(' ')[0]}.` : 'Ask anything about your wedding.'}
              </Text>
              <Text style={styles.emptySubtitle}>Tell me what you need. I'll handle it.</Text>
            </View>
          )}

          {/* Thread */}
          {messages.map(m => (
            <MessageFade key={m.id}>
              <View style={[styles.msgRow, m.role === 'user' ? styles.msgRowUser : styles.msgRowAi]}>
                <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                  <BoldText
                    text={m.text}
                    style={[styles.bubbleText, m.role === 'user' ? styles.userBubbleText : styles.aiBubbleText]}
                  />
                </View>
              </View>

              {/* Action card */}
              {m.actionType && !m.actionDone && (
                <ActionCard
                  msg={m}
                  userId={session?.id || ''}
                  onConfirm={async result => {
                    setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, actionDone: true } : msg));
                    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: result }]);
                    await refreshContext();
                    const remaining = m.extraActions || [];
                    if (remaining.length > 0) {
                      const next = remaining[0];
                      setMessages(prev => [...prev, {
                        id: (Date.now() + 2).toString(),
                        role: 'ai',
                        text: `Next: ${next.label}`,
                        actionType:    next.type,
                        actionLabel:   next.label,
                        actionPreview: next.preview,
                        actionParams:  next.params,
                        extraActions:  remaining.slice(1),
                      }]);
                    }
                  }}
                  onDismiss={() => {
                    setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, actionDone: true } : msg));
                  }}
                />
              )}
            </MessageFade>
          ))}

          {/* Typing indicator */}
          {loading && (
            <View style={styles.msgRowAi}>
              <View style={[styles.aiBubble, { paddingVertical: 8, paddingHorizontal: 12 }]}>
                <TypingDots />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick prompt chips */}
        {showChips && messages.length === 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsContent}
          >
            {quickPrompts.map((q, i) => (
              <TouchableOpacity key={i} style={styles.chip} activeOpacity={0.8} onPress={() => send(q)}>
                <Text style={styles.chipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity
            style={[styles.attachBtn, uploadingImage && styles.attachBtnBusy]}
            activeOpacity={0.8}
            onPress={handleImageAttach}
          >
            <Text style={styles.attachBtnIcon}>{uploadingImage ? '⏳' : '📷'}</Text>
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about your wedding..."
            placeholderTextColor={MUTED}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={() => send()}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.sendBtn, (input.trim() && !loading) ? styles.sendBtnActive : styles.sendBtnInactive]}
            activeOpacity={0.85}
            onPress={() => send()}
            disabled={loading || !input.trim()}
          >
            <Text style={[styles.sendIcon, { color: (input.trim() && !loading) ? '#FFFFFF' : '#B8B4AE' }]}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  topPillNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: BG, borderBottomWidth: 0.5, borderBottomColor: BORDER, gap: 4,
  },
  topPill:         { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 100 },
  topPillActive:   { backgroundColor: '#F4F1EB' },
  topPillText:     { fontFamily: DM300, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: MUTED },
  topPillTextAi:   { color: GOLD, fontFamily: DM400 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: BORDER, backgroundColor: BG,
  },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot:    { width: 6, height: 6, borderRadius: 3 },
  statusText:   { fontFamily: DM300, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' },

  justDoItToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  justDoItLabel:  { fontFamily: DM300, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' },
  toggleTrack:    { width: 32, height: 18, borderRadius: 9, borderWidth: 1, position: 'relative' },
  toggleThumb:    { position: 'absolute', top: 2, width: 12, height: 12, borderRadius: 6 },

  messageArea:    { flex: 1 },
  messageContent: { padding: 16, paddingBottom: 8, flexGrow: 1 },

  emptyState:    { paddingTop: 24, marginBottom: 8 },
  emptyGreeting: { fontFamily: CG300, fontStyle: 'italic', fontSize: 22, color: '#2A2420', lineHeight: 29, marginBottom: 6 },
  emptySubtitle: { fontFamily: DM300, fontSize: 13, color: MUTED, lineHeight: 20 },

  msgRow:     { marginBottom: 8 },
  msgRowUser: { alignItems: 'flex-end' },
  msgRowAi:   { alignItems: 'flex-start' },

  bubble:         { maxWidth: '82%', paddingVertical: 10, paddingHorizontal: 14 },
  userBubble:     { backgroundColor: GOLD, borderRadius: 16, borderBottomRightRadius: 4 },
  aiBubble:       { backgroundColor: CARD, borderRadius: 16, borderBottomLeftRadius: 4 },
  bubbleText:     { fontSize: 14, lineHeight: 21.7 },
  userBubbleText: { fontFamily: DM300, color: INK },
  aiBubbleText:   { fontFamily: DM300, color: DARK },

  typingDots: { flexDirection: 'row', gap: 5, padding: 8, alignItems: 'center', marginBottom: 4 },
  typingDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD, opacity: 0.7 },

  actionCard:           { backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)', borderRadius: 14, padding: 14, marginBottom: 8, marginTop: 2 },
  actionCardLabel:      { fontFamily: DM300, fontSize: 8, letterSpacing: 1.8, textTransform: 'uppercase', color: GOLD, marginBottom: 8 },
  actionCardPreview:    { fontFamily: DM300, fontSize: 14, color: DARK, marginBottom: 14, lineHeight: 21 },
  actionCardButtons:    { flexDirection: 'row', gap: 10 },
  actionConfirmBtn:     { flex: 1, height: 42, backgroundColor: GOLD, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  actionConfirmBtnBusy: { backgroundColor: 'rgba(201,168,76,0.5)' },
  actionConfirmText:    { fontFamily: DM400, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: INK },
  actionCancelBtn:      { height: 42, paddingHorizontal: 18, borderWidth: 0.5, borderColor: '#D4D0CA', borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  actionCancelText:     { fontFamily: DM300, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED },

  chipsScroll:   { flexGrow: 0, flexShrink: 0 },
  chipsContent:  { paddingHorizontal: 20, paddingBottom: 10, gap: 8, flexDirection: 'row' },
  chip:          { height: 34, paddingHorizontal: 12, backgroundColor: CARD, borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.4)', borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  chipText:      { fontFamily: DM300, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: GOLD },

  inputBar:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: BORDER, backgroundColor: BG },
  attachBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: BGMSG, borderWidth: 0.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  attachBtnBusy: { backgroundColor: '#F4F1EC' },
  attachBtnIcon: { fontSize: 18 },
  textInput:     { flex: 1, height: 44, fontFamily: DM300, fontSize: 14, color: DARK, backgroundColor: BGMSG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 22, paddingHorizontal: 16 },
  sendBtn:       { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sendBtnActive:   { backgroundColor: GOLD },
  sendBtnInactive: { backgroundColor: '#E2DED8' },
  sendIcon:      { fontSize: 16, fontFamily: DM400 },
});
