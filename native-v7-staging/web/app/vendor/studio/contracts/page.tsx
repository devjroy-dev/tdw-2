'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const BASE = 'https://dream-wedding-production-89ae.up.railway.app';
const GOLD = '#C9A84C';
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface VendorSession { vendorId?: string; id?: string; vendorName?: string; name?: string; category?: string; tier?: string; }
interface Contract { id: string; client_name: string; category: string; status: string; version: number; parent_contract_id?: string; created_at: string; sent_at?: string; acknowledged_at?: string; fields_json?: any; business_name?: string; client_phone?: string; client_email?: string; superseded_by?: string; }

// ─── Session ──────────────────────────────────────────────────────────────────
function getSession(): VendorSession | null {
  if (typeof window === 'undefined') return null;
  try { const r = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session'); return r ? JSON.parse(r) : null; } catch { return null; }
}

// ─── Category → template fields mapping ──────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  mua: 'mua', photographers: 'photographer', photographer: 'photographer',
  decorator: 'decorator', decorators: 'decorator',
  designers: 'designer', designer: 'designer',
  jewellers: 'jeweller', jeweller: 'jeweller',
  venue: 'venue', venues: 'venue',
};

function detectCategory(raw?: string): string {
  if (!raw) return 'mua';
  const lower = (raw || '').toLowerCase();
  return CATEGORY_MAP[lower] || 'mua';
}

const EVENTS = ['Mehendi', 'Haldi', 'Sangeet', 'Ceremony', 'Reception'];

