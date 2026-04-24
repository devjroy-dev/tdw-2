'use client';
import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = 'live' | 'off' | 'invite-only' | 'coming-soon';
type TabId = 'access' | 'couple-tiers' | 'vendor-tiers' | 'pricing' | 'discovery' | 'dreamai' | 'features' | 'launch';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 4px' }}>{eyebrow}</p>
      <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 300, color: '#111111', margin: '0 0 6px' }}>{title}</p>
      {subtitle && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: 0, lineHeight: 1.6 }}>{subtitle}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; bg: string; color: string }> = {
    'live':         { label: 'Live',         bg: 'rgba(74,124,89,0.1)',   color: '#4A7C59' },
    'off':          { label: 'Off',          bg: '#F0EEE8',               color: '#888580' },
    'invite-only':  { label: 'Invite Only',  bg: 'rgba(201,168,76,0.1)', color: '#C9A84C' },
    'coming-soon':  { label: 'Coming Soon',  bg: '#F0EEE8',               color: '#888580' },
  };
  const s = map[status];
  return (
    <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 100, background: s.bg, color: s.color, whiteSpace: 'nowrap' as const }}>
      {s.label}
    </span>
  );
}

function Toggle({ value, label, note }: { value: boolean; label: string; note?: string }) {
  const [on, setOn] = useState(value);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, padding: '14px 0', borderBottom: '0.5px solid #F0EEE8' }}>
      <div>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 400, color: '#111111', margin: '0 0 3px' }}>{label}</p>
        {note && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: 0, lineHeight: 1.5 }}>{note}</p>}
      </div>
      <button onClick={() => setOn(!on)} style={{ flexShrink: 0, width: 48, height: 26, borderRadius: 13, background: on ? '#111111' : '#E2DED8', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 200ms' }}>
        <div style={{ position: 'absolute', top: 3, left: on ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: on ? '#C9A84C' : '#FFFFFF', transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  );
}

function PriceField({ label, value, note, prefix = '₹' }: { label: string; value: string; note?: string; prefix?: string }) {
  const [val, setVal] = useState(value);
  return (
    <div style={{ padding: '14px 0', borderBottom: '0.5px solid #F0EEE8' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 400, color: '#111111', margin: '0 0 3px' }}>{label}</p>
          {note && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: 0 }}>{note}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#888580' }}>{prefix}</span>
          <input value={val} onChange={e => setVal(e.target.value)} style={{ width: 90, border: 'none', borderBottom: '1px solid #E2DED8', background: 'transparent', fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 400, color: '#111111', padding: '4px 0', outline: 'none', textAlign: 'right' }} />
        </div>
      </div>
    </div>
  );
}

function SelectField({ label, value, options, note }: { label: string; value: string; options: string[]; note?: string }) {
  const [val, setVal] = useState(value);
  return (
    <div style={{ padding: '14px 0', borderBottom: '0.5px solid #F0EEE8' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 400, color: '#111111', margin: '0 0 3px' }}>{label}</p>
          {note && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: 0 }}>{note}</p>}
        </div>
        <select value={val} onChange={e => setVal(e.target.value)} style={{ border: 'none', borderBottom: '1px solid #E2DED8', background: 'transparent', fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#111111', padding: '4px 0', outline: 'none', cursor: 'pointer' }}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </div>
  );
}

function Card({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <div style={{ background: '#FFFFFF', border: `1px solid ${gold ? 'rgba(201,168,76,0.3)' : '#E2DED8'}`, borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
      {children}
    </div>
  );
}

function TierCard({ tier, color, badge, features, price, priceNote }: {
  tier: string; color: string; badge?: string; features: string[]; price: string; priceNote: string;
}) {
  return (
    <div style={{ background: '#FFFFFF', border: `1px solid ${color}30`, borderTop: `3px solid ${color}`, borderRadius: 14, padding: '20px 24px', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 300, color: '#111111', margin: 0 }}>{tier}</p>
        {badge && <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 7, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 100, background: `${color}15`, color }}>{badge}</span>}
      </div>
      <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, color, margin: '0 0 4px' }}>{price}</p>
      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 300, color: '#888580', margin: '0 0 16px' }}>{priceNote}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {features.map((f, i) => (
          <p key={i} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#555250', margin: 0, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color, flexShrink: 0, marginTop: 1 }}>—</span> {f}
          </p>
        ))}
      </div>
    </div>
  );
}

