#!/bin/bash
cd /workspaces/tdw-2

# Create discover directory
mkdir -p web/app/discover
mkdir -p web/app/vendor/studio/discovery-preview

# ── layout.tsx ──────────────────────────────────────────────
cat > web/app/layout.tsx << 'EOF'
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Dream Wedding",
  description: "Getting married happily.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&family=Jost:wght@200;300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0C0A09" }}>
        {children}
      </body>
    </html>
  );
}
EOF

# ── useDiscoverFeed.ts ───────────────────────────────────────
cat > web/app/discover/useDiscoverFeed.ts << 'EOF'
"use client";
import { useState, useEffect, useCallback } from "react";

export interface DiscoveryCard {
  id: string;
  vendor_name: string;
  category: string;
  city: string;
  price_min: number;
  price_max: number;
  bio: string;
  images: string[];
  stats: { views: number; saves: number; enquiry_ready: number };
  sort_order: number;
}

export function useDiscoverFeed() {
  const [cards, setCards] = useState<DiscoveryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://dream-wedding-production-89ae.up.railway.app/api/v2/discovery/feed")
      .then((r) => r.json())
      .then((data) => {
        setCards(data.cards || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load feed.");
        setLoading(false);
      });
  }, []);

  const preloadImages = useCallback((startIndex: number, count: number) => {
    for (let i = startIndex; i < Math.min(startIndex + count, cards.length); i++) {
      const img = new Image();
      img.src = cards[i].images[0];
    }
  }, [cards]);

  return { cards, loading, error, preloadImages };
}
EOF

# ── SignupNudge.tsx ──────────────────────────────────────────
cat > web/app/discover/SignupNudge.tsx << 'EOF'
"use client";
import { useEffect, useRef } from "react";

interface Props {
  onDismiss: () => void;
  onCTA: () => void;
}

export default function SignupNudge({ onDismiss, onCTA }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.style.transform = "translateY(0)";
      el.style.opacity = "1";
    });
  }, []);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-end" }}
      onClick={onDismiss}
    >
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxHeight: 280,
          background: "#0C0A09",
          borderRadius: "24px 24px 0 0",
          padding: "36px 32px 40px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          transform: "translateY(100%)",
          opacity: 0,
          transition: "transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms",
        }}
      >
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 300,
          fontStyle: "italic",
          fontSize: 28,
          color: "#FAFAF8",
          margin: 0,
          textAlign: "center",
        }}>
          See who this is.
        </p>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 300,
          fontSize: 15,
          color: "#8C8480",
          margin: 0,
          textAlign: "center",
        }}>
          Takes ten seconds.
        </p>
        <button
          onClick={onCTA}
          style={{
            width: "100%",
            padding: "16px 0",
            marginTop: 8,
            background: "#1A1714",
            border: "none",
            borderRadius: 8,
            fontFamily: "'Jost', sans-serif",
            fontWeight: 400,
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#C9A84C",
            cursor: "pointer",
          }}
        >
          ENTER YOUR NUMBER →
        </button>
        <span
          onClick={onDismiss}
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 300,
            fontSize: 13,
            color: "#8C8480",
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          or keep browsing
        </span>
      </div>
    </div>
  );
}
EOF

# ── RevealSheet.tsx ──────────────────────────────────────────
cat > web/app/discover/RevealSheet.tsx << 'EOF'
"use client";
import { useEffect, useRef } from "react";
import { DiscoveryCard } from "./useDiscoverFeed";

interface Props {
  card: DiscoveryCard;
  onClose: () => void;
  onSave: () => void;
  onEnquire: () => void;
  profileComplete: boolean;
  toastMessage: string | null;
}

