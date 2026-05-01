'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const RAILWAY_URL = 'https://dream-wedding-production-89ae.up.railway.app';

function renderMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <>
    {parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ fontWeight: 500 }}>{part.slice(2, -2)}</strong>;
      }
      return part.split('\n').map((line, j, arr) => (
        <React.Fragment key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</React.Fragment>
      ));
    })}
  </>;
}

// ─── CRITICAL: DB FIELD NAME INCONSISTENCY ────────────────────────────────────
// v2 GET endpoints filter Supabase with `user_id`.
// POST/PATCH/DELETE endpoints send `couple_id` in request body.
// Both are the SAME value: session.id from localStorage couple_session.
// Reading  →  user_id
// Writing  →  couple_id
// couple_expenses columns: `description` = purpose, `event` = event_name,
//   `payment_status` = status, `actual_amount` = displayed amount
// events v2 GET uses couple_id despite being a v2 endpoint — do not change.
// NEVER rename any of these. NEVER normalise without a full DB migration.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Session ──────────────────────────────────────────────────────────────────
interface CoupleSession {
  id: string;
  name?: string;
  dreamer_type?: string;
}

function getSession(): CoupleSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('couple_session') || localStorage.getItem('couple_web_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'tasks' | 'money' | 'vendors' | 'people' | 'events' | 'muse';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  event_name?: string;
  events?: { name: string };
  assigned_to?: string;   // vendor free-text
  notes?: string;
  is_complete?: boolean;
}

// ─── Shimmer ──────────────────────────────────────────────────────────────────
function Shimmer({ h, w = '100%', br = 8, mt = 0 }: { h: number; w?: string | number; br?: number; mt?: number }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: br, marginTop: mt,
      background: 'linear-gradient(90deg,#EEECE8 25%,#F8F7F5 50%,#EEECE8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      willChange: 'background-position',
    }} />
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 100, left: '50%',
      transform: 'translateX(-50%) translateZ(0)',
      background: '#111111', color: '#F8F7F5',
      fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
      padding: '12px 20px', borderRadius: 100, zIndex: 999,
      whiteSpace: 'nowrap', willChange: 'transform',
    }}>{msg}</div>
  );
}

// ─── Shared sheet field styles ─────────────────────────────────────────────────
const fieldLabel: React.CSSProperties = {
  fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300,
  textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888580',
  marginBottom: 4, display: 'block',
};
const fieldInput: React.CSSProperties = {
  width: '100%', height: 48,
  fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
  color: '#111111', background: 'transparent',
  border: 'none', borderBottom: '1px solid #E2DED8',
  outline: 'none', padding: '0 4px',
};
const fieldWrapper: React.CSSProperties = { marginBottom: 20 };
const pillGroup: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' };

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <button onClick={onPress} style={{
      fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '5px 12px', borderRadius: 100, cursor: 'pointer',
      touchAction: 'manipulation',
      border: active ? 'none' : '1px solid #E2DED8',
      background: active ? '#111111' : 'transparent',
      color: active ? '#F8F7F5' : '#888580',
    }}>{label}</button>
  );
}

function submitBtn(disabled: boolean): React.CSSProperties {
  return {
    width: '100%', height: 52, borderRadius: 100,
    background: disabled ? '#E2DED8' : '#111111',
    color: '#F8F7F5',
    fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 400,
    letterSpacing: '0.15em', textTransform: 'uppercase',
    border: 'none', cursor: disabled ? 'default' : 'pointer',
    touchAction: 'manipulation', willChange: 'transform',
  };
}

function selectStyle(): React.CSSProperties {
  return {
    width: '100%', height: 48,
    fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
    color: '#111111', background: 'transparent',
    border: 'none', borderBottom: '1px solid #E2DED8',
    outline: 'none', padding: '0 4px',
    appearance: 'none' as const,
  };
}

// ─── Sheet wrapper ────────────────────────────────────────────────────────────
function SheetWrap({ visible, onClose, title, height, children }: {
  visible: boolean; onClose: () => void; title: string;
  height: string; children: React.ReactNode;
}) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(17,17,17,0.4)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 280ms cubic-bezier(0.22,1,0.36,1)',
        willChange: 'opacity',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
        height, background: '#FFFFFF',
        borderRadius: '24px 24px 0 0',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)',
        willChange: 'transform', display: 'flex',
        flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8' }} />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 20px 12px', borderBottom: '0.5px solid #E2DED8',
        }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: '#111111' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#888580', padding: 4, touchAction: 'manipulation' }}>✕</button>
        </div>
        {children}
      </div>
    </>
  );
}

// ─── AddTaskSheet ─────────────────────────────────────────────────────────────
interface EventOption { id: string; name: string; }

