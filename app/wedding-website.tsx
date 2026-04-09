import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, TextInput
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const THEMES = [
  { id: 'classic', label: 'Classic Ivory', bg: '#FAF6F0', accent: '#C9A84C' },
  { id: 'modern', label: 'Modern Dark', bg: '#2C2420', accent: '#C9A84C' },
  { id: 'floral', label: 'Floral Blush', bg: '#FDF0F0', accent: '#D4849A' },
  { id: 'minimal', label: 'Clean White', bg: '#FFFFFF', accent: '#1C1C1C' },
];

export default function WeddingWebsiteScreen() {
  const router = useRouter();
  const [selectedTheme, setSelectedTheme] = useState('classic');
  const [coupleName1, setCoupleName1] = useState('');
  const [coupleName2, setCoupleName2] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [venue, setVenue] = useState('');
  const [story, setStory] = useState('');
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    setGenerated(true);
  };

  if (generated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setGenerated(false)}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Your Wedding Website</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* Website Preview */}
          <View style={styles.websitePreview}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewCouple}>
                {coupleName1 || 'Dev'} & {coupleName2 || 'Priya'}
              </Text>
              <Text style={styles.previewDate}>{weddingDate || 'December 15, 2025'}</Text>
              <Text style={styles.previewVenue}>{venue || 'The Leela Palace, Delhi'}</Text>
            </View>

            <View style={styles.previewDivider} />

            <View style={styles.previewCountdown}>
              <View style={styles.previewCountdownItem}>
                <Text style={styles.previewCountdownNum}>247</Text>
                <Text style={styles.previewCountdownLabel}>Days</Text>
              </View>
              <View style={styles.previewCountdownItem}>
                <Text style={styles.previewCountdownNum}>14</Text>
                <Text style={styles.previewCountdownLabel}>Hours</Text>
              </View>
              <View style={styles.previewCountdownItem}>
                <Text style={styles.previewCountdownNum}>32</Text>
                <Text style={styles.previewCountdownLabel}>Minutes</Text>
              </View>
            </View>

            <View style={styles.previewDivider} />

            <Text style={styles.previewStoryTitle}>Our Story</Text>
            <Text style={styles.previewStory}>
              {story || 'We met at a coffee shop and knew from the very first moment that this was something special...'}
            </Text>

            <View style={styles.previewRsvpBtn}>
              <Text style={styles.previewRsvpBtnText}>RSVP Now</Text>
            </View>
          </View>

          {/* Share Options */}
          <View style={styles.shareSection}>
            <Text style={styles.shareSectionTitle}>Share your website</Text>
            <View style={styles.shareLinkBox}>
              <Text style={styles.shareLink}>dreamwedding.app/dev-priya-2025</Text>
              <TouchableOpacity style={styles.copyBtn}>
                <Text style={styles.copyBtnText}>Copy</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* RSVP Stats */}
          <View style={styles.rsvpStats}>
            <Text style={styles.rsvpStatsTitle}>RSVP Tracking</Text>
            <View style={styles.rsvpStatsRow}>
              <View style={styles.rsvpStatItem}>
                <Text style={styles.rsvpStatNum}>0</Text>
                <Text style={styles.rsvpStatLabel}>Confirmed</Text>
              </View>
              <View style={styles.rsvpStatItem}>
                <Text style={styles.rsvpStatNum}>0</Text>
                <Text style={styles.rsvpStatLabel}>Pending</Text>
              </View>
              <View style={styles.rsvpStatItem}>
                <Text style={styles.rsvpStatNum}>0</Text>
                <Text style={styles.rsvpStatLabel}>Declined</Text>
              </View>
            </View>
            <Text style={styles.rsvpNote}>RSVPs automatically sync to your Guest List in Planner</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Wedding Website</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        <Text style={styles.pageTitle}>Create your{'\n'}wedding website</Text>
        <Text style={styles.pageSubtitle}>Share with guests and track RSVPs automatically</Text>

        {/* Theme Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Choose Theme</Text>
          <View style={styles.themeGrid}>
            {THEMES.map(theme => (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.themeCard,
                  selectedTheme === theme.id && styles.themeCardSelected,
                  { backgroundColor: theme.bg }
                ]}
                onPress={() => setSelectedTheme(theme.id)}
              >
                <View style={[styles.themeAccent, { backgroundColor: theme.accent }]} />
                <Text style={[styles.themeLabel, { color: theme.accent }]}>{theme.label}</Text>
                {selectedTheme === theme.id && (
                  <View style={styles.themeCheck}>
                    <Text style={styles.themeCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Couple Names */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Couple Names</Text>
          <View style={styles.nameRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Your name"
              placeholderTextColor="#8C7B6E"
              value={coupleName1}
              onChangeText={setCoupleName1}
            />
            <Text style={styles.andText}>&</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Partner's name"
              placeholderTextColor="#8C7B6E"
              value={coupleName2}
              onChangeText={setCoupleName2}
            />
          </View>
        </View>

        {/* Date & Venue */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Wedding Details</Text>
          <TextInput
            style={styles.input}
            placeholder="Wedding date (e.g. December 15, 2025)"
            placeholderTextColor="#8C7B6E"
            value={weddingDate}
            onChangeText={setWeddingDate}
          />
          <TextInput
            style={styles.input}
            placeholder="Venue name & city"
            placeholderTextColor="#8C7B6E"
            value={venue}
            onChangeText={setVenue}
          />
        </View>

        {/* Love Story */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your Love Story</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell your guests how you met..."
            placeholderTextColor="#8C7B6E"
            value={story}
            onChangeText={setStory}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate}>
          <Text style={styles.generateBtnText}>Generate Website</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  backBtn: {
    fontSize: 22,
    color: '#2C2420',
    width: 24,
  },
  title: {
    fontSize: 17,
    color: '#2C2420',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 24,
    paddingTop: 16,
  },
  pageTitle: {
    fontSize: 34,
    color: '#2C2420',
    fontWeight: '300',
    letterSpacing: 0.5,
    lineHeight: 44,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#8C7B6E',
    marginTop: -16,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeCard: {
    width: (width - 58) / 2,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    gap: 8,
    position: 'relative',
  },
  themeCardSelected: {
    borderColor: '#2C2420',
    borderWidth: 2,
  },
  themeAccent: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  themeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2C2420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeCheckText: {
    fontSize: 10,
    color: '#C9A84C',
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  andText: {
    fontSize: 18,
    color: '#C9A84C',
    fontWeight: '300',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#2C2420',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    backgroundColor: '#F5F0E8',
  },
  generateBtn: {
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  generateBtnText: {
    fontSize: 15,
    color: '#F5F0E8',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  websitePreview: {
    backgroundColor: '#2C2420',
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  previewHeader: {
    alignItems: 'center',
    gap: 8,
  },
  previewCouple: {
    fontSize: 26,
    color: '#F5F0E8',
    fontWeight: '300',
    letterSpacing: 2,
  },
  previewDate: {
    fontSize: 14,
    color: '#C9A84C',
    letterSpacing: 1,
  },
  previewVenue: {
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 0.5,
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#3C3430',
  },
  previewCountdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  previewCountdownItem: {
    alignItems: 'center',
    gap: 4,
  },
  previewCountdownNum: {
    fontSize: 32,
    color: '#C9A84C',
    fontWeight: '300',
  },
  previewCountdownLabel: {
    fontSize: 11,
    color: '#8C7B6E',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  previewStoryTitle: {
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  previewStory: {
    fontSize: 13,
    color: '#B8A99A',
    lineHeight: 20,
  },
  previewRsvpBtn: {
    backgroundColor: '#C9A84C',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  previewRsvpBtnText: {
    fontSize: 13,
    color: '#2C2420',
    fontWeight: '700',
    letterSpacing: 2,
  },
  shareSection: {
    gap: 12,
  },
  shareSectionTitle: {
    fontSize: 15,
    color: '#2C2420',
    fontWeight: '500',
  },
  shareLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  shareLink: {
    flex: 1,
    fontSize: 13,
    color: '#C9A84C',
  },
  copyBtn: {
    backgroundColor: '#2C2420',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  copyBtnText: {
    fontSize: 12,
    color: '#F5F0E8',
    fontWeight: '500',
  },
  rsvpStats: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    gap: 14,
  },
  rsvpStatsTitle: {
    fontSize: 15,
    color: '#2C2420',
    fontWeight: '500',
  },
  rsvpStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rsvpStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  rsvpStatNum: {
    fontSize: 28,
    color: '#2C2420',
    fontWeight: '300',
  },
  rsvpStatLabel: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  rsvpNote: {
    fontSize: 12,
    color: '#8C7B6E',
    textAlign: 'center',
    lineHeight: 18,
  },
});