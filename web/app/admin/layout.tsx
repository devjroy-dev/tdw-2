'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { margin: 0; background: #F8F7F5; }
  ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #E2DED8; border-radius: 2px; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  .fade-in { animation: fadeIn 240ms cubic-bezier(0.22,1,0.36,1) both; }
`;

const NAV = [
  { group: 'OVERVIEW', items: [{ label: 'Command Centre', path: '/admin/dashboard', icon: '◈' }]},
  { group: 'PEOPLE', items: [{ label: 'Dreamers', path: '/admin/dreamers', icon: '♡' },{ label: 'Makers', path: '/admin/makers', icon: '✦' }]},
  { group: 'PLATFORM', items: [{ label: 'Messages', path: '/admin/messages', icon: '💬' },{ label: 'Image Approvals', path: '/admin/images', icon: '⬡' },{ label: 'Featured', path: '/admin/featured', icon: '★' }]},
  { group: 'MONEY', items: [{ label: 'Revenue', path: '/admin/money', icon: '₹' },{ label: 'Subscriptions', path: '/admin/subscriptions', icon: '◉' }]},
  { group: 'TOOLS', items: [{ label: 'Data Tools', path: '/admin/data', icon: '⚙' },{ label: 'System Health', path: '/admin/health', icon: '●' }]},
  { group: 'LEGACY', items: [{ label: 'Revenue', path: '/admin/revenue', icon: '₹' },{ label: 'Photos', path: '/admin/photos', icon: '⊡' },{ label: 'Vendors', path: '/admin/vendors', icon: '⊞' },{ label: 'Couples', path: '/admin/couples', icon: '⊛' }]},
];

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
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'24px 20px 16px', flexShrink:0 }}>
        <div style={{ fontFamily:'"Cormorant Garamond",serif', fontStyle:'italic', fontWeight:300, fontSize:16, color:'#111', marginBottom:2 }}>The Dream Wedding</div>
        <div style={{ fontFamily:'"Jost",sans-serif', fontWeight:200, fontSize:8, color:'#C9A84C', letterSpacing:'0.3em', textTransform:'uppercase' }}>Admin Portal</div>
        <div style={{ height:1, background:'linear-gradient(to right,rgba(201,168,76,0.4),transparent)', marginTop:14 }} />
      </div>
      <nav style={{ flex:1, overflowY:'auto', paddingBottom:16 }}>
        {NAV.map(({ group, items }) => (
          <div key={group}>
            <div style={{ fontFamily:'"Jost",sans-serif', fontWeight:200, fontSize:7, color:'#C8C4BE', letterSpacing:'0.28em', textTransform:'uppercase', padding:'14px 20px 5px' }}>{group}</div>
            {items.map(({ label, path, icon }) => {
              const active = isActive(path);
              return (
                <button key={path} onClick={() => { router.push(path); setNavOpen(false); }} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', textAlign:'left', padding:'7px 16px 7px 14px', border:'none', outline:'none', cursor:'pointer', fontFamily:'"DM Sans",sans-serif', fontWeight:active?400:300, fontSize:13, background:active?'#FFFFFF':'transparent', color:active?'#111':'#555250', borderLeft:`2px solid ${active?'#C9A84C':'transparent'}`, borderRadius:'0 6px 6px 0', transition:'all 0.12s ease' }}>
                  <span style={{ fontSize:10, opacity:0.5, width:14, flexShrink:0 }}>{icon}</span>
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div style={{ padding:'12px 16px', borderTop:'0.5px solid #E2DED8', flexShrink:0 }}>
        <button onClick={() => { localStorage.removeItem('admin_session'); router.replace('/admin/login'); }} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'"Jost",sans-serif', fontWeight:200, fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'#888580' }}>Sign Out</button>
      </div>
    </div>
  );

  return (
    <>
      <style>{FONTS}</style>
      {navOpen && <div onClick={() => setNavOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:199 }} />}
      <div style={{ position:'fixed', top:0, left:navOpen?0:-260, bottom:0, width:240, background:'#FAFAF8', borderRight:'0.5px solid #E2DED8', zIndex:200, transition:'left 280ms cubic-bezier(0.22,1,0.36,1)', display:'flex', flexDirection:'column' }} id="mobile-nav">{nav}</div>
      <div style={{ position:'fixed', top:0, left:0, bottom:0, width:220, background:'#FAFAF8', borderRight:'0.5px solid #E2DED8', display:'none', flexDirection:'column' }} id="desktop-nav">{nav}</div>
      <div id="admin-main">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'0.5px solid #E2DED8', background:'#FAFAF8', position:'sticky', top:0, zIndex:100 }} id="mobile-topbar">
          <button onClick={() => setNavOpen(o => !o)} style={{ background:'none', border:'none', cursor:'pointer', padding:4, display:'flex', flexDirection:'column', gap:4 }}>
            <div style={{ width:20, height:1.5, background:'#555250' }} />
            <div style={{ width:14, height:1.5, background:'#555250' }} />
            <div style={{ width:20, height:1.5, background:'#555250' }} />
          </button>
          <div style={{ fontFamily:'"Cormorant Garamond",serif', fontStyle:'italic', fontSize:15, fontWeight:300, color:'#111' }}>TDW Admin</div>
          <div style={{ width:28 }} />
        </div>
        <div style={{ padding:'28px 20px 80px' }} className="fade-in">{children}</div>
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
