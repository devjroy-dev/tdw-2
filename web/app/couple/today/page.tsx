'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

interface HeroData { state: 'no_date'|'date_only'|'event'|'past'; days_until: number|null; event_name: string|null; wedding_date: string|null; }
interface Moment { type: string; priority: number; title: string; body: string; action: string; task_id?: string; enquiry_id?: string; expense_id?: string; event_id?: string; due_date?: string; amount?: number; event_name?: string; }
interface MuseSave { id: string; vendor_id: string; created_at: string; image_url?: string; source_url?: string; title?: string; vendor: { id: string; name: string; category: string; city?: string; featured_photos?: string[]; portfolio_images?: string[]; starting_price?: number; } | null; }
interface EventItem { id: string; event_name: string; event_date: string; venue?: string; }
interface Payment { id: string; vendor_name?: string; actual_amount?: number; due_date?: string; description?: string; }
interface QuietActivity { type: string; text: string; at: string; enquiry_id?: string; vendor_id?: string; vendor_name?: string; vendor_category?: string; from?: string; }
interface TodayData { hero: HeroData; three_moments: Moment[]; muse_saves: MuseSave[]; this_week_events: EventItem[]; upcoming_payments: Payment[]; budget: { total: number; committed: number; paid: number }; next_event: EventItem|null; quiet_activity: QuietActivity[]; priority_tasks: any[]; }
interface Session { id: string; name?: string; dreamer_type?: string; }
interface ChatMessage { role: 'user'|'ai'; text: string; actionType?: string; actionLabel?: string; actionPreview?: string; actionParams?: Record<string,any>; }

function getSession(): Session|null {
  if (typeof window === 'undefined') return null;
  try { const raw = localStorage.getItem('couple_session')||localStorage.getItem('couple_web_session'); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function numberToWords(n: number): string {
  if (n <= 0) return 'Zero';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');
  if (n < 1000) return ones[Math.floor(n/100)]+' hundred'+(n%100?' '+numberToWords(n%100):'');
  return ones[Math.floor(n/1000)]+' thousand'+(n%1000?' '+numberToWords(n%1000):'');
}

function formatDate(d: string) { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}); }
function formatShortDate(d: string) { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'}); }
function fmtINR(n: number) { return '₹'+n.toLocaleString('en-IN'); }
function timeAgo(dateStr: string) { const diff=Date.now()-new Date(dateStr).getTime(); const h=Math.floor(diff/3600000); const d=Math.floor(diff/86400000); if(h<1)return'Just now'; if(h<24)return`${h}h ago`; if(d<7)return`${d}d ago`; return formatShortDate(dateStr); }

function smartThumb(url: string, size: number = 400): string {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/c_fill,g_auto,w_${size},h_${size},q_auto/`);
}

function Shimmer({ h, w='100%', br=8 }: { h: number; w?: string|number; br?: number }) {
  return <div style={{ height:h, width:w, borderRadius:br, background:'linear-gradient(90deg,#EEECE8 25%,#F8F7F5 50%,#EEECE8 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }} />;
}

function Toast({ msg, onDone }: { msg: string|null; onDone: () => void }) {
  useEffect(() => { if (msg) { const t=setTimeout(onDone,3000); return ()=>clearTimeout(t); } },[msg,onDone]);
  if (!msg) return null;
  return <div style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', background:'#111', color:'#F8F7F5', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, padding:'10px 20px', borderRadius:100, zIndex:9999, whiteSpace:'nowrap' }}>{msg}</div>;
}

function parseActionTag(text: string) {
  const start = text.indexOf('[ACTION:');
  if (start === -1) return null;
  const end = text.lastIndexOf(']');
  if (end === -1 || end <= start) return null;
  const tagContent = text.slice(start + 8, end);
  const firstPipe = tagContent.indexOf('|');
  const secondPipe = tagContent.indexOf('|', firstPipe + 1);
  const lastBrace = tagContent.lastIndexOf('{');
  if (firstPipe === -1 || secondPipe === -1 || lastBrace === -1) return null;
  const type = tagContent.slice(0, firstPipe);
  const label = tagContent.slice(firstPipe + 1, secondPipe);
  const preview = tagContent.slice(secondPipe + 1, lastBrace - 1).trim();
  const paramsStr = tagContent.slice(lastBrace);
  let params: Record<string,any> = {};
  try { params = JSON.parse(paramsStr); } catch {}
  const cleanText = (text.slice(0, start) + text.slice(end + 1)).trim();
  return { type, label, preview, params, cleanText };
}

function CoupleActionCard({ msg, userId, onConfirm, onDismiss }: {
  msg: ChatMessage; userId: string;
  onConfirm: (result: string) => void; onDismiss: () => void;
}) {
  const [executing, setExecuting] = useState(false);
  const eps: Record<string, string> = {
    complete_task: '/api/v2/dreamai/action/complete-task',
    add_expense:   '/api/v2/dreamai/action/add-expense',
    send_whatsapp: '/api/v2/dreamai/action/send-whatsapp-reminder',
    send_enquiry:  '/api/v2/dreamai/action/send-enquiry',
  };
  async function execute() {
    if (!msg.actionType) return;
    const ep = eps[msg.actionType];
    if (!ep) { onConfirm('Action not available yet.'); return; }
    setExecuting(true);
    try {
      const r = await fetch(API + ep, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_id: userId, ...(msg.actionParams || {}) }),
      });
      const d = await r.json();
      onConfirm(d.message || 'Done.');
    } catch { onConfirm('Could not complete. Please try again.'); }
    finally { setExecuting(false); }
  }
  return (
    <div style={{ background: '#FFFEF8', border: '1px solid #C9A84C', borderRadius: 12, padding: '12px 14px', margin: '4px 0 8px' }}>
      <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 7, fontWeight: 200, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: '#C9A84C', margin: '0 0 6px' }}>✦ Action Preview</p>
      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#111', margin: '0 0 12px', lineHeight: 1.5 }}>{msg.actionPreview}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={execute} disabled={executing} style={{ flex: 1, height: 36, background: '#C9A84C', border: 'none', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#111', cursor: 'pointer' }}>
          {executing ? '...' : 'Confirm'}
        </button>
        <button onClick={onDismiss} style={{ height: 36, padding: '0 14px', background: 'transparent', border: '0.5px solid #E2DED8', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, color: '#888580', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

// Add Expense Sheet
function AddExpenseSheet({ visible, onClose, userId, onDone }: { visible: boolean; onClose: ()=>void; userId: string; onDone: ()=>void; }) {
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Venue');
  const [saving, setSaving] = useState(false);
  const categories = ['Venue','Catering','Photography','MUA','Decor','Attire','Music','Transport','Honeymoon','Other'];
  async function save() {
    if (!vendor.trim() || !amount) return;
    setSaving(true);
    try {
      await fetch(`${API}/api/couple/expenses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_id: userId, vendor_name: vendor.trim(), actual_amount: parseFloat(amount), category, payment_status: 'committed', event: 'General' }),
      });
      onDone(); onClose(); setVendor(''); setAmount(''); setCategory('Venue');
    } catch {} finally { setSaving(false); }
  }
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(17,17,17,0.4)', opacity:visible?1:0, pointerEvents:visible?'auto':'none', transition:'opacity 280ms' }} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:301, background:'#FFFFFF', borderRadius:'24px 24px 0 0', transform:visible?'translateY(0)':'translateY(100%)', transition:'transform 320ms cubic-bezier(0.22,1,0.36,1)', padding:'20px 20px calc(20px + env(safe-area-inset-bottom))' }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}><div style={{ width:36, height:4, borderRadius:2, background:'#E2DED8' }} /></div>
        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:300, color:'#111', margin:'0 0 20px' }}>Add Expense</p>
        <label style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.15em', textTransform:'uppercase', color:'#888580', display:'block', marginBottom:6 }}>Vendor / Description</label>
        <input value={vendor} onChange={e=>setVendor(e.target.value)} placeholder="e.g. Swati Roy MUA" style={{ width:'100%', boxSizing:'border-box', height:44, borderRadius:10, border:'0.5px solid #E2DED8', background:'#F8F7F5', fontFamily:"'DM Sans',sans-serif", fontSize:14, color:'#111', padding:'0 14px', outline:'none', marginBottom:14 }} />
        <label style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.15em', textTransform:'uppercase', color:'#888580', display:'block', marginBottom:6 }}>Amount (₹)</label>
        <input value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))} placeholder="0" type="tel" style={{ width:'100%', boxSizing:'border-box', height:44, borderRadius:10, border:'0.5px solid #E2DED8', background:'#F8F7F5', fontFamily:"'DM Sans',sans-serif", fontSize:14, color:'#111', padding:'0 14px', outline:'none', marginBottom:14 }} />
        <label style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.15em', textTransform:'uppercase', color:'#888580', display:'block', marginBottom:8 }}>Category</label>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
          {categories.map(c=>(
            <button key={c} onClick={()=>setCategory(c)} style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.1em', textTransform:'uppercase', padding:'6px 12px', borderRadius:100, border:`0.5px solid ${category===c?'#C9A84C':'#E2DED8'}`, background:category===c?'#C9A84C':'transparent', color:category===c?'#111':'#888580', cursor:'pointer' }}>{c}</button>
          ))}
        </div>
        <button onClick={save} disabled={saving||!vendor.trim()||!amount} style={{ width:'100%', height:48, borderRadius:100, background:vendor.trim()&&amount?'#111':'#E2DED8', color:vendor.trim()&&amount?'#F8F7F5':'#888580', border:'none', fontFamily:"'Jost',sans-serif", fontSize:11, fontWeight:400, letterSpacing:'0.15em', textTransform:'uppercase', cursor:vendor.trim()&&amount?'pointer':'not-allowed' }}>{saving?'Saving…':'Save Expense'}</button>
      </div>
    </>
  );
}

