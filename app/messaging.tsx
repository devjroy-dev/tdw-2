import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const CONVERSATIONS = [
  {
    id: '1',
    vendorName: 'Joseph Radhik',
    category: 'Photographer',
    lastMessage: 'Yes, I am available for December 15th. Shall we schedule a call?',
    time: '2m ago',
    unread: 2,
    messages: [
      { id: '1', from: 'user', text: 'Hi Joseph, I\'m interested in your photography services for my wedding on December 15, 2025. Are you available?', time: '10:30 AM' },
      { id: '2', from: 'vendor', text: 'Hello! Thank you for reaching out. Yes, December 15th is available. Would love to be part of your special day!', time: '10:45 AM' },
      { id: '3', from: 'user', text: 'That\'s wonderful! Could you share your packages for a full day wedding coverage?', time: '11:00 AM' },
      { id: '4', from: 'vendor', text: 'Yes, I am available for December 15th. Shall we schedule a call?', time: '11:15 AM' },
    ],
  },
  {
    id: '2',
    vendorName: 'The Leela Palace',
    category: 'Venue',
    lastMessage: 'We have the Grand Ballroom available. Capacity up to 500 guests.',
    time: '1h ago',
    unread: 0,
    messages: [
      { id: '1', from: 'user', text: 'Hi, I\'m interested in your venue for a wedding reception in December 2025.', time: '9:00 AM' },
      { id: '2', from: 'vendor', text: 'We have the Grand Ballroom available. Capacity up to 500 guests.', time: '9:30 AM' },
    ],
  },
];

export default function MessagingScreen() {
  const router = useRouter();
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState(CONVERSATIONS);
  const scrollRef = useRef<ScrollView>(null);

  const currentConversation = conversations.find(c => c.id === activeConversation);

  const sendMessage = () => {
    if (newMessage.trim() === '' || !activeConversation) return;
    setConversations(prev => prev.map(c => {
      if (c.id === activeConversation) {
        return {
          ...c,
          lastMessage: newMessage.trim(),
          time: 'now',
          messages: [...c.messages, {
            id: Date.now().toString(),
            from: 'user',
            text: newMessage.trim(),
            time: 'now',
          }],
        };
      }
      return c;
    }));
    setNewMessage('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (activeConversation && currentConversation) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setActiveConversation(null)}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderName}>{currentConversation.vendorName}</Text>
            <Text style={styles.chatHeaderCategory}>{currentConversation.category}</Text>
          </View>
          <TouchableOpacity
            style={styles.lockDateBtn}
            onPress={() => router.push(`/payment?id=${currentConversation.id}`)}
          >
            <Text style={styles.lockDateBtnText}>Lock Date</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {currentConversation.messages.map(msg => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.from === 'user' ? styles.userBubble : styles.vendorBubble
              ]}
            >
              <Text style={[
                styles.messageText,
                msg.from === 'user' ? styles.userMessageText : styles.vendorMessageText
              ]}>
                {msg.text}
              </Text>
              <Text style={[
                styles.messageTime,
                msg.from === 'user' ? styles.userMessageTime : styles.vendorMessageTime
              ]}>
                {msg.time}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            placeholderTextColor="#8C7B6E"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, newMessage.trim() === '' && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={newMessage.trim() === ''}
          >
            <Text style={styles.sendBtnText}>→</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {conversations.map((conv, index) => (
          <View key={conv.id}>
            <TouchableOpacity
              style={styles.conversationRow}
              onPress={() => setActiveConversation(conv.id)}
            >
              <View style={styles.convAvatar}>
                <Text style={styles.convAvatarText}>{conv.vendorName[0]}</Text>
              </View>
              <View style={styles.convInfo}>
                <View style={styles.convTopRow}>
                  <Text style={styles.convName}>{conv.vendorName}</Text>
                  <Text style={styles.convTime}>{conv.time}</Text>
                </View>
                <Text style={styles.convCategory}>{conv.category}</Text>
                <Text style={styles.convLastMessage} numberOfLines={1}>
                  {conv.lastMessage}
                </Text>
              </View>
              {conv.unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{conv.unread}</Text>
                </View>
              )}
            </TouchableOpacity>
            {index < conversations.length - 1 && <View style={styles.convDivider} />}
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
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D5',
    gap: 12,
  },
  chatHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  chatHeaderName: {
    fontSize: 16,
    color: '#2C2420',
    fontWeight: '500',
  },
  chatHeaderCategory: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  lockDateBtn: {
    backgroundColor: '#2C2420',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  lockDateBtnText: {
    fontSize: 12,
    color: '#C9A84C',
    fontWeight: '500',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: width * 0.72,
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  userBubble: {
    backgroundColor: '#2C2420',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  vendorBubble: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#F5F0E8',
  },
  vendorMessageText: {
    color: '#2C2420',
  },
  messageTime: {
    fontSize: 10,
  },
  userMessageTime: {
    color: '#8C7B6E',
    textAlign: 'right',
  },
  vendorMessageTime: {
    color: '#8C7B6E',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    backgroundColor: '#F5F0E8',
    gap: 12,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2C2420',
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.3,
  },
  sendBtnText: {
    fontSize: 18,
    color: '#C9A84C',
    fontWeight: '500',
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 14,
  },
  convAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2C2420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  convAvatarText: {
    fontSize: 20,
    color: '#C9A84C',
    fontWeight: '300',
  },
  convInfo: {
    flex: 1,
    gap: 3,
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convName: {
    fontSize: 15,
    color: '#2C2420',
    fontWeight: '500',
  },
  convTime: {
    fontSize: 11,
    color: '#8C7B6E',
  },
  convCategory: {
    fontSize: 12,
    color: '#C9A84C',
  },
  convLastMessage: {
    fontSize: 13,
    color: '#8C7B6E',
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2C2420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    fontSize: 10,
    color: '#C9A84C',
    fontWeight: '700',
  },
  convDivider: {
    height: 1,
    backgroundColor: '#E8E0D5',
    marginHorizontal: 24,
  },
});