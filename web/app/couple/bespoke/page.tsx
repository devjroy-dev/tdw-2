'use client';

import { Link2, Phone, Plus, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Session {
  id: string;
  name?: string;
}

interface BespokePin {
  id: string;
  couple_id: string;
  event: string;
  pin_type: 'vendor' | 'image' | 'link' | 'note';
  image_url?: string;
  source_url?: string;
  source_domain?: string;
  title?: string;
  note?: string;
  vendor_id?: string;
  created_at: string;
}

interface ContactStatus {
  whatsapp_unlocked: boolean;
  contact?: {
    phone?: string;
    email?: string;
    instagram?: string;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Shimmer() {
  return (
    <div style={{
      height: 200, width: '100%', borderRadius: 12, marginBottom: 16,
      background: 'linear-gradient(90deg, #F8F7F5 25%, #EEECE8 50%, #F8F7F5 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

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
      animation: 'toastIn 200ms cubic-bezier(0.22,1,0.36,1) both',
    }}>{msg}</div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function BespokePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [pins, setPins] = useState<BespokePin[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [contactStatus, setContactStatus] = useState<Record<string, ContactStatus>>({});

  // Auth guard
  useEffect(() => {
    try {
      const raw = localStorage.getItem('couple_session');
      if (!raw) {
        router.replace('/couple/login');
        return;
      }
      const s = JSON.parse(raw) as Session;
      if (!s?.id) {
        router.replace('/couple/login');
        return;
      }
      setSession(s);
    } catch {
      router.replace('/couple/login');
    }
  }, [router]);

  // Fetch Bespoke pins
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API}/api/couple/moodboard/${session!.id}`);
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        if (!cancelled && json.success) {
          setPins(json.data || []);
          
          // Fetch contact status for vendor pins
          const vendorPins = (json.data || []).filter((p: BespokePin) => p.vendor_id);
          for (const pin of vendorPins) {
            if (pin.vendor_id) {
              fetchContactStatus(pin.vendor_id);
            }
          }
        }
      } catch (err) {
        console.error('Bespoke load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [session]);

  // Fetch contact unlock status
  const fetchContactStatus = async (vendor_id: string) => {
    try {
      const res = await fetch(`${API}/api/couple/vendor/${vendor_id}/contact-status?couple_id=${session!.id}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        setContactStatus(prev => ({ ...prev, [vendor_id]: json }));
      }
    } catch (err) {
      console.error('Contact status error:', err);
    }
  };

  // Remove pin
  const handleRemove = useCallback(async (pinId: string) => {
    try {
      const res = await fetch(`${API}/api/couple/moodboard/${pinId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('delete failed');
      setPins(prev => prev.filter(p => p.id !== pinId));
      setToast('Removed from Bespoke');
    } catch (err) {
      console.error('Remove error:', err);
      setToast('Failed to remove');
    }
  }, []);

  // Add external pin
  const handleAddPin = useCallback(async (data: {
    pin_type: string;
    image_url?: string;
    source_url?: string;
    title?: string;
    note?: string;
  }) => {
    try {
      const res = await fetch(`${API}/api/couple/bespoke/add-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: session!.id,
          event: 'general',
          ...data,
        }),
      });
      if (!res.ok) throw new Error('add failed');
      const json = await res.json();
      
      if (json.success) {
        setPins(prev => [json.data, ...prev]);
        setAddSheetOpen(false);
        setToast('Added to Bespoke');
      }
    } catch (err) {
      console.error('Add pin error:', err);
      setToast('Failed to add');
    }
  }, [session]);

  const showToast = (msg: string) => setToast(msg);

  if (!session) return null;

  return (
    <>
      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        background: '#F8F7F5',
        minHeight: '100dvh',
        paddingTop: 16,
        paddingBottom: 80,
      }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 24px' }}>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 32,
            fontWeight: 300,
            color: '#111111',
            margin: '0 0 8px',
            letterSpacing: '-0.01em',
          }}>Your Bespoke Board</p>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            fontWeight: 300,
            color: '#888580',
            margin: 0,
          }}>
            {pins.length === 0
              ? 'Your vision board is empty'
              : `${pins.length} ${pins.length === 1 ? 'pin' : 'pins'} curated`}
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '0 16px' }}>
          {loading ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 16,
            }}>
              <Shimmer />
              <Shimmer />
              <Shimmer />
            </div>
          ) : pins.length === 0 ? (
            // Empty state
            <div style={{
              textAlign: 'center',
              padding: '80px 24px',
            }}>
              <div style={{
                fontSize: 48,
                marginBottom: 16,
                opacity: 0.2,
              }}>✦</div>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 20,
                fontWeight: 300,
                color: '#111111',
                margin: '0 0 8px',
              }}>Create your vision</p>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 300,
                color: '#888580',
                margin: '0 0 24px',
                lineHeight: 1.6,
              }}>
                Shortlist vendors from Muse<br />or add your own inspiration
              </p>
              <button
                onClick={() => setAddSheetOpen(true)}
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 11,
                  fontWeight: 300,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: '#111111',
                  background: '#C9A84C',
                  border: 'none',
                  borderRadius: 24,
                  padding: '12px 24px',
                  cursor: 'pointer',
                  transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
                }}
              >
                Add Your First Pin
              </button>
            </div>
          ) : (
            // Masonry grid
            <div style={{
              columnCount: 2,
              columnGap: 16,
            }}>
              {pins.map(pin => {
                const isVendor = pin.pin_type === 'vendor' && pin.vendor_id;
                const contact = isVendor && pin.vendor_id ? contactStatus[pin.vendor_id] : null;

                return (
                  <div
                    key={pin.id}
                    style={{
                      breakInside: 'avoid',
                      marginBottom: 16,
                      background: '#FFFFFF',
                      border: '0.5px solid #E2DED8',
                      borderRadius: 12,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {/* Image */}
                    {pin.image_url && (
                      <img
                        src={pin.image_url}
                        alt={pin.title || ''}
                        style={{
                          width: '100%',
                          display: 'block',
                          objectFit: 'cover',
                        }}
                      />
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemove(pin.id)}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 28,
                        height: 28,
                        background: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(8px)',
                        border: 'none',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
                      }}
                    >
                      <X size={14} color="#111111" strokeWidth={1.5} />
                    </button>

                    {/* Details */}
                    <div style={{ padding: 12 }}>
                      {pin.title && (
                        <p style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: 16,
                          fontWeight: 300,
                          color: '#111111',
                          margin: '0 0 4px',
                        }}>{pin.title}</p>
                      )}

                      {pin.note && (
                        <p style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 12,
                          fontWeight: 300,
                          color: '#888580',
                          margin: '0 0 8px',
                        }}>{pin.note}</p>
                      )}

                      {/* Vendor contact unlock */}
                      {isVendor && contact?.whatsapp_unlocked && contact.contact?.phone && (
                        <button
                          onClick={() => {
                            window.open(`https://wa.me/${contact.contact!.phone}`, '_blank');
                          }}
                          style={{
                            fontFamily: "'Jost', sans-serif",
                            fontSize: 9,
                            fontWeight: 300,
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            color: '#FFFFFF',
                            background: '#25D366',
                            border: 'none',
                            borderRadius: 6,
                            padding: '8px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            width: '100%',
                            justifyContent: 'center',
                            marginTop: 8,
                          }}
                        >
                          <Phone size={12} strokeWidth={1.5} />
                          WhatsApp Unlocked
                        </button>
                      )}

                      {/* External source link */}
                      {!isVendor && pin.source_url && (
                        <a
                          href={pin.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 10,
                            fontWeight: 300,
                            color: '#888580',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 8,
                          }}
                        >
                          <Link2 size={10} strokeWidth={1.5} />
                          {pin.source_domain || 'View source'}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FAB - Add Pin */}
        <button
          onClick={() => setAddSheetOpen(true)}
          style={{
            position: 'fixed',
            bottom: 88,
            right: 16,
            width: 56,
            height: 56,
            background: '#C9A84C',
            border: 'none',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(201,168,76,0.3)',
            transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(201,168,76,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(201,168,76,0.3)';
          }}
        >
          <Plus size={24} color="#111111" strokeWidth={2} />
        </button>

        {/* Add Pin Sheet */}
        {addSheetOpen && (
          <>
            <div
              onClick={() => setAddSheetOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(17,17,17,0.4)',
                zIndex: 300,
              }}
            />
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#FFFFFF',
              borderRadius: '24px 24px 0 0',
              padding: '24px 16px',
              zIndex: 301,
              animation: 'fadeInUp 280ms cubic-bezier(0.22,1,0.36,1)',
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
            }}>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 24,
                fontWeight: 300,
                color: '#111111',
                margin: '0 0 16px',
              }}>Add to Bespoke</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  onClick={() => showToast('Image upload coming soon')}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 300,
                    color: '#111111',
                    background: '#F8F7F5',
                    border: '0.5px solid #E2DED8',
                    borderRadius: 12,
                    padding: 16,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
                  }}
                >
                  <Upload size={20} strokeWidth={1.5} color="#888580" />
                  Upload Image
                </button>

                <button
                  onClick={() => showToast('Link paste coming soon')}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 300,
                    color: '#111111',
                    background: '#F8F7F5',
                    border: '0.5px solid #E2DED8',
                    borderRadius: 12,
                    padding: 16,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
                  }}
                >
                  <Link2 size={20} strokeWidth={1.5} color="#888580" />
                  Paste Link
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
