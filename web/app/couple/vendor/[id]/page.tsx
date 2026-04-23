'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

const RAILWAY_URL = 'https://dream-wedding-production-89ae.up.railway.app';

function getSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('couple_session') || localStorage.getItem('couple_web_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface VendorProfile {
  id: string;
  name: string;
  category?: string;
  city?: string;
  starting_price?: number;
  about?: string;
  tagline?: string;
  vibe_tags?: string[];
  instagram_url?: string;
  rating?: number;
  review_count?: number;
  accepts_lock_date?: boolean;
  lock_date_amount?: number;
  show_whatsapp_public?: boolean;
  phone?: string;
  featured_photos?: string[];
  portfolio_images?: string[];
  tier?: string;
  founding_badge?: boolean;
}

interface ProfilePages {
  page1_tagline?: string;
  page1_about?: string;
  page1_image_url?: string;
  page2_tagline?: string;
  page2_about?: string;
  page2_image_url?: string;
  has_page2?: boolean;
}

interface Review {
  id: string;
  reviewer_name: string;
  review_text: string;
  is_verified: boolean;
  created_at: string;
}

interface ProfileData {
  vendor: VendorProfile;
  profile_pages: ProfilePages | null;
  creation_images: string[];
  reviews: Review[];
  is_available: boolean | null;
}

function fmtINR(n: number) {
  if (!n) return 'On request';
  return '₹' + n.toLocaleString('en-IN');
}

// ─── Dash indicators ──────────────────────────────────────────────────────────
function DashIndicators({ count, active }: { count: number; active: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          width: i === active ? 20 : 6, height: 2, borderRadius: 1,
          background: i === active ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
          transition: 'all 300ms cubic-bezier(0.22,1,0.36,1)',
        }} />
      ))}
    </div>
  );
}

// ─── Reviews overlay ──────────────────────────────────────────────────────────
function ReviewsOverlay({ reviews, bgSnapshot, onClose }: {
  reviews: Review[];
  bgSnapshot: string;
  onClose: () => void;
}) {
  const [page, setPage] = useState(0);
  const [visible, setVisible] = useState(false);
  const startY = useRef(0);

  useEffect(() => { setTimeout(() => setVisible(true), 10); }, []);

  function handleClose() { setVisible(false); setTimeout(onClose, 320); }

  function handleTouchStart(e: React.TouchEvent) { startY.current = e.touches[0].clientY; }
  function handleTouchEnd(e: React.TouchEvent) {
    const dy = e.changedTouches[0].clientY - startY.current;
    if (dy > 80) handleClose();
  }

  if (reviews.length === 0) return (
    <>
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501, height: '80vh', background: '#1A1614', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ textAlign: 'center', padding: '0 40px' }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.6)', margin: '0 0 8px' }}>No reviews yet.</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Reviews will appear here once verified.</p>
        </div>
      </div>
    </>
  );

  const review = reviews[page];

  return (
    <>
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.6)' }} />
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501,
          height: '80vh',
          borderRadius: '20px 20px 0 0',
          overflow: 'hidden',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Blurred bio background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: bgSnapshot ? `url(${bgSnapshot})` : 'none',
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(24px) brightness(0.4)',
          transform: 'scale(1.1)',
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 0 32px' }}>
          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.3)' }} />
          </div>

          {/* Review content — swipeable */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px' }}>
            {/* Verified badge */}
            {review.is_verified && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
                <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 400, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', background: 'rgba(201,168,76,0.15)', padding: '4px 10px', borderRadius: 100, border: '0.5px solid rgba(201,168,76,0.4)' }}>✓ Verified Booking</span>
              </div>
            )}
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 24, fontWeight: 300, fontStyle: 'italic',
              color: '#FFFFFF', lineHeight: 1.5,
              margin: '0 0 24px',
            }}>"{review.review_text}"</p>
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{review.reviewer_name}</p>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', marginBottom: 16 }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ background: 'none', border: 'none', cursor: page === 0 ? 'default' : 'pointer', color: page === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', fontSize: 24, padding: 8, touchAction: 'manipulation' }}>‹</button>
            <DashIndicators count={reviews.length} active={page} />
            <button onClick={() => setPage(p => Math.min(reviews.length - 1, p + 1))} disabled={page === reviews.length - 1} style={{ background: 'none', border: 'none', cursor: page === reviews.length - 1 ? 'default' : 'pointer', color: page === reviews.length - 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', fontSize: 24, padding: 8, touchAction: 'manipulation' }}>›</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Creations overlay ────────────────────────────────────────────────────────
function CreationsOverlay({ images, bgSnapshot, onClose }: {
  images: string[];
  bgSnapshot: string;
  onClose: () => void;
}) {
  const [page, setPage] = useState(0);
  const [visible, setVisible] = useState(false);
  const startY = useRef(0);
  const startX = useRef(0);

  useEffect(() => { setTimeout(() => setVisible(true), 10); }, []);

  function handleClose() { setVisible(false); setTimeout(onClose, 320); }

  function handleTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const dy = e.changedTouches[0].clientY - startY.current;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dy > 80 && Math.abs(dy) > Math.abs(dx)) { handleClose(); return; }
    if (dx < -50) setPage(p => Math.min(images.length - 1, p + 1));
    if (dx > 50) setPage(p => Math.max(0, p - 1));
  }

  if (images.length === 0) return (
    <>
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501, height: '80vh', background: '#0C0A09', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)' }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.4)', margin: 0 }}>No creations yet.</p>
      </div>
    </>
  );

  return (
    <>
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)' }} />
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501,
          height: '80vh', borderRadius: '20px 20px 0 0', overflow: 'hidden',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)',
          background: '#0C0A09',
        }}
      >
        {/* Full bleed image */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${images[page]})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />

        {/* Dark gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)' }} />

        {/* Handle */}
        <div style={{ position: 'absolute', top: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 2 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.4)' }} />
        </div>

        {/* Dash indicators */}
        <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, zIndex: 2 }}>
          <DashIndicators count={images.length} active={page} />
        </div>

        {/* Tap zones for navigation */}
        <button onClick={() => setPage(p => Math.max(0, p - 1))} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '30%', background: 'none', border: 'none', cursor: 'pointer', zIndex: 2 }} />
        <button onClick={() => setPage(p => Math.min(images.length - 1, p + 1))} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '30%', background: 'none', border: 'none', cursor: 'pointer', zIndex: 2 }} />
      </div>
    </>
  );
}

