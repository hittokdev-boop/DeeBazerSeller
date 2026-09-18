import React, { useEffect, useCallback } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import SellerStack from "./src/navigation/SellerStack";
import { ThemeProvider } from "./src/context/ThemeContext";
import { AlertProvider } from "./src/context/AlertContext";
import {
  requestNotificationPermission,
  createNotificationChannel,
  getFCMToken,
  setupNotificationListeners,
} from "./src/services/notificationService";

export const navigationRef = createNavigationContainerRef();

export default function App() {
  const handleNotificationPress = useCallback((notification) => {
    if (navigationRef.isReady()) {
      try {
        navigationRef.navigate("Notifications");
      } catch (e) {
        console.warn("[App] Could not navigate to Notifications on click:", e);
      }
    }
  }, []);

  useEffect(() => {
    let unsubscribe = null;

    async function initNotifications() {
      try {
        const hasPermission = await requestNotificationPermission();
        await createNotificationChannel();
        if (hasPermission) {
          await getFCMToken();
        }
      } catch (err) {
        console.error("[App] Notification initialization error:", err);
      }

      unsubscribe = setupNotificationListeners((notification) => {
        handleNotificationPress(notification);
      });
    }

    initNotifications();

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [handleNotificationPress]);

  return (
    <ThemeProvider>
      <AlertProvider>
        <NavigationContainer ref={navigationRef}>
          <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
          <SellerStack />
        </NavigationContainer>
      </AlertProvider>
    </ThemeProvider>
  );
}