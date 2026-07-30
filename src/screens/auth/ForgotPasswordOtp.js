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
import COLORS from "../../constants/theme";

const ForgotPasswordOtp = ({ route, navigation }) => {
  const { email } = route.params || { email: "" };
  
  const [isLoading, setIsLoading] = useState(false);
  const [otpCode, setOtpCode] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [otpError, setOtpError] = useState("");
  const otpInputRefs = useRef([]);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (text, index) => {
    const cleanText = text.replace(/[^0-9]/g, "");
    const newOtp = [...otpCode];
    newOtp[index] = cleanText;
    setOtpCode(newOtp);
    setOtpError("");

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

  const handleVerifyCode = async () => {
    const otpString = otpCode.join("");
    if (otpString.length < 4) {
      setOtpError("Please enter all 4 digits");
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      if (otpString === "9999") {
        navigation.navigate("ResetPassword", { email });
      } else {
        setOtpError("Invalid verification code. Please try again.");
      }
    } catch (err) {
      setOtpError("Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = () => {
    if (timer > 0) return;
    setTimer(30);
    setOtpCode(["", "", "", ""]);
    setOtpError("");
    Alert.alert(
      "Reset Code Sent",
      `A new mock reset code [ 9999 ] has been sent to ${email}.`
    );
  };

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
          <Text style={styles.headerTitle}>Verify Recovery Code</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Banner decoration */}
          <View style={styles.securityBanner}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-open-outline" size={44} color={COLORS.primary} />
            </View>
            <Text style={styles.bannerTitle}>Check Your Inbox</Text>
            <Text style={styles.bannerSubtitle}>
              We have dispatched a verification code. Please type it below to proceed.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.formCard}>
              <Text style={styles.stepTitle}>Enter 4-Digit Code</Text>
              <Text style={styles.stepSubtitle}>
                Verification code sent to {email}
              </Text>

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
                    paddingVertical={0}
                  />
                ))}
              </View>
              {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}

              <View style={styles.resendRow}>
                <Text style={styles.resendText}>Didn't get code? </Text>
                {timer > 0 ? (
                  <Text style={styles.timerText}>Resend in {timer}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleResendCode}>
                    <Text style={styles.resendBtnText}>Resend Code</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.9}
                onPress={handleVerifyCode}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.actionBtnText}>Verify Code</Text>
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

export default ForgotPasswordOtp;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundAlt,
    paddingTop: (Platform.OS === "android" ? StatusBar.currentHeight : 0) + 15,
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
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  otpInputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginVertical: 10,
    marginBottom: 15,
  },
  otpBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.cardBg,
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    paddingVertical: 0,
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
    textAlign: "center",
    marginBottom: 15,
  },
  resendRow: {
    flexDirection: "row",
    marginVertical: 15,
    justifyContent: "center",
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
});
