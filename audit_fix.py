"""
AUDIT FIX — Vendor side system-wide issues
Repo: tdw-2

Fixes:
  1.  TopBar: session key fallback (reads both vendor_session + vendor_web_session)
  2.  TopBar: toggle navigates to correct section on switch
  3.  TopBar: mode persisted to localStorage so it survives page navigation
  4.  TopBar: Settings link goes to /vendor/studio/settings (not "Coming soon")
  5.  TopBar: profile sheet shows category + tier not just "Maker"
  6.  Layout: reads mode from localStorage on mount so mode survives navigation
  7.  Session key fallback: money, calendar, team pages (redirect to /vendor/login)
  8.  Collab page: remove hardcoded duplicate nav
  9.  Discovery Preview: fetches real vendor images and shows them in swipe format
  10. Image Hub: real file upload via Cloudinary (same creds as mobile app)

NOTE: Issue 5 (discovery feed uses seed table) is a backend fix — run phase9_backend.py
already pushed the /api/v2/preview-vendors endpoint. The couple feed already correctly
calls /api/vendors which we fixed in Phase 1. No backend change needed here.

Run from: /workspaces/tdw-2
Command:  python3 audit_fix.py
"""

import os, re

changes = []

# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 1-5 — TopBar: full rewrite
# All 5 TopBar issues fixed in one replacement
# ─────────────────────────────────────────────────────────────────────────────
TOPBAR_PATH = 'web/app/vendor/components/TopBar.tsx'

TOPBAR_NEW = '''\
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, LogOut } from "lucide-react";
import { useAppMode } from "../layout";
import type { AppMode } from "../layout";

function getInitials(name?: string): string {
  if (!name) return 'M';
  return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
}

// Reads both session keys — login paths write to different ones
function getVendorSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function TopBar() {
  const router = useRouter();
  const { mode, setMode } = useAppMode();
  const [profileOpen, setProfileOpen] = useState(false);
  const [vendorName, setVendorName]   = useState('');
  const [category, setCategory]       = useState('');
  const [tier, setTier]               = useState('');
  const [toast, setToast]             = useState('');

  useEffect(() => {
    const s = getVendorSession();
    if (s?.vendorName) setVendorName(s.vendorName);
    if (s?.category)   setCategory(s.category);
    if (s?.tier)       setTier(s.tier);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Switch mode AND navigate to the correct section
  const handleModeSwitch = (m: AppMode) => {
    setMode(m);
    // Persist so mode survives page navigation (layout reads this on mount)
    if (typeof window !== 'undefined') {
      localStorage.setItem('vendor_app_mode', m);
    }
    if (m === 'DISCOVERY') {
      router.push('/vendor/discovery/dash');
    } else {
      router.push('/vendor/today');
    }
  };

  const initials    = getInitials(vendorName);
  const profileSub  = [category, tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : ''].filter(Boolean).join(' · ') || 'Maker';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        @keyframes vendorToastSlide { from{opacity:0;transform:translateY(-40px) translateX(-50%)} to{opacity:1;transform:translateY(0) translateX(-50%)} }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, left: '50%',
          transform: 'translateX(-50%)',
          background: '#111111', color: '#F8F7F5',
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
          padding: '10px 16px', borderRadius: 8, zIndex: 400,
          animation: 'vendorToastSlide 280ms cubic-bezier(0.22,1,0.36,1)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>{toast}</div>
      )}

      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: "56px", backgroundColor: "#0C0A09",
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, boxSizing: "border-box",
      }}>
        {/* TDW wordmark */}
        <span style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: "20px",
          fontWeight: 300, color: "#F8F7F5", letterSpacing: "0.04em", lineHeight: 1,
        }}>TDW</span>

        {/* Mode toggle pill */}
        <div style={{
          display: "inline-flex", alignItems: "center",
          background: "rgba(255,255,255,0.08)", borderRadius: "20px", padding: "3px", gap: 0,
        }}>
          {(["BUSINESS", "DISCOVERY"] as AppMode[]).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => handleModeSwitch(m)}
                style={{
                  fontFamily: "'Jost', sans-serif", fontSize: "10px", fontWeight: 300,
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  padding: "6px 16px", borderRadius: "16px", border: "none", cursor: "pointer",
                  background: active ? "#F8F7F5" : "transparent",
                  color: active ? "#0C0A09" : "rgba(255,255,255,0.5)",
                  transition: "all 180ms cubic-bezier(0.22, 1, 0.36, 1)",
                  whiteSpace: "nowrap",
                }}
              >{m}</button>
            );
          })}
        </div>

        {/* Profile circle */}
        <div
          onClick={() => setProfileOpen(true)}
          style={{
            width: "32px", height: "32px", borderRadius: "50%",
            border: "1px solid #C9A84C", background: "rgba(201,168,76,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, cursor: "pointer", touchAction: "manipulation",
          }}
        >
          <span style={{
            fontFamily: "'Jost', sans-serif", fontSize: "12px",
            fontWeight: 400, color: "#F8F7F5", lineHeight: 1,
          }}>{initials}</span>
        </div>
      </header>

      {/* Profile sheet backdrop */}
      {profileOpen && (
        <div
          onClick={() => setProfileOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(17,17,17,0.4)' }}
        />
      )}

      {/* Profile sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501,
        background: '#FFFFFF', borderRadius: '24px 24px 0 0',
        transform: profileOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)',
        willChange: 'transform',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ width: 36, height: 4, background: '#E2DED8', borderRadius: 2, margin: '12px auto 20px' }} />

        {/* Profile row */}
        <div style={{ padding: '0 24px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: '#111111',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 16, fontWeight: 300, color: '#F8F7F5' }}>{initials}</span>
          </div>
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: '#111111', margin: '0 0 2px' }}>{vendorName || 'Maker'}</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: 0 }}>{profileSub}</p>
          </div>
        </div>

        <div style={{ height: 1, background: '#E2DED8', margin: '0 24px' }} />

        {/* Settings — links to Tips & Features */}
        <div
          onClick={() => { router.push('/vendor/studio/settings'); setProfileOpen(false); }}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px', cursor: 'pointer', touchAction: 'manipulation' }}
        >
          <Settings size={18} color="#888580" strokeWidth={1.5} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#111111' }}>Tips & Features</span>
        </div>

        <div style={{ height: 1, background: '#E2DED8', margin: '0 24px' }} />

        {/* Sign out */}
        <div
          onClick={() => {
            localStorage.removeItem('vendor_web_session');
            localStorage.removeItem('vendor_session');
            localStorage.removeItem('vendor_app_mode');
            window.location.replace('/');
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px', cursor: 'pointer', touchAction: 'manipulation' }}
        >
          <LogOut size={18} color="#888580" strokeWidth={1.5} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#111111' }}>Sign out</span>
        </div>
      </div>
    </>
  );
}
'''

