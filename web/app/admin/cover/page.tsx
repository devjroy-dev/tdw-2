'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND = 'https://dream-wedding-production-89ae.up.railway.app';
const ADMIN_PASSWORD = 'Mira@2551354';

interface CoverPhoto {
  id: string;
  image_url: string;
  photographer_name: string;
  vendor_id: string | null;
  display_order: number;
  is_active: boolean;
  is_paid: boolean;
  amount_paid: number;
  valid_from: string | null;
  valid_to: string | null;
}

const labelStyle: React.CSSProperties = {
  fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7,
  color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase',
  display: 'block', marginBottom: 3,
};

const fieldStyle: React.CSSProperties = {
  width: '100%', background: 'transparent', border: 'none',
  borderBottom: '1px solid #E2DED8', outline: 'none',
  fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12,
  color: '#111111', padding: '6px 0', marginBottom: 10,
};

export default function AdminCoverPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<CoverPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ image_url: '', photographer_name: '', is_paid: false, amount_paid: 0, valid_from: '', valid_to: '' });
  const [editingUrl, setEditingUrl] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (!session) { router.push('/admin/login'); return; }
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/v2/cover-photos`);
      const d = await r.json();
      setPhotos(d.photos || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const update = async (id: string, body: Partial<CoverPhoto>) => {
    setSaving(true);
    try {
      await fetch(`${BACKEND}/api/v2/admin/cover-photos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': ADMIN_PASSWORD },
        body: JSON.stringify(body),
      });
      await fetchPhotos();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this cover photo?')) return;
    await fetch(`${BACKEND}/api/v2/admin/cover-photos/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': ADMIN_PASSWORD },
    });
    await fetchPhotos();
  };

  const addPhoto = async () => {
    if (!addForm.image_url) return;
    setSaving(true);
    try {
      await fetch(`${BACKEND}/api/v2/admin/cover-photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': ADMIN_PASSWORD },
        body: JSON.stringify({ ...addForm, display_order: photos.length + 1 }),
      });
      setShowAdd(false);
      setAddForm({ image_url: '', photographer_name: '', is_paid: false, amount_paid: 0, valid_from: '', valid_to: '' });
      await fetchPhotos();
    } finally {
      setSaving(false);
    }
  };

  const pillStyle = (on: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
    fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8,
    letterSpacing: '0.18em', textTransform: 'uppercase',
    color: on ? '#C9A84C' : '#888580',
    border: `0.5px solid ${on ? '#C9A84C' : '#E2DED8'}`,
    padding: '4px 10px', borderRadius: 20, transition: 'all 0.2s ease',
    background: on ? 'rgba(201,168,76,0.06)' : 'transparent',
  });

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      <div style={{ minHeight: '100vh', background: '#F8F7F5', display: 'flex' }}>
        <div style={{ width: 220, background: '#111111', flexShrink: 0 }} />

        <div style={{ flex: 1, padding: '48px 40px', overflowY: 'auto' }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>Discovery</div>
            <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111', marginBottom: 4 }}>Cover Placement</div>
            <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#888580' }}>5 slots. Weekly rotation. Curated by TDW.</div>
          </div>

          {loading ? (
            <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#888580' }}>Loading…</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
                {photos.map((photo) => (
                  <div key={photo.id} style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ height: 120, backgroundImage: `url(${photo.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 8, left: 10, fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, color: '#C9A84C', letterSpacing: '0.2em' }}>SLOT {photo.display_order}</div>
                    </div>

                    <div style={{ padding: '14px 16px' }}>
                      <label style={labelStyle}>Photographer</label>
                      <input
                        style={fieldStyle} value={photo.photographer_name || ''}
                        onChange={e => setPhotos(p => p.map(x => x.id === photo.id ? { ...x, photographer_name: e.target.value } : x))}
                        onBlur={() => update(photo.id, { photographer_name: photo.photographer_name })}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <button onClick={() => update(photo.id, { is_paid: !photo.is_paid })} style={pillStyle(photo.is_paid)}>
                          {photo.is_paid ? '● Paid' : '○ Organic'}
                        </button>
                        {photo.is_paid && (
                          <input
                            type="number" placeholder="₹ Amount"
                            value={photo.amount_paid || ''}
                            onChange={e => setPhotos(p => p.map(x => x.id === photo.id ? { ...x, amount_paid: Number(e.target.value) } : x))}
                            onBlur={() => update(photo.id, { amount_paid: photo.amount_paid })}
                            style={{ ...fieldStyle, width: 90, marginBottom: 0 }}
                          />
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>From</label>
                          <input type="date" value={photo.valid_from || ''}
                            onChange={e => setPhotos(p => p.map(x => x.id === photo.id ? { ...x, valid_from: e.target.value } : x))}
                            onBlur={() => update(photo.id, { valid_from: photo.valid_from })}
                            style={{ ...fieldStyle, marginBottom: 0 }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>To</label>
                          <input type="date" value={photo.valid_to || ''}
                            onChange={e => setPhotos(p => p.map(x => x.id === photo.id ? { ...x, valid_to: e.target.value } : x))}
                            onBlur={() => update(photo.id, { valid_to: photo.valid_to })}
                            style={{ ...fieldStyle, marginBottom: 0 }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button onClick={() => update(photo.id, { is_active: !photo.is_active })} style={pillStyle(photo.is_active)}>
                          {photo.is_active ? '● Active' : '○ Inactive'}
                        </button>
                        {editingUrl === photo.id ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="Paste URL"
                              style={{ ...fieldStyle, width: 120, marginBottom: 0, fontSize: 10 }} />
                            <button onClick={async () => { await update(photo.id, { image_url: newUrl }); setEditingUrl(null); setNewUrl(''); }}
                              style={{ background: '#111111', color: '#F8F7F5', border: 'none', padding: '4px 10px', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>Save</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingUrl(photo.id); setNewUrl(photo.image_url); }}
                            style={{ background: 'none', border: 'none', color: '#888580', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'underline' }}>Update URL</button>
                        )}
                      </div>

                      <button onClick={() => remove(photo.id)}
                        style={{ marginTop: 12, background: 'none', border: 'none', color: '#888580', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', opacity: 0.6 }}>Remove</button>
                    </div>
                  </div>
                ))}

                {photos.length < 10 && !showAdd && (
                  <button onClick={() => setShowAdd(true)}
                    style={{ border: '1px dashed #E2DED8', borderRadius: 6, background: 'transparent', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <span style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 10, color: '#888580', letterSpacing: '0.2em', textTransform: 'uppercase' }}>+ Add cover photo</span>
                  </button>
                )}
              </div>

              {showAdd && (
                <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, padding: '24px', maxWidth: 400, marginBottom: 24 }}>
                  <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, color: '#111111', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>New Cover Photo</div>
                  <label style={labelStyle}>Image URL</label>
                  <input type="url" placeholder="https://…" value={addForm.image_url} onChange={e => setAddForm(f => ({ ...f, image_url: e.target.value }))} style={fieldStyle} />
                  <label style={labelStyle}>Photographer Name</label>
                  <input type="text" placeholder="Studio Name" value={addForm.photographer_name} onChange={e => setAddForm(f => ({ ...f, photographer_name: e.target.value }))} style={fieldStyle} />
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <button onClick={() => setAddForm(f => ({ ...f, is_paid: !f.is_paid }))} style={pillStyle(addForm.is_paid)}>
                      {addForm.is_paid ? '● Paid' : '○ Organic'}
                    </button>
                    {addForm.is_paid && (
                      <input type="number" placeholder="₹ Amount" value={addForm.amount_paid || ''}
                        onChange={e => setAddForm(f => ({ ...f, amount_paid: Number(e.target.value) }))}
                        style={{ ...fieldStyle, width: 100, marginBottom: 0 }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Valid From</label>
                      <input type="date" value={addForm.valid_from} onChange={e => setAddForm(f => ({ ...f, valid_from: e.target.value }))} style={{ ...fieldStyle, marginBottom: 0 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Valid To</label>
                      <input type="date" value={addForm.valid_to} onChange={e => setAddForm(f => ({ ...f, valid_to: e.target.value }))} style={{ ...fieldStyle, marginBottom: 0 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={addPhoto} disabled={saving}
                      style={{ background: '#111111', color: '#F8F7F5', border: 'none', padding: '12px 24px', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>{saving ? 'Saving…' : 'Add photo'}</button>
                    <button onClick={() => setShowAdd(false)}
                      style={{ background: 'none', border: 'none', color: '#888580', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
