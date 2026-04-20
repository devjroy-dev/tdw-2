"use client";

import { useState, createContext, useContext } from "react";

// Mode context — exported so BottomNav can consume it
export type AppMode = "BUSINESS" | "DISCOVERY";
export const ModeContext = createContext<{
  mode: AppMode;
  setMode: (m: AppMode) => void;
}>({ mode: "BUSINESS", setMode: () => {} });
export const useAppMode = () => useContext(ModeContext);

export default function TopBar() {
  const [mode, setMode] = useState<AppMode>("BUSINESS");

  // Expose mode via a custom event so BottomNav (separate tree) can react
  const handleModeChange = (next: AppMode) => {
    setMode(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tdw-mode-change", { detail: next }));
    }
  };

  const initials = "RM";

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        height: "56px",
        backgroundColor: "#0C0A09",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        boxSizing: "border-box",
      }}
    >
      {/* Left: TDW wordmark */}
      <span
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "20px",
          fontWeight: 300,
          color: "#FAFAF8",
          letterSpacing: "0.04em",
          lineHeight: 1,
        }}
      >
        TDW
      </span>

      {/* Centre: Mode toggle pill */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          background: "rgba(255,255,255,0.08)",
          borderRadius: "20px",
          padding: "3px",
          gap: 0,
        }}
      >
        {(["BUSINESS", "DISCOVERY"] as AppMode[]).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "10px",
                fontWeight: 300,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                padding: "6px 16px",
                borderRadius: "16px",
                border: "none",
                cursor: "pointer",
                background: active ? "#FAFAF8" : "transparent",
                color: active ? "#0C0A09" : "rgba(255,255,255,0.5)",
                transition: "all 180ms cubic-bezier(0.22, 1, 0.36, 1)",
                whiteSpace: "nowrap",
              }}
            >
              {m}
            </button>
          );
        })}
      </div>

      {/* Right: Profile circle */}
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          border: "1px solid #C9A84C",
          background: "rgba(201,168,76,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "12px",
            fontWeight: 400,
            color: "#FAFAF8",
            lineHeight: 1,
          }}
        >
          {initials}
        </span>
      </div>
    </header>
  );
}
