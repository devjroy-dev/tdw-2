'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function DashboardRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Carry demo session param (ds) through to today page so Safari demo works
    // without depending on localStorage being available.
    const ds = searchParams.get('ds');
    const demo = searchParams.get('demo');
    if (demo === '1' && ds) {
      router.replace('/vendor/today?demo=1&ds=' + ds);
    } else {
      router.replace('/vendor/today');
    }
  }, [router, searchParams]);

  return null;
}

export default function VendorDashboardRedirect() {
  return (
    <Suspense fallback={null}>
      <DashboardRedirectInner />
    </Suspense>
  );
}
