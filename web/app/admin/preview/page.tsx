'use client';
// Admin: Preview Vendors
// Curate which 10 vendor cards appear in the "Just Exploring" blind swipe
// preview on the landing page. Vendors must be approved (is_approved = true).
// Order matters — slot 1 shows first.
import { useEffect, useState, useCallback } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const H   = { 'Content-Type': 'application/json', 'x-admin-password': 'Mira@2551354' };

interface SlottedVendor { id: string; name: string; category: string; city: string; display_order: number; }
interface AvailableVendor { id: string; name: string; category: string; city: string; tier: string; }

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#F8F7F5', fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: '10px 20px', borderRadius: 100, zIndex: 9999, whiteSpace: 'nowrap' }}>{msg}</div>;
}

export default function PreviewVendorsPage() {
  const [slots, setSlots]     = useState<(SlottedVendor | null)[]>(Array(10).fill(null));
  const [available, setAvailable] = useState<AvailableVendor[]>([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [slotsRes, vendorsRes] = await Promise.all([
        fetch(`${API}/api/v2/admin/preview-vendors`, { headers: H }),
        fetch(`${API}/api/v3/admin/makers?limit=200`, { headers: H }),
      ]);
      const slotsData   = await slotsRes.json();
      const vendorsData = await vendorsRes.json();

      // Build slots array
      const filled: (SlottedVendor | null)[] = Array(10).fill(null);
      (slotsData.data || []).forEach((v: SlottedVendor) => {
        const idx = v.display_order - 1;
        if (idx >= 0 && idx < 10) filled[idx] = v;
      });
      setSlots(filled);

      // Available = approved vendors not already in slots
      const slottedIds = new Set((slotsData.data || []).map((v: SlottedVendor) => v.id));
      setAvailable((vendorsData.data || []).filter((v: AvailableVendor & { is_approved?: boolean }) =>
        v.is_approved && !slottedIds.has(v.id)
      ));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addToSlot = (vendor: AvailableVendor) => {
    const firstEmpty = slots.findIndex(s => s === null);
    if (firstEmpty === -1) { showToast('All 10 slots are full. Remove one first.'); return; }
    const newSlots = [...slots];
    newSlots[firstEmpty] = { ...vendor, display_order: firstEmpty + 1 };
    setSlots(newSlots);
    setAvailable(prev => prev.filter(v => v.id !== vendor.id));
  };

  const removeFromSlot = (idx: number) => {
    const vendor = slots[idx];
    if (!vendor) return;
    const newSlots = [...slots];
    newSlots[idx] = null;
    setSlots(newSlots);
    setAvailable(prev => [...prev, vendor]);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const newSlots = [...slots];
    [newSlots[idx - 1], newSlots[idx]] = [newSlots[idx], newSlots[idx - 1]];
    setSlots(newSlots);
  };

  const moveDown = (idx: number) => {
    if (idx === 9) return;
    const newSlots = [...slots];
    [newSlots[idx], newSlots[idx + 1]] = [newSlots[idx + 1], newSlots[idx]];
    setSlots(newSlots);
  };

  const save = async () => {
    setSaving(true);
    try {
      const ids = slots.filter(Boolean).map(v => v!.id);
      const r = await fetch(`${API}/api/v2/admin/preview-vendors`, {
        method: 'POST', headers: H,
        body: JSON.stringify({ vendor_ids: ids }),
      });
      const d = await r.json();
      if (d.success) showToast(`✓ Saved ${d.count} preview vendors`);
      else showToast(d.error || 'Save failed');
    } catch { showToast('Network error'); }
    setSaving(false);
  };

  const filtered = search
    ? available.filter(v => v.name?.toLowerCase().includes(search.toLowerCase()) || v.category?.toLowerCase().includes(search.toLowerCase()))
    : available;

  const filledCount = slots.filter(Boolean).length;

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 4px' }}>PLATFORM</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: 32, color: '#111', margin: 0 }}>
            Preview Vendors
            <span style={{ fontSize: 16, color: '#888580', marginLeft: 10 }}>({filledCount}/10 slots filled)</span>
          </p>
          <button onClick={save} disabled={saving} style={{
            height: 44, padding: '0 24px', background: '#111', color: '#F8F7F5', border: 'none',
            borderRadius: 100, cursor: saving ? 'default' : 'pointer',
            fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300,
            letterSpacing: '0.18em', textTransform: 'uppercase', opacity: saving ? 0.5 : 1,
          }}>{saving ? 'Saving...' : 'Save Preview →'}</button>
        </div>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#888580', margin: '8px 0 0' }}>
          These 10 vendors appear in the "Just Exploring" blind swipe preview on the landing page. Only approved vendors can be selected.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* Left: 10 slots */}
        <div>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>PREVIEW ORDER</p>
          {slots.map((vendor, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
              background: vendor ? '#FFFFFF' : '#F8F7F5',
              border: `0.5px solid ${vendor ? '#E2DED8' : '#EEECE8'}`,
              borderRadius: 10, padding: '10px 12px',
            }}>
              {/* Slot number */}
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, fontWeight: 200, color: '#C8C4BE', minWidth: 16, textAlign: 'right' }}>{idx + 1}</span>

              {vendor ? (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontWeight: 300, color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vendor.name}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: '#888580', margin: 0 }}>{vendor.category} · {vendor.city}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ width: 26, height: 26, border: '0.5px solid #E2DED8', borderRadius: 4, background: 'transparent', cursor: idx === 0 ? 'default' : 'pointer', color: '#888580', fontSize: 12, opacity: idx === 0 ? 0.3 : 1 }}>↑</button>
                    <button onClick={() => moveDown(idx)} disabled={idx === 9 || !slots[idx + 1]} style={{ width: 26, height: 26, border: '0.5px solid #E2DED8', borderRadius: 4, background: 'transparent', cursor: 'pointer', color: '#888580', fontSize: 12, opacity: (idx === 9 || !slots[idx + 1]) ? 0.3 : 1 }}>↓</button>
                    <button onClick={() => removeFromSlot(idx)} style={{ width: 26, height: 26, border: '0.5px solid #E2DED8', borderRadius: 4, background: 'transparent', cursor: 'pointer', color: '#E57373', fontSize: 14 }}>✕</button>
                  </div>
                </>
              ) : (
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#C8C4BE', fontStyle: 'italic', margin: 0, flex: 1 }}>Empty slot — add a vendor from the right</p>
              )}
            </div>
          ))}
        </div>

        {/* Right: available vendors */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: 0 }}>APPROVED VENDORS ({available.length})</p>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or category..."
            style={{ width: '100%', height: 36, padding: '0 12px', border: '0.5px solid #E2DED8', borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#111', outline: 'none', marginBottom: 10 }}
          />
          {loading ? (
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#888580' }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#888580', fontStyle: 'italic' }}>
              {available.length === 0 ? 'No approved vendors yet. Approve vendors from Discovery Approvals.' : 'No results.'}
            </p>
          ) : (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {filtered.map(v => (
                <div key={v.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: '#FFFFFF', border: '0.5px solid #E2DED8',
                  borderRadius: 10, marginBottom: 6, gap: 10,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontWeight: 300, color: '#111', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: '#888580', margin: 0 }}>{v.category} · {v.city}</p>
                  </div>
                  <button onClick={() => addToSlot(v)} disabled={filledCount >= 10} style={{
                    height: 32, padding: '0 12px', background: filledCount >= 10 ? '#F4F1EC' : '#C9A84C',
                    border: 'none', borderRadius: 100, cursor: filledCount >= 10 ? 'default' : 'pointer',
                    fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: filledCount >= 10 ? '#888580' : '#111', flexShrink: 0,
                  }}>+ Add</button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
