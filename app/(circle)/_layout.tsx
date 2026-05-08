/**
 * Circle PWA — Stack layout.
 * Cream/gold Frost aesthetic. No tab bar at root — tabs live inside landing.
 */
import { Stack } from 'expo-router';
import { FrostColors } from '../../constants/frost';

export default function CircleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: FrostColors.pageFallback },
      }}
    />
  );
}
