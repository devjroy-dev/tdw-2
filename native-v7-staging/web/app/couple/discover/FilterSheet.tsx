'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters?: FilterState;
}

export interface FilterState {
  locations: string[];
  categories: string[];
  budget: { min: number; max: number };
  tiers: string[];
}

const LOCATIONS = ['Mumbai', 'Delhi', 'Bangalore', 'Goa', 'Jaipur', 'Udaipur', 'Hyderabad', 'Chennai'];
const CATEGORIES = ['Photography', 'Makeup', 'Decor', 'Venue', 'Catering', 'DJ', 'Choreography', 'Mehndi'];
const TIERS = ['Prestige', 'Signature'];

export default function FilterSheet({ visible, onClose, onApply, initialFilters }: FilterSheetProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters || {
    locations: [],
    categories: [],
    budget: { min: 50000, max: 500000 },
    tiers: [],
  });

  const toggleLocation = (loc: string) => {
    setFilters(prev => ({
      ...prev,
      locations: prev.locations.includes(loc)
        ? prev.locations.filter(l => l !== loc)
        : [...prev.locations, loc],
    }));
  };

  const toggleCategory = (cat: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const toggleTier = (tier: string) => {
    setFilters(prev => ({
      ...prev,
      tiers: prev.tiers.includes(tier)
        ? prev.tiers.filter(t => t !== tier)
        : [...prev.tiers, tier],
    }));
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      locations: [],
      categories: [],
      budget: { min: 50000, max: 500000 },
      tiers: [],
    });
  };

  if (!visible) return null;

  return (
    <>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(17,17,17,0.6)',
          zIndex: 300,
          animation: 'fadeIn 280ms cubic-bezier(0.22,1,0.36,1)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '85vh',
        background: '#FFFFFF',
        borderRadius: '24px 24px 0 0',
        zIndex: 301,
        animation: 'slideUp 320ms cubic-bezier(0.22,1,0.36,1)',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '0.5px solid #E2DED8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 24,
            fontWeight: 300,
            color: '#111111',
            margin: 0,
          }}>
            Refine Your Feed
          </p>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              background: '#F8F7F5',
              border: 'none',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} color="#111111" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 16px',
        }}>
          {/* Location */}
          <div style={{ marginBottom: 32 }}>
            <p style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 9,
              fontWeight: 300,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#888580',
              margin: '0 0 12px',
            }}>
              Location
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {LOCATIONS.map(loc => {
                const isSelected = filters.locations.includes(loc);
                return (
                  <button
                    key={loc}
                    onClick={() => toggleLocation(loc)}
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 300,
                      color: isSelected ? '#111111' : '#888580',
                      background: isSelected ? 'rgba(201,168,76,0.1)' : '#F8F7F5',
                      border: isSelected ? '0.5px solid rgba(201,168,76,0.3)' : '0.5px solid #E2DED8',
                      borderRadius: 20,
                      padding: '8px 16px',
                      cursor: 'pointer',
                      transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
                    }}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category */}
          <div style={{ marginBottom: 32 }}>
            <p style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 9,
              fontWeight: 300,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#888580',
              margin: '0 0 12px',
            }}>
              Category
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map(cat => {
                const isSelected = filters.categories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 300,
                      color: isSelected ? '#111111' : '#888580',
                      background: isSelected ? 'rgba(201,168,76,0.1)' : '#F8F7F5',
                      border: isSelected ? '0.5px solid rgba(201,168,76,0.3)' : '0.5px solid #E2DED8',
                      borderRadius: 20,
                      padding: '8px 16px',
                      cursor: 'pointer',
                      transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget */}
          <div style={{ marginBottom: 32 }}>
            <p style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 9,
              fontWeight: 300,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#888580',
              margin: '0 0 12px',
            }}>
              Budget Range
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 300,
                  color: '#888580',
                  margin: '0 0 4px',
                }}>
                  Min
                </p>
                <input
                  type="number"
                  value={filters.budget.min}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    budget: { ...prev.budget, min: parseInt(e.target.value) || 0 },
                  }))}
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 18,
                    fontWeight: 300,
                    color: '#111111',
                    background: '#F8F7F5',
                    border: '0.5px solid #E2DED8',
                    borderRadius: 8,
                    padding: '10px 12px',
                    width: '100%',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 300,
                  color: '#888580',
                  margin: '0 0 4px',
                }}>
                  Max
                </p>
                <input
                  type="number"
                  value={filters.budget.max}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    budget: { ...prev.budget, max: parseInt(e.target.value) || 0 },
                  }))}
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 18,
                    fontWeight: 300,
                    color: '#111111',
                    background: '#F8F7F5',
                    border: '0.5px solid #E2DED8',
                    borderRadius: 8,
                    padding: '10px 12px',
                    width: '100%',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tier */}
          <div style={{ marginBottom: 32 }}>
            <p style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 9,
              fontWeight: 300,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#888580',
              margin: '0 0 12px',
            }}>
              Tier
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TIERS.map(tier => {
                const isSelected = filters.tiers.includes(tier);
                return (
                  <button
                    key={tier}
                    onClick={() => toggleTier(tier)}
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 300,
                      color: isSelected ? '#111111' : '#888580',
                      background: isSelected ? 'rgba(201,168,76,0.1)' : '#F8F7F5',
                      border: isSelected ? '0.5px solid rgba(201,168,76,0.3)' : '0.5px solid #E2DED8',
                      borderRadius: 20,
                      padding: '8px 16px',
                      cursor: 'pointer',
                      transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
                    }}
                  >
                    {tier}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px',
          borderTop: '0.5px solid #E2DED8',
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: 12,
        }}>
          <button
            onClick={handleReset}
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 11,
              fontWeight: 300,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#888580',
              background: '#F8F7F5',
              border: '0.5px solid #E2DED8',
              borderRadius: 8,
              padding: '14px',
              cursor: 'pointer',
              transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            Reset
          </button>
          <button
            onClick={handleApply}
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
              padding: '14px',
              cursor: 'pointer',
              transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
