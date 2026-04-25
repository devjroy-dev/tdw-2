'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const GOLD = '#C9A84C';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
  actionType?: string;
  actionLabel?: string;
  actionPreview?: string;
  actionParams?: Record<string, any>;
  actionDone?: boolean;
}

// ─── Session helper ───────────────────────────────────────────────────────────
function getSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─── Robust ACTION tag parser ─────────────────────────────────────────────────
function parseActionTag(text: string) {
  const start = text.indexOf('[ACTION:');
  if (start === -1) return null;
  const end = text.lastIndexOf(']');
  if (end === -1 || end <= start) return null;
  const tagContent = text.slice(start + 8, end);
  const firstPipe = tagContent.indexOf('|');
  const secondPipe = tagContent.indexOf('|', firstPipe + 1);
  const lastBrace = tagContent.lastIndexOf('{');
  if (firstPipe === -1 || secondPipe === -1 || lastBrace === -1) return null;
  const type = tagContent.slice(0, firstPipe);
  const label = tagContent.slice(firstPipe + 1, secondPipe);
  const preview = tagContent.slice(secondPipe + 1, lastBrace - 1).trim();
  const paramsStr = tagContent.slice(lastBrace);
  let params = {};
  try { params = JSON.parse(paramsStr); } catch {}
  const cleanText = (text.slice(0, start) + text.slice(end + 1))
    .replace(/\[ACTION:[^\]]+\]/g, '').trim();
  return { type, label, preview, params, cleanText };
}

