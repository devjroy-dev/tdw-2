'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  API, CREAM, GOLD, MUTED, HAIRLINE, FROST_PANEL,
  FONT_DISPLAY, FONT_BODY, FONT_EYEBROW,
  useCircleSession, brideId,
} from '../CircleSessionContext';

interface Thread {
  thread_id?: string;
  id?: string;
  title?: string | null;
  name?: string | null;
  kind?: string | null;
  last_message?: string | null;
  last_message_preview?: string | null;
  last_message_at?: string | null;
  updated_at?: string | null;
  unread?: number;
}

function threadId(t: Thread): string {
  return (t.thread_id || t.id || '') as string;
}

function threadLabel(t: Thread, fallbackBride: string): string {
  if (t.title) return t.title;
  if (t.name)  return t.name;
  const id = threadId(t);
  if (id.startsWith('dm:')) return `Chat with ${fallbackBride}`;
  if (id.startsWith('group:')) return 'Family group';
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
    const aGroup = (a.kind || threadId(a)).toString().startsWith('group') ? 0 : 1;
    const bGroup = (b.kind || threadId(b)).toString().startsWith('group') ? 0 : 1;
    if (aGroup !== bGroup) return aGroup - bGroup;
    const at = new Date(a.last_message_at || a.updated_at || 0).getTime();
    const bt = new Date(b.last_message_at || b.updated_at || 0).getTime();
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
            No threads yet. When {session.bride_name} starts a conversation
            with you, it&rsquo;ll show up here.
          </p>
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {sorted.map(t => {
            const id      = threadId(t);
            const label   = threadLabel(t, session.bride_name);
            const preview = t.last_message_preview || t.last_message || '';
            const stamp   = timeAgo(t.last_message_at || t.updated_at);
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
