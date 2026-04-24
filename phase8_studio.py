"""
PHASE 8 — Studio sub-pages buildout
Repo: tdw-2

What's actually broken (confirmed from code + backend audit):
  - Analytics:  wrong session key, hardcoded profile strength booleans
  - Referrals:  wrong session key, missing discount milestone display
  - Broadcast:  hardcoded duplicate nav at bottom
  - Contracts:  hardcoded duplicate nav at bottom

All 4 backend endpoints exist and work. This patch fixes the frontend issues.

Changes:
  1. analytics/page.tsx  — fix session key, wire real profile strength from /api/v2/vendor/profile-level
  2. referrals/page.tsx  — fix session key, add discount milestone tracker, use /api/referrals/rewards
  3. broadcast/page.tsx  — remove duplicate hardcoded nav
  4. contracts/page.tsx  — remove duplicate hardcoded nav

Run from: /workspaces/tdw-2
Command:  python3 phase8_studio.py
"""

changes = []

# ─────────────────────────────────────────────────────────────────────────────
# Helper: the duplicate nav string that appears in broadcast and contracts
# ─────────────────────────────────────────────────────────────────────────────
DUPE_NAV = """      <nav style={{position:'fixed',bottom:0,left:0,right:0,background:'#F8F7F5',borderTop:'1px solid #E2DED8',display:'flex',alignItems:'center',justifyContent:'space-around',paddingBottom:'env(safe-area-inset-bottom)',zIndex:100}}>
        {[{key:'today',label:'Today',href:'/vendor/today'},{key:'clients',label:'Clients',href:'/vendor/clients'},{key:'money',label:'Money',href:'/vendor/money'},{key:'studio',label:'Studio',href:'/vendor/studio'}].map(item=>(
          <a key={item.key} href={item.href} style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'12px 16px',gap:4,textDecoration:'none'}}>
            <span style={{fontFamily:\\"'Jost',sans-serif\\", fontSize:10, fontWeight:item.key==='studio'?400:300, letterSpacing:'0.15em', textTransform:'uppercase', color:item.key==='studio'?'#111':'#888580'}}>{item.label}</span>
            {item.key==='studio'&&<span style={{width:4,height:4,borderRadius:'50%',background:'#C9A84C',display:'block'}}/>}
          </a>
        ))}
      </nav>"""

NAV_COMMENT = "      {/* Nav handled by layout — BottomNav component */}"

# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 1 — Analytics: fix session key + wire real profile strength
# Profile strength now calls /api/v2/vendor/profile-level/:vendorId (built Phase 5)
# which returns real completion_pct, next_step, photo_count, about_word_count.
# ─────────────────────────────────────────────────────────────────────────────
ANALYTICS_PATH = 'web/app/vendor/studio/analytics/page.tsx'
with open(ANALYTICS_PATH, 'r') as f:
    analytics = f.read()

# Fix session key
OLD_ANALYTICS_SESSION = """  useEffect(() => {
    const raw = localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/pin-login'); return; }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.vendorId) { window.location.replace('/vendor/pin-login'); return; }
      setVendorId(parsed.vendorId);
    } catch { window.location.replace('/vendor/pin-login'); }
  }, []);"""

NEW_ANALYTICS_SESSION = """  useEffect(() => {
    // Check both session keys — login paths write to different ones
    const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/login'); return; }
    try {
      const parsed = JSON.parse(raw);
      const vid = parsed.vendorId || parsed.id;
      if (!vid) { window.location.replace('/vendor/login'); return; }
      setVendorId(vid);
    } catch { window.location.replace('/vendor/login'); }
  }, []);"""

if OLD_ANALYTICS_SESSION in analytics:
    analytics = analytics.replace(OLD_ANALYTICS_SESSION, NEW_ANALYTICS_SESSION)
    changes.append('✓ Change 1a: Analytics session key fixed')
else:
    changes.append('✗ Change 1a FAILED — analytics session pattern not found')

# Add profileLevel state + fetch
OLD_ANALYTICS_STATE = """  const [vendorId, setVendorId] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyEntry[]>([]);
  const [totals, setTotals] = useState<Totals>({ impressions: 0, profile_views: 0, saves: 0, enquiries: 0, lock_interests: 0 });
  const [loading, setLoading] = useState(true);"""

NEW_ANALYTICS_STATE = """  const [vendorId, setVendorId] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyEntry[]>([]);
  const [totals, setTotals] = useState<Totals>({ impressions: 0, profile_views: 0, saves: 0, enquiries: 0, lock_interests: 0 });
  const [loading, setLoading] = useState(true);
  // Real profile completion data from Phase 5 profile-level endpoint
  const [profileLevel, setProfileLevel] = useState<{
    completion_pct: number;
    next_step: { label: string; href: string } | null;
    photo_count: number;
    about_word_count: number;
    is_live: boolean;
  } | null>(null);"""