export default function RevealSheet({ card, onClose, onSave, onEnquire, profileComplete, toastMessage }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => { el.style.transform = "translateY(0)"; });
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", pointerEvents: "none" }}>
      <div
        ref={ref}
        style={{
          width: "100%",
          height: "65vh",
          background: "#FAFAF8",
          borderRadius: "24px 24px 0 0",
          transform: "translateY(100%)",
          transition: "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
          overflowY: "auto",
          padding: "24px 24px 40px",
          boxSizing: "border-box",
          pointerEvents: "all",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 24, color: "#0C0A09", margin: 0 }}>
              {card.vendor_name}
            </p>
            <span style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: "#8C8480" }}>
              {card.city}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#3C3835", padding: 4 }}>×</button>
        </div>

        <div style={{ display: "flex", gap: 24, marginBottom: 20 }}>
          {[
            { label: "VIEWS", val: card.stats.views },
            { label: "SAVES", val: card.stats.saves },
            { label: "ENQUIRY-READY", val: card.stats.enquiry_ready },
          ].map(({ label, val }) => (
            <div key={label}>
              <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.25em", color: "#8C8480", margin: 0 }}>{val}</p>
              <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.25em", color: "#C4BFB8", margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>

        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: 15, color: "#3C3835",
          lineHeight: 1.6, margin: "0 0 20px",
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {card.bio}
        </p>

        <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 24, scrollbarWidth: "none" }}>
          {card.images.slice(0, 5).map((src, i) => (
            <img key={i} src={src} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onSave} style={{ width: "100%", padding: "16px 0", background: "#1A1714", border: "none", borderRadius: 8, fontFamily: "'Jost', sans-serif", fontWeight: 400, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#C9A84C", cursor: "pointer" }}>
            SAVE TO MUSE
          </button>
          <button onClick={onEnquire} style={{ width: "100%", padding: "16px 0", background: "transparent", border: "1.5px solid #1A1714", borderRadius: 8, fontFamily: "'Jost', sans-serif", fontWeight: 400, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#0C0A09", cursor: "pointer" }}>
            SEND ENQUIRY
          </button>
        </div>

        {toastMessage && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: 13, color: "#8C8480", textAlign: "center", marginTop: 12 }}>
            {toastMessage}
          </p>
        )}
      </div>
    </div>
  );
}
EOF

# ── VendorCard.tsx ───────────────────────────────────────────
cat > web/app/discover/VendorCard.tsx << 'EOF'
"use client";
import { useRef, useState, useCallback } from "react";
import { DiscoveryCard } from "./useDiscoverFeed";

interface Props {
  card: DiscoveryCard;
  imageIndex: number;
  revealLevel: number;
  entering: boolean;
}

export default function VendorCard({ card, imageIndex, revealLevel, entering }: Props) {
  const [parallaxY, setParallaxY] = useState(0);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dy = (e.clientY - rect.top - rect.height / 2) * 0.04;
    setParallaxY(dy);
  }, []);

  const src = card.images[imageIndex] || card.images[0];

  return (
    <div
      onPointerMove={handlePointerMove}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        animation: entering ? "dissolve 280ms cubic-bezier(0.22, 1, 0.36, 1) forwards" : "none",
        opacity: revealLevel >= 3 ? 0.4 : 1,
        transition: revealLevel >= 3 ? "opacity 280ms" : undefined,
      }}
    >
      <div style={{
        position: "absolute",
        inset: "-5%",
        backgroundImage: `url(${src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        transform: `translateY(${parallaxY}px)`,
        transition: "transform 0.1s linear",
        willChange: "transform",
      }} />

      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "40vh",
        background: "linear-gradient(to bottom, transparent, rgba(12,10,9,0.72))",
        pointerEvents: "none",
      }} />

      <div style={{ position: "absolute", bottom: 32, left: 24, pointerEvents: "none" }}>
        <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: "#C4BFB8", margin: 0 }}>
          {card.category} · {card.city}
        </p>

        {revealLevel >= 1 && (
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 36, color: "#FAFAF8", margin: "8px 0 0", animation: "dissolve 280ms cubic-bezier(0.22, 1, 0.36, 1) forwards" }}>
            {card.vendor_name}
          </p>
        )}

        {revealLevel >= 2 && (
          <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, fontSize: 14, color: "#C9A84C", margin: "4px 0 0", animation: "dissolve 280ms cubic-bezier(0.22, 1, 0.36, 1) forwards" }}>
            {card.price_min >= 100 ? `₹${(card.price_min / 100).toFixed(1)}L` : `₹${card.price_min}K`}
            {" – "}
            {card.price_max >= 100 ? `₹${(card.price_max / 100).toFixed(1)}L` : `₹${card.price_max}K`}
          </p>
        )}
      </div>
    </div>
  );
}
EOF

# ── DiscoverFeed.tsx ─────────────────────────────────────────
cat > web/app/discover/DiscoverFeed.tsx << 'EOF'
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
EOF

# ── discover/page.tsx ────────────────────────────────────────
cat > web/app/discover/page.tsx << 'EOF'
import DiscoverFeed from "./DiscoverFeed";

export default function DiscoverPage() {
  return <DiscoverFeed isSignedIn={false} profileComplete={false} />;
}
EOF

# ── vendor/studio/discovery-preview/page.tsx ────────────────
cat > web/app/vendor/studio/discovery-preview/page.tsx << 'EOF'
"use client";
import { useState, useEffect } from "react";
import DiscoverFeed from "@/app/discover/DiscoverFeed";

export default function DiscoveryPreviewPage() {
  const [vendorCards, setVendorCards] = useState<any[] | null>(null);
  const stats = { views: 47, saves: 12, enquiry_ready: 3 };

  useEffect(() => {
    setVendorCards([]);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0C0A09" }}>
      <a href="/vendor/studio" style={{ position: "fixed", top: 24, left: 24, zIndex: 200, fontFamily: "'Jost', sans-serif", fontWeight: 300, fontSize: 13, color: "#C9A84C", textDecoration: "none" }}>
        ← Studio
      </a>
      <DiscoverFeed isSignedIn={true} profileComplete={true} vendorOverrideCards={vendorCards ?? undefined} isVendorPreview={true} />
      {vendorCards && vendorCards.length > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: "rgba(12,10,9,0.85)", backdropFilter: "blur(8px)", padding: "20px 24px 32px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, fontSize: 15, color: "#FAFAF8", margin: "0 0 6px", textAlign: "center" }}>
            {stats.views} views · {stats.saves} saves · {stats.enquiry_ready} enquiry-ready
          </p>
          <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, fontSize: 13, color: "#8C8480", margin: 0, textAlign: "center" }}>
            This is exactly how couples experience your profile.
          </p>
        </div>
      )}
    </div>
  );
}
EOF

echo "✅ All files written. Now run: git add -A && git commit -m 'Session 2: Discovery feed' && git push origin main"
