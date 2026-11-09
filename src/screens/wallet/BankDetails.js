import React, { useState, useEffect, useCallback } from "react";
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
  RefreshControl,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { getSellerBankDetails, updateSellerBankDetails } from "../../api/auth";
import {
  validateAccountNumber,
  validateIfscCode,
  validateAccountHolderName,
  validateBankName,
  sanitizeAccountNumber,
  sanitizeIfscCode,
} from "../../utils/bankValidation";

const BankDetails = ({ navigation }) => {
  const { colors } = useTheme();

  // Form states
  const [bankName, setBankName] = useState("");
  const [bankHolderName, setBankHolderName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [upiId, setUpiId] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeField, setActiveField] = useState(null);

  const loadBankData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const res = await getSellerBankDetails();
      if (res?.data) {
        const d = res.data;
        setBankName(d.bank_name || "");
        setBankHolderName(d.account_holder_name || "");
        setAccountNo(d.account_number || "");
        setIfscCode(d.ifsc_code || "");
        setBranchName(d.branch_name || "");
        setUpiId(d.upi_id || "");
      }
    } catch (err) {
      console.warn("Error loading bank details:", err?.message || err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBankData();
  }, [loadBankData]);

  const validate = () => {
    let tempErrors = {};

    // 1. Bank Name (required, max: 255)
    const bankNameCheck = validateBankName(bankName, true);
    if (!bankNameCheck.isValid) {
      tempErrors.bankName = bankNameCheck.error;
    } else if (bankName.trim().length > 255) {
      tempErrors.bankName = "Bank name must not exceed 255 characters";
    }

    // 2. Account Holder Name (required, max: 255)
    const holderCheck = validateAccountHolderName(bankHolderName, true);
    if (!holderCheck.isValid) {
      tempErrors.bankHolderName = holderCheck.error;
    } else if (bankHolderName.trim().length > 255) {
      tempErrors.bankHolderName = "Account holder name must not exceed 255 characters";
    }

    // 3. Account Number (required, max: 20)
    if (!accountNo.trim()) {
      tempErrors.accountNo = "Bank account number is required";
    } else if (accountNo.trim().length > 20) {
      tempErrors.accountNo = "Account number must not exceed 20 characters";
    } else if (!accountNo.includes("*")) {
      const accountCheck = validateAccountNumber(accountNo, true);
      if (!accountCheck.isValid) {
        tempErrors.accountNo = accountCheck.error;
      }
    }

    // 4. IFSC Code (required, max: 11)
    const ifscClean = ifscCode.trim().toUpperCase();
    if (!ifscClean) {
      tempErrors.ifscCode = "IFSC code is required";
    } else if (ifscClean.length > 11) {
      tempErrors.ifscCode = "IFSC code must not exceed 11 characters";
    } else {
      const ifscCheck = validateIfscCode(ifscClean, true);
      if (!ifscCheck.isValid) {
        tempErrors.ifscCode = ifscCheck.error;
      }
    }

    // 5. Branch Name (optional, max: 255)
    if (branchName.trim().length > 255) {
      tempErrors.branchName = "Branch name must not exceed 255 characters";
    }

    // 6. UPI ID (optional, max: 100)
    if (upiId.trim()) {
      if (upiId.trim().length > 100) {
        tempErrors.upiId = "UPI ID must not exceed 100 characters";
      } else {
        const upiRegex = /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/;
        if (!upiRegex.test(upiId.trim())) {
          tempErrors.upiId = "Please enter a valid UPI ID (e.g. username@okhdfcbank)";
        }
      }
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload = {
        account_number: accountNo.trim(),
        ifsc_code: ifscCode.trim().toUpperCase(),
        account_holder_name: bankHolderName.trim(),
        bank_name: bankName.trim(),
        branch_name: branchName.trim() || null,
        upi_id: upiId.trim() || null,
      };

      const res = await updateSellerBankDetails(payload);

      Alert.alert(
        "Success",
        res?.message || "Bank details updated successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              loadBankData();
              navigation.goBack();
            },
          },
        ]
      );
    } catch (err) {
      console.error("Error saving bank details:", err);
      Alert.alert(
        "Validation Error",
        err.message || "Failed to update bank details. Please check all fields."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.backgroundAlt || COLORS.backgroundAlt }]}>
        <ActivityIndicator size="large" color={colors.primary || COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.backgroundAlt || COLORS.backgroundAlt }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.cardBg || COLORS.cardBg, borderBottomColor: colors.borderLight || COLORS.borderLight }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary || COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary || COLORS.textPrimary }]}>Bank Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadBankData(true)}
              colors={[colors.primary || COLORS.primary]}
            />
          }
        >
          {/* Top Banner decoration */}
          <View style={styles.bankBanner}>
            <View style={[styles.cardOutline, { backgroundColor: colors.primaryBgLight || COLORS.primaryBgLight }]}>
              <Ionicons name="card" size={40} color={colors.primary || COLORS.primary} />
            </View>
            <Text style={[styles.bannerTitle, { color: colors.textPrimary || COLORS.textPrimary }]}>
              Payout & Bank Account
            </Text>
            <Text style={[styles.bannerSubtitle, { color: colors.textSecondary || COLORS.textSecondary }]}>
              Add or update your bank account information to receive settlements and payouts directly.
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* 1. Bank Name */}
            <View style={styles.inputWrapper}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: colors.textSlateDark || COLORS.textSlateDark }]}>
                  Bank Name <Text style={styles.requiredStar}>*</Text>
                </Text>
              </View>
              <View
                style={[
                  styles.inputFieldContainer,
                  { backgroundColor: colors.cardBg || COLORS.cardBg, borderColor: colors.borderMedium || COLORS.borderMedium },
                  activeField === "bankName" && { borderColor: colors.primary || COLORS.primary },
                  errors.bankName && styles.inputFieldError,
                ]}
              >
                <Ionicons name="business-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary || COLORS.textPrimary }]}
                  placeholder="e.g. State Bank of India"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  maxLength={255}
                  value={bankName}
                  onChangeText={(val) => {
                    setBankName(val);
                    if (errors.bankName) setErrors((prev) => ({ ...prev, bankName: null }));
                  }}
                  onFocus={() => setActiveField("bankName")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}
            </View>

            {/* 2. Account Holder Name */}
            <View style={styles.inputWrapper}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: colors.textSlateDark || COLORS.textSlateDark }]}>
                  Account Holder Name <Text style={styles.requiredStar}>*</Text>
                </Text>
              </View>
              <View
                style={[
                  styles.inputFieldContainer,
                  { backgroundColor: colors.cardBg || COLORS.cardBg, borderColor: colors.borderMedium || COLORS.borderMedium },
                  activeField === "bankHolderName" && { borderColor: colors.primary || COLORS.primary },
                  errors.bankHolderName && styles.inputFieldError,
                ]}
              >
                <Ionicons name="person-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary || COLORS.textPrimary }]}
                  placeholder="e.g. Rajan Sharma"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  maxLength={255}
                  value={bankHolderName}
                  onChangeText={(val) => {
                    setBankHolderName(val);
                    if (errors.bankHolderName) setErrors((prev) => ({ ...prev, bankHolderName: null }));
                  }}
                  onFocus={() => setActiveField("bankHolderName")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.bankHolderName && <Text style={styles.errorText}>{errors.bankHolderName}</Text>}
            </View>

            {/* 3. Account Number */}
            <View style={styles.inputWrapper}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: colors.textSlateDark || COLORS.textSlateDark }]}>
                  Account Number <Text style={styles.requiredStar}>*</Text>
                </Text>
                {accountNo ? (
                  <Text style={styles.charCounter}>{accountNo.length}/20</Text>
                ) : null}
              </View>
              <View
                style={[
                  styles.inputFieldContainer,
                  { backgroundColor: colors.cardBg || COLORS.cardBg, borderColor: colors.borderMedium || COLORS.borderMedium },
                  activeField === "accountNo" && { borderColor: colors.primary || COLORS.primary },
                  errors.accountNo && styles.inputFieldError,
                ]}
              >
                <Ionicons name="wallet-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary || COLORS.textPrimary }]}
                  placeholder="Enter 9 to 20 digit account number"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  keyboardType="number-pad"
                  maxLength={20}
                  value={accountNo}
                  onChangeText={(val) => {
                    const clean = sanitizeAccountNumber(val);
                    setAccountNo(clean);
                    if (errors.accountNo) setErrors((prev) => ({ ...prev, accountNo: null }));
                  }}
                  onFocus={() => setActiveField("accountNo")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.accountNo && <Text style={styles.errorText}>{errors.accountNo}</Text>}
            </View>

            {/* 4. IFSC Code */}
            <View style={styles.inputWrapper}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: colors.textSlateDark || COLORS.textSlateDark }]}>
                  IFSC Code <Text style={styles.requiredStar}>*</Text>
                </Text>
                {ifscCode ? (
                  <Text style={styles.charCounter}>{ifscCode.length}/11</Text>
                ) : null}
              </View>
              <View
                style={[
                  styles.inputFieldContainer,
                  { backgroundColor: colors.cardBg || COLORS.cardBg, borderColor: colors.borderMedium || COLORS.borderMedium },
                  activeField === "ifscCode" && { borderColor: colors.primary || COLORS.primary },
                  errors.ifscCode && styles.inputFieldError,
                ]}
              >
                <Ionicons name="barcode-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, styles.autoCaps, { color: colors.textPrimary || COLORS.textPrimary }]}
                  placeholder="e.g. SBIN0001234"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={11}
                  value={ifscCode}
                  onChangeText={(val) => {
                    const clean = sanitizeIfscCode(val);
                    setIfscCode(clean);
                    if (errors.ifscCode) setErrors((prev) => ({ ...prev, ifscCode: null }));
                  }}
                  onFocus={() => setActiveField("ifscCode")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.ifscCode && <Text style={styles.errorText}>{errors.ifscCode}</Text>}
            </View>

            {/* 5. Branch Name (Optional) */}
            <View style={styles.inputWrapper}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: colors.textSlateDark || COLORS.textSlateDark }]}>
                  Branch Name <Text style={styles.optionalTag}>(Optional)</Text>
                </Text>
              </View>
              <View
                style={[
                  styles.inputFieldContainer,
                  { backgroundColor: colors.cardBg || COLORS.cardBg, borderColor: colors.borderMedium || COLORS.borderMedium },
                  activeField === "branchName" && { borderColor: colors.primary || COLORS.primary },
                  errors.branchName && styles.inputFieldError,
                ]}
              >
                <Ionicons name="location-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary || COLORS.textPrimary }]}
                  placeholder="e.g. Salt Lake Sector 5, Kolkata"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  maxLength={255}
                  value={branchName}
                  onChangeText={(val) => {
                    setBranchName(val);
                    if (errors.branchName) setErrors((prev) => ({ ...prev, branchName: null }));
                  }}
                  onFocus={() => setActiveField("branchName")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.branchName && <Text style={styles.errorText}>{errors.branchName}</Text>}
            </View>

            {/* 6. UPI ID (Optional) */}
            <View style={styles.inputWrapper}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: colors.textSlateDark || COLORS.textSlateDark }]}>
                  UPI ID / VPA <Text style={styles.optionalTag}>(Optional)</Text>
                </Text>
              </View>
              <View
                style={[
                  styles.inputFieldContainer,
                  { backgroundColor: colors.cardBg || COLORS.cardBg, borderColor: colors.borderMedium || COLORS.borderMedium },
                  activeField === "upiId" && { borderColor: colors.primary || COLORS.primary },
                  errors.upiId && styles.inputFieldError,
                ]}
              >
                <Ionicons name="phone-portrait-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary || COLORS.textPrimary }]}
                  placeholder="e.g. sellername@okhdfcbank"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={100}
                  value={upiId}
                  onChangeText={(val) => {
                    setUpiId(val.trim());
                    if (errors.upiId) setErrors((prev) => ({ ...prev, upiId: null }));
                  }}
                  onFocus={() => setActiveField("upiId")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.upiId && <Text style={styles.errorText}>{errors.upiId}</Text>}
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={[styles.footer, { backgroundColor: colors.cardBg || COLORS.cardBg, borderTopColor: colors.borderLight || COLORS.borderLight }]}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary || COLORS.primary }]}
            activeOpacity={0.88}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={COLORS.textContrast} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.textContrast} style={styles.btnIconMarginRight6} />
                <Text style={styles.saveBtnText}>Save Bank Details</Text>
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
    paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0) + 10,
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
    marginVertical: 20,
    paddingHorizontal: 24,
  },
  cardOutline: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: COLORS.primaryBgLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    marginBottom: 14,
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
  inputWrapper: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  charCounter: {
    fontSize: 12,
    color: COLORS.textGrayLight,
    fontWeight: "500",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSlateDark,
  },
  requiredStar: {
    color: COLORS.error,
    fontWeight: "700",
  },
  optionalTag: {
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.textGrayLight,
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
