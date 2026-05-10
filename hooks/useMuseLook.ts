/**
 * useMuseLook
 *
 * Reads the bride's home mode from AsyncStorage (@frost.home_mode) and returns
 * either 'E1' (dark mosaic) or 'E3' (light mosaic, default fallback). Re-reads
 * on screen focus so a mode change on home propagates to Muse the next time
 * Muse becomes visible — single source of truth lives on the home screen.
 *
 * Default while loading: 'E3' (light, brand-default). The brief flash of E3
 * before E1 resolves on first read is acceptable — most brides will land on
 * E3 anyway, and the alternative (showing nothing until AsyncStorage resolves)
 * adds latency to a frequently-visited canvas.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { MODE_STORAGE_KEY, muselookFromHomeMode, type MuseLook } from '../constants/museTokens';

export function useMuseLook(): MuseLook {
  const [look, setLook] = useState<MuseLook>('E3');

  const refresh = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(MODE_STORAGE_KEY);
      setLook(muselookFromHomeMode(stored));
    } catch {
      setLook('E3');
    }
  }, []);

  // First mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-read whenever Muse becomes visible (covers home-mode changes)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return look;
}
