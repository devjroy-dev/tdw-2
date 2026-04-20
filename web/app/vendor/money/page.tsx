"use client";

import { useState } from "react";
import { Plus, CircleDollarSign } from "lucide-react";

type SubTab = "INVOICES" | "EXPENSES" | "TAX" | "PAYMENTS" | "SHIELD";
type InvoiceFilter = "ALL" | "PAID" | "PENDING" | "OVERDUE";

const SUB_TABS: SubTab[] = ["INVOICES", "EXPENSES", "TAX", "PAYMENTS", "SHIELD"];

const INVOICES = [
  {
    id: 1,
    client: "Rohan & Priya Sharma",
    description: "Photography Package",
    amount: "₹2,40,000",
    status: "PAID" as const,
    date: "Dec 14, 2025",
    paidRatio: 1,
  },
  {
    id: 2,
    client: "Aditya & Rhea Kapoor",
    description: "Advance Invoice",
    amount: "₹45,000",
    status: "PAID" as const,
    date: "Jan 15, 2026",
    paidRatio: 1,
  },
  {
    id: 3,
    client: "Karan & Simran Mehta",
    description: "Final Invoice",
    amount: "₹1,00,000",
    status: "PENDING" as const,
    date: "Feb 28, 2026",
    paidRatio: 0,
  },
  {
    id: 4,
    client: "Arjun & Nisha Patel",
    description: "Booking Advance",
    amount: "₹56,000",
    status: "OVERDUE" as const,
    date: "Mar 1, 2026",
    paidRatio: 0,
  },
];

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  PAID:    { bg: "rgba(34,197,94,0.12)",  color: "#16A34A", label: "Paid"    },
  PENDING: { bg: "rgba(201,168,76,0.15)", color: "#C9A84C", label: "Pending" },
  OVERDUE: { bg: "rgba(239,68,68,0.12)",  color: "#DC2626", label: "Overdue" },
};

function EmptyState({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: "80px",
        gap: "16px",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          border: "1.5px solid #C9A84C",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircleDollarSign size={22} color="#C9A84C" strokeWidth={1.5} />
      </div>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "15px",
          fontWeight: 300,
          color: "#8C8480",
          textAlign: "center",
          margin: 0,
          maxWidth: "240px",
          lineHeight: 1.5,
        }}
      >
        Coming soon. Your {label} will appear here.
      </p>
    </div>
  );
}

export default function MoneyPage() {
  const [subTab, setSubTab]     = useState<SubTab>("INVOICES");
  const [filter, setFilter]     = useState<InvoiceFilter>("ALL");

  const filtered =
    filter === "ALL"
      ? INVOICES
      : INVOICES.filter((inv) => inv.status === filter);

  return (
    <div
      style={{
        backgroundColor: "#FAFAF8",
        minHeight: "100vh",
        paddingTop: "56px",
        paddingBottom: "calc(64px + env(safe-area-inset-bottom) + 16px)",
      }}
    >
      {/* ── Hero Strip ── */}
      <div
        style={{
          backgroundColor: "#0C0A09",
          padding: "32px 24px",
          display: "flex",
          alignItems: "stretch",
          justifyContent: "space-between",
        }}
      >
        {[
          { label: "THIS MONTH", value: "₹3,20,000", gold: false },
          { label: "PENDING",    value: "₹1,80,000", gold: false },
          { label: "OVERDUE",    value: "₹45,000",   gold: true  },
        ].map(({ label, value, gold }, i) => (
          <div
            key={label}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              alignItems: "center",
              textAlign: "center",
              borderLeft:
                i > 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
              paddingLeft: i > 0 ? "16px" : 0,
              paddingRight: i < 2 ? "16px" : 0,
            }}
          >
            <span
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "9px",
                fontWeight: 200,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#8C8480",
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "28px",
                fontWeight: 300,
                color: gold ? "#C9A84C" : "#FAFAF8",
                lineHeight: 1,
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Sub-nav ── */}
      <div
        style={{
          position: "sticky",
          top: "56px",
          zIndex: 40,
          backgroundColor: "#FAFAF8",
          borderBottom: "1px solid #E8E4DE",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 24px",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {SUB_TABS.map((t) => {
          const active = subTab === t;
          return (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "10px",
                fontWeight: 300,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                padding: "6px 14px",
                borderRadius: "20px",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                background: active ? "#0C0A09" : "#F4F1EC",
                color:      active ? "#FAFAF8" : "#8C8480",
                transition: "all 180ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* ── Tab body ── */}
      {subTab === "INVOICES" ? (
        <div style={{ padding: "0 16px" }}>
          {/* Filter row */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              padding: "20px 0 16px",
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            {(["ALL", "PAID", "PENDING", "OVERDUE"] as InvoiceFilter[]).map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: "10px",
                    fontWeight: 300,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    background: active ? "#0C0A09" : "#F4F1EC",
                    color:      active ? "#FAFAF8" : "#8C8480",
                    transition: "all 180ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>

          {/* Invoice cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.map((inv) => {
              const pill = STATUS_PILL[inv.status];
              return (
                <div
                  key={inv.id}
                  style={{
                    backgroundColor: "#F4F1EC",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                >
                  {/* Row 1: name + status */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: "18px",
                        fontWeight: 300,
                        color: "#0C0A09",
                        lineHeight: 1.2,
                      }}
                    >
                      {inv.client}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Jost', sans-serif",
                        fontSize: "9px",
                        fontWeight: 300,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        background: pill.bg,
                        color: pill.color,
                        borderRadius: "20px",
                        padding: "4px 10px",
                        flexShrink: 0,
                        marginLeft: "8px",
                      }}
                    >
                      {pill.label}
                    </span>
                  </div>

                  {/* Row 2: description */}
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "13px",
                      fontWeight: 300,
                      color: "#8C8480",
                    }}
                  >
                    {inv.description}
                  </span>

                  {/* Row 3: amount + date */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Jost', sans-serif",
                        fontSize: "16px",
                        fontWeight: 400,
                        color: "#0C0A09",
                      }}
                    >
                      {inv.amount}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Jost', sans-serif",
                        fontSize: "12px",
                        fontWeight: 200,
                        color: "#8C8480",
                      }}
                    >
                      {inv.date}
                    </span>
                  </div>

                  {/* Gold progress bar if partially paid */}
                  {inv.paidRatio > 0 && inv.paidRatio < 1 && (
                    <div
                      style={{
                        marginTop: "8px",
                        height: "2px",
                        borderRadius: "1px",
                        backgroundColor: "#E8E4DE",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${inv.paidRatio * 100}%`,
                          backgroundColor: "#C9A84C",
                          borderRadius: "1px",
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          label={
            subTab === "EXPENSES"
              ? "expenses"
              : subTab === "TAX"
              ? "tax"
              : subTab === "PAYMENTS"
              ? "payments"
              : "shield"
          }
        />
      )}

      {/* Floating CTA */}
      <button
        aria-label="Create invoice"
        style={{
          position: "fixed",
          bottom: "calc(64px + env(safe-area-inset-bottom) + 16px)",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "#C9A84C",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 90,
          boxShadow: "0 4px 20px rgba(201,168,76,0.35)",
        }}
      >
        <Plus size={22} color="#0C0A09" strokeWidth={2} />
      </button>
    </div>
  );
}