if OLD_ANALYTICS_STATE in analytics:
    analytics = analytics.replace(OLD_ANALYTICS_STATE, NEW_ANALYTICS_STATE)
    changes.append('✓ Change 1b: Analytics profileLevel state added')
else:
    changes.append('✗ Change 1b FAILED — analytics state pattern not found')

# Add profile level fetch after analytics fetch
OLD_ANALYTICS_FETCH = """  const fetchAnalytics = useCallback(async (vid: string) => {
    try {
      const res = await fetch(`${BACKEND}/api/vendor-analytics/${vid}`);
      const json = await res.json();
      if (json.success) {
        if (Array.isArray(json.daily)) setDaily(json.daily);
        if (json.totals) setTotals(json.totals);
      }
    } catch {}
    setLoading(false);
  }, []);"""

NEW_ANALYTICS_FETCH = """  const fetchAnalytics = useCallback(async (vid: string) => {
    try {
      // Fetch analytics + profile level in parallel
      const [analyticsRes, profileRes] = await Promise.all([
        fetch(`${BACKEND}/api/vendor-analytics/${vid}`),
        fetch(`${BACKEND}/api/v2/vendor/profile-level/${vid}`),
      ]);
      const analyticsJson = await analyticsRes.json();
      const profileJson = await profileRes.json();
      if (analyticsJson.success) {
        if (Array.isArray(analyticsJson.daily)) setDaily(analyticsJson.daily);
        if (analyticsJson.totals) setTotals(analyticsJson.totals);
      }
      if (profileJson.success) {
        setProfileLevel({
          completion_pct: profileJson.completion_pct || 0,
          next_step: profileJson.next_step || null,
          photo_count: profileJson.photo_count || 0,
          about_word_count: profileJson.about_word_count || 0,
          is_live: !!profileJson.is_live,
        });
      }
    } catch {}
    setLoading(false);
  }, []);"""

if OLD_ANALYTICS_FETCH in analytics:
    analytics = analytics.replace(OLD_ANALYTICS_FETCH, NEW_ANALYTICS_FETCH)
    changes.append('✓ Change 1c: Analytics now fetches real profile level data')
else:
    changes.append('✗ Change 1c FAILED — analytics fetch pattern not found')

# Replace hardcoded strengthItems with real data
OLD_STRENGTH = """  const strengthItems = [
    { label: 'Profile active', done: !!vendorId },
    { label: 'Photos uploaded', done: false },
    { label: 'Bio written', done: false },
    { label: 'Pricing set', done: false },
  ];
  const strengthPct = strengthItems.filter(i => i.done).length * 25;"""

NEW_STRENGTH = """  // Profile strength — derived from real profile-level data (Phase 5 endpoint)
  const strengthItems = profileLevel ? [
    { label: 'Profile active',            done: true },
    { label: `Photos (${profileLevel.photo_count}/4 uploaded)`, done: profileLevel.photo_count >= 4 },
    { label: `Bio (${profileLevel.about_word_count}/80 words)`, done: profileLevel.about_word_count >= 80 },
    { label: 'Live on couple discovery',  done: profileLevel.is_live },
  ] : [
    { label: 'Profile active', done: !!vendorId },
    { label: 'Photos uploaded', done: false },
    { label: 'Bio written', done: false },
    { label: 'Live on discovery', done: false },
  ];
  const strengthPct = profileLevel?.completion_pct ?? (strengthItems.filter(i => i.done).length * 25);"""

if OLD_STRENGTH in analytics:
    analytics = analytics.replace(OLD_STRENGTH, NEW_STRENGTH)
    changes.append('✓ Change 1d: Analytics profile strength now uses real data')
else:
    changes.append('✗ Change 1d FAILED — strength items pattern not found')

# Replace the profile strength bar % display
OLD_STRENGTH_BAR = """              <p style={{ fontFamily: \"'DM Sans', sans-serif\", fontSize: 12, color: '#555250', marginBottom: 12 }}>{strengthPct}% complete</p>"""

NEW_STRENGTH_BAR = """              <p style={{ fontFamily: \"'DM Sans', sans-serif\", fontSize: 12, color: '#555250', marginBottom: 12 }}>
                {strengthPct}% complete
                {profileLevel?.next_step && (
                  <a href={profileLevel.next_step.href} style={{ marginLeft: 12, color: '#C9A84C', textDecoration: 'none', fontFamily: \"'Jost', sans-serif\", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    → {profileLevel.next_step.label}
                  </a>
                )}
              </p>"""

if OLD_STRENGTH_BAR in analytics:
    analytics = analytics.replace(OLD_STRENGTH_BAR, NEW_STRENGTH_BAR)
    changes.append('✓ Change 1e: Analytics profile strength bar shows next step')
