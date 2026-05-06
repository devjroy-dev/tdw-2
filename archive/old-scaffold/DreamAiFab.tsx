import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

/**
 * DreamAi Floating Action Button
 * Appears on all couple screens (bottom-right, above nav).
 * Tap to open DreamAi chat in Planner.
 */
export default function DreamAiFab() {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={s.fab}
      onPress={() => router.push('/bts-planner?tool=dream-ai' as any)}
      activeOpacity={0.85}
    >
      <Feather name="zap" size={18} color="#C9A84C" />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#E8D9B5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 40,
  },
});
