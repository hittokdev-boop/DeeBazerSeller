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
  Image,
  PermissionsAndroid,
  RefreshControl,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { updateSellerAccount, updateSellerProfile, getSellerMe } from "../../api/auth";

const EditProfile = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [avatarUri, setAvatarUri] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPhotoPickerModal, setShowPhotoPickerModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeField, setActiveField] = useState(null);

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
      console.warn("Gallery permission error:", err);
      return true;
    }
  };

  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      const [storedProfile, storedUser, storedSeller] = await Promise.all([
        AsyncStorage.getItem("sellerProfile"),
        AsyncStorage.getItem("userData"),
        AsyncStorage.getItem("sellerData"),
      ]);

      const parsedProfile = storedProfile ? JSON.parse(storedProfile) : {};
      const parsedUser = storedUser ? JSON.parse(storedUser) : {};
      const parsedSeller = storedSeller ? JSON.parse(storedSeller) : {};

      setOwnerName(parsedUser.name || parsedProfile.ownerName || parsedProfile.name || "");
      setEmail(parsedUser.email || parsedProfile.email || "");
      setMobile(parsedUser.mobile || parsedProfile.phone || parsedProfile.mobile || "");

      const initialLogo =
        parsedUser.logo_url ||
        parsedSeller.logo_url ||
        parsedProfile.logoUri ||
        parsedProfile.logo_url ||
        "";
      setAvatarUri(initialLogo);

      // Try fresh fetch if online
      try {
        const freshData = await getSellerMe();
        console.log("freshLogo", freshData);
        if (freshData?.data) {
          const data = freshData.data;
          
          // Check if the data has seller/user structure
          const sellerObj = data.seller || data;
          const userObj = data.user || data;

          setOwnerName(sellerObj.store_name || userObj.name || "");
          setEmail(userObj.email || sellerObj.email || "");
          setMobile(userObj.mobile || sellerObj.phone || userObj.phone || "");
          const freshLogo = sellerObj.logo_url || userObj.logo_url;

          if (freshLogo) {
            setAvatarUri(freshLogo);
          }
        }
      } catch (e) {
        // offline fallback
      }
    } catch (err) {
      console.log("Error loading profile", err);
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
          setAvatarUri(asset.uri);
          setSelectedPhoto(asset);
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
        message: "Camera permission is required to take a new profile photo. Please grant permission in settings.",
        buttonText: "Okay",
      });
      return;
    }

    launchCamera(
      {
        mediaType: "photo",
        quality: 0.85,
        cameraType: "front",
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
          setAvatarUri(asset.uri);
          setSelectedPhoto(asset);
        }
      }
    );
  };

  const validate = () => {
    let tempErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[6-9]\d{9}$/;

    if (ownerName.trim() && ownerName.trim().length < 2) {
      tempErrors.ownerName = "Name must be at least 2 characters";
    }
    if (email.trim() && !emailRegex.test(email.trim())) {
      tempErrors.email = "Please enter a valid email address";
    }
    if (mobile.trim() && !phoneRegex.test(mobile.trim())) {
      tempErrors.mobile = "Please enter a valid 10-digit mobile number";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload = {};
      if (ownerName.trim()) payload.name = ownerName.trim();
      if (email.trim()) payload.email = email.trim();
      if (mobile.trim()) payload.mobile = mobile.trim();

      // 1. Update text account details
      const response = await updateSellerAccount(payload);
      let updatedUser = response?.data?.user || {};

      // 2. Upload photo if selected
      if (selectedPhoto && selectedPhoto.uri) {
        try {
          const formData = new FormData();
          formData.append("logo", {
            uri:
              Platform.OS === "android"
                ? selectedPhoto.uri
                : selectedPhoto.uri.replace("file://", ""),
            type: selectedPhoto.type || "image/jpeg",
            name: selectedPhoto.fileName || `avatar_${Date.now()}.jpg`,
          });

          const profileRes = await updateSellerProfile(formData);
          if (profileRes?.data?.logo_url) {
            updatedUser.logo_url = profileRes.data.logo_url;
            setAvatarUri(profileRes.data.logo_url);
          }
        } catch (photoErr) {
          console.log("Photo upload error:", photoErr);
          throw new Error(photoErr.message || "Failed to upload profile photo");
        }
      }

      const finalLogo = updatedUser.logo_url || avatarUri;

      // Sync with local AsyncStorage
      const storedProfile = await AsyncStorage.getItem("sellerProfile");
      const currentProfile = storedProfile ? JSON.parse(storedProfile) : {};

      const updatedProfile = {
        ...currentProfile,
        ...updatedUser,
        ownerName: updatedUser.name || ownerName.trim(),
        name: updatedUser.name || ownerName.trim(),
        email: updatedUser.email || email.trim(),
        mobile: updatedUser.mobile || mobile.trim(),
        phone: updatedUser.mobile || mobile.trim(),
        logoUri: finalLogo,
        logo_url: finalLogo,
      };

      const storedUserData = await AsyncStorage.getItem("userData");
      const currentUserData = storedUserData ? JSON.parse(storedUserData) : {};
      const updatedUserData = {
        ...currentUserData,
        ...updatedUser,
        logo_url: finalLogo,
      };

      await Promise.all([
        AsyncStorage.setItem("sellerProfile", JSON.stringify(updatedProfile)),
        AsyncStorage.setItem("userData", JSON.stringify(updatedUserData)),
      ]);

      setSelectedPhoto(null);

      showAlert({
        type: "success",
        title: "Profile Updated!",
        message:
          response?.message || "Your profile and avatar details were successfully updated.",
        buttonText: "Done",
        onConfirm: () => navigation.goBack(),
      });
    } catch (err) {
      console.log("Error saving profile", err);
      if (err?.data?.errors) {
        const fieldErrors = {};
        if (err.data.errors.name) fieldErrors.ownerName = err.data.errors.name[0];
        if (err.data.errors.email) fieldErrors.email = err.data.errors.email[0];
        if (err.data.errors.mobile) fieldErrors.mobile = err.data.errors.mobile[0];
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Avatar Section */}
          <View style={styles.profileHeaderDecoration}>
            <View style={styles.avatarWrapper}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowPhotoPickerModal(true)}
                style={[
                  styles.avatarContainer,
                  {
                    backgroundColor: colors.primaryBgLight || "#EEF2FF",
                    borderColor: colors.primary,
                  },
                ]}
              >
                {avatarUri ? (
                  <Image
                    source={{
                      uri: avatarUri.includes("pravatar.cc") || avatarUri.startsWith("file://")
                        ? avatarUri
                        : `${avatarUri}${avatarUri.includes("?") ? "&" : "?"}t=${new Date().getTime()}`
                    }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={48} color={colors.primary} />
                )}
              </TouchableOpacity>

              {/* Edit Camera Badge */}
              <TouchableOpacity
                style={[styles.editBadgeBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.9}
                onPress={() => setShowPhotoPickerModal(true)}
              >
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setShowPhotoPickerModal(true)}
              style={styles.changePhotoBtn}
            >
              <Text style={[styles.changePhotoText, { color: colors.primary }]}>
                Change Profile Photo
              </Text>
            </TouchableOpacity>

            <Text style={[styles.avatarSubText, { color: colors.textSecondary }]}>
              Tap the camera badge or photo to upload a new profile image
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Owner Name */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Full Name / Owner Name</Text>
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
                  onChangeText={(val) => {
                    setOwnerName(val);
                    if (errors.ownerName) setErrors((prev) => ({ ...prev, ownerName: null }));
                  }}
                  onFocus={() => setActiveField("ownerName")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.ownerName && <Text style={styles.errorText}>{errors.ownerName}</Text>}
            </View>

            {/* Email Address */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Email Address</Text>
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
                  placeholder="Enter your business email"
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

            {/* Mobile Number */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Mobile Number</Text>
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
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor={colors.textGrayPlaceholder || "#94A3B8"}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={mobile}
                  onChangeText={(val) => {
                    setMobile(val.replace(/[^0-9]/g, ""));
                    if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: null }));
                  }}
                  onFocus={() => setActiveField("mobile")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: colors.borderLight }]}>
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
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.textContrast} style={styles.btnIconMarginRight6} />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Photo Picker Bottom Sheet Modal */}
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
              Change Profile Photo
            </Text>

            <TouchableOpacity
              style={[styles.sheetOption, { borderBottomColor: colors.borderLight }]}
              onPress={handleOpenGallery}
            >
              <View style={[styles.sheetIconBox, { backgroundColor: "rgba(59, 130, 246, 0.12)" }]}>
                <Ionicons name="images-outline" size={22} color="#3B82F6" />
              </View>
              <View style={styles.sheetOptionTextContainer}>
                <Text style={[styles.sheetOptionTitle, { color: colors.textPrimary }]}>
                  Choose from Gallery
                </Text>
                <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>
                  Pick an existing image from your device
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetOption, { borderBottomColor: colors.borderLight }]}
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
            {/* Animated Badge Icon */}
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

            {/* Action Button */}
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
  profileHeaderDecoration: {
    alignItems: "center",
    marginVertical: 24,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 10,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
  },
  editBadgeBtn: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
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
  // Bottom Sheet Modal
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
  // Custom Alert
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
