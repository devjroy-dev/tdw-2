"""
PHASE 3 + 4 — Frontend patch (combined)
Repo: tdw-2

Phase 3 changes:
  1. Today page — 3-card onboarding banner for new vendors (Addendum D)
  2. Today page — WhatsApp DreamAi card (Addendum D / BUG 7)
  3. Today page — expand endpointMap to all 8 DreamAi actions (Addendum B frontend)
  4. Today page — 10-day urgency banner logic (Addendum D)

Phase 4 changes:
  5. Today page — first-login onboarding intro bottom sheet (Addendum F)
  6. Vendor motto replacement (Addendum A)
  7. Create vendor/studio/settings/page.tsx — Tips & Features all 10 cards (Addendum G)
  8. Add Tips & Features entry to studio/page.tsx nav (Addendum G)
  9. Today page — Tip of the Day strip, first 30 days only (Addendum G)

Run from: /workspaces/tdw-2
Command:  python3 phase3_4_frontend.py
"""

import os

changes = []

# ─────────────────────────────────────────────────────────────────────────────
# Read today page once — we make all today changes in one pass
# ─────────────────────────────────────────────────────────────────────────────
TODAY_PATH = 'web/app/vendor/today/page.tsx'
with open(TODAY_PATH, 'r') as f:
    today = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 1 — Expand endpointMap to all 8 DreamAi actions
# The old map only had 4. Now that the backend has all 8, wire them up.
# ─────────────────────────────────────────────────────────────────────────────
OLD_ENDPOINT_MAP = """    const endpointMap: Record<string, string> = {
      send_payment_reminder: '/api/v2/dreamai/vendor-action/send-payment-reminder',
      reply_to_enquiry: '/api/v2/dreamai/vendor-action/reply-to-enquiry',
      block_date: '/api/v2/dreamai/vendor-action/block-date',
      log_expense: '/api/v2/dreamai/vendor-action/log-expense',
    };"""

NEW_ENDPOINT_MAP = """    // All 8 DreamAi actions — matches the WhatsApp DreamAi tool set exactly
    const endpointMap: Record<string, string> = {
      send_payment_reminder:  '/api/v2/dreamai/vendor-action/send-payment-reminder',
      reply_to_enquiry:       '/api/v2/dreamai/vendor-action/reply-to-enquiry',
      block_date:             '/api/v2/dreamai/vendor-action/block-date',
      log_expense:            '/api/v2/dreamai/vendor-action/log-expense',
      create_invoice:         '/api/v2/dreamai/vendor-action/create-invoice',
      add_client:             '/api/v2/dreamai/vendor-action/add-client',
      create_task:            '/api/v2/dreamai/vendor-action/create-task',
      send_client_reminder:   '/api/v2/dreamai/vendor-action/send-client-reminder',
    };"""

if OLD_ENDPOINT_MAP in today:
    today = today.replace(OLD_ENDPOINT_MAP, NEW_ENDPOINT_MAP)
    changes.append('✓ Change 1: DreamAi endpointMap expanded to all 8 actions')
else:
    changes.append('✗ Change 1 FAILED — endpointMap pattern not found')

# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 2 — Add vendor created_at to state + fetch it on load.
# We need this for:
#   - Onboarding banner (show if < 14 days old AND no clients AND no profile)
#   - 10-day urgency window
#   - Tip of the Day (show if < 30 days old)
# Inserted after the existing dreamAiContext state line.
# ─────────────────────────────────────────────────────────────────────────────
OLD_STATE = """  const [nudge, setNudge]             = useState<{ text: string; query: string } | null>(null);"""

NEW_STATE = """  const [nudge, setNudge]             = useState<{ text: string; query: string } | null>(null);
  const [vendorCreatedAt, setVendorCreatedAt] = useState<string | null>(null);
  const [clientCount, setClientCount]         = useState<number>(-1); // -1 = loading
  const [showIntroCard, setShowIntroCard]     = useState(false);
  const [introDismissed, setIntroDismissed]   = useState(false);"""

if OLD_STATE in today:
    today = today.replace(OLD_STATE, NEW_STATE)
    changes.append('✓ Change 2: Added vendorCreatedAt, clientCount, showIntroCard state')
