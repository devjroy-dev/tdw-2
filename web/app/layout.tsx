import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "./session-provider";

export const metadata: Metadata = {
  title: "The Dream Wedding",
  description: "Not just happily married — getting married happily.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FAF6F0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="The Dream Wedding" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
        {/*
          Service worker registration moved to /vendor/mobile/layout.tsx so it only
          applies to the PWA. Registering here registered SW for the entire origin,
          which intercepted /vendor/dashboard requests and caused infinite-loop
          re-fetches that crashed the dashboard with React error #310.
        */}
              <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
      </body>
    </html>
  );
}
