import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const TABS = ['Overview', 'Inquiries', 'Calendar', 'Reviews'];

const MOCK_INQUIRIES = [
  {
    id: '1',
    name: 'Priya & Rahul',
    function: 'Wedding',
    date: 'December 15, 2025',
    message: 'Hi, I\'m Priya, interested in Photography for Wedding on Dec 15. Are you available?',
    status: 'new',
  },
  {
    id: '2',
    name: 'Sneha & Arjun',
    function: 'Sangeet',
    date: 'November 20, 2025',
    message: 'Hi, I\'m Sneha, interested in Photography for Sangeet on Nov 20. Are you available?',
    status: 'replied',
  },
  {
    id: '3',
    name: 'Ananya & Dev',
    function: 'Reception',
    date: 'January 5, 2026',
    message: 'Hi, I\'m Ananya, interested in Photography for Reception on Jan 5. Are you available?',
    status: 'new',
  },
];

const BLOCKED_DATES = [
  'Dec 10, 2025',
  'Dec 15, 2025',
  'Dec 22, 2025',
  'Jan 1, 2026',
];

const MONTHS = ['Nov', 'Dec', 'Jan'];

export default function VendorDashboardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Overview');
  const [isLive, setIsLive] = useState(true);

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.businessName}>Arjun Mehta Photography</Text>
          <Text style={styles.category}>Photographer · Delhi NCR</Text>
        </View>
        <TouchableOpacity
          style={[styles.liveToggle, isLive && styles.liveToggleActive]}
          onPress={() => setIsLive(!isLive)}
        >
          <View style={[styles.liveDot, isLive && styles.liveDotActive]} />
          <Text style={[styles.liveToggleText, isLive && styles.liveToggleTextActive]}>
            {isLive ? 'Live' : 'Paused'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContent}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >

        {/* OVERVIEW TAB */}
        {activeTab === 'Overview' && (
          <View style={styles.tabPane}>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>142</Text>
                <Text style={styles.statLabel}>Profile Views</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>38</Text>
                <Text style={styles.statLabel}>Hearts</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>12</Text>
                <Text style={styles.statLabel}>Inquiries</Text>
              </View>
            </View>

            {/* Subscription */}
            <View style={styles.subscriptionCard}>
              <View>
                <Text style={styles.subscriptionPlan}>Premium Plan</Text>
                <Text style={styles.subscriptionDetail}>Renews January 1, 2026</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
              </View>
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionLabel}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setActiveTab('Inquiries')}
              >
                <Text style={styles.actionNumber}>3</Text>
                <Text style={styles.actionLabel}>New Inquiries</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setActiveTab('Calendar')}
              >
                <Text style={styles.actionNumber}>4</Text>
                <Text style={styles.actionLabel}>Blocked Dates</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setActiveTab('Reviews')}
              >
                <Text style={styles.actionNumber}>★ 4.9</Text>
                <Text style={styles.actionLabel}>Your Rating</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard}>
                <Text style={styles.actionNumber}>10</Text>
                <Text style={styles.actionLabel}>Photos Live</Text>
              </TouchableOpacity>
            </View>

            {/* Profile Preview */}
            <TouchableOpacity style={styles.previewBtn}>
              <Text style={styles.previewBtnText}>Preview your profile as couples see it →</Text>
            </TouchableOpacity>

          </View>
        )}

        {/* INQUIRIES TAB */}
        {activeTab === 'Inquiries' && (
          <View style={styles.tabPane}>
            <Text style={styles.sectionLabel}>Incoming Inquiries</Text>
            {MOCK_INQUIRIES.map(inquiry => (
              <View key={inquiry.id} style={styles.inquiryCard}>
                <View style={styles.inquiryTop}>
                  <View>
                    <Text style={styles.inquiryName}>{inquiry.name}</Text>
                    <Text style={styles.inquiryMeta}>{inquiry.function} · {inquiry.date}</Text>
                  </View>
                  <View style={[
                    styles.inquiryBadge,
                    { backgroundColor: inquiry.status === 'new' ? '#C9A84C20' : '#E8DDD4' }
                  ]}>
                    <Text style={[
                      styles.inquiryBadgeText,
                      { color: inquiry.status === 'new' ? '#C9A84C' : '#8C7B6E' }
                    ]}>
                      {inquiry.status === 'new' ? 'New' : 'Replied'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.inquiryMessage} numberOfLines={2}>
                  "{inquiry.message}"
                </Text>
                {inquiry.status === 'new' && (
                  <View style={styles.inquiryActions}>
                    <TouchableOpacity style={styles.replyBtn}>
                      <Text style={styles.replyBtnText}>Reply</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.confirmBtn}>
                      <Text style={styles.confirmBtnText}>Confirm & Lock Date</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* CALENDAR TAB */}
        {activeTab === 'Calendar' && (
          <View style={styles.tabPane}>
            <Text style={styles.sectionLabel}>Availability Calendar</Text>
            <Text style={styles.calendarHint}>
              Block dates you're already booked so you don't appear in couples' filtered search
            </Text>

            <View style={styles.blockedList}>
              <Text style={styles.blockedTitle}>Currently Blocked</Text>
              {BLOCKED_DATES.map(date => (
                <View key={date} style={styles.blockedRow}>
                  <Text style={styles.blockedDate}>{date}</Text>
                  <TouchableOpacity style={styles.unblockBtn}>
                    <Text style={styles.unblockBtnText}>Unblock</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.blockDateBtn}>
              <Text style={styles.blockDateBtnText}>+ Block a Date</Text>
            </TouchableOpacity>

          </View>
        )}

        {/* REVIEWS TAB */}
        {activeTab === 'Reviews' && (
          <View style={styles.tabPane}>
            <View style={styles.ratingOverview}>
              <Text style={styles.ratingBig}>4.9</Text>
              <Text style={styles.ratingStars}>★★★★★</Text>
              <Text style={styles.ratingCount}>124 reviews</Text>
            </View>

            <Text style={styles.sectionLabel}>Video Reviews</Text>

            <View style={styles.reviewCard}>
              <View style={styles.reviewTop}>
                <View style={styles.reviewAvatar}>
                  <Text style={styles.reviewAvatarText}>P</Text>
                </View>
                <View style={styles.reviewInfo}>
                  <Text style={styles.reviewName}>Priya & Rahul</Text>
                  <Text style={styles.reviewFunction}>Wedding · Dec 2024</Text>
                </View>
                <Text style={styles.reviewRating}>★★★★★</Text>
              </View>
              <View style={styles.videoThumb}>
                <Text style={styles.videoThumbText}>▶ Video Review</Text>
              </View>
            </View>

            <View style={styles.reviewCard}>
              <View style={styles.reviewTop}>
                <View style={styles.reviewAvatar}>
                  <Text style={styles.reviewAvatarText}>S</Text>
                </View>
                <View style={styles.reviewInfo}>
                  <Text style={styles.reviewName}>Sneha & Arjun</Text>
                  <Text style={styles.reviewFunction}>Sangeet · Nov 2024</Text>
                </View>
                <Text style={styles.reviewRating}>★★★★★</Text>
              </View>
              <View style={styles.videoThumb}>
                <Text style={styles.videoThumbText}>▶ Video Review</Text>
              </View>
            </View>

          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navLabel}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.navLabel}>Log Out</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  businessName: {
    fontSize: 20,
    color: '#1C1C1C',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  category: {
    fontSize: 13,
    color: '#8C7B6E',
    marginTop: 4,
  },
  liveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  liveToggleActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF5010',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8C7B6E',
  },
  liveDotActive: {
    backgroundColor: '#4CAF50',
  },
  liveToggleText: {
    fontSize: 13,
    color: '#8C7B6E',
    fontWeight: '500',
  },
  liveToggleTextActive: {
    color: '#4CAF50',
  },
  tabScroll: {
    maxHeight: 44,
    marginBottom: 16,
  },
  tabContent: {
    paddingHorizontal: 24,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    backgroundColor: '#FFFFFF',
  },
  tabActive: {
    backgroundColor: '#1C1C1C',
    borderColor: '#1C1C1C',
  },
  tabText: {
    fontSize: 13,
    color: '#1C1C1C',
  },
  tabTextActive: {
    color: '#FAF6F0',
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  tabPane: {
    gap: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8DDD4',
  },
  statNumber: {
    fontSize: 24,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  statLabel: {
    fontSize: 11,
    color: '#8C7B6E',
    textAlign: 'center',
  },
  subscriptionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    padding: 18,
  },
  subscriptionPlan: {
    fontSize: 15,
    color: '#FAF6F0',
    fontWeight: '500',
  },
  subscriptionDetail: {
    fontSize: 12,
    color: '#8C7B6E',
    marginTop: 4,
  },
  verifiedBadge: {
    backgroundColor: '#C9A84C',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  verifiedBadgeText: {
    fontSize: 12,
    color: '#FAF6F0',
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8DDD4',
  },
  actionNumber: {
    fontSize: 22,
    color: '#C9A84C',
    fontWeight: '500',
  },
  actionLabel: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  previewBtn: {
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  previewBtnText: {
    fontSize: 13,
    color: '#C9A84C',
  },
  inquiryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    gap: 10,
  },
  inquiryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  inquiryName: {
    fontSize: 15,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  inquiryMeta: {
    fontSize: 12,
    color: '#8C7B6E',
    marginTop: 2,
  },
  inquiryBadge: {
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inquiryBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  inquiryMessage: {
    fontSize: 13,
    color: '#8C7B6E',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  inquiryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  replyBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  replyBtnText: {
    fontSize: 13,
    color: '#1C1C1C',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#C9A84C',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    color: '#FAF6F0',
    fontWeight: '500',
  },
  calendarHint: {
    fontSize: 13,
    color: '#8C7B6E',
    lineHeight: 20,
    marginTop: -6,
  },
  blockedList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    overflow: 'hidden',
  },
  blockedTitle: {
    fontSize: 13,
    color: '#8C7B6E',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DDD4',
  },
  blockedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DDD4',
  },
  blockedDate: {
    fontSize: 14,
    color: '#1C1C1C',
  },
  unblockBtn: {
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  unblockBtnText: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  blockDateBtn: {
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  blockDateBtnText: {
    fontSize: 14,
    color: '#C9A84C',
    fontWeight: '500',
  },
  ratingOverview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8DDD4',
  },
  ratingBig: {
    fontSize: 48,
    color: '#1C1C1C',
    fontWeight: '300',
  },
  ratingStars: {
    fontSize: 20,
    color: '#C9A84C',
  },
  ratingCount: {
    fontSize: 13,
    color: '#8C7B6E',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    gap: 12,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C9A84C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewAvatarText: {
    fontSize: 16,
    color: '#FAF6F0',
    fontWeight: '500',
  },
  reviewInfo: {
    flex: 1,
    gap: 2,
  },
  reviewName: {
    fontSize: 14,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  reviewFunction: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  reviewRating: {
    fontSize: 13,
    color: '#C9A84C',
  },
  videoThumb: {
    backgroundColor: '#1C1C1C',
    borderRadius: 8,
    paddingVertical: 20,
    alignItems: 'center',
  },
  videoThumbText: {
    fontSize: 14,
    color: '#FAF6F0',
    letterSpacing: 0.5,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8DDD4',
    backgroundColor: '#FAF6F0',
  },
  navItem: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 14,
    color: '#8C7B6E',
    fontWeight: '500',
  },
});