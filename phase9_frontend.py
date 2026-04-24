"""
PHASE 9 — Frontend patch
Repo: tdw-2

Changes:
  1. Full rewrite of web/app/page.tsx — the landing page
     — Glassmorphism carousel behind everything
     — 3-path flow: "I have an invite" / "Request an invite" / "Just exploring"
     — "Just Exploring" → 10-vendor blind swipe preview → nudge to request invite
     — "Request an invite" → Dreamer or Maker form → 60s edit window
     — "I have an invite" → existing OTP + PIN flow (preserved exactly)
     — Wedding date picker: 3 dot options (exact / month blocks / just browsing)
     — Instagram deep-link helper on forms
  2. Create web/app/admin/preview/page.tsx — admin curates the 10 preview vendors
  3. Add "Preview Vendors" to admin nav under PLATFORM

Run from: /workspaces/tdw-2
Command:  python3 phase9_frontend.py
"""

import os

changes = []

# ═════════════════════════════════════════════════════════════════════════════
# CHANGE 1 — Full landing page rewrite: web/app/page.tsx
#
# Design:
#   - Full-screen carousel (fetched from /api/v2/cover-photos, fallback Unsplash)
#   - Always-running slow fade between slides
#   - Glassmorphism panel floating over the carousel
#   - Three entry paths — all on one page, panels morph in place
#   - All OTP/PIN logic from the original preserved exactly
# ═════════════════════════════════════════════════════════════════════════════

