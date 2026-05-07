'use client';

/**
 * TDW Discovery — Session 2
 * ─────────────────────────────────────────────────────────────
 * Full-bleed swipe feed. Anonymous blind mode.
 *
 * Interaction model:
 *   Swipe up/down    → next/prev vendor
 *   Swipe left/right → next/prev image within same vendor
 *   Tap (anonymous)  → signup nudge bottom sheet
 *                      (reappears after 3+ swipes if dismissed)
 *   Tap (signed in)  → [Session 2b — reveal mechanic]
 *
 * Transition: dissolve (crossfade + 1.02 → 1 scale), 280ms, luxury ease.
 *
 * Locked decisions from Session 1 — do not change without a new session:
 *   • One easing curve: cubic-bezier(0.22, 1, 0.36, 1)
 *   • No slide/swipe animation on vendor change. Dissolve only.
 *   • Hero image NEVER disappears when sheet opens; it dims behind the sheet.
 *   • Gold used max 3 times on screen. Here: CTA text + active dot only.
 *   • No dark mode.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SEED_VENDORS, type SeedVendor } from '@/lib/seed/discoverySeed';

// ── Props ────────────────────────────────────────────────────
type DiscoveryProps = {
  /** 'couple' = /couple/discover production route. 'demo' = Swati's vendor-pitch demo. */
  mode: 'couple' | 'demo';
  /** Passed in by route wrapper. Null = anonymous. */
  session?: { userId: string; dreamerType: string } | null;
  /** Override seed (for preview in vendor Studio later). */
  vendorsOverride?: SeedVendor[];
};

// ── Haptics (graceful degradation) ──────────────────────────
const haptic = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
};

// ── Swipe detection ─────────────────────────────────────────
type SwipeDir = 'up' | 'down' | 'left' | 'right' | null;
const SWIPE_THRESHOLD = 50;    // px
const SWIPE_VELOCITY  = 0.3;   // px/ms
const TAP_MAX_MOVE    = 10;    // px — anything more is a swipe, not a tap
const TAP_MAX_TIME    = 250;   // ms