// ─── Action Card ──────────────────────────────────────────────────────────────
function ActionCard({ msg, vendorId, onConfirm, onDismiss }: {
  msg: ChatMessage;
  vendorId: string;
  onConfirm: (result: string) => void;
  onDismiss: () => void;
}) {
  const [executing, setExecuting] = useState(false);

  const endpoints: Record<string, string> = {
    create_invoice:        '/api/v2/dreamai/vendor-action/create-invoice',
    add_client:            '/api/v2/dreamai/vendor-action/add-client',
    create_task:           '/api/v2/dreamai/vendor-action/create-task',
    block_date:            '/api/v2/dreamai/vendor-action/block-date',
    send_payment_reminder: '/api/v2/dreamai/vendor-action/send-payment-reminder',
    send_client_reminder:  '/api/v2/dreamai/vendor-action/send-client-reminder',
    log_expense:           '/api/v2/dreamai/vendor-action/log-expense',
    reply_to_enquiry:      '/api/v2/dreamai/vendor-action/reply-to-enquiry',
  };

  async function execute() {
    if (!msg.actionType || executing) return;
    const ep = endpoints[msg.actionType];
    if (!ep) { onConfirm('Action not available yet.'); return; }
    setExecuting(true);
    try {
      const r = await fetch(API + ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, ...(msg.actionParams || {}) }),
      });
      const d = await r.json();
      onConfirm(d.message || '✓ Done.');
    } catch { onConfirm('Could not complete. Please try again.'); }
    finally { setExecuting(false); }
  }

  return (
    <div style={{
      background: 'rgba(201,168,76,0.08)',
      border: '1px solid rgba(201,168,76,0.3)',
      borderRadius: 14,
      padding: '14px 16px',
      margin: '6px 0 4px',
    }}>
      <p style={{
        fontFamily: "'Jost',sans-serif", fontSize: 7, fontWeight: 200,
        letterSpacing: '0.22em', textTransform: 'uppercase' as const,
        color: GOLD, margin: '0 0 8px',
      }}>✦ Action Preview</p>
      <p style={{
        fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 300,
        color: '#F8F7F5', margin: '0 0 14px', lineHeight: 1.5,
      }}>{msg.actionPreview}</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={execute}
          disabled={executing}
          style={{
            flex: 1, height: 42,
            background: executing ? 'rgba(201,168,76,0.5)' : GOLD,
            border: 'none', borderRadius: 100,
            fontFamily: "'Jost',sans-serif", fontSize: 10, fontWeight: 400,
            letterSpacing: '0.18em', textTransform: 'uppercase' as const,
            color: '#0C0A09', cursor: executing ? 'default' : 'pointer',
            touchAction: 'manipulation',
          }}
        >{executing ? '...' : 'Confirm'}</button>
        <button
          onClick={onDismiss}
          style={{
            height: 42, padding: '0 18px',
            background: 'transparent',
            border: '0.5px solid rgba(255,255,255,0.15)',
            borderRadius: 100,
            fontFamily: "'Jost',sans-serif", fontSize: 10, fontWeight: 300,
            letterSpacing: '0.12em', textTransform: 'uppercase' as const,
            color: 'rgba(248,247,245,0.4)', cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >Cancel</button>
      </div>
    </div>
  );
}

// ─── Suggestion chips ─────────────────────────────────────────────────────────
function getContextChips(ctx: any): string[] {
  const chips: string[] = [];
  if (!ctx) return [
    "Who owes me money?",
    "Any new enquiries?",
    "What's my schedule today?",
    "What should I do now?",
  ];
  const overdue = ctx?.overdue_invoices?.length || 0;
  chips.push(overdue > 0 ? `Who owes me money? (${overdue} overdue)` : "Who owes me money?");
  const enqs = (ctx?.enquiries || []).filter((e: any) => !e.replied).length;
  chips.push(enqs > 0 ? `Any new enquiries? (${enqs} pending)` : "Any new enquiries?");
  const nextEvent = ctx?.calendar?.[0];
  chips.push(nextEvent ? `What's happening on ${nextEvent.date?.slice(5)}?` : "What's my schedule today?");
  chips.push("Draft a payment reminder");
  return chips;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function VendorDreamAiPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [contextLoading, setContextLoading] = useState(true);

  // Power user mode — "just do it" — skip confirmation
  const [justDoIt, setJustDoIt] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('dreamai_just_do_it') === 'true';
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const originalMsgRef = useRef<string>('');

  // Heuristic: did the user's message imply multiple actions?
  function impliesMultipleActions(text: string): boolean {
    const multiKeywords = ['and', 'also', 'then', 'plus', 'aur', 'bhi', 'saath'];
    const lower = text.toLowerCase();
    return multiKeywords.some(k => lower.includes(k));
  }

  useEffect(() => {
    const s = getSession();
    if (!s?.id && !s?.vendorId) { router.replace('/'); return; }
    const vid = s.vendorId || s.id;
    setVendorId(vid);
    setVendorName(s.vendorName || s.name || 'Maker');

    fetch(API + '/api/v2/dreamai/vendor-context/' + vid)
      .then(r => r.json())
      .then(d => { setContext(d); setContextLoading(false); })
      .catch(() => setContextLoading(false));
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function toggleJustDoIt() {
    const newVal = !justDoIt;
    setJustDoIt(newVal);
    localStorage.setItem('dreamai_just_do_it', String(newVal));
  }

  const chips = getContextChips(context);

  function getEndpoint(type: string): string | null {
    const eps: Record<string, string> = {
      create_invoice:        '/api/v2/dreamai/vendor-action/create-invoice',
      add_client:            '/api/v2/dreamai/vendor-action/add-client',
      create_task:           '/api/v2/dreamai/vendor-action/create-task',
      block_date:            '/api/v2/dreamai/vendor-action/block-date',
      send_payment_reminder: '/api/v2/dreamai/vendor-action/send-payment-reminder',
      send_client_reminder:  '/api/v2/dreamai/vendor-action/send-client-reminder',
      log_expense:           '/api/v2/dreamai/vendor-action/log-expense',
      reply_to_enquiry:      '/api/v2/dreamai/vendor-action/reply-to-enquiry',
    };
    return eps[type] || null;
  }

  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    // Track original message for multi-action heuristic
    if (msg !== 'Continue with any remaining actions from my last request.') {
      originalMsgRef.current = msg;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: msg,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        text: m.text,
      }));

      const r = await fetch(API + '/api/v2/dreamai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: vendorId,
          userType: 'vendor',
          message: msg,
          context,
          history,
        }),
      });
      const d = await r.json();
      const replyText = d.reply || 'Something went wrong. Please try again.';

      const parsed = parseActionTag(replyText);
      const cleanText = parsed ? parsed.cleanText : replyText.replace(/\[ACTION:[^\]]+\]/g, '').trim();

      if (parsed && justDoIt) {
        // JUST DO IT MODE — execute immediately without confirmation
        const ep = getEndpoint(parsed.type);
        if (ep) {
          try {
            const execR = await fetch(API + ep, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ vendor_id: vendorId, ...parsed.params }),
            });
            const execD = await execR.json();
            setMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              role: 'ai',
              text: (cleanText ? cleanText + '\n\n' : '') + '✓ ' + (execD.message || 'Done.'),
              timestamp: new Date(),
            }]);
          } catch {
            setMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              role: 'ai',
              text: cleanText || 'Could not complete that action.',
              timestamp: new Date(),
            }]);
          }
        } else {
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'ai', text: cleanText, timestamp: new Date(),
          }]);
        }
      } else if (parsed) {
        // Normal mode — show action card for confirmation
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: cleanText,
          timestamp: new Date(),
          actionType: parsed.type,
          actionLabel: parsed.label,
          actionPreview: parsed.preview,
          actionParams: parsed.params,
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai', text: cleanText, timestamp: new Date(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai', text: 'Could not connect. Please check your connection.', timestamp: new Date(),
      }]);
    }
    setLoading(false);
  }

  const firstName = vendorName.split(' ')[0] || 'Maker';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes dot { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
        @keyframes msgIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder { color: rgba(248,247,245,0.3); }
      `}</style>

      <div style={{
        display: 'flex', flexDirection: 'column',
        height: 'calc(100dvh - 56px)',
        background: '#0C0A09',
        position: 'relative',
      }}>

        {/* Status bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px 10px',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: contextLoading ? 'rgba(201,168,76,0.3)' : GOLD,
            }} />
            <span style={{
              fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200,
              letterSpacing: '0.25em', textTransform: 'uppercase' as const,
              color: contextLoading ? 'rgba(201,168,76,0.4)' : GOLD,
            }}>
              {contextLoading ? 'Loading your data...' : 'DreamAi · Live'}
            </span>
          </div>

          {/* Just Do It toggle */}
          <button
            onClick={toggleJustDoIt}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              touchAction: 'manipulation', padding: '2px 0',
            }}
          >
            <span style={{
              fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200,
              letterSpacing: '0.15em', textTransform: 'uppercase' as const,
              color: justDoIt ? GOLD : 'rgba(248,247,245,0.3)',
            }}>Just do it</span>
            <div style={{
              width: 32, height: 18, borderRadius: 9,
              background: justDoIt ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${justDoIt ? GOLD : 'rgba(255,255,255,0.1)'}`,
              position: 'relative', transition: 'all 200ms ease',
            }}>
              <div style={{
                position: 'absolute', top: 2,
                left: justDoIt ? 14 : 2,
                width: 12, height: 12, borderRadius: '50%',
                background: justDoIt ? GOLD : 'rgba(255,255,255,0.3)',
                transition: 'left 200ms ease',
              }} />
            </div>
          </button>
        </div>

        {/* Messages area */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>

          {/* Empty state */}
          {messages.length === 0 && !contextLoading && (
            <div style={{ marginTop: 24, marginBottom: 8 }}>
              <p style={{
                fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic',
                fontWeight: 300, fontSize: 22, color: 'rgba(248,247,245,0.55)',
                lineHeight: 1.3, marginBottom: 6,
              }}>
                Good to see you, {firstName}.
              </p>
              <p style={{
                fontFamily: "'DM Sans',sans-serif", fontWeight: 300, fontSize: 13,
                color: 'rgba(248,247,245,0.35)', lineHeight: 1.5,
              }}>
                Tell me what you need. I'll handle it.
              </p>
            </div>
          )}

          {/* Message thread */}
          {messages.map((m) => (
            <div key={m.id} style={{ animation: 'msgIn 200ms ease' }}>
              <div style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: m.actionType && !m.actionDone ? 2 : 8,
              }}>
                <div style={{
                  maxWidth: '82%',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user'
                    ? '16px 16px 4px 16px'
                    : '16px 16px 16px 4px',
                  background: m.role === 'user'
                    ? GOLD
                    : 'rgba(255,255,255,0.07)',
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: 14, fontWeight: 300,
                  lineHeight: 1.55,
                  color: m.role === 'user' ? '#0C0A09' : '#F8F7F5',
                  whiteSpace: 'pre-wrap' as const,
                }}>
                  {m.text}
                </div>
              </div>

              {/* Action card */}
              {m.actionType && !m.actionDone && (
                <ActionCard
                  msg={m}
                  vendorId={vendorId}
                  onConfirm={async result => {
                    setMessages(prev => prev.map(msg =>
                      msg.id === m.id ? { ...msg, actionDone: true } : msg
                    ));
                    setMessages(prev => [...prev, {
                      id: Date.now().toString(),
                      role: 'ai', text: result, timestamp: new Date(),
                    }]);
                    // Refresh context after action
                    if (vendorId) {
                      const ctx = await fetch(API + '/api/v2/dreamai/vendor-context/' + vendorId)
                        .then(r => r.json()).catch(() => null);
                      if (ctx) setContext(ctx);
                    }
                    // Auto-continue if original message implied multiple actions
                    if (impliesMultipleActions(originalMsgRef.current)) {
                      await send('Continue with any remaining actions from my last request.');
                    }
                  }}
                  onDismiss={() => {
                    setMessages(prev => prev.map(msg =>
                      msg.id === m.id ? { ...msg, actionDone: true } : msg
                    ));
                  }}
                />
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: 'flex', gap: 5, padding: '8px 0', alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%', background: GOLD,
                  animation: `dot 1.2s ${i * 0.2}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestion chips — show when no messages or after AI reply */}
        {(messages.length === 0 || messages[messages.length - 1]?.role === 'ai') && !loading && (
          <div style={{
            padding: '0 20px 10px',
            display: 'flex', gap: 8, overflowX: 'auto',
            scrollbarWidth: 'none' as const, flexShrink: 0,
          }}>
            {chips.map((chip, i) => (
              <button
                key={i}
                onClick={() => send(chip)}
                style={{
                  flexShrink: 0, height: 34, padding: '0 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '0.5px solid rgba(201,168,76,0.35)',
                  borderRadius: 100, cursor: 'pointer',
                  touchAction: 'manipulation',
                  fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300,
                  letterSpacing: '0.12em', textTransform: 'uppercase' as const,
                  color: GOLD, whiteSpace: 'nowrap' as const,
                }}
              >{chip}</button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center',
          padding: '10px 16px',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
          borderTop: '0.5px solid rgba(255,255,255,0.06)',
          background: '#0C0A09', flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Tell me what you need..."
            style={{
              flex: 1, height: 46,
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 100,
              padding: '0 18px',
              fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 300,
              color: '#F8F7F5', outline: 'none',
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: 46, height: 46, borderRadius: '50%', border: 'none',
              flexShrink: 0,
              background: input.trim() && !loading ? GOLD : 'rgba(255,255,255,0.08)',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 150ms ease', touchAction: 'manipulation',
            }}
          >
            <span style={{
              fontSize: 16,
              color: input.trim() && !loading ? '#0C0A09' : 'rgba(255,255,255,0.25)',
            }}>↑</span>
          </button>
        </div>
      </div>
    </>
  );
}