// ─── Default T&C per category ─────────────────────────────────────────────────
const DEFAULT_TC: Record<string, string> = {
  mua: `1. Booking is confirmed upon receipt of advance payment. Until advance is received, the date remains available to other clients.
2. Balance is due on or before the date specified. Services may be withheld if balance is outstanding.
3. Cancellation more than 60 days before event: Advance forfeited. No further amount due.
4. Cancellation 30–60 days before event: 50% of total fee due in addition to advance already paid.
5. Cancellation less than 30 days: 100% of total fee due.
6. Client is responsible for disclosing any known skin allergies or conditions prior to service.
7. Artist retains the right to photograph work for portfolio unless Client provides written objection.
8. Delays caused by Client or venue exceeding 30 minutes may result in adjusted service scope.
9. Total liability shall not exceed the total fee paid.
10. This agreement is between Artist and Client only. The Dream Wedding is not a party to this agreement.`,
  photographer: `1. Booking confirmed upon receipt of advance payment.
2. Balance is due on or before the date specified. Services may be withheld if balance is outstanding.
3. Cancellation more than 90 days: Advance forfeited. No further amount due.
4. Cancellation 60–90 days: 50% of total fee due.
5. Cancellation 30–60 days: 75% of total fee due.
6. Cancellation less than 30 days: 100% of total fee due.
7. Edited photographs delivered within the timeline specified. Rush delivery may attract additional charges.
8. Raw files are the intellectual property of the Photographer and not included unless explicitly agreed.
9. Photographer retains creative rights and may use images for portfolio unless Client objects in writing.
10. Total liability shall not exceed the total fee paid.
11. This agreement is between Photographer and Client only. The Dream Wedding is not a party to this agreement.`,
  decorator: `1. Booking confirmed upon receipt of advance payment.
2. Balance due on or before the date specified. Decorator may withhold installation if balance is outstanding.
3. Cancellation more than 90 days: Advance forfeited.
4. Cancellation 60–90 days: 50% of total fee due.
5. Cancellation 30–60 days: 75% of total fee due.
6. Cancellation less than 30 days: 100% of total fee due.
7. Seasonal availability may require substitutions of equivalent quality.
8. Client responsible for ensuring Decorator has venue access at agreed setup time.
9. Decorator retains the right to photograph completed work for portfolio use.
10. Total liability shall not exceed the total fee paid.
11. This agreement is between Decorator and Client only. The Dream Wedding is not a party to this agreement.`,
  designer: `1. No work commences until advance payment is received.
2. Balance due at final fitting or before delivery as specified.
3. Cancellation more than 90 days: Advance forfeited. Material costs additionally due if fabric already procured.
4. Cancellation 60–90 days: 50% of total fee due.
5. Cancellation 30–60 days: 75% of total fee due.
6. Cancellation less than 30 days: 100% of total fee due.
7. All original designs remain the intellectual property of the Designer.
8. Client is responsible for attending fittings at agreed times.
9. Designer is not liable for fit issues arising from body changes after final fitting.
10. Designer retains the right to photograph garments for portfolio unless Client objects in writing.
11. Total liability shall not exceed the total fee paid.
12. This agreement is between Designer and Client only. The Dream Wedding is not a party to this agreement.`,
  jeweller: `1. No reservation or work commences until advance payment is received. Advance is non-refundable.
2. Balance due before delivery or collection as specified.
3. Where items are priced based on metal weight or stone rates, final price may vary with market rates. Client will be notified of material variations exceeding 5% of quoted price.
4. Cancellation more than 90 days: Advance forfeited.
5. Cancellation 60–90 days: 50% of total fee due.
6. Custom or bespoke items: No refund once crafting commences.
7. All items comply with BIS hallmarking standards where applicable.
8. Total liability shall not exceed the total fee paid.
9. This agreement is between Jeweller and Client only. The Dream Wedding is not a party to this agreement.`,
  venue: `1. Booking confirmed upon receipt of advance payment. Date remains available to other clients until advance is received.
2. Balance due on or before the date specified. Venue reserves the right to cancel if balance is not received by due date.
3. Confirmed guest count must be provided no later than 7 days before event.
4. Cancellation more than 120 days: Advance forfeited.
5. Cancellation 90–120 days: 25% of total fee due.
6. Cancellation 60–90 days: 50% of total fee due.
7. Cancellation 30–60 days: 75% of total fee due.
8. Cancellation less than 30 days: 100% of total fee due.
9. Client is responsible for compliance with local noise regulations and venue curfew.
10. Security deposit held against damage and additional charges. Returned within 7 working days post-event less any deductions.
11. Total liability shall not exceed the total fee paid.
12. This agreement is between Venue and Client only. The Dream Wedding is not a party to this agreement.`,
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#F8F7F5', fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, padding: '10px 16px', borderRadius: 8, zIndex: 400, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>{msg}</div>;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    draft: { bg: '#F4F1EC', color: '#8C8480', label: 'Draft' },
    sent: { bg: 'rgba(201,168,76,0.12)', color: '#8C6D20', label: 'Sent' },
    acknowledged: { bg: '#E8F5E9', color: '#4A7C59', label: 'Acknowledged' },
    superseded: { bg: '#F0F0F0', color: '#AAAAAA', label: 'Superseded' },
  };
  const s = map[status] || map.draft;
  return <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 100, background: s.bg, color: s.color }}>{s.label}</span>;
}

