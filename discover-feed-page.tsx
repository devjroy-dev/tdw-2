'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SEED_VENDORS, type SeedVendor } from '@/lib/seed/discoverySeed';
import VendorCardSheet from './VendorCardSheet';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

type FeedMode = 'discover' | 'featured' | 'trending' | 'offers' | 'blind';

// Haptics
const haptic = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
};

// Swipe detection constants
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY  = 0.3;
const TAP_MAX_MOVE    = 10;
const TAP_MAX_TIME    = 250;
const DOUBLE_TAP_TIME = 300;

export default function DiscoveryFeed() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') || 'discover') as FeedMode;

  const [session, setSession] = useState<{ userId: string } | null>(null);
  const [vendors, setVendors] = useState<SeedVendor[]>([]);
  const [vendorIdx, setVendorIdx] = useState(0);
  const [imageIdx, setImageIdx] = useState(0);
  const [dissolveKey, setDissolveKey] = useState(0);
  const [cardVisible, setCardVisible] = useState(false);

  // Tap detection
  const tapCount = useRef(0);
  const lastTapTime = useRef(0);

  // Auth
  useEffect(() => {
    try {
      const raw = localStorage.getItem('couple_session');
      if (raw) {
        const s = JSON.parse(raw);
        if (s?.id) setSession({ userId: s.id });
      }
    } catch {}
  }, []);

  // Load vendors based on mode
  useEffect(() => {
    const allVendors = SEED_VENDORS;
    
    switch (mode) {
      case 'featured':
        // Filter featured vendors (those with tier = prestige)
        setVendors(allVendors.filter(v => v.tier === 'prestige'));
        break;
      case 'trending':
        // Random selection for now
        const shuffled = [...allVendors].sort(() => Math.random() - 0.5);
        setVendors(shuffled.slice(0, 20));
        break;
      case 'offers':
        // For now, show all vendors (we'll add offers logic later)
        setVendors(allVendors);
        break;
      case 'blind':
      case 'discover':
      default:
        setVendors(allVendors);
    }
  }, [mode]);

  const vendor = vendors[vendorIdx];
  const currentImage = vendor?.images[imageIdx];

  const bumpDissolve = () => setDissolveKey(k => k + 1);

  // Navigation
  const nextVendor = useCallback(() => {
    if (vendorIdx < vendors.length - 1) {
      setVendorIdx(i => i + 1);
      setImageIdx(0);
      haptic(4);
      bumpDissolve();
      setCardVisible(false);
    }
  }, [vendorIdx, vendors.length]);

  const prevVendor = useCallback(() => {
    if (vendorIdx > 0) {
      setVendorIdx(i => i - 1);
      setImageIdx(0);
      haptic(4);
      bumpDissolve();
      setCardVisible(false);
    }
  }, [vendorIdx]);

  const nextImage = useCallback(() => {
    if (vendor && imageIdx < vendor.images.length - 1) {
      setImageIdx(i => i + 1);
      haptic(4);
      bumpDissolve();
    }
  }, [imageIdx, vendor]);

  const prevImage = useCallback(() => {
    if (imageIdx > 0) {
      setImageIdx(i => i - 1);
      haptic(4);
      bumpDissolve();
    }
  }, [imageIdx]);

  // Single tap → Show card (except in blind mode)
  const handleSingleTap = useCallback(() => {
    if (mode === 'blind') return; // No card in blind mode
    
    setCardVisible(true);
    haptic(4);
  }, [mode]);

  // Double tap → Save to Muse (except in blind mode)
  const handleDoubleTap = useCallback(async () => {
    if (!session || !vendor || mode === 'blind') return;

    // Heart animation
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
    } catch (err) {
      console.error('Save failed', err);
    }
  }, [session, vendor, mode]);

  // Tap router
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

  // Touch handlers
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

    const velocity = Math.max(absX, absY) / Math.max(dt, 1);
    const passed = Math.max(absX, absY) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY;
    if (!passed) return;

    // BLIND MODE: Horizontal swipe only
    if (mode === 'blind') {
      if (dx > SWIPE_THRESHOLD) {
        // Right swipe = Save to Muse
        handleDoubleTap();
        nextVendor();
      } else if (dx < -SWIPE_THRESHOLD) {
        // Left swipe = Pass
        nextVendor();
      }
    } else {
      // OTHER MODES: Vertical for vendors, Horizontal for images
      if (absY > absX) {
        if (dy < 0) nextVendor(); else prevVendor();
      } else {
        if (dx < 0) nextImage(); else prevImage();
      }
    }
  };

  const handleEnquire = () => {
    console.log('Enquire:', vendor);
    // TODO: Open messaging
  };

  if (!vendor) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#0C0A09',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#F8F7F5',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes heartPop {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes dissolveIn {
          from { opacity: 0; transform: scale(1.02); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#0C0A09',
          overflow: 'hidden',
          touchAction: 'none',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Image */}
        <div
          key={dissolveKey}
          style={{
            position: 'absolute',
            inset: 0,
          }}
        >
          <img
            src={currentImage}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              animation: 'dissolveIn 280ms cubic-bezier(0.22,1,0.36,1)',
            }}
          />

          {/* Scrim */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(12,10,9,0.3) 0%, rgba(12,10,9,0) 20%, rgba(12,10,9,0) 70%, rgba(12,10,9,0.4) 100%)',
          }} />
        </div>

        {/* Top chrome - minimal */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 24px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          zIndex: 10,
        }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(248,247,245,0.85)',
              fontFamily: "'Jost', sans-serif",
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ← {mode.toUpperCase()}
          </button>

          <span style={{
            color: 'rgba(248,247,245,0.7)',
            fontFamily: "'Jost', sans-serif",
            fontSize: 11,
            letterSpacing: '0.15em',
          }}>
            {String(vendorIdx + 1).padStart(2, '0')} / {String(vendors.length).padStart(2, '0')}
          </span>
        </div>

        {/* Vendor Card Sheet (60%) */}
        {mode !== 'blind' && (
          <VendorCardSheet
            vendor={vendor}
            visible={cardVisible}
            onClose={() => setCardVisible(false)}
            onEnquire={handleEnquire}
          />
        )}
      </div>
    </>
  );
}
