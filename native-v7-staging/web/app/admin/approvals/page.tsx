'use client';
// Admin Discovery Approval Queue
// This is the single place where vendor discovery is controlled.
// Pending tab: vendors who submitted for review.
// Live tab: vendors currently in the couple feed (with Revoke option).
// Drawer: full profile view with per-photo approve/reject.
import { useEffect, useState, useCallback } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const H   = { 'Content-Type': 'application/json', 'x-admin-password': 'Mira@2551354' };

// ─── Types ───────────────────────────────────────────────────────────────────
interface Vendor {
  id: string;
  name: string;
  category: string;
  city: string;
  phone: string;
  tier: string;
  is_approved: boolean;
  discover_listed: boolean;
  vendor_discover_enabled: boolean;
  discover_submitted_at: string | null;
  discover_approved_at: string | null;
  discover_rejected_reason: string | null;
  about: string | null;
  starting_price: number | null;
  vibe_tags: string[] | null;
  instagram_url: string | null;
  portfolio_images: string[] | null;
  featured_photos: string[] | null;
}
interface VendorImage {
  id: string;
  url: string;
  tags: string[];
  approved: boolean;
  rejection_reason?: string | null;
}
interface MakerDetail {
  vendor: Vendor;
  images: VendorImage[];
  subscription: { tier: string } | null;
  clients: { id: string }[];
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}
function fmtINR(n: number | null) {
  if (!n) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      background: '#111', color: '#F8F7F5',
      fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300,
      padding: '10px 20px', borderRadius: 100, zIndex: 9999, whiteSpace: 'nowrap',
    }}>{msg}</div>
  );
}

function TierChip({ tier }: { tier: string }) {
  const bg: Record<string, string>   = { essential: '#F4F1EC', signature: 'rgba(201,168,76,0.1)', prestige: '#111' };
  const col: Record<string, string>  = { essential: '#888580', signature: '#C9A84C',               prestige: '#F8F7F5' };
  return (
    <span style={{
      fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      padding: '2px 8px', borderRadius: 100,
      background: bg[tier] || '#F4F1EC', color: col[tier] || '#888580',
    }}>{tier}</span>
  );
}

