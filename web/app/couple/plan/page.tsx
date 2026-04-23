'use client';

import React, { useEffect, useState, useRef } from 'react';

const RAILWAY_URL = 'https://dream-wedding-production-89ae.up.railway.app';

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
    const raw = localStorage.getItem('couple_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'tasks' | 'money' | 'people' | 'events';

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
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  function reset() {
    setTaskTitle(''); setSelectedEvent('general'); setPriority('Medium');
    setDueDate(''); setVendorName(''); setNotes('');
  }

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
            <label style={fieldLabel}>Vendor / Maker (optional)</label>
            <input value={vendorName} onChange={e => setVendorName(e.target.value)}
              placeholder="e.g. Arjun Kartha Studio"
              style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
          </div>
          <div style={fieldWrapper}>
            <label style={fieldLabel}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any details or reminders..."
              rows={3}
              style={{
                ...fieldInput, height: 'auto', resize: 'none',
                borderBottom: '1px solid #E2DED8', padding: '8px 4px', lineHeight: 1.6,
              }}
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

function AddEventSheet({ visible, onClose, userId, onSuccess }: {
  visible: boolean; onClose: () => void; userId: string; onSuccess: () => void;
}) {
  const [eventType, setEventType] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [city, setCity] = useState('');
  const [budget, setBudget] = useState('');
  const [guestRange, setGuestRange] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  function selectType(t: string) {
    setEventType(t.toLowerCase());
    if (!eventName) setEventName(t);
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
      else { showToast('Event added'); onSuccess(); onClose(); setEventType(''); setEventName(''); setEventDate(''); setCity(''); setBudget(''); setGuestRange(''); }
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
            <input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Priya & Arjun's Sangeet" style={fieldInput}
              onFocus={e => { e.currentTarget.style.borderBottomColor = '#C9A84C'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = '#E2DED8'; }}
            />
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

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

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
          event: eventName === 'general' ? null : eventName, // DB column: event
          category: category || null,
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
interface ChatMessage { role: 'user' | 'ai'; text: string; }

function DreamAiSheet({
  visible, onClose, userId, prefill,
}: {
  visible: boolean; onClose: () => void; userId: string; prefill?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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
    if (visible) setTimeout(() => inputRef.current?.focus(), 400);
  }, [visible]);

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
      setMessages(prev => [...prev, { role: 'ai', text: json.reply || 'Something went wrong.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Unable to reach DreamAi.' }]);
    } finally {
      setLoading(false);
    }
  }

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
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 18,
                fontWeight: 300, fontStyle: 'italic', color: '#888580', margin: 0,
              }}>Ask anything about your wedding.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12,
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
                }}>{m.text}</p>
              </div>
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
            autoFocus
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

  function loadTasks() {
    setLoading(true);
    fetch(`${RAILWAY_URL}/api/v2/couple/tasks/${userId}`)
      .then(r => r.json())
      .then(d => { setTasks(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadTasks(); }, [userId, refetch]);

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
    <div>
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
          onClick={() => onOpenDreamAi('Help me prioritise my tasks')}
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
  event_name?: string;
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

  if (!orderRes?.success) {
    onError(orderRes?.error || 'Could not create payment. Please try again.');
    return;
  }

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

  const isBasic = !currentTier || currentTier === 'basic';
  const isGold = currentTier === 'gold';
  if (currentTier === 'platinum') return null;

  const target = isBasic ? (isGold ? 'platinum' : 'gold') : 'platinum';
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
      onSuccess: () => {
        setPaying(false);
        setToast('Welcome to ' + (target === 'gold' ? 'Gold' : 'Platinum') + '!');
        setTimeout(() => { setToast(''); onUpgraded(); }, 2000);
      },
      onError: (msg) => {
        setPaying(false);
        setToast(msg);
        setTimeout(() => setToast(''), 4000);
      },
    });
  };

  return (
    <>
      <div style={{
        background: '#0C0A09', borderRadius: 16, padding: 24, marginBottom: 20,
        position: 'relative', overflow: 'hidden',
      }}>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 8px' }}>UPGRADE</p>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: '#F8F7F5', margin: '0 0 16px', lineHeight: 1.2 }}>
          {target === 'gold' ? 'Unlock the full journey.' : 'Your AI wedding planner awaits.'}
        </p>
        <div style={{ marginBottom: 20 }}>
          {benefits.map(b => (
            <p key={b} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: '0 0 4px' }}>· {b}</p>
          ))}
        </div>
        <button onClick={handleUpgrade} disabled={paying} style={{
          fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: '#0C0A09', background: '#C9A84C', border: 'none',
          borderRadius: 100, padding: '10px 20px',
          cursor: paying ? 'not-allowed' : 'pointer',
          opacity: paying ? 0.6 : 1, touchAction: 'manipulation',
        }}>{paying ? 'Opening...' : label}</button>
      </div>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: '#0C0A09', color: '#F8F7F5',
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
          padding: '12px 20px', borderRadius: 100, zIndex: 999, whiteSpace: 'nowrap',
        }}>{toast}</div>
      )}
    </>
  );
}

