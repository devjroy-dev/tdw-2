"""
PHASE 7 — Leads: Convert to Client
Repo: tdw-2

Changes:
  1. Fix session key fallback in leads/page.tsx (uses vendor_web_session only — same bug as today page)
  2. Fix save endpoint — leads page calls /api/v2/vendor/clients which doesn't exist.
     Correct endpoint is /api/vendor-clients (POST).
  3. Add "Book this couple →" button on each expanded lead card.
     Pre-fills an Add Client sheet with name, event_type, event_date, budget from the lead.
     On confirm, calls POST /api/vendor-clients and refreshes the list.

Run from: /workspaces/tdw-2
Command:  python3 phase7_leads.py
"""

LEADS_PATH = 'web/app/vendor/leads/page.tsx'
with open(LEADS_PATH, 'r') as f:
    src = f.read()

original = src
changes = []

# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 1 — Fix session key fallback
# ─────────────────────────────────────────────────────────────────────────────
OLD_SESSION = """function getSession(): VendorSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('vendor_web_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}"""

NEW_SESSION = """function getSession(): VendorSession | null {
  if (typeof window === 'undefined') return null;
  try {
    // Check both keys — login paths are inconsistent about which one they write.
    const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}"""

if OLD_SESSION in src:
    src = src.replace(OLD_SESSION, NEW_SESSION)
    changes.append('✓ Change 1: Session key fallback fixed in leads/page.tsx')
else:
    changes.append('✗ Change 1 FAILED — session pattern not found')

# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 2 — Fix the save endpoint.
# The leads page was calling /api/v2/vendor/clients which returns 404.
# Correct endpoint is /api/vendor-clients (POST).
# ─────────────────────────────────────────────────────────────────────────────
OLD_SAVE_ENDPOINT = """      const res = await fetch(`${API}/api/v2/vendor/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: session.vendorId,
          name: extracted.name || 'Unknown',
          phone: extracted.phone || null,
          event_type: extracted.event_type || null,
          event_date: extracted.wedding_date || null,
          budget: extracted.budget ? parseInt(extracted.budget.replace(/[^0-9]/g, '')) || null : null,
          city: extracted.city || null,
          notes: message.trim(),
          status: 'new',
        }),
      });"""

NEW_SAVE_ENDPOINT = """      const res = await fetch(`${API}/api/vendor-clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: session.vendorId,
          name: extracted.name || 'Unknown',
          phone: extracted.phone || null,
          event_type: extracted.event_type || null,
          event_date: extracted.wedding_date || null,
          budget: extracted.budget ? parseInt(extracted.budget.replace(/[^0-9]/g, '')) || null : null,
          notes: message.trim(),
          status: 'new',
        }),
      });"""

if OLD_SAVE_ENDPOINT in src:
    src = src.replace(OLD_SAVE_ENDPOINT, NEW_SAVE_ENDPOINT)
    changes.append('✓ Change 2: Fixed save endpoint — /api/v2/vendor/clients → /api/vendor-clients')
else:
    changes.append('✗ Change 2 FAILED — save endpoint pattern not found')

# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 3 — Add "Book this couple →" button + booking sheet state.
#
# Each lead card in the list gets a "Book this couple →" button when expanded.
# Tapping it opens a pre-filled confirmation sheet showing the details DreamAi
# already extracted. Vendor confirms → POST /api/vendor-clients → client added.
#
# Strategy:
#   a) Add bookingTarget state + bookClient function after existing state declarations
#   b) Add the BookingSheet component before the main page component
#   c) Add "Book this couple →" button inside the expanded lead detail section
#   d) Render BookingSheet in the JSX
# ─────────────────────────────────────────────────────────────────────────────

# 3a — Add bookingTarget state after existing state declarations
OLD_STATE_BLOCK = """  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');"""

NEW_STATE_BLOCK = """  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  // Booking sheet — pre-filled from a lead card
  const [bookingTarget, setBookingTarget] = useState<Client | null>(null);
  const [booking, setBooking]             = useState(false);"""