function AddTaskSheet({ visible, onClose, userId, events, onSuccess }: {
  visible: boolean; onClose: () => void; userId: string;
  events: EventOption[]; onSuccess: () => void;
}) {
  const [taskTitle, setTaskTitle] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('general');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [myVendors, setMyVendors] = useState<{ id: string; vendor_id?: string; name: string }[]>([]);
  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  function reset() {
    setTaskTitle(''); setSelectedEvent('general'); setPriority('Medium');
    setDueDate(''); setVendorName(''); setVendorId(null); setNotes('');
  }

  // Load My Vendors when sheet opens
  useEffect(() => {
    if (!visible || !userId) return;
    fetch(`${RAILWAY_URL}/api/couple/vendors/${userId}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d?.data)) setMyVendors(d.data); })
      .catch(() => {});
  }, [visible, userId]);

  async function handleSubmit() {
    if (!taskTitle.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${RAILWAY_URL}/api/couple/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: userId,
          event: selectedEvent || 'general',
          text: taskTitle.trim(),
          priority: priority.toLowerCase(),
          due_date: dueDate || null,
          assigned_to: vendorName.trim() || null,
          vendor_id: vendorId || null, // S35: UUID for clean entity_link
          notes: notes.trim() || null,
          is_custom: true,
        }),
      });
      const json = await res.json();
      if (json.success === false) { showToast(json.error || 'Error adding task'); }
      else { showToast('Task added'); onSuccess(); onClose(); reset(); }
    } catch { showToast('Network error'); }
    finally { setSubmitting(false); }
  }

  const disabled = !taskTitle.trim() || submitting;

  return (
    <>
      <SheetWrap visible={visible} onClose={onClose} title="New Task" height="88vh">
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Task</label>
            <input
              value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
              placeholder="What needs to be done?"
              style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Event</label>
            <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} style={selectStyle()}>
              <option value="general">General</option>
              {events.map(ev => <option key={ev.id} value={ev.name}>{ev.name}</option>)}
            </select>
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Priority</label>
            <div style={pillGroup}>
              {['High', 'Medium', 'Low'].map(p => (
                <Pill key={p} label={p} active={priority === p} onPress={() => setPriority(p)} />
              ))}
            </div>
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Maker (optional)</label>
            {vendorName ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2DED8', padding: '12px 4px' }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#111111' }}>{vendorName}</span>
                <button onClick={() => { setVendorName(''); setVendorId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888580', fontSize: 16 }}>×</button>
              </div>
            ) : (
              <button onClick={() => setShowVendorPicker(true)} style={{ width: '100%', height: 48, background: 'transparent', border: 'none', borderBottom: '1px solid #E2DED8', textAlign: 'left', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#C8C4BE', cursor: 'pointer', padding: '0 4px' }}>
                {myVendors.length > 0 ? 'Pick from My Makers...' : 'Type maker name...'}
              </button>
            )}
            {!vendorName && myVendors.length === 0 && (
              <input value={vendorName} onChange={e => setVendorName(e.target.value)}
                placeholder="e.g. Arjun Kartha Studio"
                style={{ ...fieldInput, marginTop: -48 }}
                onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
                onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
              />
            )}
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any details or reminders..."
              rows={3}
              style={{ ...fieldInput, height: 'auto', resize: 'none', borderBottom: '1px solid #E2DED8', padding: '8px 4px', lineHeight: 1.6 }}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
        </div>
        <div style={{ padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', borderTop: '0.5px solid #E2DED8', background: '#FFFFFF' }}>
          <button onClick={handleSubmit} disabled={disabled} style={submitBtn(disabled)}>
            {submitting ? '...' : 'ADD TASK'}
          </button>
        </div>
      </SheetWrap>

      {/* Vendor picker from My Vendors */}
      {showVendorPicker && (
        <>
          <div onClick={() => setShowVendorPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501, background: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: '20px 20px 0', maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8', margin: '0 auto 16px' }} />
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: '#111111', margin: '0 0 16px' }}>Pick a Maker</p>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myVendors.map(v => (
                <button key={v.id} onClick={() => { setVendorName(v.name); setVendorId(v.vendor_id || null); setShowVendorPicker(false); }}
                  style={{ width: '100%', height: 52, borderRadius: 12, background: '#F4F1EC', border: '1px solid #E2DED8', fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 300, color: '#111111', cursor: 'pointer', touchAction: 'manipulation', textAlign: 'left', padding: '0 16px' }}>
                  {v.name}
                </button>
              ))}
              <button onClick={() => setShowVendorPicker(false)} style={{ width: '100%', height: 44, borderRadius: 100, background: 'transparent', border: 'none', fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', cursor: 'pointer', touchAction: 'manipulation' }}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
      <Toast msg={toast} />
    </>
  );
}

// ─── AddGuestSheet ────────────────────────────────────────────────────────────
function AddGuestSheet({ visible, onClose, userId, events, onSuccess }: {
  visible: boolean; onClose: () => void; userId: string;
  events: EventOption[]; onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [side, setSide] = useState('bride');
  const [relation, setRelation] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [dietary, setDietary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  function toggleEvent(evName: string) {
    setSelectedEvents(prev => prev.includes(evName) ? prev.filter(e => e !== evName) : [...prev, evName]);
  }

  async function handleSubmit() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    const eventInvites: Record<string, string> = {};
    selectedEvents.forEach(ev => { eventInvites[ev] = 'pending'; });
    try {
      const res = await fetch(`${RAILWAY_URL}/api/couple/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: userId,
          name: name.trim(),
          side,
          relation: relation || null,
          phone: phone || null,
          dietary_notes: dietary || null,
          event_invites: eventInvites,
          household_count: 1,
        }),
      });
      const json = await res.json();
      if (json.success === false) { showToast(json.error || 'Error adding guest'); }
      else { showToast('Guest added'); onSuccess(); onClose(); setName(''); setPhone(''); setSide('bride'); setRelation(''); setSelectedEvents([]); setDietary(''); }
    } catch { showToast('Network error'); }
    finally { setSubmitting(false); }
  }

  const disabled = !name.trim() || submitting;

  return (
    <>
      <SheetWrap visible={visible} onClose={onClose} title="Add Guest" height="90vh">
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="numeric" placeholder="Optional" style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Side</label>
            <div style={pillGroup}>
              {['Bride', 'Groom'].map(s => (
                <Pill key={s} label={s} active={side === s.toLowerCase()} onPress={() => setSide(s.toLowerCase())} />
              ))}
            </div>
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Relation</label>
            <input value={relation} onChange={e => setRelation(e.target.value)} placeholder="e.g. Cousin, Friend, Colleague" style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
          {events.length > 0 && (
            <div style={fieldWrapper}>
              <label style={fieldLabel}>Invite to Events</label>
              <div style={pillGroup}>
                {events.map(ev => (
                  <Pill key={ev.id} label={ev.name} active={selectedEvents.includes(ev.name)} onPress={() => toggleEvent(ev.name)} />
                ))}
              </div>
            </div>
          )}
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Dietary Note</label>
            <input value={dietary} onChange={e => setDietary(e.target.value)} placeholder="e.g. Vegetarian, No nuts" style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
        </div>
        <div style={{ padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', borderTop: '0.5px solid #E2DED8', background: '#FFFFFF' }}>
          <button onClick={handleSubmit} disabled={disabled} style={submitBtn(disabled)}>
            {submitting ? '...' : 'ADD GUEST'}
          </button>
        </div>
      </SheetWrap>
      <Toast msg={toast} />
    </>
  );
}

// ─── AddEventSheet ────────────────────────────────────────────────────────────
const EVENT_TYPES = ['Mehendi', 'Haldi', 'Sangeet', 'Ceremony', 'Reception', 'Other'];
const GUEST_RANGES = ['Under 50', '50–150', '150–300', '300–500', '500+'];

function AddEventSheet({ visible, onClose, userId, events, onSuccess }: {
  visible: boolean; onClose: () => void; userId: string; events: EventOption[]; onSuccess: () => void;
}) {
  const [eventType, setEventType] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [city, setCity] = useState('');
  const [budget, setBudget] = useState('');
  const [guestRange, setGuestRange] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [dupWarning, setDupWarning] = useState(false);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  function selectType(t: string) {
    setEventType(t.toLowerCase());
    if (!eventName) setEventName(t);
  }

  function handleNameChange(val: string) {
    setEventName(val);
    const isDup = events.some(ev => ev.name.toLowerCase() === val.trim().toLowerCase());
    setDupWarning(isDup);
  }

  async function handleSubmit() {
    if (!eventName.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${RAILWAY_URL}/api/couple/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: userId,
          event_type: eventType || 'other',
          event_name: eventName.trim(),
          event_date: eventDate || null,
          event_city: city || null,
          budget_total: budget ? Number(budget) : null,
          guest_count_range: guestRange || null,
        }),
      });
      const json = await res.json();
      if (json.success === false) { showToast(json.error || 'Error adding event'); }
      else { showToast('Event added'); onSuccess(); onClose(); setEventType(''); setEventName(''); setEventDate(''); setCity(''); setBudget(''); setGuestRange(''); setDupWarning(false); }
    } catch { showToast('Network error'); }
    finally { setSubmitting(false); }
  }

  const disabled = !eventName.trim() || submitting;

  return (
    <>
      <SheetWrap visible={visible} onClose={onClose} title="New Event" height="88vh">
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Event Type</label>
            <div style={pillGroup}>
              {EVENT_TYPES.map(t => (
                <Pill key={t} label={t} active={eventType === t.toLowerCase()} onPress={() => selectType(t)} />
              ))}
            </div>
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Event Name</label>
            <input value={eventName} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Priya & Arjun's Sangeet" style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
            {dupWarning && (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#C9A84C', margin: '6px 0 0' }}>
                You already have an event with this name. You can still add it.
              </p>
            )}
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Date</label>
            <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>City</label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Mumbai, Delhi" style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
          <div style={{ ...fieldWrapper, position: 'relative' }}>
            <label style={fieldLabel}>Estimated Budget</label>
            <span style={{ position: 'absolute', bottom: 13, left: 4, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#888580' }}>₹</span>
            <input value={budget} onChange={e => setBudget(e.target.value)} inputMode="numeric" placeholder="0" style={{ ...fieldInput, paddingLeft: 18 }}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Guest Range</label>
            <div style={pillGroup}>
              {GUEST_RANGES.map(r => (
                <Pill key={r} label={r} active={guestRange === r} onPress={() => setGuestRange(guestRange === r ? '' : r)} />
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', borderTop: '0.5px solid #E2DED8', background: '#FFFFFF' }}>
          <button onClick={handleSubmit} disabled={disabled} style={submitBtn(disabled)}>
            {submitting ? '...' : 'ADD EVENT'}
          </button>
        </div>
      </SheetWrap>
      <Toast msg={toast} />
    </>
  );
}

// ─── AddBudgetSheet ───────────────────────────────────────────────────────────
const BUDGET_CATEGORIES = ['Photography', 'Decor', 'Catering', 'MUA', 'Attire', 'Venue', 'Other'];

function AddBudgetSheet({ visible, onClose, userId, events, onSuccess }: {
  visible: boolean; onClose: () => void; userId: string;
  events: EventOption[]; onSuccess: () => void;
}) {
  const [vendorName, setVendorName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState('');
  const [eventName, setEventName] = useState('general');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [scanning, setScanning] = useState(false);
  const [showScanOptions, setShowScanOptions] = useState(false);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  async function handleScanReceipt(file: File) {
    if (scanning) return;
    setShowScanOptions(false);
    setScanning(true);
    showToast('Reading receipt...');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${RAILWAY_URL}/api/v2/couple/receipt-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64, media_type: file.type || 'image/jpeg' }),
      });
      const json = await res.json();
      if (json.vendor_name) setVendorName(json.vendor_name);
      if (json.amount) setAmount(String(json.amount));
      if (json.description) setPurpose(json.description);
      if (json.category) setCategory(json.category);
      if (json.date) setDueDate(json.date);
      showToast('Receipt scanned — review and confirm.');
    } catch { showToast('Could not read receipt. Fill in manually.'); }
    finally { setScanning(false); }
  }

  async function handleSubmit() {
    if (!vendorName.trim() || !purpose.trim() || !amount || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${RAILWAY_URL}/api/couple/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: userId,
          vendor_name: vendorName.trim(),
          description: purpose.trim(),       // DB column: description
          actual_amount: Number(amount),      // DB column: actual_amount
          event: eventName === 'general' ? 'general' : eventName, // DB column: event — never null, backend requires it
          category: category || 'Other',
          due_date: dueDate || null,
          payment_status: 'committed',        // DB column: payment_status
        }),
      });
      const json = await res.json();
      if (json.success === false) { showToast(json.error || 'Error adding entry'); }
      else { showToast('Entry added'); onSuccess(); onClose(); setVendorName(''); setPurpose(''); setAmount(''); setEventName('general'); setCategory(''); setDueDate(''); }
    } catch { showToast('Network error'); }
    finally { setSubmitting(false); }
  }

  const disabled = !vendorName.trim() || !purpose.trim() || !amount || submitting;

  return (
    <>
      <SheetWrap visible={visible} onClose={onClose} title="Add Entry" height="88vh">
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
          {/* Scan Receipt */}
          <div style={{ marginBottom: 20 }}>
            {!showScanOptions ? (
              <button onClick={() => setShowScanOptions(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '0.5px solid #E2DED8', borderRadius: 100, padding: '7px 16px', background: scanning ? '#F4F1EC' : 'transparent', cursor: 'pointer', touchAction: 'manipulation' }}>
                <span style={{ fontSize: 14 }}>📷</span>
                <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: scanning ? '#C9A84C' : '#888580' }}>
                  {scanning ? 'Reading...' : 'Scan Receipt'}
                </span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label style={{ cursor: 'pointer' }}>
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleScanReceipt(f); e.target.value = ''; }} />
                  <div style={{ border: '0.5px solid #E2DED8', borderRadius: 100, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <span style={{ fontSize: 13 }}>📸</span>
                    <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580' }}>Camera</span>
                  </div>
                </label>
                <label style={{ cursor: 'pointer' }}>
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleScanReceipt(f); e.target.value = ''; }} />
                  <div style={{ border: '0.5px solid #E2DED8', borderRadius: 100, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <span style={{ fontSize: 13 }}>🖼️</span>
                    <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580' }}>Gallery</span>
                  </div>
                </label>
                <button onClick={() => setShowScanOptions(false)} style={{ background: 'none', border: 'none', color: '#C8C4BE', fontSize: 16, cursor: 'pointer', padding: '4px 8px' }}>✕</button>
              </div>
            )}
          </div>

          <div style={fieldWrapper}>
            <label style={fieldLabel}>Vendor / Payee</label>
            <input value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="e.g. Nathan Cross Photography" style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Purpose</label>
            <input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Photography advance, Decor deposit" style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
          <div style={{ ...fieldWrapper, position: 'relative' }}>
            <label style={fieldLabel}>Amount</label>
            <span style={{ position: 'absolute', bottom: 13, left: 4, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#888580' }}>₹</span>
            <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="numeric" placeholder="0" style={{ ...fieldInput, paddingLeft: 18 }}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Event</label>
            <select value={eventName} onChange={e => setEventName(e.target.value)} style={selectStyle()}>
              <option value="general">General</option>
              {events.map(ev => <option key={ev.id} value={ev.name}>{ev.name}</option>)}
            </select>
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Category</label>
            <div style={pillGroup}>
              {BUDGET_CATEGORIES.map(c => (
                <Pill key={c} label={c} active={category === c} onPress={() => setCategory(category === c ? '' : c)} />
              ))}
            </div>
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
        </div>
        <div style={{ padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', borderTop: '0.5px solid #E2DED8', background: '#FFFFFF' }}>
          <button onClick={handleSubmit} disabled={disabled} style={submitBtn(disabled)}>
            {submitting ? '...' : 'ADD ENTRY'}
          </button>
        </div>
      </SheetWrap>
      <Toast msg={toast} />
    </>
  );
}

// ─── DreamAi Sheet (shared across tabs) ──────────────────────────────────────
interface ChatMessage { role: 'user' | 'ai'; text: string; action?: AgentAction; }
interface AgentAction { type: string; label: string; params: Record<string, any>; preview: string; }

function ActionPreviewCard({ action, userId, onConfirm, onDismiss }: {
  action: AgentAction; userId: string;
  onConfirm: (result: string) => void; onDismiss: () => void;
}) {
  const [executing, setExecuting] = useState(false);
  const endpointMap: Record<string, string> = {
    complete_task: '/api/v2/dreamai/action/complete-task',
    add_expense: '/api/v2/dreamai/action/add-expense',
    send_whatsapp: '/api/v2/dreamai/action/send-whatsapp-reminder',
    send_enquiry: '/api/v2/dreamai/action/send-enquiry',
  };

  async function execute() {
    const endpoint = endpointMap[action.type];
    if (!endpoint || executing) return;
    setExecuting(true);
    try {
      const r = await fetch(`${RAILWAY_URL}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_id: userId, ...action.params }),
      });
      const d = await r.json();
      onConfirm(d.message || 'Done.');
    } catch { onConfirm('Could not complete action.'); }
    finally { setExecuting(false); }
  }

  return (
    <div style={{ background: '#F8F7F5', border: '1px solid #C9A84C', borderRadius: 12, padding: '12px 14px', margin: '8px 0' }}>
      <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 6px' }}>✦ Action Preview</p>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#111', margin: '0 0 12px', lineHeight: 1.5 }}>{action.preview}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={execute} disabled={executing} style={{ flex: 1, height: 36, background: '#C9A84C', border: 'none', borderRadius: 100, fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#111', cursor: 'pointer', opacity: executing ? 0.6 : 1, touchAction: 'manipulation' }}>
          {executing ? '...' : 'Confirm'}
        </button>
        <button onClick={onDismiss} style={{ height: 36, padding: '0 14px', background: 'transparent', border: '1px solid #E2DED8', borderRadius: 100, fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888580', cursor: 'pointer', touchAction: 'manipulation' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function DreamAiSheet({
  visible, onClose, userId, prefill,
}: {
  visible: boolean; onClose: () => void; userId: string; prefill?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [context, setContext] = useState<object | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`${RAILWAY_URL}/api/v2/dreamai/couple-context/${userId}`)
      .then(r => r.json()).then(setContext).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (visible && prefill) setInput(prefill);
  }, [visible, prefill]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await fetch(`${RAILWAY_URL}/api/v2/dreamai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userType: 'couple', message: msg, context }),
      });
      const json = await res.json();
      const replyText = json.reply || 'Something went wrong.';

      // Detect action block in reply — format: [ACTION:type|label|preview|params_json]
      const actionMatch = replyText.match(/\[ACTION:(\w+)\|([^|]+)\|([^|]+)\|(\{[^}]+\})\]/);
      if (actionMatch) {
        const [, type, label, preview, paramsStr] = actionMatch;
        let params = {};
        try { params = JSON.parse(paramsStr); } catch {}
        const cleanText = replyText.replace(actionMatch[0], '').trim();
        setMessages(prev => [...prev, { role: 'ai', text: cleanText, action: { type, label, preview, params } }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: replyText }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Unable to reach DreamAi.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(file: File) {
    if (uploadingImage || loading) return;
    setUploadingImage(true);
    setMessages(prev => [...prev, { role: 'user', text: '📷 Image' }]);
    try {
      // Step 1: Upload to Cloudinary to get a permanent URL
      const CLOUDINARY_CLOUD = 'dccso5ljv';
      const CLOUDINARY_PRESET = 'dream_wedding_uploads';
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_PRESET);
      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
        method: 'POST', body: formData,
      });
      const cloudJson = await cloudRes.json();
      const imageUrl = cloudJson.secure_url;

      if (!imageUrl) throw new Error('Upload failed');

      // Step 2: Send URL + base64 to DreamAi for classification
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const mediaType = file.type || 'image/jpeg';

      const res = await fetch(`${RAILWAY_URL}/api/v2/dreamai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, userType: 'couple',
          message: `I sent an image. The uploaded URL is: ${imageUrl}

Please classify it: if it looks like a receipt or invoice, log it as an expense using add_expense. If it looks like wedding inspiration (decor, fashion, makeup, venue, photography), save it to my Muse board using save_to_muse with source_url set to "${imageUrl}".`,
          context,
          image_base64: base64,
          image_media_type: mediaType,
        }),
      });
      const json = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: json.reply || 'Image processed!' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Could not process image.' }]);
    } finally {
      setUploadingImage(false);
    }
  }

  const quickPrompts = context ? [
    'What\'s overdue this week?',
    'How much have I spent so far?',
    'Which vendors haven\'t replied?',
    'Draft a reminder to my florist',
  ] : [];

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(17,17,17,0.4)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 280ms cubic-bezier(0.22,1,0.36,1)',
        willChange: 'opacity',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
        height: '92dvh', background: '#FFFFFF',
        borderRadius: '24px 24px 0 0',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)',
        willChange: 'transform',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8' }} />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px 12px', borderBottom: '0.5px solid #E2DED8',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>✦</span>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: '#111111' }}>DreamAi</span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#888580',
            padding: 4, touchAction: 'manipulation',
          }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 16px' }}>
          {messages.length === 0 && (
            <div style={{ marginTop: 32 }}>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 18,
                fontWeight: 300, fontStyle: 'italic', color: '#888580',
                textAlign: 'center', margin: '0 0 24px',
              }}>Ask anything about your wedding.</p>
              {quickPrompts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {quickPrompts.map((q, i) => (
                    <button key={i} onClick={() => sendMessage(q)} style={{
                      background: '#F8F7F5', border: '0.5px solid #E2DED8', borderRadius: 10,
                      padding: '10px 14px', textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation',
                      fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#555250',
                    }}>{q}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i}>
              <div style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: m.action ? 4 : 12,
              }}>
                <div style={{
                  maxWidth: '80%',
                  background: m.role === 'user' ? '#FFFFFF' : '#F8F7F5',
                  border: m.role === 'user' ? '0.5px solid #C9A84C' : '0.5px solid #E2DED8',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '10px 14px',
                }}>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                    fontWeight: 300, color: '#111111', margin: 0, lineHeight: 1.5,
                  }}>{renderMarkdown(m.text || '')}</p>
                </div>
              </div>
              {m.action && (
                <ActionPreviewCard
                  action={m.action}
                  userId={userId}
                  onConfirm={(result) => {
                    setMessages(prev => [...prev, { role: 'ai', text: result }]);
                  }}
                  onDismiss={() => {
                    setMessages(prev => prev.map((msg, idx) => idx === i ? { ...msg, action: undefined } : msg));
                  }}
                />
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
              <div style={{
                background: '#F8F7F5', border: '0.5px solid #E2DED8',
                borderRadius: '16px 16px 16px 4px', padding: '10px 16px',
              }}>
                <Shimmer h={14} w={120} br={4} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{
          display: 'flex', gap: 10, padding: '12px 16px',
          borderTop: '0.5px solid #E2DED8',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
          background: '#FFFFFF',
        }}>
          {/* Image upload button */}
          <label style={{ flexShrink: 0, cursor: 'pointer' }}>
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }}
            />
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: uploadingImage ? '#F4F1EC' : '#F8F7F5', border: '0.5px solid #E2DED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 18 }}>{uploadingImage ? '⏳' : '📷'}</span>
            </div>
          </label>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(input); }}
            placeholder="Ask anything about your wedding..."
            style={{
              flex: 1, height: 44,
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
              color: '#111111', background: '#F8F7F5',
              border: '0.5px solid #E2DED8', borderRadius: 22,
              padding: '0 16px', outline: 'none',
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: input.trim() ? '#C9A84C' : '#E2DED8',
              border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, touchAction: 'manipulation',
              transition: 'background 200ms cubic-bezier(0.22,1,0.36,1)',
              willChange: 'transform',
            }}
          >
            <span style={{ color: '#FFFFFF', fontSize: 16 }}>↑</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
type StatusFilter = 'all' | 'pending' | 'done';

function formatDue(d?: string) {
  if (!d) return '';
  const dt = new Date(d); dt.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((dt.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return 'Due ' + new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function isOverdue(d?: string) {
  if (!d) return false;
  const dt = new Date(d); dt.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  return dt < today;
}

function groupByEvent<T extends Task>(arr: T[]): { group: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  arr.forEach(t => {
    const k = t.events?.name || t.event_name || 'General';
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  });
  return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
}

// ─── Auto-create expense sheet after task completion ──────────────────────────
function CreateExpenseSheet({ visible, onClose, userId, task, events, onSuccess }: {
  visible: boolean; onClose: () => void; userId: string;
  task: Task; events: EventOption[]; onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  const eventName = task.events?.name || task.event_name || 'general';
  const vendorName = task.assigned_to || '';

  async function handleSubmit() {
    if (!amount || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${RAILWAY_URL}/api/couple/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: userId,
          vendor_name: vendorName || 'General',
          description: task.title,
          actual_amount: Number(amount),
          event: eventName === 'general' ? null : eventName,
          payment_status: 'committed',
        }),
      });
      const json = await res.json();
      if (json.success === false) { showToast(json.error || 'Error adding expense'); }
      else { showToast('Expense added'); onSuccess(); onClose(); setAmount(''); }
    } catch { showToast('Network error'); }
    finally { setSubmitting(false); }
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(17,17,17,0.4)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 280ms cubic-bezier(0.22,1,0.36,1)',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401,
        background: '#FFFFFF', borderRadius: '24px 24px 0 0',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)',
        padding: '20px 20px 0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8' }} />
        </div>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: '#111111', margin: '0 0 4px' }}>Log an expense?</p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: '0 0 24px' }}>
          {task.title}{vendorName ? ` · ${vendorName}` : ''}
        </p>
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <label style={fieldLabel}>Amount paid</label>
          <span style={{ position: 'absolute', bottom: 13, left: 4, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#888580' }}>₹</span>
          <input
            value={amount} onChange={e => setAmount(e.target.value)}
            inputMode="numeric" placeholder="0"
            style={{ ...fieldInput, paddingLeft: 18 }}
            onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
            onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
          <button onClick={onClose} style={{
            flex: 1, height: 52, borderRadius: 100,
            background: 'transparent', border: '1px solid #E2DED8',
            fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 400,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            color: '#888580', cursor: 'pointer', touchAction: 'manipulation',
          }}>SKIP</button>
          <button onClick={handleSubmit} disabled={!amount || submitting} style={submitBtn(!amount || submitting)}>
            {submitting ? '...' : 'LOG EXPENSE'}
          </button>
        </div>
        <Toast msg={toast} />
      </div>
    </>
  );
}

// ─── Task Card — tap to expand detail, checkbox to complete ───────────────────
function TaskCard({ task, userId, events, onCompleted, onDeleted, onExpenseAdded }: {
  task: Task;
  userId: string;
  events: EventOption[];
  onCompleted: (id: string) => void;
  onDeleted: (id: string) => void;
  onExpenseAdded: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(task.status === 'done' || !!task.is_complete);
  const [deleting, setDeleting] = useState(false);
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  const isDone = completed || task.status === 'done';
  const overdue = !isDone && isOverdue(task.due_date);
  const dueLabel = formatDue(task.due_date);
  const prioColor = task.priority === 'high' ? '#C9A84C' : task.priority === 'medium' ? '#8C8480' : '#E2DED8';
  const eventLabel = task.events?.name || task.event_name || '';

  async function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    if (isDone || completing) return;
    setCompleting(true);
    try {
      await fetch(`${RAILWAY_URL}/api/couple/checklist/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complete: true }),
      });
      setCompleted(true);
      onCompleted(task.id);
      // Offer to create expense after short delay
      setTimeout(() => setExpenseSheetOpen(true), 400);
    } catch { showToast('Could not update task'); }
    finally { setCompleting(false); }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(true);
    try {
      await fetch(`${RAILWAY_URL}/api/couple/checklist/${task.id}`, { method: 'DELETE' });
      onDeleted(task.id);
    } catch { showToast('Could not delete task'); setDeleting(false); }
  }

  return (
    <>
      <div
        style={{
          background: isDone ? 'transparent' : '#FFFFFF',
          border: `1px solid ${isDone ? '#E2DED8' : overdue ? '#C9A84C' : '#E2DED8'}`,
          borderRadius: 14,
          overflow: 'hidden',
          opacity: isDone ? 0.55 : 1,
          transition: 'opacity 400ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Main row */}
        <div
          onClick={() => setExpanded(e => !e)}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, cursor: 'pointer' }}
        >
          {/* Checkbox */}
          <button
            onClick={handleComplete}
            disabled={isDone || completing}
            style={{
              flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
              border: `1.5px solid ${isDone ? '#C9A84C' : '#E2DED8'}`,
              background: isDone ? '#C9A84C' : 'transparent',
              cursor: isDone ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 1, touchAction: 'manipulation',
              transition: 'all 300ms cubic-bezier(0.22,1,0.36,1)',
              flexDirection: 'column',
            }}
            aria-label="Mark complete"
          >
            {isDone && (
              <span style={{ color: '#FFFFFF', fontSize: 12, lineHeight: 1, marginTop: -1 }}>✓</span>
            )}
          </button>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 300,
              color: isDone ? '#8C8480' : '#0C0A09', margin: '0 0 4px', lineHeight: 1.3,
              textDecoration: isDone ? 'line-through' : 'none',
              transition: 'all 350ms cubic-bezier(0.22,1,0.36,1)',
            }}>{task.title}</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {dueLabel && (
                <span style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
                  color: overdue ? '#C9A84C' : '#8C8480',
                }}>{dueLabel}</span>
              )}
              {eventLabel && eventLabel !== 'General' && (
                <span style={{
                  fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: '#8C8480', background: '#F4F1EC',
                  padding: '2px 7px', borderRadius: 100,
                }}>{eventLabel}</span>
              )}
              {/* Priority dot */}
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: prioColor, display: 'inline-block' }} />
            </div>
          </div>

          {/* Expand chevron */}
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C8C4BE',
            transition: 'transform 250ms cubic-bezier(0.22,1,0.36,1)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0, marginTop: 4,
          }}>›</span>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div style={{
            borderTop: '0.5px solid #E2DED8',
            padding: '14px 16px 16px',
            background: '#FAFAF8',
          }}>
            {/* Detail rows */}
            {task.notes && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', margin: '0 0 4px' }}>Notes</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#3C3835', margin: 0, lineHeight: 1.6 }}>{task.notes}</p>
              </div>
            )}
            {task.assigned_to && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', margin: '0 0 4px' }}>Maker</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#3C3835', margin: 0 }}>{task.assigned_to}</p>
              </div>
            )}
            {eventLabel && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', margin: '0 0 4px' }}>Event</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#3C3835', margin: 0 }}>{eventLabel}</p>
              </div>
            )}
            {task.due_date && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', margin: '0 0 4px' }}>Due</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: overdue ? '#C9A84C' : '#3C3835', margin: 0 }}>
                  {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}
            {/* Actions row */}
            <div style={{ display: 'flex', gap: 8 }}>
              {!isDone && (
                <button onClick={handleComplete} disabled={completing} style={{
                  flex: 1, height: 38, borderRadius: 100,
                  background: '#111111', border: 'none',
                  fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 400,
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  color: '#F8F7F5', cursor: 'pointer', touchAction: 'manipulation',
                }}>{completing ? '...' : 'MARK DONE'}</button>
              )}
              <button onClick={handleDelete} disabled={deleting} style={{
                flex: isDone ? 1 : 0, height: 38, borderRadius: 100,
                background: 'transparent', border: '1px solid #E2DED8',
                fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                color: '#888580', cursor: 'pointer', touchAction: 'manipulation',
                padding: '0 20px',
              }}>{deleting ? '...' : 'DELETE'}</button>
            </div>
          </div>
        )}
      </div>

      {/* Auto-create expense sheet */}
      <CreateExpenseSheet
        visible={expenseSheetOpen}
        onClose={() => setExpenseSheetOpen(false)}
        userId={userId}
        task={task}
        events={events}
        onSuccess={onExpenseAdded}
      />
      <Toast msg={toast} />
    </>
  );
}

