'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

const BACKEND = 'https://dream-wedding-production-89ae.up.railway.app';

interface Booking {
  id: string;
  client_name: string;
  event_date: string;
  event_type: string;
  venue: string;
  status: string;
}

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #F8F7F5 25%, #EEECE8 50%, #F8F7F5 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 8,
  willChange: 'transform',
  transform: 'translateZ(0)',
};

export default function CalendarPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const raw = localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/pin-login'); return; }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.vendorId) { window.location.replace('/vendor/pin-login'); return; }
      setVendorId(parsed.vendorId);
    } catch { window.location.replace('/vendor/pin-login'); }
  }, []);

  const fetchBookings = useCallback(async (vid: string) => {
    try {
      const res = await fetch(`${BACKEND}/api/bookings/vendor/${vid}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setBookings(json.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (vendorId) fetchBookings(vendorId);
  }, [vendorId, fetchBookings]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const bookingDates = new Set(
    bookings.map(b => {
      const d = new Date(b.event_date);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  const upcoming = [...bookings]
    .filter(b => new Date(b.event_date) >= new Date(today.toDateString()))
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8F7F5; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#F8F7F5', fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
        {/* Back */}
        <div style={{ padding: '16px 20px 0' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, touchAction: 'manipulation', willChange: 'opacity', transform: 'translateZ(0)' }}>
            <ArrowLeft size={20} strokeWidth={1.5} color="#111111" />
          </button>
        </div>

        {/* Header */}
        <div style={{ padding: '12px 20px 20px' }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 10, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>YOUR STUDIO</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 28, color: '#111111' }}>Calendar</h1>
        </div>

        {/* Month navigator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 16px' }}>
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, touchAction: 'manipulation' }}>
            <ChevronLeft size={18} strokeWidth={1.5} color="#555250" />
          </button>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 20, color: '#111111' }}>{monthName} {year}</span>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, touchAction: 'manipulation' }}>
            <ChevronRight size={18} strokeWidth={1.5} color="#555250" />
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 20px', marginBottom: 8 }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', paddingBottom: 6 }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 20px', gap: '2px 0' }}>
          {days.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const key = `${year}-${month}-${day}`;
            const hasBooking = bookingDates.has(key);
            return (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: isToday ? '#111111' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: isToday ? '#F8F7F5' : '#111111', fontWeight: 300 }}>{day}</span>
                </div>
                {hasBooking && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#C9A84C', marginTop: 2 }} />}
              </div>
            );
          })}
        </div>

        {/* Upcoming */}
        <div style={{ padding: '24px 20px 0' }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 12 }}>UPCOMING</p>

          {loading ? (
            <>
              {[1,2,3].map(i => (
                <div key={i} style={{ ...shimmerStyle, height: 44, marginBottom: 1 }} />
              ))}
            </>
          ) : upcoming.length === 0 ? (
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: '#888580', textAlign: 'center', padding: '24px 0' }}>Nothing scheduled yet.</p>
          ) : (
            upcoming.map((b, idx) => (
              <div key={b.id}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0' }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#888580', minWidth: 52, fontWeight: 300 }}>{formatDate(b.event_date)}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#111111', flex: 1, fontWeight: 400 }}>{b.event_type} · {b.client_name}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: b.status === 'confirmed' ? '#111111' : '#888580', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{b.status}</span>
                </div>
                {idx < upcoming.length - 1 && <div style={{ height: 1, background: '#E2DED8' }} />}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
