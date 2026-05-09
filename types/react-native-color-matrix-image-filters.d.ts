/**
 * Type shim for react-native-color-matrix-image-filters.
 *
 * This package is added to package.json in this drop. EAS build will install it
 * as a native module. Until then, this declaration keeps `tsc --noEmit` clean
 * and Metro happy in the local development server.
 *
 * After `npm install` happens (locally or in EAS), the package's own .d.ts
 * files will be discovered and take precedence over this shim — no harm done.
 */

declare module 'react-native-color-matrix-image-filters' {
  import { ComponentType, ReactNode } from 'react';
  import { ViewProps } from 'react-native';

  export interface FilterProps extends ViewProps {
    amount?: number;
    children?: ReactNode;
  }

  export const Grayscale: ComponentType<FilterProps>;
  export const Sepia: ComponentType<FilterProps>;
  export const Saturate: ComponentType<FilterProps>;
  export const Brightness: ComponentType<FilterProps>;
  export const Contrast: ComponentType<FilterProps>;
  export const Invert: ComponentType<FilterProps>;
  export const Tint: ComponentType<FilterProps & { tintColor?: string }>;
}
