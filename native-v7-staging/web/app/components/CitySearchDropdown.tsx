'use client';
import { useState, useRef, useEffect } from 'react';

// ─── Location data ────────────────────────────────────────────────────────────

const INDIA_CITIES = [
  'Delhi','Mumbai','Bangalore','Chennai','Hyderabad','Kolkata',
  'Jaipur','Udaipur','Pune','Ahmedabad','Chandigarh','Lucknow',
  'Kochi','Goa','Amritsar','Surat','Jodhpur','Agra','Varanasi',
  'Bhopal','Indore','Nagpur','Coimbatore','Madurai','Visakhapatnam',
  'Mangalore','Mysore','Pondicherry','Dehradun','Shimla','Mussoorie',
  'Nainital','Rishikesh','Haridwar','Jammu','Srinagar','Guwahati',
  'Shillong','Bhubaneswar','Raipur','Ranchi','Patna','Allahabad',
  'Meerut','Kanpur','Ludhiana','Jalandhar','Patiala','Faridabad',
  'Gurgaon','Noida','Thane','Navi Mumbai','Aurangabad','Nashik',
  'Kolhapur','Rajkot','Vadodara','Gandhinagar','Bhavnagar',
  'Trivandrum','Thrissur','Kozhikode','Calicut','Hubli','Belgaum',
  'Vijayawada','Guntur','Warangal','Tirupati','Salem',
  'Tiruchirappalli','Vellore',
];

const INTERNATIONAL_CITIES = [
  // USA
  'New York','Los Angeles','Chicago','Houston','San Francisco',
  'Miami','Seattle','Boston','Dallas',
  // UK
  'London','Manchester','Birmingham','Edinburgh','Glasgow',
  // Canada
  'Toronto','Vancouver','Montreal','Calgary',
  // Australia
  'Sydney','Melbourne','Brisbane','Perth',
  // UAE
  'Dubai','Abu Dhabi',
  // Europe
  'Paris','Amsterdam','Zurich','Frankfurt','Rome','Barcelona',
  // Asia
  'Singapore','Kuala Lumpur','Hong Kong','Tokyo','Bangkok',
];

export const ALL_CITIES = [
  ...INDIA_CITIES,
  ...INTERNATIONAL_CITIES,
  'Other',
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface CitySearchDropdownProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  /** 'dark' for dark glass panels (onboarding), 'light' for light panels (Studio settings) */
  theme?: 'dark' | 'light';
  label?: string;
}

interface CitySearchMultiProps {
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
  theme?: 'dark' | 'light';
  label?: string;
  showPanIndiaToggle?: boolean;
}

// ─── Shared styles helper ─────────────────────────────────────────────────────

function getThemeStyles(theme: 'dark' | 'light') {
  if (theme === 'dark') {
    return {
      inputBg: 'rgba(255,255,255,0.06)',
      inputBorder: '0.5px solid rgba(255,255,255,0.2)',
      inputColor: '#F8F7F5',
      inputPlaceholder: 'rgba(248,247,245,0.35)',
      dropdownBg: '#1A1714',
      dropdownBorder: '0.5px solid rgba(255,255,255,0.12)',
      itemHover: 'rgba(201,168,76,0.1)',
      itemColor: '#F8F7F5',
      itemMuted: 'rgba(248,247,245,0.4)',
      labelColor: 'rgba(248,247,245,0.4)',
      tagBg: 'rgba(201,168,76,0.12)',
      tagBorder: '0.5px solid rgba(201,168,76,0.3)',
      tagColor: '#C9A84C',
      tagX: 'rgba(201,168,76,0.6)',
      sectionLabel: 'rgba(201,168,76,0.7)',
      clearColor: 'rgba(248,247,245,0.35)',
    };
  }
  return {
    inputBg: '#F8F7F5',
    inputBorder: '0.5px solid #E2DED8',
    inputColor: '#111111',
    inputPlaceholder: '#B8B4AE',
    dropdownBg: '#FFFFFF',
    dropdownBorder: '0.5px solid #E2DED8',
    itemHover: '#F8F7F5',
    itemColor: '#111111',
    itemMuted: '#888580',
    labelColor: '#888580',
    tagBg: 'rgba(201,168,76,0.08)',
    tagBorder: '0.5px solid rgba(201,168,76,0.4)',
    tagColor: '#8C6A20',
    tagX: '#C9A84C',
    sectionLabel: '#C9A84C',
    clearColor: '#B8B4AE',
  };
}

