import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, TextInput
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const TABS = ['Budget', 'Guests', 'To Do', 'Payments', 'Memories'];

const BUDGET_CATEGORIES = [
  { id: '1', category: 'Venue', budgeted: 800000, hearted: 500000, booked: 0 },
  { id: '2', category: 'Photography', budgeted: 150000, hearted: 80000, booked: 80000 },
  { id: '3', category: 'MUA', budgeted: 50000, hearted: 25000, booked: 0 },
  { id: '4', category: 'Designer', budgeted: 200000, hearted: 150000, booked: 0 },
  { id: '5', category: 'Choreographer', budgeted: 60000, hearted: 0, booked: 0 },
  { id: '6', category: 'Content Creator', budgeted: 30000, hearted: 20000, booked: 0 },
];

const MOCK_GUESTS = [
  { id: '1', name: 'Rahul Sharma', group: 'Family', rsvp: 'confirmed', dietary: 'Veg' },
  { id: '2', name: 'Priya Singh', group: 'College Friends', rsvp: 'confirmed', dietary: 'Non-Veg' },
  { id: '3', name: 'Amit Kumar', group: 'Office', rsvp: 'pending', dietary: 'Veg' },
  { id: '4', name: 'Neha Gupta', group: 'Family', rsvp: 'declined', dietary: 'Jain' },
  { id: '5', name: 'Vikram Mehta', group: 'College Friends', rsvp: 'pending', dietary: 'Non-Veg' },
  { id: '6', name: 'Sunita Verma', group: 'Family', rsvp: 'confirmed', dietary: 'Veg' },
];

const MOCK_PAYMENTS = [
  { id: '1', vendor: 'Arjun Mehta Photography', amount: 40000, status: 'held', date: 'Dec 15, 2025' },
  { id: '2', vendor: 'The Grand Celebration', amount: 100000, status: 'pending', date: 'Dec 20, 2025' },
];

const DEFAULT_TODOS = [
  { id: '1', text: 'Book photographer', done: true, reminder: 'Dec 1, 2025' },
  { id: '2', text: 'Finalise venue', done: false, reminder: 'Dec 5, 2025' },
  { id: '3', text: 'Send e-invites', done: false, reminder: 'Dec 10, 2025' },
  { id: '4', text: 'Book MUA for trial', done: false, reminder: 'Dec 8, 2025' },
  { id: '5', text: 'Confirm choreographer', done: false, reminder: '' },
  { id: '6', text: 'Finalise bridal outfit', done: false, reminder: 'Dec 15, 2025' },
];

const formatAmount = (amount: number) => {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
};