else:
    changes.append('✗ Change 2 FAILED — state pattern not found')

# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 3 — Fetch vendor created_at and client count on load.
# Also check if intro card should show (first login, seen flag in localStorage).
# Inserted after the existing DreamAi context fetch.
# ─────────────────────────────────────────────────────────────────────────────
OLD_FETCH_END = """      .catch(() => {});
  }, []);"""

NEW_FETCH_END = """      .catch(() => {});

    // Fetch vendor row for created_at (needed for onboarding + tip of day timing)
    fetch(`${API}/api/vendors/${s.vendorId}`)
      .then(r => r.json())
      .then(d => {
        if (d.data?.created_at) setVendorCreatedAt(d.data.created_at);
      })
      .catch(() => {});

    // Fetch client count to decide if onboarding banner should show
    fetch(`${API}/api/v2/vendor/clients/${s.vendorId}`)
      .then(r => r.json())
      .then(d => setClientCount((d.data || []).length))
      .catch(() => setClientCount(0));

    // First-login intro card — show once per device
    const seen = localStorage.getItem('onboarding_intro_seen');
    if (!seen) {
      setShowIntroCard(true);
      localStorage.setItem('onboarding_intro_seen', 'true');
    }
  }, []);"""

if OLD_FETCH_END in today:
    today = today.replace(OLD_FETCH_END, NEW_FETCH_END)
    changes.append('✓ Change 3: Added vendor created_at + client count fetches + intro card trigger')
else:
    changes.append('✗ Change 3 FAILED — fetch end pattern not found')

# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 4 — Add derived values + helper logic after the existing derived values.
# daysSinceSignup, isNewVendor, showOnboardingBanner, urgencyBanner, tipOfDay.
# Inserted after the openDreamAi function.
# ─────────────────────────────────────────────────────────────────────────────
OLD_OPEN_DREAMAI = """  function openDreamAi(prefill?: string) {
    setDreamAiPrefill(prefill || '');
    setDreamAiOpen(true);
  }"""

NEW_OPEN_DREAMAI = """  function openDreamAi(prefill?: string) {
    setDreamAiPrefill(prefill || '');
    setDreamAiOpen(true);
  }

  // ─── Onboarding + tip logic ─────────────────────────────────────────────────
  const daysSinceSignup = vendorCreatedAt
    ? Math.floor((Date.now() - new Date(vendorCreatedAt).getTime()) / 86400000)
    : null;

  // New vendor = joined < 14 days ago AND has no clients yet
  const isNewVendor = daysSinceSignup !== null && daysSinceSignup < 14 && clientCount === 0;

  // Onboarding 3-card banner: show if new vendor
  const showOnboardingBanner = isNewVendor && clientCount === 0;

  // 10-day urgency: days 8-10 from signup, if not yet submitted to Discovery
  const showUrgencyBanner = daysSinceSignup !== null && daysSinceSignup >= 8 && daysSinceSignup <= 10;

  // Post-10-day gentle nudge
  const showGentleNudge = daysSinceSignup !== null && daysSinceSignup > 10;

  // Tip of the Day: first 30 days only, rotates through 10 tips
  const TIPS_SHORT = [
    { id: 'dreamai_whatsapp', title: 'DreamAi on WhatsApp', desc: 'Run your entire business from WhatsApp.' },
    { id: 'payment_shield',   title: 'Payment Shield',      desc: 'Secure your final payment before the wedding day.' },
    { id: 'broadcast',        title: 'WhatsApp Broadcast',  desc: 'Message all your clients at once with one tap.' },
    { id: 'discovery_profile',title: 'How Couples See You', desc: 'Your photos do the selling — names come later.' },
    { id: 'progress_ring',    title: 'Client Progress Ring', desc: 'Watch each client move from enquiry to final payment.' },
    { id: 'gst_invoice',      title: 'GST Invoicing',       desc: 'Every invoice auto-calculates CGST and SGST.' },
    { id: 'block_dates',      title: 'Block Your Calendar', desc: 'Block dates the moment you confirm a booking.' },
    { id: 'referral',         title: 'Referral Discounts',  desc: 'Refer couples and earn subscription discounts.' },
    { id: 'collab_hub',       title: 'Collab Hub',          desc: 'Post when you need a vendor or find work from others.' },
    { id: 'image_hub',        title: 'Image Hub',           desc: 'Make your photos catalogue-worthy before submitting.' },
  ];
  const showTipOfDay = daysSinceSignup !== null && daysSinceSignup < 30;
  const todaysTip = showTipOfDay ? TIPS_SHORT[daysSinceSignup % TIPS_SHORT.length] : null;

  // Onboarding card completion flags (localStorage)
  const [card1Done, setCard1Done] = React.useState(false);
  const [card2Done, setCard2Done] = React.useState(false);
  const [card3Done, setCard3Done] = React.useState(
    typeof window !== 'undefined' && !!localStorage.getItem('whatsapp_activated')
  );"""

