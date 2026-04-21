"use client";

import { useRouter } from "next/navigation";

// ─── Circular progress ring ───────────────────────────────────────────────────
function ProfileRing({ percent }: { percent: number }) {
  const r = 30;
  const circumference = 2 * Math.PI * r;
  const filled = circumference * (percent / 100);

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle
        cx="36" cy="36" r={r}
        fill="none"
        stroke="#E2DED8"
        strokeWidth="5"
      />
      {/* Fill */}
      <circle
        cx="36" cy="36" r={r}
        fill="none"
        stroke="#C9A84C"
        strokeWidth="5"
        strokeDasharray={`${filled} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
      {/* Centre label */}
      <text
        x="36" y="36"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Jost', sans-serif"
        fontSize="14"
        fontWeight="400"
        fill="#0C0A09"
      >
        {percent}%
      </text>
    </svg>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string | number;
  delta: string;
}) {
  return (
    <div
      style={{
        background: "#0C0A09",
        borderRadius: "12px",
        padding: "16px",
        border: "1px solid #E2DED8",
      }}
    >
      <p
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "28px",
          fontWeight: 300,
          color: "#F8F7F5",
          margin: "0 0 4px",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontFamily: "'Jost', sans-serif",
          fontSize: "9px",
          fontWeight: 200,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#8C8480",
          margin: "0 0 6px",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "11px",
          fontWeight: 300,
          color: "#4CAF50",
          margin: 0,
        }}
      >
        {delta}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DiscoveryDashPage() {
  const router = useRouter();

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", paddingBottom: "32px" }}>

      {/* Page header */}
      <div style={{ padding: "32px 24px 24px" }}>
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
          YOUR DISCOVERY
        </p>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "28px",
            fontWeight: 300,
            color: "#F8F7F5",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Discover Dash
        </h1>
      </div>

      {/* Profile completion ring */}
      <div style={{ padding: "0 24px 24px" }}>
        <div
          style={{
            background: "#0C0A09",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid #E2DED8",
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <ProfileRing percent={65} />
          <div>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "18px",
                fontWeight: 300,
                color: "#F8F7F5",
                margin: "0 0 6px",
                lineHeight: 1.2,
              }}
            >
              Profile strength
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                fontWeight: 300,
                color: "#8C8480",
                margin: "0 0 10px",
                lineHeight: 1.5,
              }}
            >
              Add pricing to reach more couples.
            </p>
            <button
              onClick={() => router.push("/vendor/studio")}
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "10px",
                fontWeight: 400,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#C9A84C",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              COMPLETE PROFILE →
            </button>
          </div>
        </div>
      </div>

      {/* 7-day analytics */}
      <div style={{ padding: "0 24px 24px" }}>
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "10px",
            fontWeight: 200,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#8C8480",
            margin: "0 0 12px",
          }}
        >
          THIS WEEK
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <StatCard label="Profile Views" value={89}  delta="+12 vs last week" />
          <StatCard label="Saves"         value={12}  delta="+3 vs last week"  />
          <StatCard label="Enquiries"     value={3}   delta="+1 vs last week"  />
          <StatCard label="Lock Intent"   value={1}   delta="new this week"    />
        </div>
      </div>

      {/* Discovery Preview CTA — dark card */}
      <div style={{ padding: "0 24px 24px" }}>
        <button
          onClick={() => router.push("/vendor/studio/discovery-preview")}
          style={{
            width: "100%",
            background: "#0C0A09",
            borderRadius: "16px",
            padding: "20px 24px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxSizing: "border-box",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "16px",
                fontWeight: 300,
                color: "#F8F7F5",
                margin: "0 0 4px",
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
              Exactly how couples see you
            </p>
          </div>
          <span
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "10px",
              fontWeight: 400,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#C9A84C",
              whiteSpace: "nowrap",
              marginLeft: "16px",
            }}
          >
            PREVIEW →
          </span>
        </button>
      </div>

      {/* Trial status banner */}
      <div style={{ padding: "0 24px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, rgba(201,168,76,0.13), rgba(201,168,76,0.07))",
            border: "1px solid rgba(201,168,76,0.27)",
            borderRadius: "12px",
            padding: "16px 20px",
          }}
        >
          <p
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "10px",
              fontWeight: 200,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#C9A84C",
              margin: "0 0 6px",
            }}
          >
            FOUNDING VENDOR
          </p>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              fontWeight: 300,
              color: "#F8F7F5",
              margin: "0 0 4px",
              lineHeight: 1.5,
            }}
          >
            Signature free until 1 August 2026.
          </p>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              fontWeight: 300,
              color: "#8C8480",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            After that, ₹1,999/month or Essential free.
          </p>
        </div>
      </div>

    </div>
  );
}
