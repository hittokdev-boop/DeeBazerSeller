/**
 * @format
 */

import { AppRegistry } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundMessageHandler } from './src/services/notificationService';

// Register Firebase background message handler
registerBackgroundMessageHandler();

// Register Notifee background event handler (handles notification clicks when app is backgrounded/killed)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification } = detail;
  if (type === EventType.PRESS) {
    console.log('[NotificationService] Background notification pressed:', notification);
  }
});

AppRegistry.registerComponent(appName, () => App);

