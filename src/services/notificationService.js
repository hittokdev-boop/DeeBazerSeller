import '@react-native-firebase/app';
import * as messagingModule from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { PermissionsAndroid, Platform, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FCM_TOKEN_KEY = 'fcm_token';
const NOTIFICATION_CHANNEL_ID = 'deebazar_seller_alerts_v2';
const OLD_NOTIFICATION_CHANNEL_ID = 'deebazar_seller_notifications';

/**
 * Helper to safely acquire Firebase messaging instance (supports RNFB v26 modular & legacy)
 */
function getMessagingSafe() {
  try {
    if (typeof messagingModule.getMessaging === 'function') {
      return messagingModule.getMessaging();
    }
    if (typeof messagingModule.default === 'function') {
      return messagingModule.default();
    }
    if (messagingModule.default) {
      return messagingModule.default;
    }
    return null;
  } catch (e) {
    console.error('[NotificationService] getMessagingSafe error:', e);
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
    const nft = getNotifeeSafe();
    let notifeeSettings = null;
    if (nft && typeof nft.requestPermission === 'function') {
      try {
        notifeeSettings = await nft.requestPermission();
      } catch (err) {
        console.warn('[NotificationService] Notifee requestPermission warning:', err?.message || err);
      }
    }

    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('[NotificationService] POST_NOTIFICATIONS permission not granted:', granted);
          return false;
        }
      }
      return true;
    } else if (Platform.OS === 'ios') {
      const msg = getMessagingSafe();
      if (!msg) return false;
      const authStatus =
        typeof messagingModule.requestPermission === 'function'
          ? await messagingModule.requestPermission(msg)
          : await msg.requestPermission();
      const enabled =
        authStatus === messagingModule.AuthorizationStatus.AUTHORIZED ||
        authStatus === messagingModule.AuthorizationStatus.PROVISIONAL;
      return enabled;
    }
    return true;
  } catch (error) {
    console.error('[NotificationService] Permission error:', error?.message || error);
    return false;
  }
}

/**
 * Create Default Notification Channel for Android with HIGH importance for foreground heads-up banners
 */
export async function createNotificationChannel() {
  try {
    if (Platform.OS === 'android') {
      const nft = getNotifeeSafe();
      if (nft && typeof nft.createChannel === 'function') {
        // Clean up old default-importance channel if present
        try {
          if (typeof nft.deleteChannel === 'function') {
            await nft.deleteChannel(OLD_NOTIFICATION_CHANNEL_ID);
          }
        } catch (e) {
          // ignore channel deletion errors
        }

        const channelId = await nft.createChannel({
          id: NOTIFICATION_CHANNEL_ID,
          name: 'DeeBazar Seller Alerts',
          importance: AndroidImportance.HIGH,
          vibration: true,
          vibrationPattern: [300, 500],
          sound: 'default',
          lights: true,
        });
        return channelId;
      }
    }
    return NOTIFICATION_CHANNEL_ID;
  } catch (error) {
    console.error('[NotificationService] Create Channel error:', error?.message || error);
    return NOTIFICATION_CHANNEL_ID;
  }
}

/**
 * Get and store FCM Token
 */
export async function getFCMToken() {
  try {
    const msg = getMessagingSafe();
    let token = null;

    if (msg) {
      if (Platform.OS === 'ios') {
        const isReg =
          typeof messagingModule.isDeviceRegisteredForRemoteMessages === 'function'
            ? messagingModule.isDeviceRegisteredForRemoteMessages(msg)
            : msg.isDeviceRegisteredForRemoteMessages;

        if (!isReg) {
          if (typeof messagingModule.registerDeviceForRemoteMessages === 'function') {
            await messagingModule.registerDeviceForRemoteMessages(msg);
          } else if (typeof msg.registerDeviceForRemoteMessages === 'function') {
            await msg.registerDeviceForRemoteMessages();
          }
        }
      }

      if (typeof messagingModule.getToken === 'function') {
        token = await messagingModule.getToken(msg);
      } else if (typeof msg.getToken === 'function') {
        token = await msg.getToken();
      }

      if (token) {
        await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      }
    }

    if (!token) {
      token = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    }

    console.log('\n========================================');
    console.log('🔥 [FCM TOKEN] 🔥 :');
    console.log(token);
    console.log('========================================\n');

    return token;
  } catch (error) {
    console.error(
      '[NotificationService] FCM Token retrieval error:',
      error?.message || error
    );
    try {
      const cached = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      if (cached) {
        console.log('\n========================================');
        console.log('🔥 [CACHED FCM TOKEN] 🔥 :');
        console.log(cached);
        console.log('========================================\n');
        return cached;
      }
    } catch (e) {}
    return null;
  }
}

/**
 * Display a foreground notification banner using Notifee with heads-up popup
 */
