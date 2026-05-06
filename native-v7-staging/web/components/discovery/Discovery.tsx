'use client';

/**
 * TDW Discovery — S29 Enhanced
 * Double tap = Save to Muse with heart animation
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SEED_VENDORS, type SeedVendor } from '@/lib/seed/discoverySeed';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

type DiscoveryProps = {
  mode: 'couple' | 'demo';
  session?: { userId: string; dreamerType: string } | null;
  vendorsOverride?: SeedVendor[];
};

const haptic = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
};

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY  = 0.3;
const TAP_MAX_MOVE    = 10;
const TAP_MAX_TIME    = 250;
const DOUBLE_TAP_TIME = 300;

export default function Discovery({ mode, session = null, vendorsOverride }: DiscoveryProps) {
  const vendors = vendorsOverride ?? SEED_VENDORS;
  const signedIn = !!session;

  const [vendorIdx, setVendorIdx] = useState(0);
  const [imageIdx, setImageIdx]   = useState(0);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [swipesSinceDismiss, setSSD] = useState(0);
  const [dissolveKey, setDissolveKey] = useState(0);
  
  const nudgeCooldownSwipes = 3;
  const bumpDissolve = () => setDissolveKey(k => k + 1);
  const tapCount = useRef(0);
  const lastTapTime = useRef(0);

  const vendor = vendors[vendorIdx];
  const currentImage = vendor.images[imageIdx];

  useEffect(() => {
    const toPreload: string[] = [];
    for (let i = imageIdx + 1; i < Math.min(vendor.images.length, imageIdx + 3); i++) {
      toPreload.push(vendor.images[i]);
    }
    if (vendorIdx + 1 < vendors.length) {
      toPreload.push(vendors[vendorIdx + 1].images[0]);
    }
    toPreload.forEach(src => {
      const i = new Image();
      i.src = src;
    });
  }, [vendorIdx, imageIdx, vendor, vendors]);

  const nextVendor = useCallback(() => {
    if (vendorIdx < vendors.length - 1) {
      setVendorIdx(i => i + 1);
      setImageIdx(0);
      haptic(4);
      bumpDissolve();
    }
  }, [vendorIdx, vendors.length]);

  const prevVendor = useCallback(() => {
    if (vendorIdx > 0) {
      setVendorIdx(i => i - 1);
      setImageIdx(0);
      haptic(4);
      bumpDissolve();
    }
  }, [vendorIdx]);

  const nextImage = useCallback(() => {
    if (imageIdx < vendor.images.length - 1) {
      setImageIdx(i => i + 1);
      haptic(4);
      bumpDissolve();
    }
  }, [imageIdx, vendor.images.length]);

  const prevImage = useCallback(() => {
    if (imageIdx > 0) {
      setImageIdx(i => i - 1);
      haptic(4);
      bumpDissolve();
    }
  }, [imageIdx]);

  const incrementSwipeCounter = () => setSSD(n => n + 1);

  const handleSingleTap = useCallback(() => {
    if (!signedIn) {
      if (!nudgeOpen && swipesSinceDismiss >= nudgeCooldownSwipes) {
        setNudgeOpen(true);
        haptic(8);
      } else if (swipesSinceDismiss === 0 && !nudgeOpen) {
        setNudgeOpen(true);
        haptic(8);
      }
    } else {
      console.log('Single tap - UI reveal coming soon');
      haptic(4);
    }
  }, [signedIn, nudgeOpen, swipesSinceDismiss]);

  const handleDoubleTap = useCallback(async () => {
    if (!signedIn || !session) return;

    const heart = document.createElement('div');
    heart.innerHTML = '❤';
    heart.style.cssText = `
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%) scale(0);
      font-size: 80px; color: #C9A84C; z-index: 9999;
      pointer-events: none;
      animation: heartPop 600ms cubic-bezier(0.22,1,0.36,1) forwards;
    `;
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 600);
    haptic(12);

    try {
      await fetch(`${API}/api/couple/muse/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: session.userId,
          vendor_id: vendor.id,
          event: 'general',
        }),
      });
      console.log('✅ Saved to Muse');
    } catch (err) {
      console.error('❌ Save failed', err);
    }
  }, [signedIn, session, vendor]);

  const onTap = useCallback(() => {
    const now = Date.now();
    const timeSince = now - lastTapTime.current;

    if (timeSince < DOUBLE_TAP_TIME) {
      tapCount.current = 0;
      handleDoubleTap();
    } else {
      tapCount.current = 1;
      lastTapTime.current = now;
      setTimeout(() => {
        if (tapCount.current === 1) {
          handleSingleTap();
        }
        tapCount.current = 0;
      }, DOUBLE_TAP_TIME);
    }
  }, [handleSingleTap, handleDoubleTap]);

  const dismissNudge = () => {
    setNudgeOpen(false);
    setSSD(0);
  };

  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);

  const onTouchStart: React.TouchEventHandler = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const onTouchEnd: React.TouchEventHandler = (e) => {
    if (!touchStart.current) return;
    const start = touchStart.current;
    touchStart.current = null;

    const end = e.changedTouches[0];
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    const dt = Date.now() - start.t;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX < TAP_MAX_MOVE && absY < TAP_MAX_MOVE && dt < TAP_MAX_TIME) {
      onTap();
      return;
    }

    const velocity = Math.max(absX, absY) / Math.max(dt, 1);
    const passed = Math.max(absX, absY) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY;
    if (!passed) return;

    if (absY > absX) {
      if (dy < 0) nextVendor(); else prevVendor();
    } else {
      if (dx < 0) nextImage(); else prevImage();
    }
    incrementSwipeCounter();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (nudgeOpen) {
        if (e.key === 'Escape') dismissNudge();
        return;
      }
      switch (e.key) {
        case 'ArrowDown': nextVendor(); incrementSwipeCounter(); break;
        case 'ArrowUp':   prevVendor(); incrementSwipeCounter(); break;
        case 'ArrowRight':nextImage();  incrementSwipeCounter(); break;
        case 'ArrowLeft': prevImage();  incrementSwipeCounter(); break;
        case 'Enter':
        case ' ':         onTap(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nextVendor, prevVendor, nextImage, prevImage, onTap, nudgeOpen]);

  const imageDots = useMemo(() => vendor.images.map((_, i) => i), [vendor.images]);

  return (
    <>
      <style jsx global>{`@keyframes heartPop{0%{opacity:0;transform:translate(-50%,-50%) scale(0)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.2)}100%{opacity:0;transform:translate(-50%,-50%) scale(1)}}`}</style>
      <div className="discovery-root" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div key={dissolveKey} className="discovery-hero" style={{ opacity: nudgeOpen ? 0.5 : 1 }}>
          <img src={currentImage} alt="" draggable={false} className="discovery-hero-img" />
          <div className="discovery-hero-scrim" />
        </div>
        <header className="discovery-top">
          <div><span className="discovery-eyebrow">{mode === 'demo' ? 'Vendor Preview' : 'Discover'}</span></div>
          <div><span className="discovery-counter">{String(vendorIdx + 1).padStart(2, '0')}<span className="discovery-counter-sep"> / </span>{String(vendors.length).padStart(2, '0')}</span></div>
        </header>
        {vendor.images.length > 1 && (
          <div className="discovery-dots">
            {imageDots.map(i => <div key={i} className={`discovery-dot ${i === imageIdx ? 'is-active' : ''}`} />)}
          </div>
        )}
        {vendorIdx === 0 && swipesSinceDismiss === 0 && !nudgeOpen && <div className="discovery-hint">Swipe to explore</div>}
        {nudgeOpen && (
          <>
            <div className="discovery-backdrop" onClick={dismissNudge} />
            <div className="discovery-sheet">
              <div className="discovery-sheet-handle" />
              <h2 className="discovery-sheet-title">Love what you see?</h2>
              <p className="discovery-sheet-sub">Sign up to save your favorites, connect with Makers, and plan your dream wedding.</p>
              <button className="discovery-sheet-cta" onClick={() => { if (typeof window !== 'undefined') window.location.href = '/couple/login'; }}>Get Started</button>
              <button className="discovery-sheet-dismiss" onClick={dismissNudge}>Keep browsing</button>
            </div>
          </>
        )}
        <style jsx>{`
          :global(:root){--surface-base:#FAF8F6;--surface-inverse:#0C0A09;--ink-primary:#0C0A09;--ink-secondary:#333;--ink-muted:#666;--ink-whisper:#D4D0CA;--ink-inverse:#FAF8F6;--accent-primary:#C9A84C;--ease-luxury:cubic-bezier(0.22,1,0.36,1)}
          .discovery-root{position:fixed;inset:0;width:100vw;height:100dvh;background:var(--surface-inverse);overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:none}
          .discovery-hero{position:absolute;inset:0;transition:opacity 280ms var(--ease-luxury)}
          .discovery-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;animation:dissolveIn 280ms var(--ease-luxury) both}
          @keyframes dissolveIn{from{opacity:0;transform:scale(1.02)}to{opacity:1;transform:scale(1)}}
          .discovery-hero-scrim{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(12,10,9,0.3) 0%,rgba(12,10,9,0) 20%,rgba(12,10,9,0) 70%,rgba(12,10,9,0.4) 100%);pointer-events:none}
          .discovery-top{position:absolute;top:0;left:0;right:0;padding:calc(env(safe-area-inset-top,0px) + 20px) 24px 0;display:flex;justify-content:space-between;align-items:flex-start;z-index:10;pointer-events:none}
          .discovery-eyebrow{font-family:'Jost',-apple-system,system-ui,sans-serif;font-weight:300;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-inverse);opacity:0.85}
          .discovery-counter{font-family:'Jost',-apple-system,system-ui,sans-serif;font-weight:300;font-size:11px;letter-spacing:0.15em;color:var(--ink-inverse);opacity:0.7;font-variant-numeric:tabular-nums}
          .discovery-counter-sep{opacity:0.5}
          .discovery-dots{position:absolute;top:calc(env(safe-area-inset-top,0px) + 56px);left:24px;right:24px;display:flex;gap:4px;z-index:10;pointer-events:none}
          .discovery-dot{flex:1;height:2px;background:rgba(250,250,248,0.25);transition:background 180ms var(--ease-luxury)}
          .discovery-dot.is-active{background:var(--accent-primary)}
          .discovery-hint{position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 40px);left:0;right:0;text-align:center;font-family:'Jost',sans-serif;font-weight:200;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:var(--ink-inverse);opacity:0.55;animation:fadePulse 2800ms var(--ease-luxury) infinite;pointer-events:none;z-index:10}
          @keyframes fadePulse{0%,100%{opacity:0.25}50%{opacity:0.7}}
          .discovery-backdrop{position:absolute;inset:0;background:rgba(12,10,9,0.3);z-index:20;animation:fadeIn 320ms var(--ease-luxury)}
          @keyframes fadeIn{from{opacity:0}to{opacity:1}}
          .discovery-sheet{position:absolute;bottom:0;left:0;right:0;background:var(--surface-base);color:var(--ink-primary);border-radius:20px 20px 0 0;padding:16px 28px calc(env(safe-area-inset-bottom,0px) + 32px);z-index:21;display:flex;flex-direction:column;align-items:center;animation:sheetUp 400ms var(--ease-luxury);box-shadow:0 -20px 60px rgba(12,10,9,0.15)}
          @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
          .discovery-sheet-handle{width:36px;height:3px;background:var(--ink-whisper);border-radius:2px;margin-bottom:28px}
          .discovery-sheet-title{font-family:'Cormorant Garamond',Georgia,serif;font-weight:300;font-size:30px;line-height:1.1;margin:0 0 6px;color:var(--ink-primary);text-align:center}
          .discovery-sheet-sub{font-family:'DM Sans',sans-serif;font-weight:300;font-size:14px;color:var(--ink-muted);margin:0 0 28px;text-align:center}
          .discovery-sheet-cta{width:100%;max-width:360px;background:var(--surface-inverse);color:var(--accent-primary);border:none;border-radius:2px;padding:18px 24px;font-family:'Jost',sans-serif;font-weight:400;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;cursor:pointer;transition:transform 180ms var(--ease-luxury),background 180ms var(--ease-luxury)}
          .discovery-sheet-cta:active{transform:scale(0.98)}
          .discovery-sheet-dismiss{margin-top:18px;background:none;border:none;color:var(--ink-muted);font-family:'DM Sans',sans-serif;font-weight:300;font-size:13px;font-style:italic;cursor:pointer;padding:8px 16px}
          .discovery-sheet-dismiss:hover{color:var(--ink-secondary)}
          @media (prefers-reduced-motion:reduce){.discovery-hero,.discovery-backdrop,.discovery-sheet{animation-duration:1ms!important}.discovery-hint{animation:none;opacity:0.5}}
        `}</style>
      </div>
    </>
  );
}