function NoteBanner({ text }: { text: string }) {
  return (
    <div style={{ background: 'rgba(201,168,76,0.06)', border: '0.5px solid rgba(201,168,76,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#555250', margin: 0, lineHeight: 1.6 }}>
        <span style={{ color: '#C9A84C', fontWeight: 400 }}>Note: </span>{text}
      </p>
    </div>
  );
}

// ─── Tab content ──────────────────────────────────────────────────────────────

function TabAccess() {
  return (
    <div>
      <SectionHeader eyebrow="Platform Access" title="Who can get in." subtitle="Control the gates at every entry point. These are your velvet rope decisions." />

      <Card gold>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 12px' }}>Couple Side</p>
        <Toggle value={false} label="Couples require invite code to join" note="When ON: only couples with a valid invite code can sign up. Maintain Net-a-Porter exclusivity at launch." />
        <Toggle value={true} label="Couples can self-register (phone OTP)" note="When ON: any couple can sign up. When OFF: invite code required." />
        <Toggle value={false} label="Discovery feed requires login" note="When ON: couples must be logged in to browse vendors. When OFF: the feed is publicly viewable." />
        <Toggle value={true} label="Waitlist mode — couples request access" note="When ON: new signups go to a waitlist. You approve them manually from Dreamers tab." />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>Vendor (Maker) Side</p>
        <Toggle value={true} label="Vendors require invite code to join" note="Current state: invite code required. Maintains curation. Good for launch." />
        <Toggle value={false} label="Vendors can self-register" note="When ON: any vendor can sign up without a code. Opens the floodgates." />
        <Toggle value={true} label="Vendor requires admin approval to go live" note="Current state: manual approval before appearing in discovery feed." />
        <Toggle value={true} label="Vendor minimum profile completion before submission" note="When ON: vendor must reach 60% profile strength before they can submit for review." />
        <SelectField label="Minimum completion % to submit" value="60%" options={['40%', '50%', '60%', '70%', '80%']} note="How complete a profile must be before the Submit for Discovery button appears." />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>Admin</p>
        <Toggle value={true} label="Admin portal password protected" note="Always ON. Admin password: Mira@2551354" />
      </Card>
    </div>
  );
}

function TabCoupleTiers() {
  return (
    <div>
      <SectionHeader eyebrow="Couple Tiers" title="The Dreamer journey." subtitle="Three tiers. Each unlocks a layer of the platform. Pricing and access per tier." />

      <NoteBanner text="Currently: Basic is free, Gold is ₹999 one-time, Platinum is ₹2,999 one-time. Discovery is free for all tiers — browsing never costs tokens. This is intentional to maximise top-of-funnel." />

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <TierCard
          tier="Basic" color="#888580" badge="Free"
          price="₹0" priceNote="Always free — no credit card"
          features={[
            'Discovery feed — unlimited browsing',
            'Muse board — save up to 20 vendors',
            'Send enquiries to vendors',
            'Journey View — Tasks, Money, My Vendors',
            'Circle — invite up to 2 co-planners',
            'DreamAi — 5 queries/month',
          ]}
        />
        <TierCard
          tier="Gold" color="#C9A84C" badge="One-time"
          price="₹999" priceNote="One-time unlock, lifetime"
          features={[
            'Everything in Basic',
            'Muse board — unlimited saves',
            'Circle — unlimited co-planners',
            'DreamAi — 30 queries/month',
            'Priority discovery — vendors see Gold badge',
            'Full vendor profile (Page 2)',
          ]}
        />
        <TierCard
          tier="Platinum" color="#111111" badge="One-time"
          price="₹2,999" priceNote="One-time unlock, lifetime"
          features={[
            'Everything in Gold',
            'DreamAi — unlimited queries',
            'Couture appointment booking',
            'Memory Box (coming soon)',
            'Lock Date (when enabled)',
            'Dedicated onboarding call with Swati',
          ]}
        />
      </div>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>Pricing Controls</p>
        <PriceField label="Gold tier price" value="999" note="One-time payment. Currently ₹999." />
        <PriceField label="Platinum tier price" value="2999" note="One-time payment. Currently ₹2,999." />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>DreamAi Token Packs (All Tiers)</p>
        <PriceField label="50 token pack" value="100" note="₹2 per query" />
        <PriceField label="200 token pack" value="350" note="₹1.75 per query — 12% saving" />
        <PriceField label="500 token pack" value="800" note="₹1.60 per query — 20% saving" />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>Access Gates per Tier</p>
        <Toggle value={true} label="Basic: Free browsing of discovery feed" note="Couples should always be able to browse. Remove this gate only if you want discovery to be entirely invite-only." />
        <Toggle value={true} label="Basic: Can send enquiries" note="When OFF: Basic users must upgrade to Gold to send an enquiry. High friction, higher conversion — use carefully." />
        <Toggle value={true} label="Gold: Full vendor profiles (Page 2)" note="Page 2 includes extended portfolio, team, awards, packages. Currently gated to Gold+." />
        <Toggle value={true} label="Platinum: Couture appointments" note="Couture trial bookings (₹2-5K fee) only available to Platinum couples." />
        <Toggle value={false} label="Platinum: Required for DreamAi agentic actions" note="When ON: only Platinum couples can use DreamAi to take actions (complete task, send WhatsApp, etc.). Basic/Gold can only chat." />
      </Card>
    </div>
  );
}

