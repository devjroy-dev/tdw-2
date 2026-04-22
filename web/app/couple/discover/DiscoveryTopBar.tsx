'use client';

import React from 'react';

interface DiscoveryTopBarProps {
  visible: boolean;
  activeFilter: 'featured' | 'offers' | null;
  onFilterTap: (filter: 'featured' | 'offers') => void;
  onBlindTap: () => void;
  onFiltersTap: () => void;
  onInteraction: () => void; // Reset hide timer
}

export default function DiscoveryTopBar({
  visible,
  activeFilter,
  onFilterTap,
  onBlindTap,
  onFiltersTap,
  onInteraction,
}: DiscoveryTopBarProps) {
  if (!visible) return null;

  const Pill = ({ 
    label, 
    active, 
    onClick 
  }: { 
    label: string; 
    active?: boolean; 
    onClick: () => void;
  }) => (
    <button
      onClick={() => {
        onClick();
        onInteraction();
      }}
      style={{
        fontFamily: "'Jost', sans-serif",
        fontSize: 9,
        fontWeight: 300,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: active ? '#C9A84C' : 'rgba(248,247,245,0.7)',
        background: active 
          ? 'rgba(201,168,76,0.15)' 
          : 'rgba(248,247,245,0.08)',
        backdropFilter: 'blur(12px)',
        border: active 
          ? '0.5px solid rgba(201,168,76,0.4)' 
          : '0.5px solid rgba(248,247,245,0.15)',
        borderRadius: 24,
        padding: '8px 14px',
        cursor: 'pointer',
        transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-100%); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 150,
        padding: '16px 12px',
        paddingTop: 'calc(16px + env(safe-area-inset-top))',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'flex-start',
        animation: 'slideDown 280ms cubic-bezier(0.22,1,0.36,1)',
        pointerEvents: 'auto',
      }}>
        <Pill 
          label="FEATURED" 
          active={activeFilter === 'featured'}
          onClick={() => onFilterTap('featured')}
        />
        <Pill 
          label="OFFERS" 
          active={activeFilter === 'offers'}
          onClick={() => onFilterTap('offers')}
        />
        <Pill 
          label="BLIND" 
          onClick={onBlindTap}
        />
        <Pill 
          label="FILTERS" 
          onClick={onFiltersTap}
        />
      </div>
    </>
  );
}
