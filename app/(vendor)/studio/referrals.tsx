/**
 * app/(vendor)/studio/referrals.tsx
 * Exact port of web/app/vendor/studio/referrals/page.tsx
 *
 * GET /api/referral-code/:vendorId
 * GET /api/referrals/stats/:vendorId
 * GET /api/referrals/rewards/:vendorId
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Clipboard } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft } from 'lucide-react-native';
import { RAILWAY_URL } from '../../../constants/tokens';
import { getVendorSession } from '../../../utils/session';

const API   = RAILWAY_URL;
const BG    = '#F8F7F5';
const CARD  = '#FFFFFF';
const GOLD  = '#C9A84C';
const DARK  = '#111111';
const MUTED = '#8C8480';
const BORDER = '#E2DED8';

const CG300   = 'CormorantGaramond_300Light';
const DM300   = 'DMSans_300Light';
const JOST200 = 'Jost_200ExtraLight';
const JOST    = 'Jost_300Light';

function Shimmer({ h = 90 }: { h?: number }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 0.9, duration: 700, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ height: h, borderRadius: 12, backgroundColor: '#EEECE8', opacity: anim, marginBottom: 10 }} />;
}

export default function ReferralsScreen() {
  const [vendorId,       setVendorId]       = useState<string|null>(null);
  const [code,           setCode]           = useState('');
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalEarned,    setTotalEarned]    = useState(0);
  const [discount,       setDiscount]       = useState(0);
  const [nextMilestone,  setNextMilestone]  = useState<{referrals:number;discount:number}|null>(null);
  const [loading,        setLoading]        = useState(true);
  const [toast,          setToast]          = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;

  function showToast(msg: string) {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(''));
  }

  const fetchReferrals = useCallback(async (vid: string) => {
    try {
      const [codeRes, statsRes, rewardsRes] = await Promise.all([
        fetch(`${API}/api/referral-code/${vid}`),
        fetch(`${API}/api/referrals/stats/${vid}`),
        fetch(`${API}/api/referrals/rewards/${vid}`),
      ]);
      const codeJson    = await codeRes.json();
      const statsJson   = await statsRes.json();
      const rewardsJson = await rewardsRes.json();
      if (codeJson.success && codeJson.data?.code)    setCode(codeJson.data.code);
      if (statsJson.success && statsJson.data)         { setTotalReferrals(statsJson.data.total_referrals||0); setTotalEarned(statsJson.data.total_earned||0); }
      if (rewardsJson.success && rewardsJson.data)     { setDiscount(rewardsJson.data.discount||0); setNextMilestone(rewardsJson.data.next_milestone||null); }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    getVendorSession().then((s: any) => {
      if (!s) return;
      const vid = s.vendorId || s.id;
      setVendorId(vid);
      fetchReferrals(vid);
    });
  }, [fetchReferrals]);

  function copyLink() {
    const link = `https://thedreamwedding.in/r/${code || vendorId?.slice(0,8).toUpperCase()}`;
    Clipboard.setString(link);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Link copied.');
  }

  return (
    <View style={s.root}>
      {!!toast && <Animated.View style={[s.toast,{opacity:toastAnim}]}><Text style={s.toastText}>{toast}</Text></Animated.View>}

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
            <ArrowLeft size={20} strokeWidth={1.5} color={DARK} />
          </TouchableOpacity>
          <Text style={s.eyebrow}>YOUR STUDIO</Text>
          <Text style={s.pageTitle}>Referrals</Text>
        </View>

        <View style={s.body}>
          {loading ? (
            <>
              <View style={{ flexDirection:'row', gap:10, marginBottom:16 }}>
                <View style={{ flex:1 }}><Shimmer /></View>
                <View style={{ flex:1 }}><Shimmer /></View>
              </View>
              <Shimmer h={100} />
            </>
          ) : (
            <>
              {/* Stat cards */}
              <View style={s.statGrid}>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{totalReferrals}</Text>
                  <Text style={s.statLabel}>REFERRALS</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={[s.statValue, { color: GOLD }]}>₹{totalEarned}</Text>
                  <Text style={s.statLabel}>EARNED</Text>
                </View>
              </View>

              {/* Referral code */}
              <View style={[s.card, { alignItems:'center', marginBottom:12 }]}>
                <Text style={s.codeLabel}>YOUR REFERRAL CODE</Text>
                <Text style={s.codeText}>{code || vendorId?.slice(0,6).toUpperCase() || '------'}</Text>
              </View>

              {/* Discount earned */}
              {discount > 0 && (
                <View style={[s.card, s.discountCard]}>
                  <Text style={s.discountLabel}>YOUR DISCOUNT</Text>
                  <Text style={s.discountValue}>{discount}% off</Text>
                  <Text style={s.discountSub}>applied to your next subscription bill</Text>
                </View>
              )}

              {/* Next milestone */}
              {nextMilestone && (
                <View style={[s.card, { marginBottom:12, backgroundColor:BG }]}>
                  <Text style={s.milestoneLabel}>NEXT MILESTONE</Text>
                  <Text style={s.milestoneText}>
                    {nextMilestone.referrals - totalReferrals} more referral{nextMilestone.referrals - totalReferrals !== 1 ? 's' : ''} →{' '}
                    <Text style={{ color: GOLD, fontFamily: 'DMSans_400Regular' }}>{nextMilestone.discount}% off</Text>
                  </Text>
                </View>
              )}

              {/* CTA */}
              <TouchableOpacity style={s.copyBtn} onPress={copyLink} activeOpacity={0.85}>
                <Text style={s.copyBtnText}>COPY REFERRAL LINK</Text>
              </TouchableOpacity>
              <Text style={s.footnote}>Earn when a vendor you refer joins TDW.</Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:  { flex:1, backgroundColor:BG },
  toast: { position:'absolute', top:16, left:24, right:24, zIndex:100, backgroundColor:DARK, borderRadius:8, padding:12, alignItems:'center' },
  toastText: { fontFamily:DM300, fontSize:12, color:'#F8F7F5' },

  header:  { paddingHorizontal:20, paddingTop:24, paddingBottom:20 },
  backBtn: { marginBottom:20, alignSelf:'flex-start' },
  eyebrow: { fontFamily:JOST200, fontSize:10, letterSpacing:2.2, textTransform:'uppercase', color:MUTED, marginBottom:4 },
  pageTitle: { fontFamily:CG300, fontSize:28, color:DARK },
  body:    { paddingHorizontal:20 },

  statGrid: { flexDirection:'row', gap:10, marginBottom:16 },
  statCard: { flex:1, backgroundColor:CARD, borderWidth:1, borderColor:BORDER, borderRadius:12, padding:20, alignItems:'center' },
  statValue: { fontFamily:CG300, fontSize:36, color:DARK, lineHeight:40 },
  statLabel: { fontFamily:JOST200, fontSize:8, letterSpacing:2.2, textTransform:'uppercase', color:MUTED, marginTop:4 },

  card: { backgroundColor:CARD, borderWidth:1, borderColor:BORDER, borderRadius:12, padding:20, marginBottom:12 },

  codeLabel: { fontFamily:JOST200, fontSize:8, letterSpacing:2.2, textTransform:'uppercase', color:MUTED, marginBottom:10 },
  codeText:  { fontFamily:CG300, fontSize:32, color:DARK, letterSpacing:4 },

  discountCard:  { backgroundColor:'rgba(201,168,76,0.08)', borderColor:'rgba(201,168,76,0.25)', alignItems:'center' },
  discountLabel: { fontFamily:JOST200, fontSize:8, letterSpacing:2.2, textTransform:'uppercase', color:GOLD, marginBottom:4 },
  discountValue: { fontFamily:CG300, fontSize:32, color:GOLD },
  discountSub:   { fontFamily:DM300, fontSize:12, color:MUTED, marginTop:4 },

  milestoneLabel: { fontFamily:JOST200, fontSize:8, letterSpacing:1.8, textTransform:'uppercase', color:MUTED, marginBottom:4 },
  milestoneText:  { fontFamily:DM300, fontSize:13, color:DARK },

  copyBtn:     { height:48, backgroundColor:DARK, borderRadius:8, alignItems:'center', justifyContent:'center', marginBottom:16 },
  copyBtnText: { fontFamily:JOST200, fontSize:9, letterSpacing:2, textTransform:'uppercase', color:'#F8F7F5' },
  footnote:    { fontFamily:DM300, fontSize:12, color:MUTED, textAlign:'center' },
});