// Add Task Sheet
function AddTaskSheet({ visible, onClose, userId, onDone }: { visible: boolean; onClose: ()=>void; userId: string; onDone: ()=>void; }) {
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API}/api/couple/checklist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_id: userId, text: text.trim(), due_date: dueDate || null, is_complete: false }),
      });
      onDone(); onClose(); setText(''); setDueDate('');
    } catch {} finally { setSaving(false); }
  }
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(17,17,17,0.4)', opacity:visible?1:0, pointerEvents:visible?'auto':'none', transition:'opacity 280ms' }} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:301, background:'#FFFFFF', borderRadius:'24px 24px 0 0', transform:visible?'translateY(0)':'translateY(100%)', transition:'transform 320ms cubic-bezier(0.22,1,0.36,1)', padding:'20px 20px calc(20px + env(safe-area-inset-bottom))' }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}><div style={{ width:36, height:4, borderRadius:2, background:'#E2DED8' }} /></div>
        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:300, color:'#111', margin:'0 0 20px' }}>Add Task</p>
        <label style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.15em', textTransform:'uppercase', color:'#888580', display:'block', marginBottom:6 }}>Task</label>
        <input value={text} onChange={e=>setText(e.target.value)} placeholder="e.g. Confirm mehendi artist" autoFocus style={{ width:'100%', boxSizing:'border-box', height:44, borderRadius:10, border:'0.5px solid #E2DED8', background:'#F8F7F5', fontFamily:"'DM Sans',sans-serif", fontSize:14, color:'#111', padding:'0 14px', outline:'none', marginBottom:14 }} />
        <label style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.15em', textTransform:'uppercase', color:'#888580', display:'block', marginBottom:6 }}>Due date (optional)</label>
        <input value={dueDate} onChange={e=>setDueDate(e.target.value)} type="date" style={{ width:'100%', boxSizing:'border-box', height:44, borderRadius:10, border:'0.5px solid #E2DED8', background:'#F8F7F5', fontFamily:"'DM Sans',sans-serif", fontSize:14, color:'#111', padding:'0 14px', outline:'none', marginBottom:20 }} />
        <button onClick={save} disabled={saving||!text.trim()} style={{ width:'100%', height:48, borderRadius:100, background:text.trim()?'#111':'#E2DED8', color:text.trim()?'#F8F7F5':'#888580', border:'none', fontFamily:"'Jost',sans-serif", fontSize:11, fontWeight:400, letterSpacing:'0.15em', textTransform:'uppercase', cursor:text.trim()?'pointer':'not-allowed' }}>{saving?'Saving…':'Add Task'}</button>
      </div>
    </>
  );
}

