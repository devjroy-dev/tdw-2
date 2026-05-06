'use client';
import { useEffect } from 'react';

// This route existed as a duplicate mobile login. We've consolidated onto
// /vendor/login which auto-detects mobile vs desktop and adapts. Redirect.
export default function VendorMobileLoginRedirect() {
  useEffect(() => {
    window.location.replace('/vendor/login');
  }, []);
  return null;
}
