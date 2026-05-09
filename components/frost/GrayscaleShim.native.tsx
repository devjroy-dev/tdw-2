/**
 * Grayscale shim — native impl.
 *
 * Metro's platform extension resolver picks up *.native.tsx on android/ios.
 * On web, *.web.tsx is used (renders a plain View, no native filter).
 * This split is required because react-native-color-matrix-image-filters
 * imports react-native internals that can't be bundled for web.
 */

import React from 'react';
import { Grayscale as NativeGrayscale } from 'react-native-color-matrix-image-filters';

interface GrayscaleProps {
  amount?: number;
  style?: any;
  children?: React.ReactNode;
}

export const Grayscale: React.ComponentType<GrayscaleProps> = NativeGrayscale;
