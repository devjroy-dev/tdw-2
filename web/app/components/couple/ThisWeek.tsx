'use client';

import React, { useEffect, useState } from 'react';

interface WeekItem {
  id: string;
  day: string; // 'Mon' | 'Tue' | etc.
  label: string;
}

interface ThisWeekProps {
  thisWeek?: WeekItem[];
  loading?: boolean;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getCurrentDay(): string {
  const d = new Date().getDay(); // 0=Sun
  return DAYS[d === 0 ? 6 : d - 1];
}

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg,#E8E4DE 25%,#F4F1EC 50%,#E8E4DE 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 6,
};

function buildNarrative(items: WeekItem[], currentDay: string): string {
  if (!items.length) return 'A quiet week. Space to breathe.';
  const days = items.map(i => i.day);
  if (days.length === 1) return `One moment this week — ${items[0].label.toLowerCase()} on ${days[0]}.`;
  const last = days.pop();
  return `${days.join(', ')} and ${last} have something for you.`;
}

export default function ThisWeek({ thisWeek = [], loading = false }: ThisWeekProps) {
  const [visible, setVisible] = useState(false);
  const currentDay = getCurrentDay();
  useEffect(() => { const t = setTimeout(() => setVisible(true), 180); return () => clearTimeout(t); }, []);

  // Build a map: day -> label
  const dayMap: Record<string, string> = {};
  thisWeek.forEach(item => { dayMap[item.day] = item.label; });

  const narrative = buildNarrative(thisWeek, currentDay);

  return (
    <>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
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
        }}>THIS WEEK</p>

        {/* Title */}
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 28,
          fontWeight: 300,
          letterSpacing: '-0.01em',
          color: '#0C0A09',
          margin: '0 0 24px',
        }}>What&#39;s ahead</h2>

        {loading ? (
          <div style={{ height: 56, ...shimmerStyle }} />
        ) : (
          <>
            {/* Day dots */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 4,
              marginBottom: 20,
              opacity: visible ? 1 : 0,
              transition: 'opacity 400ms cubic-bezier(0.22,1,0.36,1)',
            }}>
              {DAYS.map(day => {
                const isToday = day === currentDay;
                const hasEvent = !!dayMap[day];
                return (
                  <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    {/* Dot */}
                    <div style={{
                      width: isToday ? 10 : 8,
                      height: isToday ? 10 : 8,
                      borderRadius: '50%',
                      background: isToday ? '#C9A84C' : hasEvent ? '#3C3835' : '#E8E4DE',
                      transition: 'background 280ms cubic-bezier(0.22,1,0.36,1)',
                    }} />
                    {/* Day label */}
                    <span style={{
                      fontFamily: "'Jost', sans-serif",
                      fontSize: 9,
                      fontWeight: isToday ? 400 : 300,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: isToday ? '#C9A84C' : '#8C8480',
                    }}>{day}</span>
                    {/* Event label below */}
                    {hasEvent && (
                      <span style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 10,
                        fontWeight: 300,
                        color: '#3C3835',
                        textAlign: 'center',
                        lineHeight: 1.3,
                        maxWidth: 40,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>{dayMap[day]}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Narrative line */}
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15,
              fontWeight: 300,
              color: '#3C3835',
              lineHeight: 1.6,
              margin: 0,
              opacity: visible ? 1 : 0,
              transition: 'opacity 400ms cubic-bezier(0.22,1,0.36,1) 80ms',
            }}>{narrative}</p>
          </>
        )}
      </div>
    </>
  );
}