function TabVendorTiers() {
  return (
    <div>
      <SectionHeader eyebrow="Vendor (Maker) Tiers" title="The Maker operating layer." subtitle="Three tiers. Each is a full SaaS product, not just a listing." />

      <NoteBanner text="Trial mechanic: Before Aug 1 2026, all new vendors get free Signature until Aug 1. After Aug 1: 30-day Signature trial → auto-downgrade to Essential. This is your founding vendor window." />

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <TierCard
          tier="Essential" color="#888580" badge="Always free"
          price="₹499/mo" priceNote="Or free after trial"
          features={[
            'Visible in discovery feed (post-approval)',
            'Basic profile — Page 1 only',
            'Leads tab — receive enquiries',
            'Clients tab — up to 10 clients',
            'Invoices (basic)',
            'DreamAi — 20 queries/month',
          ]}
        />
        <TierCard
          tier="Signature" color="#C9A84C" badge="Recommended"
          price="₹1,999/mo" priceNote="Monthly subscription"
          features={[
            'Everything in Essential',
            'Full profile — Page 2 unlocked',
            'Payment Shield',
            'Broadcast WhatsApp to clients',
            'Collab Hub — post free',
            'DreamAi — 75 queries/month',
            'GST & Tax tools',
          ]}
        />
        <TierCard
          tier="Prestige" color="#C9A84C" badge="Invite Only"
          price="₹3,999/mo" priceNote="Invite only — you assign"
          features={[
            'Everything in Signature',
            'Lock Date enabled',
            'Auto-approved images',
            'Deluxe Suite (12-tab ops layer)',
            'DreamAi — 500 queries/month',
            'Prestige badge in feed',
            'Priority placement in discovery',
          ]}
        />
      </div>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>Subscription Pricing</p>
        <PriceField label="Essential monthly" value="499" />
        <PriceField label="Signature monthly" value="1999" />
        <PriceField label="Prestige monthly" value="3999" note="Invite only. Assigned by you from admin." />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>Trial Settings</p>
        <Toggle value={true} label="Founding vendor trial active" note="All new vendors before Aug 1 2026 get free Signature. After Aug 1, switch this OFF and 30-day trial applies." />
        <PriceField label="Trial duration (days)" value="30" note="Standard trial after Aug 1 2026." prefix="" />
        <SelectField label="Trial tier" value="Signature" options={['Essential', 'Signature']} note="What tier vendors experience during trial. Signature recommended — they need to feel the full product." />
        <Toggle value={true} label="Auto-downgrade after trial" note="When ON: vendors auto-drop to Essential when trial ends. They must pay to maintain Signature." />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>Prestige Controls</p>
        <Toggle value={true} label="Prestige is invite-only" note="Prestige vendors are hand-picked by you and Swati. Cannot be self-upgraded to." />
        <Toggle value={false} label="Prestige auto-approves all image uploads" note="When ON: Prestige vendor images go live without admin review. When OFF: all images need approval regardless of tier." />
        <Toggle value={true} label="Prestige vendors can set their own Lock Date amount" note="Each Prestige vendor sets their own deposit amount (₹2K–₹10K range)." />
      </Card>
    </div>
  );
}

