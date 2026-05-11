/**
 * Frost · Canvas · Dream (v4 — confirm cards + long-press anchors).
 *
 * Same conversational surface, plus two new behaviours:
 *
 *   1. CONFIRM CARDS — when bride-chat returns confirmPreview (broadcast,
 *      receipt, booking, payment, settle), the response renders a
 *      FrostConfirmCard. The bride taps Send/Lock-in/Settle → frontend
 *      POSTs /api/v2/dreamai/bride-confirm with action_id. Server replays
 *      the destructive logic. Result message renders.
 *
 *   2. LONG-PRESS ANCHORS — every AI message that came from a tool call
 *      with a tool_anchor metadata can be long-pressed to jump to the
 *      relevant Journey sub-page. e.g. long-press "✓ Done. Swati's locked
 *      in." routes to /(frost)/canvas/journey/vendors. Routing map:
 *        tool: 'vendors' → /journey/vendors
 *        tool: 'money'   → /journey/expenses
 *        tool: 'tasks'   → /journey/reminders
 *
 * All previous behaviour preserved: greeting, Circle activity poll, summary
 * cards, follow-up Yes/No bubbles, suggestions carousel, auto-scroll.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Alert } from 'react-native';
import { Send, Paperclip } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FrostCanvasShell from '../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../components/frost/FrostedSurface';
import FrostConfirmCard from '../../../components/frost/FrostConfirmCard';
import FrostContactCard from '../../../components/frost/FrostContactCard';
import FrostClarifyCard from '../../../components/frost/FrostClarifyCard';
import FrostViewPill, { shouldShowViewPill } from '../../../components/frost/FrostViewPill';
import FrostThinkingDots from '../../../components/frost/FrostThinkingDots';
import { uploadImage } from '../../../services/cloudinary';
import {
  AILine, PersonAction, InlineEvent,
} from '../../../components/frost/FrostDreamMessages';
import DreamYesNo from '../../../components/frost/DreamYesNo';
import DreamSummaryCard from '../../../components/frost/DreamSummaryCard';
import DreamSuggestionsCarousel from '../../../components/frost/DreamSuggestionsCarousel';
import {
  FrostColors, FrostFonts, FrostSpace, FrostRadius, FrostCopy,
} from '../../../constants/frost';
import { MUSE_LOOKS } from '../../../constants/museTokens';
import { useMuseLook } from '../../../hooks/useMuseLook';
import {
  brideChat, brideConfirm, fetchCircleActivity,
  BrideFollowup, CircleActivityItem, SurpriseSuggestion, ToolAnchor, ContactAction, ClarifyOption,
} from '../../../services/frostApi';

// ─── Stream message types ────────────────────────────────────────────────────

type StreamMessage =
  | { kind: 'ai'; id: string; text: string; ts: string; anchor?: ToolAnchor }
  | { kind: 'user'; id: string; text: string; ts: string }
  | { kind: 'person'; id: string; name: string; action?: string; text?: string; ts: string }
  | { kind: 'event'; id: string; text: string }
  | { kind: 'summary'; id: string; lines: string[] }
  | { kind: 'followup'; id: string; prompt: BrideFollowup; context: Record<string, any> }
  | { kind: 'suggestions'; id: string; suggestions: SurpriseSuggestion[]; tasteSummary?: string }
  | { kind: 'confirm'; id: string; preview: any }
  | { kind: 'contact'; id: string; action: ContactAction }
  | { kind: 'clarify'; id: string; options: ClarifyOption[] }
  | { kind: 'thinking'; id: string };

const POLL_INTERVAL = 30_000;

// Chat persistence — survives app restarts. Cap at 30 messages to keep growth bounded.
const DREAM_HISTORY_KEY = '@frost.dream_history';
const DREAM_HISTORY_LIMIT = 30;

// ─── Anchor → Journey route map ──────────────────────────────────────────────
function anchorToRoute(anchor: ToolAnchor): string | null {
  switch (anchor.tool) {
    case 'vendors': return '/(frost)/canvas/journey/vendors';
    case 'money':   return '/(frost)/canvas/journey/expenses';
    case 'tasks':   return '/(frost)/canvas/journey/reminders';
    default:        return null;
  }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CanvasDream() {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  // `restored` flips true after the AsyncStorage read resolves (hit or miss).
  // Gates the initial seed (so we don't double-seed over restored history) and
  // gates the writer (so we don't clobber storage with [] before restore lands).
  const [restored, setRestored] = useState(false);
  const seededRef = useRef(false);
  const seenCircleIds = useRef<Set<string>>(new Set());
  const scrollRef = useRef<ScrollView>(null);
  const historyRef = useRef<Array<{ role: 'user' | 'assistant'; text: string }>>([]);

  const formatTime = (d: Date = new Date()) =>
    d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  const append = useCallback((m: StreamMessage | StreamMessage[]) => {
    const arr = Array.isArray(m) ? m : [m];
    setMessages(prev => [...prev, ...arr]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  // PHASE 2: helpers for the thinking-dots transient stream item.
  // The thinking item is appended right before brideChat fires and removed
  // in the finally block — visible for the whole network round trip,
  // disappears whether the call succeeds or errors.
  const thinkingIdRef = useRef<string | null>(null);
  const showThinking = useCallback(() => {
    const id = 'think_' + Date.now();
    thinkingIdRef.current = id;
    setMessages(prev => [...prev, { kind: 'thinking', id }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);
  const clearThinking = useCallback(() => {
    const id = thinkingIdRef.current;
    if (!id) return;
    thinkingIdRef.current = null;
    setMessages(prev => prev.filter(m => !(m.kind === 'thinking' && m.id === id)));
  }, []);

  // Restore persisted history on mount (empty deps — runs once).
  // On success we set seededRef so the seed effect below skips its greeting.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DREAM_HISTORY_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            seededRef.current = true;
          }
        }
      } catch {}
      setRestored(true);
    })();
  }, []);

  // Persist messages whenever they change — capped at the last 30 to bound growth.
  // Gated on `restored` so we don't clobber storage with [] before restore lands.
  useEffect(() => {
    if (!restored) return;
    const snapshot = messages.slice(-DREAM_HISTORY_LIMIT);
    AsyncStorage.setItem(DREAM_HISTORY_KEY, JSON.stringify(snapshot)).catch(() => {});
  }, [messages, restored]);

  // Initial seed — runs after restore resolves; no-ops if history was restored.
  useEffect(() => {
    if (!restored || seededRef.current) return;
    seededRef.current = true;

    const seedAndLoad = async () => {
      const today = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long',
      });
      append({ kind: 'event', id: 'evt_today', text: today });
      append({
        kind: 'ai',
        id: 'ai_greet_' + Date.now(),
        text: 'Hi. Tell me anything.',
        ts: formatTime(),
      });

      try {
        const items = await fetchCircleActivity();
        for (const it of items) {
          if (seenCircleIds.current.has(it.id)) continue;
          seenCircleIds.current.add(it.id);
          append(circleToStream(it));
        }
      } catch {}
    };
    seedAndLoad();
  }, [restored, append]);

  // Poll Circle activity
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const items = await fetchCircleActivity();
        const fresh: StreamMessage[] = [];
        for (const it of items) {
          if (seenCircleIds.current.has(it.id)) continue;
          seenCircleIds.current.add(it.id);
          fresh.push(circleToStream(it));
        }
        if (fresh.length > 0) append(fresh);
      } catch {}
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [append]);

  // Send to bride-chat
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setText('');
    setSending(true);

    append({
      kind: 'user',
      id: 'usr_' + Date.now(),
      text: trimmed,
      ts: formatTime(),
    });

    historyRef.current = historyRef.current.slice(-9);
    historyRef.current.push({ role: 'user', text: trimmed });

    // PHASE 2: thinking dots appear during the network round trip.
    showThinking();

    try {
      const res = await brideChat(trimmed, historyRef.current.slice(0, -1));
      const replyText = res.reply || 'Hmm, let me think.';

      // PHASE 2: clear dots before the AI line lands so the stream order reads
      // user → ai (not user → thinking → ai).
      clearThinking();

      // First anchor in the response (if any) — pinned to the AI line we render
      const firstAnchor: ToolAnchor | undefined =
        res.toolAnchors && res.toolAnchors.length > 0 ? res.toolAnchors[0] : undefined;

      append({
        kind: 'ai',
        id: 'ai_' + Date.now(),
        text: replyText,
        ts: formatTime(),
        anchor: firstAnchor,
      });

      if (res.summaryLines && res.summaryLines.length > 0) {
        append({
          kind: 'summary',
          id: 'sum_' + Date.now(),
          lines: res.summaryLines,
        });
      }

      // ZIP 6: surprise_me responses include suggestions — render carousel inline
      if (res.suggestions && res.suggestions.length > 0) {
        append({
          kind: 'suggestions',
          id: 'sg_' + Date.now(),
          suggestions: res.suggestions,
          tasteSummary: res.tasteSummary,
        });
      }

      // FIX-1+5: render confirm card when backend returned a preview.
      if (res.confirmPreview) {
        append({
          kind: 'confirm',
          id: 'cfm_' + Date.now(),
          preview: res.confirmPreview,
        });
      }

      // PHASE 1.6: render contact card when contact_vendor returned an action.
      // The bride asked "call X" or "message Y to..."; the card lets her pick
      // her channel (phone vs WhatsApp call, WhatsApp vs SMS message).
      if (res.contactAction) {
        append({
          kind: 'contact',
          id: 'ctc_' + Date.now(),
          action: res.contactAction,
        });
      }

      // PHASE 1.7: render clarify pills when bride-chat returned options.
      // The model couldn't disambiguate a multi-match query (e.g. two Swatis);
      // bride taps a pill, which fires send_text back as a user message,
      // and the original tool re-runs with the disambiguator.
      if (res.clarifyOptions && res.clarifyOptions.length > 0) {
        append({
          kind: 'clarify',
          id: 'clr_' + Date.now(),
          options: res.clarifyOptions,
        });
      }

      if (res.followupPrompts && res.followupPrompts.length > 0) {
        res.followupPrompts.forEach((p, idx) => {
          setTimeout(() => {
            append({
              kind: 'followup',
              id: 'fup_' + Date.now() + '_' + idx,
              prompt: p,
              context: extractFollowupContext(trimmed),
            });
          }, 320 * (idx + 1));
        });
      }

      historyRef.current.push({ role: 'assistant', text: replyText });
    } catch {
      // PHASE 2: also clear dots on error path (clearThinking is idempotent
      // if already called in the success path above).
      clearThinking();
      append({
        kind: 'ai',
        id: 'ai_err_' + Date.now(),
        text: 'Something went sideways. Try once more?',
        ts: formatTime(),
      });
    } finally {
      setSending(false);
    }
  };

  // PHASE 2: paperclip → action sheet → camera or library → upload → send URL
  // via handleSend pipe. The vision classifier on the backend (server.js
  // line 14043+) handles the URL routing — receipt → ocr_receipt, inspiration
  // → save_to_muse, vendor screenshot → ask, etc.
  const handleAttach = useCallback(() => {
    if (sending) return;
    Alert.alert('Attach a photo', 'Choose source', [
      { text: 'Take photo',         onPress: () => pickAndUpload('camera')  },
      { text: 'Choose from library', onPress: () => pickAndUpload('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [sending]);

  const pickAndUpload = useCallback(async (source: 'camera' | 'library') => {
    try {
      const perm = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', `Please allow ${source === 'camera' ? 'camera' : 'photo'} access.`);
        return;
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      // Show user line + thinking dots immediately; upload happens in the
      // background. The bride sees activity within ~150ms instead of waiting
      // for the whole upload.
      append({ kind: 'user', id: 'usr_' + Date.now(), text: '📎 Photo', ts: formatTime() });
      showThinking();

      let imageUrl: string;
      try {
        imageUrl = await uploadImage(result.assets[0].uri);
      } catch {
        clearThinking();
        append({
          kind: 'ai',
          id: 'ai_uperr_' + Date.now(),
          text: 'I couldn\'t lift that photo from your phone. Try once more?',
          ts: formatTime(),
        });
        return;
      }

      // Submit the URL through the same bride-chat pipe so the existing
      // routing/classifier infrastructure handles it. We don't need to
      // duplicate handleSend's logic — just call brideChat directly here
      // and reuse the same render branches.
      historyRef.current = historyRef.current.slice(-9);
      historyRef.current.push({ role: 'user', text: imageUrl });
      try {
        const res = await brideChat(imageUrl, historyRef.current.slice(0, -1));
        clearThinking();
        const replyText = res.reply || 'Hmm, let me think.';
        const firstAnchor: ToolAnchor | undefined =
          res.toolAnchors && res.toolAnchors.length > 0 ? res.toolAnchors[0] : undefined;
        append({
          kind: 'ai',
          id: 'ai_img_' + Date.now(),
          text: replyText,
          ts: formatTime(),
          anchor: firstAnchor,
        });
        if (res.summaryLines && res.summaryLines.length > 0) {
          append({ kind: 'summary', id: 'sum_img_' + Date.now(), lines: res.summaryLines });
        }
        if (res.confirmPreview) {
          append({ kind: 'confirm', id: 'cfm_img_' + Date.now(), preview: res.confirmPreview });
        }
        if (res.followupPrompts && res.followupPrompts.length > 0) {
          res.followupPrompts.forEach((p, idx) => {
            setTimeout(() => {
              append({
                kind: 'followup',
                id: 'fup_img_' + Date.now() + '_' + idx,
                prompt: p,
                context: extractFollowupContext(imageUrl),
              });
            }, 320 * (idx + 1));
          });
        }
        historyRef.current.push({ role: 'assistant', text: replyText });
      } catch {
        clearThinking();
        append({
          kind: 'ai',
          id: 'ai_imgerr_' + Date.now(),
          text: 'Something went sideways. Try once more?',
          ts: formatTime(),
        });
      }
    } catch {
      // Outer catch — picker failed unexpectedly
      clearThinking();
    }
  }, [sending, append, showThinking, clearThinking]);

  const handleFollowupResolved = (replyText: string) => {
    if (!replyText) return;
    append({
      kind: 'ai',
      id: 'ai_fup_' + Date.now(),
      text: replyText,
      ts: formatTime(),
    });
  };

  // PHASE 1.7: bride taps a pill in FrostClarifyCard. We send `send_text` to
  // bride-chat as if she had typed it. Mirrors handleSend's logic but takes
  // text as an arg instead of reading from the input field.
  const handleClarifySelect = async (sendText: string) => {
    const trimmed = sendText.trim();
    if (!trimmed || sending) return;

    setSending(true);

    append({
      kind: 'user',
      id: 'usr_clr_' + Date.now(),
      text: trimmed,
      ts: formatTime(),
    });

    historyRef.current = historyRef.current.slice(-9);
    historyRef.current.push({ role: 'user', text: trimmed });

    try {
      const res = await brideChat(trimmed, historyRef.current.slice(0, -1));
      const replyText = res.reply || 'Hmm, let me think.';

      const firstAnchor: ToolAnchor | undefined =
        res.toolAnchors && res.toolAnchors.length > 0 ? res.toolAnchors[0] : undefined;

      append({
        kind: 'ai',
        id: 'ai_clr_' + Date.now(),
        text: replyText,
        ts: formatTime(),
        anchor: firstAnchor,
      });

      if (res.summaryLines && res.summaryLines.length > 0) {
        append({
          kind: 'summary',
          id: 'sum_clr_' + Date.now(),
          lines: res.summaryLines,
        });
      }
      if (res.suggestions && res.suggestions.length > 0) {
        append({
          kind: 'suggestions',
          id: 'sg_clr_' + Date.now(),
          suggestions: res.suggestions,
          tasteSummary: res.tasteSummary,
        });
      }
      if (res.confirmPreview) {
        append({
          kind: 'confirm',
          id: 'cfm_clr_' + Date.now(),
          preview: res.confirmPreview,
        });
      }
      if (res.contactAction) {
        append({
          kind: 'contact',
          id: 'ctc_clr_' + Date.now(),
          action: res.contactAction,
        });
      }
      // Clarify chains (rare — model returned options again because the
      // disambiguator was still ambiguous): render another pill set.
      if (res.clarifyOptions && res.clarifyOptions.length > 0) {
        append({
          kind: 'clarify',
          id: 'clr2_' + Date.now(),
          options: res.clarifyOptions,
        });
      }
      if (res.followupPrompts && res.followupPrompts.length > 0) {
        res.followupPrompts.forEach((p, idx) => {
          setTimeout(() => {
            append({
              kind: 'followup',
              id: 'fup_clr_' + Date.now() + '_' + idx,
              prompt: p,
              context: extractFollowupContext(trimmed),
            });
          }, 320 * (idx + 1));
        });
      }

      historyRef.current.push({ role: 'assistant', text: replyText });
    } catch {
      append({
        kind: 'ai',
        id: 'ai_clr_err_' + Date.now(),
        text: 'Something went sideways. Try once more?',
        ts: formatTime(),
      });
    } finally {
      setSending(false);
    }
  };

  // FIX-5 + BUG C FIX: confirm card → call bride-confirm and render the result.
  //
  // Returns a boolean to FrostConfirmCard's handleConfirm so it knows whether
  // to flip to Done state (true) or stay/revert to idle (false). On failure
  // (action expired, wrong user, server error) we ALSO remove the confirm
  // card from the message stream entirely — Option B: the bride re-asks
  // Dream Ai to do the thing rather than re-tapping a card whose action_id
  // is permanently dead. Action IDs are wiped server-side on first lookup
  // (success OR failure), so a re-tap would 404 again anyway.
  const handleConfirm = useCallback(async (preview: any): Promise<boolean> => {
    if (!preview?.action_id) return false;
    try {
      const result = await brideConfirm(preview.action_id);
      if (result?.success && result?.reply) {
        // ── Happy path: card flips to Done, append confirmation chat line ──
        const anchor: ToolAnchor | undefined = result.vendor_id
          ? { tool: 'vendors', entity_type: 'vendor', entity_id: String(result.vendor_id) }
          : result.expense_id
          ? { tool: 'money', entity_type: 'expense', entity_id: String(result.expense_id) }
          : undefined;
        append({
          kind: 'ai',
          id: 'ai_cfm_' + Date.now(),
          text: result.reply,
          ts: formatTime(),
          anchor,
        });
        if (result.summaryLines && result.summaryLines.length > 0) {
          append({
            kind: 'summary',
            id: 'sum_cfm_' + Date.now(),
            lines: result.summaryLines,
          });
        }
        return true;
      }
      // ── Soft failure: backend returned success:false but with a reply ──
      // (most common: 404 expired action — "That moment passed. Tell me again?")
      // Per Bug C frontend spec (Option B): collapse the confirm card AND
      // append the error reply as a normal AI line below.
      if (result?.reply) {
        // Remove the dead confirm card from the stream. action_id is the
        // unique handle — every confirm card has its own.
        setMessages(prev => prev.filter(
          m => !(m.kind === 'confirm' && m.preview?.action_id === preview.action_id)
        ));
        append({
          kind: 'ai',
          id: 'ai_cfm_err_' + Date.now(),
          text: result.reply,
          ts: formatTime(),
        });
        return false;
      }
      // Unknown shape — fall through to thrown-error path below
      throw new Error('confirm response missing reply');
    } catch {
      // ── Hard failure: network drop, JSON parse error, etc. ──
      setMessages(prev => prev.filter(
        m => !(m.kind === 'confirm' && m.preview?.action_id === preview.action_id)
      ));
      append({
        kind: 'ai',
        id: 'ai_cfm_err_' + Date.now(),
        text: 'Something went sideways. Try once more?',
        ts: formatTime(),
      });
      return false;
    }
  }, [append]);

  // FIX-5: long-press an AI message with an anchor → jump to that Journey page.
  const handleAnchorPress = useCallback((anchor: ToolAnchor) => {
    const route = anchorToRoute(anchor);
    if (!route) return;
    Haptics.selectionAsync?.();
    router.push(route as any);
  }, []);

  return (
    <FrostCanvasShell
      eyebrow={FrostCopy.dreamCanvas.eyebrow}
      mode="frost"
      statusBarStyle={tokens.statusBarStyle === 'light-content' ? 'light' : 'dark'}
      bottomBar={
        <FrostedSurface mode="composer" radius={0} style={{ borderRadius: 0 }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'android' ? 80 : 0}
          >
            <View style={styles.composer}>
              <Pressable
                onPress={handleAttach}
                style={({ pressed }) => [
                  styles.paperclipBtn,
                  pressed && { opacity: 0.55 },
                  sending && { opacity: 0.4 },
                ]}
                disabled={sending}
                hitSlop={8}
              >
                <Paperclip size={18} color={tokens.soft} strokeWidth={1.6} />
              </Pressable>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={FrostCopy.dreamCanvas.inputPlaceholder}
                placeholderTextColor={tokens.soft}
                style={[styles.input, {
                  backgroundColor: look === 'E1' ? 'rgba(255,253,248,0.08)' : 'rgba(255,253,248,0.55)',
                  color: tokens.ink,
                }]}
                selectionColor={tokens.brass}
                keyboardAppearance={look === 'E1' ? 'dark' : 'light'}
                multiline
                editable={!sending}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
                returnKeyType="send"
              />
              <Pressable
                onPress={handleSend}
                style={({ pressed }) => [
                  styles.sendBtn,
                  { backgroundColor: tokens.ink },
                  pressed && { opacity: 0.85 },
                  sending && { opacity: 0.5 },
                ]}
                disabled={sending}
              >
                <Send size={18} color={tokens.pagePaper} strokeWidth={1.7} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </FrostedSurface>
      }
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.streamContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m) => {
          switch (m.kind) {
            case 'ai':
              // FIX-5: wrap AI messages with an anchor in a long-pressable area
              // PATCH B-3b: render a small italic "View" pill below the line when
              // the anchor is a write (entity_type !== 'list'). Tap the pill =
              // same route long-press already goes to. The pill is the visible
              // affordance for the otherwise-invisible long-press behaviour.
              if (m.anchor) {
                return (
                  <View key={m.id}>
                    <Pressable
                      onLongPress={() => handleAnchorPress(m.anchor!)}
                      delayLongPress={350}
                    >
                      <AILine text={m.text} timestamp={m.ts} />
                    </Pressable>
                    {shouldShowViewPill(m.anchor) ? (
                      <View style={styles.viewPillRow}>
                        <FrostViewPill anchor={m.anchor} />
                      </View>
                    ) : null}
                  </View>
                );
              }
              return <AILine key={m.id} text={m.text} timestamp={m.ts} />;
            case 'user':
              return <UserLine key={m.id} text={m.text} ts={m.ts} bubbleBg={tokens.ink} textColor={tokens.pagePaper} tsColor={tokens.soft} />;
            case 'person':
              return (
                <PersonAction
                  key={m.id}
                  name={m.name}
                  action={m.action || ''}
                  text={m.text}
                  timestamp={m.ts}
                />
              );
            case 'event':
              return <InlineEvent key={m.id} text={m.text} />;
            case 'thinking':
              return <FrostThinkingDots key={m.id} />;
            case 'summary':
              return <DreamSummaryCard key={m.id} lines={m.lines} />;
            case 'followup':
              return (
                <DreamYesNo
                  key={m.id}
                  prompt={m.prompt}
                  context={m.context}
                  onResolved={handleFollowupResolved}
                />
              );
            case 'suggestions':
              return (
                <DreamSuggestionsCarousel
                  key={m.id}
                  suggestions={m.suggestions}
                  tasteSummary={m.tasteSummary}
                />
              );
            case 'confirm':
              return (
                <View key={m.id} style={styles.confirmWrap}>
                  <FrostConfirmCard
                    preview={m.preview}
                    onConfirm={() => handleConfirm(m.preview)}
                  />
                </View>
              );
            case 'contact':
              return <FrostContactCard key={m.id} action={m.action} />;
            case 'clarify':
              return (
                <FrostClarifyCard
                  key={m.id}
                  options={m.options}
                  onSelect={handleClarifySelect}
                />
              );
          }
        })}
      </ScrollView>
    </FrostCanvasShell>
  );
}

// ─── User bubble ─────────────────────────────────────────────────────────────

function UserLine({ text, ts, bubbleBg, textColor, tsColor }: { text: string; ts: string; bubbleBg: string; textColor: string; tsColor: string }) {
  return (
    <View style={styles.userRow}>
      <View style={[styles.userBubble, { backgroundColor: bubbleBg }]}>
        <Text style={[styles.userText, { color: textColor }]}>{text}</Text>
        <Text style={[styles.userTsText, { color: tsColor }]}>{ts}</Text>
      </View>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function circleToStream(item: CircleActivityItem): StreamMessage {
  const ts = formatRelativeTime(item.timestamp);
  if (item.type === 'circle_message') {
    return {
      kind: 'person',
      id: item.id,
      name: item.actorName,
      action: 'said',
      text: item.body,
      ts,
    };
  }
  if (item.type === 'co_planner_joined') {
    return {
      kind: 'person',
      id: item.id,
      name: item.actorName,
      action: 'joined your Circle',
      ts,
    };
  }
  return {
    kind: 'event',
    id: item.id,
    text: `${item.actorName} ${item.action || ''}`,
  };
}

function formatRelativeTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function extractFollowupContext(message: string): Record<string, any> {
  const m = message.match(/\b([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})?)\b/);
  return m ? { vendor_name: m[1] } : {};
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // PATCH B-3b: indent the View pill under the AI line, matching the AILine
  // glyph + content padding so the pill sits visually under the message text
  // (not under the ✦ glyph). 32px (avatar size) + 16px (gap) + 32px (paddingHorizontal)
  // ≈ 80px total — but in practice mirroring AILine's row.paddingHorizontal +
  // an extra small inset reads better than aligning to the text exactly.
  viewPillRow: {
    paddingLeft: 80,
    paddingRight: 32,
    marginTop: -4,
    marginBottom: 4,
  },
  streamContent: {
    paddingTop: FrostSpace.l,
    paddingBottom: FrostSpace.xxxl,
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: FrostSpace.xl,
    paddingTop: FrostSpace.m,
    paddingBottom: FrostSpace.m,
    gap: FrostSpace.m,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    // backgroundColor set inline via tokens — see render
    backgroundColor: 'transparent',
    borderRadius: FrostRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(168,146,75,0.25)',
    paddingHorizontal: FrostSpace.l,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: 10,
    fontFamily: FrostFonts.body,
    fontSize: 15,
    // color applied inline via tokens.ink — mode-aware
    lineHeight: 22,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    // bg set inline via tokens — see render
    alignItems: 'center',
    justifyContent: 'center',
  },
  // PHASE 2: paperclip is restrained — no background fill, just an icon.
  // The bride's eye reads it as an affordance rather than a primary action.
  paperclipBtn: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  userRow: {
    paddingHorizontal: FrostSpace.xxl,
    paddingVertical: FrostSpace.s,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  userBubble: {
    maxWidth: '78%',
    // bg set inline via tokens — see UserLine render
    borderRadius: FrostRadius.box,
    paddingVertical: FrostSpace.s + 2,
    paddingHorizontal: FrostSpace.l,
  },
  userText: {
    fontFamily: FrostFonts.body,
    fontSize: 15,
    lineHeight: 22,
    // color applied via textColor prop
  },
  userTsText: {
    fontFamily: FrostFonts.label,
    fontSize: 9,
    letterSpacing: 1.4,
    // color applied via tsColor prop
    textAlign: 'right',
    marginTop: 4,
  },

  confirmWrap: {
    paddingHorizontal: FrostSpace.l,
    paddingVertical: FrostSpace.s,
  },
});
