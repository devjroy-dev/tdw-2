'use client';

import { useRouter } from 'next/navigation';
import { Camera, Building2, Palette, Sparkles, Users, Calendar } from 'lucide-react';

const CATEGORIES = [
  { id: 'photography', label: 'Photography', Icon: Camera },
  { id: 'venues', label: 'Venues', Icon: Building2 },
  { id: 'makeup', label: 'Makeup & Hair', Icon: Sparkles },
  { id: 'decor', label: 'Decor', Icon: Palette },
  { id: 'designers', label: 'Designers', Icon: Sparkles },
  { id: 'event-managers', label: 'Event Managers', Icon: Users },
];

export default function CategoriesPage() {
  const router = useRouter();

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/couple/discover/feed?mode=category&category=${categoryId}`);
  };

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: '#0C0A09',
      minHeight: '100dvh',
      padding: '24px 16px',
      paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
      }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 36,
          fontWeight: 300,
          color: '#F8F7F5',
          margin: 0,
          letterSpacing: '-0.01em',
        }}>
          Categories
        </h1>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(248,247,245,0.6)',
            fontSize: 28,
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Category Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 16,
      }}>
        {CATEGORIES.map(({ id, label, Icon }) => (
          <div
            key={id}
            onClick={() => handleCategoryClick(id)}
            style={{
              aspectRatio: '1/1',
              borderRadius: 12,
              background: 'rgba(248,247,245,0.05)',
              border: '0.5px solid rgba(248,247,245,0.15)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
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
            <Icon size={32} color="rgba(248,247,245,0.6)" strokeWidth={1.5} />
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 300,
              color: '#F8F7F5',
              margin: 0,
              textAlign: 'center',
              padding: '0 16px',
            }}>
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
