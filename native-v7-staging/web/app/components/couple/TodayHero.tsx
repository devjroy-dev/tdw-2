'use client';

import React, { useEffect, useState } from 'react';

interface TodayHeroProps {
  weddingDate?: string | null; // ISO date string
  eventLabel?: string;
  loading?: boolean;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
}

function numberToWords(n: number): string {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  if (n === 0) return 'today';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) {
    const rem = n % 100;
    return ones[Math.floor(n / 100)] + ' hundred' + (rem ? ' ' + numberToWords(rem) : '');
  }
  return n.toString();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const SHIMMER = (
  <div style={{ padding: '0 24px', paddingTop: 24 }}>
    <div style={{ height: 12, width: 80, background: 'linear-gradient(90deg,#E8E4DE 25%,#F4F1EC 50%,#E8E4DE 75%)', backgroundSize: '200% 100%', borderRadius: 4, marginBottom: 16, animation: 'shimmer 1.4s infinite' }} />
    <div style={{ height: 52, width: '80%', background: 'linear-gradient(90deg,#E8E4DE 25%,#F4F1EC 50%,#E8E4DE 75%)', backgroundSize: '200% 100%', borderRadius: 6, marginBottom: 12, animation: 'shimmer 1.4s infinite' }} />
    <div style={{ height: 20, width: '50%', background: 'linear-gradient(90deg,#E8E4DE 25%,#F4F1EC 50%,#E8E4DE 75%)', backgroundSize: '200% 100%', borderRadius: 4, animation: 'shimmer 1.4s infinite' }} />
  </div>
);

export default function TodayHero({ weddingDate, eventLabel = 'wedding', loading = false }: TodayHeroProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t); }, []);

  if (loading) return (
    <>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      {SHIMMER}
    </>
  );

  // Fallback: 143 days
  const fallbackDays = 143;
  const days = weddingDate ? daysUntil(weddingDate) : fallbackDays;
  const headline = capitalize(numberToWords(days)) + (days === 1 ? ' day' : ' days');

  // Progress dots: 7 dots, fill proportional to days elapsed out of 365
  const totalDays = 365;
  const elapsed = Math.max(0, totalDays - days);
  const filledDots = Math.min(7, Math.round((elapsed / totalDays) * 7));

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes heroIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-enter { animation: heroIn 400ms cubic-bezier(0.22,1,0.36,1) forwards; }
      `}</style>
      <div
        className={visible ? 'hero-enter' : ''}
        style={{ opacity: visible ? undefined : 0, padding: '24px 24px 32px' }}
      >
        {/* Eyebrow */}
        <p style={{
          fontFamily: "'Jost', sans-serif",
          fontSize: 9,
          fontWeight: 300,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: '#8C8480',
          margin: '0 0 12px',
        }}>YOUR WEDDING</p>

        {/* Countdown headline */}
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 48,
          fontWeight: 300,
          letterSpacing: '-0.02em',
          color: '#0C0A09',
          lineHeight: 1.05,
          margin: '0 0 10px',
        }}>{headline}</h1>

        {/* Subtext */}
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 15,
          fontWeight: 300,
          color: '#8C8480',
          margin: '0 0 24px',
        }}>to your {eventLabel}</p>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: i < filledDots ? '#C9A84C' : '#E8E4DE',
              transition: 'background 280ms cubic-bezier(0.22,1,0.36,1)',
            }} />
          ))}
        </div>
      </div>
    </>
  );
}