LANDING_PAGE = """\
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND = 'https://dream-wedding-production-89ae.up.railway.app';

const FALLBACK_SLIDES = [
  'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=1200&q=90&fit=crop',
];

const MOTTO = 'Not just happily married. Getting married happily.';

// Screen states — what the glass panel shows
type Screen =
  | 'entry'          // The 3 dot-selector entry panel
  | 'exploring'      // "Just Exploring" blind swipe preview
  | 'request_who'    // Dreamer or Maker choice
  | 'request_dreamer'// Dreamer request form
  | 'request_maker'  // Maker request form
  | 'request_done'   // Confirmation + 60s edit window
  | 'invite_code'    // Enter invite code
  | 'invite_phone'   // Enter phone (after code validated)
  | 'invite_otp'     // Enter OTP
  | 'signin_phone'   // Returning member phone
  | 'signin_otp';    // Returning member OTP

type Role = 'Dreamer' | 'Maker';
type DateStatus = 'exact' | 'season' | 'browsing' | null;
type Season = 'jan_mar' | 'apr_jun' | 'jul_sep' | 'oct_jan' | null;

interface PreviewVendor {
  id: string;
  category: string;
  city: string;
  featured_photos: string[];
  portfolio_images: string[];
  starting_price: number | null;
  vibe_tags: string[] | null;
  about: string | null;
}

// ─── Glass panel style ────────────────────────────────────────────────────────
const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.13)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 24,
};

// ─── Shared input style ───────────────────────────────────────────────────────
const INPUT: React.CSSProperties = {
  width: '100%', border: 'none',
  borderBottom: '1px solid rgba(255,255,255,0.3)',
  background: 'transparent', outline: 'none',
  fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
  fontSize: 15, color: '#F8F7F5', padding: '8px 0', marginBottom: 16,
};

// ─── Dot selector ─────────────────────────────────────────────────────────────
function DotOption({ label, selected, onSelect, sublabel }: {
  label: string; selected: boolean; onSelect: () => void; sublabel?: string;
}) {
  return (
    <button onClick={onSelect} style={{
      display: 'flex', alignItems: 'center', gap: 14, width: '100%',
      background: 'none', border: 'none', cursor: 'pointer',
      padding: '10px 0', touchAction: 'manipulation',
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        border: `1.5px solid ${selected ? '#C9A84C' : 'rgba(248,247,245,0.5)'}`,
        background: selected ? '#C9A84C' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
      }}>
        {selected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0C0A09' }} />}
      </span>
      <div style={{ textAlign: 'left' }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 300, color: '#F8F7F5', margin: 0 }}>{label}</p>
        {sublabel && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 300, color: 'rgba(248,247,245,0.5)', margin: '2px 0 0' }}>{sublabel}</p>}
      </div>
    </button>
  );
}

// ─── Gold CTA button ──────────────────────────────────────────────────────────
function GoldBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', height: 52,
      background: disabled ? 'rgba(201,168,76,0.3)' : '#C9A84C',
      color: disabled ? 'rgba(12,10,9,0.4)' : '#0C0A09',
      border: 'none', borderRadius: 100, cursor: disabled ? 'default' : 'pointer',
      fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 400,
      letterSpacing: '0.2em', textTransform: 'uppercase',
      touchAction: 'manipulation', marginTop: 8,
      transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
    }}>{label}</button>
  );
}

// ─── Ghost CTA button ─────────────────────────────────────────────────────────
function GhostBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', height: 44,
      background: 'transparent',
      color: 'rgba(248,247,245,0.6)',
      border: '0.5px solid rgba(248,247,245,0.2)', borderRadius: 100,
      cursor: 'pointer', fontFamily: "'Jost', sans-serif",
      fontSize: 9, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase',
      touchAction: 'manipulation', marginTop: 6,
    }}>{label}</button>
  );
}

// ─── Back button ──────────────────────────────────────────────────────────────
function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      fontFamily: "'Jost', sans-serif", fontSize: 18,
      color: 'rgba(248,247,245,0.5)', padding: '0 0 12px', display: 'block',
      touchAction: 'manipulation',
    }}>←</button>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function Label({ text }: { text: string }) {
  return (
    <p style={{
      fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 200,
      letterSpacing: '0.25em', textTransform: 'uppercase',
      color: 'rgba(248,247,245,0.5)', margin: '0 0 6px',
    }}>{text}</p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const slidesRef   = useRef<string[]>(FALLBACK_SLIDES);
  const otpRefs     = useRef<(HTMLInputElement | null)[]>([]);
  const editTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [slides, setSlides] = useState<string[]>(FALLBACK_SLIDES);
  const [cur, setCur] = useState(0);
  const [screen, setScreen] = useState<Screen>('entry');
  const [role, setRole] = useState<Role | null>(null);
  const [toast, setToast] = useState('');

  // Request form fields
  const [reqName, setReqName]           = useState('');
  const [reqPhone, setReqPhone]         = useState('');
  const [reqInstagram, setReqInstagram] = useState('');
  const [reqCategory, setReqCategory]   = useState('Photographer');
  const [reqCategoryOther, setReqCategoryOther] = useState('');
  const [dateStatus, setDateStatus]     = useState<DateStatus>(null);
  const [exactDate, setExactDate]       = useState('');
  const [season, setSeason]             = useState<Season>(null);
  const [editSecondsLeft, setEditSecondsLeft] = useState(0);
  const [submitting, setSubmitting]     = useState(false);

  // Invite / OTP fields
  const [inviteCode, setInviteCode]     = useState('');
  const [inviteError, setInviteError]   = useState('');
  const [phone, setPhone]               = useState('');
  const [otp, setOtp]                   = useState(['', '', '', '', '', '']);

  // "Just Exploring" preview
  const [previewVendors, setPreviewVendors] = useState<PreviewVendor[]>([]);
  const [previewIdx, setPreviewIdx]     = useState(0);
  const [previewDone, setPreviewDone]   = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => { slidesRef.current = slides; }, [slides]);

  const startCarousel = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    // Slower rotation on landing — 4s per slide
    intervalRef.current = setInterval(() => setCur(c => (c + 1) % slidesRef.current.length), 4000);
  }, []);

  useEffect(() => {
    // Fetch cover photos
    fetch(`${BACKEND}/api/v2/cover-photos`)
      .then(r => r.json())
      .then(d => { if (d.photos?.length) setSlides(d.photos.map((p: any) => p.image_url)); })
      .catch(() => {});
    startCarousel();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (editTimerRef.current) clearInterval(editTimerRef.current);
    };
  }, [startCarousel]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  // ── "Just Exploring" — load preview vendors ──────────────────────────────
  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const r = await fetch(`${BACKEND}/api/v2/preview-vendors`);
      const d = await r.json();
      if (d.success && d.data?.length) {
        setPreviewVendors(d.data);
      } else {
        // No preview vendors curated — skip to nudge
        setPreviewDone(true);
      }
    } catch { setPreviewDone(true); }
    setLoadingPreview(false);
  }, []);

  const startExploring = () => {
    setScreen('exploring');
    setPreviewIdx(0);
    setPreviewDone(false);
    loadPreview();
  };

  const nextPreview = () => {
    if (previewIdx >= previewVendors.length - 1) {
      setPreviewDone(true);
    } else {
      setPreviewIdx(i => i + 1);
    }
  };

  // ── Request form submit ───────────────────────────────────────────────────
  const submitRequest = async (isEdit = false) => {
    if (!reqPhone.trim() || submitting) return;
    setSubmitting(true);
    try {
      const payload: any = {
        phone: reqPhone.replace(/\\D/g, ''),
        instagram: reqInstagram || null,
        role: role === 'Dreamer' ? 'dreamer' : 'maker',
        name: reqName || null,
      };
      if (role === 'Maker') {
        payload.category = reqCategory;
        payload.category_other = reqCategory === 'Other' ? reqCategoryOther : null;
      }
      if (dateStatus === 'exact' && exactDate) {
        payload.wedding_date = exactDate;
        payload.wedding_date_status = 'exact';
      } else if (dateStatus === 'season' && season) {
        payload.wedding_date_season = season;
        payload.wedding_date_status = 'season';
      } else if (dateStatus === 'browsing') {
        payload.wedding_date_status = 'browsing';
      }

      await fetch(`${BACKEND}/api/v2/waitlist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!isEdit) {
        setScreen('request_done');
        // 60-second edit window countdown
        setEditSecondsLeft(60);
        editTimerRef.current = setInterval(() => {
          setEditSecondsLeft(s => {
            if (s <= 1) { clearInterval(editTimerRef.current!); return 0; }
            return s - 1;
          });
        }, 1000);
      } else {
        showToast('Details updated.');
      }
    } catch { showToast('Could not submit. Try again.'); }
    setSubmitting(false);
  };

  // ── OTP / PIN (preserved from original) ──────────────────────────────────
  const handleOtpInput = (i: number, val: string) => {
    const n = [...otp]; n[i] = val.slice(-1); setOtp(n);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const sendOtp = async (phoneNum: string) => {
    try {
      const r = await fetch(`${BACKEND}/api/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNum.replace(/\\D/g, '') }),
      });
      const d = await r.json();
      if (d.sessionInfo) localStorage.setItem('otp_session', d.sessionInfo);
      setScreen(screen === 'signin_phone' ? 'signin_otp' : 'invite_otp');
    } catch { showToast('Could not send code. Try again.'); }
  };

  const verifyOtp = async () => {
    try {
      const isVendor = role === 'Maker';
      const res = await fetch(`${BACKEND}/api/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionInfo: localStorage.getItem('otp_session') || 'admin_sdk_' + phone.replace(/\\D/g, ''),
          code: otp.join(''),
        }),
      });
      const d = await res.json();
      if (d.success) {
        const sessionKey = isVendor ? 'vendor_web_session' : 'couple_web_session';
        const cleanPhone = phone.replace(/\\D/g, '').slice(-10);
        let supabaseId = d.localId;
        let pinSet = false;
        let upsertData: any = null;
        try {
          const upsertRes = await fetch(`${BACKEND}/api/v2/${isVendor ? 'vendor' : 'couple'}/upsert`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanPhone, tier: 'essential', invite_code: inviteCode }),
          });
          upsertData = await upsertRes.json();
          if (upsertData.success) {
            supabaseId = upsertData.vendorId || upsertData.userId || supabaseId;
            pinSet = !!upsertData.pin_set;
          }
        } catch {}
        const sessionData = {
          idToken: d.idToken, localId: supabaseId,
          phoneNumber: d.phoneNumber, vendorId: supabaseId,
          userId: supabaseId, id: supabaseId, phone: cleanPhone,
          pin_set: pinSet,
          dreamer_type: upsertData?.dreamer_type || 'basic',
          name: upsertData?.name || null,
        };
        localStorage.setItem(sessionKey, JSON.stringify(sessionData));
        localStorage.setItem(isVendor ? 'vendor_session' : 'couple_session', JSON.stringify(sessionData));
        router.push(pinSet
          ? (isVendor ? '/vendor/pin-login' : '/couple/pin-login')
          : (isVendor ? '/vendor/pin' : '/couple/pin'));
      } else {
        showToast(d.error || 'Incorrect code.');
      }
    } catch { showToast('Verification failed.'); }
  };

  // ── Sign in (returning member) ────────────────────────────────────────────
  const handleSignIn = async () => {
    const cleanPhone = phone.replace(/\\D/g, '').slice(-10);
    try {
      const r = await fetch(`${BACKEND}/api/v2/auth/pin-status?userId=_&role=${role === 'Dreamer' ? 'couple' : 'vendor'}&phone=${cleanPhone}`);
      const d = await r.json();
      if (d.pin_set) {
        const isVendor = role === 'Maker';
        const sessionKey = isVendor ? 'vendor_web_session' : 'couple_web_session';
        const existing = JSON.parse(localStorage.getItem(sessionKey) || '{}');
        const sd = { ...existing, phone: cleanPhone, pin_set: true, id: d.userId || cleanPhone, userId: d.userId || cleanPhone, vendorId: d.userId || cleanPhone };
        localStorage.setItem(sessionKey, JSON.stringify(sd));
        localStorage.setItem(isVendor ? 'vendor_session' : 'couple_session', JSON.stringify(sd));
        router.push(isVendor ? '/vendor/pin-login' : '/couple/pin-login');
        return;
      }
    } catch {}
    sendOtp(phone);
  };

  const S: React.CSSProperties = { position: 'absolute', inset: 0 };
  const ease = 'cubic-bezier(0.22,1,0.36,1)';

  const currentVendor = previewVendors[previewIdx];
  const vendorPhoto = currentVendor
    ? (currentVendor.featured_photos?.[0] || currentVendor.portfolio_images?.[0] || null)
    : null;

  const MAKER_CATEGORIES = ['Photographer', 'MUA', 'Designer', 'Jeweller', 'Venue', 'Decorator', 'Event Manager', 'Choreographer', 'Other'];
  const SEASONS = [
    { key: 'jan_mar', label: 'Jan – Mar' },
    { key: 'apr_jun', label: 'Apr – Jun' },
    { key: 'jul_sep', label: 'Jul – Sep' },
    { key: 'oct_jan', label: 'Oct – Jan' },
  ];

  return (
    <div style={{ ...S, overflow: 'hidden', background: '#0C0A09' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(248,247,245,0.3); }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.4); }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Carousel ─────────────────────────────────────────────────────── */}
      {slides.map((url, i) => (
        <div key={i} style={{
          ...S,
          backgroundImage: `url(${url})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: i === cur ? 1 : 0,
          transition: `opacity 3s ${ease}`,
          willChange: 'opacity',
          // Blur when a glass panel is active
          filter: screen !== 'exploring' ? 'blur(4px)' : 'none',
          transform: 'scale(1.04)', // slight scale to hide blur edges
        }} />
      ))}

      {/* ── Vignette ──────────────────────────────────────────────────────── */}
      <div style={{
        ...S, zIndex: 2, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 60%, transparent 20%, rgba(0,0,0,0.55) 100%)',
      }} />

      {/* ── Dark overlay for non-exploring screens ────────────────────────── */}
      {screen !== 'exploring' && (
        <div style={{ ...S, zIndex: 3, background: 'rgba(12,10,9,0.35)', pointerEvents: 'none' }} />
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)',
          border: '0.5px solid rgba(255,255,255,0.2)',
          padding: '10px 20px', zIndex: 100,
          fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: 13,
          color: '#F8F7F5', whiteSpace: 'nowrap', borderRadius: 100,
        }}>{toast}</div>
      )}

      {/* ── Motto — always at top ─────────────────────────────────────────── */}
      {screen !== 'exploring' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          padding: '20px 24px', textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
            fontWeight: 300, fontSize: 16, color: '#C9A84C',
            letterSpacing: '0.04em', lineHeight: 1.6, margin: 0,
          }}>{MOTTO}</p>
        </div>
      )}

      {/* ── Glass panel — centred on screen ───────────────────────────────── */}
      {screen !== 'exploring' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '80px 24px 40px',
        }}>
          <div style={{ ...GLASS, width: '100%', maxWidth: 400, padding: '28px 24px 32px' }}>

            {/* ── ENTRY PANEL ──────────────────────────────────────────────── */}
            {screen === 'entry' && (
              <>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
                  fontSize: 32, color: '#F8F7F5', margin: '0 0 6px', lineHeight: 1.1,
                }}>The Dream Wedding</p>
                <p style={{
                  fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 8,
                  letterSpacing: '0.3em', textTransform: 'uppercase',
                  color: 'rgba(248,247,245,0.4)', margin: '0 0 28px',
                }}>THE CURATED WEDDING OS</p>

                <DotOption
                  label="Yes — I have an invite"
                  selected={false}
                  onSelect={() => { setRole(null); setScreen('invite_code'); }}
                />
                <DotOption
                  label="No — I'd like one"
                  selected={false}
                  onSelect={() => setScreen('request_who')}
                />
                <DotOption
                  label="Just exploring"
                  sublabel="See what's possible"
                  selected={false}
                  onSelect={startExploring}
                />

                <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.1)', margin: '20px 0 14px' }} />
                <button onClick={() => { setRole(null); setScreen('signin_phone'); }} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 200,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: 'rgba(248,247,245,0.35)', width: '100%',
                }}>Already a member — Sign in</button>
              </>
            )}

            {/* ── REQUEST: WHO ARE YOU ──────────────────────────────────────── */}
            {screen === 'request_who' && (
              <>
                <BackBtn onClick={() => setScreen('entry')} />
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
                  fontSize: 26, color: '#F8F7F5', margin: '0 0 20px', lineHeight: 1.15,
                }}>Request an invite.</p>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                  color: 'rgba(248,247,245,0.6)', margin: '0 0 20px',
                }}>Are you a:</p>
                <DotOption
                  label="Dreamer"
                  sublabel="Planning a wedding"
                  selected={role === 'Dreamer'}
                  onSelect={() => setRole('Dreamer')}
                />
                <DotOption
                  label="Maker"
                  sublabel="A wedding professional"
                  selected={role === 'Maker'}
                  onSelect={() => setRole('Maker')}
                />
                <GoldBtn
                  label="Continue →"
                  onClick={() => setScreen(role === 'Dreamer' ? 'request_dreamer' : 'request_maker')}
                  disabled={!role}
                />
              </>
            )}

            {/* ── REQUEST: DREAMER FORM ─────────────────────────────────────── */}
            {screen === 'request_dreamer' && (
              <div style={{ overflowY: 'auto', maxHeight: '70vh' }}>
                <BackBtn onClick={() => setScreen('request_who')} />
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 26, color: '#F8F7F5', margin: '0 0 20px' }}>Your details.</p>

                <Label text="Your name" />
                <input value={reqName} onChange={e => setReqName(e.target.value)} placeholder="Full name" style={INPUT} />

                <Label text="Phone" />
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.3)', marginBottom: 16 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(248,247,245,0.5)', paddingRight: 10, borderRight: '1px solid rgba(255,255,255,0.2)', marginRight: 10, whiteSpace: 'nowrap' }}>🇮🇳 +91</span>
                  <input value={reqPhone} onChange={e => setReqPhone(e.target.value.replace(/\\D/g, '').slice(0, 10))} type="tel" maxLength={10} placeholder="00000 00000" style={{ ...INPUT, marginBottom: 0, borderBottom: 'none', flex: 1 }} />
                </div>

                <Label text="Instagram" />
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.3)', marginBottom: 16 }}>
                  <input value={reqInstagram} onChange={e => setReqInstagram(e.target.value)} placeholder="@yourhandle" style={{ ...INPUT, marginBottom: 0, borderBottom: 'none', flex: 1 }} />
                  <a href="instagram://user?username=" target="_blank" rel="noreferrer" style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, color: '#C9A84C', textDecoration: 'none', flexShrink: 0, marginLeft: 8 }}>Open IG →</a>
                </div>

                <Label text="Wedding date" />
                <DotOption label="Yes — I know the date" selected={dateStatus === 'exact'} onSelect={() => setDateStatus('exact')} />
                {dateStatus === 'exact' && (
                  <input type="date" value={exactDate} onChange={e => setExactDate(e.target.value)} style={{ ...INPUT, marginTop: 8 }} />
                )}
                <DotOption label="Roughly — a season" selected={dateStatus === 'season'} onSelect={() => setDateStatus('season')} />
                {dateStatus === 'season' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '8px 0 8px' }}>
                    {SEASONS.map(s => (
                      <button key={s.key} onClick={() => setSeason(s.key as Season)} style={{
                        padding: '10px 0', borderRadius: 8, border: 'none',
                        background: season === s.key ? '#C9A84C' : 'rgba(255,255,255,0.08)',
                        color: season === s.key ? '#0C0A09' : 'rgba(248,247,245,0.7)',
                        fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300,
                        letterSpacing: '0.1em', cursor: 'pointer',
                      }}>{s.label}</button>
                    ))}
                  </div>
                )}
                <DotOption label="Just browsing" selected={dateStatus === 'browsing'} onSelect={() => setDateStatus('browsing')} />

                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(248,247,245,0.4)', margin: '8px 0 0', fontStyle: 'italic' }}>
                  Helps us recommend Makers available around your dates.
                </p>

                <GoldBtn label={submitting ? 'Submitting...' : 'Request Invite →'} onClick={() => submitRequest()} disabled={!reqPhone.trim() || submitting} />
              </div>
            )}

            {/* ── REQUEST: MAKER FORM ───────────────────────────────────────── */}
            {screen === 'request_maker' && (
              <div style={{ overflowY: 'auto', maxHeight: '70vh' }}>
                <BackBtn onClick={() => setScreen('request_who')} />
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 26, color: '#F8F7F5', margin: '0 0 20px' }}>Your details.</p>

                <Label text="Business / studio name" />
                <input value={reqName} onChange={e => setReqName(e.target.value)} placeholder="Your name or studio" style={INPUT} />

                <Label text="Phone" />
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.3)', marginBottom: 16 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(248,247,245,0.5)', paddingRight: 10, borderRight: '1px solid rgba(255,255,255,0.2)', marginRight: 10, whiteSpace: 'nowrap' }}>🇮🇳 +91</span>
                  <input value={reqPhone} onChange={e => setReqPhone(e.target.value.replace(/\\D/g, '').slice(0, 10))} type="tel" maxLength={10} placeholder="00000 00000" style={{ ...INPUT, marginBottom: 0, borderBottom: 'none', flex: 1 }} />
                </div>

                <Label text="Instagram" />
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.3)', marginBottom: 16 }}>
                  <input value={reqInstagram} onChange={e => setReqInstagram(e.target.value)} placeholder="@yourhandle" style={{ ...INPUT, marginBottom: 0, borderBottom: 'none', flex: 1 }} />
                  <a href="instagram://user?username=" target="_blank" rel="noreferrer" style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, color: '#C9A84C', textDecoration: 'none', flexShrink: 0, marginLeft: 8 }}>Open IG →</a>
                </div>

                <Label text="Category" />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {MAKER_CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setReqCategory(cat)} style={{
                      padding: '6px 12px', borderRadius: 100, border: 'none',
                      background: reqCategory === cat ? '#C9A84C' : 'rgba(255,255,255,0.08)',
                      color: reqCategory === cat ? '#0C0A09' : 'rgba(248,247,245,0.7)',
                      fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                      letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                    }}>{cat}</button>
                  ))}
                </div>
                {reqCategory === 'Other' && (
                  <>
                    <Label text="Tell us your speciality" />
                    <input value={reqCategoryOther} onChange={e => setReqCategoryOther(e.target.value)} placeholder="e.g. Mehndi artist" style={INPUT} />
                  </>
                )}

                <GoldBtn label={submitting ? 'Submitting...' : 'Request Invite →'} onClick={() => submitRequest()} disabled={!reqPhone.trim() || submitting} />
              </div>
            )}

            {/* ── REQUEST: DONE + 60s EDIT WINDOW ──────────────────────────── */}
            {screen === 'request_done' && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: 38, color: '#F8F7F5', margin: '0 0 12px' }}>Received.</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: 'rgba(248,247,245,0.6)', lineHeight: 1.7, margin: '0 0 8px' }}>
                  We verify every profile personally.<br />We'll reach out on Instagram or WhatsApp.
                </p>

                {/* 60-second edit window */}
                {editSecondsLeft > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{
                      height: 2, background: 'rgba(255,255,255,0.1)',
                      borderRadius: 1, overflow: 'hidden', marginBottom: 10,
                    }}>
                      <div style={{
                        height: '100%', background: '#C9A84C', borderRadius: 1,
                        width: `${(editSecondsLeft / 60) * 100}%`,
                        transition: 'width 1s linear',
                      }} />
                    </div>
                    <button
                      onClick={() => setScreen(role === 'Dreamer' ? 'request_dreamer' : 'request_maker')}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                        color: 'rgba(248,247,245,0.5)', fontStyle: 'italic',
                      }}
                    >Made a mistake? Edit your details → ({editSecondsLeft}s)</button>
                  </div>
                )}
              </div>
            )}

            {/* ── INVITE: ENTER CODE ────────────────────────────────────────── */}
            {screen === 'invite_code' && (
              <>
                <BackBtn onClick={() => setScreen('entry')} />
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 26, color: '#F8F7F5', margin: '0 0 6px' }}>Enter your invite.</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(248,247,245,0.5)', margin: '0 0 24px' }}>Your code unlocks access.</p>

                <Label text="Are you a" />
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  {(['Dreamer', 'Maker'] as Role[]).map(r => (
                    <button key={r} onClick={() => setRole(r)} style={{
                      flex: 1, height: 40, border: 'none', borderRadius: 100, cursor: 'pointer',
                      background: role === r ? '#C9A84C' : 'rgba(255,255,255,0.08)',
                      color: role === r ? '#0C0A09' : 'rgba(248,247,245,0.6)',
                      fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                      letterSpacing: '0.15em', textTransform: 'uppercase',
                    }}>{r}</button>
                  ))}
                </div>

                <Label text="Invite code" />
                <input
                  value={inviteCode}
                  onChange={e => { setInviteCode(e.target.value.toUpperCase()); setInviteError(''); }}
                  type="text" maxLength={8} placeholder="XXXXXX"
                  style={{ ...INPUT, textAlign: 'center', letterSpacing: '0.2em', fontSize: 20 }}
                />
                {inviteError && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#E57373', margin: '0 0 12px', textAlign: 'center' }}>{inviteError}</p>}

                <GoldBtn label="Continue →" onClick={async () => {
                  if (!inviteCode.trim() || !role) { setInviteError('Select Dreamer or Maker and enter your code.'); return; }
                  try {
                    const r = await fetch(`${BACKEND}/api/v2/invite/validate`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ code: inviteCode.trim(), role: role === 'Dreamer' ? 'dreamer' : 'vendor' }),
                    });
                    const d = await r.json();
                    if (d.valid) setScreen('invite_phone');
                    else setInviteError(d.error || 'Invalid or expired code.');
                  } catch { setInviteError('Could not verify code. Try again.'); }
                }} disabled={!inviteCode.trim() || !role} />
              </>
            )}

            {/* ── INVITE: PHONE ─────────────────────────────────────────────── */}
            {screen === 'invite_phone' && (
              <>
                <BackBtn onClick={() => setScreen('invite_code')} />
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 26, color: '#F8F7F5', margin: '0 0 6px' }}>Welcome. Let's begin.</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(248,247,245,0.5)', margin: '0 0 24px' }}>Enter your number. We'll send a code.</p>
                <Label text="Phone number" />
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.3)', marginBottom: 20 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(248,247,245,0.5)', paddingRight: 10, borderRight: '1px solid rgba(255,255,255,0.2)', marginRight: 10 }}>🇮🇳 +91</span>
                  <input value={phone} onChange={e => setPhone(e.target.value.replace(/\\D/g, '').slice(0, 10))} type="tel" maxLength={10} placeholder="00000 00000" style={{ ...INPUT, borderBottom: 'none', marginBottom: 0, flex: 1 }} />
                </div>
                <GoldBtn label="Send code →" onClick={() => sendOtp(phone)} disabled={phone.length < 10} />
              </>
            )}

            {/* ── OTP ENTRY ─────────────────────────────────────────────────── */}
            {(screen === 'invite_otp' || screen === 'signin_otp') && (
              <>
                <BackBtn onClick={() => setScreen(screen === 'invite_otp' ? 'invite_phone' : 'signin_phone')} />
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 26, color: '#F8F7F5', margin: '0 0 6px' }}>Check your messages.</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(248,247,245,0.5)', margin: '0 0 28px' }}>Enter the 6-digit code we sent you.</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
                  {otp.map((v, i) => (
                    <input
                      key={i} ref={el => { otpRefs.current[i] = el; }}
                      value={v} onChange={e => handleOtpInput(i, e.target.value)}
                      onKeyDown={e => handleOtpKey(i, e)}
                      type="tel" maxLength={1}
                      style={{
                        width: 40, height: 48, border: 'none',
                        borderBottom: '1.5px solid rgba(255,255,255,0.4)',
                        background: 'transparent', outline: 'none',
                        fontFamily: "'DM Sans', sans-serif", fontWeight: 400,
                        fontSize: 20, color: '#F8F7F5', textAlign: 'center',
                      }}
                    />
                  ))}
                </div>
                <GoldBtn label="Verify →" onClick={verifyOtp} disabled={otp.join('').length < 6} />
              </>
            )}

            {/* ── SIGN IN: PHONE ────────────────────────────────────────────── */}
            {screen === 'signin_phone' && (
              <>
                <BackBtn onClick={() => setScreen('entry')} />
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 26, color: '#F8F7F5', margin: '0 0 6px' }}>Welcome back.</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(248,247,245,0.5)', margin: '0 0 20px' }}>Are you a:</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  {(['Dreamer', 'Maker'] as Role[]).map(r => (
                    <button key={r} onClick={() => setRole(r)} style={{
                      flex: 1, height: 40, border: 'none', borderRadius: 100, cursor: 'pointer',
                      background: role === r ? '#C9A84C' : 'rgba(255,255,255,0.08)',
                      color: role === r ? '#0C0A09' : 'rgba(248,247,245,0.6)',
                      fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                      letterSpacing: '0.15em', textTransform: 'uppercase',
                    }}>{r}</button>
                  ))}
                </div>
                <Label text="Phone number" />
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.3)', marginBottom: 20 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(248,247,245,0.5)', paddingRight: 10, borderRight: '1px solid rgba(255,255,255,0.2)', marginRight: 10 }}>🇮🇳 +91</span>
                  <input value={phone} onChange={e => setPhone(e.target.value.replace(/\\D/g, '').slice(0, 10))} type="tel" maxLength={10} placeholder="00000 00000" style={{ ...INPUT, borderBottom: 'none', marginBottom: 0, flex: 1 }} />
                </div>
                <GoldBtn label="Continue →" onClick={handleSignIn} disabled={phone.length < 10 || !role} />
              </>
            )}

          </div>
        </div>
      )}

      {/* ── "JUST EXPLORING" — BLIND SWIPE PREVIEW ───────────────────────── */}
      {screen === 'exploring' && (
        <div style={{ ...S, zIndex: 20 }}>
          {loadingPreview && (
            <div style={{ ...S, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 20, color: 'rgba(248,247,245,0.6)' }}>Loading...</p>
            </div>
          )}

          {!loadingPreview && !previewDone && currentVendor && (
            <>
              {/* Vendor photo full screen */}
              {vendorPhoto && (
                <div style={{
                  ...S,
                  backgroundImage: `url(${vendorPhoto})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                }} />
              )}
              <div style={{ ...S, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)', pointerEvents: 'none' }} />

              {/* Back button */}
              <button onClick={() => setScreen('entry')} style={{
                position: 'absolute', top: 20, left: 20, zIndex: 30,
                background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%',
                width: 40, height: 40, color: '#F8F7F5', fontSize: 18, cursor: 'pointer',
              }}>←</button>

              {/* Progress dots */}
              <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4, zIndex: 30 }}>
                {previewVendors.map((_, i) => (
                  <div key={i} style={{
                    width: i === previewIdx ? 16 : 4, height: 4, borderRadius: 2,
                    background: i === previewIdx ? '#C9A84C' : 'rgba(255,255,255,0.3)',
                    transition: 'width 300ms ease',
                  }} />
                ))}
              </div>

              {/* Vendor info card — blind (no name) */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30, padding: '0 20px 40px' }}>
                <div style={{ ...GLASS, padding: '18px 20px' }}>
                  <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(248,247,245,0.5)', margin: '0 0 4px' }}>
                    {currentVendor.category} · {currentVendor.city}
                  </p>
                  {currentVendor.vibe_tags && currentVendor.vibe_tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
                      {currentVendor.vibe_tags.slice(0, 3).map(tag => (
                        <span key={tag} style={{
                          fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300,
                          letterSpacing: '0.1em', padding: '3px 9px', borderRadius: 100,
                          background: 'rgba(201,168,76,0.15)', color: '#C9A84C',
                        }}>{tag}</span>
                      ))}
                    </div>
                  )}
                  {currentVendor.starting_price && (
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: '#F8F7F5', margin: '6px 0 0' }}>
                      from ₹{Number(currentVendor.starting_price).toLocaleString('en-IN')}
                    </p>
                  )}
                  <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, color: 'rgba(248,247,245,0.4)', margin: '6px 0 0', letterSpacing: '0.1em' }}>
                    Reveal name by spending a token after you join
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button onClick={nextPreview} style={{
                      flex: 1, height: 44, background: '#C9A84C', border: 'none',
                      borderRadius: 100, cursor: 'pointer',
                      fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
                      letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0C0A09',
                    }}>
                      {previewIdx >= previewVendors.length - 1 ? 'Finish' : `Next (${previewIdx + 1}/${previewVendors.length})`}
                    </button>
                    <button onClick={() => setScreen('request_who')} style={{
                      height: 44, padding: '0 16px', background: 'transparent',
                      border: '0.5px solid rgba(248,247,245,0.3)', borderRadius: 100, cursor: 'pointer',
                      fontFamily: "'Jost', sans-serif", fontSize: 9, color: 'rgba(248,247,245,0.6)',
                    }}>Request invite</button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* After 10th card — nudge */}
          {!loadingPreview && previewDone && (
            <div style={{ ...S, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
              <div style={{ ...GLASS, width: '100%', maxWidth: 400, padding: '32px 24px', textAlign: 'center' }}>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: 26, color: '#F8F7F5', margin: '0 0 12px', lineHeight: 1.2 }}>
                  Like what you see?
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: 'rgba(248,247,245,0.6)', margin: '0 0 28px', lineHeight: 1.6 }}>
                  You've seen what's possible. Every Maker on TDW is personally curated.
                </p>
                <GoldBtn label="Request an Invite →" onClick={() => setScreen('request_who')} />
                <GhostBtn label="← Back" onClick={() => setScreen('entry')} />
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
"""

