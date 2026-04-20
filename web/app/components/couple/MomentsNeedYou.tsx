'use client';

import React, { useEffect, useState } from 'react';

interface Nudge {
  id: string;
  title: string;
  context: string;
  cta: string;
  vendor_name?: string;
}

interface MomentsNeedYouProps {
  nudges?: Nudge[];
  loading?: boolean;
}

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg,#E8E4DE 25%,#F4F1EC 50%,#E8E4DE 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 8,
};

function SkeletonCards() {
  return (
    <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[0, 1].map(i => (
        <div key={i} style={{ height: 120, borderRadius: 16, ...shimmerStyle }} />
      ))}
    </div>
  );
}

export default function MomentsNeedYou({ nudges = [], loading = false }: MomentsNeedYouProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 120); return () => clearTimeout(t); }, []);

  const capped = nudges.slice(0, 3);

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes cardIn {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .moment-card { animation: cardIn 400ms cubic-bezier(0.22,1,0.36,1) both; }
        .cta-btn {
          display: inline-block;
          padding: 8px 20px;
          border: 1px solid #C9A84C;
          border-radius: 100px;
          color: #C9A84C;
          background: transparent;
          font-family: 'Jost', sans-serif;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 180ms cubic-bezier(0.22,1,0.36,1), color 180ms;
          margin-top: 16px;
        }
        .cta-btn:hover { background: #C9A84C; color: #0C0A09; }
      `}</style>
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
        }}>NEEDS YOUR ATTENTION</p>

        {/* Title */}
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 28,
          fontWeight: 300,
          letterSpacing: '-0.01em',
          color: '#0C0A09',
          margin: '0 0 20px',
        }}>Three moments</h2>

        {loading ? <SkeletonCards /> : capped.length === 0 ? (
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 15,
            fontWeight: 300,
            color: '#8C8480',
            textAlign: 'center',
            padding: '32px 0',
            lineHeight: 1.6,
          }}>Your journey is on track.<br />Quiet days are part of the plan.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {capped.map((nudge, i) => (
              <div
                key={nudge.id}
                className={visible ? 'moment-card' : ''}
                style={{
                  opacity: visible ? undefined : 0,
                  animationDelay: `${i * 80}ms`,
                  background: '#F4F1EC',
                  border: '1px solid #E8E4DE',
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <h3 style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 20,
                  fontWeight: 300,
                  color: '#0C0A09',
                  margin: '0 0 8px',
                  lineHeight: 1.2,
                }}>{nudge.title}</h3>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 15,
                  fontWeight: 300,
                  color: '#3C3835',
                  margin: 0,
                  lineHeight: 1.55,
                }}>{nudge.context}</p>
                <button className="cta-btn">{nudge.cta}</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
