'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, X, Sparkles, MessageCircle, ChevronRight } from 'lucide-react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Session {
  id: string;
  name?: string;
  email?: string;
  wedding_date?: string;
}

interface Vendor {
  id: string;
  name: string;
  category: string;
  city?: string;
  portfolio_images?: string[];
  featured_photos?: string[];
  starting_price?: number;
  rating?: number;
  review_count?: number;
  tier?: string;
  phone?: string;
}

interface MuseItem {
  id: string;
  user_id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_category: string;
  vendor_image?: string;
  event?: string;
  source?: string;
  created_at: string;
  vendor: Vendor | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatINR(n?: number): string {
  if (!n) return 'On request';
  return '₹' + n.toLocaleString('en-IN');
}

function getVendorImage(item: MuseItem): string {
  if (item.vendor_image) return item.vendor_image;
  if (item.vendor?.portfolio_images?.[0]) return item.vendor.portfolio_images[0];
  if (item.vendor?.featured_photos?.[0]) return item.vendor.featured_photos[0];
  return '';
}

function getTierBadge(tier?: string): { color: string; label: string } | null {
  if (tier === 'prestige') return { color: '#C9A84C', label: 'PRESTIGE' };
  if (tier === 'signature') return { color: '#888580', label: 'SIGNATURE' };
  return null;
}

function getRatingStars(rating?: number): string {
  if (!rating) return '';
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '');
}

