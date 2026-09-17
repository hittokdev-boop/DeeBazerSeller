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
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { getSellerProfile, updateSellerProfile } from "../../api/auth";

const BankDetails = ({ navigation }) => {
  const { colors } = useTheme();
  const [gstin, setGstin] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [ifscCode, setIfscCode] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeField, setActiveField] = useState(null);

  useEffect(() => {
    const loadBankData = async () => {
      setIsLoading(true);
      try {
        const res = await getSellerProfile();
        if (res?.data) {
          const d = res.data;
          setGstin(d.gstin || d.gst_number || "");
          setBankName(d.bank_name || d.bankName || "");
          setAccountNo(d.bank_account_number || d.accountNo || d.account_number || "");
          setIfscCode(d.bank_ifsc_code || d.ifscCode || d.ifsc_code || "");
        }
      } catch (err) {
        console.error("Error loading bank details", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBankData();
  }, []);

  const validate = () => {
    let tempErrors = {};
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    if (gstin.trim() && !gstinRegex.test(gstin.trim().toUpperCase())) {
      tempErrors.gstin = "Format must match a 15-character GSTIN (e.g. 19AAAAA0000A1Z5)";
    }
    if (!bankName.trim()) {
      tempErrors.bankName = "Bank name is required";
    }
    if (!accountNo.trim() || accountNo.trim().length < 9) {
      tempErrors.accountNo = "Enter a valid bank account number (9+ digits)";
    }
    if (!ifscCode.trim() || !ifscRegex.test(ifscCode.trim().toUpperCase())) {
      tempErrors.ifscCode = "Enter a valid 11-digit IFSC code (e.g. SBIN0001234)";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      await updateSellerProfile({
        gstin: gstin.trim().toUpperCase(),
        gst_number: gstin.trim().toUpperCase(),
        bank_name: bankName.trim(),
        bank_account_number: accountNo.trim(),
        bank_ifsc_code: ifscCode.trim().toUpperCase(),
      });

      Alert.alert("Success", "Bank details updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error("Error saving bank details", err);
      Alert.alert("Notice", err.message || "Failed to update bank details.");
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Bank Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Banner decoration */}
          <View style={styles.bankBanner}>
            <View style={styles.cardOutline}>
              <Ionicons name="card" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.bannerTitle}>Payout & Tax Information</Text>
            <Text style={styles.bannerSubtitle}>
              Please enter valid bank details to ensure timely payouts for your completed orders.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* GSTIN (Optional) */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>GSTIN (Optional)</Text>
              <View
                style={[
                  styles.inputFieldContainer,
                  activeField === "gstin" && styles.inputFieldFocus,
                  errors.gstin && styles.inputFieldError,
                ]}
              >
                <Ionicons name="document-text-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, styles.autoCaps]}
                  placeholder="Enter 15-character GSTIN number"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  autoCapitalize="characters"
                  maxLength={15}
                  value={gstin}
                  onChangeText={setGstin}
                  onFocus={() => setActiveField("gstin")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.gstin && <Text style={styles.errorText}>{errors.gstin}</Text>}
            </View>

            {/* Bank Name */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Bank Name</Text>
              <View
                style={[
                  styles.inputFieldContainer,
                  activeField === "bankName" && styles.inputFieldFocus,
                  errors.bankName && styles.inputFieldError,
                ]}
              >
                <Ionicons name="business-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. State Bank of India"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  value={bankName}
                  onChangeText={setBankName}
                  onFocus={() => setActiveField("bankName")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}
            </View>

            {/* Account Number */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Account Number</Text>
              <View
                style={[
                  styles.inputFieldContainer,
                  activeField === "accountNo" && styles.inputFieldFocus,
                  errors.accountNo && styles.inputFieldError,
                ]}
              >
                <Ionicons name="wallet-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter account number"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  keyboardType="numeric"
                  value={accountNo}
                  onChangeText={(val) => setAccountNo(val.replace(/[^0-9]/g, ""))}
                  onFocus={() => setActiveField("accountNo")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.accountNo && <Text style={styles.errorText}>{errors.accountNo}</Text>}
            </View>

            {/* IFSC Code */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>IFSC Code</Text>
              <View
                style={[
                  styles.inputFieldContainer,
                  activeField === "ifscCode" && styles.inputFieldFocus,
                  errors.ifscCode && styles.inputFieldError,
                ]}
              >
                <Ionicons name="barcode-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, styles.autoCaps]}
                  placeholder="e.g. SBIN0001234"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  autoCapitalize="characters"
                  maxLength={11}
                  value={ifscCode}
                  onChangeText={setIfscCode}
                  onFocus={() => setActiveField("ifscCode")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.ifscCode && <Text style={styles.errorText}>{errors.ifscCode}</Text>}
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
              <ActivityIndicator size="small" color={COLORS.textContrast} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.textContrast} style={styles.btnIconMarginRight6} />
                <Text style={styles.saveBtnText}>Save Account Details</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default BankDetails;

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
  bankBanner: {
    alignItems: "center",
    marginVertical: 24,
    paddingHorizontal: 24,
  },
  cardOutline: {
    width: 80,
    height: 80,
    borderRadius: 20,
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
  autoCaps: {
    autoCapitalize: "characters",
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
});
