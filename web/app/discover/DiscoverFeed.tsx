"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useDiscoverFeed } from "./useDiscoverFeed";
import VendorCard from "./VendorCard";
import SignupNudge from "./SignupNudge";
import RevealSheet from "./RevealSheet";

interface Props {
  isSignedIn?: boolean;
  profileComplete?: boolean;
  vendorOverrideCards?: any[];
  isVendorPreview?: boolean;
}

export default function DiscoverFeed({ isSignedIn = false, profileComplete = false, vendorOverrideCards, isVendorPreview = false }: Props) {
  const { cards: fetchedCards, loading, preloadImages } = useDiscoverFeed();
  const cards = vendorOverrideCards ?? fetchedCards;

  const [cardIndex, setCardIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [entering, setEntering] = useState(false);
  const [revealLevel, setRevealLevel] = useState(0);
  const [showNudge, setShowNudge] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [swipesSinceNudge, setSwipesSinceNudge] = useState(0);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (cards.length > 0) preloadImages(1, 3);
  }, [cards, preloadImages]);

  const goToCard = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= cards.length) return;
    setEntering(true);
    setCardIndex(newIndex);
    setImageIndex(0);
    setRevealLevel(0);
    setShowSheet(false);
    setToastMessage(null);
    setTimeout(() => setEntering(false), 300);
    preloadImages(newIndex + 1, 3);
    setSwipesSinceNudge((n) => n + 1);
  }, [cards, preloadImages]);

  const handleTap = useCallback(() => {
    if (!isSignedIn) {
      if (!showNudge) { setShowNudge(true); setSwipesSinceNudge(0); }
      else if (swipesSinceNudge >= 3) { setShowNudge(true); setSwipesSinceNudge(0); }
      return;
    }
    const next = revealLevel + 1;
    if (next >= 3) { setRevealLevel(3); setShowSheet(true); }
    else setRevealLevel(next);
  }, [isSignedIn, revealLevel, swipesSinceNudge, showNudge]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    dragStart.current = null;

    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) { handleTap(); return; }

    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy < -40) goToCard(cardIndex + 1);
      else if (dy > 40) goToCard(cardIndex - 1);
    } else {
      const card = cards[cardIndex];
      if (!card) return;
      if (dx < -40) setImageIndex((i) => Math.min(i + 1, card.images.length - 1));
      else if (dx > 40) setImageIndex((i) => Math.max(i - 1, 0));
    }
  }, [cardIndex, cards, goToCard, handleTap]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (loading) return (
    <div style={{ position: "fixed", inset: 0, background: "#0C0A09", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 12, letterSpacing: "0.3em", textTransform: "uppercase", color: "#C4BFB8" }}>Loading</p>
    </div>
  );

  if (cards.length === 0) return (
    <div style={{ position: "fixed", inset: 0, background: "#0C0A09", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontStyle: "italic", fontSize: 24, color: "#FAFAF8", margin: 0 }}>Nothing here yet.</p>
      {isVendorPreview && (
        <button style={{ padding: "14px 32px", background: "#1A1714", border: "none", borderRadius: 8, fontFamily: "'Jost', sans-serif", fontWeight: 400, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#C9A84C", cursor: "pointer" }}>
          Upload photos in Image Hub
        </button>
      )}
    </div>
  );

  const currentCard = cards[cardIndex];

  return (
    <>
      <style>{`
        @keyframes dissolve { from { opacity: 0; transform: scale(1.02); } to { opacity: 1; transform: scale(1); } }
        * { -webkit-tap-highlight-color: transparent; user-select: none; }
      `}</style>
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        style={{ position: "fixed", inset: 0, background: "#0C0A09", overflow: "hidden", touchAction: "none", cursor: "pointer" }}
      >
        <VendorCard key={`${cardIndex}-${imageIndex}`} card={currentCard} imageIndex={imageIndex} revealLevel={revealLevel} entering={entering} />
      </div>

      {showNudge && !isSignedIn && (
        <SignupNudge onDismiss={() => setShowNudge(false)} onCTA={() => { setShowNudge(false); window.location.href = "/auth/signup"; }} />
      )}

      {showSheet && isSignedIn && (
        <RevealSheet
          card={currentCard}
          onClose={() => { setShowSheet(false); setRevealLevel(2); }}
          onSave={() => { if (!profileComplete) { showToast("Complete your profile to connect with vendors."); return; } showToast("Saved to Muse."); }}
          onEnquire={() => { if (!profileComplete) { showToast("Complete your profile to connect with vendors."); return; } showToast("Enquiry sent."); }}
          profileComplete={profileComplete}
          toastMessage={toastMessage}
        />
      )}
    </>
  );
}
