/**
 * app/(vendor)/profile-edit.tsx
 * Exact port of web/app/vendor/mobile/profile/edit/page.tsx
 * GET /api/vendors/:vendorId
 * PATCH /api/vendors/:vendorId
 * POST https://api.cloudinary.com/v1_1/dccso5ljv/image/upload
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Animated, Alert, Image,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Check, Instagram, MapPin, Star, Trash2, Upload } from 'lucide-react-native';
import { RAILWAY_URL } from '../../constants/tokens';
import { getVendorSession } from '../../utils/session';

const API = RAILWAY_URL;
const CLOUD = 'dccso5ljv';
const PRESET = 'dream_wedding_uploads';

const BG     = '#F8F7F5';
const CARD   = '#FFFFFF';
const GOLD   = '#C9A84C';
const DARK   = '#111111';
const MUTED  = '#8C8480';
const BORDER = '#E2DED8';
const GREEN  = '#4A7C59';
const RED    = '#E57373';

const CG300  = 'CormorantGaramond_300Light';
const DM300  = 'DMSans_300Light';
const DM400  = 'DMSans_400Regular';
const JOST200 = 'Jost_200ExtraLight';
const JOST   = 'Jost_300Light';
const JOST400 = 'Jost_400Regular';

const VIBE_TAGS = ['Candid','Luxury','Cinematic','Royal','Editorial','Festive','Traditional','Contemporary','Destination','Fusion'];
const CATEGORIES: Record<string,string> = {
  venues:'Venues', photographers:'Photographers', mua:'Makeup Artists',
  designers:'Designers', jewellery:'Jewellery', choreographers:'Choreographers',
  'content-creators':'Content Creators', dj:'DJ & Music',
  'event-managers':'Event Managers', 'bridal-wellness':'Bridal Wellness',
};

function getFeaturedCap(tier: string) { return tier === 'essential' ? 3 : 12; }

export default function VendorProfileEditScreen() {
  const [vendorData,      setVendorData]      = useState<any>(null);
  const [loading,         setLoading]         = useState(true);
  const [name,            setName]            = useState('');
  const [city,            setCity]            = useState('');
  const [about,           setAbout]           = useState('');
  const [startingPrice,   setStartingPrice]   = useState('');
  const [vibeTags,        setVibeTags]        = useState<string[]>([]);
  const [instagram,       setInstagram]       = useState('');
  const [equipment,       setEquipment]       = useState('');
  const [deliveryTime,    setDeliveryTime]    = useState('');
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [featuredPhotos,  setFeaturedPhotos]  = useState<string[]>([]);
  const [savingField,     setSavingField]     = useState<string|null>(null);
  const [savedField,      setSavedField]      = useState<string|null>(null);
  const [uploading,       setUploading]       = useState(false);
  const [toast,           setToast]           = useState('');
  const [tier,            setTier]            = useState('essential');
  const toastAnim = useRef(new Animated.Value(0)).current;

  function showToast(msg: string) {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(''));
  }

  useEffect(() => {
    getVendorSession().then((s: any) => {
      if (!s) return;
      const vid = s.vendorId || s.id;
      setTier(s.tier || 'essential');
      fetch(`${API}/api/vendors/${vid}`).then(r => r.json()).then(d => {
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
          setTier(v.tier || s.tier || 'essential');
        }
      }).catch(() => {}).finally(() => setLoading(false));
    });
  }, []);

  const featuredCap = getFeaturedCap(tier);

  async function patchField(fieldKey: string, body: any) {
    if (!vendorData?.id) return;
    setSavingField(fieldKey);
    try {
      const r = await fetch(`${API}/api/vendors/${vendorData.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        setSavedField(fieldKey);
        setTimeout(() => setSavedField(p => p === fieldKey ? null : p), 1800);
      }
    } catch {} finally { setSavingField(null); }
  }

  function toggleVibeTag(tag: string) {
    const next = vibeTags.includes(tag) ? vibeTags.filter(t => t !== tag) : [...vibeTags, tag];
    setVibeTags(next);
    patchField('tags', { vibe_tags: next });
  }

  async function uploadPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (result.canceled) return;
    setUploading(true);
    const newUrls: string[] = [];
    try {
      for (const asset of result.assets) {
        const formData = new FormData();
        formData.append('file', { uri: asset.uri, name: 'photo.jpg', type: 'image/jpeg' } as any);
        formData.append('upload_preset', PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.secure_url) newUrls.push(data.secure_url);
      }
      if (newUrls.length > 0) {
        const updated = [...portfolioImages, ...newUrls];
        setPortfolioImages(updated);
        patchField('photos', { portfolio_images: updated });
        showToast(`${newUrls.length} photo${newUrls.length > 1 ? 's' : ''} uploaded`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch { showToast('Upload failed. Please try again.'); }
    setUploading(false);
  }

  function deletePhoto(url: string) {
    Alert.alert('Remove photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        const nextP = portfolioImages.filter(p => p !== url);
        const nextF = featuredPhotos.filter(p => p !== url);
        setPortfolioImages(nextP);
        setFeaturedPhotos(nextF);
        patchField('photos', { portfolio_images: nextP, featured_photos: nextF });
      }},
    ]);
  }

  function toggleFeatured(url: string) {
    const isFeatured = featuredPhotos.includes(url);
    if (!isFeatured && featuredPhotos.length >= featuredCap) {
      showToast(`You can feature up to ${featuredCap} photos on this tier.`);
      return;
    }
    const next = isFeatured ? featuredPhotos.filter(p => p !== url) : [...featuredPhotos, url];
    setFeaturedPhotos(next);
    patchField('featured', { featured_photos: next });
  }

  const completionSteps = [
    { done: portfolioImages.length >= 10 },
    { done: featuredPhotos.length >= 3 },
    { done: !!startingPrice },
    { done: about.length >= 100 },
    { done: vibeTags.length >= 3 },
  ];
  const completedCount = completionSteps.filter(s => s.done).length;
  const completionPct = Math.round((completedCount / completionSteps.length) * 100);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: DM300, fontSize: 13, color: MUTED }}>Loading your profile…</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      {!!toast && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ marginRight: 14 }}>
          <ArrowLeft size={20} strokeWidth={1.5} color={DARK} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSub}>{completionPct}% complete · Changes save automatically</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Identity */}
        <Section label="WHO YOU ARE">
          <FieldLabel>Business name</FieldLabel>
          <TextInput
            style={styles.input} value={name}
            onChangeText={setName}
            onBlur={() => { if (name !== (vendorData?.name || '')) patchField('name', { name: name.trim() }); }}
            placeholder="Your business or studio name" placeholderTextColor="#C8C4BE"
          />
          <SaveRow saving={savingField === 'name'} saved={savedField === 'name'} />

          <FieldLabel style={{ marginTop: 14 }}>Category</FieldLabel>
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyText}>{CATEGORIES[vendorData?.category || ''] || vendorData?.category || 'Not set'}</Text>
            <Text style={styles.readonlyTag}>Fixed</Text>
          </View>

          <FieldLabel style={{ marginTop: 14 }}>City</FieldLabel>
          <View style={styles.inputRow}>
            <MapPin size={14} strokeWidth={1.5} color={MUTED} />
            <TextInput
              style={[styles.input, { flex: 1, marginLeft: 8 }]} value={city}
              onChangeText={setCity}
              onBlur={() => { if (city !== (vendorData?.city || '')) patchField('city', { city: city.trim() }); }}
              placeholder="e.g. Mumbai, Delhi NCR" placeholderTextColor="#C8C4BE"
            />
          </View>
          <SaveRow saving={savingField === 'city'} saved={savedField === 'city'} />
        </Section>

        {/* Portfolio photos */}
        <Section label="PORTFOLIO PHOTOS" sublabel={`${portfolioImages.length} uploaded · ${featuredPhotos.length}/${featuredCap} featured`}>
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              <Text style={{ fontFamily: DM400 }}>Tip: </Text>
              Tap ★ to mark featured. Minimum 1600px on longest side.
            </Text>
          </View>

          <TouchableOpacity style={[styles.uploadBtn, uploading && { opacity: 0.6 }]} onPress={uploadPhoto} disabled={uploading} activeOpacity={0.8}>
            <Upload size={16} strokeWidth={1.5} color={DARK} />
            <Text style={styles.uploadBtnText}>{uploading ? 'Uploading…' : 'Upload photos'}</Text>
          </TouchableOpacity>

          {portfolioImages.length === 0 ? (
            <View style={styles.emptyPhotos}>
              <Text style={styles.emptyPhotosText}>No photos yet. Upload your best work to appear in the Discover feed.</Text>
            </View>
          ) : (
            <View style={styles.photoGrid}>
              {portfolioImages.map(url => {
                const isFeatured = featuredPhotos.includes(url);
                return (
                  <View key={url} style={[styles.photoThumb, isFeatured && styles.photoThumbFeatured]}>
                    <Image source={{ uri: url }} style={styles.photoImg} />
                    <TouchableOpacity style={[styles.starBtn, isFeatured && styles.starBtnActive]} onPress={() => toggleFeatured(url)} activeOpacity={0.8}>
                      <Star size={12} strokeWidth={1.5} color={isFeatured ? CARD : GOLD} fill={isFeatured ? CARD : 'none'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePhoto(url)} activeOpacity={0.8}>
                      <Trash2 size={10} strokeWidth={1.5} color={CARD} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </Section>

        {/* About */}
        <Section label="YOUR STORY" sublabel={`${about.length} / 100+ chars`}>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={about} onChangeText={setAbout}
            onBlur={() => { if (about !== (vendorData?.about || '')) patchField('about', { about }); }}
            placeholder="Tell couples what makes you different. Your style, your experience, what they can expect working with you."
            placeholderTextColor="#C8C4BE" multiline numberOfLines={6} textAlignVertical="top"
          />
          <SaveRow saving={savingField === 'about'} saved={savedField === 'about'} />
        </Section>

        {/* Price */}
        <Section label="STARTING PRICE">
          <View style={styles.priceRow}>
            <Text style={styles.priceSymbol}>₹</Text>
            <TextInput
              style={[styles.input, { flex: 1, fontSize: 18, fontFamily: CG300 }]}
              value={startingPrice ? parseInt(startingPrice).toLocaleString('en-IN') : ''}
              onChangeText={v => setStartingPrice(v.replace(/[^0-9]/g, ''))}
              onBlur={() => {
                const asNum = startingPrice ? parseInt(startingPrice) : null;
                if (asNum !== (vendorData?.starting_price || null)) patchField('price', { starting_price: asNum });
              }}
              placeholder="e.g. 150000" placeholderTextColor="#C8C4BE" keyboardType="numeric"
            />
            {(savingField === 'price' || savedField === 'price') && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {savedField === 'price' && <Check size={12} strokeWidth={1.5} color={GREEN} />}
                <Text style={{ fontFamily: JOST, fontSize: 9, color: savedField === 'price' ? GREEN : MUTED }}>
                  {savingField === 'price' ? 'Saving' : 'Saved'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.priceSub}>The lowest price at which you'll consider a booking.</Text>
        </Section>

        {/* Vibe tags */}
        <Section label="YOUR VIBE" sublabel={`${vibeTags.length} / 3+ selected`}>
          <View style={styles.tagWrap}>
            {VIBE_TAGS.map(tag => {
              const active = vibeTags.includes(tag);
              return (
                <TouchableOpacity key={tag} style={[styles.vibeTag, active && styles.vibeTagActive]} onPress={() => toggleVibeTag(tag)} activeOpacity={0.8}>
                  <Text style={[styles.vibeTagText, active && styles.vibeTagTextActive]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* Instagram */}
        <Section label="INSTAGRAM">
          <View style={styles.inputRow}>
            <Instagram size={16} strokeWidth={1.5} color={MUTED} />
            <Text style={[styles.input, { color: MUTED, marginLeft: 8, marginRight: 4 }]}>@</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]} value={instagram}
              onChangeText={v => setInstagram(v.replace(/^@/, ''))}
              onBlur={() => {
                const cleaned = instagram.trim().replace(/^@/, '');
                const current = (vendorData?.instagram_url || '').replace(/^@/, '');
                if (cleaned !== current) patchField('instagram', { instagram_url: cleaned ? '@' + cleaned : '' });
              }}
              placeholder="your_handle" placeholderTextColor="#C8C4BE" autoCapitalize="none"
            />
            <SaveRow inline saving={savingField === 'instagram'} saved={savedField === 'instagram'} />
          </View>
        </Section>

        {/* Equipment */}
        <Section label="EQUIPMENT & SERVICES">
          <TextInput
            style={[styles.input, styles.textarea, { minHeight: 72 }]}
            value={equipment} onChangeText={setEquipment}
            onBlur={() => { if (equipment !== (vendorData?.equipment || '')) patchField('equipment', { equipment }); }}
            placeholder="e.g. Canon R5, DJI Mavic 3 · Full day coverage · 2 photographers"
            placeholderTextColor="#C8C4BE" multiline numberOfLines={3} textAlignVertical="top"
          />
          <SaveRow saving={savingField === 'equipment'} saved={savedField === 'equipment'} />
        </Section>

        {/* Delivery time */}
        <Section label="DELIVERY TIME">
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]} value={deliveryTime}
              onChangeText={setDeliveryTime}
              onBlur={() => { if (deliveryTime !== (vendorData?.delivery_time || '')) patchField('delivery_time', { delivery_time: deliveryTime }); }}
              placeholder="e.g. 6-8 weeks, Same day" placeholderTextColor="#C8C4BE"
            />
            <SaveRow inline saving={savingField === 'delivery_time'} saved={savedField === 'delivery_time'} />
          </View>
        </Section>

        {/* Completion footer */}
        <View style={styles.completionCard}>
          <Text style={styles.completionLabel}>PROFILE {completionPct}% COMPLETE</Text>
          <Text style={styles.completionTitle}>
            {completionPct === 100 ? 'Your profile is ready.' : `${5 - completedCount} step${5 - completedCount === 1 ? '' : 's'} to a standout profile.`}
          </Text>
          <TouchableOpacity style={styles.completionBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.completionBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E2DED8', padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', color: '#B8963A' }}>{label}</Text>
        {sublabel && <Text style={{ fontFamily: 'DMSans_300Light', fontSize: 10, color: '#8C8480', fontStyle: 'italic' }}>{sublabel}</Text>}
      </View>
      {children}
    </View>
  );
}

function FieldLabel({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[{ fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#8C8480', marginBottom: 6 }, style]}>{children}</Text>;
}

function SaveRow({ saving, saved, inline }: { saving?: boolean; saved?: boolean; inline?: boolean }) {
  if (!saving && !saved) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: inline ? 0 : 8 }}>
      {saved && <Check size={12} strokeWidth={1.5} color="#4CAF50" />}
      <Text style={{ fontFamily: 'Jost_300Light', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: saved ? '#4CAF50' : '#8C8480' }}>
        {saving ? 'Saving' : 'Saved'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  toast:   { position: 'absolute', top: 16, left: 24, right: 24, zIndex: 100, backgroundColor: DARK, borderRadius: 8, padding: 12, alignItems: 'center' },
  toastText: { fontFamily: DM300, fontSize: 12, color: '#F8F7F5' },

  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: BG },
  headerTitle: { fontFamily: CG300, fontSize: 20, color: DARK },
  headerSub:   { fontFamily: DM300, fontSize: 10, color: MUTED, marginTop: 4 },

  input:    { fontFamily: DM300, fontSize: 14, color: DARK, paddingVertical: 8 },
  textarea: { borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 14, minHeight: 120 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 },

  readonlyField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  readonlyText:  { fontFamily: DM300, fontSize: 14, color: MUTED },
  readonlyTag:   { fontFamily: JOST, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: MUTED },

  tipBox:  { backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, marginBottom: 14 },
  tipText: { fontFamily: DM300, fontSize: 11, color: '#B8963A', lineHeight: 17 },

  uploadBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: BORDER, borderRadius: 12, padding: 18, marginBottom: 14 },
  uploadBtnText: { fontFamily: JOST400, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: DARK },

  emptyPhotos:     { backgroundColor: BG, borderRadius: 12, padding: 32, alignItems: 'center' },
  emptyPhotosText: { fontFamily: DM300, fontSize: 12, color: MUTED, fontStyle: 'italic', textAlign: 'center' },

  photoGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: '48%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  photoThumbFeatured: { borderWidth: 1.5, borderColor: GOLD },
  photoImg:   { width: '100%', height: '100%' },
  starBtn:    { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  starBtnActive: { backgroundColor: GOLD },
  deleteBtn:  { position: 'absolute', bottom: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },

  priceRow:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, gap: 8 },
  priceSymbol: { fontFamily: CG300, fontSize: 18, color: '#B8963A' },
  priceSub:    { fontFamily: DM300, fontSize: 10, color: MUTED, marginTop: 6, fontStyle: 'italic' },

  tagWrap:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vibeTag:        { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 100, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  vibeTagActive:  { backgroundColor: '#FFF8EC', borderColor: GOLD },
  vibeTagText:    { fontFamily: DM300, fontSize: 11, color: MUTED },
  vibeTagTextActive: { fontFamily: DM400, fontSize: 11, color: '#B8963A' },

  completionCard:    { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 20, alignItems: 'center' },
  completionLabel:   { fontFamily: DM400, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#B8963A', marginBottom: 8 },
  completionTitle:   { fontFamily: CG300, fontSize: 18, color: DARK, textAlign: 'center', marginBottom: 14, lineHeight: 24 },
  completionBtn:     { backgroundColor: GOLD, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 },
  completionBtnText: { fontFamily: DM400, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: CARD },
});