function TabPricing() {
  return (
    <div>
      <SectionHeader eyebrow="Revenue Model" title="Six streams." subtitle="Every pricing decision in one place. Nothing wired to the live product yet — this is your brainstorm surface." />

      <Card gold>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 16px' }}>Stream 1 — Vendor Subscriptions (MRR)</p>
        <PriceField label="Essential" value="499" note="/month. Baseline product." />
        <PriceField label="Signature" value="1999" note="/month. Full SaaS layer." />
        <PriceField label="Prestige" value="3999" note="/month. Invite only." />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 16px' }}>Stream 2 — Couple Tier Unlocks (One-time)</p>
        <PriceField label="Gold tier" value="999" note="One-time. Lifetime access." />
        <PriceField label="Platinum tier" value="2999" note="One-time. Lifetime access." />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 16px' }}>Stream 3 — DreamAi Token Packs</p>
        <PriceField label="50 tokens" value="100" />
        <PriceField label="200 tokens" value="350" />
        <PriceField label="500 tokens" value="800" />
        <Toggle value={true} label="Token top-ups available to all tiers" note="When OFF: only paid tiers can purchase additional tokens." />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 16px' }}>Stream 4 — Couture Appointments</p>
        <PriceField label="Minimum appointment fee" value="2000" note="Couple pays this to book a trial." />
        <PriceField label="Maximum appointment fee" value="5000" />
        <SelectField label="TDW platform share" value="20%" options={['10%', '15%', '20%', '25%', '30%']} note="TDW takes this % of every appointment fee. Designer keeps the rest." />
        <Toggle value={true} label="Couture appointments active" />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 16px' }}>Stream 5 — Featured Placement</p>
        <PriceField label="Featured board placement" value="10000" note="/month. Vendor pays to appear in editorial boards." />
        <PriceField label="Cover photo placement (paid)" value="25000" note="/month. Front page of the platform." />
        <Toggle value={true} label="Featured placement available" />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 16px' }}>Stream 6 — Collab Hub</p>
        <PriceField label="Essential post fee" value="100" note="Signature/Prestige post free." />
        <PriceField label="Premium placement (top of feed 48h)" value="500" />
        <SelectField label="Match fee (% of job value)" value="5%" options={['3%', '5%', '7%', '10%']} note="Capped at ₹2,000 per match. Referral type exempt." />
        <PriceField label="Match fee cap" value="2000" />
        <Toggle value={false} label="Collab match fee active" note="Turn ON when you want to start taking the 5% cut from successful matches." />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 16px' }}>Lock Date</p>
        <PriceField label="Lock Date minimum" value="2000" note="Couple pays this to lock a vendor's date. Non-refundable." />
        <PriceField label="Lock Date maximum" value="10000" note="Each Prestige vendor sets their own amount within this range." />
        <SelectField label="TDW cut of Lock Date" value="10%" options={['0%', '5%', '10%', '15%', '20%']} />
        <Toggle value={false} label="Lock Date active" note="Currently OFF. Enable once Razorpay is fully wired." />
      </Card>
    </div>
  );
}