if OLD_OPEN_DREAMAI in today:
    today = today.replace(OLD_OPEN_DREAMAI, NEW_OPEN_DREAMAI)
    changes.append('✓ Change 4: Added onboarding + tip of day derived logic')
else:
    changes.append('✗ Change 4 FAILED — openDreamAi pattern not found')

# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 5 — Add intro card, onboarding banner, urgency banner, WhatsApp card,
# and Tip of Day to the JSX.
# Strategy: inject all new UI blocks at specific anchors in the existing JSX.
# ─────────────────────────────────────────────────────────────────────────────

# 5a. Add intro card + onboarding-related JSX into the <style> block area
OLD_STYLE_BLOCK = """      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>"""

NEW_STYLE_BLOCK = """      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ─── First-login intro card ─────────────────────────────────────────
          Shows once per device. Explains the 3-level discovery system.
          Not dismissable by backdrop — vendor must tap the button.
      ────────────────────────────────────────────────────────────────────── */}
      {showIntroCard && !introDismissed && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(12,10,9,0.85)',
          display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{
            width: '100%', background: '#0C0A09',
            borderRadius: '24px 24px 0 0',
            padding: '20px 24px',
            paddingBottom: 'calc(28px + env(safe-area-inset-bottom))',
            border: '1px solid #2A2825',
            animation: 'slideUp 380ms cubic-bezier(0.22,1,0.36,1)',
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#2A2825' }} />
            </div>

            {/* TDW wordmark */}
            <p style={{
              fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
              letterSpacing: '0.3em', textTransform: 'uppercase',
              color: '#555250', textAlign: 'center', margin: '0 0 16px',
            }}>THE DREAM WEDDING</p>

            {/* Welcome */}
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300,
              color: '#F8F7F5', textAlign: 'center', margin: '0 0 6px', lineHeight: 1.1,
            }}>Welcome, {firstName}.</h2>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
              color: '#555250', textAlign: 'center', margin: '0 0 24px',
            }}>Your CRM is live. Discovery works differently here.</p>

            {/* Divider */}
            <div style={{ height: '0.5px', background: '#2A2825', margin: '0 0 20px' }} />

            {/* 3 levels */}
            {[
              { num: '①', text: 'Basic info & 4 photos', sub: 'Unlocks your Discovery profile' },
              { num: '②', text: 'Complete bio & vibe tags', sub: 'Unlocks your Submit button' },
              { num: '③', text: 'Our team reviews and lists you', sub: 'You go live on couple discovery' },
            ].map(step => (
              <div key={step.num} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16,
              }}>
                <span style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300,
                  color: '#C9A84C', flexShrink: 0, lineHeight: 1,
                }}>{step.num}</span>
                <div>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
                    color: '#F8F7F5', margin: '0 0 2px',
                  }}>{step.text}</p>
                  <p style={{
                    fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
                    letterSpacing: '0.12em', color: '#C9A84C', margin: 0, textTransform: 'uppercase',
                  }}>{step.sub}</p>
                </div>
              </div>
            ))}

            {/* Divider */}
            <div style={{ height: '0.5px', background: '#2A2825', margin: '0 0 20px' }} />

            {/* Tagline */}
            <p style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 300,
              fontStyle: 'italic', color: '#555250', textAlign: 'center', margin: '0 0 24px',
            }}>The CRM is yours from Day 1. Discovery is earned.</p>

            {/* CTA — only way to dismiss */}
            <button
              onClick={() => setIntroDismissed(true)}
              style={{
                width: '100%', height: 52, background: '#C9A84C', border: 'none',
                borderRadius: 100, cursor: 'pointer',
                fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 400,
                letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0C0A09',
              }}
            >Got it — let's start →</button>
          </div>
        </div>
      )}"""

