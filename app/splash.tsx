import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.replace('/login');
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.centerContent, { opacity: fadeAnim }]}>
        <Text style={styles.taglineMain}>Your Dream Wedding.</Text>
        <Text style={styles.taglineSub}>It all starts here.</Text>
        <View style={styles.divider} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    height,
    backgroundColor: '#FAF6F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    gap: 16,
  },
  taglineMain: {
    fontSize: 28,
    color: '#1C1C1C',
    fontWeight: '300',
    letterSpacing: 2,
    textAlign: 'center',
  },
  taglineSub: {
    fontSize: 16,
    color: '#8C7B6E',
    fontWeight: '300',
    letterSpacing: 2,
    textAlign: 'center',
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: '#C9A84C',
    opacity: 0.6,
    marginTop: 8,
  },
});