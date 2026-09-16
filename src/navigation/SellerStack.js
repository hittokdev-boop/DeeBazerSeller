import React, { useState, useEffect } from "react";
import { StyleSheet, DeviceEventEmitter } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";

import COLORS from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

// Auth Screens
import Splash from "../screens/auth/Splash";
import Login from "../screens/auth/Login";
import SellerRegistration from "../screens/auth/SellerRegistration";
import ForgotPassword from "../screens/auth/ForgotPassword";
import ForgotPasswordOtp from "../screens/auth/ForgotPasswordOtp";
import ResetPassword from "../screens/auth/ResetPassword";

// App Screens
import Dashboard from "../screens/app/Dashboard";
import Products from "../screens/product/Products";
import Orders from "../screens/product/Orders";
import Earnings from "../screens/wallet/Earnings";
import Account from "../screens/app/Account";
import OrderDetails from "../screens/product/OrderDetails";
import ProductDetails from "../screens/product/ProductDetails";
import AddProductScreen from "../screens/product/AddProductScreen";
import EditProduct from "../screens/product/EditProduct";
import Inventory from "../screens/product/Inventory";
import AIProductStudio from "../screens/product/AIProductStudio";
import StoreInfo from "../screens/app/StoreInfo";
import StorePolicies from "../screens/app/StorePolicies";
import ShippingSettings from "../screens/app/ShippingSettings";
import EditProfile from "../screens/app/EditProfile";
import ContactNumber from "../screens/app/ContactNumber";
import BankDetails from "../screens/wallet/BankDetails";
import ChangePassword from "../screens/app/ChangePassword";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --------------------------------------------------
// 1. BOTTOM TABS FUNCTION
// --------------------------------------------------
const AppTab = () => {
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
          return <Ionicons name={iconName} size={size || 24} color={color} />;
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

// --------------------------------------------------
// 2. AUTH FLOW FUNCTION
// --------------------------------------------------
const AuthScreens = () => {
  return (
    <Stack.Group>
      <Stack.Screen name="SellerRegistration" component={SellerRegistration} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="ForgotPasswordOtp" component={ForgotPasswordOtp} />
      <Stack.Screen name="ResetPassword" component={ResetPassword} />
    </Stack.Group>
  );
};

// --------------------------------------------------
// 3. APP FLOW FUNCTION
// --------------------------------------------------
const AppScreens = () => {
  return (
    <Stack.Group>
      {/* Main Bottom Tabs */}
      <Stack.Screen name="SellerTabs" component={AppTab} />

      {/* Product Flow */}
      <Stack.Screen name="OrderDetails" component={OrderDetails} />
      <Stack.Screen name="ProductDetails" component={ProductDetails} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />
      <Stack.Screen name="EditProduct" component={EditProduct} />
      <Stack.Screen name="Inventory" component={Inventory} />
      <Stack.Screen name="AIProductStudio" component={AIProductStudio} />

      {/* Profile Flow */}
      <Stack.Screen name="StoreInfo" component={StoreInfo} />
      <Stack.Screen name="StorePolicies" component={StorePolicies} />
      <Stack.Screen name="ShippingSettings" component={ShippingSettings} />
      <Stack.Screen name="EditProfile" component={EditProfile} />
      <Stack.Screen name="ContactNumber" component={ContactNumber} />
      <Stack.Screen name="BankDetails" component={BankDetails} />
      <Stack.Screen name="ChangePassword" component={ChangePassword} />
    </Stack.Group>
  );
};

// --------------------------------------------------
// 4. ROOT NAVIGATION
// --------------------------------------------------
const SellerStack = () => {
  const [userToken, setUserToken] = useState(null);
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    // Listen for auth state changes
    const authListener = DeviceEventEmitter.addListener(
      "authStateChanged",
      (token) => {
        setUserToken(token);
        setSplashFinished(true);
      }
    );

    return () => {
      authListener.remove();
    };
  }, []);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!splashFinished ? (
        <Stack.Screen name="Splash" component={Splash} />
      ) : userToken ? (
        AppScreens()
      ) : (
        AuthScreens()
      )}
    </Stack.Navigator>
  );
};

export default SellerStack;

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
