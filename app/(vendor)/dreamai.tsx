import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { RAILWAY_URL } from '../../constants/tokens';
import { getVendorSession } from '../../utils/session';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = RAILWAY_URL;
const GOLD   = '#C9A84C';
const BG     = '#F8F7F5';
const CARD   = '#FFFFFF';
const BORDER = '#E2DED8';
const MUTED  = '#8C8480';
const DARK   = '#111111';
const INK    = '#0C0A09';

const CG300 = 'CormorantGaramond_300Light';
const DM300 = 'DMSans_300Light';
const DM400 = 'DMSans_400Regular';

const JUST_DO_IT_KEY = 'dreamai_just_do_it_vendor';

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

// ── ACTION tag parser (robust, matches PWA exactly) ────────────────────────
function parseSingleActionTag(tag: string) {
  const tagContent = tag.slice(8, -1); // strip [ACTION: and ]
  const firstPipe  = tagContent.indexOf('|');
  const secondPipe = tagContent.indexOf('|', firstPipe + 1);
  const lastBrace  = tagContent.lastIndexOf('{');
  if (firstPipe === -1 || secondPipe === -1 || lastBrace === -1) return null;
  const type    = tagContent.slice(0, firstPipe);
  const label   = tagContent.slice(firstPipe + 1, secondPipe);
  const preview = tagContent.slice(secondPipe + 1, lastBrace - 1).trim();
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

// ── Vendor action endpoints ─────────────────────────────────────────────────
const ACTION_ENDPOINTS: Record<string, string> = {
  create_invoice:        '/api/v2/dreamai/vendor-action/create-invoice',
  add_client:            '/api/v2/dreamai/vendor-action/add-client',
  create_task:           '/api/v2/dreamai/vendor-action/create-task',
  block_date:            '/api/v2/dreamai/vendor-action/block-date',
  send_payment_reminder: '/api/v2/dreamai/vendor-action/send-payment-reminder',
  send_client_reminder:  '/api/v2/dreamai/vendor-action/send-client-reminder',
  log_expense:           '/api/v2/dreamai/vendor-action/log-expense',
  reply_to_enquiry:      '/api/v2/dreamai/vendor-action/reply-to-enquiry',
  record_payment:        '/api/v2/dreamai/vendor-action/record-payment',
};

// ── Multi-action heuristic ─────────────────────────────────────────────────
function impliesMultipleActions(text: string): boolean {
  const keywords = ['and', 'also', 'then', 'plus', 'aur', 'bhi', 'saath',
    'create', 'add', 'book', 'invoice', 'block', 'new booking', 'new client'];
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

// ── Context-aware suggestion chips ────────────────────────────────────────
function getChips(ctx: any): string[] {
  if (!ctx) return [
    "Who owes me money?",
    "Any new enquiries?",
    "What's my schedule today?",
    "What should I do now?",
  ];
  const chips: string[] = [];
  const overdue = ctx?.overdue_invoices?.length || 0;
  chips.push(overdue > 0 ? `Who owes me money? (${overdue} overdue)` : "Who owes me money?");
  const pending = (ctx?.enquiries || []).filter((e: any) => !e.replied).length;
  chips.push(pending > 0 ? `Any new enquiries? (${pending} pending)` : "Any new enquiries?");
  const nextEvent = ctx?.calendar?.[0];
  chips.push(nextEvent ? `What's happening on ${nextEvent.date?.slice(5)}?` : "What's my schedule today?");
  chips.push("Draft a payment reminder");
  return chips;
}

// ── Top nav (vendor side — TODAY · DREAMAI · CLIENTS · STUDIO) ─────────────
// The vendor top nav shows the DreamAi label in the standard header area.
// It is NOT a pill nav — vendor uses bottom tab + a header with DreamAi label.
function VendorHeader({ contextLoading, justDoIt, onToggleJustDoIt }: {
  contextLoading: boolean;
  justDoIt: boolean;
  onToggleJustDoIt: () => void;
}) {
  return (
    <View style={styles.header}>
      {/* Status indicator */}
      <View style={styles.headerLeft}>
        <View style={[styles.statusDot, { backgroundColor: contextLoading ? 'rgba(201,168,76,0.3)' : GOLD }]} />
        <Text style={[styles.statusText, { color: contextLoading ? 'rgba(201,168,76,0.4)' : GOLD }]}>
          {contextLoading ? 'Loading your data...' : 'DreamAi · Live'}
        </Text>
      </View>

      {/* Just Do It toggle */}
      <TouchableOpacity
        style={styles.justDoItToggle}
        activeOpacity={0.85}
        onPress={onToggleJustDoIt}
      >
        <Text style={[styles.justDoItLabel, { color: justDoIt ? GOLD : '#B8B4AE' }]}>
          Just do it
        </Text>
        <View style={[styles.toggleTrack, { borderColor: justDoIt ? GOLD : '#D4D0CA', backgroundColor: justDoIt ? 'rgba(201,168,76,0.15)' : '#E8E5DF' }]}>
          <View style={[styles.toggleThumb, { left: justDoIt ? 14 : 2, backgroundColor: justDoIt ? GOLD : '#B8B4AE' }]} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ── Action card component ──────────────────────────────────────────────────
function ActionCard({ msg, vendorId, onConfirm, onDismiss }: {
  msg: ChatMessage;
  vendorId: string;
  onConfirm: (result: string) => void;
  onDismiss: () => void;
}) {
  const [executing, setExecuting] = useState(false);

  async function execute() {
    if (!msg.actionType || executing) return;
    const ep = ACTION_ENDPOINTS[msg.actionType];
    if (!ep) { onConfirm('Action not available yet.'); return; }
    setExecuting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const r = await fetch(API + ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, ...(msg.actionParams || {}) }),
      });
      const d = await r.json();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onConfirm(d.message || '✓ Done.');
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
        <TouchableOpacity
          style={styles.actionCancelBtn}
          activeOpacity={0.85}
          onPress={onDismiss}
        >
          <Text style={styles.actionCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function VendorDreamAiScreen() {
  const insets = useSafeAreaInsets();

  const [vendorId,   setVendorId]   = useState('');
  const [vendorName, setVendorName] = useState('');
  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [context,    setContext]    = useState<any>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [justDoIt,   setJustDoIt]   = useState(false);

  const bottomRef      = useRef<ScrollView>(null);
  const inputRef       = useRef<TextInput>(null);
  const originalMsgRef = useRef<string>('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function init() {
        const s = await getVendorSession();
        if (cancelled || !s) return;
        const vid = s.vendorId || s.id;
        setVendorId(vid);
        setVendorName(s.vendorName || s.name || 'Maker');

        const stored = await AsyncStorage.getItem(JUST_DO_IT_KEY).catch(() => null);
        if (!cancelled) setJustDoIt(stored === 'true');

        try {
          const r = await fetch(`${API}/api/v2/dreamai/vendor-context/${vid}`);
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
    if (context.overdue_invoices?.length > 0) {
      const n = context.overdue_invoices.length;
      urgent.push(`${n} overdue invoice${n > 1 ? 's' : ''}`);
    }
    const newEnqs = (context.enquiries || []).filter((e: any) => !e.replied);
    if (newEnqs.length > 0) {
      urgent.push(`${newEnqs.length} unanswered enquir${newEnqs.length > 1 ? 'ies' : 'y'}`);
    }
    const today = new Date().toISOString().slice(0, 10);
    const todayEvents = (context.calendar || []).filter((e: any) => e.date === today);
    if (todayEvents.length > 0) {
      urgent.push(`event today: ${todayEvents[0].client_name}`);
    }
    if (urgent.length === 0) return;

    const briefing = `Good to see you. You have ${urgent.join(', ')}. How would you like to handle it?`;
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

  // ── Refresh context after action ─────────────────────────────────────────
  async function refreshContext(vid: string) {
    try {
      const r = await fetch(`${API}/api/v2/dreamai/vendor-context/${vid}`);
      const d = await r.json();
      setContext(d);
    } catch {}
  }

  // ── Send message ─────────────────────────────────────────────────────────
  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (msg !== 'Continue with any remaining actions from my last request.') {
      originalMsgRef.current = msg;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build conversation history (last 10 messages)
      const history = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        text: m.text,
      }));

      const r = await fetch(`${API}/api/v2/dreamai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: vendorId,
          userType: 'vendor',
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
        // JUST DO IT MODE — execute immediately
        const ep = ACTION_ENDPOINTS[parsed.type];
        if (ep) {
          try {
            const execR = await fetch(API + ep, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ vendor_id: vendorId, ...parsed.params }),
            });
            const execD = await execR.json();
            const resultText = (cleanText ? cleanText + '\n\n' : '') + '✓ ' + (execD.message || 'Done.');
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: resultText }]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await refreshContext(vendorId);
          } catch {
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: cleanText || 'Could not complete that action.' }]);
          }
          // Auto-continue for remaining actions in Just Do It mode
          if (impliesMultipleActions(originalMsgRef.current)) {
            setLoading(false);
            await send('Continue with any remaining actions from my last request.');
            return;
          }
        } else {
          setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: cleanText }]);
        }
      } else if (parsed) {
        // Normal mode — show action card for confirmation
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
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: cleanText }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: 'Could not connect. Please check your connection.',
      }]);
    }
    setLoading(false);
  }

  const chips = getChips(context);
  const showChips = (messages.length === 0 || messages[messages.length - 1]?.role === 'ai') && !loading;
  const firstName = vendorName.split(' ')[0] || 'Maker';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header with status + Just Do It toggle */}
      <VendorHeader
        contextLoading={contextLoading}
        justDoIt={justDoIt}
        onToggleJustDoIt={toggleJustDoIt}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
          {messages.length === 0 && !contextLoading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyGreeting}>Good to see you, {firstName}.</Text>
              <Text style={styles.emptySubtitle}>Tell me what you need. I'll handle it.</Text>
            </View>
          )}

          {/* Message thread */}
          {messages.map(m => (
            <View key={m.id}>
              <View style={[styles.msgRow, m.role === 'user' ? styles.msgRowUser : styles.msgRowAi]}>
                <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                  <Text style={[styles.bubbleText, m.role === 'user' ? styles.userBubbleText : styles.aiBubbleText]}>
                    {m.text}
                  </Text>
                </View>
              </View>

              {/* Action card */}
              {m.actionType && !m.actionDone && (
                <ActionCard
                  msg={m}
                  vendorId={vendorId}
                  onConfirm={async result => {
                    // Mark action done
                    setMessages(prev => prev.map(msg =>
                      msg.id === m.id ? { ...msg, actionDone: true } : msg
                    ));
                    // Add result message
                    setMessages(prev => [...prev, {
                      id: Date.now().toString(),
                      role: 'ai',
                      text: result,
                    }]);
                    // Refresh context
                    await refreshContext(vendorId);
                    // Chain next action if any
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
                    setMessages(prev => prev.map(msg =>
                      msg.id === m.id ? { ...msg, actionDone: true } : msg
                    ));
                  }}
                />
              )}
            </View>
          ))}

          {/* Typing indicator */}
          {loading && (
            <View style={styles.msgRowAi}>
              <View style={styles.typingDots}>
                {[0, 1, 2].map(i => (
                  <View key={i} style={styles.typingDot} />
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Suggestion chips */}
        {showChips && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsContent}
          >
            {chips.map((chip, i) => (
              <TouchableOpacity
                key={i}
                style={styles.chip}
                activeOpacity={0.8}
                onPress={() => send(chip)}
              >
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Tell me what you need..."
            placeholderTextColor="#B8B4AE"
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
            <Text style={[styles.sendIcon, { color: (input.trim() && !loading) ? INK : '#B8B4AE' }]}>↑</Text>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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

  // Just Do It toggle
  justDoItToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  justDoItLabel: {
    fontFamily: DM300,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  toggleTrack: {
    width: 32,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    position: 'relative',
  },
  toggleThumb: {
    position: 'absolute',
    top: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Messages
  messageArea: {
    flex: 1,
  },
  messageContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },

  // Empty state
  emptyState: {
    paddingTop: 24,
    marginBottom: 8,
  },
  emptyGreeting: {
    fontFamily: CG300,
    fontStyle: 'italic',
    fontSize: 22,
    color: '#2A2420',
    lineHeight: 29,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: DM300,
    fontSize: 13,
    color: MUTED,
    lineHeight: 20,
  },

  // Message rows
  msgRow: {
    marginBottom: 8,
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
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  userBubble: {
    backgroundColor: GOLD,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 21.7,
  },
  userBubbleText: {
    fontFamily: DM300,
    color: INK,
  },
  aiBubbleText: {
    fontFamily: DM300,
    color: DARK,
  },

  // Typing dots
  typingDots: {
    flexDirection: 'row',
    gap: 5,
    padding: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
    opacity: 0.7,
  },

  // Action card
  actionCard: {
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    marginTop: 2,
    marginHorizontal: 2,
  },
  actionCardLabel: {
    fontFamily: DM300,
    fontSize: 8,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: GOLD,
    marginBottom: 8,
  },
  actionCardPreview: {
    fontFamily: DM300,
    fontSize: 14,
    color: DARK,
    marginBottom: 14,
    lineHeight: 21,
  },
  actionCardButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionConfirmBtn: {
    flex: 1,
    height: 42,
    backgroundColor: GOLD,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionConfirmBtnBusy: {
    backgroundColor: 'rgba(201,168,76,0.5)',
  },
  actionConfirmText: {
    fontFamily: DM400,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: INK,
  },
  actionCancelBtn: {
    height: 42,
    paddingHorizontal: 18,
    borderWidth: 0.5,
    borderColor: '#D4D0CA',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCancelText: {
    fontFamily: DM300,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: MUTED,
  },

  // Suggestion chips
  chipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chipsContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    height: 34,
    paddingHorizontal: 12,
    backgroundColor: CARD,
    borderWidth: 0.5,
    borderColor: 'rgba(201,168,76,0.4)',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: DM300,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: GOLD,
    flexShrink: 0,
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
  textInput: {
    flex: 1,
    height: 46,
    backgroundColor: CARD,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 100,
    paddingHorizontal: 18,
    fontFamily: DM300,
    fontSize: 14,
    color: DARK,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnActive: {
    backgroundColor: GOLD,
  },
  sendBtnInactive: {
    backgroundColor: '#E8E5DF',
  },
  sendIcon: {
    fontSize: 16,
    fontFamily: DM400,
  },
});
