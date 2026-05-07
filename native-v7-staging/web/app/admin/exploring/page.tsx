'use client';
import { useEffect, useState, useRef } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const PWD = 'Mira@2551354';

interface ExploringPhoto {
  id: string;
  image_url: string;
  display_order: number;
  caption: string | null;
  active: boolean;
  created_at: string;
}

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

const labelStyle: React.CSSProperties = {
  fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7,
  color: '#555250', letterSpacing: '0.22em', textTransform: 'uppercase',
  display: 'block', marginBottom: 4,
};

const fieldStyle: React.CSSProperties = {
  width: '100%', background: 'transparent', border: 'none',
  borderBottom: '1px solid #E2DED8', outline: 'none',
  fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13,
  color: '#111111', padding: '6px 0', marginBottom: 12,
};

export default function ExploringPhotosAdmin() {
  const [photos, setPhotos] = useState<ExploringPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [caption, setCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v2/admin/exploring-photos`, {
        headers: { 'x-admin-password': PWD },
      });
      const d = await r.json();
      if (d.success) setPhotos(d.data);
    } catch { showToast('Failed to load photos'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(10);
    try {
      const compressed = await compressImage(file);
      setUploadProgress(40);
      const form = new FormData();
      form.append('photo', new Blob([compressed], { type: 'image/jpeg' }), `exploring_${Date.now()}.jpg`);
      if (caption.trim()) form.append('caption', caption.trim());
      setUploadProgress(60);
      const r = await fetch(`${API}/api/v2/admin/exploring-photos/upload`, {
        method: 'POST',
        headers: { 'x-admin-password': PWD },
        body: form,
      });
      setUploadProgress(90);
      const d = await r.json();
      if (d.success) {
        setPreviewUrl(d.data.image_url);
        setUploadProgress(100);
        showToast('✓ Photo uploaded');
        setCaption('');
        setShowAdd(false);
        setPreviewUrl('');
        if (fileRef.current) fileRef.current.value = '';
        await load();
      } else {
        showToast(d.error || 'Upload failed');
      }
    } catch (err: any) {
      showToast('Upload error: ' + err.message);
    }
    setUploading(false);
    setUploadProgress(0);
  };

  const toggleActive = async (photo: ExploringPhoto) => {
    try {
      const r = await fetch(`${API}/api/v2/admin/exploring-photos/${photo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': PWD },
        body: JSON.stringify({ active: !photo.active }),
      });
      const d = await r.json();
      if (d.success) {
        setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, active: !p.active } : p));
        showToast(photo.active ? 'Photo deactivated' : '✓ Photo activated');
      }
    } catch { showToast('Failed to update'); }
  };

  const movePhoto = (idx: number, dir: 'up' | 'down') => {
    const newPhotos = [...photos];
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newPhotos.length) return;
    [newPhotos[idx], newPhotos[swapIdx]] = [newPhotos[swapIdx], newPhotos[idx]];
    newPhotos.forEach((p, i) => { p.display_order = i + 1; });
    setPhotos(newPhotos);
    setOrderDirty(true);
  };

  const saveOrder = async () => {
    setSavingOrder(true);
    try {
      await Promise.all(photos.map((p, i) =>
        fetch(`${API}/api/v2/admin/exploring-photos/${p.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-admin-password': PWD },
          body: JSON.stringify({ display_order: i + 1 }),
        })
      ));
      setOrderDirty(false);
      showToast('✓ Order saved');
    } catch { showToast('Failed to save order'); }
    setSavingOrder(false);
  };

  const deletePhoto = async (id: string) => {
    try {
      const r = await fetch(`${API}/api/v2/admin/exploring-photos/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': PWD },
      });
      const d = await r.json();
      if (d.success) {
        setPhotos(prev => prev.filter(p => p.id !== id));
        setDeleteConfirm(null);
        showToast('✓ Photo deleted');
      }
    } catch { showToast('Delete failed'); }
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
    padding: '4px 10px', borderRadius: 20,
    background: on ? 'rgba(201,168,76,0.06)' : 'transparent',
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; }
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
        <div style={{ padding: '48px 40px' }}>

          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>
              Platform
            </div>
            <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111', marginBottom: 4 }}>
              Just Exploring — Editorial Photos
            </div>
            <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: MUTED, lineHeight: 1.6, maxWidth: 560 }}>
              These photos appear in the "Just Exploring" flow on the landing page. Upload stunning editorial images — fashion shoot quality, Vogue-level. First photo shows first. Up to 20 active photos.
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
                Order changed — save to apply on the landing page.
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
              {/* Photos grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
                {photos.map((photo, idx) => (
                  <div key={photo.id} style={{
                    background: '#FFFFFF', border: `1px solid ${BORDER}`,
                    borderRadius: 6, overflow: 'hidden',
                    opacity: photo.active ? 1 : 0.55,
                  }}>
                    {/* Thumbnail */}
                    <div style={{
                      height: 200, position: 'relative',
                      backgroundImage: `url(${photo.image_url})`,
                      backgroundSize: 'cover', backgroundPosition: 'center top',
                    }}>
                      {/* Order badge */}
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
                        color: photo.active ? '#4CAF50' : MUTED,
                        background: 'rgba(255,255,255,0.85)',
                        padding: '3px 8px', borderRadius: 100,
                      }}>{photo.active ? '● Live' : '○ Off'}</div>
                    </div>

                    {/* Controls */}
                    <div style={{ padding: '14px 16px' }}>
                      {photo.caption && (
                        <p style={{
                          fontFamily: '"DM Sans", sans-serif', fontSize: 12, fontWeight: 300,
                          color: MUTED, margin: '0 0 10px', fontStyle: 'italic', lineHeight: 1.4,
                        }}>{photo.caption}</p>
                      )}

                      {/* Reorder */}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <button onClick={() => movePhoto(idx, 'up')} disabled={idx === 0} style={{
                          flex: 1, height: 30, border: `0.5px solid ${BORDER}`, borderRadius: 4,
                          background: idx === 0 ? '#F8F7F5' : '#fff',
                          cursor: idx === 0 ? 'default' : 'pointer',
                          fontFamily: '"Jost", sans-serif', fontSize: 10,
                          color: idx === 0 ? '#ccc' : '#111',
                        }}>↑ Up</button>
                        <button onClick={() => movePhoto(idx, 'down')} disabled={idx === photos.length - 1} style={{
                          flex: 1, height: 30, border: `0.5px solid ${BORDER}`, borderRadius: 4,
                          background: idx === photos.length - 1 ? '#F8F7F5' : '#fff',
                          cursor: idx === photos.length - 1 ? 'default' : 'pointer',
                          fontFamily: '"Jost", sans-serif', fontSize: 10,
                          color: idx === photos.length - 1 ? '#ccc' : '#111',
                        }}>↓ Down</button>
                      </div>

                      {/* Active toggle + Delete */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button onClick={() => toggleActive(photo)} style={pillStyle(photo.active)}>
                          {photo.active ? '● Active' : '○ Inactive'}
                        </button>
                        {deleteConfirm === photo.id ? (
                          <button onClick={() => deletePhoto(photo.id)} style={{
                            background: '#E57373', color: '#fff', border: 'none',
                            padding: '4px 12px', borderRadius: 4, cursor: 'pointer',
                            fontFamily: '"Jost", sans-serif', fontSize: 8,
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                          }}>Confirm delete?</button>
                        ) : (
                          <button onClick={() => setDeleteConfirm(photo.id)} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8,
                            letterSpacing: '0.15em', textTransform: 'uppercase',
                            color: MUTED, opacity: 0.6,
                          }}>Remove</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add slot */}
                {!showAdd && (
                  <button onClick={() => setShowAdd(true)} style={{
                    border: '1px dashed #E2DED8', borderRadius: 6,
                    background: 'transparent', minHeight: 200,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}>
                    <span style={{
                      fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 10,
                      color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase',
                    }}>+ Add editorial photo</span>
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
                  }}>New Editorial Photo</div>

                  {/* Upload area */}
                  <label style={labelStyle}>Photo</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: '1px dashed #E2DED8', borderRadius: 6,
                      padding: 20, marginBottom: 12, cursor: 'pointer',
                      textAlign: 'center', background: '#F8F7F5',
                    }}
                  >
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 4 }} />
                    ) : uploading ? (
                      <div>
                        <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: MUTED, marginBottom: 8 }}>
                          Uploading... {uploadProgress}%
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
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />

                  {/* Caption */}
                  <label style={labelStyle}>Caption (optional)</label>
                  <input
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder="e.g. Soft Lavender Glam by Swati Roy"
                    style={fieldStyle}
                  />

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => { setShowAdd(false); setCaption(''); setPreviewUrl(''); setUploadProgress(0); if (fileRef.current) fileRef.current.value = ''; }}
                      style={{ background: 'none', border: 'none', color: MUTED, fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, cursor: 'pointer' }}
                    >Cancel</button>
                  </div>
                </div>
              )}

              {photos.length === 0 && !showAdd && (
                <div style={{
                  background: '#FFFFFF', border: `0.5px solid ${BORDER}`,
                  borderRadius: 6, padding: '48px 24px', textAlign: 'center', marginTop: 8,
                }}>
                  <p style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 20, fontWeight: 300, color: '#111', margin: '0 0 8px' }}>
                    No photos yet.
                  </p>
                  <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, fontWeight: 300, color: MUTED, margin: 0 }}>
                    Click "+ Add editorial photo" above to upload your first image.
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
