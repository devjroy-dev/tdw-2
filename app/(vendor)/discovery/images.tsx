/**
 * app/(vendor)/discovery/images.tsx
 * Exact port of web/app/vendor/discovery/images/page.tsx
 *
 * GET    /api/vendor-images/:vendorId
 * POST   /api/vendor-images  (Cloudinary upload → backend save)
 * POST   /api/vendor-images/set-hero
 * DELETE /api/vendor-images/:imageId
 * POST   https://api.cloudinary.com/v1_1/dccso5ljv/image/upload
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Animated, Alert, TextInput,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { ArrowLeft } from 'lucide-react-native';
import { RAILWAY_URL } from '../../../constants/tokens';
import { getVendorSession } from '../../../utils/session';

const API   = RAILWAY_URL;
const CLOUD = 'dccso5ljv';
const PRESET = 'dream_wedding_uploads';

const BG     = '#F8F7F5';
const CARD   = '#FFFFFF';
const GOLD   = '#C9A84C';
const DARK   = '#111111';
const MUTED  = '#8C8480';
const BORDER = '#E2DED8';

const CG300   = 'CormorantGaramond_300Light';
const DM300   = 'DMSans_300Light';
const JOST200 = 'Jost_200ExtraLight';
const JOST    = 'Jost_300Light';
const JOST400 = 'Jost_400Regular';

interface VendorImage { id: string; url: string; tags: string[]; approved: boolean; caption?: string; }

function TagBadge({ label, gold }: { label: string; gold?: boolean }) {
  return (
    <View style={[s.badge, gold && s.badgeGold]}>
      <Text style={[s.badgeText, gold && s.badgeTextGold]}>{label}</Text>
    </View>
  );
}

export default function DiscoveryImagesScreen() {
  const [vendorId,     setVendorId]     = useState('');
  const [images,       setImages]       = useState<VendorImage[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [uploading,    setUploading]    = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string|null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput,     setUrlInput]     = useState('');
  const [toast,        setToast]        = useState('');
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
      setVendorId(s.vendorId || s.id);
    });
  }, []);

  const load = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/vendor-images/${vendorId}`);
      const d = await r.json();
      if (d.success) setImages(d.data || []);
    } catch {}
    setLoading(false);
  }, [vendorId]);

  useEffect(() => { if (vendorId) load(); }, [vendorId, load]);

  async function pickAndUpload() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', { uri: asset.uri, name: 'photo.jpg', type: 'image/jpeg' } as any);
      formData.append('upload_preset', PRESET);
      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: formData });
      const cloudData = await cloudRes.json();
      if (!cloudData.secure_url) { showToast('Upload failed — please try again'); setUploading(false); return; }
      const r = await fetch(`${API}/api/vendor-images`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, url: cloudData.secure_url, tags: [] }),
      });
      const d = await r.json();
      if (d.success) { showToast('Photo uploaded — pending admin approval'); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); load(); }
      else showToast(d.error || 'Could not save photo');
    } catch { showToast('Upload failed — check connection'); }
    setUploading(false);
  }

  async function submitUrl() {
    if (!urlInput.trim()) return;
    setUploading(true);
    try {
      const r = await fetch(`${API}/api/vendor-images`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, url: urlInput.trim(), tags: [] }),
      });
      const d = await r.json();
      if (d.success) { showToast('Photo added — pending admin approval'); setUrlInput(''); setShowUrlInput(false); load(); }
      else showToast(d.error || 'Upload failed');
    } catch { showToast('Upload failed — check connection'); }
    setUploading(false);
  }

  async function setHero(imageId: string) {
    try {
      await fetch(`${API}/api/vendor-images/set-hero`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, image_id: imageId }),
      });
      showToast('Hero photo updated'); load();
    } catch { showToast('Failed to set hero'); }
  }

  function confirmDelete(imageId: string) {
    Alert.alert('Remove photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await fetch(`${API}/api/vendor-images/${imageId}`, { method: 'DELETE' });
          setImages(prev => prev.filter(i => i.id !== imageId));
          showToast('Photo removed');
        } catch { showToast('Delete failed'); }
      }},
    ]);
  }

  const heroImage   = images.find(i => i.tags?.includes('hero'));
  const otherImages = images.filter(i => !i.tags?.includes('hero'));
  const pendingCount = images.filter(i => !i.approved).length;

  return (
    <View style={s.root}>
      {!!toast && (
        <Animated.View style={[s.toast, { opacity: toastAnim }]}>
          <Text style={s.toastText}>{toast}</Text>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
            <ArrowLeft size={20} strokeWidth={1.5} color={DARK} />
          </TouchableOpacity>
          <Text style={s.eyebrow}>YOUR DISCOVERY</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <Text style={s.pageTitle}>Image Hub</Text>
            {pendingCount > 0 && <Text style={s.pendingBadge}>{pendingCount} pending review</Text>}
          </View>
        </View>

        {/* How it works — empty state only */}
        {!loading && images.length === 0 && (
          <View style={s.howCard}>
            <Text style={s.howLabel}>HOW IT WORKS</Text>
            <Text style={s.howText}>Add your best photos below. Each one is reviewed by our team before going live on the couple discovery feed. Your hero photo appears first — make it editorial.</Text>
          </View>
        )}

        {/* Upload buttons */}
        <View style={s.section}>
          <TouchableOpacity style={[s.uploadPrimary, uploading && s.uploadPrimaryDisabled]} onPress={pickAndUpload} disabled={uploading} activeOpacity={0.85}>
            <Text style={[s.uploadPrimaryText, uploading && { color: '#555250' }]}>{uploading ? 'Uploading...' : '+ Choose Photo'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.uploadSecondary} onPress={() => setShowUrlInput(v => !v)} activeOpacity={0.8}>
            <Text style={s.uploadSecondaryText}>{showUrlInput ? 'Cancel' : 'Paste URL instead'}</Text>
          </TouchableOpacity>

          {showUrlInput && (
            <View style={{ marginTop: 12 }}>
              <Text style={s.urlHint}>Paste a direct image URL (WhatsApp photo link, Google Drive, etc.)</Text>
              <TextInput
                style={s.urlInput} value={urlInput} onChangeText={setUrlInput}
                placeholder="https://..." placeholderTextColor="#C8C4BE"
                autoCapitalize="none" autoCorrect={false}
              />
              <TouchableOpacity style={[s.urlSubmit, !urlInput.trim() && { opacity: 0.4 }]} onPress={submitUrl} disabled={uploading || !urlInput.trim()} activeOpacity={0.85}>
                <Text style={s.urlSubmitText}>{uploading ? 'Adding...' : 'Submit for Review'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Hero photo */}
        {(loading || heroImage) && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>HERO PHOTO</Text>
            {loading ? (
              <View style={s.shimmer} />
            ) : heroImage ? (
              <View style={s.heroWrap}>
                <Image source={{ uri: heroImage.url }} style={s.heroImg} />
                <View style={s.heroBadges}>
                  <TagBadge label="Hero" gold />
                  {heroImage.approved ? <TagBadge label="Approved" gold /> : <TagBadge label="Pending review" />}
                </View>
                <TouchableOpacity style={s.heroDelete} onPress={() => confirmDelete(heroImage.id)} activeOpacity={0.8}>
                  <Text style={{ color: CARD, fontSize: 14 }}>×</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        {/* Portfolio grid */}
        <View style={s.section}>
          {otherImages.length > 0 && <Text style={s.sectionLabel}>PORTFOLIO</Text>}
          {loading ? (
            <View style={s.grid}>
              {[1,2,3,4].map(i => <View key={i} style={s.shimmerThumb} />)}
            </View>
          ) : (
            <View style={s.grid}>
              {otherImages.map(img => (
                <View key={img.id} style={s.thumb}>
                  <Image source={{ uri: img.url }} style={s.thumbImg} />
                  <View style={s.thumbBadge}>
                    {img.approved ? <TagBadge label="Live" gold /> : <TagBadge label="Pending" />}
                  </View>
                  <View style={s.thumbActions}>
                    <TouchableOpacity style={s.heroBtn} onPress={() => setHero(img.id)} activeOpacity={0.8}>
                      <Text style={{ fontSize: 11, color: '#0C0A09' }}>★</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.deleteBtn} onPress={() => confirmDelete(img.id)} activeOpacity={0.8}>
                      <Text style={{ fontSize: 13, color: CARD }}>×</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {!loading && images.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 40, paddingBottom: 20 }}>
              <Text style={s.emptyTitle}>No photos yet</Text>
              <Text style={s.emptySub}>Add your first photo above</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: BG },
  toast: { position: 'absolute', top: 16, left: 24, right: 24, zIndex: 100, backgroundColor: DARK, borderRadius: 8, padding: 12, alignItems: 'center' },
  toastText: { fontFamily: DM300, fontSize: 12, color: '#F8F7F5' },

  header:  { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  backBtn: { marginBottom: 20, alignSelf: 'flex-start' },
  eyebrow: { fontFamily: JOST200, fontSize: 9, letterSpacing: 2.2, textTransform: 'uppercase', color: MUTED, marginBottom: 6 },
  pageTitle: { fontFamily: CG300, fontSize: 28, color: DARK, lineHeight: 32 },
  pendingBadge: { fontFamily: JOST, fontSize: 9, letterSpacing: 1, color: GOLD },

  howCard:  { marginHorizontal: 20, marginBottom: 24, backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)', borderRadius: 14, padding: 18 },
  howLabel: { fontFamily: JOST200, fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', color: GOLD, marginBottom: 8 },
  howText:  { fontFamily: DM300, fontSize: 13, color: MUTED, lineHeight: 20 },

  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionLabel: { fontFamily: JOST200, fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', color: MUTED, marginBottom: 10 },

  uploadPrimary:         { height: 52, backgroundColor: GOLD, borderRadius: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  uploadPrimaryDisabled: { backgroundColor: '#2A2825' },
  uploadPrimaryText:     { fontFamily: JOST400, fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: '#0C0A09' },
  uploadSecondary:       { height: 40, borderWidth: 0.5, borderColor: BORDER, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  uploadSecondaryText:   { fontFamily: JOST, fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: '#555250' },

  urlHint:   { fontFamily: DM300, fontSize: 12, color: MUTED, marginBottom: 8 },
  urlInput:  { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 12, fontFamily: DM300, fontSize: 13, color: DARK, marginBottom: 10 },
  urlSubmit: { height: 44, backgroundColor: GOLD, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  urlSubmitText: { fontFamily: JOST400, fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: '#0C0A09' },

  shimmer: { height: 220, borderRadius: 14, backgroundColor: '#EEECE8' },

  heroWrap:   { borderRadius: 14, overflow: 'hidden' },
  heroImg:    { width: '100%', height: 220 },
  heroBadges: { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', gap: 6 },
  heroDelete: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },

  grid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shimmerThumb: { width: '48%', height: 160, borderRadius: 12, backgroundColor: '#EEECE8' },
  thumb: { width: '48%', borderRadius: 12, overflow: 'hidden' },
  thumbImg: { width: '100%', height: 160 },
  thumbBadge:   { position: 'absolute', bottom: 6, left: 6 },
  thumbActions: { position: 'absolute', top: 6, right: 6, gap: 4 },
  heroBtn:   { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(201,168,76,0.85)', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },

  badge:         { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.08)' },
  badgeGold:     { backgroundColor: 'rgba(201,168,76,0.18)' },
  badgeText:     { fontFamily: JOST, fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: MUTED },
  badgeTextGold: { color: GOLD },

  emptyTitle: { fontFamily: CG300, fontSize: 20, color: '#3A3835', marginBottom: 8 },
  emptySub:   { fontFamily: DM300, fontSize: 13, color: '#555250' },
});
