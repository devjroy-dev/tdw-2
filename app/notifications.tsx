import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

const NOTIFICATIONS = [
  {
    id: '1',
    type: 'payment',
    title: 'Token Payment Confirmed',
    message: 'Joseph Radhik has confirmed your booking for December 15, 2025. Your date is locked!',
    time: '2 hours ago',
    read: false,
  },
  {
    id: '2',
    type: 'message',
    title: 'New Message',
    message: 'The Leela Palace sent you a message about your venue inquiry.',
    time: '5 hours ago',
    read: false,
  },
  {
    id: '3',
    type: 'reminder',
    title: 'Payment Reminder',
    message: 'Token payment for The Leela Palace is due on December 20, 2025.',
    time: '1 day ago',
    read: true,
  },
  {
    id: '4',
    type: 'reminder',
    title: 'Wedding Countdown',
    message: 'Your wedding is 247 days away. Have you booked your MUA yet?',
    time: '2 days ago',
    read: true,
  },
  {
    id: '5',
    type: 'trending',
    title: 'New Vendor in Your City',
    message: 'DJ Chetas is now available in Delhi NCR. Check out their profile.',
    time: '3 days ago',
    read: true,
  },
];

const TYPE_COLORS: Record<string, string> = {
  payment: '#4CAF50',
  message: '#C9A84C',
  reminder: '#2C2420',
  trending: '#8C7B6E',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markRead}>Mark all read</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={{ width: 70 }} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {notifications.map((notif, index) => (
          <View key={notif.id}>
            <TouchableOpacity
              style={[styles.notifRow, !notif.read && styles.notifRowUnread]}
              onPress={() => {
                setNotifications(prev =>
                  prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
                );
              }}
            >
              <View style={[styles.notifDot, { backgroundColor: TYPE_COLORS[notif.type] }]} />
              <View style={styles.notifContent}>
                <View style={styles.notifTopRow}>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                  <Text style={styles.notifTime}>{notif.time}</Text>
                </View>
                <Text style={styles.notifMessage}>{notif.message}</Text>
              </View>
              {!notif.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
            {index < notifications.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  backBtn: {
    fontSize: 22,
    color: '#2C2420',
    width: 24,
  },
  title: {
    fontSize: 17,
    color: '#2C2420',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  markRead: {
    fontSize: 13,
    color: '#C9A84C',
    width: 70,
    textAlign: 'right',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 14,
  },
  notifRowUnread: {
    backgroundColor: '#FDFAF5',
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  notifContent: {
    flex: 1,
    gap: 6,
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    fontSize: 14,
    color: '#2C2420',
    fontWeight: '500',
    flex: 1,
  },
  notifTime: {
    fontSize: 11,
    color: '#8C7B6E',
    marginLeft: 8,
  },
  notifMessage: {
    fontSize: 13,
    color: '#8C7B6E',
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C9A84C',
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E0D5',
    marginHorizontal: 24,
  },
});