'use client';
import { useEffect, useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const PWD = 'Mira@2551354';
const h = { 'Content-Type': 'application/json', 'x-admin-password': PWD };

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} } @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`;

const CATEGORIES = ['hero', 'carousel', 'spotlight', 'style_file', 'look_book', 'pricing'];
const CAT_LABELS: Record<string, string> = { hero: 'Hero', carousel: 'Carousel', spotlight: 'Spotlight', style_file: 'Style File', look_book: 'Look Book', pricing: 'Pricing' };

type Photo = { id: string; vendor_id: string; image_url: string; category: string; is_approved: boolean; created_at: string; vendors: { name: string } | null; };

export default function AdminPhotosPage() {
  const [tab, setTab] = useState('hero');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async (cat: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v2/admin/photos?category=${cat}`, { headers: h });
      const d = await r.json();
      setPhotos(d.photos || []);
      if (d.counts) setCounts(d.counts);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(tab); }, [tab]);

  const approve = async (id: string) => {
    await fetch(`${API}/api/v2/admin/photos/${id}/approve`, { method: 'PATCH', headers: h });
    setPhotos(p => p.filter(x => x.id !== id));
    showToast('Photo approved.');
  };

  const reject = async () => {
    if (!rejectId) return;
    await fetch(`${API}/api/v2/admin/photos/${rejectId}/reject`, { method: 'PATCH', headers: h, body: JSON.stringify({ reason: rejectReason }) });
    setPhotos(p => p.filter(x => x.id !== rejectId));
    setRejectId(null);
    setRejectReason('');
    showToast('Photo rejected.');
  };

  return (
    <>
      <style>{fonts}</style>
      {toast && <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: '#111111', color: '#F8F7F5', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, padding: '10px 20px', borderRadius: 4, zIndex: 9999 }}>{toast}</div>}

      {rejectId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, padding: 28, maxWidth: 380, width: '90%' }}>
            <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 22, color: '#111111', marginBottom: 12 }}>Reject photo?</div>
            <input
              placeholder="Reason (optional)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #E2DED8', outline: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#111111', padding: '6px 0', marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={reject} style={{ background: '#111111', color: '#F8F7F5', border: 'none', padding: '11px 20px', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>Reject</button>
              <button onClick={() => setRejectId(null)} style={{ background: 'none', border: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#888580', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>Discovery</div>
        <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111' }}>Photo Approvals</div>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E2DED8', marginBottom: 28, overflowX: 'auto' }}>
        {CATEGORIES.map(cat => {
          const count = counts[cat] || 0;
          const active = tab === cat;
          return (
            <button key={cat} onClick={() => setTab(cat)} style={{
              background: 'none', border: 'none', borderBottom: `2px solid ${active ? '#C9A84C' : 'transparent'}`,
              padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
              color: active ? '#111111' : '#888580', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {CAT_LABELS[cat]}
              {count > 0 && (
                <span style={{ background: '#C9A84C', color: '#FFFFFF', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 8, padding: '1px 6px', borderRadius: 10 }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 280, background: '#FFFFFF', borderRadius: 6, border: '1px solid #E2DED8', backgroundImage: 'linear-gradient(90deg, #F8F7F5 25%, #F0EEE8 50%, #F8F7F5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />)}
        </div>
      ) : photos.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#888580' }}>
          This gallery is waiting for its first dream. Check back soon.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {photos.map(photo => (
            <div key={photo.id} style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, overflow: 'hidden', animation: 'fadeIn 0.3s ease' }}>
              <div style={{ height: 160, backgroundImage: `url(${photo.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.55)', color: '#F8F7F5', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20 }}>{CAT_LABELS[photo.category] || photo.category}</span>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 13, color: '#111111', marginBottom: 4 }}>{photo.vendors?.name || 'Unknown Maker'}</div>
                <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11, color: '#888580', marginBottom: 14 }}>{new Date(photo.created_at).toLocaleDateString('en-IN')}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => approve(photo.id)} style={{ flex: 1, background: 'rgba(201,168,76,0.1)', border: '0.5px solid #C9A84C', color: '#C9A84C', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '9px 0', cursor: 'pointer', borderRadius: 2 }}>Approve</button>
                  <button onClick={() => setRejectId(photo.id)} style={{ flex: 1, background: 'transparent', border: '0.5px solid #E2DED8', color: '#888580', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '9px 0', cursor: 'pointer', borderRadius: 2 }}>Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