// ─── Contract form fields per category ───────────────────────────────────────
function ContractForm({ category, fields, onChange }: { category: string; fields: any; onChange: (f: any) => void }) {
  const F = (label: string, key: string, type = 'text', placeholder = '') => (
    <div key={key} style={{ marginBottom: 16 }}>
      <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 6px' }}>{label}</p>
      <input
        type={type}
        value={fields[key] || ''}
        onChange={e => onChange({ ...fields, [key]: e.target.value })}
        placeholder={placeholder}
        style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #E2DED8', outline: 'none', fontFamily: "'DM Sans',sans-serif", fontWeight: 300, fontSize: 13, color: '#111', padding: '6px 0' }}
      />
    </div>
  );

  const EventsField = () => (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 8px' }}>Events Covered</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {EVENTS.map(ev => {
          const selected = (fields.events_covered || []).includes(ev);
          return (
            <button key={ev} onClick={() => {
              const current = fields.events_covered || [];
              onChange({ ...fields, events_covered: selected ? current.filter((e: string) => e !== ev) : [...current, ev] });
            }} style={{ padding: '6px 14px', borderRadius: 100, border: selected ? `1px solid ${GOLD}` : '0.5px solid #E2DED8', background: selected ? 'rgba(201,168,76,0.08)' : 'transparent', fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: selected ? GOLD : '#888580', cursor: 'pointer', touchAction: 'manipulation' }}>{ev}</button>
          );
        })}
      </div>
    </div>
  );

  const AmountFields = () => (
    <>
      {F('Total Fee (₹)', 'total_fee', 'number', '0')}
      {F('Advance Paid (₹)', 'advance_paid', 'number', '0')}
      {F('Balance Due Date', 'balance_due_date', 'date')}
    </>
  );

  return (
    <div>
      {F('Client Name *', 'client_name', 'text', 'Client name')}
      {(category === 'mua' || category === 'photographer' || category === 'decorator' || category === 'venue') && (
        <>
          {F('Event / Wedding Date', 'wedding_date', 'date')}
          <EventsField />
        </>
      )}
      {(category === 'designer') && (
        <>
          {F('Outfit Type', 'outfit_type', 'text', 'Lehenga / Saree / Gown / Other')}
          {F('Trial Date', 'trial_date', 'date')}
          {F('Delivery Date', 'delivery_date', 'date')}
          {F('Alteration Rounds Included', 'alteration_rounds', 'number', '2')}
          {F('Customisation Scope', 'customisation_scope', 'text', 'Describe customisation')}
        </>
      )}
      {(category === 'jeweller') && (
        <>
          {F('Items Ordered', 'items_ordered', 'text', 'Describe items')}
          {F('Delivery Date', 'delivery_date', 'date')}
        </>
      )}
      <AmountFields />
      {category === 'mua' && (
        <>
          {F('Team Size', 'team_size', 'number', '1')}
          {F('Reporting Time', 'reporting_time', 'text', 'e.g. 5:00 AM')}
        </>
      )}
      {category === 'photographer' && (
        <>
          {F('Hours of Coverage', 'hours_coverage', 'number', '8')}
          {F('Edited Photos Delivered', 'photos_delivered', 'number', '300')}
          {F('Delivery Timeline (weeks)', 'delivery_weeks', 'number', '4')}
        </>
      )}
      {category === 'decorator' && (
        <>
          {F('Venue Name', 'venue_name', 'text', 'Venue name')}
        </>
      )}
      {category === 'venue' && (
        <>
          {F('Guest Count', 'guest_count', 'number', '0')}
          {F('Maximum Capacity', 'max_capacity', 'number', '0')}
          {F('Venue Curfew', 'venue_curfew', 'text', 'e.g. 11:00 PM')}
        </>
      )}
      {F('Additional Notes', 'notes', 'text', 'Optional')}
    </div>
  );
}

