"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, MessageSquare, Calendar, Users, Grid } from "lucide-react";

const TABS = [
  { label: "Today", icon: Home, href: "/vendor/today" },
  { label: "Inquiries", icon: MessageSquare, href: "/vendor/inquiries" },
  { label: "Calendar", icon: Calendar, href: "/vendor/calendar" },
  { label: "Clients", icon: Users, href: "/vendor/clients" },
  { label: "Suite", icon: Grid, href: "/vendor/suite" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "8px 0 12px",
        backgroundColor: "#FAF6F0",
        borderTop: "1px solid #E8E0D5",
        position: "sticky",
        bottom: 0,
        zIndex: 100,
      }}
    >
      {TABS.map(({ label, icon: Icon, href }) => {
        const isActive = pathname === href || pathname?.startsWith(href + "/");
        return (
          <button
            key={label}
            onClick={() => router.push(href)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 12px",
              transition: "opacity 0.15s ease",
            }}
            aria-label={label}
          >
            <Icon
              size={22}
              color={isActive ? "#C9A84C" : "#999999"}
              strokeWidth={isActive ? 2 : 1.6}
            />
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                fontWeight: isActive ? 500 : 400,
                color: isActive ? "#C9A84C" : "#999999",
                letterSpacing: "0.01em",
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