if OLD_STYLE_BLOCK in today:
    today = today.replace(OLD_STYLE_BLOCK, NEW_STYLE_BLOCK)
    changes.append('✓ Change 5a: First-login intro card added')
else:
    changes.append('✗ Change 5a FAILED — style block pattern not found')

# 5b. Add onboarding banner + WhatsApp card BEFORE the "Needs Attention" section.
# Replaces empty state for new vendors.
OLD_ATTENTION_HEADER = """        {/* Section 1 — Needs Attention */}
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <p style={{
            fontFamily: \"'Jost', sans-serif\", fontSize: 9, fontWeight: 300,
            letterSpacing: '0.25em', textTransform: 'uppercase',
            color: '#888580', margin: '0 0 14px',
          }}>NEEDS YOUR ATTENTION</p>"""

NEW_ATTENTION_HEADER = """        {/* ─── 10-day urgency banner ────────────────────────────────────────────
            Days 8-10: strong push to complete profile and submit for Discovery.
            Tone is calm urgency — "don't miss your chance", not "access expires".
        ─────────────────────────────────────────────────────────────────────── */}
        {showUrgencyBanner && (
          <div style={{ padding: '0 20px', marginBottom: 20 }}>
            <div style={{
              background: '#FFFFFF', border: '1.5px solid #C9A84C',
              borderRadius: 12, padding: '16px 18px',
            }}>
              <p style={{
                fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
                letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 6px',
              }}>DISCOVERY WINDOW</p>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
                color: '#111111', margin: '0 0 4px', lineHeight: 1.5,
              }}>
                Your profile window closes in {10 - (daysSinceSignup || 0)} day{10 - (daysSinceSignup || 0) !== 1 ? 's' : ''}.
              </p>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                color: '#888580', margin: '0 0 14px',
              }}>Complete your bio and submit for Discovery — India's first curated digital storefront.</p>
              <a href="/vendor/discovery/dash" style={{
                fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
                letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C',
                textDecoration: 'none',
              }}>COMPLETE NOW →</a>
            </div>
          </div>
        )}

        {/* ─── Post-10-day gentle nudge ─────────────────────────────────────── */}
        {showGentleNudge && !showUrgencyBanner && (
          <div style={{ padding: '0 20px', marginBottom: 20 }}>
            <div style={{
              background: '#FFFFFF', border: '0.5px solid #E2DED8',
              borderRadius: 12, padding: '14px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                color: '#555250', margin: 0,
              }}>Ready to go live? Your Discovery profile is waiting.</p>
              <a href="/vendor/discovery/dash" style={{
                fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C9A84C',
                textDecoration: 'none', flexShrink: 0, marginLeft: 12,
              }}>SUBMIT →</a>
            </div>
          </div>
        )}

        {/* ─── New vendor onboarding banner ─────────────────────────────────────
            Shown if vendor is < 14 days old and has no clients yet.
            Each card disappears individually once the action is completed.
            Entire banner gone after 14 days or once all 3 cards are done.
        ─────────────────────────────────────────────────────────────────────── */}
        {showOnboardingBanner && !(card1Done && card2Done && card3Done) && (
          <div style={{ padding: '0 20px', marginBottom: 28 }}>
            <p style={{
              fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
              letterSpacing: '0.25em', textTransform: 'uppercase',
              color: '#888580', margin: '0 0 12px',
            }}>THREE THINGS TO DO RIGHT NOW</p>

            {/* Card 1 — Add first client */}
            {!card1Done && (
              <div style={{
                background: '#FFFFFF', border: '0.5px solid #E2DED8',
                borderLeft: '3px solid #C9A84C',
                borderRadius: 8, padding: '14px 16px', marginBottom: 10,
              }}>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 300,
                  color: '#111111', margin: '0 0 4px',
                }}>1. Add your first client</p>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                  color: '#888580', margin: '0 0 12px',
                }}>Start tracking your bookings and revenue.</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <a href="/vendor/clients" style={{
                    fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    color: '#C9A84C', textDecoration: 'none',
                  }}>GO TO CLIENTS →</a>
                  <button onClick={() => setCard1Done(true)} style={{
                    fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: '#C8C4BE', background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0,
                  }}>Mark done</button>
                </div>
              </div>
            )}

            {/* Card 2 — Block dates */}
            {!card2Done && (
              <div style={{
                background: '#FFFFFF', border: '0.5px solid #E2DED8',
                borderLeft: '3px solid #C9A84C',
                borderRadius: 8, padding: '14px 16px', marginBottom: 10,
              }}>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 300,
                  color: '#111111', margin: '0 0 4px',
                }}>2. Block your booked dates</p>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                  color: '#888580', margin: '0 0 12px',
                }}>Keep your calendar accurate. Never double-book.</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <a href="/vendor/studio/calendar" style={{
                    fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    color: '#C9A84C', textDecoration: 'none',
                  }}>OPEN CALENDAR →</a>
                  <button onClick={() => setCard2Done(true)} style={{
                    fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: '#C8C4BE', background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0,
                  }}>Mark done</button>
                </div>
              </div>
            )}

            {/* Card 3 — Meet DreamAi on WhatsApp */}
            {!card3Done && (
              <div style={{
                background: '#0C0A09', border: '0.5px solid #2A2825',
                borderRadius: 8, padding: '14px 16px', marginBottom: 10,
              }}>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 300,
                  color: '#F8F7F5', margin: '0 0 4px',
                }}>3. Meet your business assistant</p>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                  color: '#555250', margin: '0 0 10px',
                }}>Save this number on WhatsApp:</p>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300,
                  color: '#C9A84C', margin: '0 0 4px', letterSpacing: '0.05em',
                }}>+1 415 523 8886</p>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
                  color: '#555250', margin: '0 0 10px',
                }}>Send: <span style={{ color: '#C9A84C' }}>"join acres-eventually"</span> · Then: <span style={{ color: '#C9A84C' }}>"What can you do?"</span></p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                  <a
                    href="https://wa.me/14155238886?text=join%20acres-eventually"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => { localStorage.setItem('whatsapp_activated', 'true'); setCard3Done(true); }}
                    style={{
                      fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
                      letterSpacing: '0.2em', textTransform: 'uppercase',
                      color: '#C9A84C', textDecoration: 'none',
                    }}
                  >OPEN WHATSAPP →</a>
                  <button onClick={() => { localStorage.setItem('whatsapp_activated', 'true'); setCard3Done(true); }} style={{
                    fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: '#555250', background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0,
                  }}>Mark done</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 1 — Needs Attention */}
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <p style={{
            fontFamily: \"'Jost', sans-serif\", fontSize: 9, fontWeight: 300,
            letterSpacing: '0.25em', textTransform: 'uppercase',
            color: '#888580', margin: '0 0 14px',
          }}>NEEDS YOUR ATTENTION</p>"""