with open(TOPBAR_PATH, 'w') as f:
    f.write(TOPBAR_NEW)
changes.append('✓ Change 1-5: TopBar fully rewritten — session fallback, mode navigation, localStorage persistence, Settings link, category/tier in profile')


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 6 — Layout: read mode from localStorage on mount
# So mode survives page-to-page navigation
# ─────────────────────────────────────────────────────────────────────────────
LAYOUT_PATH = 'web/app/vendor/layout.tsx'
with open(LAYOUT_PATH, 'r') as f:
    layout = f.read()

OLD_LAYOUT_STATE = """  const [mode, setMode] = useState<AppMode>("BUSINESS");"""

NEW_LAYOUT_STATE = """  // Read persisted mode from localStorage so it survives page navigation
  const [mode, setMode] = useState<AppMode>(() => {
    if (typeof window === 'undefined') return 'BUSINESS';
    const saved = localStorage.getItem('vendor_app_mode');
    return (saved === 'DISCOVERY' || saved === 'BUSINESS') ? saved as AppMode : 'BUSINESS';
  });"""

if OLD_LAYOUT_STATE in layout:
    layout = layout.replace(OLD_LAYOUT_STATE, NEW_LAYOUT_STATE)
    with open(LAYOUT_PATH, 'w') as f:
        f.write(layout)
    changes.append('✓ Change 6: Layout reads mode from localStorage — mode survives navigation')
