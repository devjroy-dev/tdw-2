'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { margin: 0; background: #F8F7F5; }
`;

const NAV: { group: string; items: { label: string; path: string }[] }[] = [
  { group: 'OVERVIEW', items: [{ label: 'Home', path: '/admin' }] },
  { group: 'VENDORS', items: [
    { label: 'All Makers', path: '/admin/vendors' },
    { label: 'Invite Codes', path: '/admin/invites' },
  ]},
  { group: 'DREAMERS', items: [
    { label: 'All Dreamers', path: '/admin/couples' },
  ]},
  { group: 'DISCOVERY', items: [
    { label: 'Photo Approvals', path: '/admin/photos' },
    { label: 'Cover Placement', path: '/admin/cover' },
  ]},
  { group: 'DREAMAI', items: [
    { label: 'Access & Quotas', path: '/admin/dreamai' },
  ]},
  { group: 'COUTURE', items: [
    { label: 'Product Catalog', path: '/admin/couture' },
  ]},
  { group: 'COLLAB', items: [
    { label: 'Moderation', path: '/admin/collab' },
  ]},
  { group: 'MONEY', items: [
    { label: 'Revenue', path: '/admin/revenue' },
  ]},
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem('admin_session');
    if (!s && pathname !== '/admin/login') {
      router.replace('/admin/login');
    } else {
      setAuthed(true);
    }
  }, [pathname]);

  if (!authed && pathname !== '/admin/login') return null;
  if (pathname === '/admin/login') return <>{children}</>;

  const isActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin';
    return pathname.startsWith(path);
  };

  return (
    <>
      <style>{fonts}</style>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F8F7F5' }}>
        {/* Sidebar */}
        <div style={{
          width: 220, background: '#F8F7F5', borderRight: '0.5px solid #E2DED8',
          position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto',
          flexShrink: 0, display: 'flex', flexDirection: 'column',
        }}>
          {/* Brand */}
          <div style={{ padding: '24px 20px 0' }}>
            <div style={{
              fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic',
              fontWeight: 300, fontSize: 16, color: '#111111', marginBottom: 2,
            }}>The Dream Wedding</div>
            <div style={{
              fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8,
              color: '#555250', letterSpacing: '0.25em', textTransform: 'uppercase',
            }}>Admin</div>
            <div style={{ height: 0.5, background: '#C9A84C', opacity: 0.25, margin: '12px 0 16px' }} />
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, paddingBottom: 24 }}>
            {NAV.map(({ group, items }) => (
              <div key={group}>
                <div style={{
                  fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8,
                  color: '#C9A84C', letterSpacing: '0.25em', textTransform: 'uppercase',
                  padding: '16px 20px 4px',
                }}>{group}</div>
                {items.map(({ label, path }) => {
                  const active = isActive(path);
                  return (
                    <button
                      key={path}
                      onClick={() => router.push(path)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '7px 16px', border: 'none', outline: 'none', cursor: 'pointer',
                        fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13,
                        background: active ? '#FFFFFF' : 'transparent',
                        color: active ? '#111111' : '#555250',
                        borderLeft: active ? '2px solid #C9A84C' : '2px solid transparent',
                        borderRadius: '0 4px 4px 0',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#F0EEE8'; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div style={{ marginLeft: 220, flex: 1, padding: '32px 40px', minHeight: '100vh' }}>
          {children}
        </div>
      </div>
    </>
  );
}
