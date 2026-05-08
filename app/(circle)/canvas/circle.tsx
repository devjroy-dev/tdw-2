/**
 * Circle · Canvas · Circle
 *
 * Circle member's activity feed + thread with bride.
 * Scoped to their own view — bride actions + their own actions.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  ScrollView, View, Text, StyleSheet, Pressable,
  TextInput, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Send } from 'lucide-react-native';
import FrostedSurface from '../../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts, FrostRadius,
} from '../../../constants/frost';
import { RAILWAY_URL } from '../../../constants/tokens';

const API = RAILWAY_URL;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function CircleCanvas() {
  const [session, setSession] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [composing, setComposing] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatRef = useRef<FlatList>(null);

  useFocusEffect(useCallback(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []));

  const load = async () => {
    try {
      const raw = await AsyncStorage.getItem('circle_session');
      if (!raw) return;
      const s = JSON.parse(raw);
      setSession(s);

      const [feedR, threadR] = await Promise.all([
        fetch(`${API}/api/v2/frost/circle/feed/${s.couple_id}?limit=20`),
        fetch(`${API}/api/v2/frost/circle/threads/${s.couple_id}/${encodeURIComponent('dm:' + s.co_planner_id)}/messages`),
      ]);
      const [feedD, threadD] = await Promise.all([feedR.json(), threadR.json()]);
      if (feedD.success) setFeed(feedD.data || []);
      if (threadD.success) setMessages(threadD.data || []);
    } catch {}
    setLoading(false);
  };

  const send = async () => {
    if (!composing.trim() || !session || sending) return;
    setSending(true);
    const body = composing.trim();
    setComposing('');
    try {
      await fetch(`${API}/api/v2/frost/circle/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.couple_id,
          thread_id: 'dm:' + session.co_planner_id,
          body,
          sender_name: session.name || 'Circle Member',
        }),
      });
      await load();
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {}
    setSending(false);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={FrostColors.goldTrue} /></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.outer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={FrostColors.muted} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Circle</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Activity feed */}
        <Text style={styles.sectionLabel}>Activity</Text>
        {feed.length === 0 ? (
          <Text style={styles.emptyHint}>Activity will appear here.</Text>
        ) : (
          feed.slice(0, 10).map(e => (
            <View key={e.id} style={styles.feedRow}>
              <View style={styles.feedDot} />
              <View style={styles.feedBody}>
                <Text style={styles.feedLine}>{e.payload?.member_name || 'Someone'} · {e.event_type.replace(/_/g, ' ')}</Text>
                <Text style={styles.feedTime}>{timeAgo(e.created_at)}</Text>
              </View>
            </View>
          ))
        )}

        <View style={styles.divider} />

        {/* Thread with bride */}
        <Text style={styles.sectionLabel}>Your thread</Text>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.emptyHint}>No messages yet. Say something.</Text>}
          renderItem={({ item: m }) => {
            const isMe = m.sender_role === 'circle_member';
            return (
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                {!isMe && <Text style={styles.bubbleSender}>{m.sender_name}</Text>}
                <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{m.content}</Text>
                <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{timeAgo(m.created_at)}</Text>
              </View>
            );
          }}
        />
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Composer */}
      <FrostedSurface mode="composer" style={styles.composer}>
        <View style={styles.composerInner}>
          <TextInput
            style={styles.composerInput}
            value={composing}
            onChangeText={setComposing}
            placeholder="Message..."
            placeholderTextColor={FrostColors.muted}
            multiline
          />
          <Pressable onPress={send} disabled={!composing.trim() || sending}>
            <Send size={18} color={composing.trim() ? FrostColors.goldTrue : FrostColors.muted} strokeWidth={1.5} />
          </Pressable>
        </View>
      </FrostedSurface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer:         { flex: 1, backgroundColor: '#F4F2EE' },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F2EE' },
  header:        { paddingHorizontal: FrostSpace.xxl, paddingTop: 56, paddingBottom: FrostSpace.l, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: FrostColors.hairline },
  backBtn:       { marginBottom: FrostSpace.xs },
  headerTitle:   { fontFamily: FrostFonts.display, fontSize: 28, fontStyle: 'italic', color: '#1A1815' },
  scroll:        { flex: 1, paddingHorizontal: FrostSpace.xxl },
  sectionLabel:  { ...FrostType.eyebrowSmall, marginTop: FrostSpace.xl, marginBottom: FrostSpace.m, color: '#8C8480' },
  feedRow:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: FrostSpace.m, gap: FrostSpace.m },
  feedDot:       { width: 5, height: 5, borderRadius: 3, backgroundColor: FrostColors.goldMuted, marginTop: 6 },
  feedBody:      { flex: 1 },
  feedLine:      { fontFamily: FrostFonts.bodyMedium, fontSize: 13, color: '#3A3733' },
  feedTime:      { ...FrostType.eyebrowSmall, fontSize: 9, marginTop: 2 },
  emptyHint:     { fontFamily: FrostFonts.body, fontSize: 13, color: FrostColors.muted, fontStyle: 'italic', marginBottom: FrostSpace.m },
  divider:       { height: StyleSheet.hairlineWidth, backgroundColor: FrostColors.hairline, marginVertical: FrostSpace.xl, opacity: 0.5 },
  bubble:        { maxWidth: '80%', marginBottom: FrostSpace.s },
  bubbleMe:      { alignSelf: 'flex-end', backgroundColor: FrostColors.goldTrue, borderRadius: FrostRadius.md, borderBottomRightRadius: 4, padding: FrostSpace.m },
  bubbleThem:    { alignSelf: 'flex-start', backgroundColor: 'rgba(255,253,248,0.80)', borderRadius: FrostRadius.md, borderBottomLeftRadius: 4, padding: FrostSpace.m, borderWidth: StyleSheet.hairlineWidth, borderColor: FrostColors.buttonFrostBorder },
  bubbleSender:  { ...FrostType.eyebrowSmall, fontSize: 9, marginBottom: 3, color: FrostColors.muted },
  bubbleText:    { fontFamily: FrostFonts.bodyMedium, fontSize: 14, color: '#1A1815', lineHeight: 20 },
  bubbleTextMe:  { color: '#FFFFFF' },
  bubbleTime:    { ...FrostType.eyebrowSmall, fontSize: 9, marginTop: 4, color: FrostColors.muted },
  bubbleTimeMe:  { color: 'rgba(255,255,255,0.65)' },
  composer:      {},
  composerInner: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: FrostSpace.l, paddingVertical: FrostSpace.m, gap: FrostSpace.m },
  composerInput: { flex: 1, fontFamily: FrostFonts.bodyMedium, fontSize: 15, color: '#1A1815', maxHeight: 100, paddingVertical: FrostSpace.xs },
});
