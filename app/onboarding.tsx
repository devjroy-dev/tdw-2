import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const FUNCTIONS = [
  { id: 'roka', label: 'Roka' },
  { id: 'haldi', label: 'Haldi' },
  { id: 'mehendi', label: 'Mehendi' },
  { id: 'sangeet', label: 'Sangeet' },
  { id: 'cocktail', label: 'Cocktail' },
  { id: 'wedding', label: 'Wedding' },
  { id: 'reception', label: 'Reception' },
];

const BUDGETS = [
  { id: '5-10', label: '₹5L – ₹10L' },
  { id: '10-25', label: '₹10L – ₹25L' },
  { id: '25-50', label: '₹25L – ₹50L' },
  { id: '50-100', label: '₹50L – ₹1Cr' },
  { id: '100+', label: '₹1Cr+' },
];

const CITIES = [
  'Delhi NCR', 'Mumbai', 'Bangalore', 'Chennai',
  'Hyderabad', 'Kolkata', 'Jaipur', 'Pune', 'Ahmedabad', 'Other'
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [weddingDate, setWeddingDate] = useState('');

  const toggleFunction = (id: string) => {
    setSelectedFunctions(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const canProceed = selectedFunctions.length > 0 && selectedBudget !== '' && selectedCity !== '';

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.logo}>DreamWedding</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={styles.progressFill} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Tell us about{'\n'}your wedding</Text>
        <Text style={styles.subtitle}>Just a few details to get you started</Text>

        {/* Wedding Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Approximate Wedding Date</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. December 2025"
            placeholderTextColor="#8C7B6E"
            value={weddingDate}
            onChangeText={setWeddingDate}
          />
        </View>

        {/* Functions */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Functions you are planning</Text>
          <Text style={styles.inputHint}>Select all that apply</Text>
          <View style={styles.pillGrid}>
            {FUNCTIONS.map(fn => (
              <TouchableOpacity
                key={fn.id}
                style={[styles.pill, selectedFunctions.includes(fn.id) && styles.pillSelected]}
                onPress={() => toggleFunction(fn.id)}
              >
                <Text style={[styles.pillText, selectedFunctions.includes(fn.id) && styles.pillTextSelected]}>
                  {fn.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Budget */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Total Budget</Text>
          <Text style={styles.inputHint}>For all functions combined</Text>
          <View style={styles.optionList}>
            {BUDGETS.map((b, index) => (
              <View key={b.id}>
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => setSelectedBudget(b.id)}
                >
                  <Text style={[styles.optionText, selectedBudget === b.id && styles.optionTextSelected]}>
                    {b.label}
                  </Text>
                  {selectedBudget === b.id && <Text style={styles.optionCheck}>✓</Text>}
                </TouchableOpacity>
                {index < BUDGETS.length - 1 && <View style={styles.optionDivider} />}
              </View>
            ))}
          </View>
        </View>

        {/* City */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Primary City</Text>
          <View style={styles.pillGrid}>
            {CITIES.map(city => (
              <TouchableOpacity
                key={city}
                style={[styles.pill, selectedCity === city && styles.pillSelected]}
                onPress={() => setSelectedCity(city)}
              >
                <Text style={[styles.pillText, selectedCity === city && styles.pillTextSelected]}>
                  {city}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Genie tip */}
        <View style={styles.genieTip}>
          <Text style={styles.genieTipText}>
            Not sure about your budget? Our Genie will adjust your estimate as you explore vendors.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.nextBtn, !canProceed && styles.nextBtnDisabled]}
          disabled={!canProceed}
          onPress={() => router.replace('/home')}
        >
          <Text style={styles.nextBtnText}>Get Started</Text>
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
    marginBottom: 16,
  },
  backBtn: {
    fontSize: 22,
    color: '#2C2420',
    width: 24,
  },
  logo: {
    fontSize: 16,
    color: '#C9A84C',
    fontWeight: '400',
    letterSpacing: 4,
  },
  progressBar: {
    height: 2,
    backgroundColor: '#E8E0D5',
    marginHorizontal: 24,
    borderRadius: 1,
    marginBottom: 36,
  },
  progressFill: {
    height: 2,
    backgroundColor: '#C9A84C',
    borderRadius: 1,
    width: '100%',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 28,
  },
  title: {
    fontSize: 36,
    color: '#2C2420',
    fontWeight: '300',
    letterSpacing: 0.5,
    lineHeight: 46,
  },
  subtitle: {
    fontSize: 14,
    color: '#8C7B6E',
    marginTop: -16,
  },
  inputGroup: {
    gap: 10,
  },
  inputLabel: {
    fontSize: 14,
    color: '#2C2420',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  inputHint: {
    fontSize: 12,
    color: '#8C7B6E',
    marginTop: -4,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    paddingVertical: 15,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#2C2420',
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  pillSelected: {
    backgroundColor: '#2C2420',
    borderColor: '#2C2420',
  },
  pillText: {
    fontSize: 14,
    color: '#2C2420',
    letterSpacing: 0.3,
  },
  pillTextSelected: {
    color: '#F5F0E8',
  },
  optionList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 15,
    color: '#2C2420',
    letterSpacing: 0.2,
  },
  optionTextSelected: {
    color: '#C9A84C',
    fontWeight: '500',
  },
  optionCheck: {
    color: '#C9A84C',
    fontSize: 16,
    fontWeight: '600',
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#E8E0D5',
    marginHorizontal: 20,
  },
  genieTip: {
    backgroundColor: '#FFF8EC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8D9B5',
  },
  genieTipText: {
    fontSize: 13,
    color: '#8C7B6E',
    lineHeight: 20,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    backgroundColor: '#F5F0E8',
  },
  nextBtn: {
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.3,
  },
  nextBtnText: {
    fontSize: 15,
    color: '#F5F0E8',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});