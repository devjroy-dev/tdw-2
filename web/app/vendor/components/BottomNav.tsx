"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Users,
  Wallet,
  Grid2X2,
  LayoutDashboard,
  Inbox,
  Image,
  Handshake,
} from "lucide-react";

type AppMode = "BUSINESS" | "DISCOVERY";

const BUSINESS_TABS = [
  { label: "TODAY",  Icon: Home,            href: "/vendor/today"             },
  { label: "CLIENTS", Icon: Users,          href: "/vendor/clients"           },
  { label: "MONEY",  Icon: Wallet,          href: "/vendor/money"             },
  { label: "STUDIO", Icon: Grid2X2,         href: "/vendor/studio"            },
];

const DISCOVERY_TABS = [
  { label: "DASH",      Icon: LayoutDashboard, href: "/vendor/discovery/dash"   },
  { label: "LEADS",     Icon: Inbox,           href: "/vendor/discovery/leads"  },
  { label: "IMAGE HUB", Icon: Image,           href: "/vendor/discovery/images" },
  { label: "COLLAB",    Icon: Handshake,       href: "/vendor/discovery/collab" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const [mode, setMode] = useState<AppMode>("BUSINESS");

  // Listen for mode changes broadcast from TopBar
  useEffect(() => {
    const handler = (e: Event) => {
      setMode((e as CustomEvent<AppMode>).detail);
    };
    window.addEventListener("tdw-mode-change", handler);
    return () => window.removeEventListener("tdw-mode-change", handler);
  }, []);

  const tabs = mode === "BUSINESS" ? BUSINESS_TABS : DISCOVERY_TABS;

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: "#0C0A09",
        paddingBottom: "env(safe-area-inset-bottom)",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "space-around",
        height: "64px",
        boxSizing: "content-box",
      }}
    >
      {tabs.map(({ label, Icon, href }) => {
        const isActive =
          pathname === href || pathname?.startsWith(href + "/");

        return (
          <button
            key={label}
            onClick={() => router.push(href)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0",
              position: "relative",
              transition: "opacity 180ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            aria-label={label}
          >
            {/* Active indicator — gold line above tab */}
            <span
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "24px",
                height: "2px",
                borderRadius: "1px",
                backgroundColor: isActive ? "#C9A84C" : "transparent",
                transition: "background-color 180ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />

            <Icon
              size={20}
              strokeWidth={1.5}
              color={isActive ? "#C9A84C" : "#8C8480"}
              style={{ transition: "color 180ms cubic-bezier(0.22, 1, 0.36, 1)" }}
            />

            <span
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "9px",
                fontWeight: 300,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: isActive ? "#C9A84C" : "#8C8480",
                marginTop: "2px",
                lineHeight: 1,
                transition: "color 180ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
