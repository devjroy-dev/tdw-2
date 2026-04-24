'use client';
import { useEffect, useState, useCallback } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const H = { 'Content-Type': 'application/json', 'x-admin-password': 'Mira@2551354' };

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#F8F7F5', fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: '10px 20px', borderRadius: 100, zIndex: 9999, whiteSpace: 'nowrap' }}>{msg}</div>;
}

interface PendingImage { id: string; url: string; tags: string[]; vendor_id: string; vendor_name: string; vendor_category: string; created_at: string; }

const REJECT_REASONS = ['Too dark', 'Low resolution', 'Irrelevant content', 'Watermark visible', 'Other'];

export default function ImageApprovalsPage() {
  const [images, setImages] = useState<PendingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`${API}/api/v3/admin/images/pending`, { headers: H });
    const d = await r.json();
    if (d.success) setImages(d.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approve(id: string) {
    setProcessing(id);
    await fetch(`${API}/api/v3/admin/images/${id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ approved: true }) });
    setImages(prev => prev.filter(i => i.id !== id));
    setToast('Image approved');
    setProcessing(null);
  }

  async function reject(id: string, reason: string) {
    setProcessing(id);
    await fetch(`${API}/api/v3/admin/images/${id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ approved: false, rejection_reason: reason }) });
    setImages(prev => prev.filter(i => i.id !== id));
    setRejectTarget(null); setRejectReason('');
    setToast('Image rejected');
    setProcessing(null);
  }

  async function approveAllForVendor(vendorId: string) {
    const vendorImages = images.filter(i => i.vendor_id === vendorId);
    for (const img of vendorImages) {
      await fetch(`${API}/api/v3/admin/images/${img.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ approved: true }) });
    }
    setImages(prev => prev.filter(i => i.vendor_id !== vendorId));
    setToast(`All images approved for ${vendorImages[0]?.vendor_name}`);
  }

  // Group by vendor
  const byVendor: Record<string, PendingImage[]> = {};
  images.forEach(img => {
    if (!byVendor[img.vendor_id]) byVendor[img.vendor_id] = [];
    byVendor[img.vendor_id].push(img);
  });

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {/* Reject modal */}
      {rejectTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 28, maxWidth: 360, width: '100%' }}>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 300, color: '#111', margin: '0 0 16px' }}>Reject Image</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {REJECT_REASONS.map(r => (
                <button key={r} onClick={() => setRejectReason(r)} style={{ padding: '10px 14px', background: rejectReason === r ? '#111' : '#F4F1EC', color: rejectReason === r ? '#F8F7F5' : '#111', border: 'none', borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, cursor: 'pointer', textAlign: 'left' }}>{r}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { if (rejectReason) reject(rejectTarget, rejectReason); }} disabled={!rejectReason} style={{ flex: 1, height: 44, background: rejectReason ? '#9B4545' : '#E2DED8', color: '#FFFFFF', border: 'none', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: rejectReason ? 'pointer' : 'default' }}>Reject</button>
              <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} style={{ height: 44, padding: '0 20px', background: 'transparent', border: '1px solid #E2DED8', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, color: '#888580', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 4px' }}>Admin</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: 32, color: '#111', margin: 0 }}>Image Approvals <span style={{ fontSize: 18, color: images.length > 0 ? '#C9A84C' : '#888580' }}>({images.length} pending)</span></p>
          <button onClick={load} style={{ height: 36, padding: '0 14px', background: 'transparent', border: '1px solid #E2DED8', borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888580', cursor: 'pointer' }}>Refresh</button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 200, borderRadius: 12, background: 'linear-gradient(90deg,#EEECE8 25%,#F4F2EE 50%,#EEECE8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />)}
        </div>
      ) : images.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 60, textAlign: 'center' }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 300, fontStyle: 'italic', color: '#4A7C59', margin: 0 }}>✓ All images reviewed.</p>
        </div>
      ) : (
        Object.entries(byVendor).map(([vendorId, imgs]) => (
          <div key={vendorId} style={{ marginBottom: 32 }}>
            {/* Vendor header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 300, color: '#111', margin: '0 0 2px' }}>{imgs[0].vendor_name}</p>
                <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', margin: 0 }}>{imgs[0].vendor_category} · {imgs.length} image{imgs.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => approveAllForVendor(vendorId)} style={{ height: 32, padding: '0 14px', background: '#4A7C59', color: '#FFFFFF', border: 'none', borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>Approve All</button>
            </div>

            {/* Image grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {imgs.map(img => (
                <div key={img.id} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #E2DED8', background: '#F8F7F5' }}>
                  <div style={{ height: 160, backgroundImage: `url(${img.url})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                    {img.tags && img.tags.length > 0 && (
                      <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '2px 6px' }}>
                        <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 7, color: '#FFFFFF', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{img.tags[0]}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '8px 10px', display: 'flex', gap: 6 }}>
                    <button onClick={() => approve(img.id)} disabled={processing === img.id} style={{ flex: 1, height: 28, background: '#4A7C59', color: '#FFFFFF', border: 'none', borderRadius: 6, fontFamily: "'Jost',sans-serif", fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', opacity: processing === img.id ? 0.6 : 1 }}>✓</button>
                    <button onClick={() => setRejectTarget(img.id)} style={{ flex: 1, height: 28, background: '#FFEBEE', color: '#9B4545', border: 'none', borderRadius: 6, fontFamily: "'Jost',sans-serif", fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </>
  );
}
