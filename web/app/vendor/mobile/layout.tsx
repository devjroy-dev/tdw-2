import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Vendor — The Dream Wedding",
};

export const viewport: Viewport = {
  themeColor: "#FAF6F0",
};

export default function VendorMobileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