// Add to Muse Sheet — link paste + camera/gallery upload
function AddMuseSheet({ visible, onClose, userId, onDone }: { visible: boolean; onClose: ()=>void; userId: string; onDone: ()=>void; }) {
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) { setTimeout(() => inputRef.current?.focus(), 320); setSaved(false); setUrl(''); }
  }, [visible]);

  async function saveLink() {
    if (!url.trim() || saving) return;
    setSaving(true);
    try {
      const ogRes = await fetch(`${API}/api/v2/couple/muse`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, source_url: url.trim() }),
      });
      const d = await ogRes.json();
      if (!d.success) throw new Error(d.error);
      setSaved(true);
      setTimeout(() => { onDone(); onClose(); setSaved(false); setUrl(''); }, 1000);
    } catch {} finally { setSaving(false); }
  }

  async function handleImageUpload(file: File) {
    if (uploading) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'dream_wedding_uploads');
      const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dccso5ljv/image/upload', { method: 'POST', body: formData });
      const cloudJson = await cloudRes.json();
      const imageUrl = cloudJson.secure_url;
      if (!imageUrl) throw new Error('Upload failed');
      // Use backend endpoint to insert
      const res = await fetch(`${API}/api/v2/couple/muse-image`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, image_url: imageUrl }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setSaved(true);
      setTimeout(() => { onDone(); onClose(); setSaved(false); }, 1000);
    } catch {} finally { setUploading(false); }
  }

  const busy = saving || uploading;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(17,17,17,0.3)', opacity:visible?1:0, pointerEvents:visible?'auto':'none', transition:'opacity 280ms' }} />
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:301,
        background:'#FFFFFF', borderRadius:'20px 20px 0 0',
        transform:visible?'translateY(0)':'translateY(100%)',
        transition:'transform 320ms cubic-bezier(0.22,1,0.36,1)',
        padding:'16px 16px calc(20px + env(safe-area-inset-bottom))',
      }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
          <div style={{ width:32, height:4, borderRadius:2, background:'#E2DED8' }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <span style={{ fontSize:14, color:'#C9A84C' }}>✦</span>
          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:300, color:'#111' }}>Save to Muse</span>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', color:'#C8C4BE', fontSize:13, cursor:'pointer', padding:4 }}>✕</button>
        </div>

        {/* Link input row */}
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
          <input
            ref={inputRef}
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveLink()}
            placeholder="Paste Instagram, Pinterest or any link…"
            style={{
              flex:1, height:44, borderRadius:22,
              border:'0.5px solid #E2DED8', background:'#F8F7F5',
              fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300,
              color:'#111', padding:'0 16px', outline:'none',
            }}
          />
          <button
            onClick={saveLink}
            disabled={busy || !url.trim()}
            style={{
              width:44, height:44, borderRadius:'50%', flexShrink:0,
              background: saved ? '#4CAF50' : url.trim() ? '#C9A84C' : '#E2DED8',
              border:'none', cursor: url.trim() && !busy ? 'pointer' : 'default',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'background 0.2s',
            }}
          >
            <span style={{ color:'#FFF', fontSize:16 }}>{saved ? '✓' : saving ? '…' : '↑'}</span>
          </button>
        </div>

        {/* Divider */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <div style={{ flex:1, height:'0.5px', background:'#E2DED8' }} />
          <span style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.15em', textTransform:'uppercase', color:'#C8C4BE' }}>or upload</span>
          <div style={{ flex:1, height:'0.5px', background:'#E2DED8' }} />
        </div>

        {/* Camera + Gallery buttons */}
        <div style={{ display:'flex', gap:10 }}>
          <label style={{ flex:1, cursor: busy ? 'not-allowed' : 'pointer' }}>
            <input type="file" accept="image/*" capture="environment" style={{ display:'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }} />
            <div style={{
              height:44, borderRadius:22, border:'0.5px solid #E2DED8',
              background:'#F8F7F5', display:'flex', alignItems:'center',
              justifyContent:'center', gap:8,
              opacity: busy ? 0.5 : 1,
            }}>
              <span style={{ fontSize:16 }}>{uploading ? '⏳' : '📸'}</span>
              <span style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.12em', textTransform:'uppercase', color:'#888580' }}>Camera</span>
            </div>
          </label>
          <label style={{ flex:1, cursor: busy ? 'not-allowed' : 'pointer' }}>
            <input type="file" accept="image/*" style={{ display:'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }} />
            <div style={{
              height:44, borderRadius:22, border:'0.5px solid #E2DED8',
              background:'#F8F7F5', display:'flex', alignItems:'center',
              justifyContent:'center', gap:8,
              opacity: busy ? 0.5 : 1,
            }}>
              <span style={{ fontSize:16 }}>{uploading ? '⏳' : '🖼️'}</span>
              <span style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.12em', textTransform:'uppercase', color:'#888580' }}>Gallery</span>
            </div>
          </label>
        </div>
      </div>
    </>
  );
}

// Directive 3.3 — Grace token slide-in card (NEVER use debt language)
function GraceCard({ graceUsed, onTopUp, onDismiss }: { graceUsed: number; onTopUp: () => void; onDismiss: () => void; }) {
  return (
    <div style={{ position:'fixed', bottom:90, left:16, right:16, zIndex:310, background:'#111111', borderRadius:16, border:'0.5px solid rgba(201,168,76,0.3)', padding:'20px 20px 16px', boxShadow:'0 8px 32px rgba(0,0,0,0.24)', animation:'slideUp 320ms cubic-bezier(0.22,1,0.36,1)' }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <span style={{ color:'#C9A84C', fontSize:18 }}>✦</span>
        <div style={{ flex:1 }}>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#F8F7F5', margin:'0 0 4px', lineHeight:1.5 }}>You used {graceUsed} token{graceUsed !== 1 ? 's' : ''} of grace this week.</p>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'rgba(248,247,245,0.5)', margin:0, lineHeight:1.5 }}>They refresh on the 1st. Or top up if you'd like more.</p>
        </div>
      </div>
      <div style={{ display:'flex', gap:10, marginTop:16, alignItems:'center' }}>
        <button onClick={onTopUp} style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:400, letterSpacing:'0.18em', textTransform:'uppercase', background:'#C9A84C', color:'#0C0A09', border:'none', borderRadius:100, padding:'8px 18px', cursor:'pointer', touchAction:'manipulation' }}>Top up ₹100</button>
        <button onClick={onDismiss} style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(248,247,245,0.35)', background:'none', border:'none', cursor:'pointer' }}>No worries</button>
      </div>
    </div>
  );
}

// Directive 3.4 — Behavior-triggered upgrade prompt
function UpgradePrompt({ currentTier, onUpgrade, onDismiss }: { currentTier: string; onUpgrade: () => void; onDismiss: () => void; }) {
  const isLite = currentTier === 'lite';
  return (
    <div style={{ position:'fixed', bottom:90, left:16, right:16, zIndex:309, background:'#F8F7F5', borderRadius:16, border:'0.5px solid #C9A84C', padding:'20px 20px 16px', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', animation:'slideUp 320ms cubic-bezier(0.22,1,0.36,1)' }}>
      <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:300, color:'#111111', margin:'0 0 6px' }}>{isLite ? "You're using TDW like a Signature bride." : "You're using TDW like a Platinum bride."}</p>
      <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#888580', margin:'0 0 16px', lineHeight:1.5 }}>{isLite ? "Upgrade for 8x DreamAi capacity. ₹999 lifetime, no recurring charge." : "Upgrade for 50x DreamAi capacity + Couture access + Lock Date. ₹2,999 lifetime."}</p>
      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
        <button onClick={onUpgrade} style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:400, letterSpacing:'0.18em', textTransform:'uppercase', background:'#111111', color:'#F8F7F5', border:'none', borderRadius:100, padding:'8px 18px', cursor:'pointer', touchAction:'manipulation' }}>Upgrade Now</button>
        <button onClick={onDismiss} style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.12em', textTransform:'uppercase', color:'#888580', background:'none', border:'none', cursor:'pointer' }}>Maybe later</button>
      </div>
    </div>
  );
}