// ─── Bio Page ─────────────────────────────────────────────────────────────────
function BioPage({ vendor, profilePages, isAvailable, bioPage, onEnquire, onLockDate, onCircle, onReviews, onCreations }: {
  vendor: VendorProfile;
  profilePages: ProfilePages | null;
  isAvailable: boolean | null;
  bioPage: 0 | 1;
  onEnquire: () => void;
  onLockDate: () => void;
  onCircle: () => void;
  onReviews: () => void;
  onCreations: () => void;
}) {
  const hasPage2 = !!profilePages?.has_page2;
  const heroImage = bioPage === 0
    ? (profilePages?.page1_image_url || vendor.featured_photos?.[0] || vendor.portfolio_images?.[0])
    : (profilePages?.page2_image_url || vendor.featured_photos?.[1] || vendor.portfolio_images?.[1]);

  const tagline = bioPage === 0
    ? (profilePages?.page1_tagline || vendor.tagline || '')
    : (profilePages?.page2_tagline || '');

  const about = bioPage === 0
    ? (profilePages?.page1_about || vendor.about || '')
    : (profilePages?.page2_about || '');

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', background: '#0C0A09', overflow: 'hidden' }}>
      {/* Full bleed hero image */}
      {heroImage && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
      )}

      {/* Gradient overlays */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(12,10,9,0.3) 0%, transparent 30%, transparent 40%, rgba(12,10,9,0.85) 75%, rgba(12,10,9,0.97) 100%)' }} />

      {/* Availability dot */}
      {isAvailable !== null && (
        <div style={{ position: 'absolute', top: 56, right: 20, zIndex: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: isAvailable ? '#4CAF50' : '#888580' }} />
          <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>
            {isAvailable ? 'Available' : 'Unavailable'}
          </span>
        </div>
      )}

      {/* Page indicators */}
      {(hasPage2 || bioPage === 1) && (
        <div style={{ position: 'absolute', top: 56, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
          <DashIndicators count={2} active={bioPage} />
        </div>
      )}

      {/* Bottom content */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 24px 32px', zIndex: 10 }}>
        {/* Category eyebrow */}
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '0 0 6px' }}>
          {[vendor.category, vendor.city].filter(Boolean).join(' · ')}
          {vendor.founding_badge && ' · Founding Maker'}
        </p>

        {/* Name */}
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: '#FFFFFF', margin: '0 0 6px', lineHeight: 1.1, letterSpacing: '-0.01em' }}>{vendor.name}</p>

        {/* Tagline */}
        {tagline && (
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', margin: '0 0 10px', lineHeight: 1.4 }}>{tagline}</p>
        )}

        {/* Price + rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          {vendor.starting_price && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#C9A84C', margin: 0 }}>from {fmtINR(vendor.starting_price)}</p>
          )}
          {vendor.rating && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: 'rgba(255,255,255,0.5)', margin: 0 }}>★ {vendor.rating.toFixed(1)}{vendor.review_count ? ` (${vendor.review_count})` : ''}</p>
          )}
        </div>

        {/* About — only on page 1 */}
        {about && bioPage === 0 && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: 'rgba(255,255,255,0.6)', margin: '0 0 20px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{about}</p>
        )}

        {/* About on page 2 */}
        {about && bioPage === 1 && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: 'rgba(255,255,255,0.6)', margin: '0 0 20px', lineHeight: 1.6 }}>{about}</p>
        )}

        {/* Reviews + Creations pills — only on page 1 */}
        {bioPage === 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button onClick={onReviews} style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#FFFFFF', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 100, padding: '8px 18px', cursor: 'pointer', touchAction: 'manipulation' }}>Reviews</button>
            <button onClick={onCreations} style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#FFFFFF', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 100, padding: '8px 18px', cursor: 'pointer', touchAction: 'manipulation' }}>Creations</button>
          </div>
        )}

        {/* CTAs */}
        <button onClick={onEnquire} style={{ width: '100%', height: 52, borderRadius: 100, background: '#C9A84C', border: 'none', fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 400, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0C0A09', cursor: 'pointer', touchAction: 'manipulation', marginBottom: 10 }}>
          Enquire
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onLockDate} disabled={!vendor.accepts_lock_date} style={{ flex: 1, height: 44, borderRadius: 100, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '0.5px solid rgba(255,255,255,0.2)', fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: vendor.accepts_lock_date ? '#FFFFFF' : 'rgba(255,255,255,0.25)', cursor: vendor.accepts_lock_date ? 'pointer' : 'default', touchAction: 'manipulation' }}>
            Lock Date{vendor.lock_date_amount ? ` · ${fmtINR(vendor.lock_date_amount)}` : ''}
          </button>
          <button onClick={onCircle} style={{ flex: 1, height: 44, borderRadius: 100, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '0.5px solid rgba(255,255,255,0.2)', fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#FFFFFF', cursor: 'pointer', touchAction: 'manipulation' }}>
            Circle
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────
export default function VendorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params?.id as string;

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bioPage, setBioPage] = useState<0 | 1>(0);
  const [showReviews, setShowReviews] = useState(false);
  const [showCreations, setShowCreations] = useState(false);
  const [showConfirmCircle, setShowConfirmCircle] = useState(false);
  const [circleAdding, setCircleAdding] = useState(false);
  const [toast, setToast] = useState('');

  const startX = useRef(0);
  const session = typeof window !== 'undefined' ? getSession() : null;
  const userId = session?.id;

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  useEffect(() => {
    if (!vendorId) return;
    const url = `${RAILWAY_URL}/api/v2/vendor/profile/${vendorId}${userId ? `?couple_id=${userId}` : ''}`;
    fetch(url).then(r => r.json()).then(d => {
      if (d.success) setData(d.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [vendorId, userId]);

  // Swipe left/right to switch bio pages
  function handleTouchStart(e: React.TouchEvent) { startX.current = e.touches[0].clientX; }
  function handleTouchEnd(e: React.TouchEvent) {
    if (showReviews || showCreations) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    const hasPage2 = !!data?.profile_pages?.has_page2;
    if (!hasPage2) return;
    if (dx < -60 && bioPage === 0) setBioPage(1);
    if (dx > 60 && bioPage === 1) setBioPage(0);
  }

  async function handleCircle() {
    if (!userId || !vendorId || circleAdding) return;
    setCircleAdding(true);
    try {
      await fetch(`${RAILWAY_URL}/api/couple/muse/shortlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_id: userId, vendor_id: vendorId, context: 'circle' }),
      });
      showToast('Added to your Circle');
    } catch { showToast('Could not add to Circle'); }
    finally { setCircleAdding(false); setShowConfirmCircle(false); }
  }

  function handleEnquire() {
    if (!data?.vendor) return;
    router.push(`/couple/messages?enquire=${vendorId}&name=${encodeURIComponent(data.vendor.name)}`);
  }

  function handleLockDate() {
    if (!data?.vendor?.accepts_lock_date) return;
    showToast('Lock Date coming soon');
  }

  // Hero image for bg snapshot (used behind overlays)
  const bgImage = data?.profile_pages?.page1_image_url
    || data?.vendor?.featured_photos?.[0]
    || data?.vendor?.portfolio_images?.[0]
    || '';

  if (loading) return (
    <div style={{ background: '#0C0A09', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', animation: 'pulse 1.4s infinite' }} />
      <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
    </div>
  );

  if (!data) return (
    <div style={{ background: '#0C0A09', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Maker not found.</p>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; } body { margin: 0; background: #0C0A09; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Back button */}
      <button onClick={() => router.back()} style={{ position: 'fixed', top: 16, left: 16, zIndex: 200, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '0.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation' }}>
        <span style={{ color: '#FFFFFF', fontSize: 18, lineHeight: 1, marginLeft: -2 }}>‹</span>
      </button>

      {/* Bio page — swipeable */}
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ width: '100%', height: '100dvh', position: 'relative' }}>
        <BioPage
          vendor={data.vendor}
          profilePages={data.profile_pages}
          isAvailable={data.is_available}
          bioPage={bioPage}
          onEnquire={handleEnquire}
          onLockDate={handleLockDate}
          onCircle={() => setShowConfirmCircle(true)}
          onReviews={() => setShowReviews(true)}
          onCreations={() => setShowCreations(true)}
        />
      </div>

      {/* Reviews overlay */}
      {showReviews && (
        <ReviewsOverlay
          reviews={data.reviews}
          bgSnapshot={bgImage}
          onClose={() => setShowReviews(false)}
        />
      )}

      {/* Creations overlay */}
      {showCreations && (
        <CreationsOverlay
          images={data.creation_images}
          bgSnapshot={bgImage}
          onClose={() => setShowCreations(false)}
        />
      )}

      {/* Circle confirm */}
      {showConfirmCircle && (
        <>
          <div onClick={() => setShowConfirmCircle(false)} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 601, background: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: '24px 24px 40px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8', margin: '0 auto 20px' }} />
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: '#111111', margin: '0 0 8px' }}>Add to your Circle?</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: '0 0 24px', lineHeight: 1.5 }}>
              Your co-planners will be able to see {data.vendor.name} and collaborate on this choice.
            </p>
            <button onClick={handleCircle} disabled={circleAdding} style={{ width: '100%', height: 52, borderRadius: 100, background: '#111111', border: 'none', fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 400, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#F8F7F5', cursor: 'pointer', touchAction: 'manipulation', marginBottom: 12, opacity: circleAdding ? 0.6 : 1 }}>
              {circleAdding ? '...' : 'ADD TO CIRCLE'}
            </button>
            <button onClick={() => setShowConfirmCircle(false)} style={{ width: '100%', height: 44, borderRadius: 100, background: 'transparent', border: '1px solid #E2DED8', fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', cursor: 'pointer', touchAction: 'manipulation' }}>
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: '#111111', color: '#F8F7F5', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, padding: '12px 20px', borderRadius: 100, zIndex: 999, whiteSpace: 'nowrap' }}>{toast}</div>
      )}
    </>
  );
}
