import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerForPushNotifications = async (): Promise<string | null> => {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'The Dream Wedding',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9A84C',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'Booking Updates',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9A84C',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250],
      lightColor: '#C9A84C',
      sound: 'default',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '1f6d681f-42ce-4436-9230-4b126626ef10',
    });
    return tokenData.data;
  } catch (e) {
    console.log('Push token error:', e);
    return null;
  }
};

export const savePushToken = async (token: string, userId: string) => {
  try {
    await AsyncStorage.setItem('push_token', token);
    await fetch('https://dream-wedding-production-89ae.up.railway.app/api/users/push-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, token, platform: Platform.OS }),
    });
  } catch (e) {
    console.log('Save push token error:', e);
  }
};

export const sendLocalNotification = async (title: string, body: string, data?: any) => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: data || {}, sound: 'default' },
    trigger: null,
  });
};

export const addNotificationListener = (
  handler: (notification: Notifications.Notification) => void
) => Notifications.addNotificationReceivedListener(handler);

export const addNotificationResponseListener = (
  handler: (response: Notifications.NotificationResponse) => void
) => Notifications.addNotificationResponseReceivedListener(handler);