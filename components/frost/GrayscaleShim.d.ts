/**
 * Type declaration for GrayscaleShim — resolved by TypeScript.
 *
 * At runtime, Metro's platform extension resolver picks GrayscaleShim.native.tsx
 * on iOS/Android and GrayscaleShim.web.tsx on web. TS doesn't follow Metro's
 * resolution rules, so this .d.ts gives both bundlers what they need.
 */

import * as React from 'react';

interface GrayscaleProps {
  amount?: number;
  style?: any;
  children?: React.ReactNode;
}

export const Grayscale: React.ComponentType<GrayscaleProps>;
