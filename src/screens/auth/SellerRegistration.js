import React, { useState } from "react";
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
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { launchImageLibrary } from "react-native-image-picker";
import COLORS from "../../constants/theme";
import { BASE_URL } from "../../api/auth";

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

const SellerRegistration = ({ navigation, onRegisterSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Custom alert configuration state
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success", // success, warning, error
    onPress: null
  });

  const showAlert = (title, message, type = "success", onPress = null) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onPress
    });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
    if (alertConfig.onPress) {
      alertConfig.onPress();
    }
  };

  // Form Fields State
  const [form, setForm] = useState({
    ownerName: "",
    email: "",
    phone: "",
    password: "",

    storeName: "",
    category: "",
    address: "",
    description: "",
    city: "",
    state: "",
    postalCode: "",
    businessType: "individual", // individual, company, partnership

    gstin: "",
    panNumber: "",
    bankName: "",
    accountNo: "",
    ifscCode: "",
    bankHolderName: "",
    logoUri: "",
  });

  const [errors, setErrors] = useState({});
  const [activeField, setActiveField] = useState(null);

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateStep = (step) => {
    let stepErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;

    if (step === 1) {
      if (!form.ownerName.trim() || form.ownerName.trim().length < 3) {
        stepErrors.ownerName = "Name must be at least 3 characters";
      }
      if (!form.email.trim() || !emailRegex.test(form.email.trim())) {
        stepErrors.email = "Please enter a valid email address";
      }
      if (!form.phone.trim() || !phoneRegex.test(form.phone.trim())) {
        stepErrors.phone = "Please enter a valid 10-digit phone number";
      }
      if (!form.password || form.password.length < 6) {
        stepErrors.password = "Password must be at least 6 characters";
      }
    }

    if (step === 2) {
      if (!form.storeName.trim() || form.storeName.trim().length < 3) {
        stepErrors.storeName = "Store name must be at least 3 characters";
      }
      if (!form.category) {
        stepErrors.category = "Please select a store category";
      }
      if (!form.address.trim() || form.address.trim().length < 10) {
        stepErrors.address = "Address must be at least 10 characters";
      }
      if (!form.city.trim()) {
        stepErrors.city = "City is required";
      }
      if (!form.state.trim()) {
        stepErrors.state = "State is required";
      }
      if (!form.postalCode.trim()) {
        stepErrors.postalCode = "Postal code is required";
      }
    }

    if (step === 3) {
      if (!form.bankName.trim()) {
        stepErrors.bankName = "Bank name is required";
      }
      if (!form.accountNo.trim() || form.accountNo.trim().length < 9) {
        stepErrors.accountNo = "Enter a valid account number (9+ digits)";
      }
      if (!form.ifscCode.trim()) {
        stepErrors.ifscCode = "IFSC code is required";
      }
      if (!form.bankHolderName.trim()) {
        stepErrors.bankHolderName = "Account holder name is required";
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
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
    setIsSubmitting(true);
    try {
      const url = `${BASE_URL}register`;
      const data = new FormData();

      // Mapping screen form fields to API fields
      data.append("name", form.ownerName || "");
      data.append("email", form.email || "");
      data.append("mobile", form.phone || "");
      data.append("password", form.password || "");
      data.append("password_confirmation", form.password || "");
      data.append("store_name", form.storeName || "");
      data.append("store_description", form.description || "");

      data.append("business_type", form.businessType || "individual");
      if (form.gstin) {
        data.append("gst_number", form.gstin);
      }
      if (form.panNumber) {
        data.append("pan_number", form.panNumber);
      }

      data.append("address", form.address || "");
      data.append("city", form.city || "");
      data.append("state", form.state || "");
      data.append("postal_code", form.postalCode || "");

      data.append("bank_name", form.bankName || "");
      data.append("bank_account_number", form.accountNo || "");
      data.append("bank_ifsc_code", form.ifscCode || "");
      data.append("bank_account_holder_name", form.bankHolderName || form.ownerName || "");

      // Handle Logo Upload if present
      if (form.logoUri) {
        const uri = form.logoUri;
        const filename = uri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        data.append("logo", {
          uri: uri,
          name: filename || "logo.jpg",
          type: type,
        });
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "multipart/form-data",
        },
        body: data,
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid response from server: ${responseText}`);
      }

      if (!response.ok) {
        const error = new Error(responseData.message || "Registration failed");
        error.errors = responseData.errors;
        throw error;
      }

      const profileData = {
        ...form,
        registeredAt: new Date().toISOString(),
        ...responseData.data,
      };

      await AsyncStorage.setItem("isRegistered", "true");
      await AsyncStorage.setItem("sellerProfile", JSON.stringify(profileData));

      showAlert(
        "Registration Successful",
        "Your seller account is registered successfully and is currently pending review. Please wait for administrator approval before logging in.",
        "success",
        () => {
          if (onRegisterSuccess) {
            onRegisterSuccess(profileData);
          } else {
            navigation.navigate("Login");
          }
        }
      );
    } catch (error) {
      if (error.errors) {
        const errorList = Object.values(error.errors).flat().join("\n");
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
      { id: 3, label: "Bank & Legal" },
      { id: 4, label: "Ready" },
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
          <View style={styles.stepCard}>
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
                  onChangeText={(val) => handleInputChange("email", val)}
                  onFocus={() => setActiveField("email")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Phone */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Contact Number</Text>
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
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  keyboardType="phone-pad"
                  maxLength={10}
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
              <Text style={styles.inputLabel}>Password</Text>
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
          <View style={styles.stepCard}>
            <Text style={styles.stepTitle}>Store Setup</Text>
            <Text style={styles.stepSubtitle}>
              Give your shop an identity. Customers will see these details.
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
                  placeholder="e.g. Hittok Electronics Store"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  value={form.storeName}
                  onChangeText={(val) => handleInputChange("storeName", val)}
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
                <Text
                  style={[
                    styles.textInput,
                    styles.dropdownText,
                    { color: form.category ? COLORS.textPrimary : COLORS.textGrayPlaceholder },
                  ]}
                >
                  {form.category || "Select a store niche"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={COLORS.textGrayLight} style={styles.dropdownIcon} />
              </TouchableOpacity>
              {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
            </View>

            {/* Business Type */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Business Type</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                {["individual", "company", "partnership"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      paddingVertical: 10,
                      marginHorizontal: 4,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: form.businessType === type ? COLORS.primary : COLORS.textGrayLight,
                      backgroundColor: form.businessType === type ? `${COLORS.primary}10` : "transparent",
                    }}
                    onPress={() => handleInputChange("businessType", type)}
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
                  style={styles.multilineInputIcon}
                />
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="Enter full address where items will be picked up"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  multiline
                  numberOfLines={2}
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
                    placeholder="1212"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    keyboardType="number-pad"
                    value={form.postalCode}
                    onChangeText={(val) => handleInputChange("postalCode", val)}
                  />
                </View>
                {errors.postalCode && <Text style={styles.errorText}>{errors.postalCode}</Text>}
              </View>
            </View>

            {/* Business Description */}
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
                  style={styles.multilineInputIcon}
                />
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="Tell buyers what you sell..."
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  multiline
                  numberOfLines={2}
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
                  <Ionicons name="camera-outline" size={28} color={COLORS.primary} />
                  <Text style={styles.imagePickerText}>Select Store Logo File</Text>
                  <Text style={styles.imagePickerHint}>JPEG or PNG (Max 2MB)</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepCard}>
            <Text style={styles.stepTitle}>Bank & Legal</Text>
            <Text style={styles.stepSubtitle}>
              Provide legal entity and payout bank details.
            </Text>

            {/* GSTIN & PAN Row */}
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={[styles.inputWrapper, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>GST Number (Opt)</Text>
                <View style={styles.inputFieldContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="GSTIN ID"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    autoCapitalize="characters"
                    value={form.gstin}
                    onChangeText={(val) => handleInputChange("gstin", val)}
                  />
                </View>
              </View>

              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={styles.inputLabel}>PAN Number (Opt)</Text>
                <View style={styles.inputFieldContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="PAN Card No"
                    placeholderTextColor={COLORS.textGrayPlaceholder}
                    autoCapitalize="characters"
                    value={form.panNumber}
                    onChangeText={(val) => handleInputChange("panNumber", val)}
                  />
                </View>
              </View>
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
                  value={form.bankName}
                  onChangeText={(val) => handleInputChange("bankName", val)}
                  onFocus={() => setActiveField("bankName")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}
            </View>

            {/* Account Holder Name */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Bank Account Holder Name</Text>
              <View
                style={[
                  styles.inputFieldContainer,
                  activeField === "bankHolderName" && styles.inputFieldFocus,
                  errors.bankHolderName && styles.inputFieldError,
                ]}
              >
                <Ionicons name="person-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter name registered in bank"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  value={form.bankHolderName}
                  onChangeText={(val) => handleInputChange("bankHolderName", val)}
                  onFocus={() => setActiveField("bankHolderName")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.bankHolderName && <Text style={styles.errorText}>{errors.bankHolderName}</Text>}
            </View>

            {/* Account Number */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Bank Account Number</Text>
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
                  placeholder="Enter bank account number"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  keyboardType="number-pad"
                  value={form.accountNo}
                  onChangeText={(val) => handleInputChange("accountNo", val)}
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
                <Ionicons name="git-branch-outline" size={20} color={COLORS.textGrayLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="11-digit IFSC code"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  autoCapitalize="characters"
                  value={form.ifscCode}
                  onChangeText={(val) => handleInputChange("ifscCode", val)}
                  onFocus={() => setActiveField("ifscCode")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.ifscCode && <Text style={styles.errorText}>{errors.ifscCode}</Text>}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.successCard}>
            <View style={styles.checkmarkOuterCircle}>
              <View style={styles.checkmarkInnerCircle}>
                <Ionicons name="checkmark" size={54} color={COLORS.success} />
              </View>
            </View>

            <Text style={styles.successTitle}>Verify & Setup Ready!</Text>
            <Text style={styles.successSubtitle}>
              Congratulations! Your merchant request is completed. Review your store profile below before launching.
            </Text>

            {/* Profile Review Sheet */}
            <View style={styles.reviewContainer}>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Store Name</Text>
                <Text style={styles.reviewValue}>{form.storeName}</Text>
              </View>
              <View style={styles.reviewDivider} />

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Merchant Niche</Text>
                <Text style={styles.reviewValue}>{form.category} ({form.businessType})</Text>
              </View>
              <View style={styles.reviewDivider} />

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Owner Account</Text>
                <Text style={styles.reviewValue}>{form.ownerName}</Text>
              </View>
              <View style={styles.reviewDivider} />

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Contact Details</Text>
                <Text style={styles.reviewValue}>{form.phone} ({form.email})</Text>
              </View>
              <View style={styles.reviewDivider} />

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Bank Settlement</Text>
                <Text style={styles.reviewValue}>
                  {form.bankName} (A/C: *{form.accountNo.slice(-4) || "0000"})
                </Text>
              </View>
            </View>

            <View style={styles.infoBadge}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={COLORS.info}
                style={styles.infoBadgeIcon}
              />
              <Text style={styles.infoText}>
                Your products can be listed immediately once dashboard opens.
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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

          {currentStep < 4 ? (
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
                <>
                  <Text style={styles.footerBtnTextPrimary}>Launch Shop Dashboard</Text>
                  <Ionicons
                    name="rocket-outline"
                    size={20}
                    color={COLORS.textContrast}
                    style={styles.btnIconMarginLeft8}
                  />
                </>
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
              {CATEGORIES.map((item, index) => {
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

      {/* Beautiful Custom Alert Modal */}
      <Modal
        visible={alertConfig.visible}
        transparent
        animationType="fade"
        onRequestClose={hideAlert}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[
              styles.alertIconBg,
              alertConfig.type === "success" && styles.successIconBg,
              alertConfig.type === "warning" && styles.warningIconBg,
              alertConfig.type === "error" && styles.errorIconBg,
            ]}>
              <Ionicons
                name={
                  alertConfig.type === "success"
                    ? "checkmark-circle"
                    : alertConfig.type === "warning"
                    ? "alert-circle"
                    : "close-circle"
                }
                size={40}
                color={
                  alertConfig.type === "success"
                    ? "#2e7d32"
                    : alertConfig.type === "warning"
                    ? "#f57c00"
                    : "#d32f2f"
                }
              />
            </View>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.alertBtn,
                alertConfig.type === "success" && styles.successAlertBtn,
                alertConfig.type === "warning" && styles.warningAlertBtn,
                alertConfig.type === "error" && styles.errorAlertBtn,
              ]}
              onPress={hideAlert}
            >
              <Text style={styles.alertBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SellerRegistration;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  headerGradient: {
    height: 100,
    justifyContent: "flex-end",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerBackBtn: {
    position: "absolute",
    left: 20,
    bottom: 16,
    zIndex: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  logoText: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.textContrast,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.primaryLight,
    marginTop: 2,
    fontWeight: "500",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  stepIndicatorWrapper: {
    backgroundColor: COLORS.cardBg,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    elevation: 2,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  stepIndicatorRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  stepCircleContainer: {
    alignItems: "center",
    width: 60,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.borderMedium,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.borderMedium,
  },
  activeStepCircle: {
    backgroundColor: COLORS.primaryBgLight,
    borderColor: COLORS.primary,
  },
  completedStepCircle: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  activeStepNumber: {
    color: COLORS.primary,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },
  activeStepLabel: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.borderMedium,
    marginBottom: 16,
  },
  completedStepLine: {
    backgroundColor: COLORS.success,
  },
  stepCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    marginBottom: 10,
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
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabelHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSlate,
    marginBottom: 8,
  },
  inputLabelOptional: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "500",
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
    minHeight: 80,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.error,
    marginTop: 6,
    fontWeight: "500",
    marginLeft: 4,
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
  successCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    elevation: 4,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  checkmarkOuterCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.successBgLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  checkmarkInnerCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.successBgMedium,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 13,
    color: COLORS.textSlate,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  reviewContainer: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    borderRadius: 16,
    width: "100%",
    padding: 16,
    marginBottom: 20,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
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
    padding: 16,
    flexDirection: "row",
  },
  footerBtn: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  footerBtnPrimary: {
    backgroundColor: COLORS.primary,
    flex: 2,
    marginLeft: 12,
  },
  footerBtnFullWidth: {
    flex: 1,
  },
  footerBtnSecondary: {
    backgroundColor: COLORS.borderLight,
    flex: 1,
  },
  footerBtnSuccess: {
    backgroundColor: COLORS.success,
    flex: 1,
  },
  footerBtnTextPrimary: {
    color: COLORS.textContrast,
    fontSize: 15,
    fontWeight: "700",
  },
  footerBtnTextSecondary: {
    color: COLORS.textSlate,
    fontSize: 15,
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
