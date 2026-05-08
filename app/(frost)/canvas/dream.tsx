/**
 * Frost · Canvas · Dream (v3 — fully wired).
 *
 * The bride's conversational surface. Real bride-chat backend wired:
 *   1. Composer POSTs to /api/v2/dreamai/bride-chat
 *   2. Response renders as: AI reply line → DreamSummaryCard (if composite) →
 *      DreamYesNo bubbles for each followup
 *   3. Circle activity (messages + co-planner joins) polled every 30s and
 *      merged into the stream chronologically
 *   4. Auto-scrolls to the latest message
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Send } from 'lucide-react-native';
import FrostCanvasShell from '../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../components/frost/FrostedSurface';
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
  brideChat, fetchCircleActivity,
  BrideFollowup, CircleActivityItem, SurpriseSuggestion,
} from '../../../services/frostApi';

// ─── Stream message types ────────────────────────────────────────────────────

type StreamMessage =
  | { kind: 'ai'; id: string; text: string; ts: string }
  | { kind: 'user'; id: string; text: string; ts: string }
  | { kind: 'person'; id: string; name: string; action?: string; text?: string; ts: string }
  | { kind: 'event'; id: string; text: string }
  | { kind: 'summary'; id: string; lines: string[] }
  | { kind: 'followup'; id: string; prompt: BrideFollowup; context: Record<string, any> }
  | { kind: 'suggestions'; id: string; suggestions: SurpriseSuggestion[]; tasteSummary?: string };

const POLL_INTERVAL = 30_000;

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

      append({
        kind: 'ai',
        id: 'ai_' + Date.now(),
        text: replyText,
        ts: formatTime(),
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
});
