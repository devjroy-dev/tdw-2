'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Heart, Share2 } from 'lucide-react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Session { id: string; name?: string; couple_tier?: string; token_balance?: number; }

interface Member {
  id: string;
  primary_user_id: string;
  co_planner_user_id?: string;
  invite_code: string;
  status: 'pending' | 'active' | 'removed';
  role: 'partner' | 'family' | 'inner_circle';
  name?: string;
  invitee_name?: string;
  created_at: string;
}

interface ActivityItem {
  id: string;
  type: 'save' | 'enquiry' | 'joined';
  actor: string;
  action: string;
  subject: string;
  subject_id?: string;
  vendor_id?: string;
  vendor_image?: string;
  vendor_category?: string;
  vendor_event?: string;
  timestamp: string;
  reactions: Record<string, number>;
}

const ROLE_LABELS: Record<string, string> = {
  partner: 'Partner',
  family: 'Family',
  inner_circle: 'Inner Circle',
};

const ROLE_COLORS: Record<string, string> = {
  partner: '#C9A84C',
  family: '#888580',
  inner_circle: '#555250',
};

const REACTIONS = ['❤️', '👍', '🤩', '🤔'];

function timeAgo(d: string): string {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function Shimmer({ h, w }: { h: number; w?: string }) {
  return (
    <div style={{
      height: h, width: w || '100%', borderRadius: 8,
      background: 'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
    }} />
  );
}

// ─── Invite Sheet ─────────────────────────────────────────────────────────────
function InviteSheet({ userId, onClose, onInvited }: {
  userId: string; onClose: () => void; onInvited: (code: string, link: string, name: string) => void;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'partner' | 'family' | 'inner_circle'>('inner_circle');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    if (!name.trim()) { setError('Enter a name'); return; }
    setSending(true); setError('');
    try {
      const res = await fetch(`${API}/api/co-planner/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role, invitee_name: name.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        onInvited(json.data.invite_code, json.data.link, name.trim());
      } else {
        setError(json.error || 'Failed to generate invite');
      }
    } catch { setError('Network error'); }
    setSending(false);
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(17,17,17,0.45)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        animation: 'fadeIn 200ms ease',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501,
        background: '#FFFFFF', borderRadius: '24px 24px 0 0',
        paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 32px)',
        animation: 'sheetUp 320ms cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8' }} />
        </div>
        <button onClick={onClose} style={{
          position: 'absolute', top: 18, right: 20,
          width: 30, height: 30, borderRadius: '50%',
          background: 'rgba(17,17,17,0.06)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <X size={14} color="#555250" strokeWidth={2} />
        </button>

        <div style={{ padding: '20px 24px 0' }}>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 6px' }}>
            Add to Circle
          </p>
          <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 300, color: '#111111', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            Invite someone
          </h3>

          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', display: 'block', marginBottom: 6 }}>
              Their name
            </label>
            <input
              type="text" placeholder="e.g. Rahul, Mom, Preethi..."
              value={name} onChange={e => setName(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px',
                background: '#F8F7F5', border: '0.5px solid #E2DED8', borderRadius: 10,
                fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 300,
                color: '#111111', outline: 'none', boxSizing: 'border-box' as const,
              }}
            />
          </div>

          {/* Role */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', display: 'block', marginBottom: 10 }}>
              Their role
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['partner', 'family', 'inner_circle'] as const).map(r => (
                <button key={r} onClick={() => setRole(r)} style={{
                  flex: 1, padding: '10px 0',
                  background: role === r ? '#111111' : 'transparent',
                  border: role === r ? 'none' : '0.5px solid #E2DED8',
                  borderRadius: 8, cursor: 'pointer',
                  fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300,
                  letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                  color: role === r ? '#F8F7F5' : '#888580',
                  touchAction: 'manipulation',
                  transition: 'all 160ms ease',
                }}>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 300, color: '#C8C4BE', margin: '8px 0 0', lineHeight: 1.5 }}>
              {role === 'partner' && 'Full access to planning, Muse, tasks and budget.'}
              {role === 'family' && 'Can see planning, Muse and tasks. No budget.'}
              {role === 'inner_circle' && 'Can see Muse and activity feed only.'}
            </p>
          </div>

          {error && (
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#E05C5C', margin: '0 0 12px' }}>{error}</p>
          )}

          <button onClick={send} disabled={sending || !name.trim()} style={{
            width: '100%', padding: '14px 0',
            background: name.trim() ? '#111111' : '#E2DED8',
            border: 'none', borderRadius: 10,
            fontFamily: "'Jost',sans-serif", fontSize: 10, fontWeight: 300,
            letterSpacing: '0.22em', textTransform: 'uppercase' as const,
            color: '#F8F7F5', cursor: name.trim() ? 'pointer' : 'not-allowed',
            touchAction: 'manipulation',
          }}>
            {sending ? 'Generating...' : 'Generate Invite Link'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Invite Link Sheet ────────────────────────────────────────────────────────
function InviteLinkSheet({ code, link, name, onClose }: {
  code: string; link: string; name: string; onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const whatsapp = () => {
    const msg = `Hey ${name}! I'm planning my wedding on The Dream Wedding and want you to be part of it. Join my Circle here: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(17,17,17,0.45)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501,
        background: '#FFFFFF', borderRadius: '24px 24px 0 0',
        paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 32px)',
        animation: 'sheetUp 320ms cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8' }} />
        </div>

        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(201,168,76,0.1)',
              border: '0.5px solid rgba(201,168,76,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: 24,
            }}>✦</div>
            <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 300, color: '#111111', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
              Invite ready for {name}
            </h3>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: 0 }}>
              Share this link with them to join your Circle
            </p>
          </div>

          {/* Link display */}
          <div style={{
            background: '#F8F7F5', border: '0.5px solid #E2DED8',
            borderRadius: 10, padding: '12px 14px', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#555250', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {link}
            </p>
            <button onClick={copy} style={{
              fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300,
              letterSpacing: '0.15em', textTransform: 'uppercase' as const,
              color: copied ? '#C9A84C' : '#111111',
              background: 'transparent', border: 'none', cursor: 'pointer',
              flexShrink: 0, touchAction: 'manipulation',
            }}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* WhatsApp share */}
          <button onClick={whatsapp} style={{
            width: '100%', padding: '14px 0',
            background: '#25D366', border: 'none', borderRadius: 10,
            fontFamily: "'Jost',sans-serif", fontSize: 10, fontWeight: 300,
            letterSpacing: '0.22em', textTransform: 'uppercase' as const,
            color: '#FFFFFF', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            touchAction: 'manipulation', marginBottom: 10,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFFFFF">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Share via WhatsApp
          </button>

          <button onClick={onClose} style={{
            width: '100%', padding: '12px 0',
            background: 'transparent', border: 'none',
            fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300,
            color: '#888580', cursor: 'pointer', touchAction: 'manipulation',
          }}>
            Done
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Activity Item ────────────────────────────────────────────────────────────
function ActivityRow({ item, onReact, onViewVendor }: {
  item: ActivityItem;
  onReact: (id: string, emoji: string) => void;
  onViewVendor: (vendorId: string) => void;
}) {
  const [showReactions, setShowReactions] = useState(false);

  const typeIcon = item.action === 'booked' ? '✓' : item.type === 'save' ? '♥' : item.type === 'enquiry' ? '✉' : '✦';
  const typeColor = item.action === 'booked' ? '#0C0A09' : item.type === 'save' ? '#C9A84C' : item.type === 'enquiry' ? '#555250' : '#888580';

  return (
    <div style={{
      background: '#FFFFFF', border: '0.5px solid #E2DED8',
      borderRadius: 12, padding: '14px 16px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Type icon */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(201,168,76,0.08)',
          border: '0.5px solid rgba(201,168,76,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: typeColor,
        }}>
          {typeIcon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Main text */}
          <p style={{
            fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300,
            color: '#111111', margin: '0 0 2px', lineHeight: 1.5,
          }}>
            <span style={{ fontWeight: 400 }}>{item.actor}</span>
            {' '}{item.action}{' '}
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontWeight: 300 }}>
              {item.subject}
            </span>
            {(item.vendor_category || item.vendor_event) && (
              <span style={{ fontWeight: 300, color: '#888580' }}>
                {item.vendor_event ? ` · ${item.vendor_event}` : ''}{item.vendor_category ? ` · ${item.vendor_category}` : ''}
              </span>
            )}
          </p>

          {/* Timestamp */}
          <p style={{
            fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 300,
            color: '#C8C4BE', margin: '0 0 10px',
          }}>
            {timeAgo(item.timestamp)}
          </p>

          {/* Vendor card */}
          {item.type === 'save' && (
            <div
              onClick={() => item.vendor_id && onViewVendor(item.vendor_id)}
              style={{
                width: '100%', borderRadius: 8, overflow: 'hidden',
                marginBottom: 10, cursor: item.vendor_id ? 'pointer' : 'default',
                position: 'relative', background: '#F4F1EC',
                border: '0.5px solid #E2DED8',
              }}
            >
              <VendorImageOrFallback imageUrl={item.vendor_image} name={item.subject} />
              {item.vendor_id && (
                <div style={{
                  position: 'absolute', bottom: 8, right: 8,
                  background: 'rgba(17,17,17,0.6)',
                  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  borderRadius: 20, padding: '4px 10px',
                  fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300,
                  letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                  color: 'rgba(248,247,245,0.9)',
                }}>
                  View
                </div>
              )}
            </div>
          )}
          {item.type === 'enquiry' && item.vendor_image && (
            <div
              onClick={() => item.vendor_id && onViewVendor(item.vendor_id)}
              style={{ width: '100%', height: 120, borderRadius: 8, overflow: 'hidden', marginBottom: 10, cursor: item.vendor_id ? 'pointer' : 'default', position: 'relative' }}
            >
              <img src={item.vendor_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {item.vendor_id && (
                <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(17,17,17,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: 20, padding: '4px 10px', fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'rgba(248,247,245,0.9)' }}>View</div>
              )}
            </div>
          )}

          {/* Reactions row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Existing reactions */}
            {Object.entries(item.reactions).filter(([, count]) => count > 0).map(([emoji, count]) => (
              <button key={emoji} onClick={() => onReact(item.id, emoji)} style={{
                background: 'rgba(17,17,17,0.04)', border: '0.5px solid #E2DED8',
                borderRadius: 20, padding: '3px 10px',
                fontFamily: "'DM Sans',sans-serif", fontSize: 12,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                touchAction: 'manipulation',
              }}>
                {emoji} <span style={{ fontSize: 10, color: '#888580' }}>{count}</span>
              </button>
            ))}

            {/* Add reaction */}
            <button
              onClick={() => setShowReactions(r => !r)}
              style={{
                background: 'transparent', border: '0.5px solid #E2DED8',
                borderRadius: 20, padding: '3px 10px', fontSize: 12,
                cursor: 'pointer', color: '#C8C4BE', touchAction: 'manipulation',
              }}
            >
              {showReactions ? '✕' : '+ React'}
            </button>

            {/* Reaction picker */}
            {showReactions && (
              <div style={{ display: 'flex', gap: 6 }}>
                {REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => { onReact(item.id, emoji); setShowReactions(false); }}
                    style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '2px 4px', touchAction: 'manipulation' }}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function VendorImageOrFallback({ imageUrl, name }: { imageUrl?: string; name: string }) {
  const [failed, setFailed] = React.useState(false);
  if (!imageUrl || failed) {
    return (
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: '#C9A84C' }}>✦</span>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 300, color: '#0C0A09', margin: 0 }}>{name}</p>
        </div>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', margin: '0 0 0 26px' }}>Saved to Muse</p>
      </div>
    );
  }
  return <img src={imageUrl} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} onError={() => setFailed(true)} />;
}

