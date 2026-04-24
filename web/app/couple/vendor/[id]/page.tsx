'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

function getSession() {
  if (typeof window === 'undefined') return null;
  try { const r = localStorage.getItem('couple_session') || localStorage.getItem('couple_web_session'); return r ? JSON.parse(r) : null; } catch { return null; }
}

function fmtINR(n: number) {
  if (!n) return null;
  if (n >= 100000) return '₹' + (n / 100000).toFixed(n % 100000 === 0 ? 0 : 1) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
  return '₹' + n.toLocaleString('en-IN');
}

const CAT_LABELS: Record<string, string> = {
  photographer: 'Photography', videographer: 'Videography', mua: 'Makeup & Hair',
  decorator: 'Decoration', venue: 'Venue', caterer: 'Catering',
  mehendi: 'Mehendi', choreographer: 'Choreography', event_manager: 'Event Management', other: 'Other',
};

interface Vendor {
  id: string; name: string; category?: string; city?: string; tagline?: string; about?: string;
  starting_price?: number; max_price?: number; rating?: number; review_count?: number;
  vibe_tags?: string[]; featured_photos?: string[]; portfolio_images?: string[];
  is_verified?: boolean; is_luxury?: boolean; destination_tags?: string[];
  years_experience?: number; weddings_completed?: number; cities_served?: string[];
  outstation_available?: boolean; travel_fee_policy?: string; languages_spoken?: string[];
  max_weddings_per_year?: number; advance_percentage?: number; preferred_lead_time?: string;
  cancellation_policy?: string; accepts_lock_date?: boolean; lock_date_amount?: number;
  instagram_url?: string; tier?: string; founding_badge?: boolean;
}

interface Page2Data {
  is_published?: boolean; extended_about?: string;
  team_members?: { name: string; role: string }[];
  awards?: { publication: string; year: number }[];
  featured_wedding_title?: string; featured_wedding_location?: string;
  featured_wedding_year?: number; featured_wedding_image?: string; featured_wedding_quote?: string;
  packages?: { name: string; description: string; inclusions: string; delivery_time: string }[];
  video_reel_url?: string;
}

interface Review { id: string; reviewer_name: string; review_text: string; is_verified: boolean; created_at: string; }

interface ProfileData {
  vendor: Vendor; profile_pages: any; page2: Page2Data | null;
  creation_images: string[]; reviews: Review[]; is_available: boolean | null;
}

function PageDots({ count, active }: { count: number; active: number }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === active ? '#C9A84C' : 'rgba(255,255,255,0.25)', transition: 'background 300ms' }} />
      ))}
    </div>
  );
}

function Lightbox({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const startX = useRef(0);
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 10); }, []);
  function close() { setVisible(false); setTimeout(onClose, 280); }
  return (
    <div onTouchStart={e => { startX.current = e.touches[0].clientX; }} onTouchEnd={e => { const dx = e.changedTouches[0].clientX - startX.current; if (dx < -50) setIdx(i => Math.min(images.length - 1, i + 1)); else if (dx > 50) setIdx(i => Math.max(0, i - 1)); }} onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 900, background: '#000', opacity: visible ? 1 : 0, transition: 'opacity 280ms', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${images[idx]})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
      <button onClick={close} style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#FFF', fontSize: 18, cursor: 'pointer', zIndex: 2 }}>✕</button>
      {images.length > 1 && <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, zIndex: 2 }}><PageDots count={images.length} active={idx} /></div>}
    </div>
  );
}

