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
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  PermissionsAndroid,
  Keyboard,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { launchImageLibrary } from "react-native-image-picker";
import Geolocation from "@react-native-community/geolocation";
import COLORS from "../../constants/theme";
import { BASE_URL, getSellerCategories, registerSeller } from "../../api/auth";
import { fetchAccurateLiveLocation } from "../../services/mapService";
import {
  validateAccountNumber,
  validateIfscCode,
  validateAccountHolderName,
  validateBankName,
  sanitizeAccountNumber,
  sanitizeIfscCode,
} from "../../utils/bankValidation";

const CATEGORIES = [
  "Electronics",
  "Fashion",
  "Home & Kitchen",
  "Beauty & Personal Care",
  "Grocery & Gourmet",
  "Sports & Outdoors",
  "Toys & Games",
  "Books & Media",
  "Health & Wellness",
  "Jewelry & Watches",
  "Office Products",
  "Pet Supplies",
  "Baby Products",
  "Garden & Outdoors",
];

const SellerRegistration = ({ navigation, onRegisterSuccess }) => {
  const scrollViewRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [categoriesList, setCategoriesList] = useState(CATEGORIES);

  // Automatically dismiss keyboard and scroll to top whenever step changes
  useEffect(() => {
    Keyboard.dismiss();
    const scrollToTop = () => {
      scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    };

    scrollToTop();
    const timer1 = setTimeout(scrollToTop, 50);
    const timer2 = setTimeout(scrollToTop, 150);
    const timer3 = setTimeout(scrollToTop, 300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [currentStep]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const cats = await getSellerCategories();
        if (isMounted && Array.isArray(cats) && cats.length > 0) {
          const names = cats.map((c) => (typeof c === "object" ? c.name : c));
          setCategoriesList(names);
        }
      } catch (e) {
        // Fallback to default categories
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Custom alert configuration state
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success", // success, warning, error
    onPress: null,
  });

  const showAlert = (title, message, type = "success", onPress = null) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onPress,
    });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
    if (alertConfig.onPress) {
      alertConfig.onPress();
    }
  };

  // Form Fields State adhering strictly to Laravel validation
  const [form, setForm] = useState({
    // User account
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",

    // Store basics
    storeName: "",
    category: "",
    description: "",
    logoUri: "",

    // Business info
    businessType: "individual", // individual, company, partnership
    gstin: "",
    panNumber: "",

    // Address
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",

    // Location (optional — enables delivery radius features)
    latitude: "",
    longitude: "",
    deliveryRadiusKm: "",

    // Bank details (required for payouts)
    bankName: "",
    bankHolderName: "",
    accountNo: "",
    ifscCode: "",
  });

  const [errors, setErrors] = useState({});
  const [activeField, setActiveField] = useState(null);

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Auto-detect live location and auto-fill address + GPS
  const handleFetchLiveLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const loc = await fetchAccurateLiveLocation();
      if (!loc || !loc.latitude || !loc.longitude) {
        showAlert(
          "Location Unavailable",
          "Could not detect GPS location. Please turn on device Location/GPS.",
          "error"
        );
        setIsDetectingLocation(false);
        return;
      }

      const fullStreet =
        loc.address && loc.address.length >= 10
          ? loc.address
          : loc.formattedAddress || loc.address || "";

      setForm((prev) => ({
        ...prev,
        address: fullStreet || prev.address,
        city: loc.city || prev.city,
        state: loc.state || prev.state,
        postalCode: loc.postalCode || prev.postalCode,
        country: loc.country || prev.country || "India",
        latitude: String(Number(loc.latitude).toFixed(6)),
        longitude: String(Number(loc.longitude).toFixed(6)),
      }));

      setErrors((prev) => ({
        ...prev,
        address: null,
        city: null,
        state: null,
        postalCode: null,
        latitude: null,
        longitude: null,
      }));

      showAlert(
        "Live Location Detected!",
        `Address, City (${loc.city || ""}), State (${loc.state || ""}), PIN (${loc.postalCode || ""}) and GPS coordinates have been auto-filled. You can also edit them manually.`,
        "success"
      );
    } catch (err) {
      console.warn("Live location error:", err);
      showAlert("Location Error", err?.message || "Failed to detect live location.", "error");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleDetectLocation = handleFetchLiveLocation;

  const validateStep = (step) => {
    let stepErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10,15}$/;

    if (step === 1) {
      if (!form.ownerName.trim() || form.ownerName.trim().length < 2) {
        stepErrors.ownerName = "Name must be at least 2 characters";
      } else if (form.ownerName.trim().length > 255) {
        stepErrors.ownerName = "Name cannot exceed 255 characters";
      }

      if (!form.email.trim() || !emailRegex.test(form.email.trim())) {
        stepErrors.email = "Please enter a valid email address";
      }

      if (!form.phone.trim() || !phoneRegex.test(form.phone.trim())) {
        stepErrors.phone = "Please enter a valid 10-15 digit mobile number";
      }

      if (!form.password || form.password.length < 6) {
        stepErrors.password = "Password must be at least 6 characters";
      }

      if (!form.confirmPassword) {
        stepErrors.confirmPassword = "Confirm password is required";
      } else if (form.confirmPassword !== form.password) {
        stepErrors.confirmPassword = "Passwords do not match";
      }
    }

    if (step === 2) {
      if (!form.storeName.trim() || form.storeName.trim().length < 2) {
        stepErrors.storeName = "Store name must be at least 2 characters";
      } else if (form.storeName.trim().length > 255) {
        stepErrors.storeName = "Store name cannot exceed 255 characters";
      }

      if (!form.address.trim() || form.address.trim().length < 10) {
        stepErrors.address = "Address must be at least 10 characters";
      } else if (form.address.trim().length > 500) {
        stepErrors.address = "Address cannot exceed 500 characters";
      }

      if (!form.city.trim()) {
        stepErrors.city = "City is required";
      } else if (form.city.trim().length > 100) {
        stepErrors.city = "City cannot exceed 100 characters";
      }

      if (!form.state.trim()) {
        stepErrors.state = "State is required";
      } else if (form.state.trim().length > 100) {
        stepErrors.state = "State cannot exceed 100 characters";
      }

      if (!form.postalCode.trim()) {
        stepErrors.postalCode = "PIN / Postal code is required";
      } else if (form.postalCode.trim().length > 10) {
        stepErrors.postalCode = "Postal code cannot exceed 10 characters";
      }

      if (form.description && form.description.length > 1000) {
        stepErrors.description = "Store description cannot exceed 1000 characters";
      }

      if (form.latitude) {
        const lat = parseFloat(form.latitude);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          stepErrors.latitude = "Latitude must be between -90 and 90";
        }
      }

      if (form.longitude) {
        const lng = parseFloat(form.longitude);
        if (isNaN(lng) || lng < -180 || lng > 180) {
          stepErrors.longitude = "Longitude must be between -180 and 180";
        }
      }

      if (form.deliveryRadiusKm) {
        const radius = parseInt(form.deliveryRadiusKm, 10);
        if (isNaN(radius) || radius < 1 || radius > 500) {
          stepErrors.deliveryRadiusKm = "Delivery radius must be between 1 and 500 km";
        }
      }
    }

    if (step === 3) {
      if (form.gstin && form.gstin.trim().length > 15) {
        stepErrors.gstin = "GST number cannot exceed 15 characters";
      }
      if (form.panNumber && form.panNumber.trim().length > 10) {
        stepErrors.panNumber = "PAN number cannot exceed 10 characters";
      }

      // If user entered ANY bank information, validate strictly
      const hasAnyBankData = Boolean(
        form.accountNo?.trim() ||
        form.ifscCode?.trim() ||
        form.bankHolderName?.trim() ||
        form.bankName?.trim()
      );

      if (hasAnyBankData) {
        const accCheck = validateAccountNumber(form.accountNo, true);
        if (!accCheck.isValid) stepErrors.accountNo = accCheck.error;

        const ifscCheck = validateIfscCode(form.ifscCode, true);
        if (!ifscCheck.isValid) stepErrors.ifscCode = ifscCheck.error;

        if (form.bankHolderName?.trim()) {
          const holderCheck = validateAccountHolderName(form.bankHolderName, false);
          if (!holderCheck.isValid) stepErrors.bankHolderName = holderCheck.error;
        }

        if (form.bankName?.trim()) {
          const bankCheck = validateBankName(form.bankName, false);
          if (!bankCheck.isValid) stepErrors.bankName = bankCheck.error;
        }
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    Keyboard.dismiss();
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    Keyboard.dismiss();
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

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
          handleInputChange("logoUri", response.assets[0].uri);
        }
      }
    );
  };

  const handleRegister = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      showAlert("Validation Error", "Please check the form fields and correct any errors.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      let payload;
      const ownerName = (form.ownerName || "").trim();
      const email = (form.email || "").trim().toLowerCase();
      const mobile = (form.phone || "").trim();
      const password = form.password;
      const confirmPassword = form.confirmPassword || form.password;
      const storeName = (form.storeName || "").trim();
      const storeDescription =
        (form.description || "").trim() || `${storeName} products and accessories`;
      const businessType = form.businessType || "individual";
      const address = (form.address || "").trim();
      const city = (form.city || "").trim();
      const state = (form.state || "").trim();
      const postalCode = (form.postalCode || "").trim();
      const country = (form.country || "India").trim();

      const latitude = form.latitude ? parseFloat(form.latitude) : null;
      const longitude = form.longitude ? parseFloat(form.longitude) : null;
      const deliveryRadiusKm = form.deliveryRadiusKm
        ? parseInt(form.deliveryRadiusKm, 10)
        : null;

      const gstin = (form.gstin || "").trim();
      const panNumber = (form.panNumber || "").trim();
      const bankName = (form.bankName || "").trim();
      const bankAccountNo = (form.accountNo || "").trim();
      const bankIfsc = (form.ifscCode || "").trim();
      const bankHolder = (form.bankHolderName || "").trim();

      if (form.logoUri) {
        const data = new FormData();
        data.append("name", ownerName);
        data.append("email", email);
        data.append("mobile", mobile);
        data.append("password", password);
        data.append("password_confirmation", confirmPassword);
        data.append("store_name", storeName);
        if (storeDescription) data.append("store_description", storeDescription);
        data.append("business_type", businessType);
        data.append("address", address);
        data.append("city", city);
        data.append("state", state);
        data.append("postal_code", postalCode);
        if (country) data.append("country", country);

        if (latitude !== null && !isNaN(latitude)) {
          data.append("latitude", String(latitude));
        }
        if (longitude !== null && !isNaN(longitude)) {
          data.append("longitude", String(longitude));
        }
        if (deliveryRadiusKm !== null && !isNaN(deliveryRadiusKm)) {
          data.append("delivery_radius_km", String(deliveryRadiusKm));
        }

        if (gstin) data.append("gst_number", gstin);
        if (panNumber) data.append("pan_number", panNumber);
        if (bankName) data.append("bank_name", bankName);
        if (bankAccountNo) data.append("bank_account_number", bankAccountNo);
        if (bankIfsc) data.append("bank_ifsc_code", bankIfsc);
        if (bankHolder) data.append("bank_account_holder_name", bankHolder);

        const uri = form.logoUri;
        const filename = uri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        data.append("logo", {
          uri: uri,
          name: filename || "logo.jpg",
          type: type,
        });

        payload = data;
      } else {
        payload = {
          name: ownerName,
          email: email,
          mobile: mobile,
          password: password,
          password_confirmation: confirmPassword,
          store_name: storeName,
          business_type: businessType,
          address: address,
          city: city,
          state: state,
          postal_code: postalCode,
        };

        if (storeDescription) payload.store_description = storeDescription;
        if (country) payload.country = country;
        if (latitude !== null && !isNaN(latitude)) payload.latitude = latitude;
        if (longitude !== null && !isNaN(longitude)) payload.longitude = longitude;
        if (deliveryRadiusKm !== null && !isNaN(deliveryRadiusKm)) {
          payload.delivery_radius_km = deliveryRadiusKm;
        }

        if (gstin) payload.gst_number = gstin;
        if (panNumber) payload.pan_number = panNumber;
        if (bankName) payload.bank_name = bankName;
        if (bankAccountNo) payload.bank_account_number = bankAccountNo;
        if (bankIfsc) payload.bank_ifsc_code = bankIfsc;
        if (bankHolder) payload.bank_account_holder_name = bankHolder;
      }

      const responseData = await registerSeller(payload);

      const profileData = {
        ...form,
        registeredAt: new Date().toISOString(),
        ...(responseData?.data?.seller || responseData?.data || {}),
        shiprocket_pickup_name: responseData?.shiprocket_pickup_name || null,
      };

      await AsyncStorage.setItem("isRegistered", "true");

      const successMessage =
        responseData?.message ||
        "Registration successful! Your seller account is under review. We will notify you once approved.";

      showAlert(
        "Registration Successful",
        successMessage,
        "success",
        () => {
          if (onRegisterSuccess) {
            onRegisterSuccess(profileData);
          } else if (navigation?.navigate) {
            navigation.navigate("Login");
          } else if (navigation?.goBack) {
            navigation.goBack();
          }
        }
      );
    } catch (error) {
      if (error.errors && typeof error.errors === "object") {
        const errorList = Object.values(error.errors).flat().filter(Boolean).join("\n");
        showAlert("Validation Error", errorList || error.message, "error");
      } else {
        showAlert("Registration Error", error.message || "Something went wrong. Please try again.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 1, label: "Profile" },
      { id: 2, label: "Store" },
      { id: 3, label: "Payout & Ready" },
    ];

    return (
      <View style={styles.stepIndicatorWrapper}>
        <View style={styles.stepIndicatorRow}>
          {steps.map((step, idx) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            return (
              <React.Fragment key={step.id}>
                <View style={styles.stepCircleContainer}>
                  <View
                    style={[
                      styles.stepCircle,
                      isActive && styles.activeStepCircle,
                      isCompleted && styles.completedStepCircle,
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={18} color={COLORS.textContrast} />
                    ) : (
                      <Text
                        style={[
                          styles.stepNumber,
                          isActive && styles.activeStepNumber,
                        ]}
                      >
                        {step.id}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, isActive && styles.activeStepLabel]}>
                    {step.label}
                  </Text>
                </View>

                {idx < steps.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      currentStep > step.id && styles.completedStepLine,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View key="step-1" style={styles.stepCard}>
            <Text style={styles.stepTitle}>Seller Credentials</Text>
            <Text style={styles.stepSubtitle}>
              Create your account details to start selling on DeeBazar.
            </Text>

            {/* Owner Name */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View
                style={[
                  styles.inputFieldContainer,
                  activeField === "ownerName" && styles.inputFieldFocus,
                  errors.ownerName && styles.inputFieldError,
                ]}
              >
                <Ionicons name="person-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your full name"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  value={form.ownerName}
                  maxLength={255}
                  onChangeText={(val) => handleInputChange("ownerName", val)}
                  onFocus={() => setActiveField("ownerName")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.ownerName && <Text style={styles.errorText}>{errors.ownerName}</Text>}
            </View>

            {/* Email */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Business Email</Text>
              <View
                style={[
                  styles.inputFieldContainer,
                  activeField === "email" && styles.inputFieldFocus,
                  errors.email && styles.inputFieldError,
                ]}
              >
                <Ionicons name="mail-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter business email"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  maxLength={255}
                  onChangeText={(val) => handleInputChange("email", val)}
                  onFocus={() => setActiveField("email")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Phone */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Contact Mobile Number</Text>
              <View
                style={[
                  styles.inputFieldContainer,
                  activeField === "phone" && styles.inputFieldFocus,
                  errors.phone && styles.inputFieldError,
                ]}
              >
                <Ionicons name="call-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter 10 to 15 digit mobile number"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  keyboardType="phone-pad"
                  maxLength={15}
                  value={form.phone}
                  onChangeText={(val) => handleInputChange("phone", val)}
                  onFocus={() => setActiveField("phone")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Password (Min 6 Characters)</Text>
              <View
                style={[
                  styles.inputFieldContainer,
                  activeField === "password" && styles.inputFieldFocus,
                  errors.password && styles.inputFieldError,
                ]}
              >
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Create a strong password"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  secureTextEntry={!showPassword}
                  value={form.password}
                  onChangeText={(val) => handleInputChange("password", val)}
                  onFocus={() => setActiveField("password")}
                  onBlur={() => setActiveField(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={COLORS.textGrayLight}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View
                style={[
                  styles.inputFieldContainer,
                  activeField === "confirmPassword" && styles.inputFieldFocus,
                  errors.confirmPassword && styles.inputFieldError,
                ]}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Re-enter password to confirm"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  secureTextEntry={!showConfirmPassword}
                  value={form.confirmPassword}
                  onChangeText={(val) => handleInputChange("confirmPassword", val)}
                  onFocus={() => setActiveField("confirmPassword")}
                  onBlur={() => setActiveField(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={COLORS.textGrayLight}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            {/* Login Link */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Login")}
              style={styles.loginRedirectContainer}
            >
              <Text style={styles.loginRedirectText}>
                Already have an account? <Text style={styles.loginRedirectHighlight}>Log In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View key="step-2" style={styles.stepCard}>
            <Text style={styles.stepTitle}>Store Setup & Location</Text>
            <Text style={styles.stepSubtitle}>
              Give your shop an identity and set your address & delivery coverage.
            </Text>

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
                  placeholder="e.g. Acme Superstore"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  value={form.storeName}
                  maxLength={255}
                  onChangeText={(val) => handleInputChange("storeName", val)}
                  onFocus={() => setActiveField("storeName")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.storeName && <Text style={styles.errorText}>{errors.storeName}</Text>}
            </View>

            {/* Primary Category Selector */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Primary Category (Optional)</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.inputFieldContainer, styles.dropdownContainer]}
                onPress={() => setShowCategoryModal(true)}
              >
                <Ionicons
                  name="grid-outline"
                  size={20}
                  color={COLORS.textGrayLight}
                  style={styles.dropdownIcon}
                />
                <Text
                  style={[
                    styles.textInput,
                    styles.dropdownText,
                    !form.category && { color: COLORS.textGrayPlaceholder },
                  ]}
                >
                  {form.category || "Select your shop category"}
                </Text>
                <Ionicons name="chevron-down-outline" size={18} color={COLORS.textGrayLight} />
              </TouchableOpacity>
            </View>

            {/* Business Type Buttons */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Business Type</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                {["individual", "company", "partnership"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => handleInputChange("businessType", type)}
                    style={{
                      flex: 1,
                      marginHorizontal: 4,
                      paddingVertical: 10,
                      alignItems: "center",
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: form.businessType === type ? COLORS.primary : COLORS.borderMedium,
                      backgroundColor: form.businessType === type ? COLORS.borderHighlight : COLORS.background,
                    }}
                  >
                    <Text style={{
                      color: form.businessType === type ? COLORS.primary : COLORS.textGrayMedium,
                      fontWeight: form.businessType === type ? "bold" : "normal",
                      fontSize: 13,
                    }}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Use Live Location Quick Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.liveLocationBannerBtn}
              onPress={handleFetchLiveLocation}
              disabled={isDetectingLocation}
            >
              <View style={styles.liveLocationIconCircle}>
                {isDetectingLocation ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Ionicons name="navigate-circle" size={26} color={COLORS.primary} />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.liveLocationBannerTitle}>Use My Current Live Location</Text>
                <Text style={styles.liveLocationBannerSubtitle}>
                  Auto-fill Address, City, State, PIN & GPS coordinates
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
            </TouchableOpacity>

            {/* Address */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Pickup / Registered Address (Min 10 chars)</Text>
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
                  style={styles.multilineInputIcon}
                />
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="Enter full street address where items will be picked up"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  multiline
                  numberOfLines={2}
                  maxLength={500}
                  value={form.address}
                  onChangeText={(val) => handleInputChange("address", val)}
                  onFocus={() => setActiveField("address")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
            </View>

            {/* City, State, Postal Code Row */}
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={[styles.inputWrapper, { flex: 1, marginRight: 6 }]}>
                <Text style={styles.inputLabel}>City</Text>
                <View style={[styles.inputFieldContainer, errors.city && styles.inputFieldError]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="City"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    maxLength={100}
                    value={form.city}
                    onChangeText={(val) => handleInputChange("city", val)}
                  />
                </View>
                {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
              </View>

              <View style={[styles.inputWrapper, { flex: 1, marginRight: 6 }]}>
                <Text style={styles.inputLabel}>State</Text>
                <View style={[styles.inputFieldContainer, errors.state && styles.inputFieldError]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="State"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    maxLength={100}
                    value={form.state}
                    onChangeText={(val) => handleInputChange("state", val)}
                  />
                </View>
                {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
              </View>

              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={styles.inputLabel}>PIN Code</Text>
                <View style={[styles.inputFieldContainer, errors.postalCode && styles.inputFieldError]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="PIN Code"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    keyboardType="number-pad"
                    maxLength={10}
                    value={form.postalCode}
                    onChangeText={(val) => handleInputChange("postalCode", val)}
                  />
                </View>
                {errors.postalCode && <Text style={styles.errorText}>{errors.postalCode}</Text>}
              </View>
            </View>

            {/* Country */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Country</Text>
              <View style={styles.inputFieldContainer}>
                <Ionicons
                  name="globe-outline"
                  size={20}
                  color={COLORS.textGrayLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Country"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  maxLength={100}
                  value={form.country}
                  onChangeText={(val) => handleInputChange("country", val)}
                />
              </View>
            </View>

            {/* Store Description */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Store Description (Optional)</Text>
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
                  style={styles.multilineInputIcon}
                />
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="Tell buyers what you sell..."
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  multiline
                  numberOfLines={2}
                  maxLength={1000}
                  value={form.description}
                  onChangeText={(val) => handleInputChange("description", val)}
                  onFocus={() => setActiveField("description")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            </View>


            {/* Logo Image Picker */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Store Logo / Profile Picture (Optional)</Text>
              {form.logoUri ? (
                <View style={styles.logoPreviewContainer}>
                  <Image source={{ uri: form.logoUri }} style={styles.logoPreviewImage} />
                  <View style={styles.logoDetails}>
                    <Text style={styles.logoSelectedText}>Logo successfully selected</Text>
                    <TouchableOpacity onPress={() => handleInputChange("logoUri", "")}>
                      <Text style={styles.removeLogoText}>Remove logo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.imagePickerBtn}
                  onPress={selectLogo}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.borderHighlight || "#EFF6FF", justifyContent: "center", alignItems: "center", marginBottom: 6 }}>
                    <Ionicons name="person" size={24} color={COLORS.primary} />
                  </View>
                  <Text style={styles.imagePickerText}>Select Store Logo File</Text>
                  <Text style={styles.imagePickerHint}>JPEG, PNG, JPG, or WEBP (Max 2MB)</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );

      case 3:
        return (
          <View key="step-3" style={styles.stepCard}>
            <Text style={styles.stepTitle}>Bank Details & Ready to Launch</Text>
            <Text style={styles.stepSubtitle}>
              Provide payout bank information and verify your store profile before submitting.
            </Text>

            {/* Bank Details Section */}
            <View style={styles.bankSectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="wallet-outline" size={22} color={COLORS.primary} />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.sectionTitle}>Payout Bank Details (Required for Payouts)</Text>
                  <Text style={styles.sectionSubtitle}>
                    Earnings from completed orders will be transferred to this account.
                  </Text>
                </View>
              </View>

              {/* Bank Name */}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Bank Name (Optional)</Text>
                <View style={[styles.inputFieldContainer, errors.bankName && styles.inputFieldError]}>
                  <Ionicons name="business-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. State Bank of India"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    maxLength={255}
                    value={form.bankName}
                    onChangeText={(val) => handleInputChange("bankName", val)}
                  />
                </View>
                {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}
              </View>

              {/* Account Holder Name */}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Account Holder Name (Optional)</Text>
                <View style={[styles.inputFieldContainer, errors.bankHolderName && styles.inputFieldError]}>
                  <Ionicons name="person-circle-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Name as per bank records"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    maxLength={255}
                    value={form.bankHolderName}
                    onChangeText={(val) => handleInputChange("bankHolderName", val)}
                  />
                </View>
                {errors.bankHolderName && <Text style={styles.errorText}>{errors.bankHolderName}</Text>}
              </View>

              {/* Account Number */}
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.inputLabel}>Bank Account Number (Optional)</Text>
                  {form.accountNo ? (
                    <Text style={{ fontSize: 12, color: COLORS.textGrayLight, fontWeight: "500" }}>{form.accountNo.length}/20 digits</Text>
                  ) : null}
                </View>
                <View style={[styles.inputFieldContainer, errors.accountNo && styles.inputFieldError]}>
                  <Ionicons name="card-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter 9 to 20 digit account number"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    keyboardType="number-pad"
                    maxLength={20}
                    value={form.accountNo}
                    onChangeText={(val) => handleInputChange("accountNo", sanitizeAccountNumber(val))}
                  />
                </View>
                {errors.accountNo && <Text style={styles.errorText}>{errors.accountNo}</Text>}
              </View>

              {/* IFSC Code */}
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.inputLabel}>Bank IFSC Code (Optional)</Text>
                  {form.ifscCode ? (
                    <Text style={{ fontSize: 12, color: COLORS.textGrayLight, fontWeight: "500" }}>{form.ifscCode.length}/11 chars</Text>
                  ) : null}
                </View>
                <View style={[styles.inputFieldContainer, errors.ifscCode && styles.inputFieldError]}>
                  <Ionicons name="key-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. SBIN0001234"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={11}
                    value={form.ifscCode}
                    onChangeText={(val) => handleInputChange("ifscCode", sanitizeIfscCode(val))}
                  />
                </View>
                {errors.ifscCode && <Text style={styles.errorText}>{errors.ifscCode}</Text>}
              </View>
            </View>

            {/* Optional Tax & Legal Identifiers */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
              <View style={[styles.inputWrapper, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>GST Number (Optional)</Text>
                <View style={[styles.inputFieldContainer, errors.gstin && styles.inputFieldError]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="GSTIN ID"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    autoCapitalize="characters"
                    maxLength={15}
                    value={form.gstin}
                    onChangeText={(val) => handleInputChange("gstin", val)}
                  />
                </View>
                {errors.gstin && <Text style={styles.errorText}>{errors.gstin}</Text>}
              </View>

              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={styles.inputLabel}>PAN Number (Optional)</Text>
                <View style={[styles.inputFieldContainer, errors.panNumber && styles.inputFieldError]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="PAN Card No"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    autoCapitalize="characters"
                    maxLength={10}
                    value={form.panNumber}
                    onChangeText={(val) => handleInputChange("panNumber", val)}
                  />
                </View>
                {errors.panNumber && <Text style={styles.errorText}>{errors.panNumber}</Text>}
              </View>
            </View>

            {/* Profile Review Sheet */}
            <View style={styles.reviewContainer}>
              <Text style={styles.reviewTitle}>Registration Summary</Text>

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Store Name</Text>
                <Text style={styles.reviewValue}>{form.storeName || "-"}</Text>
              </View>
              <View style={styles.reviewDivider} />

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Merchant Type</Text>
                <Text style={styles.reviewValue}>
                  {form.businessType ? form.businessType.toUpperCase() : "INDIVIDUAL"} {form.category ? `• ${form.category}` : ""}
                </Text>
              </View>
              <View style={styles.reviewDivider} />

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Owner Account</Text>
                <Text style={styles.reviewValue}>{form.ownerName || "-"}</Text>
              </View>
              <View style={styles.reviewDivider} />

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Contact Info</Text>
                <Text style={styles.reviewValue}>{form.phone} | {form.email}</Text>
              </View>
              <View style={styles.reviewDivider} />

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Pickup Address</Text>
                <Text style={[styles.reviewValue, { flex: 1, textAlign: "right" }]} numberOfLines={2}>
                  {form.address ? `${form.address}, ${form.city}, ${form.state} ${form.postalCode}` : "-"}
                </Text>
              </View>

              {(form.latitude || form.deliveryRadiusKm) ? (
                <>
                  <View style={styles.reviewDivider} />
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>GPS & Radius</Text>
                    <Text style={styles.reviewValue}>
                      {form.latitude ? `${form.latitude}, ${form.longitude}` : ""}
                      {form.deliveryRadiusKm ? ` (${form.deliveryRadiusKm} km)` : ""}
                    </Text>
                  </View>
                </>
              ) : null}

              {form.accountNo ? (
                <>
                  <View style={styles.reviewDivider} />
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Bank Account</Text>
                    <Text style={styles.reviewValue}>
                      {form.bankName ? `${form.bankName} - ` : ""}
                      {form.accountNo ? `••••${form.accountNo.slice(-4)}` : ""}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>

            <View style={styles.infoBadge}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={COLORS.info}
                style={styles.infoBadgeIcon}
              />
              <Text style={styles.infoText}>
                Your store application will be reviewed immediately. Payout bank details can also be updated later from settings.
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        {/* Top Header Section */}
        <LinearGradient
          colors={COLORS.primaryGradient}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            {currentStep > 1 && (
              <TouchableOpacity onPress={handleBack} style={styles.headerBackBtn}>
                <Ionicons name="arrow-back" size={24} color={COLORS.textContrast} />
              </TouchableOpacity>
            )}
            <View style={styles.headerCenter}>
              <Text style={styles.logoText}>DeeBazar</Text>
              <Text style={styles.headerSubtitle}>Seller Onboarding Portal</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Form Body ScrollView */}
        <ScrollView
          key={`step-scroll-view-${currentStep}`}
          ref={scrollViewRef}
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>

        {/* Footer Navigation Bar */}
        <View style={styles.footerBar}>
          {currentStep > 1 && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleBack}
              style={[styles.footerBtn, styles.footerBtnSecondary]}
            >
              <Text style={styles.footerBtnTextSecondary}>Previous</Text>
            </TouchableOpacity>
          )}

          {currentStep < 3 ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleNext}
              style={[
                styles.footerBtn,
                styles.footerBtnPrimary,
                currentStep === 1 && styles.footerBtnFullWidth,
              ]}
            >
              <Text style={styles.footerBtnTextPrimary}>Continue</Text>
              <Ionicons
                name="arrow-forward-outline"
                size={18}
                color={COLORS.textContrast}
                style={styles.btnIconMarginLeft6}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleRegister}
              disabled={isSubmitting}
              style={[styles.footerBtn, styles.footerBtnSuccess]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.textContrast} size="small" />
              ) : (
                <View style={styles.footerBtnInner}>
                  <Text
                    style={styles.footerBtnTextPrimary}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Launch Shop Dashboard
                  </Text>
                  <Ionicons
                    name="rocket-outline"
                    size={18}
                    color={COLORS.textContrast}
                    style={styles.btnIconMarginLeft6}
                  />
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Category Dropdown Selection Drawer Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowCategoryModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Shop Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close-circle" size={24} color={COLORS.textGrayPlaceholder} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {categoriesList.map((item, index) => {
                const isSelected = form.category === item;
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.7}
                    style={[
                      styles.categoryItem,
                      isSelected && styles.categoryItemActive,
                    ]}
                    onPress={() => {
                      handleInputChange("category", item);
                      setShowCategoryModal(false);
                    }}
                  >
                    <Ionicons
                      name="cube-outline"
                      size={20}
                      color={isSelected ? COLORS.primary : COLORS.textGrayMedium}
                      style={styles.categoryIcon}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        isSelected && styles.categoryTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={COLORS.primary}
                        style={styles.categoryCheckmark}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Modern Styled Alert Modal */}
      <Modal
        visible={alertConfig.visible}
        transparent
        animationType="fade"
        onRequestClose={hideAlert}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View
              style={[
                styles.alertIconBg,
                alertConfig.type === "success"
                  ? styles.successIconBg
                  : alertConfig.type === "warning"
                    ? styles.warningIconBg
                    : styles.errorIconBg,
              ]}
            >
              <Ionicons
                name={
                  alertConfig.type === "success"
                    ? "checkmark-circle"
                    : alertConfig.type === "warning"
                      ? "warning"
                      : "alert-circle"
                }
                size={36}
                color={
                  alertConfig.type === "success"
                    ? COLORS.success
                    : alertConfig.type === "warning"
                      ? COLORS.warning
                      : COLORS.error
                }
              />
            </View>

            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.alertBtn,
                alertConfig.type === "success"
                  ? styles.successAlertBtn
                  : alertConfig.type === "warning"
                    ? styles.warningAlertBtn
                    : styles.errorAlertBtn,
              ]}
              onPress={hideAlert}
            >
              <Text style={styles.alertBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === "android" ? 35 : 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBackBtn: {
    marginRight: 16,
    padding: 4,
  },
  headerCenter: {
    flex: 1,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textContrast,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.borderHighlight,
    marginTop: 2,
    fontWeight: "500",
  },
  stepIndicatorWrapper: {
    backgroundColor: COLORS.cardBg,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    elevation: 2,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  stepIndicatorRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  stepCircleContainer: {
    alignItems: "center",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  activeStepCircle: {
    backgroundColor: COLORS.primary,
  },
  completedStepCircle: {
    backgroundColor: COLORS.success,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  activeStepNumber: {
    color: COLORS.textContrast,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
  },
  activeStepLabel: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 8,
    marginTop: -18,
  },
  completedStepLine: {
    backgroundColor: COLORS.success,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  stepCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 24,
  },
  liveLocationBannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.borderHighlight || "#EFF6FF",
    borderWidth: 1.2,
    borderColor: COLORS.primary,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  liveLocationIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.cardBg,
    justifyContent: "center",
    alignItems: "center",
  },
  liveLocationBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  liveLocationBannerSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
    marginTop: 2,
  },
  inputWrapper: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSlate,
    marginBottom: 8,
  },
  inputFieldContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 12,
  },
  inputFieldFocus: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.cardBg,
  },
  inputFieldError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorBgLight,
  },
  inputIcon: {
    marginRight: 10,
  },
  dropdownContainer: {
    justifyContent: "space-between",
  },
  dropdownText: {
    lineHeight: 20,
  },
  dropdownIcon: {
    marginRight: 10,
  },
  multilineInputIcon: {
    marginRight: 10,
    marginTop: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 8,
  },
  eyeBtn: {
    padding: 8,
  },
  multilineContainer: {
    height: "auto",
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  multilineInput: {
    textAlignVertical: "top",
    minHeight: 70,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.error,
    marginTop: 6,
    fontWeight: "500",
    marginLeft: 4,
  },
  locationSectionCard: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  bankSectionCard: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  detectLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.cardBg,
    borderWidth: 1.2,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  detectLocationBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    marginLeft: 8,
  },
  imagePickerBtn: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.borderDark,
    borderRadius: 16,
    paddingVertical: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  imagePickerText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: 8,
  },
  imagePickerHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  logoPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    borderRadius: 14,
    padding: 12,
    backgroundColor: COLORS.cardBg,
  },
  logoPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  logoDetails: {
    marginLeft: 16,
    flex: 1,
  },
  logoSelectedText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSlateDark,
  },
  removeLogoText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
    fontWeight: "600",
  },
  reviewContainer: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    borderRadius: 16,
    width: "100%",
    padding: 16,
    marginVertical: 16,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
  },
  reviewLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  reviewValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  reviewDivider: {
    height: 1,
    backgroundColor: COLORS.borderMedium,
  },
  infoBadge: {
    flexDirection: "row",
    backgroundColor: COLORS.infoBgLight,
    borderWidth: 1,
    borderColor: COLORS.infoBgMedium,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  infoBadgeIcon: {
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.infoText,
    lineHeight: 16,
    fontWeight: "500",
  },
  footerBar: {
    backgroundColor: COLORS.cardBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  footerBtn: {
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 10,
    overflow: "hidden",
  },
  footerBtnPrimary: {
    backgroundColor: COLORS.primary,
    flex: 2,
    marginLeft: 12,
  },
  footerBtnFullWidth: {
    flex: 1,
    marginLeft: 0,
  },
  footerBtnSecondary: {
    backgroundColor: COLORS.borderLight,
    flex: 0.85,
    minWidth: 85,
    maxWidth: 110,
  },
  footerBtnSuccess: {
    backgroundColor: COLORS.success,
    flex: 2.5,
    marginLeft: 10,
    overflow: "hidden",
  },
  footerBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
    paddingHorizontal: 4,
  },
  footerBtnTextPrimary: {
    color: COLORS.textContrast,
    fontSize: 13.5,
    fontWeight: "700",
    textAlign: "center",
    flexShrink: 1,
  },
  footerBtnTextSecondary: {
    color: COLORS.textSlate,
    fontSize: 14,
    fontWeight: "600",
  },
  btnIconMarginLeft6: {
    marginLeft: 6,
  },
  btnIconMarginLeft8: {
    marginLeft: 8,
  },
  modalDismissArea: {
    flex: 1,
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
  modalScrollContent: {
    paddingBottom: 30,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  categoryItemActive: {
    borderBottomColor: COLORS.borderHighlight,
  },
  categoryIcon: {
    marginRight: 12,
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
  categoryCheckmark: {
    marginLeft: "auto",
  },
  loginRedirectContainer: {
    marginTop: 20,
    alignItems: "center",
    paddingVertical: 10,
  },
  loginRedirectText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  loginRedirectHighlight: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  alertBox: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  alertIconBg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successIconBg: {
    backgroundColor: "#e8f5e9",
  },
  warningIconBg: {
    backgroundColor: "#fff3e0",
  },
  errorIconBg: {
    backgroundColor: "#ffebee",
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  alertMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  alertBtn: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  successAlertBtn: {
    backgroundColor: "#2e7d32",
  },
  warningAlertBtn: {
    backgroundColor: "#f57c00",
  },
  errorAlertBtn: {
    backgroundColor: "#d32f2f",
  },
  alertBtnText: {
    color: COLORS.textContrast,
    fontSize: 15,
    fontWeight: "700",
  },
});

export default SellerRegistration;
