"use client";

import { X } from "lucide-react";

const PRIORITY_STRIPE: Record<string, string> = {
  high: "#C0392B",
  medium: "#C9A84C",
  low: "#999999",
};

interface AttentionCardProps {
  priority: "high" | "medium" | "low";
  title: string;
  subtitle: string;
  cta: string;
  onDismiss: () => void;
  onAction: () => void;
}

export default function AttentionCard({
  priority,
  title,
  subtitle,
  cta,
  onDismiss,
  onAction,
}: AttentionCardProps) {
  const stripeColor = PRIORITY_STRIPE[priority];

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        boxShadow: "0 1px 6px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
        overflow: "hidden",
        marginBottom: "10px",
      }}
    >
      {/* Priority stripe */}
      <div
        style={{
          width: "3px",
          flexShrink: 0,
          backgroundColor: stripeColor,
        }}
      />

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            color: "#1A1A1A",
            margin: 0,
            paddingRight: "24px",
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "12px",
            color: "#888888",
            margin: 0,
          }}
        >
          {subtitle}
        </p>

        {/* CTA */}
        <button
          onClick={onAction}
          style={{
            alignSelf: "flex-start",
            marginTop: "6px",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "12px",
            fontWeight: 500,
            color: "#C9A84C",
            padding: 0,
            letterSpacing: "0.01em",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          {cta}
        </button>
      </div>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "2px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#BBBBBB",
        }}
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
