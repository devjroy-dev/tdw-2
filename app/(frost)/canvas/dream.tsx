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
 *        tool: 'money'   → /journey/receipts
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
import { Send } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import FrostCanvasShell from '../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../components/frost/FrostedSurface';
import FrostConfirmCard from '../../../components/frost/FrostConfirmCard';
import {
  AILine, PersonAction, InlineEvent,
} from '../../../components/frost/FrostDreamMessages';
import DreamYesNo from '../../../components/frost/DreamYesNo';
import DreamSummaryCard from '../../../components/frost/DreamSummaryCard';
import DreamSuggestionsCarousel from '../../../components/frost/DreamSuggestionsCarousel';
import {
  FrostColors, FrostFonts, FrostSpace, FrostRadius, FrostCopy,
} from '../../../constants/frost';
import {
  brideChat, brideConfirm, fetchCircleActivity,
  BrideFollowup, CircleActivityItem, SurpriseSuggestion, ToolAnchor,
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
  | { kind: 'confirm'; id: string; preview: any };

const POLL_INTERVAL = 30_000;

// ─── Anchor → Journey route map ──────────────────────────────────────────────
function anchorToRoute(anchor: ToolAnchor): string | null {
  switch (anchor.tool) {
    case 'vendors': return '/(frost)/canvas/journey/vendors';
    case 'money':   return '/(frost)/canvas/journey/receipts';
    case 'tasks':   return '/(frost)/canvas/journey/reminders';
    default:        return null;
  }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CanvasDream() {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
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

  // Initial seed
  useEffect(() => {
    if (seededRef.current) return;
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
  }, [append]);

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

    try {
      const res = await brideChat(trimmed, historyRef.current.slice(0, -1));
      const replyText = res.reply || 'Hmm, let me think.';

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

  const handleFollowupResolved = (replyText: string) => {
    if (!replyText) return;
    append({
      kind: 'ai',
      id: 'ai_fup_' + Date.now(),
      text: replyText,
      ts: formatTime(),
    });
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
      bottomBar={
        <FrostedSurface mode="composer" radius={0} style={{ borderRadius: 0 }}>
          <View style={styles.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={FrostCopy.dreamCanvas.inputPlaceholder}
              placeholderTextColor={FrostColors.muted}
              style={styles.input}
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
                pressed && { opacity: 0.85 },
                sending && { opacity: 0.5 },
              ]}
              disabled={sending}
            >
              <Send size={18} color={FrostColors.white} strokeWidth={1.7} />
            </Pressable>
          </View>
        </FrostedSurface>
      }
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                if (m.anchor) {
                  return (
                    <Pressable
                      key={m.id}
                      onLongPress={() => handleAnchorPress(m.anchor!)}
                      delayLongPress={350}
                    >
                      <AILine text={m.text} timestamp={m.ts} />
                    </Pressable>
                  );
                }
                return <AILine key={m.id} text={m.text} timestamp={m.ts} />;
              case 'user':
                return <UserLine key={m.id} text={m.text} ts={m.ts} />;
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
            }
          })}
        </ScrollView>
      </KeyboardAvoidingView>
    </FrostCanvasShell>
  );
}

// ─── User bubble ─────────────────────────────────────────────────────────────

function UserLine({ text, ts }: { text: string; ts: string }) {
  return (
    <View style={styles.userRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{text}</Text>
        <Text style={styles.userTsText}>{ts}</Text>
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
    backgroundColor: 'rgba(255,253,248,0.55)',
    borderRadius: FrostRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(168,146,75,0.25)',
    paddingHorizontal: FrostSpace.l,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: 10,
    fontFamily: FrostFonts.body,
    fontSize: 15,
    color: FrostColors.ink,
    lineHeight: 22,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: FrostColors.ink,
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
    backgroundColor: FrostColors.ink,
    borderRadius: FrostRadius.box,
    paddingVertical: FrostSpace.s + 2,
    paddingHorizontal: FrostSpace.l,
  },
  userText: {
    fontFamily: FrostFonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: FrostColors.white,
  },
  userTsText: {
    fontFamily: FrostFonts.label,
    fontSize: 9,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'right',
    marginTop: 4,
  },

  confirmWrap: {
    paddingHorizontal: FrostSpace.l,
    paddingVertical: FrostSpace.s,
  },
});