if OLD_ATTENTION_HEADER in today:
    today = today.replace(OLD_ATTENTION_HEADER, NEW_ATTENTION_HEADER)
    changes.append('✓ Change 5b: Onboarding banner + urgency banners added before Needs Attention')
else:
    changes.append('✗ Change 5b FAILED — attention header pattern not found')

# 5c. Add Tip of Day strip + WhatsApp persistent card at the bottom, before closing div
OLD_DREAMAI_BAR_END = """        {/* DreamAi Bar */}
        <div style={{ padding: '16px 20px 0' }}>"""

NEW_DREAMAI_BAR_END = """        {/* ─── Tip of the Day ──────────────────────────────────────────────────
            Shown only in first 30 days. One subtle line at the bottom.
            Tap "Learn more" → goes to Tips & Features in Settings.
        ─────────────────────────────────────────────────────────────────── */}
        {todaysTip && (
          <div style={{ padding: '0 20px', marginBottom: 16 }}>
            <div style={{ height: '0.5px', background: '#E2DED8', marginBottom: 12 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300,
                letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C',
              }}>✦ TIP</span>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
                color: '#888580', margin: 0, flex: 1, lineHeight: 1.4,
              }}>
                <strong style={{ color: '#555250', fontWeight: 400 }}>{todaysTip.title}</strong>
                {' — '}{todaysTip.desc.length > 55 ? todaysTip.desc.slice(0, 55) + '...' : todaysTip.desc}
              </p>
              <a href="/vendor/studio/settings" style={{
                fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#C9A84C', textDecoration: 'none', flexShrink: 0,
              }}>More →</a>
            </div>
          </div>
        )}

        {/* DreamAi Bar */}
        <div style={{ padding: '16px 20px 0' }}>"""

