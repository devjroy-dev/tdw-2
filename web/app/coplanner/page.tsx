'use client';
import { useEffect, useState } from 'react';
import {
  API, CREAM, GOLD, MUTED, HAIRLINE, FROST_PANEL,
  FONT_DISPLAY, FONT_BODY, FONT_EYEBROW,
  useCircleSession, brideId, memberName,
} from './CircleSessionContext';

interface FeedEvent {
  id: string;
  event_type: string;
  payload?: { member_name?: string; subject?: string; vendor_name?: string } | null;
  created_at: string;
}

interface CoupleProfile {
  wedding_date?: string | null;
  bride_name?: string | null;
  groom_name?: string | null;
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86_400_000));
}

function timeAgo(d: string): string {
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Math.floor((Date.now() - t) / 1000);
  if (diff < 60)     return 'Just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function eventLine(e: FeedEvent): string {
  const who   = e.payload?.member_name || 'Someone';
  const verb  = e.event_type.replace(/_/g, ' ');
  const what  = e.payload?.subject || e.payload?.vendor_name || '';
  return what ? `${who} ${verb} ${what}` : `${who} ${verb}`;
}

export default function CoplannerHome() {
  const session  = useCircleSession();
  const bride_id = brideId(session);
  const name     = memberName(session);

  const [profile, setProfile] = useState<CoupleProfile | null>(null);
  const [feed, setFeed]       = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [pr, fr] = await Promise.all([
          fetch(`${API}/api/v2/couple/profile/${bride_id}`).then(r => r.json()).catch(() => null),
          fetch(`${API}/api/v2/frost/circle/feed/${bride_id}?limit=10`).then(r => r.json()).catch(() => null),
        ]);
        if (cancelled) return;
        if (pr?.success && pr.data) setProfile(pr.data as CoupleProfile);
        if (fr?.success) setFeed((fr.data || []) as FeedEvent[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [bride_id]);

  const days = daysUntil(profile?.wedding_date);

  return (
    <>
      <p style={{
        fontFamily: FONT_EYEBROW, fontWeight: 200, fontSize: 9,
        letterSpacing: '0.32em', textTransform: 'uppercase',
        color: GOLD, margin: '0 0 12px',
      }}>WELCOME{name ? `, ${name.toUpperCase()}` : ''}</p>

      <h1 style={{
        fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontWeight: 300,
        fontSize: 36, lineHeight: 1.15, color: CREAM,
        margin: '0 0 6px',
      }}>{session.bride_name}&rsquo;s wedding</h1>

      <p style={{
        fontFamily: FONT_BODY, fontWeight: 300, fontSize: 14,
        color: MUTED, margin: '0 0 32px',
      }}>
        {loading
          ? 'Loading…'
          : days != null
            ? `${days} day${days === 1 ? '' : 's'} to go`
            : 'Date to be announced'}
      </p>

      <section style={{ ...FROST_PANEL, padding: 20, marginBottom: 20 }}>
        <p style={{
          fontFamily: FONT_EYEBROW, fontWeight: 300, fontSize: 9,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: MUTED, margin: '0 0 14px',
        }}>ACTIVITY</p>

        {loading && (
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: MUTED, margin: 0 }}>Loading…</p>
        )}

        {!loading && feed.length === 0 && (
          <p style={{
            fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13,
            color: MUTED, margin: 0, lineHeight: 1.6,
          }}>
            Quiet for now. When {session.bride_name} or someone in the Circle saves
            a vendor or posts a thought, it&rsquo;ll show up here.
          </p>
        )}

        {!loading && feed.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {feed.map(e => (
              <li key={e.id} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '10px 0',
                borderBottom: `0.5px solid ${HAIRLINE}`,
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: GOLD, flexShrink: 0, marginTop: 7,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13,
                    color: CREAM, margin: 0, lineHeight: 1.5,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{eventLine(e)}</p>
                  <p style={{
                    fontFamily: FONT_BODY, fontWeight: 300, fontSize: 11,
                    color: MUTED, margin: '2px 0 0',
                  }}>{timeAgo(e.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