// ─── TasksTab ─────────────────────────────────────────────────────────────────
function TasksTab({ userId, events, onOpenDreamAi, refetch, onExpenseAdded }: {
  userId: string;
  events: EventOption[];
  onOpenDreamAi: (prefill: string) => void;
  refetch: number;
  onExpenseAdded: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  async function loadTasks(triggerSeedIfEmpty = false) {
    setLoading(true);
    try {
      const r = await fetch(`${RAILWAY_URL}/api/v2/couple/tasks/${userId}`);
      const d = await r.json();
      const taskList = Array.isArray(d) ? d : [];
      if (triggerSeedIfEmpty && taskList.length === 0) {
        await fetch(`${RAILWAY_URL}/api/couple/checklist/seed/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const r2 = await fetch(`${RAILWAY_URL}/api/v2/couple/tasks/${userId}`);
        const d2 = await r2.json();
        setTasks(Array.isArray(d2) ? d2 : []);
      } else {
        setTasks(taskList);
      }
    } catch { }
    finally { setLoading(false); }
  }

  useEffect(() => { loadTasks(true); }, [userId, refetch]);

  function handleCompleted(id: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'done', is_complete: true } : t));
  }
  function handleDeleted(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  // Apply status filter then group by event
  const filtered = tasks.filter(t => {
    if (statusFilter === 'pending') return t.status !== 'done' && !t.is_complete;
    if (statusFilter === 'done') return t.status === 'done' || !!t.is_complete;
    return true;
  });
  const groups = groupByEvent(filtered);

  const pendingCount = tasks.filter(t => t.status !== 'done' && !t.is_complete).length;
  const doneCount = tasks.filter(t => t.status === 'done' || !!t.is_complete).length;

  if (loading) return (
    <div style={{ paddingTop: 12 }}>
      {[0, 1, 2].map(g => (
        <div key={g} style={{ marginBottom: 24 }}>
          <Shimmer h={8} w={60} br={4} />
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Shimmer h={68} /><Shimmer h={68} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Status filter row + DreamAi */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {([
            { key: 'all' as StatusFilter, label: `All ${tasks.length > 0 ? tasks.length : ''}` },
            { key: 'pending' as StatusFilter, label: `Pending ${pendingCount > 0 ? pendingCount : ''}` },
            { key: 'done' as StatusFilter, label: `Done ${doneCount > 0 ? doneCount : ''}` },
          ]).map(fc => (
            <button key={fc.key} onClick={() => setStatusFilter(fc.key)} style={{
              fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300,
              padding: '4px 11px', borderRadius: 100,
              border: statusFilter === fc.key ? 'none' : '1px solid #E2DED8',
              background: statusFilter === fc.key ? '#0C0A09' : 'transparent',
              color: statusFilter === fc.key ? '#FAFAF8' : '#8C8480',
              cursor: 'pointer', letterSpacing: '0.08em', whiteSpace: 'nowrap',
            }}>{fc.label.trim()}</button>
          ))}
        </div>
        <button
          onClick={() => onOpenDreamAi('')}
          style={{
            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#888580', background: 'none',
            border: '0.5px solid #E2DED8', borderRadius: 100,
            padding: '4px 10px', cursor: 'pointer',
            touchAction: 'manipulation',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: 10 }}>✦</span> Ask
        </button>
      </div>

      {/* Empty state */}
      {tasks.length === 0 ? (
        <div style={{ marginTop: 72, textAlign: 'center' }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300, fontStyle: 'italic', color: '#3C3835', margin: '0 0 10px' }}>Your list is clear.</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#8C8480', margin: '0 0 28px', lineHeight: 1.6 }}>Tasks you add will appear here,{'\n'}grouped by your events.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ marginTop: 48, textAlign: 'center' }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: '#8C8480', margin: 0 }}>
            {statusFilter === 'done' ? 'Nothing completed yet.' : 'All tasks are done.'}
          </p>
        </div>
      ) : (
        groups.map(({ group, items }) => (
          <div key={group} style={{ marginBottom: 28 }}>
            <p style={{
              fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: '#C8C4BE', margin: '0 0 10px',
            }}>{group}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  userId={userId}
                  events={events}
                  onCompleted={handleCompleted}
                  onDeleted={handleDeleted}
                  onExpenseAdded={onExpenseAdded}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Money ───────────────────────────────────────────────────────────────────

type MoneyData = {
  totalBudget: number;
  committed: number;
  paid: number;
  events: { id: string; name: string; budget: number }[];
  thisWeek: Expense[];
  next30: Expense[];
};

type Expense = {
  id: string;
  vendor_name?: string;
  purpose?: string;
  amount: number;
  actual_amount?: number;
  due_date?: string;
  status?: string;
  payment_status?: string;
  event_name?: string;
  category?: string;
  bucket?: string;
};

type PaymentFilter = 'week' | 'next30';

function fmtINR(n: number) {
  if (!n) return '₹0';
  return '₹' + n.toLocaleString('en-IN');
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

async function openRazorpay({
  userId, paymentType, amount, label, onSuccess, onError,
}: {
  userId: string; paymentType: string; amount: number; label: string;
  onSuccess: () => void; onError: (msg: string) => void;
}) {
  const loaded = await loadRazorpayScript();
  if (!loaded) { onError('Payment service unavailable. Please try again.'); return; }
  const orderRes = await fetch(`${RAILWAY_URL}/api/v2/razorpay/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency: 'INR', payment_type: paymentType, user_id: userId }),
  }).then(r => r.json()).catch(() => null);
  if (!orderRes?.success) { onError(orderRes?.error || 'Could not create payment. Please try again.'); return; }
  const { order_id, key_id } = orderRes;
  const rzp = new (window as any).Razorpay({
    key: key_id, amount: amount * 100, currency: 'INR', order_id,
    name: 'The Dream Wedding', description: label, theme: { color: '#C9A84C' },
    handler: async (response: any) => {
      const verifyRes = await fetch(`${RAILWAY_URL}/api/v2/razorpay/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          payment_type: paymentType, user_id: userId,
        }),
      }).then(r => r.json()).catch(() => null);
      if (verifyRes?.success) onSuccess();
      else onError('Payment verification failed. Contact support if amount was deducted.');
    },
    modal: { ondismiss: () => {} },
  });
  rzp.open();
}

function UpgradeCard({ userId, currentTier, onUpgraded }: { userId: string; currentTier: string; onUpgraded: () => void }) {
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState('');
  const isGold = currentTier === 'gold';
  if (currentTier === 'platinum') return null;
  const target = isGold ? 'platinum' : 'gold';
  const label = target === 'gold' ? 'Gold — ₹999' : 'Platinum — ₹2,999';
  const amount = target === 'gold' ? 999 : 2999;
  const paymentType = target === 'gold' ? 'couple_gold' : 'couple_platinum';
  const benefits = target === 'gold'
    ? ['Priority discovery', 'Unlock full vendor profiles', 'Booking history']
    : ['DreamAi — your AI wedding planner', 'Couture appointments', 'Memory Box'];
  const handleUpgrade = async () => {
    setPaying(true);
    await openRazorpay({
      userId, paymentType, amount, label,
      onSuccess: () => { setPaying(false); setToast('Welcome to ' + (target === 'gold' ? 'Gold' : 'Platinum') + '!'); setTimeout(() => { setToast(''); onUpgraded(); }, 2000); },
      onError: (msg) => { setPaying(false); setToast(msg); setTimeout(() => setToast(''), 4000); },
    });
  };
  return (
    <>
      <div style={{ background: '#0C0A09', borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 8px' }}>UPGRADE</p>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: '#F8F7F5', margin: '0 0 16px', lineHeight: 1.2 }}>
          {target === 'gold' ? 'Unlock the full journey.' : 'Your AI wedding planner awaits.'}
        </p>
        <div style={{ marginBottom: 20 }}>
          {benefits.map(b => <p key={b} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: '0 0 4px' }}>· {b}</p>)}
        </div>
        <button onClick={handleUpgrade} disabled={paying} style={{
          fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: '#0C0A09', background: '#C9A84C', border: 'none', borderRadius: 100, padding: '10px 20px',
          cursor: paying ? 'not-allowed' : 'pointer', opacity: paying ? 0.6 : 1, touchAction: 'manipulation',
        }}>{paying ? 'Opening...' : label}</button>
      </div>
      {toast && <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: '#0C0A09', color: '#F8F7F5', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, padding: '12px 20px', borderRadius: 100, zIndex: 999, whiteSpace: 'nowrap' }}>{toast}</div>}
    </>
  );
}

// ─── SVG budget ring ──────────────────────────────────────────────────────────
function BudgetRing({ pct, size = 48 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2DED8" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#C9A84C" strokeWidth={3}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.22,1,0.36,1)' }} />
    </svg>
  );
}

// ─── Set Budget Sheet ─────────────────────────────────────────────────────────
// ─── Budget category defaults ─────────────────────────────────────────────────
const DEFAULT_BUDGET_CATEGORIES = [
  { category_key: 'venue', display_name: 'Venue', pct: 50 },
  { category_key: 'attire', display_name: 'Attire & Jewellery', pct: 17 },
  { category_key: 'decor', display_name: 'Decor & Florals', pct: 15 },
  { category_key: 'photo', display_name: 'Photography & Video', pct: 10 },
  { category_key: 'beauty', display_name: 'MUA, Hair & Mehendi', pct: 6 },
  { category_key: 'entertainment', display_name: 'Entertainment', pct: 2 },
  { category_key: 'invitations', display_name: 'Invitations & Stationery', pct: 1 },
  { category_key: 'other', display_name: 'Other & Contingency', pct: 5 },
];

function getVenueTier(perPlate: number): string {
  if (perPlate < 3000) return 'Banquet hall, basic buffet';
  if (perPlate < 5000) return 'Mid-range hotel, mixed cuisine';
  if (perPlate < 7500) return 'Premium hotel, multi-cuisine + live counters';
  return 'Luxury hotel, full service';
}

function getWeddingSeason(weddingDate?: string): 'peak' | 'offseason' | 'deep_offseason' | null {
  if (!weddingDate) return null;
  const d = new Date(weddingDate);
  const m = d.getMonth() + 1; const day = d.getDate();
  if ((m === 10 && day >= 15) || m === 11 || m === 12 || m === 1 || m === 2 || m === 3 || (m === 4 && day <= 30)) return 'peak';
  if (m === 5 || m === 6 || (m === 7 && day < 15)) return 'offseason';
  return 'deep_offseason';
}

type BudgetCategory = {
  category_key: string;
  display_name: string;
  pct: number;
  allocated_amount: number;
};

function BudgetSetupSheet({ visible, onClose, userId, currentTotal, onSaved }: {
  visible: boolean; onClose: () => void; userId: string; currentTotal: number; onSaved: (n: number) => void;
}) {
  const [step, setStep] = React.useState<'budget' | 'categories'>('budget');
  const [totalVal, setTotalVal] = React.useState(currentTotal > 0 ? String(currentTotal) : '');
  const [guestCount, setGuestCount] = React.useState('');
  const [weddingDate, setWeddingDate] = React.useState('');
  const [categories, setCategories] = React.useState<BudgetCategory[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState('');

  React.useEffect(() => {
    if (visible) {
      setStep('budget');
      setTotalVal(currentTotal > 0 ? String(currentTotal) : '');
      fetch(`${RAILWAY_URL}/api/couple/budget-categories/${userId}`)
        .then(r => r.json())
        .then(d => { if (d.success && d.data?.length > 0) setCategories(d.data); })
        .catch(() => {});
      fetch(`${RAILWAY_URL}/api/v2/couple/profile/${userId}`)
        .then(r => r.json())
        .then(d => { const wd = d.couple?.wedding_date || d.wedding_date; if (wd) setWeddingDate(wd); })
        .catch(() => {});
    }
  }, [visible, userId, currentTotal]);

  const total = Number(totalVal) || 0;
  const guests = Number(guestCount) || 0;
  const perPlate = guests > 0 ? Math.round((total * 0.50) / guests) : 0;
  const venueTier = perPlate > 0 ? getVenueTier(perPlate) : null;
  const season = getWeddingSeason(weddingDate);

  function initCategories() {
    if (!total) return;
    setCategories(DEFAULT_BUDGET_CATEGORIES.map(c => ({
      ...c,
      allocated_amount: Math.round(total * c.pct / 100),
    })));
    setStep('categories');
  }

  function updatePct(key: string, pct: number) {
    setCategories(prev => prev.map(c => c.category_key === key
      ? { ...c, pct, allocated_amount: Math.round(total * pct / 100) } : c));
  }
  function updateAmount(key: string, amount: number) {
    setCategories(prev => prev.map(c => c.category_key === key
      ? { ...c, allocated_amount: amount, pct: total > 0 ? Math.round(amount / total * 100) : 0 } : c));
  }

  const allocatedTotal = categories.reduce((s, c) => s + c.allocated_amount, 0);
  const overBy = allocatedTotal - total;
  const allocationColor = overBy > 0 ? '#C9A84C' : '#3C3835';

  async function handleSave() {
    if (!total || saving) return;
    setSaving(true);
    try {
      await fetch(`${RAILWAY_URL}/api/couple/budget/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_budget: total }),
      });
      if (categories.length > 0) {
        await fetch(`${RAILWAY_URL}/api/couple/budget-categories/${userId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categories }),
        });
      }
      onSaved(total); onClose();
    } catch { setToast('Network error'); setTimeout(() => setToast(''), 2500); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(17,17,17,0.4)', opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none', transition: 'opacity 280ms' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401, background: '#FFFFFF', borderRadius: '24px 24px 0 0', transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 20px 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8' }} />
        </div>

        {step === 'budget' ? (
          <div style={{ padding: '16px 20px 0', overflowY: 'auto', flex: 1 }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300, color: '#111111', margin: '0 0 24px' }}>Set your budget</p>

            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888580', margin: '0 0 6px' }}>Total budget</p>
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <span style={{ position: 'absolute', bottom: 13, left: 4, fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 300, color: '#888580' }}>₹</span>
              <input value={totalVal} onChange={e => setTotalVal(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric" placeholder="0"
                style={{ ...fieldInput, paddingLeft: 22, fontSize: 22 }}
                onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
                onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
              />
            </div>

            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888580', margin: '0 0 6px' }}>Approximate guest count</p>
            <input value={guestCount} onChange={e => setGuestCount(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric" placeholder="e.g. 300"
              style={{ ...fieldInput, marginBottom: 24 }}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />

            {perPlate > 0 && (
              <div style={{ background: '#F4F1EC', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', margin: '0 0 4px' }}>Suggested per-plate</p>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 300, color: '#0C0A09', margin: '0 0 4px' }}>₹{perPlate.toLocaleString('en-IN')}</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#8C8480', margin: 0 }}>{venueTier}</p>
              </div>
            )}

            {(season === 'offseason' || season === 'deep_offseason') && (
              <div style={{ background: '#FFF8EC', border: '1px solid #E8D9A0', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#7A6520', margin: 0 }}>
                  ✦ {season === 'deep_offseason' ? 'Deep off-season — significant vendor pricing flexibility expected.' : 'Off-season wedding — vendors typically offer 15–30% discounts.'}
                </p>
              </div>
            )}

            <div style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {total > 0 && (
                <button onClick={initCategories} style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 400, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#F8F7F5', background: '#111111', border: 'none', borderRadius: 100, padding: '14px 24px', cursor: 'pointer', width: '100%', touchAction: 'manipulation' }}>
                  SET CATEGORY BUDGETS →
                </button>
              )}
              <button onClick={handleSave} disabled={!total || saving} style={submitBtn(!total || saving)}>
                {saving ? '...' : 'SAVE TOTAL ONLY'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: '16px 20px 12px', flexShrink: 0, borderBottom: '1px solid #E2DED8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <button onClick={() => setStep('budget')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#888580', fontSize: 20, lineHeight: 1, touchAction: 'manipulation' }}>‹</button>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: '#111111', margin: 0 }}>Category breakdown</p>
              </div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: allocationColor, margin: '4px 0 0 30px' }}>
                Allocated: ₹{allocatedTotal.toLocaleString('en-IN')} / ₹{total.toLocaleString('en-IN')}
                {overBy > 0 ? ` · ₹${overBy.toLocaleString('en-IN')} over` : overBy < 0 ? ` · ₹${Math.abs(overBy).toLocaleString('en-IN')} unallocated` : ' · balanced'}
              </p>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
              {categories.map(cat => (
                <div key={cat.category_key} style={{ marginBottom: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#3C3835', margin: 0 }}>{cat.display_name}</p>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input value={cat.pct} onChange={e => updatePct(cat.category_key, Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                        inputMode="numeric"
                        style={{ width: 36, fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#3C3835', border: 'none', borderBottom: '1px solid #E2DED8', background: 'transparent', textAlign: 'center', outline: 'none', padding: '2px 0' }}
                      />
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#888580' }}>%</span>
                      <span style={{ color: '#C8C4BE', fontSize: 12 }}>|</span>
                      <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, color: '#888580' }}>₹</span>
                      <input value={cat.allocated_amount} onChange={e => updateAmount(cat.category_key, Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                        inputMode="numeric"
                        style={{ width: 76, fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#3C3835', border: 'none', borderBottom: '1px solid #E2DED8', background: 'transparent', textAlign: 'right', outline: 'none', padding: '2px 0' }}
                      />
                    </div>
                  </div>
                  <input type="range" min={0} max={80} value={cat.pct}
                    onChange={e => updatePct(cat.category_key, Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#C9A84C', height: 4, cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>

            <div style={{ padding: '12px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', borderTop: '1px solid #E2DED8', flexShrink: 0 }}>
              <button onClick={handleSave} disabled={saving} style={submitBtn(saving)}>
                {saving ? '...' : 'SAVE BUDGET'}
              </button>
            </div>
          </>
        )}
        {toast && <Toast msg={toast} />}
      </div>
    </>
  );
}

function MoneyTab({ userId, dreamerType, onOpenDreamAi, refetch }: {
  userId: string; dreamerType: string; onOpenDreamAi: (prefill: string) => void; refetch: number;
}) {
  const [data, setData] = useState<MoneyData | null>(null);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [payFilter, setPayFilter] = useState<PaymentFilter>('week');
  const [currentTier, setCurrentTier] = useState(dreamerType || 'basic');
  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  function loadData() {
    setLoading(true);
    Promise.all([
      fetch(`${RAILWAY_URL}/api/v2/couple/money/${userId}`).then(r => r.json()),
      fetch(`${RAILWAY_URL}/api/couple/expenses/${userId}`).then(r => r.json()),
      fetch(`${RAILWAY_URL}/api/couple/budget-categories/${userId}`).then(r => r.json()).catch(() => ({ success: false })),
    ]).then(([money, exps, cats]) => {
      if (cats?.success && cats.data?.length > 0) setBudgetCategories(cats.data);
      setData(money);
      const rows = (exps?.data || exps || []) as Expense[];
      setAllExpenses(rows.map((e: any) => ({
        ...e,
        actual_amount: e.actual_amount || 0,
        amount: e.actual_amount || 0,
        status: e.payment_status || 'committed',
        purpose: e.description || e.purpose || null,
        event_name: e.event || e.event_name || null,
      })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, [userId, refetch]);

  async function handleMarkPaid(expId: string) {
    if (markingPaid) return;
    setMarkingPaid(expId);
    try {
      await fetch(`${RAILWAY_URL}/api/couple/expenses/${expId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'paid' }),
      });
      setAllExpenses(prev => prev.map(e => e.id === expId ? { ...e, status: 'paid', payment_status: 'paid' } : e));
      // Refresh money data so committed/paid totals update
      fetch(`${RAILWAY_URL}/api/v2/couple/money/${userId}`).then(r => r.json()).then(setData).catch(() => {});
      showToast('Marked as paid');
    } catch { showToast('Could not update'); }
    finally { setMarkingPaid(null); }
  }

  async function handleDeleteExpense(expId: string) {
    try {
      await fetch(`${RAILWAY_URL}/api/couple/expenses/${expId}`, { method: 'DELETE' });
      setAllExpenses(prev => prev.filter(e => e.id !== expId));
      fetch(`${RAILWAY_URL}/api/v2/couple/money/${userId}`).then(r => r.json()).then(setData).catch(() => {});
    } catch { showToast('Could not delete'); }
  }

  if (loading) return (
    <div style={{ paddingTop: 4 }}>
      <Shimmer h={140} br={16} />
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Shimmer h={8} w={80} br={4} />
        <Shimmer h={80} br={12} /><Shimmer h={80} br={12} />
      </div>
    </div>
  );

  const d = data || { totalBudget: 0, committed: 0, paid: 0, events: [], thisWeek: [], next30: [] };
  const committedPct = d.totalBudget ? Math.min(100, (d.committed / d.totalBudget) * 100) : 0;
  const paidPct = d.totalBudget ? Math.min(100, (d.paid / d.totalBudget) * 100) : 0;
  const remaining = d.totalBudget - d.committed;

  // Upcoming = unpaid with a due_date in the relevant window, pulled from allExpenses for real-time updates
  const now = new Date(); now.setHours(0,0,0,0);
  const in7 = new Date(now); in7.setDate(now.getDate() + 7);
  const in30 = new Date(now); in30.setDate(now.getDate() + 30);
  const unpaid = allExpenses.filter(e => e.status !== 'paid' && e.payment_status !== 'paid');
  const thisWeekPayments = unpaid.filter(e => { if (!e.due_date) return false; const dt = new Date(e.due_date); dt.setHours(0,0,0,0); return dt >= now && dt <= in7; });
  const next30Payments = unpaid.filter(e => { if (!e.due_date) return false; const dt = new Date(e.due_date); dt.setHours(0,0,0,0); return dt > in7 && dt <= in30; });
  const payments = payFilter === 'week' ? thisWeekPayments : next30Payments;

  // Event committed amounts from allExpenses
  const eventCommitted = (evName: string) =>
    allExpenses.filter(e => e.event_name === evName).reduce((s, e) => s + (e.actual_amount || e.amount || 0), 0);

  return (
    <div>
      <UpgradeCard userId={userId} currentTier={currentTier} onUpgraded={() => setCurrentTier(currentTier === 'basic' ? 'gold' : 'platinum')} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C8C4BE', margin: 0 }}>BUDGET</p>
        <button onClick={() => onOpenDreamAi('Am I over budget on anything?')} style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888580', background: 'none', border: '0.5px solid #E2DED8', borderRadius: 100, padding: '4px 10px', cursor: 'pointer', touchAction: 'manipulation', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10 }}>✦</span> Ask
        </button>
      </div>

      {/* Hero strip */}
      <div style={{ background: '#F4F1EC', border: '1px solid #E2DED8', borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <button onClick={() => setBudgetSheetOpen(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', display: 'block', marginBottom: 16 }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888580', margin: '0 0 4px' }}>TOTAL BUDGET  ›</p>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: '#0C0A09', margin: 0, lineHeight: 1 }}>
            {d.totalBudget > 0 ? fmtINR(d.totalBudget) : <span style={{ fontSize: 22, color: '#C8C4BE' }}>Tap to set</span>}
          </p>
        </button>
        <div style={{ display: 'flex', gap: 32, marginBottom: 14 }}>
          {[{ label: 'Committed', val: d.committed }, { label: 'Paid', val: d.paid }, { label: 'Remaining', val: remaining }].map(s => (
            <div key={s.label}>
              <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888580', margin: '0 0 3px' }}>{s.label}</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 400, color: s.label === 'Remaining' && remaining < 0 ? '#C9A84C' : '#3C3835', margin: 0 }}>{fmtINR(s.val)}</p>
            </div>
          ))}
        </div>
        {/* Progress bar: gold = committed, dark = paid */}
        <div style={{ position: 'relative', height: 6, borderRadius: 8, background: '#E2DED8', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${committedPct}%`, background: '#C9A84C', borderRadius: 8, transition: 'width 600ms cubic-bezier(0.22,1,0.36,1)' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${paidPct}%`, background: '#0C0A09', borderRadius: 8, transition: 'width 600ms cubic-bezier(0.22,1,0.36,1)' }} />
        </div>
        {d.totalBudget > 0 && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 300, color: '#8C8480', margin: '6px 0 0' }}>
            {Math.round(committedPct)}% committed · {Math.round(paidPct)}% paid
          </p>
        )}
      </div>

      {/* Envelope cards per event */}
      {d.events.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C8C4BE', margin: '0 0 12px' }}>BY EVENT</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.events.map(ev => {
              const committed = eventCommitted(ev.name);
              const pct = ev.budget > 0 ? Math.min(100, (committed / ev.budget) * 100) : 0;
              return (
                <div key={ev.id} style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <BudgetRing pct={pct} size={48} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 300, color: '#0C0A09', margin: '0 0 2px' }}>{ev.name}</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#8C8480', margin: 0 }}>
                      {fmtINR(committed)} of {ev.budget > 0 ? fmtINR(ev.budget) : '—'}
                    </p>
                  </div>
                  <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, color: '#C9A84C' }}>{Math.round(pct)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {budgetCategories.length > 0 && d.totalBudget > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C8C4BE', margin: '0 0 12px' }}>BY CATEGORY</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {budgetCategories.map(cat => {
              const catSpent = allExpenses.filter(e => e.category === cat.category_key || e.bucket === cat.category_key).reduce((s, e) => s + (e.actual_amount || e.amount || 0), 0);
              const catPct = cat.allocated_amount > 0 ? Math.min(100, (catSpent / cat.allocated_amount) * 100) : 0;
              return (
                <div key={cat.category_key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#3C3835', margin: 0, width: 136, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.display_name}</p>
                  <div style={{ flex: 1, height: 4, borderRadius: 4, background: '#E2DED8', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${catPct}%`, background: catPct > 90 ? '#C9A84C' : '#0C0A09', borderRadius: 4, transition: 'width 600ms cubic-bezier(0.22,1,0.36,1)' }} />
                  </div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 300, color: '#8C8480', margin: 0, width: 60, textAlign: 'right', flexShrink: 0 }}>{fmtINR(cat.allocated_amount)}</p>
                </div>
              );
            })}
          </div>
          <button onClick={() => setBudgetSheetOpen(true)} style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', background: 'none', border: '0.5px solid #E2DED8', borderRadius: 100, padding: '5px 12px', cursor: 'pointer', marginTop: 10, touchAction: 'manipulation' }}>
            EDIT CATEGORIES
          </button>
        </div>
      )}

      {/* Upcoming payments */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C8C4BE', margin: 0 }}>UPCOMING</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {([{ key: 'week' as PaymentFilter, label: 'This Week' }, { key: 'next30' as PaymentFilter, label: 'Next 30' }]).map(f => (
              <button key={f.key} onClick={() => setPayFilter(f.key)} style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, padding: '3px 9px', borderRadius: 100, border: payFilter === f.key ? 'none' : '1px solid #E2DED8', background: payFilter === f.key ? '#0C0A09' : 'transparent', color: payFilter === f.key ? '#FAFAF8' : '#8C8480', cursor: 'pointer', letterSpacing: '0.08em' }}>{f.label}</button>
            ))}
          </div>
        </div>
        {payments.length === 0 ? (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#8C8480', textAlign: 'center', padding: '20px 0' }}>
            {payFilter === 'week' ? 'No payments due this week.' : 'No payments due in the next 30 days.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {payments.map(exp => (
              <div key={exp.id} style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 300, color: '#0C0A09', margin: '0 0 2px' }}>{exp.vendor_name || '—'}</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#8C8480', margin: 0 }}>
                    {exp.purpose || exp.category || ''}{exp.due_date ? ` · ${formatDue(exp.due_date)}` : ''}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 400, color: '#C9A84C', margin: '0 0 6px' }}>{fmtINR(exp.actual_amount || exp.amount || 0)}</p>
                  <button onClick={() => handleMarkPaid(exp.id)} disabled={markingPaid === exp.id} style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400, letterSpacing: '0.12em', textTransform: 'uppercase', background: '#111111', color: '#F8F7F5', border: 'none', borderRadius: 100, padding: '4px 10px', cursor: 'pointer', touchAction: 'manipulation', opacity: markingPaid === exp.id ? 0.6 : 1 }}>
                    {markingPaid === exp.id ? '...' : 'MARK PAID'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All expenses */}
      {allExpenses.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C8C4BE', margin: '0 0 12px' }}>ALL ENTRIES</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {allExpenses.map((exp, i) => {
              const isPaid = exp.status === 'paid' || exp.payment_status === 'paid';
              return (
                <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: i < allExpenses.length - 1 ? '1px solid #E2DED8' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 300, color: '#0C0A09', margin: '0 0 2px', opacity: isPaid ? 0.5 : 1 }}>{exp.vendor_name || '—'}</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#8C8480', margin: 0 }}>{[exp.purpose, exp.event_name].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 400, color: isPaid ? '#8C8480' : '#3C3835', margin: '0 0 4px' }}>{fmtINR(exp.actual_amount || exp.amount || 0)}</p>
                    <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 100, ...(isPaid ? { background: '#F4F1EC', color: '#8C8480' } : { background: '#FFF8EC', color: '#C9A84C' }) }}>
                      {isPaid ? 'PAID' : 'COMMITTED'}
                    </span>
                  </div>
                  <button onClick={() => handleDeleteExpense(exp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8C4BE', fontSize: 16, padding: '4px 0 4px 8px', touchAction: 'manipulation', flexShrink: 0 }}>×</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {allExpenses.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: '#3C3835', margin: '0 0 8px' }}>No expenses yet.</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#8C8480', margin: 0 }}>Tap + to log your first entry.</p>
        </div>
      )}

      <BudgetSetupSheet visible={budgetSheetOpen} onClose={() => setBudgetSheetOpen(false)} userId={userId} currentTotal={d.totalBudget} onSaved={n => { setData(prev => prev ? { ...prev, totalBudget: n } : prev); loadData(); }} />
      <Toast msg={toast} />
    </div>
  );
}

// ─── Vendors (My Vendors) ─────────────────────────────────────────────────────

type CoupleVendor = {
  id: string;
  vendor_id?: string;
  name: string;
  category?: string;
  city?: string;
  phone?: string;
  quoted_total?: number;
  status: string;
  notes?: string;
  source?: string;
  events?: string[];
};

const VENDOR_STATUS_ORDER = ['considering', 'contacted', 'booked', 'paid'];

function statusLabel(s: string) {
  return s === 'considering' ? 'Considering' : s === 'contacted' ? 'Contacted' : s === 'booked' ? 'Booked' : s === 'paid' ? 'Paid' : s;
}

function statusStyle(s: string): React.CSSProperties {
  if (s === 'paid') return { background: '#F4F1EC', color: '#8C8480' };
  if (s === 'booked') return { background: '#0C0A09', color: '#F8F7F5' };
  if (s === 'contacted') return { background: '#FFF8EC', color: '#C9A84C' };
  return { background: 'transparent', color: '#8C8480', border: '1px solid #E2DED8' };
}

const VENDOR_CATEGORIES = ['Photographer', 'MUA', 'Decorator', 'Venue', 'Designer', 'Event Manager', 'Caterer', 'DJ', 'Other'];

// ─── AddVendorSheet ───────────────────────────────────────────────────────────
function AddVendorSheet({ visible, onClose, userId, events, onSuccess }: {
  visible: boolean; onClose: () => void; userId: string;
  events: EventOption[]; onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }
  function reset() { setName(''); setCategory(''); setPhone(''); setPrice(''); setNotes(''); }

  async function handleSubmit() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${RAILWAY_URL}/api/couple/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: userId,
          name: name.trim(),
          category: category || null,
          phone: phone.trim() || null,
          quoted_total: price ? Number(price) : 0,
          notes: notes.trim() || null,
          status: 'considering',
          source: 'manual',
        }),
      });
      const json = await res.json();
      if (json.success === false) { showToast(json.error || 'Error adding vendor'); }
      else { showToast('Maker added'); onSuccess(); onClose(); reset(); }
    } catch { showToast('Network error'); }
    finally { setSubmitting(false); }
  }

  return (
    <>
      <SheetWrap visible={visible} onClose={onClose} title="Add Maker" height="88vh">
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Arjun Kartha Studio"
              style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Category</label>
            <div style={pillGroup}>
              {VENDOR_CATEGORIES.map(c => (
                <Pill key={c} label={c} active={category === c} onPress={() => setCategory(category === c ? '' : c)} />
              ))}
            </div>
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              inputMode="tel" placeholder="Optional"
              style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
          <div style={{ ...fieldWrapper, position: 'relative' }}>
            <label style={fieldLabel}>Quoted Price</label>
            <span style={{ position: 'absolute', bottom: 13, left: 4, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#888580' }}>₹</span>
            <input value={price} onChange={e => setPrice(e.target.value)}
              inputMode="numeric" placeholder="0"
              style={{ ...fieldInput, paddingLeft: 18 }}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any context — referral, preference, availability..."
              rows={3}
              style={{ ...fieldInput, height: 'auto', resize: 'none', padding: '8px 4px', lineHeight: 1.6 }}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
        </div>
        <div style={{ padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', borderTop: '0.5px solid #E2DED8', background: '#FFFFFF' }}>
          <button onClick={handleSubmit} disabled={!name.trim() || submitting} style={submitBtn(!name.trim() || submitting)}>
            {submitting ? '...' : 'ADD MAKER'}
          </button>
        </div>
      </SheetWrap>
      <Toast msg={toast} />
    </>
  );
}

// ─── BookingDetailSheet ───────────────────────────────────────────────────────
function BookingDetailSheet({ visible, onClose, vendorName, quotedTotal, events, onConfirm }: {
  visible: boolean; onClose: () => void; vendorName: string; quotedTotal: number;
  events: EventOption[];
  onConfirm: (total: number, advance: number, balanceDueDate: string, eventNames: string[]) => void;
}) {
  const [total, setTotal] = useState(quotedTotal > 0 ? String(quotedTotal) : '');
  const [advance, setAdvance] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) { setTotal(quotedTotal > 0 ? String(quotedTotal) : ''); setAdvance(''); setDueDate(''); setSelectedEvents([]); }
  }, [visible, quotedTotal]);

  const totalNum = Number(total) || 0;
  const advanceNum = Math.min(Number(advance) || 0, totalNum);
  const balance = totalNum - advanceNum;

  async function handleSave() {
    if (!totalNum || saving) return;
    setSaving(true);
    await onConfirm(totalNum, advanceNum, dueDate, selectedEvents);
    setSaving(false);
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(17,17,17,0.4)', opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none', transition: 'opacity 280ms' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501, background: '#FFFFFF', borderRadius: '24px 24px 0 0', transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)', padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8' }} />
        </div>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: '#111111', margin: '0 0 4px' }}>Booking {vendorName}</p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: '0 0 24px' }}>Log the financials — we'll add them to Money automatically.</p>

        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888580', margin: '0 0 6px' }}>Total contract amount *</p>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span style={{ position: 'absolute', bottom: 13, left: 4, fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 300, color: '#888580' }}>₹</span>
          <input value={total} onChange={e => setTotal(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric" placeholder="0"
            style={{ ...fieldInput, paddingLeft: 18, fontSize: 18 }}
            onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
            onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
          />
        </div>

        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888580', margin: '0 0 6px' }}>Advance paid</p>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span style={{ position: 'absolute', bottom: 13, left: 4, fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 300, color: '#888580' }}>₹</span>
          <input value={advance} onChange={e => setAdvance(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric" placeholder="0"
            style={{ ...fieldInput, paddingLeft: 18 }}
            onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
            onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
          />
        </div>

        {totalNum > 0 && (
          <div style={{ background: '#F4F1EC', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', margin: '0 0 2px' }}>Advance</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 400, color: '#3C3835', margin: 0 }}>₹{advanceNum.toLocaleString('en-IN')}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', margin: '0 0 2px' }}>Balance due</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 400, color: '#C9A84C', margin: 0 }}>₹{balance.toLocaleString('en-IN')}</p>
            </div>
          </div>
        )}

        {events.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888580', margin: '0 0 8px' }}>Which event?</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {events.map(ev => (
                <button key={ev.id} onClick={() => setSelectedEvents(prev => prev.includes(ev.name) ? prev.filter(e => e !== ev.name) : [...prev, ev.name])}
                  style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 100, border: selectedEvents.includes(ev.name) ? 'none' : '1px solid #E2DED8', background: selectedEvents.includes(ev.name) ? '#0C0A09' : 'transparent', color: selectedEvents.includes(ev.name) ? '#F8F7F5' : '#8C8480', cursor: 'pointer', touchAction: 'manipulation' }}>
                  {ev.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888580', margin: '0 0 6px' }}>Balance due date</p>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
          style={{ ...fieldInput, marginBottom: 28, colorScheme: 'light' }}
          onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
          onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
        />

        <div style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
          <button onClick={handleSave} disabled={!totalNum || saving} style={submitBtn(!totalNum || saving)}>
            {saving ? '...' : 'CONFIRM BOOKING'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── VendorDetailSheet ────────────────────────────────────────────────────────
function VendorDetailSheet({ vendor, userId, allTasks, allExpenses, events, onClose, onUpdated, onDeleted, onMoneyRefetch }: {
  vendor: CoupleVendor;
  userId: string;
  allTasks: Task[];
  allExpenses: Expense[];
  events: EventOption[];
  onClose: () => void;
  onUpdated: (v: CoupleVendor) => void;
  onDeleted: (id: string) => void;
  onMoneyRefetch: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [notes, setNotes] = useState(vendor.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [status, setStatus] = useState(vendor.status);
  const [thread, setThread] = useState<{ id: string; last_message_preview: string; last_message_at: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  const [pendingBookingEventId, setPendingBookingEventId] = useState<string | null>(null);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  useEffect(() => { setTimeout(() => setVisible(true), 10); }, []);

  // Load message thread if TDW vendor
  useEffect(() => {
    if (!vendor.vendor_id) return;
    fetch(`${RAILWAY_URL}/api/enquiries/couple/${userId}`)
      .then(r => r.json())
      .then(d => {
        const threads = d?.data || [];
        const match = threads.find((t: any) => t.vendor_id === vendor.vendor_id);
        if (match) setThread({ id: match.id, last_message_preview: match.last_message_preview, last_message_at: match.last_message_at });
      }).catch(() => {});
  }, [vendor.vendor_id, userId]);

  // Approximate joins
  const linkedTasks = allTasks.filter(t =>
    t.assigned_to && vendor.name && t.assigned_to.toLowerCase().includes(vendor.name.toLowerCase().split(' ')[0])
  );
  const linkedExpenses = allExpenses.filter(e =>
    e.vendor_name && vendor.name && e.vendor_name.toLowerCase().includes(vendor.name.toLowerCase().split(' ')[0])
  );

  const handleClose = () => { setVisible(false); setTimeout(onClose, 300); };

  async function handleStatusChange(newStatus: string) {
    // For 'booked' — skip event picker, go straight to booking sheet (has its own multi-event picker)
    if (newStatus === 'booked') {
      setPendingBookingEventId(null);
      setBookingSheetOpen(true);
      return;
    }
    await commitStatusChange(newStatus, null);
  }

  async function commitStatusChange(newStatus: string, eventId: string | null) {
    setShowEventPicker(false);
    setPendingStatus(null);
    if (newStatus === 'booked') {
      setPendingBookingEventId(eventId);
      setBookingSheetOpen(true);
      return;
    }
    setStatus(newStatus);
    try {
      await fetch(`${RAILWAY_URL}/api/couple/vendors/${vendor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, event_id: eventId }),
      });
      onUpdated({ ...vendor, status: newStatus });
      // When marked paid — mark matching expenses paid, or create one if none exist
      if (newStatus === 'paid') {
        const matching = allExpenses.filter(e =>
          e.vendor_name && vendor.name &&
          e.vendor_name.toLowerCase().includes(vendor.name.toLowerCase().split(' ')[0]) &&
          e.payment_status !== 'paid'
        );
        if (matching.length > 0) {
          await Promise.all(matching.map(e =>
            fetch(`${RAILWAY_URL}/api/couple/expenses/${e.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ payment_status: 'paid' }),
            })
          ));
        } else if (vendor.quoted_total && vendor.quoted_total > 0) {
          // No expense rows exist — create one so Money tab reflects the payment
          await fetch(`${RAILWAY_URL}/api/couple/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              couple_id: userId,
              vendor_name: vendor.name,
              description: `${vendor.category || 'Vendor'} — full payment`,
              actual_amount: vendor.quoted_total,
              payment_status: 'paid',
              category: (vendor.category || 'other').toLowerCase(),
              event: 'General',
            }),
          });
        }
        onMoneyRefetch();
      }
    } catch { showToast('Could not update status'); setStatus(vendor.status); }
  }

  async function handleBookingConfirmed(total: number, advance: number, balanceDueDate: string, eventNames: string[]) {
    setBookingSheetOpen(false);
    setStatus('booked');
    try {
      await fetch(`${RAILWAY_URL}/api/couple/vendors/${vendor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'booked', event_id: pendingBookingEventId, quoted_total: total, events: eventNames || [] }),
      });
      onUpdated({ ...vendor, status: 'booked', quoted_total: total });
      if (advance > 0) {
        await fetch(`${RAILWAY_URL}/api/couple/expenses`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ couple_id: userId, vendor_name: vendor.name, description: `Advance — ${vendor.category || 'vendor'}${eventNames.length ? ' · ' + eventNames.join(', ') : ''}`, actual_amount: advance, payment_status: 'paid', category: (vendor.category || 'other').toLowerCase(), event: 'General' }),
        });
      }
      const balance = total - advance;
      if (balance > 0) {
        await fetch(`${RAILWAY_URL}/api/couple/expenses`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ couple_id: userId, vendor_name: vendor.name, description: `Balance — ${vendor.category || 'vendor'}`, actual_amount: balance, payment_status: 'committed', due_date: balanceDueDate || null, category: (vendor.category || 'other').toLowerCase(), event: 'General' }),
        });
      }
      showToast('Booked! Expenses logged in Money.');
    } catch { showToast('Booked, but could not log expenses.'); }
    setPendingBookingEventId(null);
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      await fetch(`${RAILWAY_URL}/api/couple/vendors/${vendor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      onUpdated({ ...vendor, notes });
      showToast('Notes saved');
    } catch { showToast('Could not save notes'); }
    finally { setSavingNotes(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`${RAILWAY_URL}/api/couple/vendors/${vendor.id}`, { method: 'DELETE' });
      onDeleted(vendor.id);
      handleClose();
    } catch { showToast('Could not delete'); setDeleting(false); }
  }

  const sectionLabel: React.CSSProperties = {
    fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
    letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C8C4BE',
    margin: '0 0 10px',
  };

  return (
    <>
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(12,10,9,0.45)', opacity: visible ? 1 : 0, transition: 'opacity 280ms cubic-bezier(0.22,1,0.36,1)', pointerEvents: visible ? 'auto' : 'none' }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401,
        height: '90vh', background: '#F8F7F5',
        borderRadius: '20px 20px 0 0',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Handle + header */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8' }} />
        </div>
        <div style={{ padding: '8px 20px 16px', borderBottom: '0.5px solid #E2DED8', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 300, color: '#0C0A09', margin: '0 0 4px' }}>{vendor.name}</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#8C8480', margin: 0 }}>
                {[vendor.category, vendor.city].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              {vendor.vendor_id && (
                <a href={`/couple/vendor/${vendor.vendor_id}`} style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888580', background: '#F4F1EC', border: 'none', borderRadius: 100, padding: '6px 12px', textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>View Profile</a>
              )}
              <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C8480', fontSize: 18, padding: 4, touchAction: 'manipulation' }}>✕</button>
            </div>
          </div>
          {/* Status chips */}
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            {VENDOR_STATUS_ORDER.map(s => (
              <button key={s} onClick={() => handleStatusChange(s)} style={{
                fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '4px 10px', borderRadius: 100, cursor: 'pointer',
                touchAction: 'manipulation',
                ...statusStyle(s === status ? s : 'considering'),
                ...(s === status ? statusStyle(s) : { background: 'transparent', color: '#C8C4BE', border: '1px solid #E2DED8' }),
              }}>{statusLabel(s)}</button>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px', paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}>

          {/* Contact */}
          {(vendor.phone || vendor.quoted_total) && (
            <div style={{ marginBottom: 24 }}>
              <p style={sectionLabel}>Contact</p>
              <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14, overflow: 'hidden' }}>
                {vendor.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: vendor.quoted_total ? '0.5px solid #E2DED8' : 'none' }}>
                    <div>
                      <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', margin: '0 0 3px' }}>Phone</p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#0C0A09', margin: 0 }}>{vendor.phone}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a href={`tel:${vendor.phone}`} style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0C0A09', background: '#F4F1EC', border: 'none', borderRadius: 100, padding: '6px 12px', textDecoration: 'none', cursor: 'pointer' }}>Call</a>
                      <a href={`https://wa.me/${vendor.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F8F7F5', background: '#25D366', border: 'none', borderRadius: 100, padding: '6px 12px', textDecoration: 'none', cursor: 'pointer' }}>WhatsApp</a>
                    </div>
                  </div>
                )}
                {!!vendor.quoted_total && (
                  <div style={{ padding: '14px 16px' }}>
                    <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', margin: '0 0 3px' }}>Quoted</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 400, color: '#C9A84C', margin: 0 }}>{fmtINR(vendor.quoted_total || 0)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages thread */}
          {thread && (
            <div style={{ marginBottom: 24 }}>
              <p style={sectionLabel}>Messages</p>
              <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#3C3835', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{thread.last_message_preview || 'Thread open'}</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 300, color: '#8C8480', margin: 0 }}>{thread.last_message_at ? new Date(thread.last_message_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</p>
                </div>
                <a href={`/couple/messages?thread=${thread.id}`} style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0C0A09', background: '#F4F1EC', padding: '6px 12px', borderRadius: 100, textDecoration: 'none', flexShrink: 0 }}>Open</a>
              </div>
            </div>
          )}

          {/* Linked expenses */}
          {linkedExpenses.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={sectionLabel}>Payments</p>
              <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14, overflow: 'hidden' }}>
                {linkedExpenses.map((exp, i) => {
                  const isPaid = exp.status === 'paid' || exp.payment_status === 'paid';
                  return (
                    <div key={exp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < linkedExpenses.length - 1 ? '0.5px solid #E2DED8' : 'none' }}>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#3C3835', margin: 0 }}>{exp.purpose || exp.category || '—'}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 400, color: isPaid ? '#8C8480' : '#C9A84C', margin: 0 }}>{fmtINR(exp.actual_amount || exp.amount || 0)}</p>
                        <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 100, ...(isPaid ? { background: '#F4F1EC', color: '#8C8480' } : { background: '#FFF8EC', color: '#C9A84C' }) }}>{isPaid ? 'PAID' : 'DUE'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Linked tasks */}
          {linkedTasks.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={sectionLabel}>Tasks</p>
              <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14, overflow: 'hidden' }}>
                {linkedTasks.map((t, i) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: i < linkedTasks.length - 1 ? '0.5px solid #E2DED8' : 'none' }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${t.status === 'done' ? '#C9A84C' : '#E2DED8'}`, background: t.status === 'done' ? '#C9A84C' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {t.status === 'done' && <span style={{ color: '#fff', fontSize: 9 }}>✓</span>}
                    </span>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 300, color: '#0C0A09', margin: 0, textDecoration: t.status === 'done' ? 'line-through' : 'none', opacity: t.status === 'done' ? 0.5 : 1 }}>{t.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: 24 }}>
            <p style={sectionLabel}>Notes</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Private notes about this maker..."
              rows={4}
              style={{ width: '100%', background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14, padding: '14px 16px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#0C0A09', resize: 'none', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E2DED8'; }}
            />
            {notes !== (vendor.notes || '') && (
              <button onClick={handleSaveNotes} disabled={savingNotes} style={{ marginTop: 8, fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase', background: '#111111', color: '#F8F7F5', border: 'none', borderRadius: 100, padding: '8px 18px', cursor: 'pointer', touchAction: 'manipulation' }}>
                {savingNotes ? '...' : 'SAVE NOTES'}
              </button>
            )}
          </div>

          {/* Delete */}
          <button onClick={handleDelete} disabled={deleting} style={{ width: '100%', height: 44, borderRadius: 100, background: 'transparent', border: '1px solid #E2DED8', fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', cursor: 'pointer', touchAction: 'manipulation' }}>
            {deleting ? '...' : 'REMOVE MAKER'}
          </button>
        </div>
        <Toast msg={toast} />

        {/* Event picker — shown when tapping Booked/Paid */}
        {showEventPicker && (
          <>
            <div onClick={() => { setShowEventPicker(false); setPendingStatus(null); }} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.4)' }} />
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501, background: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: '20px 20px 0' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8', margin: '0 auto 16px' }} />
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: '#111111', margin: '0 0 6px' }}>Which event is this for?</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: '0 0 20px' }}>Tap an event to link this maker.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {events.map(ev => (
                  <button key={ev.id} onClick={() => commitStatusChange(pendingStatus!, ev.id)} style={{ width: '100%', height: 48, borderRadius: 100, background: '#F4F1EC', border: '1px solid #E2DED8', fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 300, color: '#111111', cursor: 'pointer', touchAction: 'manipulation' }}>
                    {ev.name}
                  </button>
                ))}
              </div>
              <button onClick={() => commitStatusChange(pendingStatus!, null)} style={{ width: '100%', height: 44, borderRadius: 100, background: 'transparent', border: 'none', fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', cursor: 'pointer', touchAction: 'manipulation', marginBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
                Skip — no event
              </button>
            </div>
          </>
        )}
        <BookingDetailSheet
          visible={bookingSheetOpen}
          onClose={() => setBookingSheetOpen(false)}
          vendorName={vendor.name}
          quotedTotal={vendor.quoted_total || 0}
          events={events}
          onConfirm={handleBookingConfirmed}
        />
      </div>
    </>
  );
}

// ─── VendorsTab ───────────────────────────────────────────────────────────────
function VendorsTab({ userId, allTasks, allExpenses, events, refetch, onMoneyRefetch }: {
  userId: string;
  allTasks: Task[];
  allExpenses: Expense[];
  events: EventOption[];
  refetch: number;
  onMoneyRefetch: () => void;
}) {
  const [vendors, setVendors] = useState<CoupleVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CoupleVendor | null>(null);

  function loadVendors() {
    setLoading(true);
    fetch(`${RAILWAY_URL}/api/couple/vendors/${userId}`)
      .then(r => r.json())
      .then(d => { setVendors(Array.isArray(d?.data) ? d.data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadVendors(); }, [userId, refetch]);

  function handleUpdated(updated: CoupleVendor) {
    setVendors(prev => prev.map(v => v.id === updated.id ? updated : v));
    setSelected(updated);
  }
  function handleDeleted(id: string) {
    setVendors(prev => prev.filter(v => v.id !== id));
    setSelected(null);
  }

  // Group by status in pipeline order
  const groups = VENDOR_STATUS_ORDER
    .map(s => ({ status: s, items: vendors.filter(v => v.status === s) }))
    .filter(g => g.items.length > 0);

  if (loading) return (
    <div style={{ paddingTop: 12 }}>
      {[0, 1, 2].map(i => <Shimmer key={i} h={72} br={14} mt={i > 0 ? 8 : 0} />)}
    </div>
  );

  if (vendors.length === 0) return (
    <div style={{ textAlign: 'center', marginTop: 72 }}>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300, fontStyle: 'italic', color: '#3C3835', margin: '0 0 10px' }}>No makers yet.</p>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#8C8480', margin: 0, lineHeight: 1.6 }}>Makers you save, enquire about, or add manually will appear here.</p>
    </div>
  );

  return (
    <>
      <div>
        {groups.map(({ status, items }) => (
          <div key={status} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C8C4BE', margin: 0 }}>{statusLabel(status)}</p>
              <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, color: '#C8C4BE' }}>{items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(v => (
                <button key={v.id} onClick={() => setSelected(v)} style={{
                  background: '#FFFFFF', border: '1px solid #E2DED8',
                  borderRadius: 14, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer', textAlign: 'left', touchAction: 'manipulation',
                  width: '100%',
                }}>
                  {/* Category initial circle */}
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F4F1EC', border: '1px solid #E2DED8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 300, color: '#8C8480' }}>
                      {(v.category || v.name)?.[0]?.toUpperCase() || '·'}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 300, color: '#0C0A09', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#8C8480', margin: 0 }}>
                      {[v.category, (v.events || []).length > 0 ? (v.events || []).join(', ') : null, v.quoted_total ? fmtINR(v.quoted_total) : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {/* Status pill */}
                  <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 100, flexShrink: 0, ...statusStyle(v.status) }}>
                    {statusLabel(v.status)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <VendorDetailSheet
          vendor={selected}
          userId={userId}
          allTasks={allTasks}
          allExpenses={allExpenses}
          events={events}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
          onMoneyRefetch={onMoneyRefetch}
        />
      )}
    </>
  );
}

// ─── People ──────────────────────────────────────────────────────────────────

type Guest = {
  id: string;
  name: string;
  phone?: string;
  events?: string[];
  rsvp_status?: Record<string, 'confirmed' | 'pending' | 'declined'>;
  event_name?: string;
  rsvp?: 'confirmed' | 'pending' | 'declined';
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function PeopleTab({ userId, refetch }: { userId: string; refetch: number }) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState('all');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [sending, setSending] = useState(false);

  function showMsg(m: string) { setImportMsg(m); setTimeout(() => setImportMsg(''), 3000); }

  async function handleCSVImport(file: File) {
    if (importing) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const dataLines = lines[0]?.toLowerCase().includes('name') ? lines.slice(1) : lines;
      const rows = dataLines.map(line => {
        const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
        return { name: parts[0] || '', phone: parts[1] || '', side: (parts[2] || 'bride').toLowerCase() };
      }).filter(r => r.name);
      if (rows.length === 0) { showMsg('No valid rows. Format: Name, Phone, Side'); return; }
      const res = await fetch(`${RAILWAY_URL}/api/v2/couple/guests/bulk`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_id: userId, guests: rows }),
      });
      const json = await res.json();
      if (json.success) {
        showMsg(`Added ${json.added} guests${json.skipped > 0 ? `, ${json.skipped} skipped` : ''}`);
        fetch(`${RAILWAY_URL}/api/v2/couple/guests/${userId}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setGuests(d); });
      } else { showMsg(json.error || 'Import failed'); }
    } catch { showMsg('Import failed'); }
    finally { setImporting(false); }
  }

  async function handleBroadcast() {
    if (!broadcastText.trim() || sending) return;
    setSending(true);
    try {
      const ids = selectMode && selectedGuests.size > 0 ? Array.from(selectedGuests) : [];
      const res = await fetch(`${RAILWAY_URL}/api/v2/couple/guests/broadcast`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_id: userId, guest_ids: ids, message: broadcastText }),
      });
      const json = await res.json();
      if (json.success) {
        showMsg(`Sent to ${json.sent} guests${json.failed > 0 ? `, ${json.failed} failed` : ''}`);
        setBroadcastOpen(false); setBroadcastText(''); setSelectedGuests(new Set()); setSelectMode(false);
      } else { showMsg(json.error || 'Failed to send'); }
    } catch { showMsg('Network error'); }
    finally { setSending(false); }
  }

  function toggleGuest(id: string) {
    setSelectedGuests(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  useEffect(() => {
    setLoading(true);
    fetch(`${RAILWAY_URL}/api/v2/couple/guests/${userId}`)
      .then(r => r.json())
      .then(d => { setGuests(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId, refetch]);

  const allEvents = Array.from(new Set(guests.flatMap(g => g.events || (g.event_name ? [g.event_name] : []))));
  const filtered = activeEvent === 'all' ? guests : guests.filter(g => (g.events || [g.event_name]).includes(activeEvent));
  const confirmed = guests.filter(g => g.rsvp === 'confirmed' || Object.values(g.rsvp_status || {}).some(v => v === 'confirmed')).length;
  const pending = guests.filter(g => g.rsvp === 'pending' || Object.values(g.rsvp_status || {}).some(v => v === 'pending')).length;

  const rsvpChipStyle = (status: string): React.CSSProperties => {
    if (status === 'confirmed') return { background: '#F4F1EC', color: '#8C8480', border: '1px solid #E2DED8' };
    if (status === 'declined') return { background: '#F4F1EC', color: '#8C8480', border: '1px solid #E2DED8', textDecoration: 'line-through' };
    return { background: '#FFF8EC', color: '#C9A84C', border: 'none' };
  };

  if (loading) return (
    <div style={{ paddingTop: 4 }}>
      <Shimmer h={80} br={12} />
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[0,1,2,3,4].map(i => <Shimmer key={i} h={56} br={0} mt={2} />)}
      </div>
    </div>
  );

  return (
    <div>
      {/* CSV Import + Select + Broadcast */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <label style={{ cursor: 'pointer' }}>
          <input type="file" accept=".csv,text/csv" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVImport(f); e.target.value = ''; }}
          />
          <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: importing ? '#C9A84C' : '#888580', border: '0.5px solid #E2DED8', borderRadius: 100, padding: '5px 12px', cursor: 'pointer' }}>
            {importing ? 'IMPORTING...' : '↑ IMPORT CSV'}
          </div>
        </label>
        <button onClick={() => { setSelectMode(s => !s); setSelectedGuests(new Set()); }}
          style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: selectMode ? '#F8F7F5' : '#888580', background: selectMode ? '#0C0A09' : 'none', border: selectMode ? 'none' : '0.5px solid #E2DED8', borderRadius: 100, padding: '5px 12px', cursor: 'pointer', touchAction: 'manipulation' }}>
          {selectMode ? `✓ ${selectedGuests.size} SELECTED` : 'SELECT'}
        </button>
        {selectMode && (
          <>
            <button onClick={() => setSelectedGuests(selectedGuests.size === guests.length ? new Set() : new Set(guests.map(g => g.id)))}
              style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', background: 'none', border: '0.5px solid #E2DED8', borderRadius: 100, padding: '5px 12px', cursor: 'pointer', touchAction: 'manipulation' }}>
              {selectedGuests.size === guests.length ? 'DESELECT ALL' : 'SELECT ALL'}
            </button>
            <button onClick={() => setBroadcastOpen(true)}
              style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#F8F7F5', background: '#C9A84C', border: 'none', borderRadius: 100, padding: '5px 12px', cursor: 'pointer', touchAction: 'manipulation' }}>
              BROADCAST
            </button>
          </>
        )}
      </div>
      {importMsg && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#3C3835', background: '#F4F1EC', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{importMsg}</div>}

      <div style={{ background: '#F4F1EC', border: '1px solid #E2DED8', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-around', marginBottom: 16 }}>
        {[{ label: 'Total', val: guests.length }, { label: 'Confirmed', val: confirmed }, { label: 'Pending', val: pending }].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: '#0C0A09', margin: '0 0 4px', lineHeight: 1 }}>{s.val}</p>
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8C8480', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>
      {allEvents.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 16, paddingBottom: 4 }}>
          {['all', ...allEvents].map(ev => (
            <button key={ev} onClick={() => setActiveEvent(ev)} style={{
              flexShrink: 0, fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, padding: '4px 10px', borderRadius: 100,
              border: activeEvent === ev ? 'none' : '1px solid #E2DED8',
              background: activeEvent === ev ? '#0C0A09' : 'transparent',
              color: activeEvent === ev ? '#FAFAF8' : '#8C8480',
              cursor: 'pointer', letterSpacing: '0.1em', whiteSpace: 'nowrap',
            }}>{ev === 'all' ? 'All Events' : ev}</button>
          ))}
        </div>
      )}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 64 }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: '#3C3835', margin: '0 0 8px' }}>Your guest list is empty.</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#8C8480', margin: 0 }}>Add guests and invite them to your events.</p>
        </div>
      ) : (
        filtered.map((guest, i) => {
          const statuses = guest.rsvp_status ? Object.entries(guest.rsvp_status) : guest.rsvp ? [[guest.event_name || 'Wedding', guest.rsvp]] : [];
          const shown = statuses.slice(0, 2);
          const more = statuses.length - 2;
          return (
            <div key={guest.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0', borderBottom: i < filtered.length - 1 ? '1px solid #E2DED8' : 'none', position: 'relative' }}>
              {selectMode && (
                <button onClick={() => toggleGuest(guest.id)} style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 4, border: selectedGuests.has(guest.id) ? 'none' : '1.5px solid #E2DED8', background: selectedGuests.has(guest.id) ? '#C9A84C' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}>
                  {selectedGuests.has(guest.id) && <span style={{ color: '#FFFFFF', fontSize: 12, lineHeight: 1 }}>&#10003;</span>}
                </button>
              )}
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F4F1EC', border: '1px solid #E2DED8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 400, color: '#8C8480' }}>{initials(guest.name)}</span>
              </div>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 300, color: '#0C0A09', margin: 0, flex: 1 }}>{guest.name}</p>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {shown.map(([ev, status]) => (
                  <span key={ev} style={{ ...rsvpChipStyle(status as string), fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 100 }}>{ev as string}</span>
                ))}
                {more > 0 && <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, color: '#8C8480' }}>+{more}</span>}
              </div>
              <button onClick={async () => { if (!confirm('Remove ' + guest.name + ' from guest list?')) return; await fetch(`${RAILWAY_URL}/api/v2/couple/guests/${guest.id}`, { method: 'DELETE' }); setGuests(prev => prev.filter(g => g.id !== guest.id)); }} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: 'none', border: '0.5px solid #E2DED8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation', color: '#C8C4BE', fontSize: 16 }}>&#215;</button>
            </div>
          );
        })
      )}
      {/* Broadcast Sheet */}
      <>
        <div onClick={() => setBroadcastOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(17,17,17,0.4)', opacity: broadcastOpen ? 1 : 0, pointerEvents: broadcastOpen ? 'auto' : 'none', transition: 'opacity 280ms' }} />
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401, background: '#FFFFFF', borderRadius: '24px 24px 0 0', transform: broadcastOpen ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)', padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8' }} /></div>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: '#111111', margin: '0 0 4px' }}>Broadcast via WhatsApp</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: '0 0 16px' }}>
            {selectMode && selectedGuests.size > 0 ? `Sending to ${selectedGuests.size} selected guests` : `Sending to all ${guests.filter((g: Guest) => g.phone).length} guests with phones`}
          </p>
          <textarea value={broadcastText} onChange={e => setBroadcastText(e.target.value)}
            placeholder="Hi there! Just a reminder — our wedding is on June 14th. Please confirm attendance."
            rows={5}
            style={{ width: '100%', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#111111', border: '0.5px solid #E2DED8', borderRadius: 12, padding: '12px 14px', outline: 'none', resize: 'none', boxSizing: 'border-box' as const, background: '#F8F7F5', lineHeight: 1.6, marginBottom: 16 }}
          />
          <div style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
            <button onClick={handleBroadcast} disabled={!broadcastText.trim() || sending} style={submitBtn(!broadcastText.trim() || sending)}>
              {sending ? 'SENDING...' : 'SEND BROADCAST'}
            </button>
          </div>
        </div>
      </>
    </div>
  );
}

// ─── Events ──────────────────────────────────────────────────────────────────

type WeddingEvent = {
  id: string;
  name: string;
  date?: string;
  venue?: string;
  task_count?: number;
  vendor_count?: number;
  guest_count?: number;
};

function formatEventDate(d?: string) {
  if (!d) return { month: '—', day: '—' };
  const dt = new Date(d);
  return {
    month: dt.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
    day: dt.getDate().toString(),
  };
}

function formatEventDateLong(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

type SheetTab = 'tasks' | 'vendors' | 'guests';

interface EventSheetProps {
  event: WeddingEvent;
  allTasks: Task[];
  allGuests: Guest[];
  allExpenses: Expense[];
  allVendors: CoupleVendor[];
  onClose: () => void;
  onEventUpdated?: (id: string, name: string, date: string, venue: string) => void;
}

// ─── TaskCardReadOnly — used inside EventDetailSheet (no actions) ─────────────
function TaskCardReadOnly({ task }: { task: Task }) {
  const isDone = task.status === 'done' || !!task.is_complete;
  const prioColor = task.priority === 'high' ? '#C9A84C' : task.priority === 'medium' ? '#8C8480' : '#E2DED8';
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12,
      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
      opacity: isDone ? 0.5 : 1,
    }}>
      <span style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${isDone ? '#C9A84C' : '#E2DED8'}`, background: isDone ? '#C9A84C' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isDone && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 300, color: '#0C0A09', margin: '0 0 2px', textDecoration: isDone ? 'line-through' : 'none' }}>{task.title}</p>
        {task.due_date && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#8C8480', margin: 0 }}>{formatDue(task.due_date)}</p>}
      </div>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: prioColor, flexShrink: 0 }} />
    </div>
  );
}

// ─── EventDetailSheet ─────────────────────────────────────────────────────────
function EventDetailSheet({ event, allTasks, allGuests, allExpenses, allVendors, onClose, onEventUpdated }: EventSheetProps) {
  const [sheetTab, setSheetTab] = useState<SheetTab>('tasks');
  const [visible, setVisible] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(event.name || '');
  const [editDate, setEditDate] = useState(event.date ? event.date.split('T')[0] : '');
  const [editVenue, setEditVenue] = useState(event.venue || '');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  async function handleSaveEdit() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${RAILWAY_URL}/api/couple/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_name: editName, event_date: editDate || null, venue: editVenue || null }),
      });
      const json = await res.json();
      if (json.success === false) { showToast('Could not save'); }
      else {
        event.name = editName; event.date = editDate; event.venue = editVenue;
        onEventUpdated?.(event.id, editName, editDate, editVenue);
        showToast('Saved!'); setEditOpen(false);
      }
    } catch { showToast('Network error'); }
    finally { setSaving(false); }
  }

  const eventTasks = allTasks.filter(t => (t.events?.name || t.event_name) === event.name);
  const eventGuests = allGuests.filter(g => (g.events || []).includes(event.name));
  const eventExpenses = allExpenses.filter(e => e.event_name === event.name);
  const bookedVendors = (allVendors || []).filter(v =>
    (v.status === 'booked' || v.status === 'paid') &&
    (v.events || []).includes(event.name)
  );

  const sheetChipStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300,
    padding: '5px 12px', borderRadius: 100,
    border: active ? 'none' : '1px solid #E2DED8',
    background: active ? '#0C0A09' : 'transparent',
    color: active ? '#FAFAF8' : '#8C8480',
    cursor: 'pointer', letterSpacing: '0.12em',
  });

  return (
    <>
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(12,10,9,0.4)', transition: 'opacity 280ms', opacity: visible ? 1 : 0 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        height: '85vh', background: '#FAFAF8',
        borderRadius: '20px 20px 0 0', borderTop: '1px solid #E2DED8',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: visible ? 'transform 400ms cubic-bezier(0.22,1,0.36,1)' : 'transform 280ms cubic-bezier(0.22,1,0.36,1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E2DED8' }} />
        </div>
        <div style={{ padding: '4px 20px 16px', borderBottom: '1px solid #E2DED8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: '#0C0A09', margin: '0 0 4px', flex: 1 }}>{editOpen ? editName : event.name}</p>
            <button onClick={() => setEditOpen(o => !o)} style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', background: 'none', border: '0.5px solid #E2DED8', borderRadius: 100, padding: '4px 10px', cursor: 'pointer', marginTop: 4, touchAction: 'manipulation', flexShrink: 0 }}>
              {editOpen ? 'CANCEL' : 'EDIT'}
            </button>
          </div>
          {editOpen ? (
            <div style={{ marginBottom: 12 }}>
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Event name"
                style={{ ...fieldInput, marginBottom: 10, fontSize: 14 }}
                onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
                onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
              />
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                style={{ ...fieldInput, marginBottom: 10, colorScheme: 'light' }}
                onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
                onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
              />
              <input value={editVenue} onChange={e => setEditVenue(e.target.value)} placeholder="Venue (optional)"
                style={{ ...fieldInput, marginBottom: 12 }}
                onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
                onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
              />
              <button onClick={handleSaveEdit} disabled={saving} style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#F8F7F5', background: '#111111', border: 'none', borderRadius: 100, padding: '8px 20px', cursor: 'pointer', touchAction: 'manipulation' }}>
                {saving ? '...' : 'SAVE CHANGES'}
              </button>
            </div>
          ) : (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#8C8480', margin: '0 0 12px' }}>
              {formatEventDateLong(event.date)}{event.venue ? ` · ${event.venue}` : ''}
            </p>
          )}
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8C8480', margin: 0 }}>
            {[`${eventTasks.length} Tasks`, `${bookedVendors.length} Vendors`, `${eventGuests.length} Guests`].join(' • ')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderBottom: '1px solid #E2DED8' }}>
          {(['tasks', 'vendors', 'guests'] as SheetTab[]).map(t => (
            <button key={t} onClick={() => setSheetTab(t)} style={sheetChipStyle(sheetTab === t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}>
          {sheetTab === 'tasks' && (
            eventTasks.length === 0
              ? <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#8C8480', textAlign: 'center', marginTop: 40 }}>No tasks for this event yet.</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{eventTasks.map(t => <TaskCardReadOnly key={t.id} task={t} />)}</div>
          )}
          {sheetTab === 'vendors' && (
            bookedVendors.length === 0
              ? <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#8C8480', textAlign: 'center', marginTop: 40 }}>No vendors booked yet.</p>
              : <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {bookedVendors.map((v, i) => (
                    <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < bookedVendors.length - 1 ? '1px solid #E2DED8' : 'none' }}>
                      <div>
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 300, color: '#0C0A09', margin: '0 0 2px' }}>{v.name}</p>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#8C8480', margin: 0 }}>{v.category || ''}</p>
                      </div>
                      <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 400, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 8px', borderRadius: 100, ...(v.status === 'paid' ? { background: '#F4F1EC', color: '#8C8480' } : { background: '#0C0A09', color: '#F8F7F5' }) }}>
                        {v.status === 'paid' ? 'PAID' : 'BOOKED'}
                      </span>
                    </div>
                  ))}
                </div>
          )}
          {sheetTab === 'guests' && (
            eventGuests.length === 0
              ? <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#8C8480', textAlign: 'center', marginTop: 40 }}>No guests added to this event yet.</p>
              : <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {eventGuests.map((g, i) => {
                    const rsvp = g.rsvp_status?.[event.name] || g.rsvp || 'pending';
                    const chipStyle: React.CSSProperties = rsvp === 'confirmed'
                      ? { background: '#F4F1EC', color: '#8C8480', border: '1px solid #E2DED8' }
                      : rsvp === 'declined'
                      ? { background: '#F4F1EC', color: '#8C8480', border: '1px solid #E2DED8', textDecoration: 'line-through' }
                      : { background: '#FFF8EC', color: '#C9A84C' };
                    return (
                      <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: i < eventGuests.length - 1 ? '1px solid #E2DED8' : 'none' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F4F1EC', border: '1px solid #E2DED8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 400, color: '#8C8480' }}>{initials(g.name)}</span>
                        </div>
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 300, color: '#0C0A09', margin: 0, flex: 1 }}>{g.name}</p>
                        <span style={{ ...chipStyle, fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 100 }}>{rsvp}</span>
                      </div>
                    );
                  })}
                </div>
          )}
        </div>
      {toast && <Toast msg={toast} />}
      </div>
    </>
  );
}

