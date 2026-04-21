'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Camera, Check, CheckCircle, Image as ImageIcon, Instagram,
  MapPin, Star, Trash2, Upload, X, Loader,
} from 'react-feather';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ── Brand tokens (match /vendor/mobile) ─────────────────────────────────

const C = {
  cream: '#F8F7F5',
  ivory: '#FFFFFF',
  pearl: '#F8F7F5',
  champagne: '#FFFFFF',
  goldSoft: '#FFF8EC',
  goldMist: '#FFF3DB',
  goldBorder: '#E2DED8',
  border: '#EDE8E0',
  borderSoft: '#F2EDE4',
  dark: '#111111',
  gold: '#C9A84C',
  goldDeep: '#B8963A',
  muted: '#888580',
  light: '#C8C4BE',
  green: '#4CAF50',
  greenSoft: 'rgba(76,175,80,0.08)',
  red: '#E57373',
  redSoft: 'rgba(229,115,115,0.06)',
  redBorder: 'rgba(229,115,115,0.22)',
};

// ── Curated options ─────────────────────────────────────────────────────

const VIBE_TAGS = [
  'Candid', 'Luxury', 'Cinematic', 'Royal', 'Editorial',
  'Festive', 'Traditional', 'Contemporary', 'Destination', 'Fusion',
];

const CATEGORIES: Record<string, string> = {
  'venues': 'Venues',
  'photographers': 'Photographers',
  'mua': 'Makeup Artists',
  'designers': 'Designers',
  'jewellery': 'Jewellery',
  'choreographers': 'Choreographers',
  'content-creators': 'Content Creators',
  'dj': 'DJ & Music',
  'event-managers': 'Event Managers',
  'bridal-wellness': 'Bridal Wellness',
};

const CLOUDINARY_CLOUD = 'dccso5ljv';
const CLOUDINARY_PRESET = 'dream_wedding_uploads';
const MIN_PHOTO_EDGE_PX = 1600;

// ── Helpers ─────────────────────────────────────────────────────────────

function getSession() {
  if (typeof window === 'undefined') return null;
  try { const s = localStorage.getItem('vendor_web_session'); return s ? JSON.parse(s) : null; } catch { return null; }
}

function readImageDimensions(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
    img.src = url;
  });
}

function getTierLabel(tier: string) {
  return tier === 'prestige' ? 'Prestige' : tier === 'signature' ? 'Signature' : 'Essential';
}

