'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND = 'https://dream-wedding-production-89ae.up.railway.app';
const ADMIN_PASSWORD = 'Mira@2551354';

interface DiscoverHero {
  id: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  caption: string | null;
  vendor_id: string | null;
  created_at?: string;
}

const labelStyle: React.CSSProperties = {
  fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7,
  color: '#555250', letterSpacing: '0.22em', textTransform: 'uppercase',
  display: 'block', marginBottom: 3,
};

const fieldStyle: React.CSSProperties = {
  width: '100%', background: 'transparent', border: 'none',
  borderBottom: '1px solid #E2DED8', outline: 'none',
  fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12,
  color: '#111111', padding: '6px 0', marginBottom: 10,
};

// Compress image client-side before upload — same pattern as cover photos
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 1920;
      let { width, height } = img;
      if (width > MAX) { height = (height * MAX) / width; width = MAX; }
      if (height > MAX) { width = (width * MAX) / height; height = MAX; }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.92);
    };
    img.src = url;
  });
}

// Upload via backend — same pattern as cover photos / exploring photos
async function uploadHero(file: File, onProgress: (p: number) => void): Promise<string> {
  onProgress(10);
  const compressed = await compressImage(file);
  onProgress(40);
  const formData = new FormData();
  formData.append('file', new Blob([compressed], { type: 'image/jpeg' }), `hero_${Date.now()}.jpg`);
  const res = await fetch(`${BACKEND}/api/v2/admin/discover-heroes/upload`, {
    method: 'POST',
    headers: { 'x-admin-password': ADMIN_PASSWORD },
    body: formData,
  });
  onProgress(90);
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Upload failed: ' + err);
  }
  const d = await res.json();
  onProgress(100);
  return d.url || d.image_url;
}

const MAX_HEROES = 5;

