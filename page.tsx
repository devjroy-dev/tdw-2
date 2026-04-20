"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import AttentionCard from "../components/AttentionCard";

const MOCK_CARDS = [
  {
    id: "1",
    priority: "high" as const,
    title: "3 enquiries unanswered",
    subtitle: "Sharma Wedding · Kapoor Events · Singh Reception",
    cta: "Reply now",
  },
  {
    id: "2",
    priority: "medium" as const,
    title: "Shoot tomorrow at 10 AM",
    subtitle: "Priya & Arjun — Mehendi · Sector 18, Noida",
    cta: "View details",
  },
  {
    id: "3",
    priority: "low" as const,
    title: "Pricing package incomplete",
    subtitle: "Add at least one package to appear in Discover",
    cta: "Complete profile",
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function TodayPage() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = MOCK_CARDS.filter((c) => !dismissed.has(c.id));

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  return (
    <div
      style={{
        padding: "24px 20px 32px",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      {/* Greeting */}
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "22px",
            fontWeight: 600,
            color: "#1A1A1A",
            margin: "0 0 4px",
            letterSpacing: "0.01em",
          }}
        >
          {getGreeting()}
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            color: "#999999",
            margin: 0,
          }}
        >
          {formatDate()}
        </p>
      </div>

      {/* AttentionCard stack */}
      {visible.length > 0 ? (
        <div>
          {visible.slice(0, 3).map((card) => (
            <AttentionCard
              key={card.id}
              priority={card.priority}
              title={card.title}
              subtitle={card.subtitle}
              cta={card.cta}
              onDismiss={() => dismiss(card.id)}
              onAction={() => console.log("action:", card.id)}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: "64px",
            gap: "12px",
          }}
        >
          <CheckCircle
            size={36}
            color="#C9A84C"
            strokeWidth={1.4}
          />
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic",
              fontSize: "16px",
              color: "#AAAAAA",
              margin: 0,
              textAlign: "center",
            }}
          >
            You're all caught up
          </p>
        </div>
      )}
    </div>
  );
}
