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
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { getSellerProfile, updateStorePolicies } from "../../api/auth";

const POLICY_TEMPLATES = {
  return_policy: [
    "7-day hassle-free replacement or return for defective items.",
    "Items can be returned within 10 days of delivery if in original condition.",
    "No returns accepted for perishable or customized goods.",
  ],
  shipping_policy: [
    "Orders are processed and dispatched within 24 to 48 business hours.",
    "Standard delivery takes 3-5 business days. Express shipping available.",
    "Free shipping on all prepaid orders above ₹499.",
  ],
  privacy_policy: [
    "We strictly protect your personal details and never share customer data with third parties.",
    "Customer phone numbers and shipping addresses are only used for order fulfillment.",
  ],
};

const StorePolicies = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();

  const [returnPolicy, setReturnPolicy] = useState("");
  const [shippingPolicy, setShippingPolicy] = useState("");
  const [privacyPolicy, setPrivacyPolicy] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [errors, setErrors] = useState({});

  // Custom Alert Modal State
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

  useEffect(() => {
    const loadPolicies = async () => {
      setIsLoading(true);
      try {
        // Try local storage cache
        const storedProfile = await AsyncStorage.getItem("sellerProfile");
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          if (parsed.store_policies) {
            setReturnPolicy(parsed.store_policies.return_policy || "");
            setShippingPolicy(parsed.store_policies.shipping_policy || "");
            setPrivacyPolicy(parsed.store_policies.privacy_policy || "");
          }
        }

        // Fetch fresh profile from GET /api/seller/profile
        try {
          const res = await getSellerProfile();
          if (res?.data?.store_policies) {
            const sp = res.data.store_policies;
            setReturnPolicy(sp.return_policy || "");
            setShippingPolicy(sp.shipping_policy || "");
            setPrivacyPolicy(sp.privacy_policy || "");
          }
        } catch (apiErr) {
          console.log("Could not load fresh policies from server:", apiErr);
        }
      } catch (err) {
        console.log("Error loading store policies", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPolicies();
  }, []);

  const validate = () => {
    let tempErrors = {};
    if (returnPolicy.length > 2000) {
      tempErrors.returnPolicy = "Return policy cannot exceed 2000 characters.";
    }
    if (shippingPolicy.length > 2000) {
      tempErrors.shippingPolicy = "Shipping policy cannot exceed 2000 characters.";
    }
    if (privacyPolicy.length > 2000) {
      tempErrors.privacyPolicy = "Privacy policy cannot exceed 2000 characters.";
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload = {
        return_policy: returnPolicy.trim(),
        shipping_policy: shippingPolicy.trim(),
        privacy_policy: privacyPolicy.trim(),
      };

      const response = await updateStorePolicies(payload);

      // Update local storage
      const storedProfile = await AsyncStorage.getItem("sellerProfile");
      const currentProfile = storedProfile ? JSON.parse(storedProfile) : {};
      const updatedProfile = {
        ...currentProfile,
        store_policies: {
          return_policy: returnPolicy.trim(),
          shipping_policy: shippingPolicy.trim(),
          privacy_policy: privacyPolicy.trim(),
        },
      };
      await AsyncStorage.setItem("sellerProfile", JSON.stringify(updatedProfile));

      showAlert({
        type: "success",
        title: "Policies Saved!",
        message: response?.message || "Your store policies have been updated successfully.",
        buttonText: "Done",
        onConfirm: () => navigation.goBack(),
      });
    } catch (err) {
      console.log("Error updating policies", err);

      let userFriendlyMsg = err.message || "Failed to update store policies. Please try again.";
      if (typeof userFriendlyMsg === "string" && userFriendlyMsg.includes("Unknown column 'store_policies'")) {
        userFriendlyMsg =
          "Backend Database Notice:\nThe 'store_policies' column is not created in the database on the server yet. We've saved your policies locally for now. Please ask backend admin to add the column.";
        
        // Save locally as fallback
        const storedProfile = await AsyncStorage.getItem("sellerProfile");
        const currentProfile = storedProfile ? JSON.parse(storedProfile) : {};
        const updatedProfile = {
          ...currentProfile,
          store_policies: {
            return_policy: returnPolicy.trim(),
            shipping_policy: shippingPolicy.trim(),
            privacy_policy: privacyPolicy.trim(),
          },
        };
        await AsyncStorage.setItem("sellerProfile", JSON.stringify(updatedProfile));
      }

      showAlert({
        type: "error",
        title: "Server Database Notice",
        message: userFriendlyMsg,
        buttonText: "Okay",
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
        <View
          style={[
            styles.header,
            { backgroundColor: colors.cardBg, borderBottomColor: colors.borderLight },
          ]}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Store Policies</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Banner Info */}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: isDarkMode ? "rgba(99, 102, 241, 0.12)" : "#EEF2FF",
                borderColor: isDarkMode ? "rgba(99, 102, 241, 0.25)" : "#C7D2FE",
              },
            ]}
          >
            <Ionicons name="shield-checkmark" size={24} color={colors.primary} style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
                Customer Transparency
              </Text>
              <Text style={[styles.infoSubtitle, { color: colors.textSecondary }]}>
                Clear policies build buyer trust and reduce disputes. These policies are shown on your product and store pages.
              </Text>
            </View>
          </View>

          {/* Policy 1: Return & Refund Policy */}
          <View
            style={[
              styles.policyCard,
              { backgroundColor: colors.cardBg, borderColor: colors.borderLight },
            ]}
          >
            <View style={styles.policyHeader}>
              <View style={[styles.policyIconBox, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
                <Ionicons name="repeat-outline" size={20} color="#EF4444" />
              </View>
              <View style={styles.policyTitleBox}>
                <Text style={[styles.policyTitle, { color: colors.textPrimary }]}>
                  Return & Refund Policy
                </Text>
                <Text style={[styles.policySubtitle, { color: colors.textSecondary }]}>
                  Specify return window, refund conditions, and requirements
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.textareaContainer,
                { backgroundColor: colors.backgroundAlt, borderColor: colors.borderMedium || "#CBD5E1" },
                activeField === "returnPolicy" && { borderColor: colors.primary },
                errors.returnPolicy && styles.inputFieldError,
              ]}
            >
              <TextInput
                style={[styles.textarea, { color: colors.textPrimary }]}
                placeholder="e.g. 7-day replacement accepted if item is damaged or not as described..."
                placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                multiline
                numberOfLines={4}
                maxLength={2000}
                value={returnPolicy}
                onChangeText={setReturnPolicy}
                onFocus={() => setActiveField("returnPolicy")}
                onBlur={() => setActiveField(null)}
              />
              <Text style={[styles.charCounter, { color: colors.textSecondary }]}>
                {returnPolicy.length}/2000
              </Text>
            </View>
            {errors.returnPolicy && <Text style={styles.errorText}>{errors.returnPolicy}</Text>}

            {/* Quick Templates */}
            <View style={styles.templateContainer}>
              <Text style={[styles.templateLabel, { color: colors.textSecondary }]}>
                Quick suggestion:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {POLICY_TEMPLATES.return_policy.map((tpl, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.templateChip, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight }]}
                    onPress={() => setReturnPolicy((prev) => (prev ? `${prev}\n${tpl}` : tpl))}
                  >
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <Text style={[styles.templateText, { color: colors.textPrimary }]} numberOfLines={1}>
                      {tpl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Policy 2: Shipping & Delivery Policy */}
          <View
            style={[
              styles.policyCard,
              { backgroundColor: colors.cardBg, borderColor: colors.borderLight },
            ]}
          >
            <View style={styles.policyHeader}>
              <View style={[styles.policyIconBox, { backgroundColor: "rgba(59, 130, 246, 0.12)" }]}>
                <Ionicons name="airplane-outline" size={20} color="#3B82F6" />
              </View>
              <View style={styles.policyTitleBox}>
                <Text style={[styles.policyTitle, { color: colors.textPrimary }]}>
                  Shipping & Delivery Policy
                </Text>
                <Text style={[styles.policySubtitle, { color: colors.textSecondary }]}>
                  Dispatch timelines, courier partners, and shipping rates
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.textareaContainer,
                { backgroundColor: colors.backgroundAlt, borderColor: colors.borderMedium || "#CBD5E1" },
                activeField === "shippingPolicy" && { borderColor: colors.primary },
                errors.shippingPolicy && styles.inputFieldError,
              ]}
            >
              <TextInput
                style={[styles.textarea, { color: colors.textPrimary }]}
                placeholder="e.g. Orders dispatched within 24 hours. Standard delivery 3-5 days..."
                placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                multiline
                numberOfLines={4}
                maxLength={2000}
                value={shippingPolicy}
                onChangeText={setShippingPolicy}
                onFocus={() => setActiveField("shippingPolicy")}
                onBlur={() => setActiveField(null)}
              />
              <Text style={[styles.charCounter, { color: colors.textSecondary }]}>
                {shippingPolicy.length}/2000
              </Text>
            </View>
            {errors.shippingPolicy && <Text style={styles.errorText}>{errors.shippingPolicy}</Text>}

            {/* Quick Templates */}
            <View style={styles.templateContainer}>
              <Text style={[styles.templateLabel, { color: colors.textSecondary }]}>
                Quick suggestion:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {POLICY_TEMPLATES.shipping_policy.map((tpl, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.templateChip, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight }]}
                    onPress={() => setShippingPolicy((prev) => (prev ? `${prev}\n${tpl}` : tpl))}
                  >
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <Text style={[styles.templateText, { color: colors.textPrimary }]} numberOfLines={1}>
                      {tpl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Policy 3: Privacy & Security Policy */}
          <View
            style={[
              styles.policyCard,
              { backgroundColor: colors.cardBg, borderColor: colors.borderLight },
            ]}
          >
            <View style={styles.policyHeader}>
              <View style={[styles.policyIconBox, { backgroundColor: "rgba(16, 185, 129, 0.12)" }]}>
                <Ionicons name="lock-closed-outline" size={20} color="#10B981" />
              </View>
              <View style={styles.policyTitleBox}>
                <Text style={[styles.policyTitle, { color: colors.textPrimary }]}>
                  Privacy & Data Policy (Optional)
                </Text>
                <Text style={[styles.policySubtitle, { color: colors.textSecondary }]}>
                  How you safeguard buyer personal and contact information
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.textareaContainer,
                { backgroundColor: colors.backgroundAlt, borderColor: colors.borderMedium || "#CBD5E1" },
                activeField === "privacyPolicy" && { borderColor: colors.primary },
                errors.privacyPolicy && styles.inputFieldError,
              ]}
            >
              <TextInput
                style={[styles.textarea, { color: colors.textPrimary }]}
                placeholder="e.g. We respect customer privacy and do not sell customer data..."
                placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                multiline
                numberOfLines={4}
                maxLength={2000}
                value={privacyPolicy}
                onChangeText={setPrivacyPolicy}
                onFocus={() => setActiveField("privacyPolicy")}
                onBlur={() => setActiveField(null)}
              />
              <Text style={[styles.charCounter, { color: colors.textSecondary }]}>
                {privacyPolicy.length}/2000
              </Text>
            </View>
            {errors.privacyPolicy && <Text style={styles.errorText}>{errors.privacyPolicy}</Text>}

            {/* Quick Templates */}
            <View style={styles.templateContainer}>
              <Text style={[styles.templateLabel, { color: colors.textSecondary }]}>
                Quick suggestion:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {POLICY_TEMPLATES.privacy_policy.map((tpl, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.templateChip, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight }]}
                    onPress={() => setPrivacyPolicy((prev) => (prev ? `${prev}\n${tpl}` : tpl))}
                  >
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <Text style={[styles.templateText, { color: colors.textPrimary }]} numberOfLines={1}>
                      {tpl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </ScrollView>

        {/* Footer Button */}
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.cardBg, borderTopColor: colors.borderLight },
          ]}
        >
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
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={COLORS.textContrast}
                  style={styles.btnIconMarginRight6}
                />
                <Text style={styles.saveBtnText}>Save Policies</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

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
                    name={alertConfig.type === "success" ? "checkmark" : "alert"}
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
                  name={alertConfig.type === "success" ? "arrow-forward" : "refresh-outline"}
                  size={18}
                  color="#FFFFFF"
                  style={styles.alertBtnIcon}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default StorePolicies;

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
    padding: 16,
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  infoSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  policyCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  policyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  policyIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  policyTitleBox: {
    flex: 1,
  },
  policyTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  policySubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  textareaContainer: {
    minHeight: 110,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    position: "relative",
  },
  inputFieldError: {
    borderColor: COLORS.error,
  },
  textarea: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlignVertical: "top",
    paddingTop: 0,
    paddingBottom: 16,
  },
  charCounter: {
    position: "absolute",
    bottom: 6,
    right: 10,
    fontSize: 11,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: "500",
    marginTop: 4,
  },
  templateContainer: {
    marginTop: 10,
  },
  templateLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
  },
  templateChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    maxWidth: 240,
  },
  templateText: {
    fontSize: 11,
    marginLeft: 4,
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
  // Custom Alert Modal
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
