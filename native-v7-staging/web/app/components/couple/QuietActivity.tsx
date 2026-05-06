'use client';

import React, { useEffect, useState } from 'react';

interface ActivityItem {
  id: string;
  text: string;
  timestamp: string; // ISO
}

interface QuietActivityProps {
  activity?: ActivityItem[];
  loading?: boolean;
}

function formatTs(ts: string): string {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg,#E8E4DE 25%,#F4F1EC 50%,#E8E4DE 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 4,
};

export default function QuietActivity({ activity = [], loading = false }: QuietActivityProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 300); return () => clearTimeout(t); }, []);

  return (
    <>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <div style={{ padding: '32px 24px 0' }}>
        {/* Eyebrow */}
        <p style={{
          fontFamily: "'Jost', sans-serif",
          fontSize: 9,
          fontWeight: 300,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: '#8C8480',
          margin: '0 0 6px',
        }}>RECENT</p>

        {/* Title */}
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 28,
          fontWeight: 300,
          letterSpacing: '-0.01em',
          color: '#0C0A09',
          margin: '0 0 20px',
        }}>Your journey</h2>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: 18, width: `${70 + (i % 3) * 10}%`, ...shimmerStyle }} />
            ))}
          </div>
        ) : activity.length === 0 ? (
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 15,
            fontWeight: 300,
            color: '#8C8480',
            textAlign: 'center',
            lineHeight: 1.6,
            margin: 0,
            padding: '24px 0',
          }}>Your story starts here. Every action you take will appear in your journey.</p>
        ) : (
          <div style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 400ms cubic-bezier(0.22,1,0.36,1)',
          }}>
            {activity.slice(0, 10).map((item, i) => (
              <div key={item.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
                padding: '14px 0',
                borderBottom: i < activity.slice(0, 10).length - 1 ? '1px solid #E8E4DE' : 'none',
              }}>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 15,
                  fontWeight: 300,
                  color: '#3C3835',
                  margin: 0,
                  lineHeight: 1.5,
                  flex: 1,
                }}>{item.text}</p>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 300,
                  color: '#8C8480',
                  flexShrink: 0,
                  marginTop: 2,
                }}>{formatTs(item.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
