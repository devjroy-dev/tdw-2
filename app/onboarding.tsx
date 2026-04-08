import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
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
  const [step, setStep] = useState(1);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const toggleFunction = (id: string) => {
    setSelectedFunctions(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const canProceed = () => {
    if (step === 1) return selectedFunctions.length > 0;
    if (step === 2) return selectedBudget !== '';
    if (step === 3) return selectedCity !== '';
    return false;
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.logo}>DreamWedding</Text>
        <Text style={styles.stepText}>{step} / 3</Text>
      </View>

      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Step 1 — Functions */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Which functions{'\n'}are you planning?</Text>
            <Text style={styles.subtitle}>Select all that apply</Text>

            <View style={styles.pillGrid}>
              {FUNCTIONS.map(fn => (
                <TouchableOpacity
                  key={fn.id}
                  style={[
                    styles.pill,
                    selectedFunctions.includes(fn.id) && styles.pillSelected
                  ]}
                  onPress={() => toggleFunction(fn.id)}
                >
                  <Text style={[
                    styles.pillText,
                    selectedFunctions.includes(fn.id) && styles.pillTextSelected
                  ]}>
                    {fn.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 2 — Budget */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>What is your{'\n'}total budget?</Text>
            <Text style={styles.subtitle}>For all functions combined</Text>

            <View style={styles.genieTip}>
              <Text style={styles.genieTipText}>
                Not sure? Our Genie will adjust your estimate as you explore vendors.
              </Text>
            </View>

            <View style={styles.optionList}>
              {BUDGETS.map((b, index) => (
                <View key={b.id}>
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => setSelectedBudget(b.id)}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedBudget === b.id && styles.optionTextSelected
                    ]}>
                      {b.label}
                    </Text>
                    {selectedBudget === b.id && (
                      <Text style={styles.optionCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                  {index < BUDGETS.length - 1 && <View style={styles.optionDivider} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Step 3 — City */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Where is your{'\n'}wedding?</Text>
            <Text style={styles.subtitle}>Select your primary city</Text>

            <View style={styles.pillGrid}>
              {CITIES.map(city => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.pill,
                    selectedCity === city && styles.pillSelected
                  ]}
                  onPress={() => setSelectedCity(city)}
                >
                  <Text style={[
                    styles.pillText,
                    selectedCity === city && styles.pillTextSelected
                  ]}>
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
          disabled={!canProceed()}
          onPress={() => {
            if (step < 3) setStep(step + 1);
            else router.replace('/home');
          }}
        >
          <Text style={styles.nextBtnText}>
            {step === 3 ? 'Get Started' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
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
    color: '#1C1C1C',
    width: 24,
  },
  logo: {
    fontSize: 16,
    color: '#C9A84C',
    fontWeight: '400',
    letterSpacing: 4,
  },
  stepText: {
    fontSize: 13,
    color: '#8C7B6E',
    letterSpacing: 0.5,
  },
  progressBar: {
    height: 2,
    backgroundColor: '#E8DDD4',
    marginHorizontal: 24,
    borderRadius: 1,
    marginBottom: 36,
  },
  progressFill: {
    height: 2,
    backgroundColor: '#C9A84C',
    borderRadius: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  stepContent: {
    gap: 24,
  },
  title: {
    fontSize: 34,
    color: '#1C1C1C',
    fontWeight: '300',
    letterSpacing: 0.5,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 14,
    color: '#8C7B6E',
    marginTop: -12,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  pillSelected: {
    backgroundColor: '#1C1C1C',
    borderColor: '#1C1C1C',
  },
  pillText: {
    fontSize: 14,
    color: '#1C1C1C',
    letterSpacing: 0.3,
  },
  pillTextSelected: {
    color: '#FAF6F0',
  },
  genieTip: {
    backgroundColor: '#FFF8EC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8D9B5',
    marginTop: -8,
  },
  genieTipText: {
    fontSize: 13,
    color: '#8C7B6E',
    lineHeight: 20,
  },
  optionList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DDD4',
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
    color: '#1C1C1C',
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
    backgroundColor: '#E8DDD4',
    marginHorizontal: 20,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#E8DDD4',
    backgroundColor: '#FAF6F0',
  },
  nextBtn: {
    backgroundColor: '#1C1C1C',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.3,
  },
  nextBtnText: {
    fontSize: 15,
    color: '#FAF6F0',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});