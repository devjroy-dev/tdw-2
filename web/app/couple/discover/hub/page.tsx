'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, X } from 'lucide-react';

type CardId = 'myfeed' | 'blind' | 'featured' | 'couture' | 'categories' | 'curated';
interface FilterState { category: string; minBudget: string; maxBudget: string; city: string; }
const EMPTY_FILTERS: FilterState = { category: '', minBudget: '', maxBudget: '', city: '' };
const CATEGORIES = ['Photography','Venues','Makeup & Hair','Decor','Designers','Event Managers'];
const CITIES = ['Mumbai','Delhi','Bangalore','Pune','Ahmedabad','Chennai','Kolkata','Jaipur'];

function buildFeedUrl(mode: string, f: FilterState) {
  const p = new URLSearchParams({ mode });
  if (f.category) p.set('category', f.category);
  if (f.minBudget) p.set('minBudget', f.minBudget);
  if (f.maxBudget) p.set('maxBudget', f.maxBudget);
  if (f.city) p.set('city', f.city);
  return `/couple/discover/feed?${p.toString()}`;
}

function ComingSoonModal({ card, onClose }: { card: 'couture' | 'curated'; onClose: () => void }) {
  const c = card === 'couture'
    ? { icon: '✦', title: 'Couture', tagline: 'Ultra-premium wedding fashion, curated for you.', description: 'The finest Indian bridal designers. Bespoke lehengas, heritage jewellery, and couture looks — all in one place. Appointment-only. Invitation-only.', badge: 'Launching Q3 2026', cta: 'Request Early Access' }
    : { icon: '◈', title: 'Curated Packages', tagline: 'Your entire wedding, handled.', description: 'Full-service wedding packages from ₹25 lakhs. One booking covers your venue, photography, décor, catering, and more — handpicked and coordinated by TDW.', badge: 'Coming Soon', cta: 'Notify Me' };
  return (
    <>
      <style>{`@keyframes bIn{from{opacity:0}to{opacity:1}}@keyframes sUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:500,background:'rgba(17,17,17,0.45)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)',animation:'bIn 220ms ease' }} />
      <div style={{ position:'fixed',bottom:0,left:0,right:0,zIndex:501,background:'#FFFFFF',borderRadius:'24px 24px 0 0',paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 36px)',animation:'sUp 320ms cubic-bezier(0.22,1,0.36,1)',boxShadow:'0 -8px 48px rgba(17,17,17,0.14)' }}>
        <div style={{ display:'flex',justifyContent:'center',padding:'14px 0 0' }}>
          <div style={{ width:36,height:4,borderRadius:2,background:'#E2DED8' }} />
        </div>
        <button onClick={onClose} style={{ position:'absolute',top:18,right:20,width:30,height:30,borderRadius:'50%',background:'rgba(17,17,17,0.06)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
          <X size={14} color="#555250" strokeWidth={2} />
        </button>
        <div style={{ padding:'24px 28px 0' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
            <span style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:'#C9A84C',lineHeight:1 }}>{c.icon}</span>
            <span style={{ fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.2em',textTransform:'uppercase',color:'#C9A84C',background:'rgba(201,168,76,0.08)',border:'0.5px solid rgba(201,168,76,0.35)',borderRadius:20,padding:'5px 12px' }}>{c.badge}</span>
          </div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:30,fontWeight:300,color:'#111111',margin:'0 0 8px',letterSpacing:'-0.01em',lineHeight:1.1 }}>{c.title}</h2>
          <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:300,fontStyle:'italic',color:'#888580',margin:'0 0 20px',lineHeight:1.5 }}>{c.tagline}</p>
          <div style={{ height:'0.5px',background:'#E2DED8',margin:'0 0 20px' }} />
          <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:300,color:'#555250',margin:'0 0 32px',lineHeight:1.7 }}>{c.description}</p>
          <button onClick={onClose} style={{ width:'100%',padding:'15px 0',background:'#111111',border:'none',borderRadius:10,fontFamily:"'Jost',sans-serif",fontSize:10,fontWeight:300,letterSpacing:'0.22em',textTransform:'uppercase',color:'#F8F7F5',cursor:'pointer',marginBottom:12,touchAction:'manipulation' }}>{c.cta}</button>
          <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:300,color:'#C8C4BE',fontStyle:'italic',textAlign:'center',margin:0,lineHeight:1.6 }}>We'll let you know the moment it's ready.</p>
        </div>
      </div>
    </>
  );
}

function FilterRow({ filters, onChange, hideBudget }: { filters: FilterState; onChange: (f: FilterState) => void; hideBudget?: boolean }) {
  const sel: React.CSSProperties = { width:'100%',padding:'11px 14px',background:'#F8F7F5',border:'0.5px solid #E2DED8',borderRadius:8,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#111111',cursor:'pointer',appearance:'none',WebkitAppearance:'none',outline:'none' };
  const inp: React.CSSProperties = { flex:1,padding:'11px 14px',background:'#F8F7F5',border:'0.5px solid #E2DED8',borderRadius:8,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#111111',outline:'none',width:'100%' };
  const lbl: React.CSSProperties = { fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.2em',textTransform:'uppercase',color:'#888580',display:'block',marginBottom:6 };
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:12,padding:'16px 0 4px' }}>
      <div>
        <label style={lbl}>Category</label>
        <select value={filters.category} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({...filters,category:e.target.value})} style={sel}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
        </select>
      </div>
      {!hideBudget && (
      <div>
        <label style={lbl}>Budget</label>
        <div style={{ display:'flex',gap:8 }}>
          <input type="number" placeholder="Min ₹" value={filters.minBudget} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({...filters,minBudget:e.target.value})} style={inp} />
          <input type="number" placeholder="Max ₹" value={filters.maxBudget} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({...filters,maxBudget:e.target.value})} style={inp} />
        </div>
      </div>
      )}
      <div>
        <label style={lbl}>City</label>
        <select value={filters.city} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({...filters,city:e.target.value})} style={sel}>
          <option value="">All cities</option>
          {CITIES.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
        </select>
      </div>
    </div>
  );
}

function CapsuleCard({ id, title, subtitle, isOpen, onToggle, onBrowse, comingSoon, onComingSoon, filters, onFiltersChange, browseLabel }: {
  id: CardId; title: string; subtitle: string; isOpen: boolean; onToggle: () => void; onBrowse: () => void;
  comingSoon?: boolean; onComingSoon?: () => void; filters: FilterState; onFiltersChange: (f: FilterState) => void; browseLabel: string;
}) {
  // Card row click → browse directly (or coming soon modal)
  // Chevron click → expand/collapse filters
  const handleCardClick = () => {
    if (comingSoon) { onComingSoon?.(); return; }
    onBrowse();
  };
  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  return (
    <div style={{ background:'#FFFFFF',border:'0.5px solid #E2DED8',borderRadius:12,overflow:'hidden',transition:'box-shadow 220ms ease',boxShadow:isOpen?'0 4px 20px rgba(17,17,17,0.07)':'0 1px 4px rgba(17,17,17,0.04)' }}>
      {/* Header row: clicking anywhere → browse; chevron only → expand */}
      <div
        onClick={handleCardClick}
        style={{ width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 20px',background:'none',cursor:'pointer',touchAction:'manipulation',gap:12 }}
      >
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <h3 style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:300,color:'#111111',margin:0,letterSpacing:'-0.01em',lineHeight:1 }}>{title}</h3>
            {comingSoon && <span style={{ fontFamily:"'Jost',sans-serif",fontSize:8,fontWeight:300,letterSpacing:'0.18em',textTransform:'uppercase',color:'#C9A84C',background:'rgba(201,168,76,0.08)',border:'0.5px solid rgba(201,168,76,0.3)',borderRadius:20,padding:'3px 8px',whiteSpace:'nowrap',flexShrink:0 }}>Soon</span>}
          </div>
          <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,color:'#888580',margin:'4px 0 0',lineHeight:1.4 }}>{subtitle}</p>
        </div>
        {/* Chevron — only expands filters, doesn't navigate */}
        {!comingSoon ? (
          <div
            onClick={handleChevronClick}
            style={{ flexShrink:0,color:'#C8C4BE',padding:'4px 0 4px 12px',cursor:'pointer',transition:'transform 220ms ease',transform:isOpen?'rotate(180deg)':'rotate(0deg)' }}
          >
            <ChevronDown size={18} strokeWidth={1.5} />
          </div>
        ) : (
          <div style={{ flexShrink:0,color:'#C8C4BE' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        )}
      </div>
      {/* Filter panel — only shows when chevron tapped */}
      {isOpen && !comingSoon && (
        <div style={{ padding:'0 20px 20px',borderTop:'0.5px solid #F0EDE8' }}>
          <FilterRow filters={filters} onChange={onFiltersChange} hideBudget={id === 'blind'} />
          <button onClick={(e) => { e.stopPropagation(); onBrowse(); }} style={{ width:'100%',padding:'14px 0',marginTop:16,background:'#111111',border:'none',borderRadius:10,fontFamily:"'Jost',sans-serif",fontSize:10,fontWeight:300,letterSpacing:'0.22em',textTransform:'uppercase',color:'#F8F7F5',cursor:'pointer',touchAction:'manipulation' }}>
            {browseLabel}
          </button>
        </div>
      )}
    </div>
  );
}

export default function DiscoverHub() {
  const router = useRouter();
  const [openCard, setOpenCard] = useState<CardId | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<{id:string;name:string;category:string;city?:string}[]>([]);
  const [showResults, setShowResults] = useState(false);
  const API = 'https://dream-wedding-production-89ae.up.railway.app';
  const [comingSoonModal, setComingSoonModal] = useState<'couture'|'curated'|null>(null);
  // Sticky filters — persisted in localStorage, blind mode always resets
  const STORAGE_KEY = 'tdw_hub_filters';
  const defaultFilters: Record<CardId, FilterState> = {
    myfeed: {...EMPTY_FILTERS}, blind: {...EMPTY_FILTERS}, featured: {...EMPTY_FILTERS},
    couture: {...EMPTY_FILTERS}, categories: {...EMPTY_FILTERS}, curated: {...EMPTY_FILTERS},
  };
  const loadFilters = (): Record<CardId, FilterState> => {
    if (typeof window === 'undefined') return defaultFilters;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Always reset blind mode filters
        return { ...defaultFilters, ...parsed, blind: {...EMPTY_FILTERS} };
      }
    } catch {}
    return defaultFilters;
  };
  const [filters, setFiltersState] = useState<Record<CardId, FilterState>>(loadFilters);
  const setFilters = (updater: (prev: Record<CardId, FilterState>) => Record<CardId, FilterState>) => {
    setFiltersState(prev => {
      const next = updater(prev);
      if (typeof window !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  };

  type CardDef = { id: CardId; title: string; subtitle: string; mode: string; browseLabel: string; comingSoon?: boolean };
  const CARDS: CardDef[] = [
    { id:'myfeed' as CardId,    title:'My Feed',           subtitle:'Browse all curated wedding Makers',                    mode:'discover',    browseLabel:'Browse My Feed' },
    { id:'blind' as CardId,     title:'Blind',             subtitle:'Pure photos, no names. Swipe on instinct.',            mode:'blind',       browseLabel:'Enter Blind Mode' },
    { id:'featured' as CardId,  title:'Featured',          subtitle:'Prestige Makers, premium work, ₹2L+',                 mode:'featured',    browseLabel:'Browse Featured' },
    { id:'couture' as CardId,   title:'Couture',           subtitle:'Invitation-only bridal fashion & jewellery',           mode:'couture',     browseLabel:'', comingSoon:false },
    { id:'categories' as CardId,title:'Categories',        subtitle:'Photographers, venues, MUA, decor & more',             mode:'categories',  browseLabel:'Browse Category' },
    { id:'curated' as CardId,   title:'Curated Packages',  subtitle:'Full-service wedding packages from ₹25L',              mode:'curated',     browseLabel:'', comingSoon:true },
  ];

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');`}</style>
      <div style={{ fontFamily:"'DM Sans',sans-serif",background:'#F8F7F5',minHeight:'100dvh',padding:'28px 16px',paddingBottom:'calc(80px + env(safe-area-inset-bottom,0px))' }}>

        {/* Search bar */}
        <div style={{ position:'relative', marginBottom:20 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8C4BE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search for a Maker by name..."
            value={searchQ}
            onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
              const q = e.target.value;
              setSearchQ(q);
              if (q.trim().length >= 2) {
                try {
                  const res = await fetch(`${API}/api/vendors/search?q=${encodeURIComponent(q.trim())}`);
                  const json = await res.json();
                  setSearchResults(json.success ? json.data : []);
                  setShowResults(true);
                } catch { setSearchResults([]); }
              } else { setSearchResults([]); setShowResults(false); }
            }}
            style={{ width:'100%', padding:'10px 16px 10px 36px',
              background:'#FFFFFF', border:'0.5px solid #E2DED8', borderRadius:20,
              fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300,
              color:'#111111', outline:'none', boxSizing:'border-box' as const }}
          />
          {/* Search results dropdown */}
          {showResults && searchResults.length > 0 && (
            <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:100,
              background:'#FFFFFF', border:'0.5px solid #E2DED8', borderRadius:12,
              boxShadow:'0 8px 24px rgba(17,17,17,0.1)', overflow:'hidden' }}>
              {searchResults.map((v: {id:string;name:string;category:string;city?:string}) => (
                <div key={v.id} onClick={() => { router.push(buildFeedUrl('discover', {...EMPTY_FILTERS, category: v.category})); setShowResults(false); setSearchQ(''); }}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'12px 16px', borderBottom:'0.5px solid #F0EDE8', cursor:'pointer',
                    touchAction:'manipulation' }}>
                  <div>
                    <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:300,
                      color:'#111111', margin:'0 0 2px', letterSpacing:'-0.01em' }}>{v.name}</p>
                    <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300,
                      letterSpacing:'0.15em', textTransform:'uppercase', color:'#888580', margin:0 }}>
                      {v.category}{v.city ? ` · ${v.city}` : ''}
                    </p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8C4BE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Header */}
        <div style={{ marginBottom:28 }}>
          <p style={{ fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.25em',textTransform:'uppercase',color:'#C9A84C',margin:'0 0 8px' }}>Discover</p>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:34,fontWeight:300,color:'#111111',margin:0,letterSpacing:'-0.01em',lineHeight:1.1 }}>Find your Makers</h1>
          <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#888580',margin:'8px 0 0',lineHeight:1.5 }}>Curated wedding professionals, carefully invited.</p>
        </div>

        {/* Cards */}
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {CARDS.map((card: CardDef) => (
            <CapsuleCard
              key={card.id}
              id={card.id}
              title={card.title}
              subtitle={card.subtitle}
              isOpen={openCard === card.id}
              onToggle={(): void => { setOpenCard((prev: CardId | null) => prev === card.id ? null : card.id); }}
              onBrowse={(): void => { 
                if (card.id === 'couture') { router.push('/couple/discover/couture'); return; }
                router.push(buildFeedUrl(card.mode, filters[card.id as CardId])); 
              }}
              comingSoon={card.comingSoon || undefined}
              onComingSoon={(card.id==='couture'||card.id==='curated') ? (): void => { setComingSoonModal(card.id as 'couture'|'curated'); } : undefined}
              filters={filters[card.id as CardId] as FilterState}
              onFiltersChange={(f: FilterState): void => { setFilters((prev: Record<CardId, FilterState>) => ({...prev,[card.id]:f})); }}
              browseLabel={card.browseLabel}
            />
          ))}
        </div>
      </div>

      {comingSoonModal && <ComingSoonModal card={comingSoonModal} onClose={() => setComingSoonModal(null)} />}
    </>
  );
}
