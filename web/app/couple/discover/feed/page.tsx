'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SEED_VENDORS, type SeedVendor } from '@/lib/seed/discoverySeed';
import { MessageCircle, Lock, Users } from 'lucide-react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

const haptic = (ms: number) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(ms); } catch {}
  }
};

const SWIPE_THRESHOLD = 45;
const SWIPE_VELOCITY  = 0.3;
const TAP_MAX_MOVE    = 10;
const TAP_MAX_TIME    = 250;
const DOUBLE_TAP_MS   = 280;
const OVERLAY_DISMISS = 80;

// ── Save to Muse (standalone, no spawnHeart dependency) ───────────────────────
async function saveVendorToMuse(vendorId: string, userId: string | null): Promise<boolean> {
  if (!userId) return false;
  try {
    const res = await fetch(`${API}/api/couple/muse/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couple_id: userId, vendor_id: vendorId, event: 'general' }),
    });
    const json = await res.json();
    return json.success === true;
  } catch { return false; }
}

// Toast that shows "Saved to Muse" briefly at top of screen
function spawnSaveToast(alreadySaved = false) {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('muse-save-toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'muse-save-toast';
  el.style.cssText = `
    position:fixed;top:calc(env(safe-area-inset-top,0px) + 72px);
    left:50%;transform:translateX(-50%);
    background:rgba(17,17,17,0.75);
    backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
    border:0.5px solid rgba(255,255,255,0.15);
    color:rgba(248,247,245,0.9);
    font-family:'Jost',sans-serif;font-size:10px;font-weight:300;
    letter-spacing:0.18em;text-transform:uppercase;
    padding:8px 18px;border-radius:20px;
    z-index:9998;pointer-events:none;white-space:nowrap;
    animation:toastSlideIn 250ms cubic-bezier(0.22,1,0.36,1) forwards;
  `;
  el.textContent = alreadySaved ? 'Already in Muse' : 'Saved to Muse ♥';
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 300ms ease'; }, 1800);
  setTimeout(() => el.remove(), 2200);
}

// ── Heart animation ───────────────────────────────────────────────────────────
function spawnHeart() {
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;top:50%;left:50%;
    transform:translate(-50%,-50%) scale(0);
    font-size:88px;z-index:9999;pointer-events:none;
    animation:heartPop 700ms cubic-bezier(0.22,1,0.36,1) forwards;
    color:#C9A84C;
  `;
  el.textContent = '♥';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 700);
  haptic(14);
}

// ── Glass Overlay ─────────────────────────────────────────────────────────────
function GlassOverlay({ vendor, visible, onClose, onEnquire, userId }: {
  vendor: SeedVendor; visible: boolean; onClose: () => void;
  onEnquire: () => void; userId: string | null;
}) {
  const dragStartY = useRef(0);
  const [dragDelta, setDragDelta] = useState(0);
  const isDragging = useRef(false);
  const [circleToast, setCircleToast] = useState(false);
  const [enquireToast, setEnquireToast] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    isDragging.current = true;
    setDragDelta(0);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) setDragDelta(delta);
  };
  const onTouchEnd = () => {
    isDragging.current = false;
    if (dragDelta > OVERLAY_DISMISS) { setDragDelta(0); onClose(); }
    else setDragDelta(0);
  };

  const ty = dragDelta > 0 ? `translateY(${dragDelta}px)` : 'translateY(0)';
  const op = dragDelta > 0 ? Math.max(0.3, 1 - dragDelta / 200) : 1;

  return (
    // Outer wrapper: position fixed so backdrop-filter works on all browsers
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 20,
      transform: visible ? ty : 'translateY(100%)',
      transition: isDragging.current ? 'none' : 'transform 340ms cubic-bezier(0.22,1,0.36,1)',
      opacity: visible ? op : 0,
      willChange: 'transform',
      // iOS frosted glass
      background: 'rgba(12,10,9,0.82)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: '20px 20px 0 0',
      paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 24px)',
    }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Drag handle */}
      <div style={{ display:'flex',justifyContent:'center',padding:'12px 0 16px' }}>
        <div style={{ width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.2)' }} />
      </div>
      {/* Enquire toast */}
      {enquireToast && (
        <div style={{ position:'absolute',top:16,left:'50%',transform:'translateX(-50%)',background:'rgba(255,255,255,0.15)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',border:'0.5px solid rgba(255,255,255,0.2)',borderRadius:20,padding:'6px 16px',fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:300,color:'rgba(248,247,245,0.8)',whiteSpace:'nowrap',zIndex:30 }}>
          Enquiry coming soon
        </div>
      )}
      {/* Circle toast */}
      {circleToast && (
        <div style={{ position:'absolute',top:16,left:'50%',transform:'translateX(-50%)',background:'rgba(255,255,255,0.15)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',border:'0.5px solid rgba(255,255,255,0.2)',borderRadius:20,padding:'6px 16px',fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:300,color:'rgba(248,247,245,0.8)',whiteSpace:'nowrap',zIndex:30 }}>
          Circle coming soon
        </div>
      )}

      <div style={{ padding:'0 24px' }}>
        {/* Category + city */}
        <p style={{ fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.22em',textTransform:'uppercase',color:'rgba(248,247,245,0.5)',margin:'0 0 8px' }}>
          {vendor.categoryLabel}&nbsp;·&nbsp;{vendor.city}
        </p>

        {/* Name */}
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:300,color:'#F8F7F5',margin:'0 0 4px',letterSpacing:'-0.01em',lineHeight:1.1 }}>
          {vendor.name}
        </h2>

        {/* Tagline */}
        <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:15,fontWeight:300,fontStyle:'italic',color:'rgba(248,247,245,0.65)',margin:'0 0 12px',lineHeight:1.5 }}>
          {vendor.tagline}
        </p>

        {/* Price */}
        <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'rgba(248,247,245,0.5)',margin:'0 0 20px' }}>
          {vendor.priceLabel}
        </p>

        {/* Action buttons */}
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>

          {/* Enquire — primary CTA */}
          <button
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEnquireToast(true); setTimeout(() => setEnquireToast(false), 2500); onEnquire(); }}
            style={{ width:'100%',padding:'14px 0',background:'rgba(248,247,245,0.9)',border:'none',borderRadius:10,fontFamily:"'Jost',sans-serif",fontSize:10,fontWeight:300,letterSpacing:'0.22em',textTransform:'uppercase',color:'#111111',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,touchAction:'manipulation' }}
          >
            <MessageCircle size={14} strokeWidth={1.5} />
            Enquire
          </button>

          {/* Second row: Lock Date + Share to Circle */}
          <div style={{ display:'flex',gap:8 }}>

            {/* Lock Date — coming soon */}
            <button
              disabled
              style={{ flex:1,padding:'12px 0',background:'rgba(255,255,255,0.12)',border:'0.5px solid rgba(255,255,255,0.18)',borderRadius:10,fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(248,247,245,0.7)',cursor:'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}
            >
              <Lock size={12} strokeWidth={1.5} />
              Lock Date
              <span style={{ fontSize:7,letterSpacing:'0.05em',textTransform:'none',fontStyle:'italic',color:'rgba(248,247,245,0.35)' }}>beta</span>
            </button>

            {/* Share to Circle */}
            <button
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setCircleToast(true); setTimeout(() => setCircleToast(false), 2500); }}
              style={{ flex:1,padding:'12px 0',background:'rgba(255,255,255,0.12)',border:'0.5px solid rgba(255,255,255,0.18)',borderRadius:10,fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(248,247,245,0.7)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,touchAction:'manipulation' }}
            >
              <Users size={12} strokeWidth={1.5} />
              Circle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Image dots ────────────────────────────────────────────────────────────────
