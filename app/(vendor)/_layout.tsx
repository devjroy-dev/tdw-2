/**
 * TDW Native — Vendor tab layout
 * Exact port of PWA vendor/layout.tsx + vendor/components/BottomNav.tsx
 *
 * Three modes driven by top pill (VendorTopBar):
 *
 * BUSINESS mode  — bottom nav: TODAY · CLIENTS · MONEY · STUDIO
 * DISCOVERY mode — bottom nav switches to: DASH · LEADS · IMAGE HUB · COLLAB
 * DREAMAI mode   — bottom nav hidden entirely. DreamAi is full page.
 *
 * Mode persisted in AsyncStorage key: vendor_app_mode
 * Mode syncs from pathname on every navigation (mirrors PWA layout.tsx useEffect)
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Slot, usePathname, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home, Users, Wallet, Grid2X2,
  LayoutDashboard, Inbox, Image, Handshake,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VendorTopBar from '../../components/VendorTopBar';

// ── Constants ─────────────────────────────────────────────────────────────────
const GOLD = '#C9A84C';
const MUTED = '#8C8480';
const DARK  = '#0C0A09';
const JOST  = 'Jost_300Light';

// ── Mode context — consumed by VendorTopBar ───────────────────────────────────
export type AppMode = 'BUSINESS' | 'DISCOVERY' | 'DREAMAI';

export const ModeContext = createContext<{
  mode: AppMode;
  setMode: (m: AppMode) => void;
}>({ mode: 'BUSINESS', setMode: () => {} });

export const useAppMode = () => useContext(ModeContext);

// ── Tab definitions ───────────────────────────────────────────────────────────
const BUSINESS_TABS = [
  { label: 'TODAY',   Icon: Home,            href: '/(vendor)/today'            },
  { label: 'CLIENTS', Icon: Users,           href: '/(vendor)/clients'          },
  { label: 'MONEY',   Icon: Wallet,          href: '/(vendor)/money'            },
  { label: 'STUDIO',  Icon: Grid2X2,         href: '/(vendor)/studio'           },
];

const DISCOVERY_TABS = [
  { label: 'DASH',      Icon: LayoutDashboard, href: '/(vendor)/discovery'        },
  { label: 'LEADS',     Icon: Inbox,           href: '/(vendor)/discovery-leads'  },
  { label: 'IMAGE HUB', Icon: Image,           href: '/(vendor)/discovery-images' },
  { label: 'COLLAB',    Icon: Handshake,       href: '/(vendor)/discovery-collab' },
];

// ── Path → mode (mirrors PWA layout.tsx useEffect) ───────────────────────────
function pathToMode(pathname: string): AppMode {
  if (pathname.includes('dreamai'))   return 'DREAMAI';
  if (pathname.includes('discovery')) return 'DISCOVERY';
  return 'BUSINESS';
}

// ── Nav tab ───────────────────────────────────────────────────────────────────
function NavTab({ label, Icon, href, isActive }: {
  label: string; Icon: any; href: string; isActive: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.navTab}
      onPress={() => router.push(href as any)}
      activeOpacity={0.75}
    >
      <View style={[styles.indicator, isActive && styles.indicatorActive]} />
      <Icon size={20} strokeWidth={1.5} color={isActive ? GOLD : MUTED} />
      <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function VendorLayout() {
  const insets   = useSafeAreaInsets();
  const pathname = usePathname();
  const [mode, setModeState] = useState<AppMode>('BUSINESS');

  // Load persisted mode on mount
  useEffect(() => {
    AsyncStorage.getItem('vendor_app_mode').then(saved => {
      if (saved === 'BUSINESS' || saved === 'DISCOVERY' || saved === 'DREAMAI') {
        setModeState(saved as AppMode);
      }
    });
  }, []);

  // Sync mode from pathname on every navigation (mirrors PWA)
  useEffect(() => {
    const resolved = pathToMode(pathname);
    setModeState(resolved);
    AsyncStorage.setItem('vendor_app_mode', resolved);
    const skip = ['pin', 'pin-login', 'onboarding', 'login'];
    if (!skip.some(p => pathname.includes(p))) {
      AsyncStorage.setItem('vendor_last_path', pathname);
    }
  }, [pathname]);

  const setMode = useCallback(async (m: AppMode) => {
    setModeState(m);
    await AsyncStorage.setItem('vendor_app_mode', m);
  }, []);

  // PIN/login — full page, no shell
  const isShellless = pathname.includes('pin') || pathname.includes('pin-login');
  if (isShellless) {
    return (
      <ModeContext.Provider value={{ mode, setMode }}>
        <Slot />
      </ModeContext.Provider>
    );
  }

  const isDreamAi   = mode === 'DREAMAI';
  const isDiscovery = mode === 'DISCOVERY';
  const tabs        = isDiscovery ? DISCOVERY_TABS : BUSINESS_TABS;
  const navHeight   = 64 + insets.bottom;

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      <View style={styles.root}>

        {/* Persistent top bar */}
        <VendorTopBar />

        {/* Page content — no bottom padding in DreamAi (input bar owns the bottom) */}
        <View style={[styles.content, !isDreamAi && { paddingBottom: navHeight }]}>
          <Slot />
        </View>

        {/* Bottom nav — hidden in DREAMAI mode */}
        {!isDreamAi && (
          <View style={[styles.bottomNav, { height: navHeight, paddingBottom: insets.bottom }]}>
            {tabs.map(tab => {
              const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
              return (
                <NavTab
                  key={tab.label}
                  label={tab.label}
                  Icon={tab.Icon}
                  href={tab.href}
                  isActive={isActive}
                />
              );
            })}
          </View>
        )}

      </View>
    </ModeContext.Provider>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F8F7F5' },
  content: { flex: 1 },

  bottomNav: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: DARK,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-around',
    zIndex: 100,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
    position: 'relative',
  },
  indicator: {
    position: 'absolute', top: 0,
    width: 24, height: 2, borderRadius: 1,
    backgroundColor: 'transparent',
  },
  indicatorActive: { backgroundColor: GOLD },
  navLabel: {
    fontFamily: JOST, fontSize: 9, letterSpacing: 2,
    textTransform: 'uppercase', color: MUTED, lineHeight: 13,
  },
  navLabelActive: { color: GOLD },
});
