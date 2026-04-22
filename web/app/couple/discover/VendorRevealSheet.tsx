'use client';

import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, MapPin, Star } from 'lucide-react';

interface VendorRevealSheetProps {
  vendor: {
    id: string;
    name: string;
    category: string;
    city?: string;
    rating?: number;
    review_count?: number;
    starting_price?: number;
    tier?: string;
    vibe_tags?: string[];
  } | null;
  visible: boolean;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onSave: () => void;
  onEnquire: () => void;
}

function formatINR(n?: number): string {
  if (!n) return 'On request';
  return '₹' + n.toLocaleString('en-IN');
}

function getTierBadge(tier?: string): { color: string; label: string } | null {
  if (tier === 'prestige') return { color: '#C9A84C', label: 'PRESTIGE' };
  if (tier === 'signature') return { color: '#888580', label: 'SIGNATURE' };
  return null;
}

export default function VendorRevealSheet({
  vendor,
  visible,
  expanded,
  onExpand,
  onCollapse,
  onSave,
  onEnquire,
}: VendorRevealSheetProps) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);

  if (!visible || !vendor) return null;

  const tierBadge = getTierBadge(vendor.tier);
  
  // Collapsed: 88px from bottom, Expanded: 50vh from bottom
  const collapsedHeight = 88;
  const expandedHeight = typeof window !== 'undefined' ? window.innerHeight * 0.5 : 400;
  const currentHeight = expanded ? expandedHeight : collapsedHeight;
  
  const bottomPosition = Math.max(0, currentHeight - dragY);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = startY - e.touches[0].clientY;
    setDragY(delta);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // Swipe up threshold
    if (dragY > 100 && !expanded) {
      onExpand();
    }
    // Swipe down threshold
    else if (dragY < -100 && expanded) {
      onCollapse();
    } else if (dragY < -50 && !expanded) {
      onCollapse(); // Close completely
    }
    
    setDragY(0);
  };

  return (
    <>
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: bottomPosition,
          background: 'rgba(248,247,245,0.98)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px 24px 0 0',
          zIndex: 200,
          transition: isDragging ? 'none' : 'height 320ms cubic-bezier(0.22,1,0.36,1)',
          willChange: 'height',
          animation: visible ? 'slideUp 320ms cubic-bezier(0.22,1,0.36,1)' : 'none',
          overflow: 'hidden',
          boxShadow: '0 -4px 32px rgba(17,17,17,0.12)',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 40,
          height: 4,
          background: '#E2DED8',
          borderRadius: 2,
          margin: '12px auto 16px',
        }} />

        {/* Collapsed view */}
        {!expanded && (
          <div 
            onClick={onExpand}
            style={{ 
              padding: '0 16px 16px',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 20,
                  fontWeight: 300,
                  color: '#111111',
                  margin: '0 0 4px',
                  letterSpacing: '-0.01em',
                }}>
                  {vendor.name}
                </p>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 300,
                  color: '#888580',
                  margin: 0,
                }}>
                  {vendor.category}
                  {vendor.city && ` · ${vendor.city}`}
                </p>
              </div>

              {tierBadge && (
                <div style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 9,
                  fontWeight: 300,
                  letterSpacing: '0.2em',
                  color: tierBadge.color,
                  border: `0.5px solid ${tierBadge.color}`,
                  borderRadius: 4,
                  padding: '4px 8px',
                }}>
                  {tierBadge.label}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expanded view */}
        {expanded && (
          <div style={{
            padding: '0 16px 24px',
            overflowY: 'auto',
            height: 'calc(100% - 40px)',
          }}>
            {/* Title */}
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 28,
              fontWeight: 300,
              color: '#111111',
              margin: '0 0 8px',
              letterSpacing: '-0.01em',
            }}>
              {vendor.name}
            </p>

            {/* Category & Location */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
            }}>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 300,
                color: '#888580',
                margin: 0,
              }}>
                {vendor.category}
              </p>
              
              {vendor.city && (
                <>
                  <span style={{ color: '#E2DED8' }}>·</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} color="#888580" strokeWidth={1.5} />
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14,
                      fontWeight: 300,
                      color: '#888580',
                      margin: 0,
                    }}>
                      {vendor.city}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Tier badge */}
            {tierBadge && (
              <div style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 9,
                fontWeight: 300,
                letterSpacing: '0.2em',
                color: tierBadge.color,
                border: `0.5px solid ${tierBadge.color}`,
                borderRadius: 4,
                padding: '6px 10px',
                display: 'inline-block',
                marginBottom: 16,
              }}>
                {tierBadge.label}
              </div>
            )}

            {/* Rating */}
            {vendor.rating && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}>
                <Star size={16} color="#C9A84C" strokeWidth={1.5} fill="#C9A84C" />
                <p style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 300,
                  color: '#111111',
                  margin: 0,
                }}>
                  {vendor.rating.toFixed(1)}
                  {vendor.review_count && (
                    <span style={{ color: '#888580' }}> ({vendor.review_count} reviews)</span>
                  )}
                </p>
              </div>
            )}

            {/* Price */}
            {vendor.starting_price && (
              <div style={{ marginBottom: 24 }}>
                <p style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 9,
                  fontWeight: 300,
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  color: '#888580',
                  margin: '0 0 4px',
                }}>
                  Starting Price
                </p>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 24,
                  fontWeight: 300,
                  color: '#111111',
                  margin: 0,
                }}>
                  {formatINR(vendor.starting_price)}
                </p>
              </div>
            )}

            {/* Vibe tags */}
            {vendor.vibe_tags && vendor.vibe_tags.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 9,
                  fontWeight: 300,
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  color: '#888580',
                  margin: '0 0 8px',
                }}>
                  Style
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {vendor.vibe_tags.map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12,
                        fontWeight: 300,
                        color: '#888580',
                        background: '#F8F7F5',
                        border: '0.5px solid #E2DED8',
                        borderRadius: 16,
                        padding: '4px 12px',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginTop: 24,
            }}>
              <button
                onClick={onSave}
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 11,
                  fontWeight: 300,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: '#111111',
                  background: 'rgba(201,168,76,0.1)',
                  border: '0.5px solid rgba(201,168,76,0.3)',
                  borderRadius: 8,
                  padding: '14px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
                }}
              >
                <Heart size={16} strokeWidth={1.5} />
                Save to Muse
              </button>

              <button
                onClick={onEnquire}
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 11,
                  fontWeight: 300,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: '#111111',
                  background: '#C9A84C',
                  border: 'none',
                  borderRadius: 8,
                  padding: '14px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
                }}
              >
                <MessageCircle size={16} strokeWidth={1.5} />
                Enquire
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
