/**
 * app/(vendor)/studio/team.tsx
 * Exact port of web/app/vendor/studio/team/page.tsx
 *
 * GET  /api/team/:vendorId
 * POST /api/team  { vendor_id, name, role, phone }
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Animated, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Plus, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { RAILWAY_URL } from '../../../constants/tokens';
import { getVendorSession } from '../../../utils/session';

const API   = RAILWAY_URL;
const BG    = '#F8F7F5';
const CARD  = '#FFFFFF';
const DARK  = '#111111';
const MUTED = '#8C8480';
const BORDER = '#E2DED8';

const CG300   = 'CormorantGaramond_300Light';
const DM300   = 'DMSans_300Light';
const DM400   = 'DMSans_400Regular';
const JOST200 = 'Jost_200ExtraLight';
const JOST    = 'Jost_300Light';

function getInitials(name: string) {
  return name.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase();
}

function Shimmer() {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 0.9, duration: 700, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={[s.shimmerCard, { opacity: anim }]}>
      <View style={s.shimmerAvatar} />
      <View style={{ flex:1 }}>
        <View style={s.shimmerLine} />
        <View style={[s.shimmerLine, { width:'40%', marginTop:6 }]} />
      </View>
    </Animated.View>
  );
}

export default function TeamScreen() {
  const [vendorId,   setVendorId]   = useState('');
  const [team,       setTeam]       = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [sheetOpen,  setSheetOpen]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form,       setForm]       = useState({ name:'', role:'', phone:'' });
  const [toast,      setToast]      = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;

  function showToast(msg: string) {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue:1, duration:200, useNativeDriver:true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue:0, duration:200, useNativeDriver:true }),
    ]).start(() => setToast(''));
  }

  const fetchTeam = useCallback(async (vid: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/team/${vid}`);
      const d = await r.json();
      if (d.success) setTeam(d.data||[]);
      else if (Array.isArray(d)) setTeam(d);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    getVendorSession().then((s: any) => {
      if (!s) return;
      const vid = s.vendorId || s.id;
      setVendorId(vid);
      fetchTeam(vid);
    });
  }, [fetchTeam]);

  async function addMember() {
    if (!form.name.trim()) { showToast('Full name is required.'); return; }
    if (!form.role.trim()) { showToast('Role is required.'); return; }
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/api/team`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ vendor_id:vendorId, name:form.name, role:form.role, phone:form.phone }),
      });
      const d = await r.json();
      if (d.success || r.ok) {
        setSheetOpen(false);
        setForm({ name:'', role:'', phone:'' });
        showToast('Team member added.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        fetchTeam(vendorId);
      } else showToast(d.error || d.message || 'Failed to add member.');
    } catch { showToast('Network error.'); }
    setSubmitting(false);
  }

  const FIELDS = [
    { label:'FULL NAME', key:'name', type:'default',     required:true,  placeholder:'' },
    { label:'ROLE',      key:'role', type:'default',     required:true,  placeholder:'Assistant, Second Shooter…' },
    { label:'PHONE',     key:'phone', type:'phone-pad',  required:false, placeholder:'' },
  ] as const;

  return (
    <View style={s.root}>
      {!!toast && <Animated.View style={[s.toast,{opacity:toastAnim}]}><Text style={s.toastText}>{toast}</Text></Animated.View>}

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
            <ArrowLeft size={20} strokeWidth={1.5} color={DARK} />
          </TouchableOpacity>
          <Text style={s.eyebrow}>YOUR STUDIO</Text>
          <Text style={s.pageTitle}>Team</Text>
        </View>

        <View style={s.body}>
          {loading ? (
            <><Shimmer /><Shimmer /><Shimmer /></>
          ) : team.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>Your team will appear here.</Text>
              <Text style={s.emptySub}>Add photographers, assistants, and coordinators.</Text>
            </View>
          ) : team.map(m => (
            <View key={m.id} style={s.memberCard}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{getInitials(m.name || '?')}</Text>
              </View>
              <View style={{ flex:1, minWidth:0 }}>
                <Text style={s.memberName}>{m.name}</Text>
                <Text style={s.memberRole}>{m.role}</Text>
              </View>
              <Text style={[s.statusText, m.active && s.statusTextActive]}>
                {m.active ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => { Haptics.selectionAsync(); setSheetOpen(true); }} activeOpacity={0.85}>
        <Plus size={20} strokeWidth={1.5} color="#F8F7F5" />
      </TouchableOpacity>

      {/* Add Member Sheet */}
      <Modal visible={sheetOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSheetOpen(false)}>
        <View style={{ flex:1, backgroundColor:CARD, padding:24 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
            <Text style={s.sheetTitle}>Add Member</Text>
            <TouchableOpacity onPress={() => setSheetOpen(false)} activeOpacity={0.7}>
              <X size={20} strokeWidth={1.5} color={MUTED} />
            </TouchableOpacity>
          </View>

          {FIELDS.map(f => (
            <View key={f.key} style={{ marginBottom:20 }}>
              <Text style={s.fieldLabel}>{f.label}{f.required ? ' *' : ''}</Text>
              <TextInput
                style={s.fieldInput}
                placeholder={f.placeholder}
                placeholderTextColor="#C8C4BE"
                value={form[f.key]}
                onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                keyboardType={f.type as any}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[s.submitBtn, submitting && { opacity:0.6 }]}
            onPress={addMember} disabled={submitting} activeOpacity={0.85}
          >
            <Text style={s.submitBtnText}>{submitting ? 'ADDING…' : 'ADD MEMBER'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:  { flex:1, backgroundColor:BG },
  toast: { position:'absolute', top:16, left:24, right:24, zIndex:100, backgroundColor:DARK, borderRadius:8, padding:12, alignItems:'center' },
  toastText: { fontFamily:DM300, fontSize:12, color:'#F8F7F5' },

  header:  { paddingHorizontal:20, paddingTop:24, paddingBottom:20 },
  backBtn: { marginBottom:12, alignSelf:'flex-start' },
  eyebrow: { fontFamily:JOST200, fontSize:9, letterSpacing:2.2, textTransform:'uppercase', color:MUTED, marginBottom:4 },
  pageTitle: { fontFamily:CG300, fontSize:28, color:DARK },
  body:    { paddingHorizontal:20 },

  shimmerCard:   { backgroundColor:CARD, borderWidth:1, borderColor:BORDER, borderRadius:12, padding:16, marginBottom:8, flexDirection:'row', alignItems:'center', gap:12 },
  shimmerAvatar: { width:32, height:32, borderRadius:16, backgroundColor:'#EEECE8' },
  shimmerLine:   { height:13, width:'50%', borderRadius:4, backgroundColor:'#EEECE8' },

  emptyState: { paddingTop:60, alignItems:'center' },
  emptyTitle: { fontFamily:CG300, fontSize:18, fontStyle:'italic', color:MUTED, marginBottom:8 },
  emptySub:   { fontFamily:DM300, fontSize:12, color:MUTED },

  memberCard: { backgroundColor:CARD, borderWidth:1, borderColor:BORDER, borderRadius:12, padding:16, marginBottom:8, flexDirection:'row', alignItems:'center', gap:12 },
  avatar:     { width:32, height:32, borderRadius:16, backgroundColor:BG, borderWidth:1, borderColor:BORDER, alignItems:'center', justifyContent:'center' },
  avatarText: { fontFamily:JOST, fontSize:12, color:DARK },
  memberName: { fontFamily:DM400, fontSize:14, color:DARK },
  memberRole: { fontFamily:DM300, fontSize:12, color:MUTED, marginTop:2 },
  statusText: { fontFamily:JOST, fontSize:9, letterSpacing:1, textTransform:'uppercase', color:MUTED },
  statusTextActive: { color:DARK },

  fab: { position:'absolute', bottom:32, right:24, width:52, height:52, borderRadius:26, backgroundColor:DARK, alignItems:'center', justifyContent:'center' },

  sheetTitle:  { fontFamily:CG300, fontSize:22, color:DARK },
  fieldLabel:  { fontFamily:JOST200, fontSize:9, letterSpacing:2, textTransform:'uppercase', color:MUTED, marginBottom:6 },
  fieldInput:  { fontFamily:DM300, fontSize:13, color:DARK, borderBottomWidth:1, borderBottomColor:BORDER, paddingVertical:10 },
  submitBtn:   { backgroundColor:DARK, borderRadius:10, padding:16, alignItems:'center', marginTop:8 },
  submitBtnText: { fontFamily:JOST200, fontSize:12, letterSpacing:2, textTransform:'uppercase', color:'#F8F7F5' },
});
