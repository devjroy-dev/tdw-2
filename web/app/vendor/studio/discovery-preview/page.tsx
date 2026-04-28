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
            }}>This is how couples discover you</p>

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
