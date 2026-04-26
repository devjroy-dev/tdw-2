'use client';
import { useEffect, useState, useCallback } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const HEADERS = { 'Content-Type': 'application/json', 'x-admin-password': 'Mira@2551354' };

interface HotDate {
  id: string;
  date: string;
  label: string;
  intensity: 'medium' | 'high' | 'peak';
  active: boolean;
  created_at: string;
}

const INTENSITY_COLOURS: Record<string, string> = {
  peak: '#FF6B35',
  high: '#C9A84C',
  medium: '#D4A96A',
};

const INTENSITY_BG: Record<string, string> = {
  peak: 'rgba(255,107,53,0.10)',
  high: 'rgba(201,168,76,0.10)',
  medium: 'rgba(212,169,106,0.10)',
};

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function groupByMonth(dates: HotDate[]): Record<string, HotDate[]> {
  const groups: Record<string, HotDate[]> = {};
  dates.forEach(d => {
    const key = d.date.slice(0, 7); // YYYY-MM
    if (!groups[key]) groups[key] = [];
    groups[key].push(d);
  });
  return groups;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

export default function HotDatesPage() {
  const [dates, setDates] = useState<HotDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Add form
  const [newDate, setNewDate] = useState('');
  const [newLabel, setNewLabel] = useState('Vivah Muhurat');
  const [newIntensity, setNewIntensity] = useState<'medium' | 'high' | 'peak'>('high');
  const [adding, setAdding] = useState(false);

  // Bulk import
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v2/admin/hot-dates`, { headers: HEADERS });
      const d = await r.json();
      if (d.success) setDates(d.data || []);
    } catch { showToast('Failed to load dates'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newDate) return;
    setAdding(true);
    try {
      const r = await fetch(`${API}/api/v2/admin/hot-dates`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ date: newDate, label: newLabel || 'Vivah Muhurat', intensity: newIntensity }),
      });
      const d = await r.json();
      if (d.success) {
        setDates(prev => [...prev, d.data].sort((a, b) => a.date.localeCompare(b.date)));
        setNewDate(''); setNewLabel('Vivah Muhurat'); setNewIntensity('high');
        showToast('Date added.');
      } else { showToast(d.error || 'Failed to add'); }
    } catch { showToast('Error adding date'); }
    setAdding(false);
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      const r = await fetch(`${API}/api/v2/admin/hot-dates/${id}`, {
        method: 'PATCH', headers: HEADERS,
        body: JSON.stringify({ active: !current }),
      });
      const d = await r.json();
      if (d.success) setDates(prev => prev.map(x => x.id === id ? { ...x, active: !current } : x));
    } catch { showToast('Toggle failed'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const r = await fetch(`${API}/api/v2/admin/hot-dates/${id}`, { method: 'DELETE', headers: HEADERS });
      const d = await r.json();
      if (d.success) { setDates(prev => prev.filter(x => x.id !== id)); showToast('Deleted.'); }
      else showToast(d.error || 'Delete failed');
    } catch { showToast('Delete failed'); }
    setConfirmDelete(null);
  };

  const handleBulkImport = async () => {
    const rawDates = bulkText.split(/[\n,]+/).map(s => s.trim()).filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s));
    if (rawDates.length === 0) { showToast('No valid dates found (format: YYYY-MM-DD)'); return; }
    setBulkLoading(true);
    let added = 0;
    for (const date of rawDates) {
      try {
        const r = await fetch(`${API}/api/v2/admin/hot-dates`, {
          method: 'POST', headers: HEADERS,
          body: JSON.stringify({ date, label: 'Vivah Muhurat', intensity: 'high' }),
        });
        const d = await r.json();
        if (d.success) added++;
      } catch {}
    }
    showToast(`Added ${added} of ${rawDates.length} dates.`);
    setBulkText(''); setBulkOpen(false); setBulkLoading(false);
    load();
  };

  const handleExportCSV = () => {
    const active = dates.filter(d => d.active);
    const rows = ['date,label,intensity', ...active.map(d => `${d.date},${d.label},${d.intensity}`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tdw_hot_dates.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const now = new Date().toISOString().split('T')[0];
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const thisYear = new Date().getFullYear().toString();
  const totalThisYear = dates.filter(d => d.date.startsWith(thisYear)).length;
  const peakCount = dates.filter(d => d.intensity === 'peak').length;
  const activeCount = dates.filter(d => d.active).length;
  const upcoming30 = dates.filter(d => d.active && d.date >= now && d.date <= in30).length;

  const groups = groupByMonth(dates);

  return (
    <>
      <style>{`
        @keyframes toastIn { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
      `}</style>

      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#111111', color: '#F8F7F5', borderRadius: 8,
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
          padding: '10px 18px', zIndex: 999, whiteSpace: 'nowrap',
          animation: 'toastIn 240ms cubic-bezier(0.22,1,0.36,1)',
          pointerEvents: 'none',
        }}>{toast}</div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 24, maxWidth: 340, width: '100%' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 400, color: '#111111', margin: '0 0 8px' }}>Delete this date?</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: '0 0 20px' }}>This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleDelete(confirmDelete)} style={{ flex: 1, height: 40, background: '#111111', color: '#F8F7F5', border: 'none', borderRadius: 8, fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>Delete</button>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, height: 40, background: 'transparent', color: '#111111', border: '0.5px solid #E2DED8', borderRadius: 8, fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk import modal */}
      {bulkOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 24, maxWidth: 440, width: '100%' }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: '#111111', margin: '0 0 6px' }}>Bulk Import Dates</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: '0 0 14px' }}>Paste dates as YYYY-MM-DD, one per line or comma-separated. All imported as Vivah Muhurat / High.</p>
            <textarea
              value={bulkText} onChange={e => setBulkText(e.target.value)}
              placeholder={'2027-01-15\n2027-01-16\n2027-01-22'}
              style={{ width: '100%', height: 140, border: '0.5px solid #E2DED8', borderRadius: 8, padding: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, resize: 'vertical', outline: 'none', color: '#111111', background: '#FAFAFA', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={handleBulkImport} disabled={bulkLoading} style={{ flex: 1, height: 40, background: '#C9A84C', color: '#0C0A09', border: 'none', borderRadius: 8, fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', opacity: bulkLoading ? 0.6 : 1 }}>{bulkLoading ? 'Importing...' : 'Import'}</button>
              <button onClick={() => { setBulkOpen(false); setBulkText(''); }} style={{ flex: 1, height: 40, background: 'transparent', color: '#111111', border: '0.5px solid #E2DED8', borderRadius: 8, fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#888580', margin: '0 0 4px' }}>PLATFORM</p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: '#111111', margin: '0 0 4px' }}>🔥 Hot Dates</h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: 0 }}>Hindu Vivah Muhurat dates — glowing on vendor calendars</p>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total this year', value: totalThisYear },
          { label: 'Peak dates', value: peakCount },
          { label: 'Active', value: activeCount },
          { label: 'Next 30 days', value: upcoming30 },
        ].map(s => (
          <div key={s.label} style={{ background: '#F8F7F5', border: '0.5px solid #E2DED8', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: '#111111', margin: '0 0 2px' }}>{s.value}</p>
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888580', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, alignItems: 'start' }}>

        {/* LEFT — Add form */}
        <div style={{ background: '#F8F7F5', border: '0.5px solid #E2DED8', borderRadius: 12, padding: 20 }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 300, color: '#111111', margin: '0 0 18px' }}>Add New Date</p>

          <label style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888580', display: 'block', marginBottom: 6 }}>Date</label>
          <input
            type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
            style={{ width: '100%', border: 'none', borderBottom: '1px solid #E2DED8', background: 'transparent', padding: '8px 0', marginBottom: 18, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#111111', outline: 'none', display: 'block', boxSizing: 'border-box' }}
          />

          <label style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888580', display: 'block', marginBottom: 6 }}>Label</label>
          <input
            value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Vivah Muhurat"
            style={{ width: '100%', border: 'none', borderBottom: '1px solid #E2DED8', background: 'transparent', padding: '8px 0', marginBottom: 18, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#111111', outline: 'none', display: 'block', boxSizing: 'border-box' }}
          />

          <label style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888580', display: 'block', marginBottom: 8 }}>Intensity</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {(['medium', 'high', 'peak'] as const).map(i => (
              <button key={i} onClick={() => setNewIntensity(i)} style={{
                flex: 1, height: 34, border: `1px solid ${newIntensity === i ? INTENSITY_COLOURS[i] : '#E2DED8'}`,
                borderRadius: 6, background: newIntensity === i ? INTENSITY_BG[i] : 'transparent',
                color: newIntensity === i ? INTENSITY_COLOURS[i] : '#888580',
                fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: newIntensity === i ? 400 : 300,
                letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
                transition: 'all 150ms ease',
              }}>{i}</button>
            ))}
          </div>

          <button
            onClick={handleAdd} disabled={adding || !newDate}
            style={{ width: '100%', height: 42, background: newDate ? '#C9A84C' : '#E2DED8', color: newDate ? '#0C0A09' : '#888580', border: 'none', borderRadius: 8, fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 400, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: newDate ? 'pointer' : 'default', transition: 'all 150ms ease' }}
          >{adding ? 'Adding...' : 'Add Hot Date'}</button>

          {/* Bulk actions */}
          <div style={{ borderTop: '0.5px solid #E2DED8', marginTop: 20, paddingTop: 18 }}>
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888580', margin: '0 0 10px' }}>Bulk Actions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => setBulkOpen(true)} style={{ height: 36, background: 'transparent', border: '0.5px solid #E2DED8', borderRadius: 6, color: '#111111', fontFamily: "'Jost', sans-serif", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>Import Next Year</button>
              <button onClick={handleExportCSV} style={{ height: 36, background: 'transparent', border: '0.5px solid #E2DED8', borderRadius: 6, color: '#111111', fontFamily: "'Jost', sans-serif", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>Export CSV</button>
            </div>
          </div>
        </div>

        {/* RIGHT — Dates list */}
        <div>
          {loading ? (
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#888580' }}>Loading...</div>
          ) : dates.length === 0 ? (
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 300, fontStyle: 'italic', color: '#888580' }}>No dates yet. Add your first above.</div>
          ) : (
            Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([key, items]) => (
              <div key={key} style={{ marginBottom: 28 }}>
                <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#888580', margin: '0 0 10px' }}>{monthLabel(key)}</p>
                <div style={{ border: '0.5px solid #E2DED8', borderRadius: 10, overflow: 'hidden' }}>
                  {items.map((item, i) => (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px',
                      borderBottom: i < items.length - 1 ? '0.5px solid #E2DED8' : 'none',
                      background: '#FFFFFF',
                      opacity: item.active ? 1 : 0.45,
                    }}>
                      {/* Intensity dot */}
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: INTENSITY_COLOURS[item.intensity], flexShrink: 0 }} />

                      {/* Date + label */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
                          color: '#111111', margin: '0 0 2px',
                          textDecoration: item.active ? 'none' : 'line-through',
                        }}>{fmtDate(item.date)}</p>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: 0 }}>{item.label}</p>
                      </div>

                      {/* Intensity badge */}
                      <span style={{
                        fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 400,
                        letterSpacing: '0.15em', textTransform: 'uppercase',
                        color: INTENSITY_COLOURS[item.intensity],
                        background: INTENSITY_BG[item.intensity],
                        border: `0.5px solid ${INTENSITY_COLOURS[item.intensity]}44`,
                        borderRadius: 100, padding: '2px 8px', flexShrink: 0,
                      }}>{item.intensity}</span>

                      {/* Active toggle */}
                      <button
                        onClick={() => handleToggle(item.id, item.active)}
                        style={{
                          width: 36, height: 20, borderRadius: 10,
                          background: item.active ? '#C9A84C' : '#E2DED8',
                          border: 'none', cursor: 'pointer', position: 'relative',
                          transition: 'background 200ms ease', flexShrink: 0,
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: 3,
                          left: item.active ? 18 : 3,
                          width: 14, height: 14, borderRadius: '50%',
                          background: '#FFFFFF',
                          transition: 'left 200ms ease',
                        }} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setConfirmDelete(item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CCCCCC', fontSize: 16, padding: '0 2px', flexShrink: 0 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mobile layout override */}
      <style>{`
        @media (max-width: 767px) {
          div[style*="grid-template-columns: 1fr 2fr"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="repeat(4, 1fr)"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </>
  );
}
