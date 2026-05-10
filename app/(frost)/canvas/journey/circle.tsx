/**
 * Frost · Journey · Circle (ZIP 9)
 *
 * Full-bleed Circle page with three vertical zones:
 *   1. Timeline — days to wedding + next event + recent state changes
 *   2. Activity — chronological feed of bride + Circle actions
 *   3. Threads — group threads pinned top, DMs sorted by recent
 *
 * Tapping a thread opens a message sheet without navigating away.
 * Polling: feed + threads refresh every 30s while screen is focused.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TextInput,
  Pressable, Modal, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Users, ChevronLeft, Plus, X, Send } from 'lucide-react-native';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts, FrostRadius,
} from '../../../../constants/frost';
import { MUSE_LOOKS } from '../../../../constants/museTokens';
import { useMuseLook } from '../../../../hooks/useMuseLook';
import {
  fetchCircleFeed, fetchCircleThreads, fetchCircleThreadMessages,
  sendCircleMessage, CircleActivityEvent, CircleThread, CircleMessage,
  getCoupleSession,
} from '../../../../services/frostApi';

// ─── Activity event formatter ─────────────────────────────────────────────────

function formatActivityLine(e: CircleActivityEvent, bridgeName: string): string {
  const actor = e.actor_role === 'bride' ? 'You' : (e.payload?.actor_name || 'Someone');
  const p = e.payload || {};
  switch (e.event_type) {
    case 'vendor_booked':        return `${actor} booked ${p.vendor_name || 'a vendor'}`;
    case 'vendor_updated':       return `${actor} updated ${p.vendor_name || 'a vendor'}`;
    case 'payment_logged':       return `${actor} logged a payment${p.vendor_name ? ` to ${p.vendor_name}` : ''}`;
    case 'expense_added':        return `${actor} added an expense`;
    case 'task_completed':       return `${actor} completed: ${p.task_text || 'a task'}`;
    case 'task_created':         return `${actor} added a reminder`;
    case 'guest_added':          return `${actor} added ${p.count ? `${p.count} guests` : 'a guest'}`;
    case 'muse_saved':           return `${actor} saved to Muse`;
    case 'circle_message_sent':  return `${actor} sent a message`;
    case 'circle_broadcast_sent':
      if (p.target === 'group') return `${actor} posted to ${p.group_name || 'a group'}`;
      return `${actor} messaged ${p.recipient_count || 'your'} Circle`;
    case 'circle_invite_sent':   return `${actor} invited ${p.invitee_name || 'someone'} to Circle`;
    case 'circle_invite_accepted': return `${p.member_name || 'Someone'} joined your Circle`;
    case 'circle_group_created': return `${actor} created group: ${p.group_name || ''}`;
    default:                     return `${actor} made a change`;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function JourneyCircle() {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  const [feed, setFeed]       = useState<CircleActivityEvent[]>([]);
  const [threads, setThreads] = useState<CircleThread[]>([]);
  const [loading, setLoading] = useState(true);

  // Thread sheet state
  const [openThread, setOpenThread]   = useState<CircleThread | null>(null);
  const [messages, setMessages]       = useState<CircleMessage[]>([]);
  const [composing, setComposing]     = useState('');
  const [sending, setSending]         = useState(false);
  const [bridgeName, setBridgeName]   = useState('You');
  const flatRef = useRef<FlatList>(null);

  // Load bride name once
  const loadBrideName = useCallback(async () => {
    const s = await getCoupleSession();
    if (s?.name) setBridgeName(s.name);
  }, []);

  const loadData = useCallback(async () => {
    const [f, t] = await Promise.all([fetchCircleFeed(30), fetchCircleThreads()]);
    setFeed(f);
    setThreads(t);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    loadBrideName();
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData, loadBrideName]));

  // Open thread sheet
  const openThreadSheet = useCallback(async (thread: CircleThread) => {
    setOpenThread(thread);
    const msgs = await fetchCircleThreadMessages(thread.thread_id);
    setMessages(msgs);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
  }, []);

  const handleSend = useCallback(async () => {
    if (!composing.trim() || !openThread || sending) return;
    setSending(true);
    const body = composing.trim();
    setComposing('');
    const ok = await sendCircleMessage(openThread.thread_id, body);
    if (ok) {
      const updated = await fetchCircleThreadMessages(openThread.thread_id);
      setMessages(updated);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      await loadData();
    }
    setSending(false);
  }, [composing, openThread, sending, loadData]);

  // ── Render ──

  const groupThreads = threads.filter(t => t.kind === 'group');
  const dmThreads    = threads.filter(t => t.kind === 'dm');

  return (
    <FrostCanvasShell eyebrow="JOURNEY · CIRCLE" mode="frost">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── ZONE 1: Timeline ─────────────────────────────────────────── */}
        <View style={styles.zone}>
          <Text style={styles.zoneLabel}>Timeline</Text>
          <FrostedSurface mode="panel" radius={FrostRadius.box} style={styles.timelineCard}>
            <View style={styles.timelineInner}>
              <Text style={[styles.timelineTitle, { color: tokens.ink }]}>Your Circle is live.</Text>
              <Text style={[styles.timelineSub, { color: tokens.soft }]}>
                Invite family and planners to join your wedding team.
              </Text>
            </View>
          </FrostedSurface>
        </View>

        <View style={styles.zoneDivider} />

        {/* ── ZONE 2: Activity feed ─────────────────────────────────────── */}
        <View style={styles.zone}>
          <Text style={styles.zoneLabel}>Activity</Text>
          {loading ? (
            <Text style={[styles.emptyHint, { color: tokens.soft }]}>Loading…</Text>
          ) : feed.length === 0 ? (
            <Text style={[styles.emptyHint, { color: tokens.soft }]}>Activity will appear here as things happen.</Text>
          ) : (
            feed.map((e) => (
              <View key={e.id} style={styles.feedRow}>
                <View style={styles.feedDot} />
                <View style={styles.feedBody}>
                  <Text style={[styles.feedLine, { color: tokens.soft }]}>{formatActivityLine(e, bridgeName)}</Text>
                  <Text style={styles.feedTime}>{timeAgo(e.created_at)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.zoneDivider} />

        {/* ── ZONE 3: Threads ───────────────────────────────────────────── */}
        <View style={styles.zone}>
          <View style={styles.zoneHeader}>
            <Text style={styles.zoneLabel}>Threads</Text>
            <Pressable onPress={() => router.push('/(frost)/canvas/journey/circle/invite' as any)} style={styles.inviteBtn}>
              <Plus size={14} color={FrostColors.goldMuted} strokeWidth={1.5} />
              <Text style={styles.inviteBtnText}>Invite</Text>
            </Pressable>
          </View>

          {threads.length === 0 && !loading ? (
            <Text style={[styles.emptyHint, { color: tokens.soft }]}>
              No Circle members yet. Tap Invite to add your first person.
            </Text>
          ) : null}

          {/* Group threads pinned at top */}
          {groupThreads.map((t) => (
            <ThreadRow key={t.thread_id} thread={t} onPress={() => openThreadSheet(t)} pinned inkColor={tokens.ink} softColor={tokens.soft} />
          ))}

          {/* Individual DMs */}
          {dmThreads.map((t) => (
            <ThreadRow key={t.thread_id} thread={t} onPress={() => openThreadSheet(t)} inkColor={tokens.ink} softColor={tokens.soft} />
          ))}
        </View>

      </ScrollView>

      {/* ── Thread sheet ──────────────────────────────────────────────── */}
      <Modal
        visible={!!openThread}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpenThread(null)}
      >
        <KeyboardAvoidingView
          style={[styles.sheetOuter, { backgroundColor: tokens.pagePaper }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Sheet header */}
          <View style={styles.sheetHeader}>
            <Pressable onPress={() => setOpenThread(null)} style={styles.sheetClose}>
              <X size={20} color={FrostColors.muted} strokeWidth={1.5} />
            </Pressable>
            <View style={styles.sheetTitleWrap}>
              <Text style={[styles.sheetTitle, { color: tokens.ink }]}>{openThread?.label}</Text>
              {openThread?.role ? (
                <Text style={styles.sheetRole}>{openThread.role}</Text>
              ) : null}
            </View>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={
              <Text style={[styles.emptyHint, { color: tokens.soft }]}>No messages yet. Say something.</Text>
            }
            renderItem={({ item: m }) => {
              const isMe = m.sender_role === 'bride';
              return (
                <View style={[styles.bubble, isMe ? styles.bubbleMe : [styles.bubbleThem, { backgroundColor: look === 'E1' ? 'rgba(255,253,248,0.08)' : 'rgba(255,253,248,0.80)' }]]}>
                  {!isMe && (
                    <Text style={styles.bubbleSender}>{m.sender_name}</Text>
                  )}
                  <Text style={[styles.bubbleText, { color: tokens.ink }, isMe && styles.bubbleTextMe]}>
                    {m.content}
                  </Text>
                  <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                    {timeAgo(m.created_at)}
                  </Text>
                </View>
              );
            }}
          />

          {/* Composer */}
          <FrostedSurface mode="composer" style={styles.composer}>
            <View style={styles.composerInner}>
              <TextInput
                style={[styles.composerInput, { color: tokens.ink }]}
                value={composing}
                onChangeText={setComposing}
                placeholder="Message…"
                placeholderTextColor={FrostColors.muted}
                multiline
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              <Pressable onPress={handleSend} disabled={!composing.trim() || sending} style={styles.sendBtn}>
                <Send size={18} color={composing.trim() ? FrostColors.goldTrue : FrostColors.muted} strokeWidth={1.5} />
              </Pressable>
            </View>
          </FrostedSurface>
        </KeyboardAvoidingView>
      </Modal>

    </FrostCanvasShell>
  );
}

// ─── ThreadRow ────────────────────────────────────────────────────────────────

function ThreadRow({ thread, onPress, pinned, inkColor, softColor }: { thread: CircleThread; onPress: () => void; pinned?: boolean; inkColor: string; softColor: string }) {
  const preview = thread.last_message?.content || (pinned ? 'Group thread' : 'No messages yet');
  const time    = thread.last_active ? timeAgo(thread.last_active) : '';

  return (
    <FrostedSurface mode="button" onPress={onPress} radius={FrostRadius.md} style={styles.threadTile}>
      <View style={styles.threadInner}>
        <View style={styles.threadAvatar}>
          <Users size={16} color={FrostColors.goldMuted} strokeWidth={1.5} />
        </View>
        <View style={styles.threadBody}>
          <View style={styles.threadTopRow}>
            <Text style={[styles.threadLabel, { color: inkColor }]}>{thread.label}</Text>
            {time ? <Text style={styles.threadTime}>{time}</Text> : null}
          </View>
          <Text style={[styles.threadPreview, { color: softColor }]} numberOfLines={1}>{preview}</Text>
        </View>
      </View>
    </FrostedSurface>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll:        { paddingTop: FrostSpace.xl, paddingBottom: FrostSpace.huge },
  zone:          { paddingHorizontal: FrostSpace.xxl },
  zoneDivider:   { height: StyleSheet.hairlineWidth, backgroundColor: FrostColors.hairline, marginHorizontal: FrostSpace.xxl, marginVertical: FrostSpace.xl, opacity: 0.4 },
  zoneLabel:     { fontFamily: FrostFonts.label, fontSize: 9, fontWeight: '300', letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: FrostSpace.m, color: FrostColors.soft },
  zoneHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: FrostSpace.m },

  // Timeline
  timelineCard:  { marginBottom: FrostSpace.s },
  timelineInner: { padding: FrostSpace.xl },
  timelineTitle: { fontFamily: FrostFonts.display, fontSize: 22, color: '#1A1815', fontStyle: 'italic' },
  timelineSub:   { ...FrostType.bodySmall, color: '#3A3733', marginTop: FrostSpace.xs },

  // Feed
  feedRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: FrostSpace.m, gap: FrostSpace.m },
  feedDot:     { width: 5, height: 5, borderRadius: 3, backgroundColor: FrostColors.goldMuted, marginTop: 6 },
  feedBody:    { flex: 1 },
  feedLine:    { ...FrostType.bodySmall, color: '#3A3733' },
  feedTime:    { ...FrostType.eyebrowSmall, fontSize: 9, marginTop: 2 },
  emptyHint:   { ...FrostType.bodySmall, color: '#5A5650', fontStyle: 'italic', marginBottom: FrostSpace.m },

  // Invite button
  inviteBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: FrostSpace.m, paddingVertical: 5, borderRadius: FrostRadius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: FrostColors.buttonFrostBorder },
  inviteBtnText: { ...FrostType.eyebrowSmall, fontSize: 10, color: FrostColors.goldMuted },

  // Thread rows
  threadTile:    { marginBottom: FrostSpace.xs },
  threadInner:   { flexDirection: 'row', alignItems: 'center', paddingVertical: FrostSpace.m, paddingHorizontal: FrostSpace.l, gap: FrostSpace.m },
  threadAvatar:  { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(168,146,75,0.10)', alignItems: 'center', justifyContent: 'center' },
  threadBody:    { flex: 1 },
  threadTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  threadLabel:   { fontFamily: FrostFonts.displayMedium, fontSize: 15, color: '#1A1815' },
  threadTime:    { ...FrostType.eyebrowSmall, fontSize: 9 },
  threadPreview: { ...FrostType.bodySmall, fontSize: 12, color: '#5A5650', marginTop: 2 },

  // Sheet
  sheetOuter:     { flex: 1 }, // bg applied inline via tokens
  sheetHeader:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: FrostSpace.xl, paddingVertical: FrostSpace.l, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: FrostColors.hairline, gap: FrostSpace.m },
  sheetClose:     { padding: FrostSpace.xs },
  sheetTitleWrap: { flex: 1 },
  sheetTitle:     { fontFamily: FrostFonts.display, fontSize: 20, color: '#1A1815', fontStyle: 'italic' },
  sheetRole:      { ...FrostType.eyebrowSmall, marginTop: 2 },
  messageList:    { padding: FrostSpace.xl, gap: FrostSpace.m },

  // Bubbles
  bubble:         { maxWidth: '80%', marginBottom: FrostSpace.s },
  bubbleMe:       { alignSelf: 'flex-end', backgroundColor: FrostColors.goldTrue, borderRadius: FrostRadius.md, borderBottomRightRadius: 4, padding: FrostSpace.m },
  bubbleThem:     { alignSelf: 'flex-start', backgroundColor: 'rgba(255,253,248,0.80)', borderRadius: FrostRadius.md, borderBottomLeftRadius: 4, padding: FrostSpace.m, borderWidth: StyleSheet.hairlineWidth, borderColor: FrostColors.buttonFrostBorder },
  bubbleSender:   { ...FrostType.eyebrowSmall, fontSize: 9, marginBottom: 3, color: FrostColors.soft },
  bubbleText:     { fontFamily: FrostFonts.bodyMedium, fontSize: 14, color: '#1A1815', lineHeight: 20 },
  bubbleTextMe:   { color: '#FFFFFF' },
  bubbleTime:     { ...FrostType.eyebrowSmall, fontSize: 9, marginTop: 4, color: FrostColors.soft },
  bubbleTimeMe:   { color: 'rgba(255,255,255,0.65)' },

  // Composer
  composer:       {},
  composerInner:  { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: FrostSpace.l, paddingVertical: FrostSpace.m, gap: FrostSpace.m },
  composerInput:  { flex: 1, fontFamily: FrostFonts.bodyMedium, fontSize: 15, color: '#1A1815', maxHeight: 100, paddingVertical: FrostSpace.xs },
  sendBtn:        { paddingBottom: FrostSpace.xs },
});
