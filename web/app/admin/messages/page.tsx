'use client';
import { useEffect, useState, useCallback } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const H = { 'Content-Type': 'application/json', 'x-admin-password': 'Mira@2551354' };

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'; }
function timeAgo(d: string) { const diff = Date.now() - new Date(d).getTime(); const h = Math.floor(diff/3600000); const dd = Math.floor(diff/86400000); if (h < 1) return 'just now'; if (h < 24) return `${h}h ago`; if (dd < 7) return `${dd}d ago`; return fmtDate(d); }
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#F8F7F5', fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: '10px 20px', borderRadius: 100, zIndex: 9999, whiteSpace: 'nowrap' }}>{msg}</div>;
}

interface FlaggedMsg { id: string; enquiry_id: string; content: string; from_role: string; created_at: string; couple_name: string; vendor_name: string; }
interface Thread { id: string; couple_id: string; vendor_id: string; status: string; last_message_at: string; last_message_preview: string; created_at: string; }

export default function MessagesPage() {
  const [tab, setTab] = useState<'flagged'|'threads'>('flagged');
  const [flagged, setFlagged] = useState<FlaggedMsg[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');

  const loadFlagged = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`${API}/api/v3/admin/messages/flagged`, { headers: H });
    const d = await r.json();
    if (d.success) setFlagged(d.data || []);
    setLoading(false);
  }, []);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`${API}/api/v3/admin/messages/threads`, { headers: H });
    const d = await r.json();
    if (d.success) setThreads(d.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (tab === 'flagged') loadFlagged(); else loadThreads(); }, [tab, loadFlagged, loadThreads]);

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 14px', borderRadius: 100, border: 'none', cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', background: active ? '#111' : '#F4F1EC', color: active ? '#F8F7F5' : '#888580',
  });

  const filteredThreads = threads.filter(t => !search || t.last_message_preview?.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 200, fontSize: 9, color: 'rgba(248,247,245,0.4)', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 4px' }}>Admin</p>
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: 32, color: '#F8F7F5', margin: 0 }}>Messages & Moderation</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('flagged')} style={chipStyle(tab === 'flagged')}>
          Flagged {flagged.length > 0 && tab !== 'flagged' ? `(${flagged.length})` : ''}
        </button>
        <button onClick={() => setTab('threads')} style={chipStyle(tab === 'threads')}>All Threads</button>
      </div>

      {/* Flagged tab */}
      {tab === 'flagged' && (
        loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 80, background: '#161412', border: '1px solid rgba(248,247,245,0.1)', borderRadius: 12, backgroundImage: 'linear-gradient(90deg,#1E1C1A 25%,#2A2825 50%,#1E1C1A 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />)}
          </div>
        ) : flagged.length === 0 ? (
          <div style={{ background: '#161412', border: '1px solid rgba(248,247,245,0.1)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: '#4A7C59', margin: 0 }}>✓ No flagged messages today.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {flagged.map(msg => (
              <div key={msg.id} style={{ background: '#161412', border: '1px solid #FFEBEE', borderLeft: '3px solid #9B4545', borderRadius: '0 12px 12px 0', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 400, color: '#F8F7F5', margin: 0 }}>
                    {msg.couple_name} → {msg.vendor_name}
                  </p>
                  <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, color: 'rgba(248,247,245,0.4)' }}>{timeAgo(msg.created_at)}</span>
                </div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: 'rgba(248,247,245,0.55)', margin: '0 0 10px', lineHeight: 1.5 }}>
                  {msg.content.replace(/\[ contact hidden \]/g, '<span style="color:#9B4545;font-weight:400">[ contact hidden ]</span>')}
                </p>
                <a href={`/admin/messages/thread/${msg.enquiry_id}`} style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(248,247,245,0.4)', textDecoration: 'underline' }}>View full thread →</a>
              </div>
            ))}
          </div>
        )
      )}

      {/* Threads tab */}
      {tab === 'threads' && (
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search threads…" style={{ width: '100%', maxWidth: 340, border: 'none', borderBottom: '1px solid rgba(248,247,245,0.08)', background: 'transparent', fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#F8F7F5', padding: '8px 0', outline: 'none', marginBottom: 16 }} />
          <div style={{ background: '#161412', border: '1px solid rgba(248,247,245,0.1)', borderRadius: 12, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#0C0A09' }}>
                  {['Preview', 'Status', 'Last Activity', 'Created'].map(col => (
                    <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontFamily: "'Jost',sans-serif", fontWeight: 200, fontSize: 8, color: 'rgba(248,247,245,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && [1,2,3].map(i => <tr key={i}><td colSpan={4} style={{ padding: '12px 14px' }}><div style={{ height: 14, background: 'linear-gradient(90deg,#1E1C1A 25%,#2A2825 50%,#1E1C1A 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', borderRadius: 4 }} /></td></tr>)}
                {!loading && filteredThreads.map(t => (
                  <tr key={t.id} style={{ borderTop: '0.5px solid rgba(248,247,245,0.06)' }}>
                    <td style={{ padding: '11px 14px', fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#F8F7F5', maxWidth: 300 }}>
                      <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.last_message_preview || '—'}</p>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 100, background: t.status === 'active' ? 'rgba(74,124,89,0.1)' : '#F4F1EC', color: t.status === 'active' ? '#4A7C59' : '#888580' }}>{t.status}</span>
                    </td>
                    <td style={{ padding: '11px 14px', fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(248,247,245,0.4)', whiteSpace: 'nowrap' }}>{timeAgo(t.last_message_at)}</td>
                    <td style={{ padding: '11px 14px', fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(248,247,245,0.4)', whiteSpace: 'nowrap' }}>{fmtDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
