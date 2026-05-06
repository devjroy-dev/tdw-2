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