// ── Component ────────────────────────────────────────────────
export default function Discovery({ mode, session = null, vendorsOverride }: DiscoveryProps) {
  const vendors = vendorsOverride ?? SEED_VENDORS;
  const signedIn = !!session;

  // Position in the feed
  const [vendorIdx, setVendorIdx] = useState(0);
  const [imageIdx, setImageIdx]   = useState(0);

  // Nudge state — anonymous only
  const [nudgeOpen, setNudgeOpen]       = useState(false);
  const [swipesSinceDismiss, setSSD]    = useState(0);
  const nudgeCooldownSwipes             = 3; // from handover spec

  // Dissolve trigger — key change forces React to remount <img> with fade-in
  const [dissolveKey, setDissolveKey] = useState(0);
  const bumpDissolve = () => setDissolveKey(k => k + 1);

  const vendor = vendors[vendorIdx];
  const currentImage = vendor.images[imageIdx];

  // ── Preload next 3 images silently ───────────────────────
  useEffect(() => {
    const toPreload: string[] = [];

    // Rest of this vendor's images
    for (let i = imageIdx + 1; i < Math.min(vendor.images.length, imageIdx + 3); i++) {
      toPreload.push(vendor.images[i]);
    }
    // First image of next vendor
    if (vendorIdx + 1 < vendors.length) {
      toPreload.push(vendors[vendorIdx + 1].images[0]);
    }

    toPreload.forEach(src => {
      const i = new Image();
      i.src = src;
    });
  }, [vendorIdx, imageIdx, vendor, vendors]);

  // ── Navigation ───────────────────────────────────────────
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

  const incrementSwipeCounter = () => {
    setSSD(n => n + 1);
  };

  // ── Tap handler ──────────────────────────────────────────
  const onTap = useCallback(() => {
    if (!signedIn) {
      // Anonymous: show nudge, but respect cooldown
      if (!nudgeOpen && swipesSinceDismiss >= nudgeCooldownSwipes) {
        setNudgeOpen(true);
        haptic(8);
      } else if (swipesSinceDismiss === 0 && !nudgeOpen) {
        // First tap ever — show it
        setNudgeOpen(true);
        haptic(8);
      }
      // Otherwise silent — don't annoy
    } else {
      // Signed in: reveal mechanic — deferred to Session 2b
      // For now, no-op with silent haptic so it feels responsive.
      haptic(4);
    }
  }, [signedIn, nudgeOpen, swipesSinceDismiss]);

  const dismissNudge = () => {
    setNudgeOpen(false);
    setSSD(0); // reset counter; user must swipe 3+ before it reappears on tap
  };

  // ── Touch handlers ───────────────────────────────────────
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

    // Tap
    if (absX < TAP_MAX_MOVE && absY < TAP_MAX_MOVE && dt < TAP_MAX_TIME) {
      onTap();
      return;
    }

    // Swipe — dominant axis wins
    const velocity = Math.max(absX, absY) / Math.max(dt, 1);
    const passed = Math.max(absX, absY) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY;
    if (!passed) return;

    if (absY > absX) {
      // Vertical
      if (dy < 0) nextVendor(); else prevVendor();
    } else {
      // Horizontal
      if (dx < 0) nextImage(); else prevImage();
    }
    incrementSwipeCounter();
  };

  // ── Keyboard (desktop dev + accessibility) ───────────────
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

  // ── Image dots (within-vendor pagination) ────────────────
  const imageDots = useMemo(
    () => vendor.images.map((_, i) => i),
    [vendor.images]
  );

  return (
    <div className="discovery-root" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* ── HERO IMAGE (always visible, dims when sheet opens) ── */}
      <div
        key={dissolveKey}
        className="discovery-hero"
        style={{ opacity: nudgeOpen ? 0.5 : 1 }}
      >
        <img
          src={currentImage}
          alt=""
          draggable={false}
          className="discovery-hero-img"
        />
        <div className="discovery-hero-scrim" />
      </div>

      {/* ── TOP CHROME — minimal, editorial ─────────────────── */}
      <header className="discovery-top">
        <div className="discovery-top-left">
          <span className="discovery-eyebrow">
            {mode === 'demo' ? 'Vendor Preview' : 'Discover'}
          </span>
        </div>
        <div className="discovery-top-right">
          {/* Position indicator — quiet */}
          <span className="discovery-counter">
            {String(vendorIdx + 1).padStart(2, '0')}
            <span className="discovery-counter-sep"> / </span>
            {String(vendors.length).padStart(2, '0')}
          </span>
        </div>
      </header>

      {/* ── IMAGE DOTS (within-vendor) ──────────────────────── */}
      {vendor.images.length > 1 && (
        <div className="discovery-dots" aria-hidden>
          {imageDots.map(i => (
            <span
              key={i}
              className={`discovery-dot ${i === imageIdx ? 'is-active' : ''}`}
            />
          ))}
        </div>
      )}

      {/* ── BOTTOM HINT — first vendor only, gentle onboarding ── */}
      {vendorIdx === 0 && imageIdx === 0 && !nudgeOpen && (
        <div className="discovery-hint">
          <span>Swipe</span>
        </div>
      )}

      {/* ── SIGNUP NUDGE SHEET (anonymous only) ─────────────── */}
      {nudgeOpen && !signedIn && (
        <>
          <div
            className="discovery-backdrop"
            onClick={dismissNudge}
            aria-hidden
          />
          <div className="discovery-sheet" role="dialog" aria-modal="true">
            <div className="discovery-sheet-handle" aria-hidden />
            <h2 className="discovery-sheet-title">See who this is.</h2>
            <p className="discovery-sheet-sub">Takes ten seconds.</p>
            <button
              className="discovery-sheet-cta"
              onClick={() => {
                haptic([12, 40, 8]);
                // Hand off to auth — replace with real router push in integration
                if (typeof window !== 'undefined') {
                  window.location.href = '/couple/signin?next=/couple/discover';
                }
              }}
            >
              Enter your number →
            </button>
            <button className="discovery-sheet-dismiss" onClick={dismissNudge}>
              or keep browsing
            </button>
          </div>
        </>
      )}

      {/* ── STYLES ─────────────────────────────────────────── */}
      <style jsx>{`
        :global(:root) {
          --surface-base:    #FAFAF8;
          --surface-card:    #F4F1EC;
          --surface-raised:  #FFFFFF;
          --surface-inverse: #0C0A09;
          --ink-primary:     #0C0A09;
          --ink-secondary:   #3C3835;
          --ink-muted:       #8C8480;
          --ink-whisper:     #C4BFB8;
          --ink-inverse:     #FAFAF8;
          --accent-primary:  #C9A84C;
          --accent-border:   #E8E4DE;
          --ease-luxury:     cubic-bezier(0.22, 1, 0.36, 1);
        }

        .discovery-root {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100dvh;
          background: var(--surface-inverse);
          overflow: hidden;
          touch-action: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          font-family: 'DM Sans', -apple-system, system-ui, sans-serif;
          font-weight: 300;
          color: var(--ink-inverse);
        }

        /* ── Hero ── */
        .discovery-hero {
          position: absolute;
          inset: 0;
          animation: dissolve 280ms var(--ease-luxury);
          transition: opacity 320ms var(--ease-luxury);
          will-change: opacity, transform;
        }

        @keyframes dissolve {
          from { opacity: 0; transform: scale(1.02); }
          to   { opacity: 1; transform: scale(1); }
        }

        .discovery-hero-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          pointer-events: none;
          -webkit-user-drag: none;
        }

        /* Soft scrim — top and bottom — so white text stays legible */
        .discovery-hero-scrim {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to bottom,
              rgba(12, 10, 9, 0.35) 0%,
              rgba(12, 10, 9, 0) 18%,
              rgba(12, 10, 9, 0) 72%,
              rgba(12, 10, 9, 0.45) 100%
            );
          pointer-events: none;
        }

        /* ── Top chrome ── */
        .discovery-top {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: calc(env(safe-area-inset-top, 0px) + 20px) 24px 0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          z-index: 10;
          pointer-events: none;
        }

        .discovery-eyebrow {
          font-family: 'Jost', -apple-system, system-ui, sans-serif;
          font-weight: 300;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--ink-inverse);
          opacity: 0.85;
        }

        .discovery-counter {
          font-family: 'Jost', -apple-system, system-ui, sans-serif;
          font-weight: 300;
          font-size: 11px;
          letter-spacing: 0.15em;
          color: var(--ink-inverse);
          opacity: 0.7;
          font-variant-numeric: tabular-nums;
        }

        .discovery-counter-sep {
          opacity: 0.5;
        }

        /* ── Image dots (within vendor) ── */
        .discovery-dots {
          position: absolute;
          top: calc(env(safe-area-inset-top, 0px) + 56px);
          left: 24px;
          right: 24px;
          display: flex;
          gap: 4px;
          z-index: 10;
          pointer-events: none;
        }

        .discovery-dot {
          flex: 1;
          height: 2px;
          background: rgba(250, 250, 248, 0.25);
          transition: background 180ms var(--ease-luxury);
        }

        .discovery-dot.is-active {
          background: var(--accent-primary);
        }

        /* ── Swipe hint — first card only ── */
        .discovery-hint {
          position: absolute;
          bottom: calc(env(safe-area-inset-bottom, 0px) + 40px);
          left: 0;
          right: 0;
          text-align: center;
          font-family: 'Jost', sans-serif;
          font-weight: 200;
          font-size: 10px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--ink-inverse);
          opacity: 0.55;
          animation: fadePulse 2800ms var(--ease-luxury) infinite;
          pointer-events: none;
          z-index: 10;
        }

        @keyframes fadePulse {
          0%, 100% { opacity: 0.25; }
          50%      { opacity: 0.7; }
        }

        /* ── Sheet + backdrop ── */
        .discovery-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(12, 10, 9, 0.3);
          z-index: 20;
          animation: fadeIn 320ms var(--ease-luxury);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .discovery-sheet {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--surface-base);
          color: var(--ink-primary);
          border-radius: 20px 20px 0 0;
          padding: 16px 28px calc(env(safe-area-inset-bottom, 0px) + 32px);
          z-index: 21;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: sheetUp 400ms var(--ease-luxury);
          box-shadow: 0 -20px 60px rgba(12, 10, 9, 0.15);
        }

        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }

        .discovery-sheet-handle {
          width: 36px;
          height: 3px;
          background: var(--ink-whisper);
          border-radius: 2px;
          margin-bottom: 28px;
        }

        .discovery-sheet-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 300;
          font-size: 30px;
          line-height: 1.1;
          margin: 0 0 6px;
          color: var(--ink-primary);
          text-align: center;
        }

        .discovery-sheet-sub {
          font-family: 'DM Sans', sans-serif;
          font-weight: 300;
          font-size: 14px;
          color: var(--ink-muted);
          margin: 0 0 28px;
          text-align: center;
        }

        .discovery-sheet-cta {
          width: 100%;
          max-width: 360px;
          background: var(--surface-inverse);
          color: var(--accent-primary);
          border: none;
          border-radius: 2px;
          padding: 18px 24px;
          font-family: 'Jost', sans-serif;
          font-weight: 400;
          font-size: 13px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 180ms var(--ease-luxury),
                      background 180ms var(--ease-luxury);
        }

        .discovery-sheet-cta:active {
          transform: scale(0.98);
        }

        .discovery-sheet-dismiss {
          margin-top: 18px;
          background: none;
          border: none;
          color: var(--ink-muted);
          font-family: 'DM Sans', sans-serif;
          font-weight: 300;
          font-size: 13px;
          font-style: italic;
          cursor: pointer;
          padding: 8px 16px;
        }

        .discovery-sheet-dismiss:hover {
          color: var(--ink-secondary);
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .discovery-hero,
          .discovery-backdrop,
          .discovery-sheet {
            animation-duration: 1ms !important;
          }
          .discovery-hint { animation: none; opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
