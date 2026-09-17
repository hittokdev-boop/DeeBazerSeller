import React, { useEffect } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import SellerStack from "./src/navigation/SellerStack";
import { ThemeProvider } from "./src/context/ThemeContext";
import { AlertProvider } from "./src/context/AlertContext";
import {
  requestNotificationPermission,
  createNotificationChannel,
  getFCMToken,
  setupNotificationListeners,
} from "./src/services/notificationService";

export default function App() {
  useEffect(() => {
    async function initNotifications() {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        await createNotificationChannel();
        await getFCMToken();
      }
    }

    initNotifications();

    const unsubscribe = setupNotificationListeners((notification) => {
      // Notification interaction handled
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider>
      <AlertProvider>
        <NavigationContainer>
          <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
          <SellerStack />
        </NavigationContainer>
      </AlertProvider>
    </ThemeProvider>
  );
}