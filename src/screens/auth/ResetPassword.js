import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../../constants/theme";

const ResetPassword = ({ route, navigation }) => {
  const { email } = route.params || { email: "" };

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeField, setActiveField] = useState(null);

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleResetPassword = async () => {
    let tempErrors = {};
    if (!newPassword) {
      tempErrors.newPassword = "New password is required";
    } else if (newPassword.length < 6) {
      tempErrors.newPassword = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      tempErrors.confirmPassword = "Please confirm your password";
    } else if (confirmPassword !== newPassword) {
      tempErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      return;
    }

    setIsLoading(true);
    try {
      const storedProfile = await AsyncStorage.getItem("sellerProfile");
      let currentProfile = storedProfile ? JSON.parse(storedProfile) : null;

      if (!currentProfile) {
        currentProfile = {
          ownerName: "Hittok Owner",
          email: email,
          phone: "9876543210",
          storeName: "Hittok Store",
          category: "Electronics & Gadgets",
          address: "123 DeeBazar Hub, Sector 5, Kolkata",
          description: "Premium electronics and smart devices store.",
          bankName: "State Bank of India",
          accountNo: "123456789012",
          ifscCode: "SBIN0000123",
          logoUri: "",
          registeredAt: new Date().toISOString(),
        };
      }

      const updatedProfile = {
        ...currentProfile,
        password: newPassword,
      };

      await AsyncStorage.setItem("sellerProfile", JSON.stringify(updatedProfile));

      Alert.alert(
        "Success",
        "Password has been reset successfully! You can now log in.",
        [
          {
            text: "Log In",
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            }
          }
        ]
      );
    } catch (err) {
      Alert.alert("Error", "Could not reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Banner decoration */}
          <View style={styles.securityBanner}>
            <View style={styles.iconCircle}>
              <Ionicons name="key-outline" size={44} color={COLORS.primary} />
            </View>
            <Text style={styles.bannerTitle}>Reset Store Credentials</Text>
            <Text style={styles.bannerSubtitle}>
              Please choose a strong password consisting of letters, numbers, and symbols.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.formCard}>
              <Text style={styles.stepTitle}>Create New Password</Text>
              <Text style={styles.stepSubtitle}>
                Choose a strong, secure password that you don't use elsewhere.
              </Text>

              {/* New Password */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View
                  style={[
                    styles.inputFieldContainer,
                    activeField === "newPassword" && styles.inputFieldFocus,
                    errors.newPassword && styles.inputFieldError,
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="At least 6 characters"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    secureTextEntry={!showNew}
                    value={newPassword}
                    onChangeText={(val) => {
                      setNewPassword(val);
                      if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: null }));
                    }}
                    onFocus={() => setActiveField("newPassword")}
                    onBlur={() => setActiveField(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNew(!showNew)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showNew ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={COLORS.textGrayLight}
                    />
                  </TouchableOpacity>
                </View>
                {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}
              </View>

              {/* Confirm Password */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View
                  style={[
                    styles.inputFieldContainer,
                    activeField === "confirmPassword" && styles.inputFieldFocus,
                    errors.confirmPassword && styles.inputFieldError,
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Re-enter password"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    secureTextEntry={!showConfirm}
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
                    }}
                    onFocus={() => setActiveField("confirmPassword")}
                    onBlur={() => setActiveField(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm(!showConfirm)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showConfirm ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={COLORS.textGrayLight}
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
              </View>

              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.9}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={COLORS.textContrast} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.textContrast} style={styles.btnIcon} />
                    <Text style={styles.actionBtnText}>Reset Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ResetPassword;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundAlt,
    paddingTop: (Platform.OS === "android" ? StatusBar.currentHeight : 0) + 15,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  securityBanner: {
    alignItems: "center",
    marginVertical: 20,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryBgLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  formContainer: {
    paddingHorizontal: 16,
  },
  formCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 20,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSlateDark,
    marginBottom: 8,
  },
  inputFieldContainer: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.borderMedium,
    backgroundColor: COLORS.cardBg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  inputFieldFocus: {
    borderColor: COLORS.primary,
  },
  inputFieldError: {
    borderColor: COLORS.error,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  eyeBtn: {
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: "500",
    marginTop: 5,
  },
  actionBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    elevation: 2,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    marginTop: 10,
  },
  btnIcon: {
    marginRight: 6,
  },
  actionBtnText: {
    color: COLORS.textContrast,
    fontSize: 16,
    fontWeight: "700",
  },
});
