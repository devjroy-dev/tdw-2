"use client";

import { createContext, useContext, useState } from "react";
import TopBar from "./components/TopBar";
import BottomNav from "./components/BottomNav";
import DreamAiFAB from "@/app/components/DreamAiFAB";

// ─── Mode Context ───────────────────────────────────────────────────────────
export type AppMode = "BUSINESS" | "DISCOVERY";

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
  // Read persisted mode from localStorage so it survives page navigation
  const [mode, setMode] = useState<AppMode>(() => {
    if (typeof window === 'undefined') return 'BUSINESS';
    const saved = localStorage.getItem('vendor_app_mode');
    return (saved === 'DISCOVERY' || saved === 'BUSINESS') ? saved as AppMode : 'BUSINESS';
  });

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      <div
        style={{
          backgroundColor: "#F8F7F5",
          fontFamily: "'DM Sans', sans-serif",
          minHeight: "100vh",
        }}
      >
        <TopBar />
        <main
          style={{
            paddingTop: "56px",
            paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
            overflowX: "hidden",
          }}
        >
          {children}
        </main>
        <BottomNav />
        <DreamAiFAB userType="vendor" />
      </div>
    </ModeContext.Provider>
  );
}
