/**
 * app/(vendor)/discovery/collab.tsx
 * Exact port of web/app/vendor/discovery/collab/page.tsx
 *
 * GET   /api/v2/collab/posts?vendor_id=:id
 * GET   /api/v2/collab/my-posts/:vendorId
 * POST  /api/v2/collab/posts
 * POST  /api/v2/collab/applications
 * GET   /api/v2/collab/applications/:postId
 * PATCH /api/v2/collab/applications/:appId  { status, post_id, post_type }
 * PATCH /api/v2/collab/posts/:postId        { status:'closed' }
 * POST  /api/expenses  (log collab expense)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Animated, Modal,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { RAILWAY_URL } from '../../../constants/tokens';
import { getVendorSession } from '../../../utils/session';

const API   = RAILWAY_URL;
const BG    = '#F8F7F5';
const CARD  = '#FFFFFF';
const GOLD  = '#C9A84C';
const DARK  = '#111111';
const MUTED = '#8C8480';
const BORDER = '#E2DED8';
const GREEN = '#4A7C59';

const CG300   = 'CormorantGaramond_300Light';
const DM300   = 'DMSans_300Light';
const DM400   = 'DMSans_400Regular';
const JOST200 = 'Jost_200ExtraLight';
const JOST    = 'Jost_300Light';
const JOST400 = 'Jost_400Regular';

const POST_TYPES = ['Job','Equipment','Collab','Referral','Service'];
const TYPE_COLORS: Record<string,string> = { Job:'#3B82F6', Equipment:'#8B5CF6', Collab:GOLD, Referral:'#10B981', Service:'#F59E0B' };

interface Post { id:string; vendor_id:string; title:string; description?:string; post_type:string; required_category?:string; city?:string; budget?:number; event_date?:string; status:string; created_at:string; application_count?:number; }
interface Application { id:string; post_id:string; applicant_vendor_id:string; message?:string; status:string; created_at:string; }

function fmtINR(n: number) { return '₹'+n.toLocaleString('en-IN'); }
function formatDate(d: string) { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }
function timeAgo(d: string) { const diff=Date.now()-new Date(d).getTime(); const h=Math.floor(diff/3600000); const dd=Math.floor(diff/86400000); if(h<1)return'Just now'; if(h<24)return`${h}h ago`; if(dd<7)return`${dd}d ago`; return formatDate(d); }

function Shimmer({ h=100 }: { h?:number }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue:0.9, duration:700, useNativeDriver:true }),
      Animated.timing(anim, { toValue:0.4, duration:700, useNativeDriver:true }),
    ])).start();
  }, []);
  return <Animated.View style={{ height:h, borderRadius:14, backgroundColor:'#EEECE8', opacity:anim, marginBottom:10 }} />;
}

function PostCard({ post, isOwn, onApply, onViewApps, onClose }: { post:Post; isOwn?:boolean; onApply?:()=>void; onViewApps?:()=>void; onClose?:()=>void }) {
  const color = TYPE_COLORS[post.post_type] || MUTED;
  return (
    <View style={pc.card}>
      <View style={{ flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
        <View style={{ flex:1 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:6 }}>
            <View style={[pc.typeBadge, { backgroundColor:`${color}15` }]}>
              <Text style={[pc.typeBadgeText, { color }]}>{post.post_type}</Text>
            </View>
            {post.city && <Text style={pc.city}>{post.city}</Text>}
          </View>
          <Text style={pc.title} numberOfLines={2}>{post.title}</Text>
          {post.description && <Text style={pc.desc} numberOfLines={2}>{post.description}</Text>}
          <View style={{ flexDirection:'row', gap:12, flexWrap:'wrap', marginTop:4 }}>
            {!!post.budget && <Text style={pc.budget}>{fmtINR(post.budget)}</Text>}
            {post.event_date && <Text style={pc.meta}>{formatDate(post.event_date)}</Text>}
            {post.required_category && <Text style={pc.meta}>{post.required_category}</Text>}
            <Text style={pc.meta}>{timeAgo(post.created_at)}</Text>
          </View>
        </View>
      </View>
      <View style={{ flexDirection:'row', gap:8, marginTop:4 }}>
        {isOwn ? (
          <>
            <TouchableOpacity style={pc.primaryBtn} onPress={onViewApps} activeOpacity={0.85}>
              <Text style={pc.primaryBtnText}>Applications {post.application_count ? `(${post.application_count})` : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={pc.secondaryBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={pc.secondaryBtnText}>Close</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={pc.primaryBtn} onPress={onApply} activeOpacity={0.85}>
            <Text style={pc.primaryBtnText}>Apply</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  card:          { backgroundColor:CARD, borderWidth:1, borderColor:BORDER, borderRadius:14, padding:14, marginBottom:10 },
  typeBadge:     { paddingHorizontal:8, paddingVertical:2, borderRadius:100 },
  typeBadgeText: { fontFamily:JOST, fontSize:8, letterSpacing:1, textTransform:'uppercase' },
  city:          { fontFamily:JOST, fontSize:8, letterSpacing:1, textTransform:'uppercase', color:MUTED },
  title:         { fontFamily:CG300, fontSize:18, color:DARK, marginBottom:4, lineHeight:22 },
  desc:          { fontFamily:DM300, fontSize:13, color:MUTED, marginBottom:8, lineHeight:18 },
  budget:        { fontFamily:DM300, fontSize:12, color:GOLD },
  meta:          { fontFamily:DM300, fontSize:12, color:MUTED },
  primaryBtn:    { flex:1, height:36, backgroundColor:DARK, borderRadius:100, alignItems:'center', justifyContent:'center' },
  primaryBtnText: { fontFamily:JOST, fontSize:9, letterSpacing:1.4, textTransform:'uppercase', color:'#F8F7F5' },
  secondaryBtn:  { height:36, paddingHorizontal:14, borderWidth:1, borderColor:BORDER, borderRadius:100, alignItems:'center', justifyContent:'center' },
  secondaryBtnText: { fontFamily:JOST, fontSize:9, letterSpacing:1.4, textTransform:'uppercase', color:MUTED },
});

export default function CollabScreen() {
  const [vendorId,   setVendorId]   = useState('');
  const [activeTab,  setActiveTab]  = useState<'browse'|'mine'>('browse');
  const [posts,      setPosts]      = useState<Post[]>([]);
  const [myPosts,    setMyPosts]    = useState<Post[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filterType, setFilterType] = useState('All');
  const [showNew,    setShowNew]    = useState(false);
  const [form,       setForm]       = useState({ title:'', description:'', post_type:'Job', required_category:'', city:'', budget:'', event_date:'' });
  const [creating,   setCreating]   = useState(false);
  const [applyPost,  setApplyPost]  = useState<Post|null>(null);
  const [applyMsg,   setApplyMsg]   = useState('');
  const [applying,   setApplying]   = useState(false);
  const [viewPost,   setViewPost]   = useState<Post|null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
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

  useEffect(() => {
    getVendorSession().then((s: any) => {
      if (!s) return;
      const vid = s.vendorId || s.id;
      setVendorId(vid);
      loadPosts(vid); loadMyPosts(vid);
    });
  }, []);

  async function loadPosts(vid: string) {
    setLoading(true);
    try { const r=await fetch(`${API}/api/v2/collab/posts?vendor_id=${vid}`); const d=await r.json(); if(d.success)setPosts(d.data||[]); } catch {}
    setLoading(false);
  }
  async function loadMyPosts(vid: string) {
    try { const r=await fetch(`${API}/api/v2/collab/my-posts/${vid}`); const d=await r.json(); if(d.success)setMyPosts(d.data||[]); } catch {}
  }
  async function createPost() {
    if (!form.title.trim()||creating) return;
    setCreating(true);
    try {
      const r=await fetch(`${API}/api/v2/collab/posts`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vendor_id:vendorId,...form,budget:form.budget?Number(form.budget):null})});
      const d=await r.json();
      if(d.success){setMyPosts(p=>[{...d.data,application_count:0},...p]);setShowNew(false);setForm({title:'',description:'',post_type:'Job',required_category:'',city:'',budget:'',event_date:''});showToast('Post created');setActiveTab('mine');}
      else showToast(d.error||'Error');
    } catch{showToast('Network error');} finally{setCreating(false);}
  }
  async function applyToPost() {
    if (!applyPost||applying) return;
    setApplying(true);
    try {
      const r=await fetch(`${API}/api/v2/collab/applications`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({post_id:applyPost.id,applicant_vendor_id:vendorId,message:applyMsg||null})});
      const d=await r.json();
      if(d.success){setApplyPost(null);setApplyMsg('');showToast('Application sent!');}else showToast(d.error||'Error');
    } catch{showToast('Network error');}finally{setApplying(false);}
  }
  async function viewApplications(post: Post) {
    setViewPost(post);setLoadingApps(true);
    try { const r=await fetch(`${API}/api/v2/collab/applications/${post.id}`); const d=await r.json(); if(d.success)setApplications(d.data||[]); } catch {}
    setLoadingApps(false);
  }
  async function updateApplication(appId: string, status: string) {
    try {
      await fetch(`${API}/api/v2/collab/applications/${appId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,post_id:viewPost?.id,post_type:viewPost?.post_type?.toLowerCase()})});
      setApplications(p=>p.map(a=>a.id===appId?{...a,status}:a));
      showToast(status==='accepted'?'Application accepted':'Application rejected');
    } catch{showToast('Error');}
  }
  async function closePost(postId: string) {
    try {
      await fetch(`${API}/api/v2/collab/posts/${postId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'closed'})});
      setMyPosts(p=>p.map(post=>post.id===postId?{...post,status:'closed'}:post));
      showToast('Post closed');
    } catch{showToast('Error');}
  }
  async function logCollabExpense(post: Post) {
    if (!post.budget){showToast('No budget set on this post.');return;}
    try {
      const r=await fetch(`${API}/api/expenses`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vendor_id:vendorId,description:`Collab: ${post.title}`,amount:post.budget,expense_date:new Date().toISOString().split('T')[0],category:'Procurement',expense_type:'business',related_name:null})});
      const d=await r.json();
      if(d.success||r.ok)showToast('Added to Business Expenses ✓');else showToast(d.error||'Failed to log expense.');
    } catch{showToast('Network error.');}
  }

  const filteredPosts = filterType==='All' ? posts : posts.filter(p=>p.post_type===filterType);
  const chipStyle = (active: boolean) => [s.chip, active && s.chipActive];
  const chipTextStyle = (active: boolean) => [s.chipText, active && s.chipTextActive];

  const lbl = s.fieldLabel;
  const fld = s.fieldInput;

  return (
    <View style={s.root}>
      {!!toast && <Animated.View style={[s.toast,{opacity:toastAnim}]}><Text style={s.toastText}>{toast}</Text></Animated.View>}

      {/* New post modal */}
      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setShowNew(false)}>
        <ScrollView contentContainerStyle={{padding:20}} keyboardShouldPersistTaps="handled">
          <Text style={s.sheetTitle}>New Collab Post</Text>
          <Text style={lbl}>Post Type</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:14}}>
            {POST_TYPES.map(t=>(
              <TouchableOpacity key={t} style={chipStyle(form.post_type===t)} onPress={()=>setForm(f=>({...f,post_type:t}))} activeOpacity={0.8}>
                <Text style={chipTextStyle(form.post_type===t)}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={lbl}>Title *</Text>
          <TextInput style={fld} value={form.title} onChangeText={v=>setForm(f=>({...f,title:v}))} placeholder="e.g. Looking for MUA for Sangeet" placeholderTextColor="#C8C4BE"/>
          <Text style={lbl}>Description</Text>
          <TextInput style={[fld,{minHeight:72}]} value={form.description} onChangeText={v=>setForm(f=>({...f,description:v}))} placeholder="Details about the opportunity..." placeholderTextColor="#C8C4BE" multiline/>
          <Text style={lbl}>Category Needed</Text>
          <TextInput style={fld} value={form.required_category} onChangeText={v=>setForm(f=>({...f,required_category:v}))} placeholder="e.g. Makeup Artist" placeholderTextColor="#C8C4BE"/>
          <Text style={lbl}>City</Text>
          <TextInput style={fld} value={form.city} onChangeText={v=>setForm(f=>({...f,city:v}))} placeholder="e.g. Mumbai" placeholderTextColor="#C8C4BE"/>
          <Text style={lbl}>Budget (₹)</Text>
          <TextInput style={fld} value={form.budget} onChangeText={v=>setForm(f=>({...f,budget:v}))} placeholder="Optional" placeholderTextColor="#C8C4BE" keyboardType="numeric"/>
          <Text style={lbl}>Event Date</Text>
          <TextInput style={fld} value={form.event_date} onChangeText={v=>setForm(f=>({...f,event_date:v}))} placeholder="YYYY-MM-DD" placeholderTextColor="#C8C4BE"/>
          <View style={{flexDirection:'row',gap:10,marginTop:8}}>
            <TouchableOpacity style={[s.primaryBtn,(!form.title.trim()||creating)&&{opacity:0.5}]} onPress={createPost} disabled={!form.title.trim()||creating} activeOpacity={0.85}>
              <Text style={s.primaryBtnText}>{creating?'Posting…':'Post'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={()=>setShowNew(false)} activeOpacity={0.7}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

      {/* Apply modal */}
      <Modal visible={!!applyPost} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setApplyPost(null)}>
        {applyPost && (
          <View style={{flex:1,padding:20,backgroundColor:CARD}}>
            <Text style={s.sheetTitle}>Apply</Text>
            <Text style={{fontFamily:DM300,fontSize:13,color:MUTED,marginBottom:20}}>{applyPost.title}</Text>
            <Text style={lbl}>Message (optional)</Text>
            <TextInput style={[fld,{minHeight:100}]} value={applyMsg} onChangeText={setApplyMsg} placeholder="Tell them why you're a great fit..." placeholderTextColor="#C8C4BE" multiline/>
            <View style={{flexDirection:'row',gap:10,marginTop:20}}>
              <TouchableOpacity style={[s.primaryBtn,applying&&{opacity:0.5}]} onPress={applyToPost} disabled={applying} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>{applying?'Sending…':'Send Application'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={()=>setApplyPost(null)} activeOpacity={0.7}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* Applications modal */}
      <Modal visible={!!viewPost} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setViewPost(null)}>
        {viewPost && (
          <View style={{flex:1,backgroundColor:CARD}}>
            <View style={{padding:20,paddingBottom:0}}>
              <Text style={s.sheetTitle}>Applications</Text>
              <Text style={{fontFamily:DM300,fontSize:13,color:MUTED,marginBottom:16}}>{viewPost.title}</Text>
            </View>
            <ScrollView contentContainerStyle={{padding:20,paddingTop:0}}>
              {loadingApps ? <Shimmer/> : applications.length===0 ? (
                <Text style={{fontFamily:DM300,fontSize:14,color:MUTED,textAlign:'center',marginTop:32,fontStyle:'italic'}}>No applications yet.</Text>
              ) : applications.map(a=>(
                <View key={a.id} style={s.appCard}>
                  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                    <Text style={{fontFamily:DM300,fontSize:13,color:DARK}}>{a.applicant_vendor_id.slice(0,8)}…</Text>
                    <View style={[s.appStatus,{backgroundColor:a.status==='accepted'?'#E8F5E9':a.status==='rejected'?'#FFEBEE':'#F4F1EC'}]}>
                      <Text style={[s.appStatusText,{color:a.status==='accepted'?GREEN:a.status==='rejected'?'#9B4545':MUTED}]}>{a.status}</Text>
                    </View>
                  </View>
                  {a.message&&<Text style={{fontFamily:DM300,fontSize:12,color:MUTED,marginBottom:8,lineHeight:17}}>{a.message}</Text>}
                  {a.status==='pending'&&(
                    <View style={{flexDirection:'row',gap:8}}>
                      <TouchableOpacity style={[s.primaryBtn,{flex:1,height:32}]} onPress={()=>updateApplication(a.id,'accepted')} activeOpacity={0.85}>
                        <Text style={s.primaryBtnText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.cancelBtn,{height:32}]} onPress={()=>updateApplication(a.id,'rejected')} activeOpacity={0.7}>
                        <Text style={s.cancelBtnText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {a.status==='accepted'&&viewPost?.budget&&(
                    <View style={s.logExpenseRow}>
                      <View style={{flex:1}}>
                        <Text style={{fontFamily:JOST200,fontSize:8,letterSpacing:1.4,textTransform:'uppercase',color:MUTED}}>Procurement · Business Expense</Text>
                        <Text style={{fontFamily:DM300,fontSize:12,color:DARK}}>₹{(viewPost.budget||0).toLocaleString('en-IN')} — {viewPost.title}</Text>
                      </View>
                      <TouchableOpacity style={s.logBtn} onPress={()=>logCollabExpense(viewPost)} activeOpacity={0.85}>
                        <Text style={s.logBtnText}>Log</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </Modal>

      <ScrollView contentContainerStyle={{ padding:20, paddingBottom:60 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end',marginBottom:20}}>
          <View>
            <Text style={s.eyebrow}>DISCOVERY</Text>
            <Text style={s.pageTitle}>Collab</Text>
          </View>
          <TouchableOpacity style={s.newBtn} onPress={()=>setShowNew(true)} activeOpacity={0.85}>
            <Text style={s.newBtnText}>+ Post</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={{flexDirection:'row',gap:8,marginBottom:16}}>
          <TouchableOpacity style={chipStyle(activeTab==='browse')} onPress={()=>setActiveTab('browse')} activeOpacity={0.8}>
            <Text style={chipTextStyle(activeTab==='browse')}>Browse</Text>
          </TouchableOpacity>
          <TouchableOpacity style={chipStyle(activeTab==='mine')} onPress={()=>setActiveTab('mine')} activeOpacity={0.8}>
            <Text style={chipTextStyle(activeTab==='mine')}>My Posts {myPosts.length>0?`(${myPosts.length})`:''}</Text>
          </TouchableOpacity>
        </View>

        {activeTab==='browse' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:16}} contentContainerStyle={{gap:6}}>
              {['All',...POST_TYPES].map(t=>(
                <TouchableOpacity key={t} style={chipStyle(filterType===t)} onPress={()=>setFilterType(t)} activeOpacity={0.8}>
                  <Text style={chipTextStyle(filterType===t)}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {loading ? <><Shimmer/><Shimmer/></> :
             filteredPosts.length===0 ? (
              <View style={{alignItems:'center',marginTop:60}}>
                <Text style={{fontFamily:CG300,fontSize:20,fontStyle:'italic',color:MUTED,marginBottom:8}}>No posts yet.</Text>
                <Text style={{fontFamily:DM300,fontSize:13,color:MUTED}}>Be the first to post a collab opportunity.</Text>
              </View>
            ) : filteredPosts.map(p=><PostCard key={p.id} post={p} onApply={()=>setApplyPost(p)}/>)}
          </>
        )}

        {activeTab==='mine' && (
          myPosts.length===0 ? (
            <View style={{alignItems:'center',marginTop:60}}>
              <Text style={{fontFamily:CG300,fontSize:20,fontStyle:'italic',color:MUTED,marginBottom:8}}>No posts yet.</Text>
              <Text style={{fontFamily:DM300,fontSize:13,color:MUTED}}>Post a collab opportunity to get started.</Text>
            </View>
          ) : myPosts.map(p=><PostCard key={p.id} post={p} isOwn onViewApps={()=>viewApplications(p)} onClose={()=>closePost(p.id)}/>)
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex:1, backgroundColor:BG },
  toast:   { position:'absolute', top:16, left:24, right:24, zIndex:100, backgroundColor:DARK, borderRadius:8, padding:12, alignItems:'center' },
  toastText: { fontFamily:DM300, fontSize:12, color:'#F8F7F5' },

  eyebrow:   { fontFamily:JOST200, fontSize:9, letterSpacing:2.2, textTransform:'uppercase', color:MUTED, marginBottom:4 },
  pageTitle: { fontFamily:CG300, fontSize:28, color:DARK },
  newBtn:    { height:36, backgroundColor:DARK, borderRadius:100, paddingHorizontal:16, alignItems:'center', justifyContent:'center' },
  newBtnText: { fontFamily:JOST, fontSize:9, letterSpacing:1.6, textTransform:'uppercase', color:'#F8F7F5' },

  chip:         { paddingHorizontal:12, paddingVertical:5, borderRadius:100, borderWidth:1, borderColor:BORDER },
  chipActive:   { backgroundColor:DARK, borderColor:DARK },
  chipText:     { fontFamily:JOST, fontSize:9, letterSpacing:1, textTransform:'uppercase', color:MUTED },
  chipTextActive: { color:'#F8F7F5' },

  sheetTitle: { fontFamily:CG300, fontSize:24, color:DARK, marginBottom:4 },
  fieldLabel: { fontFamily:JOST200, fontSize:8, letterSpacing:1.8, textTransform:'uppercase', color:MUTED, marginBottom:4 },
  fieldInput: { fontFamily:DM300, fontSize:13, color:DARK, borderBottomWidth:1, borderBottomColor:BORDER, paddingVertical:6, marginBottom:14 },

  primaryBtn:     { flex:1, height:36, backgroundColor:DARK, borderRadius:100, alignItems:'center', justifyContent:'center' },
  primaryBtnText: { fontFamily:JOST, fontSize:9, letterSpacing:1.4, textTransform:'uppercase', color:'#F8F7F5' },
  cancelBtn:      { height:36, paddingHorizontal:14, borderWidth:1, borderColor:BORDER, borderRadius:100, alignItems:'center', justifyContent:'center' },
  cancelBtnText:  { fontFamily:DM300, fontSize:13, color:MUTED },

  appCard:       { backgroundColor:BG, borderRadius:12, padding:12, marginBottom:8 },
  appStatus:     { paddingHorizontal:8, paddingVertical:2, borderRadius:100 },
  appStatusText: { fontFamily:JOST, fontSize:8, letterSpacing:1, textTransform:'uppercase' },

  logExpenseRow: { marginTop:8, backgroundColor:BG, borderWidth:0.5, borderColor:BORDER, borderRadius:10, padding:10, flexDirection:'row', alignItems:'center' },
  logBtn:        { height:28, backgroundColor:DARK, borderRadius:100, paddingHorizontal:12, alignItems:'center', justifyContent:'center', marginLeft:10 },
  logBtnText:    { fontFamily:JOST, fontSize:7, letterSpacing:1, textTransform:'uppercase', color:'#F8F7F5' },
});
