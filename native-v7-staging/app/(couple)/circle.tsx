/**
 * TDW Native V7 — Couple Circle
 * Exact port of web/app/couple/circle/page.tsx
 *
 * Endpoints:
 *   GET  /api/co-planner/list/:userId
 *   POST /api/co-planner/invite
 *   POST /api/co-planner/remove
 *   GET  /api/couple/muse/:userId
 *   GET  /api/enquiries/couple/:userId
 *   GET  /api/couple/vendors/:userId
 *   GET  /api/circle/reactions/:coupleId
 *   POST /api/circle/reactions
 *   GET  /api/circle/messages/:coupleId
 *   POST /api/circle/messages
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  FlatList, Modal, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, Linking, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Radius, RAILWAY_URL } from '../../constants/tokens';

const API = RAILWAY_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Session { id: string; name?: string; }
interface Member {
  id: string; primary_user_id: string; co_planner_user_id?: string;
  invite_code: string; status: 'pending' | 'active' | 'removed';
  role: 'partner' | 'family' | 'inner_circle'; name?: string; invitee_name?: string; created_at: string;
}
interface ActivityItem {
  id: string; type: 'save' | 'enquiry' | 'joined';
  actor: string; action: string; subject: string;
  subject_id?: string; vendor_id?: string; vendor_image?: string;
  vendor_category?: string; vendor_event?: string;
  timestamp: string; reactions: Record<string, number>;
}
interface CircleMessage {
  id: string; couple_id: string; sender_user_id?: string;
  sender_name: string; sender_role: string; content: string; created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  partner: 'Partner', family: 'Family', inner_circle: 'Inner Circle',
};
const ROLE_COLORS: Record<string, string> = {
  partner: Colors.gold, family: Colors.muted, inner_circle: '#555250',
};
const REACTIONS = ['❤️', '👍', '🤩', '🤔'];

function timeAgo(d: string): string {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Activity Row ─────────────────────────────────────────────────────────────

function ActivityRow({ item, onReact }: {
  item: ActivityItem;
  onReact: (id: string, emoji: string) => void;
}) {
  const [showReactions, setShowReactions] = useState(false);
  const typeIcon = item.action === 'booked' ? '✓' : item.type === 'save' ? '♥' : item.type === 'enquiry' ? '✉' : '✦';
  const typeColor = item.action === 'booked' ? Colors.ink : item.type === 'save' ? Colors.gold : item.type === 'enquiry' ? '#555250' : Colors.muted;

  return (
    <View style={styles.activityCard}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={[styles.typeIcon, { borderColor: 'rgba(201,168,76,0.2)' }]}>
          <Text style={{ fontSize: 14, color: typeColor }}>{typeIcon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.activityText}>
            <Text style={{ fontWeight: '500' }}>{item.actor}</Text>
            {' '}{item.action}{' '}
            <Text style={{ fontFamily: Fonts.display, fontSize: 15 }}>{item.subject}</Text>
            {item.vendor_category ? <Text style={{ color: Colors.muted }}> · {item.vendor_category}</Text> : null}
          </Text>
          <Text style={styles.activityTime}>{timeAgo(item.timestamp)}</Text>

          {/* Vendor image for saves */}
          {item.type === 'save' && item.vendor_image ? (
            <Image
              source={{ uri: item.vendor_image }}
              style={styles.activityImage}
              resizeMode="cover"
            />
          ) : null}

          {/* Reactions row */}
          <View style={styles.reactionsRow}>
            {Object.entries(item.reactions).filter(([, count]) => count > 0).map(([emoji, count]) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionChip}
                onPress={() => onReact(item.id, emoji)}
              >
                <Text style={{ fontSize: 12 }}>{emoji}</Text>
                <Text style={styles.reactionCount}>{count}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.addReactionChip}
              onPress={() => setShowReactions(r => !r)}
            >
              <Text style={styles.addReactionText}>{showReactions ? '✕' : '+ React'}</Text>
            </TouchableOpacity>
            {showReactions && (
              <View style={styles.reactionPicker}>
                {REACTIONS.map(emoji => (
                  <TouchableOpacity
                    key={emoji}
                    style={{ padding: 4 }}
                    onPress={() => { onReact(item.id, emoji); setShowReactions(false); }}
                  >
                    <Text style={{ fontSize: 20 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Invite Sheet ─────────────────────────────────────────────────────────────

function InviteSheet({ userId, onClose, onInvited }: {
  userId: string;
  onClose: () => void;
  onInvited: (code: string, link: string, name: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [role, setRole] = useState<'partner' | 'family' | 'inner_circle'>('inner_circle');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    if (!name.trim()) { setError('Enter a name'); return; }
    setSending(true); setError('');
    try {
      const res = await fetch(`${API}/api/co-planner/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role, invitee_name: name.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        onInvited(json.data.invite_code, json.data.link, name.trim());
      } else {
        setError(json.error || 'Failed to generate invite');
      }
    } catch { setError('Network error'); }
    setSending(false);
  };

  return (
    <Modal visible animationType="slide" transparent>
      <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetGold}>Add to Circle</Text>
        <Text style={styles.sheetTitle}>Invite someone</Text>

        <Text style={styles.fieldLabel}>Their name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Rahul, Mom, Preethi..."
          placeholderTextColor={Colors.muted}
          style={styles.fieldInput}
          autoFocus
        />

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Their role</Text>
        <View style={styles.roleRow}>
          {(['partner', 'family', 'inner_circle'] as const).map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => setRole(r)}
            >
              <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                {ROLE_LABELS[r]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.roleHint}>
          {role === 'partner' && 'Full access to planning, Muse, tasks and budget.'}
          {role === 'family' && 'Can see planning, Muse and tasks. No budget.'}
          {role === 'inner_circle' && 'Can see Muse and activity feed only.'}
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryBtn, !name.trim() && styles.primaryBtnDisabled]}
          onPress={send}
          disabled={sending || !name.trim()}
        >
          <Text style={styles.primaryBtnText}>{sending ? 'Generating...' : 'Generate Invite Link'}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Invite Link Sheet ─────────────────────────────────────────────────────────

function InviteLinkSheet({ code, link, name, onClose }: {
  code: string; link: string; name: string; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

  return (
    <Modal visible animationType="slide" transparent>
      <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 32, alignItems: 'center' }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.goldCircle}><Text style={{ fontSize: 24, color: Colors.gold }}>✦</Text></View>
        <Text style={styles.sheetTitle}>Invite ready for {name}</Text>
        <Text style={styles.sheetSubtitle}>Share this link with them to join your Circle</Text>

        <View style={styles.linkBox}>
          <Text style={styles.linkText} numberOfLines={1}>{link}</Text>
          <TouchableOpacity onPress={() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
            <Text style={[styles.copyText, copied && { color: Colors.gold }]}>{copied ? 'Copied!' : 'Copy'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.waShareBtn}
          onPress={() => {
            const msg = `Hey ${name}! I'm planning my wedding on The Dream Wedding and want you to be part of it. Join my Circle here: ${link}`;
            Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`);
          }}
        >
          <Text style={styles.waShareBtnText}>Share via WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={{ marginTop: 4 }}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CircleScreen() {
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<Session | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ code: string; link: string; name: string } | null>(null);
  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<FlatList>(null);

  // Auth
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('couple_session') || await AsyncStorage.getItem('couple_web_session') || '';
        if (!raw) return;
        const s = JSON.parse(raw);
        if (!s?.id) return;
        setSession(s);
      } catch {}
    })();
  }, []);

  const loadMembers = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`${API}/api/co-planner/list/${uid}`);
      const json = await res.json();
      if (json.success) setMembers(json.data || []);
    } catch {}
    setLoading(false);
  }, []);

  const loadActivity = useCallback(async (uid: string) => {
    try {
      const [museSaves, enquiries, coplanners, bookedVendors] = await Promise.all([
        fetch(`${API}/api/couple/muse/${uid}`).then(r => r.json()),
        fetch(`${API}/api/enquiries/couple/${uid}`).then(r => r.json()),
        fetch(`${API}/api/co-planner/list/${uid}`).then(r => r.json()),
        fetch(`${API}/api/couple/vendors/${uid}`).then(r => r.json()).catch(() => ({ success: false })),
      ]);

      const items: ActivityItem[] = [];

      if (museSaves.success) {
        for (const save of (museSaves.data || []).slice(0, 10)) {
          items.push({
            id: `save-${save.id}`, type: 'save', actor: 'You', action: 'saved',
            subject: save.vendor?.name || 'Inspiration',
            vendor_id: save.vendor_id,
            vendor_image: save.vendor_image || save.vendor?.featured_photos?.[0] || null,
            vendor_category: save.vendor?.category || null,
            timestamp: save.created_at, reactions: {},
          });
        }
      }

      const vendorRows = bookedVendors?.data || bookedVendors || [];
      if (Array.isArray(vendorRows)) {
        for (const v of vendorRows.filter((v: any) => v.status === 'booked' || v.status === 'paid').slice(0, 10)) {
          items.push({
            id: `vendor-${v.id}`, type: 'save', actor: 'You', action: 'booked',
            subject: v.name || 'a Maker',
            vendor_category: v.category || null,
            vendor_event: (v.events || []).join(', ') || undefined,
            timestamp: v.updated_at || v.created_at, reactions: {},
          });
        }
      }

      if (enquiries.success) {
        for (const thread of (enquiries.data || []).slice(0, 10)) {
          items.push({
            id: `enquiry-${thread.id}`, type: 'enquiry', actor: 'You', action: 'sent an enquiry to',
            subject: thread.vendor?.name || 'a Maker',
            vendor_id: thread.vendor_id,
            vendor_image: thread.vendor?.featured_photos?.[0] || null,
            timestamp: thread.last_message_at, reactions: {},
          });
        }
      }

      if (coplanners.success) {
        for (const m of (coplanners.data || [])) {
          if (m.status === 'active') {
            items.push({
              id: `join-${m.id}`, type: 'joined', actor: m.name || m.invitee_name || 'Someone',
              action: 'joined your Circle as',
              subject: ROLE_LABELS[m.role] || m.role,
              timestamp: m.created_at, reactions: {},
            });
          }
        }
      }

      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivity(items.slice(0, 20));
    } catch {}
    setActivityLoading(false);
  }, []);

  const loadMessages = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`${API}/api/circle/messages/${uid}`);
      const json = await res.json();
      if (json.success) setMessages(json.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (session?.id) {
      loadMembers(session.id);
      loadActivity(session.id);
      loadMessages(session.id);
    }
  }, [session, loadMembers, loadActivity, loadMessages]);

  // Poll messages every 10s while screen focused
  useFocusEffect(useCallback(() => {
    if (!session?.id) return;
    const id = setInterval(() => loadMessages(session!.id), 10000);
    return () => clearInterval(id);
  }, [session?.id, loadMessages]));

  const handleReact = useCallback((itemId: string, emoji: string) => {
    setActivity(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const reactions = { ...item.reactions };
      reactions[emoji] = (reactions[emoji] || 0) + 1;
      return { ...item, reactions };
    }));
    if (session?.id) {
      fetch(`${API}/api/circle/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_id: session.id, item_id: itemId, emoji, actor_name: session.name || 'You' }),
      }).catch(() => {});
    }
  }, [session]);

  async function sendMessage() {
    if (!chatInput.trim() || !session?.id || sendingMsg) return;
    setSendingMsg(true);
    const optimistic: CircleMessage = {
      id: `temp-${Date.now()}`, couple_id: session.id, sender_user_id: session.id,
      sender_name: session.name || 'You', sender_role: 'partner',
      content: chatInput.trim(), created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    const text = chatInput.trim();
    setChatInput('');
    try {
      await fetch(`${API}/api/circle/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: session.id, sender_user_id: session.id,
          sender_name: session.name || 'You', sender_role: 'partner', content: text,
        }),
      });
    } catch {}
    setSendingMsg(false);
  }

  const handleRemoveMember = async (inviteId: string) => {
    if (!session?.id) return;
    try {
      await fetch(`${API}/api/co-planner/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_id: inviteId, user_id: session.id }),
      });
      setMembers(prev => prev.filter(m => m.id !== inviteId));
    } catch {}
  };

  if (!session) return null;

  const activeMembers = members.filter(m => m.status === 'active');
  const pendingMembers = members.filter(m => m.status === 'pending');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: showChat ? 380 : 80, paddingTop: insets.top + 8 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
          <Text style={styles.circleGold}>Circle</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <Text style={styles.circleTitle}>Your people</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowInvite(true)}>
              <Text style={styles.addBtnText}>+ Invite</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Members */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <Text style={styles.sectionLabel}>Members</Text>

          {loading ? (
            <ActivityIndicator color={Colors.gold} style={{ marginTop: 20 }} />
          ) : activeMembers.length === 0 && pendingMembers.length === 0 ? (
            <View style={styles.emptyMembersCard}>
              <Text style={styles.emptyMembersTitle}>Just you, for now.</Text>
              <Text style={styles.emptyMembersSubtitle}>
                Invite your partner, family, or inner circle to plan together.
              </Text>
            </View>
          ) : (
            <>
              {activeMembers.map(m => (
                <View key={m.id} style={styles.memberCard}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{getInitials(m.name || m.invitee_name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{m.name || m.invitee_name || 'Member'}</Text>
                  </View>
                  <View style={[styles.roleChip, { borderColor: ROLE_COLORS[m.role] || Colors.muted }]}>
                    <Text style={[styles.roleChipText, { color: ROLE_COLORS[m.role] || Colors.muted }]}>
                      {ROLE_LABELS[m.role] || m.role}
                    </Text>
                  </View>
                </View>
              ))}
              {pendingMembers.map(m => (
                <View key={m.id} style={styles.memberCard}>
                  <View style={[styles.memberAvatar, { backgroundColor: '#F4F1EC' }]}>
                    <Text style={styles.memberAvatarText}>{getInitials(m.invitee_name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{m.invitee_name || 'Pending'}</Text>
                    <Text style={styles.pendingText}>Invite not yet accepted</Text>
                  </View>
                  <TouchableOpacity style={styles.resendBtn} onPress={() => handleRemoveMember(m.id)}>
                    <Text style={styles.resendBtnText}>Resend</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Activity feed */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <Text style={styles.sectionLabel}>Activity</Text>
          {activityLoading ? (
            <ActivityIndicator color={Colors.gold} style={{ marginTop: 20 }} />
          ) : activity.length === 0 ? (
            <View style={styles.emptyActivityCard}>
              <Text style={styles.emptyActivityText}>Your planning activity will appear here.</Text>
            </View>
          ) : activity.map(item => (
            <ActivityRow key={item.id} item={item} onReact={handleReact} />
          ))}
        </View>
      </ScrollView>

      {/* Circle Chat — fixed at bottom */}
      <View style={[styles.chatBar, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity
          style={styles.chatToggle}
          onPress={() => setShowChat(v => !v)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.chatLabel}>Circle Chat</Text>
            {messages.length > 0 && (
              <View style={styles.chatBadge}>
                <Text style={styles.chatBadgeText}>{messages.length}</Text>
              </View>
            )}
          </View>
          <Text style={{ color: '#C8C4BE', fontSize: 12 }}>{showChat ? '▼' : '▲'}</Text>
        </TouchableOpacity>

        {showChat && (
          <View>
            <ScrollView
              style={{ maxHeight: 280 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 10 }}
              ref={chatEndRef as any}
              onContentSizeChange={() => (chatEndRef.current as any)?.scrollToEnd?.({ animated: true })}
            >
              {messages.length === 0 ? (
                <Text style={styles.chatEmptyText}>Start the conversation.</Text>
              ) : messages.map(msg => {
                const isMe = msg.sender_user_id === session?.id;
                return (
                  <View key={msg.id} style={{ alignItems: isMe ? 'flex-end' : 'flex-start', marginVertical: 2 }}>
                    {!isMe && (
                      <Text style={styles.chatSenderName}>{msg.sender_name}</Text>
                    )}
                    <View style={[styles.chatBubble, isMe ? styles.chatBubbleMe : styles.chatBubbleOther]}>
                      <Text style={[styles.chatBubbleText, isMe ? { color: Colors.background } : { color: Colors.ink }]}>
                        {msg.content}
                      </Text>
                    </View>
                    <Text style={styles.chatTime}>{timeAgo(msg.created_at)}</Text>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.chatInputRow}>
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Message your circle..."
                placeholderTextColor={Colors.muted}
                style={styles.chatInput}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.chatSendBtn, !chatInput.trim() && styles.chatSendBtnDisabled]}
                onPress={sendMessage}
                disabled={!chatInput.trim() || sendingMsg}
              >
                <Text style={{ color: chatInput.trim() ? Colors.background : '#C8C4BE', fontSize: 16 }}>↑</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Invite Sheet */}
      {showInvite && session && (
        <InviteSheet
          userId={session.id}
          onClose={() => setShowInvite(false)}
          onInvited={(code, link, name) => {
            setShowInvite(false);
            setInviteResult({ code, link, name });
            loadMembers(session.id);
          }}
        />
      )}

      {/* Invite Link Sheet */}
      {inviteResult && (
        <InviteLinkSheet
          code={inviteResult.code}
          link={inviteResult.link}
          name={inviteResult.name}
          onClose={() => { setInviteResult(null); if (session?.id) loadMembers(session.id); }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: Fonts.label, fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase',
    color: Colors.muted, marginBottom: 14,
  },

  circleGold: {
    fontFamily: Fonts.label, fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase',
    color: Colors.gold, marginBottom: 6,
  },
  circleTitle: { fontFamily: Fonts.display, fontSize: 32, color: Colors.ink },
  addBtn: {
    backgroundColor: Colors.dark, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
  },
  addBtnText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', color: Colors.background },

  emptyMembersCard: {
    backgroundColor: Colors.card, borderWidth: 0.5, borderColor: Colors.border,
    borderRadius: 12, padding: '32px' as any, alignItems: 'center', padding: 32,
  },
  emptyMembersTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.ink, marginBottom: 8 },
  emptyMembersSubtitle: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20 },

  memberCard: {
    backgroundColor: Colors.card, borderWidth: 0.5, borderColor: Colors.border,
    borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  memberAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.dark, alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.background },
  memberName: { fontFamily: Fonts.body, fontSize: 14, color: Colors.ink },
  pendingText: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 2 },
  roleChip: { borderWidth: 0.5, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  roleChipText: { fontFamily: Fonts.label, fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase' },
  resendBtn: { backgroundColor: Colors.background, borderWidth: 0.5, borderColor: Colors.border, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  resendBtnText: { fontFamily: Fonts.label, fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: Colors.muted },

  activityCard: {
    backgroundColor: Colors.card, borderWidth: 0.5, borderColor: Colors.border,
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  typeIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 0.5,
    alignItems: 'center', justifyContent: 'center',
  },
  activityText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.ink, lineHeight: 20, marginBottom: 2 },
  activityTime: { fontFamily: Fonts.body, fontSize: 11, color: '#C8C4BE', marginBottom: 10 },
  activityImage: { width: '100%', height: 120, borderRadius: 8, marginBottom: 10 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  reactionChip: {
    backgroundColor: 'rgba(17,17,17,0.04)', borderWidth: 0.5, borderColor: Colors.border,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  reactionCount: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted },
  addReactionChip: {
    borderWidth: 0.5, borderColor: Colors.border, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  addReactionText: { fontFamily: Fonts.body, fontSize: 12, color: '#C8C4BE' },
  reactionPicker: { flexDirection: 'row', gap: 6 },

  emptyActivityCard: {
    backgroundColor: Colors.card, borderWidth: 0.5, borderColor: Colors.border,
    borderRadius: 12, padding: 32, alignItems: 'center',
  },
  emptyActivityText: { fontFamily: Fonts.display, fontSize: 18, color: '#C8C4BE', textAlign: 'center' },

  // Chat bar
  chatBar: {
    backgroundColor: Colors.card, borderTopWidth: 0.5, borderTopColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 24,
  },
  chatToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  chatLabel: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: Colors.muted },
  chatBadge: { backgroundColor: Colors.gold, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 1 },
  chatBadgeText: { fontFamily: Fonts.body, fontSize: 9, color: '#FFFFFF' },
  chatEmptyText: { fontFamily: Fonts.display, fontSize: 16, fontStyle: 'italic', color: '#C8C4BE', textAlign: 'center', marginVertical: 16 },
  chatSenderName: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: '#C8C4BE', marginBottom: 3, marginLeft: 4 },
  chatBubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9, maxWidth: '80%' },
  chatBubbleMe: { backgroundColor: Colors.dark, borderBottomRightRadius: 4, borderTopRightRadius: 16 },
  chatBubbleOther: { backgroundColor: '#F4F1EC', borderBottomLeftRadius: 4, borderTopLeftRadius: 16 },
  chatBubbleText: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 20 },
  chatTime: { fontFamily: Fonts.body, fontSize: 10, color: '#C8C4BE', marginTop: 3, marginHorizontal: 4 },
  chatInputRow: {
    flexDirection: 'row', gap: 8, padding: 8, paddingHorizontal: 16,
    borderTopWidth: 0.5, borderTopColor: '#F0EDE8',
    paddingBottom: 16,
  },
  chatInput: {
    flex: 1, backgroundColor: Colors.background, borderWidth: 0.5, borderColor: Colors.border,
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10,
    fontFamily: Fonts.body, fontSize: 14, color: Colors.ink,
  },
  chatSendBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.dark,
    alignItems: 'center', justifyContent: 'center',
  },
  chatSendBtnDisabled: { backgroundColor: '#F0EDE8' },

  // Sheets
  sheetBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(17,17,17,0.45)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: 20,
  },
  sheetGold: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', color: Colors.gold, marginBottom: 6 },
  sheetTitle: { fontFamily: Fonts.display, fontSize: 26, color: Colors.ink, marginBottom: 20 },
  sheetSubtitle: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, textAlign: 'center', marginBottom: 20 },

  fieldLabel: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: Colors.muted, marginBottom: 6 },
  fieldInput: {
    backgroundColor: Colors.background, borderWidth: 0.5, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: Fonts.body, fontSize: 14, color: Colors.ink,
  },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleBtn: { flex: 1, paddingVertical: 10, borderWidth: 0.5, borderColor: Colors.border, borderRadius: 8, alignItems: 'center' },
  roleBtnActive: { backgroundColor: Colors.dark, borderColor: Colors.dark },
  roleBtnText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: Colors.muted },
  roleBtnTextActive: { color: Colors.background },
  roleHint: { fontFamily: Fonts.body, fontSize: 11, color: '#C8C4BE', marginTop: 8, lineHeight: 18 },
  errorText: { fontFamily: Fonts.body, fontSize: 12, color: '#E05C5C', marginBottom: 12 },
  primaryBtn: { width: '100%', paddingVertical: 14, backgroundColor: Colors.dark, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  primaryBtnDisabled: { backgroundColor: Colors.border },
  primaryBtnText: { fontFamily: Fonts.label, fontSize: 10, letterSpacing: 2.2, textTransform: 'uppercase', color: Colors.background },

  goldCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(201,168,76,0.1)', borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12, alignSelf: 'center',
  },
  linkBox: {
    backgroundColor: Colors.background, borderWidth: 0.5, borderColor: Colors.border,
    borderRadius: 10, padding: 12, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%',
  },
  linkText: { fontFamily: Fonts.body, fontSize: 12, color: '#555250', flex: 1 },
  copyText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: Colors.ink },
  waShareBtn: {
    width: '100%', paddingVertical: 14, backgroundColor: '#25D366',
    borderRadius: 10, alignItems: 'center', marginBottom: 10,
  },
  waShareBtnText: { fontFamily: Fonts.label, fontSize: 10, letterSpacing: 2.2, textTransform: 'uppercase', color: '#FFFFFF' },
  doneText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
});