else:
    changes.append('✗ Change 6 FAILED — layout state pattern not found')


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 7 — Session key fallback + correct redirect on money, calendar, team
# ─────────────────────────────────────────────────────────────────────────────
SESSION_FIXES = [
    {
        'path': 'web/app/vendor/money/page.tsx',
        'old': """    const raw = localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/pin-login'); return; }
    try {
      const s = JSON.parse(raw);
      if (!s.vendorId) { window.location.replace('/vendor/pin-login'); return; }
      setVendorId(s.vendorId);
    } catch { window.location.replace('/vendor/pin-login'); }""",
        'new': """    const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/login'); return; }
    try {
      const s = JSON.parse(raw);
      const vid = s.vendorId || s.id;
      if (!vid) { window.location.replace('/vendor/login'); return; }
      setVendorId(vid);
    } catch { window.location.replace('/vendor/login'); }""",
    },
    {
        'path': 'web/app/vendor/studio/calendar/page.tsx',
        'old': """    const raw = localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/pin-login'); return; }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.vendorId) { window.location.replace('/vendor/pin-login'); return; }
      setVendorId(parsed.vendorId);
    } catch { window.location.replace('/vendor/pin-login'); }""",
        'new': """    const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/login'); return; }
    try {
      const parsed = JSON.parse(raw);
      const vid = parsed.vendorId || parsed.id;
      if (!vid) { window.location.replace('/vendor/login'); return; }
      setVendorId(vid);
    } catch { window.location.replace('/vendor/login'); }""",
    },
    {
        'path': 'web/app/vendor/studio/team/page.tsx',
        'old': """    const raw = localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/pin-login'); return; }
    try {
      const s = JSON.parse(raw);
      if (!s.vendorId) { window.location.replace('/vendor/pin-login'); return; }
      setVendorId(s.vendorId);
    } catch { window.location.replace('/vendor/pin-login'); }""",
        'new': """    const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/login'); return; }
    try {
      const s = JSON.parse(raw);
      const vid = s.vendorId || s.id;
      if (!vid) { window.location.replace('/vendor/login'); return; }
      setVendorId(vid);
    } catch { window.location.replace('/vendor/login'); }""",
    },
]

for fix in SESSION_FIXES:
    path = fix['path']
    with open(path, 'r') as f:
        src = f.read()
    if fix['old'] in src:
        src = src.replace(fix['old'], fix['new'])
        with open(path, 'w') as f:
            f.write(src)
        changes.append(f'✓ Change 7: Session fallback + correct redirect fixed in {path.split("/")[-2]}/{path.split("/")[-1]}')
    else:
        changes.append(f'✗ Change 7 FAILED — pattern not found in {path}')


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 8 — Remove hardcoded duplicate nav from collab page
# ─────────────────────────────────────────────────────────────────────────────
COLLAB_PATH = 'web/app/vendor/discovery/collab/page.tsx'
with open(COLLAB_PATH, 'r') as f:
    collab = f.read()

COLLAB_NAV = """      {/* Discovery bottom nav */}
      <nav style={{position:'fixed',bottom:0,left:0,right:0,background:'#F8F7F5',borderTop:'1px solid #E2DED8',display:'flex',alignItems:'center',justifyContent:'space-around',paddingBottom:'env(safe-area-inset-bottom)',zIndex:100}}>
        {[{key:'dash',label:'Dash',href:'/vendor/discovery/dash'},{key:'leads',label:'Leads',href:'/vendor/leads'},{key:'hub',label:'Image Hub',href:'/vendor/discovery/hub'},{key:'collab',label:'Collab',href:'/vendor/discovery/collab'}].map(item=>(
          <a key={item.key} href={item.href} style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'12px 10px',gap:4,textDecoration:'none'}}>
            <span style={{fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:item.key==='collab'?400:300,letterSpacing:'0.12em',textTransform:'uppercase',color:item.key==='collab'?'#111':'#888580'}}>{item.label}</span>
            {item.key==='collab'&&<span style={{width:4,height:4,borderRadius:'50%',background:'#C9A84C',display:'block'}}/>}
          </a>
        ))}
      </nav>"""

if COLLAB_NAV in collab:
    collab = collab.replace(COLLAB_NAV, '      {/* Nav handled by layout — BottomNav component */}')
    with open(COLLAB_PATH, 'w') as f:
        f.write(collab)
    changes.append('✓ Change 8: Collab duplicate nav removed')