// ─── Vendor row in the table ──────────────────────────────────────────────────
function VendorRow({
  vendor, onOpen,
}: {
  vendor: Vendor;
  onOpen: () => void;
}) {
  const isLive = vendor.is_approved && vendor.discover_listed && vendor.vendor_discover_enabled;
  return (
    <tr
      onClick={onOpen}
      style={{ cursor: 'pointer', borderBottom: '0.5px solid #E2DED8' }}
    >
      <td style={{ padding: '12px 14px' }}>
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 300, color: '#111', margin: '0 0 2px' }}>{vendor.name}</p>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 300, color: '#888580', margin: 0 }}>{vendor.category} · {vendor.city}</p>
      </td>
      <td style={{ padding: '12px 14px' }}><TierChip tier={vendor.tier} /></td>
      <td style={{ padding: '12px 14px', fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#888580' }}>{fmtDate(vendor.discover_submitted_at)}</td>
      <td style={{ padding: '12px 14px' }}>
        <span style={{
          fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '3px 8px', borderRadius: 100,
          background: isLive ? 'rgba(76,175,80,0.1)' : 'rgba(201,168,76,0.08)',
          color: isLive ? '#388E3C' : '#C9A84C',
        }}>{isLive ? '● Live' : '○ Pending'}</span>
      </td>
      <td style={{ padding: '12px 14px', fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#C9A84C' }}>Review →</td>
    </tr>
  );
}

// ─── Full-screen drawer ───────────────────────────────────────────────────────
function ReviewDrawer({
  detail,
  onClose,
  onApproved,
  onRevoked,
  onRejected,
  showToast,
}: {
  detail: MakerDetail;
  onClose: () => void;
  onApproved: (id: string) => void;
  onRevoked: (id: string) => void;
  onRejected: (id: string, reason: string) => void;
  showToast: (msg: string) => void;
}) {
  const { vendor, images } = detail;
  const [localImages, setLocalImages] = useState<VendorImage[]>(images);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [denyReason, setDenyReason] = useState('');
  const [showDenyForm, setShowDenyForm] = useState(false);
  const [working, setWorking] = useState(false);

  const isLive = vendor.is_approved && vendor.discover_listed && vendor.vendor_discover_enabled;
  const approvedPhotoCount = localImages.filter(i => i.approved).length;
  const hasHero = localImages.some(i => i.tags?.includes('hero') && i.approved);
  // Approve for Discovery requires min 5 approved photos + hero approved
  const canApprove = approvedPhotoCount >= 5 && hasHero;

  // ── Per-photo approve ─────────────────────────────────────────────────────
  async function approvePhoto(imgId: string) {
    setWorking(true);
    try {
      await fetch(`${API}/api/v3/admin/images/${imgId}`, {
        method: 'PATCH', headers: H,
        body: JSON.stringify({ approved: true }),
      });
      setLocalImages(prev => prev.map(i => i.id === imgId ? { ...i, approved: true, rejection_reason: null } : i));
    } catch { showToast('Failed to approve photo'); }
    setWorking(false);
  }

  // ── Per-photo reject ──────────────────────────────────────────────────────
  async function rejectPhoto(imgId: string, note: string) {
    if (!note.trim()) return;
    setWorking(true);
    try {
      await fetch(`${API}/api/v3/admin/images/${imgId}`, {
        method: 'PATCH', headers: H,
        body: JSON.stringify({ approved: false, rejection_reason: note }),
      });
      setLocalImages(prev => prev.map(i => i.id === imgId ? { ...i, approved: false, rejection_reason: note } : i));
      setRejectTarget(null);
      setRejectNote('');
    } catch { showToast('Failed to reject photo'); }
    setWorking(false);
  }

  // ── Approve for Discovery — sets all 3 flags atomically ──────────────────
  // This is the moment a vendor goes live on the couple feed.
  async function approveForDiscovery() {
    if (!canApprove || working) return;
    setWorking(true);
    try {
      await fetch(`${API}/api/v3/admin/makers/${vendor.id}`, {
        method: 'PATCH', headers: H,
        body: JSON.stringify({
          is_approved: true,
          discover_listed: true,
          vendor_discover_enabled: true,
        }),
      });
      showToast(`✓ ${vendor.name} is now live on couple discovery`);
      onApproved(vendor.id);
      onClose();
    } catch { showToast('Failed to approve for Discovery'); }
    setWorking(false);
  }

  // ── Deny profile ──────────────────────────────────────────────────────────
  async function denyProfile() {
    if (!denyReason.trim() || working) return;
    setWorking(true);
    try {
      await fetch(`${API}/api/v3/admin/makers/${vendor.id}`, {
        method: 'PATCH', headers: H,
        body: JSON.stringify({
          is_approved: false,
          discover_listed: false,
          vendor_discover_enabled: false,
        }),
      });
      // Set rejection reason on vendors row
      await fetch(`${API}/api/vendors/${vendor.id}`, {
        method: 'PATCH', headers: H,
        body: JSON.stringify({ discover_rejected_reason: denyReason }),
      });
      showToast(`Profile denied — ${vendor.name} notified`);
      onRejected(vendor.id, denyReason);
      onClose();
    } catch { showToast('Failed to deny profile'); }
    setWorking(false);
  }

  // ── Revoke (remove live vendor from feed) ─────────────────────────────────
  async function revokeFromFeed() {
    if (working) return;
    setWorking(true);
    try {
      await fetch(`${API}/api/v2/admin/vendors/${vendor.id}/revoke`, {
        method: 'PATCH', headers: H,
      });
      showToast(`${vendor.name} removed from feed`);
      onRevoked(vendor.id);
      onClose();
    } catch { showToast('Failed to revoke'); }
    setWorking(false);
  }

  const heroImage = localImages.find(i => i.tags?.includes('hero'));
  const otherImages = localImages.filter(i => !i.tags?.includes('hero'));

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300,
      }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '100%', maxWidth: 560,
        background: '#FFFFFF', zIndex: 301,
        overflowY: 'auto', padding: '0 0 80px',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
        animation: 'slideInRight 300ms cubic-bezier(0.22,1,0.36,1)',
      }}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, background: '#FFFFFF',
          borderBottom: '0.5px solid #E2DED8', padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10,
        }}>
          <div>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#888580', margin: '0 0 2px' }}>REVIEWING</p>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 300, color: '#111', margin: 0 }}>{vendor.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888580', padding: 4 }}>✕</button>
        </div>

        <div style={{ padding: '20px' }}>

          {/* Key info strip */}
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20,
            padding: '12px 14px', background: '#F8F7F5', borderRadius: 10,
          }}>
            <TierChip tier={vendor.tier} />
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#888580' }}>{vendor.category}</span>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#888580' }}>·</span>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#888580' }}>{vendor.city}</span>
            {vendor.starting_price && (
              <>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#888580' }}>·</span>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#C9A84C' }}>from {fmtINR(vendor.starting_price)}</span>
              </>
            )}
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#888580' }}>·</span>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#888580' }}>{vendor.phone}</span>
          </div>

          {/* Bio */}
          {vendor.about && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 8px' }}>BIO</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#555250', lineHeight: 1.6, margin: 0 }}>{vendor.about}</p>
            </div>
          )}

          {/* Vibe tags */}
          {vendor.vibe_tags && vendor.vibe_tags.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 8px' }}>VIBE TAGS</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {vendor.vibe_tags.map(tag => (
                  <span key={tag} style={{
                    fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300,
                    letterSpacing: '0.1em', padding: '3px 10px', borderRadius: 100,
                    background: '#F0EEE8', color: '#555250',
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Instagram */}
          {vendor.instagram_url && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 4px' }}>INSTAGRAM</p>
              <a href={`https://instagram.com/${vendor.instagram_url.replace('@','')}`} target="_blank" rel="noreferrer" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#C9A84C' }}>
                @{vendor.instagram_url.replace('@','')}
              </a>
            </div>
          )}

          {/* ── Photos section ─────────────────────────────────────────────── */}
          <div style={{ borderTop: '0.5px solid #E2DED8', paddingTop: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: 0 }}>
                PHOTOS ({approvedPhotoCount} approved of {localImages.length})
              </p>
              {!canApprove && (
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: '#E57373', margin: 0 }}>
                  Need {Math.max(0, 5 - approvedPhotoCount)} more approved{!hasHero ? ' + hero' : ''}
                </p>
              )}
            </div>

            {/* Hero photo */}
            {heroImage && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 6px' }}>HERO</p>
                <PhotoCard img={heroImage} onApprove={approvePhoto} onReject={setRejectTarget} working={working} />
              </div>
            )}

            {/* Portfolio grid */}
            {otherImages.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {otherImages.map(img => (
                  <PhotoCard key={img.id} img={img} onApprove={approvePhoto} onReject={setRejectTarget} working={working} />
                ))}
              </div>
            )}

            {localImages.length === 0 && (
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#888580', fontStyle: 'italic' }}>No photos uploaded yet.</p>
            )}
          </div>

          {/* ── Action buttons ─────────────────────────────────────────────── */}
          <div style={{ borderTop: '0.5px solid #E2DED8', paddingTop: 20 }}>

            {isLive ? (
              // Already live — only option is revoke
              <div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#388E3C', margin: '0 0 16px' }}>
                  ● This vendor is live on couple discovery.
                </p>
                <button onClick={revokeFromFeed} disabled={working} style={{
                  height: 44, padding: '0 20px',
                  background: 'transparent', border: '1px solid #E57373',
                  borderRadius: 100, cursor: working ? 'default' : 'pointer',
                  fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300,
                  letterSpacing: '0.15em', textTransform: 'uppercase', color: '#E57373',
                }}>Remove from Feed</button>
              </div>
            ) : (
              // Pending — approve or deny
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Approve */}
                <button
                  onClick={approveForDiscovery}
                  disabled={!canApprove || working}
                  title={!canApprove ? `Need ${Math.max(0,5-approvedPhotoCount)} more approved photos${!hasHero?' + hero photo':''}` : ''}
                  style={{
                    height: 52, background: canApprove ? '#C9A84C' : '#E2DED8',
                    border: 'none', borderRadius: 100,
                    cursor: canApprove && !working ? 'pointer' : 'default',
                    fontFamily: "'Jost',sans-serif", fontSize: 10, fontWeight: 400,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    color: canApprove ? '#111' : '#888580',
                  }}
                >
                  {canApprove ? 'Approve for Discovery →' : `Approve (need ${Math.max(0,5-approvedPhotoCount)} more approved photos)`}
                </button>

                {/* Deny */}
                {!showDenyForm ? (
                  <button onClick={() => setShowDenyForm(true)} style={{
                    height: 44, background: 'transparent',
                    border: '0.5px solid #E2DED8', borderRadius: 100, cursor: 'pointer',
                    fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300,
                    letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580',
                  }}>Deny Profile</button>
                ) : (
                  <div style={{ background: '#FFF5F5', border: '1px solid #FFCDD2', borderRadius: 12, padding: 16 }}>
                    <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E57373', margin: '0 0 8px' }}>DENIAL REASON (shown to vendor)</p>
                    <textarea
                      value={denyReason}
                      onChange={e => setDenyReason(e.target.value)}
                      maxLength={200}
                      rows={3}
                      placeholder="e.g. Portfolio quality doesn't meet our current standard. Please add more editorial photos and resubmit."
                      style={{
                        width: '100%', border: '0.5px solid #FFCDD2', borderRadius: 8,
                        padding: '10px 12px', fontFamily: "'DM Sans',sans-serif",
                        fontSize: 13, fontWeight: 300, color: '#111', outline: 'none',
                        resize: 'none', background: '#FFFFFF',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button onClick={denyProfile} disabled={!denyReason.trim() || working} style={{
                        flex: 1, height: 40, background: denyReason.trim() ? '#E57373' : '#E2DED8',
                        border: 'none', borderRadius: 100,
                        cursor: denyReason.trim() ? 'pointer' : 'default',
                        fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300,
                        letterSpacing: '0.15em', textTransform: 'uppercase',
                        color: denyReason.trim() ? '#FFFFFF' : '#888580',
                      }}>Confirm Denial</button>
                      <button onClick={() => { setShowDenyForm(false); setDenyReason(''); }} style={{
                        height: 40, padding: '0 16px', background: 'transparent',
                        border: '0.5px solid #E2DED8', borderRadius: 100, cursor: 'pointer',
                        fontFamily: "'Jost',sans-serif", fontSize: 9, color: '#888580',
                      }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo reject modal */}
      {rejectTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%' }}>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 300, color: '#111', margin: '0 0 12px' }}>Reject Photo</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: '0 0 12px' }}>Leave a short note for the vendor (max 200 chars).</p>
            {[
              'Too dark — please upload a well-lit version',
              'Image quality too low — minimum 1080px width',
              'Does not showcase your work — use a client photo',
              'Please crop to portrait orientation',
            ].map(r => (
              <button key={r} onClick={() => setRejectNote(r)} style={{
                display: 'block', width: '100%', padding: '8px 12px', marginBottom: 6, textAlign: 'left',
                background: rejectNote === r ? '#111' : '#F4F1EC',
                color: rejectNote === r ? '#F8F7F5' : '#111',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300,
              }}>{r}</button>
            ))}
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              maxLength={200}
              placeholder="Or write a custom note..."
              rows={2}
              style={{
                width: '100%', border: '0.5px solid #E2DED8', borderRadius: 8,
                padding: '8px 12px', fontFamily: "'DM Sans',sans-serif",
                fontSize: 12, fontWeight: 300, color: '#111', outline: 'none',
                resize: 'none', marginTop: 8, marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => rejectPhoto(rejectTarget, rejectNote)}
                disabled={!rejectNote.trim() || working}
                style={{
                  flex: 1, height: 40, background: rejectNote.trim() ? '#9B4545' : '#E2DED8',
                  border: 'none', borderRadius: 100, cursor: rejectNote.trim() ? 'pointer' : 'default',
                  fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.15em',
                  textTransform: 'uppercase', color: rejectNote.trim() ? '#FFFFFF' : '#888580',
                }}>Reject</button>
              <button onClick={() => { setRejectTarget(null); setRejectNote(''); }} style={{
                height: 40, padding: '0 16px', background: 'transparent',
                border: '0.5px solid #E2DED8', borderRadius: 100, cursor: 'pointer',
                fontFamily: "'Jost',sans-serif", fontSize: 9, color: '#888580',
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Photo card in the drawer ─────────────────────────────────────────────────
function PhotoCard({
  img, onApprove, onReject, working,
}: {
  img: VendorImage;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  working: boolean;
}) {
  return (
    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
      <img src={img.url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
      {/* Status overlay */}
      <div style={{
        position: 'absolute', top: 6, left: 6,
        fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        padding: '2px 7px', borderRadius: 100,
        background: img.approved ? 'rgba(76,175,80,0.85)' : 'rgba(0,0,0,0.55)',
        color: '#FFFFFF',
      }}>{img.approved ? '✓ Approved' : 'Pending'}</div>
      {/* Action buttons */}
      <div style={{ position: 'absolute', bottom: 6, right: 6, display: 'flex', gap: 4 }}>
        <button
          onClick={() => onApprove(img.id)}
          disabled={img.approved || working}
          style={{
            width: 28, height: 28, borderRadius: '50%', border: 'none',
            background: img.approved ? 'rgba(76,175,80,0.85)' : 'rgba(201,168,76,0.9)',
            color: '#111', cursor: img.approved ? 'default' : 'pointer',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✓</button>
        <button
          onClick={() => onReject(img.id)}
          disabled={working}
          style={{
            width: 28, height: 28, borderRadius: '50%', border: 'none',
            background: 'rgba(0,0,0,0.6)', color: '#F8F7F5',
            cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✗</button>
      </div>
      {/* Rejection reason */}
      {img.rejection_reason && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(155,69,69,0.9)', padding: '4px 8px',
        }}>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: '#FFFFFF', margin: 0 }}>{img.rejection_reason}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ApprovalsPage() {
  const [vendors, setVendors]       = useState<Vendor[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<'pending' | 'live'>('pending');
  const [selected, setSelected]     = useState<MakerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [toast, setToast]           = useState('');
  const [search, setSearch]         = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // ── Load all vendors with discovery flags
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v3/admin/makers?limit=200`, { headers: H });
      const d = await r.json();
      if (d.success) setVendors(d.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Open drawer for a vendor
  async function openDrawer(vendorId: string) {
    setLoadingDetail(true);
    try {
      const r = await fetch(`${API}/api/v3/admin/makers/${vendorId}`, { headers: H });
      const d = await r.json();
      if (d.success) setSelected(d.data);
    } catch { showToast('Failed to load vendor detail'); }
    setLoadingDetail(false);
  }

  // ── Callback: vendor just approved → update local list
  function handleApproved(vendorId: string) {
    setVendors(prev => prev.map(v =>
      v.id === vendorId
        ? { ...v, is_approved: true, discover_listed: true, vendor_discover_enabled: true }
        : v
    ));
  }

  // ── Callback: vendor revoked from feed
  function handleRevoked(vendorId: string) {
    setVendors(prev => prev.map(v =>
      v.id === vendorId
        ? { ...v, is_approved: false, discover_listed: false, vendor_discover_enabled: false }
        : v
    ));
  }

  // ── Callback: vendor denied
  function handleRejected(vendorId: string, reason: string) {
    setVendors(prev => prev.map(v =>
      v.id === vendorId
        ? { ...v, discover_rejected_reason: reason }
        : v
    ));
  }

  // ── Filtered lists
  const pending = vendors.filter(v =>
    v.discover_submitted_at && !v.is_approved &&
    (search ? v.name?.toLowerCase().includes(search.toLowerCase()) : true)
  );
  const live = vendors.filter(v =>
    v.is_approved && v.discover_listed && v.vendor_discover_enabled &&
    (search ? v.name?.toLowerCase().includes(search.toLowerCase()) : true)
  );
  const shown = tab === 'pending' ? pending : live;

  const th: React.CSSProperties = {
    fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200,
    letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580',
    padding: '10px 14px', textAlign: 'left', borderBottom: '0.5px solid #E2DED8',
  };

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {selected && (
        <ReviewDrawer
          detail={selected}
          onClose={() => setSelected(null)}
          onApproved={handleApproved}
          onRevoked={handleRevoked}
          onRejected={handleRejected}
          showToast={showToast}
        />
      )}

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 4px' }}>PLATFORM</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: 32, color: '#111', margin: 0 }}>
            Discovery Approvals
            <span style={{ fontSize: 18, color: pending.length > 0 ? '#C9A84C' : '#888580', marginLeft: 10 }}>
              ({pending.length} pending)
            </span>
          </p>
          <button onClick={load} style={{
            height: 36, padding: '0 16px', background: 'transparent',
            border: '0.5px solid #E2DED8', borderRadius: 8,
            fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888580', cursor: 'pointer',
          }}>Refresh</button>
        </div>
      </div>

      {/* Tabs + search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {(['pending', 'live'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              height: 34, padding: '0 16px', border: 'none', borderRadius: 6,
              background: tab === t ? '#111' : 'transparent',
              color: tab === t ? '#F8F7F5' : '#888580',
              fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300,
              letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
            }}>
              {t === 'pending' ? `Pending (${pending.length})` : `Live (${live.length})`}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name..."
          style={{
            height: 34, padding: '0 12px', border: '0.5px solid #E2DED8',
            borderRadius: 6, fontFamily: "'DM Sans',sans-serif", fontSize: 13,
            color: '#111', outline: 'none', minWidth: 180,
          }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#888580', margin: '40px 0', textAlign: 'center' }}>Loading...</p>
      ) : shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 300, color: '#888580', margin: '0 0 8px' }}>
            {tab === 'pending' ? 'No pending submissions' : 'No live vendors yet'}
          </p>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#C8C4BE' }}>
            {tab === 'pending' ? 'Vendors appear here when they hit Submit for Discovery.' : 'Approve vendors from the Pending tab.'}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Maker</th>
                <th style={th}>Tier</th>
                <th style={th}>{tab === 'pending' ? 'Submitted' : 'Approved'}</th>
                <th style={th}>Status</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {shown.map(v => (
                <VendorRow
                  key={v.id}
                  vendor={v}
                  onOpen={() => openDrawer(v.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loadingDetail && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          zIndex: 290, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: '#F8F7F5' }}>Loading profile...</p>
        </div>
      )}
    </>
  );
}
