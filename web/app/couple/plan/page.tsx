'use client';

import React, { useEffect, useState } from 'react';

const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL || 'https://dream-wedding-production-89ae.up.railway.app';

// ─── Auth ────────────────────────────────────────────────────────────────────
// Reads the same localStorage key used by the v1 couple app.
// No redirect — soft message if no session.

interface CoupleSession {
  id: string;
  name: string;
}

function getSession(): CoupleSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('couple_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

type Tab = 'tasks' | 'money' | 'people' | 'events';

// ─── Shared shimmer ─────────────────────────────────────────────────────────

const shimmer: React.CSSProperties = {
  background: 'linear-gradient(90deg,#F4F1EC 25%,#FFF8EC 50%,#F4F1EC 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 12,
};

function Shimmer({ h, w = '100%', br = 12, mt = 0 }: { h: number; w?: string | number; br?: number; mt?: number }) {
  return <div style={{ ...shimmer, height: h, width: w, borderRadius: br, marginTop: mt }} />;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

type Task = {
  id: string;
  title: string;
  event_name?: string;
  events?: { name: string };
  due_date?: string;
  status: 'pending' | 'in_progress' | 'done';
  priority: 'high' | 'medium' | 'low';
};

type TaskFilter = 'event' | 'phase' | 'priority';

function formatDue(d?: string) {
  if (!d) return '';
  const dt = new Date(d);
  return 'Due ' + dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function groupBy<T>(arr: T[], key: (t: T) => string): { group: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  arr.forEach(t => {
    const k = key(t);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  });
  return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
}

function priorityOrder(p: string) { return p === 'high' ? 0 : p === 'medium' ? 1 : 2; }

function TaskCard({ task }: { task: Task }) {
  const prioColor = (p: string) => p === 'high' ? '#C9A84C' : p === 'medium' ? '#8C8480' : '#E8D9B5';
  const statusChip = (s: string) => {
    const styles: Record<string, React.CSSProperties> = {
      pending: { background: '#FFF8EC', color: '#C9A84C' },
      in_progress: { background: '#F4F1EC', color: '#3C3835' },
      done: { background: '#F4F1EC', color: '#8C8480' },
    };
    return (
      <span style={{
        ...styles[s] || styles.pending,
        fontFamily: "'Jost', sans-serif",
        fontSize: 10, fontWeight: 400,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        padding: '4px 8px', borderRadius: 100, whiteSpace: 'nowrap',
      }}>{s.replace('_', ' ')}</span>
    );
  };
  return (
    <div style={{
      background: '#F4F1EC', border: '1px solid #E8D9B5',
      borderRadius: 12, padding: 16,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: prioColor(task.priority), flexShrink: 0, marginTop: 8 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 300, color: '#0C0A09',
          margin: '0 0 4px', textDecoration: task.status === 'done' ? 'line-through' : 'none',
        }}>{task.title}</p>
        {task.due_date && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#8C8480', margin: 0 }}>{formatDue(task.due_date)}</p>
        )}
      </div>
      {statusChip(task.status)}
    </div>
  );
}

function TasksTab({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TaskFilter>('event');

  useEffect(() => {
    setLoading(true);
    fetch(`${RAILWAY_URL}/api/v2/couple/tasks/${userId}`)
      .then(r => r.json())
      .then(d => { setTasks(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  const filterChips: { key: TaskFilter; label: string }[] = [
    { key: 'event', label: 'By Event' },
    { key: 'phase', label: 'By Phase' },
    { key: 'priority', label: 'By Priority' },
  ];

  let groups: { group: string; items: Task[] }[] = [];
  if (filter === 'event') {
    groups = groupBy(tasks, t => t.events?.name || t.event_name || 'General');
  } else if (filter === 'priority') {
    const sorted = [...tasks].sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority));
    groups = groupBy(sorted, t => t.priority === 'high' ? 'High Priority' : t.priority === 'medium' ? 'Medium Priority' : 'Low Priority');
  } else {
    groups = groupBy(tasks, t => t.status === 'pending' ? 'To Do' : t.status === 'in_progress' ? 'In Progress' : 'Done');
  }

  if (loading) return (
    <div style={{ paddingTop: 12 }}>
      {[0, 1, 2].map(g => (
        <div key={g} style={{ marginBottom: 24 }}>
          <Shimmer h={8} w={60} br={4} />
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Shimmer h={64} /><Shimmer h={64} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {filterChips.map(fc => (
          <button key={fc.key} onClick={() => setFilter(fc.key)} style={{
            fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300,
            padding: '4px 10px', borderRadius: 100,
            border: filter === fc.key ? 'none' : '1px solid #E8D9B5',
            background: filter === fc.key ? '#0C0A09' : 'transparent',
            color: filter === fc.key ? '#FAFAF8' : '#8C8480',
            cursor: 'pointer', letterSpacing: '0.1em',
          }}>{fc.label}</button>
        ))}
      </div>
      {tasks.length === 0 ? (
        <div style={{ marginTop: 64, textAlign: 'center' }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: '#3C3835', margin: '0 0 8px' }}>No tasks yet.</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#8C8480', margin: 0 }}>Tasks you add will appear here, linked to your events.</p>
        </div>
      ) : (
        groups.map(({ group, items }) => (
          <div key={group} style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8C8480', margin: '0 0 8px' }}>{group}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(task => <TaskCard key={task.id} task={task} />)}
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
  due_date?: string;
  status?: string;
  event_name?: string;
};

type PaymentFilter = 'week' | 'next30';

function fmtINR(n: number) {
  if (!n) return '₹0';
  return '₹' + n.toLocaleString('en-IN');
}

function MoneyTab({ userId }: { userId: string }) {
  const [data, setData] = useState<MoneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payFilter, setPayFilter] = useState<PaymentFilter>('week');

  useEffect(() => {
    setLoading(true);
    fetch(`${RAILWAY_URL}/api/v2/couple/money/${userId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

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
      <div style={{ background: '#F4F1EC', border: '1px solid #E8D9B5', borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8C8480', margin: '0 0 6px' }}>TOTAL JOURNEY</p>
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
        <div style={{ position: 'relative', height: 6, borderRadius: 8, background: '#E8D9B5', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${committedPct}%`, background: '#C9A84C', borderRadius: 8, transition: 'width 600ms cubic-bezier(0.22,1,0.36,1)' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${paidPct}%`, background: '#0C0A09', borderRadius: 8, transition: 'width 600ms cubic-bezier(0.22,1,0.36,1)' }} />
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#8C8480', margin: '8px 0 0' }}>{fmtINR(remaining)} remaining</p>
      </div>

      {d.events.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8C8480', margin: '0 0 12px' }}>BY EVENT</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.events.map(ev => (
              <div key={ev.id} style={{ background: '#FAFAF8', border: '1px solid #E8D9B5', borderRadius: 12, padding: 16 }}>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 300, color: '#0C0A09', margin: '0 0 4px' }}>{ev.name}</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#8C8480', margin: '0 0 10px' }}>{fmtINR(ev.budget)} allocated</p>
                <div style={{ height: 4, borderRadius: 4, background: '#E8D9B5', overflow: 'hidden' }}>
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
              border: payFilter === f.key ? 'none' : '1px solid #E8D9B5',
              background: payFilter === f.key ? '#0C0A09' : 'transparent',
              color: payFilter === f.key ? '#FAFAF8' : '#8C8480',
              cursor: 'pointer', letterSpacing: '0.1em',
            }}>{f.label}</button>
          ))}
        </div>
        {payments.length === 0 ? (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#8C8480', textAlign: 'center', padding: '24px 0' }}>No upcoming payments.</p>
        ) : (
          payments.map((exp, i) => (
            <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: i < payments.length - 1 ? '1px solid #E8D9B5' : 'none' }}>
              <div>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 300, color: '#0C0A09', margin: '0 0 2px' }}>{exp.vendor_name || '—'}</p>
                {exp.purpose && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#8C8480', margin: 0 }}>{exp.purpose}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 400, color: '#0C0A09', margin: '0 0 2px' }}>{fmtINR(exp.amount)}</p>
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

function PeopleTab({ userId }: { userId: string }) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState('all');

  useEffect(() => {
    setLoading(true);
    fetch(`${RAILWAY_URL}/api/v2/couple/guests/${userId}`)
      .then(r => r.json())
      .then(d => { setGuests(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  const allEvents = Array.from(new Set(guests.flatMap(g => g.events || (g.event_name ? [g.event_name] : []))));
  const filtered = activeEvent === 'all' ? guests : guests.filter(g => (g.events || [g.event_name]).includes(activeEvent));
  const confirmed = guests.filter(g => g.rsvp === 'confirmed' || Object.values(g.rsvp_status || {}).some(v => v === 'confirmed')).length;
  const pending = guests.filter(g => g.rsvp === 'pending' || Object.values(g.rsvp_status || {}).some(v => v === 'pending')).length;

  const rsvpChipStyle = (status: string): React.CSSProperties => {
    if (status === 'confirmed') return { background: '#F4F1EC', color: '#8C8480', border: '1px solid #E8D9B5' };
    if (status === 'declined') return { background: '#F4F1EC', color: '#8C8480', border: '1px solid #E8D9B5', textDecoration: 'line-through' };
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
      <div style={{ background: '#F4F1EC', border: '1px solid #E8D9B5', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-around', marginBottom: 16 }}>
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
              border: activeEvent === ev ? 'none' : '1px solid #E8D9B5',
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
            <div key={guest.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0', borderBottom: i < filtered.length - 1 ? '1px solid #E8D9B5' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F4F1EC', border: '1px solid #E8D9B5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

// ─── Event Detail Sheet ───────────────────────────────────────────────────────

type SheetTab = 'tasks' | 'vendors' | 'guests';

interface EventSheetProps {
  event: WeddingEvent;
  allTasks: Task[];
  allGuests: Guest[];
  allExpenses: Expense[];
  onClose: () => void;
}

function EventDetailSheet({ event, allTasks, allGuests, allExpenses, onClose }: EventSheetProps) {
  const [sheetTab, setSheetTab] = useState<SheetTab>('tasks');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  // Filter data for this event
  const eventTasks = allTasks.filter(t => (t.events?.name || t.event_name) === event.name);
  const eventGuests = allGuests.filter(g => (g.events || []).includes(event.name));
  const eventExpenses = allExpenses.filter(e => e.event_name === event.name);

  const sheetChipStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300,
    padding: '5px 12px', borderRadius: 100,
    border: active ? 'none' : '1px solid #E8D9B5',
    background: active ? '#0C0A09' : 'transparent',
    color: active ? '#FAFAF8' : '#8C8480',
    cursor: 'pointer', letterSpacing: '0.12em',
  });

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(12,10,9,0.4)',
          transition: 'opacity 280ms',
          opacity: visible ? 1 : 0,
        }}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        height: '85vh',
        background: '#FAFAF8',
        borderRadius: '20px 20px 0 0',
        borderTop: '1px solid #E8D9B5',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: visible
          ? 'transform 400ms cubic-bezier(0.22,1,0.36,1)'
          : 'transform 280ms cubic-bezier(0.22,1,0.36,1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8D9B5' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '4px 20px 16px', borderBottom: '1px solid #E8D9B5' }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: '#0C0A09', margin: '0 0 4px' }}>{event.name}</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#8C8480', margin: '0 0 12px' }}>
            {formatEventDateLong(event.date)}{event.venue ? ` · ${event.venue}` : ''}
          </p>
          {/* Stat chips */}
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8C8480', margin: 0 }}>
            {[
              event.task_count != null && `${event.task_count} Tasks`,
              event.vendor_count != null && `${event.vendor_count} Vendors`,
              event.guest_count != null && `${event.guest_count} Guests`,
            ].filter(Boolean).join(' • ')}
          </p>
        </div>

        {/* Sub-nav */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderBottom: '1px solid #E8D9B5' }}>
          {(['tasks', 'vendors', 'guests'] as SheetTab[]).map(t => (
            <button key={t} onClick={() => setSheetTab(t)} style={sheetChipStyle(sheetTab === t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}>

          {/* Tasks */}
          {sheetTab === 'tasks' && (
            eventTasks.length === 0
              ? <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#8C8480', textAlign: 'center', marginTop: 40 }}>No tasks for this event yet.</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {eventTasks.map(t => <TaskCard key={t.id} task={t} />)}
                </div>
          )}

          {/* Vendors */}
          {sheetTab === 'vendors' && (
            eventExpenses.length === 0
              ? <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#8C8480', textAlign: 'center', marginTop: 40 }}>No vendors linked yet.</p>
              : <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {eventExpenses.map((exp, i) => (
                    <div key={exp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < eventExpenses.length - 1 ? '1px solid #E8D9B5' : 'none' }}>
                      <div>
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 300, color: '#0C0A09', margin: '0 0 2px' }}>{exp.vendor_name || '—'}</p>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#8C8480', margin: 0 }}>{exp.purpose || ''}</p>
                      </div>
                      <span style={{
                        fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 400,
                        letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 8px', borderRadius: 100,
                        ...(exp.status === 'paid'
                          ? { background: '#F4F1EC', color: '#8C8480' }
                          : { background: '#FFF8EC', color: '#C9A84C' }),
                      }}>
                        {exp.status === 'paid' ? 'BOOKED' : 'ENQUIRED'}
                      </span>
                    </div>
                  ))}
                </div>
          )}

          {/* Guests */}
          {sheetTab === 'guests' && (
            eventGuests.length === 0
              ? <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#8C8480', textAlign: 'center', marginTop: 40 }}>No guests added to this event yet.</p>
              : <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {eventGuests.map((g, i) => {
                    const rsvp = g.rsvp_status?.[event.name] || g.rsvp || 'pending';
                    const chipStyle: React.CSSProperties = rsvp === 'confirmed'
                      ? { background: '#F4F1EC', color: '#8C8480', border: '1px solid #E8D9B5' }
                      : rsvp === 'declined'
                      ? { background: '#F4F1EC', color: '#8C8480', border: '1px solid #E8D9B5', textDecoration: 'line-through' }
                      : { background: '#FFF8EC', color: '#C9A84C' };
                    return (
                      <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: i < eventGuests.length - 1 ? '1px solid #E8D9B5' : 'none' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F4F1EC', border: '1px solid #E8D9B5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 400, color: '#8C8480' }}>{initials(g.name)}</span>
                        </div>
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 300, color: '#0C0A09', margin: 0, flex: 1 }}>{g.name}</p>
                        <span style={{ ...chipStyle, fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 100 }}>
                          {rsvp}
                        </span>
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

function EventsTab({ userId, allTasks, allGuests, allExpenses }: { userId: string; allTasks: Task[]; allGuests: Guest[]; allExpenses: Expense[] }) {
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<WeddingEvent | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${RAILWAY_URL}/api/v2/couple/events/${userId}`)
      .then(r => r.json())
      .then(d => { setEvents(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

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
            <div style={{ position: 'absolute', left: 19, top: 20, bottom: 20, width: 1, background: '#E8D9B5' }} />
            {events.map((ev, i) => {
              const { month, day } = formatEventDate(ev.date);
              const isSoonest = i === soonestIdx;
              return (
                <div key={ev.id} style={{ display: 'flex', gap: 12, marginBottom: 24, position: 'relative' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: '#F4F1EC', border: `1px solid ${isSoonest ? '#C9A84C' : '#E8D9B5'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                  }}>
                    <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, color: '#8C8480', lineHeight: 1 }}>{month}</span>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: '#0C0A09', lineHeight: 1.1 }}>{day}</span>
                  </div>
                  {/* Tappable card */}
                  <button
                    onClick={() => setSelectedEvent(ev)}
                    style={{
                      flex: 1, background: '#F4F1EC', border: '1px solid #E8D9B5',
                      borderRadius: 12, padding: 16, textAlign: 'left', cursor: 'pointer',
                    }}
                  >
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: '#0C0A09', margin: '0 0 4px' }}>{ev.name}</p>
                    {ev.venue && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#8C8480', margin: '0 0 12px' }}>{ev.venue}</p>}
                    <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, color: '#8C8480', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                      {[
                        ev.task_count != null && `${ev.task_count} Tasks`,
                        ev.vendor_count != null && `${ev.vendor_count} Vendors`,
                        ev.guest_count != null && `${ev.guest_count} Guests`,
                      ].filter(Boolean).join(' · ')}
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
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
}

// ─── Main Plan Page ───────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'tasks', label: 'Tasks' },
  { key: 'money', label: 'Money' },
  { key: 'people', label: 'People' },
  { key: 'events', label: 'Events' },
];

const NAV_ITEMS = [
  { key: 'today', label: 'Today', href: '/couple/today' },
  { key: 'plan', label: 'Plan', href: '/couple/plan' },
  { key: 'muse', label: 'Muse', href: '/couple/muse' },
  { key: 'me', label: 'Me', href: '/couple/me' },
];

export default function CouplePlanPage() {
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [session, setSession] = useState<CoupleSession | null | undefined>(undefined);

  // Cross-tab data for Events detail sheet
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    setSession(getSession());
  }, []);

  // Pre-fetch tasks, guests, expenses for the Events detail sheet once we have a userId
  useEffect(() => {
    if (!session?.id) return;
    const uid = session.id;
    fetch(`${RAILWAY_URL}/api/v2/couple/tasks/${uid}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setAllTasks(d); }).catch(() => {});
    fetch(`${RAILWAY_URL}/api/v2/couple/guests/${uid}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setAllGuests(d); }).catch(() => {});
    fetch(`${RAILWAY_URL}/api/v2/couple/money/${uid}`).then(r => r.json()).then(d => {
      const rows = [...(d?.thisWeek || []), ...(d?.next30 || [])];
      setAllExpenses(rows);
    }).catch(() => {});
  }, [session?.id]);

  // Loading state
  if (session === undefined) return null;

  // No session — soft message
  if (!session) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
          * { box-sizing: border-box; } body { margin: 0; background: #FAFAF8; }
        `}</style>
        <div style={{ minHeight: '100dvh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: '#3C3835' }}>
            Sign in to view your plan.
          </p>
        </div>
      </>
    );
  }

  const userId = session.id;
  const initial = (session.name?.[0] || 'D').toUpperCase();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; } body { margin: 0; background: #FAFAF8; }
        ::-webkit-scrollbar { display: none; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      <div style={{
        background: '#FAFAF8', minHeight: '100dvh',
        paddingTop: 24,
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom) + 24px)',
      }}>
        {/* Header */}
        <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: '#0C0A09', margin: 0 }}>Plan</h1>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F4F1EC', border: '1px solid #E8D9B5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 400, color: '#8C8480' }}>{initial}</span>
          </div>
        </div>

        {/* Sub-nav chips */}
        <div style={{ padding: '0 16px', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 8 }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flexShrink: 0,
              fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 400,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              padding: '6px 14px', borderRadius: 100,
              border: activeTab === tab.key ? 'none' : '1px solid #E8D9B5',
              background: activeTab === tab.key ? '#0C0A09' : 'transparent',
              color: activeTab === tab.key ? '#FAFAF8' : '#8C8480',
              cursor: 'pointer', transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '8px 16px 0' }}>
          {activeTab === 'tasks' && <TasksTab userId={userId} />}
          {activeTab === 'money' && <MoneyTab userId={userId} />}
          {activeTab === 'people' && <PeopleTab userId={userId} />}
          {activeTab === 'events' && (
            <EventsTab
              userId={userId}
              allTasks={allTasks}
              allGuests={allGuests}
              allExpenses={allExpenses}
            />
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#FAFAF8', borderTop: '1px solid #E8D9B5',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 100,
      }}>
        {NAV_ITEMS.map(item => (
          <a key={item.key} href={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 20px', gap: 4, textDecoration: 'none' }}>
            <span style={{
              fontFamily: "'Jost', sans-serif", fontSize: 10,
              fontWeight: item.key === 'plan' ? 400 : 300,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              color: item.key === 'plan' ? '#0C0A09' : '#8C8480',
            }}>{item.label}</span>
            {item.key === 'plan' && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#C9A84C', display: 'block' }} />}
          </a>
        ))}
      </nav>
    </>
  );
}