if OLD_DREAMAI_BAR_END in today:
    today = today.replace(OLD_DREAMAI_BAR_END, NEW_DREAMAI_BAR_END)
    changes.append('✓ Change 5c: Tip of the Day strip added above DreamAi bar')
else:
    changes.append('✗ Change 5c FAILED — DreamAi bar pattern not found')

# Write today page
with open(TODAY_PATH, 'w') as f:
    f.write(today)


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 6 — Vendor motto replacement (Addendum A)
# "Every dream needs a Maker" → "Every product is a catalogue. Every appointment is a sale."
# ─────────────────────────────────────────────────────────────────────────────
import subprocess
result = subprocess.run(
    ['grep', '-rn', 'Every dream needs a Maker', 'web/app/vendor/', '--include=*.tsx'],
    capture_output=True, text=True
)
motto_files = [line.split(':')[0] for line in result.stdout.strip().split('\n') if line]

if motto_files:
    for path in set(motto_files):
        with open(path, 'r') as f:
            c = f.read()
        c = c.replace(
            'Every dream needs a Maker',
            'Every product is a catalogue. Every appointment is a sale.'
        )
        with open(path, 'w') as f:
            f.write(c)
    changes.append(f'✓ Change 6: Vendor motto replaced in {len(set(motto_files))} file(s): {", ".join(set(motto_files))}')
else:
    changes.append('✓ Change 6: Motto "Every dream needs a Maker" not found in vendor pages (may already be updated or not present)')


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 7 — Create vendor/studio/settings/page.tsx — Tips & Features
# All 10 tip cards. Static, always accessible. Clean catalogue layout.
# ─────────────────────────────────────────────────────────────────────────────

