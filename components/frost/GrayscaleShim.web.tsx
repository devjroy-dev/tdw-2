/**
 * Grayscale shim — web impl.
 *
 * On web, Grayscale is a passthrough — just renders children in a View.
 * Web's photo greyscale comes from CSS filter applied in ModePhoto's web
 * branch instead. This file exists so that web bundling doesn't try to
 * import react-native-color-matrix-image-filters (which fails because
 * the lib uses native-only react-native internals).
 */

import React from 'react';
import { View } from 'react-native';

interface GrayscaleProps {
  amount?: number;
  style?: any;
  children?: React.ReactNode;
}

export const Grayscale: React.ComponentType<GrayscaleProps> = ({ style, children }) => (
  <View style={style}>{children}</View>
);
