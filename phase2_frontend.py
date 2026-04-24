"""
PHASE 2 — Frontend patch
Repo: tdw-2

Changes:
  1. Create /vendor/discovery/images/page.tsx  — Image Hub (fixes BUG 1: 404 on nav tap)
  2. Create /vendor/discovery/leads/page.tsx   — redirect to /vendor/leads (fixes BUG 2)
  3. Fix vendor/today/page.tsx                 — add vendor_session fallback (fixes BUG 3)
  4. Fix vendor/clients/page.tsx               — remove hardcoded duplicate nav (fixes BUG 9)

Run from: /workspaces/tdw-2
Command:  python3 phase2_frontend.py
"""

import os

changes = []

# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 1
# Create /vendor/discovery/images/page.tsx — the Image Hub.
#
# Vendors upload photos here. Each photo is tagged (hero / carousel / portfolio).
# Photos are sent for admin approval before going live on the couple feed.
# Uses GET /api/vendor-images/:vendor_id to load, POST /api/vendor-images to upload,
# POST /api/vendor-images/set-hero to set the hero, DELETE /api/vendor-images/:id to remove.
#
# Design: matches the dark theme of the rest of the Discovery section.
# ─────────────────────────────────────────────────────────────────────────────

IMAGE_HUB_PAGE = """\
'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ─── Session ─────────────────────────────────────────────────────────────────
function getSession() {
  if (typeof window === 'undefined') return null;
  try {
    // Always check both keys — some pages set one, some set the other
    const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface VendorImage {
  id: string;
  url: string;
  tags: string[];       // e.g. ['hero'], ['carousel'], [], ['portfolio']
  approved: boolean;    // true = admin approved, false = pending/rejected
  caption?: string;
  created_at?: string;
}

// ─── Small components ─────────────────────────────────────────────────────────
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      background: '#111', color: '#F8F7F5',
      fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
      padding: '10px 18px', borderRadius: 8, zIndex: 300, whiteSpace: 'nowrap',
    }}>{msg}</div>
  );
}

function Shimmer() {
  return (
    <div style={{
      height: 160, borderRadius: 12,
      background: 'linear-gradient(90deg, #1A1816 25%, #222 50%, #1A1816 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
    }} />
  );
}

function TagBadge({ label, gold }: { label: string; gold?: boolean }) {
  return (
    <span style={{
      fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      padding: '2px 7px', borderRadius: 100,
      background: gold ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.08)',
      color: gold ? '#C9A84C' : '#8C8480',
    }}>{label}</span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ImageHubPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(undefined);
  const [images, setImages] = useState<VendorImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSession();
    setSession(s);
    if (!s?.vendorId && !s?.id) {
      router.replace('/vendor/login');
    }
  }, [router]);

  // ─── Load images ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const s = getSession();
    if (!s) return;
    const vendorId = s.vendorId || s.id;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/vendor-images/${vendorId}`);
      const d = await r.json();
      if (d.success) setImages(d.data || []);
    } catch { /* silently handle — images just stay empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { if (session?.vendorId || session?.id) load(); }, [session, load]);

  // ─── Upload via Cloudinary URL paste (no file upload server needed) ────────
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
  }

  // ─── Set hero ─────────────────────────────────────────────────────────────
  async function setHero(imageId: string) {
    const s = getSession();
    if (!s) return;
    const vendorId = s.vendorId || s.id;
    try {
      await fetch(`${API}/api/vendor-images/set-hero`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, image_id: imageId }),
      });
      setToast('Hero photo updated');
      load();
    } catch { setToast('Failed to set hero'); }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  async function deleteImage(imageId: string) {
    try {
      await fetch(`${API}/api/vendor-images/${imageId}`, { method: 'DELETE' });
      setImages(prev => prev.filter(i => i.id !== imageId));
      setDeleteTarget(null);
      setToast('Photo removed');
    } catch { setToast('Delete failed'); }
  }

  // ─── Derived ──────────────────────────────────────────────────────────────
  const heroImage = images.find(i => i.tags?.includes('hero'));
  const otherImages = images.filter(i => !i.tags?.includes('hero'));
  const pendingCount = images.filter(i => !i.approved).length;

  if (session === undefined) return null;
  if (!session) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{ background: '#1A1816', borderRadius: 16, padding: 28, maxWidth: 320, width: '100%', border: '1px solid #2A2825' }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: '#F8F7F5', margin: '0 0 8px' }}>Remove photo?</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#8C8480', margin: '0 0 20px' }}>This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => deleteImage(deleteTarget)} style={{
                flex: 1, height: 44, background: '#9B4545', color: '#F8F7F5', border: 'none',
                borderRadius: 100, fontFamily: "'Jost', sans-serif", fontSize: 9,
                letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
              }}>Remove</button>
              <button onClick={() => setDeleteTarget(null)} style={{
                height: 44, padding: '0 20px', background: 'transparent',
                border: '1px solid #3A3835', borderRadius: 100,
                fontFamily: "'Jost', sans-serif", fontSize: 9, color: '#8C8480', cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: '#0C0A09', minHeight: '100dvh',
        paddingTop: 24,
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom) + 24px)',
      }}>

        {/* Header */}
        <div style={{ padding: '0 20px 24px' }}>
          <p style={{
            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
            letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8C8480', margin: '0 0 6px',
          }}>YOUR DISCOVERY</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300,
              color: '#F8F7F5', margin: 0, lineHeight: 1.1,
            }}>Image Hub</h1>
            {pendingCount > 0 && (
              <span style={{
                fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                letterSpacing: '0.12em', color: '#C9A84C',
              }}>{pendingCount} pending review</span>
            )}
          </div>
        </div>

        {/* How approval works — shown only when no images yet */}
        {!loading && images.length === 0 && (
          <div style={{ padding: '0 20px 24px' }}>
            <div style={{
              background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)',
              borderRadius: 14, padding: '16px 18px',
            }}>
              <p style={{
                fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
                letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 8px',
              }}>HOW IT WORKS</p>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                color: '#8C8480', lineHeight: 1.6, margin: 0,
              }}>
                Add your best photos below. Each one is reviewed by our team before going live on the couple discovery feed. Your hero photo appears first — make it editorial.
              </p>
            </div>
          </div>
        )}

        {/* Add photo button */}
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

          {showUrlInput && (
            <div style={{ marginTop: 12 }}>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
                color: '#8C8480', margin: '0 0 8px',
              }}>Paste a direct image URL (WhatsApp photo link, Google Drive, etc.)</p>
              <input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://..."
                style={{
                  width: '100%', background: '#1A1816', border: '1px solid #2A2825',
                  borderRadius: 8, padding: '12px 14px', color: '#F8F7F5',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                  outline: 'none', marginBottom: 10,
                }}
              />
              <button
                onClick={submitUrl}
                disabled={uploading || !urlInput.trim()}
                style={{
                  width: '100%', height: 44,
                  background: urlInput.trim() ? '#C9A84C' : '#2A2825',
                  color: urlInput.trim() ? '#0C0A09' : '#555250',
                  border: 'none', borderRadius: 100, cursor: urlInput.trim() ? 'pointer' : 'default',
                  fontFamily: "'Jost', sans-serif", fontSize: 10,
                  fontWeight: 400, letterSpacing: '0.2em', textTransform: 'uppercase',
                }}
              >
                {uploading ? 'Adding...' : 'Submit for Review'}
              </button>
            </div>
          )}
        </div>

        {/* Hero photo */}
        {(loading || heroImage) && (
          <div style={{ padding: '0 20px 20px' }}>
            <p style={{
              fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
              letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8C8480', margin: '0 0 10px',
            }}>HERO PHOTO</p>
            {loading ? <Shimmer /> : heroImage && (
              <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
                <img
                  src={heroImage.url}
                  alt="Hero"
                  style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
                />
                <div style={{
                  position: 'absolute', bottom: 10, left: 10,
                  display: 'flex', gap: 6, flexWrap: 'wrap',
                }}>
                  <TagBadge label="Hero" gold />
                  {heroImage.approved
                    ? <TagBadge label="Approved" gold />
                    : <TagBadge label="Pending review" />}
                </div>
                <button
                  onClick={() => setDeleteTarget(heroImage.id)}
                  style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', color: '#F8F7F5',
                    border: 'none', cursor: 'pointer', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >×</button>
              </div>
            )}
          </div>
        )}

        {/* Portfolio grid */}
        <div style={{ padding: '0 20px' }}>
          {otherImages.length > 0 && (
            <p style={{
              fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
              letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8C8480', margin: '0 0 10px',
            }}>PORTFOLIO</p>
          )}

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[1, 2, 3, 4].map(i => <Shimmer key={i} />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {otherImages.map(img => (
                <div key={img.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                  <img
                    src={img.url}
                    alt="Portfolio"
                    style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                  />
                  {/* Status badge */}
                  <div style={{ position: 'absolute', bottom: 6, left: 6 }}>
                    {img.approved
                      ? <TagBadge label="Live" gold />
                      : <TagBadge label="Pending" />}
                  </div>
                  {/* Set as hero + delete */}
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}>
                    <button
                      onClick={() => setHero(img.id)}
                      title="Set as hero"
                      style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: 'rgba(201,168,76,0.85)', border: 'none',
                        cursor: 'pointer', fontSize: 11, color: '#0C0A09',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >★</button>
                    <button
                      onClick={() => setDeleteTarget(img.id)}
                      style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.6)', border: 'none',
                        cursor: 'pointer', fontSize: 13, color: '#F8F7F5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >×</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && images.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 40, paddingBottom: 20 }}>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300,
                color: '#3A3835', margin: '0 0 8px',
              }}>No photos yet</p>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#555250',
              }}>Add your first photo above</p>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
"""

