'use client';

import React, { useState } from 'react';
import { MessageCircle, Star, X } from 'lucide-react';


function isVerifiedVendor(vendor: any): boolean {
  // Vendor is verified if they have: name, category, city, price, tagline, and 5+ images
  return !!(
    vendor.name &&
    vendor.category &&
    vendor.city &&
    (vendor as any).priceFrom || vendor.starting_price &&
    vendor.tagline &&
    vendor.images?.length >= 5
  );
}

interface VendorCardSheetProps {
  vendor: {
    id: string;
    name: string;
    category: string;
    city?: string;
    rating?: number;
    review_count?: number;
    starting_price?: number;
    tier?: string;
  } | null;
  visible: boolean;
  onClose: () => void;
  onEnquire: () => void;
}

function formatINR(n?: number): string {
  if (!n) return 'On request';
  // Use priceLabel if available
  return '₹' + n.toLocaleString('en-IN');
}

function formatINR_old(n?: number): string {
  if (!n) return 'On request';
  return '₹' + n.toLocaleString('en-IN');
}

// getTierBadge removed - using verified badge

export default function VendorCardSheet({
  vendor,
  visible,
  onClose,
  onEnquire,
}: VendorCardSheetProps) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);

  if (!visible || !vendor) return null;

  

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = e.touches[0].clientY - startY;
    if (delta > 0) setDragY(delta); // Only allow dragging down
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (dragY > 100) {
      onClose();
    }
    
    setDragY(0);
  };

  const sheetHeight = typeof window !== 'undefined' ? window.innerHeight * 0.6 : 400;
  const currentBottom = Math.max(0, -dragY);

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
          bottom: currentBottom,
          height: sheetHeight,
          background: '#F8F7F5',
          borderRadius: '20px 20px 0 0',
          zIndex: 200,
          transition: isDragging ? 'none' : 'bottom 320ms cubic-bezier(0.22,1,0.36,1)',
          animation: 'slideUp 320ms cubic-bezier(0.22,1,0.36,1)',
          boxShadow: '0 -20px 60px rgba(12,10,9,0.15)',
          overflow: 'auto',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 36,
          height: 3,
          background: '#D4D0CA',
          borderRadius: 2,
          margin: '12px auto 24px',
        }} />

        {/* Content */}
        <div style={{ padding: '0 24px 32px' }}>
          {/* Vendor name with verified badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 24,
              fontWeight: 300,
              color: '#111111',
              margin: 0,
              letterSpacing: '-0.01em',
            }}>
              {vendor.name}
            </h2>
            {isVerifiedVendor(vendor) && (
              <div style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#C9A84C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
              }}>✓</div>
            )}
          </div>

          {/* Category & Location */}
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            fontWeight: 300,
            color: '#888580',
            margin: '0 0 16px',
          }}>
            {vendor.category}
            {vendor.city && ` · ${vendor.city}`}
          </p>

          {/* Tier badge removed - using verified badge instead */}

          {/* Rating */}
          {/* Conditional section removed */}

          {/* Price */}
          {(vendor as any).priceFrom || vendor.starting_price && (
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
                fontSize: 20,
                fontWeight: 300,
                color: '#111111',
                margin: 0,
              }}>
                {formatINR((vendor as any).priceFrom || vendor.starting_price)}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            {/* Enquire */}
            <button
              onClick={onEnquire}
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 11,
                fontWeight: 300,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#111111',
                background: 'transparent',
                border: '0.5px solid #111111',
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

            {/* Lock Date - Coming Soon */}
            <button
              disabled
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 11,
                fontWeight: 300,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#888580',
                background: 'transparent',
                border: '0.5px solid #D4D0CA',
                borderRadius: 8,
                padding: '14px 20px',
                cursor: 'not-allowed',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                opacity: 0.6,
              }}
            >
              <span>Lock Date</span>
              <span style={{
                fontSize: 9,
                fontStyle: 'italic',
                textTransform: 'none',
                letterSpacing: '0.05em',
              }}>
                Coming Soon
              </span>
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            background: 'rgba(12,10,9,0.05)',
            border: 'none',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <X size={16} color="#111111" strokeWidth={1.5} />
        </button>
      </div>
    </>
  );
}
