'use client';
import { useRouter } from 'next/navigation';
import {
  CREAM, GOLD, MUTED, HAIRLINE, FROST_PANEL,
  FONT_DISPLAY, FONT_BODY, FONT_EYEBROW,
  useCircleSession, memberName,
} from '../CircleSessionContext';

const ROLE_LABEL: Record<string, string> = {
  Partner: 'Partner',
  inner_circle: 'Inner Circle',
  circle: 'Circle',
};

export default function CoplannerSettings() {
  const session = useCircleSession();
  const router  = useRouter();
  const name    = memberName(session);
  const roleLbl = ROLE_LABEL[session.role] || 'Circle';

  const signOut = () => {
    if (typeof window === 'undefined') return;
    if (!window.confirm('Sign out of your Circle?')) return;
    try {
      localStorage.removeItem('circle_session');
      localStorage.removeItem('circle_last_path');
    } catch {}
    router.replace('/');
  };

  return (
    <>
      <p style={{
        fontFamily: FONT_EYEBROW, fontWeight: 200, fontSize: 9,
        letterSpacing: '0.32em', textTransform: 'uppercase',
        color: GOLD, margin: '0 0 12px',
      }}>SETTINGS</p>

      <h1 style={{
        fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontWeight: 300,
        fontSize: 32, lineHeight: 1.15, color: CREAM,
        margin: '0 0 28px',
      }}>You.</h1>

      <section style={{ ...FROST_PANEL, padding: 20, marginBottom: 20 }}>
        <Row label="NAME"  value={name} />
        <Row label="ROLE"  value={roleLbl} valueColor={GOLD} />
        <Row label="CIRCLE FOR" value={session.bride_name} last />
      </section>

      <section style={{ ...FROST_PANEL, padding: 20, marginBottom: 20 }}>
        <p style={{
          fontFamily: FONT_BODY, fontWeight: 300, fontSize: 12,
          color: MUTED, margin: '0 0 16px', lineHeight: 1.6,
        }}>
          Your name and role were set by {session.bride_name} when she invited you.
          Ask her to update them if anything looks off.
        </p>

        <button
          onClick={signOut}
          style={{
            width: '100%', height: 44,
            background: 'transparent',
            border: `0.5px solid ${HAIRLINE}`,
            borderRadius: 100,
            cursor: 'pointer',
            fontFamily: FONT_EYEBROW, fontWeight: 300, fontSize: 10,
            letterSpacing: '0.24em', textTransform: 'uppercase',
            color: CREAM,
          }}>Sign out</button>
      </section>
    </>
  );
}

function Row({ label, value, valueColor, last }: {
  label: string; value: string; valueColor?: string; last?: boolean;
}) {
  return (
    <div style={{
      padding: '12px 0',
      borderBottom: last ? 'none' : `0.5px solid ${HAIRLINE}`,
    }}>
      <p style={{
        fontFamily: FONT_EYEBROW, fontWeight: 300, fontSize: 9,
        letterSpacing: '0.22em', textTransform: 'uppercase',
        color: MUTED, margin: '0 0 4px',
      }}>{label}</p>
      <p style={{
        fontFamily: FONT_BODY, fontWeight: 400, fontSize: 15,
        color: valueColor || CREAM, margin: 0,
      }}>{value || '—'}</p>
    </div>
  );
}
