'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SEED_VENDORS, type SeedVendor } from '@/lib/seed/discoverySeed';
import VendorCardSheet from '../VendorCardSheet';
import { Eye, EyeOff, Settings, X as XIcon } from 'lucide-react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

type FeedMode = 'discover' | 'featured' | 'trending' | 'offers' | 'cover' | 'category';

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

export default function DiscoveryFeed() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') || 'discover') as FeedMode;
  const category = searchParams.get('category');

  const [session, setSession] = useState<{ userId: string } | null>(null);
  const [vendors, setVendors] = useState<SeedVendor[]>([]);
  const [vendorIdx, setVendorIdx] = useState(0);
  const [imageIdx, setImageIdx] = useState(0);
  const [dissolveKey, setDissolveKey] = useState(0);
  const [revealLevel, setRevealLevel] = useState(0); // 0, 1, 2, 3
  const [blindMode, setBlindMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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
        setVendors(allVendors.filter(v => v.tier === 'prestige'));
        break;
      case 'trending':
        const shuffled = [...allVendors].sort(() => Math.random() - 0.5);
        setVendors(shuffled.slice(0, 20));
        break;
      case 'offers':
        setVendors(allVendors);
        break;
      case 'category':
        if (category) {
          setVendors(allVendors.filter(v => v.category.toLowerCase() === category.toLowerCase()));
        } else {
          setVendors(allVendors);
        }
        break;
      case 'cover':
      case 'discover':
      default:
        setVendors(allVendors);
    }
  }, [mode, category]);

  const vendor = vendors[vendorIdx];
  const currentImage = vendor?.images[imageIdx];

  const bumpDissolve = () => setDissolveKey(k => k + 1);

  // Navigation
  const nextVendor = useCallback(() => {
    if (vendorIdx < vendors.length - 1) {
      setVendorIdx(i => i + 1);
      setImageIdx(0);
      setRevealLevel(0);
      haptic(4);
      bumpDissolve();
    }
  }, [vendorIdx, vendors.length]);

  const prevVendor = useCallback(() => {
    if (vendorIdx > 0) {
      setVendorIdx(i => i - 1);
      setImageIdx(0);
      setRevealLevel(0);
      haptic(4);
      bumpDissolve();
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

  // Progressive reveal
  const handleSingleTap = useCallback(() => {
    if (blindMode) return; // No reveal in blind mode
    
    if (revealLevel < 3) {
      setRevealLevel(r => r + 1);
      haptic(4);
    }
  }, [revealLevel, blindMode]);

  // Double tap → Save to Muse
  const handleDoubleTap = useCallback(async () => {
    if (!session || !vendor) return;

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
  }, [session, vendor]);

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
    if (blindMode) {
      if (dx > SWIPE_THRESHOLD) {
        handleDoubleTap();
        nextVendor();
      } else if (dx < -SWIPE_THRESHOLD) {
        nextVendor();
      }
    } else {
      // Vertical for vendors, Horizontal for images
      if (absY > absX) {
        if (dy < 0) nextVendor(); else prevVendor();
      } else {
        if (dx < 0) nextImage(); else prevImage();
      }
    }
  };

  const handleEnquire = () => {
    console.log('Enquire:', vendor);
  };

  // Blind mode not available in Featured, Trending, Cover
  const blindAvailable = mode === 'discover' || mode === 'category';

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
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
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
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(12,10,9,0.3) 0%, rgba(12,10,9,0) 20%, rgba(12,10,9,0) 60%, rgba(12,10,9,0.6) 100%)',
          }} />
        </div>

        {/* Top bar */}
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
          {/* Filter icon - left */}
          <button
            onClick={() => setShowFilters(true)}
            style={{
              width: 28,
              height: 28,
              background: 'rgba(12,10,9,0.2)',
              backdropFilter: 'blur(8px)',
              border: '0.5px solid rgba(248,247,245,0.15)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(248,247,245,0.6)',
              transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            <Settings size={14} strokeWidth={1.5} />
          </button>

          {/* Blind toggle - center */}
          {blindAvailable && (
            <button
              onClick={() => {
                setBlindMode(b => !b);
                setRevealLevel(0);
              }}
              style={{
                width: 28,
                height: 28,
                background: blindMode ? 'rgba(201,168,76,0.3)' : 'rgba(12,10,9,0.2)',
                backdropFilter: 'blur(8px)',
                border: `0.5px solid ${blindMode ? 'rgba(201,168,76,0.5)' : 'rgba(248,247,245,0.15)'}`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: blindMode ? '#C9A84C' : 'rgba(248,247,245,0.6)',
                transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              {blindMode ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
            </button>
          )}
          {!blindAvailable && <div style={{ width: 28 }} />}

          {/* X button - right */}
          <button
            onClick={() => router.push('/couple/discover/hub')}
            style={{
              width: 28,
              height: 28,
              background: 'rgba(12,10,9,0.2)',
              backdropFilter: 'blur(8px)',
              border: '0.5px solid rgba(248,247,245,0.15)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(248,247,245,0.6)',
              transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            <XIcon size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Progressive reveal overlay - Level 0: Category only */}
        {!blindMode && (
          <div style={{
            position: 'absolute',
            bottom: 80,
            left: 24,
            right: 24,
            zIndex: 10,
            pointerEvents: 'none',
          }}>
            <p style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 10,
              fontWeight: 300,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(248,247,245,0.7)',
              margin: 0,
            }}>
              {vendor.category} · {vendor.city}
            </p>

            {/* Level 1: Name */}
            {revealLevel >= 1 && (
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 32,
                fontWeight: 300,
                color: '#F8F7F5',
                margin: '8px 0 0',
                animation: 'slideUp 280ms cubic-bezier(0.22,1,0.36,1)',
              }}>
                {vendor.name}
              </p>
            )}

            {/* Level 2: Rating + Price */}
            {revealLevel >= 2 && (
              <div style={{
                marginTop: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                animation: 'slideUp 280ms cubic-bezier(0.22,1,0.36,1)',
              }}>
                {vendor.rating && (
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 300,
                    color: '#F8F7F5',
                    margin: 0,
                  }}>
                    ★ {vendor.rating.toFixed(1)} {vendor.review_count && `(${vendor.review_count})`}
                  </p>
                )}
                {vendor.starting_price && (
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 300,
                    color: '#C9A84C',
                    margin: 0,
                  }}>
                    From ₹{vendor.starting_price.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom dots + arrow */}
        {!blindMode && (
          <div
            onClick={() => setRevealLevel(3)}
            style={{
              position: 'absolute',
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: Math.min(5, vendors.length) }).map((_, i) => {
                const dotIndex = Math.floor((vendorIdx / vendors.length) * 5);
                return (
                  <div
                    key={i}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: i === dotIndex ? 'rgba(248,247,245,0.7)' : 'transparent',
                      border: '0.5px solid rgba(248,247,245,0.3)',
                      transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
                    }}
                  />
                );
              })}
            </div>
            <div style={{
              fontSize: 10,
              color: 'rgba(248,247,245,0.4)',
              fontWeight: 200,
            }}>
              ↑
            </div>
          </div>
        )}

        {/* Vendor Card Sheet - Level 3 */}
        {revealLevel >= 3 && !blindMode && (
          <VendorCardSheet
            vendor={vendor}
            visible={true}
            onClose={() => setRevealLevel(2)}
            onEnquire={handleEnquire}
          />
        )}
      </div>
    </>
  );
}
