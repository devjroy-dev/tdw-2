import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');

const VIBE_TAGS = [
  'Candid', 'Traditional', 'Luxury', 'Cinematic',
  'Boho', 'Festive', 'Minimalist', 'Royal'
];

const CITIES = [
  'Delhi NCR', 'Mumbai', 'Bangalore', 'Chennai',
  'Hyderabad', 'Kolkata', 'Jaipur', 'Pune',
];

const BUDGET_RANGES = [
  { id: '0-1', label: 'Under ₹1L' },
  { id: '1-3', label: '₹1L – ₹3L' },
  { id: '3-5', label: '₹3L – ₹5L' },
  { id: '5-10', label: '₹5L – ₹10L' },
  { id: '10+', label: '₹10L+' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARS = ['2025', '2026', '2027', '2028'];

export default function FilterScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams();
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedBudget, setSelectedBudget] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const toggleVibe = (vibe: string) => {
    setSelectedVibes(prev =>
      prev.includes(vibe) ? prev.filter(v => v !== vibe) : [...prev, vibe]
    );
  };

  const categoryLabel = (category as string)
    ?.replace('-', ' ')
    .replace(/\b\w/g, l => l.toUpperCase()) || 'Vendors';

  const dateLabel = selectedMonth && selectedYear
    ? `${selectedMonth} ${selectedYear}`
    : 'Select date';

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{categoryLabel}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Wedding Date</Text>
          <Text style={styles.sectionHint}>Booked vendors will be hidden</Text>

          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(!showDatePicker)}
          >
            <Text style={selectedMonth ? styles.dateInputSelected : styles.dateInputPlaceholder}>
              {dateLabel}
            </Text>
            <Text style={styles.dateChevron}>›</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <View style={styles.datePicker}>
              <View style={styles.yearRow}>
                {YEARS.map(year => (
                  <TouchableOpacity
                    key={year}
                    style={[styles.yearBtn, selectedYear === year && styles.yearBtnSelected]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <Text style={[styles.yearBtnText, selectedYear === year && styles.yearBtnTextSelected]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.monthGrid}>
                {MONTHS.map(month => (
                  <TouchableOpacity
                    key={month}
                    style={[styles.monthBtn, selectedMonth === month && styles.monthBtnSelected]}
                    onPress={() => {
                      setSelectedMonth(month);
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={[styles.monthBtnText, selectedMonth === month && styles.monthBtnTextSelected]}>
                      {month.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Budget */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Budget Range</Text>
          <Text style={styles.sectionHint}>Per vendor for this category</Text>

          <View style={styles.optionList}>
            {BUDGET_RANGES.map((b, index) => (
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
                {index < BUDGET_RANGES.length - 1 && <View style={styles.optionDivider} />}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* City */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>City</Text>
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

        <View style={styles.divider} />

        {/* Vibe */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Vibe</Text>
          <Text style={styles.sectionHint}>Select all that match your style</Text>
          <View style={styles.pillGrid}>
            {VIBE_TAGS.map(vibe => (
              <TouchableOpacity
                key={vibe}
                style={[styles.pill, selectedVibes.includes(vibe) && styles.pillSelected]}
                onPress={() => toggleVibe(vibe)}
              >
                <Text style={[styles.pillText, selectedVibes.includes(vibe) && styles.pillTextSelected]}>
                  {vibe}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={() => {
            setSelectedMonth('');
            setSelectedYear('');
            setSelectedBudget('');
            setSelectedCity('');
            setSelectedVibes([]);
          }}
        >
          <Text style={styles.clearBtnText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => router.push(`/swipe?category=${category}`)}
        >
          <Text style={styles.startBtnText}>Start Swiping</Text>
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
    marginBottom: 8,
  },
  backBtn: {
    fontSize: 22,
    color: '#1C1C1C',
    width: 24,
  },
  title: {
    fontSize: 17,
    color: '#1C1C1C',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#1C1C1C',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  sectionHint: {
    fontSize: 12,
    color: '#8C7B6E',
    marginTop: -6,
  },
  divider: {
    height: 1,
    backgroundColor: '#EDE8E3',
    marginHorizontal: 24,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8DDD4',
  },
  dateInputPlaceholder: {
    fontSize: 14,
    color: '#8C7B6E',
  },
  dateInputSelected: {
    fontSize: 14,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  dateChevron: {
    fontSize: 20,
    color: '#C9A84C',
  },
  datePicker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    padding: 16,
    gap: 12,
  },
  yearRow: {
    flexDirection: 'row',
    gap: 8,
  },
  yearBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  yearBtnSelected: {
    backgroundColor: '#1C1C1C',
    borderColor: '#1C1C1C',
  },
  yearBtnText: {
    fontSize: 13,
    color: '#1C1C1C',
  },
  yearBtnTextSelected: {
    color: '#FAF6F0',
    fontWeight: '500',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthBtn: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  monthBtnSelected: {
    backgroundColor: '#1C1C1C',
    borderColor: '#1C1C1C',
  },
  monthBtnText: {
    fontSize: 12,
    color: '#1C1C1C',
  },
  monthBtnTextSelected: {
    color: '#FAF6F0',
    fontWeight: '500',
  },
  optionList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  optionText: {
    fontSize: 15,
    color: '#1C1C1C',
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
    marginHorizontal: 16,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 50,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  pillSelected: {
    backgroundColor: '#1C1C1C',
    borderColor: '#1C1C1C',
  },
  pillText: {
    fontSize: 13,
    color: '#1C1C1C',
  },
  pillTextSelected: {
    color: '#FAF6F0',
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#EDE8E3',
    backgroundColor: '#FAF6F0',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  clearBtn: {
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  clearBtnText: {
    fontSize: 14,
    color: '#8C7B6E',
  },
  startBtn: {
    flex: 1,
    backgroundColor: '#1C1C1C',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  startBtnText: {
    fontSize: 15,
    color: '#FAF6F0',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});