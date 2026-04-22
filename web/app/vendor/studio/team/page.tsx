'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X } from 'lucide-react';

const BACKEND = 'https://dream-wedding-production-89ae.up.railway.app';

interface TeamMember { id: string; name: string; role: string; phone: string; status: string; }

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #F8F7F5 25%, #EEECE8 50%, #F8F7F5 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 8,
  willChange: 'transform',
  transform: 'translateZ(0)',
};

export default function TeamPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const raw = localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/pin-login'); return; }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.vendorId) { window.location.replace('/vendor/pin-login'); return; }
      setVendorId(parsed.vendorId);
    } catch { window.location.replace('/vendor/pin-login'); }
  }, []);

  const fetchTeam = useCallback(async (vid: string) => {
    try {
      const res = await fetch(`${BACKEND}/api/team/${vid}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setMembers(json.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (vendorId) fetchTeam(vendorId);
  }, [vendorId, fetchTeam]);

  const initials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleAdd = async () => {
    if (!name.trim() || !role.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND}/api/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, name, role, phone }),
      });
      const json = await res.json();
      if (json.success) {
        setSheetOpen(false);
        setName(''); setRole(''); setPhone('');
        if (vendorId) fetchTeam(vendorId);
        showToast('Team member added.');
      } else {
        showToast('Could not add member.');
      }
    } catch {
      showToast('Could not add member.');
    }
    setSubmitting(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8F7F5; }
        input:focus { outline: none; border-color: #111111 !important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%) translateZ(0)', background: '#111111', color: '#F8F7F5', fontFamily: "'DM Sans', sans-serif", fontSize: 12, borderRadius: 12, padding: '10px 16px', zIndex: 9999, willChange: 'transform', transition: 'opacity 0.3s cubic-bezier(0.22,1,0.36,1)' }}>
          {toast}
        </div>
      )}

      {/* Bottom sheet overlay */}
      {sheetOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100, willChange: 'opacity', transform: 'translateZ(0)' }} onClick={() => setSheetOpen(false)}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#FFFFFF', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 22, color: '#111111' }}>Add Team Member</p>
              <button onClick={() => setSheetOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', touchAction: 'manipulation' }}><X size={18} color="#888580" /></button>
            </div>
            {[
              { label: 'Name', val: name, set: setName, type: 'text' },
              { label: 'Role', val: role, set: setRole, type: 'text' },
              { label: 'Phone', val: phone, set: setPhone, type: 'tel' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 20 }}>
                <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>{f.label}</p>
                <input
                  type={f.type}
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  style={{ width: '100%', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#111111', background: 'transparent', border: 'none', borderBottom: '1px solid #E2DED8', paddingBottom: 8, fontWeight: 300 }}
                />
              </div>
            ))}
            <button
              onClick={handleAdd}
              disabled={submitting}
              style={{ width: '100%', background: '#111111', color: '#F8F7F5', border: 'none', borderRadius: 8, padding: '14px 0', fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 12, letterSpacing: '0.22em', cursor: 'pointer', touchAction: 'manipulation', opacity: submitting ? 0.6 : 1 }}
            >
              ADD MEMBER
            </button>
          </div>
        </div>
      )}

      <div style={{ minHeight: '100vh', background: '#F8F7F5', fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
        <div style={{ padding: '16px 20px 0' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, touchAction: 'manipulation', willChange: 'opacity', transform: 'translateZ(0)' }}>
            <ArrowLeft size={20} strokeWidth={1.5} color="#111111" />
          </button>
        </div>

        <div style={{ padding: '12px 20px 20px' }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 10, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>YOUR STUDIO</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 28, color: '#111111' }}>Team</h1>
        </div>

        <div style={{ padding: '0 20px' }}>
          {loading ? (
            [1,2,3].map(i => <div key={i} style={{ ...shimmerStyle, height: 64, marginBottom: 8 }} />)
          ) : members.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: '#888580', marginBottom: 8 }}>Your team will appear here.</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#888580' }}>Add photographers, assistants, and coordinators.</p>
            </div>
          ) : (
            members.map(m => (
              <div key={m.id} style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F8F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#555250' }}>{initials(m.name)}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#111111', fontWeight: 400 }}>{m.name}</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#888580' }}>{m.role}</p>
                </div>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: m.status === 'active' ? '#111111' : '#C8C4BE', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.status || 'active'}</span>
              </div>
            ))
          )}
        </div>

        {/* FAB */}
        <button
          onClick={() => setSheetOpen(true)}
          style={{
            position: 'fixed',
            bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)',
            right: 20,
            width: 48, height: 48,
            borderRadius: '50%',
            background: '#111111',
            border: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            touchAction: 'manipulation',
            willChange: 'transform',
            transform: 'translateZ(0)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
        >
          <Plus size={20} color="#F8F7F5" strokeWidth={1.5} />
        </button>
      </div>
    </>
  );
}
