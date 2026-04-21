'use client';

import React, { useEffect, useState, useCallback } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Task {
  id: string;
  task_name?: string;
  title?: string;
  event?: string;
  due_date?: string;
  is_complete: boolean;
}
interface CoupleEvent {
  id: string;
  event_name: string;
  event_date: string;
  venue?: string;
}
interface Payment {
  id: string;
  vendor_name?: string;
  actual_amount?: number;
  due_date?: string;
}
interface TodayData {
  priority_tasks: Task[];
  this_week_events: CoupleEvent[];
  upcoming_payments: Payment[];
  budget: { total: number; committed: number; paid: number };
  next_event: CoupleEvent | null;
}
interface Session {
  id: string;
  name?: string;
  email?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
  'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen',
  'Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function numberToWords(n: number): string {
  if (n === 0) return 'Zero';
  if (n < 0) return 'Minus ' + numberToWords(-n);
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n/10)] + (n%10 ? ' ' + ONES[n%10] : '');
  if (n < 1000) return ONES[Math.floor(n/100)] + ' hundred' + (n%100 ? ' ' + numberToWords(n%100) : '');
  return String(n);
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0,0,0,0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000*60*60*24));
}

function isWithin7Days(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = daysUntil(dateStr);
  return d >= 0 && d <= 7;
}

function formatINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}

function getInitials(name?: string): string {
  if (!name) return 'D';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
}

