import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  DeviceEventEmitter,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../../constants/theme";
import { BASE_URL } from "../../api/auth";

const Login = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeField, setActiveField] = useState(null);

  // Custom alert configuration state
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success", // success, warning, error
    onPress: null
  });

  const showAlert = (title, message, type = "success", onPress = null) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onPress
    });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
    if (alertConfig.onPress) {
      alertConfig.onPress();
    }
  };

  const validate = () => {
    let tempErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      tempErrors.email = "Email is required";
    } else if (!emailRegex.test(email.trim())) {
      tempErrors.email = "Please enter a valid email address";
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
      const response = await fetch(`${BASE_URL}login`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
        }),
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Server returned invalid response: ${responseText}`);
      }

      if (!response.ok) {
        const error = new Error(responseData.message || "Login failed");
        error.errors = responseData.errors;
        throw error;
      }

      // Check status of account
      const sellerStatus = responseData.seller_status;
      if (sellerStatus !== "approved") {
        showAlert(
          "Account Pending",
          "Your account is currently under verification. Please wait for administrator approval.",
          "warning"
        );
        return;
      }

      // Save auth session
      await AsyncStorage.setItem("isLoggedIn", "true");
      if (responseData.token) {
        await AsyncStorage.setItem("token", responseData.token);
      }

      showAlert("Success", responseData.message || "Login successful!", "success", () => {
        DeviceEventEmitter.emit("authStateChanged", responseData.token);
      });
    } catch (e) {
      console.error("Login error:", e);
      if (e.errors) {
        const errorList = Object.values(e.errors).flat().join("\n");
        showAlert("Validation Error", errorList || e.message, "error");
      } else {
        showAlert("Login Error", e.message || "Something went wrong. Please try again.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
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
                      <Ionicons name="log-in-outline" size={20} color={COLORS.textContrast} style={styles.logInIcon} />
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

      {/* Beautiful Custom Alert Modal */}
      <Modal
        visible={alertConfig.visible}
        transparent
        animationType="fade"
        onRequestClose={hideAlert}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[
              styles.alertIconBg,
              alertConfig.type === "success" && styles.successIconBg,
              alertConfig.type === "warning" && styles.warningIconBg,
              alertConfig.type === "error" && styles.errorIconBg,
            ]}>
              <Ionicons
                name={
                  alertConfig.type === "success"
                    ? "checkmark-circle"
                    : alertConfig.type === "warning"
                    ? "alert-circle"
                    : "close-circle"
                }
                size={40}
                color={
                  alertConfig.type === "success"
                    ? "#2e7d32"
                    : alertConfig.type === "warning"
                    ? "#f57c00"
                    : "#d32f2f"
                }
              />
            </View>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.alertBtn,
                alertConfig.type === "success" && styles.successAlertBtn,
                alertConfig.type === "warning" && styles.warningAlertBtn,
                alertConfig.type === "error" && styles.errorAlertBtn,
              ]}
              onPress={hideAlert}
            >
              <Text style={styles.alertBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  logInIcon: {
    marginLeft: 6,
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
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  alertBox: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  alertIconBg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successIconBg: {
    backgroundColor: "#e8f5e9",
  },
  warningIconBg: {
    backgroundColor: "#fff3e0",
  },
  errorIconBg: {
    backgroundColor: "#ffebee",
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  alertMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  alertBtn: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  successAlertBtn: {
    backgroundColor: "#2e7d32",
  },
  warningAlertBtn: {
    backgroundColor: "#f57c00",
  },
  errorAlertBtn: {
    backgroundColor: "#d32f2f",
  },
  alertBtnText: {
    color: COLORS.textContrast,
    fontSize: 15,
    fontWeight: "700",
  },
});