SETTINGS_PAGE = """\
'use client';
// Tips & Features — a permanent reference page in Studio.
// All 10 tip cards explaining what TDW can do for vendors.
// Each card is self-contained: icon, title, description, example, CTA.
// This page never changes — it's the vendor's reference guide.
import { useRouter } from 'next/navigation';

const TIPS = [
  {
    id: 'dreamai_whatsapp',
    icon: '✦',
    title: 'DreamAi on WhatsApp',
    description: 'Run your entire business from WhatsApp. Create invoices, add clients, block dates — all by sending a text. No dashboard needed.',
    example: 'Text: "Sharma ji ka invoice banao, 5 lakh"',
    cta: 'Activate DreamAi',
    href: 'https://wa.me/14155238886?text=join%20acres-eventually',
    external: true,
  },
  {
    id: 'payment_shield',
    icon: '◈',
    title: 'Payment Shield',
    description: 'Secure your final payment before the wedding day. The couple commits to paying before you travel to the venue. Never chase a balance again.',
    example: 'Couple locks ₹80,000 balance two weeks before the wedding. You travel with confidence.',
    cta: 'Go to Money',
    href: '/vendor/money',
  },
  {
    id: 'broadcast',
    icon: '◉',
    title: 'WhatsApp Broadcast',
    description: 'Message all your clients at once with one tap. Payment reminders, season greetings, availability updates — sent to everyone in seconds.',
    example: 'Send a payment reminder to every October client in 10 seconds.',
    cta: 'Go to Broadcast',
    href: '/vendor/studio/broadcast',
  },
  {
    id: 'discovery_profile',
    icon: '⬡',
    title: 'How Couples See You',
    description: 'Couples swipe your work before they see your name. Your photos do the selling. A couple falls in love with your work, spends a token, and only then sees your identity.',
    example: 'A couple matches with your style. They spend a token. They see your name and message you.',
    cta: 'Preview Your Profile',
    href: '/vendor/studio/discovery-preview',
  },
  {
    id: 'progress_ring',
    icon: '◐',
    title: 'Client Progress Ring',
    description: 'Every client has a progress ring. Watch it fill from enquiry to final payment. At a glance, you know exactly where each relationship stands.',
    example: 'Add invoice → ring fills to 60%. Mark paid → ring completes to 100%.',
    cta: 'Go to Clients',
    href: '/vendor/clients',
  },
  {
    id: 'gst_invoice',
    icon: '₹',
    title: 'GST-Compliant Invoicing',
    description: 'Every invoice auto-calculates CGST and SGST. Download as PDF. Your client gets a professional invoice. You stay compliant without an accountant.',
    example: 'Create invoice for Kapoor wedding ₹2L → GST splits instantly → download and send.',
    cta: 'Create Invoice',
    href: '/vendor/money',
  },
  {
    id: 'block_dates',
    icon: '◻',
    title: 'Block Your Calendar',
    description: 'Block dates the moment you confirm a booking. Or text DreamAi on WhatsApp. Your calendar stays accurate and double-bookings become impossible.',
    example: 'Text DreamAi: "Block Dec 15 and 16 for Kapoor wedding"',
    cta: 'Open Calendar',
    href: '/vendor/studio/calendar',
  },
  {
    id: 'referral',
    icon: '✦',
    title: 'Referral Discounts',
    description: 'Refer past clients to TDW and earn subscription discounts when they join and send an enquiry. More referrals = lower monthly bill.',
    example: '3 referrals = 20% off your monthly subscription. 10 referrals = 50% off.',
    cta: 'Get Your Referral Code',
    href: '/vendor/studio/referrals',
  },
  {
    id: 'collab_hub',
    icon: '⟡',
    title: 'Collab Hub',
    description: 'Post when you need a vendor for a shoot, or find work from other vendors who need your category. A private marketplace within TDW.',
    example: 'Post: "Looking for MUA in Jaipur, Nov 15, ₹40K budget" — matching vendors notified.',
    cta: 'Go to Collab',
    href: '/vendor/discovery/collab',
  },
  {
    id: 'image_hub',
    icon: '◫',
    title: 'Image Hub & Approval',
    description: 'Every photo you upload is reviewed by our team before going live on the couple feed. Make them catalogue-worthy — editorial, portrait-oriented, well-lit.',
    example: 'Sharp, well-lit, portrait-oriented photos get approved faster. Think Vogue, not Instagram.',
    cta: 'Go to Image Hub',
    href: '/vendor/discovery/images',
  },
];

export default function TipsAndFeaturesPage() {
  const router = useRouter();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{
        background: '#F8F7F5', minHeight: '100dvh',
        paddingTop: 24,
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom) + 24px)',
      }}>

        {/* Header */}
        <div style={{ padding: '0 20px 28px' }}>
          <p style={{
            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
            letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8C8480', margin: '0 0 6px',
          }}>YOUR STUDIO</p>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300,
            color: '#111111', margin: 0, lineHeight: 1.1,
          }}>Tips & Features</h1>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
            color: '#888580', margin: '8px 0 0',
          }}>Everything TDW can do for your business.</p>
        </div>

        {/* Tip cards */}
        <div style={{ padding: '0 20px' }}>
          {TIPS.map((tip, i) => (
            <div key={tip.id} style={{
              background: '#FFFFFF', border: '0.5px solid #E2DED8',
              borderRadius: 14, padding: 20, marginBottom: 12,
            }}>
              {/* Icon + title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{
                  fontFamily: "'Jost', sans-serif", fontSize: 16,
                  color: '#C9A84C', flexShrink: 0,
                }}>{tip.icon}</span>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300,
                  color: '#111111', margin: 0,
                }}>{tip.title}</p>
              </div>

              {/* Description */}
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                color: '#555250', lineHeight: 1.6, margin: '0 0 12px',
              }}>{tip.description}</p>

              {/* Example box */}
              <div style={{
                background: '#F8F7F5', borderRadius: 8, padding: 12, marginBottom: 14,
              }}>
                <p style={{
                  fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 200,
                  letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 4px',
                }}>EXAMPLE</p>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                  fontStyle: 'italic', color: '#555250', margin: 0, lineHeight: 1.5,
                }}>{tip.example}</p>
              </div>

              {/* CTA */}
              <button
                onClick={() => {
                  if (tip.external) window.open(tip.href, '_blank');
                  else router.push(tip.href);
                }}
                style={{
                  width: '100%', height: 40, background: '#111111', border: 'none',
                  borderRadius: 100, cursor: 'pointer',
                  fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                  letterSpacing: '0.2em', textTransform: 'uppercase', color: '#F8F7F5',
                }}
              >{tip.cta}</button>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}
"""

