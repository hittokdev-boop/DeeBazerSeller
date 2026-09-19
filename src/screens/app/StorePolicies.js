import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  RefreshControl,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import {
  getStorePoliciesList,
  getSellerStorePolicy,
  updateStorePolicy,
} from "../../api/auth";

const DEFAULT_POLICIES = [
  {
    id: 5,
    title: "No Return",
    return_days: 0,
    description: "Products are not eligible for return.",
  },
  {
    id: 1,
    title: "7 Days Return",
    return_days: 7,
    description: "Customers can return eligible products within 7 days of delivery.",
  },
  {
    id: 2,
    title: "10 Days Return",
    return_days: 10,
    description: "Customers can return eligible products within 10 days of delivery.",
  },
  {
    id: 3,
    title: "15 Days Return",
    return_days: 15,
    description: "Customers can return eligible products within 15 days of delivery.",
  },
  {
    id: 4,
    title: "30 Days Return",
    return_days: 30,
    description: "Customers can return eligible products within 30 days of delivery.",
  },
];

const StorePolicies = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();

  const [policies, setPolicies] = useState(DEFAULT_POLICIES);
  const [selectedPolicyId, setSelectedPolicyId] = useState(1);
  const [activePolicy, setActivePolicy] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const loadData = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      // 1. Fetch available store return policy list
      const listRes = await getStorePoliciesList();
      let policyItems = DEFAULT_POLICIES;
      if (Array.isArray(listRes?.data) && listRes.data.length > 0) {
        policyItems = listRes.data;
        setPolicies(listRes.data);
      }

      // 2. Fetch current active policy for the seller
      try {
        const currentRes = await getSellerStorePolicy();
        const curData = currentRes?.data;
        if (curData?.store_policy_id) {
          setSelectedPolicyId(curData.store_policy_id);
          const found = policyItems.find((p) => p.id === curData.store_policy_id);
          if (found) {
            setActivePolicy(found);
          } else if (curData.policies) {
            setActivePolicy({
              id: curData.store_policy_id,
              title: curData.policies.title,
              return_days: curData.policies.return_days,
              description: curData.policies.description,
            });
          }
        }
      } catch (curErr) {
        console.warn("Notice: Could not load current store policy:", curErr?.message || curErr);
      }
    } catch (err) {
      console.warn("Notice: Error loading store policies list:", err?.message || err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(false);
  };

  const handleSave = async () => {
    if (!selectedPolicyId) {
      showAlert({
        type: "error",
        title: "Selection Required",
        message: "Please select a return policy for your store.",
        buttonText: "Okay",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await updateStorePolicy(selectedPolicyId);

      const chosen = policies.find((p) => p.id === selectedPolicyId);
      if (chosen) setActivePolicy(chosen);

      showAlert({
        type: "success",
        title: "Store Policy Saved!",
        message:
          response?.message ||
          "Your store return policy has been updated successfully.",
        buttonText: "Done",
        onConfirm: () => navigation.goBack(),
      });
    } catch (err) {
      console.warn("Error updating store policy:", err?.message || err);

      showAlert({
        type: "error",
        title: "Update Failed",
        message: err?.message || "Failed to update store policy. Please try again.",
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

  const currentSelection = policies.find((p) => p.id === selectedPolicyId);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.backgroundAlt }]}>
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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Transparency Banner */}
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
              Customer Return Policy
            </Text>
            <Text style={[styles.infoSubtitle, { color: colors.textSecondary }]}>
              Select the return and refund policy applied to orders in your store. This policy is displayed to buyers on checkout and product pages.
            </Text>
          </View>
        </View>

        {/* Currently Active Policy Card */}
        {activePolicy && (
          <View
            style={[
              styles.activePolicyCard,
              { backgroundColor: colors.cardBg, borderColor: colors.borderLight },
            ]}
          >
            <View style={styles.activeCardTopRow}>
              <View style={[styles.activeTag, { backgroundColor: colors.primaryBgLight }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.activeTagText, { color: colors.primary }]}>
                  Current Active Policy
                </Text>
              </View>
              <View
                style={[
                  styles.daysBadge,
                  activePolicy.return_days === 0
                    ? { backgroundColor: "rgba(239, 68, 68, 0.12)" }
                    : { backgroundColor: "rgba(16, 185, 129, 0.12)" },
                ]}
              >
                <Text
                  style={[
                    styles.daysBadgeText,
                    activePolicy.return_days === 0
                      ? { color: "#EF4444" }
                      : { color: "#10B981" },
                  ]}
                >
                  {activePolicy.return_days === 0 ? "No Returns" : `${activePolicy.return_days} Days Window`}
                </Text>
              </View>
            </View>

            <Text style={[styles.activeTitle, { color: colors.textPrimary }]}>
              {activePolicy.title}
            </Text>
            <Text style={[styles.activeDesc, { color: colors.textSecondary }]}>
              {activePolicy.description}
            </Text>
          </View>
        )}

        {/* Selectable Policy List Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Available Return Policies
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Choose one policy to apply to all eligible products
          </Text>
        </View>

        <View style={styles.policyListContainer}>
          {policies.map((policy) => {
            const isSelected = selectedPolicyId === policy.id;
            const isZeroReturn = policy.return_days === 0;

            return (
              <TouchableOpacity
                key={policy.id}
                style={[
                  styles.policyOptionCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                    borderWidth: isSelected ? 2 : 1,
                  },
                  isSelected && {
                    backgroundColor: isDarkMode
                      ? "rgba(99, 102, 241, 0.08)"
                      : "rgba(99, 102, 241, 0.04)",
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => setSelectedPolicyId(policy.id)}
              >
                {/* Left Radio Checkbox */}
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor: isSelected ? colors.primary : colors.borderMedium || "#CBD5E1",
                      backgroundColor: isSelected ? colors.primary : "transparent",
                    },
                  ]}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>

                {/* Right Details */}
                <View style={styles.policyDetailsBox}>
                  <View style={styles.policyTitleRow}>
                    <Text
                      style={[
                        styles.policyOptionTitle,
                        {
                          color: isSelected ? colors.primary : colors.textPrimary,
                          fontWeight: isSelected ? "700" : "600",
                        },
                      ]}
                    >
                      {policy.title}
                    </Text>

                    <View
                      style={[
                        styles.windowPill,
                        isZeroReturn
                          ? { backgroundColor: "rgba(239, 68, 68, 0.12)" }
                          : { backgroundColor: "rgba(16, 185, 129, 0.12)" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.windowPillText,
                          isZeroReturn ? { color: "#EF4444" } : { color: "#10B981" },
                        ]}
                      >
                        {isZeroReturn ? "No Return" : `${policy.return_days} Days`}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.policyOptionDesc, { color: colors.textSecondary }]}>
                    {policy.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Policy Notice Box */}
        <View
          style={[
            styles.noticeBox,
            { backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "#F8FAFC", borderColor: colors.borderLight },
          ]}
        >
          <View style={styles.noticeHeader}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.noticeTitle, { color: colors.primary }]}>
              Selected Policy Preview
            </Text>
          </View>
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
            {currentSelection
              ? `Customers will be informed: "${currentSelection.description}"`
              : "Select a policy above to preview."}
          </Text>
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
              <Text style={styles.saveBtnText}>Save Store Policy</Text>
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
                styles.alertIconCircle,
                alertConfig.type === "success"
                  ? { backgroundColor: "rgba(16, 185, 129, 0.15)" }
                  : { backgroundColor: "rgba(239, 68, 68, 0.15)" },
              ]}
            >
              <Ionicons
                name={
                  alertConfig.type === "success"
                    ? "checkmark-circle"
                    : "alert-circle"
                }
                size={40}
                color={alertConfig.type === "success" ? "#10B981" : "#EF4444"}
              />
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
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  activePolicyCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  activeCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  activeTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeTagText: {
    fontSize: 12,
    fontWeight: "700",
  },
  daysBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  daysBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  activeTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  activeDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12.5,
  },
  policyListContainer: {
    marginBottom: 16,
  },
  policyOptionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  policyDetailsBox: {
    flex: 1,
  },
  policyTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  policyOptionTitle: {
    fontSize: 15,
  },
  windowPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  windowPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  policyOptionDesc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  noticeBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
  noticeText: {
    fontSize: 12.5,
    lineHeight: 18,
    fontStyle: "italic",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    backgroundColor: COLORS.cardBg,
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    color: COLORS.textContrast,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  btnIconMarginRight6: {
    marginRight: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  alertCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
  alertIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  alertMessage: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  alertBtn: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  alertBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  alertBtnIcon: {
    marginLeft: 8,
  },
});
