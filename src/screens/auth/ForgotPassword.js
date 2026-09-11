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

const ForgotPassword = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeField, setActiveField] = useState(null);

  const handleSendCode = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setErrors({ email: "Email address is required" });
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setErrors({ email: "Please enter a valid email address" });
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const storedProfile = await AsyncStorage.getItem("sellerProfile");
      const profile = storedProfile ? JSON.parse(storedProfile) : null;

      if (profile && profile.email.toLowerCase() !== email.trim().toLowerCase()) {
        setErrors({ email: "This email is not registered as a seller" });
        setIsLoading(false);
        return;
      }

      setErrors({});
      const targetEmail = email.trim().toLowerCase();
      
      Alert.alert(
        "Reset Code Sent",
        `A mock reset code [ 9999 ] has been sent to ${targetEmail}.`,
        [
          {
            text: "Verify Code",
            onPress: () => {
              navigation.navigate("ForgotPasswordOtp", { email: targetEmail });
            }
          }
        ]
      );
    } catch (err) {
      setErrors({ email: "Unable to process request. Please try again." });
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
          <Text style={styles.headerTitle}>Password Recovery</Text>
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
              <Ionicons name="shield-keyhole-outline" size={44} color={COLORS.primary} />
            </View>
            <Text style={styles.bannerTitle}>Account Security</Text>
            <Text style={styles.bannerSubtitle}>
              Verification ensures only authorized owners can modify system logins.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.formCard}>
              <Text style={styles.stepTitle}>Recover Password</Text>
              <Text style={styles.stepSubtitle}>
                Enter your business email address and we'll send a code to reset your password.
              </Text>

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
                    placeholder="Enter registered email"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (errors.email) setErrors({});
                    }}
                    onFocus={() => setActiveField("email")}
                    onBlur={() => setActiveField(null)}
                  />
                </View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.9}
                onPress={handleSendCode}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={COLORS.textContrast} />
                ) : (
                  <>
                    <Text style={styles.actionBtnText}>Send Code</Text>
                    <Ionicons name="arrow-forward" size={18} color={COLORS.textContrast} style={styles.actionBtnIcon} />
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

export default ForgotPassword;

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
    paddingVertical: 0,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
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
  actionBtnText: {
    color: COLORS.textContrast,
    fontSize: 16,
    fontWeight: "700",
  },
  actionBtnIcon: {
    marginLeft: 6,
  },
});
