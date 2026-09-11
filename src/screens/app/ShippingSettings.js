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
import { getSellerProfile, updateShippingSettings } from "../../api/auth";

const ShippingSettings = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();

  const [freeShippingAbove, setFreeShippingAbove] = useState("499");
  const [standardRate, setStandardRate] = useState("49");
  const [expressRate, setExpressRate] = useState("99");
  const [processingDays, setProcessingDays] = useState("1");
  const [shipsFrom, setShipsFrom] = useState("");

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
    const loadShippingData = async () => {
      setIsLoading(true);
      try {
        // Try local storage cache
        const storedProfile = await AsyncStorage.getItem("sellerProfile");
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          if (parsed.shipping_settings) {
            const ss = parsed.shipping_settings;
            if (ss.free_shipping_above !== undefined) setFreeShippingAbove(String(ss.free_shipping_above));
            if (ss.standard_rate !== undefined) setStandardRate(String(ss.standard_rate));
            if (ss.express_rate !== undefined) setExpressRate(String(ss.express_rate));
            if (ss.processing_days !== undefined) setProcessingDays(String(ss.processing_days));
            if (ss.ships_from) setShipsFrom(ss.ships_from);
          } else if (parsed.city) {
            setShipsFrom(parsed.city);
          }
        }

        // Fetch fresh profile from GET /api/seller/profile
        try {
          const res = await getSellerProfile();
          if (res?.data) {
            if (res.data.shipping_settings) {
              const ss = res.data.shipping_settings;
              if (ss.free_shipping_above !== undefined) setFreeShippingAbove(String(ss.free_shipping_above));
              if (ss.standard_rate !== undefined) setStandardRate(String(ss.standard_rate));
              if (ss.express_rate !== undefined) setExpressRate(String(ss.express_rate));
              if (ss.processing_days !== undefined) setProcessingDays(String(ss.processing_days));
              if (ss.ships_from) setShipsFrom(ss.ships_from);
            }
            if (!shipsFrom && res.data.city) {
              setShipsFrom(res.data.city);
            }
          }
        } catch (apiErr) {
          console.log("Could not load fresh shipping settings from server:", apiErr);
        }
      } catch (err) {
        console.log("Error loading shipping settings", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadShippingData();
  }, []);

  const validate = () => {
    let tempErrors = {};
    if (freeShippingAbove.trim() === "" || isNaN(Number(freeShippingAbove))) {
      tempErrors.freeShippingAbove = "Enter valid free shipping threshold";
    }
    if (standardRate.trim() === "" || isNaN(Number(standardRate))) {
      tempErrors.standardRate = "Enter valid standard shipping rate";
    }
    if (expressRate.trim() === "" || isNaN(Number(expressRate))) {
      tempErrors.expressRate = "Enter valid express shipping rate";
    }
    const daysNum = parseInt(processingDays, 10);
    if (isNaN(daysNum) || daysNum < 0 || daysNum > 30) {
      tempErrors.processingDays = "Processing days must be between 0 and 30";
    }
    if (!shipsFrom.trim()) {
      tempErrors.shipsFrom = "Ships from location is required";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload = {
        free_shipping_above: Number(freeShippingAbove) || 0,
        standard_rate: Number(standardRate) || 0,
        express_rate: Number(expressRate) || 0,
        processing_days: parseInt(processingDays || "1", 10),
        ships_from: shipsFrom.trim(),
      };

      const response = await updateShippingSettings(payload);

      // Update local storage
      const storedProfile = await AsyncStorage.getItem("sellerProfile");
      const currentProfile = storedProfile ? JSON.parse(storedProfile) : {};
      const updatedProfile = {
        ...currentProfile,
        shipping_settings: payload,
      };
      await AsyncStorage.setItem("sellerProfile", JSON.stringify(updatedProfile));

      showAlert({
        type: "success",
        title: "Shipping Settings Saved!",
        message: response?.message || "Your shipping rates and delivery timelines have been updated.",
        buttonText: "Done",
        onConfirm: () => navigation.goBack(),
      });
    } catch (err) {
      console.log("Error updating shipping settings", err);

      let userFriendlyMsg = err.message || "Failed to update shipping settings. Please try again.";
      if (typeof userFriendlyMsg === "string" && userFriendlyMsg.includes("Unknown column 'shipping_settings'")) {
        userFriendlyMsg =
          "Backend Database Notice:\nThe 'shipping_settings' column is not added to the database yet. Saved locally for now.";

        // Save locally as fallback
        const storedProfile = await AsyncStorage.getItem("sellerProfile");
        const currentProfile = storedProfile ? JSON.parse(storedProfile) : {};
        const updatedProfile = {
          ...currentProfile,
          shipping_settings: {
            free_shipping_above: Number(freeShippingAbove) || 0,
            standard_rate: Number(standardRate) || 0,
            express_rate: Number(expressRate) || 0,
            processing_days: parseInt(processingDays || "1", 10),
            ships_from: shipsFrom.trim(),
          },
        };
        await AsyncStorage.setItem("sellerProfile", JSON.stringify(updatedProfile));
      }

      showAlert({
        type: "error",
        title: "Save Notice",
        message: userFriendlyMsg,
        buttonText: "Okay",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const adjustDays = (delta) => {
    const current = parseInt(processingDays || "0", 10);
    const nextVal = Math.min(30, Math.max(0, current + delta));
    setProcessingDays(String(nextVal));
    if (errors.processingDays) {
      setErrors((prev) => ({ ...prev, processingDays: null }));
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Shipping Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Information Card */}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: isDarkMode ? "rgba(249, 115, 22, 0.12)" : "#FFF7ED",
                borderColor: isDarkMode ? "rgba(249, 115, 22, 0.25)" : "#FFEDD5",
              },
            ]}
          >
            <Ionicons name="boat-outline" size={24} color="#F97316" style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
                Delivery Rates & Dispatch Timeline
              </Text>
              <Text style={[styles.infoSubtitle, { color: colors.textSecondary }]}>
                Configure delivery rates shown to buyers at checkout, free shipping limits, and fulfillment speed.
              </Text>
            </View>
          </View>

          {/* Section 1: Free Shipping Threshold */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.cardBg, borderColor: colors.borderLight },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(16, 185, 129, 0.12)" }]}>
                <Ionicons name="gift-outline" size={20} color="#10B981" />
              </View>
              <View style={styles.cardTitleBox}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  Free Shipping Above (₹)
                </Text>
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                  Orders with cart total above this amount receive free delivery
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.inputFieldContainer,
                { backgroundColor: colors.backgroundAlt, borderColor: colors.borderMedium || "#CBD5E1" },
                activeField === "freeShippingAbove" && { borderColor: colors.primary },
                errors.freeShippingAbove && styles.inputFieldError,
              ]}
            >
              <Text style={[styles.currencyPrefix, { color: colors.primary }]}>₹</Text>
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
                placeholder="499"
                placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                keyboardType="numeric"
                value={freeShippingAbove}
                onChangeText={(val) => {
                  setFreeShippingAbove(val.replace(/[^0-9]/g, ""));
                  if (errors.freeShippingAbove) setErrors((prev) => ({ ...prev, freeShippingAbove: null }));
                }}
                onFocus={() => setActiveField("freeShippingAbove")}
                onBlur={() => setActiveField(null)}
              />
            </View>
            {errors.freeShippingAbove && <Text style={styles.errorText}>{errors.freeShippingAbove}</Text>}
          </View>

          {/* Section 2: Shipping Rates (Standard vs Express) */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.cardBg, borderColor: colors.borderLight },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(59, 130, 246, 0.12)" }]}>
                <Ionicons name="car-outline" size={20} color="#3B82F6" />
              </View>
              <View style={styles.cardTitleBox}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  Delivery Charges
                </Text>
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                  Set fixed shipping fee for standard and express delivery
                </Text>
              </View>
            </View>

            <View style={styles.twoColumnRow}>
              {/* Standard Rate */}
              <View style={[styles.flex1, styles.marginRight8]}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Standard Rate</Text>
                <View
                  style={[
                    styles.inputFieldContainer,
                    { backgroundColor: colors.backgroundAlt, borderColor: colors.borderMedium || "#CBD5E1" },
                    activeField === "standardRate" && { borderColor: colors.primary },
                    errors.standardRate && styles.inputFieldError,
                  ]}
                >
                  <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>₹</Text>
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="49"
                    placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                    keyboardType="numeric"
                    value={standardRate}
                    onChangeText={(val) => {
                      setStandardRate(val.replace(/[^0-9]/g, ""));
                      if (errors.standardRate) setErrors((prev) => ({ ...prev, standardRate: null }));
                    }}
                    onFocus={() => setActiveField("standardRate")}
                    onBlur={() => setActiveField(null)}
                  />
                </View>
                {errors.standardRate && <Text style={styles.errorText}>{errors.standardRate}</Text>}
              </View>

              {/* Express Rate */}
              <View style={styles.flex1}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Express Rate</Text>
                <View
                  style={[
                    styles.inputFieldContainer,
                    { backgroundColor: colors.backgroundAlt, borderColor: colors.borderMedium || "#CBD5E1" },
                    activeField === "expressRate" && { borderColor: colors.primary },
                    errors.expressRate && styles.inputFieldError,
                  ]}
                >
                  <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>₹</Text>
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="99"
                    placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                    keyboardType="numeric"
                    value={expressRate}
                    onChangeText={(val) => {
                      setExpressRate(val.replace(/[^0-9]/g, ""));
                      if (errors.expressRate) setErrors((prev) => ({ ...prev, expressRate: null }));
                    }}
                    onFocus={() => setActiveField("expressRate")}
                    onBlur={() => setActiveField(null)}
                  />
                </View>
                {errors.expressRate && <Text style={styles.errorText}>{errors.expressRate}</Text>}
              </View>
            </View>
          </View>

          {/* Section 3: Processing Time & Ships From */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.cardBg, borderColor: colors.borderLight },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(139, 92, 246, 0.12)" }]}>
                <Ionicons name="time-outline" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.cardTitleBox}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  Fulfillment & Origin
                </Text>
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                  Processing days before handover to courier and origin city
                </Text>
              </View>
            </View>

            {/* Processing Days Stepper */}
            <View style={styles.stepperWrapper}>
              <View style={styles.stepperLabelBox}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginBottom: 2 }]}>
                  Order Processing Time
                </Text>
                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                  Days needed to pack and dispatch (0 = Same Day)
                </Text>
              </View>

              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: colors.backgroundAlt }]}
                  onPress={() => adjustDays(-1)}
                >
                  <Ionicons name="remove" size={18} color={colors.textPrimary} />
                </TouchableOpacity>

                <View style={[styles.stepperValueBox, { backgroundColor: colors.cardBg }]}>
                  <Text style={[styles.stepperValueText, { color: colors.primary }]}>
                    {processingDays} {parseInt(processingDays, 10) === 1 ? "day" : "days"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: colors.backgroundAlt }]}
                  onPress={() => adjustDays(1)}
                >
                  <Ionicons name="add" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
            {errors.processingDays && <Text style={styles.errorText}>{errors.processingDays}</Text>}

            {/* Ships From City */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                Ships From (City / Hub) *
              </Text>
              <View
                style={[
                  styles.inputFieldContainer,
                  { backgroundColor: colors.backgroundAlt, borderColor: colors.borderMedium || "#CBD5E1" },
                  activeField === "shipsFrom" && { borderColor: colors.primary },
                  errors.shipsFrom && styles.inputFieldError,
                ]}
              >
                <Ionicons name="location-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder="e.g. Bengaluru, Karnataka"
                  placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                  value={shipsFrom}
                  onChangeText={(val) => {
                    setShipsFrom(val);
                    if (errors.shipsFrom) setErrors((prev) => ({ ...prev, shipsFrom: null }));
                  }}
                  onFocus={() => setActiveField("shipsFrom")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.shipsFrom && <Text style={styles.errorText}>{errors.shipsFrom}</Text>}
            </View>
          </View>

          {/* Checkout Preview Box */}
          <View
            style={[
              styles.previewBox,
              { backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "#F8FAFC", borderColor: colors.borderLight },
            ]}
          >
            <View style={styles.previewHeader}>
              <Ionicons name="eye-outline" size={16} color={colors.primary} />
              <Text style={[styles.previewTitle, { color: colors.primary }]}>
                Buyer Checkout Preview
              </Text>
            </View>
            <Text style={[styles.previewLine, { color: colors.textSecondary }]}>
              • Standard Delivery: <Text style={{ fontWeight: "700", color: colors.textPrimary }}>₹{standardRate || "0"}</Text> (Free above ₹{freeShippingAbove || "0"})
            </Text>
            <Text style={[styles.previewLine, { color: colors.textSecondary }]}>
              • Express Delivery: <Text style={{ fontWeight: "700", color: colors.textPrimary }}>₹{expressRate || "0"}</Text>
            </Text>
            <Text style={[styles.previewLine, { color: colors.textSecondary }]}>
              • Dispatched from <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{shipsFrom || "Store Hub"}</Text> within <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{processingDays} {parseInt(processingDays, 10) === 1 ? "day" : "days"}</Text>
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
                <Text style={styles.saveBtnText}>Save Shipping Settings</Text>
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

export default ShippingSettings;

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
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardTitleBox: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputFieldContainer: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  inputFieldError: {
    borderColor: COLORS.error,
  },
  currencyPrefix: {
    fontSize: 15,
    fontWeight: "700",
    marginRight: 6,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: "100%",
    paddingVertical: 0,
    fontSize: 14,
    fontWeight: "600",
  },
  twoColumnRow: {
    flexDirection: "row",
  },
  flex1: {
    flex: 1,
  },
  marginRight8: {
    marginRight: 8,
  },
  inputWrapper: {
    marginTop: 14,
  },
  stepperWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  stepperLabelBox: {
    flex: 1,
    marginRight: 12,
  },
  helperText: {
    fontSize: 11,
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperValueBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginHorizontal: 6,
    minWidth: 70,
    alignItems: "center",
  },
  stepperValueText: {
    fontSize: 14,
    fontWeight: "700",
  },
  previewBox: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
  previewLine: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 2,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: "500",
    marginTop: 4,
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
