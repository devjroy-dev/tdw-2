'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  API, CREAM, GOLD, MUTED, HAIRLINE, FROST_PANEL,
  FONT_DISPLAY, FONT_BODY, FONT_EYEBROW,
  useCircleSession, brideId, brideName,
} from '../CircleSessionContext';

// Shape matches GET /api/v2/frost/circle/threads/:userId (backend ~15883).
// Backend sends: thread_id, kind ('dm'|'group'), label, last_message (object), last_active.
interface LastMessage {
  content?: string | null;
  sender_name?: string | null;
  sender_role?: string | null;
  created_at?: string | null;
}

interface Thread {
  thread_id?: string;
  kind?: string | null;
  label?: string | null;        // backend field — was incorrectly read as title/name
  last_message?: LastMessage | null; // object, not string
  last_active?: string | null;  // backend field — was incorrectly read as last_message_at
  [extra: string]: unknown;
}

function threadId(t: Thread): string {
  return (t.thread_id || '') as string;
}

function threadLabel(t: Thread, fallbackBride: string): string {
  if (t.label) return t.label;                          // backend sends label directly
  const id = threadId(t);
  if (id.startsWith('dm:'))  return `Chat with ${fallbackBride}`;
  if (id.startsWith('grp:')) return 'Group';            // backend uses 'grp:' not 'group:'
  return 'Circle';
}

function timeAgo(d?: string | null): string {
  if (!d) return '';
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Math.floor((Date.now() - t) / 1000);
  if (diff < 60)    return 'now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function CoplannerThreads() {
  const router  = useRouter();
  const session = useCircleSession();
  const bride_id = brideId(session);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${API}/api/v2/frost/circle/threads/${bride_id}`);
        const d = await r.json();
        if (!cancelled && d.success) setThreads((d.data || []) as Thread[]);
      } catch {}
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [bride_id]);

  const sorted = [...threads].sort((a, b) => {
    const aGroup = a.kind === 'group' ? 0 : 1;          // backend kind: 'group' | 'dm'
    const bGroup = b.kind === 'group' ? 0 : 1;
    if (aGroup !== bGroup) return aGroup - bGroup;
    const at = new Date((a.last_active as string) || 0).getTime();   // backend: last_active
    const bt = new Date((b.last_active as string) || 0).getTime();
    return bt - at;
  });

  return (
    <>
      <p style={{
        fontFamily: FONT_EYEBROW, fontWeight: 200, fontSize: 9,
        letterSpacing: '0.32em', textTransform: 'uppercase',
        color: GOLD, margin: '0 0 12px',
      }}>THREADS</p>

      <h1 style={{
        fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontWeight: 300,
        fontSize: 32, lineHeight: 1.15, color: CREAM,
        margin: '0 0 24px',
      }}>Conversations.</h1>

      {loading && (
        <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: MUTED }}>Loading…</p>
      )}

      {!loading && sorted.length === 0 && (
        <div style={{ ...FROST_PANEL, padding: 24, textAlign: 'center' }}>
          <p style={{
            fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13,
            color: MUTED, margin: 0, lineHeight: 1.6,
          }}>
            No threads yet. When {brideName(session)} starts a conversation
            with you, it&rsquo;ll show up here.
          </p>
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {sorted.map(t => {
            const id      = threadId(t);
            const label   = threadLabel(t, brideName(session));
            const preview = t.last_message?.content || '';
            const stamp   = timeAgo(t.last_active);
            return (
              <li key={id}>
                <button
                  onClick={() => router.push(`/coplanner/threads/${encodeURIComponent(id)}`)}
                  style={{
                    width: '100%', textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '14px 0',
                    borderBottom: `0.5px solid ${HAIRLINE}`,
                    color: CREAM,
                  }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{
                      fontFamily: FONT_BODY, fontWeight: 400, fontSize: 15,
                      color: CREAM, margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      flex: 1,
                    }}>{label}</p>
                    {stamp && (
                      <span style={{
                        fontFamily: FONT_BODY, fontWeight: 300, fontSize: 11,
                        color: MUTED, flexShrink: 0,
                      }}>{stamp}</span>
                    )}
                  </div>
                  {preview && (
                    <p style={{
                      fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13,
                      color: MUTED, margin: '4px 0 0',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{preview}</p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
