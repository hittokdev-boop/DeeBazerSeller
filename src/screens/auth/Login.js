import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../../constants/theme";

const Login = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeField, setActiveField] = useState(null);

  const validate = () => {
    let tempErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      tempErrors.email = "Email is required";
    } else if (!emailRegex.test(email.trim())) {
      tempErrors.email = "Please enter a valid email";
    }

    if (!password) {
      tempErrors.password = "Password is required";
    } else if (password.length < 6) {
      tempErrors.password = "Password must be at least 6 characters";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      // Simulate network request
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const storedProfileStr = await AsyncStorage.getItem("sellerProfile");
      let profile = null;

      if (storedProfileStr) {
        profile = JSON.parse(storedProfileStr);
      }

      // Check credentials:
      // If a profile exists, check if email matches.
      // If no profile exists, create a default mock profile.
      if (profile) {
        if (profile.email.toLowerCase() === email.trim().toLowerCase()) {
          // Successfully logged in
          await AsyncStorage.setItem("isLoggedIn", "true");
          navigation.replace("SellerTabs");
        } else {
          Alert.alert(
            "Account Not Found",
            "We couldn't find a seller registered with this email. Do you want to register a new account?",
            [
              { text: "Try Again", style: "cancel" },
              { text: "Register", onPress: () => navigation.navigate("SellerRegistration") }
            ]
          );
        }
      } else {
        // Fallback testing account
        const mockProfile = {
          ownerName: "Hittok Owner",
          email: email.trim().toLowerCase(),
          phone: "9876543210",
          storeName: "Hittok Store",
          category: "Electronics & Gadgets",
          address: "123 DeeBazar Hub, Sector 5, Kolkata",
          description: "Premium electronics and smart devices store on DeeBazar.",
          bankName: "State Bank of India",
          accountNo: "123456789012",
          ifscCode: "SBIN0000123",
          logoUri: "",
          registeredAt: new Date().toISOString(),
        };

        await AsyncStorage.setItem("isRegistered", "true");
        await AsyncStorage.setItem("isLoggedIn", "true");
        await AsyncStorage.setItem("sellerProfile", JSON.stringify(mockProfile));
        navigation.replace("SellerTabs");
      }
    } catch (e) {
      Alert.alert("Login Error", "Something went wrong. Please check connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* Top Banner section */}
          <LinearGradient
            colors={COLORS.primaryGradient}
            style={styles.headerBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <View style={styles.logoBadge}>
                <Ionicons name="storefront" size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.appName}>DeeBazar</Text>
              <Text style={styles.appTagline}>Merchant Login Portal</Text>
            </View>
          </LinearGradient>

          {/* Form Card Container */}
          <View style={styles.formContainer}>
            <View style={styles.loginCard}>
              <Text style={styles.welcomeTitle}>Welcome Back</Text>
              <Text style={styles.welcomeSubtitle}>Sign in to manage your shop and orders</Text>

              {/* Email field */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Business Email</Text>
                <View
                  style={[
                    styles.inputFieldContainer,
                    activeField === "email" && styles.inputFieldFocus,
                    errors.email && styles.inputFieldError,
                  ]}
                >
                  <Ionicons name="mail-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter email address"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                    }}
                    onFocus={() => setActiveField("email")}
                    onBlur={() => setActiveField(null)}
                  />
                </View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              {/* Password field */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Password</Text>
                <View
                  style={[
                    styles.inputFieldContainer,
                    activeField === "password" && styles.inputFieldFocus,
                    errors.password && styles.inputFieldError,
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter password"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                    }}
                    onFocus={() => setActiveField("password")}
                    onBlur={() => setActiveField(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={COLORS.textGrayLight}
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              {/* Forgot Password */}
              <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate("ForgotPassword")}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.loginBtn}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={COLORS.primaryGradient}
                  style={styles.loginBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={COLORS.textContrast} />
                  ) : (
                    <>
                      <Text style={styles.loginBtnText}>Log In</Text>
                      <Ionicons name="log-in-outline" size={20} color={COLORS.textContrast} style={{ marginLeft: 6 }} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Bottom Register Redirection */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerLabel}>Don't have a seller account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("SellerRegistration")}>
                <Text style={styles.registerLink}>Register Shop</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerBanner: {
    height: 250,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: (Platform.OS === "android" ? StatusBar.currentHeight : 0) + 15,
  },
  headerContent: {
    alignItems: "center",
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.cardBg,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginBottom: 12,
  },
  appName: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.textContrast,
    letterSpacing: 1.5,
  },
  appTagline: {
    fontSize: 12,
    color: COLORS.primaryLight,
    fontWeight: "600",
    marginTop: 4,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -40,
    paddingBottom: 40,
  },
  loginCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 24,
    elevation: 8,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 26,
  },
  inputWrapper: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSlate,
    marginBottom: 8,
  },
  inputFieldContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 12,
  },
  inputFieldFocus: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.cardBg,
  },
  inputFieldError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorBgLight,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 8,
  },
  eyeBtn: {
    padding: 8,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.error,
    marginTop: 6,
    fontWeight: "500",
    marginLeft: 4,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
  },
  loginBtn: {
    height: 52,
    borderRadius: 12,
    overflow: "hidden",
  },
  loginBtnGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  loginBtnText: {
    color: COLORS.textContrast,
    fontSize: 16,
    fontWeight: "700",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  registerLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  registerLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "700",
  },
});