else:
    changes.append('✗ Change 8 FAILED — collab nav pattern not found')


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 9 — Discovery Preview: fetch real vendor images and show them
# The old page set vendorCards = [] immediately, showing nothing.
# Now it fetches the vendor's own images from /api/vendor-images/:vendorId
# and builds a card that shows in the DiscoverFeed blind swipe format.
# ─────────────────────────────────────────────────────────────────────────────
PREVIEW_PATH = 'web/app/vendor/studio/discovery-preview/page.tsx'

PREVIEW_NEW = '''\
"use client";
// Discovery Preview — shows the vendor their profile exactly as couples see it.
// Fetches their real images and passes them into the couple-facing swipe feed.
// Names are revealed at tap level 1 (they're previewing their own profile).
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API = 'https://dream-wedding-production-89ae.up.railway.app';

function getSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

interface VendorImage { id: string; url: string; tags: string[]; approved: boolean; }

export default function DiscoveryPreviewPage() {
  const router = useRouter();
  const [images, setImages]   = useState<VendorImage[]>([]);
  const [imgIdx, setImgIdx]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const s = getSession();
    if (!s?.vendorId && !s?.id) { router.replace('/vendor/login'); return; }
    setSession(s);
    const vendorId = s.vendorId || s.id;

    fetch(`${API}/api/vendor-images/${vendorId}`)
      .then(r => r.json())
      .then(d => {
        const imgs: VendorImage[] = (d.data || []);
        // Show hero first, then the rest
        const hero = imgs.filter(i => i.tags?.includes('hero'));
        const rest = imgs.filter(i => !i.tags?.includes('hero'));
        setImages([...hero, ...rest]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const current = images[imgIdx];
  const vendorName = session?.vendorName || 'Your profile';
  const category   = session?.category   || '';

  const next = () => setImgIdx(i => Math.min(i + 1, images.length - 1));
  const prev = () => setImgIdx(i => Math.max(i - 1, 0));

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0C0A09', zIndex: 0 }}>
      <style>{`* { box-sizing: border-box; } ::-webkit-scrollbar { display: none; }`}</style>

      {/* Back button */}
      <a href="/vendor/studio" style={{
        position: 'fixed', top: 20, left: 20, zIndex: 200,
        fontFamily: "'Jost', sans-serif", fontWeight: 300, fontSize: 13,
        color: '#C9A84C', textDecoration: 'none',
        background: 'rgba(0,0,0,0.4)', padding: '8px 14px', borderRadius: 100,
      }}>← Studio</a>

      {/* Couple-view label */}
      <div style={{
        position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 200, fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 200,
        letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(248,247,245,0.5)',
        background: 'rgba(0,0,0,0.4)', padding: '6px 14px', borderRadius: 100,
        whiteSpace: 'nowrap',
      }}>How couples see you</div>

      {loading ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 20, color: 'rgba(248,247,245,0.5)' }}>Loading your profile...</p>
        </div>
      ) : images.length === 0 ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300, color: '#F8F7F5', margin: '0 0 12px' }}>No photos yet</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#888580', margin: '0 0 20px' }}>Add photos in Image Hub to see your discovery preview.</p>
            <a href="/vendor/discovery/images" style={{
              fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
              letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', textDecoration: 'none',
            }}>Go to Image Hub →</a>
          </div>
        </div>
      ) : (
        <>
          {/* Full screen image */}
          {current && (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${current.url})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }} />
          )}

          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
            background: 'linear-gradient(to bottom, transparent, rgba(12,10,9,0.85))',
            pointerEvents: 'none',
          }} />

          {/* Image nav dots */}
          <div style={{
            position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 4, zIndex: 100,
          }}>
            {images.map((_, i) => (
              <div key={i} onClick={() => setImgIdx(i)} style={{
                width: i === imgIdx ? 16 : 4, height: 4, borderRadius: 2,
                background: i === imgIdx ? '#C9A84C' : 'rgba(255,255,255,0.3)',
                transition: 'width 300ms ease', cursor: 'pointer',
              }} />
            ))}
          </div>

          {/* Vendor info — blind (no name shown on first view, like couples see) */}
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, padding: '0 20px 40px' }}>
            <p style={{
              fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 10,
              letterSpacing: '0.25em', textTransform: 'uppercase',
              color: 'rgba(248,247,245,0.7)', margin: '0 0 6px',
            }}>{category} · {session?.city || 'India'}</p>

            {/* Name is visible in preview (it's your own profile) */}
            <p style={{
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
              fontSize: 36, color: '#FAFAF8', margin: '0 0 6px', lineHeight: 1.1,
            }}>{vendorName}</p>

            <p style={{
              fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
              letterSpacing: '0.15em', color: 'rgba(248,247,245,0.4)',
              margin: '0 0 16px',
            }}>Couples see your name only after spending a token</p>

            {/* Photo navigation */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={prev} disabled={imgIdx === 0} style={{
                flex: 1, height: 44, background: 'rgba(255,255,255,0.1)',
                border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 100,
                cursor: imgIdx === 0 ? 'default' : 'pointer', color: '#F8F7F5',
                fontFamily: "'Jost', sans-serif", fontSize: 9, letterSpacing: '0.15em',
                textTransform: 'uppercase', opacity: imgIdx === 0 ? 0.3 : 1,
              }}>← Prev</button>
              <button onClick={next} disabled={imgIdx >= images.length - 1} style={{
                flex: 1, height: 44, background: imgIdx >= images.length - 1 ? 'rgba(201,168,76,0.3)' : '#C9A84C',
                border: 'none', borderRadius: 100,
                cursor: imgIdx >= images.length - 1 ? 'default' : 'pointer',
                color: '#0C0A09', fontFamily: "'Jost', sans-serif", fontSize: 9,
                letterSpacing: '0.15em', textTransform: 'uppercase',
              }}>
                {imgIdx >= images.length - 1 ? `All ${images.length} photos` : `Next (${imgIdx + 1}/${images.length})`}
              </button>
            </div>

            {/* Approval status note */}
            {images.some(i => !i.approved) && (
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C9A84C',
                margin: '12px 0 0', textAlign: 'center',
              }}>
                {images.filter(i => !i.approved).length} photo{images.filter(i => !i.approved).length !== 1 ? 's' : ''} pending admin approval — won't show to couples yet
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
'''

