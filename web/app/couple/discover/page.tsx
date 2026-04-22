'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DiscoverRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/couple/discover/feed?mode=discover');
  }, [router]);

  return null;
}
