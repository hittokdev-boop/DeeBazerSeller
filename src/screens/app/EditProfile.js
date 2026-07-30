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
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../../constants/theme";

const EditProfile = ({ navigation }) => {
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeField, setActiveField] = useState(null);

  useEffect(() => {
    const loadProfileData = async () => {
      setIsLoading(true);
      try {
        const storedProfile = await AsyncStorage.getItem("sellerProfile");
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          setOwnerName(parsed.ownerName || "");
          setEmail(parsed.email || "");
        }
      } catch (err) {
        console.log("Error loading profile", err);
        Alert.alert("Error", "Could not load profile information.");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, []);

  const validate = () => {
    let tempErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!ownerName.trim() || ownerName.trim().length < 3) {
      tempErrors.ownerName = "Name must be at least 3 characters";
    }
    if (!email.trim() || !emailRegex.test(email.trim())) {
      tempErrors.email = "Please enter a valid email address";
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
        ownerName: ownerName.trim(),
        email: email.trim().toLowerCase(),
      };

      await AsyncStorage.setItem("sellerProfile", JSON.stringify(updatedProfile));

      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.log("Error saving profile details", err);
      Alert.alert("Error", "Failed to update profile details.");
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
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card Decoration */}
          <View style={styles.profileHeaderDecoration}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={50} color={COLORS.primary} />
            </View>
            <Text style={styles.avatarSubText}>Update your personal and login information</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Owner Name */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Full Name / Owner Name</Text>
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
                  value={ownerName}
                  onChangeText={setOwnerName}
                  onFocus={() => setActiveField("ownerName")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.ownerName && <Text style={styles.errorText}>{errors.ownerName}</Text>}
            </View>

            {/* Email Address */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Email Address</Text>
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
                  placeholder="Enter your business email"
                  placeholderTextColor={COLORS.textGrayPlaceholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setActiveField("email")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
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
                <Text style={styles.saveBtnText}>Save Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditProfile;

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
  profileHeaderDecoration: {
    alignItems: "center",
    marginVertical: 28,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primaryBgLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    marginBottom: 12,
  },
  avatarSubText: {
    fontSize: 13,
    color: COLORS.textSecondary,
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
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