else:
    changes.append('✗ Change 1e FAILED — strength bar pattern not found')

with open(ANALYTICS_PATH, 'w') as f:
    f.write(analytics)


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 2 — Referrals: fix session key + add discount milestone tracker
# The page already fetches from /api/referrals/rewards but doesn't display
# the discount % or the next milestone. Adding that now.
# ─────────────────────────────────────────────────────────────────────────────
REFERRALS_PATH = 'web/app/vendor/studio/referrals/page.tsx'
with open(REFERRALS_PATH, 'r') as f:
    referrals = f.read()

# Fix session key
OLD_REFERRALS_SESSION = """  useEffect(() => {
    const raw = localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/pin-login'); return; }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.vendorId) { window.location.replace('/vendor/pin-login'); return; }
      setVendorId(parsed.vendorId);
    } catch { window.location.replace('/vendor/pin-login'); }
  }, []);"""

NEW_REFERRALS_SESSION = """  useEffect(() => {
    const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/login'); return; }
    try {
      const parsed = JSON.parse(raw);
      const vid = parsed.vendorId || parsed.id;
      if (!vid) { window.location.replace('/vendor/login'); return; }
      setVendorId(vid);
    } catch { window.location.replace('/vendor/login'); }
  }, []);"""

if OLD_REFERRALS_SESSION in referrals:
    referrals = referrals.replace(OLD_REFERRALS_SESSION, NEW_REFERRALS_SESSION)
    changes.append('✓ Change 2a: Referrals session key fixed')
else:
    changes.append('✗ Change 2a FAILED — referrals session pattern not found')

# Add discount + nextMilestone state
OLD_REFERRALS_STATE = """  const [code, setCode] = useState('');
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');"""

NEW_REFERRALS_STATE = """  const [code, setCode] = useState('');
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [nextMilestone, setNextMilestone] = useState<{referrals: number; discount: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');"""

if OLD_REFERRALS_STATE in referrals:
    referrals = referrals.replace(OLD_REFERRALS_STATE, NEW_REFERRALS_STATE)
    changes.append('✓ Change 2b: Referrals discount state added')
else:
    changes.append('✗ Change 2b FAILED — referrals state pattern not found')

# Update fetchReferrals to also call rewards endpoint
OLD_REFERRALS_FETCH = """  const fetchReferrals = useCallback(async (vid: string) => {
    try {
      const [codeRes, statsRes] = await Promise.all([
        fetch(`${BACKEND}/api/referral-code/${vid}`),
        fetch(`${BACKEND}/api/referrals/stats/${vid}`),
      ]);
      const codeJson = await codeRes.json();
      const statsJson = await statsRes.json();
      if (codeJson.success && codeJson.data?.code) setCode(codeJson.data.code);
      if (statsJson.success && statsJson.data) {
        setTotalReferrals(statsJson.data.total_referrals || 0);
        setTotalEarned(statsJson.data.total_earned || 0);
      }
    } catch {}
    setLoading(false);
  }, []);"""

NEW_REFERRALS_FETCH = """  const fetchReferrals = useCallback(async (vid: string) => {
    try {
      const [codeRes, statsRes, rewardsRes] = await Promise.all([
        fetch(`${BACKEND}/api/referral-code/${vid}`),
        fetch(`${BACKEND}/api/referrals/stats/${vid}`),
        fetch(`${BACKEND}/api/referrals/rewards/${vid}`),
      ]);
      const codeJson    = await codeRes.json();
      const statsJson   = await statsRes.json();
      const rewardsJson = await rewardsRes.json();
      if (codeJson.success && codeJson.data?.code) setCode(codeJson.data.code);
      if (statsJson.success && statsJson.data) {
        setTotalReferrals(statsJson.data.total_referrals || 0);
        setTotalEarned(statsJson.data.total_earned || 0);
      }
      if (rewardsJson.success && rewardsJson.data) {
        setDiscount(rewardsJson.data.discount || 0);
        setNextMilestone(rewardsJson.data.next_milestone || null);
      }
    } catch {}
    setLoading(false);
  }, []);"""

if OLD_REFERRALS_FETCH in referrals:
    referrals = referrals.replace(OLD_REFERRALS_FETCH, NEW_REFERRALS_FETCH)
    changes.append('✓ Change 2c: Referrals now fetches discount + milestone data')
else:
    changes.append('✗ Change 2c FAILED — referrals fetch pattern not found')