export default function CirclePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ code: string; link: string; name: string } | null>(null);

  // Auth
  useEffect(() => {
    try {
      const raw = localStorage.getItem('couple_session') || localStorage.getItem('couple_web_session');
      if (!raw) { router.replace('/couple/login'); return; }
      const s = JSON.parse(raw);
      if (!s?.id) { router.replace('/couple/login'); return; }
      setSession(s);
    } catch { router.replace('/couple/login'); }
  }, [router]);

  // Load members
  const loadMembers = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`${API}/api/co-planner/list/${uid}`);
      const json = await res.json();
      if (json.success) setMembers(json.data || []);
    } catch {}
    setLoading(false);
  }, []);

  // Build activity feed from moodboard_items + vendor_enquiries + co_planners
  const loadActivity = useCallback(async (uid: string) => {
    try {
      const [museSaves, enquiries, coplanners, bookedVendors] = await Promise.all([
        fetch(`${API}/api/couple/muse/${uid}`).then(r => r.json()),
        fetch(`${API}/api/enquiries/couple/${uid}`).then(r => r.json()),
        fetch(`${API}/api/co-planner/list/${uid}`).then(r => r.json()),
        fetch(`${API}/api/couple/vendors/${uid}`).then(r => r.json()).catch(() => ({ success: false })),
      ]);

      const items: ActivityItem[] = [];

      // Muse saves (inspiration board)
      if (museSaves.success) {
        for (const save of (museSaves.data || []).slice(0, 10)) {
          items.push({
            id: `save-${save.id}`,
            type: 'save',
            actor: 'You',
            action: 'saved',
            subject: save.vendor?.name || (() => {
              if (save.image_url) { try { return new URL(save.image_url).hostname.replace('www.',''); } catch {} }
              return 'Inspiration';
            })(),
            subject_id: save.id,
            vendor_id: save.vendor_id,
            vendor_image: save.vendor_image || save.vendor?.featured_photos?.[0] || (save.vendor_id ? null : save.image_url) || null,
            vendor_category: save.vendor?.category || null,
            timestamp: save.created_at,
            reactions: {},
          });
        }
      }

      // Booked vendors from couple_vendors
      const vendorRows = bookedVendors?.data || bookedVendors || [];
      if (Array.isArray(vendorRows)) {
        for (const v of vendorRows.filter((v: any) => v.status === 'booked' || v.status === 'paid').slice(0, 10)) {
          items.push({
            id: `vendor-${v.id}`,
            type: 'save',
            actor: 'You',
            action: 'booked',
            subject: v.name || 'a Maker',
            vendor_id: v.vendor_id || null,
            vendor_image: null,
            vendor_category: v.category || null,
            vendor_event: (v.events || []).join(', ') || null,
            timestamp: v.updated_at || v.created_at,
            reactions: {},
          });
        }
      }

      // Enquiries
      if (enquiries.success) {
        for (const thread of (enquiries.data || []).slice(0, 10)) {
          items.push({
            id: `enquiry-${thread.id}`,
            type: 'enquiry',
            actor: 'You',
            action: 'sent an enquiry to',
            subject: thread.vendor?.name || 'a Maker',
            subject_id: thread.id,
            vendor_id: thread.vendor_id,
            vendor_image: thread.vendor?.featured_photos?.[0] || thread.vendor?.portfolio_images?.[0] || null,
            timestamp: thread.last_message_at,
            reactions: {},
          });
        }
      }

      // Circle joins
      if (coplanners.success) {
        for (const m of (coplanners.data || [])) {
          if (m.status === 'active') {
            items.push({
              id: `join-${m.id}`,
              type: 'joined',
              actor: m.name || m.invitee_name || 'Someone',
              action: 'joined your Circle as',
              subject: ROLE_LABELS[m.role] || m.role,
              timestamp: m.created_at,
              reactions: {},
            });
          }
        }
      }

      // Sort by timestamp descending
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivity(items.slice(0, 20));
    } catch {}
    setActivityLoading(false);
  }, []);

  useEffect(() => {
    if (session?.id) {
      loadMembers(session.id);
      loadActivity(session.id);
    }
  }, [session, loadMembers, loadActivity]);

  const handleReact = useCallback((itemId: string, emoji: string) => {
    setActivity(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const reactions = { ...item.reactions };
      reactions[emoji] = (reactions[emoji] || 0) + 1;
      return { ...item, reactions };
    }));
  }, []);

  const handleRemoveMember = async (inviteId: string) => {
    if (!session?.id) return;
    try {
      await fetch(`${API}/api/co-planner/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_id: inviteId, user_id: session.id }),
      });
      setMembers(prev => prev.filter(m => m.id !== inviteId));
    } catch {}
  };

  const handleViewVendor = (vendorId: string) => {
    router.push(`/couple/discover/feed?mode=discover&vendorId=${vendorId}`);
  };

  if (!session) return null;

  const activeMembers = members.filter(m => m.status === 'active');
  const pendingMembers = members.filter(m => m.status === 'pending');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
      `}</style>

      <div style={{ background: '#F8F7F5', minHeight: '100dvh', fontFamily: "'DM Sans',sans-serif", paddingBottom: 32 }}>

        {/* Header */}
        <div style={{ padding: '24px 16px 20px' }}>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 6px' }}>
            Circle
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 300, color: '#111111', margin: 0, letterSpacing: '-0.01em' }}>
              Your people
            </h1>
            {/* Add button */}
            <button
              onClick={() => setShowInvite(true)}
              style={{
                fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300,
                letterSpacing: '0.18em', textTransform: 'uppercase' as const,
                color: '#F8F7F5', background: '#111111', border: 'none',
                borderRadius: 20, padding: '8px 16px', cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              + Invite
            </button>
          </div>
        </div>

        {/* Members section */}
        <div style={{ padding: '0 16px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', gap: 12 }}>
              {[1, 2].map(i => (
                <div key={i} style={{ width: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                  <Shimmer h={10} w="60px" />
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div style={{
              background: '#FFFFFF', border: '0.5px solid #E2DED8',
              borderRadius: 12, padding: '24px 20px', textAlign: 'center',
            }}>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 300, color: '#111111', margin: '0 0 6px' }}>
                Your Circle is empty
              </p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: '0 0 16px', lineHeight: 1.6 }}>
                Invite your partner, family or close friends to plan together.
              </p>
              <button onClick={() => setShowInvite(true)} style={{
                fontFamily: "'Jost',sans-serif", fontSize: 10, fontWeight: 300,
                letterSpacing: '0.2em', textTransform: 'uppercase' as const,
                color: '#F8F7F5', background: '#111111', border: 'none',
                borderRadius: 24, padding: '11px 24px', cursor: 'pointer', touchAction: 'manipulation',
              }}>
                Add someone
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[...activeMembers, ...pendingMembers].map(member => (
                <div key={member.id} style={{
                  background: '#FFFFFF', border: '0.5px solid #E2DED8',
                  borderRadius: 12, padding: '14px 12px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  width: 'calc(50% - 6px)', position: 'relative', boxSizing: 'border-box' as const,
                }}>
                  {/* Remove button */}
                  <button onClick={() => handleRemoveMember(member.id)} style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'rgba(17,17,17,0.05)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}>
                    <X size={10} color="#C8C4BE" strokeWidth={2} />
                  </button>

                  {/* Avatar */}
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: member.status === 'active' ? '#111111' : '#F0EDE8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Jost',sans-serif", fontSize: 16, fontWeight: 300,
                      color: member.status === 'active' ? '#F8F7F5' : '#C8C4BE',
                    }}>
                      {getInitials(member.name || member.invitee_name)}
                    </div>
                    {/* Status dot */}
                    <div style={{
                      position: 'absolute', bottom: 2, right: 2,
                      width: 12, height: 12, borderRadius: '50%',
                      background: member.status === 'active' ? '#4CAF50' : '#E2DED8',
                      border: '2px solid #FFFFFF',
                    }} />
                  </div>

                  {/* Name */}
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#111111', margin: 0, textAlign: 'center' }}>
                    {member.name || member.invitee_name || 'Pending'}
                  </p>

                  {/* Role badge or resend */}
                  {member.status === 'pending' ? (
                    <button
                      onClick={() => setInviteResult({ code: member.invite_code, link: `https://thedreamwedding.in/join/${member.invite_code}`, name: member.invitee_name || 'them' })}
                      style={{
                        fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300,
                        letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                        color: '#C9A84C', background: 'rgba(201,168,76,0.08)',
                        border: '0.5px solid rgba(201,168,76,0.25)',
                        borderRadius: 20, padding: '3px 8px', cursor: 'pointer',
                        touchAction: 'manipulation',
                      }}>
                      Resend
                    </button>
                  ) : (
                    <span style={{
                      fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300,
                      letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                      color: ROLE_COLORS[member.role] || '#888580',
                      background: 'rgba(17,17,17,0.04)',
                      borderRadius: 20, padding: '3px 8px',
                    }}>
                      {ROLE_LABELS[member.role] || member.role}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div style={{ padding: '0 16px' }}>
          <p style={{
            fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300,
            letterSpacing: '0.25em', textTransform: 'uppercase', color: '#888580',
            margin: '0 0 14px',
          }}>
            Activity
          </p>

          {activityLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ background: '#FFFFFF', border: '0.5px solid #E2DED8', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <Shimmer h={14} w="70%" />
                      <Shimmer h={11} w="30%" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div style={{
              background: '#FFFFFF', border: '0.5px solid #E2DED8',
              borderRadius: 12, padding: '32px 20px', textAlign: 'center',
            }}>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 300, color: '#C8C4BE', margin: 0 }}>
                Your planning activity will appear here.
              </p>
            </div>
          ) : (
            activity.map(item => (
              <ActivityRow
                key={item.id}
                item={item}
                onReact={handleReact}
                onViewVendor={handleViewVendor}
              />
            ))
          )}
        </div>
      </div>

      {/* Invite sheet */}
      {showInvite && session && (
        <InviteSheet
          userId={session.id}
          onClose={() => setShowInvite(false)}
          onInvited={(code, link, inviteeName) => {
            setShowInvite(false);
            setInviteResult({ code, link, name: inviteeName });
            if (session?.id) loadMembers(session.id);
          }}
        />
      )}

      {/* Invite link sheet */}
      {inviteResult && (
        <InviteLinkSheet
          code={inviteResult.code}
          link={inviteResult.link}
          name={inviteResult.name}
          onClose={() => { setInviteResult(null); if (session?.id) loadMembers(session.id); }}
        />
      )}
    </>
  );
}
