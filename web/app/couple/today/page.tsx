'use client';

import React, { useEffect, useState } from 'react';

import TodayHero from '../../components/couple/TodayHero';
import MomentsNeedYou from '../../components/couple/MomentsNeedYou';
import ThisWeek from '../../components/couple/ThisWeek';
import MuseRow from '../../components/couple/MuseRow';
import QuietActivity from '../../components/couple/QuietActivity';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

interface TodayData {
  wedding_date?: string;
  event_label?: string;
  nudges: { id: string; title: string; context: string; cta: string; vendor_name?: string }[];
  thisWeek: { id: string; day: string; label: string }[];
  muse: { id: string; vendor_name: string; category: string; thumbnail_url?: string }[];
  activity: { id: string; text: string; timestamp: string }[];
}

const EMPTY: TodayData = { nudges: [], thisWeek: [], muse: [], activity: [] };

export default function CoupleTodayPage() {
  const [userId, setUserId]   = useState<string | null>(null);
  const [data, setData]       = useState<TodayData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('couple_session');
      if (!raw) { window.location.replace('/couple/login'); return; }
      const session = JSON.parse(raw);
      if (!session?.id) { window.location.replace('/couple/login'); return; }
      setUserId(session.id);
    } catch { window.location.replace('/couple/login'); }
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function load() {
      try {
        const res  = await fetch(`${API}/api/v2/couple/today/${userId}`);
        if (!res.ok) throw new Error('non-ok');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch { /* leave as EMPTY */ }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #FAFAF8; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
      <div style={{ background: '#FAFAF8', minHeight: '100dvh', paddingTop: 24, paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        <TodayHero weddingDate={data.wedding_date} eventLabel={data.event_label || 'Sangeet'} loading={loading} />
        <MomentsNeedYou nudges={data.nudges} loading={loading} />
        <ThisWeek thisWeek={data.thisWeek} loading={loading} />
        <MuseRow muse={data.muse} loading={loading} />
        <QuietActivity activity={data.activity} loading={loading} />
        <div style={{ height: 32 }} />
      </div>
    </>
  );
}