function ImageDots({ total, current }: { total: number; current: number }) {
  if (total <= 1) return null;
  return (
    <div style={{
      position:'fixed',
      top:'calc(env(safe-area-inset-top,0px) + 20px)',
      left:'50%', transform:'translateX(-50%)',
      display:'flex', gap:5, zIndex:25, pointerEvents:'none',
    }}>
      {Array.from({ length: Math.min(total, 8) }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 16 : 5,
          height: 5, borderRadius: 3,
          background: i === current ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)',
          transition: 'all 240ms cubic-bezier(0.22,1,0.36,1)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      ))}
    </div>
  );
}

// ── Blind centre toast (replaces side indicators) ────────────────────────────
function BlindCentreToast({ hint }: { hint: 'left'|'right'|null }) {
  if (!hint) return null;
  return (
    <div style={{
      position:'fixed', top:'50%', left:'50%',
      transform:'translate(-50%,-50%)',
      zIndex:30, pointerEvents:'none',
      animation: 'heartPop 600ms cubic-bezier(0.22,1,0.36,1) forwards',
    }}>
      <span style={{ fontSize:72, lineHeight:1, color: '#C9A84C' }}>
        {hint === 'right' ? '♥' : '✕'}
      </span>
    </div>
  );
}

// ── Main feed ─────────────────────────────────────────────────────────────────
function DiscoveryFeedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'discover';
  const isBlind = mode === 'blind';

  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const [vendors, setVendors] = useState<SeedVendor[]>([]);
  const [vendorIdx, setVendorIdx] = useState(0);
  const [imageIdx, setImageIdx] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [dissolveKey, setDissolveKey] = useState(0);
  const [blindHint, setBlindHint] = useState<'left'|'right'|null>(null);
  // Blind mode swipe animation
  const [blindSlide, setBlindSlide] = useState<'left'|'right'|null>(null);

  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTime = useRef(0);
  const tapCount = useRef(0);

  // Auth
  useEffect(() => {
    try {
      const raw = localStorage.getItem('couple_session');
      if (raw) { const s = JSON.parse(raw); if (s?.id) { setUserId(s.id); userIdRef.current = s.id; } }
    } catch {}
  }, []);

  // Load vendors
  useEffect(() => {
    const all = SEED_VENDORS;
    const category = searchParams.get('category');
    const minB = Number(searchParams.get('minBudget') || 0);
    const maxB = Number(searchParams.get('maxBudget') || 0);
    let filtered = [...all];
    if (category) filtered = filtered.filter(v => v.category === category);
    if (minB) filtered = filtered.filter(v => v.priceFrom >= minB);
    if (maxB) filtered = filtered.filter(v => v.priceFrom <= maxB);
    if (mode === 'featured') filtered = filtered.filter(v => v.priceFrom >= 200000);
    setVendors(filtered.length > 0 ? filtered : all);
    setVendorIdx(0); setImageIdx(0);
  }, [mode, searchParams]);

  const vendor = vendors[vendorIdx];

  // Navigation
  const goNextVendor = useCallback((direction: 'left'|'right'|null = null) => {
    if (vendorIdx >= vendors.length - 1) return;
    if (direction) {
      setBlindSlide(direction);
      setTimeout(() => {
        setBlindSlide(null);
        setVendorIdx(i => i + 1);
        setImageIdx(0);
        setOverlayVisible(false);
        setDissolveKey(k => k + 1);
        haptic(5);
      }, 220);
    } else {
      setVendorIdx(i => i + 1);
      setImageIdx(0);
      setOverlayVisible(false);
      setDissolveKey(k => k + 1);
      haptic(5);
    }
  }, [vendorIdx, vendors.length]);

  const goPrevVendor = useCallback(() => {
    if (vendorIdx <= 0) return;
    setVendorIdx(i => i - 1);
    setImageIdx(0);
    setOverlayVisible(false);
    setDissolveKey(k => k + 1);
    haptic(5);
  }, [vendorIdx]);

  const nextImage = useCallback(() => {
    if (vendor && imageIdx < vendor.images.length - 1) {
      setImageIdx(i => i + 1); setDissolveKey(k => k + 1); haptic(4);
    }
  }, [imageIdx, vendor]);

  const prevImage = useCallback(() => {
    if (imageIdx > 0) { setImageIdx(i => i - 1); setDissolveKey(k => k + 1); haptic(4); }
  }, [imageIdx]);

  // Single tap — toggle overlay (non-blind only)
  const handleSingleTap = useCallback(() => {
    if (isBlind) return;
    setOverlayVisible(v => !v);
    haptic(4);
  }, [isBlind]);

  // Double tap — save to muse (non-blind only)
  const handleDoubleTap = useCallback(() => {
    if (isBlind || !vendor) return;
    spawnHeart();
    saveVendorToMuse(vendor.id, userIdRef.current).then(ok => spawnSaveToast(!ok));
  }, [isBlind, vendor, userId]);

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart.current) return;
    const start = touchStart.current;
    touchStart.current = null;
    const end = e.changedTouches[0];
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    const dt = Date.now() - start.t;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Tap detection
    if (absX < TAP_MAX_MOVE && absY < TAP_MAX_MOVE && dt < TAP_MAX_TIME) {
      const now = Date.now();
      const since = now - lastTapTime.current;
      if (since < DOUBLE_TAP_MS && tapCount.current >= 1) {
        if (tapTimer.current) clearTimeout(tapTimer.current);
        tapCount.current = 0;
        handleDoubleTap();
      } else {
        tapCount.current = 1; lastTapTime.current = now;
        tapTimer.current = setTimeout(() => {
          if (tapCount.current === 1) handleSingleTap();
          tapCount.current = 0;
        }, DOUBLE_TAP_MS);
      }
      return;
    }

    const velocity = Math.max(absX, absY) / Math.max(dt, 1);
    const passed = Math.max(absX, absY) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY;
    if (!passed) return;

    if (isBlind) {
      // Tinder-style left/right only
      if (absX > absY) {
        if (dx > SWIPE_THRESHOLD) {
          // Right → save + animate
          setBlindHint('right');
          setTimeout(() => setBlindHint(null), 400);
          spawnHeart();
          saveVendorToMuse(vendor?.id || '', userIdRef.current).then(ok => spawnSaveToast(!ok));
          goNextVendor('right');
        } else if (dx < -SWIPE_THRESHOLD) {
          // Left → dismiss + animate
          setBlindHint('left');
          setTimeout(() => setBlindHint(null), 400);
          goNextVendor('left');
        }
      }
      return;
    }

    // Normal mode
    // Swipe down on overlay → dismiss
    if (overlayVisible && absY > absX && dy > OVERLAY_DISMISS) {
      setOverlayVisible(false); return;
    }
    // Vertical → change vendor
    if (absY > absX) {
      if (dy < -SWIPE_THRESHOLD) goNextVendor(); else if (dy > SWIPE_THRESHOLD) goPrevVendor();
    } else {
      // Horizontal → change photo
      if (dx < -SWIPE_THRESHOLD) nextImage(); else if (dx > SWIPE_THRESHOLD) prevImage();
    }
  };

  if (!vendor) {
    return (
      <div style={{ position:'fixed',inset:0,background:'#111111',display:'flex',alignItems:'center',justifyContent:'center' }}>
        <span style={{ fontFamily:"'Jost',sans-serif",fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(248,247,245,0.35)' }}>Loading</span>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes heartPop {
          0%   { opacity:0; transform:translate(-50%,-50%) scale(0.3); }
          45%  { opacity:1; transform:translate(-50%,-50%) scale(1.15); }
          70%  { transform:translate(-50%,-50%) scale(0.95); }
          100% { opacity:0; transform:translate(-50%,-50%) scale(1); }
        }
        @keyframes dissolveIn { from{opacity:0} to{opacity:1} }
        @keyframes slideInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastSlideIn { from{opacity:0;transform:translateX(-50%) translateY(-8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes slideOffLeft { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(-120%)} }
        @keyframes slideOffRight { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(120%)} }
      `}</style>

      <div
        style={{ position:'fixed',inset:0,background:'#0C0A09',overflow:'hidden',touchAction:'none',userSelect:'none',WebkitUserSelect:'none' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Photo — with blind slide animation */}
        <div
          key={dissolveKey}
          style={{
            position:'absolute', inset:0,
            animation: blindSlide === 'left'
              ? 'slideOffLeft 220ms ease forwards'
              : blindSlide === 'right'
              ? 'slideOffRight 220ms ease forwards'
              : 'dissolveIn 260ms ease',
          }}
        >
          <img
            src={vendor.images[imageIdx]}
            alt=""
            draggable={false}
            style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',willChange:'opacity' }}
          />
          <div style={{ position:'absolute',inset:0,background:'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 20%, transparent 65%, rgba(0,0,0,0.5) 100%)',pointerEvents:'none' }} />
        </div>

        {/* Image dots — fixed positioning so they show above everything */}
        <ImageDots total={vendor.images.length} current={imageIdx} />

        {/* Close → hub */}
        <button
          onClick={() => router.push('/couple/discover/hub')}
          style={{ position:'fixed',top:'calc(env(safe-area-inset-top,0px) + 16px)',left:16,zIndex:25,width:36,height:36,borderRadius:'50%',background:'rgba(0,0,0,0.35)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',border:'0.5px solid rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,0.9)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Blind pill label */}
        {isBlind && (
          <div style={{ position:'fixed',top:'calc(env(safe-area-inset-top,0px) + 20px)',right:16,zIndex:25,background:'rgba(0,0,0,0.45)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',border:'0.5px solid rgba(255,255,255,0.15)',borderRadius:20,padding:'5px 14px',fontFamily:"'Jost',sans-serif",fontSize:8,fontWeight:300,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(255,255,255,0.75)' }}>
            Blind
          </div>
        )}

        {/* Blind centre toast */}
        {isBlind && <BlindCentreToast hint={blindHint} />}

        {/* Hint text (normal mode, no overlay) */}
        {!isBlind && !overlayVisible && (
          <div style={{ position:'fixed',bottom:'calc(env(safe-area-inset-bottom,0px) + 28px)',left:0,right:0,display:'flex',justifyContent:'center',zIndex:10,pointerEvents:'none',animation:'slideInUp 400ms cubic-bezier(0.22,1,0.36,1)' }}>
            <span style={{ fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:200,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(255,255,255,0.4)' }}>
              Tap · Double-tap to save · Swipe to browse
            </span>
          </div>
        )}

        {/* Glass overlay */}
        {!isBlind && (
          <GlassOverlay
            vendor={vendor}
            visible={overlayVisible}
            onClose={() => setOverlayVisible(false)}
            onEnquire={() => { /* Enquiry flow — coming with messaging phase */ }}
            userId={userId}
          />
        )}
      </div>
    </>
  );
}

export default function DiscoveryFeed() {
  return (
    <Suspense fallback={
      <div style={{ position:'fixed',inset:0,background:'#0C0A09',display:'flex',alignItems:'center',justifyContent:'center' }}>
        <span style={{ fontFamily:"'Jost',sans-serif",fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(248,247,245,0.35)' }}>
          Loading
        </span>
      </div>
    }>
      <DiscoveryFeedContent />
    </Suspense>
  );
}