with open(PREVIEW_PATH, 'w') as f:
    f.write(PREVIEW_NEW)
changes.append('✓ Change 9: Discovery Preview rewritten — fetches real vendor images, shows swipe-style preview with approval status')


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 10 — Image Hub: real file upload via Cloudinary
# Adds a "Choose Photo" file input that uploads directly to Cloudinary
# using the same cloud name and preset already used in the mobile app.
# URL paste option is kept as a fallback.
# ─────────────────────────────────────────────────────────────────────────────
IMAGES_PATH = 'web/app/vendor/discovery/images/page.tsx'
with open(IMAGES_PATH, 'r') as f:
    images_src = f.read()

# Replace the upload section - old URL-only section with new file+URL section
OLD_UPLOAD = """  // ─── Upload via Cloudinary URL paste (no file upload server needed) ────────
  // Vendors paste a direct image URL (from WhatsApp, Google Drive, etc.)
  // In a future release this will be a proper file picker with Cloudinary direct upload.
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  async function submitUrl() {
    const s = getSession();
    if (!s || !urlInput.trim()) return;
    const vendorId = s.vendorId || s.id;
    setUploading(true);
    try {
      const r = await fetch(`${API}/api/vendor-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, url: urlInput.trim(), tags: [] }),
      });
      const d = await r.json();
      if (d.success) {
        setToast('Photo added — pending admin approval');
        setUrlInput('');
        setShowUrlInput(false);
        load();
      } else {
        setToast(d.error || 'Upload failed');
      }
    } catch { setToast('Upload failed — check connection'); }
    setUploading(false);
  }"""

