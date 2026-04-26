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

export default function ExploringPhotosAdmin() {
  const [photos, setPhotos] = useState<ExploringPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [toast, setToast] = useState('');
  const [orderDirty, setOrderDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
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

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return showToast('Select a photo first');
    if (photos.filter(p => p.active).length >= 10) return showToast('Max 10 active photos. Deactivate one first.');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('photo', file);
      if (caption.trim()) form.append('caption', caption.trim());
      const r = await fetch(`${API}/api/v2/admin/exploring-photos/upload`, {
        method: 'POST',
        headers: { 'x-admin-password': PWD },
        body: form,
      });
      const d = await r.json();
      if (d.success) {
        showToast('✓ Photo uploaded');
        setCaption('');
        if (fileRef.current) fileRef.current.value = '';
        await load();
      } else {
        showToast(d.error || 'Upload failed');
      }
    } catch { showToast('Upload error'); }
    setUploading(false);
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
    // Reassign display_order values
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

  const G = '#C9A84C';
  const BORDER = '#E2DED8';
  const MUTED = '#888580';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 999,
          background: '#111', color: '#fff', padding: '10px 18px',
          borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13,
        }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 200, letterSpacing: '0.25em', textTransform: 'uppercase', color: G, margin: '0 0 8px' }}>
          ADMIN · PLATFORM
        </p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: '#111', margin: '0 0 12px' }}>
          Just Exploring — Editorial Photos
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: MUTED, lineHeight: 1.6, margin: 0, maxWidth: 600 }}>
          These photos appear in the "Just Exploring" flow on the landing page. Upload stunning editorial images — fashion shoot quality, Vogue-level. Max 10 active photos. Order matters — first photo shows first.
        </p>
      </div>

      {/* Upload section */}
      <div style={{ background: '#fff', border: `0.5px solid ${BORDER}`, borderRadius: 16, padding: 24, marginBottom: 28 }}>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 400, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#111', margin: '0 0 16px' }}>
          Upload New Photo
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: MUTED, display: 'block', marginBottom: 6 }}>
              Image File
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#111', width: '100%' }}
            />
          </div>
          <div style={{ flex: 2, minWidth: 240 }}>
            <label style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: MUTED, display: 'block', marginBottom: 6 }}>
              Caption (Optional)
            </label>
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="e.g. Soft Lavender Glam by Swati Roy"
              style={{
                width: '100%', padding: '10px 14px', border: `0.5px solid ${BORDER}`,
                borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                color: '#111', outline: 'none', background: '#F8F7F5',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              height: 42, padding: '0 24px', background: uploading ? '#e8e5e0' : G,
              color: uploading ? MUTED : '#0C0A09', border: 'none', borderRadius: 100,
              cursor: uploading ? 'default' : 'pointer', flexShrink: 0,
              fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
              letterSpacing: '0.2em', textTransform: 'uppercase', whiteSpace: 'nowrap',
            }}
          >
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </button>
        </div>
      </div>

      {/* Save order banner */}
      {orderDirty && (
        <div style={{
          background: 'rgba(201,168,76,0.08)', border: `1px solid ${G}`,
          borderRadius: 12, padding: '14px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#111', margin: 0 }}>
            Order changed — save to apply on the landing page.
          </p>
          <button
            onClick={saveOrder}
            disabled={savingOrder}
            style={{
              height: 36, padding: '0 20px', background: G, border: 'none',
              borderRadius: 100, cursor: 'pointer',
              fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
              letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0C0A09',
              flexShrink: 0,
            }}
          >{savingOrder ? 'Saving...' : 'Save Order'}</button>
        </div>
      )}

      {/* Photos grid */}
      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: MUTED }}>
          Loading photos...
        </div>
      ) : photos.length === 0 ? (
        <div style={{
          background: '#fff', border: `0.5px solid ${BORDER}`, borderRadius: 16,
          padding: '48px 24px', textAlign: 'center',
        }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: '#111', margin: '0 0 8px' }}>
            No photos yet.
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: MUTED, margin: 0 }}>
            Upload your first editorial image above.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              style={{
                background: '#fff', border: `0.5px solid ${photo.active ? BORDER : '#F0EEE8'}`,
                borderRadius: 16, overflow: 'hidden',
                opacity: photo.active ? 1 : 0.6,
                transition: 'opacity 200ms',
              }}
            >
              {/* Thumbnail */}
              <div style={{
                width: '100%', paddingTop: '100%', position: 'relative',
                background: '#F8F7F5',
              }}>
                <img
                  src={photo.image_url}
                  alt={photo.caption || `Photo ${photo.display_order}`}
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {/* Order badge */}
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  background: 'rgba(12,10,9,0.7)', color: '#fff',
                  fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 400,
                  letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 100,
                }}>#{idx + 1}</div>
                {/* Active badge */}
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  background: photo.active ? 'rgba(76,175,80,0.85)' : 'rgba(100,100,100,0.7)',
                  color: '#fff', fontFamily: "'Jost', sans-serif", fontSize: 8,
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 100,
                }}>{photo.active ? 'LIVE' : 'OFF'}</div>
              </div>

              {/* Info & controls */}
              <div style={{ padding: 14 }}>
                {photo.caption && (
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
                    color: '#555', margin: '0 0 10px', lineHeight: 1.4,
                    fontStyle: 'italic',
                  }}>{photo.caption}</p>
                )}

                {/* Reorder */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <button
                    onClick={() => movePhoto(idx, 'up')}
                    disabled={idx === 0}
                    style={{
                      flex: 1, height: 30, border: `0.5px solid ${BORDER}`, borderRadius: 6,
                      background: idx === 0 ? '#F8F7F5' : '#fff', cursor: idx === 0 ? 'default' : 'pointer',
                      fontFamily: "'Jost', sans-serif", fontSize: 11, color: idx === 0 ? '#ccc' : '#111',
                    }}
                  >↑ Up</button>
                  <button
                    onClick={() => movePhoto(idx, 'down')}
                    disabled={idx === photos.length - 1}
                    style={{
                      flex: 1, height: 30, border: `0.5px solid ${BORDER}`, borderRadius: 6,
                      background: idx === photos.length - 1 ? '#F8F7F5' : '#fff',
                      cursor: idx === photos.length - 1 ? 'default' : 'pointer',
                      fontFamily: "'Jost', sans-serif", fontSize: 11,
                      color: idx === photos.length - 1 ? '#ccc' : '#111',
                    }}
                  >↓ Down</button>
                </div>

                {/* Active toggle + Delete */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => toggleActive(photo)}
                    style={{
                      flex: 1, height: 30, border: `0.5px solid ${BORDER}`, borderRadius: 6,
                      background: photo.active ? '#fff8e8' : '#fff', cursor: 'pointer',
                      fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: photo.active ? G : MUTED,
                    }}
                  >{photo.active ? 'Deactivate' : 'Activate'}</button>

                  {deleteConfirm === photo.id ? (
                    <button
                      onClick={() => deletePhoto(photo.id)}
                      style={{
                        height: 30, padding: '0 12px', border: 'none', borderRadius: 6,
                        background: '#E57373', cursor: 'pointer',
                        fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
                        letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff',
                        flexShrink: 0,
                      }}
                    >Confirm?</button>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(photo.id)}
                      style={{
                        height: 30, padding: '0 12px', border: `0.5px solid #E2DED8`, borderRadius: 6,
                        background: '#fff', cursor: 'pointer',
                        fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                        color: '#E57373', flexShrink: 0,
                      }}
                    >Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
