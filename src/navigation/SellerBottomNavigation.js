import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import COLORS from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

import Dashboard from "../screens/app/Dashboard";
import Products from "../screens/product/Products";
import Orders from "../screens/product/Orders";
import Earnings from "../screens/wallet/Earnings";
import Account from "../screens/app/Account";

const Tab = createBottomTabNavigator();

const SellerBottomNavigation = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,

        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.cardBg,
            borderTopColor: colors.borderLight,
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,

        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case "Dashboard":
              iconName = focused ? "home" : "home-outline";
              break;

            case "Products":
              iconName = focused ? "cube" : "cube-outline";
              break;

            case "Orders":
              iconName = focused ? "receipt" : "receipt-outline";
              break;

            case "Earnings":
              iconName = focused ? "wallet" : "wallet-outline";
              break;

            case "Account":
              iconName = focused ? "person-circle" : "person-circle-outline";
              break;

            default:
              iconName = "ellipse";
          }

          return (
            <Ionicons
              name={iconName}
              size={size || 24}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Products" component={Products} />
      <Tab.Screen name="Orders" component={Orders} />
      <Tab.Screen name="Earnings" component={Earnings} />
      <Tab.Screen name="Account" component={Account} />
    </Tab.Navigator>
  );
};

export default SellerBottomNavigation;

const styles = StyleSheet.create({
  tabBar: {
    height: 70,
    paddingBottom: 8,
    paddingTop: 8,
    backgroundColor: COLORS.cardBg,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.borderInactive,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
});
