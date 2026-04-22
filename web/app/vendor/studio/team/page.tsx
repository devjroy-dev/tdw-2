'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X } from 'lucide-react';

const BASE = 'https://dream-wedding-production-89ae.up.railway.app';
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');`;

function getInitials(name: string) {
  return name.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase();
}

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={{ position:'fixed', top:16, left:'50%', transform:'translateX(-50%)', background:'#111111', color:'#F8F7F5', fontFamily:'DM Sans, sans-serif', fontSize:12, fontWeight:300, padding:'10px 16px', borderRadius:8, zIndex:200, whiteSpace:'nowrap', willChange:'transform,opacity', animation:'toastIn 280ms cubic-bezier(0.22,1,0.36,1) forwards' }}>{msg}</div>;
}

export default function VendorTeamPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState('');
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name:'', role:'', phone:'' });

  useEffect(() => {
    const raw = localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/pin-login'); return; }
    try {
      const s = JSON.parse(raw);
      if (!s.vendorId) { window.location.replace('/vendor/pin-login'); return; }
      setVendorId(s.vendorId);
    } catch { window.location.replace('/vendor/pin-login'); }
  }, []);

  const fetchTeam = useCallback(async (vid: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/team/${vid}`);
      const d = await r.json();
      if (d.success) setTeam(d.data || []);
      else if (Array.isArray(d)) setTeam(d);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { if (vendorId) fetchTeam(vendorId); }, [vendorId, fetchTeam]);

  const handleAddMember = async () => {
    if (!form.name.trim()) { setToast('Full name is required.'); return; }
    if (!form.role.trim()) { setToast('Role is required.'); return; }
    setSubmitting(true);
    try {
      const r = await fetch(`${BASE}/api/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // CRITICAL: must use vendor_id (not vendorId) in body
        body: JSON.stringify({ vendor_id: vendorId, name: form.name, role: form.role, phone: form.phone }),
      });
      const d = await r.json();
      if (d.success || r.ok) {
        setSheetOpen(false);
        setForm({ name:'', role:'', phone:'' });
        setToast('Team member added.');
        fetchTeam(vendorId);
      } else {
        setToast(d.error || d.message || 'Failed to add member.');
      }
    } catch { setToast('Network error.'); }
    setSubmitting(false);
  };

  return (
    <>
      <style>{`
        ${FONTS}
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes toastIn { from{opacity:0;transform:translate(-50%,-40px)} to{opacity:1;transform:translate(-50%,0)} }
        @keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>

      <div style={{ minHeight:'100vh', background:'#F8F7F5', fontFamily:'DM Sans, sans-serif', paddingBottom:'calc(64px + env(safe-area-inset-bottom) + 80px)' }}>

        {/* Header */}
        <div style={{ padding:'16px 20px 0' }}>
          <button
            onClick={() => router.back()}
            style={{ background:'none', border:'none', cursor:'pointer', padding:'4px 0', marginBottom:12, display:'flex', alignItems:'center', touchAction:'manipulation' }}
          >
            <ArrowLeft size={20} color="#111111" />
          </button>
          <div style={{ fontFamily:'Jost, sans-serif', fontWeight:200, fontSize:9, color:'#888580', letterSpacing:'0.25em', textTransform:'uppercase', marginBottom:4 }}>YOUR STUDIO</div>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontWeight:300, fontSize:28, color:'#111111', marginBottom:20 }}>Team</div>
        </div>

        <div style={{ padding:'0 20px' }}>
          {loading ? (
            [0,1,2].map(i => (
              <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2DED8', borderRadius:12, padding:16, marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'#F8F7F5', backgroundImage:'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite', flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ height:13, width:'50%', borderRadius:4, background:'#F8F7F5', backgroundImage:'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite', marginBottom:6 }} />
                  <div style={{ height:11, width:'30%', borderRadius:4, background:'#F8F7F5', backgroundImage:'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }} />
                </div>
              </div>
            ))
          ) : team.length === 0 ? (
            <div style={{ paddingTop:60, textAlign:'center' }}>
              <div style={{ fontFamily:'Cormorant Garamond, serif', fontStyle:'italic', fontSize:18, color:'#888580', fontWeight:300, marginBottom:8 }}>Your team will appear here.</div>
              <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:12, color:'#888580', fontWeight:300 }}>Add photographers, assistants, and coordinators.</div>
            </div>
          ) : team.map(m => (
            <div key={m.id} style={{ background:'#FFFFFF', border:'1px solid #E2DED8', borderRadius:12, padding:16, marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'#F8F7F5', border:'1px solid #E2DED8', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Jost, sans-serif', fontSize:12, color:'#111111', flexShrink:0 }}>
                {getInitials(m.name || '?')}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:14, color:'#111111', fontWeight:400 }}>{m.name}</div>
                <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:12, color:'#888580', fontWeight:300, marginTop:2 }}>{m.role}</div>
              </div>
              <div>
                {m.active ? (
                  <span style={{ fontFamily:'Jost, sans-serif', fontSize:9, color:'#111111', letterSpacing:'0.12em', textTransform:'uppercase' }}>ACTIVE</span>
                ) : (
                  <span style={{ fontFamily:'Jost, sans-serif', fontSize:9, color:'#888580', letterSpacing:'0.12em', textTransform:'uppercase' }}>INACTIVE</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAB — dark, no gold */}
      <button
        onClick={() => setSheetOpen(true)}
        style={{
          position:'fixed', bottom:'calc(64px + env(safe-area-inset-bottom) + 16px)', right:24,
          width:52, height:52, borderRadius:'50%', background:'#111111',
          border:'none', display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', touchAction:'manipulation', zIndex:90,
          willChange:'transform', transform:'translateZ(0)',
        }}
      >
        <Plus size={20} color="#F8F7F5" />
      </button>

      {/* Add Member Sheet */}
      {sheetOpen && (
        <div
          style={{ position:'fixed', inset:0, zIndex:150, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}
          onClick={e => { if (e.target===e.currentTarget) setSheetOpen(false); }}
        >
          <div style={{ position:'absolute', inset:0, background:'rgba(17,17,17,0.4)' }} />
          <div style={{
            position:'relative', background:'#FFFFFF', borderRadius:'24px 24px 0 0',
            padding:'24px 20px calc(env(safe-area-inset-bottom) + 24px)',
            willChange:'transform', transform:'translateZ(0)',
            animation:'sheetUp 320ms cubic-bezier(0.22,1,0.36,1) forwards',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:22, fontWeight:300, color:'#111111' }}>Add Member</div>
              <button onClick={() => setSheetOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', padding:4, touchAction:'manipulation' }}>
                <X size={20} color="#888580" />
              </button>
            </div>

            {[
              { label:'FULL NAME', key:'name', type:'text', required:true },
              { label:'ROLE', key:'role', type:'text', required:true, placeholder:'Assistant, Second Shooter…' },
              { label:'PHONE', key:'phone', type:'tel' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:20 }}>
                <label style={{ fontFamily:'Jost, sans-serif', fontWeight:200, fontSize:9, color:'#888580', letterSpacing:'0.22em', textTransform:'uppercase', display:'block', marginBottom:6 }}>
                  {f.label}{f.required ? ' *' : ''}
                </label>
                <input
                  type={f.type}
                  placeholder={f.placeholder || ''}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                  style={{ fontFamily:'DM Sans, sans-serif', fontSize:13, fontWeight:300, color:'#111111', borderBottom:'1px solid #E2DED8', background:'transparent', outline:'none', padding:'10px 0', width:'100%', border:'none', borderBottom:'1px solid #E2DED8', borderRadius:0 }}
                />
              </div>
            ))}

            <button
              onClick={handleAddMember}
              disabled={submitting}
              style={{ width:'100%', background:'#111111', color:'#F8F7F5', border:'none', fontFamily:'Jost, sans-serif', fontWeight:200, fontSize:12, letterSpacing:'0.22em', textTransform:'uppercase', padding:16, borderRadius:10, cursor:'pointer', touchAction:'manipulation', opacity:submitting?0.6:1, transition:'opacity 280ms' }}
            >
              {submitting ? 'ADDING…' : 'ADD MEMBER'}
            </button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </>
  );
}
