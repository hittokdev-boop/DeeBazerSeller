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

const ContactNumber = ({ navigation }) => {
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
  const otpInputRefs = useRef([]);

  useEffect(() => {
    const loadPhone = async () => {
      setIsLoading(true);
      try {
        const storedProfile = await AsyncStorage.getItem("sellerProfile");
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          setCurrentPhone(parsed.phone || "Not Set");
        }
      } catch (err) {
        console.log("Error loading contact", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPhone();
  }, []);

  // Timer countdown
  useEffect(() => {
    let interval = null;
    if (showOtpScreen && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [showOtpScreen, timer]);

  const handleSendOtp = async () => {
    const phoneRegex = /^[0-9]{10}$/;
    if (!newPhone.trim()) {
      setError("Phone number is required");
      return;
    }
    if (!phoneRegex.test(newPhone.trim())) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    if (newPhone.trim() === currentPhone) {
      setError("New phone number cannot be the same as current number");
      return;
    }

    setError("");
    setIsSendingOtp(true);

    try {
      // Simulate network request
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Reset OTP values
      setOtpCode(["", "", "", ""]);
      setTimer(30);
      setOtpError("");
      setShowOtpScreen(true);
      
      // Auto alert the mock code for testing
      Alert.alert(
        "Verification Code",
        `A mock OTP code [ 1234 ] has been sent to +91 ${newPhone}.`
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

    // Move to next input if text is entered
    if (cleanText && index < 3) {
      otpInputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !otpCode[index] && index > 0) {
      const newOtp = [...otpCode];
      newOtp[index - 1] = "";
      setOtpCode(newOtp);
      otpInputRefs.current[index - 1].focus();
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
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (otpString === "1234") {
        // Save to AsyncStorage
        const storedProfile = await AsyncStorage.getItem("sellerProfile");
        const currentProfile = storedProfile ? JSON.parse(storedProfile) : {};

        const updatedProfile = {
          ...currentProfile,
          phone: newPhone.trim(),
        };

        await AsyncStorage.setItem("sellerProfile", JSON.stringify(updatedProfile));

        Alert.alert("Success", "Contact number updated successfully!", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        setOtpError("Invalid verification code. Please try again.");
      }
    } catch (err) {
      setOtpError("Verification failed. Please try again.");
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
            onPress={() => {
              if (showOtpScreen) {
                setShowOtpScreen(false);
              } else {
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {showOtpScreen ? "Verify OTP" : "Contact Number"}
          </Text>
          <View style={{ width: 40 }} />
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
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.actionBtnText}>Send Verification OTP</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
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
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={18} color="#fff" style={{ marginRight: 6 }} />
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
  actionBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
