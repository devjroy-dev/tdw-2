'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Plus,
  CheckSquare, ListTodo, CalendarPlus, Ban,
} from 'lucide-react';

const BACKEND = 'https://dream-wedding-production-89ae.up.railway.app';

interface Booking {
  id: string;
  client_name: string;
  event_date: string;
  event_type: string;
  venue: string;
  status: string;
}

interface AvailBlock {
  id: string;
  blocked_date: string;
  reason: string | null;
}

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #F8F7F5 25%, #EEECE8 50%, #F8F7F5 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 8,
  willChange: 'transform',
  transform: 'translateZ(0)',
};

type CreationType = 'task' | 'todo' | 'booking' | 'block' | null;

export default function CalendarPage() {
  const router = useRouter();

  // ── Existing state ──────────────────────────────────────
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [availBlocks, setAvailBlocks] = useState<AvailBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<AvailBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // ── Hot Dates ────────────────────────────────────────────
  const [hotDates, setHotDates] = useState<Map<string, { label: string; intensity: string }>>(new Map());
  const [selectedHotDate, setSelectedHotDate] = useState<{ date: string; label: string; intensity: string } | null>(null);

  // ── FAB state ───────────────────────────────────────────
  const [fabOpen, setFabOpen] = useState(false);
  const [creationType, setCreationType] = useState<CreationType>(null);
  const [fabLoading, setFabLoading] = useState(false);
  const [toast, setToast] = useState('');

  // ── iCal Import ─────────────────────────────────────────
  const [importMode, setImportMode] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // ── Form fields ─────────────────────────────────────────
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEventType, setFormEventType] = useState('');
  const [formReminderDate, setFormReminderDate] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleIcsImport = async (file: File) => {
    if (!vendorId) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const res = await fetch(`${BACKEND}/api/v2/vendor/calendar/import/${vendorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ics_content: text }),
      });
      const json = await res.json();
      if (json.success) {
        setImportResult(`✓ ${json.imported} dates imported from your calendar.`);
        if (vendorId) fetchBookings(vendorId);
      } else {
        setImportResult('Could not import. Please try again.');
      }
    } catch {
      setImportResult('Could not read the file. Make sure it is a valid .ics file.');
    }
    setImportLoading(false);
  };

  const resetForm = () => {
    setFormTitle(''); setFormDate(''); setFormNote('');
    setFormPhone(''); setFormEventType(''); setFormReminderDate('');
    setCreationType(null);
  };

  // ── Auth + initial fetch ────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/login'); return; }
    try {
      const parsed = JSON.parse(raw);
      const vid = parsed.vendorId || parsed.id;
      if (!vid) { window.location.replace('/vendor/login'); return; }
      setVendorId(vid);
    } catch { window.location.replace('/vendor/login'); }
  }, []);

  const fetchBookings = useCallback(async (vid: string) => {
    try {
      const [bookingsRes, availRes] = await Promise.all([
        fetch(`${BACKEND}/api/bookings/vendor/${vid}`),
        fetch(`${BACKEND}/api/vendor-discover/availability/${vid}`),
      ]);
      const [json, availJson] = await Promise.all([
        bookingsRes.json(),
        availRes.json(),
      ]);

      if (json.success && Array.isArray(json.data)) {
        setBookings(json.data);
      }

      const blocked = new Set<string>();

      if (json.success && Array.isArray(json.data)) {
        json.data.forEach((b: Booking) => {
          if (b.status === 'blocked') {
            const d = new Date(b.event_date);
            blocked.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
          }
        });
      }

      if (availJson.success && Array.isArray(availJson.data)) {
        setAvailBlocks(availJson.data);
        availJson.data.forEach((b: AvailBlock) => {
          if (!b.blocked_date) return;
          const [y, m, d] = b.blocked_date.split('-').map(Number);
          blocked.add(`${y}-${m - 1}-${d}`);
        });
      }

      setBlockedDates(blocked);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (vendorId) fetchBookings(vendorId);
  }, [vendorId, fetchBookings]);

  const fetchHotDates = useCallback(async () => {
    try {
      const from = new Date();
      from.setMonth(from.getMonth() - 1);
      const to = new Date();
      to.setMonth(to.getMonth() + 13);
      const r = await fetch(
        `${BACKEND}/api/v2/hot-dates?from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}`
      );
      const d = await r.json();
      if (d.success) {
        const map = new Map<string, { label: string; intensity: string }>();
        (d.data || []).forEach((hd: any) => { map.set(hd.date, { label: hd.label, intensity: hd.intensity }); });
        setHotDates(map);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (vendorId) fetchHotDates();
  }, [vendorId, fetchHotDates]);

  // ── Calendar computed values ────────────────────────────
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const bookingDates = new Set(
    bookings
      .filter(b => b.status !== 'blocked')
      .map(b => {
        const d = new Date(b.event_date);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
  );

  const upcoming = [...bookings]
    .filter(b => b.status !== 'blocked' && new Date(b.event_date) >= new Date(today.toDateString()))
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  // ── Form submit ─────────────────────────────────────────
  const submitForm = async () => {
    if (!vendorId) return;
    setFabLoading(true);
    try {
      if (creationType === 'task' || creationType === 'todo') {
        await fetch(`${BACKEND}/api/todos/${vendorId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorId,
            title: formTitle,
            ...(formDate ? { due_date: formDate } : {}),
            notes: formNote,
            type: creationType,
          }),
        });
        showToast(creationType === 'task' ? 'Task added.' : 'To-do added.');
      } else if (creationType === 'booking') {
        await fetch(`${BACKEND}/api/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendor_id: vendorId,
            client_name: formTitle,
            client_phone: formPhone,
            event_type: formEventType,
            event_date: formDate,
            notes: formNote,
            status: 'potential',
          }),
        });
        if (formReminderDate) {
          await fetch(`${BACKEND}/api/todos/${vendorId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vendorId,
              title: `Follow up with ${formTitle}`,
              due_date: formReminderDate,
              type: 'reminder',
            }),
          });
        }
        showToast('Booking added.');
        await fetchBookings(vendorId);
      } else if (creationType === 'block') {
        await fetch(`${BACKEND}/api/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendor_id: vendorId,
            event_date: formDate,
            notes: formNote,
            status: 'blocked',
            client_name: 'Blocked',
          }),
        });
        showToast('Date blocked.');
        await fetchBookings(vendorId);
      }
      resetForm();
      setFabOpen(false);
    } catch {
      showToast('Something went wrong. Try again.');
    }
    setFabLoading(false);
  };

  const typeLabels: Record<string, string> = {
    task: 'Task', todo: 'To-Do', booking: 'Booking', block: 'Block Date',
  };

  const submitLabels: Record<string, string> = {
    task: 'ADD TASK', todo: 'ADD TO-DO', booking: 'ADD BOOKING', block: 'BLOCK DATE',
  };

  const isFormValid = () => {
    if (!creationType) return false;
    if (creationType === 'task') return formTitle.trim().length > 0;
    if (creationType === 'todo') return formTitle.trim().length > 0;
    if (creationType === 'booking') return formTitle.trim().length > 0 && formDate.length > 0;
    if (creationType === 'block') return formDate.length > 0;
    return false;
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', background: 'transparent', outline: 'none',
    borderBottom: '1px solid #E2DED8', fontFamily: "'DM Sans', sans-serif",
    fontSize: 13, fontWeight: 300, color: '#111111', padding: '10px 0',
    marginBottom: 20, display: 'block',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
    letterSpacing: '0.22em', textTransform: 'uppercase' as const,
    color: '#888580', display: 'block', marginBottom: 6,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes calToast { from{opacity:0;transform:translateY(-40px) translateX(-50%)} to{opacity:1;transform:translateY(0) translateX(-50%)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.4; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, left: '50%',
          transform: 'translateX(-50%)',
          background: '#111111', color: '#F8F7F5',
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
          padding: '10px 16px', borderRadius: 8, zIndex: 400,
          animation: 'calToast 280ms cubic-bezier(0.22,1,0.36,1)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>{toast}</div>
      )}

      <div style={{
        background: '#F8F7F5', minHeight: '100dvh',
        paddingBottom: 'calc(64px + env(safe-area-inset-bottom) + 80px)',
      }}>

        {/* Back + Header */}
        <div style={{ padding: '24px 24px 0' }}>
          <button
            onClick={() => router.back()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, marginBottom: 20, touchAction: 'manipulation',
            }}
          >
            <ArrowLeft size={20} strokeWidth={1.5} color="#111111" />
          </button>

          <p style={{
            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
            letterSpacing: '0.25em', textTransform: 'uppercase',
            color: '#888580', margin: '0 0 6px',
          }}>YOUR STUDIO</p>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300,
            color: '#111111', margin: '0 0 28px', lineHeight: 1.1,
          }}>Calendar</h1>
        </div>

        {/* Month navigator */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', marginBottom: 16,
        }}>
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', touchAction: 'manipulation', padding: 4 }}
          >
            <ChevronLeft size={18} strokeWidth={1.5} color="#555250" />
          </button>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: '#111111',
          }}>{monthName} {year}</span>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', touchAction: 'manipulation', padding: 4 }}
          >
            <ChevronRight size={18} strokeWidth={1.5} color="#555250" />
          </button>
        </div>

        {/* Day headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
          padding: '0 24px', marginBottom: 8,
        }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} style={{
              fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              color: '#888580', textAlign: 'center', padding: '4px 0',
            }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div style={{ padding: '0 24px' }}>
            <div style={{ ...shimmerStyle, height: 200, borderRadius: 8 }} />
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
            padding: '0 24px', gap: 2,
          }}>
            {days.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;

              const key = `${year}-${month}-${day}`;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const hasBooking = bookingDates.has(key);
              const isBlocked = blockedDates.has(key);
              const isHotDate = hotDates.has(dateStr);
              const hotDateInfo = isHotDate ? hotDates.get(dateStr)! : null;
              const hotColour = hotDateInfo?.intensity === 'peak' ? '#FF6B35' : hotDateInfo?.intensity === 'high' ? '#C9A84C' : '#D4A96A';

              return (
                <div
                  key={key}
                  onClick={() => {
                    const hasUserEvent = hasBooking || isBlocked;
                    if (hasUserEvent) {
                      // User event always wins — show unified day sheet
                      setSelectedBlock({ id: dateStr, blocked_date: dateStr, reason: null } as AvailBlock);
                    } else if (isHotDate && hotDateInfo) {
                      setSelectedHotDate({ date: dateStr, ...hotDateInfo });
                    }
                  }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '6px 0', position: 'relative',
                    background: isHotDate
                      ? hotDateInfo?.intensity === 'peak' ? 'rgba(255,107,53,0.08)' : 'rgba(201,168,76,0.08)'
                      : 'transparent',
                    border: isHotDate ? `1px solid ${hotColour}44` : '1px solid transparent',
                    borderRadius: 6,
                    cursor: hasBooking || isBlocked || isHotDate ? 'pointer' : 'default',
                  }}
                >
                  {isHotDate && (
                    <span style={{
                      position: 'absolute', top: 2, right: 3,
                      fontSize: 7, lineHeight: 1,
                      opacity: hotDateInfo?.intensity === 'peak' ? 1 : 0.7,
                    }}>🔥</span>
                  )}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isToday ? '#111111' : 'transparent',
                  }}>
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                      color: isToday ? '#F8F7F5' : '#111111',
                    }}>{day}</span>
                  </div>
                  {hasBooking && !isBlocked && (
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#C9A84C', marginTop: 2 }} />
                  )}
                  {isBlocked && (
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 400, color: '#9B4545', marginTop: 1, lineHeight: 1 }}>×</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, padding: '12px 24px 0', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C' }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#888580' }}>Booking</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9B4545', fontWeight: 400 }}>×</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#888580' }}>Blocked</span>
          </div>
          {hotDates.size > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#FF6B35' }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#888580' }}>Peak muhurat</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#C9A84C' }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#888580' }}>High demand</span>
              </div>
            </>
          )}
        </div>

        {/* Export Calendar */}
        {vendorId && (
          <div style={{ padding: '16px 24px 0' }}>
            <button
              onClick={() => {
                const url = `${BACKEND}/api/v2/vendor/calendar.ics/${vendorId}`;
                window.open(url, '_blank');
              }}
              style={{
                width: '100%',
                border: '0.5px solid #E2DED8',
                background: 'transparent',
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <p style={{
                  fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
                  letterSpacing: '0.22em', textTransform: 'uppercase' as const,
                  color: '#888580', margin: '0 0 3px',
                }}>SYNC YOUR CALENDAR</p>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                  color: '#111111', margin: 0,
                }}>Export to Apple / Google Calendar</p>
              </div>
              <span style={{
                fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
                letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                color: '#C9A84C',
              }}>↓ .ICS</span>
            </button>
          </div>
        )}

        {/* Import Calendar */}
        {vendorId && (
          <div style={{ padding: '8px 24px 0' }}>
            {!importMode ? (
              <button
                onClick={() => { setImportMode(true); setImportResult(null); }}
                style={{
                  width: '100%', border: '0.5px solid #E2DED8',
                  background: 'transparent', borderRadius: 10,
                  padding: '12px 16px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', cursor: 'pointer', touchAction: 'manipulation',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <p style={{
                    fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
                    letterSpacing: '0.22em', textTransform: 'uppercase' as const,
                    color: '#888580', margin: '0 0 3px',
                  }}>IMPORT YOUR CALENDAR</p>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                    color: '#111111', margin: 0,
                  }}>Upload Apple / Google Calendar file</p>
                </div>
                <span style={{
                  fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
                  letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                  color: '#C9A84C',
                }}>↑ .ICS</span>
              </button>
            ) : (
              <div style={{ border: '0.5px solid #E2DED8', borderRadius: 10, padding: '16px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 300, color: '#111111', margin: 0 }}>Import Calendar</p>
                  <button onClick={() => { setImportMode(false); setImportResult(null); }} style={{ background: 'none', border: 'none', color: '#888580', fontSize: 18, cursor: 'pointer' }}>×</button>
                </div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: '0 0 4px', lineHeight: 1.6 }}>
                  <strong style={{ color: '#111', fontWeight: 400 }}>Google Calendar:</strong> Open Google Calendar on desktop → Settings → select your calendar → scroll to &quot;Export calendar&quot; → upload the .ics file below.
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: '0 0 14px', lineHeight: 1.6 }}>
                  <strong style={{ color: '#111', fontWeight: 400 }}>Apple Calendar:</strong> Open Calendar on Mac → File → Export → Export → upload the .ics file below.
                </p>
                <label style={{
                  display: 'block', width: '100%',
                  border: '0.5px dashed #C9A84C', borderRadius: 8,
                  padding: '14px', textAlign: 'center' as const,
                  cursor: 'pointer', touchAction: 'manipulation',
                }}>
                  <input
                    type="file"
                    accept=".ics"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleIcsImport(file);
                    }}
                  />
                  <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#C9A84C', margin: '0 0 4px' }}>
                    {importLoading ? 'Importing...' : 'TAP TO SELECT FILE'}
                  </p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: 0 }}>
                    .ics files only
                  </p>
                </label>
                {importResult && (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: importResult.startsWith('✓') ? '#111111' : '#9B4545', margin: '10px 0 0', textAlign: 'center' as const }}>
                    {importResult}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Hot Date nudge card */}
        {/* Unified day sheet — shows all events on tapped date */}
        {selectedBlock && (() => {
          const tapDate = selectedBlock.blocked_date;
          const dayBookings = bookings.filter(b => b.event_date && b.event_date.slice(0,10) === tapDate);
          const dayBlocks = availBlocks.filter(b => b.blocked_date === tapDate);
          const hotInfo = hotDates.get(tapDate);
          const displayDate = new Date(tapDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
              <div onClick={() => setSelectedBlock(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(12,10,9,0.4)' }} />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: '#F8F7F5', borderRadius: '20px 20px 0 0',
                padding: '20px 20px calc(env(safe-area-inset-bottom,16px) + 24px)',
              }}>
                <div style={{ width: 32, height: 3, borderRadius: 2, background: '#D8D4CE', margin: '0 auto 16px' }} />
                {/* Date header */}
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: '0 0 2px' }}>
                  {displayDate}
                </p>
                {hotInfo && (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 300, color: hotInfo.intensity === 'peak' ? '#FF6B35' : '#C9A84C', margin: '0 0 12px' }}>
                    🔥 {hotInfo.intensity === 'peak' ? 'Peak muhurat' : 'High demand day'}{hotInfo.label ? ` — ${hotInfo.label}` : ''}
                  </p>
                )}
                {!hotInfo && <div style={{ marginBottom: 12 }} />}
                {/* Events list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dayBookings.map(b => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFFFFF', borderRadius: 10, padding: '10px 14px', border: '0.5px solid #E2DED8' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A84C', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 400, color: '#111111', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.client_name}</p>
                        {b.event_type && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 300, color: '#888580', margin: 0 }}>{b.event_type}</p>}
                      </div>
                      <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A84C', flexShrink: 0 }}>Booking</span>
                    </div>
                  ))}
                  {dayBlocks.map(b => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFFFFF', borderRadius: 10, padding: '10px 14px', border: '0.5px solid #E2DED8' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 3, background: '#9B4545', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 400, color: '#111111', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.reason ? b.reason.replace('Imported: ', '') : 'Blocked'}</p>
                      </div>
                      <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B4545', flexShrink: 0 }}>Blocked</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedBlock(null)}
                  style={{ width: '100%', height: 40, borderRadius: 100, border: '0.5px solid #E2DED8', background: 'transparent', fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888580', cursor: 'pointer', marginTop: 16 }}
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}

        {selectedHotDate && (
          <div style={{
            position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 50,
            background: '#0C0A09',
            border: `1px solid ${selectedHotDate.intensity === 'peak' ? '#FF6B35' : '#C9A84C'}44`,
            borderRadius: 14, padding: '16px 18px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>🔥</span>
                  <span style={{
                    fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 400,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    color: selectedHotDate.intensity === 'peak' ? '#FF6B35' : '#C9A84C',
                  }}>{selectedHotDate.intensity === 'peak' ? 'Peak Demand Day' : 'High Demand Day'}</span>
                </div>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 300, color: '#F8F7F5', margin: '0 0 6px' }}>{selectedHotDate.label}</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: 'rgba(248,247,245,0.5)', margin: 0, lineHeight: 1.5 }}>
                  This is an auspicious Hindu wedding date. Demand from couples is significantly higher. Consider adjusting your pricing for this date.
                </p>
              </div>
              <button onClick={() => setSelectedHotDate(null)} style={{ background: 'none', border: 'none', color: 'rgba(248,247,245,0.3)', fontSize: 18, cursor: 'pointer', padding: '0 0 0 12px', flexShrink: 0 }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
              <button
                onClick={() => {
                  setSelectedHotDate(null);
                  setFormDate(selectedHotDate.date);
                  setCreationType('booking');
                  setFabOpen(true);
                }}
                style={{
                  fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 400,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: '#0C0A09', background: '#C9A84C',
                  border: 'none', borderRadius: 100, padding: '8px 16px',
                  cursor: 'pointer', touchAction: 'manipulation',
                }}
              >Block This Date →</button>
              <button onClick={() => setSelectedHotDate(null)} style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(248,247,245,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}>Dismiss</button>
            </div>
          </div>
        )}

        {/* Upcoming section */}
        <div style={{ padding: '28px 24px 0' }}>
          <p style={{
            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
            letterSpacing: '0.25em', textTransform: 'uppercase',
            color: '#888580', margin: '0 0 14px',
          }}>UPCOMING</p>

          {loading ? (
            <>
              {[0,1,2].map(i => (
                <div key={i} style={{ ...shimmerStyle, height: 52, borderRadius: 8, marginBottom: 8 }} />
              ))}
            </>
          ) : upcoming.length === 0 ? (
            <p style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 300,
              fontStyle: 'italic', color: '#888580', margin: 0,
            }}>Nothing scheduled yet.</p>
          ) : (
            upcoming.map((b, i) => (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '12px 0',
                borderBottom: i < upcoming.length - 1 ? '1px solid #E2DED8' : 'none',
              }}>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 300,
                  color: '#888580', flexShrink: 0, minWidth: 48,
                }}>{formatDate(b.event_date)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 400,
                    color: '#111111', margin: '0 0 2px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{b.event_type || 'Event'} — {b.client_name}</p>
                  {b.venue && (
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
                      color: '#888580', margin: 0,
                    }}>{b.venue}</p>
                  )}
                </div>
                <span style={{
                  fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  color: b.status === 'confirmed' ? '#111111' : '#888580',
                  flexShrink: 0,
                }}>{b.status}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── FAB ─────────────────────────────────────────────────── */}
      <button
        onClick={() => { setFabOpen(true); setCreationType(null); }}
        style={{
          position: 'fixed',
          bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)',
          right: 24, width: 52, height: 52, borderRadius: '50%',
          background: '#111111', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 90, touchAction: 'manipulation',
          willChange: 'transform', transform: 'translateZ(0)',
        }}
      >
        <Plus size={20} color="#F8F7F5" strokeWidth={1.5} />
      </button>

      {/* ── FAB Sheet Backdrop ───────────────────────────────────── */}
      {fabOpen && (
        <div
          onClick={() => { setFabOpen(false); resetForm(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(17,17,17,0.4)',
            willChange: 'opacity',
          }}
        />
      )}

      {/* ── FAB Sheet ────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: '#FFFFFF', borderRadius: '24px 24px 0 0',
        transform: fabOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)',
        willChange: 'transform',
        maxHeight: '80dvh', overflowY: 'auto',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
      }}>
        {/* Handle */}
        <div style={{
          width: 36, height: 4, background: '#E2DED8',
          borderRadius: 2, margin: '12px auto 0', display: 'block',
        }} />

        {/* STEP 1 — Type selector */}
        {creationType === null && (
          <>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300,
              color: '#111111', padding: '20px 24px 16px', margin: 0,
            }}>What would you like to add?</p>

            {[
              {
                type: 'task' as CreationType,
                Icon: CheckSquare,
                title: 'Task',
                sub: 'Add a to-do for yourself',
              },
              {
                type: 'todo' as CreationType,
                Icon: ListTodo,
                title: 'To-Do',
                sub: 'Quick reminder with no date',
              },
              {
                type: 'booking' as CreationType,
                Icon: CalendarPlus,
                title: 'Booking',
                sub: 'Add a potential client with follow-up reminder',
              },
              {
                type: 'block' as CreationType,
                Icon: Ban,
                title: 'Block Date',
                sub: 'Reserve a date with a note, no client needed',
              },
            ].map((opt, i, arr) => (
              <div
                key={opt.title}
                onClick={() => setCreationType(opt.type)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 24px', cursor: 'pointer', touchAction: 'manipulation',
                  borderBottom: i < arr.length - 1 ? '1px solid #E2DED8' : 'none',
                }}
              >
                <opt.Icon size={20} strokeWidth={1.5} color="#888580" />
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 400,
                    color: '#111111', margin: '0 0 2px',
                  }}>{opt.title}</p>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
                    color: '#888580', margin: 0,
                  }}>{opt.sub}</p>
                </div>
                <ChevronRight size={16} strokeWidth={1.5} color="#C8C4BE" />
              </div>
            ))}
          </>
        )}

        {/* STEP 2 — Form */}
        {creationType !== null && (
          <div style={{ padding: '0 24px' }}>
            {/* Back + title row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '20px 0 16px',
            }}>
              <button
                onClick={() => setCreationType(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, touchAction: 'manipulation', display: 'flex',
                }}
              >
                <ArrowLeft size={18} strokeWidth={1.5} color="#111111" />
              </button>
              <span style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 22,
                fontWeight: 300, color: '#111111',
              }}>{typeLabels[creationType]}</span>
            </div>

            {/* TASK fields */}
            {creationType === 'task' && (
              <>
                <label style={labelStyle}>Title *</label>
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Confirm team for Sharma wedding"
                  style={{ ...fieldStyle, border: 'none' }} />
                <label style={labelStyle}>Due Date</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                  style={{ ...fieldStyle, border: 'none' }} />
                <label style={labelStyle}>Note</label>
                <textarea value={formNote} onChange={e => setFormNote(e.target.value)}
                  placeholder="Optional notes..."
                  style={{ ...fieldStyle, border: 'none', minHeight: 72, resize: 'none', lineHeight: 1.5 }} />
              </>
            )}

            {/* TODO fields */}
            {creationType === 'todo' && (
              <>
                <label style={labelStyle}>Title *</label>
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Buy extra batteries"
                  style={{ ...fieldStyle, border: 'none' }} />
                <label style={labelStyle}>Note</label>
                <textarea value={formNote} onChange={e => setFormNote(e.target.value)}
                  placeholder="Optional notes..."
                  style={{ ...fieldStyle, border: 'none', minHeight: 72, resize: 'none', lineHeight: 1.5 }} />
              </>
            )}

            {/* BOOKING fields */}
            {creationType === 'booking' && (
              <>
                <label style={labelStyle}>Client Name *</label>
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Priya Mehta"
                  style={{ ...fieldStyle, border: 'none' }} />
                <label style={labelStyle}>Phone</label>
                <input type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)}
                  placeholder="10-digit number"
                  style={{ ...fieldStyle, border: 'none' }} />
                <label style={labelStyle}>Event Type</label>
                <input value={formEventType} onChange={e => setFormEventType(e.target.value)}
                  placeholder="e.g. Wedding, Pre-Wedding"
                  style={{ ...fieldStyle, border: 'none' }} />
                <label style={labelStyle}>Event Date *</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                  style={{ ...fieldStyle, border: 'none' }} />
                <label style={labelStyle}>Follow-up Reminder</label>
                <input type="date" value={formReminderDate} onChange={e => setFormReminderDate(e.target.value)}
                  style={{ ...fieldStyle, border: 'none' }} />
                <label style={labelStyle}>Note</label>
                <textarea value={formNote} onChange={e => setFormNote(e.target.value)}
                  placeholder="Any notes about this potential client..."
                  style={{ ...fieldStyle, border: 'none', minHeight: 72, resize: 'none', lineHeight: 1.5 }} />
              </>
            )}

            {/* BLOCK DATE fields */}
            {creationType === 'block' && (
              <>
                <label style={labelStyle}>Date *</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                  style={{ ...fieldStyle, border: 'none' }} />
                <label style={labelStyle}>Reason / Note</label>
                <textarea value={formNote} onChange={e => setFormNote(e.target.value)}
                  placeholder="e.g. Personal commitment, Travel, Hold for client"
                  style={{ ...fieldStyle, border: 'none', minHeight: 96, resize: 'none', lineHeight: 1.5 }} />
              </>
            )}

            {/* Submit */}
            <button
              onClick={submitForm}
              disabled={fabLoading || !isFormValid()}
              style={{
                width: '100%', background: '#111111', color: '#F8F7F5',
                border: 'none', padding: '14px 0',
                fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                cursor: isFormValid() && !fabLoading ? 'pointer' : 'default',
                opacity: isFormValid() && !fabLoading ? 1 : 0.5,
                touchAction: 'manipulation', marginTop: 8, borderRadius: 0,
                transition: 'opacity 200ms cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              {fabLoading ? 'Saving...' : submitLabels[creationType]}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