// ─── Send Sheet ───────────────────────────────────────────────────────────────
function SendSheet({ contract, businessName, onClose, onSent }: {
  contract: Contract; businessName: string;
  onClose: () => void; onSent: () => void;
}) {
  const [senderName, setSenderName] = useState(businessName);
  const [clientPhone, setClientPhone] = useState(contract.client_phone || '');
  const [clientEmail, setClientEmail] = useState(contract.client_email || '');
  const [sending, setSending] = useState(false);

  const fields = contract.fields_json || {};
  const eventsList = (fields.events_covered || []).join(', ');
  const contractSummary = [
    `Contract from ${senderName}`,
    `Client: ${contract.client_name}`,
    fields.wedding_date ? `Date: ${fields.wedding_date}` : '',
    eventsList ? `Events: ${eventsList}` : '',
    fields.total_fee ? `Total: ₹${Number(fields.total_fee).toLocaleString('en-IN')}` : '',
    fields.advance_paid ? `Advance: ₹${Number(fields.advance_paid).toLocaleString('en-IN')}` : '',
    fields.balance_due_date ? `Balance due: ${fields.balance_due_date}` : '',
    fields.notes ? `Notes: ${fields.notes}` : '',
    '',
    'Generated via The Dream Wedding · thedreamwedding.in',
  ].filter(Boolean).join('\n');

  const waLink = clientPhone ? `https://wa.me/${clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(contractSummary)}` : null;
  const mailLink = clientEmail ? `mailto:${clientEmail}?subject=${encodeURIComponent('Contract from ' + senderName)}&body=${encodeURIComponent(contractSummary)}` : null;

  async function markSent(channel: string) {
    setSending(true);
    try {
      await fetch(`${BASE}/api/v2/vendor/contracts/${contract.id}/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });
      onSent();
    } catch { } finally { setSending(false); }
  }

  const isRevision = (contract.version || 1) > 1;
  const revisionHeader = isRevision ? `This replaces the agreement dated ${contract.parent_contract_id ? 'the previous version' : ''}.` : '';

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501, background: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: '20px 20px 0', maxHeight: '85vh', overflowY: 'auto', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8', margin: '0 auto 20px' }} />
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 300, color: '#111', margin: '0 0 20px' }}>Send Contract</p>

        {isRevision && (
          <div style={{ background: 'rgba(201,168,76,0.08)', border: '0.5px solid rgba(201,168,76,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#8C6D20', margin: 0 }}>{revisionHeader}</p>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 6px' }}>Send under what name?</p>
          <input value={senderName} onChange={e => setSenderName(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #E2DED8', outline: 'none', fontFamily: "'DM Sans',sans-serif", fontWeight: 300, fontSize: 13, color: '#111', padding: '6px 0' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 6px' }}>Client WhatsApp</p>
          <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} inputMode="tel" placeholder="10-digit number" style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #E2DED8', outline: 'none', fontFamily: "'DM Sans',sans-serif", fontWeight: 300, fontSize: 13, color: '#111', padding: '6px 0' }} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 6px' }}>Client Email</p>
          <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} type="email" placeholder="Optional" style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #E2DED8', outline: 'none', fontFamily: "'DM Sans',sans-serif", fontWeight: 300, fontSize: 13, color: '#111', padding: '6px 0' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {waLink ? (
            <a href={waLink} target="_blank" rel="noreferrer" onClick={() => markSent('whatsapp')} style={{ display: 'block', textAlign: 'center', height: 48, lineHeight: '48px', background: '#111', color: '#F8F7F5', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none' }}>
              Send via WhatsApp
            </a>
          ) : (
            <button disabled style={{ height: 48, background: '#E2DED8', color: '#C0BCB6', border: 'none', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'not-allowed' }}>WhatsApp — enter number above</button>
          )}

          {mailLink ? (
            <a href={mailLink} onClick={() => markSent('email')} style={{ display: 'block', textAlign: 'center', height: 48, lineHeight: '48px', background: 'transparent', color: '#111', border: '0.5px solid #E2DED8', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none' }}>
              Send via Email
            </a>
          ) : (
            <button disabled style={{ height: 48, background: 'transparent', color: '#C0BCB6', border: '0.5px solid #E2DED8', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'not-allowed' }}>Email — enter address above</button>
          )}

          <button disabled style={{ height: 48, background: 'transparent', color: '#C0BCB6', border: '0.5px solid #E2DED8', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'not-allowed' }}>Send In App — bride not on platform</button>
        </div>

        <button onClick={onClose} style={{ width: '100%', height: 44, background: 'none', border: 'none', fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', cursor: 'pointer', marginBottom: 8 }}>Cancel</button>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContractsPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorCategory, setVendorCategory] = useState('mua');
  const [tab, setTab] = useState<'contracts' | 'tc'>('contracts');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // T&C state
  const [tcText, setTcText] = useState('');
  const [tcSaving, setTcSaving] = useState(false);
  const [tcDirty, setTcDirty] = useState(false);

  // Contract form state
  const [showForm, setShowForm] = useState(false);
  const [formFields, setFormFields] = useState<any>({});
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Send sheet state
  const [sendingContract, setSendingContract] = useState<Contract | null>(null);

  // Contract detail
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s?.vendorId && !s?.id) { router.replace('/vendor/login'); return; }
    const vid = s.vendorId || s.id || '';
    const vname = s.vendorName || s.name || '';
    const vcat = detectCategory(s.category);
    setVendorId(vid);
    setVendorName(vname);
    setVendorCategory(vcat);

    // Load contracts
    fetch(`${BASE}/api/v2/vendor/contracts/list/${vid}`)
      .then(r => r.json())
      .then(d => { setContracts(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));

    // Load T&C
    fetch(`${BASE}/api/v2/vendor/tc/${vid}`)
      .then(r => r.json())
      .then(d => {
        if (d.tc_text) {
          setTcText(d.tc_text);
        } else {
          // Pre-fill with default for their category
          setTcText(DEFAULT_TC[vcat] || DEFAULT_TC.mua);
          setTcDirty(true);
        }
      })
      .catch(() => { setTcText(DEFAULT_TC[vcat] || DEFAULT_TC.mua); setTcDirty(true); });
  }, [router]);

  async function saveTC() {
    if (!vendorId || tcSaving) return;
    setTcSaving(true);
    try {
      await fetch(`${BASE}/api/v2/vendor/tc/${vendorId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tc_text: tcText }),
      });
      setTcDirty(false);
      showToast('Terms & Conditions saved');
    } catch { showToast('Could not save. Try again.'); }
    finally { setTcSaving(false); }
  }

  function openNewContract(prefill?: any) {
    setRevisingId(null);
    setFormFields(prefill || {});
    setShowForm(true);
  }

  function openRevise(contract: Contract) {
    setRevisingId(contract.id);
    setFormFields(contract.fields_json || {});
    setShowForm(true);
  }

  async function saveContract() {
    if (!formFields.client_name?.trim() || saving) return;
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/api/v2/vendor/contracts/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          category: vendorCategory,
          business_name: vendorName,
          client_name: formFields.client_name,
          client_phone: formFields.client_phone || null,
          client_email: formFields.client_email || null,
          fields_json: formFields,
          parent_contract_id: revisingId || null,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setContracts(prev => {
          // Replace superseded contract if revision
          if (revisingId) {
            return [d.data, ...prev.map((c: Contract) => c.id === revisingId ? { ...c, status: 'superseded', superseded_by: d.data.id } : c)];
          }
          return [d.data, ...prev];
        });
        setShowForm(false);
        setFormFields({});
        setRevisingId(null);
        showToast(revisingId ? 'Revised contract created' : 'Contract created');
        // Open send sheet immediately
        setSendingContract(d.data);
      } else {
        showToast(d.error || 'Error creating contract');
      }
    } catch { showToast('Network error'); }
    finally { setSaving(false); }
  }

  async function markAcknowledged(id: string) {
    try {
      await fetch(`${BASE}/api/v2/vendor/contracts/${id}/acknowledge`, { method: 'POST' });
      setContracts(prev => prev.map((c: Contract) => c.id === id ? { ...c, status: 'acknowledged', acknowledged_at: new Date().toISOString() } : c));
      showToast('Marked as acknowledged');
    } catch { showToast('Error updating status'); }
  }

  // Styles
  const lbl: React.CSSProperties = { fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 6px', display: 'block' };

  return (
    <>
      <style>{`${FONTS} *{box-sizing:border-box;} body{margin:0;background:#F8F7F5;} ::-webkit-scrollbar{display:none;} textarea{resize:none;}`}</style>
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {/* Contract form sheet */}
      {showForm && (
        <>
          <div onClick={() => setShowForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501, background: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: '20px 20px 0', maxHeight: '90vh', overflowY: 'auto', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8', margin: '0 auto 20px' }} />
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 300, color: '#111', margin: '0 0 4px' }}>{revisingId ? 'Send Revised Contract' : 'New Contract'}</p>
            {revisingId && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: '0 0 20px' }}>Creates v2 · marks original superseded · sends with revision header</p>}
            {!revisingId && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: '0 0 20px' }}>Fill details · vendor reviews every field before sending</p>}

            <ContractForm category={vendorCategory} fields={formFields} onChange={setFormFields} />

            <div style={{ marginBottom: 16 }}>
              <p style={lbl}>Client Contact (for sending)</p>
              <input value={formFields.client_phone || ''} onChange={e => setFormFields((f: any) => ({ ...f, client_phone: e.target.value }))} inputMode="tel" placeholder="WhatsApp number" style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #E2DED8', outline: 'none', fontFamily: "'DM Sans',sans-serif", fontWeight: 300, fontSize: 13, color: '#111', padding: '6px 0', marginBottom: 12 }} />
              <input value={formFields.client_email || ''} onChange={e => setFormFields((f: any) => ({ ...f, client_email: e.target.value }))} type="email" placeholder="Email address (optional)" style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #E2DED8', outline: 'none', fontFamily: "'DM Sans',sans-serif", fontWeight: 300, fontSize: 13, color: '#111', padding: '6px 0' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <button onClick={saveContract} disabled={!formFields.client_name?.trim() || saving} style={{ flex: 1, height: 48, background: formFields.client_name?.trim() ? '#111' : '#E2DED8', color: formFields.client_name?.trim() ? '#F8F7F5' : '#C0BCB6', border: 'none', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: formFields.client_name?.trim() ? 'pointer' : 'not-allowed', touchAction: 'manipulation' }}>{saving ? 'Saving…' : revisingId ? 'Create Revision →' : 'Create & Send →'}</button>
              <button onClick={() => { setShowForm(false); setFormFields({}); setRevisingId(null); }} style={{ height: 48, padding: '0 20px', background: 'none', border: '0.5px solid #E2DED8', borderRadius: 100, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* Send sheet */}
      {sendingContract && (
        <SendSheet
          contract={sendingContract}
          businessName={vendorName}
          onClose={() => setSendingContract(null)}
          onSent={() => {
            setContracts(prev => prev.map((c: Contract) => c.id === sendingContract.id ? { ...c, status: 'sent', sent_at: new Date().toISOString() } : c));
            setSendingContract(null);
            showToast('Contract marked as sent');
          }}
        />
      )}

      {/* Contract detail sheet */}
      {viewingContract && (
        <>
          <div onClick={() => setViewingContract(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501, background: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: '20px', maxHeight: '85vh', overflowY: 'auto', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 300, color: '#111', margin: '0 0 4px' }}>{viewingContract.client_name}</p>
                <StatusBadge status={viewingContract.status} />
              </div>
              <button onClick={() => setViewingContract(null)} style={{ background: 'none', border: 'none', color: '#888580', fontSize: 18, cursor: 'pointer', padding: 4 }}>✕</button>
            </div>

            {/* Fields display */}
            {viewingContract.fields_json && Object.entries(viewingContract.fields_json).filter(([k, v]) => v && k !== 'client_name').map(([k, v]) => (
              <div key={k} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '0.5px solid #F0EDE8' }}>
                <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', margin: '0 0 2px' }}>{k.replace(/_/g, ' ')}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#111', margin: 0 }}>{Array.isArray(v) ? (v as string[]).join(', ') : String(v)}</p>
              </div>
            ))}

            {viewingContract.version > 1 && (
              <div style={{ background: 'rgba(201,168,76,0.06)', border: '0.5px solid rgba(201,168,76,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 300, color: '#8C6D20', margin: 0 }}>Version {viewingContract.version} · Revision of previous contract</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {viewingContract.status === 'draft' && (
                <button onClick={() => { setSendingContract(viewingContract); setViewingContract(null); }} style={{ height: 48, background: '#111', color: '#F8F7F5', border: 'none', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer' }}>Send Contract →</button>
              )}
              {viewingContract.status === 'sent' && (
                <button onClick={() => { markAcknowledged(viewingContract.id); setViewingContract(null); }} style={{ height: 48, background: 'transparent', color: '#4A7C59', border: '0.5px solid #4A7C59', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer' }}>Mark as Acknowledged</button>
              )}
              {viewingContract.status !== 'superseded' && (
                <button onClick={() => { openRevise(viewingContract); setViewingContract(null); }} style={{ height: 48, background: 'transparent', color: '#888580', border: '0.5px solid #E2DED8', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer' }}>Send Revised Contract</button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <div style={{ padding: '24px 20px 100px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
          <div>
            <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 4px' }}>Studio</p>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: 28, color: '#111', margin: 0 }}>Contracts</p>
          </div>
          {tab === 'contracts' && (
            <button onClick={() => openNewContract()} style={{ height: 36, background: '#111', color: '#F8F7F5', border: 'none', borderRadius: 100, padding: '0 16px', fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', touchAction: 'manipulation' }}>+ New</button>
          )}
          {tab === 'tc' && tcDirty && (
            <button onClick={saveTC} disabled={tcSaving} style={{ height: 36, background: GOLD, color: '#0C0A09', border: 'none', borderRadius: 100, padding: '0 16px', fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', touchAction: 'manipulation' }}>{tcSaving ? 'Saving…' : 'Save T&C'}</button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '0.5px solid #E2DED8' }}>
          {(['contracts', 'tc'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, height: 40, background: 'none', border: 'none', borderBottom: tab === t ? `2px solid #111` : 'none', marginBottom: -1, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: tab === t ? 400 : 300, letterSpacing: '0.18em', textTransform: 'uppercase', color: tab === t ? '#111' : '#888580', cursor: 'pointer', touchAction: 'manipulation' }}>
              {t === 'contracts' ? 'Contracts' : 'Terms & Conditions'}
            </button>
          ))}
        </div>

        {/* Contracts tab */}
        {tab === 'contracts' && (
          <>
            {loading ? (
              <div style={{ height: 60, borderRadius: 12, background: 'linear-gradient(90deg,#EEECE8 25%,#F8F7F5 50%,#EEECE8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
            ) : contracts.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: 60 }}>
                <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: '#888580', margin: '0 0 8px' }}>No contracts yet.</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: 0 }}>Create your first contract above.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {contracts.map((c: Contract) => (
                  <div key={c.id} onClick={() => setViewingContract(c)} style={{ background: '#FFFFFF', border: '0.5px solid #E2DED8', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', opacity: c.status === 'superseded' ? 0.5 : 1 }}>
                    <div>
                      <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 300, color: '#111', margin: '0 0 4px' }}>{c.client_name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StatusBadge status={c.status} />
                        {c.version > 1 && <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, color: '#888580', letterSpacing: '0.1em' }}>v{c.version}</span>}
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 300, color: '#888580' }}>{new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                    <span style={{ color: '#C0BCB6', fontSize: 16 }}>›</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* T&C tab */}
        {tab === 'tc' && (
          <>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: '0 0 16px', lineHeight: 1.6 }}>Your standard terms. Pre-filled for your category. Edit to make them yours. Included with every contract you send.</p>
            <textarea
              value={tcText}
              onChange={e => { setTcText(e.target.value); setTcDirty(true); }}
              rows={20}
              style={{ width: '100%', background: '#FFFFFF', border: '0.5px solid #E2DED8', borderRadius: 12, padding: '16px', fontFamily: "'DM Sans',sans-serif", fontWeight: 300, fontSize: 13, color: '#3C3835', lineHeight: 1.7, outline: 'none' }}
            />
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(201,168,76,0.06)', borderRadius: 8, border: '0.5px solid rgba(201,168,76,0.2)' }}>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 300, color: '#888580', margin: 0, lineHeight: 1.6 }}>TDW is a platform intermediary only and is not a party to any agreement between you and your clients.</p>
            </div>
          </>
        )}
      </div>

      {/* Bottom nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#F8F7F5', borderTop: '0.5px solid #E2DED8', display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 100 }}>
        {[{ key: 'today', label: 'Today', href: '/vendor/today' }, { key: 'clients', label: 'Clients', href: '/vendor/clients' }, { key: 'money', label: 'Money', href: '/vendor/money' }, { key: 'studio', label: 'Studio', href: '/vendor/studio' }].map(item => (
          <a key={item.key} href={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 16px', gap: 4, textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, fontWeight: item.key === 'studio' ? 400 : 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: item.key === 'studio' ? '#111' : '#888580' }}>{item.label}</span>
            {item.key === 'studio' && <span style={{ width: 4, height: 4, borderRadius: '50%', background: GOLD, display: 'block' }} />}
          </a>
        ))}
      </nav>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </>
  );
}