function MoneyTab({ userId, dreamerType, onOpenDreamAi, refetch }: { userId: string; dreamerType: string; onOpenDreamAi: (prefill: string) => void; refetch: number }) {
  const [data, setData] = useState<MoneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payFilter, setPayFilter] = useState<PaymentFilter>('week');
  const [currentTier, setCurrentTier] = useState(dreamerType || 'basic');

  useEffect(() => {
    setLoading(true);
    fetch(`${RAILWAY_URL}/api/v2/couple/money/${userId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId, refetch]);

  if (loading) return (
    <div style={{ paddingTop: 4 }}>
      <Shimmer h={120} br={16} />
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Shimmer h={8} w={80} br={4} /><Shimmer h={64} /><Shimmer h={64} /><Shimmer h={64} />
      </div>
    </div>
  );

  const d = data || { totalBudget: 0, committed: 0, paid: 0, events: [], thisWeek: [], next30: [] };
  const committedPct = d.totalBudget ? Math.min(100, (d.committed / d.totalBudget) * 100) : 0;
  const paidPct = d.totalBudget ? Math.min(100, (d.paid / d.totalBudget) * 100) : 0;
  const remaining = d.totalBudget - d.committed;
  const payments = payFilter === 'week' ? d.thisWeek : d.next30;

  return (
    <div>
      <UpgradeCard
        userId={userId}
        currentTier={currentTier}
        onUpgraded={() => setCurrentTier(currentTier === 'basic' ? 'gold' : 'platinum')}
      />

      {/* Budget hero + DreamAi button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8C8480', margin: 0 }}>TOTAL JOURNEY</p>
        <button
          onClick={() => onOpenDreamAi('Am I over budget on anything?')}
          style={{
            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            color: '#888580', background: 'none',
            border: '0.5px solid #E2DED8', borderRadius: 100,
            padding: '4px 10px', cursor: 'pointer',
            touchAction: 'manipulation',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: 10 }}>✦</span> Ask DreamAi
        </button>
      </div>

      <div style={{ background: '#F4F1EC', border: '1px solid #E2DED8', borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: '#0C0A09', margin: '0 0 16px', lineHeight: 1 }}>{fmtINR(d.totalBudget)}</p>
        <div style={{ display: 'flex', gap: 32, marginBottom: 16 }}>
          <div>
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8C8480', margin: '0 0 4px' }}>Committed</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 400, color: '#3C3835', margin: 0 }}>{fmtINR(d.committed)}</p>
          </div>
          <div>
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8C8480', margin: '0 0 4px' }}>Paid</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 400, color: '#3C3835', margin: 0 }}>{fmtINR(d.paid)}</p>
          </div>
        </div>
        <div style={{ position: 'relative', height: 6, borderRadius: 8, background: '#E2DED8', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${committedPct}%`, background: '#C9A84C', borderRadius: 8, transition: 'width 600ms cubic-bezier(0.22,1,0.36,1)', willChange: 'transform' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${paidPct}%`, background: '#0C0A09', borderRadius: 8, transition: 'width 600ms cubic-bezier(0.22,1,0.36,1)', willChange: 'transform' }} />
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#8C8480', margin: '8px 0 0' }}>{fmtINR(remaining)} remaining</p>
      </div>

      {d.events.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8C8480', margin: '0 0 12px' }}>BY EVENT</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.events.map(ev => (
              <div key={ev.id} style={{ background: '#FAFAF8', border: '1px solid #E2DED8', borderRadius: 12, padding: 16 }}>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 300, color: '#0C0A09', margin: '0 0 4px' }}>{ev.name}</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#8C8480', margin: '0 0 10px' }}>{fmtINR(ev.budget)} allocated</p>
                <div style={{ height: 4, borderRadius: 4, background: '#E2DED8', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '40%', background: '#C9A84C', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8C8480', margin: '0 0 12px' }}>UPCOMING PAYMENTS</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {([{ key: 'week', label: 'This Week' }, { key: 'next30', label: 'Next 30 Days' }] as { key: PaymentFilter; label: string }[]).map(f => (
            <button key={f.key} onClick={() => setPayFilter(f.key)} style={{
              fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, padding: '4px 10px', borderRadius: 100,
              border: payFilter === f.key ? 'none' : '1px solid #E2DED8',
              background: payFilter === f.key ? '#0C0A09' : 'transparent',
              color: payFilter === f.key ? '#FAFAL8' : '#8C8480',
              cursor: 'pointer', letterSpacing: '0.1em',
            }}>{f.label}</button>
          ))}
        </div>
        {payments.length === 0 ? (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#8C8480', textAlign: 'center', padding: '24px 0' }}>No upcoming payments.</p>
        ) : (
          payments.map((exp, i) => (
            <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: i < payments.length - 1 ? '1px solid #E2DED8' : 'none' }}>
              <div>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 300, color: '#0C0A09', margin: '0 0 2px' }}>{exp.vendor_name || '—'}</p>
                {exp.purpose && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#8C8480', margin: 0 }}>{exp.purpose}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 400, color: '#C9A84C', margin: '0 0 2px' }}>{fmtINR(exp.actual_amount || exp.amount || 0)}</p>
                {exp.due_date && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 300, color: '#8C8480', margin: 0 }}>{formatDue(exp.due_date)}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
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
            <div key={guest.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0', borderBottom: i < filtered.length - 1 ? '1px solid #E2DED8' : 'none' }}>
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
            </div>
          );
        })
      )}
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
  onClose: () => void;
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
  const [sheetTab, setSheetTab] = useState<SheetTab>('tasks');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  const eventTasks = allTasks.filter(t => (t.events?.name || t.event_name) === event.name);
  const eventGuests = allGuests.filter(g => (g.events || []).includes(event.name));
  const eventExpenses = allExpenses.filter(e => e.event_name === event.name);

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
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: '#0C0A09', margin: '0 0 4px' }}>{event.name}</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#8C8480', margin: '0 0 12px' }}>
            {formatEventDateLong(event.date)}{event.venue ? ` · ${event.venue}` : ''}
          </p>
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8C8480', margin: 0 }}>
            {[event.task_count != null && `${event.task_count} Tasks`, event.vendor_count != null && `${event.vendor_count} Vendors`, event.guest_count != null && `${event.guest_count} Guests`].filter(Boolean).join(' • ')}
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
            eventExpenses.length === 0
              ? <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#8C8480', textAlign: 'center', marginTop: 40 }}>No vendors linked yet.</p>
              : <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {eventExpenses.map((exp, i) => (
                    <div key={exp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < eventExpenses.length - 1 ? '1px solid #E2DED8' : 'none' }}>
                      <div>
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 300, color: '#0C0A09', margin: '0 0 2px' }}>{exp.vendor_name || '—'}</p>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#8C8480', margin: 0 }}>{exp.purpose || ''}</p>
                      </div>
                      <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 400, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 8px', borderRadius: 100, ...(exp.status === 'paid' ? { background: '#F4F1EC', color: '#8C8480' } : { background: '#FFF8EC', color: '#C9A84C' }) }}>
                        {exp.status === 'paid' ? 'BOOKED' : 'ENQUIRED'}
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
      </div>
    </>
  );
}

function EventsTab({ userId, allTasks, allGuests, allExpenses, refetch }: { userId: string; allTasks: Task[]; allGuests: Guest[]; allExpenses: Expense[]; refetch: number }) {
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
                      {[ev.task_count != null && `${ev.task_count} Tasks`, ev.vendor_count != null && `${ev.vendor_count} Vendors`, ev.guest_count != null && `${ev.guest_count} Guests`].filter(Boolean).join(' · ')}
                    </p>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {selectedEvent && (
        <EventDetailSheet event={selectedEvent} allTasks={allTasks} allGuests={allGuests} allExpenses={allExpenses} onClose={() => setSelectedEvent(null)} />
      )}
    </>
  );
}

// ─── Main Plan Page ───────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'tasks', label: 'Tasks' },
  { key: 'money', label: 'Money' },
  { key: 'people', label: 'Guests' },
  { key: 'events', label: 'Events' },
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

  // ─── Refetch counters ─────────────────────────────────────────────────────
  const [tasksRefetch, setTasksRefetch] = useState(0);
  const [moneyRefetch, setMoneyRefetch] = useState(0);
  const [guestsRefetch, setGuestsRefetch] = useState(0);
  const [eventsRefetch, setEventsRefetch] = useState(0);

  useEffect(() => { setSession(getSession()); }, []);

  useEffect(() => {
    if (!session?.id) return;
    const uid = session.id;
    fetch(`${RAILWAY_URL}/api/v2/couple/tasks/${uid}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setAllTasks(d); }).catch(() => {});
    fetch(`${RAILWAY_URL}/api/v2/couple/guests/${uid}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setAllGuests(d); }).catch(() => {});
    fetch(`${RAILWAY_URL}/api/v2/couple/money/${uid}`).then(r => r.json()).then(d => {
      const rows = [...(d?.thisWeek || []), ...(d?.next30 || [])];
      setAllExpenses(rows);
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
    else if (activeTab === 'people') setGuestSheetOpen(true);
    else if (activeTab === 'events') setEventSheetOpen(true);
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
        onSuccess={() => setEventsRefetch(n => n + 1)}
      />

      <div style={{ background: '#F8F7F5', minHeight: '100dvh', paddingTop: 24, paddingBottom: 'calc(80px + env(safe-area-inset-bottom) + 24px)' }}>
        <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: '#111111', margin: 0 }}>Plan</h1>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F4F1EC', border: '1px solid #E2DED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 400, color: '#8C8480' }}>{initial}</span>
          </div>
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
          {activeTab === 'people' && <PeopleTab userId={userId} refetch={guestsRefetch} />}
          {activeTab === 'events' && <EventsTab userId={userId} allTasks={allTasks} allGuests={allGuests} allExpenses={allExpenses} refetch={eventsRefetch} />}
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
