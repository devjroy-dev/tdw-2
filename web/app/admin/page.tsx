'use client';
import { useState, useEffect, useCallback } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const ADMIN_PASSWORD = 'Dreamwedding@2551354';

const CODE_TYPES = [
  { value: 'vendor_permanent', label: 'Vendor Permanent', desc: 'Never expires', color: '#C9A84C' },
  { value: 'vendor_demo', label: 'Vendor Demo — 1hr', desc: 'For live demos', color: '#4CAF50' },
  { value: 'couple_demo', label: 'Couple Demo — 24hr', desc: 'For couple demos', color: '#2196F3' },
];

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [codes, setCodes] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState('vendor_permanent');
  const [note, setNote] = useState('');
  const [newCode, setNewCode] = useState<any>(null);
  const [copied, setCopied] = useState('');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<any>({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [codesRes, vendorsRes, bookingsRes] = await Promise.all([
        fetch(`${API}/api/access-codes`).then(r => r.json()),
        fetch(`${API}/api/vendors`).then(r => r.json()),
        fetch(`${API}/api/bookings/vendor/all`).then(r => r.json()).catch(() => ({ success: false })),
      ]);
      if (codesRes.success) setCodes(codesRes.data);
      if (vendorsRes.success) {
        setVendors(vendorsRes.data);
        setStats((prev: any) => ({ ...prev, vendors: vendorsRes.data.length }));
      }
      if (bookingsRes.success) setBookings(bookingsRes.data || []);
    } catch (e) {}
    setLoading(false);
  }, []);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) { setAuthed(true); loadAll(); }
    else alert('Incorrect password');
  };

  const generateCode = async () => {
    setGenerating(true);
    setNewCode(null);
    try {
      const res = await fetch(`${API}/api/access-codes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, note: note.trim() || 'Admin panel' }),
      });
      const data = await res.json();
      if (data.success) { setNewCode(data.data); setNote(''); loadAll(); }
    } catch (e) {} finally { setGenerating(false); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  };

  const blockVendor = async (id: string, block: boolean) => {
    if (!confirm(`${block ? 'Block' : 'Unblock'} this vendor?`)) return;
    await fetch(`${API}/api/vendors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription_active: !block }),
    });
    loadAll();
  };

  const deleteVendor = async (id: string, name: string) => {
    if (!confirm(`Permanently delete ${name}? This cannot be undone.`)) return;
    await fetch(`${API}/api/vendors/${id}`, { method: 'DELETE' });
    loadAll();
  };

  const updateVendorPlan = async (id: string, plan: string) => {
    await fetch(`${API}/api/vendors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    loadAll();
  };

  const filteredVendors = vendors.filter(v =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.city?.toLowerCase().includes(search.toLowerCase()) ||
    v.category?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = bookings.reduce((s: number, b: any) => s + (b.token_amount || 0), 0);
  const confirmedBookings = bookings.filter((b: any) => b.status === 'confirmed').length;

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: 360, boxShadow: '0 4px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: '#8C7B6E', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 }}>The Dream Wedding</div>
            <div style={{ fontSize: 28, color: '#2C2420', fontWeight: 300 }}>Admin Panel</div>
          </div>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '14px 16px', borderRadius: 10, border: '1px solid #E8E0D5', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }}
          />
          <button onClick={handleLogin} style={{ width: '100%', padding: 14, background: '#2C2420', color: '#F5F0E8', border: 'none', borderRadius: 10, fontSize: 13, letterSpacing: 1.5, cursor: 'pointer' }}>
            ENTER
          </button>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'codes', label: 'Access Codes' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'bookings', label: 'Bookings' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', fontFamily: 'system-ui' }}>

      {/* Header */}
      <div style={{ background: '#2C2420', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: '#C9A84C', letterSpacing: 4, textTransform: 'uppercase' }}>The Dream Wedding</div>
          <div style={{ fontSize: 20, color: '#F5F0E8', fontWeight: 300 }}>Admin Panel</div>
        </div>
        <button onClick={() => { setAuthed(false); setPassword(''); }} style={{ background: 'transparent', border: '1px solid #8C7B6E', color: '#8C7B6E', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E8E0D5', padding: '0 32px', display: 'flex', gap: 4 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '14px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14,
            color: activeTab === tab.id ? '#2C2420' : '#8C7B6E',
            borderBottom: activeTab === tab.id ? '2px solid #C9A84C' : '2px solid transparent',
            fontWeight: activeTab === tab.id ? 500 : 400,
          }}>
            {tab.label}
          </button>
        ))}
        <button onClick={loadAll} style={{ marginLeft: 'auto', padding: '8px 16px', background: 'transparent', border: '1px solid #E8E0D5', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#8C7B6E', alignSelf: 'center' }}>
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
              {[
                { label: 'Total Vendors', value: vendors.length, color: '#C9A84C' },
                { label: 'Active Vendors', value: vendors.filter(v => v.subscription_active).length, color: '#4CAF50' },
                { label: 'Total Bookings', value: bookings.length, color: '#2196F3' },
                { label: 'Confirmed Bookings', value: confirmedBookings, color: '#C9A84C' },
              ].map(stat => (
                <div key={stat.label} style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E8E0D5' }}>
                  <div style={{ fontSize: 11, color: '#8C7B6E', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{stat.label}</div>
                  <div style={{ fontSize: 32, color: stat.color, fontWeight: 300 }}>{stat.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E8E0D5' }}>
                <div style={{ fontSize: 14, color: '#2C2420', fontWeight: 500, marginBottom: 16 }}>Access Codes Summary</div>
                {['vendor_permanent', 'vendor_demo', 'couple_demo'].map(type => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F5F0E8', fontSize: 13 }}>
                    <span style={{ color: '#8C7B6E' }}>{type.replace(/_/g, ' ')}</span>
                    <span style={{ color: '#2C2420', fontWeight: 500 }}>{codes.filter(c => c.type === type).length} codes</span>
                  </div>
                ))}
              </div>

              <div style={{ background: '#2C2420', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 11, color: '#C9A84C', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Platform Status</div>
                <div style={{ fontSize: 14, color: '#B8A99A', lineHeight: 2 }}>
                  <div>✓ Backend: Railway — Live</div>
                  <div>✓ Database: Supabase — Connected</div>
                  <div>✓ Web: Vercel — Deployed</div>
                  <div>✓ Domain: thedreamwedding.in — Active</div>
                  <div>✓ Access Gate: Enabled</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACCESS CODES */}
        {activeTab === 'codes' && (
          <div>
            {/* Generate */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #E8E0D5', marginBottom: 24 }}>
              <div style={{ fontSize: 16, color: '#2C2420', fontWeight: 500, marginBottom: 20 }}>Generate New Code</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                {CODE_TYPES.map(type => (
                  <div key={type.value} onClick={() => setSelectedType(type.value)} style={{
                    padding: 16, borderRadius: 10, border: `2px solid ${selectedType === type.value ? type.color : '#E8E0D5'}`,
                    background: selectedType === type.value ? type.color + '15' : '#FAFAFA', cursor: 'pointer',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2420', marginBottom: 4 }}>{type.label}</div>
                    <div style={{ fontSize: 12, color: '#8C7B6E' }}>{type.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  placeholder="Note (e.g. Vendor name, demo for...)"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: '1px solid #E8E0D5', fontSize: 14 }}
                />
                <button onClick={generateCode} disabled={generating} style={{
                  padding: '12px 28px', background: '#2C2420', color: '#C9A84C', border: 'none',
                  borderRadius: 10, cursor: 'pointer', fontSize: 13, letterSpacing: 1, fontWeight: 500,
                }}>
                  {generating ? 'Generating...' : 'GENERATE'}
                </button>
              </div>

              {newCode && (
                <div style={{ marginTop: 16, background: '#2C2420', borderRadius: 10, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#8C7B6E', letterSpacing: 2, marginBottom: 4 }}>NEW CODE GENERATED</div>
                    <div style={{ fontSize: 28, color: '#C9A84C', letterSpacing: 4, fontWeight: 300 }}>{newCode.code}</div>
                    {newCode.expires_at && <div style={{ fontSize: 12, color: '#8C7B6E', marginTop: 4 }}>Expires: {new Date(newCode.expires_at).toLocaleString('en-IN')}</div>}
                  </div>
                  <button onClick={() => copyCode(newCode.code)} style={{
                    background: copied === newCode.code ? '#4CAF50' : '#C9A84C', color: '#2C2420',
                    border: 'none', borderRadius: 8, padding: '12px 20px', cursor: 'pointer', fontWeight: 500, fontSize: 13,
                  }}>
                    {copied === newCode.code ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              )}
            </div>

            {/* All codes */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E0D5', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #E8E0D5', fontSize: 14, fontWeight: 500, color: '#2C2420' }}>
                All Codes ({codes.length})
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FAFAFA' }}>
                    {['Code', 'Type', 'Note', 'Used', 'Expires', 'Created', 'Action'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#8C7B6E', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code, i) => {
                    const expired = code.expires_at && new Date(code.expires_at) < new Date();
                    return (
                      <tr key={code.id} style={{ borderTop: '1px solid #F5F0E8', background: expired ? '#FFF5F5' : '#fff' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#2C2420', letterSpacing: 2 }}>{code.code}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: 11, padding: '3px 8px', borderRadius: 50, fontWeight: 500,
                            background: code.type === 'vendor_permanent' ? '#C9A84C20' : code.type === 'vendor_demo' ? '#4CAF5020' : '#2196F320',
                            color: code.type === 'vendor_permanent' ? '#C9A84C' : code.type === 'vendor_demo' ? '#4CAF50' : '#2196F3',
                          }}>
                            {code.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#8C7B6E' }}>{code.note || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: code.used_count > 0 ? '#4CAF50' : '#8C7B6E' }}>{code.used_count || 0}x</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: expired ? '#E57373' : '#8C7B6E' }}>
                          {code.expires_at ? new Date(code.expires_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#8C7B6E' }}>
                          {new Date(code.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button onClick={() => copyCode(code.code)} style={{
                            fontSize: 12, padding: '4px 12px', borderRadius: 6, cursor: 'pointer', border: '1px solid #E8E0D5',
                            background: copied === code.code ? '#4CAF50' : '#fff', color: copied === code.code ? '#fff' : '#2C2420',
                          }}>
                            {copied === code.code ? 'Copied!' : 'Copy'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VENDORS */}
        {activeTab === 'vendors' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <input
                placeholder="Search vendors by name, city or category..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '14px 16px', borderRadius: 10, border: '1px solid #E8E0D5', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E0D5', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #E8E0D5', fontSize: 14, fontWeight: 500, color: '#2C2420' }}>
                Vendors ({filteredVendors.length})
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FAFAFA' }}>
                    {['Vendor', 'Category', 'City', 'Rating', 'Status', 'Plan', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#8C7B6E', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map(vendor => (
                    <tr key={vendor.id} style={{ borderTop: '1px solid #F5F0E8', opacity: vendor.subscription_active ? 1 : 0.5 }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 14, color: '#2C2420', fontWeight: 500 }}>{vendor.name}</div>
                        {vendor.is_verified && <span style={{ fontSize: 10, color: '#C9A84C', background: '#C9A84C20', padding: '2px 6px', borderRadius: 4 }}>Verified</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#8C7B6E' }}>{vendor.category}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#8C7B6E' }}>{vendor.city}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#C9A84C' }}>★ {vendor.rating || 0}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 11, padding: '3px 8px', borderRadius: 50, fontWeight: 500,
                          background: vendor.subscription_active ? '#4CAF5020' : '#E5737320',
                          color: vendor.subscription_active ? '#4CAF50' : '#E57373',
                        }}>
                          {vendor.subscription_active ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <select
                          value={vendor.plan || 'basic'}
                          onChange={e => updateVendorPlan(vendor.id, e.target.value)}
                          style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #E8E0D5', cursor: 'pointer' }}
                        >
                          <option value="basic">Basic</option>
                          <option value="premium">Premium</option>
                          <option value="elite">Elite</option>
                          <option value="founding">Founding</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => blockVendor(vendor.id, vendor.subscription_active)}
                            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, cursor: 'pointer', border: '1px solid #E8E0D5', background: '#fff', color: vendor.subscription_active ? '#E57373' : '#4CAF50' }}
                          >
                            {vendor.subscription_active ? 'Block' : 'Unblock'}
                          </button>
                          <button
                            onClick={() => deleteVendor(vendor.id, vendor.name)}
                            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, cursor: 'pointer', border: '1px solid #FFCDD2', background: '#FFF5F5', color: '#E57373' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BOOKINGS */}
        {activeTab === 'bookings' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Total Bookings', value: bookings.length, color: '#2196F3' },
                { label: 'Pending Confirmation', value: bookings.filter((b: any) => b.status === 'pending_confirmation').length, color: '#C9A84C' },
                { label: 'Confirmed', value: bookings.filter((b: any) => b.status === 'confirmed').length, color: '#4CAF50' },
                { label: 'Declined / Refunded', value: bookings.filter((b: any) => ['declined', 'auto_refunded'].includes(b.status)).length, color: '#E57373' },
              ].map(stat => (
                <div key={stat.label} style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E8E0D5' }}>
                  <div style={{ fontSize: 11, color: '#8C7B6E', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{stat.label}</div>
                  <div style={{ fontSize: 32, color: stat.color, fontWeight: 300 }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {bookings.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', border: '1px solid #E8E0D5', color: '#8C7B6E' }}>
                No bookings yet
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E0D5', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#FAFAFA' }}>
                      {['Vendor', 'Couple', 'Token', 'Status', 'Date'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#8C7B6E', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking: any) => (
                      <tr key={booking.id} style={{ borderTop: '1px solid #F5F0E8' }}>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#2C2420' }}>{booking.vendor_name || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#8C7B6E' }}>{booking.users?.name || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#C9A84C' }}>₹{(booking.token_amount || 0).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: 11, padding: '3px 8px', borderRadius: 50, fontWeight: 500,
                            background: booking.status === 'confirmed' ? '#4CAF5020' : booking.status === 'pending_confirmation' ? '#C9A84C20' : '#E5737320',
                            color: booking.status === 'confirmed' ? '#4CAF50' : booking.status === 'pending_confirmation' ? '#C9A84C' : '#E57373',
                          }}>
                            {booking.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#8C7B6E' }}>
                          {new Date(booking.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
