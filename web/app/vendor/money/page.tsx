'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, X, CheckCircle } from 'lucide-react';

const BASE = 'https://dream-wedding-production-89ae.up.railway.app';
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');`;

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatAmt(n: number) {
  if (!n) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN');
}
function today() { return new Date().toISOString().split('T')[0]; }
function currentMonth() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; }

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={{ position:'fixed', top:16, left:'50%', transform:'translateX(-50%)', background:'#111111', color:'#F8F7F5', fontFamily:'DM Sans, sans-serif', fontSize:12, fontWeight:300, padding:'10px 16px', borderRadius:8, zIndex:200, whiteSpace:'nowrap', willChange:'transform,opacity', animation:'toastIn 280ms cubic-bezier(0.22,1,0.36,1) forwards' }}>{msg}</div>;
}

function InvoiceChip({ status }: { status: string }) {
  const s = (status||'').toLowerCase();
  if (s==='paid') return <span style={{ background:'#E8F5E9', color:'#4A7C59', fontFamily:'Jost,sans-serif', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', padding:'3px 8px', borderRadius:20 }}>PAID</span>;
  if (s==='overdue') return <span style={{ background:'#FFEBEE', color:'#9B4545', fontFamily:'Jost,sans-serif', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', padding:'3px 8px', borderRadius:20 }}>OVERDUE</span>;
  return <span style={{ background:'#E2DED8', color:'#888580', fontFamily:'Jost,sans-serif', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', padding:'3px 8px', borderRadius:20 }}>PENDING</span>;
}

function PayChip({ status }: { status: string }) {
  const s = (status||'').toLowerCase();
  if (s==='paid') return <span style={{ background:'#E8F5E9', color:'#4A7C59', fontFamily:'Jost,sans-serif', fontSize:9, padding:'3px 8px', borderRadius:20 }}>PAID</span>;
  return <span style={{ background:'#E2DED8', color:'#888580', fontFamily:'Jost,sans-serif', fontSize:9, padding:'3px 8px', borderRadius:20 }}>PENDING</span>;
}

export default function VendorMoneyPage() {
  return (
    <Suspense>
      <VendorMoneyInner />
    </Suspense>
  );
}

function VendorMoneyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [vendorId, setVendorId] = useState('');
  const [tab, setTab] = useState('INVOICES');
  const TABS = ['INVOICES','EXPENSES','TAX','PAYMENTS','SHIELD'];

  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [tax, setTax] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState('ALL');
  const [expandedInvoice, setExpandedInvoice] = useState<string|null>(null);

  // S38 additions
  const currentFY = (() => { const n=new Date(); const y=n.getMonth()>=3?n.getFullYear():n.getFullYear()-1; return `${y}-${y+1}`; })();
  const [selectedFY, setSelectedFY] = useState(currentFY);
  const [gstData, setGstData] = useState<any>(null);
  const [shieldData, setShieldData] = useState<any[]>([]);
  const [shieldForm, setShieldForm] = useState({ client_name:'', amount:'', wedding_date:'' });
  const [addingShield, setAddingShield] = useState(false);

  // Invoice sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [invForm, setInvForm] = useState({ client_id:'', client_name:'', client_phone:'', description:'', amount:'', due_date:'', gst_enabled:false });
  const [invSubmitting, setInvSubmitting] = useState(false);

  // Expense quick-add
  const [expDesc, setExpDesc] = useState('');
  const [expAmt, setExpAmt] = useState('');
  const [expAdding, setExpAdding] = useState(false);
  const [expType, setExpType] = useState<'client'|'business'>('client');
  const [expCategory, setExpCategory] = useState('');
  const [expRelated, setExpRelated] = useState('');
  const [expSubTab, setExpSubTab] = useState<'client'|'business'>('client');

  const CLIENT_CATEGORIES = ['Travel','Equipment Hire','Assistant / Second Shooter','Printing & Albums','Props & Materials','Food & Hospitality','Other'];
  const BUSINESS_CATEGORIES = ['Procurement','Studio & Rent','Marketing & Ads','Software & Subscriptions','Equipment Purchase','Professional Development','Other'];

  useEffect(() => {
    const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/login'); return; }
    try {
      const s = JSON.parse(raw);
      const vid = s.vendorId || s.id;
      if (!vid) { window.location.replace('/vendor/login'); return; }
      setVendorId(vid);
    } catch { window.location.replace('/vendor/login'); }
  }, []);

  // URL params — pre-fill invoice sheet
  useEffect(() => {
    const action = searchParams?.get('action');
    const clientId = searchParams?.get('clientId') || '';
    const clientName = searchParams?.get('clientName') || '';
    const phone = searchParams?.get('phone') || '';
    if (action === 'create') {
      setInvForm(f => ({ ...f, client_id: clientId, client_name: clientName, client_phone: phone }));
      setSheetOpen(true);
    }
  }, [searchParams]);

  const fetchAll = useCallback(async (vid: string) => {
    setLoading(true);
    try {
      const [ir, er, tr, pr, cr, gr, sr] = await Promise.all([
        fetch(`${BASE}/api/invoices/${vid}`),
        fetch(`${BASE}/api/expenses/${vid}`),
        fetch(`${BASE}/api/tds/${vid}/summary`),
        fetch(`${BASE}/api/payment-schedules/${vid}`),
        fetch(`${BASE}/api/v2/vendor/clients/${vid}`),
        fetch(`${BASE}/api/v2/vendor/gst-summary/${vid}?fy=${selectedFY}`),
        fetch(`${BASE}/api/v2/vendor/payment-shield/${vid}`),
      ]);
      const id = await ir.json(); if (id.success||Array.isArray(id.data)||Array.isArray(id)) setInvoices(id.data||id||[]);
      const ed = await er.json(); if (ed.success||Array.isArray(ed.data)||Array.isArray(ed)) setExpenses(ed.data||ed||[]);
      const td = await tr.json(); setTax(td.data||td||null);
      const pd = await pr.json(); if (pd.success||Array.isArray(pd.data)||Array.isArray(pd)) setPayments(pd.data||pd||[]);
      const cd = await cr.json(); if (cd.success) setClients(cd.data||[]);
      const gd = await gr.json(); if (gd.success) setGstData(gd.data||null);
      const sd = await sr.json(); if (sd.success) setShieldData(sd.data||[]);
    } catch {}
    setLoading(false);
  }, [selectedFY]);

  useEffect(() => { if (vendorId) fetchAll(vendorId); }, [vendorId, fetchAll]);

  // Hero strip calcs
  const cm = currentMonth();
  const thisMonth = invoices.filter(i => (i.issue_date||'').startsWith(cm)).reduce((s,i) => s+(i.total_amount||i.amount||0),0);
  const pending = invoices.filter(i => i.status==='pending').reduce((s,i) => s+(i.total_amount||i.amount||0),0);
  const overdue = invoices.filter(i => i.status==='overdue').reduce((s,i) => s+(i.total_amount||i.amount||0),0);

  const filteredInvoices = invoiceFilter==='ALL' ? invoices : invoices.filter(i => i.status?.toLowerCase()===invoiceFilter.toLowerCase());

  const handleMarkPaid = async (invId: string) => {
    try {
      const r = await fetch(`${BASE}/api/invoices/${invId}/mark-paid`, { method:'PATCH' });
      const d = await r.json();
      if (d.success||r.ok) { setToast('Marked as paid.'); fetchAll(vendorId); }
      else setToast(d.error||'Failed.');
    } catch { setToast('Network error.'); }
  };

  const handleCreateInvoice = async () => {
    if (!invForm.client_name && !invForm.client_id) { setToast('Select a client.'); return; }
    if (!invForm.amount) { setToast('Enter an amount.'); return; }
    setInvSubmitting(true);
    try {
      const gstAmt = invForm.gst_enabled ? Number(invForm.amount)*1.18 : Number(invForm.amount);
      const r = await fetch(`${BASE}/api/invoices`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          vendor_id: vendorId,
          client_id: invForm.client_id||null,
          client_name: invForm.client_name,
          client_phone: invForm.client_phone,
          amount: Number(invForm.amount),
          total_amount: gstAmt,
          description: invForm.description,
          due_date: invForm.due_date||null,
          gst_enabled: invForm.gst_enabled,
          status:'pending',
          issue_date: today(),
        }),
      });
      const d = await r.json();
      if (d.success||r.ok) {
        setSheetOpen(false);
        setInvForm({ client_id:'', client_name:'', client_phone:'', description:'', amount:'', due_date:'', gst_enabled:false });
        setToast('Invoice created.');
        fetchAll(vendorId);
      } else setToast(d.error||d.message||'Failed.');
    } catch { setToast('Network error.'); }
    setInvSubmitting(false);
  };

  const handleAddExpense = async () => {
    if (!expDesc.trim()||!expAmt) { setToast('Enter description and amount.'); return; }
    setExpAdding(true);
    try {
      const r = await fetch(`${BASE}/api/expenses`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          vendor_id: vendorId,
          description: expDesc,
          amount: Number(expAmt),
          expense_date: today(),
          category: expCategory || 'Other',
          expense_type: expType,
          related_name: expRelated || null,
        }),
      });
      const d = await r.json();
      if (d.success||r.ok) {
        setExpDesc(''); setExpAmt(''); setExpCategory(''); setExpRelated('');
        setToast('Expense added.');
        fetchAll(vendorId);
      } else setToast(d.error||'Failed.');
    } catch { setToast('Network error.'); }
    setExpAdding(false);
  };

  // Payments grouping
  const now = new Date();
  const in7 = new Date(now); in7.setDate(now.getDate()+7);
  const in30 = new Date(now); in30.setDate(now.getDate()+30);
  const weekPay = payments.filter(p => { const d = new Date(p.due_date); return d >= now && d <= in7; });
  const monthPay = payments.filter(p => { const d = new Date(p.due_date); return d > in7 && d <= in30; });
  const laterPay = payments.filter(p => new Date(p.due_date) > in30);

  const session = (() => { try { return JSON.parse(localStorage.getItem('vendor_web_session')||'{}'); } catch { return {}; } })();
  const tier = session.tier || 'essential';

  // Expense summary
  const cm = currentMonth();
  const expThisMonth = expenses
    .filter(e => (e.expense_date||'').slice(0,7) === cm)
    .reduce((s, e) => s + (Number(e.amount)||0), 0);

  return (
    <>
      <style>{`
        ${FONTS}
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes toastIn { from{opacity:0;transform:translate(-50%,-40px)} to{opacity:1;transform:translate(-50%,0)} }
        @keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>

      <div style={{ minHeight:'100vh', background:'#F8F7F5', fontFamily:'DM Sans, sans-serif', paddingBottom:'calc(64px + env(safe-area-inset-bottom) + 80px)' }}>

        {/* Hero strip */}
        <div style={{ background:'#111111', padding:'20px 20px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
            {[
              { label:'THIS MONTH', val:thisMonth, color:'#F8F7F5' },
              { label:'PENDING', val:pending, color:'#F8F7F5' },
              { label:'OVERDUE', val:overdue, color:'#C9A84C' },
              { label:'EXPENSES', val:expThisMonth, color:'#888580' },
            ].map(h => (
              <div key={h.label} style={{ textAlign:'center', flex:1 }}>
                <div style={{ fontFamily:'Jost,sans-serif', fontWeight:200, fontSize:8, color:'rgba(248,247,245,0.45)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:5 }}>{h.label}</div>
                <div style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:300, fontSize:20, color:h.color }}>{formatAmt(h.val)}</div>
              </div>
            ))}
          </div>
          {/* Profit estimate */}
          {(thisMonth > 0 || expThisMonth > 0) && (
            <div style={{ borderTop:'0.5px solid rgba(248,247,245,0.1)', paddingTop:10, display:'flex', justifyContent:'center', alignItems:'center', gap:8 }}>
              <span style={{ fontFamily:'Jost,sans-serif', fontWeight:200, fontSize:8, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(248,247,245,0.4)' }}>EST. PROFIT</span>
              <span style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:300, fontSize:16, color: (thisMonth - expThisMonth) >= 0 ? '#C9A84C' : '#9B4545' }}>
                {formatAmt(thisMonth - expThisMonth)}
              </span>
            </div>
          )}
        </div>

        {/* Sub-nav */}
        <div style={{ display:'flex', gap:6, padding:'14px 16px 0', overflowX:'auto', scrollbarWidth:'none' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flexShrink:0, fontFamily:'Jost,sans-serif', fontWeight:200, fontSize:10, letterSpacing:'0.15em',
                padding:'7px 14px', borderRadius:20, border:'none', cursor:'pointer', touchAction:'manipulation',
                background: tab===t ? '#111111' : '#E2DED8',
                color: tab===t ? '#F8F7F5' : '#888580',
                transition:'background 280ms cubic-bezier(0.22,1,0.36,1)',
              }}
            >{t}</button>
          ))}
        </div>

        <div style={{ padding:'16px 20px 0' }}>

          {/* INVOICES TAB */}
          {tab==='INVOICES' && (
            <div>
              {/* Filter chips */}
              <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', scrollbarWidth:'none' }}>
                {['ALL','PAID','PENDING','OVERDUE'].map(f => (
                  <button key={f} onClick={() => setInvoiceFilter(f)} style={{
                    flexShrink:0, fontFamily:'Jost,sans-serif', fontWeight:200, fontSize:9, letterSpacing:'0.12em',
                    padding:'6px 14px', borderRadius:20, border: invoiceFilter===f ? '1px solid #111111' : '1px solid #E2DED8',
                    background: invoiceFilter===f ? '#111111' : 'transparent',
                    color: invoiceFilter===f ? '#F8F7F5' : '#888580', cursor:'pointer', touchAction:'manipulation',
                  }}>{f}</button>
                ))}
              </div>

              {loading ? (
                [0,1,2].map(i => <div key={i} style={{ height:72, borderRadius:12, background:'#F8F7F5', backgroundImage:'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite', marginBottom:10 }} />)
              ) : filteredInvoices.length===0 ? (
                <div style={{ paddingTop:40, textAlign:'center', fontFamily:'Cormorant Garamond,serif', fontStyle:'italic', fontSize:18, color:'#888580' }}>No invoices yet.</div>
              ) : filteredInvoices.map(inv => (
                <div key={inv.id} style={{ marginBottom:10 }}>
                  <div
                    onClick={() => setExpandedInvoice(expandedInvoice===inv.id ? null : inv.id)}
                    style={{ background:'#FFFFFF', border:'1px solid #E2DED8', borderRadius:12, padding:16, cursor:'pointer', touchAction:'manipulation' }}
                  >
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18, color:'#111111', fontWeight:300 }}>{inv.client_name}</div>
                        {inv.description && <div style={{ fontFamily:'DM Sans,sans-serif', fontSize:13, color:'#888580', fontWeight:300, marginTop:2 }}>{inv.description}</div>}
                        <div style={{ fontFamily:'Jost,sans-serif', fontSize:12, color:'#888580', marginTop:4 }}>{inv.issue_date ? formatDate(inv.issue_date) : ''}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                        <div style={{ fontFamily:'Jost,sans-serif', fontSize:16, color:'#111111', fontWeight:300 }}>{formatAmt(inv.total_amount||inv.amount)}</div>
                        <div style={{ marginTop:6 }}><InvoiceChip status={inv.status} /></div>
                      </div>
                    </div>
                  </div>
                  {expandedInvoice===inv.id && (
                    <div style={{ background:'#FFFFFF', border:'1px solid #E2DED8', borderTop:'none', borderRadius:'0 0 12px 12px', padding:'0 16px 14px', display:'flex', gap:10 }}>
                      {(inv.status==='pending'||inv.status==='overdue') && (
                        <button onClick={() => handleMarkPaid(inv.id)} style={{ flex:1, background:'#111111', color:'#F8F7F5', border:'none', borderRadius:8, fontFamily:'Jost,sans-serif', fontWeight:200, fontSize:9, letterSpacing:'0.15em', padding:'10px 0', cursor:'pointer', touchAction:'manipulation' }}>
                          MARK PAID
                        </button>
                      )}
                      {inv.client_phone && (
                        <button onClick={() => window.open(`https://wa.me/91${(inv.client_phone||'').replace(/\D/g,'')}?text=${encodeURIComponent('Hi, this is a reminder for your invoice of '+formatAmt(inv.total_amount||inv.amount)+'. Due date: '+(inv.due_date?formatDate(inv.due_date):'')+'.')}`, '_blank')} style={{ flex:1, background:'#F8F7F5', color:'#111111', border:'1px solid #E2DED8', borderRadius:8, fontFamily:'Jost,sans-serif', fontWeight:200, fontSize:9, letterSpacing:'0.15em', padding:'10px 0', cursor:'pointer', touchAction:'manipulation' }}>
                          SEND REMINDER
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* EXPENSES TAB */}
          {tab==='EXPENSES' && (
            <div>
              {/* Add form */}
              <div style={{ background:'#FFFFFF', border:'1px solid #E2DED8', borderRadius:12, padding:14, marginBottom:16 }}>
                {/* Type toggle */}
                <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                  {(['client','business'] as const).map(t => (
                    <button key={t} onClick={() => { setExpType(t); setExpCategory(''); }}
                      style={{ flex:1, padding:'7px 0', borderRadius:20, border: expType===t ? 'none' : '1px solid #E2DED8',
                        background: expType===t ? '#111111' : 'transparent',
                        color: expType===t ? '#F8F7F5' : '#888580',
                        fontFamily:'Jost,sans-serif', fontWeight:200, fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', cursor:'pointer', touchAction:'manipulation' }}>
                      {t==='client' ? 'Client Job' : 'Business'}
                    </button>
                  ))}
                </div>
                {/* Category */}
                <select value={expCategory} onChange={e => setExpCategory(e.target.value)}
                  style={{ width:'100%', fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:300, color: expCategory ? '#111111' : '#888580',
                    border:'none', borderBottom:'1px solid #E2DED8', background:'transparent', outline:'none', paddingBottom:8, marginBottom:10, cursor:'pointer' }}>
                  <option value=''>Category (optional)</option>
                  {(expType==='client' ? CLIENT_CATEGORIES : BUSINESS_CATEGORIES).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {/* Description + amount row */}
                <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                  <input value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder='Description'
                    style={{ flex:1, fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:300, color:'#111111', border:'none', borderBottom:'1px solid #E2DED8', outline:'none', background:'transparent', paddingBottom:6 }} />
                  <input type='number' value={expAmt} onChange={e => setExpAmt(e.target.value)} placeholder='₹ Amount'
                    style={{ width:100, fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:300, color:'#111111', border:'none', borderBottom:'1px solid #E2DED8', outline:'none', background:'transparent', paddingBottom:6 }} />
                </div>
                {/* Related name */}
                <input value={expRelated} onChange={e => setExpRelated(e.target.value)}
                  placeholder={expType==='client' ? 'Client name (optional)' : 'Vendor / supplier name (optional)'}
                  style={{ width:'100%', fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:300, color:'#111111', border:'none', borderBottom:'1px solid #E2DED8', outline:'none', background:'transparent', paddingBottom:6, marginBottom:12 }} />
                <button onClick={handleAddExpense} disabled={expAdding}
                  style={{ width:'100%', background:'#111111', color:'#F8F7F5', border:'none', borderRadius:8,
                    fontFamily:'Jost,sans-serif', fontWeight:200, fontSize:9, letterSpacing:'0.15em', padding:'10px 0',
                    cursor:'pointer', touchAction:'manipulation', opacity:expAdding?0.6:1 }}>
                  ADD {expType==='client' ? 'CLIENT' : 'BUSINESS'} EXPENSE
                </button>
              </div>

              {/* Sub-tabs */}
              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                {(['client','business'] as const).map(t => {
                  const count = expenses.filter(e => (e.expense_type||'client')===t).length;
                  return (
                    <button key={t} onClick={() => setExpSubTab(t)}
                      style={{ flex:1, padding:'8px 0', borderRadius:20,
                        border: expSubTab===t ? 'none' : '1px solid #E2DED8',
                        background: expSubTab===t ? '#111111' : 'transparent',
                        color: expSubTab===t ? '#F8F7F5' : '#888580',
                        fontFamily:'Jost,sans-serif', fontWeight:200, fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', cursor:'pointer', touchAction:'manipulation' }}>
                      {t==='client' ? 'Client Jobs' : 'Business'} {count > 0 ? `(${count})` : ''}
                    </button>
                  );
                })}
              </div>

              {/* Expense list */}
              {loading ? (
                [0,1,2].map(i => <div key={i} style={{ height:56, borderRadius:10, background:'#F8F7F5', backgroundImage:'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite', marginBottom:8 }} />)
              ) : expenses.filter(e => (e.expense_type||'client')===expSubTab).length===0 ? (
                <div style={{ paddingTop:40, textAlign:'center', fontFamily:'Cormorant Garamond,serif', fontStyle:'italic', fontSize:18, color:'#888580' }}>
                  No {expSubTab} expenses yet.
                </div>
              ) : expenses.filter(e => (e.expense_type||'client')===expSubTab).map((exp, i, arr) => (
                <div key={exp.id} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'12px 0', borderBottom: i<arr.length-1 ? '0.5px solid #E2DED8' : 'none' }}>
                  <div style={{ flex:1, minWidth:0, marginRight:12 }}>
                    <div style={{ fontFamily:'DM Sans,sans-serif', fontSize:14, color:'#111111', fontWeight:300 }}>{exp.description}</div>
                    <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:3, flexWrap:'wrap' }}>
                      {exp.category && (
                        <span style={{ fontFamily:'Jost,sans-serif', fontSize:8, color:'#888580', textTransform:'uppercase', letterSpacing:'0.12em', background:'#F4F1EC', padding:'2px 8px', borderRadius:10 }}>{exp.category}</span>
                      )}
                      {exp.related_name && (
                        <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:11, color:'#888580' }}>{exp.related_name}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:16, color:'#111111', fontWeight:300 }}>{formatAmt(exp.amount)}</div>
                    {exp.expense_date && <div style={{ fontFamily:'DM Sans,sans-serif', fontSize:11, color:'#888580', marginTop:2 }}>{formatDate(exp.expense_date)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAX TAB */}
          {tab==='TAX' && (
            <div>
              {/* FY selector */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.22em', textTransform:'uppercase', color:'#888580', margin:0 }}>Financial Year</p>
                <select value={selectedFY} onChange={e=>{ setSelectedFY(e.target.value); if(vendorId) fetch(`${BASE}/api/v2/vendor/gst-summary/${vendorId}?fy=${e.target.value}`).then(r=>r.json()).then(d=>{ if(d.success) setGstData(d.data); }); }} style={{ fontFamily:"'Jost',sans-serif", fontSize:11, fontWeight:300, color:'#111', background:'transparent', border:'0.5px solid #E2DED8', borderRadius:6, padding:'4px 8px', cursor:'pointer' }}>
                  {[0,1,2].map(i=>{ const y=parseInt(currentFY.split('-')[0])-i; const fy=`${y}-${y+1}`; return <option key={fy} value={fy}>{`FY ${fy}`}</option>; })}
                </select>
              </div>

              {!gstData || gstData.total_invoiced===0 ? (
                <div style={{ paddingTop:40, textAlign:'center', fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', fontSize:18, color:'#888580' }}>
                  No invoices found for {`FY ${selectedFY}`}.
                </div>
              ) : (
                <>
                  {/* Summary hero */}
                  <div style={{ background:'#FFFFFF', border:'1px solid #E2DED8', borderRadius:14, padding:20, marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-around', marginBottom:16 }}>
                      {[{label:'Total Invoiced',val:gstData.total_invoiced},{label:'GST Collected',val:gstData.total_gst},{label:'TDS Deducted',val:gstData.total_tds}].map(s=>(
                        <div key={s.label} style={{ textAlign:'center' }}>
                          <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:300, color:'#111', margin:'0 0 3px' }}>{formatAmt(s.val)}</p>
                          <p style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:200, letterSpacing:'0.15em', textTransform:'uppercase', color:'#888580', margin:0 }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <button onClick={()=>window.open(`${BASE}/api/v2/vendor/gst-export/${vendorId}?fy=${selectedFY}`)} style={{ width:'100%', background:'transparent', color:'#111', border:'1px solid #E2DED8', borderRadius:8, fontFamily:"'Jost',sans-serif", fontWeight:200, fontSize:9, letterSpacing:'0.22em', textTransform:'uppercase', padding:'12px 0', cursor:'pointer', touchAction:'manipulation' }}>
                      Export for CA (.csv)
                    </button>
                  </div>

                  {/* Quarterly breakdown */}
                  <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.22em', textTransform:'uppercase', color:'#888580', margin:'0 0 10px' }}>Quarterly Breakdown</p>
                  <div style={{ background:'#FFFFFF', border:'1px solid #E2DED8', borderRadius:14, marginBottom:16, overflow:'hidden' }}>
                    {(gstData.quarterly||[]).map((q: any, i: number) => (
                      <div key={q.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:i<3?'0.5px solid #E2DED8':'none' }}>
                        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#111', margin:0 }}>{q.label}</p>
                        <div style={{ textAlign:'right' }}>
                          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:400, color:'#111', margin:'0 0 2px' }}>{formatAmt(q.invoiced)}</p>
                          {q.gst>0&&<p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, color:'#888580', margin:0 }}>GST {formatAmt(q.gst)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* TDS per-client ledger */}
                  {(gstData.tds_ledger||[]).length>0&&(
                    <>
                      <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.22em', textTransform:'uppercase', color:'#888580', margin:'0 0 10px' }}>TDS Ledger</p>
                      <div style={{ background:'#FFFFFF', border:'1px solid #E2DED8', borderRadius:14, overflow:'hidden' }}>
                        {(gstData.tds_ledger||[]).map((row: any, i: number) => (
                          <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:i<gstData.tds_ledger.length-1?'0.5px solid #E2DED8':'none' }}>
                            <div>
                              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#111', margin:'0 0 2px' }}>{row.client_name}</p>
                              <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, color:'#888580', margin:0 }}>TDS @ {row.tds_rate||10}% · {row.tds_deducted_by_client?'Deducted by client':'Self'}</p>
                            </div>
                            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:400, color:'#C9A84C', margin:0 }}>{formatAmt(row.tds_amount)}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* PAYMENTS TAB */}
          {tab==='PAYMENTS' && (
            <div>
              {loading ? (
                [0,1,2].map(i => <div key={i} style={{ height:50, borderRadius:8, background:'#F8F7F5', backgroundImage:'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite', marginBottom:8 }} />)
              ) : payments.length===0 ? (
                <div style={{ paddingTop:40, textAlign:'center', fontFamily:'Cormorant Garamond,serif', fontStyle:'italic', fontSize:18, color:'#888580' }}>No payments scheduled.</div>
              ) : (
                <>
                  {[{ label:'THIS WEEK', data:weekPay },{ label:'NEXT 30 DAYS', data:monthPay },{ label:'LATER', data:laterPay }].filter(g => g.data.length>0).map(g => (
                    <div key={g.label} style={{ marginBottom:20 }}>
                      <div style={{ fontFamily:'Jost,sans-serif', fontWeight:200, fontSize:9, color:'#888580', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:10 }}>{g.label}</div>
                      {g.data.map((p, i) => (
                        <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom: i<g.data.length-1 ? '1px solid #E2DED8' : 'none' }}>
                          <div>
                            <div style={{ fontFamily:'DM Sans,sans-serif', fontSize:14, color:'#111111', fontWeight:400 }}>{p.client_name}</div>
                            {p.milestone && <div style={{ fontFamily:'DM Sans,sans-serif', fontSize:12, color:'#888580', fontWeight:300, marginTop:2 }}>{p.milestone}</div>}
                            {p.due_date && <div style={{ fontFamily:'DM Sans,sans-serif', fontSize:11, color:'#888580', marginTop:2 }}>{formatDate(p.due_date)}</div>}
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:16, color:'#111111', fontWeight:300 }}>{formatAmt(p.amount)}</div>
                            <div style={{ marginTop:4 }}><PayChip status={p.status} /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* SHIELD TAB */}
          {tab==='SHIELD' && (
            <div>
              <div style={{ background:'#111111', borderRadius:12, padding:24, marginBottom:16 }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, color:'#F8F7F5', fontWeight:300, marginBottom:8 }}>Payment Shield</div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:'rgba(248,247,245,0.6)', fontWeight:300 }}>Final payment held securely until 24 hours after the wedding.</div>
              </div>

              {/* Add to shield form */}
              <div style={{ background:'#FFFFFF', border:'1px solid #E2DED8', borderRadius:14, padding:16, marginBottom:16 }}>
                <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.2em', textTransform:'uppercase', color:'#888580', margin:'0 0 12px' }}>Add Client to Shield</p>
                <input value={shieldForm.client_name} onChange={e=>setShieldForm(f=>({...f,client_name:e.target.value}))} placeholder="Client name" style={{ width:'100%', border:'none', borderBottom:'1px solid #E2DED8', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#111', padding:'6px 0', marginBottom:10, outline:'none', background:'transparent' }}/>
                <input value={shieldForm.amount} onChange={e=>setShieldForm(f=>({...f,amount:e.target.value}))} placeholder="Shield amount (₹)" inputMode="numeric" style={{ width:'100%', border:'none', borderBottom:'1px solid #E2DED8', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#111', padding:'6px 0', marginBottom:10, outline:'none', background:'transparent' }}/>
                <input type="date" value={shieldForm.wedding_date} onChange={e=>setShieldForm(f=>({...f,wedding_date:e.target.value}))} style={{ width:'100%', border:'none', borderBottom:'1px solid #E2DED8', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#111', padding:'6px 0', marginBottom:14, outline:'none', background:'transparent' }}/>
                <button disabled={!shieldForm.client_name||!shieldForm.amount||addingShield} onClick={async()=>{ setAddingShield(true); try { const r=await fetch(`${BASE}/api/v2/vendor/payment-shield`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vendor_id:vendorId,client_name:shieldForm.client_name,amount:Number(shieldForm.amount),wedding_date:shieldForm.wedding_date||null})}); const d=await r.json(); if(d.success){setShieldData(p=>[d.data,...p]);setShieldForm({client_name:'',amount:'',wedding_date:''});setToast('Added to Shield');} else setToast(d.error||'Error'); } catch{setToast('Network error');} finally{setAddingShield(false);} }} style={{ width:'100%', height:44, background:'#111', color:'#F8F7F5', border:'none', borderRadius:100, fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', opacity:(!shieldForm.client_name||!shieldForm.amount||addingShield)?0.5:1 }}>
                  {addingShield?'Adding...':'Add to Shield'}
                </button>
              </div>

              {/* Shield list */}
              {shieldData.length===0 ? (
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:300, color:'#888580', textAlign:'center', marginTop:24, fontStyle:'italic' }}>No clients in Payment Shield yet.</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {shieldData.map((s: any)=>(
                    <div key={s.id} style={{ background:'#FFFFFF', border:'1px solid #E2DED8', borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div>
                        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:300, color:'#111', margin:'0 0 3px' }}>{s.client_name}</p>
                        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#888580', margin:0 }}>{s.wedding_date?`Wedding ${formatDate(s.wedding_date)}`:''}{s.release_date?` · Release ${formatDate(s.release_date)}`:''}</p>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:400, color:'#111', margin:'0 0 4px' }}>{formatAmt(s.amount)}</p>
                        <span style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, letterSpacing:'0.1em', textTransform:'uppercase', padding:'2px 8px', borderRadius:100, background:s.status==='released'?'#E8F5E9':s.status==='disputed'?'#FFEBEE':'#F4F1EC', color:s.status==='released'?'#4A7C59':s.status==='disputed'?'#9B4545':'#8C8480' }}>{s.status||'holding'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {tier==='essential' && (
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:'#888580', textAlign:'center', marginTop:16, fontWeight:300 }}>Available on Signature and Prestige plans.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FAB — invoices tab only */}
      {tab==='INVOICES' && (
        <button
          onClick={() => setSheetOpen(true)}
          style={{
            position:'fixed', bottom:'calc(64px + env(safe-area-inset-bottom) + 16px)', right:24,
            width:52, height:52, borderRadius:'50%', background:'#111111',
            border:'none', display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', touchAction:'manipulation', zIndex:90,
            willChange:'transform', transform:'translateZ(0)',
          }}
        >
          <Plus size={20} color="#F8F7F5" />
        </button>
      )}

      {/* Create Invoice Sheet */}
      {sheetOpen && (
        <div
          style={{ position:'fixed', inset:0, zIndex:150, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}
          onClick={e => { if (e.target===e.currentTarget) setSheetOpen(false); }}
        >
          <div style={{ position:'absolute', inset:0, background:'rgba(17,17,17,0.4)' }} />
          <div style={{
            position:'relative', background:'#FFFFFF', borderRadius:'24px 24px 0 0',
            padding:'24px 20px calc(env(safe-area-inset-bottom) + 24px)',
            willChange:'transform', transform:'translateZ(0)',
            animation:'sheetUp 320ms cubic-bezier(0.22,1,0.36,1) forwards',
            maxHeight:'88vh', overflowY:'auto',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22, fontWeight:300, color:'#111111' }}>Create Invoice</div>
              <button onClick={() => setSheetOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', padding:4, touchAction:'manipulation' }}>
                <X size={20} color="#888580" />
              </button>
            </div>

            {/* Client selector */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontFamily:'Jost,sans-serif', fontWeight:200, fontSize:9, color:'#888580', letterSpacing:'0.22em', textTransform:'uppercase', display:'block', marginBottom:8 }}>CLIENT</label>
              {invForm.client_name ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#F8F7F5', borderRadius:8, padding:'10px 12px' }}>
                  <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:13, color:'#111111' }}>{invForm.client_name}</span>
                  <button onClick={() => setInvForm(f => ({...f, client_id:'', client_name:'', client_phone:''}))} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={14} color="#888580" /></button>
                </div>
              ) : (
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {clients.slice(0,10).map(c => (
                    <button key={c.id} onClick={() => setInvForm(f => ({...f, client_id:c.id, client_name:c.name, client_phone:c.phone||''}))} style={{ fontFamily:'DM Sans,sans-serif', fontSize:12, color:'#111111', background:'#F8F7F5', border:'1px solid #E2DED8', borderRadius:20, padding:'6px 12px', cursor:'pointer', touchAction:'manipulation' }}>{c.name}</button>
                  ))}
                  {clients.length===0 && <input value={invForm.client_name} onChange={e => setInvForm(f => ({...f, client_name:e.target.value}))} placeholder="Client name" style={{ fontFamily:'DM Sans,sans-serif', fontSize:13, color:'#111111', background:'transparent', outline:'none', padding:'10px 0', width:'100%', borderBottom:'1px solid #E2DED8' }} />}
                </div>
              )}
            </div>

            {[
              { label:'DESCRIPTION', key:'description', type:'text' },
              { label:'AMOUNT (₹)', key:'amount', type:'number' },
              { label:'DUE DATE', key:'due_date', type:'date' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:20 }}>
                <label style={{ fontFamily:'Jost,sans-serif', fontWeight:200, fontSize:9, color:'#888580', letterSpacing:'0.22em', textTransform:'uppercase', display:'block', marginBottom:6 }}>{f.label}</label>
                <input
                  type={f.type}
                  value={(invForm as any)[f.key]}
                  onChange={e => setInvForm(p => ({...p, [f.key]:e.target.value}))}
                  style={{ fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:300, color:'#111111', background:'transparent', outline:'none', padding:'10px 0', width:'100%', borderBottom:'1px solid #E2DED8', borderRadius:0 }}
                />
              </div>
            ))}

            {/* GST toggle */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, padding:'12px 0', borderBottom:'1px solid #E2DED8' }}>
              <div>
                <div style={{ fontFamily:'DM Sans,sans-serif', fontSize:13, color:'#111111', fontWeight:400 }}>GST (18%)</div>
                {invForm.gst_enabled && invForm.amount && (
                  <div style={{ fontFamily:'DM Sans,sans-serif', fontSize:11, color:'#888580', marginTop:2 }}>Total: {formatAmt(Number(invForm.amount)*1.18)}</div>
                )}
              </div>
              <button
                onClick={() => setInvForm(f => ({...f, gst_enabled:!f.gst_enabled}))}
                style={{
                  width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', touchAction:'manipulation',
                  background: invForm.gst_enabled ? '#111111' : '#E2DED8',
                  position:'relative', transition:'background 280ms',
                }}
              >
                <div style={{ width:18, height:18, borderRadius:'50%', background:'#FFFFFF', position:'absolute', top:3, left: invForm.gst_enabled ? 23 : 3, transition:'left 280ms cubic-bezier(0.22,1,0.36,1)' }} />
              </button>
            </div>

            <button
              onClick={handleCreateInvoice}
              disabled={invSubmitting}
              style={{ width:'100%', background:'#111111', color:'#F8F7F5', border:'none', fontFamily:'Jost,sans-serif', fontWeight:200, fontSize:12, letterSpacing:'0.22em', textTransform:'uppercase', padding:16, borderRadius:10, cursor:'pointer', touchAction:'manipulation', opacity:invSubmitting?0.6:1 }}
            >
              {invSubmitting ? 'CREATING…' : 'CREATE INVOICE'}
            </button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </>
  );
}
