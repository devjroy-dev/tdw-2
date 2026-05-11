'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  API, CREAM, GOLD, INK, MUTED, HAIRLINE,
  FONT_DISPLAY, FONT_BODY, FONT_EYEBROW,
  useCircleSession, brideId, brideName, memberName,
} from '../../CircleSessionContext';

interface Message {
  id: string;
  body?: string | null;
  content?: string | null;
  sender_user_id?: string | null;
  sender_name?: string | null;
  sender_role?: string | null;
  actor_role?: string | null;
  created_at: string;
}

const ROLE_LABEL: Record<string, string> = {
  Partner: 'Partner',
  inner_circle: 'Inner Circle',
  circle: 'Circle',
  co_planner: 'Circle',
  primary: 'Bride',
};

function msgBody(m: Message): string {
  return (m.body || m.content || '') as string;
}

function msgRoleLabel(m: Message): string {
  const r = m.actor_role || m.sender_role || '';
  return ROLE_LABEL[r] || '';
}

function timeShort(d: string): string {
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return '';
  return new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export default function ThreadDetail() {
  const router    = useRouter();
  const params    = useParams();
  const session   = useCircleSession();
  const thread_id = decodeURIComponent((params?.threadId as string) || '');
  const bride_id  = brideId(session);
  const myName    = memberName(session);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(true);
  const [composing, setComposing] = useState('');
  const [sending, setSending]   = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    try {
      const r = await fetch(
        `${API}/api/v2/frost/circle/threads/${bride_id}/${encodeURIComponent(thread_id)}/messages`
      );
      const d = await r.json();
      if (d.success) setMessages((d.data || []) as Message[]);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (!thread_id) return;
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [bride_id, thread_id]);

  useEffect(() => {
    if (!loading) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  const send = async () => {
    const body = composing.trim();
    if (!body || sending) return;
    setSending(true);
    setComposing('');
    try {
      await fetch(`${API}/api/v2/frost/circle/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: bride_id,
          thread_id,
          body,
          sender_name: myName,
        }),
      });
      await load();
    } catch {
      setComposing(body);
    }
    setSending(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          onClick={() => router.push('/coplanner/threads')}
          aria-label="Back"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: MUTED, fontSize: 22, lineHeight: 1, padding: 0,
            fontFamily: FONT_BODY,
          }}>‹</button>
        <h1 style={{
          fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontWeight: 300,
          fontSize: 22, color: CREAM, margin: 0,
        }}>
          {thread_id.startsWith('dm:') ? `Chat with ${brideName(session)}` : 'Thread'}
        </h1>
      </div>

      <div ref={scrollRef} style={{
        flex: 1,
        overflowY: 'auto',
        paddingBottom: 12,
      }}>
        {loading && (
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: MUTED }}>Loading…</p>
        )}

        {!loading && messages.length === 0 && (
          <p style={{
            fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13,
            color: MUTED, lineHeight: 1.6, textAlign: 'center', marginTop: 32,
          }}>No messages yet. Say hello.</p>
        )}

        {!loading && messages.map(m => {
          const mine = m.sender_user_id === session.user_id;
          return (
            <div key={m.id} style={{
              display: 'flex',
              justifyContent: mine ? 'flex-end' : 'flex-start',
              marginBottom: 10,
            }}>
              <div style={{
                maxWidth: '78%',
                background: mine ? 'rgba(201,168,76,0.16)' : 'rgba(255,255,255,0.05)',
                border: `0.5px solid ${mine ? 'rgba(201,168,76,0.3)' : HAIRLINE}`,
                borderRadius: 14,
                padding: '10px 14px',
              }}>
                {!mine && m.sender_name && (
                  <p style={{
                    fontFamily: FONT_EYEBROW, fontWeight: 300, fontSize: 9,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    color: GOLD, margin: '0 0 4px',
                  }}>
                    {m.sender_name}{msgRoleLabel(m) ? ` · ${msgRoleLabel(m)}` : ''}
                  </p>
                )}
                <p style={{
                  fontFamily: FONT_BODY, fontWeight: 300, fontSize: 14,
                  color: CREAM, margin: 0, lineHeight: 1.5,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>{msgBody(m)}</p>
                <p style={{
                  fontFamily: FONT_BODY, fontWeight: 300, fontSize: 10,
                  color: MUTED, margin: '4px 0 0', textAlign: 'right',
                }}>{timeShort(m.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        padding: '12px 0 0',
        borderTop: `0.5px solid ${HAIRLINE}`,
      }}>
        <input
          type="text"
          placeholder="Write a message"
          aria-label="Type your message"
          value={composing}
          onChange={e => setComposing(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={sending}
          onFocus={(e) => { e.currentTarget.style.outline = `2px solid ${GOLD}`; e.currentTarget.style.outlineOffset = '2px'; }}
          onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
          style={{
            flex: 1, height: 44,
            background: 'rgba(255,255,255,0.05)',
            border: `0.5px solid ${HAIRLINE}`,
            borderRadius: 100,
            padding: '0 16px',
            fontFamily: FONT_BODY, fontWeight: 300, fontSize: 14,
            color: CREAM, outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={sending || !composing.trim()}
          style={{
            height: 44, padding: '0 18px',
            background: composing.trim() ? GOLD : 'rgba(255,255,255,0.05)',
            color: composing.trim() ? INK : MUTED,
            border: 'none', borderRadius: 100,
            cursor: sending || !composing.trim() ? 'default' : 'pointer',
            fontFamily: FONT_EYEBROW, fontWeight: 400, fontSize: 9,
            letterSpacing: '0.22em', textTransform: 'uppercase',
          }}>{sending ? '…' : 'Send'}</button>
      </div>
    </div>
  );
}
