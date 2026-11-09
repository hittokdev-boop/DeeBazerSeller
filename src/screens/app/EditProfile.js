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
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
  Image,
  PermissionsAndroid,
  RefreshControl,
  Keyboard,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import Geolocation from "@react-native-community/geolocation";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { fetchAccurateLiveLocation } from "../../services/mapService";
import {
  updateSellerProfile,
  getSellerProfile,
  updateUserProfile,
} from "../../api/auth";
import {
  validateAccountNumber,
  validateIfscCode,
  validateAccountHolderName,
  validateBankName,
  sanitizeAccountNumber,
  sanitizeIfscCode,
} from "../../utils/bankValidation";

const BUSINESS_TYPES = [
  { id: "individual", label: "Individual" },
  { id: "company", label: "Company" },
  { id: "partnership", label: "Partnership" },
];

const EditProfile = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const scrollViewRef = useRef(null);

  // Active Segmented Tab
  const [activeTab, setActiveTab] = useState("store"); // "store" | "address" | "payout"

  // User & Store Identity Fields
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [businessType, setBusinessType] = useState("individual");
  const [avatarUri, setAvatarUri] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [bannerUri, setBannerUri] = useState("");
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [activePhotoTarget, setActivePhotoTarget] = useState("logo"); // "logo" | "banner"
  const [imageError, setImageError] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  // Address & Location Fields
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("India");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  // Bank & Tax Fields
  const [bankName, setBankName] = useState("");
  const [bankHolderName, setBankHolderName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [gstin, setGstin] = useState("");
  const [panNumber, setPanNumber] = useState("");

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPhotoPickerModal, setShowPhotoPickerModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeField, setActiveField] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e?.endCoordinates ? e.endCoordinates.height : 280);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleInputFocus = (fieldKey, yOffset) => {
    setActiveField(fieldKey);
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: yOffset, animated: true });
      }
    }, 150);
  };

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: "success", // "success" | "error" | "info"
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
          message: "DeeBazar Seller needs camera access to take your profile picture.",
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

  // Auto-detect Live Location & Auto-fill Address + GPS
  const handleDetectLocation = async () => {
    setIsLocating(true);
    try {
      const loc = await fetchAccurateLiveLocation();
      if (!loc || !loc.latitude || !loc.longitude) {
        showAlert({
          type: "error",
          title: "Location Unavailable",
          message: "Could not detect GPS location. Please turn on device Location/GPS.",
        });
        setIsLocating(false);
        return;
      }

      const fullStreet =
        loc.address && loc.address.length >= 10
          ? loc.address
          : loc.formattedAddress || loc.address || "";

      if (fullStreet) setAddress(fullStreet);
      if (loc.city) setCity(loc.city);
      if (loc.state) setStateName(loc.state);
      if (loc.postalCode) setPostalCode(loc.postalCode);
      if (loc.country) setCountry(loc.country || "India");
      setLatitude(String(Number(loc.latitude).toFixed(6)));
      setLongitude(String(Number(loc.longitude).toFixed(6)));

      setErrors((prev) => ({
        ...prev,
        address: null,
        city: null,
        state: null,
        postal_code: null,
        latitude: null,
        longitude: null,
      }));

      const latDisplay = Number(loc.latitude).toFixed(4);
      const lngDisplay = Number(loc.longitude).toFixed(4);
      showAlert({
        type: "success",
        title: "Live Location Detected!",
        message: `Address, City (${loc.city || ""}), State (${loc.state || ""}), PIN (${loc.postalCode || ""}) and GPS coordinates (${latDisplay}, ${lngDisplay}) have been auto-filled. You can edit them if needed.`,
      });
    } catch (err) {
      console.warn("Live location error:", err);
      showAlert({
        type: "error",
        title: "Location Error",
        message: err?.message || "Failed to detect live location. Please verify GPS and try again.",
      });
    } finally {
      setIsLocating(false);
    }
  };

  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      // Direct load from GET /api/seller/profile
      const profileRes = await getSellerProfile();
      const fullProfile = profileRes?.data || {};
      const sellerObj = fullProfile?.seller || fullProfile;
      const userObj = fullProfile?.user || fullProfile;

      // Populate User Account & Store Basics
      const nameVal = fullProfile?.owner_name || userObj?.name || fullProfile?.name || "";
      const emailVal = fullProfile?.email || userObj?.email || "";
      const mobileVal = fullProfile?.phone || userObj?.mobile || fullProfile?.mobile || "";
      const logoVal = fullProfile?.logo_url || sellerObj?.logo_url || fullProfile?.logo || "";
      const bannerVal = fullProfile?.banner_url || sellerObj?.banner_url || fullProfile?.banner || "";

      setOwnerName(nameVal);
      setEmail(emailVal);
      setMobile(mobileVal);
      if (logoVal) {
        setAvatarUri(logoVal);
        setImageError(false);
      }
      if (bannerVal) {
        setBannerUri(bannerVal);
        setBannerError(false);
      }

      // Populate Store Basics
      setStoreName(fullProfile?.store_name || sellerObj?.store_name || "");
      setDescription(fullProfile?.description || fullProfile?.store_description || sellerObj?.store_description || "");
      setBusinessType(fullProfile?.business_type || sellerObj?.business_type || "individual");

      // Populate Address
      setAddress(fullProfile?.address || "");
      setCity(fullProfile?.city || "");
      setStateName(fullProfile?.state || "");
      setPostalCode(fullProfile?.postal_code || "");
      setCountry(fullProfile?.country || "India");

      // Populate Location
      if (fullProfile?.latitude) setLatitude(String(fullProfile.latitude));
      if (fullProfile?.longitude) setLongitude(String(fullProfile.longitude));
      if (fullProfile?.delivery_radius_km !== undefined && fullProfile?.delivery_radius_km !== null) {
        setDeliveryRadiusKm(String(fullProfile.delivery_radius_km));
      }

      // Populate Bank Details directly from store profile (POST api/seller/profile)
      setBankName(fullProfile?.bank_name || "");
      setBankHolderName(fullProfile?.bank_account_holder_name || "");
      setAccountNo(fullProfile?.bank_account_number || "");
      setIfscCode(fullProfile?.bank_ifsc_code || "");

      // Populate Tax Identifiers
      setGstin(fullProfile?.gst_number || fullProfile?.tax_number || "");
      setPanNumber(fullProfile?.pan_number || "");
    } catch (err) {
      console.error("Error loading profile", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadProfileData();
    setIsRefreshing(false);
  };

  const openPhotoPicker = (target = "logo") => {
    setActivePhotoTarget(target);
    setShowPhotoPickerModal(true);
  };

  const handleOpenGallery = async () => {
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
          if (activePhotoTarget === "banner") {
            setBannerUri(asset.uri);
            setSelectedBanner(asset);
            setBannerError(false);
          } else {
            setAvatarUri(asset.uri);
            setSelectedPhoto(asset);
            setImageError(false);
          }
        }
      }
    );
  };

  const handleOpenCamera = async () => {
    setShowPhotoPickerModal(false);
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      showAlert({
        type: "error",
        title: "Permission Denied",
        message: "Camera permission is required to take a new photo.",
      });
      return;
    }

    launchCamera(
      {
        mediaType: "photo",
        quality: 0.85,
        cameraType: activePhotoTarget === "banner" ? "back" : "front",
        saveToPhotos: false,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          showAlert({
            type: "error",
            title: "Camera Error",
            message: response.errorMessage || "Could not access camera.",
          });
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          if (activePhotoTarget === "banner") {
            setBannerUri(asset.uri);
            setSelectedBanner(asset);
            setBannerError(false);
          } else {
            setAvatarUri(asset.uri);
            setSelectedPhoto(asset);
            setImageError(false);
          }
        }
      }
    );
  };

  const validate = () => {
    let tempErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10,15}$/;

    if (ownerName.trim() && ownerName.trim().length < 2) {
      tempErrors.ownerName = "Name must be at least 2 characters";
    }
    if (ownerName.trim() && ownerName.trim().length > 255) {
      tempErrors.ownerName = "Name cannot exceed 255 characters";
    }

    if (email.trim() && !emailRegex.test(email.trim())) {
      tempErrors.email = "Please enter a valid email address";
    }

    if (mobile.trim() && !phoneRegex.test(mobile.trim())) {
      tempErrors.mobile = "Mobile must be between 10 and 15 digits";
    }

    if (storeName.trim() && storeName.trim().length < 2) {
      tempErrors.storeName = "Store name must be at least 2 characters";
    }
    if (storeName.trim() && storeName.trim().length > 255) {
      tempErrors.storeName = "Store name cannot exceed 255 characters";
    }

    if (address.trim() && address.trim().length < 10) {
      tempErrors.address = "Address must be at least 10 characters";
    }
    if (address.trim() && address.trim().length > 500) {
      tempErrors.address = "Address cannot exceed 500 characters";
    }

    if (latitude) {
      const lat = parseFloat(latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        tempErrors.latitude = "Latitude must be between -90 and 90";
      }
    }

    if (longitude) {
      const lng = parseFloat(longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        tempErrors.longitude = "Longitude must be between -180 and 180";
      }
    }

    if (deliveryRadiusKm) {
      const radius = parseInt(deliveryRadiusKm, 10);
      if (isNaN(radius) || radius < 1 || radius > 500) {
        tempErrors.deliveryRadiusKm = "Radius must be between 1 and 500 km";
      }
    }

    if (gstin && gstin.trim().length > 15) {
      tempErrors.gstin = "GSTIN cannot exceed 15 characters";
    }
    if (panNumber && panNumber.trim().length > 10) {
      tempErrors.panNumber = "PAN cannot exceed 10 characters";
    }

    // Strict Bank Details Validation
    const hasAnyBankData = Boolean(
      accountNo.trim() || ifscCode.trim() || bankName.trim() || bankHolderName.trim()
    );

    if (hasAnyBankData) {
      const bankNameRes = validateBankName(bankName, true);
      if (!bankNameRes.isValid) tempErrors.bankName = bankNameRes.error;

      const holderRes = validateAccountHolderName(bankHolderName, true);
      if (!holderRes.isValid) tempErrors.bankHolderName = holderRes.error;

      const accountRes = validateAccountNumber(accountNo, true);
      if (!accountRes.isValid) tempErrors.accountNo = accountRes.error;

      const ifscRes = validateIfscCode(ifscCode, true);
      if (!ifscRes.isValid) tempErrors.ifscCode = ifscRes.error;
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      showAlert({
        type: "error",
        title: "Validation Error",
        message: "Please correct the highlighted fields before saving.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("store_name", storeName.trim());
      formData.append("description", description.trim());
      formData.append("phone", mobile.trim());

      if (gstin.trim()) formData.append("gst_number", gstin.trim());
      if (panNumber.trim()) formData.append("pan_number", panNumber.trim());

      formData.append("address", address.trim());
      formData.append("city", city.trim());
      formData.append("state", stateName.trim());
      formData.append("postal_code", postalCode.trim());
      formData.append("country", country.trim() || "India");
      formData.append(
        "delivery_radius_km",
        String(deliveryRadiusKm ? parseInt(deliveryRadiusKm, 10) : 10)
      );

      if (accountNo.trim()) formData.append("bank_account_number", accountNo.trim());
      if (ifscCode.trim()) formData.append("bank_ifsc_code", ifscCode.trim());
      if (bankHolderName.trim()) formData.append("bank_account_holder_name", bankHolderName.trim());
      if (bankName.trim()) formData.append("bank_name", bankName.trim());

      if (selectedPhoto && selectedPhoto.uri) {
        formData.append("logo", {
          uri:
            Platform.OS === "android"
              ? selectedPhoto.uri
              : selectedPhoto.uri.replace("file://", ""),
          type: selectedPhoto.type || "image/jpeg",
          name: selectedPhoto.fileName || `logo_${Date.now()}.jpg`,
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

      // Also preserve owner name, email, and business_type for compatibility
      if (ownerName.trim()) formData.append("name", ownerName.trim());
      if (email.trim()) formData.append("email", email.trim());
      if (businessType) formData.append("business_type", businessType);

      // 1. Update main store profile and bank details via POST /api/seller/profile
      const response = await updateSellerProfile(formData);

      // 2. Safely update user profile
      if (ownerName.trim() || mobile.trim()) {
        try {
          await updateUserProfile({
            name: ownerName.trim(),
            mobile: mobile.trim(),
            email: email.trim(),
          });
        } catch (uErr) {
          console.warn("Non-fatal user profile sync notice:", uErr?.message);
        }
      }

      const updatedProfile = response?.data || {};
      const finalLogo = updatedProfile.logo_url || avatarUri;
      if (finalLogo) {
        setAvatarUri(finalLogo);
      }
      const finalBanner = updatedProfile.banner_url || bannerUri;
      if (finalBanner) {
        setBannerUri(finalBanner);
      }
      setSelectedPhoto(null);
      setSelectedBanner(null);

      showAlert({
        type: "success",
        title: "Profile Updated!",
        message: response?.message || "All seller profile details were saved successfully.",
        buttonText: "Done",
        onConfirm: () => navigation.goBack(),
      });
    } catch (err) {
      console.error("Error saving profile", err);
      if (err?.data?.errors) {
        const fieldErrors = {};
        if (err.data.errors.store_name) fieldErrors.storeName = err.data.errors.store_name[0];
        if (err.data.errors.email) fieldErrors.email = err.data.errors.email[0];
        if (err.data.errors.mobile || err.data.errors.phone) {
          fieldErrors.mobile = (err.data.errors.mobile || err.data.errors.phone)[0];
        }
        if (err.data.errors.address) fieldErrors.address = err.data.errors.address[0];
        setErrors(fieldErrors);
      }
      showAlert({
        type: "error",
        title: "Update Failed",
        message: err.message || "Failed to update profile. Please try again.",
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
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Seller Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Segmented Tabs */}
        <View style={[styles.tabBarContainer, { backgroundColor: colors.cardBg, borderBottomColor: colors.borderLight }]}>
          {[
            { id: "store", label: "Store & Info", icon: "storefront-outline" },
            { id: "address", label: "Address & GPS", icon: "location-outline" },
            { id: "payout", label: "Bank & Tax", icon: "wallet-outline" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tabItem,
                  isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 },
                ]}
              >
                <Ionicons
                  name={tab.icon}
                  size={17}
                  color={isActive ? colors.primary : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.tabItemText,
                    { color: isActive ? colors.primary : colors.textSecondary },
                    isActive && { fontWeight: "700" },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 120 : 60 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {activeTab === "store" && (
            <>
              {/* Avatar Section */}
              <View style={styles.profileHeaderDecoration}>
                <View style={styles.avatarWrapper}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => openPhotoPicker("logo")}
                    style={[
                      styles.avatarContainer,
                      {
                        backgroundColor: colors.primaryBgLight || "#EEF2FF",
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    {avatarUri && !imageError ? (
                      <Image
                        source={{
                          uri: avatarUri.includes("pravatar.cc") || avatarUri.startsWith("file://")
                            ? avatarUri
                            : `${avatarUri}${avatarUri.includes("?") ? "&" : "?"}t=${new Date().getTime()}`,
                        }}
                        style={styles.avatarImage}
                        resizeMode="cover"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <Ionicons name="person" size={46} color={colors.primary} />
                    )}
                  </TouchableOpacity>

                  {/* Edit Camera Badge */}
                  <TouchableOpacity
                    style={[styles.editBadgeBtn, { backgroundColor: colors.primary }]}
                    activeOpacity={0.9}
                    onPress={() => openPhotoPicker("logo")}
                  >
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => openPhotoPicker("logo")}
                  style={styles.changePhotoBtn}
                >
                  <Text style={[styles.changePhotoText, { color: colors.primary }]}>
                    Change Store Logo
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.avatarSubText, { color: colors.textSecondary }]}>
                  Logo (JPEG, PNG, WEBP, max 2MB)
                </Text>

                {/* Banner Section */}
                <View style={styles.bannerSectionWrapper}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary, marginBottom: 8 }]}>
                    Store Banner Image
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => openPhotoPicker("banner")}
                    style={[
                      styles.bannerContainer,
                      {
                        backgroundColor: colors.cardBg || "#FFFFFF",
                        borderColor: colors.borderMedium || "#CBD5E1",
                      },
                    ]}
                  >
                    {bannerUri && !bannerError ? (
                      <Image
                        source={{
                          uri: bannerUri.includes("pravatar.cc") || bannerUri.startsWith("file://")
                            ? bannerUri
                            : `${bannerUri}${bannerUri.includes("?") ? "&" : "?"}t=${new Date().getTime()}`,
                        }}
                        style={styles.bannerImage}
                        resizeMode="cover"
                        onError={() => setBannerError(true)}
                      />
                    ) : (
                      <View style={styles.bannerEmptyContent}>
                        <Ionicons name="image-outline" size={32} color={colors.textSecondary || "#94A3B8"} />
                        <Text style={[styles.bannerEmptyText, { color: colors.primary }]}>
                          Upload Store Banner
                        </Text>
                        <Text style={[styles.bannerEmptySubText, { color: colors.textSecondary }]}>
                          JPEG, PNG, WEBP (Max 4MB)
                        </Text>
                      </View>
                    )}
                    <View style={[styles.bannerEditBadge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="camera" size={14} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Store & Account Form */}
              <View style={styles.formContainer}>
                {/* Full Name */}
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Owner Full Name</Text>
                  <View
                    style={[
                      styles.inputFieldContainer,
                      { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" },
                      activeField === "ownerName" && { borderColor: colors.primary },
                      errors.ownerName && styles.inputFieldError,
                    ]}
                  >
                    <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder="Enter your full name"
                      placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                      value={ownerName}
                      maxLength={255}
                      onChangeText={(val) => {
                        setOwnerName(val);
                        if (errors.ownerName) setErrors((prev) => ({ ...prev, ownerName: null }));
                      }}
                      onFocus={() => handleInputFocus("ownerName", 60)}
                      onBlur={() => setActiveField(null)}
                    />
                  </View>
                  {errors.ownerName && <Text style={styles.errorText}>{errors.ownerName}</Text>}
                </View>

                {/* Store Name */}
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Store / Brand Name</Text>
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
                      maxLength={255}
                      onChangeText={(val) => {
                        setStoreName(val);
                        if (errors.storeName) setErrors((prev) => ({ ...prev, storeName: null }));
                      }}
                      onFocus={() => handleInputFocus("storeName", 120)}
                      onBlur={() => setActiveField(null)}
                    />
                  </View>
                  {errors.storeName && <Text style={styles.errorText}>{errors.storeName}</Text>}
                </View>

                {/* Email Address */}
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Business Email</Text>
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
                      placeholder="business@example.com"
                      placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      maxLength={255}
                      onChangeText={(val) => {
                        setEmail(val);
                        if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                      }}
                      onFocus={() => handleInputFocus("email", 180)}
                      onBlur={() => setActiveField(null)}
                    />
                  </View>
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                {/* Mobile Phone */}
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Contact Phone Number</Text>
                  <View
                    style={[
                      styles.inputFieldContainer,
                      { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" },
                      activeField === "mobile" && { borderColor: colors.primary },
                      errors.mobile && styles.inputFieldError,
                    ]}
                  >
                    <Ionicons name="call-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder="10-15 digit phone"
                      placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                      keyboardType="phone-pad"
                      maxLength={15}
                      value={mobile}
                      onChangeText={(val) => {
                        setMobile(val);
                        if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: null }));
                      }}
                      onFocus={() => handleInputFocus("mobile", 240)}
                      onBlur={() => setActiveField(null)}
                    />
                  </View>
                  {errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}
                </View>

                {/* Business Type Selector */}
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Business Legal Type</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    {BUSINESS_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.id}
                        onPress={() => setBusinessType(type.id)}
                        style={[
                          styles.businessTypeBtn,
                          {
                            borderColor: businessType === type.id ? colors.primary : colors.borderMedium || "#CBD5E1",
                            backgroundColor: businessType === type.id ? (colors.primaryBgLight || "#EEF2FF") : colors.cardBg,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: businessType === type.id ? colors.primary : colors.textSecondary,
                            fontWeight: businessType === type.id ? "700" : "500",
                            fontSize: 13,
                          }}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Store Description */}
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Store Description (Optional)</Text>
                  <View
                    style={[
                      styles.inputFieldContainer,
                      styles.multilineContainer,
                      { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" },
                      activeField === "description" && { borderColor: colors.primary },
                      errors.description && styles.inputFieldError,
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
                      placeholder="Tell buyers about your products and specialties..."
                      placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                      multiline
                      numberOfLines={3}
                      maxLength={1000}
                      value={description}
                      onChangeText={(val) => setDescription(val)}
                      onFocus={() => handleInputFocus("description", 340)}
                      onBlur={() => setActiveField(null)}
                    />
                  </View>
                </View>
              </View>
            </>
          )}

          {activeTab === "address" && (
            <View style={styles.formContainer}>
              <View style={[styles.infoBanner, { backgroundColor: colors.primaryBgLight || "#EEF2FF" }]}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.infoBannerText, { color: colors.primary }]}>
                  This address is used as the registered location and pickup point for carrier shipments.
                </Text>
              </View>

              {/* Use Live Location Quick Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.liveLocationBannerBtn, { backgroundColor: colors.primaryBgLight || "#EEF2FF", borderColor: colors.primary }]}
                onPress={handleDetectLocation}
                disabled={isLocating}
              >
                <View style={[styles.liveLocationIconCircle, { backgroundColor: colors.cardBg }]}>
                  {isLocating ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="navigate-circle" size={26} color={colors.primary} />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.liveLocationBannerTitle, { color: colors.primary }]}>
                    Use My Current Live Location
                  </Text>
                  <Text style={[styles.liveLocationBannerSubtitle, { color: colors.textSecondary }]}>
                    Auto-fills Address, City, State, PIN & GPS coordinates
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </TouchableOpacity>

              {/* Pickup Address */}
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Pickup Street Address (Min 10 chars)</Text>
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
                    placeholder="Enter full physical address"
                    placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                    multiline
                    numberOfLines={2}
                    maxLength={500}
                    value={address}
                    onChangeText={(val) => {
                      setAddress(val);
                      if (errors.address) setErrors((prev) => ({ ...prev, address: null }));
                    }}
                    onFocus={() => handleInputFocus("address", 40)}
                    onBlur={() => setActiveField(null)}
                  />
                </View>
                {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
              </View>

              {/* City, State, Postal Code Row */}
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={[styles.inputWrapper, { flex: 1, marginRight: 6 }]}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>City</Text>
                  <View style={[styles.inputFieldContainer, { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" }]}>
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder="City"
                      placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                      maxLength={100}
                      value={city}
                      onChangeText={(val) => setCity(val)}
                    />
                  </View>
                </View>

                <View style={[styles.inputWrapper, { flex: 1, marginRight: 6 }]}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>State</Text>
                  <View style={[styles.inputFieldContainer, { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" }]}>
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder="State"
                      placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                      maxLength={100}
                      value={stateName}
                      onChangeText={(val) => setStateName(val)}
                    />
                  </View>
                </View>

                <View style={[styles.inputWrapper, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>PIN Code</Text>
                  <View style={[styles.inputFieldContainer, { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" }]}>
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder="PIN"
                      placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                      keyboardType="number-pad"
                      maxLength={10}
                      value={postalCode}
                      onChangeText={(val) => setPostalCode(val)}
                    />
                  </View>
                </View>
              </View>

              {/* Country */}
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Country</Text>
                <View style={[styles.inputFieldContainer, { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" }]}>
                  <Ionicons name="globe-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="Country"
                    placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                    maxLength={100}
                    value={country}
                    onChangeText={(val) => setCountry(val)}
                  />
                </View>
              </View>

              {/* Delivery Radius */}
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Delivery Radius (in KM)</Text>
                <View style={[styles.inputFieldContainer, { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" }, errors.deliveryRadiusKm && styles.inputFieldError]}>
                  <Ionicons name="speedometer-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="e.g. 10"
                    placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                    keyboardType="number-pad"
                    maxLength={3}
                    value={deliveryRadiusKm}
                    onChangeText={(val) => {
                      setDeliveryRadiusKm(val);
                      if (errors.deliveryRadiusKm) setErrors((prev) => ({ ...prev, deliveryRadiusKm: null }));
                    }}
                  />
                </View>
                {errors.deliveryRadiusKm && <Text style={styles.errorText}>{errors.deliveryRadiusKm}</Text>}
              </View>
            </View>
          )}

          {activeTab === "payout" && (
            <View style={styles.formContainer}>
              {/* Bank Details Card */}
              <View style={[styles.cardSection, { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1" }]}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="wallet-outline" size={22} color={colors.primary} />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Bank Account (For Payouts)</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                      Sales earnings will be transferred directly to this verified bank account.
                    </Text>
                  </View>
                </View>

                {/* Bank Name */}
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Bank Name</Text>
                  <View style={[styles.inputFieldContainer, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderMedium || "#CBD5E1" }, errors.bankName && styles.inputFieldError]}>
                    <Ionicons name="business-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder="e.g. State Bank of India"
                      placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                      maxLength={255}
                      value={bankName}
                      onChangeText={(val) => {
                        setBankName(val);
                        if (errors.bankName) setErrors((prev) => ({ ...prev, bankName: null }));
                      }}
                    />
                  </View>
                  {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}
                </View>

                {/* Account Holder Name */}
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Account Holder Name</Text>
                  <View style={[styles.inputFieldContainer, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderMedium || "#CBD5E1" }, errors.bankHolderName && styles.inputFieldError]}>
                    <Ionicons name="person-circle-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder="Beneficiary name as per bank records"
                      placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                      maxLength={255}
                      value={bankHolderName}
                      onChangeText={(val) => {
                        setBankHolderName(val);
                        if (errors.bankHolderName) setErrors((prev) => ({ ...prev, bankHolderName: null }));
                      }}
                    />
                  </View>
                  {errors.bankHolderName && <Text style={styles.errorText}>{errors.bankHolderName}</Text>}
                </View>

                {/* Account Number */}
                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Bank Account Number</Text>
                    {accountNo ? (
                      <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "500" }}>{accountNo.length}/20 digits</Text>
                    ) : null}
                  </View>
                  <View style={[styles.inputFieldContainer, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderMedium || "#CBD5E1" }, errors.accountNo && styles.inputFieldError]}>
                    <Ionicons name="card-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder="Enter 9 to 20 digit account number"
                      placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                      keyboardType="number-pad"
                      maxLength={20}
                      value={accountNo}
                      onChangeText={(val) => {
                        const clean = sanitizeAccountNumber(val);
                        setAccountNo(clean);
                        if (errors.accountNo) setErrors((prev) => ({ ...prev, accountNo: null }));
                      }}
                    />
                  </View>
                  {errors.accountNo && <Text style={styles.errorText}>{errors.accountNo}</Text>}
                </View>

                {/* IFSC Code */}
                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Bank IFSC Code</Text>
                    {ifscCode ? (
                      <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "500" }}>{ifscCode.length}/11 chars</Text>
                    ) : null}
                  </View>
                  <View style={[styles.inputFieldContainer, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderMedium || "#CBD5E1" }, errors.ifscCode && styles.inputFieldError]}>
                    <Ionicons name="key-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary }]}
                      placeholder="e.g. SBIN0001234"
                      placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={11}
                      value={ifscCode}
                      onChangeText={(val) => {
                        const clean = sanitizeIfscCode(val);
                        setIfscCode(clean);
                        if (errors.ifscCode) setErrors((prev) => ({ ...prev, ifscCode: null }));
                      }}
                    />
                  </View>
                  {errors.ifscCode && <Text style={styles.errorText}>{errors.ifscCode}</Text>}
                </View>
              </View>

              {/* Tax Identifiers Card */}
              <View style={[styles.cardSection, { backgroundColor: colors.cardBg, borderColor: colors.borderMedium || "#CBD5E1", marginTop: 16 }]}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Business Tax Identifiers</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                      Tax identifiers used for GST invoicing and legal compliance.
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>GST Number (Optional)</Text>
                    <View style={[styles.inputFieldContainer, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderMedium || "#CBD5E1" }]}>
                      <TextInput
                        style={[styles.textInput, { color: colors.textPrimary }]}
                        placeholder="GSTIN ID"
                        placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                        autoCapitalize="characters"
                        maxLength={15}
                        value={gstin}
                        onChangeText={(val) => setGstin(val)}
                      />
                    </View>
                  </View>

                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>PAN Number (Optional)</Text>
                    <View style={[styles.inputFieldContainer, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderMedium || "#CBD5E1" }]}>
                      <TextInput
                        style={[styles.textInput, { color: colors.textPrimary }]}
                        placeholder="PAN Card No"
                        placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                        autoCapitalize="characters"
                        maxLength={10}
                        value={panNumber}
                        onChangeText={(val) => setPanNumber(val)}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer with Save Changes Button */}
        <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: colors.borderLight }]}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.88}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.textContrast || "#FFFFFF"} size="small" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={colors.textContrast || "#FFFFFF"}
                  style={styles.btnIconMarginRight6}
                />
                <Text style={[styles.saveBtnText, { color: colors.textContrast || "#FFFFFF" }]}>
                  Save Profile Changes
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Photo Picker Bottom Sheet */}
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
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.borderMedium || "#CBD5E1" }]} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
              {activePhotoTarget === "banner" ? "Upload Store Banner" : "Upload Store Logo"}
            </Text>

            {/* Choose from Gallery */}
            <TouchableOpacity
              style={[styles.sheetOption, { borderBottomColor: colors.borderLight }]}
              activeOpacity={0.7}
              onPress={handleOpenGallery}
            >
              <View style={[styles.sheetIconBox, { backgroundColor: "rgba(59, 130, 246, 0.12)" }]}>
                <Ionicons name="images-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.sheetOptionTextContainer}>
                <Text style={[styles.sheetOptionTitle, { color: colors.textPrimary }]}>
                  Choose from Gallery
                </Text>
                <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>
                  Select an image from your device photos
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Take a Photo */}
            <TouchableOpacity
              style={[styles.sheetOption, { borderBottomColor: colors.borderLight }]}
              activeOpacity={0.7}
              onPress={handleOpenCamera}
            >
              <View style={[styles.sheetIconBox, { backgroundColor: "rgba(16, 185, 129, 0.12)" }]}>
                <Ionicons name="camera-outline" size={22} color="#10B981" />
              </View>
              <View style={styles.sheetOptionTextContainer}>
                <Text style={[styles.sheetOptionTitle, { color: colors.textPrimary }]}>
                  Take a Photo
                </Text>
                <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>
                  Capture a new photo with camera
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
                  name={
                    alertConfig.type === "success"
                      ? "checkmark"
                      : alertConfig.type === "error"
                        ? "alert"
                        : "information"
                  }
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
                name={
                  alertConfig.type === "success"
                    ? "arrow-forward"
                    : "refresh-outline"
                }
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

export default EditProfile;

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
  tabBarContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingHorizontal: 12,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileHeaderDecoration: {
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 16,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 10,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2.5,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  editBadgeBtn: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  changePhotoBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: "700",
  },
  avatarSubText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 30,
  },
  bannerSectionWrapper: {
    width: "100%",
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
  },
  bannerContainer: {
    width: "100%",
    height: 120,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerEmptyContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  bannerEmptyText: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  bannerEmptySubText: {
    fontSize: 11,
    marginTop: 2,
  },
  bannerEditBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },
  liveLocationBannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.2,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  liveLocationIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  liveLocationBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  liveLocationBannerSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  businessTypeBtn: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
  },
  cardSection: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  detectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 8,
  },
  detectBtnText: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSlateDark,
    marginBottom: 7,
  },
  inputFieldContainer: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
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
  multilineContainer: {
    height: "auto",
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  multilineInputIcon: {
    marginRight: 10,
    marginTop: 8,
  },
  multilineInput: {
    textAlignVertical: "top",
    minHeight: 65,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.error,
    fontWeight: "500",
    marginTop: 4,
    marginLeft: 2,
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
    fontSize: 15,
    fontWeight: "700",
  },
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
