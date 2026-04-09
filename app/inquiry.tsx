import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');

const FUNCTIONS = ['Roka', 'Haldi', 'Mehendi', 'Sangeet', 'Cocktail', 'Wedding', 'Reception'];

export default function InquiryScreen() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams();
  const [selectedFunction, setSelectedFunction] = useState('Wedding');
  const [date, setDate] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const isQuote = type === 'quote';

  const handleSend = () => {
    setSent(true);
    setTimeout(() => router.back(), 2000);
  };

  if (sent) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>
        <Text style={styles.successTitle}>
          {isQuote ? 'Quote Requested!' : 'Inquiry Sent!'}
        </Text>
        <Text style={styles.successSubtitle}>
          {isQuote
            ? 'The vendor will send you a detailed quote within 24 hours.'
            : 'The vendor will respond within 24 hours.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isQuote ? 'Request Quote' : 'Send Inquiry'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Pre-filled message */}
        <View style={styles.prefilledCard}>
          <Text style={styles.prefilledLabel}>Your message</Text>
          <Text style={styles.prefilledText}>
            Hi, I'm Dev. I'm interested in your services for my {selectedFunction} on {date || '[date]'}. {isQuote ? 'Could you please share your pricing and packages?' : 'Are you available?'}
          </Text>
        </View>

        {/* Function */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Function</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.pillRow}>
              {FUNCTIONS.map(fn => (
                <TouchableOpacity
                  key={fn}
                  style={[styles.pill, selectedFunction === fn && styles.pillSelected]}
                  onPress={() => setSelectedFunction(fn)}
                >
                  <Text style={[styles.pillText, selectedFunction === fn && styles.pillTextSelected]}>
                    {fn}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Event Date</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. December 15, 2025"
            placeholderTextColor="#8C7B6E"
            value={date}
            onChangeText={setDate}
          />
        </View>

        {/* Additional message */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Additional Details (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Guest count, specific requirements, questions..."
            placeholderTextColor="#8C7B6E"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            Your contact details will be shared with the vendor when you send this {isQuote ? 'request' : 'inquiry'}.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendBtnText}>
            {isQuote ? 'Request Quote' : 'Send Inquiry'}
          </Text>
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
    marginBottom: 24,
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
  },
  prefilledCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    gap: 8,
  },
  prefilledLabel: {
    fontSize: 11,
    color: '#8C7B6E',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  prefilledText: {
    fontSize: 14,
    color: '#2C2420',
    lineHeight: 22,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#2C2420',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 50,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  pillSelected: {
    backgroundColor: '#2C2420',
    borderColor: '#2C2420',
  },
  pillText: {
    fontSize: 13,
    color: '#2C2420',
  },
  pillTextSelected: {
    color: '#F5F0E8',
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
  noteCard: {
    backgroundColor: '#FFF8EC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8D9B5',
  },
  noteText: {
    fontSize: 12,
    color: '#8C7B6E',
    lineHeight: 18,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    backgroundColor: '#F5F0E8',
  },
  sendBtn: {
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sendBtnText: {
    fontSize: 15,
    color: '#F5F0E8',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 40,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2C2420',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  successIconText: {
    fontSize: 28,
    color: '#C9A84C',
    fontWeight: '300',
  },
  successTitle: {
    fontSize: 26,
    color: '#2C2420',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#8C7B6E',
    textAlign: 'center',
    lineHeight: 22,
  },
});