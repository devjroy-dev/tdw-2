'use client';
import { useEffect, useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const H = { 'Content-Type': 'application/json', 'x-admin-password': 'Mira@2551354' };

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111111', color: '#111111', fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: '10px 20px', borderRadius: 100, zIndex: 9999, whiteSpace: 'nowrap' }}>{msg}</div>;
}

interface FeaturedVendor { id: string; name: string; category: string; city: string; tier: string; is_verified: boolean; }

export default function FeaturedPage() {
  const [featured, setFeatured] = useState<FeaturedVendor[]>([]);
  const [allVendors, setAllVendors] = useState<FeaturedVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/v3/admin/makers?limit=200`, { headers: H })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const all = d.data || [];
          setAllVendors(all);
          setFeatured(all.filter((v: FeaturedVendor & { featured?: boolean }) => v.featured));
        }
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  async function toggleFeatured(vendor: FeaturedVendor, currentlyFeatured: boolean) {
    await fetch(`${API}/api/v3/admin/makers/${vendor.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ featured: !currentlyFeatured }) });
    if (currentlyFeatured) {
      setFeatured(prev => prev.filter(v => v.id !== vendor.id));
      setToast(`${vendor.name} removed from featured`);
    } else {
      setFeatured(prev => [...prev, vendor]);
      setToast(`${vendor.name} added to featured`);
    }
    setShowSearch(false); setSearch('');
  }

  const filteredSearch = search.length > 1
    ? allVendors.filter(v => v.name?.toLowerCase().includes(search.toLowerCase()) && !featured.find(f => f.id === v.id))
    : [];

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 4px' }}>Admin</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: 32, color: '#111111', margin: 0 }}>Featured Placement</p>
          <button onClick={() => setShowSearch(s => !s)} style={{ height: 36, padding: '0 16px', background: '#111111', color: '#111111', border: 'none', borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>+ Add Vendor</button>
        </div>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: '8px 0 0', lineHeight: 1.5 }}>Vendors featured here appear at the top of the Discovery feed. This is your editorial curation layer.</p>
      </div>

      {/* Search to add */}
      {showSearch && (
        <div style={{ background: '#FFFFFF', border: '1px solid #C9A84C', borderRadius: 12, padding: 16, marginBottom: 20, position: 'relative' }}>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 8px' }}>Search Makers to Feature</p>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Type a maker name…" style={{ width: '100%', border: 'none', borderBottom: '1px solid rgba(248,247,245,0.08)', background: 'transparent', fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 300, color: '#111111', padding: '6px 0', outline: 'none' }} />
          {filteredSearch.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredSearch.slice(0, 5).map(v => (
                <div key={v.id} onClick={() => toggleFeatured(v, false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#F8F7F5', borderRadius: 8, cursor: 'pointer' }}>
                  <div>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 400, color: '#111111', margin: '0 0 2px' }}>{v.name}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: 0 }}>{v.category}{v.city ? ` · ${v.city}` : ''}</p>
                  </div>
                  <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A84C' }}>+ Feature</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Currently featured */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 64, borderRadius: 12, background: 'linear-gradient(90deg,#F0EEE8 25%,#E8E5DF 50%,#F0EEE8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />)}
        </div>
      ) : featured.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: '#888580', margin: '0 0 8px' }}>No featured vendors yet.</p>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: 0 }}>Add vendors above to surface them at the top of Discovery.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 4px' }}>{featured.length} currently featured</p>
          {featured.map((v, i) => (
            <div key={v.id} style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F8F7F5', border: '1px solid #E2DED8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontWeight: 300, color: '#888580' }}>{i + 1}</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 400, color: '#111111', margin: '0 0 2px' }}>{v.name}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: 0 }}>{v.category}{v.city ? ` · ${v.city}` : ''}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {v.is_verified && <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 7, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4A7C59', background: 'rgba(74,124,89,0.1)', padding: '2px 6px', borderRadius: 100 }}>Verified</span>}
                <button onClick={() => toggleFeatured(v, true)} style={{ height: 28, padding: '0 12px', background: 'transparent', border: '1px solid #FFEBEE', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B4545', cursor: 'pointer' }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
