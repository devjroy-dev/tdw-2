import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { RAILWAY_URL } from '../../constants/tokens';
import { getCoupleSession } from '../../utils/session';

const API = RAILWAY_URL;
const GOLD   = '#C9A84C';
const INK    = '#0C0A09';
const BG     = '#FFFFFF';
const CARD   = '#FFFFFF';
const BGMSG  = '#F8F7F5';
const BORDER = '#E2DED8';
const MUTED  = '#8C8480';
const DARK   = '#111111';

const CG300 = 'CormorantGaramond_300Light';
const DM300 = 'DMSans_300Light';
const DM400 = 'DMSans_400Regular';

const CLOUDINARY_CLOUD  = 'dccso5ljv';
const CLOUDINARY_PRESET = 'dream_wedding_uploads';

// ── Types ──────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  isImage?: boolean;
}

interface CoupleSession {
  id: string;
  name?: string;
  dreamer_type?: string;
  couple_tier?: string;
}

// ── Bold-text renderer ─────────────────────────────────────────────────────
function BoldText({ text, style }: { text: string; style: object }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={{ fontFamily: DM400 }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

// ── Shimmer for loading state ──────────────────────────────────────────────
function ShimmerBubble() {
  return (
    <View style={styles.aiBubble}>
      <View style={{ height: 14, width: 110, borderRadius: 4, backgroundColor: '#E8E5DF' }} />
    </View>
  );
}

// ── Quick prompts ──────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  "What's overdue this week?",
  "How much have I spent so far?",
  "Which vendors haven't replied?",
  "Draft a reminder to my florist",
];

// ── Top pill nav (shared across PLAN · AI · DISCOVER) ─────────────────────
function TopPillNav() {
  return (
    <View style={styles.topPillNav}>
      <TouchableOpacity
        style={styles.topPill}
        activeOpacity={0.85}
        onPress={() => router.replace('/(couple)/plan')}
      >
        <Text style={styles.topPillText}>PLAN</Text>
      </TouchableOpacity>

      <View style={[styles.topPill, styles.topPillActive]}>
        <Text style={[styles.topPillText, styles.topPillTextAi]}>✦ AI</Text>
      </View>

      <TouchableOpacity
        style={styles.topPill}
        activeOpacity={0.85}
        onPress={() => {
          // TODO V6: wire to Discover screen when built
        }}
      >
        <Text style={styles.topPillText}>DISCOVER</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function CoupleDreamAiScreen() {
  const insets = useSafeAreaInsets();

  const [session, setSession] = useState<CoupleSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [context, setContext] = useState<object | null>(null);
  const [contextLoading, setContextLoading] = useState(true);

  const bottomRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function init() {
        const s = await getCoupleSession();
        if (cancelled || !s) return;
        setSession(s);
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

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollToEnd({ animated: true }), 100);
  }

  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  // ── Send message ─────────────────────────────────────────────────────────
  async function sendMessage(text: string) {
    const msg = text.trim();
    if (!msg || loading || !session) return;
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/v2/dreamai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.id,
          userType: 'couple',
          message: msg,
          context,
        }),
      });
      const json = await res.json();
      let replyText = json.reply || 'Something went wrong.';

      // Retry on bare "Done." — same logic as PWA
      if (replyText.trim() === 'Done.' || replyText.trim() === 'Done') {
        try {
          const retry = await fetch(`${API}/api/v2/dreamai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: session.id,
              userType: 'couple',
              message: msg,
              context,
              history: [{ role: 'user', text: msg }],
            }),
          });
          const rj = await retry.json();
          if (rj.reply && rj.reply.trim() !== 'Done.' && rj.reply.trim() !== 'Done') {
            replyText = rj.reply;
          }
        } catch {}
      }

      // Strip ACTION tags from reply text (native side doesn't render action cards on couple side)
      const cleanText = replyText.replace(/\[ACTION:\w+\|[^|]+\|[^|]+\|\{[^}]+\}\]/g, '').trim();

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: cleanText || replyText,
      };
      setMessages(prev => [...prev, aiMsg]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: 'Unable to reach DreamAi. Please check your connection.',
      }]);
    } finally {
      setLoading(false);
    }
  }

  // ── Image handling (multi-modal) ─────────────────────────────────────────
  async function handleImagePick() {
    if (uploadingImage || loading) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to attach images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await processImage(result.assets[0]);
  }

  async function handleCameraCapture() {
    if (uploadingImage || loading) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await processImage(result.assets[0]);
  }

  async function processImage(asset: ImagePicker.ImagePickerAsset) {
    if (!session) return;
    setUploadingImage(true);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      text: '📷 Image',
      isImage: true,
    }]);

    try {
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: 'upload.jpg',
      } as any);
      formData.append('upload_preset', CLOUDINARY_PRESET);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
        { method: 'POST', body: formData }
      );
      const cloudJson = await cloudRes.json();
      const imageUrl = cloudJson.secure_url;
      if (!imageUrl) throw new Error('Cloudinary upload failed');

      // Send to DreamAi with classification instruction (same as PWA)
      const res = await fetch(`${API}/api/v2/dreamai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.id,
          userType: 'couple',
          message: `I sent an image. The uploaded URL is: ${imageUrl}\n\nPlease classify it: if it looks like a receipt or invoice, log it as an expense using add_expense. If it looks like wedding inspiration (decor, fashion, makeup, venue, photography), save it to my Muse board using save_to_muse with source_url set to "${imageUrl}".`,
          context,
          image_base64: asset.base64,
          image_media_type: 'image/jpeg',
        }),
      });
      const json = await res.json();
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: json.reply || 'Image processed!',
      }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: 'Could not process image. Please try again.',
      }]);
    } finally {
      setUploadingImage(false);
    }
  }

  const showQuickPrompts = messages.length === 0 && !contextLoading;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top pill nav */}
      <TopPillNav />

      {/* Status dot */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: contextLoading ? 'rgba(201,168,76,0.3)' : GOLD }]} />
        <Text style={[styles.statusText, { color: contextLoading ? 'rgba(201,168,76,0.4)' : GOLD }]}>
          {contextLoading ? 'Loading your data...' : 'DreamAi · Live'}
        </Text>
      </View>

      {/* KeyboardAvoidingView wraps messages + input */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages */}
        <ScrollView
          ref={bottomRef}
          style={styles.messageArea}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Empty state */}
          {showQuickPrompts && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Ask anything about your wedding.</Text>
              <View style={styles.quickPromptsCol}>
                {QUICK_PROMPTS.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.quickPrompt}
                    activeOpacity={0.75}
                    onPress={() => sendMessage(q)}
                  >
                    <Text style={styles.quickPromptText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Message thread */}
          {messages.map(m => (
            <View
              key={m.id}
              style={[
                styles.msgRow,
                m.role === 'user' ? styles.msgRowUser : styles.msgRowAi,
              ]}
            >
              <View style={[
                styles.bubble,
                m.role === 'user' ? styles.userBubble : styles.aiBubble,
              ]}>
                <BoldText
                  text={m.text}
                  style={[
                    styles.bubbleText,
                    m.role === 'user' ? styles.userBubbleText : styles.aiBubbleText,
                  ]}
                />
              </View>
            </View>
          ))}

          {/* Typing indicator */}
          {loading && (
            <View style={styles.msgRowAi}>
              <ShimmerBubble />
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }]}>
          {/* Camera button */}
          <TouchableOpacity
            style={[styles.attachBtn, uploadingImage && styles.attachBtnBusy]}
            activeOpacity={0.8}
            onPress={() => {
              if (uploadingImage || loading) return;
              Alert.alert('Attach image', 'Choose source', [
                { text: 'Camera', onPress: handleCameraCapture },
                { text: 'Photo Library', onPress: handleImagePick },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          >
            <Text style={styles.attachBtnIcon}>{uploadingImage ? '⏳' : '📷'}</Text>
          </TouchableOpacity>

          {/* Text input */}
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about your wedding..."
            placeholderTextColor={MUTED}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
            editable={!loading}
          />

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendBtn, input.trim() ? styles.sendBtnActive : styles.sendBtnInactive]}
            activeOpacity={0.85}
            onPress={() => sendMessage(input)}
            disabled={loading || !input.trim()}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // Top pill nav
  topPillNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: BG,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    gap: 4,
  },
  topPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 100,
  },
  topPillActive: {
    backgroundColor: '#F4F1EB',
  },
  topPillText: {
    fontFamily: DM300,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: MUTED,
  },
  topPillTextAi: {
    color: GOLD,
    fontFamily: DM400,
  },

  // Status bar
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    backgroundColor: BG,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: DM300,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Message area
  messageArea: {
    flex: 1,
    backgroundColor: BG,
  },
  messageContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },

  // Empty state
  emptyState: {
    flex: 1,
    paddingTop: 24,
  },
  emptyTitle: {
    fontFamily: CG300,
    fontSize: 18,
    fontStyle: 'italic',
    color: MUTED,
    textAlign: 'center',
    marginBottom: 24,
  },
  quickPromptsCol: {
    gap: 8,
  },
  quickPrompt: {
    backgroundColor: '#F8F7F5',
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
  },
  quickPromptText: {
    fontFamily: DM300,
    fontSize: 13,
    color: '#555250',
  },

  // Message rows
  msgRow: {
    marginBottom: 10,
  },
  msgRowUser: {
    alignItems: 'flex-end',
  },
  msgRowAi: {
    alignItems: 'flex-start',
  },

  // Bubbles
  bubble: {
    maxWidth: '82%',
    padding: 10,
    paddingHorizontal: 14,
  },
  userBubble: {
    backgroundColor: CARD,
    borderWidth: 0.5,
    borderColor: 'rgba(201,168,76,0.6)',
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#F8F7F5',
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 21,
  },
  userBubbleText: {
    fontFamily: DM300,
    color: DARK,
  },
  aiBubbleText: {
    fontFamily: DM300,
    color: DARK,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    backgroundColor: BG,
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F7F5',
    borderWidth: 0.5,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  attachBtnBusy: {
    backgroundColor: '#F4F1EC',
  },
  attachBtnIcon: {
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    height: 44,
    fontFamily: DM300,
    fontSize: 14,
    color: DARK,
    backgroundColor: '#F8F7F5',
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 22,
    paddingHorizontal: 16,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnActive: {
    backgroundColor: GOLD,
  },
  sendBtnInactive: {
    backgroundColor: '#E2DED8',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: DM400,
  },
});