function ReviewsOverlay({ reviews, bgImage, onClose }: { reviews: Review[]; bgImage: string; onClose: () => void }) {
  const [pg, setPg] = useState(0);
  const [visible, setVisible] = useState(false);
  const startY = useRef(0);
  useEffect(() => { setTimeout(() => setVisible(true), 10); }, []);
  function close() { setVisible(false); setTimeout(onClose, 320); }
  return (
    <>
      <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.6)' }} />
      <div onTouchStart={e => { startY.current = e.touches[0].clientY; }} onTouchEnd={e => { if (e.changedTouches[0].clientY - startY.current > 80) close(); }} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 701, height: '80vh', borderRadius: '20px 20px 0 0', overflow: 'hidden', transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(24px) brightness(0.35)', transform: 'scale(1.1)' }} />
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 0 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}><div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.3)' }} /></div>
          {reviews.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.5)', margin: 0 }}>No reviews yet.</p></div>
          ) : (
            <>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px' }}>
                {reviews[pg].is_verified && <div style={{ marginBottom: 20 }}><span style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', background: 'rgba(201,168,76,0.15)', padding: '4px 10px', borderRadius: 100, border: '0.5px solid rgba(201,168,76,0.4)' }}>✓ Verified Booking</span></div>}
                <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 300, fontStyle: 'italic', color: '#FFFFFF', lineHeight: 1.55, margin: '0 0 24px' }}>"{reviews[pg].review_text}"</p>
                <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', margin: 0 }}>{reviews[pg].reviewer_name}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', marginBottom: 16 }}>
                <button onClick={() => setPg(p => Math.max(0, p - 1))} disabled={pg === 0} style={{ background: 'none', border: 'none', color: pg === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)', fontSize: 28, cursor: pg === 0 ? 'default' : 'pointer', touchAction: 'manipulation' }}>‹</button>
                <PageDots count={reviews.length} active={pg} />
                <button onClick={() => setPg(p => Math.min(reviews.length - 1, p + 1))} disabled={pg === reviews.length - 1} style={{ background: 'none', border: 'none', color: pg === reviews.length - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)', fontSize: 28, cursor: pg === reviews.length - 1 ? 'default' : 'pointer', touchAction: 'manipulation' }}>›</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function CTABar({ vendor, onEnquire, onSave, isSaved, onLockDate }: { vendor: Vendor; onEnquire: () => void; onSave: () => void; isSaved: boolean; onLockDate: () => void; }) {
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, padding: 'calc(env(safe-area-inset-bottom, 0px) + 16px) 20px 16px', background: 'rgba(12,10,9,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: vendor.accepts_lock_date ? 10 : 0 }}>
        <button onClick={onEnquire} style={{ flex: 1, height: 50, borderRadius: 12, background: '#F8F7F5', border: 'none', fontFamily: "'Jost',sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#111111', cursor: 'pointer', touchAction: 'manipulation', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>✉</span> Enquire
        </button>
        <button onClick={onSave} style={{ width: 50, height: 50, borderRadius: 12, background: 'transparent', border: `0.5px solid ${isSaved ? '#C9A84C' : 'rgba(248,247,245,0.2)'}`, cursor: 'pointer', touchAction: 'manipulation', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 300ms' }}>
          <span style={{ fontSize: 20, color: isSaved ? '#C9A84C' : 'rgba(248,247,245,0.7)', transition: 'color 300ms' }}>{isSaved ? '♥' : '♡'}</span>
        </button>
      </div>
      {vendor.accepts_lock_date && (
        <button onClick={onLockDate} style={{ width: '100%', height: 44, borderRadius: 12, background: 'transparent', border: '0.5px solid rgba(201,168,76,0.3)', fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', cursor: 'pointer', touchAction: 'manipulation', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontSize: 12 }}>🔒</span>
          Lock this Date{vendor.lock_date_amount ? ` · ${fmtINR(vendor.lock_date_amount)}` : ''}
        </button>
      )}
    </div>
  );
}

// ─── PAGE 1 ───────────────────────────────────────────────────────────────────
function Page1({ vendor, page2, isAvailable, reviews, creationImages, onReviews, onCreations, onEnquire, onSave, isSaved, onLockDate }: {
  vendor: Vendor; page2: Page2Data | null; isAvailable: boolean | null;
  reviews: Review[]; creationImages: string[];
  onReviews: () => void; onCreations: () => void;
  onEnquire: () => void; onSave: () => void; isSaved: boolean; onLockDate: () => void;
}) {
  const heroImage = vendor.featured_photos?.[0] || vendor.portfolio_images?.[0];
  const hasPage2 = !!page2?.is_published;
  const priceFmt = vendor.starting_price ? `From ${fmtINR(vendor.starting_price)}` : null;
  const catLabel = vendor.category ? (CAT_LABELS[vendor.category] || vendor.category) : '';
  const availabilityColor = isAvailable === true ? '#4CAF50' : isAvailable === false ? '#EF5350' : null;
  const availabilityText = isAvailable === true ? 'Available on your date' : isAvailable === false ? 'Date taken' : null;
  const otherCities = (vendor.cities_served || []).filter(c => c !== vendor.city);

  const EYE = (t: string) => <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(248,247,245,0.35)', margin: '0 0 12px' }}>{t}</p>;

  return (
    <div style={{ minHeight: '100dvh', background: '#0C0A09', paddingBottom: vendor.accepts_lock_date ? 140 : 96 }}>
      {/* Hero — 45dvh */}
      <div style={{ position: 'relative', width: '100%', height: '45dvh' }}>
        {heroImage && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(12,10,9,1) 0%, rgba(12,10,9,0.6) 40%, transparent 100%)' }} />
        {vendor.is_verified && (
          <div style={{ position: 'absolute', bottom: 16, left: 20, zIndex: 10 }}>
            <div style={{ background: 'rgba(201,168,76,0.15)', border: '0.5px solid rgba(201,168,76,0.4)', borderRadius: 20, padding: '4px 10px', display: 'inline-flex' }}>
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C' }}>Verified Maker</span>
            </div>
          </div>
        )}
        {hasPage2 && <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, zIndex: 10 }}><PageDots count={2} active={0} /></div>}
      </div>

      {/* Identity block */}
      <div style={{ padding: '24px 20px 0' }}>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(248,247,245,0.5)', margin: '0 0 6px' }}>{catLabel}</p>
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 34, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.05, color: '#F8F7F5', margin: '0 0 4px' }}>{vendor.name}</p>
        {vendor.tagline && <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 300, fontStyle: 'italic', color: 'rgba(248,247,245,0.6)', margin: '0 0 20px' }}>{vendor.tagline}</p>}
        {/* Metadata strip */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
          {vendor.city && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 12, color: 'rgba(248,247,245,0.4)' }}>◎</span><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: 'rgba(248,247,245,0.6)' }}>{vendor.city}</span></div>}
          {priceFmt && <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 300, color: '#F8F7F5', margin: 0 }}>{priceFmt}</p>}
          {availabilityColor && <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: availabilityColor, flexShrink: 0 }} /><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 300, color: 'rgba(248,247,245,0.7)' }}>{availabilityText}</span></div>}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(248,247,245,0.08)', margin: '0 20px' }} />

      {/* About */}
      <div style={{ padding: '24px 20px 0' }}>
        {EYE('About')}
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 300, lineHeight: 1.7, color: 'rgba(248,247,245,0.75)', margin: 0 }}>{vendor.about || ''}</p>
      </div>

      {/* Stats row */}
      {(vendor.weddings_completed || vendor.years_experience || vendor.rating) && (
        <div style={{ padding: '24px 20px 0', display: 'flex' }}>
          {([
            vendor.weddings_completed ? { val: vendor.weddings_completed.toString(), label: 'Weddings', gold: false } : null,
            vendor.years_experience ? { val: vendor.years_experience.toString(), label: 'Years', gold: false } : null,
            vendor.rating ? { val: vendor.rating.toFixed(1) + ' ★', label: 'Rating', gold: true } : null,
          ].filter(Boolean) as { val: string; label: string; gold: boolean }[]).map((s, i, arr) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
              {i > 0 && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 1, height: 32, background: 'rgba(248,247,245,0.08)' }} />}
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 300, color: s.gold ? '#C9A84C' : '#F8F7F5', margin: '0 0 4px' }}>{s.val}</p>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(248,247,245,0.4)', margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Vibe tags */}
      {vendor.vibe_tags && vendor.vibe_tags.length > 0 && (
        <div style={{ padding: '20px 20px 0', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {vendor.vibe_tags.map(tag => (
            <div key={tag} style={{ flexShrink: 0, background: 'rgba(248,247,245,0.06)', border: '0.5px solid rgba(248,247,245,0.12)', borderRadius: 20, padding: '6px 14px' }}>
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(248,247,245,0.6)' }}>{tag}</span>
            </div>
          ))}
        </div>
      )}

      {/* Reach strip */}
      {(vendor.outstation_available || otherCities.length > 0) && (
        <div style={{ padding: '20px 20px 0' }}>
          {vendor.outstation_available && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(201,168,76,0.08)', border: '0.5px solid rgba(201,168,76,0.2)', borderRadius: 20, padding: '5px 12px', marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: '#C9A84C' }}>✈</span>
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C9A84C' }}>Available for destination weddings</span>
            </div>
          )}
          {otherCities.length > 0 && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: 'rgba(248,247,245,0.45)', margin: 0 }}>Based in {vendor.city} · Also works in {otherCities.join(', ')}</p>}
        </div>
      )}

      {/* Reviews + Creations pills */}
      <div style={{ display: 'flex', gap: 8, padding: '24px 20px 0' }}>
        <button onClick={onReviews} style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#FFFFFF', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 100, padding: '8px 18px', cursor: 'pointer', touchAction: 'manipulation' }}>
          Reviews{reviews.length > 0 ? ` (${reviews.length})` : ''}
        </button>
        {creationImages.length > 0 && (
          <button onClick={onCreations} style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#FFFFFF', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 100, padding: '8px 18px', cursor: 'pointer', touchAction: 'manipulation' }}>Creations</button>
        )}
      </div>
    </div>
  );
}

