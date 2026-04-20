"use client";

import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";

export type ClientStatus = "ACTIVE" | "UPCOMING" | "DELIVERED" | "ARCHIVED";

export interface ClientCardProps {
  id: string;
  names: string;
  weddingDate: string; // ISO string e.g. "2025-12-14"
  totalAmount: number;
  paidPercent: number;
  status: ClientStatus;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatAmount(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

const STATUS_STYLE: Record<ClientStatus, React.CSSProperties> = {
  ACTIVE: {
    backgroundColor: "#C9A84C",
    color: "#0C0A09",
  },
  UPCOMING: {
    backgroundColor: "transparent",
    color: "#3C3835",
    border: "1px solid #E8E4DE",
  },
  DELIVERED: {
    backgroundColor: "#E8F5E9",
    color: "#1B5E20",
  },
  ARCHIVED: {
    backgroundColor: "#F4F1EC",
    color: "#8C8480",
    border: "1px solid #E8E4DE",
  },
};

export default function ClientCard({
  id,
  names,
  weddingDate,
  totalAmount,
  paidPercent,
  status,
}: ClientCardProps) {
  const router = useRouter();
  const paidAmount = Math.round((paidPercent / 100) * totalAmount);

  return (
    <div
      onClick={() => router.push(`/vendor/clients/${id}`)}
      style={{
        backgroundColor: "#F4F1EC",
        borderRadius: "16px",
        padding: "20px",
        border: "1px solid #E8E4DE",
        cursor: "pointer",
        transition: "opacity 0.15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      {/* Row 1: Names + Status */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "10px",
          gap: "12px",
        }}
      >
        <span
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "20px",
            fontWeight: 300,
            color: "#0C0A09",
            lineHeight: 1.2,
          }}
        >
          {names}
        </span>
        <span
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "9px",
            fontWeight: 300,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: "999px",
            whiteSpace: "nowrap",
            flexShrink: 0,
            ...STATUS_STYLE[status],
          }}
        >
          {status}
        </span>
      </div>

      {/* Row 2: Wedding date */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "14px",
        }}
      >
        <Calendar size={12} color="#8C8480" strokeWidth={1.5} />
        <span
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "11px",
            fontWeight: 200,
            color: "#8C8480",
            letterSpacing: "0.05em",
          }}
        >
          {formatDate(weddingDate)}
        </span>
      </div>

      {/* Row 3: Payment */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "6px",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              fontWeight: 300,
              color: "#8C8480",
            }}
          >
            {formatAmount(paidAmount)} of {formatAmount(totalAmount)}
          </span>
          <span
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "13px",
              fontWeight: 400,
              color: "#C9A84C",
            }}
          >
            {paidPercent}%
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: "100%",
            height: "4px",
            borderRadius: "2px",
            backgroundColor: "#E8E4DE",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${paidPercent}%`,
              backgroundColor: "#C9A84C",
              borderRadius: "2px",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}
