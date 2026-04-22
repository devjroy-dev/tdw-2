'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND = 'https://dream-wedding-production-89ae.up.railway.app';

function getSession() {
  try { const s = localStorage.getItem('vendor_web_session'); return s ? JSON.parse(s) : {}; }
  catch { return {}; }
}

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<any[]>([]);
  const today = new Date();
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  useEffect(() => {
    const { vendorId } = getSession();
    if (!vendorId) { setLoading(false); return; }
    fetch(`${BACKEND}/api/v2/vendor/today?vendorId=${vendorId}`)
      .then(r => r.json())
      .then(d => { setSchedule(d.schedule || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const bookedDays = new Set(
    schedule.map(s => {
      const d = new Date(s.date || s.start_time || '');
      return (d.getFullYear() === year && d.getMonth() === month) ? d.getDate() : null;
    }).filter(Boolean)
  );

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F5', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@400;500&family=Jost:wght@200&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .shimmer { background: linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%); background-size: 400% 100%; animation: shimmer 1.4s ease-in-out infinite; }
      `}</style>

      <div style={{ padding: '56px 24px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', touchAction: 'manipulation', willChange: 'opacity', transform: 'translateZ(0)', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
          <div style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 10, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>YOUR STUDIO</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 28, color: '#111111', lineHeight: 1.1 }}>Calendar</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '32px 24px 20px' }}>
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', touchAction: 'manipulation', padding: 4, display: 'flex', alignItems: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 18, color: '#111111', minWidth: 160, textAlign: 'center' }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', touchAction: 'manipulation', padding: 4, display: 'flex', alignItems: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12L10 8L6 4" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      <div style={{ padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#888580', paddingBottom: 8 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 0' }}>
          {cells.map((d, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 40, padding: '4px 0' }}>
              {d !== null && (
                <>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: isToday(d) ? '#111111' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: isToday(d) ? '#F8F7F5' : '#111111', willChange: 'transform', transform: 'translateZ(0)' }}>
                    {d}
                  </div>
                  {bookedDays.has(d) && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#C9A84C', marginTop: 2 }} />}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '32px 24px 48px' }}>
        <div style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 10, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 20 }}>UPCOMING</div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="shimmer" style={{ height: 11, width: '40%', borderRadius: 4 }} />
                <div className="shimmer" style={{ height: 16, width: '70%', borderRadius: 4 }} />
                <div className="shimmer" style={{ height: 12, width: '50%', borderRadius: 4 }} />
              </div>
            ))}
          </div>
        ) : schedule.length === 0 ? (
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 16, color: '#888580', textAlign: 'center', padding: '32px 0' }}>Nothing scheduled yet.</div>
        ) : (
          schedule.map((item, i) => (
            <div key={i}>
              <div style={{ padding: '16px 0' }}>
                <div style={{ fontSize: 11, color: '#888580', marginBottom: 4 }}>{item.date || item.start_time || ''}</div>
                <div style={{ fontSize: 14, color: '#111111', marginBottom: 2 }}>{item.title || item.name || ''}</div>
                <div style={{ fontSize: 12, color: '#555250' }}>{item.client_name || item.client || ''}</div>
              </div>
              {i < schedule.length - 1 && <div style={{ height: 1, background: '#E2DED8' }} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
