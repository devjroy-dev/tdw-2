/**
 * Frost · Journey · Events (v3 — wired)
 *
 * Vertical timeline of the wedding's events. Each event = a date circle on
 * the left, a card on the right with name, venue, and count summary
 * (X reminders · Y vendors · Z guests). Soonest-upcoming is brass-bordered.
 *
 * Read-only. No add, no edit, no delete. The bride glances; she does not
 * organize from here. Date or venue changes go through Dream Ai.
 */

import React, { useCallback, useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts,
} from '../../../../constants/frost';
import {
  fetchMyEvents, CoupleEvent,
} from '../../../../services/frostApi';

export default function JourneyEvents() {
  const [events, setEvents] = useState<CoupleEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    const r = await fetchMyEvents();
    if (r === null) { setError(true); setEvents([]); }
    else setEvents(r);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const all = events ?? [];
  const isEmpty = !loading && !error && all.length === 0;

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const soonestIdx = all.findIndex(ev => {
    if (!ev.event_date) return false;
    const d = new Date(ev.event_date); d.setHours(0, 0, 0, 0);
    return d.getTime() >= now.getTime();
  });

  return (
    <FrostCanvasShell eyebrow="JOURNEY · EVENTS" mode="frost">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={FrostColors.goldMuted} />
        }
      >
        <Text style={styles.heading}>The days.</Text>

        {loading ? (
          <View style={styles.stateWrap}><Text style={styles.loadingDots}>…</Text></View>
        ) : error ? (
          <Text style={styles.errorText}>I couldn't reach the page. Pull down to try again.</Text>
        ) : isEmpty ? (
          <Text style={styles.emptyText}>Your days will appear here.</Text>
        ) : (
          <View style={styles.timeline}>
            <View style={styles.spine} />
            {all.map((ev, i) => (
              <EventNode key={ev.id} event={ev} highlight={i === soonestIdx} />
            ))}
          </View>
        )}
      </ScrollView>
    </FrostCanvasShell>
  );
}

// ─── Node ───────────────────────────────────────────────────────────────────

function EventNode({ event, highlight }: { event: CoupleEvent; highlight: boolean }) {
  const { month, day } = formatEventDate(event.event_date);
  const counts: string[] = [];
  if (event.task_count && event.task_count > 0) counts.push(`${event.task_count} reminder${event.task_count === 1 ? '' : 's'}`);
  if (event.vendor_count && event.vendor_count > 0) counts.push(`${event.vendor_count} vendor${event.vendor_count === 1 ? '' : 's'}`);
  const countLine = counts.join(' · ');

  return (
    <View style={styles.node}>
      <View style={[styles.dateCircle, highlight && styles.dateCircleHighlight]}>
        <Text style={styles.dateMonth}>{month}</Text>
        <Text style={styles.dateDay}>{day}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardName}>{event.event_name || event.event_type || 'Event'}</Text>
        {event.venue ? <Text style={styles.cardVenue}>{event.venue}</Text> : null}
        {countLine ? <Text style={styles.cardCount}>{countLine}</Text> : null}
      </View>
    </View>
  );
}

function formatEventDate(d: string | null | undefined): { month: string; day: string } {
  if (!d) return { month: '', day: '—' };
  const date = new Date(d);
  if (isNaN(date.getTime())) return { month: '', day: '—' };
  return {
    month: date.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
    day: String(date.getDate()),
  };
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: FrostSpace.xxl,
    paddingTop: FrostSpace.xl,
    paddingBottom: FrostSpace.huge,
  },
  heading: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 26, lineHeight: 30,
    color: FrostColors.ink,
    letterSpacing: 0.3,
    marginBottom: FrostSpace.xl,
  },
  timeline: { position: 'relative' },
  spine: {
    position: 'absolute',
    left: 22,
    top: 22,
    bottom: 22,
    width: StyleSheet.hairlineWidth,
    backgroundColor: FrostColors.hairline,
  },
  node: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: FrostSpace.l,
    marginBottom: FrostSpace.xl,
  },
  dateCircle: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.hairline,
    backgroundColor: 'rgba(236,233,228,0.6)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  dateCircleHighlight: {
    borderColor: FrostColors.goldTrue,
    borderWidth: 1,
  },
  dateMonth: {
    fontFamily: FrostFonts.label,
    fontSize: 9,
    color: FrostColors.soft,
    letterSpacing: 1.2,
    lineHeight: 11,
  },
  dateDay: {
    fontFamily: FrostFonts.display,
    fontSize: 18,
    color: FrostColors.ink,
    lineHeight: 22,
  },
  card: {
    flex: 1,
    paddingVertical: FrostSpace.s,
  },
  cardName: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 20, lineHeight: 24,
    color: FrostColors.ink,
    letterSpacing: 0.2,
  },
  cardVenue: {
    ...FrostType.bodySmall,
    color: FrostColors.soft,
    marginTop: 2,
  },
  cardCount: {
    ...FrostType.eyebrowSmall,
    marginTop: FrostSpace.s,
    letterSpacing: 1.6,
    color: FrostColors.goldMuted,
  },
  stateWrap: { paddingTop: 80, alignItems: 'center' },
  loadingDots: {
    fontFamily: FrostFonts.display,
    fontSize: 36,
    color: FrostColors.goldMuted,
    letterSpacing: 6,
  },
  emptyText: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 18, lineHeight: 24,
    color: FrostColors.soft,
    textAlign: 'center',
    paddingTop: 80,
  },
  errorText: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 16, lineHeight: 22,
    color: FrostColors.soft,
    textAlign: 'center',
    paddingTop: 80,
  },
});
