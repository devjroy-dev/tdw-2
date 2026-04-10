import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Image, Linking, Modal,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { getBenchmark, getInvoices, getLeads, getVendorBookings, getBlockedDates, blockDate, unblockDate } from '../services/api';
import { uploadImage } from '../services/cloudinary';
import { generateInvoiceNumber, generateInvoicePDF } from '../services/invoice';

const { width } = Dimensions.get('window');

const TABS = ['Overview', 'Inquiries', 'Calendar', 'Tools', 'Reviews', 'Clients'];



const STAGE_COLORS: Record<string, string> = {
  'New Inquiry': '#C9A84C',
  'Quoted': '#8C7B6E',
  'Token Received': '#4CAF50',
  'Completed': '#2C2420',
};

const PROMOS = [
  { id: '1', title: '15% Off December Bookings', expires: 'Nov 30, 2025', active: true, leads: 12 },
  { id: '2', title: 'Free Pre-Wedding Shoot', expires: 'Dec 15, 2025', active: false, leads: 0 },
];

export default function VendorDashboardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Overview');
  const [isLive, setIsLive] = useState(true);
  const [vendorSession, setVendorSession] = useState<any>(null);

  // Tools state
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceClient, setInvoiceClient] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Clients state
  const [clients, setClients] = useState<any[]>([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientDate, setNewClientDate] = useState('');
  const [clientsLoading, setClientsLoading] = useState(false);

  // Promo state
  const [promos, setPromos] = useState(PROMOS);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [newPromoTitle, setNewPromoTitle] = useState('');
  const [newPromoExpiry, setNewPromoExpiry] = useState('');

  // Data state
  const [benchmark, setBenchmark] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [showDateInput, setShowDateInput] = useState(false);
  const [newBlockDate, setNewBlockDate] = useState('');

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (vendorSession?.vendorId) {
      loadBenchmark();
      loadInvoices();
      if (activeTab === 'Inquiries') {
        loadLeads();
        loadBookings();
      }
      if (activeTab === 'Calendar') { loadBlockedDates(); }
      if (activeTab === 'Clients') {
        loadClients();
      }
    }
  }, [vendorSession, activeTab]);

  const loadSession = async () => {
    try {
      const stored = await AsyncStorage.getItem('vendor_session');
      if (stored) setVendorSession(JSON.parse(stored));
    } catch (e) {}
  };

  const loadBenchmark = async () => {
    try {
      const category = vendorSession?.category || 'photographers';
      const city = vendorSession?.city || 'Delhi NCR';
      const res = await getBenchmark(category, city);
      if (res.success) setBenchmark(res.data);
    } catch (e) {}
  };

  const loadLeads = async () => {
    try {
      setLeadsLoading(true);
      const res = await getLeads(vendorSession.vendorId);
      if (res.success && res.data?.length > 0) setLeads(res.data);
    } catch (e) {}
    finally { setLeadsLoading(false); }
  };

  const loadBookings = async () => {
    try {
      setBookingsLoading(true);
      const res = await getVendorBookings(vendorSession.vendorId);
      if (res.success) setBookings(res.data || []);
    } catch (e) {}
    finally { setBookingsLoading(false); }
  };

  const loadInvoices = async () => {
    try {
      const res = await getInvoices(vendorSession.vendorId);
      if (res.success) setInvoices(res.data || []);
    } catch (e) {}
  };

  const loadBlockedDates = async () => {
    try {
      setCalendarLoading(true);
      const res = await getBlockedDates(vendorSession.vendorId);
      if (res.success) setBlockedDates(res.data || []);
    } catch (e) {}
    finally { setCalendarLoading(false); }
  };

  const handleBlockDate = async () => {
    if (!newBlockDate.trim()) return;
    try {
      const res = await blockDate(vendorSession.vendorId, newBlockDate.trim());
      if (res.success) {
        setBlockedDates(prev => [...prev, res.data]);
        setNewBlockDate('');
        setShowDateInput(false);
      }
    } catch (e) { Alert.alert('Error', 'Could not block date.'); }
  };

  const handleUnblockDate = async (id: string) => {
    try {
      await unblockDate(id);
      setBlockedDates(prev => prev.filter(d => d.id !== id));
    } catch (e) { Alert.alert('Error', 'Could not unblock date.'); }
  };

  const loadClients = async () => {
    try {
      setClientsLoading(true);
      const stored = await AsyncStorage.getItem(`vendor_clients_${vendorSession.vendorId}`);
      if (stored) setClients(JSON.parse(stored));
    } catch (e) {}
    finally { setClientsLoading(false); }
  };

  const saveClients = async (updatedClients: any[]) => {
    try {
      await AsyncStorage.setItem(
        `vendor_clients_${vendorSession.vendorId}`,
        JSON.stringify(updatedClients)
      );
    } catch (e) {}
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('vendor_session');
            await AsyncStorage.removeItem('user_session');
            router.replace('/login');
          }
        }
      ]
    );
  };

  const handleImageUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      try {
        setUploadingImage(true);
        const url = await uploadImage(result.assets[0].uri);
        setPortfolioImages(prev => [...prev, url]);
        Alert.alert('Uploaded!', 'Photo added to your portfolio.');
      } catch {
        Alert.alert('Upload failed', 'Please try again.');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleSendWhatsAppInvite = (client: any) => {
    const message = `Hi ${client.name.split('&')[0].trim()}! 👋\n\nI've added you to The Dream Wedding — India's premium wedding planning app.\n\nYour booking history with me is already saved. You can also discover other vendors and plan your entire wedding in one place.\n\nDownload here: https://thedreamwedding.in\n\nSee you there! 🎉`;
    const phone = `91${client.phone}`;
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
        const updated = clients.map(c => c.id === client.id ? { ...c, invited: true } : c);
        setClients(updated);
        saveClients(updated);
      } else {
        Alert.alert('WhatsApp not found', 'Please make sure WhatsApp is installed on your device.');
      }
    });
  };

  const handleAddClient = async () => {
    if (!newClientName || !newClientPhone || !newClientDate) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    const newClient = {
      id: Date.now().toString(),
      name: newClientName,
      phone: newClientPhone,
      wedding_date: newClientDate,
      status: 'upcoming',
      invited: false,
    };
    const updated = [...clients, newClient];
    setClients(updated);
    await saveClients(updated);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientDate('');
    setShowAddClient(false);
    Alert.alert('Client Added!', `${newClientName} added. Tap "Send Invite" to invite them via WhatsApp.`);
  };

  const handleConfirmBooking = async (bookingId: string, vendorName: string) => {
    Alert.alert(
      'Confirm Booking',
      `Confirming this booking will lock the date and release the escrow payment to you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const res = await fetch(
                `https://dream-wedding-production-89ae.up.railway.app/api/bookings/${bookingId}/confirm`,
                { method: 'POST', headers: { 'Content-Type': 'application/json' } }
              );
              const data = await res.json();
              if (data.success) {
                Alert.alert('Confirmed!', 'Booking confirmed. Payment released from escrow.');
                loadBookings();
              } else {
                Alert.alert('Error', data.error || 'Could not confirm booking.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleDeclineBooking = async (bookingId: string) => {
    Alert.alert(
      'Decline Booking',
      'The token will be refunded to the couple. The ₹999 platform fee is retained.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(
                `https://dream-wedding-production-89ae.up.railway.app/api/bookings/${bookingId}/decline`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ reason: 'Vendor unavailable' }),
                }
              );
              const data = await res.json();
              if (data.success) {
                Alert.alert('Declined', 'Booking declined. Token refund initiated for couple.');
                loadBookings();
              } else {
                Alert.alert('Error', data.error || 'Could not decline booking.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleGenerateInvoice = async () => {
    if (!invoiceClient || !invoiceAmount) {
      Alert.alert('Missing info', 'Please enter client name and amount.');
      return;
    }
    try {
      await generateInvoicePDF({
        vendorName: vendorSession?.vendorName || 'Your Business',
        vendorPhone: vendorSession?.phone || '',
        vendorCity: vendorSession?.city || '',
        clientName: invoiceClient,
        amount: parseInt(invoiceAmount),
        description: 'Wedding Services',
        invoiceNumber: generateInvoiceNumber(),
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      });
    } catch {
      Alert.alert('Error', 'Could not generate invoice. Please try again.');
    }
  };

  const handleDownloadGSTReport = async () => {
    try {
      if (invoices.length === 0) {
        Alert.alert('No invoices', 'No invoices found for this financial year.');
        return;
      }
      const totalIncome = invoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);
      const totalGST = invoices.reduce((sum: number, inv: any) => sum + (inv.gst_amount || 0), 0);
      const totalWithGST = invoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);

      const rows = invoices.map((inv: any) => `
        <tr>
          <td>${inv.invoice_number || '—'}</td>
          <td>${inv.client_name || '—'}</td>
          <td>${new Date(inv.created_at).toLocaleDateString('en-IN')}</td>
          <td style="text-align:right">₹${(inv.amount || 0).toLocaleString('en-IN')}</td>
          <td style="text-align:right">₹${(inv.gst_amount || 0).toLocaleString('en-IN')}</td>
          <td style="text-align:right">₹${(inv.total_amount || 0).toLocaleString('en-IN')}</td>
        </tr>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Helvetica, sans-serif; padding: 40px; color: #2C2420; }
            h1 { font-size: 24px; font-weight: 300; letter-spacing: 4px; color: #2C2420; }
            h2 { font-size: 12px; color: #8C7B6E; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th { font-size: 10px; color: #8C7B6E; letter-spacing: 1px; text-transform: uppercase; padding: 10px 8px; border-bottom: 1px solid #E8E0D5; text-align: left; }
            td { padding: 12px 8px; border-bottom: 1px solid #F5F0E8; font-size: 13px; }
            .totals { margin-top: 24px; background: #2C2420; padding: 20px; border-radius: 8px; color: #F5F0E8; }
            .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
            .gold { color: #C9A84C; font-size: 18px; font-weight: 600; }
            .footer { margin-top: 40px; font-size: 11px; color: #8C7B6E; text-align: center; }
          </style>
        </head>
        <body>
          <h1>DREAMWEDDING</h1>
          <h2>GST & Tax Report — ${vendorSession?.vendorName || 'Vendor'} · FY ${new Date().getFullYear()}</h2>
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Date</th>
                <th style="text-align:right">Amount</th>
                <th style="text-align:right">GST (18%)</th>
                <th style="text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="totals">
            <div class="totals-row"><span>Total Income (excl. GST)</span><span>₹${totalIncome.toLocaleString('en-IN')}</span></div>
            <div class="totals-row"><span>Total GST Collected (18%)</span><span>₹${totalGST.toLocaleString('en-IN')}</span></div>
            <div class="totals-row"><span>Total Billed</span><span class="gold">₹${totalWithGST.toLocaleString('en-IN')}</span></div>
          </div>
          <div class="footer">Generated by The Dream Wedding · thedreamwedding.in · ${invoices.length} invoices · ${new Date().toLocaleDateString('en-IN')}</div>
        </body>
        </html>
      `;

      const { Print, Sharing } = await import('expo-print').then(p => ({ Print: p, Sharing: null })).catch(() => ({ Print: null, Sharing: null }));
      const printModule = await import('expo-print');
      const sharingModule = await import('expo-sharing');
      const { uri } = await printModule.printToFileAsync({ html });
      await sharingModule.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'GST Report',
        UTI: 'com.adobe.pdf',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not generate GST report. Please try again.');
    }
  };

  const handleCreatePromo = () => {
    if (!newPromoTitle || !newPromoExpiry) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    setPromos(prev => [...prev, {
      id: Date.now().toString(),
      title: newPromoTitle,
      expires: newPromoExpiry,
      active: true,
      leads: 0,
    }]);
    setNewPromoTitle('');
    setNewPromoExpiry('');
    setShowPromoForm(false);
    Alert.alert('Promo Live!', 'Couples in your city will be notified of your offer.');
  };

  const vendorName = vendorSession?.vendorName || 'Your Business';
  const vendorCategory = vendorSession?.category
    ? vendorSession.category.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    : 'Vendor';
  const vendorCity = vendorSession?.city || '';
  const vendorPlan = vendorSession?.plan || 'basic';

  const pendingBookings = bookings.filter((b: any) => b.status === 'pending_confirmation');
  const confirmedBookings = bookings.filter((b: any) => b.status === 'confirmed');

  const displayLeads = leads.length > 0 ? leads : [
    { id: '1', name: 'Priya & Rahul', stage: 'New Inquiry', date: 'Dec 15', value: '₹3,00,000' },
    { id: '2', name: 'Sneha & Arjun', stage: 'Quoted', date: 'Nov 20', value: '₹1,50,000' },
    { id: '3', name: 'Ananya & Dev', stage: 'New Inquiry', date: 'Jan 5', value: '₹3,00,000' },
    { id: '4', name: 'Kavya & Rohan', stage: 'Token Received', date: 'Feb 14', value: '₹3,00,000' },
    { id: '5', name: 'Meera & Vikram', stage: 'Completed', date: 'Oct 10', value: '₹3,00,000' },
  ];

  const MOCK_INQUIRIES = [
    { id: '1', name: 'Priya & Rahul', function: 'Wedding', date: 'December 15, 2025', message: 'Hi, I\'m interested in your services for my Wedding on Dec 15. Are you available?', status: 'new' },
    { id: '2', name: 'Sneha & Arjun', function: 'Sangeet', date: 'November 20, 2025', message: 'Hi, I\'m interested in your services for Sangeet on Nov 20. Are you available?', status: 'replied' },
    { id: '3', name: 'Ananya & Dev', function: 'Reception', date: 'January 5, 2026', message: 'Hi, I\'m interested in your services for Reception on Jan 5. Are you available?', status: 'new' },
  ];

  return (
    <View style={styles.container}>

      {/* Add Client Modal */}
      <Modal visible={showAddClient} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Client</Text>
            <Text style={styles.modalSubtitle}>They'll get a WhatsApp invite to join The Dream Wedding</Text>
            <TextInput style={styles.modalInput} placeholder="Couple names (e.g. Priya & Rahul)" placeholderTextColor="#8C7B6E" value={newClientName} onChangeText={setNewClientName} />
            <TextInput style={styles.modalInput} placeholder="Phone number (10 digits)" placeholderTextColor="#8C7B6E" value={newClientPhone} onChangeText={setNewClientPhone} keyboardType="phone-pad" maxLength={10} />
            <TextInput style={styles.modalInput} placeholder="Wedding date (e.g. March 15, 2026)" placeholderTextColor="#8C7B6E" value={newClientDate} onChangeText={setNewClientDate} />
            <TouchableOpacity style={styles.modalBtn} onPress={handleAddClient}>
              <Text style={styles.modalBtnText}>Add Client</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddClient(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Promo Modal */}
      <Modal visible={showPromoForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Promo</Text>
            <Text style={styles.modalSubtitle}>Couples in your city will be notified instantly</Text>
            <TextInput style={styles.modalInput} placeholder="Promo title (e.g. 15% Off December Bookings)" placeholderTextColor="#8C7B6E" value={newPromoTitle} onChangeText={setNewPromoTitle} />
            <TextInput style={styles.modalInput} placeholder="Expires on (e.g. Dec 31, 2025)" placeholderTextColor="#8C7B6E" value={newPromoExpiry} onChangeText={setNewPromoExpiry} />
            <TouchableOpacity style={styles.modalBtn} onPress={handleCreatePromo}>
              <Text style={styles.modalBtnText}>Go Live</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowPromoForm(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.businessName}>{vendorName}</Text>
          <Text style={styles.category}>{vendorCategory}{vendorCity ? ` · ${vendorCity}` : ''}</Text>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* OVERVIEW */}
        {activeTab === 'Overview' && (
          <View style={styles.tabPane}>
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

            <View style={styles.revenueCard}>
              <View style={styles.revenueRow}>
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueAmount}>
                    {invoices.length > 0 ? `₹${Math.round(invoices.reduce((s,i) => s + (i.amount||0), 0) / 100000 * 10) / 10}L` : '₹0'}
                  </Text>
                  <Text style={styles.revenueLabel}>Earned</Text>
                </View>
                <View style={styles.revenueDivider} />
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueAmount}>
                    {bookings.length > 0 ? `₹${Math.round(bookings.filter(b => b.status === 'pending_confirmation').reduce((s,b) => s + (b.token_amount||0), 0) / 100000 * 10) / 10}L` : '₹0'}
                  </Text>
                  <Text style={styles.revenueLabel}>In Escrow</Text>
                </View>
                <View style={styles.revenueDivider} />
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueAmount}>{confirmedBookings.length || 0}</Text>
                  <Text style={styles.revenueLabel}>Confirmed</Text>
                </View>
              </View>
              {invoices.length > 0 && (
                <View style={styles.forecastRow}>
                  <Text style={styles.forecastText}>
                    📈 Projected this year: ₹{Math.round(invoices.reduce((s,i) => s + (i.amount||0), 0) / new Date().getMonth() * 12 / 100000 * 10) / 10}L based on current pace
                  </Text>
                </View>
              )}
            </View>

            {pendingBookings.length > 0 && (
              <View style={styles.alertCard}>
                <Text style={styles.alertTitle}>⚡ {pendingBookings.length} booking{pendingBookings.length > 1 ? 's' : ''} waiting for your confirmation</Text>
                <Text style={styles.alertText}>Confirm within 48 hours or the token is auto-refunded</Text>
                <TouchableOpacity onPress={() => setActiveTab('Inquiries')}>
                  <Text style={styles.alertLink}>Review now →</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.subscriptionCard}>
              <View>
                <Text style={styles.subscriptionPlan}>
                  {vendorPlan === 'premium' ? 'Premium Plan' : 'Basic Plan'}
                </Text>
                <Text style={styles.subscriptionDetail}>
                  {vendorPlan === 'premium' ? 'Priority placement active' : 'Upgrade for priority placement'}
                </Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓ Active</Text>
              </View>
            </View>

            <View style={styles.benchmarkCard}>
              <Text style={styles.benchmarkTitle}>Market Benchmark · Live</Text>
              {benchmark ? (
                <>
                  <Text style={styles.benchmarkText}>
                    Average starting price for {vendorCategory} in {vendorCity} is ₹{benchmark.avgStartingPrice?.toLocaleString('en-IN')} across {benchmark.vendorCount} vendors.
                  </Text>
                  <Text style={[styles.benchmarkText, { color: '#C9A84C', marginTop: 4 }]}>
                    Range: ₹{benchmark.minStartingPrice?.toLocaleString('en-IN')} – ₹{benchmark.maxStartingPrice?.toLocaleString('en-IN')}
                  </Text>
                </>
              ) : (
                <Text style={styles.benchmarkText}>Loading market data...</Text>
              )}
            </View>

            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('Inquiries')}>
                <Text style={styles.actionNumber}>{pendingBookings.length || 3}</Text>
                <Text style={styles.actionLabel}>Pending Bookings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('Calendar')}>
                <Text style={styles.actionNumber}>4</Text>
                <Text style={styles.actionLabel}>Blocked Dates</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('Reviews')}>
                <Text style={styles.actionNumber}>★ 4.9</Text>
                <Text style={styles.actionLabel}>Your Rating</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('Clients')}>
                <Text style={styles.actionNumber}>{clients.length}</Text>
                <Text style={styles.actionLabel}>My Clients</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.previewBtn} onPress={() => router.push('/vendor-preview')}>
              <Text style={styles.previewBtnText}>Preview your profile as couples see it →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* INQUIRIES */}
        {activeTab === 'Inquiries' && (
          <View style={styles.tabPane}>

            {/* Pending Bookings — Confirm/Decline */}
            {pendingBookings.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Bookings Awaiting Confirmation</Text>
                {pendingBookings.map((booking: any) => (
                  <View key={booking.id} style={styles.bookingCard}>
                    <View style={styles.bookingTop}>
                      <View>
                        <Text style={styles.bookingName}>{booking.users?.name || 'Couple'}</Text>
                        <Text style={styles.bookingMeta}>
                          Token: ₹{booking.token_amount?.toLocaleString('en-IN')} · Protection: ₹999
                        </Text>
                        <Text style={styles.bookingMeta}>
                          Booked: {new Date(booking.created_at).toLocaleDateString('en-IN')}
                        </Text>
                      </View>
                      <View style={styles.escrowBadge}>
                        <Text style={styles.escrowBadgeText}>In Escrow</Text>
                      </View>
                    </View>
                    <View style={styles.bookingActions}>
                      <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => handleDeclineBooking(booking.id)}
                      >
                        <Text style={styles.declineBtnText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.confirmBookingBtn}
                        onPress={() => handleConfirmBooking(booking.id, booking.vendor_name)}
                      >
                        <Text style={styles.confirmBookingBtnText}>Confirm & Lock Date</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}

            <Text style={styles.sectionLabel}>Lead Pipeline</Text>
            {leadsLoading ? (
              <ActivityIndicator color="#C9A84C" style={{ paddingVertical: 20 }} />
            ) : (
              <View style={styles.listCard}>
                {displayLeads.map((lead: any, index: number) => (
                  <View key={lead.id}>
                    <View style={styles.leadRow}>
                      <View style={styles.leadInfo}>
                        <Text style={styles.leadName}>{lead.name}</Text>
                        <Text style={styles.leadDate}>{lead.date}</Text>
                      </View>
                      <View style={styles.leadRight}>
                        <Text style={styles.leadValue}>{lead.value}</Text>
                        <View style={[styles.stageBadge, { backgroundColor: (STAGE_COLORS[lead.stage] || '#8C7B6E') + '20' }]}>
                          <Text style={[styles.stageBadgeText, { color: STAGE_COLORS[lead.stage] || '#8C7B6E' }]}>
                            {lead.stage}
                          </Text>
                        </View>
                        <View style={[styles.scoreBadge, { backgroundColor: lead.stage === 'Token Received' ? '#4CAF5020' : lead.stage === 'Quoted' ? '#C9A84C20' : lead.stage === 'Completed' ? '#2C242020' : '#E8E0D5' }]}>
                          <Text style={[styles.scoreText, { color: lead.stage === 'Token Received' ? '#4CAF50' : lead.stage === 'Quoted' ? '#C9A84C' : lead.stage === 'Completed' ? '#2C2420' : '#8C7B6E' }]}>
                            {lead.stage === 'Token Received' ? '🔥 Hot' : lead.stage === 'Quoted' ? '⚡ Warm' : lead.stage === 'Completed' ? '✓ Won' : '○ New'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {index < displayLeads.length - 1 && <View style={styles.listDivider} />}
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.sectionLabel}>Incoming Inquiries</Text>
            {MOCK_INQUIRIES.map(inquiry => (
              <View key={inquiry.id} style={styles.inquiryCard}>
                <View style={styles.inquiryTop}>
                  <View>
                    <Text style={styles.inquiryName}>{inquiry.name}</Text>
                    <Text style={styles.inquiryMeta}>{inquiry.function} · {inquiry.date}</Text>
                  </View>
                  <View style={[styles.inquiryBadge, { backgroundColor: inquiry.status === 'new' ? '#C9A84C20' : '#E8E0D5' }]}>
                    <Text style={[styles.inquiryBadgeText, { color: inquiry.status === 'new' ? '#C9A84C' : '#8C7B6E' }]}>
                      {inquiry.status === 'new' ? 'New' : 'Replied'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.inquiryMessage} numberOfLines={2}>"{inquiry.message}"</Text>
                {inquiry.status === 'new' && (
                  <View style={styles.inquiryActions}>
                    <TouchableOpacity style={styles.replyBtn} onPress={() => router.push('/messaging')}>
                      <Text style={styles.replyBtnText}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* CALENDAR */}
        {activeTab === 'Calendar' && (
          <View style={styles.tabPane}>
            <Text style={styles.sectionLabel}>Availability</Text>
            <Text style={styles.calendarHint}>Block dates you're already booked so couples see accurate availability</Text>
            {calendarLoading ? (
              <ActivityIndicator color="#C9A84C" style={{ paddingVertical: 20 }} />
            ) : (
              <View style={styles.listCard}>
                <View style={styles.blockedHeader}>
                  <Text style={styles.blockedTitle}>Blocked Dates ({blockedDates.length})</Text>
                </View>
                {blockedDates.length === 0 && (
                  <View style={{ padding: 16 }}>
                    <Text style={{ fontSize: 13, color: '#8C7B6E' }}>No dates blocked yet</Text>
                  </View>
                )}
                {blockedDates.map((item, index) => (
                  <View key={item.id}>
                    <View style={styles.blockedRow}>
                      <Text style={styles.blockedDate}>{item.blocked_date}</Text>
                      <TouchableOpacity
                        style={styles.unblockBtn}
                        onPress={() => handleUnblockDate(item.id)}
                      >
                        <Text style={styles.unblockBtnText}>Unblock</Text>
                      </TouchableOpacity>
                    </View>
                    {index < blockedDates.length - 1 && <View style={styles.listDivider} />}
                  </View>
                ))}
              </View>
            )}
            {showDateInput ? (
              <View style={styles.listCard}>
                <View style={{ padding: 16, gap: 10 }}>
                  <TextInput
                    style={styles.invoiceInput}
                    placeholder="Date (e.g. March 15, 2026)"
                    placeholderTextColor="#8C7B6E"
                    value={newBlockDate}
                    onChangeText={setNewBlockDate}
                  />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={[styles.unblockBtn, { flex: 1, alignItems: 'center' }]}
                      onPress={() => setShowDateInput(false)}
                    >
                      <Text style={styles.unblockBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.blockDateBtn, { flex: 2 }]}
                      onPress={handleBlockDate}
                    >
                      <Text style={styles.blockDateBtnText}>Block Date</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.blockDateBtn}
                onPress={() => setShowDateInput(true)}
              >
                <Text style={styles.blockDateBtnText}>+ Block a Date</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* TOOLS */}
        {activeTab === 'Tools' && (
          <View style={styles.tabPane}>
            <Text style={styles.sectionLabel}>Business Tools</Text>

            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>Promo Engine</Text>
                <TouchableOpacity style={styles.toolAction} onPress={() => setShowPromoForm(true)}>
                  <Text style={styles.toolActionText}>+ Create Promo</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Run time-limited offers. Couples in your city get notified instantly.</Text>
              {promos.map((promo, index) => (
                <View key={promo.id}>
                  {index > 0 && <View style={styles.listDivider} />}
                  <View style={styles.promoRow}>
                    <View style={styles.promoInfo}>
                      <Text style={styles.promoTitle}>{promo.title}</Text>
                      <Text style={styles.promoMeta}>Expires {promo.expires} · {promo.leads} leads</Text>
                    </View>
                    <View style={[styles.promoBadge, { backgroundColor: promo.active ? '#4CAF5020' : '#E8E0D5' }]}>
                      <Text style={[styles.promoBadgeText, { color: promo.active ? '#4CAF50' : '#8C7B6E' }]}>
                        {promo.active ? 'Live' : 'Ended'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>Portfolio Photos</Text>
                <TouchableOpacity style={styles.toolAction} onPress={handleImageUpload} disabled={uploadingImage}>
                  {uploadingImage
                    ? <ActivityIndicator size="small" color="#C9A84C" />
                    : <Text style={styles.toolActionText}>+ Upload</Text>
                  }
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Upload photos to your public portfolio</Text>
              {portfolioImages.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {portfolioImages.map((uri, index) => (
                    <Image key={index} source={{ uri }} style={{ width: 80, height: 80, borderRadius: 8, marginRight: 8 }} />
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>Invoice Generator</Text>
                <TouchableOpacity style={styles.toolAction} onPress={() => setShowInvoiceForm(!showInvoiceForm)}>
                  <Text style={styles.toolActionText}>{showInvoiceForm ? 'Cancel' : 'Create Invoice'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Professional invoices with auto GST calculation</Text>
              {showInvoiceForm && (
                <View style={styles.invoiceForm}>
                  <TextInput style={styles.invoiceInput} placeholder="Client name" placeholderTextColor="#8C7B6E" value={invoiceClient} onChangeText={setInvoiceClient} />
                  <TextInput style={styles.invoiceInput} placeholder="Amount (₹)" placeholderTextColor="#8C7B6E" value={invoiceAmount} onChangeText={setInvoiceAmount} keyboardType="number-pad" />
                  {invoiceAmount ? (
                    <View style={styles.gstPreview}>
                      <Text style={styles.gstPreviewText}>GST (18%): ₹{(parseInt(invoiceAmount) * 0.18).toLocaleString('en-IN')}</Text>
                      <Text style={styles.gstPreviewTotal}>Total: ₹{(parseInt(invoiceAmount) * 1.18).toLocaleString('en-IN')}</Text>
                    </View>
                  ) : null}
                  <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateInvoice}>
                    <Text style={styles.generateBtnText}>Generate Invoice PDF</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>GST & Tax Report</Text>
                <TouchableOpacity style={styles.toolAction} onPress={handleDownloadGSTReport}>
                  <Text style={styles.toolActionText}>Download PDF</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Annual income summary — CA-ready GST report for filing</Text>
              <View style={styles.gstRow}>
                <View style={styles.gstItem}>
                  <Text style={styles.gstAmount}>
                    {invoices.length > 0
                      ? `₹${invoices.reduce((s: number, i: any) => s + (i.amount || 0), 0).toLocaleString('en-IN')}`
                      : '₹84L'}
                  </Text>
                  <Text style={styles.gstLabel}>Total Income</Text>
                </View>
                <View style={styles.gstItem}>
                  <Text style={styles.gstAmount}>
                    {invoices.length > 0
                      ? `₹${invoices.reduce((s: number, i: any) => s + (i.gst_amount || 0), 0).toLocaleString('en-IN')}`
                      : '₹15.1L'}
                  </Text>
                  <Text style={styles.gstLabel}>GST (18%)</Text>
                </View>
                <View style={styles.gstItem}>
                  <Text style={styles.gstAmount}>FY {new Date().getFullYear()}</Text>
                  <Text style={styles.gstLabel}>Period</Text>
                </View>
              </View>
            </View>

            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>Payment Tracker</Text>
              </View>
              <Text style={styles.toolDesc}>Track all incoming payments and pending amounts</Text>
              <View style={styles.paymentTrackerRow}>
                <View style={styles.paymentTrackerItem}>
                  <Text style={styles.paymentTrackerAmount}>₹9L</Text>
                  <Text style={styles.paymentTrackerLabel}>Received</Text>
                </View>
                <View style={styles.paymentTrackerDivider} />
                <View style={styles.paymentTrackerItem}>
                  <Text style={[styles.paymentTrackerAmount, { color: '#C9A84C' }]}>₹6L</Text>
                  <Text style={styles.paymentTrackerLabel}>Pending</Text>
                </View>
                <View style={styles.paymentTrackerDivider} />
                <View style={styles.paymentTrackerItem}>
                  <Text style={styles.paymentTrackerAmount}>₹60K</Text>
                  <Text style={styles.paymentTrackerLabel}>In Escrow</Text>
                </View>
              </View>
            </View>

            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>Refer a Vendor</Text>
                <TouchableOpacity style={styles.toolAction} onPress={() => {
                  const message = `Hey! I've been using The Dream Wedding to manage my wedding business — leads, invoices, GST reports, everything in one place. You should check it out!\n\nJoin here: https://thedreamwedding.in/vendor`;
                  Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
                }}>
                  <Text style={styles.toolActionText}>Share via WhatsApp</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Refer another vendor and get 1 month subscription free</Text>
            </View>

            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>Portfolio Analytics</Text>
              </View>
              <Text style={styles.toolDesc}>See which photos get the most saves and views</Text>
              <View style={styles.analyticsList}>
                {[
                  { photo: 'Top portfolio image', saves: 47, views: 312 },
                  { photo: 'Second image', saves: 38, views: 289 },
                  { photo: 'Third image', saves: 31, views: 198 },
                ].map((item, index, arr) => (
                  <View key={item.photo}>
                    <View style={styles.analyticsRow}>
                      <Text style={styles.analyticsPhoto}>{item.photo}</Text>
                      <Text style={styles.analyticsStats}>{item.saves} saves · {item.views} views</Text>
                    </View>
                    {index < arr.length - 1 && <View style={styles.listDivider} />}
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* REVIEWS */}
        {activeTab === 'Reviews' && (
          <View style={styles.tabPane}>
            <View style={styles.ratingOverview}>
              <Text style={styles.ratingBig}>4.9</Text>
              <Text style={styles.ratingStars}>★★★★★</Text>
              <Text style={styles.ratingCount}>124 reviews</Text>
              <Text style={styles.ratingNote}>Only app-booked couples can leave reviews</Text>
            </View>
            <Text style={styles.sectionLabel}>Video Reviews</Text>
            {[
              { id: '1', client: 'Priya & Rahul', function: 'Wedding · Dec 2024', rating: 5 },
              { id: '2', client: 'Sneha & Arjun', function: 'Sangeet · Nov 2024', rating: 5 },
            ].map(review => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>{review.client[0]}</Text>
                  </View>
                  <View style={styles.reviewInfo}>
                    <Text style={styles.reviewName}>{review.client}</Text>
                    <Text style={styles.reviewFunction}>{review.function}</Text>
                  </View>
                  <Text style={styles.reviewRating}>{'★'.repeat(review.rating)}</Text>
                </View>
                <View style={styles.videoThumb}>
                  <Text style={styles.videoThumbText}>▶  Play Video Review</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* CLIENTS */}
        {activeTab === 'Clients' && (
          <View style={[styles.tabPane, { paddingBottom: 40 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionLabel}>My Clients ({clients.length})</Text>
              <TouchableOpacity style={styles.addClientBtn} onPress={() => setShowAddClient(true)}>
                <Text style={styles.addClientBtnText}>+ Add Client</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.viralCard}>
              <Text style={styles.viralTitle}>Your network is your growth engine</Text>
              <Text style={styles.viralText}>
                Add your existing clients to The Dream Wedding. They get onboarded, discover vendors for their other functions, and refer their friends. This is how you grow without spending on ads.
              </Text>
            </View>
            {clientsLoading ? (
              <ActivityIndicator color="#C9A84C" style={{ paddingVertical: 20 }} />
            ) : clients.length === 0 ? (
              <View style={styles.emptyClients}>
                <Text style={styles.emptyClientsText}>No clients added yet</Text>
                <Text style={styles.emptyClientsSub}>Add your first client and send them a WhatsApp invite</Text>
              </View>
            ) : (
              clients.map(client => (
                <View key={client.id} style={styles.clientCard}>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    <Text style={styles.clientPhone}>{client.phone}</Text>
                    <Text style={styles.clientDate}>{client.wedding_date}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.inviteBtn, client.invited && styles.inviteBtnDone]}
                    onPress={() => !client.invited && handleSendWhatsAppInvite(client)}
                    disabled={client.invited}
                  >
                    <Text style={[styles.inviteBtnText, client.invited && styles.inviteBtnTextDone]}>
                      {client.invited ? 'Invited ✓' : '📲 WhatsApp'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={[styles.navLabel, styles.navActive]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/messaging')}>
          <Text style={styles.navLabel}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={handleLogout}>
          <Text style={styles.navLabel}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  businessName: { fontSize: 18, color: '#2C2420', fontWeight: '500', letterSpacing: 0.3 },
  category: { fontSize: 13, color: '#8C7B6E', marginTop: 3 },
  liveToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  liveToggleActive: { borderColor: '#4CAF50', backgroundColor: '#4CAF5010' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8C7B6E' },
  liveDotActive: { backgroundColor: '#4CAF50' },
  liveToggleText: { fontSize: 13, color: '#8C7B6E', fontWeight: '500' },
  liveToggleTextActive: { color: '#4CAF50' },
  tabScroll: { maxHeight: 44, marginBottom: 16 },
  tabContent: { paddingHorizontal: 24, gap: 8, alignItems: 'center' },
  tab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 50, borderWidth: 1, borderColor: '#E8E0D5', backgroundColor: '#FFFFFF' },
  tabActive: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  tabText: { fontSize: 13, color: '#2C2420' },
  tabTextActive: { color: '#F5F0E8', fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  tabPane: { gap: 14 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E8E0D5' },
  statNumber: { fontSize: 24, color: '#2C2420', fontWeight: '400' },
  statLabel: { fontSize: 11, color: '#8C7B6E', textAlign: 'center' },
  revenueCard: { backgroundColor: '#2C2420', borderRadius: 14, padding: 20 },
  revenueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revenueItem: { flex: 1, alignItems: 'center', gap: 4 },
  revenueDivider: { width: 1, height: 36, backgroundColor: '#3C3430' },
  revenueAmount: { fontSize: 22, color: '#C9A84C', fontWeight: '400' },
  revenueLabel: { fontSize: 11, color: '#8C7B6E' },
  forecastRow: { borderTopWidth: 1, borderTopColor: '#3C3430', paddingTop: 12, marginTop: 4 },
  forecastText: { fontSize: 12, color: '#C9A84C', textAlign: 'center', letterSpacing: 0.3 },
  alertCard: { backgroundColor: '#FFF8EC', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#C9A84C', gap: 6 },
  alertTitle: { fontSize: 14, color: '#2C2420', fontWeight: '600' },
  alertText: { fontSize: 12, color: '#8C7B6E' },
  alertLink: { fontSize: 13, color: '#C9A84C', fontWeight: '500', marginTop: 4 },
  subscriptionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#E8E0D5' },
  subscriptionPlan: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  subscriptionDetail: { fontSize: 12, color: '#8C7B6E', marginTop: 3 },
  verifiedBadge: { backgroundColor: '#C9A84C', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6 },
  verifiedBadgeText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  benchmarkCard: { backgroundColor: '#FFF8EC', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8D9B5', gap: 8 },
  benchmarkTitle: { fontSize: 13, color: '#2C2420', fontWeight: '500' },
  benchmarkText: { fontSize: 13, color: '#8C7B6E', lineHeight: 20 },
  sectionLabel: { fontSize: 12, color: '#8C7B6E', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '500' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: (width - 60) / 2, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, gap: 6, borderWidth: 1, borderColor: '#E8E0D5' },
  actionNumber: { fontSize: 22, color: '#C9A84C', fontWeight: '500' },
  actionLabel: { fontSize: 12, color: '#8C7B6E' },
  previewBtn: { borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: '#FFFFFF' },
  previewBtnText: { fontSize: 13, color: '#C9A84C' },
  bookingCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#C9A84C', gap: 14 },
  bookingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bookingName: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  bookingMeta: { fontSize: 12, color: '#8C7B6E', marginTop: 3 },
  escrowBadge: { backgroundColor: '#C9A84C20', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  escrowBadgeText: { fontSize: 11, color: '#C9A84C', fontWeight: '500' },
  bookingActions: { flexDirection: 'row', gap: 10 },
  declineBtn: { flex: 1, borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  declineBtnText: { fontSize: 13, color: '#8C7B6E', fontWeight: '500' },
  confirmBookingBtn: { flex: 2, backgroundColor: '#2C2420', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  confirmBookingBtnText: { fontSize: 13, color: '#C9A84C', fontWeight: '600' },
  listCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E8E0D5', overflow: 'hidden' },
  listDivider: { height: 1, backgroundColor: '#E8E0D5', marginHorizontal: 16 },
  leadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  leadInfo: { gap: 3 },
  leadName: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  leadDate: { fontSize: 12, color: '#8C7B6E' },
  leadRight: { alignItems: 'flex-end', gap: 4 },
  leadValue: { fontSize: 13, color: '#2C2420', fontWeight: '500' },
  stageBadge: { borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 },
  stageBadgeText: { fontSize: 10, fontWeight: '500' },
  scoreBadge: { borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  scoreText: { fontSize: 10, fontWeight: '600' },
  inquiryCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8E0D5', gap: 10 },
  inquiryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  inquiryName: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  inquiryMeta: { fontSize: 12, color: '#8C7B6E', marginTop: 2 },
  inquiryBadge: { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  inquiryBadgeText: { fontSize: 11, fontWeight: '500' },
  inquiryMessage: { fontSize: 13, color: '#8C7B6E', lineHeight: 20, fontStyle: 'italic' },
  inquiryActions: { flexDirection: 'row', gap: 8 },
  replyBtn: { flex: 1, borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  replyBtnText: { fontSize: 13, color: '#2C2420' },
  calendarHint: { fontSize: 13, color: '#8C7B6E', lineHeight: 20 },
  blockedHeader: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E8E0D5' },
  blockedTitle: { fontSize: 13, color: '#8C7B6E', fontWeight: '500' },
  blockedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  blockedDate: { fontSize: 14, color: '#2C2420' },
  unblockBtn: { borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  unblockBtnText: { fontSize: 12, color: '#8C7B6E' },
  blockDateBtn: { borderWidth: 1, borderColor: '#C9A84C', borderRadius: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: '#FFFFFF' },
  blockDateBtnText: { fontSize: 14, color: '#C9A84C', fontWeight: '500' },
  toolCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#E8E0D5', gap: 12 },
  toolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toolTitle: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  toolAction: { borderWidth: 1, borderColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  toolActionText: { fontSize: 12, color: '#C9A84C', fontWeight: '500' },
  toolDesc: { fontSize: 13, color: '#8C7B6E', lineHeight: 20, marginTop: -4 },
  promoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  promoInfo: { flex: 1, gap: 3 },
  promoTitle: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  promoMeta: { fontSize: 12, color: '#8C7B6E' },
  promoBadge: { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  promoBadgeText: { fontSize: 11, fontWeight: '500' },
  invoiceForm: { gap: 10, borderTopWidth: 1, borderTopColor: '#E8E0D5', paddingTop: 12 },
  invoiceInput: { backgroundColor: '#F5F0E8', borderRadius: 8, borderWidth: 1, borderColor: '#E8E0D5', paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: '#2C2420' },
  gstPreview: { backgroundColor: '#F5F0E8', borderRadius: 8, padding: 12, gap: 4 },
  gstPreviewText: { fontSize: 13, color: '#8C7B6E' },
  gstPreviewTotal: { fontSize: 14, color: '#2C2420', fontWeight: '600' },
  generateBtn: { backgroundColor: '#2C2420', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  generateBtnText: { fontSize: 14, color: '#F5F0E8', fontWeight: '500' },
  paymentTrackerRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E8E0D5', paddingTop: 12 },
  paymentTrackerItem: { flex: 1, alignItems: 'center', gap: 4 },
  paymentTrackerDivider: { width: 1, backgroundColor: '#E8E0D5' },
  paymentTrackerAmount: { fontSize: 18, color: '#2C2420', fontWeight: '500' },
  paymentTrackerLabel: { fontSize: 11, color: '#8C7B6E' },
  analyticsList: { borderTopWidth: 1, borderTopColor: '#E8E0D5', overflow: 'hidden' },
  analyticsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  analyticsPhoto: { fontSize: 13, color: '#2C2420', fontWeight: '500' },
  analyticsStats: { fontSize: 12, color: '#8C7B6E' },
  gstRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E8E0D5', paddingTop: 12 },
  gstItem: { flex: 1, alignItems: 'center', gap: 4 },
  gstAmount: { fontSize: 16, color: '#2C2420', fontWeight: '500' },
  gstLabel: { fontSize: 11, color: '#8C7B6E' },
  ratingOverview: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E8E0D5' },
  ratingBig: { fontSize: 48, color: '#2C2420', fontWeight: '300' },
  ratingStars: { fontSize: 20, color: '#C9A84C' },
  ratingCount: { fontSize: 13, color: '#8C7B6E' },
  ratingNote: { fontSize: 11, color: '#8C7B6E', textAlign: 'center', fontStyle: 'italic' },
  reviewCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8E0D5', gap: 12 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  reviewAvatarText: { fontSize: 16, color: '#C9A84C', fontWeight: '400' },
  reviewInfo: { flex: 1, gap: 2 },
  reviewName: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  reviewFunction: { fontSize: 12, color: '#8C7B6E' },
  reviewRating: { fontSize: 13, color: '#C9A84C' },
  videoThumb: { backgroundColor: '#2C2420', borderRadius: 8, paddingVertical: 20, alignItems: 'center' },
  videoThumbText: { fontSize: 14, color: '#F5F0E8', letterSpacing: 0.5 },
  emptyClients: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#E8E0D5', gap: 8 },
  emptyClientsText: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  emptyClientsSub: { fontSize: 13, color: '#8C7B6E', textAlign: 'center', lineHeight: 20 },
  clientCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E8E0D5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientInfo: { gap: 3 },
  clientName: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  clientPhone: { fontSize: 12, color: '#8C7B6E' },
  clientDate: { fontSize: 12, color: '#C9A84C' },
  inviteBtn: { backgroundColor: '#25D366', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  inviteBtnDone: { backgroundColor: '#E8E0D5' },
  inviteBtnText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  inviteBtnTextDone: { color: '#8C7B6E' },
  addClientBtn: { backgroundColor: '#2C2420', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addClientBtnText: { fontSize: 12, color: '#C9A84C', fontWeight: '500' },
  viralCard: { backgroundColor: '#2C2420', borderRadius: 14, padding: 18, gap: 8 },
  viralTitle: { fontSize: 15, color: '#C9A84C', fontWeight: '500' },
  viralText: { fontSize: 13, color: '#B8A99A', lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#F5F0E8', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, gap: 14 },
  modalTitle: { fontSize: 22, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  modalSubtitle: { fontSize: 13, color: '#8C7B6E', marginTop: -8, lineHeight: 20 },
  modalInput: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E8E0D5', paddingVertical: 14, paddingHorizontal: 16, fontSize: 14, color: '#2C2420' },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  modalBtnText: { fontSize: 15, color: '#F5F0E8', fontWeight: '500' },
  modalCancel: { alignItems: 'center', paddingVertical: 8 },
  modalCancelText: { fontSize: 14, color: '#8C7B6E' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: '#E8E0D5', backgroundColor: '#F5F0E8' },
  navItem: { alignItems: 'center' },
  navLabel: { fontSize: 14, color: '#8C7B6E', fontWeight: '500' },
  navActive: { color: '#2C2420' },
});