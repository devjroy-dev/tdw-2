'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

interface Session {
  id: string;
  name?: string;
}

export default function DiscoverHub() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({
    discover: '',
    featured: '',
    trending: '',
    offers: '',
  });

  // Auth check
  useEffect(() => {
    try {
      const raw = localStorage.getItem('couple_session');
      if (raw) {
        const s = JSON.parse(raw) as Session;
        if (s?.id) setSession(s);
      }
    } catch {}
  }, []);

  // Fetch preview images for cards
  useEffect(() => {
    async function loadPreviews() {
      try {
        // Get random vendor images for card previews
        const res = await fetch(`${API}/api/vendors/discover-feed?limit=4`);
        if (res.ok) {
          const data = await res.json();
          const vendors = data.vendors || [];
          
          setPreviewImages({
            discover: vendors[0]?.featured_photos?.[0] || vendors[0]?.portfolio_images?.[0] || '',
            featured: vendors[1]?.featured_photos?.[0] || vendors[1]?.portfolio_images?.[0] || '',
            trending: vendors[2]?.featured_photos?.[0] || vendors[2]?.portfolio_images?.[0] || '',
            offers: vendors[3]?.featured_photos?.[0] || vendors[3]?.portfolio_images?.[0] || '',
          });
        }
      } catch (err) {
        console.error('Preview load failed:', err);
      }
    }

    loadPreviews();
  }, []);

  const handleCardClick = (mode: string) => {
    if (mode === 'customize') {
      router.push('/couple/discover/customize');
    } else {
      router.push(`/couple/discover/feed?mode=${mode}`);
    }
  };

  const PhotoCard = ({ 
    label, 
    image, 
    mode 
  }: { 
    label: string; 
    image: string; 
    mode: string;
  }) => (
    <div
      onClick={() => handleCardClick(mode)}
      style={{
        position: 'relative',
        aspectRatio: '4/5',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 280ms cubic-bezier(0.22,1,0.36,1)',
        willChange: 'transform',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.filter = 'brightness(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.filter = 'brightness(1)';
      }}
    >
      {/* Image */}
      {image ? (
        <img
          src={image}
          alt={label}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #1a1816 0%, #0C0A09 100%)',
        }} />
      )}

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(12,10,9,0) 40%, rgba(12,10,9,0.8) 100%)',
      }} />

      {/* Label */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        fontFamily: "'Jost', sans-serif",
        fontSize: 13,
        fontWeight: 300,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: '#F8F7F5',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {label}
        <span style={{ fontSize: 12, opacity: 0.7 }}>→</span>
      </div>
    </div>
  );

  const IconCard = ({
    label,
    icon,
    mode,
  }: {
    label: string;
    icon: string;
    mode: string;
  }) => (
    <div
      onClick={() => handleCardClick(mode)}
      style={{
        position: 'relative',
        aspectRatio: '4/5',
        borderRadius: 8,
        background: 'rgba(248,247,245,0.05)',
        border: '0.5px solid rgba(248,247,245,0.15)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        transition: 'all 280ms cubic-bezier(0.22,1,0.36,1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.background = 'rgba(248,247,245,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.background = 'rgba(248,247,245,0.05)';
      }}
    >
      {/* Icon */}
      <div style={{
        fontSize: 32,
        color: 'rgba(248,247,245,0.6)',
      }}>
        {icon}
      </div>

      {/* Label */}
      <div style={{
        fontFamily: "'Jost', sans-serif",
        fontSize: 13,
        fontWeight: 300,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: '#F8F7F5',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {label}
        <span style={{ fontSize: 12, opacity: 0.7 }}>→</span>
      </div>
    </div>
  );

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: '#0C0A09',
      minHeight: '100dvh',
      padding: '24px 16px',
      paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 36,
          fontWeight: 300,
          color: '#F8F7F5',
          margin: '0 0 8px',
          letterSpacing: '-0.01em',
        }}>
          Discover
        </h1>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          fontWeight: 300,
          color: 'rgba(248,247,245,0.6)',
          margin: 0,
        }}>
          Explore curated wedding Makers
        </p>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 16,
      }}>
        <PhotoCard 
          label="DISCOVER" 
          image={previewImages.discover}
          mode="discover"
        />
        <PhotoCard 
          label="FEATURED" 
          image={previewImages.featured}
          mode="featured"
        />
        <PhotoCard 
          label="TRENDING" 
          image={previewImages.trending}
          mode="trending"
        />
        <PhotoCard 
          label="OFFERS" 
          image={previewImages.offers}
          mode="offers"
        />
        <IconCard 
          label="BLIND" 
          icon="◐"
          mode="blind"
        />
        <IconCard 
          label="CUSTOMIZE" 
          icon="⚙"
          mode="customize"
        />
      </div>
    </div>
  );
}
