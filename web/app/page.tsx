'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND = 'https://dream-wedding-production-89ae.up.railway.app';

const FALLBACK_SLIDES = [
  
  
  
  
  
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

interface ExploringPhoto {
  id: string;
  image_url: string;
  display_order: number;
  caption: string | null;
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
  const [exploringPhotos, setExploringPhotos] = useState<ExploringPhoto[]>([]);
  const [exploringIdx, setExploringIdx] = useState(0);
  const [exploringDone, setExploringDone] = useState(false);
  const [entryExpanded, setEntryExpanded] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => { slidesRef.current = slides; }, [slides]);

  // Reset OTP digits whenever OTP screen appears
  useEffect(() => {
    if (screen === 'signin_otp' || screen === 'invite_otp') {
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    }
  }, [screen]);

  // ── Vendor subdomain auto-routing ─────────────────────────────────────────
  // If on vendor.thedreamwedding.in, pre-select Maker and skip to sign-in.
  // Vendors sharing the link or refreshing mid-session land directly on the
  // phone entry screen with the correct role already locked — no tap required.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hostname = window.location.hostname;
    if (hostname === 'vendor.thedreamwedding.in' || hostname.startsWith('vendor.')) {
      setRole('Maker');
      setScreen('signin_phone');
    }
  }, []);

  const startCarousel = useCallback(() => {
    if (intervalRef.current) return; // already running — preserve slide position
    intervalRef.current = setInterval(() => setCur(c => (c + 1) % slidesRef.current.length), 4000);
  }, []);

  const pauseCarousel = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Pause carousel when exploring screen is active — prevents bleed-through
  useEffect(() => {
    if (screen === 'exploring') {
      pauseCarousel();
    } else {
      startCarousel();
    }
  }, [screen, pauseCarousel, startCarousel]);

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

  // ── "Just Exploring" — load editorial photos, fall back to vendor photos ──
  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    setExploringIdx(0);
    setExploringDone(false);
    try {
      const r = await fetch(`${BACKEND}/api/v2/exploring-photos`);
      const d = await r.json();
      if (d.success && d.photos?.length) {
        setExploringPhotos(d.photos);
      } else {
        // No curated editorial photos yet — fall back to vendor preview photos
        const r2 = await fetch(`${BACKEND}/api/v2/preview-vendors`);
        const d2 = await r2.json();
        if (d2.success && d2.data?.length) {
          const fallback = d2.data
            .filter((v: PreviewVendor) => v.featured_photos?.[0] || v.portfolio_images?.[0])
            .map((v: PreviewVendor, i: number) => ({
              id: v.id,
              image_url: v.featured_photos?.[0] || v.portfolio_images?.[0] || '',
              display_order: i + 1,
              caption: null,
            }));
          setExploringPhotos(fallback);
        } else {
          setExploringDone(true);
        }
      }
    } catch { setExploringDone(true); }
    setLoadingPreview(false);
  }, []);

  const startExploring = () => {
    setScreen('exploring');
    setExploringIdx(0);
    setExploringDone(false);
    setExploringPhotos([]);
    loadPreview();
  };

  const nextExploring = () => {
    if (exploringIdx >= exploringPhotos.length - 1) {
      setExploringDone(true);
    } else {
      setExploringIdx(i => i + 1);
    }
  };


  // ── Request form submit ───────────────────────────────────────────────────
  const submitRequest = async (isEdit = false) => {
    if (!reqPhone.trim() || submitting) return;
    setSubmitting(true);
    try {
      const payload: any = {
        phone: reqPhone.replace(/\D/g, ''),
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
    // Handle paste of full 6-digit code (Android SMS autofill)
    const digits = val.replace(/\D/g, '');
    if (digits.length > 1) {
      const n = ['', '', '', '', '', ''];
      digits.split('').slice(0, 6).forEach((d, idx) => { n[idx] = d; });
      setOtp(n);
      otpRefs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }
    const n = [...otp]; n[i] = digits.slice(-1); setOtp(n);
    if (digits && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const sendOtp = async (phoneNum: string) => {
    const isVendor = role === 'Maker';
    const bare = phoneNum.replace(/\D/g, '').slice(-10);
    const endpoint = isVendor
      ? `${BACKEND}/api/v2/vendor/auth/send-otp`
      : `${BACKEND}/api/v2/couple/auth/send-otp`;
    try {
      const r = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: bare }),
      });
      const d = await r.json();
      if (!d.success) { showToast(d.error || 'Could not send code. Try again.'); return; }
      setScreen(screen === 'signin_phone' ? 'signin_otp' : 'invite_otp');
    } catch { showToast('Could not send code. Try again.'); }
  };

  const verifyOtp = async () => {
    const isVendor = role === 'Maker';
    const bare = phone.replace(/\D/g, '').slice(-10);
    const endpoint = isVendor
      ? `${BACKEND}/api/v2/vendor/auth/verify-otp`
      : `${BACKEND}/api/v2/couple/auth/verify-otp`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: bare, code: otp.join('') }),
      });
      const d = await res.json();
      if (!d.success) {
        const err = d.error || '';
        if (err.toLowerCase().includes('no account') || err.toLowerCase().includes('not found') || err.toLowerCase().includes('no vendor')) {
          setScreen('request_who');
          showToast('No account found. Request an invite to join.');
          return;
        }
        showToast(err || 'Incorrect code.');
        return;
      }

      // d.vendor or d.user contains the record
      const record = d.vendor || d.user;
      if (!record) {
        // Number not in system — send them to request an invite
        setScreen('request_who');
        showToast('No account found. Request an invite to join.');
        return;
      }

      const sessionKey = isVendor ? 'vendor_web_session' : 'couple_web_session';
      const pinSet = !!record.pin_set;
      const sessionData = {
        id: record.id, userId: record.id, vendorId: record.id,
        phone: bare,
        pin_set: pinSet,
        vendorName: record.name || null,
        name: record.name || null,
        category: record.category || null,
        tier: record.tier || null,
        dreamer_type: (record as any).dreamer_type || 'basic',
      };
      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      localStorage.setItem(isVendor ? 'vendor_session' : 'couple_session', JSON.stringify(sessionData));
      // For new vendors with no name — go through onboarding first
      const vendorNeedsOnboarding = isVendor && !pinSet && !record.name;
      // For new couples with no name — go through couple onboarding first
      const coupleNeedsOnboarding = !isVendor && !pinSet && !record.name;
      if (vendorNeedsOnboarding) {
        router.push('/vendor/onboarding');
      } else if (coupleNeedsOnboarding) {
        router.push('/couple/onboarding');
      } else {
        router.push(pinSet
          ? (isVendor ? '/vendor/pin-login' : '/couple/pin-login')
          : (isVendor ? '/vendor/pin' : '/couple/pin'));
      }
    } catch { showToast('Verification failed.'); }
  };

  // ── Sign in (returning member) ────────────────────────────────────────────
  const handleSignIn = async () => {
    const isVendor = role === 'Maker';
    const bare = phone.replace(/\D/g, '').slice(-10);
    try {
      const r = await fetch(`${BACKEND}/api/v2/auth/pin-status?userId=_&role=${isVendor ? 'vendor' : 'couple'}&phone=${bare}`);
      const d = await r.json();

      if (!d.userId || d.found === false) {
        // Number not in system — send to request invite
        setScreen('request_who');
        showToast('No account found — request an invite to join.');
        return;
      }

      if (d.pin_set && d.userId) {
        // Has PIN — write session, go to pin-login
        const sessionKey = isVendor ? 'vendor_web_session' : 'couple_web_session';
        const sd = { id: d.userId, userId: d.userId, vendorId: d.userId, phone: bare, pin_set: true };
        localStorage.setItem(sessionKey, JSON.stringify(sd));
        localStorage.setItem(isVendor ? 'vendor_session' : 'couple_session', JSON.stringify(sd));
        router.push(isVendor ? '/vendor/pin-login' : '/couple/pin-login');
        return;
      }

      // Account exists but no PIN — send OTP to complete setup
      sendOtp(phone);
    } catch {
      showToast('Could not connect. Try again.');
    }
  };

  const S: React.CSSProperties = { position: 'absolute', inset: 0 };
  const ease = 'cubic-bezier(0.22,1,0.36,1)';


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
        @keyframes breathe { 0%,100%{opacity:0.22} 50%{opacity:0.45} }
      `}</style>

      {/* ── Carousel ─────────────────────────────────────────────────────── */}
      {slides.map((url, i) => (
        <div key={i} style={{
          ...S,
          backgroundImage: `url(${url})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: screen === 'exploring' ? 0 : (i === cur ? 1 : 0),
          transition: `opacity 3s ${ease}`,
          willChange: 'opacity',
          // Blur when a glass panel is active
          filter: 'none',
        }} />
      ))}

      {/* ── Vignette ──────────────────────────────────────────────────────── */}
      <div style={{
        ...S, zIndex: 2, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 60%, transparent 20%, rgba(0,0,0,0.55) 100%)',
      }} />

      {/* ── Dark overlay for non-exploring screens ────────────────────────── */}
      {screen !== 'exploring' && (
        <div style={{ ...S, zIndex: 3, background: 'rgba(12,10,9,0.15)', pointerEvents: 'none' }} />
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

      

      {/* ── Entry strip — bottom of screen, tappable ─────────────────────── */}
      {screen === 'entry' && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, overflow: 'hidden' }}>
          <div
            onClick={() => setEntryExpanded(true)}
            style={{
              background: 'rgba(12,10,9,0.35)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              borderTop: '0.5px solid rgba(255,255,255,0.1)',
              padding: entryExpanded
                ? '20px 24px calc(env(safe-area-inset-bottom, 16px) + 28px)'
                : '14px 24px calc(env(safe-area-inset-bottom, 12px) + 16px)',
              transition: 'padding 400ms cubic-bezier(0.22,1,0.36,1)',
              cursor: entryExpanded ? 'default' : 'pointer',
            }}
          >
            {/* Brand row — always visible */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
                  fontWeight: 300, fontSize: 20, color: '#F8F7F5',
                  margin: 0, lineHeight: 1.15, letterSpacing: '0.02em',
                }}>The Dream Wedding</p>
                <p style={{
                  fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 7,
                  letterSpacing: '0.32em', textTransform: 'uppercase',
                  color: '#C9A84C', margin: '4px 0 0',
                }}>THE CURATED WEDDING OS</p>
              </div>
              {!entryExpanded && (
                <p style={{
                  fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 8,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: 'rgba(248,247,245,0.28)', margin: 0,
                  animation: 'breathe 3s ease-in-out infinite',
                }}>tap</p>
              )}
            </div>

            {/* Buttons — animate in on expand */}
            <div style={{
              maxHeight: entryExpanded ? '240px' : '0px',
              overflow: 'hidden',
              transition: 'max-height 440ms cubic-bezier(0.22,1,0.36,1)',
            }}>
              <div style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={e => { e.stopPropagation(); setRole(null); setScreen('invite_code'); }}
                  style={{
                    width: '100%', height: 48, background: '#C9A84C', border: 'none',
                    borderRadius: 100, cursor: 'pointer', touchAction: 'manipulation',
                    fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
                    letterSpacing: '0.22em', textTransform: 'uppercase', color: '#0C0A09',
                  }}
                >I have an invite</button>

                <button
                  onClick={e => { e.stopPropagation(); setScreen('request_who'); }}
                  style={{
                    width: '100%', height: 48, background: 'transparent',
                    border: '0.5px solid rgba(248,247,245,0.25)', borderRadius: 100,
                    cursor: 'pointer', touchAction: 'manipulation',
                    fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                    letterSpacing: '0.22em', textTransform: 'uppercase', color: '#F8F7F5',
                  }}
                >Request an invite</button>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setRole(null); setScreen('signin_phone'); }}
                    style={{
                      flex: 1, height: 42, background: 'transparent',
                      border: '0.5px solid rgba(248,247,245,0.12)', borderRadius: 100,
                      cursor: 'pointer', touchAction: 'manipulation',
                      fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 200,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      color: 'rgba(248,247,245,0.45)',
                    }}
                  >Sign in</button>
                  <button
                    onClick={e => { e.stopPropagation(); startExploring(); }}
                    style={{
                      flex: 1, height: 42, background: 'transparent',
                      border: '0.5px solid rgba(248,247,245,0.12)', borderRadius: 100,
                      cursor: 'pointer', touchAction: 'manipulation',
                      fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 200,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      color: 'rgba(248,247,245,0.45)',
                    }}
                  >Just exploring</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Glass panel — all non-entry, non-exploring screens — BOTTOM ─────── */}
      {screen !== 'exploring' && screen !== 'entry' && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
          maxHeight: '80vh', overflowY: 'auto',
        }}>
          <div style={{
            background: 'rgba(12,10,9,0.3)',
            backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
            borderTop: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '20px 20px 0 0',
            padding: '16px 20px calc(env(safe-area-inset-bottom, 10px) + 16px)',
            boxSizing: 'border-box',
          }}>

            {/* ── REQUEST: WHO ARE YOU ──────────────────────────────────────── */}
            {screen === 'request_who' && (
              <>
                <BackBtn onClick={() => setScreen('entry')} />
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
                  fontSize: 20, color: '#F8F7F5', margin: '0 0 12px', lineHeight: 1.15,
                }}>Request an invite.</p>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                  color: 'rgba(248,247,245,0.55)', margin: '0 0 12px',
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
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 20, color: '#F8F7F5', margin: '0 0 12px' }}>Your details.</p>

                <Label text="Your name" />
                <input value={reqName} onChange={e => setReqName(e.target.value)} placeholder="Full name" style={INPUT} />

                <Label text="Phone" />
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.3)', marginBottom: 16 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(248,247,245,0.5)', paddingRight: 10, borderRight: '1px solid rgba(255,255,255,0.2)', marginRight: 10, whiteSpace: 'nowrap' }}>🇮🇳 +91</span>
                  <input value={reqPhone} onChange={e => setReqPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} type="tel" maxLength={10} placeholder="00000 00000" style={{ ...INPUT, marginBottom: 0, borderBottom: 'none', flex: 1 }} />
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
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 20, color: '#F8F7F5', margin: '0 0 12px' }}>Your details.</p>

                <Label text="Business / studio name" />
                <input value={reqName} onChange={e => setReqName(e.target.value)} placeholder="Your name or studio" style={INPUT} />

                <Label text="Phone" />
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.3)', marginBottom: 16 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(248,247,245,0.5)', paddingRight: 10, borderRight: '1px solid rgba(255,255,255,0.2)', marginRight: 10, whiteSpace: 'nowrap' }}>🇮🇳 +91</span>
                  <input value={reqPhone} onChange={e => setReqPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} type="tel" maxLength={10} placeholder="00000 00000" style={{ ...INPUT, marginBottom: 0, borderBottom: 'none', flex: 1 }} />
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
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 20, color: '#F8F7F5', margin: '0 0 4px' }}>Enter your invite.</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(248,247,245,0.5)', margin: '0 0 24px' }}>Your code unlocks access.</p>

                <Label text="Are you a" />
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
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
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 20, color: '#F8F7F5', margin: '0 0 4px' }}>Welcome. Let's begin.</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(248,247,245,0.5)', margin: '0 0 24px' }}>Enter your number. We'll send a code.</p>
                <Label text="Phone number" />
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)', marginBottom: 12 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(248,247,245,0.5)', paddingRight: 10, borderRight: '1px solid rgba(255,255,255,0.2)', marginRight: 10 }}>🇮🇳 +91</span>
                  <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} type="tel" maxLength={10} placeholder="00000 00000" style={{ ...INPUT, borderBottom: 'none', marginBottom: 0, flex: 1 }} />
                </div>
                <GoldBtn label="Send code →" onClick={() => sendOtp(phone)} disabled={phone.length < 10} />
              </>
            )}

            {/* ── OTP ENTRY ─────────────────────────────────────────────────── */}
            {(screen === 'invite_otp' || screen === 'signin_otp') && (
              <>
                <BackBtn onClick={() => setScreen(screen === 'invite_otp' ? 'invite_phone' : 'signin_phone')} />
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 20, color: '#F8F7F5', margin: '0 0 4px' }}>Check your messages.</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(248,247,245,0.5)', margin: '0 0 16px' }}>Enter the 6-digit code we sent you.</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                  {otp.map((v, i) => (
                    <input
                      key={i} ref={el => { otpRefs.current[i] = el; }}
                      value={v} onChange={e => handleOtpInput(i, e.target.value)}
                      onKeyDown={e => handleOtpKey(i, e)}
                      type="tel" inputMode="numeric" maxLength={1}
                      autoComplete="one-time-code"
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
                <button
                  onClick={() => { setOtp(['', '', '', '', '', '']); sendOtp(phone); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', touchAction: 'manipulation', fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(248,247,245,0.3)', marginTop: 12, display: 'block', width: '100%' }}
                >Resend code</button>
              </>
            )}

            {/* ── SIGN IN: PHONE ────────────────────────────────────────────── */}
            {screen === 'signin_phone' && (
              <>
                <BackBtn onClick={() => setScreen('entry')} />
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 20, color: '#F8F7F5', margin: '0 0 4px' }}>Welcome back.</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(248,247,245,0.5)', margin: '0 0 12px' }}>Are you a:</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
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
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)', marginBottom: 12 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(248,247,245,0.5)', paddingRight: 10, borderRight: '1px solid rgba(255,255,255,0.2)', marginRight: 10 }}>🇮🇳 +91</span>
                  <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} type="tel" maxLength={10} placeholder="00000 00000" style={{ ...INPUT, borderBottom: 'none', marginBottom: 0, flex: 1 }} />
                </div>
                <GoldBtn label="Continue →" onClick={handleSignIn} disabled={phone.length < 10 || !role} />
              </>
            )}

          </div>
        </div>
      )}

      {/* ── "JUST EXPLORING" — EDITORIAL BLIND SWIPE ────────────────────── */}
      {screen === 'exploring' && (
        <div style={{ ...S, zIndex: 20 }}>
          {loadingPreview && (
            <div style={{ ...S, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
                fontSize: 20, color: 'rgba(248,247,245,0.6)',
              }}>Curating your preview...</p>
            </div>
          )}

          {!loadingPreview && !exploringDone && exploringPhotos[exploringIdx] && (
            <>
              {/* Full screen editorial photo */}
              <div style={{
                ...S,
                backgroundImage: `url(${exploringPhotos[exploringIdx].image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
                transition: 'background-image 0.4s ease',
              }} />

              {/* Gradient overlay */}
              <div style={{
                ...S,
                background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 40%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              {/* Back button */}
              <button onClick={() => setScreen('entry')} style={{
                position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 20px)',
                left: 20, zIndex: 30,
                background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
                border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '50%',
                width: 40, height: 40, color: '#F8F7F5', fontSize: 18,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>←</button>

              {/* Progress dots */}
              <div style={{
                position: 'absolute',
                top: 'calc(env(safe-area-inset-top, 0px) + 28px)',
                left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 4, zIndex: 30,
              }}>
                {exploringPhotos.map((_, i) => (
                  <div key={i} style={{
                    width: i === exploringIdx ? 20 : 4, height: 4, borderRadius: 2,
                    background: i === exploringIdx ? '#C9A84C' : 'rgba(255,255,255,0.25)',
                    transition: 'width 300ms cubic-bezier(0.22,1,0.36,1)',
                  }} />
                ))}
              </div>

              {/* TDW branding — top right */}
              <div style={{
                position: 'absolute',
                top: 'calc(env(safe-area-inset-top, 0px) + 24px)',
                right: 20, zIndex: 30, textAlign: 'right',
              }}>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
                  fontWeight: 300, fontSize: 13, color: 'rgba(248,247,245,0.7)',
                  margin: 0, letterSpacing: '0.02em',
                }}>The Dream Wedding</p>
                <p style={{
                  fontFamily: "'Jost', sans-serif", fontWeight: 200,
                  fontSize: 6, letterSpacing: '0.25em', textTransform: 'uppercase',
                  color: '#C9A84C', margin: '2px 0 0',
                }}>India's First Wedding OS</p>
              </div>

              {/* Bottom CTA */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
                padding: '0 20px calc(env(safe-area-inset-bottom, 16px) + 24px)',
              }}>
                {/* Caption if exists */}
                {exploringPhotos[exploringIdx].caption && (
                  <p style={{
                    fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
                    fontSize: 14, color: 'rgba(248,247,245,0.6)',
                    margin: '0 0 12px', letterSpacing: '0.02em',
                  }}>{exploringPhotos[exploringIdx].caption}</p>
                )}

                {/* Counter */}
                <p style={{
                  fontFamily: "'Jost', sans-serif", fontWeight: 200,
                  fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase',
                  color: 'rgba(248,247,245,0.35)', margin: '0 0 10px',
                }}>{exploringIdx + 1} of {exploringPhotos.length}</p>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={nextExploring} style={{
                    flex: 1, height: 50, background: '#C9A84C', border: 'none',
                    borderRadius: 100, cursor: 'pointer', touchAction: 'manipulation',
                    fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
                    letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0C0A09',
                  }}>
                    {exploringIdx >= exploringPhotos.length - 1 ? 'See the full catalogue →' : 'Next →'}
                  </button>
                  <button onClick={() => setScreen('request_who')} style={{
                    height: 50, padding: '0 18px',
                    background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)',
                    border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 100,
                    cursor: 'pointer', touchAction: 'manipulation',
                    fontFamily: "'Jost', sans-serif", fontSize: 8,
                    color: 'rgba(248,247,245,0.7)', letterSpacing: '0.12em',
                    whiteSpace: 'nowrap',
                  }}>Request invite</button>
                </div>
              </div>
            </>
          )}

          {/* After all photos — invite nudge screen */}
          {!loadingPreview && exploringDone && (
            <div style={{
              ...S,
              backgroundImage: `url(${exploringPhotos[exploringPhotos.length - 1]?.image_url || ''})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }}>
              <div style={{ ...S, background: 'rgba(12,10,9,0.72)', backdropFilter: 'blur(4px)' }} />
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '40px 28px', zIndex: 10,
              }}>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
                  fontWeight: 300, fontSize: 11, letterSpacing: '0.3em',
                  textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 16px',
                }}>India's First Wedding OS</p>

                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
                  fontSize: 32, color: '#F8F7F5', margin: '0 0 8px',
                  lineHeight: 1.15, textAlign: 'center', letterSpacing: '0.01em',
                }}>
                  Not just happily married.
                </p>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
                  fontSize: 32, color: '#F8F7F5', margin: '0 0 24px',
                  lineHeight: 1.15, textAlign: 'center',
                }}>
                  Getting married{' '}
                  <span style={{ color: '#C9A84C', fontStyle: 'italic' }}>happily.</span>
                </p>

                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
                  color: 'rgba(248,247,245,0.55)', margin: '0 0 36px',
                  lineHeight: 1.7, textAlign: 'center', maxWidth: 300,
                }}>
                  Every Maker on TDW is personally curated. Interested in an invite to India's first curated wedding OS?
                </p>

                <div style={{ width: '100%', maxWidth: 340 }}>
                  <button onClick={() => setScreen('request_who')} style={{
                    width: '100%', height: 54, background: '#C9A84C', border: 'none',
                    borderRadius: 100, cursor: 'pointer', touchAction: 'manipulation',
                    fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 400,
                    letterSpacing: '0.22em', textTransform: 'uppercase', color: '#0C0A09',
                    marginBottom: 12,
                  }}>Request an Invite →</button>

                  <button onClick={() => setScreen('entry')} style={{
                    width: '100%', height: 46, background: 'transparent',
                    border: '0.5px solid rgba(248,247,245,0.2)', borderRadius: 100,
                    cursor: 'pointer', touchAction: 'manipulation',
                    fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 200,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    color: 'rgba(248,247,245,0.4)',
                  }}>← Back to home</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