// ─── PAGE 2 ───────────────────────────────────────────────────────────────────
function Page2({ vendor, page2, onEnquire, onSave, isSaved, onLockDate }: {
  vendor: Vendor; page2: Page2Data;
  onEnquire: () => void; onSave: () => void; isSaved: boolean; onLockDate: () => void;
}) {
  const [lightbox, setLightbox] = useState<{ images: string[]; idx: number } | null>(null);
  const heroImage = vendor.featured_photos?.[0] || vendor.portfolio_images?.[0];
  const allImages = [...(vendor.featured_photos || []), ...(vendor.portfolio_images || [])].filter(Boolean);
  const catLabel = vendor.category ? (CAT_LABELS[vendor.category] || vendor.category) : '';
  const EYE = (t: string) => <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(248,247,245,0.35)', margin: '0 0 14px' }}>{t}</p>;

  return (
    <div style={{ minHeight: '100dvh', background: '#0C0A09', paddingBottom: vendor.accepts_lock_date ? 140 : 96 }}>
      {lightbox && <Lightbox images={lightbox.images} startIndex={lightbox.idx} onClose={() => setLightbox(null)} />}

      {/* Compact identity strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 20px 16px', borderBottom: '0.5px solid rgba(248,247,245,0.08)' }}>
        {heroImage && <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundImage: `url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '0.5px solid rgba(248,247,245,0.15)', flexShrink: 0 }} />}
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 300, color: '#F8F7F5', margin: 0 }}>{vendor.name}</p>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(248,247,245,0.4)', margin: '3px 0 0' }}>{catLabel}{vendor.city ? ` · ${vendor.city}` : ''}</p>
        </div>
        <PageDots count={2} active={1} />
      </div>

      {/* Section 1: The Work */}
      <div style={{ padding: '28px 20px 0' }}>
        {EYE('The Work')}
        {allImages.length > 0 && (
          <>
            <div onClick={() => setLightbox({ images: allImages, idx: 0 })} style={{ width: '100%', aspectRatio: '16/9', backgroundImage: `url(${allImages[0]})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 8, marginBottom: 4, cursor: 'pointer' }} />
            {allImages.length > 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {allImages.slice(1, 9).map((img, i) => (
                  <div key={i} onClick={() => setLightbox({ images: allImages, idx: i + 1 })} style={{ aspectRatio: '1/1', backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 8, cursor: 'pointer' }} />
                ))}
              </div>
            )}
          </>
        )}
        {page2.video_reel_url && (
          <div style={{ marginTop: 20, background: 'rgba(248,247,245,0.04)', border: '0.5px solid rgba(248,247,245,0.1)', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => window.open(page2.video_reel_url!, '_blank')}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(248,247,245,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 20, marginLeft: 3 }}>▶</span></div>
          </div>
        )}
      </div>

      {/* Section 2: Featured Wedding */}
      {page2.featured_wedding_title && (
        <div style={{ padding: '28px 20px 0' }}>
          {EYE('Featured Wedding')}
          <div style={{ background: 'rgba(248,247,245,0.04)', border: '0.5px solid rgba(248,247,245,0.1)', borderRadius: 16, overflow: 'hidden' }}>
            {page2.featured_wedding_image && <div style={{ width: '100%', aspectRatio: '16/9', backgroundImage: `url(${page2.featured_wedding_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
            <div style={{ padding: 16 }}>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 300, color: '#F8F7F5', margin: '0 0 4px' }}>{page2.featured_wedding_title}</p>
              {(page2.featured_wedding_location || page2.featured_wedding_year) && <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(248,247,245,0.4)', margin: '0 0 12px' }}>{[page2.featured_wedding_location, page2.featured_wedding_year?.toString()].filter(Boolean).join(' · ')}</p>}
              {page2.featured_wedding_quote && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, fontStyle: 'italic', color: 'rgba(248,247,245,0.6)', margin: 0, lineHeight: 1.6 }}>"{page2.featured_wedding_quote}"</p>}
            </div>
          </div>
        </div>
      )}

      {/* Section 3: The Maker */}
      <div style={{ padding: '28px 20px 0' }}>
        {EYE('The Maker')}
        {page2.extended_about && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 300, lineHeight: 1.8, color: 'rgba(248,247,245,0.7)', margin: 0 }}>{page2.extended_about}</p>}
        {page2.team_members && page2.team_members.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(248,247,245,0.35)', margin: '0 0 10px' }}>The Team</p>
            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {page2.team_members.map((m, i) => (
                <div key={i} style={{ flexShrink: 0, textAlign: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(248,247,245,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                    <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: 'rgba(248,247,245,0.6)' }}>{m.name?.[0] || '?'}</span>
                  </div>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 300, color: 'rgba(248,247,245,0.6)', margin: '0 0 2px', whiteSpace: 'nowrap' }}>{m.name}</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontWeight: 300, color: 'rgba(248,247,245,0.35)', margin: 0, whiteSpace: 'nowrap' }}>{m.role}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {page2.awards && page2.awards.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(248,247,245,0.35)', margin: '0 0 6px' }}>As Featured In</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, fontStyle: 'italic', color: 'rgba(248,247,245,0.45)', margin: 0 }}>{page2.awards.map(a => `${a.publication} (${a.year})`).join(', ')}</p>
          </div>
        )}
        {vendor.languages_spoken && vendor.languages_spoken.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(248,247,245,0.35)', margin: '0 0 8px' }}>Languages</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {vendor.languages_spoken.map(lang => (
                <div key={lang} style={{ background: 'rgba(248,247,245,0.06)', border: '0.5px solid rgba(248,247,245,0.12)', borderRadius: 20, padding: '6px 14px' }}>
                  <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(248,247,245,0.6)' }}>{lang}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Packages */}
      {page2.packages && page2.packages.length > 0 && (
        <div style={{ padding: '28px 20px 0' }}>
          {EYE('Packages')}
          {page2.packages.map((pkg, i) => (
            <div key={i} style={{ background: 'rgba(248,247,245,0.04)', border: '0.5px solid rgba(248,247,245,0.1)', borderRadius: 12, padding: 16, marginBottom: 10 }}>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 300, color: '#F8F7F5', margin: '0 0 6px' }}>{pkg.name}</p>
              {pkg.description && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: 'rgba(248,247,245,0.6)', lineHeight: 1.6, margin: '0 0 10px' }}>{pkg.description}</p>}
              {pkg.inclusions && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: 'rgba(248,247,245,0.5)', lineHeight: 1.8, margin: '0 0 10px' }}>{pkg.inclusions}</p>}
              {pkg.delivery_time && <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(248,247,245,0.35)', margin: 0 }}>{pkg.delivery_time}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Section 5: Logistics */}
      {(vendor.preferred_lead_time || vendor.advance_percentage || vendor.max_weddings_per_year || vendor.cancellation_policy) && (
        <div style={{ padding: '28px 20px' }}>
          {EYE('Logistics')}
          {[
            { l: 'Lead Time', v: vendor.preferred_lead_time },
            { l: 'Advance', v: vendor.advance_percentage ? `${vendor.advance_percentage}% to confirm date` : null },
            { l: 'Max Weddings / Year', v: vendor.max_weddings_per_year?.toString() },
            { l: 'Cancellation', v: vendor.cancellation_policy },
          ].filter(r => r.v).map(r => (
            <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: '0.5px solid rgba(248,247,245,0.06)' }}>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(248,247,245,0.35)', margin: 0 }}>{r.l}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: 'rgba(248,247,245,0.65)', margin: 0, maxWidth: '60%', textAlign: 'right' }}>{r.v}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function VendorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params?.id as string;
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<0 | 1>(0);
  const [showReviews, setShowReviews] = useState(false);
  const [showCreations, setShowCreations] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [toast, setToast] = useState('');
  const startX = useRef(0);
  const session = typeof window !== 'undefined' ? getSession() : null;
  const userId = session?.id;

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  useEffect(() => {
    if (!vendorId) return;
    const url = `${API}/api/v2/vendor/profile/${vendorId}${userId ? `?couple_id=${userId}` : ''}`;
    fetch(url).then(r => r.json()).then(d => { if (d.success) setData(d.data); setLoading(false); }).catch(() => setLoading(false));
  }, [vendorId, userId]);

  function handleTouchStart(e: React.TouchEvent) { startX.current = e.touches[0].clientX; }
  function handleTouchEnd(e: React.TouchEvent) {
    if (showReviews || showCreations) return;
    const hasPage2 = !!data?.page2?.is_published;
    if (!hasPage2) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dx < -60 && activePage === 0) setActivePage(1);
    if (dx > 60 && activePage === 1) setActivePage(0);
  }

  async function handleSave() {
    if (!userId || !vendorId) return;
    const newSaved = !isSaved;
    setIsSaved(newSaved);
    try {
      await fetch(`${API}/api/couple/muse/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ couple_id: userId, vendor_id: vendorId }) });
      showToast(newSaved ? 'Saved to Muse ♥' : 'Removed from Muse');
    } catch { setIsSaved(!newSaved); }
  }

  function handleEnquire() {
    if (!data?.vendor) return;
    router.push(`/couple/messages?enquire=${vendorId}&name=${encodeURIComponent(data.vendor.name)}`);
  }

  function handleLockDate() { showToast('Lock Date — coming soon'); }

  const bgImage = data?.vendor?.featured_photos?.[0] || data?.vendor?.portfolio_images?.[0] || '';

  if (loading) return (
    <div style={{ background: '#0C0A09', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{'@keyframes pulse{0%,100%{opacity:0.2}50%{opacity:0.8}}'}</style>
      <div style={{ width: 48, height: 2, borderRadius: 1, background: 'rgba(201,168,76,0.6)', animation: 'pulse 1.4s infinite' }} />
    </div>
  );

  if (!data) return (
    <div style={{ background: '#0C0A09', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Maker not found.</p>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        *{box-sizing:border-box;} body{margin:0;background:#0C0A09;}
        ::-webkit-scrollbar{display:none;}
      `}</style>

      {/* X button — top right floats over everything */}
      <button onClick={() => router.back()} style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', right: 20, zIndex: 200, width: 36, height: 36, borderRadius: '50%', background: 'rgba(12,10,9,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '0.5px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation' }}>
        <span style={{ color: 'rgba(248,247,245,0.85)', fontSize: 14 }}>✕</span>
      </button>

      {/* Swipeable pages */}
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {activePage === 0 ? (
          <Page1
            vendor={data.vendor} page2={data.page2} isAvailable={data.is_available}
            reviews={data.reviews} creationImages={data.creation_images}
            onReviews={() => setShowReviews(true)} onCreations={() => setShowCreations(true)}
            onEnquire={handleEnquire} onSave={handleSave} isSaved={isSaved} onLockDate={handleLockDate}
          />
        ) : data.page2 ? (
          <Page2
            vendor={data.vendor} page2={data.page2}
            onEnquire={handleEnquire} onSave={handleSave} isSaved={isSaved} onLockDate={handleLockDate}
          />
        ) : null}
      </div>

      {/* Always-visible CTA bar */}
      <CTABar vendor={data.vendor} onEnquire={handleEnquire} onSave={handleSave} isSaved={isSaved} onLockDate={handleLockDate} />

      {/* Overlays */}
      {showReviews && <ReviewsOverlay reviews={data.reviews} bgImage={bgImage} onClose={() => setShowReviews(false)} />}
      {showCreations && data.creation_images.length > 0 && <Lightbox images={data.creation_images} startIndex={0} onClose={() => setShowCreations(false)} />}

      {/* Toast */}
      {toast && <div style={{ position: 'fixed', bottom: 120, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#F8F7F5', fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, padding: '12px 20px', borderRadius: 100, zIndex: 800, whiteSpace: 'nowrap' }}>{toast}</div>}
    </>
  );
}
