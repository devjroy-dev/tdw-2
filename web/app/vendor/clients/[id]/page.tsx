"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, Instagram, ChevronLeft } from "lucide-react";

const CLIENT_DATA = {
  "1": {
    id: "1",
    names: "Rohan & Priya Sharma",
    weddingDate: "14 December 2025",
    status: "ACTIVE",
    phone: "+91 98100 00001",
    email: "rohansharma@gmail.com",
    instagram: "@priyasharmabridal",
    events: [
      { name: "Ceremony", date: "Dec 14 2025", type: "Wedding" },
      { name: "Pre-Wedding Shoot", date: "Dec 10 2025", type: "Shoot" },
    ],
    invoices: [
      { milestone: "Advance", amount: 80000, status: "PAID" },
      { milestone: "Pre-Wedding", amount: 60000, status: "PAID" },
      { milestone: "Final", amount: 100000, status: "PENDING" },
    ],
  },
};

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  ACTIVE: { backgroundColor: "#C9A84C", color: "#0C0A09" },
  UPCOMING: { backgroundColor: "transparent", color: "#FAFAF8", border: "1px solid #3C3835" },
  DELIVERED: { backgroundColor: "#2E7D32", color: "#FAFAF8" },
  ARCHIVED: { backgroundColor: "#2C2A28", color: "#8C8480" },
};

const INVOICE_STATUS_STYLE: Record<string, React.CSSProperties> = {
  PAID: { color: "#2E7D32", backgroundColor: "#E8F5E9" },
  PENDING: { color: "#C9A84C", backgroundColor: "rgba(201,168,76,0.1)" },
  OVERDUE: { color: "#B71C1C", backgroundColor: "#FFEBEE" },
};

function formatAmount(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export default function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  const client = CLIENT_DATA[params.id as keyof typeof CLIENT_DATA] || CLIENT_DATA["1"];

  const handleNoteChange = (val: string) => {
    setNotes(val);
    setSaved(false);
    const t = setTimeout(() => setSaved(true), 800);
    return () => clearTimeout(t);
  };

  return (
    <div style={{ backgroundColor: "#FAFAF8", minHeight: "100vh" }}>
      {/* Back button */}
      <div style={{ padding: "16px 20px 0" }}>
        <button
          onClick={() => router.push("/vendor/clients")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <ChevronLeft size={14} color="#C9A84C" strokeWidth={2} />
          <span
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "13px",
              fontWeight: 300,
              color: "#C9A84C",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Clients
          </span>
        </button>
      </div>

      {/* Hero */}
      <div
        style={{
          backgroundColor: "#0C0A09",
          padding: "32px 24px 40px",
          marginTop: "16px",
        }}
      >
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "32px",
            fontWeight: 300,
            color: "#FAFAF8",
            margin: "0 0 12px",
            lineHeight: 1.15,
          }}
        >
          {client.names}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "11px",
              fontWeight: 200,
              color: "#8C8480",
              letterSpacing: "0.1em",
            }}
          >
            {client.weddingDate}
          </span>
          <span
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "9px",
              fontWeight: 300,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              padding: "3px 10px",
              borderRadius: "999px",
              ...STATUS_STYLE[client.status],
            }}
          >
            {client.status}
          </span>
        </div>
      </div>

      {/* Sections */}
      <div style={{ padding: "24px 20px", maxWidth: "480px", margin: "0 auto" }}>

        {/* CONTACT */}
        <Section title="CONTACT">
          <ContactRow icon={<Phone size={16} color="#8C8480" strokeWidth={1.5} />} label={client.phone} />
          <ContactRow icon={<Mail size={16} color="#8C8480" strokeWidth={1.5} />} label={client.email} />
          <ContactRow icon={<Instagram size={16} color="#8C8480" strokeWidth={1.5} />} label={client.instagram} />
          <button
            style={{
              marginTop: "14px",
              width: "100%",
              padding: "14px",
              backgroundColor: "#C9A84C",
              border: "none",
              borderRadius: "10px",
              fontFamily: "'Jost', sans-serif",
              fontSize: "10px",
              fontWeight: 400,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#0C0A09",
              cursor: "pointer",
            }}
          >
            Open WhatsApp →
          </button>
        </Section>

        {/* EVENTS */}
        <Section title="EVENTS">
          {client.events.map((ev, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: i < client.events.length - 1 ? "1px solid #E8E4DE" : "none",
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "14px",
                    fontWeight: 400,
                    color: "#0C0A09",
                    margin: "0 0 2px",
                  }}
                >
                  {ev.name}
                </p>
                <p
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: "11px",
                    fontWeight: 200,
                    color: "#8C8480",
                    margin: 0,
                    letterSpacing: "0.05em",
                  }}
                >
                  {ev.date}
                </p>
              </div>
              <span
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: "9px",
                  fontWeight: 300,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  padding: "3px 10px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(201,168,76,0.1)",
                  color: "#C9A84C",
                }}
              >
                {ev.type}
              </span>
            </div>
          ))}
        </Section>

        {/* INVOICES */}
        <Section title="INVOICES">
          {client.invoices.map((inv, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: i < client.invoices.length - 1 ? "1px solid #E8E4DE" : "none",
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "14px",
                    fontWeight: 400,
                    color: "#0C0A09",
                    margin: "0 0 2px",
                  }}
                >
                  {inv.milestone}
                </p>
                <p
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: "12px",
                    fontWeight: 300,
                    color: "#3C3835",
                    margin: 0,
                  }}
                >
                  {formatAmount(inv.amount)}
                </p>
              </div>
              <span
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: "9px",
                  fontWeight: 300,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  ...INVOICE_STATUS_STYLE[inv.status],
                }}
              >
                {inv.status}
              </span>
            </div>
          ))}
          <button
            style={{
              marginTop: "14px",
              width: "100%",
              padding: "14px",
              backgroundColor: "transparent",
              border: "1px solid #C9A84C",
              borderRadius: "10px",
              fontFamily: "'Jost', sans-serif",
              fontSize: "10px",
              fontWeight: 400,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#C9A84C",
              cursor: "pointer",
            }}
          >
            Create Invoice →
          </button>
        </Section>

        {/* NOTES */}
        <Section title="NOTES">
          <textarea
            value={notes}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder="Private notes about this client..."
            style={{
              width: "100%",
              minHeight: "120px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              fontWeight: 300,
              color: "#0C0A09",
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              lineHeight: 1.6,
              boxSizing: "border-box",
            }}
          />
          {saved && (
            <p
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "11px",
                fontWeight: 200,
                color: "#8C8480",
                margin: "4px 0 0",
                letterSpacing: "0.1em",
              }}
            >
              Saved
            </p>
          )}
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <p
        style={{
          fontFamily: "'Jost', sans-serif",
          fontSize: "10px",
          fontWeight: 200,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: "#8C8480",
          margin: "0 0 10px",
        }}
      >
        {title}
      </p>
      <div
        style={{
          backgroundColor: "#F4F1EC",
          borderRadius: "16px",
          padding: "16px 20px",
          border: "1px solid #E8E4DE",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ContactRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 0",
        borderBottom: "1px solid #E8E4DE",
      }}
    >
      {icon}
      <span
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "14px",
          fontWeight: 300,
          color: "#3C3835",
        }}
      >
        {label}
      </span>
    </div>
  );
}