function EventsTab({ userId, allTasks, allGuests, allExpenses, allVendors, refetch }: { userId: string; allTasks: Task[]; allGuests: Guest[]; allExpenses: Expense[]; allVendors: CoupleVendor[]; refetch: number }) {
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<WeddingEvent | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${RAILWAY_URL}/api/v2/couple/events/${userId}`)
      .then(r => r.json())
      .then(d => { setEvents(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId, refetch]);

  const now = new Date();
  const soonestIdx = events.findIndex(ev => ev.date && new Date(ev.date) >= now);

  if (loading) return (
    <div style={{ paddingTop: 4 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <Shimmer h={40} w={40} br={50} />
          <div style={{ flex: 1 }}><Shimmer h={80} /></div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 64 }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: '#3C3835', margin: '0 0 8px' }}>No events yet.</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#8C8480', margin: 0 }}>Your wedding events will appear here.</p>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 19, top: 20, bottom: 20, width: 1, background: '#E2DED8' }} />
            {events.map((ev, i) => {
              const { month, day } = formatEventDate(ev.date);
              const isSoonest = i === soonestIdx;
              return (
                <div key={ev.id} style={{ display: 'flex', gap: 12, marginBottom: 24, position: 'relative' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: '#F4F1EC', border: `1px solid ${isSoonest ? '#C9A84C' : '#E2DED8'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                    <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, color: '#8C8480', lineHeight: 1 }}>{month}</span>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: '#0C0A09', lineHeight: 1.1 }}>{day}</span>
                  </div>
                  <button onClick={() => setSelectedEvent(ev)} style={{ flex: 1, background: '#F4F1EC', border: '1px solid #E2DED8', borderRadius: 12, padding: 16, textAlign: 'left', cursor: 'pointer' }}>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: '#0C0A09', margin: '0 0 4px' }}>{ev.name}</p>
                    {ev.venue && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#8C8480', margin: '0 0 12px' }}>{ev.venue}</p>}
                    <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, color: '#8C8480', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                      {(() => {
                        const tCount = allTasks.filter(t => (t.events?.name || t.event_name) === ev.name).length;
                        const vCount = allVendors.filter(v => (v.status === 'booked' || v.status === 'paid') && (v.events || []).includes(ev.name)).length;
                        const gCount = allGuests.filter(g => (g.events || []).includes(ev.name)).length;
                        return [tCount > 0 && `${tCount} Tasks`, vCount > 0 && `${vCount} Vendors`, gCount > 0 && `${gCount} Guests`].filter(Boolean).join(' · ') || 'No items yet';
                      })()}
                    </p>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {selectedEvent && (
        <EventDetailSheet
          event={selectedEvent}
          allTasks={allTasks}
          allGuests={allGuests}
          allExpenses={allExpenses}
          allVendors={allVendors}
          onClose={() => setSelectedEvent(null)}
          onEventUpdated={(id, name, date, venue) => {
            setEvents(prev => prev.map(e => e.id === id ? { ...e, name, date, venue } : e));
            setSelectedEvent(prev => prev ? { ...prev, name, date, venue } : prev);
          }}
        />
      )}
    </>
  );
}

