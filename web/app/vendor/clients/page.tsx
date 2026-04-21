"use client";

import { useState } from "react";
import { Search, Users } from "lucide-react";
import ClientCard, { ClientStatus } from "../components/ClientCard";

const ALL_CLIENTS = [
  {
    id: "1",
    names: "Rohan & Priya Sharma",
    weddingDate: "2025-12-14",
    totalAmount: 240000,
    paidPercent: 60,
    status: "ACTIVE" as ClientStatus,
  },
  {
    id: "2",
    names: "Aditya & Rhea Kapoor",
    weddingDate: "2026-02-08",
    totalAmount: 180000,
    paidPercent: 25,
    status: "UPCOMING" as ClientStatus,
  },
  {
    id: "3",
    names: "Karan & Simran Mehta",
    weddingDate: "2025-11-02",
    totalAmount: 320000,
    paidPercent: 100,
    status: "DELIVERED" as ClientStatus,
  },
  {
    id: "4",
    names: "Arjun & Nisha Patel",
    weddingDate: "2026-03-22",
    totalAmount: 280000,
    paidPercent: 0,
    status: "UPCOMING" as ClientStatus,
  },
  {
    id: "5",
    names: "Vikram & Anjali Singh",
    weddingDate: "2025-09-18",
    totalAmount: 150000,
    paidPercent: 100,
    status: "ARCHIVED" as ClientStatus,
  },
];

type Filter = "ALL" | ClientStatus;
const FILTERS: Filter[] = ["ALL", "ACTIVE", "UPCOMING", "DELIVERED", "ARCHIVED"];

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("ALL");

  const filtered = ALL_CLIENTS.filter((c) => {
    const matchesSearch = c.names.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === "ALL" || c.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div
      style={{
        padding: "24px 20px",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
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
          Your Clients
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
          All Clients
        </h1>
      </div>

      {/* Search bar */}
      <div
        style={{
          position: "relative",
          marginBottom: "14px",
        }}
      >
        <Search
          size={16}
          color="#8C8480"
          strokeWidth={1.5}
          style={{
            position: "absolute",
            left: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or date"
          style={{
            width: "100%",
            height: "48px",
            backgroundColor: "#F4F1EC",
            border: "1px solid #E2DED8",
            borderRadius: "12px",
            paddingLeft: "42px",
            paddingRight: "16px",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            fontWeight: 300,
            color: "#0C0A09",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Filter chips */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "4px",
          marginBottom: "20px",
          scrollbarWidth: "none",
        }}
      >
        {FILTERS.map((f) => {
          const isActive = f === activeFilter;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "10px",
                fontWeight: 300,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                padding: "8px 14px",
                borderRadius: "999px",
                border: isActive ? "none" : "1px solid #E2DED8",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                backgroundColor: isActive ? "#0C0A09" : "#F4F1EC",
                color: isActive ? "#F8F7F5" : "#8C8480",
                transition: "all 0.15s ease",
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Client list */}
      {filtered.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map((c) => (
            <ClientCard key={c.id} {...c} />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: "60px",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "rgba(201,168,76,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Users size={22} color="#C9A84C" strokeWidth={1.5} />
          </div>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "15px",
              fontWeight: 300,
              color: "#8C8480",
              margin: 0,
              textAlign: "center",
            }}
          >
            Your clients will appear here.
          </p>
          <button
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "10px",
              fontWeight: 400,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#C9A84C",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 0",
            }}
          >
            Log First Client →
          </button>
        </div>
      )}
    </div>
  );
}
