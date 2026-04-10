import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function SplashScreen2() {
  const router = useRouter();
  const line1Opacity = useRef(new Animated.Value(0)).current;
  const line1Translate = useRef(new Animated.Value(8)).current;
  const line2Opacity = useRef(new Animated.Value(0)).current;
  const line2Translate = useRef(new Animated.Value(8)).current;
  const dividerWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SplashScreen.hideAsync();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(line1Opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(line1Translate, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(dividerWidth, {
        toValue: 40,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.parallel([
        Animated.timing(line2Opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(line2Translate, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const timer = setTimeout(async () => {
      try {
        const vendorSession = await AsyncStorage.getItem('vendor_session');
        if (vendorSession) {
          const parsed = JSON.parse(vendorSession);
          if (parsed.onboarded && parsed.vendorId) {
            router.replace('/vendor-dashboard');
            return;
          }
        }
        const userSession = await AsyncStorage.getItem('user_session');
        if (userSession) {
          router.replace('/home');
          return;
        }
        router.replace('/login');
      } catch (e) {
        router.replace('/login');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.Text style={[styles.line1, {
          opacity: line1Opacity,
          transform: [{ translateY: line1Translate }]
        }]}>
          Your Dreams
        </Animated.Text>
        <Animated.View style={[styles.divider, { width: dividerWidth }]} />
        <Animated.Text style={[styles.line2, {
          opacity: line2Opacity,
          transform: [{ translateY: line2Translate }]
        }]}>
          Start Here.
        </Animated.Text>
      </View>
      <Animated.Text style={[styles.footer, { opacity: line2Opacity }]}>
        thedreamwedding.in
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 12,
  },
  line1: {
    fontSize: 32,
    color: '#2C2420',
    fontWeight: '300',
    letterSpacing: 2,
    textAlign: 'center',
  },
  divider: {
    height: 1.5,
    backgroundColor: '#C9A84C',
  },
  line2: {
    fontSize: 32,
    color: '#C9A84C',
    fontWeight: '300',
    letterSpacing: 2,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    fontSize: 11,
    color: '#8C7B6E',
    letterSpacing: 2.5,
    textTransform: 'lowercase',
  },
});