function TabDiscovery() {
  return (
    <div>
      <SectionHeader eyebrow="Discovery Feed" title="The front door." subtitle="Control what couples see, how they see it, and what's gated." />

      <Card gold>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 12px' }}>Feed Access</p>
        <Toggle value={true} label="Discovery feed is public (no login required)" note="Recommended for launch — maximum top-of-funnel. Couples can browse before signing up." />
        <Toggle value={false} label="Discovery requires couple account" note="Higher commitment signal but reduces casual discovery." />
        <Toggle value={true} label="Blind mode is the default" note="Couples see work first, name second. Core editorial decision — recommend keeping ON always." />
        <Toggle value={true} label="Couples can filter by category, city, budget" note="Hub filters. Keep ON — reduces irrelevant swipes, improves match quality." />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>Cover Photos (Landing Page)</p>
        <Toggle value={true} label="Cover photo rotation active" note="The 'Vogue front page' — 10 slots rotating on the landing screen. Controlled from Cover Placement tab." />
        <Toggle value={false} label="Cover photos show photographer credit" note="When ON: small watermark/credit shown. When OFF: pure editorial." />
        <SelectField label="Rotation interval" value="Every session" options={['Every session', 'Every 24 hours', 'Every week', 'Manual only']} />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>Vendor Discovery Eligibility</p>
        <Toggle value={true} label="Vendor must be approved to appear in feed" note="Core quality gate. Always keep ON." />
        <Toggle value={true} label="Vendor must have at least one hero image" note="No image = no feed. Keeps quality high." />
        <SelectField label="Minimum profile completion to appear" value="60%" options={['40%', '50%', '60%', '70%', '80%']} />
        <Toggle value={false} label="Prestige vendors get priority placement" note="When ON: Prestige vendors always appear in the top 20% of feed results." />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>Couture Section</p>
        <Toggle value={true} label="Couture section visible to couples" note="Currently shows 'Launching Q3 2026' if OFF." />
        <Toggle value={true} label="Couture requires Platinum to book appointment" note="Browsing is free. Booking a trial requires Platinum." />
        <Toggle value={true} label="Couture designers are invite-only" note="You and Swati approve each designer personally." />
      </Card>
    </div>
  );
}

function TabDreamAi() {
  return (
    <div>
      <SectionHeader eyebrow="DreamAi" title="The AI that knows your wedding." subtitle="Every access, quota, and capability decision for DreamAi across both sides." />

      <NoteBanner text="DreamAi is your primary moat and your most expensive feature to run (Claude API costs). These settings let you control who gets it, how much, and whether they pay for more." />

      <Card gold>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 12px' }}>Access Model</p>
        <Toggle value={false} label="DreamAi is invite-only (global)" note="When ON: DreamAi is completely hidden until you manually grant access to a user. Hard gate." />
        <Toggle value={true} label="DreamAi available to all couples (within quota)" note="When ON: all logged-in couples can use DreamAi within their tier quota." />
        <Toggle value={true} label="DreamAi available to all vendors (within quota)" note="When ON: all vendors on any tier can use DreamAi." />
        <Toggle value={true} label="DreamAi FAB visible on all screens" note="The gold ⚡ button floating on every page. Turn OFF to hide for specific testing." />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>Couple Quotas (per month)</p>
        <PriceField label="Basic tier queries/month" value="5" prefix="" note="Free tier gets a taste. Enough to be hooked, not enough to be satisfied." />
        <PriceField label="Gold tier queries/month" value="30" prefix="" />
        <PriceField label="Platinum tier queries/month" value="999" prefix="" note="Effectively unlimited." />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>Vendor Quotas (per month)</p>
        <PriceField label="Essential tier queries/month" value="20" prefix="" />
        <PriceField label="Signature tier queries/month" value="75" prefix="" />
        <PriceField label="Prestige tier queries/month" value="500" prefix="" />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>Agentic Actions</p>
        <Toggle value={true} label="Couple agentic actions enabled" note="Complete task, log expense, send WhatsApp reminder, send enquiry — all require Confirm." />
        <Toggle value={true} label="Vendor agentic actions enabled" note="Send payment reminder, reply to enquiry, block date, log expense." />
        <Toggle value={true} label="Actions always require Confirm before execution" note="NEVER turn this OFF. DreamAi never acts without user confirmation." />
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>WhatsApp Integration</p>
        <Toggle value={true} label="DreamAi WhatsApp channel active" note="Twilio sandbox currently. Upgrade to paid Twilio (~$20/mo) for production." />
        <Toggle value={false} label="DreamAi WhatsApp Lead Capture" note="Vendors forward enquiries to TDW number → Claude parses → auto-creates lead. Coming soon." />
      </Card>
    </div>
  );
}