// ─── Single-select ────────────────────────────────────────────────────────────

export function CitySearchDropdown({
  value, onChange, placeholder = 'Search city or country…',
  theme = 'light', label,
}: CitySearchDropdownProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const s = getThemeStyles(theme);

  const filtered = query.length < 1
    ? ALL_CITIES.slice(0, 40)
    : ALL_CITIES.filter(c => c.toLowerCase().includes(query.toLowerCase())).slice(0, 50);

  const inIndia = (c: string) => INDIA_CITIES.includes(c);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function select(city: string) {
    onChange(city);
    setOpen(false);
    setQuery('');
  }

  const displayValue = value || placeholder;
  const hasValue = !!value;

  return (
    <div ref={wrapRef} style={{ position: 'relative', marginBottom: 0 }}>
      {label && (
        <p style={{
          fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          color: s.labelColor, margin: '0 0 6px',
        }}>{label}</p>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 60); }}
        style={{
          width: '100%', height: 44, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 12px',
          background: s.inputBg, border: open ? `0.5px solid #C9A84C` : s.inputBorder,
          borderRadius: 10, cursor: 'pointer', outline: 'none',
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
          color: hasValue ? s.inputColor : s.inputPlaceholder,
          transition: 'border-color 150ms ease',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayValue}
        </span>
        <span style={{ color: s.sectionLabel, fontSize: 10, flexShrink: 0, marginLeft: 8 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: s.dropdownBg, border: s.dropdownBorder,
          borderRadius: 12, zIndex: 9999, overflow: 'hidden',
          boxShadow: theme === 'dark'
            ? '0 8px 32px rgba(0,0,0,0.6)'
            : '0 8px 24px rgba(0,0,0,0.1)',
        }}>
          {/* Search input */}
          <div style={{ padding: '10px 12px', borderBottom: s.dropdownBorder }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type to search…"
              style={{
                width: '100%', background: 'transparent', border: 'none',
                outline: 'none', fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, fontWeight: 300, color: s.inputColor,
              }}
            />
          </div>

          {/* Results */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <p style={{
                padding: '12px 14px', fontFamily: "'DM Sans', sans-serif",
                fontSize: 12, fontWeight: 300, color: s.itemMuted,
              }}>No results</p>
            ) : (
              (() => {
                const indiaResults = filtered.filter(c => inIndia(c));
                const intlResults = filtered.filter(c => !inIndia(c) && c !== 'Other');
                const showOther = filtered.includes('Other');
                return (
                  <>
                    {indiaResults.length > 0 && (
                      <>
                        {query.length < 1 && (
                          <p style={{
                            padding: '8px 14px 4px', fontFamily: "'Jost', sans-serif",
                            fontSize: 8, fontWeight: 300, letterSpacing: '0.2em',
                            textTransform: 'uppercase', color: s.sectionLabel,
                          }}>India</p>
                        )}
                        {indiaResults.map(city => (
                          <button
                            key={city} type="button" onClick={() => select(city)}
                            style={{
                              width: '100%', padding: '10px 14px', display: 'block',
                              background: city === value ? s.itemHover : 'transparent',
                              border: 'none', cursor: 'pointer', textAlign: 'left',
                              fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                              fontWeight: city === value ? 400 : 300, color: s.itemColor,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = s.itemHover)}
                            onMouseLeave={e => (e.currentTarget.style.background = city === value ? s.itemHover : 'transparent')}
                          >{city}</button>
                        ))}
                      </>
                    )}
                    {intlResults.length > 0 && (
                      <>
                        {query.length < 1 && (
                          <p style={{
                            padding: '8px 14px 4px', fontFamily: "'Jost', sans-serif",
                            fontSize: 8, fontWeight: 300, letterSpacing: '0.2em',
                            textTransform: 'uppercase', color: s.sectionLabel,
                          }}>International</p>
                        )}
                        {intlResults.map(city => (
                          <button
                            key={city} type="button" onClick={() => select(city)}
                            style={{
                              width: '100%', padding: '10px 14px', display: 'block',
                              background: city === value ? s.itemHover : 'transparent',
                              border: 'none', cursor: 'pointer', textAlign: 'left',
                              fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                              fontWeight: city === value ? 400 : 300, color: s.itemColor,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = s.itemHover)}
                            onMouseLeave={e => (e.currentTarget.style.background = city === value ? s.itemHover : 'transparent')}
                          >{city}</button>
                        ))}
                      </>
                    )}
                    {showOther && (
                      <button
                        type="button" onClick={() => select('Other')}
                        style={{
                          width: '100%', padding: '10px 14px', display: 'block',
                          background: value === 'Other' ? s.itemHover : 'transparent',
                          border: 'none', borderTop: s.dropdownBorder,
                          cursor: 'pointer', textAlign: 'left',
                          fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                          fontWeight: 300, color: s.itemMuted,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = s.itemHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = value === 'Other' ? s.itemHover : 'transparent')}
                      >Other</button>
                    )}
                  </>
                );
              })()
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Multi-select ─────────────────────────────────────────────────────────────

export function CitySearchMulti({
  values, onChange, placeholder = 'Add cities…',
  theme = 'light', label, showPanIndiaToggle = false,
}: CitySearchMultiProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const s = getThemeStyles(theme);

  const panIndia = values.includes('Pan India');

  const filtered = query.length < 1
    ? ALL_CITIES.filter(c => c !== 'Other').slice(0, 40)
    : ALL_CITIES.filter(c =>
        c !== 'Other' && c.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 50);

  const inIndia = (c: string) => INDIA_CITIES.includes(c);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function toggle(city: string) {
    if (panIndia) return; // Pan India = all, individual picks disabled
    if (values.includes(city)) {
      onChange(values.filter(v => v !== city));
    } else {
      onChange([...values, city]);
    }
  }

  function togglePanIndia() {
    if (panIndia) {
      onChange([]);
    } else {
      onChange(['Pan India']);
    }
  }

  function remove(city: string) {
    onChange(values.filter(v => v !== city));
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {label && (
        <p style={{
          fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          color: s.labelColor, margin: '0 0 6px',
        }}>{label}</p>
      )}

      {/* Pan India toggle */}
      {showPanIndiaToggle && (
        <button
          type="button" onClick={togglePanIndia}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '0 0 10px', touchAction: 'manipulation',
          }}
        >
          <div style={{
            width: 18, height: 18, borderRadius: 4,
            border: panIndia ? `1.5px solid #C9A84C` : `1px solid ${s.itemMuted}`,
            background: panIndia ? 'rgba(201,168,76,0.15)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms ease',
          }}>
            {panIndia && <span style={{ color: '#C9A84C', fontSize: 11, lineHeight: 1 }}>✓</span>}
          </div>
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
            color: panIndia ? '#C9A84C' : s.itemColor,
          }}>Pan India (travel anywhere)</span>
        </button>
      )}

      {/* Selected tags */}
      {values.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {values.map(v => (
            <span key={v} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: s.tagBg, border: s.tagBorder,
              borderRadius: 100, padding: '4px 10px',
              fontFamily: "'DM Sans', sans-serif", fontSize: 12,
              fontWeight: 300, color: s.tagColor,
            }}>
              {v}
              {!panIndia && (
                <button
                  type="button" onClick={() => remove(v)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: s.tagX, fontSize: 14, lineHeight: 1, padding: 0,
                  }}
                >×</button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input trigger */}
      {!panIndia && (
        <button
          type="button"
          onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 60); }}
          style={{
            width: '100%', height: 44, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 12px',
            background: s.inputBg, border: open ? `0.5px solid #C9A84C` : s.inputBorder,
            borderRadius: 10, cursor: 'pointer', outline: 'none',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
            color: values.length === 0 ? s.inputPlaceholder : s.inputColor,
            transition: 'border-color 150ms ease',
          }}
        >
          <span>{values.length === 0 ? placeholder : `${values.length} city selected`}</span>
          <span style={{ color: s.sectionLabel, fontSize: 10 }}>{open ? '▲' : '▼'}</span>
        </button>
      )}

      {/* Dropdown */}
      {open && !panIndia && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: s.dropdownBg, border: s.dropdownBorder,
          borderRadius: 12, zIndex: 9999, overflow: 'hidden',
          boxShadow: theme === 'dark'
            ? '0 8px 32px rgba(0,0,0,0.6)'
            : '0 8px 24px rgba(0,0,0,0.1)',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: s.dropdownBorder }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type to search…"
              style={{
                width: '100%', background: 'transparent', border: 'none',
                outline: 'none', fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, fontWeight: 300, color: s.inputColor,
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <p style={{
                padding: '12px 14px', fontFamily: "'DM Sans', sans-serif",
                fontSize: 12, fontWeight: 300, color: s.itemMuted,
              }}>No results</p>
            ) : (
              (() => {
                const indiaResults = filtered.filter(c => inIndia(c));
                const intlResults = filtered.filter(c => !inIndia(c));
                return (
                  <>
                    {indiaResults.length > 0 && (
                      <>
                        {query.length < 1 && (
                          <p style={{
                            padding: '8px 14px 4px', fontFamily: "'Jost', sans-serif",
                            fontSize: 8, fontWeight: 300, letterSpacing: '0.2em',
                            textTransform: 'uppercase', color: s.sectionLabel,
                          }}>India</p>
                        )}
                        {indiaResults.map(city => (
                          <button
                            key={city} type="button" onClick={() => toggle(city)}
                            style={{
                              width: '100%', padding: '10px 14px', display: 'flex',
                              alignItems: 'center', gap: 10,
                              background: values.includes(city) ? s.itemHover : 'transparent',
                              border: 'none', cursor: 'pointer', textAlign: 'left',
                              fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                              fontWeight: 300, color: s.itemColor,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = s.itemHover)}
                            onMouseLeave={e => (e.currentTarget.style.background = values.includes(city) ? s.itemHover : 'transparent')}
                          >
                            <span style={{
                              width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                              border: values.includes(city) ? `1.5px solid #C9A84C` : `1px solid ${s.itemMuted}`,
                              background: values.includes(city) ? 'rgba(201,168,76,0.15)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {values.includes(city) && <span style={{ color: '#C9A84C', fontSize: 10 }}>✓</span>}
                            </span>
                            {city}
                          </button>
                        ))}
                      </>
                    )}
                    {intlResults.length > 0 && (
                      <>
                        {query.length < 1 && (
                          <p style={{
                            padding: '8px 14px 4px', fontFamily: "'Jost', sans-serif",
                            fontSize: 8, fontWeight: 300, letterSpacing: '0.2em',
                            textTransform: 'uppercase', color: s.sectionLabel,
                          }}>International</p>
                        )}
                        {intlResults.map(city => (
                          <button
                            key={city} type="button" onClick={() => toggle(city)}
                            style={{
                              width: '100%', padding: '10px 14px', display: 'flex',
                              alignItems: 'center', gap: 10,
                              background: values.includes(city) ? s.itemHover : 'transparent',
                              border: 'none', cursor: 'pointer', textAlign: 'left',
                              fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                              fontWeight: 300, color: s.itemColor,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = s.itemHover)}
                            onMouseLeave={e => (e.currentTarget.style.background = values.includes(city) ? s.itemHover : 'transparent')}
                          >
                            <span style={{
                              width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                              border: values.includes(city) ? `1.5px solid #C9A84C` : `1px solid ${s.itemMuted}`,
                              background: values.includes(city) ? 'rgba(201,168,76,0.15)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {values.includes(city) && <span style={{ color: '#C9A84C', fontSize: 10 }}>✓</span>}
                            </span>
                            {city}
                          </button>
                        ))}
                      </>
                    )}
                  </>
                );
              })()
            )}
          </div>
        </div>
      )}
    </div>
  );
}
