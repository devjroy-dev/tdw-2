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
async function saveVendorToMuse(vendorId: string, userId: string | null) {
  if (!userId) return;
  try {
    await fetch(`${API}/api/couple/muse/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couple_id: userId, vendor_id: vendorId, event: 'general' }),
    });
  } catch {}
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
      background: 'rgba(248,247,245,0.78)',
      backdropFilter: 'blur(32px) saturate(200%)',
      WebkitBackdropFilter: 'blur(32px) saturate(200%)',
      borderTop: '0.5px solid rgba(255,255,255,0.8)',
      borderRadius: '20px 20px 0 0',
      paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 24px)',
    }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Drag handle */}
      <div style={{ display:'flex',justifyContent:'center',padding:'12px 0 16px' }}>
        <div style={{ width:36,height:4,borderRadius:2,background:'rgba(17,17,17,0.18)' }} />
      </div>

      <div style={{ padding:'0 24px' }}>
        {/* Category + city */}
        <p style={{ fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.22em',textTransform:'uppercase',color:'#888580',margin:'0 0 8px' }}>
          {vendor.categoryLabel}&nbsp;·&nbsp;{vendor.city}
        </p>

        {/* Name */}
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:300,color:'#111111',margin:'0 0 4px',letterSpacing:'-0.01em',lineHeight:1.1 }}>
          {vendor.name}
        </h2>

        {/* Tagline */}
        <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:15,fontWeight:300,fontStyle:'italic',color:'#555250',margin:'0 0 12px',lineHeight:1.5 }}>
          {vendor.tagline}
        </p>

        {/* Price */}
        <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#888580',margin:'0 0 20px' }}>
          {vendor.priceLabel}
        </p>

        {/* Action buttons */}
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>

          {/* Enquire — primary CTA */}
          <button
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEnquire(); }}
            style={{ width:'100%',padding:'14px 0',background:'#111111',border:'none',borderRadius:10,fontFamily:"'Jost',sans-serif",fontSize:10,fontWeight:300,letterSpacing:'0.22em',textTransform:'uppercase',color:'#F8F7F5',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,touchAction:'manipulation' }}
          >
            <MessageCircle size={14} strokeWidth={1.5} />
            Enquire
          </button>

          {/* Second row: Lock Date + Share to Circle */}
          <div style={{ display:'flex',gap:8 }}>

            {/* Lock Date — coming soon */}
            <button
              disabled
              style={{ flex:1,padding:'12px 0',background:'transparent',border:'0.5px solid rgba(201,168,76,0.4)',borderRadius:10,fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.18em',textTransform:'uppercase',color:'#C9A84C',cursor:'not-allowed',opacity:0.7,display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}
            >
              <Lock size={12} strokeWidth={1.5} />
              Lock Date
              <span style={{ fontSize:7,letterSpacing:'0.05em',textTransform:'none',fontStyle:'italic',color:'#C8C4BE' }}>soon</span>
            </button>

            {/* Share to Circle */}
            <button
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                if (userId) saveVendorToMuse(vendor.id, userId);
                spawnHeart();
              }}
              style={{ flex:1,padding:'12px 0',background:'transparent',border:'0.5px solid #E2DED8',borderRadius:10,fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.18em',textTransform:'uppercase',color:'#555250',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,touchAction:'manipulation' }}
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

// ── Blind indicator circles ───────────────────────────────────────────────────
function BlindIndicator({ side, active }: { side: 'left'|'right'; active: boolean }) {
  return (
    <div style={{
      position:'fixed', top:'50%', [side]:24,
      transform:'translateY(-50%)', zIndex:30,
      opacity: active ? 1 : 0,
      transition:'opacity 120ms ease',
      pointerEvents:'none',
    }}>
      <div style={{
        background: side === 'right' ? 'rgba(201,168,76,0.9)' : 'rgba(17,17,17,0.6)',
        backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
        borderRadius:'50%', width:60, height:60,
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      }}>
        <span style={{ fontSize:24, color:'#FFFFFF' }}>{side === 'right' ? '♥' : '✕'}</span>
      </div>
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
      if (raw) { const s = JSON.parse(raw); if (s?.id) setUserId(s.id); }
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
    saveVendorToMuse(vendor.id, userId);
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
          saveVendorToMuse(vendor?.id || '', userId);
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

        {/* Blind indicators */}
        {isBlind && (
          <>
            <BlindIndicator side="left" active={blindHint === 'left'} />
            <BlindIndicator side="right" active={blindHint === 'right'} />
          </>
        )}

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
            onEnquire={() => router.push(`/couple/messages?vendor=${vendor.id}&name=${encodeURIComponent(vendor.name)}`)}
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
