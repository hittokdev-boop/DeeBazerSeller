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
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
  PermissionsAndroid,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { getSellerProfile, updateSellerProfile } from "../../api/auth";

const BUSINESS_TYPES = [
  { id: "individual", label: "Individual / Sole Proprietor" },
  { id: "partnership", label: "Partnership" },
  { id: "private_ltd", label: "Private Limited Company" },
  { id: "llp", label: "Limited Liability Partnership (LLP)" },
  { id: "other", label: "Other" },
];

const StoreInfo = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();

  // Store Basic Fields
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [businessType, setBusinessType] = useState("individual");
  const [taxNumber, setTaxNumber] = useState("");

  // Address & Location Fields
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("India");
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState("15");

  // Media (Logo & Banner)
  const [logoUri, setLogoUri] = useState("");
  const [bannerUri, setBannerUri] = useState("");
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [selectedBanner, setSelectedBanner] = useState(null);

  // Status & Metadata (Read-only / Badges)
  const [storeSlug, setStoreSlug] = useState("");
  const [storeStatus, setStoreStatus] = useState("approved");
  const [isVerified, setIsVerified] = useState(true);
  const [rating, setRating] = useState(4.5);
  const [totalRatings, setTotalRatings] = useState(0);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic"); // "basic" | "address" | "media"
  const [showBusinessTypeModal, setShowBusinessTypeModal] = useState(false);
  const [activeMediaTarget, setActiveMediaTarget] = useState(null); // "logo" | "banner"
  const [showPhotoPickerModal, setShowPhotoPickerModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeField, setActiveField] = useState(null);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: "success", // "success" | "error"
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

  const requestCameraPermission = async () => {
    if (Platform.OS !== "android") return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message: "DeeBazar Seller needs camera access to capture store logo and banner.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn("Camera permission error:", err);
      return false;
    }
  };

  const requestGalleryPermission = async () => {
    if (Platform.OS !== "android") return true;
    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        );
        return (
          granted === PermissionsAndroid.RESULTS.GRANTED ||
          granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
        );
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        return (
          granted === PermissionsAndroid.RESULTS.GRANTED ||
          granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
        );
      }
    } catch (err) {
      return true;
    }
  };

  // Populate data from API / AsyncStorage
  const populateData = (data) => {
    if (!data) return;
    setStoreName(data.store_name || data.storeName || "");
    setStoreSlug(data.store_slug || data.slug || "");
    setDescription(data.description || data.store_description || "");
    setPhone(data.phone || data.mobile || "");
    setEmail(data.email || "");
    setBusinessType(data.business_type || "individual");
    setTaxNumber(data.tax_number || data.gst || "");

    setAddress(data.address || "");
    setCity(data.city || "");
    setStateName(data.state || "");
    setPostalCode(data.postal_code || data.pincode || "");
    setCountry(data.country || "India");
    if (data.delivery_radius_km !== undefined) {
      setDeliveryRadiusKm(String(data.delivery_radius_km));
    }

    setLogoUri(data.logo_url || data.logoUri || "");
    setBannerUri(data.banner_url || data.bannerUri || "");
    setStoreStatus(data.status || "approved");
    setIsVerified(data.is_verified ?? true);
    setRating(data.rating || 4.5);
    setTotalRatings(data.total_ratings || 0);
  };

  useEffect(() => {
    const loadStoreData = async () => {
      setIsLoading(true);
      try {
        // 1. Try local cache first
        const [storedSeller, storedProfile] = await Promise.all([
          AsyncStorage.getItem("sellerData"),
          AsyncStorage.getItem("sellerProfile"),
        ]);

        if (storedSeller) {
          populateData(JSON.parse(storedSeller));
        } else if (storedProfile) {
          populateData(JSON.parse(storedProfile));
        }

        // 2. Fetch fresh profile from GET /api/seller/profile
        try {
          const res = await getSellerProfile();
          if (res?.data) {
            populateData(res.data);
            await AsyncStorage.setItem("sellerProfile", JSON.stringify(res.data));
            await AsyncStorage.setItem("sellerData", JSON.stringify(res.data));
          }
        } catch (apiErr) {
          console.log("Could not load fresh seller profile (using cache):", apiErr);
        }
      } catch (err) {
        console.log("Error loading store info", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoreData();
  }, []);

  const handleOpenPhotoPicker = (target) => {
    setActiveMediaTarget(target);
    setShowPhotoPickerModal(true);
  };

  const handleChooseGallery = async () => {
    setShowPhotoPickerModal(false);
    await requestGalleryPermission();

    launchImageLibrary(
      {
        mediaType: "photo",
        quality: 0.85,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          showAlert({
            type: "error",
            title: "Gallery Error",
            message: response.errorMessage || "Could not select photo.",
          });
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          if (activeMediaTarget === "logo") {
            setLogoUri(asset.uri);
            setSelectedLogo(asset);
          } else {
            setBannerUri(asset.uri);
            setSelectedBanner(asset);
          }
        }
      }
    );
  };

  const handleCaptureCamera = async () => {
    setShowPhotoPickerModal(false);
    const hasPerm = await requestCameraPermission();
    if (!hasPerm) {
      showAlert({
        type: "error",
        title: "Permission Denied",
        message: "Camera access is needed to capture photos. Please allow camera in App Settings.",
      });
      return;
    }

    launchCamera(
      {
        mediaType: "photo",
        quality: 0.85,
        saveToPhotos: false,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          showAlert({
            type: "error",
            title: "Camera Error",
            message: response.errorMessage || "Could not take photo.",
          });
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          if (activeMediaTarget === "logo") {
            setLogoUri(asset.uri);
            setSelectedLogo(asset);
          } else {
            setBannerUri(asset.uri);
            setSelectedBanner(asset);
          }
        }
      }
    );
  };

  const validate = () => {
    let tempErrors = {};
    if (!storeName.trim()) tempErrors.storeName = "Store name is required";
    if (phone.trim() && !/^[6-9]\d{9}$/.test(phone.trim())) {
      tempErrors.phone = "Enter a valid 10-digit mobile number";
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      tempErrors.email = "Enter a valid email address";
    }
    if (!address.trim()) tempErrors.address = "Store address is required";

    if (deliveryRadiusKm.trim()) {
      const radiusNum = parseInt(deliveryRadiusKm.trim(), 10);
      if (isNaN(radiusNum) || radiusNum < 1 || radiusNum > 500) {
        tempErrors.deliveryRadiusKm = "Radius must be between 1 and 500 km";
      }
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const hasFiles = Boolean(selectedLogo || selectedBanner);

      let payload;
      if (hasFiles) {
        // multipart/form-data
        const formData = new FormData();
        formData.append("store_name", storeName.trim());
        formData.append("description", description.trim());
        formData.append("store_description", description.trim());
        if (phone.trim()) formData.append("phone", phone.trim());
        if (email.trim()) formData.append("email", email.trim());
        if (businessType) formData.append("business_type", businessType);
        if (taxNumber.trim()) formData.append("tax_number", taxNumber.trim());

        formData.append("address", address.trim());
        if (city.trim()) formData.append("city", city.trim());
        if (stateName.trim()) formData.append("state", stateName.trim());
        if (postalCode.trim()) formData.append("postal_code", postalCode.trim());
        if (country.trim()) formData.append("country", country.trim());
        if (deliveryRadiusKm.trim()) {
          formData.append("delivery_radius_km", String(parseInt(deliveryRadiusKm, 10)));
        }

        if (selectedLogo && selectedLogo.uri) {
          formData.append("logo", {
            uri:
              Platform.OS === "android"
                ? selectedLogo.uri
                : selectedLogo.uri.replace("file://", ""),
            type: selectedLogo.type || "image/jpeg",
            name: selectedLogo.fileName || `logo_${Date.now()}.jpg`,
          });
        }

        if (selectedBanner && selectedBanner.uri) {
          formData.append("banner", {
            uri:
              Platform.OS === "android"
                ? selectedBanner.uri
                : selectedBanner.uri.replace("file://", ""),
            type: selectedBanner.type || "image/jpeg",
            name: selectedBanner.fileName || `banner_${Date.now()}.jpg`,
          });
        }

        payload = formData;
      } else {
        // application/json
        payload = {
          store_name: storeName.trim(),
          description: description.trim(),
          store_description: description.trim(),
          phone: phone.trim(),
          email: email.trim(),
          business_type: businessType,
          tax_number: taxNumber.trim(),
          address: address.trim(),
          city: city.trim(),
          state: stateName.trim(),
          postal_code: postalCode.trim(),
          country: country.trim(),
          delivery_radius_km: parseInt(deliveryRadiusKm || "15", 10),
        };
      }

      const response = await updateSellerProfile(payload);
      const updatedData = response?.data || {};

      // Sync local storage
      const storedProfile = await AsyncStorage.getItem("sellerProfile");
      const currentProfile = storedProfile ? JSON.parse(storedProfile) : {};

      const newProfile = {
        ...currentProfile,
        ...updatedData,
        storeName: updatedData.store_name || storeName.trim(),
        store_name: updatedData.store_name || storeName.trim(),
        description: updatedData.description || description.trim(),
        phone: updatedData.phone || phone.trim(),
        email: updatedData.email || email.trim(),
        address: updatedData.address || address.trim(),
        city: updatedData.city || city.trim(),
        state: updatedData.state || stateName.trim(),
        postal_code: updatedData.postal_code || postalCode.trim(),
        country: updatedData.country || country.trim(),
        logo_url: updatedData.logo_url || logoUri,
        logoUri: updatedData.logo_url || logoUri,
        banner_url: updatedData.banner_url || bannerUri,
        bannerUri: updatedData.banner_url || bannerUri,
      };

      await Promise.all([
        AsyncStorage.setItem("sellerProfile", JSON.stringify(newProfile)),
        AsyncStorage.setItem("sellerData", JSON.stringify(newProfile)),
      ]);

      setSelectedLogo(null);
      setSelectedBanner(null);

      showAlert({
        type: "success",
        title: "Store Profile Updated!",
        message: response?.message || "Your store details have been successfully saved.",
        buttonText: "Done",
        onConfirm: () => navigation.goBack(),
      });
    } catch (err) {
      console.log("Error saving store info", err);
      if (err?.data?.errors) {
        const fieldErrors = {};
        if (err.data.errors.store_name) fieldErrors.storeName = err.data.errors.store_name[0];
        if (err.data.errors.phone) fieldErrors.phone = err.data.errors.phone[0];
        if (err.data.errors.email) fieldErrors.email = err.data.errors.email[0];
        if (err.data.errors.address) fieldErrors.address = err.data.errors.address[0];
        if (err.data.errors.delivery_radius_km) fieldErrors.deliveryRadiusKm = err.data.errors.delivery_radius_km[0];
        setErrors(fieldErrors);
      }
      showAlert({
        type: "error",
        title: "Update Failed",
        message: err.message || "Failed to update store profile. Please try again.",
        buttonText: "Try Again",
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Store Information
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Tab Navigation */}
        <View
          style={[
            styles.tabBarContainer,
            { backgroundColor: colors.cardBg, borderBottomColor: colors.borderLight },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContent}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.tabPill,
                activeTab === "basic"
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "#F1F5F9" },
              ]}
              onPress={() => setActiveTab("basic")}
            >
              <Ionicons
                name="storefront-outline"
                size={16}
                color={activeTab === "basic" ? "#FFFFFF" : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabPillText,
                  { color: activeTab === "basic" ? "#FFFFFF" : colors.textSecondary },
                ]}
              >
                General Info
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.tabPill,
                activeTab === "address"
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "#F1F5F9" },
              ]}
              onPress={() => setActiveTab("address")}
            >
              <Ionicons
                name="location-outline"
                size={16}
                color={activeTab === "address" ? "#FFFFFF" : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabPillText,
                  { color: activeTab === "address" ? "#FFFFFF" : colors.textSecondary },
                ]}
              >
                Address & Delivery
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.tabPill,
                activeTab === "media"
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "#F1F5F9" },
              ]}
              onPress={() => setActiveTab("media")}
            >
              <Ionicons
                name="images-outline"
                size={16}
                color={activeTab === "media" ? "#FFFFFF" : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabPillText,
                  { color: activeTab === "media" ? "#FFFFFF" : colors.textSecondary },
                ]}
              >
                Branding & Media
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Store Banner & Logo Preview Bar */}
          <View style={styles.brandingHeader}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => handleOpenPhotoPicker("banner")}
              style={[styles.bannerWrapper, { backgroundColor: colors.primaryBgLight || "#EEF2FF" }]}
            >
              {bannerUri ? (
                <Image source={{ uri: bannerUri }} style={styles.bannerImage} resizeMode="cover" />
              ) : (
                <View style={styles.bannerPlaceholder}>
                  <Ionicons name="image-outline" size={32} color={colors.primary} />
                  <Text style={[styles.bannerPlaceholderText, { color: colors.primary }]}>
                    Tap to upload Store Banner (max 4MB)
                  </Text>
                </View>
              )}
              <View style={[styles.bannerEditBtn, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
                <Text style={styles.bannerEditText}>Change Banner</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.logoOverBannerWrapper}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => handleOpenPhotoPicker("logo")}
                style={[
                  styles.logoContainer,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBg },
                ]}
              >
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.logoImage} resizeMode="cover" />
                ) : (
                  <Ionicons name="storefront" size={38} color={colors.primary} />
                )}
                <View style={[styles.logoEditBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <View style={styles.storeHeaderMeta}>
                <View style={styles.storeTitleRow}>
                  <Text style={[styles.storeTitleText, { color: colors.textPrimary }]} numberOfLines={1}>
                    {storeName || "My Store"}
                  </Text>
                  {isVerified && (
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" style={styles.verifiedIcon} />
                  )}
                </View>
                {storeSlug ? (
                  <Text style={[styles.storeSlugText, { color: colors.textSecondary }]}>
                    @{storeSlug}
                  </Text>
                ) : null}
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingText}>{rating}</Text>
                  <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>
                    ({totalRatings} reviews)
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* TAB 1: BASIC INFORMATION */}
          {activeTab === "basic" && (
            <View style={styles.formContainer}>
              {/* Store Name */}
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Store / Brand Name *
                </Text>
                <View
                  style={[
                    styles.inputFieldContainer,
                    { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" },
                    activeField === "storeName" && { borderColor: colors.primary },
                    errors.storeName && styles.inputFieldError,
                  ]}
                >
                  <Ionicons name="storefront-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="Enter store name"
                    placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                    value={storeName}
                    onChangeText={(val) => {
                      setStoreName(val);
                      if (errors.storeName) setErrors((prev) => ({ ...prev, storeName: null }));
                    }}
                    onFocus={() => setActiveField("storeName")}
                    onBlur={() => setActiveField(null)}
                  />
                </View>
                {errors.storeName && <Text style={styles.errorText}>{errors.storeName}</Text>}
              </View>

              {/* Business Type */}
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Business Type
                </Text>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[
                    styles.inputFieldContainer,
                    { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" },
                  ]}
                  onPress={() => setShowBusinessTypeModal(true)}
                >
                  <Ionicons name="business-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <Text style={[styles.textInput, { color: colors.textPrimary, lineHeight: 48 }]}>
                    {BUSINESS_TYPES.find((b) => b.id === businessType)?.label || "Select Business Type"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Store Phone */}
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Store Contact Number
                </Text>
                <View
                  style={[
                    styles.inputFieldContainer,
                    { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" },
                    activeField === "phone" && { borderColor: colors.primary },
                    errors.phone && styles.inputFieldError,
                  ]}
                >
                  <Ionicons name="call-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="10-digit customer support mobile"
                    placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={(val) => {
                      setPhone(val.replace(/[^0-9]/g, ""));
                      if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
                    }}
                    onFocus={() => setActiveField("phone")}
                    onBlur={() => setActiveField(null)}
                  />
                </View>
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              </View>

              {/* Store Email */}
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Store Support Email
                </Text>
                <View
                  style={[
                    styles.inputFieldContainer,
                    { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" },
                    activeField === "email" && { borderColor: colors.primary },
                    errors.email && styles.inputFieldError,
                  ]}
                >
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="support@yourstore.com"
                    placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                    }}
                    onFocus={() => setActiveField("email")}
                    onBlur={() => setActiveField(null)}
                  />
                </View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              {/* Tax / GST Number */}
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  GSTIN / Tax Registration Number
                </Text>
                <View
                  style={[
                    styles.inputFieldContainer,
                    { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" },
                    activeField === "taxNumber" && { borderColor: colors.primary },
                  ]}
                >
                  <Ionicons name="receipt-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                    autoCapitalize="characters"
                    value={taxNumber}
                    onChangeText={setTaxNumber}
                    onFocus={() => setActiveField("taxNumber")}
                    onBlur={() => setActiveField(null)}
                  />
                </View>
              </View>

              {/* Description */}
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Store Description
                </Text>
                <View
                  style={[
                    styles.inputFieldContainer,
                    styles.multilineContainer,
                    { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" },
                    activeField === "description" && { borderColor: colors.primary },
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.multilineInputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, styles.multilineInput, { color: colors.textPrimary }]}
                    placeholder="Describe what your store specializes in and your customer commitments..."
                    placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                    multiline
                    numberOfLines={4}
                    value={description}
                    onChangeText={setDescription}
                    onFocus={() => setActiveField("description")}
                    onBlur={() => setActiveField(null)}
                  />
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: ADDRESS & DELIVERY */}
          {activeTab === "address" && (
            <View style={styles.formContainer}>
              {/* Pickup / Store Address */}
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Pickup & Registered Store Address *
                </Text>
                <View
                  style={[
                    styles.inputFieldContainer,
                    styles.multilineContainer,
                    { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" },
                    activeField === "address" && { borderColor: colors.primary },
                    errors.address && styles.inputFieldError,
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.multilineInputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, styles.multilineInput, { color: colors.textPrimary }]}
                    placeholder="Enter building number, street, landmark, area"
                    placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                    multiline
                    numberOfLines={3}
                    value={address}
                    onChangeText={(val) => {
                      setAddress(val);
                      if (errors.address) setErrors((prev) => ({ ...prev, address: null }));
                    }}
                    onFocus={() => setActiveField("address")}
                    onBlur={() => setActiveField(null)}
                  />
                </View>
                {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
              </View>

              {/* City & State Grid */}
              <View style={styles.twoColumnRow}>
                <View style={[styles.inputWrapper, styles.flex1, styles.marginRight8]}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>City</Text>
                  <View
                    style={[
                      styles.inputFieldContainer,
                      { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" },
                      activeField === "city" && { borderColor: colors.primary },
                    ]}
                  >
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder="e.g. Bengaluru"
                      placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                      value={city}
                      onChangeText={setCity}
                      onFocus={() => setActiveField("city")}
                      onBlur={() => setActiveField(null)}
                    />
                  </View>
                </View>

                <View style={[styles.inputWrapper, styles.flex1]}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>State</Text>
                  <View
                    style={[
                      styles.inputFieldContainer,
                      { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" },
                      activeField === "state" && { borderColor: colors.primary },
                    ]}
                  >
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder="e.g. Karnataka"
                      placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                      value={stateName}
                      onChangeText={setStateName}
                      onFocus={() => setActiveField("state")}
                      onBlur={() => setActiveField(null)}
                    />
                  </View>
                </View>
              </View>

              {/* Postal Code & Country Grid */}
              <View style={styles.twoColumnRow}>
                <View style={[styles.inputWrapper, styles.flex1, styles.marginRight8]}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Postal Code / PIN</Text>
                  <View
                    style={[
                      styles.inputFieldContainer,
                      { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" },
                      activeField === "postalCode" && { borderColor: colors.primary },
                    ]}
                  >
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder="e.g. 560001"
                      placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                      keyboardType="numeric"
                      maxLength={6}
                      value={postalCode}
                      onChangeText={setPostalCode}
                      onFocus={() => setActiveField("postalCode")}
                      onBlur={() => setActiveField(null)}
                    />
                  </View>
                </View>

                <View style={[styles.inputWrapper, styles.flex1]}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Country</Text>
                  <View
                    style={[
                      styles.inputFieldContainer,
                      { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" },
                      activeField === "country" && { borderColor: colors.primary },
                    ]}
                  >
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder="India"
                      placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                      value={country}
                      onChangeText={setCountry}
                      onFocus={() => setActiveField("country")}
                      onBlur={() => setActiveField(null)}
                    />
                  </View>
                </View>
              </View>

              {/* Delivery Radius */}
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Delivery Coverage Radius (in Kilometers)
                </Text>
                <View
                  style={[
                    styles.inputFieldContainer,
                    { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" },
                    activeField === "deliveryRadiusKm" && { borderColor: colors.primary },
                    errors.deliveryRadiusKm && styles.inputFieldError,
                  ]}
                >
                  <Ionicons name="navigate-circle-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="e.g. 15 (1 to 500 km)"
                    placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                    keyboardType="numeric"
                    maxLength={3}
                    value={deliveryRadiusKm}
                    onChangeText={(val) => {
                      setDeliveryRadiusKm(val.replace(/[^0-9]/g, ""));
                      if (errors.deliveryRadiusKm) setErrors((prev) => ({ ...prev, deliveryRadiusKm: null }));
                    }}
                    onFocus={() => setActiveField("deliveryRadiusKm")}
                    onBlur={() => setActiveField(null)}
                  />
                  <Text style={[styles.inputUnitText, { color: colors.textSecondary }]}>KM</Text>
                </View>
                {errors.deliveryRadiusKm && <Text style={styles.errorText}>{errors.deliveryRadiusKm}</Text>}
                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                  Orders placed within this radius will be eligible for localized express delivery.
                </Text>
              </View>
            </View>
          )}

          {/* TAB 3: BRANDING & MEDIA */}
          {activeTab === "media" && (
            <View style={styles.formContainer}>
              {/* Logo Card */}
              <View
                style={[
                  styles.mediaCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.borderLight },
                ]}
              >
                <View style={styles.mediaCardHeader}>
                  <Text style={[styles.mediaCardTitle, { color: colors.textPrimary }]}>
                    Store Logo / Avatar
                  </Text>
                  <Text style={[styles.mediaCardSub, { color: colors.textSecondary }]}>
                    Supported formats: PNG, JPG, WEBP (Max 2MB)
                  </Text>
                </View>
                <View style={styles.mediaCardBody}>
                  <View style={[styles.logoPreviewSquare, { backgroundColor: colors.backgroundAlt }]}>
                    {logoUri ? (
                      <Image source={{ uri: logoUri }} style={styles.logoSquareImg} resizeMode="cover" />
                    ) : (
                      <Ionicons name="storefront-outline" size={40} color={colors.primary} />
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.mediaActionBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleOpenPhotoPicker("logo")}
                  >
                    <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" style={styles.btnIconMarginRight6} />
                    <Text style={styles.mediaActionBtnText}>Upload Logo</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Banner Card */}
              <View
                style={[
                  styles.mediaCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.borderLight },
                ]}
              >
                <View style={styles.mediaCardHeader}>
                  <Text style={[styles.mediaCardTitle, { color: colors.textPrimary }]}>
                    Store Banner Header
                  </Text>
                  <Text style={[styles.mediaCardSub, { color: colors.textSecondary }]}>
                    Shown at the top of your store page. Recommended: 1200 x 400 (Max 4MB)
                  </Text>
                </View>
                <View style={styles.bannerPreviewBox}>
                  {bannerUri ? (
                    <Image source={{ uri: bannerUri }} style={styles.bannerPreviewImg} resizeMode="cover" />
                  ) : (
                    <View style={styles.bannerEmptyBox}>
                      <Ionicons name="image-outline" size={32} color={colors.textSecondary} />
                      <Text style={[styles.bannerEmptyText, { color: colors.textSecondary }]}>
                        No banner uploaded yet
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.mediaActionBtnFull, { backgroundColor: colors.primary }]}
                  onPress={() => handleOpenPhotoPicker("banner")}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" style={styles.btnIconMarginRight6} />
                  <Text style={styles.mediaActionBtnText}>Upload Store Banner</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Save Button */}
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
                <Text style={styles.saveBtnText}>Save Store Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Business Type Modal */}
        <Modal
          visible={showBusinessTypeModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowBusinessTypeModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowBusinessTypeModal(false)}
          >
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.cardBg, borderColor: colors.borderLight },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Select Business Type
                </Text>
                <TouchableOpacity onPress={() => setShowBusinessTypeModal(false)}>
                  <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {BUSINESS_TYPES.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.categoryItem,
                      businessType === item.id && {
                        backgroundColor: isDarkMode ? "rgba(99, 102, 241, 0.15)" : "#EEF2FF",
                      },
                    ]}
                    onPress={() => {
                      setBusinessType(item.id);
                      setShowBusinessTypeModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        { color: colors.textPrimary },
                        businessType === item.id && { color: colors.primary, fontWeight: "700" },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {businessType === item.id && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Photo Picker Options Modal */}
        <Modal
          visible={showPhotoPickerModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPhotoPickerModal(false)}
        >
          <TouchableOpacity
            style={styles.sheetOverlay}
            activeOpacity={1}
            onPress={() => setShowPhotoPickerModal(false)}
          >
            <View
              style={[
                styles.sheetContent,
                { backgroundColor: colors.cardBg, borderColor: colors.borderLight },
              ]}
            >
              <View style={[styles.sheetHandle, { backgroundColor: colors.borderMedium || "#CBD5E1" }]} />
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                {activeMediaTarget === "logo" ? "Update Store Logo" : "Update Store Banner"}
              </Text>

              <TouchableOpacity
                style={[styles.sheetOption, { borderBottomColor: colors.borderLight }]}
                onPress={handleChooseGallery}
              >
                <View style={[styles.sheetIconBox, { backgroundColor: "rgba(59, 130, 246, 0.12)" }]}>
                  <Ionicons name="images-outline" size={22} color="#3B82F6" />
                </View>
                <View style={styles.sheetOptionTextContainer}>
                  <Text style={[styles.sheetOptionTitle, { color: colors.textPrimary }]}>
                    Choose from Gallery
                  </Text>
                  <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>
                    Select high-res image from device
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetOption, { borderBottomColor: colors.borderLight }]}
                onPress={handleCaptureCamera}
              >
                <View style={[styles.sheetIconBox, { backgroundColor: "rgba(16, 185, 129, 0.12)" }]}>
                  <Ionicons name="camera-outline" size={22} color="#10B981" />
                </View>
                <View style={styles.sheetOptionTextContainer}>
                  <Text style={[styles.sheetOptionTitle, { color: colors.textPrimary }]}>
                    Take a Photo
                  </Text>
                  <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>
                    Capture with camera directly
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetCancelBtn, { backgroundColor: colors.backgroundAlt }]}
                onPress={() => setShowPhotoPickerModal(false)}
              >
                <Text style={[styles.sheetCancelText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

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

export default StoreInfo;

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
  tabBarContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  brandingHeader: {
    marginBottom: 20,
    position: "relative",
  },
  bannerWrapper: {
    width: "100%",
    height: 125,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  bannerPlaceholderText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  bannerEditBtn: {
    position: "absolute",
    bottom: 8,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  bannerEditText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  logoOverBannerWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    marginTop: -35,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
  logoEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  storeHeaderMeta: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 4,
  },
  storeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  storeTitleText: {
    fontSize: 17,
    fontWeight: "800",
    maxWidth: "85%",
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  storeSlugText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F59E0B",
    marginLeft: 3,
  },
  ratingCount: {
    fontSize: 11,
    fontWeight: "400",
    marginLeft: 4,
  },
  formContainer: {
    paddingHorizontal: 16,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSlateDark,
    marginBottom: 6,
  },
  inputFieldContainer: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.borderMedium,
    backgroundColor: COLORS.cardBg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
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
    height: 90,
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  multilineInputIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  multilineInput: {
    height: "100%",
    textAlignVertical: "top",
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
  inputUnitText: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
  helperText: {
    fontSize: 11,
    fontWeight: "400",
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: "500",
    marginTop: 4,
  },
  // Media Tab Cards
  mediaCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  mediaCardHeader: {
    marginBottom: 12,
  },
  mediaCardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  mediaCardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  mediaCardBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoPreviewSquare: {
    width: 70,
    height: 70,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logoSquareImg: {
    width: "100%",
    height: "100%",
  },
  mediaActionBtn: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaActionBtnFull: {
    width: "100%",
    height: 44,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  mediaActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  bannerPreviewBox: {
    width: "100%",
    height: 110,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  bannerPreviewImg: {
    width: "100%",
    height: "100%",
  },
  bannerEmptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerEmptyText: {
    fontSize: 12,
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
  // Modal Style
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "75%",
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
  },
  // Bottom Sheet Modal for Photos
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 18,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  sheetOptionTextContainer: {
    flex: 1,
  },
  sheetOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  sheetOptionSub: {
    fontSize: 12,
    fontWeight: "400",
  },
  sheetCancelBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: "700",
  },
  // Custom Alert Card
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
    alignSelf: "center",
    marginTop: "auto",
    marginBottom: "auto",
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
