"use client";

import { createContext, useContext, useState } from "react";
import TopBar from "./components/TopBar";
import BottomNav from "./components/BottomNav";

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
  const [mode, setMode] = useState<AppMode>("BUSINESS");

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      <div
        style={{
          backgroundColor: "#FAFAF8",
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
      </div>
    </ModeContext.Provider>
  );
}
