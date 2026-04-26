"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, LogOut } from "lucide-react";
import { useAppMode } from "../layout";
import type { AppMode } from "../layout";

function getInitials(name?: string): string {
  if (!name) return 'M';
  return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
}

// Reads both session keys — login paths write to different ones
function getVendorSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function TopBar() {
  const router = useRouter();
  const { mode, setMode } = useAppMode();
  const [profileOpen, setProfileOpen] = useState(false);
  const [vendorName, setVendorName]   = useState('');
  const [category, setCategory]       = useState('');
  const [tier, setTier]               = useState('');
  const [toast, setToast]             = useState('');

  useEffect(() => {
    const s = getVendorSession();
    if (s?.vendorName) setVendorName(s.vendorName);
    if (s?.category)   setCategory(s.category);
    if (s?.tier)       setTier(s.tier);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Navigation only — setMode is handled exclusively by layout.tsx pathname useEffect
  const handleModeSwitch = (m: AppMode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vendor_app_mode', m);
    }
    if (m === 'DISCOVERY') {
      router.push('/vendor/discovery/dash');
    } else if (m === 'DREAMAI') {
      router.push('/vendor/dreamai');
    } else {
      router.push('/vendor/today');
    }
  };

  const initials    = getInitials(vendorName);
  const profileSub  = [category, tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : ''].filter(Boolean).join(' · ') || 'Maker';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        @keyframes vendorToastSlide { from{opacity:0;transform:translateY(-40px) translateX(-50%)} to{opacity:1;transform:translateY(0) translateX(-50%)} }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, left: '50%',
          transform: 'translateX(-50%)',
          background: '#111111', color: '#F8F7F5',
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
          padding: '10px 16px', borderRadius: 8, zIndex: 400,
          animation: 'vendorToastSlide 280ms cubic-bezier(0.22,1,0.36,1)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>{toast}</div>
      )}

      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: "56px", backgroundColor: "#F8F7F5",
        borderBottom: "0.5px solid #E2DED8",
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, boxSizing: "border-box",
      }}>
        {/* TDW wordmark */}
        <span style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: "20px",
          fontWeight: 300, color: "#111111", letterSpacing: "0.04em", lineHeight: 1,
        }}>TDW</span>

        {/* Mode toggle pill */}
        <div style={{
          display: "inline-flex", alignItems: "center",
          background: "#EDEAE4", borderRadius: "20px", padding: "3px", gap: 0,
        }}>
          {(["BUSINESS", "DREAMAI", "DISCOVERY"] as AppMode[]).map((m) => {
            const active = mode === m;
            const isDreamAiOption = m === "DREAMAI";
            return (
              <button
                key={m}
                onClick={() => handleModeSwitch(m)}
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: "9px",
                  fontWeight: 300,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  padding: "6px 12px",
                  borderRadius: "16px",
                  border: "none",
                  cursor: "pointer",
                  background: active
                    ? isDreamAiOption ? "#C9A84C" : "#FFFFFF"
                    : "transparent",
                  color: active
                    ? "#111111"
                    : "#888580",
                  transition: "background 200ms cubic-bezier(0.22, 1, 0.36, 1), color 200ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms ease",
                  boxShadow: active ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                  whiteSpace: "nowrap" as const,
                }}
              >
                {m === "DREAMAI" ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    ✦ AI
                    <span style={{
                      fontFamily: "'Jost', sans-serif", fontSize: 6, fontWeight: 400,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: mode === 'DREAMAI' ? '#0C0A09' : '#C9A84C',
                      background: mode === 'DREAMAI' ? 'rgba(12,10,9,0.15)' : 'rgba(201,168,76,0.1)',
                      borderRadius: 100, padding: '1px 5px',
                      border: `0.5px solid ${mode === 'DREAMAI' ? 'rgba(12,10,9,0.2)' : 'rgba(201,168,76,0.3)'}`,
                    }}>beta</span>
                  </span>
                ) : m}
              </button>
            );
          })}
        </div>

        {/* Profile circle */}
        <div
          onClick={() => setProfileOpen(true)}
          style={{
            width: "32px", height: "32px", borderRadius: "50%",
            border: "1px solid #C9A84C", background: "rgba(201,168,76,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, cursor: "pointer", touchAction: "manipulation",
          }}
        >
          <span style={{
            fontFamily: "'Jost', sans-serif", fontSize: "12px",
            fontWeight: 400, color: "#111111", lineHeight: 1,
          }}>{initials}</span>
        </div>
      </header>

      {/* Profile sheet backdrop */}
      {profileOpen && (
        <div
          onClick={() => setProfileOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(17,17,17,0.4)' }}
        />
      )}

      {/* Profile sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501,
        background: '#FFFFFF', borderRadius: '24px 24px 0 0',
        transform: profileOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)',
        willChange: 'transform',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ width: 36, height: 4, background: '#E2DED8', borderRadius: 2, margin: '12px auto 20px' }} />

        {/* Profile row */}
        <div style={{ padding: '0 24px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: '#111111',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 16, fontWeight: 300, color: '#F8F7F5' }}>{initials}</span>
          </div>
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: '#111111', margin: '0 0 2px' }}>{vendorName || 'Maker'}</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: 0 }}>{profileSub}</p>
          </div>
        </div>

        <div style={{ height: 1, background: '#E2DED8', margin: '0 24px' }} />

        {/* Settings — links to Tips & Features */}
        <div
          onClick={() => { router.push('/vendor/studio/settings'); setProfileOpen(false); }}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px', cursor: 'pointer', touchAction: 'manipulation' }}
        >
          <Settings size={18} color="#888580" strokeWidth={1.5} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#111111' }}>Tips & Features</span>
        </div>

        <div style={{ height: 1, background: '#E2DED8', margin: '0 24px' }} />

        {/* Sign out */}
        <div
          onClick={() => {
            localStorage.removeItem('vendor_web_session');
            localStorage.removeItem('vendor_session');
            localStorage.removeItem('vendor_app_mode');
            window.location.replace('/');
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px', cursor: 'pointer', touchAction: 'manipulation' }}
        >
          <LogOut size={18} color="#888580" strokeWidth={1.5} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#111111' }}>Sign out</span>
        </div>
      </div>
    </>
  );
}
