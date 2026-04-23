'use client';

import { useRouter } from 'next/navigation';
import { Grid3x3 } from 'lucide-react';

export default function DiscoverHub() {
  const router = useRouter();

  const handleCardClick = (mode: string) => {
    if (mode === 'categories') {
      router.push('/couple/discover/categories');
    } else {
      router.push(`/couple/discover/feed?mode=${mode}`);
    }
  };

  const FeedCard = ({ 
    label, 
    mode,
    image 
  }: { 
    label: string; 
    mode: string;
    image?: string;
  }) => (
    <div
      onClick={() => handleCardClick(mode)}
      style={{
        position: 'relative',
        aspectRatio: '4/5',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        background: image ? 'transparent' : 'linear-gradient(135deg, #1a1816 0%, #0C0A09 100%)',
        transition: 'transform 280ms cubic-bezier(0.22,1,0.36,1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {/* Background image if provided */}
      {image && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
      )}

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(12,10,9,0.1) 0%, rgba(12,10,9,0.7) 100%)',
      }} />

      {/* Label */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
      }}>
        <h3 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 28,
          fontWeight: 300,
          color: '#F8F7F5',
          margin: 0,
          letterSpacing: '-0.01em',
          textTransform: 'capitalize',
        }}>
          {label}
        </h3>
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

      {/* Grid - 5 feed cards + 1 categories */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 16,
      }}>
        <FeedCard 
          label="Discover" 
          mode="discover"
          image="https://images.unsplash.com/photo-1519741497674-611481863552?w=800"
        />
        <FeedCard 
          label="Featured" 
          mode="featured"
          image="https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800"
        />
        <FeedCard 
          label="Trending" 
          mode="trending"
          image="https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800"
        />
        <FeedCard 
          label="Offers" 
          mode="offers"
          image="https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=800"
        />
        <FeedCard 
          label="Cover" 
          mode="cover"
          image="https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800"
        />

        {/* Categories - Icon card */}
        <div
          onClick={() => handleCardClick('categories')}
          style={{
            position: 'relative',
            aspectRatio: '4/5',
            borderRadius: 12,
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
          <Grid3x3 size={32} color="rgba(248,247,245,0.6)" strokeWidth={1.5} />
          <h3 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 28,
            fontWeight: 300,
            color: '#F8F7F5',
            margin: 0,
            letterSpacing: '-0.01em',
          }}>
            Categories
          </h3>
        </div>
      </div>
    </div>
  );
}
