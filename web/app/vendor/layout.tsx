"use client";

import { createContext, useContext, useState } from "react";
import { usePathname } from "next/navigation";
import TopBar from "./components/TopBar";
import BottomNav from "./components/BottomNav";
import DreamAiFAB from "../components/DreamAiFAB";

// ─── Mode Context ───────────────────────────────────────────────────────────
export type AppMode = "BUSINESS" | "DISCOVERY" | "DREAMAI";

export const ModeContext = createContext<{
  mode: AppMode;
  setMode: (m: AppMode) => void;
}>({
  mode: "BUSINESS",
  setMode: () => {},
});

export const useAppMode = () => useContext(ModeContext);

// ─── Layout ─────────────────────────────────────────────────────────────────
export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mode, setMode] = useState<AppMode>(() => {
    if (typeof window === "undefined") return "BUSINESS";
    const saved = localStorage.getItem("vendor_app_mode");
    return saved === "DISCOVERY" || saved === "BUSINESS" || saved === "DREAMAI"
      ? (saved as AppMode)
      : "BUSINESS";
  });

  // PIN pages are full-screen experiences — no shell, no nav, no FAB
  const isPinPage =
    pathname === "/vendor/pin" || pathname === "/vendor/pin-login";

  if (isPinPage) {
    return (
      <ModeContext.Provider value={{ mode, setMode }}>
        {children}
      </ModeContext.Provider>
    );
  }

  const isDreamAi = mode === "DREAMAI";

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      <div
        style={{
          backgroundColor: isDreamAi ? "#0C0A09" : "#F8F7F5",
          fontFamily: "'DM Sans', sans-serif",
          minHeight: "100vh",
        }}
      >
        <TopBar />
        <main
          style={{
            paddingTop: "56px",
            paddingBottom: isDreamAi ? "0" : "calc(80px + env(safe-area-inset-bottom))",
            overflowX: "hidden",
            minHeight: isDreamAi ? "calc(100dvh - 56px)" : "auto",
          }}
        >
          {children}
        </main>
        {!isDreamAi && <BottomNav />}
        {!isDreamAi && <DreamAiFAB userType="vendor" />}
      </div>
    </ModeContext.Provider>
  );
}
