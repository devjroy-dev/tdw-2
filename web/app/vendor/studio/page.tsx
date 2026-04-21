"use client";

import { useRouter } from "next/navigation";
import {
  Calendar,
  Users,
  BarChart2,
  Megaphone,
  Gift,
  FileText,
  ChevronRight,
} from "lucide-react";

const TOOLS = [
  { Icon: Calendar,  title: "Calendar",   subtitle: "Your shoots & events",    href: "/vendor/studio/calendar"   },
  { Icon: Users,     title: "Team",       subtitle: "Manage your team",        href: "/vendor/studio/team"       },
  { Icon: BarChart2, title: "Analytics",  subtitle: "Views, saves, enquiries", href: "/vendor/studio/analytics"  },
  { Icon: Megaphone, title: "Broadcast",  subtitle: "Message all clients",     href: "/vendor/studio/broadcast"  },
  { Icon: Gift,      title: "Referrals",  subtitle: "Earn from referrals",     href: "/vendor/studio/referrals"  },
  { Icon: FileText,  title: "Contracts",  subtitle: "Templates & signed docs", href: "/vendor/studio/contracts"  },
];

export default function StudioPage() {
  const router = useRouter();

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", paddingBottom: "32px" }}>

      {/* Page header */}
      <div style={{ padding: "32px 24px 16px" }}>
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "10px",
            fontWeight: 200,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#8C8480",
            margin: "0 0 8px",
          }}
        >
          YOUR STUDIO
        </p>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "28px",
            fontWeight: 300,
            color: "#0C0A09",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Studio
        </h1>
      </div>

      {/* 6-card grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          padding: "0 24px",
        }}
      >
        {TOOLS.map(({ Icon, title, subtitle, href }) => (
          <button
            key={title}
            onClick={() => router.push(href)}
            style={{
              background: "#F4F1EC",
              borderRadius: "16px",
              padding: "24px 20px",
              border: "1px solid #E2DED8",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              transition: "opacity 180ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <Icon size={24} strokeWidth={1.5} color="#C9A84C" />
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "18px",
                fontWeight: 300,
                color: "#0C0A09",
                margin: "16px 0 0",
                lineHeight: 1.2,
              }}
            >
              {title}
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                fontWeight: 300,
                color: "#8C8480",
                margin: "4px 0 0",
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </p>
          </button>
        ))}
      </div>

      {/* Discovery Preview — dark card */}
      <div style={{ padding: "24px 24px 0" }}>
        <button
          onClick={() => router.push("/vendor/studio/discovery-preview")}
          style={{
            width: "100%",
            background: "#0C0A09",
            borderRadius: "16px",
            padding: "24px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxSizing: "border-box",
            transition: "opacity 180ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <p
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "10px",
                fontWeight: 200,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "#8C8480",
                margin: "0 0 6px",
              }}
            >
              DISCOVERY
            </p>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "20px",
                fontWeight: 300,
                color: "#F8F7F5",
                margin: "0 0 6px",
                lineHeight: 1.2,
              }}
            >
              See your profile
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                fontWeight: 300,
                color: "#8C8480",
                margin: 0,
              }}
            >
              Exactly how couples experience you.
            </p>
          </div>
          <ChevronRight size={20} strokeWidth={1.5} color="#C9A84C" />
        </button>
      </div>

    </div>
  );
}
