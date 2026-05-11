'use client';
import { useState } from 'react';
import {
  API, CREAM, GOLD, INK, MUTED, HAIRLINE, FROST_PANEL,
  FONT_DISPLAY, FONT_BODY, FONT_EYEBROW,
  useCircleSession,
} from '../CircleSessionContext';

const CLOUDINARY_CLOUD  = 'dccso5ljv';
const CLOUDINARY_PRESET = 'dream_wedding_uploads';

export default function AddMuseSheet({
  onClose, onSaved,
}: { onClose: () => void; onSaved: () => void }) {
  const session = useCircleSession();
  const [url, setUrl]         = useState('');
  const [uploading, setUp]    = useState(false);
  const [saving, setSaving]   = useState(false);
  const [errorMsg, setErr]    = useState('');

  const uploadFile = async (file: File): Promise<string | null> => {
    setUp(true); setErr('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('upload_preset', CLOUDINARY_PRESET);
      const r = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`,
        { method: 'POST', body: form }
      );
      const d = await r.json();
      if (d.secure_url) return d.secure_url as string;
      setErr('Upload failed. Try a different image.');
      return null;
    } catch {
      setErr('Upload failed. Check your connection.');
      return null;
    } finally {
      setUp(false);
    }
  };

  const save = async (image_url: string) => {
    setSaving(true); setErr('');
    try {
      const r = await fetch(`${API}/api/v2/circle/muse/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberUserId: session.user_id,
          image_url,
          function_tag: 'general',
        }),
      });
      const d = await r.json();
      if (d.success) { onSaved(); return; }
      setErr(d.error || 'Could not save.');
    } catch {
      setErr('Network error. Try again.');
    }
    setSaving(false);
  };

  const submitUrl = () => {
    const v = url.trim();
    if (!v) return;
    save(v);
  };

  const onFile = async (file: File) => {
    const secure = await uploadFile(file);
    if (secure) await save(secure);
  };

  const busy = uploading || saving;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          ...FROST_PANEL,
          background: 'rgba(22,18,16,0.92)',
          width: '100%', maxWidth: 480,
          padding: '24px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)',
          borderRadius: '20px 20px 0 0',
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <p style={{
            fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontWeight: 300,
            fontSize: 22, color: CREAM, margin: 0,
          }}>Share an idea</p>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: MUTED, cursor: 'pointer',
            fontFamily: FONT_EYEBROW, fontSize: 10, letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}>Close</button>
        </div>

        <p style={{
          fontFamily: FONT_EYEBROW, fontWeight: 300, fontSize: 9,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: MUTED, margin: '0 0 8px',
        }}>PASTE A LINK</p>
        <input
          type="url"
          placeholder="Pinterest, Instagram, or image URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
          disabled={busy}
          style={{
            width: '100%', padding: '12px 0',
            background: 'transparent', border: 'none',
            borderBottom: `0.5px solid ${HAIRLINE}`,
            fontFamily: FONT_BODY, fontWeight: 300, fontSize: 15,
            color: CREAM, outline: 'none',
            marginBottom: 12,
          }}
        />
        <button
          onClick={submitUrl}
          disabled={busy || !url.trim()}
          style={{
            width: '100%', height: 44, marginBottom: 24,
            background: GOLD, color: INK,
            border: 'none', borderRadius: 100, cursor: busy || !url.trim() ? 'default' : 'pointer',
            fontFamily: FONT_EYEBROW, fontWeight: 400, fontSize: 9,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            opacity: busy || !url.trim() ? 0.5 : 1,
          }}>{saving ? 'Saving…' : 'Add link'}</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ flex: 1, height: '0.5px', background: HAIRLINE }} />
          <span style={{
            fontFamily: FONT_EYEBROW, fontSize: 9, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: MUTED,
          }}>OR</span>
          <span style={{ flex: 1, height: '0.5px', background: HAIRLINE }} />
        </div>

        <label style={{
          display: 'block', width: '100%', height: 44,
          background: 'transparent',
          border: `0.5px solid ${HAIRLINE}`,
          borderRadius: 100, cursor: busy ? 'default' : 'pointer',
          fontFamily: FONT_EYEBROW, fontWeight: 300, fontSize: 9,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: CREAM, textAlign: 'center', lineHeight: '44px',
          opacity: busy ? 0.5 : 1,
        }}>
          {uploading ? 'Uploading…' : 'Upload from device'}
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
            style={{ display: 'none' }}
          />
        </label>

        {errorMsg && (
          <p style={{
            fontFamily: FONT_BODY, fontWeight: 300, fontSize: 12,
            color: '#E07262', margin: '12px 0 0', textAlign: 'center',
          }}>{errorMsg}</p>
        )}
      </div>
    </div>
  );
}