// ─── Shimmer ─────────────────────────────────────────────────────────────────
function Shimmer({ height }: { height: number }) {
  return (
    <div style={{
      height, borderRadius: 8, marginBottom: 8,
      background: 'linear-gradient(90deg, #F8F7F5 25%, #EEECE8 50%, #F8F7F5 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      willChange: 'background-position',
    }} />
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%) translateZ(0)',
      background: '#111111', color: '#F8F7F5',
      fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
      padding: '10px 20px', borderRadius: 8, zIndex: 9999,
      whiteSpace: 'nowrap', willChange: 'opacity',
      animation: 'toastIn 200ms cubic-bezier(0.22,1,0.36,1) both',
    }}>{msg}</div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CoupleTodayPage() {
  const [session, setSession]   = useState<Session | null>(null);
  const [data, setData]         = useState<TodayData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState<string | null>(null);
  const [tasks, setTasks]       = useState<Task[]>([]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  // Auth guard
  useEffect(() => {
    try {
      const raw = localStorage.getItem('couple_session');
      if (!raw) { window.location.replace('/couple/login'); return; }
      const s = JSON.parse(raw) as Session;
      if (!s?.id) { window.location.replace('/couple/login'); return; }
      setSession(s);
    } catch {
      window.location.replace('/couple/login');
    }
  }, []);

  // Fetch today data
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API}/api/v2/couple/today/${session!.id}`);
        if (!res.ok) throw new Error('non-ok');
        const json: TodayData = await res.json();
        if (!cancelled) {
          setData(json);
          setTasks(json.priority_tasks || []);
        }
      } catch {
        if (!cancelled) showToast('Could not load your dashboard. Please refresh.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [session, showToast]);

  // Mark task complete
  async function completeTask(id: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_complete: true } : t));
    try {
      await fetch(`${API}/api/v2/couple/tasks/${id}/complete`, { method: 'PATCH' });
    } catch {
      // revert optimistically if needed — silently fail for now
    }
  }

  const incompleteTasks = tasks.filter(t => !t.is_complete);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #F8F7F5; }
        ::-webkit-scrollbar { display: none; }
        @keyframes shimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px) translateZ(0); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) translateZ(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px) translateZ(0); }
          to   { opacity: 1; transform: translateY(0) translateZ(0); }
        }
        .page-enter { animation: fadeIn 320ms cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      <div style={{
        minHeight: '100dvh', background: '#F8F7F5',
        display: 'flex', flexDirection: 'column',
        paddingBottom: 72,
      }}>

        {/* Top Bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px 20px 12px', position: 'relative',
        }}>
          <span style={{
            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
            letterSpacing: '0.25em', textTransform: 'uppercase', color: '#888580',
          }}>The Dream Wedding</span>
          <div style={{
            position: 'absolute', right: 20, top: '50%',
            transform: 'translateY(-50%) translateZ(0)',
            width: 40, height: 40, borderRadius: '50%',
            background: '#111111', color: '#F8F7F5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Jost', sans-serif", fontSize: 13, fontWeight: 300,
            cursor: 'pointer', touchAction: 'manipulation',
          }}>
            {getInitials(session?.name)}
          </div>
        </div>

        {/* Content */}
        <div className="page-enter" style={{ flex: 1, padding: '0 20px', overflowY: 'auto' }}>

          {loading ? (
            <div style={{ paddingTop: 32 }}>
              <Shimmer height={80} />
              <Shimmer height={120} />
              <Shimmer height={60} />
            </div>
          ) : (
            <>
              {/* Hero */}
              <div style={{ textAlign: 'center', padding: '32px 0 28px' }}>
                {data?.next_event ? (() => {
                  const days = daysUntil(data.next_event.event_date);
                  const wordsStr = numberToWords(days);
                  return (
                    <>
                      <p style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 36, fontWeight: 300, color: '#111111',
                        margin: '0 0 8px', lineHeight: 1.2,
                        willChange: 'opacity',
                      }}>
                        {wordsStr} days to your {data.next_event.event_name}
                      </p>
                      <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13, fontWeight: 300, color: '#888580',
                        margin: 0,
                      }}>
                        {formatEventDate(data.next_event.event_date)}
                      </p>
                    </>
                  );
                })() : (
                  <p style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 32, fontWeight: 300, color: '#111111',
                    margin: 0, lineHeight: 1.3,
                  }}>
                    Your wedding journey begins.
                  </p>
                )}
              </div>

              {/* Section 1: Needs Your Attention */}
              <div style={{ marginBottom: 28 }}>
                <p style={{
                  fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
                  letterSpacing: '0.25em', textTransform: 'uppercase',
                  color: '#888580', margin: '0 0 12px',
                }}>Needs Your Attention</p>

                {incompleteTasks.length === 0 ? (
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                    fontWeight: 300, color: '#888580', fontStyle: 'italic', margin: 0,
                  }}>You're all caught up.</p>
                ) : (
                  incompleteTasks.map(task => {
                    const taskName = task.task_name || task.title || 'Task';
                    const urgent = isWithin7Days(task.due_date);
                    return (
                      <div key={task.id} style={{
                        background: '#FFFFFF',
                        border: '0.5px solid #E2DED8',
                        borderRadius: 8, padding: 16, marginBottom: 8,
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        touchAction: 'manipulation',
                      }}>
                        {/* Checkbox */}
                        <button
                          onClick={() => completeTask(task.id)}
                          style={{
                            width: 18, height: 18, borderRadius: '50%',
                            border: '1px solid #E2DED8',
                            background: 'transparent', cursor: 'pointer',
                            flexShrink: 0, marginTop: 2, padding: 0,
                            touchAction: 'manipulation',
                            transition: 'border-color 200ms cubic-bezier(0.22,1,0.36,1)',
                          }}
                          aria-label="Mark complete"
                        />
                        <div style={{ flex: 1 }}>
                          <p style={{
                            fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                            fontWeight: 400, color: '#111111', margin: '0 0 4px',
                          }}>{taskName}</p>
                          {task.event && (
                            <p style={{
                              fontFamily: "'Jost', sans-serif", fontSize: 9,
                              fontWeight: 200, letterSpacing: '0.2em',
                              textTransform: 'uppercase', color: '#888580',
                              margin: '0 0 4px',
                            }}>{task.event}</p>
                          )}
                          {task.due_date && (
                            <p style={{
                              fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                              fontWeight: 300,
                              color: urgent ? '#C9A84C' : '#888580',
                              margin: 0,
                            }}>Due {formatEventDate(task.due_date)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Section 2: This Week */}
              <div style={{ marginBottom: 28 }}>
                <p style={{
                  fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
                  letterSpacing: '0.25em', textTransform: 'uppercase',
                  color: '#888580', margin: '0 0 12px',
                }}>This Week</p>

                {(data?.this_week_events?.length ?? 0) === 0 && (data?.upcoming_payments?.length ?? 0) === 0 ? (
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                    fontWeight: 300, color: '#888580', fontStyle: 'italic', margin: 0,
                  }}>A quiet week ahead.</p>
                ) : (
                  <>
                    {data?.this_week_events?.map(evt => (
                      <div key={evt.id} style={{
                        background: '#FFFFFF', border: '0.5px solid #E2DED8',
                        borderRadius: 8, padding: 16, marginBottom: 8,
                        display: 'flex', alignItems: 'stretch', gap: 0, overflow: 'hidden',
                      }}>
                        {/* Gold accent bar */}
                        <div style={{
                          width: 2, background: '#C9A84C', borderRadius: '2px 0 0 2px',
                          flexShrink: 0, marginRight: 14,
                        }} />
                        <div>
                          <p style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: 16, fontWeight: 300, color: '#111111',
                            margin: '0 0 4px',
                          }}>{evt.event_name}</p>
                          <p style={{
                            fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                            fontWeight: 300, color: '#888580', margin: 0,
                          }}>
                            {formatEventDate(evt.event_date)}
                            {evt.venue ? ` · ${evt.venue}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                    {data?.upcoming_payments?.map(pay => (
                      <div key={pay.id} style={{
                        background: '#FFFFFF', border: '0.5px solid #E2DED8',
                        borderRadius: 8, padding: '12px 16px', marginBottom: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <p style={{
                          fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                          fontWeight: 300, color: '#111111', margin: 0,
                        }}>{pay.vendor_name || 'Payment due'}</p>
                        <p style={{
                          fontFamily: "'Cormorant Garamond', serif", fontSize: 16,
                          fontWeight: 300, color: '#C9A84C', margin: 0,
                        }}>{pay.actual_amount ? formatINR(pay.actual_amount) : ''}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Section 3: Budget */}
              <div style={{ marginBottom: 28 }}>
                <p style={{
                  fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
                  letterSpacing: '0.25em', textTransform: 'uppercase',
                  color: '#888580', margin: '0 0 16px',
                }}>Budget</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  {[
                    { label: 'Total', value: data?.budget.total ?? 0 },
                    { label: 'Committed', value: data?.budget.committed ?? 0 },
                    { label: 'Paid', value: data?.budget.paid ?? 0 },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center' }}>
                      <p style={{
                        fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
                        letterSpacing: '0.25em', textTransform: 'uppercase',
                        color: '#888580', margin: '0 0 4px',
                      }}>{item.label}</p>
                      <p style={{
                        fontFamily: "'Cormorant Garamond', serif", fontSize: 20,
                        fontWeight: 300, color: '#111111', margin: 0,
                      }}>{formatINR(item.value)}</p>
                    </div>
                  ))}
                </div>

                {/* Gold progress bar */}
                {(data?.budget.total ?? 0) > 0 && (
                  <div style={{
                    height: 1, background: '#E2DED8', borderRadius: 0, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', background: '#C9A84C',
                      width: `${Math.min(100, ((data?.budget.committed ?? 0) / (data?.budget.total ?? 1)) * 100)}%`,
                      borderRadius: 0,
                      transition: 'width 400ms cubic-bezier(0.22,1,0.36,1)',
                      willChange: 'width',
                    }} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Bottom Nav */}
        <BottomNav active="today" onToast={showToast} />
      </div>
    </>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
function BottomNav({ active, onToast }: { active: string; onToast: (msg: string) => void }) {
  const tabs = [
    { key: 'today', label: 'Today', href: '/couple/today' },
    { key: 'plan',  label: 'Plan',  href: '/couple/plan'  },
    { key: 'muse',  label: 'Muse',  href: null            },
    { key: 'me',    label: 'Me',    href: null            },
  ];

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#FFFFFF', borderTop: '0.5px solid #E2DED8',
      display: 'flex', alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
    }}>
      {tabs.map(tab => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => {
              if (tab.href) window.location.href = tab.href;
              else onToast('Coming soon');
            }}
            style={{
              flex: 1, border: 'none', background: 'none', cursor: 'pointer',
              padding: '12px 0 10px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 4, touchAction: 'manipulation',
              position: 'relative',
            }}
          >
            <span style={{
              fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: isActive ? '#111111' : '#888580',
              transition: 'color 200ms cubic-bezier(0.22,1,0.36,1)',
              willChange: 'opacity',
            }}>{tab.label}</span>
            {isActive && (
              <div style={{
                position: 'absolute', bottom: 8, left: '50%',
                transform: 'translateX(-50%) translateZ(0)',
                width: 16, height: 1, background: '#C9A84C',
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
