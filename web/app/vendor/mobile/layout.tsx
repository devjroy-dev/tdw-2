import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Vendor — The Dream Wedding",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FAF6F0",
};

export default function VendorMobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/*
        Service worker registration scoped to the PWA only.
        Registering at the root caused SW to intercept /vendor/dashboard requests
        and trigger infinite-loop re-fetches that crashed React with error #310.
      */}
      <script dangerouslySetInnerHTML={{ __html: `
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', function() {
            navigator.serviceWorker.register('/sw.js', { scope: '/vendor/mobile/' }).catch(function() {});
          });
        }
      `}} />
      {children}
    </>
  );
}
