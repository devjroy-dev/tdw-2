'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Discovery from '@/components/discovery/Discovery';
import DiscoveryTopBar from './DiscoveryTopBar';
import VendorRevealSheet from './VendorRevealSheet';
import FilterSheet, { FilterState } from './FilterSheet';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

type FeedMode = 'default' | 'featured' | 'offers' | 'blind';

export default function CoupleDiscoverPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ userId: string; dreamerType: string } | null>(null);
  const [ready, setReady] = useState(false);
  
  // UI state
  const [uiVisible, setUiVisible] = useState(false);
  const [vendorCardExpanded, setVendorCardExpanded] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  
  // Feed state
  const [feedMode, setFeedMode] = useState<FeedMode>('default');
  const [activeFilter, setActiveFilter] = useState<'featured' | 'offers' | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    locations: [],
    categories: [],
    budget: { min: 50000, max: 500000 },
    tiers: [],
  });
  
  // Current vendor (for reveal sheet)
  const [currentVendor, setCurrentVendor] = useState<any>(null);
  
  // Timers
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const tapCount = useRef(0);
  const lastTapTime = useRef(0);

  // Auth check
  useEffect(() => {
    try {
      const raw = localStorage.getItem('couple_session');
      if (raw) {
        const s = JSON.parse(raw);
        if (s?.id) {
          setSession({ userId: s.id, dreamerType: s.dreamer_type || 'platinum' });
        }
      }
    } catch {}
    setReady(true);
  }, []);

  // Auto-hide UI after 3 seconds
  const resetHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setUiVisible(false);
      setVendorCardExpanded(false);
    }, 3000);
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  // Single tap → Reveal UI
  const handleSingleTap = useCallback(() => {
    if (!uiVisible) {
      setUiVisible(true);
      resetHideTimer();
    } else {
      // If UI already visible, keep it visible and reset timer
      resetHideTimer();
    }
  }, [uiVisible, resetHideTimer]);

  // Double tap → Save to Muse
  const handleDoubleTap = useCallback(async () => {
    if (!session || !currentVendor) return;
    
    // Show heart animation
    const heart = document.createElement('div');
    heart.innerHTML = '❤';
    heart.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      font-size: 80px;
      color: #C9A84C;
      z-index: 9999;
      pointer-events: none;
      animation: heartPop 600ms cubic-bezier(0.22,1,0.36,1) forwards;
    `;
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 600);

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(12);

    // Save to Muse
    try {
      const res = await fetch(`${API}/api/couple/muse/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: session.userId,
          vendor_id: currentVendor.id,
          event: 'general',
        }),
      });
      
      if (res.ok) {
        console.log('Saved to Muse');
      }
    } catch (err) {
      console.error('Save to Muse failed:', err);
    }
  }, [session, currentVendor]);

  // Tap detection wrapper around Discovery
  const handleDiscoveryTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const timeSince = now - lastTapTime.current;
    
    if (timeSince < 300) {
      // Double tap
      tapCount.current = 0;
      handleDoubleTap();
    } else {
      // Single tap
      tapCount.current = 1;
      lastTapTime.current = now;
      
      setTimeout(() => {
        if (tapCount.current === 1) {
          handleSingleTap();
        }
        tapCount.current = 0;
      }, 300);
    }
  }, [handleSingleTap, handleDoubleTap]);

  // Filter callbacks
  const handleFilterTap = (filter: 'featured' | 'offers') => {
    if (activeFilter === filter) {
      setActiveFilter(null);
      setFeedMode('default');
    } else {
      setActiveFilter(filter);
      setFeedMode(filter);
    }
    resetHideTimer();
  };

  const handleBlindTap = () => {
    setFeedMode('blind');
    setUiVisible(false); // Hide UI in blind mode
    clearHideTimer();
  };

  const handleFiltersTap = () => {
    setFilterSheetOpen(true);
    clearHideTimer(); // Keep UI visible while filter sheet is open
  };

  const handleVendorCardExpand = () => {
    setVendorCardExpanded(true);
    clearHideTimer(); // Keep UI visible when card is expanded
  };

  const handleVendorCardCollapse = () => {
    setVendorCardExpanded(false);
    if (!filterSheetOpen) {
      resetHideTimer();
    }
  };

  const handleSaveToMuse = async () => {
    if (!session || !currentVendor) return;
    
    try {
      const res = await fetch(`${API}/api/couple/muse/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: session.userId,
          vendor_id: currentVendor.id,
          event: 'general',
        }),
      });
      
      if (res.ok) {
        // Show success toast
        console.log('Saved to Muse');
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleEnquire = () => {
    console.log('Enquire:', currentVendor);
    // TODO: Open messaging
  };

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    setFilterSheetOpen(false);
    if (!vendorCardExpanded) {
      resetHideTimer();
    }
  };

  if (!ready) return null;

  return (
    <>
      <style jsx global>{`
        @keyframes heartPop {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>

      {/* Discovery component - wrapped in tap detector */}
      <div 
        onClick={handleDiscoveryTap}
        onTouchEnd={handleDiscoveryTap}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100dvh',
        }}
      >
        <Discovery 
          mode="couple" 
          session={session}
          // TODO: Pass filtered vendors based on feedMode and filters
        />
      </div>

      {/* Top bar with frosted pills */}
      <DiscoveryTopBar
        visible={uiVisible && feedMode !== 'blind'}
        activeFilter={activeFilter}
        onFilterTap={handleFilterTap}
        onBlindTap={handleBlindTap}
        onFiltersTap={handleFiltersTap}
        onInteraction={resetHideTimer}
      />

      {/* Vendor reveal sheet */}
      <VendorRevealSheet
        vendor={currentVendor}
        visible={uiVisible && feedMode !== 'blind'}
        expanded={vendorCardExpanded}
        onExpand={handleVendorCardExpand}
        onCollapse={handleVendorCardCollapse}
        onSave={handleSaveToMuse}
        onEnquire={handleEnquire}
      />

      {/* Filter sheet */}
      <FilterSheet
        visible={filterSheetOpen}
        onClose={() => {
          setFilterSheetOpen(false);
          if (!vendorCardExpanded) {
            resetHideTimer();
          }
        }}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />

      {/* Bottom nav - only show when UI is visible */}
      {uiVisible && feedMode !== 'blind' && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          animation: 'slideUp 280ms cubic-bezier(0.22,1,0.36,1)',
        }}>
          {/* BottomNav component will be rendered by layout */}
        </div>
      )}
    </>
  );
}