if OLD_STATE_BLOCK in src:
    src = src.replace(OLD_STATE_BLOCK, NEW_STATE_BLOCK)
    changes.append('✓ Change 3a: bookingTarget state added')
else:
    changes.append('✗ Change 3a FAILED — state block not found')

# 3b — Add bookClient function after handleClear
OLD_HANDLE_CLEAR = """  function handleClear() {
    setMessage('');
    setExtracted(null);
  }"""

NEW_HANDLE_CLEAR = """  function handleClear() {
    setMessage('');
    setExtracted(null);
  }

  // Book this couple → converts a lead into a full client record.
  // Pre-filled from whatever data the lead already has.
  async function bookClient(client: Client) {
    if (!session || booking) return;
    setBooking(true);
    try {
      const res = await fetch(`${API}/api/vendor-clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: session.vendorId,
          name: client.name || 'Unknown',
          event_type: client.event_type || null,
          event_date: client.event_date || null,
          budget: client.budget || null,
          city: client.city || null,
          notes: client.notes || null,
          status: 'active',
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Booked ✓ Added to Clients');
        setBookingTarget(null);
        loadClients(session.vendorId);
      } else {
        showToast(json.error || 'Could not book couple. Try again.');
      }
    } catch {
      showToast('Could not book couple. Check connection.');
    } finally {
      setBooking(false);
    }
  }"""

if OLD_HANDLE_CLEAR in src:
    src = src.replace(OLD_HANDLE_CLEAR, NEW_HANDLE_CLEAR)
    changes.append('✓ Change 3b: bookClient function added')
else:
    changes.append('✗ Change 3b FAILED — handleClear not found')

# 3c — Add BookingSheet component before the main page export
OLD_EXPORT = """// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VendorLeadsPage() {"""

NEW_EXPORT = """// ─── Booking Sheet ────────────────────────────────────────────────────────────
// Slides up when vendor taps "Book this couple →" on a lead card.
// Shows a summary of what will be created, then confirms.
// Separate component keeps the lead card logic clean.
function BookingSheet({
  client,
  onConfirm,
  onCancel,
  loading,
}: {
  client: Client;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.6)',
        }}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: '#FFFFFF', borderRadius: '20px 20px 0 0',
        padding: '20px 20px',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
        animation: 'slideUp 320ms cubic-bezier(0.22,1,0.36,1)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8' }} />
        </div>

        <p style={{
          fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
          letterSpacing: '0.25em', textTransform: 'uppercase',
          color: '#888580', margin: '0 0 4px',
        }}>BOOK THIS COUPLE</p>

        <p style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300,
          color: '#111111', margin: '0 0 20px', lineHeight: 1.15,
        }}>{client.name || 'Unknown'}</p>

        {/* Details summary */}
        <div style={{ marginBottom: 24 }}>
          {[
            { label: 'Event', value: client.event_type },
            { label: 'Date',  value: client.event_date
                ? new Date(client.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                : null },
            { label: 'Budget', value: client.budget
                ? '₹' + Number(client.budget).toLocaleString('en-IN')
                : null },
            { label: 'City',  value: client.city },
          ].map(row => row.value ? (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: '10px 0', borderBottom: '0.5px solid #F0EEE8',
            }}>
              <span style={{
                fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888580',
              }}>{row.label}</span>
              <span style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
                color: '#111111',
              }}>{row.value}</span>
            </div>
          ) : null)}
        </div>

        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
          color: '#888580', margin: '0 0 20px', lineHeight: 1.5,
        }}>
          This will add them to your Clients with status <strong style={{ fontWeight: 400 }}>Active</strong>. You can edit details anytime.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, height: 52, background: '#C9A84C', border: 'none',
              borderRadius: 100, cursor: loading ? 'default' : 'pointer',
              fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 400,
              letterSpacing: '0.2em', textTransform: 'uppercase', color: '#111111',
              opacity: loading ? 0.6 : 1,
            }}
          >{loading ? 'Booking...' : 'Confirm Booking →'}</button>
          <button
            onClick={onCancel}
            style={{
              height: 52, padding: '0 20px', background: 'transparent',
              border: '0.5px solid #E2DED8', borderRadius: 100, cursor: 'pointer',
              fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300,
              letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580',
            }}
          >Cancel</button>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VendorLeadsPage() {"""