with open('web/app/page.tsx', 'w') as f:
    f.write(LANDING_PAGE)
changes.append('✓ Change 1: web/app/page.tsx — full landing page rewrite (glassmorphism, 3 paths, preview, 60s edit)')


# ═════════════════════════════════════════════════════════════════════════════
# CHANGE 2 — Create admin/preview/page.tsx
# Admin curates which 10 vendors appear in the "Just Exploring" preview.
# Simple: search for approved vendors, drag them into 10 numbered slots.
# ═════════════════════════════════════════════════════════════════════════════

PREVIEW_ADMIN_PAGE = """\
'use client';
// Admin: Preview Vendors
// Curate which 10 vendor cards appear in the "Just Exploring" blind swipe
// preview on the landing page. Vendors must be approved (is_approved = true).
// Order matters — slot 1 shows first.
import { useEffect, useState, useCallback } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const H   = { 'Content-Type': 'application/json', 'x-admin-password': 'Mira@2551354' };

interface SlottedVendor { id: string; name: string; category: string; city: string; display_order: number; }
interface AvailableVendor { id: string; name: string; category: string; city: string; tier: string; }

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#F8F7F5', fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: '10px 20px', borderRadius: 100, zIndex: 9999, whiteSpace: 'nowrap' }}>{msg}</div>;
}

export default function PreviewVendorsPage() {
  const [slots, setSlots]     = useState<(SlottedVendor | null)[]>(Array(10).fill(null));
  const [available, setAvailable] = useState<AvailableVendor[]>([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [slotsRes, vendorsRes] = await Promise.all([
        fetch(`${API}/api/v2/admin/preview-vendors`, { headers: H }),
        fetch(`${API}/api/v3/admin/makers?limit=200`, { headers: H }),
      ]);
      const slotsData   = await slotsRes.json();
      const vendorsData = await vendorsRes.json();

      // Build slots array
      const filled: (SlottedVendor | null)[] = Array(10).fill(null);
      (slotsData.data || []).forEach((v: SlottedVendor) => {
        const idx = v.display_order - 1;
        if (idx >= 0 && idx < 10) filled[idx] = v;
      });
      setSlots(filled);

      // Available = approved vendors not already in slots
      const slottedIds = new Set((slotsData.data || []).map((v: SlottedVendor) => v.id));
      setAvailable((vendorsData.data || []).filter((v: AvailableVendor & { is_approved?: boolean }) =>
        v.is_approved && !slottedIds.has(v.id)
      ));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addToSlot = (vendor: AvailableVendor) => {
    const firstEmpty = slots.findIndex(s => s === null);
    if (firstEmpty === -1) { showToast('All 10 slots are full. Remove one first.'); return; }
    const newSlots = [...slots];
    newSlots[firstEmpty] = { ...vendor, display_order: firstEmpty + 1 };
    setSlots(newSlots);
    setAvailable(prev => prev.filter(v => v.id !== vendor.id));
  };

  const removeFromSlot = (idx: number) => {
    const vendor = slots[idx];
    if (!vendor) return;
    const newSlots = [...slots];
    newSlots[idx] = null;
    setSlots(newSlots);
    setAvailable(prev => [...prev, vendor]);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const newSlots = [...slots];
    [newSlots[idx - 1], newSlots[idx]] = [newSlots[idx], newSlots[idx - 1]];
    setSlots(newSlots);
  };

  const moveDown = (idx: number) => {
    if (idx === 9) return;
    const newSlots = [...slots];
    [newSlots[idx], newSlots[idx + 1]] = [newSlots[idx + 1], newSlots[idx]];
    setSlots(newSlots);
  };

  const save = async () => {
    setSaving(true);
    try {
      const ids = slots.filter(Boolean).map(v => v!.id);
      const r = await fetch(`${API}/api/v2/admin/preview-vendors`, {
        method: 'POST', headers: H,
        body: JSON.stringify({ vendor_ids: ids }),
      });
      const d = await r.json();
      if (d.success) showToast(`✓ Saved ${d.count} preview vendors`);
      else showToast(d.error || 'Save failed');
    } catch { showToast('Network error'); }
    setSaving(false);
  };

  const filtered = search
    ? available.filter(v => v.name?.toLowerCase().includes(search.toLowerCase()) || v.category?.toLowerCase().includes(search.toLowerCase()))
    : available;

  const filledCount = slots.filter(Boolean).length;

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 4px' }}>PLATFORM</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: 32, color: '#111', margin: 0 }}>
            Preview Vendors
            <span style={{ fontSize: 16, color: '#888580', marginLeft: 10 }}>({filledCount}/10 slots filled)</span>
          </p>
          <button onClick={save} disabled={saving} style={{
            height: 44, padding: '0 24px', background: '#111', color: '#F8F7F5', border: 'none',
            borderRadius: 100, cursor: saving ? 'default' : 'pointer',
            fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300,
            letterSpacing: '0.18em', textTransform: 'uppercase', opacity: saving ? 0.5 : 1,
          }}>{saving ? 'Saving...' : 'Save Preview →'}</button>
        </div>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#888580', margin: '8px 0 0' }}>
          These 10 vendors appear in the "Just Exploring" blind swipe preview on the landing page. Only approved vendors can be selected.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* Left: 10 slots */}
        <div>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>PREVIEW ORDER</p>
          {slots.map((vendor, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
              background: vendor ? '#FFFFFF' : '#F8F7F5',
              border: `0.5px solid ${vendor ? '#E2DED8' : '#EEECE8'}`,
              borderRadius: 10, padding: '10px 12px',
            }}>
              {/* Slot number */}
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, fontWeight: 200, color: '#C8C4BE', minWidth: 16, textAlign: 'right' }}>{idx + 1}</span>

              {vendor ? (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontWeight: 300, color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vendor.name}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: '#888580', margin: 0 }}>{vendor.category} · {vendor.city}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ width: 26, height: 26, border: '0.5px solid #E2DED8', borderRadius: 4, background: 'transparent', cursor: idx === 0 ? 'default' : 'pointer', color: '#888580', fontSize: 12, opacity: idx === 0 ? 0.3 : 1 }}>↑</button>
                    <button onClick={() => moveDown(idx)} disabled={idx === 9 || !slots[idx + 1]} style={{ width: 26, height: 26, border: '0.5px solid #E2DED8', borderRadius: 4, background: 'transparent', cursor: 'pointer', color: '#888580', fontSize: 12, opacity: (idx === 9 || !slots[idx + 1]) ? 0.3 : 1 }}>↓</button>
                    <button onClick={() => removeFromSlot(idx)} style={{ width: 26, height: 26, border: '0.5px solid #E2DED8', borderRadius: 4, background: 'transparent', cursor: 'pointer', color: '#E57373', fontSize: 14 }}>✕</button>
                  </div>
                </>
              ) : (
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#C8C4BE', fontStyle: 'italic', margin: 0, flex: 1 }}>Empty slot — add a vendor from the right</p>
              )}
            </div>
          ))}
        </div>

        {/* Right: available vendors */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: 0 }}>APPROVED VENDORS ({available.length})</p>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or category..."
            style={{ width: '100%', height: 36, padding: '0 12px', border: '0.5px solid #E2DED8', borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#111', outline: 'none', marginBottom: 10 }}
          />
          {loading ? (
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#888580' }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#888580', fontStyle: 'italic' }}>
              {available.length === 0 ? 'No approved vendors yet. Approve vendors from Discovery Approvals.' : 'No results.'}
            </p>
          ) : (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {filtered.map(v => (
                <div key={v.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: '#FFFFFF', border: '0.5px solid #E2DED8',
                  borderRadius: 10, marginBottom: 6, gap: 10,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontWeight: 300, color: '#111', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: '#888580', margin: 0 }}>{v.category} · {v.city}</p>
                  </div>
                  <button onClick={() => addToSlot(v)} disabled={filledCount >= 10} style={{
                    height: 32, padding: '0 12px', background: filledCount >= 10 ? '#F4F1EC' : '#C9A84C',
                    border: 'none', borderRadius: 100, cursor: filledCount >= 10 ? 'default' : 'pointer',
                    fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: filledCount >= 10 ? '#888580' : '#111', flexShrink: 0,
                  }}>+ Add</button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
"""

