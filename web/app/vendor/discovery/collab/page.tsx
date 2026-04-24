'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

function getVendorSession() {
  if (typeof window==='undefined') return null;
  try { const r=localStorage.getItem('vendor_session')||localStorage.getItem('vendor_web_session'); return r?JSON.parse(r):null; } catch { return null; }
}
function fmtINR(n: number) { return '₹'+n.toLocaleString('en-IN'); }
function formatDate(d: string) { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }
function timeAgo(d: string) { const diff=Date.now()-new Date(d).getTime(); const h=Math.floor(diff/3600000); const dd=Math.floor(diff/86400000); if(h<1)return'Just now'; if(h<24)return`${h}h ago`; if(dd<7)return`${dd}d ago`; return formatDate(d); }

function Toast({ msg, onDone }: { msg: string; onDone:()=>void }) {
  useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t);},[onDone]);
  return <div style={{ position:'fixed', top:16, left:'50%', transform:'translateX(-50%)', background:'#111', color:'#F8F7F5', fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, padding:'10px 16px', borderRadius:8, zIndex:300, whiteSpace:'nowrap' }}>{msg}</div>;
}

function Shimmer({ h=60, br=12 }: { h?: number; br?: number }) {
  return <div style={{ height:h, borderRadius:br, background:'linear-gradient(90deg,#EEECE8 25%,#F8F7F5 50%,#EEECE8 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite', marginBottom:10 }}/>;
}

const POST_TYPES = ['Job','Equipment','Collab','Referral','Service'];
const TYPE_COLORS: Record<string,string> = { Job:'#3B82F6', Equipment:'#8B5CF6', Collab:'#C9A84C', Referral:'#10B981', Service:'#F59E0B' };

interface Post { id: string; vendor_id: string; title: string; description?: string; post_type: string; required_category?: string; city?: string; budget?: number; event_date?: string; status: string; created_at: string; application_count?: number; }
interface Application { id: string; post_id: string; applicant_vendor_id: string; message?: string; status: string; created_at: string; }