if OLD_EXPORT in src:
    src = src.replace(OLD_EXPORT, NEW_EXPORT)
    changes.append('✓ Change 3c: BookingSheet component added')
else:
    changes.append('✗ Change 3c FAILED — export marker not found')

# 3d — Add slideUp keyframe to existing style block
OLD_STYLE = """        @keyframes shimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }"""

NEW_STYLE = """        @keyframes shimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }"""

if OLD_STYLE in src:
    src = src.replace(OLD_STYLE, NEW_STYLE)
    changes.append('✓ Change 3d: slideUp keyframe added')
else:
    changes.append('✗ Change 3d FAILED — keyframe block not found')

# 3e — Render BookingSheet in JSX (after the toast, before the main div)
OLD_TOAST_JSX = """      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      <div style={{
        minHeight: '100dvh', background: '#0C0A09',"""

NEW_TOAST_JSX = """      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* Booking confirmation sheet */}
      {bookingTarget && (
        <BookingSheet
          client={bookingTarget}
          onConfirm={() => bookClient(bookingTarget)}
          onCancel={() => setBookingTarget(null)}
          loading={booking}
        />
      )}

      <div style={{
        minHeight: '100dvh', background: '#0C0A09',"""

if OLD_TOAST_JSX in src:
    src = src.replace(OLD_TOAST_JSX, NEW_TOAST_JSX)
    changes.append('✓ Change 3e: BookingSheet rendered in JSX')
else:
    changes.append('✗ Change 3e FAILED — toast JSX pattern not found')

# 3f — Add "Book this couple →" button inside the expanded lead detail
# Insert after the notes block, before the closing div of the expanded section
OLD_NOTES_BLOCK = """                      {client.notes && (
                        <p style={{ fontFamily: \"'DM Sans', sans-serif\", fontSize: 13, fontWeight: 300, color: 'rgba(248,247,245,0.4)', margin: '6px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>
                          \"{client.notes}\"
                        </p>
                      )}
                    </div>
                  )}"""

NEW_NOTES_BLOCK = """                      {client.notes && (
                        <p style={{ fontFamily: \"'DM Sans', sans-serif\", fontSize: 13, fontWeight: 300, color: 'rgba(248,247,245,0.4)', margin: '6px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>
                          \"{client.notes}\"
                        </p>
                      )}

                      {/* Book this couple — converts lead to client */}
                      <button
                        onClick={() => setBookingTarget(client)}
                        style={{
                          marginTop: 14, width: '100%', height: 40,
                          background: '#C9A84C', border: 'none', borderRadius: 100,
                          cursor: 'pointer', touchAction: 'manipulation',
                          fontFamily: \"'Jost', sans-serif\", fontSize: 9, fontWeight: 400,
                          letterSpacing: '0.2em', textTransform: 'uppercase', color: '#111111',
                        }}
                      >Book this couple →</button>
                    </div>
                  )}"""

if OLD_NOTES_BLOCK in src:
    src = src.replace(OLD_NOTES_BLOCK, NEW_NOTES_BLOCK)
    changes.append('✓ Change 3f: "Book this couple →" button added to expanded lead card')
else:
    changes.append('✗ Change 3f FAILED — notes block pattern not found')

# ─────────────────────────────────────────────────────────────────────────────
# Write and report
# ─────────────────────────────────────────────────────────────────────────────
if src == original:
    print('✗ NO CHANGES MADE — all patterns failed. Do not commit.')
else:
    with open(LEADS_PATH, 'w') as f:
        f.write(src)
    print('\nPhase 7 — Leads: Convert to Client — complete\n')
    for c in changes:
        print(c)
    print('\nNext: git add -A && git commit -m "Phase 7: leads — Book this couple, fix save endpoint, session key" && git push')
