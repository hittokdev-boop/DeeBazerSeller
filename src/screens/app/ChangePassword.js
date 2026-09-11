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
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { updateSellerAccount } from "../../api/auth";

const ChangePassword = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeField, setActiveField] = useState(null);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: "success",
    title: "",
    message: "",
    buttonText: "Okay",
    onConfirm: null,
  });

  const showAlert = ({
    type = "success",
    title = "",
    message = "",
    buttonText = "Okay",
    onConfirm = null,
  }) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message,
      buttonText,
      onConfirm,
    });
  };

  const hideAlert = () => {
    const callback = alertConfig.onConfirm;
    setAlertConfig((prev) => ({ ...prev, visible: false }));
    if (callback) {
      setTimeout(() => {
        callback();
      }, 200);
    }
  };

  const validate = () => {
    let tempErrors = {};

    if (!currentPassword) {
      tempErrors.currentPassword = "Current password is required";
    }

    if (!newPassword || newPassword.length < 6) {
      tempErrors.newPassword = "New password must be at least 6 characters";
    } else if (newPassword === currentPassword) {
      tempErrors.newPassword = "New password must be different from current password";
    }

    if (!confirmPassword) {
      tempErrors.confirmPassword = "Confirmation password is required";
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
      const response = await updateSellerAccount({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      showAlert({
        type: "success",
        title: "Password Changed!",
        message: response?.message || "Your account password has been changed successfully.",
        buttonText: "Done",
        onConfirm: () => navigation.goBack(),
      });
    } catch (err) {
      console.log("Error saving password", err);
      if (err?.data?.errors) {
        const fieldErrors = {};
        if (err.data.errors.current_password) fieldErrors.currentPassword = err.data.errors.current_password[0];
        if (err.data.errors.password) fieldErrors.newPassword = err.data.errors.password[0];
        if (err.data.errors.password_confirmation) fieldErrors.confirmPassword = err.data.errors.password_confirmation[0];
        setErrors(fieldErrors);
      }
      showAlert({
        type: "error",
        title: "Update Failed",
        message: err.message || "Failed to update password. Please check your inputs.",
        buttonText: "Try Again",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.backgroundAlt }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.backgroundAlt }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.borderLight }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Change Password</Text>
          <View style={styles.headerSpacer} />
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
        <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: colors.borderLight }]}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.9}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={COLORS.textContrast} />
            ) : (
              <>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.textContrast} style={styles.btnIconMarginRight6} />
                <Text style={styles.saveBtnText}>Update Password</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Custom Alert Modal */}
      <Modal
        visible={alertConfig.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideAlert}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.alertCard,
              {
                backgroundColor: colors.cardBg,
                borderColor: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
              },
            ]}
          >
            {/* Animated Badge Icon */}
            <View
              style={[
                styles.alertIconWrapper,
                alertConfig.type === "success"
                  ? styles.alertIconWrapperSuccess
                  : styles.alertIconWrapperError,
              ]}
            >
              <View
                style={[
                  styles.alertIconInner,
                  alertConfig.type === "success"
                    ? styles.alertIconInnerSuccess
                    : styles.alertIconInnerError,
                ]}
              >
                <Ionicons
                  name={
                    alertConfig.type === "success"
                      ? "checkmark"
                      : alertConfig.type === "error"
                      ? "alert"
                      : "information"
                  }
                  size={26}
                  color="#FFFFFF"
                />
              </View>
            </View>

            <Text style={[styles.alertTitle, { color: colors.textPrimary }]}>
              {alertConfig.title}
            </Text>

            <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>
              {alertConfig.message}
            </Text>

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.alertBtn,
                alertConfig.type === "success"
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: "#EF4444" },
              ]}
              activeOpacity={0.88}
              onPress={hideAlert}
            >
              <Text style={styles.alertBtnText}>{alertConfig.buttonText || "Okay"}</Text>
              <Ionicons
                name={
                  alertConfig.type === "success"
                    ? "arrow-forward"
                    : "refresh-outline"
                }
                size={18}
                color="#FFFFFF"
                style={styles.alertBtnIcon}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ChangePassword;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundAlt,
    paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0) + 20,
  },
  keyboardContainer: {
    flex: 1,
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
  btnIconMarginRight6: {
    marginRight: 6,
  },
  saveBtnText: {
    color: COLORS.textContrast,
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  alertCard: {
    width: "100%",
    maxWidth: 330,
    borderRadius: 24,
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: "center",
    borderWidth: 1,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  alertIconWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  alertIconWrapperSuccess: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  alertIconWrapperError: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  alertIconInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  alertIconInnerSuccess: {
    backgroundColor: "#10B981",
  },
  alertIconInnerError: {
    backgroundColor: "#EF4444",
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  alertBtn: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  alertBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  alertBtnIcon: {
    marginLeft: 6,
  },
});
