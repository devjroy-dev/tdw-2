'use client';
import { useEffect, useRef, useState } from 'react';
import {
  API, CREAM, GOLD, INK, MUTED, HAIRLINE, FROST_PANEL,
  FONT_DISPLAY, FONT_BODY, FONT_EYEBROW,
  useCircleSession, brideId, brideName,
} from '../CircleSessionContext';

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface HistoryRow {
  id: string;
  role?: string;
  sender?: string;
  message?: string;
  content?: string;
  text?: string;
  created_at: string;
}

function normalizeHistory(rows: HistoryRow[]): ChatTurn[] {
  return rows.map(r => {
    const roleRaw = (r.role || r.sender || '').toLowerCase();
    const role: 'user' | 'assistant' =
      roleRaw === 'assistant' || roleRaw === 'ai' || roleRaw === 'dreamai' ? 'assistant' : 'user';
    return {
      id: r.id,
      role,
      content: r.content || r.message || r.text || '',
      created_at: r.created_at,
    };
  });
}

export default function CoplannerDreamAi() {
  const session   = useCircleSession();
  const bride_id  = brideId(session);
  const granted   = session.permissions?.dreamai_access_granted === true;

  const [turns, setTurns]       = useState<ChatTurn[]>([]);
  const [loading, setLoading]   = useState(true);
  const [composing, setComposing] = useState('');
  const [sending, setSending]   = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!granted) { setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${API}/api/v2/dreamai/circle-member-history/${session.user_id}`);
        const d = await r.json();
        if (!cancelled && d.success) setTurns(normalizeHistory((d.data || []) as HistoryRow[]));
      } catch {}
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [granted, session.user_id]);

  useEffect(() => {
    if (!loading) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns, loading]);

  if (!granted) {
    return (
      <>
        <p style={{
          fontFamily: FONT_EYEBROW, fontWeight: 200, fontSize: 9,
          letterSpacing: '0.32em', textTransform: 'uppercase',
          color: GOLD, margin: '0 0 12px',
        }}>DREAM AI</p>
        <div style={{ ...FROST_PANEL, padding: 28, marginTop: 24 }}>
          <p style={{
            fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontWeight: 300,
            fontSize: 22, color: CREAM, margin: '0 0 8px',
          }}>Not yet.</p>
          <p style={{
            fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13,
            color: MUTED, margin: 0, lineHeight: 1.7,
          }}>
            {brideName(session)} hasn&rsquo;t opened Dream Ai for you. Reach out to her.
          </p>
        </div>
      </>
    );
  }

  const send = async () => {
    const message = composing.trim();
    if (!message || sending) return;
    setSending(true);
    setErrorMsg('');

    const userTurn: ChatTurn = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };
    setTurns(prev => [...prev, userTurn]);
    setComposing('');

    try {
      const r = await fetch(`${API}/api/v2/dreamai/circle-member-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session.user_id,
          primary_user_id: bride_id,
          message,
        }),
      });
      const d = await r.json();
      if (d.success) {
        const reply = d.data?.reply || d.data?.message || d.reply || '';
        if (reply) {
          setTurns(prev => [...prev, {
            id: `reply-${Date.now()}`,
            role: 'assistant',
            content: reply,
            created_at: new Date().toISOString(),
          }]);
        }
      } else {
        setErrorMsg(d.error || 'Could not reach Dream Ai.');
      }
    } catch {
      setErrorMsg('Network error. Try again.');
    }
    setSending(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 120px)' }}>
      <p style={{
        fontFamily: FONT_EYEBROW, fontWeight: 200, fontSize: 9,
        letterSpacing: '0.32em', textTransform: 'uppercase',
        color: GOLD, margin: '0 0 12px',
      }}>DREAM AI</p>

      <h1 style={{
        fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontWeight: 300,
        fontSize: 28, lineHeight: 1.15, color: CREAM,
        margin: '0 0 24px',
      }}>Ask anything about the wedding.</h1>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', paddingBottom: 12 }}>
        {loading && (
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: MUTED }}>Loading…</p>
        )}

        {!loading && turns.length === 0 && (
          <p style={{
            fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13,
            color: MUTED, lineHeight: 1.7, marginTop: 12,
          }}>
            Try: &ldquo;What&rsquo;s the wedding date again?&rdquo; or &ldquo;Suggest sangeet outfit ideas for me.&rdquo;
          </p>
        )}

        {!loading && turns.map(t => (
          <div key={t.id} style={{
            display: 'flex',
            justifyContent: t.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 10,
          }}>
            <div style={{
              maxWidth: '82%',
              background: t.role === 'user' ? 'rgba(201,168,76,0.16)' : 'rgba(255,255,255,0.05)',
              border: `0.5px solid ${t.role === 'user' ? 'rgba(201,168,76,0.3)' : HAIRLINE}`,
              borderRadius: 14,
              padding: '10px 14px',
            }}>
              {t.role === 'assistant' && (
                <p style={{
                  fontFamily: FONT_EYEBROW, fontWeight: 300, fontSize: 9,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  color: GOLD, margin: '0 0 4px',
                }}>DREAM AI</p>
              )}
              <p style={{
                fontFamily: FONT_BODY, fontWeight: 300, fontSize: 14,
                color: CREAM, margin: 0, lineHeight: 1.55,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>{t.content}</p>
            </div>
          </div>
        ))}

        {sending && (
          <p style={{
            fontFamily: FONT_BODY, fontWeight: 300, fontSize: 12,
            color: GOLD, margin: '8px 0',
          }}>Dream Ai is thinking…</p>
        )}

        {errorMsg && (
          <p style={{
            fontFamily: FONT_BODY, fontWeight: 300, fontSize: 12,
            color: '#E07262', margin: '8px 0', textAlign: 'center',
          }}>{errorMsg}</p>
        )}
      </div>

      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        padding: '12px 0 0',
        borderTop: `0.5px solid ${HAIRLINE}`,
      }}>
        <input
          type="text"
          placeholder="Ask Dream Ai"
          aria-label="Ask Dream Ai"
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
