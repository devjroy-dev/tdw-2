import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        router.replace('/login');
      });
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.centerContent,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}>
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
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    gap: 16,
  },
  taglineMain: {
    fontSize: 30,
    color: '#2C2420',
    fontWeight: '300',
    letterSpacing: 2,
    textAlign: 'center',
  },
  taglineSub: {
    fontSize: 16,
    color: '#8C7B6E',
    fontWeight: '300',
    letterSpacing: 3,
    textAlign: 'center',
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: '#C9A84C',
    opacity: 0.8,
    marginTop: 8,
  },
});