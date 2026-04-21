'use client';
import { useEffect, useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const PWD = 'Mira@2551354';
const h = { 'Content-Type': 'application/json', 'x-admin-password': PWD };

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;

type Post = { id: string; vendor_id: string; post_type: string; title: string; description: string; budget: number; city: string; status: string; is_flagged: boolean; created_at: string; vendors: { name: string } | null; };
type Filter = 'all' | 'open' | 'flagged' | 'closed';

export default function AdminCollabPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v2/admin/collab`, { headers: h });
      const d = await r.json();
      setPosts(d.posts || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleFlag = async (id: string) => {
    await fetch(`${API}/api/v2/admin/collab/${id}/flag`, { method: 'PATCH', headers: h });
    setPosts(ps => ps.map(p => p.id === id ? { ...p, is_flagged: !p.is_flagged } : p));
    showToast('Flag updated.');
  };

  const close = async (id: string) => {
    if (!confirm('Close this collab post?')) return;
    await fetch(`${API}/api/v2/admin/collab/${id}/close`, { method: 'PATCH', headers: h });
    setPosts(ps => ps.map(p => p.id === id ? { ...p, status: 'closed' } : p));
    showToast('Post closed.');
  };

  const filtered = posts.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'flagged') return p.is_flagged;
    return p.status === filter;
  });

  const statusPill = (s: string) => {
    const map: Record<string, [string, string]> = {
      open: ['#2A7A4B', '#E8F5EE'],
      closed: ['#888580', '#F0EEE8'],
      filled: ['#C9A84C', 'rgba(201,168,76,0.1)'],
    };
    const [color, bg] = map[s] || ['#888580', '#F0EEE8'];
    return <span style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color, background: bg, padding: '3px 8px', borderRadius: 20 }}>{s}</span>;
  };

  return (
    <>
      <style>{fonts}</style>
      {toast && <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: '#111111', color: '#F8F7F5', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, padding: '10px 20px', borderRadius: 4, zIndex: 9999 }}>{toast}</div>}

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>Collab Hub</div>
        <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111' }}>Moderation</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['all', 'open', 'flagged', 'closed'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ border: `0.5px solid ${filter === f ? '#C9A84C' : '#E2DED8'}`, background: filter === f ? 'rgba(201,168,76,0.08)' : 'transparent', color: filter === f ? '#C9A84C' : '#888580', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 20, cursor: 'pointer' }}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 52, background: '#FFFFFF', borderRadius: 4, border: '1px solid #E2DED8', backgroundImage: 'linear-gradient(90deg, #F8F7F5 25%, #F0EEE8 50%, #F8F7F5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#888580' }}>When Makers start collaborating, it will appear here.</div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#F8F7F5' }}>
                {['Maker', 'Type', 'Title', 'Budget', 'City', 'Status', 'Posted', 'Actions'].map(col => (
                  <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <>
                  <tr key={p.id} style={{ borderTop: '1px solid #F0EEE8', background: p.is_flagged ? '#FFF8F8' : 'transparent', borderLeft: p.is_flagged ? '2px solid #C0392B' : '2px solid transparent' }}>
                    <td style={{ padding: '11px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 13, color: '#111111' }}>{p.vendors?.name || '—'}</td>
                    <td style={{ padding: '11px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#555250', textTransform: 'capitalize' }}>{p.post_type || '—'}</td>
                    <td style={{ padding: '11px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#111111', maxWidth: 160 }}>
                      <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} style={{ background: 'none', border: 'none', textAlign: 'left', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#111111', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>{p.title || '—'}</button>
                    </td>
                    <td style={{ padding: '11px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#555250' }}>{p.budget ? `₹${p.budget.toLocaleString('en-IN')}` : '—'}</td>
                    <td style={{ padding: '11px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#555250' }}>{p.city || '—'}</td>
                    <td style={{ padding: '11px 14px' }}>{statusPill(p.status)}</td>
                    <td style={{ padding: '11px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11, color: '#888580', whiteSpace: 'nowrap' }}>{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button onClick={() => toggleFlag(p.id)} style={{ background: 'none', border: 'none', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: p.is_flagged ? '#C0392B' : '#888580', cursor: 'pointer' }}>{p.is_flagged ? 'Unflag' : 'Flag'}</button>
                        {p.status !== 'closed' && (
                          <button onClick={() => close(p.id)} style={{ background: 'none', border: 'none', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888580', cursor: 'pointer' }}>Close</button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === p.id && (
                    <tr style={{ borderTop: '1px solid #F0EEE8', background: '#FAFAFA' }}>
                      <td colSpan={8} style={{ padding: '12px 14px 16px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#555250', lineHeight: 1.6 }}>
                        {p.description || 'No description provided.'}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
