import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SellerBottomNavigation from "./SellerBottomNavigation";
import Splash from "../screens/auth/Splash";
import Login from "../screens/auth/Login";
import SellerRegistration from "../screens/auth/SellerRegistration";
import ProductDetails from "../screens/product/ProductDetails";
import AddProductScreen from "../screens/product/AddProductScreen";
import EditProduct from "../screens/product/EditProduct";
import Inventory from "../screens/product/Inventory";
import AIProductStudio from "../screens/product/AIProductStudio";
import StoreInfo from "../screens/app/StoreInfo";
import EditProfile from "../screens/app/EditProfile";
import ContactNumber from "../screens/app/ContactNumber";
import BankDetails from "../screens/wallet/BankDetails";
import ChangePassword from "../screens/app/ChangePassword";
import ForgotPassword from "../screens/auth/ForgotPassword";
import ForgotPasswordOtp from "../screens/auth/ForgotPasswordOtp";
import ResetPassword from "../screens/auth/ResetPassword";

const Stack = createNativeStackNavigator();

const SellerStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Auth & Boot Flow */}
      <Stack.Screen name="Splash" component={Splash} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="SellerRegistration" component={SellerRegistration} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="ForgotPasswordOtp" component={ForgotPasswordOtp} />
      <Stack.Screen name="ResetPassword" component={ResetPassword} />

      {/* Main Bottom Tabs */}
      <Stack.Screen name="SellerTabs" component={SellerBottomNavigation} />

      {/* Product Flow */}
      <Stack.Screen name="ProductDetails" component={ProductDetails} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />
      <Stack.Screen name="EditProduct" component={EditProduct} />
      <Stack.Screen name="Inventory" component={Inventory} />
      <Stack.Screen name="AIProductStudio" component={AIProductStudio} />

      {/* Profile Flow */}
      <Stack.Screen name="StoreInfo" component={StoreInfo} />
      <Stack.Screen name="EditProfile" component={EditProfile} />
      <Stack.Screen name="ContactNumber" component={ContactNumber} />
      <Stack.Screen name="BankDetails" component={BankDetails} />
      <Stack.Screen name="ChangePassword" component={ChangePassword} />
    </Stack.Navigator>
  );
};

export default SellerStack;