function TabFeatures() {
  return (
    <div>
      <SectionHeader eyebrow="Platform Features" title="What's live, what's gated, what's coming." subtitle="Every major feature and its current state. Use this to plan your launch sequence." />

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>Couple-Side Features</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Discovery Feed (blind swipe)', status: 'live' as Status, note: 'Core product. Always on.' },
            { label: 'Muse Board', status: 'live' as Status, note: 'Save vendors. Writes entity links.' },
            { label: 'Journey View (Tasks, Money, My Vendors)', status: 'live' as Status, note: 'Full planning surface.' },
            { label: 'Today Screen (Three Moments)', status: 'live' as Status, note: 'Intelligent dashboard.' },
            { label: 'Vendor Profiles (Page 1)', status: 'live' as Status, note: 'All tiers.' },
            { label: 'Vendor Profiles (Page 2)', status: 'live' as Status, note: 'Gold+ couples only.' },
            { label: 'Circle (Co-planners)', status: 'live' as Status, note: 'Up to 2 for Basic, unlimited for Gold+.' },
            { label: 'DreamAi Chat', status: 'live' as Status, note: 'Graph-aware. Quota by tier.' },
            { label: 'Couture Browse', status: 'live' as Status, note: 'Visible. Appointment booking requires Platinum.' },
            { label: 'Lock Date', status: 'coming-soon' as Status, note: 'Razorpay integration pending.' },
            { label: 'Memory Box', status: 'coming-soon' as Status, note: 'Platinum feature. Not built yet.' },
            { label: 'Honeymoon booking', status: 'coming-soon' as Status, note: 'Affiliate commission 10-15%.' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 400, color: '#111111', margin: '0 0 2px' }}>{f.label}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: 0 }}>{f.note}</p>
              </div>
              <StatusBadge status={f.status} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 12px' }}>Vendor-Side Features</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Clients CRM (Progress Ring)', status: 'live' as Status, note: 'All tiers.' },
            { label: 'Invoices & Expenses', status: 'live' as Status, note: 'All tiers.' },
            { label: 'GST & Tax Tools', status: 'live' as Status, note: 'Signature+ only.' },
            { label: 'Payment Shield', status: 'live' as Status, note: 'Signature+ only.' },
            { label: 'Broadcast WhatsApp', status: 'live' as Status, note: 'Signature+ only.' },
            { label: 'Contracts', status: 'live' as Status, note: 'Download as PDF.' },
            { label: 'Image Hub (6 categories)', status: 'live' as Status, note: 'All tiers. Admin approval required.' },
            { label: 'Collab Hub', status: 'live' as Status, note: 'Signature+ post free. Essential ₹100/post.' },
            { label: 'Discovery Dash (analytics)', status: 'live' as Status, note: 'All tiers.' },
            { label: 'Lock Date (receive deposits)', status: 'coming-soon' as Status, note: 'Prestige only. Razorpay pending.' },
            { label: 'Deluxe Suite (12-tab ops)', status: 'invite-only' as Status, note: 'Prestige only. Assign from admin.' },
            { label: 'Zoho Sign (e-contracts)', status: 'coming-soon' as Status, note: 'S43 planned.' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 400, color: '#111111', margin: '0 0 2px' }}>{f.label}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: 0 }}>{f.note}</p>
              </div>
              <StatusBadge status={f.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TabLaunch() {
  return (
    <div>
      <SectionHeader eyebrow="Launch Readiness" title="What needs to happen before you open the doors." subtitle="A checklist of every decision and dependency. Nothing wired yet." />

      <Card gold>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 16px' }}>Decisions You Need to Make</p>
        {[
          ['Couple access model', 'Open self-signup OR invite-only? Invite-only maintains exclusivity but limits growth. Recommend: open self-signup + waitlist approval for first 500 couples.'],
          ['DreamAi: invite-only or all?', 'Invite-only = premium feel, controlled cost. All-access = higher engagement, higher Claude API spend. Recommend: all-access with tight quotas on Basic tier.'],
          ['Vendor self-signup?', 'Currently invite-only (correct for launch). Keep OFF until you have enough admin bandwidth to approve them.'],
          ['Lock Date: enable at launch?', 'Razorpay needs to be fully wired first. Recommend: OFF at launch, ON at 100 active vendors.'],
          ['Couture: launch now or later?', 'The section exists. You need at least 5 designers with real products seeded. Recommend: soft launch with 3 designers at month 2.'],
          ['Founding vendor deadline: Aug 1?', 'Currently hardcoded. After Aug 1, trial drops to 30 days. This creates urgency — use it as a marketing moment.'],
          ['Payment Shield: who covers disputes?', 'The escrow model needs a clear policy document before going live with real money.'],
          ['Prestige: who gets it at launch?', 'Hand-pick 5-10 photographers, MUAs, decorators for launch. They set the tone for the entire platform.'],
        ].map(([title, note]) => (
          <div key={title} style={{ padding: '12px 0', borderBottom: '0.5px solid #F0EEE8' }}>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 400, color: '#111111', margin: '0 0 4px' }}>{title}</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#555250', margin: 0, lineHeight: 1.6 }}>{note}</p>
          </div>
        ))}
      </Card>

      <Card>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 16px' }}>Technical Dependencies (before go-live)</p>
        {[
          ['Razorpay', 'Required for couple tier upgrades, vendor subscriptions, Lock Date, Couture appointments. Currently mock.', 'coming-soon'],
          ['Twilio paid upgrade', '~$20/mo. Required for DreamAi WhatsApp in production. Currently sandbox.', 'coming-soon'],
          ['Cover photos SQL table', 'Run: CREATE TABLE cover_photos. Already wired on backend.', 'coming-soon'],
          ['Discovery feed SQL fix', 'Run the UPDATE vendors SET discover_listed=true SQL for existing vendors.', 'coming-soon'],
          ['Push notifications', 'PWA push + Play Store. Not yet built.', 'coming-soon'],
          ['Play Store submission', 'React Native build needed.', 'coming-soon'],
        ].map(([title, note, status]) => (
          <div key={title} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '0.5px solid #F0EEE8' }}>
            <div>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 400, color: '#111111', margin: '0 0 4px' }}>{title}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: 0, lineHeight: 1.5 }}>{note}</p>
            </div>
            <StatusBadge status={status as Status} />
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'access',       label: 'Access Gates',    icon: '◎' },
  { id: 'couple-tiers', label: 'Couple Tiers',    icon: '♡' },
  { id: 'vendor-tiers', label: 'Vendor Tiers',    icon: '✦' },
  { id: 'pricing',      label: 'Pricing',         icon: '₹' },
  { id: 'discovery',    label: 'Discovery',       icon: '⬡' },
  { id: 'dreamai',      label: 'DreamAi',         icon: '⚡' },
  { id: 'features',     label: 'Features',        icon: '◈' },
  { id: 'launch',       label: 'Launch Plan',     icon: '◐' },
];

