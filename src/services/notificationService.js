import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FCM_TOKEN_KEY = 'fcm_token';

/**
 * Helper to safely acquire Firebase messaging instance
 */
function getMessagingSafe() {
  try {
    return messaging ? messaging() : null;
  } catch (e) {
    return null;
  }
}

/**
 * Helper to safely acquire Notifee instance
 */
function getNotifeeSafe() {
  try {
    return notifee || null;
  } catch (e) {
    return null;
  }
}

/**
 * Request notification permissions (Handles Android 13+ & iOS)
 */
export async function requestNotificationPermission() {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return false;
        }
      }
      return true;
    } else if (Platform.OS === 'ios') {
      const msg = getMessagingSafe();
      if (!msg) return false;
      const authStatus = await msg.requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      return enabled;
    }
    return true;
  } catch (error) {
    console.error('[NotificationService] Permission error:', error?.message || error);
    return false;
  }
}

/**
 * Create Default Notification Channel for Android
 */
export async function createNotificationChannel() {
  try {
    if (Platform.OS === 'android') {
      const nft = getNotifeeSafe();
      if (nft && typeof nft.createChannel === 'function') {
        const channelId = await nft.createChannel({
          id: 'default_channel_id',
          name: 'General Notifications',
          importance: AndroidImportance.HIGH,
          vibration: true,
          sound: 'default',
        });
        return channelId;
      }
    }
    return 'default';
  } catch (error) {
    console.error('[NotificationService] Create Channel error:', error?.message || error);
    return 'default';
  }
}

/**
 * Get and store FCM Token
 */
export async function getFCMToken() {
  try {
    let token = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    if (!token) {
      const msg = getMessagingSafe();
      if (!msg) {
        return null;
      }
      if (Platform.OS === 'ios') {
        if (!msg.isDeviceRegisteredForRemoteMessages) {
          await msg.registerDeviceForRemoteMessages();
        }
      }
      token = await msg.getToken();
      if (token) {
        await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      }
    }
    return token;
  } catch (error) {
    console.error(
      '[NotificationService] FCM Token retrieval error:',
      error?.message || error
    );
    return null;
  }
}

/**
 * Display a foreground notification banner using Notifee
 */
export async function displayLocalNotification(remoteMessage) {
  try {
    if (!remoteMessage) return;
    const nft = getNotifeeSafe();
    if (!nft || typeof nft.displayNotification !== 'function') return;

    const channelId = await createNotificationChannel();
    const notification = remoteMessage.notification || {};
    const data = remoteMessage.data || {};

    await nft.displayNotification({
      title: notification.title || data.title || 'DeeBazar Seller',
      body: notification.body || data.body || '',
      data: data,
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        pressAction: {
          id: 'default',
        },
        importance: AndroidImportance.HIGH,
      },
    });
  } catch (error) {
    console.error('[NotificationService] Display error:', error?.message || error);
  }
}

/**
 * Initialize Notification Listeners
 */
export function setupNotificationListeners(onNotificationClick) {
  let unsubscribeTokenRefresh;
  let unsubscribeForeground;
  let unsubscribeNotificationOpened;
  let unsubscribeNotifeeEvents;

  const msg = getMessagingSafe();

  if (msg) {
    // Listen to token refresh
    try {
      unsubscribeTokenRefresh = msg.onTokenRefresh(async (token) => {
        try {
          await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
        } catch (err) {
          console.error('[NotificationService] Error saving refreshed FCM token:', err?.message || err);
        }
      });
    } catch (err) {
      console.error('[NotificationService] Could not set up onTokenRefresh listener:', err?.message || err);
    }

    // Listen to Foreground Messages
    try {
      unsubscribeForeground = msg.onMessage(async (remoteMessage) => {
        await displayLocalNotification(remoteMessage);
      });
    } catch (err) {
      console.error('[NotificationService] Could not set up onMessage listener:', err?.message || err);
    }

    // App opened from Background State by tapping notification
    try {
      unsubscribeNotificationOpened = msg.onNotificationOpenedApp((remoteMessage) => {
        if (onNotificationClick && remoteMessage) {
          onNotificationClick(remoteMessage);
        }
      });
    } catch (err) {
      console.error('[NotificationService] Could not set up onNotificationOpenedApp listener:', err?.message || err);
    }

    // App launched from Quit State by tapping notification
    try {
      msg
        .getInitialNotification()
        .then((remoteMessage) => {
          if (remoteMessage) {
            if (onNotificationClick) {
              onNotificationClick(remoteMessage);
            }
          }
        })
        .catch((err) => console.error('[NotificationService] getInitialNotification error:', err));
    } catch (err) {
      console.error('[NotificationService] Could not check getInitialNotification:', err?.message || err);
    }
  }

  // Notifee Foreground Event Listener
  const nft = getNotifeeSafe();
  if (nft && typeof nft.onForegroundEvent === 'function') {
    try {
      unsubscribeNotifeeEvents = nft.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.PRESS) {
          if (onNotificationClick && detail.notification) {
            onNotificationClick(detail.notification);
          }
        }
      });
    } catch (err) {
      console.error('[NotificationService] Could not set up Notifee foreground listener:', err?.message || err);
    }
  }

  return () => {
    if (typeof unsubscribeTokenRefresh === 'function') unsubscribeTokenRefresh();
    if (typeof unsubscribeForeground === 'function') unsubscribeForeground();
    if (typeof unsubscribeNotificationOpened === 'function') unsubscribeNotificationOpened();
    if (typeof unsubscribeNotifeeEvents === 'function') unsubscribeNotifeeEvents();
  };
}

/**
 * Background Message Handler (Registered in index.js)
 */
export async function registerBackgroundMessageHandler() {
  try {
    const msg = getMessagingSafe();
    if (msg) {
      msg.setBackgroundMessageHandler(async (remoteMessage) => {
        await displayLocalNotification(remoteMessage);
      });
    }
  } catch (error) {
    console.error('[NotificationService] Background handler registration skipped:', error?.message || error);
  }
}
