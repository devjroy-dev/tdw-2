import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>D</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Dev</Text>
            <Text style={styles.userPhone}>+91 98765 43210</Text>
            <Text style={styles.userWedding}>December 2025 · Delhi NCR</Text>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Subscription */}
        <View style={styles.subscriptionCard}>
          <View>
            <Text style={styles.subscriptionPlan}>Basic Plan</Text>
            <Text style={styles.subscriptionDetail}>3 vendor unlocks remaining</Text>
          </View>
          <TouchableOpacity style={styles.upgradeBtn}>
            <Text style={styles.upgradeBtnText}>Upgrade</Text>
          </TouchableOpacity>
        </View>

        {/* Co-planner */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Co-planner</Text>
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardTitle}>No co-planner linked</Text>
              <Text style={styles.cardSub}>Invite your partner or parent to plan together</Text>
            </View>
            <TouchableOpacity style={styles.linkBtn}>
              <Text style={styles.linkBtnText}>Invite</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wedding Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Wedding Details</Text>
          <View style={styles.listCard}>
            {[
              { key: 'Date', val: 'December 2025' },
              { key: 'City', val: 'Delhi NCR' },
              { key: 'Budget', val: '₹25L – ₹50L' },
              { key: 'Functions', val: 'Mehendi, Sangeet, Wedding, Reception' },
            ].map((item, index, arr) => (
              <View key={item.key}>
                <View style={styles.listRow}>
                  <Text style={styles.listKey}>{item.key}</Text>
                  <Text style={styles.listVal}>{item.val}</Text>
                </View>
                {index < arr.length - 1 && <View style={styles.listDivider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notifications</Text>
          <View style={styles.listCard}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Push Notifications</Text>
              <TouchableOpacity
                style={[styles.toggle, notifications && styles.toggleActive]}
                onPress={() => setNotifications(!notifications)}
              >
                <View style={[styles.toggleThumb, notifications && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
            <View style={styles.listDivider} />
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Payment Reminders</Text>
              <TouchableOpacity
                style={[styles.toggle, reminders && styles.toggleActive]}
                onPress={() => setReminders(!reminders)}
              >
                <View style={[styles.toggleThumb, reminders && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.listCard}>
            {[
              'Privacy Policy',
              'Terms of Service',
              'Help & Support',
              'Rate DreamWedding',
            ].map((item, index, arr) => (
              <View key={item}>
                <TouchableOpacity style={styles.listRow}>
                  <Text style={styles.listKey}>{item}</Text>
                  <Text style={styles.listArrow}>›</Text>
                </TouchableOpacity>
                {index < arr.length - 1 && <View style={styles.listDivider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>DreamWedding v1.0.0</Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/moodboard')}>
          <Text style={styles.navLabel}>Moodboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/bts-planner')}>
          <Text style={styles.navLabel}>Planner</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={[styles.navLabel, styles.navActive]}>Profile</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    color: '#1C1C1C',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    gap: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    color: '#FAF6F0',
    fontWeight: '400',
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  userName: {
    fontSize: 17,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  userPhone: {
    fontSize: 13,
    color: '#8C7B6E',
  },
  userWedding: {
    fontSize: 12,
    color: '#C9A84C',
  },
  editBtn: {
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editBtnText: {
    fontSize: 13,
    color: '#1C1C1C',
  },
  subscriptionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8EC',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8D9B5',
  },
  subscriptionPlan: {
    fontSize: 15,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  subscriptionDetail: {
    fontSize: 12,
    color: '#8C7B6E',
    marginTop: 3,
  },
  upgradeBtn: {
    backgroundColor: '#1C1C1C',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  upgradeBtnText: {
    fontSize: 13,
    color: '#FAF6F0',
    fontWeight: '500',
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    gap: 12,
  },
  cardLeft: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 14,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  cardSub: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  linkBtn: {
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  linkBtnText: {
    fontSize: 13,
    color: '#C9A84C',
    fontWeight: '500',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  listKey: {
    fontSize: 14,
    color: '#1C1C1C',
  },
  listVal: {
    fontSize: 13,
    color: '#8C7B6E',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  listArrow: {
    fontSize: 20,
    color: '#C9A84C',
  },
  listDivider: {
    height: 1,
    backgroundColor: '#EDE8E3',
    marginHorizontal: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#1C1C1C',
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E8DDD4',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#1C1C1C',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: '#EDE8E3',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logoutBtnText: {
    fontSize: 14,
    color: '#E57373',
    fontWeight: '500',
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: '#8C7B6E',
    letterSpacing: 0.5,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#EDE8E3',
    backgroundColor: '#FAF6F0',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  navItem: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 0.3,
  },
  navActive: {
    color: '#C9A84C',
    fontWeight: '600',
  },
});