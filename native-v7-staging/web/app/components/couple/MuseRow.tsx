'use client';

import React, { useEffect, useState } from 'react';

interface MuseItem {
  id: string;
  vendor_name: string;
  category: string;
  thumbnail_url?: string;
}

interface MuseRowProps {
  muse?: MuseItem[];
  loading?: boolean;
}

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg,#E8E4DE 25%,#F4F1EC 50%,#E8E4DE 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 12,
};

export default function MuseRow({ muse = [], loading = false }: MuseRowProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 240); return () => clearTimeout(t); }, []);

  return (
    <>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <div style={{ padding: '32px 0 0' }}>
        {/* Header */}
        <div style={{ padding: '0 24px' }}>
          <p style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 9,
            fontWeight: 300,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: '#8C8480',
            margin: '0 0 6px',
          }}>FROM YOUR MUSE</p>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 28,
            fontWeight: 300,
            letterSpacing: '-0.01em',
            color: '#0C0A09',
            margin: '0 0 20px',
          }}>Saved for you</h2>
        </div>

        {loading ? (
          <div style={{ display: 'flex', gap: 12, padding: '0 24px', overflowX: 'hidden' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ flexShrink: 0, width: 140, height: 180, ...shimmerStyle }} />
            ))}
          </div>
        ) : muse.length === 0 ? (
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 15,
            fontWeight: 300,
            color: '#8C8480',
            textAlign: 'center',
            padding: '24px 24px',
            lineHeight: 1.6,
            margin: 0,
          }}>Start saving vendors in Discover to build your Muse.</p>
        ) : (
          <>
            {/* Horizontal scroll */}
            <div style={{
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              padding: '0 24px',
              scrollbarWidth: 'none',
              opacity: visible ? 1 : 0,
              transition: 'opacity 400ms cubic-bezier(0.22,1,0.36,1)',
            }}>
              {muse.slice(0, 3).map(item => (
                <div key={item.id} style={{
                  flexShrink: 0,
                  width: 140,
                  height: 180,
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#F4F1EC',
                  cursor: 'pointer',
                }}>
                  {/* Thumbnail — top 60% */}
                  <div style={{
                    height: '60%',
                    background: item.thumbnail_url ? `url(${item.thumbnail_url}) center/cover no-repeat` : '#E8E4DE',
                  }} />
                  {/* Info — bottom 40% */}
                  <div style={{ height: '40%', padding: '10px 10px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 400,
                      color: '#0C0A09',
                      margin: '0 0 3px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>{item.vendor_name}</p>
                    <p style={{
                      fontFamily: "'Jost', sans-serif",
                      fontSize: 10,
                      fontWeight: 200,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#8C8480',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>{item.category}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* DreamAi line */}
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 300,
              color: '#8C8480',
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '16px 24px 0',
              margin: 0,
              lineHeight: 1.55,
            }}>
              Based on your saves, we found three more photographers you might love.
            </p>
          </>
        )}
      </div>
    </>
  );
}
