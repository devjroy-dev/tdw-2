"use client";

import { useState } from "react";
import { Bell, Plus } from "lucide-react";

const TIER_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  Essential: { border: "#C9A84C", text: "#C9A84C", bg: "#FAF6F0" },
  Signature: { border: "#C9A84C", text: "#C9A84C", bg: "#FDF9F0" },
  Prestige: { border: "#8B6914", text: "#8B6914", bg: "#FBF5E6" },
};

interface TopBarProps {
  vendorName?: string;
  tier?: "Essential" | "Signature" | "Prestige";
  notificationCount?: number;
}

export default function TopBar({
  vendorName = "Riya Mehta Studio",
  tier = "Signature",
  notificationCount = 3,
}: TopBarProps) {
  const [showNotifDot] = useState(notificationCount > 0);
  const tierStyle = TIER_COLORS[tier];

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 20px",
        backgroundColor: "#FAF6F0",
        borderBottom: "1px solid #E8E0D5",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Left: Name + Tier badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "16px",
            fontWeight: 600,
            color: "#1A1A1A",
            letterSpacing: "0.01em",
          }}
        >
          {vendorName}
        </span>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: tierStyle.text,
            border: `1px solid ${tierStyle.border}`,
            backgroundColor: tierStyle.bg,
            borderRadius: "20px",
            padding: "2px 8px",
          }}
        >
          {tier}
        </span>
      </div>

      {/* Right: Notification bell + Quick-add */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Bell */}
        <div style={{ position: "relative", cursor: "pointer" }}>
          <Bell
            size={20}
            color="#5C5C5C"
            strokeWidth={1.6}
          />
          {showNotifDot && (
            <span
              style={{
                position: "absolute",
                top: "-2px",
                right: "-2px",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: "#C9A84C",
                border: "1.5px solid #FAF6F0",
              }}
            />
          )}
        </div>

        {/* Quick-add */}
        <button
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: "#C9A84C",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#B8963E")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#C9A84C")
          }
          aria-label="Quick add"
        >
          <Plus size={16} color="#FAF6F0" strokeWidth={2.2} />
        </button>
      </div>
    </header>
  );
}
