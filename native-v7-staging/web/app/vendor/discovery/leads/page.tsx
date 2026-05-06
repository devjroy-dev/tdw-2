'use client';
// The Discovery nav points here. Real Leads page lives at /vendor/leads.
// This redirect keeps the nav working without duplicating code.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DiscoveryLeadsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/vendor/leads'); }, [router]);
  return null;
}
