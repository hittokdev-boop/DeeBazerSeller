import React, { useState, useEffect } from "react";
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

const ChangePassword = ({ navigation }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [storedPassword, setStoredPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeField, setActiveField] = useState(null);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const loadProfileData = async () => {
      setIsLoading(true);
      try {
        const storedProfile = await AsyncStorage.getItem("sellerProfile");
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          // Default fallback password is '123456' if none is stored during registration (mock accounts)
          setStoredPassword(parsed.password || "123456");
        } else {
          setStoredPassword("123456");
        }
      } catch (err) {
        console.log("Error loading password", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, []);

  const validate = () => {
    let tempErrors = {};

    if (!currentPassword) {
      tempErrors.currentPassword = "Current password is required";
    } else if (currentPassword !== storedPassword) {
      tempErrors.currentPassword = "Incorrect current password";
    }

    if (!newPassword) {
      tempErrors.newPassword = "New password is required";
    } else if (newPassword.length < 6) {
      tempErrors.newPassword = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      tempErrors.confirmPassword = "Please confirm your new password";
    } else if (confirmPassword !== newPassword) {
      tempErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const storedProfile = await AsyncStorage.getItem("sellerProfile");
      const currentProfile = storedProfile ? JSON.parse(storedProfile) : {};

      const updatedProfile = {
        ...currentProfile,
        password: newPassword,
      };

      await AsyncStorage.setItem("sellerProfile", JSON.stringify(updatedProfile));
      setStoredPassword(newPassword);

      Alert.alert("Success", "Password updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.log("Error updating password", err);
      Alert.alert("Error", "Failed to update password.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Password</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Banner decoration */}
          <View style={styles.securityBanner}>
            <View style={styles.iconCircle}>
              <Ionicons name="key-outline" size={44} color={COLORS.primary} />
            </View>
            <Text style={styles.bannerTitle}>Reset Store Credentials</Text>
            <Text style={styles.bannerSubtitle}>
              Please choose a strong password consisting of letters, numbers, and symbols to ensure account security.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Current Password */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View
                style={[
                  styles.inputFieldContainer,
                  activeField === "currentPassword" && styles.inputFieldFocus,
                  errors.currentPassword && styles.inputFieldError,
                ]}
              >
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter current password"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  secureTextEntry={!showCurrent}
                  value={currentPassword}
                  onChangeText={(val) => {
                    setCurrentPassword(val);
                    if (errors.currentPassword) {
                      setErrors((prev) => ({ ...prev, currentPassword: null }));
                    }
                  }}
                  onFocus={() => setActiveField("currentPassword")}
                  onBlur={() => setActiveField(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowCurrent(!showCurrent)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showCurrent ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={COLORS.textGrayLight}
                  />
                </TouchableOpacity>
              </View>
              {errors.currentPassword && <Text style={styles.errorText}>{errors.currentPassword}</Text>}
            </View>

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
                  placeholder="Enter new password"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={(val) => {
                    setNewPassword(val);
                    if (errors.newPassword) {
                      setErrors((prev) => ({ ...prev, newPassword: null }));
                    }
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
              <Text style={styles.inputLabel}>Confirm New Password</Text>
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
                  placeholder="Re-enter new password"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (errors.confirmPassword) {
                      setErrors((prev) => ({ ...prev, confirmPassword: null }));
                    }
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
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveBtn}
            activeOpacity={0.9}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="shield-checkmark-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>Update Password</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChangePassword;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundAlt,
    paddingTop: (Platform.OS === "android" ? StatusBar.currentHeight : 0) + 15,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.backgroundAlt,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  securityBanner: {
    alignItems: "center",
    marginVertical: 24,
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
    marginBottom: 8,
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
    paddingVertical: 0,
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
  footer: {
    backgroundColor: COLORS.cardBg,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  saveBtn: {
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
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