settings_dir = 'web/app/vendor/studio/settings'
os.makedirs(settings_dir, exist_ok=True)
settings_path = f'{settings_dir}/page.tsx'
with open(settings_path, 'w') as f:
    f.write(SETTINGS_PAGE)
changes.append(f'✓ Change 7: Created {settings_path} — Tips & Features page (10 cards)')


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 8 — Add Tips & Features to studio/page.tsx nav grid
# ─────────────────────────────────────────────────────────────────────────────
STUDIO_PATH = 'web/app/vendor/studio/page.tsx'
with open(STUDIO_PATH, 'r') as f:
    studio = f.read()

OLD_TOOLS = """import {
  Calendar,
  Users,
  BarChart2,
  Megaphone,
  Gift,
  FileText,
  ChevronRight,
} from "lucide-react";

const TOOLS = [
  { Icon: Calendar,  title: "Calendar",   subtitle: "Your shoots & events",    href: "/vendor/studio/calendar"   },
  { Icon: Users,     title: "Team",       subtitle: "Manage your team",        href: "/vendor/studio/team"       },
  { Icon: BarChart2, title: "Analytics",  subtitle: "Views, saves, enquiries", href: "/vendor/studio/analytics"  },
  { Icon: Megaphone, title: "Broadcast",  subtitle: "Message all clients",     href: "/vendor/studio/broadcast"  },
  { Icon: Gift,      title: "Referrals",  subtitle: "Earn from referrals",     href: "/vendor/studio/referrals"  },
  { Icon: FileText,  title: "Contracts",  subtitle: "Templates & signed docs", href: "/vendor/studio/contracts"  },
];"""

NEW_TOOLS = """import {
  Calendar,
  Users,
  BarChart2,
  Megaphone,
  Gift,
  FileText,
  Lightbulb,
  ChevronRight,
} from "lucide-react";

const TOOLS = [
  { Icon: Calendar,  title: "Calendar",       subtitle: "Your shoots & events",    href: "/vendor/studio/calendar"   },
  { Icon: Users,     title: "Team",           subtitle: "Manage your team",        href: "/vendor/studio/team"       },
  { Icon: BarChart2, title: "Analytics",      subtitle: "Views, saves, enquiries", href: "/vendor/studio/analytics"  },
  { Icon: Megaphone, title: "Broadcast",      subtitle: "Message all clients",     href: "/vendor/studio/broadcast"  },
  { Icon: Gift,      title: "Referrals",      subtitle: "Earn from referrals",     href: "/vendor/studio/referrals"  },
  { Icon: FileText,  title: "Contracts",      subtitle: "Templates & signed docs", href: "/vendor/studio/contracts"  },
  { Icon: Lightbulb, title: "Tips & Features",subtitle: "What TDW can do for you", href: "/vendor/studio/settings"   },
];"""

if OLD_TOOLS in studio:
    studio = studio.replace(OLD_TOOLS, NEW_TOOLS)
    with open(STUDIO_PATH, 'w') as f:
        f.write(studio)
    changes.append('✓ Change 8: Tips & Features added to Studio nav grid')
else:
    changes.append('✗ Change 8 FAILED — studio TOOLS array pattern not found')


# ─────────────────────────────────────────────────────────────────────────────
# Report
# ─────────────────────────────────────────────────────────────────────────────
print('\nPhase 3 + 4 — Frontend patch complete\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Phase 3+4: onboarding banner, intro card, WhatsApp card, tips system, urgency banner, motto" && git push')
