'use client';

import { useEffect, useState } from 'react';
import Discovery from '@/components/discovery/Discovery';

export default function CoupleDiscoverPage() {
  const [session, setSession] = useState<{ userId: string; dreamerType: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('couple_session');
      if (raw) {
        const s = JSON.parse(raw);
        if (s?.id) {
          setSession({ userId: s.id, dreamerType: s.dreamer_type || 'platinum' });
        }
      }
    } catch {}
    setReady(true);
  }, []);

  // Prevent hydration mismatch — Discovery uses localStorage
  if (!ready) return null;

  // Discovery is position:fixed; inset:0 — renders full viewport
  // DO NOT wrap in any div or add any padding
  return <Discovery mode="couple" session={session} />;
}
