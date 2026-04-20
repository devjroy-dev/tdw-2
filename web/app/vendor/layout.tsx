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
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#FAF6F0",
        overflow: "hidden",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <TopBar />
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