// ─── Shimmer ─────────────────────────────────────────────────────────────────
function Shimmer() {
  return (
    <div style={{
      height: 180, width: '100%', borderRadius: 12, marginBottom: 16,
      background: 'linear-gradient(90deg, #F8F7F5 25%, #EEECE8 50%, #F8F7F5 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      willChange: 'background-position',
    }} />
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────
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

// ─── Main Component ──────────────────────────────────────────────────────────
export default function MusePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<MuseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const [showDiscoverPopup, setShowDiscoverPopup] = useState(false);
  const [shortlisting, setShortlisting] = useState<string | null>(null);

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

  // Fetch Muse items
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API}/api/couple/muse/${session!.id}`);
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        if (!cancelled && json.success) {
          setItems(json.data || []);
        }
      } catch (err) {
        console.error('Muse load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [session]);

  // Remove from Muse
  const handleRemove = useCallback(async (save_id: string) => {
    setRemoving(save_id);
    try {
      const res = await fetch(`${API}/api/couple/muse/${save_id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('delete failed');
      setItems(prev => prev.filter(i => i.id !== save_id));
      setToast('Removed from Muse');
    } catch (err) {
      console.error('Remove error:', err);
      setToast('Failed to remove');
    } finally {
      setRemoving(null);
    }
  }, []);

  // Shortlist → Move to Bespoke
  const handleShortlist = useCallback(async (item: MuseItem) => {
    setShortlisting(item.id);
    try {
      const res = await fetch(`${API}/api/couple/muse/shortlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          save_id: item.id,
          couple_id: session!.id,
          event: item.event || 'general',
        }),
      });
      if (!res.ok) throw new Error('shortlist failed');
      const json = await res.json();
      
      if (json.success) {
        setItems(prev => prev.filter(i => i.id !== item.id));
        setToast('Moved to Bespoke · Contact unlocked');
      } else {
        throw new Error(json.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Shortlist error:', err);
      setToast('Failed to shortlist');
    } finally {
      setShortlisting(null);
    }
  }, [session]);

  const showToast = (msg: string) => setToast(msg);

  // Show minimal skeleton on light bg while session loads — prevents flash
  if (!session) return (
    <div style={{ background:'#F8F7F5',minHeight:'100dvh',padding:'16px 16px',paddingBottom:80 }}>
      <div style={{ height:36,width:160,borderRadius:8,marginBottom:8,background:'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.4s infinite' }} />
      <div style={{ height:16,width:100,borderRadius:6,marginBottom:32,background:'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.4s infinite' }} />
      <div style={{ height:180,borderRadius:12,marginBottom:12,background:'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.4s infinite' }} />
      <div style={{ height:180,borderRadius:12,marginBottom:12,background:'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.4s infinite' }} />
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );

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
          }}>Your Muse</p>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            fontWeight: 300,
            color: '#888580',
            margin: 0,
          }}>
            {items.length === 0
              ? 'Your shortlist is empty'
              : `${items.length} ${items.length === 1 ? 'vendor' : 'vendors'} saved`}
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '0 16px' }}>
          {loading ? (
            <>
              <Shimmer />
              <Shimmer />
              <Shimmer />
            </>
          ) : items.length === 0 ? (
            // Empty state
            <div style={{
              textAlign: 'center',
              padding: '80px 24px',
            }}>
              <div style={{
                fontSize: 48,
                marginBottom: 16,
                opacity: 0.2,
                color: '#111111',
              }}>✦</div>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 20,
                fontWeight: 300,
                color: '#F8F7F5',
                margin: '0 0 8px',
              }}>Your Muse awaits</p>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 300,
                color: '#888580',
                margin: '0 0 24px',
                lineHeight: 1.6,
              }}>
                Explore Discovery to find<br />your perfect Makers
              </p>
              <button
                onClick={() => setShowDiscoverPopup(true)}
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 11,
                  fontWeight: 300,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: '#111111',
                  background: 'transparent',
                  border: '0.5px solid #E2DED8',
                  borderRadius: 24,
                  padding: '12px 24px',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                Discover
              </button>

              {/* Discover popup */}
              {showDiscoverPopup && (
                <>
                  <div
                    onClick={() => setShowDiscoverPopup(false)}
                    style={{ position:'fixed',inset:0,zIndex:500,background:'rgba(17,17,17,0.45)',backdropFilter:'blur(4px)',WebkitBackdropFilter:'blur(4px)' }}
                  />
                  <div style={{ position:'fixed',bottom:0,left:0,right:0,zIndex:501,background:'#FFFFFF',borderRadius:'24px 24px 0 0',padding:'20px 24px calc(env(safe-area-inset-bottom,0px) + 32px)' }}>
                    <div style={{ display:'flex',justifyContent:'center',marginBottom:20 }}>
                      <div style={{ width:36,height:4,borderRadius:2,background:'#E2DED8' }} />
                    </div>
                    <h3 style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:300,color:'#111111',margin:'0 0 6px',letterSpacing:'-0.01em' }}>How do you want to browse?</h3>
                    <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#888580',margin:'0 0 24px' }}>Choose your discovery mode</p>
                    <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                      <button
                        onClick={() => router.push('/couple/discover/feed?mode=blind')}
                        style={{ width:'100%',padding:'16px 20px',background:'#111111',border:'none',borderRadius:12,fontFamily:"'Jost',sans-serif",fontSize:10,fontWeight:300,letterSpacing:'0.22em',textTransform:'uppercase',color:'#F8F7F5',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'flex-start',gap:4,touchAction:'manipulation' }}
                      >
                        <span>Blind</span>
                        <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:300,letterSpacing:'0',textTransform:'none',color:'rgba(248,247,245,0.55)',lineHeight:1.4 }}>Pure photos, no names. Swipe on instinct.</span>
                      </button>
                      <button
                        onClick={() => router.push('/couple/discover/feed?mode=discover')}
                        style={{ width:'100%',padding:'16px 20px',background:'transparent',border:'0.5px solid #E2DED8',borderRadius:12,fontFamily:"'Jost',sans-serif",fontSize:10,fontWeight:300,letterSpacing:'0.22em',textTransform:'uppercase',color:'#111111',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'flex-start',gap:4,touchAction:'manipulation' }}
                      >
                        <span>My Feed</span>
                        <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:300,letterSpacing:'0',textTransform:'none',color:'#888580',lineHeight:1.4 }}>Browse all Makers. Swipe up and down.</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            // Vendor cards
            items.map(item => {
              const vendor = item.vendor;
              const image = getVendorImage(item);
              const isRemoving = removing === item.id;
              const isShortlisting = shortlisting === item.id;
              // Derive name and category from vendor join (moodboard_items has no name/category columns)
              const vendorName = vendor?.name || null;
              const vendorCategory = vendor?.category || null;
              const vendorCity = vendor?.city || null;

              return (
                <div
                  key={item.id}
                  style={{
                    background: '#FFFFFF',
                    border: '0.5px solid #E2DED8',
                    borderRadius: 16,
                    overflow: 'hidden',
                    marginBottom: 12,
                    opacity: isRemoving || isShortlisting ? 0.5 : 1,
                    transition: 'opacity 200ms cubic-bezier(0.22,1,0.36,1)',
                    boxShadow: '0 2px 12px rgba(17,17,17,0.06)',
                  }}
                >
                  {/* Image — 3:2 ratio, full width */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    paddingBottom: '66.66%',
                    background: '#F0EDE8',
                  }}>
                    {image ? (
                      <img
                        src={image}
                        alt={vendorName || ''}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, color: '#C8C4BE' }}>✦</span>
                      </div>
                    )}

                    {/* Subtle gradient at bottom for text legibility */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      height: '50%',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%)',
                      pointerEvents: 'none',
                    }} />

                    {/* Vendor name + category overlaid on image */}
                    <div style={{
                      position: 'absolute', bottom: 14, left: 16, right: 48,
                    }}>
                      {vendorName && (
                        <p style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: 22, fontWeight: 300,
                          color: '#FFFFFF', margin: '0 0 2px',
                          letterSpacing: '-0.01em', lineHeight: 1.1,
                          textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                        }}>{vendorName}</p>
                      )}
                      {(vendorCategory || vendorCity) && (
                        <p style={{
                          fontFamily: "'Jost', sans-serif",
                          fontSize: 9, fontWeight: 300,
                          letterSpacing: '0.18em', textTransform: 'uppercase',
                          color: 'rgba(255,255,255,0.75)', margin: 0,
                        }}>
                          {vendorCategory}{vendorCity ? ` · ${vendorCity}` : ''}
                        </p>
                      )}
                    </div>

                    {/* Remove button — subtle, top right */}
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={isRemoving || isShortlisting}
                      style={{
                        position: 'absolute', top: 10, right: 10,
                        width: 28, height: 28,
                        background: 'rgba(0,0,0,0.35)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '0.5px solid rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={12} color="rgba(255,255,255,0.85)" strokeWidth={2} />
                    </button>
                  </div>

                  {/* Bottom row — price + actions */}
                  <div style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}>
                    {/* Price + rating */}
                    <div>
                      {vendor?.starting_price && (
                        <p style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: 18, fontWeight: 300,
                          color: '#111111', margin: '0 0 2px',
                        }}>{formatINR(vendor.starting_price)}</p>
                      )}
                      {vendor?.rating && (
                        <p style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 11, fontWeight: 300,
                          color: '#888580', margin: 0,
                        }}>
                          <span style={{ color: '#C9A84C' }}>{getRatingStars(vendor.rating)}</span>
                          {' '}{vendor.rating.toFixed(1)}
                          {vendor.review_count ? ` (${vendor.review_count})` : ''}
                        </p>
                      )}
                      {!vendor?.starting_price && !vendor?.rating && (
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#C8C4BE', margin: 0 }}>
                          On request
                        </p>
                      )}
                    </div>

                    {/* Action buttons — compact row */}
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {/* Enquire */}
                      <button
                        onClick={() => showToast('Enquiry coming with Messages')}
                        style={{
                          fontFamily: "'Jost', sans-serif",
                          fontSize: 9, fontWeight: 300,
                          letterSpacing: '0.15em', textTransform: 'uppercase',
                          color: '#111111',
                          background: 'transparent',
                          border: '0.5px solid #E2DED8',
                          borderRadius: 8, padding: '9px 14px',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 5,
                          touchAction: 'manipulation',
                        }}
                      >
                        <MessageCircle size={12} strokeWidth={1.5} />
                        Enquire
                      </button>

                      {/* Shortlist */}
                      <button
                        onClick={() => handleShortlist(item)}
                        disabled={isShortlisting}
                        style={{
                          fontFamily: "'Jost', sans-serif",
                          fontSize: 9, fontWeight: 300,
                          letterSpacing: '0.15em', textTransform: 'uppercase',
                          color: '#F8F7F5',
                          background: '#111111',
                          border: 'none',
                          borderRadius: 8, padding: '9px 14px',
                          cursor: isShortlisting ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 5,
                          opacity: isShortlisting ? 0.6 : 1,
                          touchAction: 'manipulation',
                        }}
                      >
                        <Heart size={12} strokeWidth={1.5} fill={isShortlisting ? '#F8F7F5' : 'none'} />
                        {isShortlisting ? 'Adding...' : 'Shortlist'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