export default function AdminDiscoverHeroesPage() {
  const router = useRouter();
  const [heroes, setHeroes] = useState<DiscoverHero[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ image_url: '', caption: '' });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUrl, setEditingUrl] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [orderDirty, setOrderDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [toast, setToast] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (!session) { router.push('/admin/login'); return; }
    fetchHeroes();
  }, []);

  const fetchHeroes = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/v2/discover-heroes`);
      const d = await r.json();
      // Accept either { success, data } or { heroes } shape
      setHeroes(d.data || d.heroes || []);
    } catch (e) {
      console.error(e);
      showToast('Failed to load heroes');
    } finally {
      setLoading(false);
    }
  };

  const update = async (id: string, body: Partial<DiscoverHero>) => {
    setSaving(true);
    try {
      await fetch(`${BACKEND}/api/v2/admin/discover-heroes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': ADMIN_PASSWORD },
        body: JSON.stringify(body),
      });
      await fetchHeroes();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this hero photo?')) return;
    await fetch(`${BACKEND}/api/v2/admin/discover-heroes/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': ADMIN_PASSWORD },
    });
    await fetchHeroes();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const url = await uploadHero(file, setUploadProgress);
      setAddForm(f => ({ ...f, image_url: url }));
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const addHero = async () => {
    if (!addForm.image_url) return;
    if (heroes.length >= MAX_HEROES) {
      showToast(`Max ${MAX_HEROES} heroes — remove one first`);
      return;
    }
    setSaving(true);
    try {
      await fetch(`${BACKEND}/api/v2/admin/discover-heroes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': ADMIN_PASSWORD },
        body: JSON.stringify({
          ...addForm,
          display_order: heroes.length + 1,
          is_active: true,
        }),
      });
      setShowAdd(false);
      setAddForm({ image_url: '', caption: '' });
      setUploadProgress(0);
      await fetchHeroes();
    } finally {
      setSaving(false);
    }
  };

  const moveHero = (idx: number, dir: 'up' | 'down') => {
    const newHeroes = [...heroes];
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newHeroes.length) return;
    [newHeroes[idx], newHeroes[swapIdx]] = [newHeroes[swapIdx], newHeroes[idx]];
    newHeroes.forEach((h, i) => { h.display_order = i + 1; });
    setHeroes(newHeroes);
    setOrderDirty(true);
  };

  const saveOrder = async () => {
    setSavingOrder(true);
    try {
      await Promise.all(heroes.map((h, i) =>
        fetch(`${BACKEND}/api/v2/admin/discover-heroes/${h.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-admin-password': ADMIN_PASSWORD },
          body: JSON.stringify({ display_order: i + 1 }),
        })
      ));
      setOrderDirty(false);
      showToast('✓ Order saved');
    } catch { showToast('Failed to save order'); }
    finally { setSavingOrder(false); }
  };

  const BORDER = '#E2DED8';
  const MUTED = '#555250';
  const GOLD = '#C9A84C';

  const pillStyle = (on: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
    fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8,
    letterSpacing: '0.18em', textTransform: 'uppercase',
    color: on ? GOLD : MUTED,
    border: `0.5px solid ${on ? GOLD : BORDER}`,
    padding: '4px 10px', borderRadius: 20, transition: 'all 0.2s ease',
    background: on ? 'rgba(201,168,76,0.06)' : 'transparent',
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 999,
          background: '#111', color: '#fff', padding: '10px 18px',
          borderRadius: 8, fontFamily: '"DM Sans", sans-serif', fontSize: 13,
        }}>{toast}</div>
      )}

      <div style={{ minHeight: '100vh', background: '#F8F7F5' }}>
        <div style={{ padding: '48px 40px', overflowY: 'auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>
              Discovery
            </div>
            <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111', marginBottom: 4 }}>
              Discover Heroes
            </div>
            <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: MUTED, lineHeight: 1.6, maxWidth: 560 }}>
              The 5-image rotating carousel that opens the Frost Discover canvas. Full-bleed, magazine-cover aesthetic. Crossfades every ~6s in the app.
            </div>
          </div>

          {/* Save order banner */}
          {orderDirty && (
            <div style={{
              background: 'rgba(201,168,76,0.06)', border: `1px solid ${GOLD}`,
              borderRadius: 6, padding: '14px 20px', marginBottom: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, fontWeight: 300, color: '#111', margin: 0 }}>
                Order changed — save to apply on the app.
              </p>
              <button onClick={saveOrder} disabled={savingOrder} style={{
                height: 36, padding: '0 20px', background: '#111', border: 'none',
                borderRadius: 4, cursor: 'pointer',
                fontFamily: '"Jost", sans-serif', fontSize: 9, fontWeight: 300,
                letterSpacing: '0.18em', textTransform: 'uppercase', color: '#F8F7F5',
              }}>{savingOrder ? 'Saving...' : 'Save Order'}</button>
            </div>
          )}

          {loading ? (
            <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: MUTED }}>Loading…</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
                {heroes.map((hero, idx) => (
                  <div key={hero.id} style={{
                    background: '#FFFFFF', border: `1px solid ${BORDER}`,
                    borderRadius: 6, overflow: 'hidden',
                    opacity: hero.is_active ? 1 : 0.55,
                  }}>
                    {/* Thumbnail */}
                    <div style={{
                      height: 200, position: 'relative',
                      backgroundImage: hero.image_url ? `url(${hero.image_url})` : undefined,
                      backgroundColor: hero.image_url ? undefined : '#F4F1EC',
                      backgroundSize: 'cover', backgroundPosition: 'center',
                    }}>
                      {/* Slot badge */}
                      <div style={{
                        position: 'absolute', top: 8, left: 10,
                        fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9,
                        color: GOLD, letterSpacing: '0.2em',
                      }}>SLOT {idx + 1}</div>
                      {/* Active badge */}
                      <div style={{
                        position: 'absolute', top: 8, right: 10,
                        fontFamily: '"Jost", sans-serif', fontSize: 8, fontWeight: 200,
                        letterSpacing: '0.15em', textTransform: 'uppercase',
                        color: hero.is_active ? '#4CAF50' : MUTED,
                        background: 'rgba(255,255,255,0.85)',
                        padding: '3px 8px', borderRadius: 100,
                      }}>{hero.is_active ? '● Live' : '○ Off'}</div>
                    </div>

                    {/* Controls */}
                    <div style={{ padding: '14px 16px' }}>
                      <label style={labelStyle}>Caption (optional)</label>
                      <input
                        style={fieldStyle} value={hero.caption || ''}
                        onChange={e => setHeroes(p => p.map(x => x.id === hero.id ? { ...x, caption: e.target.value } : x))}
                        onBlur={() => update(hero.id, { caption: hero.caption })}
                        placeholder="e.g. Photographed by Studio Name"
                      />

                      {/* Reorder */}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        <button onClick={() => moveHero(idx, 'up')} disabled={idx === 0} style={{
                          flex: 1, height: 30, border: `0.5px solid ${BORDER}`, borderRadius: 4,
                          background: idx === 0 ? '#F8F7F5' : '#fff',
                          cursor: idx === 0 ? 'default' : 'pointer',
                          fontFamily: '"Jost", sans-serif', fontSize: 10,
                          color: idx === 0 ? '#ccc' : '#111',
                        }}>↑ Up</button>
                        <button onClick={() => moveHero(idx, 'down')} disabled={idx === heroes.length - 1} style={{
                          flex: 1, height: 30, border: `0.5px solid ${BORDER}`, borderRadius: 4,
                          background: idx === heroes.length - 1 ? '#F8F7F5' : '#fff',
                          cursor: idx === heroes.length - 1 ? 'default' : 'pointer',
                          fontFamily: '"Jost", sans-serif', fontSize: 10,
                          color: idx === heroes.length - 1 ? '#ccc' : '#111',
                        }}>↓ Down</button>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button onClick={() => update(hero.id, { is_active: !hero.is_active })} style={pillStyle(hero.is_active)}>
                          {hero.is_active ? '● Active' : '○ Inactive'}
                        </button>
                        {editingUrl === hero.id ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="Paste URL"
                              style={{ ...fieldStyle, width: 120, marginBottom: 0, fontSize: 10 }} />
                            <button
                              onClick={async () => { await update(hero.id, { image_url: newUrl }); setEditingUrl(null); setNewUrl(''); }}
                              style={{ background: '#111111', color: '#F8F7F5', border: 'none', padding: '4px 10px', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>
                              Save
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingUrl(hero.id); setNewUrl(hero.image_url); }}
                            style={{ background: 'none', border: 'none', color: MUTED, fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'underline' }}>
                            Update URL
                          </button>
                        )}
                      </div>

                      <button onClick={() => remove(hero.id)}
                        style={{ marginTop: 12, background: 'none', border: 'none', color: MUTED, fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', opacity: 0.6 }}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add slot button */}
                {heroes.length < MAX_HEROES && !showAdd && (
                  <button onClick={() => setShowAdd(true)} style={{
                    border: '1px dashed #E2DED8', borderRadius: 6,
                    background: 'transparent', minHeight: 200,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}>
                    <span style={{
                      fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 10,
                      color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase',
                    }}>+ Add hero photo</span>
                  </button>
                )}
              </div>

              {/* Add form */}
              {showAdd && (
                <div style={{
                  background: '#FFFFFF', border: `1px solid ${BORDER}`,
                  borderRadius: 6, padding: 24, maxWidth: 440, marginBottom: 24,
                }}>
                  <div style={{
                    fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9,
                    color: '#111', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16,
                  }}>New Hero Photo</div>

                  {/* Upload area */}
                  <label style={labelStyle}>Upload Photo</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '1px dashed #E2DED8', borderRadius: 6,
                      padding: '20px', marginBottom: 12, cursor: 'pointer',
                      textAlign: 'center', background: '#F8F7F5',
                    }}
                  >
                    {addForm.image_url ? (
                      <img src={addForm.image_url} alt="Preview"
                        style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 4 }} />
                    ) : uploading ? (
                      <div>
                        <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: MUTED, marginBottom: 8 }}>
                          Uploading… {uploadProgress}%
                        </div>
                        <div style={{ height: 4, background: '#E2DED8', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${uploadProgress}%`,
                            background: GOLD, borderRadius: 2,
                            transition: 'width 200ms ease',
                          }} />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
                          Click to upload
                        </div>
                        <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11, color: '#888580' }}>
                          JPG, PNG — max 1920px, high quality
                        </div>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />

                  {/* OR divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ flex: 1, height: '0.5px', background: '#E2DED8' }} />
                    <span style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, color: '#888580', letterSpacing: '0.15em' }}>OR PASTE URL</span>
                    <div style={{ flex: 1, height: '0.5px', background: '#E2DED8' }} />
                  </div>

                  <input
                    type="url" placeholder="https://…"
                    value={addForm.image_url}
                    onChange={e => setAddForm(f => ({ ...f, image_url: e.target.value }))}
                    style={fieldStyle}
                  />

                  <label style={labelStyle}>Caption (optional)</label>
                  <input
                    type="text" placeholder="e.g. Photographed by Studio Name"
                    value={addForm.caption}
                    onChange={e => setAddForm(f => ({ ...f, caption: e.target.value }))}
                    style={fieldStyle}
                  />

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={addHero}
                      disabled={saving || uploading || !addForm.image_url}
                      style={{
                        background: addForm.image_url ? '#111111' : '#E2DED8',
                        color: addForm.image_url ? '#F8F7F5' : '#888580',
                        border: 'none', padding: '12px 24px',
                        fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9,
                        letterSpacing: '0.2em', textTransform: 'uppercase',
                        cursor: addForm.image_url ? 'pointer' : 'default', borderRadius: 2,
                      }}
                    >{saving ? 'Saving…' : 'Add hero'}</button>
                    <button
                      onClick={() => { setShowAdd(false); setAddForm({ image_url: '', caption: '' }); setUploadProgress(0); }}
                      style={{ background: 'none', border: 'none', color: MUTED, fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, cursor: 'pointer' }}
                    >Cancel</button>
                  </div>
                </div>
              )}

              {heroes.length === 0 && !showAdd && (
                <div style={{
                  background: '#FFFFFF', border: `0.5px solid ${BORDER}`,
                  borderRadius: 6, padding: '48px 24px', textAlign: 'center', marginTop: 8,
                }}>
                  <p style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 20, fontWeight: 300, color: '#111', margin: '0 0 8px' }}>
                    No heroes yet.
                  </p>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, fontWeight: 300, color: MUTED, margin: 0 }}>
                    Click "+ Add hero photo" to upload your first cover. The Frost Discover canvas stays in an empty state until at least one is live.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
