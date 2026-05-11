/**
 * Frost · Journey · Messages (v3 — wired)
 *
 * Vendor enquiry threads. Each row = one vendor + last-message preview +
 * unread count if any. Tap a row to view + reply (inline thread view).
 *
 * Read + reply only. No new-thread creation from here — that happens via
 * Discover when the bride sends an enquiry to a new vendor.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView, View, Text, Pressable, StyleSheet, RefreshControl,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Send } from 'lucide-react-native';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts,
} from '../../../../constants/frost';
import { MUSE_LOOKS } from '../../../../constants/museTokens';
import { useMuseLook } from '../../../../hooks/useMuseLook';
import {
  fetchMyEnquiries, fetchEnquiryThread, sendEnquiryMessage,
  EnquiryThread, EnquiryMessage,
} from '../../../../services/frostApi';

export default function JourneyMessages() {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  const [threads, setThreads] = useState<EnquiryThread[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [openThread, setOpenThread] = useState<EnquiryThread | null>(null);

  const load = useCallback(async () => {
    setError(false);
    const r = await fetchMyEnquiries();
    if (r === null) { setError(true); setThreads([]); }
    else setThreads(r);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const all = threads ?? [];
  const isEmpty = !loading && !error && all.length === 0;

  if (openThread) {
    return <ThreadView thread={openThread} onBack={() => { setOpenThread(null); load(); }} />;
  }

  return (
    <FrostCanvasShell eyebrow="JOURNEY · MESSAGES" mode="frost">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={FrostColors.goldMuted} />
        }
      >
        <Text style={styles.heading}>What's been said.</Text>

        {loading ? (
          <View style={styles.stateWrap}><Text style={styles.loadingDots}>…</Text></View>
        ) : error ? (
          <Text style={styles.errorText}>I couldn't reach the page. Pull down to try again.</Text>
        ) : isEmpty ? (
          <Text style={styles.emptyText}>No conversations yet.</Text>
        ) : (
          <View style={styles.list}>
            {all.map(t => (
              <ThreadRow key={t.id} thread={t} onPress={() => setOpenThread(t)} />
            ))}
          </View>
        )}
      </ScrollView>
    </FrostCanvasShell>
  );
}

// ─── Thread row ─────────────────────────────────────────────────────────────

function ThreadRow({ thread, onPress }: { thread: EnquiryThread; onPress: () => void }) {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  const name = thread.vendor?.name || 'Vendor';
  const category = thread.vendor?.category || '';
  const preview = thread.last_message_preview || '';
  const unread = thread.couple_unread_count || 0;
  const when = formatRelativeTime(thread.last_message_at);

  return (
    <FrostedSurface
      mode="button"
      onPress={onPress}
      radius={12}
      style={styles.rowCard}
    >
      <View style={styles.row}>
        <View style={[styles.avatar, { borderColor: tokens.hairline, backgroundColor: look === 'E1' ? 'rgba(255,253,248,0.06)' : 'rgba(168,146,75,0.10)' }]}>
          <Text style={[styles.avatarText, { color: tokens.soft }]}>{name[0]?.toUpperCase() || '·'}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.rowTop}>
            <Text style={[styles.rowName, { color: tokens.ink }]} numberOfLines={1}>{name}</Text>
            {when ? <Text style={[styles.rowWhen, { color: tokens.soft }]}>{when}</Text> : null}
          </View>
          {preview ? (
            <Text style={[styles.rowPreview, { color: tokens.soft }, unread > 0 && styles.rowPreviewUnread]} numberOfLines={1}>
              {preview}
            </Text>
          ) : category ? (
            <Text style={[styles.rowPreview, { color: tokens.soft }]} numberOfLines={1}>{category}</Text>
          ) : null}
        </View>
        {unread > 0 ? (
          <View style={[styles.unreadDot, { backgroundColor: tokens.brass }]} />
        ) : null}
      </View>
    </FrostedSurface>
  );
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return diffMin + 'm';
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return diffHr + 'h';
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return diffDay + 'd';
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

// ─── Thread detail ──────────────────────────────────────────────────────────

function ThreadView({ thread, onBack }: { thread: EnquiryThread; onBack: () => void }) {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  const [messages, setMessages] = useState<EnquiryMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [composing, setComposing] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    const r = await fetchEnquiryThread(thread.id);
    if (r === null) { setError(true); setMessages([]); }
    else setMessages(r.messages || []);
    setLoading(false);
  }, [thread.id]);

  useEffect(() => { load(); }, [load]);

  const send = useCallback(async () => {
    const content = composing.trim();
    if (!content || sending) return;
    setSending(true);
    const ok = await sendEnquiryMessage(thread.id, content);
    if (ok) {
      setComposing('');
      load();
    }
    setSending(false);
  }, [composing, sending, thread.id, load]);

  return (
    <FrostCanvasShell eyebrow="JOURNEY · MESSAGES" mode="frost">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.threadScroll}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>\u2190 BACK</Text>
          </Pressable>
          <Text style={styles.heading}>{thread.vendor?.name || 'Vendor'}</Text>
          {thread.vendor?.category ? (
            <Text style={styles.threadSub}>{thread.vendor.category}</Text>
          ) : null}

          {loading ? (
            <View style={styles.stateWrap}><Text style={styles.loadingDots}>…</Text></View>
          ) : error ? (
            <Text style={styles.errorText}>I couldn't load this conversation.</Text>
          ) : messages.length === 0 ? (
            <Text style={styles.emptyText}>No messages yet.</Text>
          ) : (
            <View style={styles.messageList}>
              {messages.map(m => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.composer, { backgroundColor: look === 'E1' ? 'rgba(255,253,248,0.04)' : 'rgba(236,233,228,0.6)' }]}>
          <TextInput
            style={[styles.composerInput, { backgroundColor: look === 'E1' ? 'rgba(255,253,248,0.06)' : 'rgba(255,253,248,0.4)', color: tokens.ink }]}
            value={composing}
            onChangeText={setComposing}
            placeholder="Reply…"
            placeholderTextColor={tokens.soft}
            keyboardAppearance={look === 'E1' ? 'dark' : 'light'}
            multiline
          />
          <Pressable
            onPress={send}
            disabled={!composing.trim() || sending}
            style={({ pressed }) => [
              styles.sendBtn,
              (!composing.trim() || sending) && styles.sendBtnDisabled,
              pressed && styles.sendBtnPressed,
            ]}
          >
            <Send size={16} color={FrostColors.white} strokeWidth={1.6} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </FrostCanvasShell>
  );
}

function MessageBubble({ message }: { message: EnquiryMessage }) {
  const look = useMuseLook();
  const fromMe = message.from_role === 'couple';
  return (
    <View style={[styles.bubbleRow, fromMe ? styles.bubbleRight : styles.bubbleLeft]}>
      <View style={[
        styles.bubble,
        fromMe
          ? styles.bubbleMe
          : [
              styles.bubbleThem,
              { backgroundColor: look === 'E1' ? 'rgba(245,240,232,0.12)' : 'rgba(236,233,228,0.7)' },
            ],
      ]}>
        <Text style={[styles.bubbleText, fromMe && styles.bubbleTextMe]}>{message.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: FrostSpace.xxl,
    paddingTop: FrostSpace.xl,
    paddingBottom: FrostSpace.huge,
  },
  heading: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 26, lineHeight: 30,
    color: FrostColors.ink,
    letterSpacing: 0.3,
  },
  list: { marginTop: FrostSpace.l },

  rowCard: { marginBottom: FrostSpace.s },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FrostSpace.m,
    paddingHorizontal: FrostSpace.l,
    gap: FrostSpace.m,
  },
  rowPressed: { opacity: 0.7 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: FrostSpace.s,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.hairline,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FrostFonts.label,
    fontSize: 12,
    color: FrostColors.soft,
  },
  rowName: {
    ...FrostType.bodyLarge,
    color: FrostColors.ink,
    flex: 1,
  },
  rowWhen: {
    ...FrostType.eyebrowSmall,
    color: FrostColors.soft,
    letterSpacing: 1,
  },
  rowPreview: {
    ...FrostType.bodySmall,
    color: FrostColors.soft,
    marginTop: 2,
  },
  rowPreviewUnread: {
    color: FrostColors.ink,
    fontFamily: FrostFonts.bodyMedium,
  },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: FrostColors.goldTrue,
  },

  // Thread view
  threadScroll: {
    paddingHorizontal: FrostSpace.xxl,
    paddingTop: FrostSpace.xl,
    paddingBottom: FrostSpace.huge,
  },
  backBtn: { marginBottom: FrostSpace.l },
  backText: {
    ...FrostType.eyebrowSmall,
    color: FrostColors.soft,
    letterSpacing: 1.6,
  },
  threadSub: {
    ...FrostType.bodySmall,
    color: FrostColors.soft,
    marginTop: 2,
    marginBottom: FrostSpace.xl,
  },
  messageList: { gap: FrostSpace.s, marginTop: FrostSpace.l },
  bubbleRow: { flexDirection: 'row' },
  bubbleLeft: { justifyContent: 'flex-start' },
  bubbleRight: { justifyContent: 'flex-end' },
  bubble: {
    paddingHorizontal: FrostSpace.l,
    paddingVertical: FrostSpace.m,
    borderRadius: 16,
    maxWidth: '78%',
  },
  bubbleMe: {
    backgroundColor: FrostColors.ink,
  },
  bubbleThem: {
    // backgroundColor applied inline per mode (look === 'E1' ? cream@0.12 : cream@0.7)
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.hairline,
  },
  bubbleText: {
    ...FrostType.bodyMedium,
    color: FrostColors.ink,
  },
  bubbleTextMe: { color: FrostColors.white },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: FrostSpace.s,
    paddingHorizontal: FrostSpace.l,
    paddingVertical: FrostSpace.m,
    paddingBottom: FrostSpace.l,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: FrostColors.hairline,
    backgroundColor: 'rgba(236,233,228,0.6)', // overridden inline per mode
  },
  composerInput: {
    flex: 1,
    maxHeight: 100,
    minHeight: 38,
    paddingHorizontal: FrostSpace.m,
    paddingVertical: 8,
    fontFamily: FrostFonts.body,
    fontSize: 15,
    color: FrostColors.ink,
    backgroundColor: 'rgba(255,253,248,0.4)', // overridden inline per mode
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.hairline,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: FrostColors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnPressed: { opacity: 0.85 },
  sendBtnDisabled: { opacity: 0.4 },

  stateWrap: { paddingTop: 80, alignItems: 'center' },
  loadingDots: {
    fontFamily: FrostFonts.display,
    fontSize: 36,
    color: FrostColors.goldMuted,
    letterSpacing: 6,
  },
  emptyText: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 18, lineHeight: 24,
    color: FrostColors.soft,
    textAlign: 'center',
    paddingTop: 80,
  },
  errorText: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 16, lineHeight: 22,
    color: FrostColors.soft,
    textAlign: 'center',
    paddingTop: 80,
  },
});
