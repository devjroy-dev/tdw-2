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
