/**
 * Frost · FrostContactCard
 *
 * Renders inside the Dream Ai chat stream when bride-chat returns a
 * contact_action from the contact_vendor tool. The bride's INTENT (call vs
 * message) is decided — the model already knows which because she said
 * "call" or "message". The card lets her pick the CHANNEL within that intent:
 *
 *   intent='call'      → [PHONE CALL] [WHATSAPP CALL]
 *   intent='whatsapp'  → [WHATSAPP]   [NATIVE MESSAGES]
 *
 * (intent='whatsapp' is the message intent — backend names it 'whatsapp'
 * because that's what the bride said when she meant "message". The card UI
 * treats it as the message intent and offers WhatsApp + native SMS channels.)
 *
 * Tap → Linking.openURL with one of:
 *   tel:+919888294440                      (phone call)
 *   https://wa.me/919888294440             (WhatsApp call — opens chat,
 *                                           bride taps the call icon there)
 *   https://wa.me/919888294440?text=...    (WhatsApp message, pre-filled)
 *   sms:+919888294440?body=...             (native SMS, pre-filled)
 *
 * Note on WhatsApp call: the universal wa.me link doesn't have a "call"
 * deep-link variant. The cleanest approach: open the WhatsApp chat with the
 * vendor and let her tap the call icon inside WhatsApp. This is one tap
 * extra, but it's reliable on iOS+Android and survives WhatsApp updates.
 *
 * Note on SMS prefill: Android prefills body reliably. iOS sometimes does,
 * sometimes doesn't, depending on iOS version. If prefill fails on iOS,
 * the bride sees the recipient set but an empty body — she can long-press
 * the message preview text in the card to copy/paste manually.
 */

import React from 'react';
import {
  View, Text, Pressable, StyleSheet, Linking, Alert, Platform,
} from 'react-native';
import { Phone, MessageCircle, MessageSquare } from 'lucide-react-native';
import {
  FrostColors, FrostFonts, FrostType, FrostSpace, FrostRadius,
} from '../../constants/frost';

// Backend's contact_action shape — matches what bride-chat sends in
// `res.contactAction` after Phase 1.6.1.
export interface ContactAction {
  /** What the bride asked for. */
  kind: 'call' | 'whatsapp';
  /** Vendor's display name. */
  name: string;
  /** E.164 phone number, e.g. "+919888294440". */
  phone: string;
  /** Vendor category (MUA, Photographer, etc) — used as small label. */
  label?: string | null;
  /** Drafted message body — only present when kind='whatsapp'. */
  message?: string | null;
}

interface Props {
  action: ContactAction;
}

// ─── URL builders ───────────────────────────────────────────────────────────

/** Strip everything except digits. wa.me wants digits-only with country code. */
function digitsOnly(phone: string): string {
  return String(phone).replace(/[^0-9]/g, '');
}

/** tel:+91... — opens native dialer with number pre-filled. */
function buildPhoneCallUrl(phone: string): string {
  // Keep the leading "+" for tel: scheme — both iOS and Android handle it.
  const cleaned = phone.startsWith('+') ? phone : '+' + digitsOnly(phone);
  return `tel:${cleaned}`;
}

/** wa.me/91... — opens WhatsApp chat. Bride taps the call icon in chat. */
function buildWhatsAppCallUrl(phone: string): string {
  return `https://wa.me/${digitsOnly(phone)}`;
}

/** wa.me/91...?text=... — opens WhatsApp with message pre-typed. */
function buildWhatsAppMessageUrl(phone: string, message: string): string {
  return `https://wa.me/${digitsOnly(phone)}?text=${encodeURIComponent(message)}`;
}

/** sms:+91...?body=... — opens native SMS app with body pre-filled. */
function buildSmsUrl(phone: string, message: string): string {
  const cleaned = phone.startsWith('+') ? phone : '+' + digitsOnly(phone);
  // iOS uses "&body=", Android uses "?body=" historically. Modern Android
  // accepts the "?body=" form correctly; iOS 8+ also handles "?body=" via
  // the standardised Linking. Stick with "?body=" — works on both today.
  const sep = Platform.OS === 'ios' ? '&' : '?';
  return `sms:${cleaned}${sep}body=${encodeURIComponent(message)}`;
}