function PostCard({ post, isOwn, onApply, onViewApps, onClose }: { post: Post; isOwn?: boolean; onApply?: ()=>void; onViewApps?: ()=>void; onClose?: ()=>void; }) {
  const color = TYPE_COLORS[post.post_type] || '#888580';
  return (
    <div style={{ background:'#FFFFFF', border:'1px solid #E2DED8', borderRadius:14, padding:'14px 16px', marginBottom:10 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <span style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, letterSpacing:'0.12em', textTransform:'uppercase', padding:'2px 8px', borderRadius:100, background:`${color}15`, color }}>{post.post_type}</span>
            {post.city && <span style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888580' }}>{post.city}</span>}
          </div>
          <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:300, color:'#111', margin:'0 0 4px', lineHeight:1.2 }}>{post.title}</p>
          {post.description && <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#888580', margin:'0 0 8px', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{post.description}</p>}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {post.budget && <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#C9A84C' }}>{fmtINR(post.budget)}</span>}
            {post.event_date && <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#888580' }}>{formatDate(post.event_date)}</span>}
            {post.required_category && <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#888580' }}>{post.required_category}</span>}
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#888580' }}>{timeAgo(post.created_at)}</span>
          </div>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, marginTop:4 }}>
        {isOwn ? (
          <>
            <button onClick={onViewApps} style={{ flex:1, height:36, background:'#111', color:'#F8F7F5', border:'none', borderRadius:100, fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.15em', textTransform:'uppercase', cursor:'pointer' }}>
              Applications {post.application_count ? `(${post.application_count})` : ''}
            </button>
            <button onClick={onClose} style={{ height:36, padding:'0 14px', background:'transparent', border:'1px solid #E2DED8', borderRadius:100, fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.15em', textTransform:'uppercase', color:'#888580', cursor:'pointer' }}>Close</button>
          </>
        ) : (
          <button onClick={onApply} style={{ flex:1, height:36, background:'#111', color:'#F8F7F5', border:'none', borderRadius:100, fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.15em', textTransform:'uppercase', cursor:'pointer' }}>Apply</button>
        )}
      </div>
    </div>
  );
}

export default function CollabPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState('');
  const [activeTab, setActiveTab] = useState<'browse'|'mine'>('browse');
  const [posts, setPosts] = useState<Post[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Filters
  const [filterType, setFilterType] = useState('All');

  // New post sheet
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title:'', description:'', post_type:'Job', required_category:'', city:'', budget:'', event_date:'' });
  const [creating, setCreating] = useState(false);

  // Apply sheet
  const [applyPost, setApplyPost] = useState<Post|null>(null);
  const [applyMsg, setApplyMsg] = useState('');
  const [applying, setApplying] = useState(false);

  // Applications sheet
  const [viewPost, setViewPost] = useState<Post|null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  useEffect(()=>{
    const s=getVendorSession();
    if(!s?.vendorId&&!s?.id){router.replace('/vendor/login');return;}
    const vid=s.vendorId||s.id;
    setVendorId(vid);
    loadPosts(vid);
    loadMyPosts(vid);
  },[router]);

  async function loadPosts(vid: string) {
    setLoading(true);
    try {
      const r=await fetch(`${API}/api/v2/collab/posts?vendor_id=${vid}`);
      const d=await r.json();
      if(d.success) setPosts(d.data||[]);
    } catch {} finally { setLoading(false); }
  }

  async function loadMyPosts(vid: string) {
    try {
      const r=await fetch(`${API}/api/v2/collab/my-posts/${vid}`);
      const d=await r.json();
      if(d.success) setMyPosts(d.data||[]);
    } catch {}
  }

  async function createPost() {
    if (!form.title.trim()||creating) return;
    setCreating(true);
    try {
      const r=await fetch(`${API}/api/v2/collab/posts`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vendor_id:vendorId,...form,budget:form.budget?Number(form.budget):null})});
      const d=await r.json();
      if(d.success){setMyPosts(p=>[{...d.data,application_count:0},...p]);setShowNew(false);setForm({title:'',description:'',post_type:'Job',required_category:'',city:'',budget:'',event_date:''});setToast('Post created');setActiveTab('mine');}
      else setToast(d.error||'Error');
    } catch{setToast('Network error');} finally{setCreating(false);}
  }

  async function applyToPost() {
    if (!applyPost||applying) return;
    setApplying(true);
    try {
      const r=await fetch(`${API}/api/v2/collab/applications`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({post_id:applyPost.id,applicant_vendor_id:vendorId,message:applyMsg||null})});
      const d=await r.json();
      if(d.success){setApplyPost(null);setApplyMsg('');setToast('Application sent!');}
      else setToast(d.error||'Error');
    } catch{setToast('Network error');} finally{setApplying(false);}
  }

  async function viewApplications(post: Post) {
    setViewPost(post);setLoadingApps(true);
    try {
      const r=await fetch(`${API}/api/v2/collab/applications/${post.id}`);
      const d=await r.json();
      if(d.success) setApplications(d.data||[]);
    } catch {} finally{setLoadingApps(false);}
  }

  async function updateApplication(appId: string, status: string) {
    try {
      await fetch(`${API}/api/v2/collab/applications/${appId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,post_id:viewPost?.id,post_type:viewPost?.post_type?.toLowerCase()})});
      setApplications(p=>p.map(a=>a.id===appId?{...a,status}:a));
      setToast(status==='accepted'?'Application accepted':'Application rejected');
    } catch{setToast('Error');}
  }

  async function closePost(postId: string) {
    try {
      await fetch(`${API}/api/v2/collab/posts/${postId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'closed'})});
      setMyPosts(p=>p.map(post=>post.id===postId?{...post,status:'closed'}:post));
      setToast('Post closed');
    } catch{setToast('Error');}
  }

  const filteredPosts = filterType==='All' ? posts : posts.filter(p=>p.post_type===filterType);
  const lbl: React.CSSProperties = {fontFamily:"'Jost',sans-serif",fontSize:8,fontWeight:200,letterSpacing:'0.2em',textTransform:'uppercase',color:'#888580',display:'block',marginBottom:4};
  const fld: React.CSSProperties = {width:'100%',background:'transparent',border:'none',borderBottom:'1px solid #E2DED8',outline:'none',fontFamily:"'DM Sans',sans-serif",fontWeight:300,fontSize:13,color:'#111',padding:'6px 0',marginBottom:14};
  const chipStyle = (active: boolean): React.CSSProperties => ({ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.12em', textTransform:'uppercase', padding:'5px 12px', borderRadius:100, cursor:'pointer', border:'none', touchAction:'manipulation', background:active?'#111':'transparent', color:active?'#F8F7F5':'#888580', outline:active?'none':'1px solid #E2DED8' });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        *{box-sizing:border-box;} body{margin:0;background:#F8F7F5;} ::-webkit-scrollbar{display:none;}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>
      {toast&&<Toast msg={toast} onDone={()=>setToast('')}/>}

      {/* New post sheet */}
      {showNew&&(
        <>
          <div onClick={()=>setShowNew(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:400}}/>
          <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:401,background:'#FFFFFF',borderRadius:'16px 16px 0 0',padding:'20px 20px 0',maxHeight:'88vh',overflowY:'auto'}}>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:300,color:'#111',margin:'0 0 20px'}}>New Collab Post</p>
            <label style={lbl}>Post Type</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
              {POST_TYPES.map(t=><button key={t} onClick={()=>setForm(f=>({...f,post_type:t}))} style={{...chipStyle(form.post_type===t),fontSize:8}}>{t}</button>)}
            </div>
            <label style={lbl}>Title *</label>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={fld} placeholder="e.g. Looking for MUA for Sangeet"/>
            <label style={lbl}>Description</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3} style={{...fld,height:'auto',resize:'none',lineHeight:1.5}} placeholder="Details about the opportunity..."/>
            <label style={lbl}>Category Needed</label>
            <input value={form.required_category} onChange={e=>setForm(f=>({...f,required_category:e.target.value}))} style={fld} placeholder="e.g. Makeup Artist"/>
            <label style={lbl}>City</label>
            <input value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} style={fld} placeholder="e.g. Mumbai"/>
            <label style={lbl}>Budget (₹)</label>
            <input value={form.budget} onChange={e=>setForm(f=>({...f,budget:e.target.value}))} inputMode="numeric" style={fld} placeholder="Optional"/>
            <label style={lbl}>Event Date</label>
            <input type="date" value={form.event_date} onChange={e=>setForm(f=>({...f,event_date:e.target.value}))} style={fld}/>
            <div style={{display:'flex',gap:10,paddingBottom:'calc(20px + env(safe-area-inset-bottom))'}}>
              <button onClick={createPost} disabled={!form.title.trim()||creating} style={{flex:1,height:48,background:'#111',color:'#F8F7F5',border:'none',borderRadius:100,fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.18em',textTransform:'uppercase',cursor:'pointer',opacity:(!form.title.trim()||creating)?0.5:1}}>{creating?'Posting…':'Post'}</button>
              <button onClick={()=>setShowNew(false)} style={{background:'none',border:'none',fontFamily:"'DM Sans',sans-serif",fontSize:13,color:'#888580',cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* Apply sheet */}
      {applyPost&&(
        <>
          <div onClick={()=>setApplyPost(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:400}}/>
          <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:401,background:'#FFFFFF',borderRadius:'16px 16px 0 0',padding:'20px 20px 0'}}>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:300,color:'#111',margin:'0 0 4px'}}>Apply</p>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#888580',margin:'0 0 20px'}}>{applyPost.title}</p>
            <label style={lbl}>Message (optional)</label>
            <textarea value={applyMsg} onChange={e=>setApplyMsg(e.target.value)} rows={4} placeholder="Tell them why you're a great fit..." style={{...fld,height:'auto',resize:'none',lineHeight:1.5,marginBottom:20}}/>
            <div style={{display:'flex',gap:10,paddingBottom:'calc(20px + env(safe-area-inset-bottom))'}}>
              <button onClick={applyToPost} disabled={applying} style={{flex:1,height:48,background:'#111',color:'#F8F7F5',border:'none',borderRadius:100,fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.18em',textTransform:'uppercase',cursor:'pointer',opacity:applying?0.5:1}}>{applying?'Sending…':'Send Application'}</button>
              <button onClick={()=>setApplyPost(null)} style={{background:'none',border:'none',fontFamily:"'DM Sans',sans-serif",fontSize:13,color:'#888580',cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* Applications sheet */}
      {viewPost&&(
        <>
          <div onClick={()=>setViewPost(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:400}}/>
          <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:401,background:'#FFFFFF',borderRadius:'16px 16px 0 0',padding:'20px 20px 0',maxHeight:'80vh',display:'flex',flexDirection:'column'}}>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:300,color:'#111',margin:'0 0 4px'}}>Applications</p>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#888580',margin:'0 0 16px'}}>{viewPost.title}</p>
            <div style={{flex:1,overflowY:'auto',paddingBottom:'calc(16px + env(safe-area-inset-bottom))'}}>
              {loadingApps ? <Shimmer/> : applications.length===0 ? (
                <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:300,color:'#888580',textAlign:'center',marginTop:32,fontStyle:'italic'}}>No applications yet.</p>
              ) : applications.map(a=>(
                <div key={a.id} style={{background:'#F8F7F5',borderRadius:12,padding:'12px 14px',marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                    <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#111',margin:0}}>{a.applicant_vendor_id.slice(0,8)}…</p>
                    <span style={{fontFamily:"'Jost',sans-serif",fontSize:8,fontWeight:300,letterSpacing:'0.1em',textTransform:'uppercase',padding:'2px 8px',borderRadius:100,background:a.status==='accepted'?'#E8F5E9':a.status==='rejected'?'#FFEBEE':'#F4F1EC',color:a.status==='accepted'?'#4A7C59':a.status==='rejected'?'#9B4545':'#8C8480'}}>{a.status}</span>
                  </div>
                  {a.message&&<p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,color:'#888580',margin:'0 0 8px',lineHeight:1.4}}>{a.message}</p>}
                  {a.status==='pending'&&(
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>updateApplication(a.id,'accepted')} style={{flex:1,height:32,background:'#111',color:'#F8F7F5',border:'none',borderRadius:100,fontFamily:"'Jost',sans-serif",fontSize:8,fontWeight:300,letterSpacing:'0.12em',textTransform:'uppercase',cursor:'pointer'}}>Accept</button>
                      <button onClick={()=>updateApplication(a.id,'rejected')} style={{flex:1,height:32,background:'transparent',border:'1px solid #E2DED8',borderRadius:100,fontFamily:"'Jost',sans-serif",fontSize:8,fontWeight:300,letterSpacing:'0.12em',textTransform:'uppercase',color:'#888580',cursor:'pointer'}}>Decline</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div style={{padding:'24px 20px 100px'}}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:20}}>
          <div>
            <p style={{fontFamily:"'Jost',sans-serif",fontWeight:200,fontSize:9,color:'#888580',letterSpacing:'0.25em',textTransform:'uppercase',margin:'0 0 4px'}}>Discovery</p>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontWeight:300,fontSize:28,color:'#111',margin:0}}>Collab</p>
          </div>
          <button onClick={()=>setShowNew(true)} style={{height:36,background:'#111',color:'#F8F7F5',border:'none',borderRadius:100,padding:'0 16px',fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.18em',textTransform:'uppercase',cursor:'pointer'}}>+ Post</button>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          <button onClick={()=>setActiveTab('browse')} style={chipStyle(activeTab==='browse')}>Browse</button>
          <button onClick={()=>setActiveTab('mine')} style={chipStyle(activeTab==='mine')}>My Posts {myPosts.length>0?`(${myPosts.length})`:''}</button>
        </div>

        {activeTab==='browse' && (
          <>
            {/* Type filter */}
            <div style={{display:'flex',gap:6,overflowX:'auto',scrollbarWidth:'none',marginBottom:16,paddingBottom:2}}>
              {['All',...POST_TYPES].map(t=>(
                <button key={t} onClick={()=>setFilterType(t)} style={{...chipStyle(filterType===t),flexShrink:0,fontSize:8}}>{t}</button>
              ))}
            </div>

            {loading ? <><Shimmer h={100}/><Shimmer h={100}/></> :
             filteredPosts.length===0 ? (
              <div style={{textAlign:'center',marginTop:60}}>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:300,fontStyle:'italic',color:'#888580',margin:'0 0 8px'}}>No posts yet.</p>
                <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#888580',margin:0}}>Be the first to post a collab opportunity.</p>
              </div>
            ) : filteredPosts.map(p=>(
              <PostCard key={p.id} post={p} onApply={()=>setApplyPost(p)}/>
            ))}
          </>
        )}

        {activeTab==='mine' && (
          <>
            {myPosts.length===0 ? (
              <div style={{textAlign:'center',marginTop:60}}>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:300,fontStyle:'italic',color:'#888580',margin:'0 0 8px'}}>No posts yet.</p>
                <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#888580',margin:0}}>Post a collab opportunity to get started.</p>
              </div>
            ) : myPosts.map(p=>(
              <PostCard key={p.id} post={p} isOwn onViewApps={()=>viewApplications(p)} onClose={()=>closePost(p.id)}/>
            ))}
          </>
        )}
      </div>

      {/* Discovery bottom nav */}
      <nav style={{position:'fixed',bottom:0,left:0,right:0,background:'#F8F7F5',borderTop:'1px solid #E2DED8',display:'flex',alignItems:'center',justifyContent:'space-around',paddingBottom:'env(safe-area-inset-bottom)',zIndex:100}}>
        {[{key:'dash',label:'Dash',href:'/vendor/discovery/dash'},{key:'leads',label:'Leads',href:'/vendor/leads'},{key:'hub',label:'Image Hub',href:'/vendor/discovery/hub'},{key:'collab',label:'Collab',href:'/vendor/discovery/collab'}].map(item=>(
          <a key={item.key} href={item.href} style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'12px 10px',gap:4,textDecoration:'none'}}>
            <span style={{fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:item.key==='collab'?400:300,letterSpacing:'0.12em',textTransform:'uppercase',color:item.key==='collab'?'#111':'#888580'}}>{item.label}</span>
            {item.key==='collab'&&<span style={{width:4,height:4,borderRadius:'50%',background:'#C9A84C',display:'block'}}/>}
          </a>
        ))}
      </nav>
    </>
  );
}