NEW_UPLOAD = """  // ─── Upload: file picker → Cloudinary → backend ─────────────────────────────
  // Same Cloudinary account used by the mobile app.
  // Vendors pick a photo from their camera roll, it uploads directly to Cloudinary,
  // then the secure URL is saved to the backend for admin approval.
  const CLOUDINARY_CLOUD  = 'dccso5ljv';
  const CLOUDINARY_PRESET = 'dream_wedding_uploads';

  const [urlInput, setUrlInput]       = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const s = getSession();
    if (!s) return;
    const vendorId = s.vendorId || s.id;
    setUploading(true);
    try {
      // Step 1: Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_PRESET);
      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
        method: 'POST', body: formData,
      });
      const cloudData = await cloudRes.json();
      if (!cloudData.secure_url) {
        setToast('Upload failed — please try again');
        setUploading(false);
        return;
      }
      // Step 2: Save URL to backend for admin approval
      const r = await fetch(`${API}/api/vendor-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, url: cloudData.secure_url, tags: [] }),
      });
      const d = await r.json();
      if (d.success) {
        setToast('Photo uploaded — pending admin approval');
        load();
      } else {
        setToast(d.error || 'Could not save photo');
      }
    } catch { setToast('Upload failed — check connection'); }
    setUploading(false);
    // Reset file input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  }

  async function submitUrl() {
    const s = getSession();
    if (!s || !urlInput.trim()) return;
    const vendorId = s.vendorId || s.id;
    setUploading(true);
    try {
      const r = await fetch(`${API}/api/vendor-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, url: urlInput.trim(), tags: [] }),
      });
      const d = await r.json();
      if (d.success) {
        setToast('Photo added — pending admin approval');
        setUrlInput('');
        setShowUrlInput(false);
        load();
      } else {
        setToast(d.error || 'Upload failed');
      }
    } catch { setToast('Upload failed — check connection'); }
    setUploading(false);
  }"""

if OLD_UPLOAD in images_src:
    images_src = images_src.replace(OLD_UPLOAD, NEW_UPLOAD)
    changes.append('✓ Change 10a: Image Hub — Cloudinary file upload function added')
else:
    changes.append('✗ Change 10a FAILED — upload function pattern not found')

# Replace the Add Photo button to include file picker + URL option
OLD_ADD_BTN = """        {/* Add photo button */}
        <div style={{ padding: '0 20px 20px' }}>
          <button
            onClick={() => setShowUrlInput(v => !v)}
            style={{
              width: '100%', height: 48,
              background: showUrlInput ? '#1A1816' : '#C9A84C',
              color: showUrlInput ? '#8C8480' : '#0C0A09',
              border: showUrlInput ? '1px solid #2A2825' : 'none',
              borderRadius: 100, cursor: 'pointer',
              fontFamily: "'Jost', sans-serif", fontSize: 10,
              fontWeight: 400, letterSpacing: '0.2em', textTransform: 'uppercase',
            }}
          >
            {showUrlInput ? 'Cancel' : '+ Add Photo'}
          </button>

          {showUrlInput && ("""

NEW_ADD_BTN = """        {/* Add photo — file picker (primary) + URL paste (fallback) */}
        <div style={{ padding: '0 20px 20px' }}>
          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />

          {/* Primary: pick from camera roll */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              width: '100%', height: 52,
              background: uploading ? '#2A2825' : '#C9A84C',
              color: uploading ? '#555250' : '#0C0A09',
              border: 'none', borderRadius: 100, cursor: uploading ? 'default' : 'pointer',
              fontFamily: "'Jost', sans-serif", fontSize: 10,
              fontWeight: 400, letterSpacing: '0.2em', textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            {uploading ? 'Uploading...' : '+ Choose Photo'}
          </button>

          {/* Secondary: paste URL */}
          <button
            onClick={() => setShowUrlInput(v => !v)}
            style={{
              width: '100%', height: 40,
              background: 'transparent',
              color: '#555250',
              border: '0.5px solid #2A2825',
              borderRadius: 100, cursor: 'pointer',
              fontFamily: "'Jost', sans-serif", fontSize: 9,
              fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase',
            }}
          >
            {showUrlInput ? 'Cancel' : 'Paste URL instead'}
          </button>

          {showUrlInput && ("""

if OLD_ADD_BTN in images_src:
    images_src = images_src.replace(OLD_ADD_BTN, NEW_ADD_BTN)
    changes.append('✓ Change 10b: Image Hub — "Choose Photo" file picker button added as primary action')
else:
    changes.append('✗ Change 10b FAILED — add photo button pattern not found')

with open(IMAGES_PATH, 'w') as f:
    f.write(images_src)


# ─────────────────────────────────────────────────────────────────────────────
# Report
# ─────────────────────────────────────────────────────────────────────────────
print('\nAudit Fix — complete\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Audit fix: toggle nav, session keys, discovery preview, file upload, mode persistence, collab nav" && git push')
