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
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { launchImageLibrary } from "react-native-image-picker";
import COLORS from "../../constants/theme";

const CATEGORIES = [
  "Electronics & Gadgets",
  "Fashion & Apparel",
  "Home & Kitchen",
  "Health & Beauty",
  "Groceries & Gourmet",
  "Sports & Outdoors",
  "Toys & Games",
  "Handmade Crafts",
];

const StoreInfo = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [storeName, setStoreName] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [logoUri, setLogoUri] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeField, setActiveField] = useState(null);

  useEffect(() => {
    const loadProfileData = async () => {
      setIsLoading(true);
      try {
        const storedProfile = await AsyncStorage.getItem("sellerProfile");
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          setProfile(parsed);
          setStoreName(parsed.storeName || "");
          setCategory(parsed.category || "");
          setAddress(parsed.address || "");
          setDescription(parsed.description || "");
          setLogoUri(parsed.logoUri || "");
        }
      } catch (err) {
        console.log("Error loading profile", err);
        Alert.alert("Error", "Could not load store information.");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, []);

  const selectLogo = () => {
    launchImageLibrary(
      {
        mediaType: "photo",
        quality: 0.8,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorMessage) {
          Alert.alert("Error", response.errorMessage);
          return;
        }
        if (response.assets && response.assets.length > 0) {
          setLogoUri(response.assets[0].uri);
        }
      }
    );
  };

  const validate = () => {
    let tempErrors = {};
    if (!storeName.trim() || storeName.trim().length < 3) {
      tempErrors.storeName = "Store name must be at least 3 characters";
    }
    if (!category) {
      tempErrors.category = "Please select a store category";
    }
    if (!address.trim() || address.trim().length < 10) {
      tempErrors.address = "Address must be at least 10 characters";
    }
    if (!description.trim() || description.trim().length < 15) {
      tempErrors.description = "Description must be at least 15 characters";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const storedProfile = await AsyncStorage.getItem("sellerProfile");
      const currentProfile = storedProfile ? JSON.parse(storedProfile) : {};
      
      const updatedProfile = {
        ...currentProfile,
        storeName: storeName.trim(),
        category,
        address: address.trim(),
        description: description.trim(),
        logoUri,
      };

      await AsyncStorage.setItem("sellerProfile", JSON.stringify(updatedProfile));
      
      Alert.alert("Success", "Store Information updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.log("Error saving store info", err);
      Alert.alert("Error", "Failed to update store information.");
    } finally {
      setIsSaving(false);
    }
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
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Store Information</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Picker Section */}
          <View style={styles.logoSection}>
            <TouchableOpacity onPress={selectLogo} activeOpacity={0.85}>
              <View style={styles.logoContainer}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.logoImage} />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Ionicons name="storefront-outline" size={42} color={COLORS.primary} />
                  </View>
                )}
                <View style={styles.editBadge}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.logoLabel}>Change Store Logo</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Store Name */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Store / Brand Name</Text>
              <View
                style={[
                  styles.inputFieldContainer,
                  activeField === "storeName" && styles.inputFieldFocus,
                  errors.storeName && styles.inputFieldError,
                ]}
              >
                <Ionicons name="storefront-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter store name"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  value={storeName}
                  onChangeText={setStoreName}
                  onFocus={() => setActiveField("storeName")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.storeName && <Text style={styles.errorText}>{errors.storeName}</Text>}
            </View>

            {/* Category Dropdown */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Business Category</Text>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.inputFieldContainer,
                  errors.category && styles.inputFieldError,
                ]}
                onPress={() => setShowCategoryModal(true)}
              >
                <Ionicons name="grid-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <Text style={[styles.textInput, { color: category ? COLORS.textPrimary : COLORS.textGrayPlaceholder, lineHeight: 20 }]}>
                  {category || "Select a store category"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={COLORS.textGrayLight} style={{ marginRight: 10 }} />
              </TouchableOpacity>
              {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
            </View>

            {/* Address */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Pickup / Registered Address</Text>
              <View
                style={[
                  styles.inputFieldContainer,
                  styles.multilineContainer,
                  activeField === "address" && styles.inputFieldFocus,
                  errors.address && styles.inputFieldError,
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={COLORS.textGrayLight}
                  style={[styles.inputIcon, { marginTop: 10 }]}
                />
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="Enter full store address"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  multiline
                  numberOfLines={3}
                  value={address}
                  onChangeText={setAddress}
                  onFocus={() => setActiveField("address")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
            </View>

            {/* Store Description */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Store Description</Text>
              <View
                style={[
                  styles.inputFieldContainer,
                  styles.multilineContainer,
                  activeField === "description" && styles.inputFieldFocus,
                  errors.description && styles.inputFieldError,
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={COLORS.textGrayLight}
                  style={[styles.inputIcon, { marginTop: 10 }]}
                />
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="Briefly describe what you sell and your store's mission..."
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                  onFocus={() => setActiveField("description")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            </View>
          </View>
        </ScrollView>

        {/* Footer Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveBtn}
            activeOpacity={0.9}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Category Picker Modal */}
        <Modal
          visible={showCategoryModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCategoryModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Business Category</Text>
                <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                  <Ionicons name="close-circle-outline" size={24} color={COLORS.textGrayLight} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {CATEGORIES.map((cat, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.categoryItem,
                      category === cat && styles.categoryItemActive,
                    ]}
                    onPress={() => {
                      setCategory(cat);
                      setShowCategoryModal(false);
                      if (errors.category) {
                        setErrors((prev) => ({ ...prev, category: null }));
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        category === cat && styles.categoryTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                    {category === cat && (
                      <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default StoreInfo;

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
  logoSection: {
    alignItems: "center",
    marginVertical: 24,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.cardBg,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    position: "relative",
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    borderStyle: "dashed",
    backgroundColor: COLORS.primaryBgLight,
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: COLORS.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.cardBg,
  },
  logoLabel: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
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
  multilineContainer: {
    height: "auto",
    minHeight: 90,
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  multilineInput: {
    height: "auto",
    minHeight: 80,
    textAlignVertical: "top",
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
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.modalOverlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "60%",
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  categoryItemActive: {
    borderBottomColor: COLORS.borderHighlight,
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.textSlate,
    fontWeight: "500",
  },
  categoryTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
});