/** Format phone for display: "+91 98882 94440" */
function formatPhoneForDisplay(phone: string): string {
  const digits = digitsOnly(phone);
  if (digits.length === 12 && digits.startsWith('91')) {
    // Indian E.164: 91 98882 94440 → +91 98882 94440
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  // Fallback — return as-is with leading +
  return phone.startsWith('+') ? phone : '+' + digits;
}

// ─── Tap handlers ───────────────────────────────────────────────────────────

async function tryOpen(url: string, fallbackLabel: string) {
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert(
        'Can\u2019t open',
        `${fallbackLabel} doesn\u2019t seem to be available on this device.`,
      );
      return;
    }
    await Linking.openURL(url);
  } catch (e) {
    Alert.alert('Something went sideways', 'Try once more?');
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FrostContactCard({ action }: Props) {
  const { kind, name, phone, label, message } = action;
  const displayPhone = formatPhoneForDisplay(phone);
  const draftedMessage = message || `Hi ${name}! Quick question for you.`;

  const onPhoneCall      = () => tryOpen(buildPhoneCallUrl(phone), 'Phone');
  const onWhatsAppCall   = () => tryOpen(buildWhatsAppCallUrl(phone), 'WhatsApp');
  const onWhatsAppMsg    = () => tryOpen(buildWhatsAppMessageUrl(phone, draftedMessage), 'WhatsApp');
  const onSmsMsg         = () => tryOpen(buildSmsUrl(phone, draftedMessage), 'Messages');

  const isCallIntent = kind === 'call';

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        {/* Header row: icon + name + meta */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            {isCallIntent ? (
              <Phone size={16} color={FrostColors.goldTrue} strokeWidth={1.6} />
            ) : (
              <MessageCircle size={16} color={FrostColors.goldTrue} strokeWidth={1.6} />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {[label, displayPhone].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        {/* Drafted message preview (message intent only) */}
        {!isCallIntent && draftedMessage ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{draftedMessage}</Text>
          </View>
        ) : null}

        {/* Two channel pills */}
        <View style={styles.actions}>
          {isCallIntent ? (
            <>
              <ChannelPill
                label="PHONE CALL"
                icon={<Phone size={13} color={FrostColors.white} strokeWidth={1.7} />}
                primary
                onPress={onPhoneCall}
              />
              <ChannelPill
                label="WHATSAPP"
                icon={<MessageCircle size={13} color={FrostColors.ink} strokeWidth={1.7} />}
                onPress={onWhatsAppCall}
              />
            </>
          ) : (
            <>
              <ChannelPill
                label="WHATSAPP"
                icon={<MessageCircle size={13} color={FrostColors.white} strokeWidth={1.7} />}
                primary
                onPress={onWhatsAppMsg}
              />
              <ChannelPill
                label="MESSAGES"
                icon={<MessageSquare size={13} color={FrostColors.ink} strokeWidth={1.7} />}
                onPress={onSmsMsg}
              />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── ChannelPill ────────────────────────────────────────────────────────────

function ChannelPill({
  label, icon, onPress, primary = false,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        primary ? styles.pillPrimary : styles.pillSecondary,
        pressed && styles.pillPressed,
      ]}
    >
      {icon}
      <Text style={primary ? styles.pillTextPrimary : styles.pillTextSecondary}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: FrostSpace.l,
    paddingVertical: FrostSpace.s,
  },
  card: {
    backgroundColor: 'rgba(255,253,248,0.6)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.hairline,
    borderRadius: FrostRadius.box,
    padding: FrostSpace.l,
    gap: FrostSpace.m,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FrostSpace.m,
  },
  iconCircle: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(168,146,75,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  name: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 18, lineHeight: 22,
    color: FrostColors.ink,
  },
  meta: {
    ...FrostType.bodySmall,
    color: FrostColors.soft,
    marginTop: 1,
  },
  messageBox: {
    paddingHorizontal: FrostSpace.m,
    paddingVertical: FrostSpace.s + 2,
    backgroundColor: 'rgba(216,211,204,0.5)',
    borderRadius: FrostRadius.sm,
  },
  messageText: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 15, lineHeight: 20,
    color: FrostColors.soft,
  },
  actions: {
    flexDirection: 'row',
    gap: FrostSpace.s,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: FrostSpace.m,
    borderRadius: FrostRadius.pill,
  },
  pillPrimary: {
    backgroundColor: FrostColors.ink,
  },
  pillSecondary: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.hairline,
  },
  pillPressed: { opacity: 0.85 },
  pillTextPrimary: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 10,
    letterSpacing: 1.4,
    color: FrostColors.white,
  },
  pillTextSecondary: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 10,
    letterSpacing: 1.4,
    color: FrostColors.ink,
  },
});
