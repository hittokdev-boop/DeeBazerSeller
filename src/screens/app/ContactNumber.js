import React, { useState, useEffect, useRef } from "react";
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
import { useTheme } from "../../context/ThemeContext";
import { updateSellerAccount, getSellerMe } from "../../api/auth";

const ContactNumber = ({ navigation }) => {
  const { colors } = useTheme();
  const [currentPhone, setCurrentPhone] = useState("");
  const [newPhone, setNewPhone] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [error, setError] = useState("");
  const [activeField, setActiveField] = useState(null);

  // OTP State
  const [otpCode, setOtpCode] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [otpError, setOtpError] = useState("");
  const inputRefs = useRef([]);

  useEffect(() => {
    const loadPhoneData = async () => {
      setIsLoading(true);
      try {
        const fresh = await getSellerMe();
        const userObj = fresh?.data?.user || fresh?.data?.seller || fresh?.data;
        if (userObj?.mobile || userObj?.phone) {
          setCurrentPhone(userObj.mobile || userObj.phone || "");
        }
      } catch (err) {
        console.error("Error loading contact number", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPhoneData();
  }, []);

  // Timer countdown
  useEffect(() => {
    let interval;
    if (showOtpScreen && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpScreen, timer]);

  const handleSendOtp = async () => {
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!newPhone.trim() || !phoneRegex.test(newPhone.trim())) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }

    if (newPhone.trim() === currentPhone.trim()) {
      setError("New phone number must be different from current phone number");
      return;
    }

    setError("");
    setIsSendingOtp(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setShowOtpScreen(true);
      setTimer(30);
      setOtpCode(["", "", "", ""]);
      setOtpError("");
      
      Alert.alert(
        "Verification Code Sent",
        `Use OTP [ 1234 ] to verify your new mobile number +91 ${newPhone}.`
      );
    } catch (err) {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpChange = (text, index) => {
    const cleanText = text.replace(/[^0-9]/g, "");
    const newOtp = [...otpCode];
    newOtp[index] = cleanText;
    setOtpCode(newOtp);
    setOtpError("");

    if (cleanText && index < 3) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpString = otpCode.join("");
    if (otpString.length < 4) {
      setOtpError("Please enter all 4 digits");
      return;
    }

    setIsVerifying(true);
    try {
      if (otpString === "1234") {
        await updateSellerAccount({ mobile: newPhone.trim() });
        setCurrentPhone(newPhone.trim());

        Alert.alert("Success", "Contact number updated successfully!", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        setOtpError("Invalid verification code. Please try again.");
      }
    } catch (err) {
      console.error("Verification / update mobile failed:", err);
      setOtpError(err.message || "Verification failed. Please try again.");
      Alert.alert("Error", err.message || "Failed to update contact number.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    
    setTimer(30);
    setOtpCode(["", "", "", ""]);
    setOtpError("");
    
    Alert.alert(
      "Verification Code",
      `A new mock OTP code [ 1234 ] has been sent to +91 ${newPhone}.`
    );
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
            onPress={() => {
              if (showOtpScreen) {
                setShowOtpScreen(false);
              } else {
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {showOtpScreen ? "Verify Number" : "Change Contact Number"}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {!showOtpScreen ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Top Illustration */}
            <View style={styles.illustrationSection}>
              <View style={styles.iconCircle}>
                <Ionicons name="phone-portrait-outline" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.introTitle}>Modify Contact Details</Text>
              <Text style={styles.introSubtitle}>
                Your contact number is used to coordinate delivery pickups and account notifications.
              </Text>
            </View>

            <View style={styles.formContainer}>
              {/* Current Phone */}
              <View style={styles.currentPhoneCard}>
                <Text style={styles.currentPhoneLabel}>Current Phone Number</Text>
                <Text style={styles.currentPhoneValue}>+91 {currentPhone}</Text>
              </View>

              {/* New Phone */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>New Phone Number</Text>
                <View
                  style={[
                    styles.inputFieldContainer,
                    activeField === "newPhone" && styles.inputFieldFocus,
                    error && styles.inputFieldError,
                  ]}
                >
                  <Text style={styles.countryCode}>+91</Text>
                  <View style={styles.divider} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={newPhone}
                    onChangeText={(val) => {
                      setNewPhone(val.replace(/[^0-9]/g, ""));
                      if (error) setError("");
                    }}
                    onFocus={() => setActiveField("newPhone")}
                    onBlur={() => setActiveField(null)}
                  />
                </View>
                {error && <Text style={styles.errorText}>{error}</Text>}
              </View>
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* OTP Section */}
            <View style={styles.illustrationSection}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.introTitle}>Enter Security Code</Text>
              <Text style={styles.introSubtitle}>
                Please enter the 4-digit code sent to +91 {newPhone}
              </Text>
            </View>

            <View style={styles.otpFormContainer}>
              <View style={styles.otpInputRow}>
                {otpCode.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={(ref) => (otpInputRefs.current[idx] = ref)}
                    style={[
                      styles.otpBox,
                      digit !== "" && styles.otpBoxFilled,
                      otpError !== "" && styles.otpBoxError,
                    ]}
                    maxLength={1}
                    keyboardType="number-pad"
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, idx)}
                    onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                    selectTextOnFocus
                  />
                ))}
              </View>
              {otpError && <Text style={styles.otpErrorText}>{otpError}</Text>}

              <View style={styles.resendRow}>
                <Text style={styles.resendText}>Didn't receive code? </Text>
                {timer > 0 ? (
                  <Text style={styles.timerText}>Resend in {timer}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOtp}>
                    <Text style={styles.resendBtnText}>Resend OTP</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        )}

        {/* Action Button Footer */}
        <View style={styles.footer}>
          {!showOtpScreen ? (
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.9}
              onPress={handleSendOtp}
              disabled={isSendingOtp}
            >
              {isSendingOtp ? (
                <ActivityIndicator size="small" color={COLORS.textContrast} />
              ) : (
                <>
                  <Text style={styles.actionBtnText}>Send Verification OTP</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.textContrast} style={styles.btnIconMarginLeft6} />
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.9}
              onPress={handleVerifyOtp}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator size="small" color={COLORS.textContrast} />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={18} color={COLORS.textContrast} style={styles.btnIconMarginRight6} />
                  <Text style={styles.actionBtnText}>Verify & Save</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ContactNumber;

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
  illustrationSection: {
    alignItems: "center",
    marginVertical: 28,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primaryBgLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  formContainer: {
    paddingHorizontal: 16,
  },
  currentPhoneCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: "center",
    elevation: 2,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  currentPhoneLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  currentPhoneValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
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
  countryCode: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textSlate,
  },
  divider: {
    width: 1.5,
    height: 24,
    backgroundColor: COLORS.borderMedium,
    marginHorizontal: 12,
  },
  textInput: {
    flex: 1,
    height: "100%",
    paddingVertical: 0,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: "500",
    marginTop: 5,
  },
  otpFormContainer: {
    paddingHorizontal: 30,
    alignItems: "center",
  },
  otpInputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginVertical: 20,
  },
  otpBox: {
    width: 58,
    height: 58,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.cardBg,
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    paddingVertical: 0,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  otpBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryBgLight,
  },
  otpBoxError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorBgLight,
  },
  otpErrorText: {
    fontSize: 13,
    color: COLORS.error,
    fontWeight: "500",
    marginBottom: 15,
  },
  resendRow: {
    flexDirection: "row",
    marginTop: 10,
    alignItems: "center",
  },
  resendText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  timerText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSlateDark,
  },
  resendBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  footer: {
    backgroundColor: COLORS.cardBg,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
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
  },
  btnIconMarginLeft6: {
    marginLeft: 6,
  },
  btnIconMarginRight6: {
    marginRight: 6,
  },
  actionBtnText: {
    color: COLORS.textContrast,
    fontSize: 16,
    fontWeight: "700",
  },
});
