import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Allow /sw.js (served from origin root) to register with /vendor/mobile/ scope.
        // Without this header browsers block registering a SW with a scope above its location.
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/vendor/mobile/' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },
};

export default nextConfig;