function getFeaturedCap(tier: string) {
  return tier === 'essential' ? 3 : 12;
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════════════

export default function VendorProfileEditPage() {
  const [session, setSession] = useState<any>(null);
  const [vendorData, setVendorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Editable fields
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [about, setAbout] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [vibeTags, setVibeTags] = useState<string[]>([]);
  const [instagram, setInstagram] = useState('');
  const [equipment, setEquipment] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [featuredPhotos, setFeaturedPhotos] = useState<string[]>([]);

  // UI state
  const [savingField, setSavingField] = useState<string | null>(null);
  const [savedField, setSavedField] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load vendor data on mount ──────────────────────────────────────────
  useEffect(() => {
    const s = getSession();
    if (!s?.vendorId) {
      window.location.href = '/vendor/mobile/login';
      return;
    }
    setSession(s);

    fetch(`${API}/api/vendors/${s.vendorId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          const v = d.data;
          setVendorData(v);
          setName(v.name || '');
          setCity(v.city || '');
          setAbout(v.about || '');
          setStartingPrice(v.starting_price ? String(v.starting_price) : '');
          setVibeTags(v.vibe_tags || []);
          setInstagram((v.instagram_url || '').replace(/^@/, ''));
          setEquipment(v.equipment || '');
          setDeliveryTime(v.delivery_time || '');
          setPortfolioImages(v.portfolio_images || []);
          setFeaturedPhotos(v.featured_photos || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const tier: string = session?.tier || vendorData?.tier || 'essential';
  const featuredCap = getFeaturedCap(tier);

  // ── PATCH a single field to backend ────────────────────────────────────
  const patchField = async (fieldKey: string, body: any) => {
    if (!vendorData?.id) return;
    setSavingField(fieldKey);
    try {
      const r = await fetch(`${API}/api/vendors/${vendorData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.success || r.ok) {
        setSavedField(fieldKey);
        setTimeout(() => setSavedField(p => p === fieldKey ? null : p), 1800);
      }
    } catch {
      // Fail silently; vendor can retry by editing again
    } finally {
      setSavingField(null);
    }
  };

  // ── Field save handlers (on blur) ──────────────────────────────────────
  const saveName = () => {
    if (name === (vendorData?.name || '')) return;
    patchField('name', { name: name.trim() });
  };
  const saveCity = () => {
    if (city === (vendorData?.city || '')) return;
    patchField('city', { city: city.trim() });
  };
  const saveAbout = () => {
    if (about === (vendorData?.about || '')) return;
    patchField('about', { about });
  };
  const savePrice = () => {
    const cleaned = startingPrice.replace(/[^0-9]/g, '');
    const asNum = cleaned ? parseInt(cleaned) : null;
    if (asNum === (vendorData?.starting_price || null)) return;
    patchField('price', { starting_price: asNum });
  };
  const saveInstagram = () => {
    const cleaned = instagram.trim().replace(/^@/, '');
    const current = (vendorData?.instagram_url || '').replace(/^@/, '');
    if (cleaned === current) return;
    patchField('instagram', { instagram_url: cleaned ? '@' + cleaned : '' });
  };
  const saveEquipment = () => {
    if (equipment === (vendorData?.equipment || '')) return;
    patchField('equipment', { equipment });
  };
  const saveDeliveryTime = () => {
    if (deliveryTime === (vendorData?.delivery_time || '')) return;
    patchField('delivery_time', { delivery_time: deliveryTime });
  };
  const toggleVibeTag = (tag: string) => {
    const next = vibeTags.includes(tag) ? vibeTags.filter(t => t !== tag) : [...vibeTags, tag];
    setVibeTags(next);
    patchField('tags', { vibe_tags: next });
  };

  // ── Photo upload ───────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError('');
    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Validate dimensions
        try {
          const dims = await readImageDimensions(file);
          if (Math.max(dims.w, dims.h) < MIN_PHOTO_EDGE_PX) {
            setUploadError(`${file.name}: min ${MIN_PHOTO_EDGE_PX}px on longest side required (got ${dims.w}×${dims.h})`);
            continue;
          }
        } catch {
          setUploadError(`${file.name}: could not read image`);
          continue;
        }
        // Upload to Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
          method: 'POST', body: formData,
        });
        const data = await res.json();
        if (data.secure_url) newUrls.push(data.secure_url);
      }

      if (newUrls.length > 0 && vendorData?.id) {
        const updated = [...portfolioImages, ...newUrls];
        setPortfolioImages(updated);
        patchField('photos', { portfolio_images: updated });
      }
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deletePhoto = async (url: string) => {
    if (!confirm('Remove this photo from your portfolio?')) return;
    const nextPortfolio = portfolioImages.filter(p => p !== url);
    const nextFeatured = featuredPhotos.filter(p => p !== url);
    setPortfolioImages(nextPortfolio);
    setFeaturedPhotos(nextFeatured);
    setPreviewPhoto(null);
    patchField('photos', { portfolio_images: nextPortfolio, featured_photos: nextFeatured });
  };

  const toggleFeatured = async (url: string) => {
    const isFeatured = featuredPhotos.includes(url);
    let next: string[];
    if (isFeatured) {
      next = featuredPhotos.filter(p => p !== url);
    } else {
      if (featuredPhotos.length >= featuredCap) {
        alert(`You can feature up to ${featuredCap} photos on ${getTierLabel(tier)}.`);
        return;
      }
      next = [...featuredPhotos, url];
    }
    setFeaturedPhotos(next);
    patchField('featured', { featured_photos: next });
  };

  // ── Computed ───────────────────────────────────────────────────────────
  const completionSteps = [
    { key: 'photos',   done: portfolioImages.length >= 10 },
    { key: 'featured', done: featuredPhotos.length >= 3 },
    { key: 'price',    done: !!startingPrice },
    { key: 'bio',      done: about.length >= 100 },
    { key: 'tags',     done: vibeTags.length >= 3 },
  ];
  const completedCount = completionSteps.filter(s => s.done).length;
  const completionPercent = Math.round((completedCount / completionSteps.length) * 100);

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh', background: C.cream,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif', color: C.muted,
      }}>Loading your profile…</div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: C.cream,
      fontFamily: 'DM Sans, sans-serif',
      color: C.dark,
      paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
      maxWidth: '480px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: C.cream, padding: '16px 18px 14px',
        borderBottom: `1px solid ${C.borderSoft}`,
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        <button
          onClick={() => { window.location.href = '/vendor/mobile'; }}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '6px', display: 'flex', alignItems: 'center',
          }}
          aria-label="Back"
        >
          <ArrowLeft size={20} color={C.dark} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '20px', color: C.dark, fontWeight: 400,
            letterSpacing: '0.2px', lineHeight: 1,
          }}>Profile</div>
          <div style={{
            fontSize: '10px', color: C.muted, marginTop: '4px',
            fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase',
          }}>
            {completionPercent}% complete · Changes save automatically
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* ── Identity card ── */}
        <Section label="Who you are">
          <FieldLabel>Business name</FieldLabel>
          <TextInput
            value={name}
            onChange={setName}
            onBlur={saveName}
            saving={savingField === 'name'}
            saved={savedField === 'name'}
            placeholder="Your business or studio name"
          />

          <FieldLabel style={{ marginTop: '14px' }}>Category</FieldLabel>
          <div style={{
            padding: '13px 14px',
            background: C.pearl,
            border: `1px solid ${C.borderSoft}`,
            borderRadius: '10px',
            fontSize: '14px', color: C.muted,
          }}>
            {CATEGORIES[vendorData?.category || ''] || vendorData?.category || 'Not set'}
            <span style={{ fontSize: '10px', marginLeft: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>· Fixed</span>
          </div>

          <FieldLabel style={{ marginTop: '14px' }}>City</FieldLabel>
          <TextInput
            value={city}
            onChange={setCity}
            onBlur={saveCity}
            saving={savingField === 'city'}
            saved={savedField === 'city'}
            placeholder="e.g. Mumbai, Delhi NCR"
            icon={<MapPin size={14} color={C.muted} />}
          />
        </Section>

        {/* ── Portfolio photos ── */}
        <Section
          label="Portfolio photos"
          sublabel={`${portfolioImages.length} uploaded · ${featuredPhotos.length}/${featuredCap} featured`}
        >
          {/* Guidance */}
          <div style={{
            background: C.goldSoft,
            border: `1px solid ${C.goldBorder}`,
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '11px', color: C.goldDeep, lineHeight: 1.55,
            marginBottom: '14px',
          }}>
            <strong style={{ color: C.dark, fontWeight: 600 }}>Tip:</strong>{' '}
            Tap the ★ on a photo to mark it as featured. Featured photos appear in the couple's Discover feed.
            Minimum {MIN_PHOTO_EDGE_PX}px on the longest side for quality.
          </div>

          {/* Upload button */}
          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: uploading ? C.pearl : C.ivory,
            border: `1.5px dashed ${C.goldBorder}`,
            borderRadius: '12px',
            padding: '18px',
            cursor: uploading ? 'wait' : 'pointer',
            color: C.goldDeep, fontSize: '12px', fontWeight: 600,
            letterSpacing: '1.5px', textTransform: 'uppercase',
            fontFamily: 'DM Sans, sans-serif',
            marginBottom: '14px',
          }}>
            {uploading ? <Loader size={16} /> : <Upload size={16} />}
            {uploading ? 'Uploading…' : 'Upload photos'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>

          {uploadError && (
            <div style={{
              background: C.redSoft, border: `1px solid ${C.redBorder}`,
              borderRadius: '8px', padding: '10px 12px',
              fontSize: '11px', color: C.red, marginBottom: '14px',
              lineHeight: 1.5,
            }}>{uploadError}</div>
          )}

          {/* Grid */}
          {portfolioImages.length === 0 ? (
            <div style={{
              background: C.pearl, borderRadius: '12px',
              padding: '32px 16px', textAlign: 'center',
              color: C.muted, fontSize: '12px', fontStyle: 'italic',
            }}>
              No photos yet. Upload your best work to appear in the Discover feed.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {portfolioImages.map((url) => {
                const isFeatured = featuredPhotos.includes(url);
                return (
                  <div
                    key={url}
                    onClick={() => setPreviewPhoto(url)}
                    style={{
                      position: 'relative',
                      aspectRatio: '1 / 1',
                      background: C.pearl,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: isFeatured ? `1.5px solid ${C.gold}` : `1px solid ${C.borderSoft}`,
                    }}
                  >
                    <img
                      src={url}
                      alt="Portfolio"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    {/* Featured star toggle */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFeatured(url); }}
                      style={{
                        position: 'absolute', top: '8px', right: '8px',
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: isFeatured ? C.gold : 'rgba(255,255,255,0.92)',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                      }}
                      aria-label={isFeatured ? 'Unmark featured' : 'Mark as featured'}
                    >
                      <Star
                        size={14}
                        color={isFeatured ? C.ivory : C.goldDeep}
                        fill={isFeatured ? C.ivory : 'none'}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ── About / Bio ── */}
        <Section label="Your story" sublabel={`${about.length} / 100+ characters`}>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            onBlur={saveAbout}
            rows={6}
            placeholder="Tell couples what makes you different. Your style, your experience, what they can expect working with you."
            style={{
              width: '100%',
              background: C.ivory,
              border: `1px solid ${about.length >= 100 ? C.goldBorder : C.border}`,
              borderRadius: '12px',
              padding: '14px',
              fontSize: '14px',
              color: C.dark,
              fontFamily: 'DM Sans, sans-serif',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <SaveIndicator saving={savingField === 'about'} saved={savedField === 'about'} />
        </Section>

        {/* ── Pricing ── */}
        <Section label="Starting price">
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: C.ivory,
            border: `1px solid ${C.border}`,
            borderRadius: '12px',
            padding: '13px 14px',
          }}>
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '18px', color: C.goldDeep, fontWeight: 400,
            }}>₹</span>
            <input
              type="text"
              inputMode="numeric"
              value={startingPrice ? parseInt(startingPrice).toLocaleString('en-IN') : ''}
              onChange={(e) => setStartingPrice(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={savePrice}
              placeholder="e.g. 150000"
              style={{
                flex: 1,
                background: 'transparent', border: 'none',
                fontSize: '18px',
                fontFamily: "'Playfair Display', serif",
                color: C.dark, fontWeight: 400,
                outline: 'none',
              }}
            />
            <SaveIndicator saving={savingField === 'price'} saved={savedField === 'price'} inline />
          </div>
          <div style={{ fontSize: '10px', color: C.muted, marginTop: '6px', fontStyle: 'italic' }}>
            The lowest price at which you'll consider a booking.
          </div>
        </Section>

        {/* ── Vibe tags ── */}
        <Section label="Your vibe" sublabel={`${vibeTags.length} / 3+ selected`}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {VIBE_TAGS.map(tag => {
              const active = vibeTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleVibeTag(tag)}
                  style={{
                    background: active ? C.goldSoft : C.ivory,
                    color: active ? C.goldDeep : C.muted,
                    border: `1px solid ${active ? C.gold : C.border}`,
                    borderRadius: '50px',
                    padding: '9px 16px',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '11px', fontWeight: active ? 600 : 500,
                    letterSpacing: active ? '1.2px' : '0.8px',
                    textTransform: active ? 'uppercase' : 'none',
                    cursor: 'pointer',
                  }}
                >{tag}</button>
              );
            })}
          </div>
        </Section>

        {/* ── Instagram ── */}
        <Section label="Instagram">
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: C.ivory,
            border: `1px solid ${C.border}`,
            borderRadius: '12px',
            padding: '13px 14px',
          }}>
            <Instagram size={16} color={C.muted} />
            <span style={{ fontSize: '14px', color: C.muted }}>@</span>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value.replace(/^@/, ''))}
              onBlur={saveInstagram}
              placeholder="your_handle"
              autoCapitalize="none"
              style={{
                flex: 1,
                background: 'transparent', border: 'none',
                fontSize: '14px', color: C.dark,
                fontFamily: 'DM Sans, sans-serif',
                outline: 'none',
              }}
            />
            <SaveIndicator saving={savingField === 'instagram'} saved={savedField === 'instagram'} inline />
          </div>
        </Section>

        {/* ── Equipment / services ── */}
        <Section label="Equipment & services">
          <textarea
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            onBlur={saveEquipment}
            rows={3}
            placeholder="e.g. Canon R5, Sony A7IV, DJI Mavic 3 · Full day coverage · 2 photographers"
            style={{
              width: '100%',
              background: C.ivory,
              border: `1px solid ${C.border}`,
              borderRadius: '12px',
              padding: '13px 14px',
              fontSize: '13px', color: C.dark,
              fontFamily: 'DM Sans, sans-serif',
              lineHeight: 1.55,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <SaveIndicator saving={savingField === 'equipment'} saved={savedField === 'equipment'} />
        </Section>

        {/* ── Delivery time ── */}
        <Section label="Delivery time">
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: C.ivory,
            border: `1px solid ${C.border}`,
            borderRadius: '12px',
            padding: '13px 14px',
          }}>
            <input
              type="text"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              onBlur={saveDeliveryTime}
              placeholder="e.g. 6-8 weeks, Same day, Lead time 4 months"
              style={{
                flex: 1,
                background: 'transparent', border: 'none',
                fontSize: '13px', color: C.dark,
                fontFamily: 'DM Sans, sans-serif',
                outline: 'none',
              }}
            />
            <SaveIndicator saving={savingField === 'delivery'} saved={savedField === 'delivery'} inline />
          </div>
        </Section>

        {/* ── Completion footer ── */}
        <div style={{
          background: C.champagne,
          border: `1px solid ${C.goldBorder}`,
          borderRadius: '18px',
          padding: '20px',
          marginTop: '10px',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '10px', fontWeight: 600,
            letterSpacing: '2.5px', textTransform: 'uppercase',
            color: C.goldDeep, marginBottom: '8px',
          }}>Profile {completionPercent}% Complete</div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '18px', color: C.dark, fontWeight: 400,
            letterSpacing: '0.2px', lineHeight: 1.3, marginBottom: '14px',
          }}>
            {completionPercent === 100
              ? 'Your profile is ready.'
              : `${5 - completedCount} step${5 - completedCount === 1 ? '' : 's'} to a standout profile.`}
          </div>
          <button
            onClick={() => { window.location.href = '/vendor/mobile'; }}
            style={{
              background: C.gold, color: C.ivory,
              border: 'none', borderRadius: '10px',
              padding: '12px 24px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px', fontWeight: 600,
              letterSpacing: '1.8px', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >Back to Dashboard</button>
        </div>
      </div>

      {/* ── Photo preview modal ── */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(26,20,16,0.88)',
            zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '480px', width: '100%',
              display: 'flex', flexDirection: 'column', gap: '14px',
            }}
          >
            <img
              src={previewPhoto}
              alt="Preview"
              style={{
                width: '100%', borderRadius: '14px',
                maxHeight: '75vh', objectFit: 'contain',
                background: C.dark,
              }}
            />
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => toggleFeatured(previewPhoto)}
                style={{
                  flex: 1,
                  background: featuredPhotos.includes(previewPhoto) ? C.gold : 'rgba(255,255,255,0.1)',
                  color: featuredPhotos.includes(previewPhoto) ? C.ivory : C.cream,
                  border: `1px solid ${featuredPhotos.includes(previewPhoto) ? C.gold : 'rgba(255,255,255,0.2)'}`,
                  borderRadius: '10px',
                  padding: '12px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px', fontWeight: 600,
                  letterSpacing: '1.5px', textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                <Star size={12} fill={featuredPhotos.includes(previewPhoto) ? C.ivory : 'none'} />
                {featuredPhotos.includes(previewPhoto) ? 'Featured' : 'Mark Featured'}
              </button>
              <button
                onClick={() => deletePhoto(previewPhoto)}
                style={{
                  background: 'transparent',
                  color: C.red,
                  border: `1px solid rgba(229,115,115,0.4)`,
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px', fontWeight: 600,
                  letterSpacing: '1.5px', textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <Trash2 size={12} /> Remove
              </button>
              <button
                onClick={() => setPreviewPhoto(null)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: C.cream, border: 'none',
                  borderRadius: '50%', width: '44px', height: '44px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ══════════════════════════════════════════════════════════════════════════

function Section({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: C.ivory,
      borderRadius: '18px',
      border: `1px solid ${C.border}`,
      padding: '20px 18px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: '14px',
      }}>
        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '9px', fontWeight: 600,
          letterSpacing: '2.5px', textTransform: 'uppercase',
          color: C.goldDeep,
        }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: '10px', color: C.muted, fontStyle: 'italic' }}>
            {sublabel}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '10px', fontWeight: 500,
      letterSpacing: '1.5px', textTransform: 'uppercase',
      color: C.muted, marginBottom: '6px',
      ...style,
    }}>{children}</div>
  );
}

function TextInput({
  value, onChange, onBlur, placeholder, saving, saved, icon,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder?: string;
  saving?: boolean;
  saved?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      background: C.ivory,
      border: `1px solid ${C.border}`,
      borderRadius: '12px',
      padding: '13px 14px',
    }}>
      {icon}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        style={{
          flex: 1,
          background: 'transparent', border: 'none',
          fontSize: '14px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif',
          outline: 'none',
        }}
      />
      <SaveIndicator saving={saving} saved={saved} inline />
    </div>
  );
}

function SaveIndicator({ saving, saved, inline }: { saving?: boolean; saved?: boolean; inline?: boolean }) {
  if (!saving && !saved) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      marginTop: inline ? 0 : '8px',
      fontSize: '10px',
      color: saved ? C.green : C.muted,
      letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500,
    }}>
      {saving && <Loader size={10} />}
      {saved && <Check size={12} />}
      {saving ? 'Saving' : 'Saved'}
    </div>
  );
}