// ─── Smart Cloudinary thumbnail ──────────────────────────────────────────────
function smartThumb(url: string, size = 400): string {
  if (!url) return url;
  if (url.includes('cloudinary.com')) {
    // Insert transformation after /upload/
    return url.replace('/upload/', `/upload/c_fill,g_auto,w_${size},h_${size},q_auto/`);
  }
  return url;
}

// ─── MuseTab ──────────────────────────────────────────────────────────────────
type MuseSaveItem = {
  id: string;
  vendor_id?: string | null;
  image_url?: string | null;
  function_tag?: string;
  created_at: string;
  vendor?: { name?: string; category?: string; featured_photos?: string[]; portfolio_images?: string[] } | null;
};

function MuseTab({ userId }: { userId: string }) {
  const [items, setItems] = useState<MuseSaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    fetch(`${RAILWAY_URL}/api/couple/muse/${userId}`)
      .then(r => r.json())
      .then(d => { setItems(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  async function handleRemove(id: string) {
    setRemoving(id);
    await fetch(`${RAILWAY_URL}/api/couple/muse/${id}`, { method: 'DELETE' }).catch(() => {});
    setItems(prev => prev.filter(i => i.id !== id));
    setRemoving(null);
  }

  function isDirectImage(url: string): boolean {
    return url.includes('cloudinary.com') || /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(url);
  }

  function getImage(item: MuseSaveItem): string {
    if (!item.vendor_id && item.image_url) {
      return isDirectImage(item.image_url) ? item.image_url : '';
    }
    if (item.image_url) return item.image_url;
    if (item.vendor?.featured_photos?.[0]) return item.vendor.featured_photos[0];
    if (item.vendor?.portfolio_images?.[0]) return item.vendor.portfolio_images[0];
    return '';
  }

  function isLink(item: MuseSaveItem): boolean {
    if (!item.vendor_id && item.image_url) return !isDirectImage(item.image_url);
    return false;
  }


  function getDomain(url: string): string {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return 'Link'; }
  }

  if (loading) return (
    <div style={{ paddingTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {[0,1,2,3].map(i => <Shimmer key={i} h={160} br={12} />)}
    </div>
  );

  if (items.length === 0) return (
    <div style={{ textAlign: 'center', marginTop: 72 }}>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300, fontStyle: 'italic', color: '#3C3835', margin: '0 0 8px' }}>Your board is empty.</p>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#8C8480', margin: '0 0 16px', lineHeight: 1.6 }}>Save vendors from Discovery, or send inspiration links to DreamAi.</p>
      <button onClick={() => router.push('/couple/muse')} style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888580', background: 'none', border: '0.5px solid #E2DED8', borderRadius: 100, padding: '6px 14px', cursor: 'pointer', touchAction: 'manipulation' }}>
        OPEN FULL MUSE BOARD
      </button>
    </div>
  );

  return (
    <div style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C8C4BE', margin: 0 }}>{items.length} SAVED</p>
        <button onClick={() => router.push('/couple/muse')} style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', background: 'none', border: '0.5px solid #E2DED8', borderRadius: 100, padding: '4px 10px', cursor: 'pointer', touchAction: 'manipulation' }}>
          FULL BOARD
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {items.map(item => {
          const img = getImage(item);
          const link = isLink(item);
          const name = item.vendor?.name || null;
          return (
            <div key={item.id} style={{ borderRadius: 12, overflow: 'hidden', border: '0.5px solid #E2DED8', background: '#FFFFFF', position: 'relative', opacity: removing === item.id ? 0.4 : 1, transition: 'opacity 200ms' }}>
              <div style={{ width: '100%', paddingBottom: '100%', position: 'relative', background: '#F4F1EC' }}>
                {link ? (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 6 }}>
                    <span style={{ fontSize: 20 }}>&#x1F517;</span>
                    <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888580', margin: 0, textAlign: 'center' }}>{getDomain(item.image_url!)}</p>
                    <a href={item.image_url!} target="_blank" rel="noreferrer" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 300, color: '#C9A84C', textDecoration: 'none', textAlign: 'center', wordBreak: 'break-all', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                      {item.image_url}
                    </a>
                  </div>
                ) : img ? (
                  <img src={smartThumb(img)} alt={name || ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: '#C8C4BE' }}>&#10022;</span>
                  </div>
                )}
                <button onClick={() => handleRemove(item.id)} style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation', color: '#FFFFFF', fontSize: 14, lineHeight: 1 }}>
                  &#215;
                </button>
              </div>
              {name && (
                <div style={{ padding: '8px 10px' }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 300, color: '#0C0A09', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Plan Page ───────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'tasks', label: 'Tasks' },
  { key: 'money', label: 'Money' },
  { key: 'vendors', label: 'Vendors' },
  { key: 'people', label: 'Guests' },
  { key: 'events', label: 'Events' },
  { key: 'muse', label: 'Muse' },
];

const NAV_ITEMS = [
  { key: 'today', label: 'Today', href: '/couple/today' },
  { key: 'plan', label: 'Plan', href: '/couple/plan' },
  { key: 'bespoke', label: 'Bespoke', href: '/couple/bespoke' },
  { key: 'me', label: 'Me', href: '/couple/me' },
];

export default function CouplePlanPage() {
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [session, setSession] = useState<CoupleSession | null | undefined>(undefined);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allVendors, setAllVendors] = useState<CoupleVendor[]>([]);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allEvents, setAllEvents] = useState<EventOption[]>([]);
  const [dreamAiOpen, setDreamAiOpen] = useState(false);
  const [dreamAiPrefill, setDreamAiPrefill] = useState('');

  // ─── FAB sheet state ──────────────────────────────────────────────────────
  const [fabPressed, setFabPressed] = useState(false);
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false);
  const [guestSheetOpen, setGuestSheetOpen] = useState(false);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [vendorSheetOpen, setVendorSheetOpen] = useState(false);

  // ─── Refetch counters ─────────────────────────────────────────────────────
  const [tasksRefetch, setTasksRefetch] = useState(0);
  const [moneyRefetch, setMoneyRefetch] = useState(0);
  const [guestsRefetch, setGuestsRefetch] = useState(0);
  const [eventsRefetch, setEventsRefetch] = useState(0);
  const [vendorsRefetch, setVendorsRefetch] = useState(0);

  useEffect(() => { setSession(getSession()); }, []);

  useEffect(() => {
    if (!session?.id) return;
    const uid = session.id;
    fetch(`${RAILWAY_URL}/api/v2/couple/tasks/${uid}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setAllTasks(d); }).catch(() => {});
    fetch(`${RAILWAY_URL}/api/couple/vendors/${uid}`).then(r => r.json()).then(d => { const rows = d.data || d; if (Array.isArray(rows)) setAllVendors(rows); }).catch(() => {});
    fetch(`${RAILWAY_URL}/api/v2/couple/guests/${uid}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setAllGuests(d); }).catch(() => {});
    fetch(`${RAILWAY_URL}/api/couple/expenses/${uid}`).then(r => r.json()).then(d => {
      const rows = (d?.data || d || []) as any[];
      setAllExpenses(rows.map((e: any) => ({ ...e, event_name: e.event || e.event_name || null, actual_amount: e.actual_amount || 0 })));
    }).catch(() => {});
    fetch(`${RAILWAY_URL}/api/v2/couple/events/${uid}`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setAllEvents(d.map((ev: any) => ({ id: ev.id, name: ev.name })));
    }).catch(() => {});
  }, [session?.id]);

  if (session === undefined) return null;
  if (!session) {
    if (typeof window !== 'undefined') window.location.replace('/couple/login');
    return null;
  }

  const userId = session.id;
  const dreamerType = session.dreamer_type || 'basic';
  const initial = (session.name?.[0] || 'D').toUpperCase();

  function openDreamAi(prefill: string) {
    setDreamAiPrefill(prefill);
    setDreamAiOpen(true);
  }

  function handleFabClick() {
    if (activeTab === 'tasks') setTaskSheetOpen(true);
    else if (activeTab === 'money') setBudgetSheetOpen(true);
    else if (activeTab === 'vendors') setVendorSheetOpen(true);
    else if (activeTab === 'people') setGuestSheetOpen(true);
    else if (activeTab === 'events') setEventSheetOpen(true);
    else if (activeTab === 'muse') openDreamAi('Save this to my Muse board: ');
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; } body { margin: 0; background: #F8F7F5; }
        ::-webkit-scrollbar { display: none; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      <DreamAiSheet
        visible={dreamAiOpen}
        onClose={() => setDreamAiOpen(false)}
        userId={userId}
        prefill={dreamAiPrefill}
      />

      {/* ─── FAB Sheets ──────────────────────────────────────────────────── */}
      <AddTaskSheet
        visible={taskSheetOpen}
        onClose={() => setTaskSheetOpen(false)}
        userId={userId}
        events={allEvents}
        onSuccess={() => setTasksRefetch(n => n + 1)}
      />
      <AddBudgetSheet
        visible={budgetSheetOpen}
        onClose={() => setBudgetSheetOpen(false)}
        userId={userId}
        events={allEvents}
        onSuccess={() => setMoneyRefetch(n => n + 1)}
      />
      <AddGuestSheet
        visible={guestSheetOpen}
        onClose={() => setGuestSheetOpen(false)}
        userId={userId}
        events={allEvents}
        onSuccess={() => setGuestsRefetch(n => n + 1)}
      />
      <AddEventSheet
        visible={eventSheetOpen}
        onClose={() => setEventSheetOpen(false)}
        userId={userId}
        events={allEvents}
        onSuccess={() => setEventsRefetch(n => n + 1)}
      />

      <AddVendorSheet
        visible={vendorSheetOpen}
        onClose={() => setVendorSheetOpen(false)}
        userId={userId}
        events={allEvents}
        onSuccess={() => setVendorsRefetch(n => n + 1)}
      />

      <div style={{ background: '#F8F7F5', minHeight: '100dvh', paddingTop: 24, paddingBottom: 'calc(80px + env(safe-area-inset-bottom) + 24px)' }}>
        <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: '#111111', margin: 0 }}>Plan</h1>
        </div>

        <div style={{ padding: '0 16px', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 8 }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flexShrink: 0, fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 400,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              padding: '6px 14px', borderRadius: 100,
              border: activeTab === tab.key ? 'none' : '1px solid #E2DED8',
              background: activeTab === tab.key ? '#111111' : 'transparent',
              color: activeTab === tab.key ? '#F8F7F5' : '#888580',
              cursor: 'pointer', transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
            }}>{tab.label}</button>
          ))}
        </div>

        <div style={{ padding: '8px 16px 0' }}>
          {activeTab === 'tasks' && <TasksTab userId={userId} events={allEvents} onOpenDreamAi={openDreamAi} refetch={tasksRefetch} onExpenseAdded={() => setMoneyRefetch(n => n + 1)} />}
          {activeTab === 'money' && <MoneyTab userId={userId} dreamerType={dreamerType} onOpenDreamAi={openDreamAi} refetch={moneyRefetch} />}
          {activeTab === 'vendors' && <VendorsTab userId={userId} allTasks={allTasks} allExpenses={allExpenses} events={allEvents} refetch={vendorsRefetch} onMoneyRefetch={() => setMoneyRefetch(n => n + 1)} />}
          {activeTab === 'people' && <PeopleTab userId={userId} refetch={guestsRefetch} />}
          {activeTab === 'events' && <EventsTab userId={userId} allTasks={allTasks} allGuests={allGuests} allExpenses={allExpenses} allVendors={allVendors} refetch={eventsRefetch} />}
          {activeTab === 'muse' && <MuseTab userId={userId} />}
        </div>
      </div>

      {/* ─── Context-aware FAB ───────────────────────────────────────────── */}
      <button
        onPointerDown={() => setFabPressed(true)}
        onPointerUp={() => setFabPressed(false)}
        onPointerLeave={() => setFabPressed(false)}
        onClick={handleFabClick}
        style={{
          position: 'fixed', bottom: 96, right: 20,
          width: 52, height: 52, borderRadius: '50%',
          background: '#C9A84C', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(201,168,76,0.35)',
          zIndex: 200, touchAction: 'manipulation',
          willChange: 'transform', transform: fabPressed ? 'scale(0.95) translateZ(0)' : 'translateZ(0)',
          transition: 'transform 200ms cubic-bezier(0.22,1,0.36,1)',
        }}
        aria-label="Add new item"
      >
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: '#FFFFFF', lineHeight: 1, marginTop: -2 }}>+</span>
      </button>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#F8F7F5', borderTop: '1px solid #E2DED8', display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 100 }}>
        {NAV_ITEMS.map(item => (
          <a key={item.key} href={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 20px', gap: 4, textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: item.key === 'plan' ? 400 : 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: item.key === 'plan' ? '#111111' : '#888580' }}>{item.label}</span>
            {item.key === 'plan' && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#C9A84C', display: 'block' }} />}
          </a>
        ))}
      </nav>
    </>
  );
}
