'use client';
import { useEffect, useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const PWD = 'Mira@2551354';
const h = { 'Content-Type': 'application/json', 'x-admin-password': PWD };

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} } @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`;

const CATS = ['Lehenga', 'Saree', 'Gown', 'Jewelry', 'Accessories'];
type Product = { id: string; designer_name: string; product_title: string; category: string; price: number; images: string[]; description: string; is_active: boolean; is_featured: boolean; created_at: string; };
type CatFilter = 'all' | string;

export default function AdminCouturePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CatFilter>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ designer_name: '', product_title: '', category: 'Lehenga', price: '', description: '', images: '' });
  const [creating, setCreating] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v2/admin/couture`, { headers: h });
      const d = await r.json();
      setProducts(d.products || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.designer_name || !form.product_title) return;
    setCreating(true);
    try {
      const images = form.images.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 5);
      const r = await fetch(`${API}/api/v2/admin/couture`, { method: 'POST', headers: h, body: JSON.stringify({ ...form, price: form.price ? parseInt(form.price) : null, images }) });
      const d = await r.json();
      if (d.success) { setShowAdd(false); setForm({ designer_name: '', product_title: '', category: 'Lehenga', price: '', description: '', images: '' }); load(); showToast('Product added.'); }
    } finally { setCreating(false); }
  };

  const toggle = async (id: string, field: 'is_featured' | 'is_active') => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    await fetch(`${API}/api/v2/admin/couture/${id}`, { method: 'PATCH', headers: h, body: JSON.stringify({ [field]: !p[field] }) });
    setProducts(ps => ps.map(x => x.id === id ? { ...x, [field]: !p[field] } : x));
  };

  const del = async (id: string) => {
    await fetch(`${API}/api/v2/admin/couture/${id}`, { method: 'DELETE', headers: h });
    setProducts(ps => ps.filter(x => x.id !== id));
    setConfirmDelete(null);
    showToast('Product removed.');
  };

  const filtered = products.filter(p => {
    if (filter === 'featured') return p.is_featured && p.is_active;
    if (filter === 'all') return p.is_active;
    return p.category === filter && p.is_active;
  });

  const lbl: React.CSSProperties = { fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7, color: '#555250', letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: 4 };
  const fld: React.CSSProperties = { width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #E2DED8', outline: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#111111', padding: '6px 0', marginBottom: 14 };
  const pillBtn = (on: boolean, onClick: () => void, onL: string, offL: string) => (
    <button onClick={onClick} style={{ border: `0.5px solid ${on ? '#C9A84C' : '#E2DED8'}`, background: on ? 'rgba(201,168,76,0.08)' : 'transparent', color: on ? '#C9A84C' : '#555250', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7, letterSpacing: '0.18em', textTransform: 'uppercase' as const, padding: '3px 8px', borderRadius: 20, cursor: 'pointer' }}>{on ? onL : offL}</button>
  );

  return (
    <>
      <style>{fonts}</style>
      {toast && <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: '#111111', color: '#F8F7F5', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, padding: '10px 20px', borderRadius: 4, zIndex: 9999 }}>{toast}</div>}

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, padding: 28, maxWidth: 340, width: '90%' }}>
            <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 22, color: '#111111', marginBottom: 10 }}>Remove product?</div>
            <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#555250', marginBottom: 24 }}>This will hide the product from the catalog.</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => del(confirmDelete)} style={{ background: '#111111', color: '#F8F7F5', border: 'none', padding: '11px 20px', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>Remove</button>
              <button onClick={() => setConfirmDelete(null)} style={{ background: 'none', border: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#555250', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9997 }}>
          <div style={{ background: '#FFFFFF', borderRadius: '8px 8px 0 0', padding: 28, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 24, color: '#111111', marginBottom: 20 }}>Add Product</div>
            <label style={lbl}>Designer Name *</label>
            <input value={form.designer_name} onChange={e => setForm(f => ({ ...f, designer_name: e.target.value }))} style={fld} />
            <label style={lbl}>Product Title *</label>
            <input value={form.product_title} onChange={e => setForm(f => ({ ...f, product_title: e.target.value }))} style={fld} />
            <label style={lbl}>Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...fld, cursor: 'pointer' }}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
            <label style={lbl}>Price (₹)</label>
            <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} style={fld} />
            <label style={lbl}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...fld, resize: 'vertical' }} />
            <label style={lbl}>Image URLs (one per line, max 5)</label>
            <textarea value={form.images} onChange={e => setForm(f => ({ ...f, images: e.target.value }))} rows={4} placeholder="https://…&#10;https://…" style={{ ...fld, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={create} disabled={creating} style={{ flex: 1, background: '#111111', color: '#F8F7F5', border: 'none', padding: '14px 0', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>{creating ? 'Adding…' : 'Add Product'}</button>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#555250', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, color: '#555250', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>Couture</div>
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111' }}>Product Catalog</div>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ background: '#111111', color: '#F8F7F5', border: 'none', padding: '11px 20px', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>+ Add Product</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {(['all', ...CATS, 'featured'] as string[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ border: `0.5px solid ${filter === f ? '#C9A84C' : '#E2DED8'}`, background: filter === f ? 'rgba(201,168,76,0.08)' : 'transparent', color: filter === f ? '#C9A84C' : '#555250', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 20, cursor: 'pointer' }}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {[1,2,3,6].map(i => <div key={i} style={{ height: 240, background: '#FFFFFF', borderRadius: 6, border: '1px solid #E2DED8', backgroundImage: 'linear-gradient(90deg, #F8F7F5 25%, #F0EEE8 50%, #F8F7F5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#555250' }}>The atelier awaits its first creation.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {filtered.map(p => (
            <div key={p.id} style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, overflow: 'hidden', animation: 'fadeIn 0.3s ease' }}>
              {p.images?.[0] ? (
                <div style={{ height: 120, backgroundImage: `url(${p.images[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              ) : (
                <div style={{ height: 120, background: '#F0EEE8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, color: '#555250', letterSpacing: '0.2em', textTransform: 'uppercase' }}>No Image</span>
                </div>
              )}
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 10, color: '#555250', marginBottom: 2 }}>{p.designer_name}</div>
                <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 13, color: '#111111', marginBottom: 4 }}>{p.product_title}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#555250', background: '#F0EEE8', padding: '2px 7px', borderRadius: 10 }}>{p.category}</span>
                  {p.price && <span style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#111111' }}>₹{p.price.toLocaleString('en-IN')}</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {pillBtn(p.is_featured, () => toggle(p.id, 'is_featured'), '★ Featured', '☆ Feature')}
                  {pillBtn(p.is_active, () => toggle(p.id, 'is_active'), '● Active', '○ Inactive')}
                </div>
                <button onClick={() => setConfirmDelete(p.id)} style={{ background: 'none', border: 'none', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#555250', cursor: 'pointer', opacity: 0.6 }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
