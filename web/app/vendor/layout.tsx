"use client";

import TopBar from "./components/TopBar";
import BottomNav from "./components/BottomNav";

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
          paddingBottom: "calc(64px + env(safe-area-inset-bottom))",
          overflowX: "hidden",
        }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