# Add discount card display — insert after the referral code card, before the CTA button
OLD_COPY_BTN = """              {/* CTA */}
              <button
                onClick={copyLink}
                style={{ width: '100%', background: '#111111', color: '#F8F7F5', border: 'none', borderRadius: 8, padding: '14px 0', fontFamily: \"'Jost', sans-serif\", fontWeight: 200, fontSize: 9, letterSpacing: '0.22em', cursor: 'pointer', touchAction: 'manipulation', willChange: 'opacity', transform: 'translateZ(0)', marginBottom: 16, transition: 'opacity 0.2s cubic-bezier(0.22,1,0.36,1)' }}
              >
                COPY REFERRAL LINK
              </button>

              <p style={{ fontFamily: \"'DM Sans', sans-serif\", fontSize: 12, color: '#888580', textAlign: 'center' }}>Earn when a vendor you refer joins TDW.</p>"""

NEW_COPY_BTN = """              {/* Discount earned */}
              {discount > 0 && (
                <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 12, padding: '14px 18px', marginBottom: 12, textAlign: 'center' }}>
                  <p style={{ fontFamily: \"'Jost', sans-serif\", fontWeight: 200, fontSize: 8, color: '#C9A84C', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 4px' }}>YOUR DISCOUNT</p>
                  <p style={{ fontFamily: \"'Cormorant Garamond', serif\", fontSize: 32, fontWeight: 300, color: '#C9A84C', margin: 0 }}>{discount}% off</p>
                  <p style={{ fontFamily: \"'DM Sans', sans-serif\", fontSize: 12, color: '#888580', margin: '4px 0 0' }}>applied to your next subscription bill</p>
                </div>
              )}

              {/* Next milestone */}
              {nextMilestone && (
                <div style={{ background: '#F8F7F5', border: '0.5px solid #E2DED8', borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
                  <p style={{ fontFamily: \"'Jost', sans-serif\", fontWeight: 200, fontSize: 8, color: '#888580', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 4px' }}>NEXT MILESTONE</p>
                  <p style={{ fontFamily: \"'DM Sans', sans-serif\", fontSize: 13, fontWeight: 300, color: '#111', margin: 0 }}>
                    {nextMilestone.referrals - totalReferrals} more referral{nextMilestone.referrals - totalReferrals !== 1 ? 's' : ''} → <strong style={{ color: '#C9A84C', fontWeight: 400 }}>{nextMilestone.discount}% off</strong>
                  </p>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={copyLink}
                style={{ width: '100%', background: '#111111', color: '#F8F7F5', border: 'none', borderRadius: 8, padding: '14px 0', fontFamily: \"'Jost', sans-serif\", fontWeight: 200, fontSize: 9, letterSpacing: '0.22em', cursor: 'pointer', touchAction: 'manipulation', willChange: 'opacity', transform: 'translateZ(0)', marginBottom: 16, transition: 'opacity 0.2s cubic-bezier(0.22,1,0.36,1)' }}
              >
                COPY REFERRAL LINK
              </button>

              <p style={{ fontFamily: \"'DM Sans', sans-serif\", fontSize: 12, color: '#888580', textAlign: 'center' }}>Earn when a vendor you refer joins TDW.</p>"""

if OLD_COPY_BTN in referrals:
    referrals = referrals.replace(OLD_COPY_BTN, NEW_COPY_BTN)
    changes.append('✓ Change 2d: Referrals discount + milestone display added')
else:
    changes.append('✗ Change 2d FAILED — copy button pattern not found')

with open(REFERRALS_PATH, 'w') as f:
    f.write(referrals)


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 3 — Broadcast: remove hardcoded duplicate nav
# ─────────────────────────────────────────────────────────────────────────────
BROADCAST_PATH = 'web/app/vendor/studio/broadcast/page.tsx'
with open(BROADCAST_PATH, 'r') as f:
    broadcast = f.read()

if DUPE_NAV in broadcast:
    broadcast = broadcast.replace(DUPE_NAV, NAV_COMMENT)
    with open(BROADCAST_PATH, 'w') as f:
        f.write(broadcast)
    changes.append('✓ Change 3: Broadcast duplicate nav removed')
else:
    changes.append('✗ Change 3 FAILED — broadcast nav pattern not found')


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 4 — Contracts: remove hardcoded duplicate nav
# ─────────────────────────────────────────────────────────────────────────────
CONTRACTS_PATH = 'web/app/vendor/studio/contracts/page.tsx'
with open(CONTRACTS_PATH, 'r') as f:
    contracts = f.read()

if DUPE_NAV in contracts:
    contracts = contracts.replace(DUPE_NAV, NAV_COMMENT)
    with open(CONTRACTS_PATH, 'w') as f:
        f.write(contracts)
    changes.append('✓ Change 4: Contracts duplicate nav removed')
else:
    changes.append('✗ Change 4 FAILED — contracts nav pattern not found')


# ─────────────────────────────────────────────────────────────────────────────
# Report
# ─────────────────────────────────────────────────────────────────────────────
print('\nPhase 8 — Studio sub-pages — complete\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Phase 8: studio pages — session keys, real profile strength, referral milestones, duplicate navs removed" && git push')