export async function displayLocalNotification(remoteMessage) {
  try {
    if (!remoteMessage) return;
    const nft = getNotifeeSafe();
    if (!nft || typeof nft.displayNotification !== 'function') {
      console.warn('[NotificationService] Notifee not available for displaying notification');
      return;
    }

    const channelId = await createNotificationChannel();
    const notification = remoteMessage.notification || {};
    const data = remoteMessage.data || {};

    const title = notification.title || data.title || data.heading || 'DeeBazar Seller';
    const body = notification.body || data.body || data.message || '';
    const notificationId =
      remoteMessage.messageId ||
      data.id ||
      data.notification_id ||
      undefined;

    console.log('🔔 [NotificationService] Displaying foreground notification:', { title, body, channelId, notificationId });

    await nft.displayNotification({
      ...(notificationId ? { id: notificationId } : {}),
      title,
      body,
      data,
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        smallIcon: 'ic_launcher',
        pressAction: {
          id: 'default',
        },
        sound: 'default',
        vibrationPattern: [300, 500],
      },
      ios: {
        sound: 'default',
        foregroundPresentationOptions: {
          alert: true,
          badge: true,
          sound: true,
        },
      },
    });

    // Notify foreground app screens & in-app banner component
    DeviceEventEmitter.emit('newNotificationReceived', {
      ...remoteMessage,
      title,
      body,
      data,
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
    // 1. Listen to token refresh
    try {
      const refreshHandler = async (token) => {
        try {
          await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
          console.log('\n========================================');
          console.log('🔥 [REFRESHED FCM TOKEN] 🔥 :');
          console.log(token);
          console.log('========================================\n');
        } catch (err) {
          console.error('[NotificationService] Error saving refreshed FCM token:', err?.message || err);
        }
      };

      if (typeof messagingModule.onTokenRefresh === 'function') {
        unsubscribeTokenRefresh = messagingModule.onTokenRefresh(msg, refreshHandler);
      } else if (typeof msg.onTokenRefresh === 'function') {
        unsubscribeTokenRefresh = msg.onTokenRefresh(refreshHandler);
      }
    } catch (err) {
      console.error('[NotificationService] Could not set up onTokenRefresh listener:', err?.message || err);
    }

    // 2. Listen to Foreground Messages
    try {
      const foregroundHandler = async (remoteMessage) => {
        console.log('🔔 [NotificationService] Foreground message arrived:', JSON.stringify(remoteMessage));
        await displayLocalNotification(remoteMessage);
      };

      if (typeof messagingModule.onMessage === 'function') {
        unsubscribeForeground = messagingModule.onMessage(msg, foregroundHandler);
      } else if (typeof msg.onMessage === 'function') {
        unsubscribeForeground = msg.onMessage(foregroundHandler);
      }
    } catch (err) {
      console.error('[NotificationService] Could not set up onMessage listener:', err?.message || err);
    }

    // 3. App opened from Background State by tapping notification
    try {
      const openedHandler = (remoteMessage) => {
        if (onNotificationClick && remoteMessage) {
          onNotificationClick(remoteMessage);
        }
      };

      if (typeof messagingModule.onNotificationOpenedApp === 'function') {
        unsubscribeNotificationOpened = messagingModule.onNotificationOpenedApp(msg, openedHandler);
      } else if (typeof msg.onNotificationOpenedApp === 'function') {
        unsubscribeNotificationOpened = msg.onNotificationOpenedApp(openedHandler);
      }
    } catch (err) {
      console.error('[NotificationService] Could not set up onNotificationOpenedApp listener:', err?.message || err);
    }

    // 4. App launched from Quit State by tapping notification
    try {
      const initialPromise =
        typeof messagingModule.getInitialNotification === 'function'
          ? messagingModule.getInitialNotification(msg)
          : typeof msg.getInitialNotification === 'function'
          ? msg.getInitialNotification()
          : null;

      if (initialPromise && typeof initialPromise.then === 'function') {
        initialPromise
          .then((remoteMessage) => {
            if (remoteMessage && onNotificationClick) {
              onNotificationClick(remoteMessage);
            }
          })
          .catch((err) => console.error('[NotificationService] getInitialNotification error:', err));
      }
    } catch (err) {
      console.error('[NotificationService] Could not check getInitialNotification:', err?.message || err);
    }
  }

  // 5. Notifee Foreground Event Listener
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
      const bgHandler = async (remoteMessage) => {
        // If the FCM message has a 'notification' payload, Firebase Android SDK
        // automatically displays the system notification in the background.
        // We only display a local notification if it's a DATA-ONLY message.
        if (!remoteMessage?.notification) {
          await displayLocalNotification(remoteMessage);
        }
      };

      if (typeof messagingModule.setBackgroundMessageHandler === 'function') {
        messagingModule.setBackgroundMessageHandler(msg, bgHandler);
      } else if (typeof msg.setBackgroundMessageHandler === 'function') {
        msg.setBackgroundMessageHandler(bgHandler);
      }
    }
  } catch (error) {
    console.error('[NotificationService] Background handler registration skipped:', error?.message || error);
  }
}
