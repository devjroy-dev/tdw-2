import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { TDW } from '../constants/theme';

const TABS = TDW.bottomNavTabs.couple;

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.nav}>
      {TABS.map((item) => {
        const isActive =
          (item.route === '/home' && pathname === '/home') ||
          (item.route === '/moodboard' && pathname === '/moodboard') ||
          (item.route === '/messaging' && pathname === '/messaging') ||
          (item.route === '/bts-planner' && pathname === '/bts-planner') ||
          (item.route === '/profile' && pathname === '/profile');

        return (
          <TouchableOpacity
            key={item.label}
            style={styles.item}
            onPress={() => {
              if (item.route && item.route !== pathname) {
                router.push(item.route as any);
              }
            }}
          >
            <Feather
              name={item.icon as any}
              size={TDW.icons.xl}
              color={isActive ? TDW.colors.dark : TDW.colors.grey}
            />
            <Text style={[
              styles.label,
              isActive && styles.labelActive,
            ]}>
              {item.label}
            </Text>
            {isActive && <View style={styles.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    ...TDW.components.bottomNav as any,
  },
  item: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    ...TDW.typography.navLabel as any,
  },
  labelActive: {
    color: TDW.colors.dark,
    fontFamily: TDW.fonts.sansMedium,
  },
  dot: {
    ...TDW.components.navDot as any,
  },
});