function DreamAiSheet({ visible, onClose, context, userId, prefill }: { visible: boolean; onClose: ()=>void; context: any; userId: string; prefill?: string; }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number|null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Directive 2.2 — Check if tutorial has been seen on first open
  useEffect(() => {
    if (visible) {
      const seen = localStorage.getItem('dreamai_tutorial_seen');
      if (!seen && tutorialStep === null) setTutorialStep(0);
    }
  }, [visible]);

  const TUTORIAL_EXAMPLES = [
    { icon: '📋', text: 'Show me my pending tasks' },
    { icon: '💰', text: 'Am I over budget?' },
    { icon: '📸', text: 'Find me a photographer in Delhi under 3 lakh' },
    { icon: '💾', text: 'Save this Pinterest link to my Muse' },
    { icon: '👥', text: 'Add Priya Sharma to my guest list' },
  ];

  function completeTutorial(makeHome: boolean) {
    localStorage.setItem('dreamai_tutorial_seen', '1');
    if (makeHome) localStorage.setItem('couple_default_home', 'dreamai');
    setTutorialStep(null);
  }

  useEffect(() => { if (visible && prefill) setInput(prefill); },[visible,prefill]);

  async function handleImageUpload(file: File) {
    if (uploadingImage || loading) return;
    setUploadingImage(true);
    setMessages(p => [...p, { role: 'user', text: '📷 Image' }]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'dream_wedding_uploads');
      const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dccso5ljv/image/upload', { method: 'POST', body: formData });
      const cloudJson = await cloudRes.json();
      const imageUrl = cloudJson.secure_url;
      if (!imageUrl) throw new Error('Upload failed');
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const r = await fetch(`${API}/api/v2/dreamai/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, userType: 'couple', context, history: messages.slice(-10),
          image_base64: base64, image_media_type: file.type || 'image/jpeg',
          message: `I sent an image. The uploaded URL is: ${imageUrl}. If it looks like a receipt or invoice, log it as an expense using add_expense. If it looks like wedding inspiration, save it to my Muse board using save_to_muse with source_url set to "${imageUrl}".`,
        }),
      });
      const d = await r.json();
      setMessages(p => [...p, { role: 'ai', text: d.reply || 'Image processed!' }]);
    } catch {
      setMessages(p => [...p, { role: 'ai', text: 'Could not process image.' }]);
    } finally { setUploadingImage(false); }
  }
  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[messages,loading]);

  async function send(text: string) {
    const msg = text.trim(); if (!msg || loading) return;
    setInput(''); setMessages(p => [...p, { role: 'user', text: msg }]); setLoading(true);
    try {
      const res = await fetch(`${API}/api/v2/dreamai/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userType: 'couple', message: msg, context, history: messages.slice(-10) }),
      });
      const json = await res.json();
      const replyText = json.reply || 'Something went wrong.';
      const parsed = parseActionTag(replyText);
      const cleanText = parsed ? parsed.cleanText : replyText.replace(/\[ACTION:[^\]]*\]/g, '').trim();
      if (parsed) {
        setMessages(p => [...p, { role: 'ai', text: cleanText, actionType: parsed.type, actionLabel: parsed.label, actionPreview: parsed.preview, actionParams: parsed.params }]);
      } else {
        setMessages(p => [...p, { role: 'ai', text: cleanText }]);
      }
    } catch { setMessages(p => [...p, { role: 'ai', text: 'Unable to reach DreamAi.' }]); }
    finally { setLoading(false); }
  }

  const s: React.CSSProperties = { position:'fixed', inset:0, zIndex:300 };
  return (
    <>
      <div onClick={onClose} style={{ ...s, background:'rgba(17,17,17,0.4)', opacity:visible?1:0, pointerEvents:visible?'auto':'none', transition:'opacity 280ms cubic-bezier(0.22,1,0.36,1)' }} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:301, height:'92dvh', background:'#FFFFFF', borderRadius:'24px 24px 0 0', transform:visible?'translateY(0)':'translateY(100%)', transition:'transform 320ms cubic-bezier(0.22,1,0.36,1)', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 4px' }}><div style={{ width:36, height:4, borderRadius:2, background:'#E2DED8' }} /></div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 20px 12px', borderBottom:'0.5px solid #E2DED8' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}><span style={{ fontSize:16 }}>✦</span><span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:300, color:'#111' }}>DreamAi</span></div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#888580', fontSize:13, padding:4 }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'8px 20px 16px' }}>
          {/* Directive 2.2 — Tutorial overlay */}
          {tutorialStep !== null && (
            <div style={{ position:'absolute', inset:0, background:'rgba(248,247,245,0.97)', zIndex:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px', borderRadius:'24px 24px 0 0' }}>
              {tutorialStep === 0 && (
                <div style={{ textAlign:'center', maxWidth:300 }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, color:'#C9A84C', marginBottom:16 }}>✦</div>
                  <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:300, color:'#111', margin:'0 0 12px', lineHeight:1.3 }}>This is DreamAi.</p>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#888580', margin:'0 0 28px', lineHeight:1.6 }}>Tell it what you need. It can take actions, answer questions, and help you plan — all in plain language.</p>
                  <button onClick={() => setTutorialStep(1)} style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:400, letterSpacing:'0.2em', textTransform:'uppercase', background:'#111', color:'#F8F7F5', border:'none', borderRadius:100, padding:'10px 24px', cursor:'pointer', touchAction:'manipulation', marginBottom:12 }}>Show me what it can do →</button>
                  <button onClick={() => completeTutorial(false)} style={{ display:'block', margin:'0 auto', fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, letterSpacing:'0.15em', textTransform:'uppercase', color:'#C0BCB6', background:'none', border:'none', cursor:'pointer' }}>Skip</button>
                </div>
              )}
              {tutorialStep === 1 && (
                <div style={{ width:'100%', maxWidth:340 }}>
                  <p style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, letterSpacing:'0.2em', textTransform:'uppercase', color:'#C0BCB6', margin:'0 0 16px', textAlign:'center' }}>Try saying any of these</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
                    {TUTORIAL_EXAMPLES.map((ex, i) => (
                      <div key={i} style={{ background:'#F8F7F5', border:'0.5px solid #E2DED8', borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:16 }}>{ex.icon}</span>
                        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#111', lineHeight:1.4 }}>{ex.text}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setTutorialStep(2)} style={{ width:'100%', fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:400, letterSpacing:'0.2em', textTransform:'uppercase', background:'#111', color:'#F8F7F5', border:'none', borderRadius:100, padding:'10px 24px', cursor:'pointer', touchAction:'manipulation' }}>Got it →</button>
                </div>
              )}
              {tutorialStep === 2 && (
                <div style={{ textAlign:'center', maxWidth:300 }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, color:'#C9A84C', marginBottom:16 }}>✦</div>
                  <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:300, color:'#111', margin:'0 0 10px' }}>Make DreamAi your home screen?</p>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#888580', margin:'0 0 24px', lineHeight:1.6 }}>Open to DreamAi every time you launch TDW.</p>
                  <button onClick={() => completeTutorial(true)} style={{ display:'block', width:'100%', marginBottom:10, fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:400, letterSpacing:'0.2em', textTransform:'uppercase', background:'#C9A84C', color:'#0C0A09', border:'none', borderRadius:100, padding:'10px 24px', cursor:'pointer', touchAction:'manipulation' }}>Yes, make it home</button>
                  <button onClick={() => completeTutorial(false)} style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, letterSpacing:'0.15em', textTransform:'uppercase', color:'#C0BCB6', background:'none', border:'none', cursor:'pointer' }}>Maybe later</button>
                </div>
              )}
            </div>
          )}
          {messages.length===0 && tutorialStep === null && <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:300, fontStyle:'italic', color:'#888580', textAlign:'center', marginTop:48 }}>Ask anything about your wedding.</p>}
          {messages.map((m,i)=>(
            <div key={i} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
                <div style={{ maxWidth:'80%', background:m.role==='user'?'#FFFFFF':'#F8F7F5', border:m.role==='user'?'0.5px solid #C9A84C':'0.5px solid #E2DED8', borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', padding:'10px 14px' }}>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:300, color:'#111', margin:0, lineHeight:1.5 }}>{m.text}</p>
                </div>
              </div>
              {m.role==='ai' && m.actionType && !dismissed.has(i) && (
                <CoupleActionCard
                  msg={m} userId={userId}
                  onConfirm={(result) => { setMessages(p => [...p, { role: 'ai', text: result }]); setDismissed(d => new Set(d).add(i)); }}
                  onDismiss={() => setDismissed(d => new Set(d).add(i))}
                />
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:12 }}>
              <div style={{ background:'#F8F7F5', border:'0.5px solid #E2DED8', borderRadius:'16px 16px 16px 4px', padding:'12px 18px', display:'flex', gap:5, alignItems:'center' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#888580', animation:`typingDot 1.2s ease-in-out ${i*0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ display:'flex', gap:8, padding:'12px 16px', borderTop:'0.5px solid #E2DED8', paddingBottom:'calc(12px + env(safe-area-inset-bottom))', background:'#FFFFFF', alignItems:'center' }}>
          {uploadingImage ? (
            <div style={{ width:40, height:40, borderRadius:'50%', background:'#F4F1EC', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:16 }}>⏳</span>
            </div>
          ) : (
            <>
              <label style={{ flexShrink:0, cursor:'pointer' }}>
                <input type="file" accept="image/*" capture="environment" style={{ display:'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }} />
                <div style={{ width:40, height:40, borderRadius:'50%', background:'#F4F1EC', border:'0.5px solid #E2DED8', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:15 }}>📸</span>
                </div>
              </label>
              <label style={{ flexShrink:0, cursor:'pointer' }}>
                <input type="file" accept="image/*" style={{ display:'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }} />
                <div style={{ width:40, height:40, borderRadius:'50%', background:'#F4F1EC', border:'0.5px solid #E2DED8', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:15 }}>🖼️</span>
                </div>
              </label>
            </>
          )}
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send(input);}} placeholder="Ask anything about your wedding..." style={{ flex:1, height:44, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:300, color:'#111', background:'#F8F7F5', border:'0.5px solid #E2DED8', borderRadius:22, padding:'0 16px', outline:'none' }} />
          <button onClick={()=>send(input)} disabled={loading||!input.trim()} style={{ width:44, height:44, borderRadius:'50%', background:input.trim()?'#C9A84C':'#E2DED8', border:'none', cursor:input.trim()?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><span style={{ color:'#FFF', fontSize:16 }}>↑</span></button>
        </div>
      </div>
    </>
  );
}

function MomentCard({ moment, onAction }: { moment: Moment; onAction: (m: Moment)=>void; }) {
  const accent = moment.priority <= 1 ? '#C9A84C' : '#8C8480';
  return (
    <div style={{ background:'#FFFFFF', border:'0.5px solid #E2DED8', borderLeft:`3px solid ${accent}`, borderRadius:'0 12px 12px 0', padding:16, marginBottom:10 }}>
      <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.2em', textTransform:'uppercase', color:accent, margin:'0 0 6px' }}>{moment.title}</p>
      <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:300, color:'#111', margin:'0 0 12px', lineHeight:1.3 }}>{moment.body}</p>
      <button onClick={()=>onAction(moment)} style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:400, letterSpacing:'0.15em', textTransform:'uppercase', color:'#F8F7F5', background:'#111', border:'none', borderRadius:100, padding:'7px 14px', cursor:'pointer', touchAction:'manipulation' }}>{moment.action}</button>
    </div>
  );
}

function CircleActivity({ coupleId }: { coupleId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  useEffect(() => {
    if (!coupleId) return;
    fetch(`${API}/api/circle/messages/${coupleId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data?.length > 0) {
          setMessages(d.data.slice(-2).reverse());
        }
      })
      .catch(() => {});
  }, [coupleId]);
  if (messages.length === 0) return null;
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.25em', textTransform:'uppercase', color:'#C8C4BE', margin:0 }}>From Your Circle</p>
        <a href="/couple/circle" style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, letterSpacing:'0.12em', textTransform:'uppercase', color:'#888580', textDecoration:'none' }}>Open Circle →</a>
      </div>
      {messages.map((m, i) => (
        <div key={m.id || i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 0', borderBottom: i < messages.length - 1 ? '0.5px solid #E2DED8' : 'none' }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'#F0EDE8', border:'0.5px solid #E2DED8', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:12, color:'#888580' }}>{m.sender_name?.[0]?.toUpperCase() || '◎'}</span>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
              <span style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:400, letterSpacing:'0.08em', textTransform:'uppercase', color:'#555250' }}>{m.sender_name || 'Circle'}</span>
              <span style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, color:'#C8C4BE' }}>{timeAgo(m.created_at)}</span>
            </div>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#3C3835', margin:0, lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TodayPage() {
  const [session, setSession] = useState<Session|null>(null);
  const [data, setData] = useState<TodayData|null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string|null>(null);
  const [dreamAiOpen, setDreamAiOpen] = useState(false);
  const [dreamAiPrefill, setDreamAiPrefill] = useState('');
  const [dreamAiContext, setDreamAiContext] = useState<any>(null);
  const [showGraceCard, setShowGraceCard] = useState(false);
  const [graceUsed, setGraceUsed] = useState(0);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [sessionPromptShown, setSessionPromptShown] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addMuseOpen, setAddMuseOpen] = useState(false);
  const showToast = useCallback((msg: string) => setToast(msg), []);
  const router = useRouter();

  useEffect(() => {
    try {
      const s=getSession();
      if(!s?.id){window.location.replace('/couple/login');return;}
      setSession(s);
      // Directive 2.1: Open DreamAi if set as default home (only on fresh app launch)
      const isInSession = sessionStorage.getItem('couple_session_active');
      if (!isInSession && localStorage.getItem('couple_default_home') === 'dreamai') {
        setDreamAiOpen(true);
      }
      const isInSession = sessionStorage.getItem('couple_session_active');
      if (!isInSession) {
        sessionStorage.setItem('couple_session_active', '1');
        const lastPath = localStorage.getItem('couple_last_path');
        const currentPath = window.location.pathname;
        const VALID_PLAN_RESTORE_PATHS = [
          '/couple/plan', '/couple/me', '/couple/messages',
          '/couple/muse', '/couple/bespoke', '/couple/circle',
        ];
        if (lastPath && lastPath !== currentPath && VALID_PLAN_RESTORE_PATHS.some(p => lastPath.startsWith(p))) {
          router.replace(lastPath);
          return;
        }
      }
    } catch { window.location.replace('/couple/login'); }
  },[router]);

  useEffect(() => {
    if (!session) return;
    fetch(`${API}/api/v2/couple/today/${session.id}`).then(r=>r.json()).then(json=>{setData(json);setLoading(false);}).catch(()=>{showToast('Could not load your dashboard.');setLoading(false);});
  },[session,showToast]);

  useEffect(() => {
    if (!session) return;
    fetch(`${API}/api/v2/dreamai/couple-context/${session.id}`).then(r=>r.json()).then(setDreamAiContext).catch(()=>{});
  },[session]);

  async function completeTask(taskId: string) {
    setCompletedIds(p=>new Set([...p,taskId]));
    try { await fetch(`${API}/api/v2/couple/tasks/${taskId}/complete`,{method:'PATCH'}); } catch {}
  }

  function handleMomentAction(m: Moment) {
    if (m.task_id) { completeTask(m.task_id); showToast('Task marked done'); return; }
    if (m.enquiry_id) { window.location.href=`/couple/messages?thread=${m.enquiry_id}`; return; }
    if (m.expense_id) { window.location.href='/couple/plan'; return; }
    if (m.event_name) { window.location.href='/couple/discover/hub'; return; }
  }

  function openDreamAi(prefill?: string) { setDreamAiPrefill(prefill||''); setDreamAiOpen(true); }

  function refreshData() {
    if (!session) return;
    fetch(`${API}/api/v2/couple/today/${session.id}`).then(r=>r.json()).then(setData).catch(()=>{});
  }

  const moments = (data?.three_moments||[]).filter(m=>!m.task_id||!completedIds.has(m.task_id!));
  const budget = data?.budget;
  const budgetPct = budget?.total ? Math.min(100, Math.round((budget.committed / budget.total) * 100)) : 0;
  const paidPct = budget?.total ? Math.min(100, Math.round((budget.paid / budget.total) * 100)) : 0;

  // Quick actions config
  const quickActions = [
    { label: '+ Expense', icon: '₹', onTap: () => setAddExpenseOpen(true), coming: false },
    { label: '+ Task', icon: '✓', onTap: () => setAddTaskOpen(true), coming: false },
    { label: 'Family', icon: '◎', onTap: () => router.push('/couple/circle'), coming: false },
    { label: '+ Muse', icon: '✦', onTap: () => setAddMuseOpen(true), coming: false },
    { label: 'Find Makers', icon: '⌕', onTap: () => {}, coming: true },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        *{box-sizing:border-box;} html,body{margin:0;padding:0;background:#F8F7F5;}
        ::-webkit-scrollbar{display:none;}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes typingDot{0%,80%,100%{opacity:0.2;transform:scale(0.8)}40%{opacity:1;transform:scale(1)}}
        .fade-in{animation:fadeIn 320ms cubic-bezier(0.22,1,0.36,1) both;}
      `}</style>

      <Toast msg={toast} onDone={()=>setToast(null)} />
      <DreamAiSheet visible={dreamAiOpen} onClose={()=>setDreamAiOpen(false)} context={dreamAiContext} userId={session?.id||''} prefill={dreamAiPrefill} />
      {showGraceCard && (
        <GraceCard graceUsed={graceUsed}
          onTopUp={() => { setShowGraceCard(false); router.push('/couple/me'); }}
          onDismiss={() => setShowGraceCard(false)} />
      )}
      {showUpgradePrompt && !showGraceCard && (
        <UpgradePrompt currentTier={session?.couple_tier || 'lite'}
          onUpgrade={() => { setShowUpgradePrompt(false); router.push('/couple/me'); }}
          onDismiss={() => {
            setShowUpgradePrompt(false);
            localStorage.setItem('upgrade_prompt_dismissed_at', String(Date.now()));
          }} />
      )}
      <AddExpenseSheet visible={addExpenseOpen} onClose={()=>setAddExpenseOpen(false)} userId={session?.id||''} onDone={()=>{showToast('Expense added');refreshData();}} />
      <AddTaskSheet visible={addTaskOpen} onClose={()=>setAddTaskOpen(false)} userId={session?.id||''} onDone={()=>{showToast('Task added');refreshData();}} />
      <AddMuseSheet visible={addMuseOpen} onClose={()=>setAddMuseOpen(false)} userId={session?.id||''} onDone={()=>{showToast('Saved to Muse');refreshData();}} />

      <div style={{ minHeight:'100dvh', background:'#F8F7F5', paddingBottom:'calc(80px + env(safe-area-inset-bottom))' }}>
        <div className="fade-in" style={{ padding:'0 20px' }}>
          {loading ? (
            <div style={{ paddingTop:32, display:'flex', flexDirection:'column', gap:12 }}>
              <Shimmer h={80} br={12}/><Shimmer h={56} br={12}/><Shimmer h={120} br={12}/><Shimmer h={64} br={12}/>
            </div>
          ) : (
            <>
              {/* Hero */}
              <div style={{ textAlign:'center', padding:'32px 0 24px' }}>
                {data?.hero.state==='no_date' && (
                  <>
                    <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:36, fontWeight:300, fontStyle:'italic', color:'#111', margin:'0 0 10px', lineHeight:1.2 }}>Your wedding story starts here.</p>
                    <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#888580', margin:'0 0 20px' }}>Add your wedding date to unlock your personalised countdown.</p>
                    <a href="/couple/me" style={{ fontFamily:"'Jost',sans-serif", fontSize:10, fontWeight:400, letterSpacing:'0.15em', textTransform:'uppercase', color:'#C9A84C', textDecoration:'none', border:'0.5px solid #C9A84C', borderRadius:100, padding:'8px 18px' }}>Set your date →</a>
                  </>
                )}
                {data?.hero.state==='past' && (
                  <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:300, fontStyle:'italic', color:'#111', margin:0, lineHeight:1.3 }}>
                    Your wedding was {Math.abs(data.hero.days_until||0)} days ago. We hope it was everything you dreamed.
                  </p>
                )}
                {(data?.hero.state==='date_only'||data?.hero.state==='event') && data?.hero.days_until!==null && (
                  <>
                    <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:38, fontWeight:300, color:'#111', margin:'0 0 8px', lineHeight:1.15 }}>
                      {numberToWords(data.hero.days_until)} days to your {data.hero.event_name||'wedding'}.
                    </p>
                    {data.hero.wedding_date && (
                      <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#888580', margin:0 }}>
                        {formatDate(data.hero.state==='event'&&data.next_event?.event_date ? data.next_event.event_date : data.hero.wedding_date)}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Quick Actions */}
              <div style={{ marginBottom:28 }}>
                <div style={{ display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none', paddingBottom:4, paddingRight:16 }}>
                  {quickActions.map((a, i) => (
                    <button
                      key={i}
                      onClick={a.coming ? undefined : a.onTap}
                      disabled={a.coming}
                      style={{
                        flexShrink: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 6, width: 72, height: 72,
                        background: a.coming ? '#F0EDE8' : '#FFFFFF',
                        border: `0.5px solid ${a.coming ? '#E2DED8' : '#E2DED8'}`,
                        borderRadius: 16, cursor: a.coming ? 'not-allowed' : 'pointer',
                        position: 'relative', padding: 0,
                        opacity: a.coming ? 0.6 : 1,
                      }}
                    >
                      <span style={{ fontSize: 18, color: a.coming ? '#C8C4BE' : '#C9A84C' }}>{a.icon}</span>
                      <span style={{ fontFamily:"'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.08em', textTransform: 'uppercase', color: a.coming ? '#C8C4BE' : '#555250', textAlign: 'center', lineHeight: 1.2, padding: '0 4px' }}>{a.label}</span>
                      {a.coming && (
                        <div style={{ position:'absolute', top:-6, right:-6, background:'#E2DED8', borderRadius:100, padding:'2px 5px' }}>
                          <span style={{ fontFamily:"'Jost',sans-serif", fontSize:6, fontWeight:400, letterSpacing:'0.08em', textTransform:'uppercase', color:'#888580' }}>Soon</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Snapshot */}
              {budget && budget.total > 0 && (
                <div style={{ background:'#FFFFFF', border:'0.5px solid #E2DED8', borderRadius:12, padding:16, marginBottom:28 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.25em', textTransform:'uppercase', color:'#C8C4BE', margin:0 }}>Budget</p>
                    <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#888580', margin:0 }}>{fmtINR(budget.committed)} of {fmtINR(budget.total)}</p>
                  </div>
                  {/* Track */}
                  <div style={{ height:6, background:'#F0EDE8', borderRadius:100, overflow:'hidden', marginBottom:10 }}>
                    <div style={{ height:'100%', width:`${budgetPct}%`, background:'#E2DED8', borderRadius:100, position:'relative' }}>
                      <div style={{ position:'absolute', top:0, left:0, height:'100%', width:`${budget.committed > 0 ? Math.round((budget.paid/budget.committed)*100) : 0}%`, background:'#C9A84C', borderRadius:100 }} />
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:16 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:'#C9A84C', flexShrink:0 }} />
                      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:300, color:'#888580' }}>{fmtINR(budget.paid)} paid</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:'#E2DED8', flexShrink:0 }} />
                      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:300, color:'#888580' }}>{fmtINR(budget.committed - budget.paid)} pending</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Needs Attention */}
              {moments.length>0 && (
                <div style={{ marginBottom:28 }}>
                  <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.25em', textTransform:'uppercase', color:'#C8C4BE', margin:'0 0 12px' }}>Needs Your Attention</p>
                  {moments.map((m,i)=><MomentCard key={i} moment={m} onAction={handleMomentAction}/>)}
                </div>
              )}

              {/* Next Event Card */}
              {data?.next_event && (
                <div style={{ background:'#111', borderRadius:12, padding:16, marginBottom:28 }}>
                  <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.25em', textTransform:'uppercase', color:'#888580', margin:'0 0 8px' }}>Next Event</p>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                    <div>
                      <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:300, color:'#F8F7F5', margin:'0 0 4px' }}>{data.next_event.event_name}</p>
                      <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#888580', margin:0 }}>{formatDate(data.next_event.event_date)}</p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:300, color:'#C9A84C', margin:'0 0 2px', lineHeight:1 }}>
                        {Math.max(0, Math.round((new Date(data.next_event.event_date).getTime() - Date.now()) / 86400000))}
                      </p>
                      <p style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, letterSpacing:'0.12em', textTransform:'uppercase', color:'#888580', margin:0 }}>days away</p>
                    </div>
                  </div>
                </div>
              )}

              {/* From Your Muse — fixed with image_url fallback */}
              {data?.muse_saves && data.muse_saves.length > 0 && (
                <div style={{ marginBottom:28 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.25em', textTransform:'uppercase', color:'#C8C4BE', margin:0 }}>From Your Muse</p>
                    <a href="/couple/muse" style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, letterSpacing:'0.12em', textTransform:'uppercase', color:'#888580', textDecoration:'none' }}>See all →</a>
                  </div>
                  <div style={{ display:'flex', gap:10, overflowX:'auto', scrollbarWidth:'none', paddingBottom:4 }}>
                    {data.muse_saves.map(save => {
                      const img =
                        save.image_url ||
                        save.vendor?.featured_photos?.[0] ||
                        save.vendor?.portfolio_images?.[0] ||
                        null;
                      const thumb = img ? smartThumb(img, 300) : null;
                      const name = save.vendor?.name || save.title || '—';
                      const sub = save.vendor?.category || '';
                      return (
                        <a key={save.id} href={save.vendor_id ? `/couple/vendor/${save.vendor_id}` : '/couple/muse'} style={{ flexShrink:0, width:120, textDecoration:'none' }}>
                          <div style={{
                            width:120, height:150, borderRadius:12, overflow:'hidden',
                            background: thumb ? 'none' : '#E2DED8',
                            backgroundImage: thumb ? `url(${thumb})` : 'none',
                            backgroundSize:'cover', backgroundPosition:'center top',
                            marginBottom:6,
                            display: thumb ? 'block' : 'flex',
                            alignItems:'center', justifyContent:'center',
                          }}>
                            {!thumb && <span style={{ fontSize:24 }}>✦</span>}
                          </div>
                          <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:14, fontWeight:300, color:'#111', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</p>
                          {sub && <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888580', margin:0 }}>{sub}</p>}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Latest Message */}
              {data?.quiet_activity && data.quiet_activity.length > 0 && (() => {
                const latest = data.quiet_activity[0];
                const fromVendor = latest.from === 'vendor';
                const preview = latest.vendor_name
                  ? (fromVendor ? `${latest.vendor_name}: ${latest.text}` : `You: ${latest.text}`)
                  : latest.text;
                return (
                  <div style={{ marginBottom:28 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                      <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.25em', textTransform:'uppercase', color:'#C8C4BE', margin:0 }}>Latest Message</p>
                      <a href="/couple/messages" style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, letterSpacing:'0.12em', textTransform:'uppercase', color:'#888580', textDecoration:'none' }}>All messages →</a>
                    </div>
                    <a href={latest.enquiry_id ? `/couple/messages?thread=${latest.enquiry_id}` : '/couple/messages'} style={{ textDecoration:'none', display:'block' }}>
                      <div style={{ background:'#FFFFFF', border:'0.5px solid #E2DED8', borderRadius:12, padding:14, display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:36, height:36, borderRadius:'50%', background:'#F0EDE8', border:'0.5px solid #E2DED8', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <span style={{ fontSize:13, fontFamily:"'Cormorant Garamond',serif", fontWeight:300, color:'#888580' }}>{latest.vendor_name?.[0]?.toUpperCase() || '✦'}</span>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          {latest.vendor_name && <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, fontWeight:300, color:'#111', margin:'0 0 2px' }}>{latest.vendor_name}{latest.vendor_category ? ` · ${latest.vendor_category}` : ''}</p>}
                          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#888580', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fromVendor ? latest.text : `You: ${latest.text}`}</p>
                          <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.08em', color:'#C8C4BE', margin:0 }}>{timeAgo(latest.at)}</p>
                        </div>
                        {fromVendor && <div style={{ width:8, height:8, borderRadius:'50%', background:'#C9A84C', flexShrink:0 }} />}
                        {!fromVendor && <span style={{ color:'#C8C4BE', fontSize:14, flexShrink:0 }}>→</span>}
                      </div>
                    </a>
                  </div>
                );
              })()}

              {/* Circle Activity */}
              <CircleActivity coupleId={session?.id||''} />

              {/* This Week Events */}
              {data?.this_week_events && data.this_week_events.length > 0 && (
                <div style={{ marginBottom:28 }}>
                  <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.25em', textTransform:'uppercase', color:'#C8C4BE', margin:'0 0 12px' }}>This Week</p>
                  {data.this_week_events.map(ev=>(
                    <div key={ev.id} style={{ background:'#FFFFFF', border:'0.5px solid #E2DED8', borderRadius:12, padding:16, marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ textAlign:'center', flexShrink:0 }}>
                        <p style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, letterSpacing:'0.15em', textTransform:'uppercase', color:'#888580', margin:'0 0 2px' }}>{new Date(ev.event_date).toLocaleDateString('en-IN',{month:'short'}).toUpperCase()}</p>
                        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:300, color:'#111', margin:0, lineHeight:1 }}>{new Date(ev.event_date).getDate()}</p>
                      </div>
                      <div>
                        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:300, color:'#111', margin:'0 0 2px' }}>{ev.event_name}</p>
                        {ev.venue&&<p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#888580', margin:0 }}>{ev.venue}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upcoming Payments */}
              {data?.upcoming_payments && data.upcoming_payments.length > 0 && (
                <div style={{ marginBottom:28 }}>
                  <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.25em', textTransform:'uppercase', color:'#C8C4BE', margin:'0 0 12px' }}>Upcoming Payments</p>
                  {data.upcoming_payments.map((p,i)=>(
                    <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:i<data.upcoming_payments.length-1?'0.5px solid #E2DED8':'none' }}>
                      <div>
                        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:300, color:'#111', margin:'0 0 2px' }}>{p.vendor_name||'—'}</p>
                        {p.description&&<p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#888580', margin:0 }}>{p.description}</p>}
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:400, color:'#C9A84C', margin:'0 0 2px' }}>{fmtINR(p.actual_amount||0)}</p>
                        {p.due_date&&<p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:300, color:'#888580', margin:0 }}>Due {formatShortDate(p.due_date)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {moments.length===0 && (!data?.muse_saves||data.muse_saves.length===0) && (!data?.this_week_events||data.this_week_events.length===0) && (
                <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:300, fontStyle:'italic', color:'#888580', textAlign:'center', marginTop:16 }}>You're all caught up.</p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