os.makedirs('web/app/admin/preview', exist_ok=True)
with open('web/app/admin/preview/page.tsx', 'w') as f:
    f.write(PREVIEW_ADMIN_PAGE)
changes.append('✓ Change 2: Created web/app/admin/preview/page.tsx — curate 10 preview vendor slots')


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 3 — Add "Preview Vendors" to admin nav under PLATFORM
# ─────────────────────────────────────────────────────────────────────────────
LAYOUT_PATH = 'web/app/admin/layout.tsx'
with open(LAYOUT_PATH, 'r') as f:
    layout = f.read()

OLD_PLATFORM = """  { group: 'PLATFORM', items: [
    { label: 'Cover Placement', path: '/admin/cover', icon: '⬡' },
    { label: 'Messages', path: '/admin/messages', icon: '💬' },
    { label: 'Image Approvals', path: '/admin/images', icon: '⬡' },
    { label: 'Featured', path: '/admin/featured', icon: '★' },
  ]},"""

NEW_PLATFORM = """  { group: 'PLATFORM', items: [
    { label: 'Cover Placement',  path: '/admin/cover',    icon: '⬡' },
    { label: 'Preview Vendors',  path: '/admin/preview',  icon: '◈' },
    { label: 'Messages',         path: '/admin/messages', icon: '💬' },
    { label: 'Image Approvals',  path: '/admin/images',   icon: '⬡' },
    { label: 'Featured',         path: '/admin/featured', icon: '★' },
  ]},"""

if OLD_PLATFORM in layout:
    layout = layout.replace(OLD_PLATFORM, NEW_PLATFORM)
    with open(LAYOUT_PATH, 'w') as f:
        f.write(layout)
    changes.append('✓ Change 3: "Preview Vendors" added to admin nav under PLATFORM')
else:
    changes.append('✗ Change 3 FAILED — admin nav PLATFORM pattern not found')


# ─────────────────────────────────────────────────────────────────────────────
# Report
# ─────────────────────────────────────────────────────────────────────────────
print('\nPhase 9 — Frontend patch complete\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Phase 9: landing page rewrite — glassmorphism, 3 paths, preview, 60s edit window" && git push')