# Write Image Hub page
img_hub_dir = 'web/app/vendor/discovery/images'
os.makedirs(img_hub_dir, exist_ok=True)
img_hub_path = f'{img_hub_dir}/page.tsx'
with open(img_hub_path, 'w') as f:
    f.write(IMAGE_HUB_PAGE)
changes.append(f'✓ Change 1: Created {img_hub_path} — Image Hub page (fixes BUG 1: 404 on nav tap)')


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 2
# Create /vendor/discovery/leads/page.tsx — redirect to /vendor/leads.
# The Discovery nav links to /vendor/discovery/leads but the real Leads page
# lives at /vendor/leads. Simple redirect keeps the nav working without
# duplicating the entire Leads page.
# ─────────────────────────────────────────────────────────────────────────────

LEADS_REDIRECT = """\
'use client';
// The Discovery nav points here. Real Leads page lives at /vendor/leads.
// This redirect keeps the nav working without duplicating code.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DiscoveryLeadsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/vendor/leads'); }, [router]);
  return null;
}
"""

leads_dir = 'web/app/vendor/discovery/leads'
os.makedirs(leads_dir, exist_ok=True)
leads_path = f'{leads_dir}/page.tsx'
with open(leads_path, 'w') as f:
    f.write(LEADS_REDIRECT)
