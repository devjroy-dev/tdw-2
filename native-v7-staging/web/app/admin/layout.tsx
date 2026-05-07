'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { margin: 0; background: #FFFFFF; color: #111111; }
  ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #E2DED8; border-radius: 2px; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  .fade-in { animation: fadeIn 240ms cubic-bezier(0.22,1,0.36,1) both; }
  table { border-collapse: collapse; }
  input, select, textarea { color: #111111 !important; background: transparent !important; }
  input::placeholder { color: rgba(0,0,0,0.3) !important; }
`;

const NAV = [
  { group: 'OVERVIEW', items: [
    { label: 'Command Centre', path: '/admin/dashboard', icon: '◈' },
    { label: 'Control Room', path: '/admin/control-room', icon: '◐' },
  ]},
  { group: 'PEOPLE', items: [
    { label: 'Dreamers',             path: '/admin/dreamers',  icon: '♡' },
    { label: 'Makers',               path: '/admin/makers',    icon: '✦' },
    { label: 'Discovery Approvals',  path: '/admin/approvals', icon: '◈' },
    { label: 'Invite Codes',         path: '/admin/invites',   icon: '⌘' },
  ]},
  { group: 'PLATFORM', items: [
    { label: 'Cover Placement',  path: '/admin/cover',    icon: '⬡' },
    { label: 'Preview Vendors',  path: '/admin/preview',  icon: '◈' },
    { label: 'Exploring Photos', path: '/admin/exploring', icon: '✦' },
    { label: 'Messages',         path: '/admin/messages', icon: '💬' },
    { label: 'Image Approvals',  path: '/admin/images',   icon: '⬡' },
    { label: 'Featured',         path: '/admin/featured', icon: '★' },
    { label: 'Hot Dates',        path: '/admin/hot-dates', icon: '🔥' },
  ]},
  { group: 'MONEY', items: [
    { label: 'Revenue', path: '/admin/money', icon: '₹' },
    { label: 'Subscriptions', path: '/admin/subscriptions', icon: '◉' },
  ]},
  { group: 'TOOLS', items: [
    { label: 'Data Tools', path: '/admin/data', icon: '⚙' },
    { label: 'System Health', path: '/admin/health', icon: '●' },
  ]},
];

// Dark theme tokens
const BG = '#FFFFFF';
const BG2 = '#F8F7F5';
const BG3 = '#F0EEE8';
const BORDER = '#E2DED8';
const TEXT = '#111111';
const MUTED = '#888580';
const GOLD = '#C9A84C';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem('admin_session');
    if (!s && pathname !== '/admin/login') router.replace('/admin/login');
    else setAuthed(true);
  }, [pathname, router]);

  if (!authed && pathname !== '/admin/login') return null;
  if (pathname === '/admin/login') return <><style>{FONTS}</style>{children}</>;

  const isActive = (path: string) => pathname === path || (path !== '/admin' && pathname.startsWith(path));

  const nav = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: BG2 }}>
      {/* Brand */}
      <div style={{ padding: '24px 20px 16px', flexShrink: 0 }}>
        <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontWeight: 300, fontSize: 17, color: TEXT, marginBottom: 2 }}>The Dream Wedding</div>
        <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, color: GOLD, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Admin Portal</div>
        <div style={{ height: 1, background: `linear-gradient(to right, ${GOLD}44, transparent)`, marginTop: 14 }} />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
        {NAV.map(({ group, items }) => (
          <div key={group}>
            <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7, color: '#BBBBBB', letterSpacing: '0.3em', textTransform: 'uppercase', padding: '16px 20px 6px' }}>{group}</div>
            {items.map(({ label, path, icon }) => {
              const active = isActive(path);
              return (
                <button key={path} onClick={() => { router.push(path); setNavOpen(false); }} style={{
                  display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
                  padding: '8px 16px 8px 14px', border: 'none', outline: 'none', cursor: 'pointer',
                  fontFamily: '"DM Sans", sans-serif', fontWeight: active ? 400 : 300, fontSize: 13,
                  background: active ? BG3 : 'transparent',
                  color: active ? TEXT : MUTED,
                  borderLeft: `2px solid ${active ? GOLD : 'transparent'}`,
                  borderRadius: '0 6px 6px 0',
                  transition: 'all 0.12s ease',
                }}>
                  <span style={{ fontSize: 11, opacity: 0.5, width: 14, flexShrink: 0 }}>{icon}</span>
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: `0.5px solid ${BORDER}`, flexShrink: 0 }}>
        <button onClick={() => { localStorage.removeItem('admin_session'); router.replace('/admin/login'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: MUTED }}>Sign Out</button>
      </div>
    </div>
  );

  return (
    <>
      <style>{FONTS}</style>
      {navOpen && <div onClick={() => setNavOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 199 }} />}

      {/* Mobile sidebar */}
      <div style={{ position: 'fixed', top: 0, left: navOpen ? 0 : -260, bottom: 0, width: 240, zIndex: 200, transition: 'left 280ms cubic-bezier(0.22,1,0.36,1)', display: 'flex', flexDirection: 'column' }} id="mobile-nav">{nav}</div>

      {/* Desktop sidebar */}
      <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 220, display: 'none', flexDirection: 'column' }} id="desktop-nav">{nav}</div>

      {/* Main */}
      <div id="admin-main" style={{ background: BG, minHeight: '100vh' }}>
        {/* Mobile top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `0.5px solid ${BORDER}`, background: BG2, position: 'sticky', top: 0, zIndex: 100 }} id="mobile-topbar">
          <button onClick={() => setNavOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ width: 20, height: 1.5, background: TEXT }} />
            <div style={{ width: 14, height: 1.5, background: TEXT }} />
            <div style={{ width: 20, height: 1.5, background: TEXT }} />
          </button>
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: 16, fontWeight: 300, color: TEXT }}>TDW Admin</div>
          <div style={{ width: 28 }} />
        </div>

        {/* Content */}
        <div style={{ padding: '28px 20px 80px', color: TEXT }} className="fade-in">
          {children}
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          #desktop-nav { display: flex !important; }
          #mobile-topbar { display: none !important; }
          #mobile-nav { display: none !important; }
          #admin-main { margin-left: 220px; }
        }
      `}</style>
    </>
  );
}