export default function BTSPlannerScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Budget');
  const [todos, setTodos] = useState(DEFAULT_TODOS);
  const [newTodo, setNewTodo] = useState('');
  const [newReminder, setNewReminder] = useState('');
  const [showAddTodo, setShowAddTodo] = useState(false);

  const totalBudgeted = BUDGET_CATEGORIES.reduce((sum, c) => sum + c.budgeted, 0);
  const totalHearted = BUDGET_CATEGORIES.reduce((sum, c) => sum + c.hearted, 0);
  const totalBooked = BUDGET_CATEGORIES.reduce((sum, c) => sum + c.booked, 0);
  const confirmedGuests = MOCK_GUESTS.filter(g => g.rsvp === 'confirmed').length;
  const pendingGuests = MOCK_GUESTS.filter(g => g.rsvp === 'pending').length;
  const completedTodos = todos.filter(t => t.done).length;

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const addTodo = () => {
    if (newTodo.trim() === '') return;
    setTodos(prev => [...prev, {
      id: Date.now().toString(),
      text: newTodo.trim(),
      done: false,
      reminder: newReminder.trim(),
    }]);
    setNewTodo('');
    setNewReminder('');
    setShowAddTodo(false);
  };

  const removeTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const getRSVPColor = (rsvp: string) => {
    if (rsvp === 'confirmed') return '#4CAF50';
    if (rsvp === 'declined') return '#E57373';
    return '#8C7B6E';
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Planner</Text>
        <TouchableOpacity style={styles.inviteBtn}>
          <Text style={styles.inviteBtnText}>+ Co-planner</Text>
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

        {/* BUDGET */}
        {activeTab === 'Budget' && (
          <View style={styles.tabPane}>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Genie Budget Overview</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryAmount}>{formatAmount(totalBudgeted)}</Text>
                  <Text style={styles.summaryLabel}>Total Budget</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryAmount, { color: '#C9A84C' }]}>{formatAmount(totalHearted)}</Text>
                  <Text style={styles.summaryLabel}>Hearted</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>{formatAmount(totalBooked)}</Text>
                  <Text style={styles.summaryLabel}>Booked</Text>
                </View>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, {
                  width: `${Math.min((totalHearted / totalBudgeted) * 100, 100)}%`
                }]} />
              </View>
              <Text style={styles.progressLabel}>
                {Math.round((totalHearted / totalBudgeted) * 100)}% of budget allocated
              </Text>
            </View>

            <Text style={styles.sectionLabel}>By Category</Text>
            <View style={styles.listCard}>
              {BUDGET_CATEGORIES.map((cat, index) => (
                <View key={cat.id}>
                  <View style={styles.budgetRow}>
                    <View>
                      <Text style={styles.budgetCategoryName}>{cat.category}</Text>
                      <Text style={styles.budgetCategoryDetail}>Budget: {formatAmount(cat.budgeted)}</Text>
                    </View>
                    <View>
                      {cat.booked > 0 ? (
                        <Text style={styles.bookedText}>Booked · {formatAmount(cat.booked)}</Text>
                      ) : cat.hearted > 0 ? (
                        <Text style={styles.heartedText}>Saved · {formatAmount(cat.hearted)}</Text>
                      ) : (
                        <Text style={styles.emptyText}>Not started</Text>
                      )}
                    </View>
                  </View>
                  {index < BUDGET_CATEGORIES.length - 1 && <View style={styles.listDivider} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* GUESTS */}
        {activeTab === 'Guests' && (
          <View style={styles.tabPane}>

            <View style={styles.summaryCard}>
              <View style={styles.guestSummaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryAmount}>{MOCK_GUESTS.length}</Text>
                  <Text style={styles.summaryLabel}>Total</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>{confirmedGuests}</Text>
                  <Text style={styles.summaryLabel}>Confirmed</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryAmount, { color: '#C9A84C' }]}>{pendingGuests}</Text>
                  <Text style={styles.summaryLabel}>Pending</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionRow}>
              {['Add Guest', 'E-Invites', 'Seating'].map((action, index, arr) => (
                <TouchableOpacity key={action} style={[
                  styles.actionBtn,
                  index < arr.length - 1 && { borderRightWidth: 1, borderRightColor: '#EDE8E3' }
                ]}>
                  <Text style={styles.actionBtnText}>{action}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Guest List</Text>
            <View style={styles.listCard}>
              {MOCK_GUESTS.map((guest, index) => (
                <View key={guest.id}>
                  <View style={styles.guestRow}>
                    <View style={styles.guestAvatar}>
                      <Text style={styles.guestAvatarText}>{guest.name[0]}</Text>
                    </View>
                    <View style={styles.guestInfo}>
                      <Text style={styles.guestName}>{guest.name}</Text>
                      <Text style={styles.guestGroup}>{guest.group} · {guest.dietary}</Text>
                    </View>
                    <Text style={[styles.rsvpText, { color: getRSVPColor(guest.rsvp) }]}>
                      {guest.rsvp.charAt(0).toUpperCase() + guest.rsvp.slice(1)}
                    </Text>
                  </View>
                  {index < MOCK_GUESTS.length - 1 && <View style={styles.listDivider} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TO DO */}
        {activeTab === 'To Do' && (
          <View style={styles.tabPane}>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>
                {completedTodos} of {todos.length} tasks completed
              </Text>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, {
                  width: todos.length > 0 ? `${(completedTodos / todos.length) * 100}%` : '0%'
                }]} />
              </View>
            </View>

            <Text style={styles.sectionLabel}>Pending</Text>
            <View style={styles.listCard}>
              {todos.filter(t => !t.done).map((todo, index, arr) => (
                <View key={todo.id}>
                  <View style={styles.todoRow}>
                    <TouchableOpacity
                      style={styles.todoCheckbox}
                      onPress={() => toggleTodo(todo.id)}
                    >
                      <View style={styles.todoCheckboxInner} />
                    </TouchableOpacity>
                    <View style={styles.todoContent}>
                      <Text style={styles.todoText}>{todo.text}</Text>
                      {todo.reminder ? (
                        <Text style={styles.todoReminder}>{todo.reminder}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity onPress={() => removeTodo(todo.id)}>
                      <Text style={styles.todoRemoveBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {index < arr.length - 1 && <View style={styles.listDivider} />}
                </View>
              ))}
            </View>

            {todos.filter(t => t.done).length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Completed</Text>
                <View style={styles.listCard}>
                  {todos.filter(t => t.done).map((todo, index, arr) => (
                    <View key={todo.id}>
                      <View style={styles.todoRow}>
                        <TouchableOpacity
                          style={[styles.todoCheckbox, styles.todoCheckboxDone]}
                          onPress={() => toggleTodo(todo.id)}
                        >
                          <Text style={styles.todoCheckboxTick}>✓</Text>
                        </TouchableOpacity>
                        <View style={styles.todoContent}>
                          <Text style={[styles.todoText, styles.todoTextDone]}>{todo.text}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeTodo(todo.id)}>
                          <Text style={styles.todoRemoveBtn}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      {index < arr.length - 1 && <View style={styles.listDivider} />}
                    </View>
                  ))}
                </View>
              </>
            )}

            {showAddTodo ? (
              <View style={styles.addTodoCard}>
                <TextInput
                  style={styles.addTodoInput}
                  placeholder="What needs to be done?"
                  placeholderTextColor="#8C7B6E"
                  value={newTodo}
                  onChangeText={setNewTodo}
                  autoFocus
                />
                <TextInput
                  style={styles.addTodoInput}
                  placeholder="Reminder date (optional)"
                  placeholderTextColor="#8C7B6E"
                  value={newReminder}
                  onChangeText={setNewReminder}
                />
                <View style={styles.addTodoActions}>
                  <TouchableOpacity
                    style={styles.addTodoCancelBtn}
                    onPress={() => setShowAddTodo(false)}
                  >
                    <Text style={styles.addTodoCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addTodoSaveBtn} onPress={addTodo}>
                    <Text style={styles.addTodoSaveText}>Add Task</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addTodoBtn}
                onPress={() => setShowAddTodo(true)}
              >
                <Text style={styles.addTodoBtnText}>+ Add Task</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* PAYMENTS */}
        {activeTab === 'Payments' && (
          <View style={styles.tabPane}>
            <Text style={styles.sectionLabel}>Token Payments</Text>
            <View style={styles.listCard}>
              {MOCK_PAYMENTS.map((payment, index) => (
                <View key={payment.id}>
                  <View style={styles.paymentRow}>
                    <View style={styles.paymentLeft}>
                      <Text style={styles.paymentVendor}>{payment.vendor}</Text>
                      <Text style={styles.paymentDate}>Due: {payment.date}</Text>
                    </View>
                    <View style={styles.paymentRight}>
                      <Text style={styles.paymentAmount}>{formatAmount(payment.amount)}</Text>
                      <Text style={[styles.paymentStatus, {
                        color: payment.status === 'held' ? '#C9A84C' : '#8C7B6E'
                      }]}>
                        {payment.status === 'held' ? 'In Escrow' : payment.status}
                      </Text>
                    </View>
                  </View>
                  {index < MOCK_PAYMENTS.length - 1 && <View style={styles.listDivider} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* MEMORIES */}
        {activeTab === 'Memories' && (
          <View style={styles.tabPane}>
            <View style={styles.memoriesEmpty}>
              <Text style={styles.memoriesTitle}>Memory Book</Text>
              <Text style={styles.memoriesSubtitle}>
                Upload behind-the-scenes moments from your functions. Your co-planner and content creator can add memories too.
              </Text>
              <TouchableOpacity style={styles.uploadBtn}>
                <Text style={styles.uploadBtnText}>Add Memory</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
        <TouchableOpacity style={styles.navItem}>
          <Text style={[styles.navLabel, styles.navActive]}>Planner</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
          <Text style={styles.navLabel}>Profile</Text>
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
  title: {
    fontSize: 28,
    color: '#1C1C1C',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  inviteBtn: {
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  inviteBtnText: {
    fontSize: 12,
    color: '#8C7B6E',
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
    paddingHorizontal: 18,
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
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E8DDD4',
  },
  summaryTitle: {
    fontSize: 14,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#EDE8E3',
  },
  summaryAmount: {
    fontSize: 22,
    color: '#1C1C1C',
    fontWeight: '400',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#8C7B6E',
    letterSpacing: 0.3,
  },
  progressBg: {
    height: 3,
    backgroundColor: '#EDE8E3',
    borderRadius: 1.5,
  },
  progressFill: {
    height: 3,
    backgroundColor: '#C9A84C',
    borderRadius: 1.5,
  },
  progressLabel: {
    fontSize: 11,
    color: '#8C7B6E',
    textAlign: 'right',
  },
  sectionLabel: {
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    overflow: 'hidden',
  },
  listDivider: {
    height: 1,
    backgroundColor: '#EDE8E3',
    marginHorizontal: 16,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  budgetCategoryName: {
    fontSize: 14,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  budgetCategoryDetail: {
    fontSize: 12,
    color: '#8C7B6E',
    marginTop: 2,
  },
  bookedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  heartedText: {
    fontSize: 12,
    color: '#C9A84C',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  actionRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    overflow: 'hidden',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    color: '#C9A84C',
    fontWeight: '500',
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  guestAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestAvatarText: {
    fontSize: 14,
    color: '#FAF6F0',
    fontWeight: '500',
  },
  guestInfo: {
    flex: 1,
    gap: 2,
  },
  guestName: {
    fontSize: 14,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  guestGroup: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  rsvpText: {
    fontSize: 12,
    fontWeight: '500',
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  todoCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C9A84C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  todoCheckboxDone: {
    backgroundColor: '#1C1C1C',
    borderColor: '#1C1C1C',
  },
  todoCheckboxInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  todoCheckboxTick: {
    color: '#FAF6F0',
    fontSize: 10,
    fontWeight: '700',
  },
  todoContent: {
    flex: 1,
    gap: 2,
  },
  todoText: {
    fontSize: 14,
    color: '#1C1C1C',
  },
  todoTextDone: {
    textDecorationLine: 'line-through',
    color: '#8C7B6E',
  },
  todoReminder: {
    fontSize: 11,
    color: '#C9A84C',
  },
  todoRemoveBtn: {
    fontSize: 13,
    color: '#8C7B6E',
    padding: 4,
  },
  addTodoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    gap: 10,
  },
  addTodoInput: {
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1C1C1C',
    backgroundColor: '#FAF6F0',
  },
  addTodoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  addTodoCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addTodoCancelText: {
    fontSize: 14,
    color: '#8C7B6E',
  },
  addTodoSaveBtn: {
    flex: 1,
    backgroundColor: '#1C1C1C',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addTodoSaveText: {
    fontSize: 14,
    color: '#FAF6F0',
    fontWeight: '500',
  },
  addTodoBtn: {
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  addTodoBtnText: {
    fontSize: 14,
    color: '#C9A84C',
    fontWeight: '500',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  paymentLeft: {
    flex: 1,
    gap: 3,
  },
  paymentVendor: {
    fontSize: 14,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  paymentDate: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  paymentRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  paymentAmount: {
    fontSize: 15,
    color: '#1C1C1C',
    fontWeight: '600',
  },
  paymentStatus: {
    fontSize: 11,
    fontWeight: '500',
  },
  memoriesEmpty: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 48,
  },
  memoriesTitle: {
    fontSize: 24,
    color: '#1C1C1C',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  memoriesSubtitle: {
    fontSize: 14,
    color: '#8C7B6E',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  uploadBtn: {
    marginTop: 8,
    backgroundColor: '#1C1C1C',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  uploadBtnText: {
    fontSize: 14,
    color: '#FAF6F0',
    fontWeight: '500',
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