export default function ControlRoomPage() {
  const [tab, setTab] = useState<TabId>('access');

  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 4px' }}>Admin</p>
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: 32, color: '#111111', margin: '0 0 6px' }}>Control Room</p>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: 0, lineHeight: 1.5 }}>
          Every lever on the platform, laid out for brainstorming. <span style={{ color: '#C9A84C' }}>Nothing here is wired to the live product yet.</span> Use this to decide your launch configuration.
        </p>
      </div>

      {/* Tab nav — horizontal scroll */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 28, WebkitOverflowScrolling: 'touch' as any }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 100, border: 'none', cursor: 'pointer',
            fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase',
            background: tab === t.id ? '#111111' : '#F4F1EC',
            color: tab === t.id ? '#F8F7F5' : '#888580',
            transition: 'all 150ms ease',
          }}>
            <span style={{ fontSize: 11 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'access'       && <TabAccess />}
      {tab === 'couple-tiers' && <TabCoupleTiers />}
      {tab === 'vendor-tiers' && <TabVendorTiers />}
      {tab === 'pricing'      && <TabPricing />}
      {tab === 'discovery'    && <TabDiscovery />}
      {tab === 'dreamai'      && <TabDreamAi />}
      {tab === 'features'     && <TabFeatures />}
      {tab === 'launch'       && <TabLaunch />}
    </>
  );
}
