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
