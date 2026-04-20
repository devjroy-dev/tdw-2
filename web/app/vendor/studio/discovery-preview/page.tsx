"use client";
import { useState, useEffect } from "react";
import DiscoverFeed from "@/app/discover/DiscoverFeed";

export default function DiscoveryPreviewPage() {
  const [vendorCards, setVendorCards] = useState<any[] | null>(null);
  const stats = { views: 47, saves: 12, enquiry_ready: 3 };

  useEffect(() => {
    setVendorCards([]);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0C0A09" }}>
      <a href="/vendor/studio" style={{ position: "fixed", top: 24, left: 24, zIndex: 200, fontFamily: "'Jost', sans-serif", fontWeight: 300, fontSize: 13, color: "#C9A84C", textDecoration: "none" }}>
        ← Studio
      </a>
      <DiscoverFeed isSignedIn={true} profileComplete={true} vendorOverrideCards={vendorCards ?? undefined} isVendorPreview={true} />
      {vendorCards && vendorCards.length > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: "rgba(12,10,9,0.85)", backdropFilter: "blur(8px)", padding: "20px 24px 32px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, fontSize: 15, color: "#FAFAF8", margin: "0 0 6px", textAlign: "center" }}>
            {stats.views} views · {stats.saves} saves · {stats.enquiry_ready} enquiry-ready
          </p>
          <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, fontSize: 13, color: "#8C8480", margin: 0, textAlign: "center" }}>
            This is exactly how couples experience your profile.
          </p>
        </div>
      )}
    </div>
  );
}
