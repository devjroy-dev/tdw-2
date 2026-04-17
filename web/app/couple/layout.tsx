import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "The Dream Wedding",
};

export const viewport: Viewport = {
  themeColor: "#FAF6F0",
};

export default function CoupleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
