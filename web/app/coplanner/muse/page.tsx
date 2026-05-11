'use client';
import { useEffect, useState } from 'react';
import {
  API, CREAM, GOLD, INK, MUTED, HAIRLINE, FROST_PANEL,
  FONT_DISPLAY, FONT_BODY, FONT_EYEBROW,
  useCircleSession, brideId,
} from '../CircleSessionContext';
import AddMuseSheet from './AddMuseSheet';

interface MuseTile {
  id: string;
  image_url: string;
  source_url?: string | null;
  vendor_name?: string | null;
  vendor_category?: string | null;
}

export default function CoplannerMuse() {
  const session  = useCircleSession();
  const bride_id = brideId(session);
  const canAdd   = session.permissions?.can_contribute_muse === true;

  const [tiles, setTiles]     = useState<MuseTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = async () => {
    try {
      const r = await fetch(
        `${API}/api/v2/circle/muse/${bride_id}?memberUserId=${session.user_id}`
      );
      const d = await r.json();
      if (d.success) setTiles((d.data || []) as MuseTile[]);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [bride_id, session.user_id]);

  return (
    <>
      <p style={{
        fontFamily: FONT_EYEBROW, fontWeight: 200, fontSize: 9,
        letterSpacing: '0.32em', textTransform: 'uppercase',
        color: GOLD, margin: '0 0 12px',
      }}>MUSE</p>

      <h1 style={{
        fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontWeight: 300,
        fontSize: 32, lineHeight: 1.15, color: CREAM,
        margin: '0 0 6px',
      }}>{session.bride_name}&rsquo;s board</h1>

      <p style={{
        fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13,
        color: MUTED, margin: '0 0 24px', lineHeight: 1.6,
      }}>{canAdd
        ? 'Browse what she’s saving. Share something new with the + below.'
        : 'You can browse her board. Share new ideas by chatting with her.'}
      </p>

      {loading && (
        <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: MUTED }}>Loading…</p>
      )}

      {!loading && tiles.length === 0 && (
        <div style={{ ...FROST_PANEL, padding: 24, textAlign: 'center' }}>
          <p style={{
            fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13,
            color: MUTED, margin: 0, lineHeight: 1.6,
          }}>
            {session.bride_name} hasn&rsquo;t saved anything yet.
            {canAdd ? ' Add the first idea?' : ''}
          </p>
        </div>
      )}

      {!loading && tiles.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
        }}>
          {tiles.map(t => (
            <a
              key={t.id}
              href={t.source_url || t.image_url}
              target="_blank"
              rel="noreferrer noopener"
              style={{
                position: 'relative', display: 'block',
                aspectRatio: '3 / 4',
                borderRadius: 12, overflow: 'hidden',
                border: `0.5px solid ${HAIRLINE}`,
                background: 'rgba(255,255,255,0.04)',
                textDecoration: 'none',
              }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.image_url}
                alt=""
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {t.vendor_name && (
                <div style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0,
                  padding: '10px 10px 8px',
                  background: 'linear-gradient(to top, rgba(12,10,9,0.78), transparent)',
                }}>
                  <p style={{
                    fontFamily: FONT_BODY, fontWeight: 400, fontSize: 11,
                    color: CREAM, margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{t.vendor_name}</p>
                </div>
              )}
            </a>
          ))}
        </div>
      )}

      {canAdd && (
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Add to board"
          style={{
            position: 'fixed',
            right: 'calc(50vw - 240px + 20px)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
            width: 56, height: 56, borderRadius: '50%',
            background: GOLD, color: INK,
            border: 'none', cursor: 'pointer',
            fontSize: 28, fontWeight: 300,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 40,
          }}>+</button>
      )}

      {sheetOpen && (
        <AddMuseSheet
          onClose={() => setSheetOpen(false)}
          onSaved={() => { setSheetOpen(false); load(); }}
        />
      )}
    </>
  );
}