changes.append(f'✓ Change 2: Created {leads_path} — redirect to /vendor/leads (fixes BUG 2)')


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 3
# Fix vendor/today/page.tsx — session key fallback.
# Some login paths write to 'vendor_session', others write to 'vendor_web_session'.
# today/page.tsx only read 'vendor_web_session' — so vendors logged in via the
# other path would see a blank Today page and get redirected to login.
# Fix: always check both keys, use whichever is present.
# ─────────────────────────────────────────────────────────────────────────────

TODAY_PATH = 'web/app/vendor/today/page.tsx'
with open(TODAY_PATH, 'r') as f:
    today = f.read()

OLD_SESSION = """function getSession(): VendorSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('vendor_web_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}"""

NEW_SESSION = """function getSession(): VendorSession | null {
  if (typeof window === 'undefined') return null;
  try {
    // Check both keys — login paths are inconsistent about which one they write.
    // vendor_session is set by some OTP paths; vendor_web_session by others.
    const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}"""

if OLD_SESSION in today:
    today = today.replace(OLD_SESSION, NEW_SESSION)
    with open(TODAY_PATH, 'w') as f:
        f.write(today)
    changes.append(f'✓ Change 3: Fixed session key fallback in today/page.tsx (fixes BUG 3)')
else:
    changes.append(f'✗ Change 3 FAILED — session pattern not found in today/page.tsx')


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 4
# Remove hardcoded duplicate nav from vendor/clients/page.tsx.
# The layout already renders the correct BottomNav component.
# This hardcoded nav was overriding it and showing a second nav bar on mobile.
# ─────────────────────────────────────────────────────────────────────────────

CLIENTS_PATH = 'web/app/vendor/clients/page.tsx'
with open(CLIENTS_PATH, 'r') as f:
    clients = f.read()

# The hardcoded nav — exact text from the file
OLD_NAV = """      <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:'#F8F7F5', borderTop:'1px solid #E2DED8', display:'flex', alignItems:'center', justifyContent:'space-around', paddingBottom:'env(safe-area-inset-bottom)', zIndex:100 }}>
        {[{key:'today',label:'Today',href:'/vendor/today'},{key:'clients',label:'Clients',href:'/vendor/clients'},{key:'money',label:'Money',href:'/vendor/money'},{key:'studio',label:'Studio',href:'/vendor/studio'}].map(item=>(
          <a key={item.key} href={item.href} style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'12px 16px', gap:4, textDecoration:'none' }}>
            <span style={{ fontFamily:\\"'Jost',sans-serif\\", fontSize:10, fontWeight:item.key==='clients'?400:300, letterSpacing:'0.15em', textTransform:'uppercase', color:item.key==='clients'?'#111':'#888580' }}>{item.label}</span>
            {item.key==='clients'&&<span style={{ width:4, height:4, borderRadius:'50%', background:'#C9A84C', display:'block' }}/>}
          </a>
        ))}
      </nav>"""

if OLD_NAV in clients:
    clients = clients.replace(OLD_NAV, '      {/* Nav is handled by the layout — BottomNav component */}')
    with open(CLIENTS_PATH, 'w') as f:
        f.write(clients)
    changes.append(f'✓ Change 4: Removed hardcoded duplicate nav from clients/page.tsx (fixes BUG 9)')
else:
    changes.append(f'✗ Change 4 FAILED — nav pattern not found in clients/page.tsx. Remove manually: the <nav> block at bottom of the component.')


# ─────────────────────────────────────────────────────────────────────────────
# Report
# ─────────────────────────────────────────────────────────────────────────────
print('\nPhase 2 — Frontend patch complete\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Phase 2: Image Hub, leads redirect, session fix, duplicate nav removed" && git push')
