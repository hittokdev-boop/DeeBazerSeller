import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Platform,
  StatusBar,
  Switch,
  RefreshControl,
  ActivityIndicator,
  DeviceEventEmitter,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused, CommonActions } from "@react-navigation/native";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { CustomAlert } from "../../context/AlertContext";
import { getSellerProfile, logoutSeller } from "../../api/auth";

const Account = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [userData, setUserData] = useState(null);
  const [sellerData, setSellerData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isFocused = useIsFocused();
  const { isDarkMode, toggleTheme, themeMode, colors } = useTheme();

  const navigateToLogin = useCallback(() => {
    try {
      if (navigation && typeof navigation.getParent === 'function') {
        const parentNav = navigation.getParent();
        if (parentNav) {
          parentNav.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
          return;
        }
      }
      navigation.navigate("Login");
    } catch (navErr) {
      console.log("Navigation error:", navErr);
      navigation.navigate("Login");
    }
  }, [navigation]);

  const navigateToRegister = useCallback(() => {
    try {
      DeviceEventEmitter.emit("authStateChanged", null);
    } catch (navErr) {
      console.log("Navigation error to register:", navErr);
    }
  }, []);

  // Load cached profile data first for instant UI response
  const loadCachedProfile = async () => {
    try {
      const [storedProfile, storedUser, storedSeller, token] = await Promise.all([
        AsyncStorage.getItem("sellerProfile"),
        AsyncStorage.getItem("userData"),
        AsyncStorage.getItem("sellerData"),
        AsyncStorage.getItem("token"),
      ]);



      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
      }
      if (storedUser) {
        setUserData(JSON.parse(storedUser));
      }
      if (storedSeller) {
        setSellerData(JSON.parse(storedSeller));
      }
    } catch (e) {
      console.log("Error loading cached profile:", e);
    }
  };

  // Fetch live seller details from GET /api/seller/me
  const fetchSellerDetails = useCallback(async (showFullLoader = false) => {
    if (showFullLoader) {
      setIsLoading(true);
    }
    try {
      const response = await getSellerProfile();
      if (response && response.data) {
        const data = response.data;

        // Extract nested objects if present
        const sellerObj = data.seller || data;
        const userObj = data.user || data;

        setUserData(userObj);
        setSellerData(sellerObj);

        // Combined profile object for compatibility across screens
        const mergedProfile = {
          ...sellerObj,
          ...userObj,
          storeName: sellerObj.store_name || userObj.name || "",
          ownerName: userObj.name || sellerObj.owner_name || "",
          email: userObj.email || sellerObj.email || "",
          phone: userObj.mobile || sellerObj.phone || userObj.phone || "",
          logoUri: sellerObj.logo_url || userObj.logo_url || "",
          rating: sellerObj.rating || 0,
          totalRatings: sellerObj.total_ratings || 0,
          walletBalance: sellerObj.wallet_balance || 0,
          totalEarnings: sellerObj.total_earnings || 0,
          status: sellerObj.status || userObj.status || "active",
        };

        setProfile(mergedProfile);

        // Save to AsyncStorage for offline access and sync with other screens
        await Promise.all([
          AsyncStorage.setItem("sellerProfile", JSON.stringify(mergedProfile)),
          AsyncStorage.setItem("userData", JSON.stringify(data)),
          AsyncStorage.setItem("sellerData", JSON.stringify(data)),
        ]);
      }
    } catch (error) {
      console.log("Error fetching seller details:", error);
      if (error.status === 401) {
        CustomAlert.alert(
          "Session Expired",
          "Your login session has expired. Please log in again.",
          [
            {
              text: "OK",
              onPress: async () => {
                await AsyncStorage.multiRemove([
                  "token",
                  "isLoggedIn",
                  "sellerProfile",
                  "userData",
                  "sellerData",
                  "isRegistered",
                ]);
                navigateToRegister();
              },
            },
          ]
        );
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [navigateToLogin]);

  useEffect(() => {
    if (isFocused) {
      loadCachedProfile();
      fetchSellerDetails(false);
    }
  }, [isFocused, fetchSellerDetails]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchSellerDetails(false);
  };

  const handleLogout = () => {
    CustomAlert.alert(
      "Logout",
      "Are you sure you want to log out of your seller account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              try {
                const response = await logoutSeller();
                console.log("Logout API response:", response);
              } catch (apiErr) {
                console.log("Logout API call failed:", apiErr);
              }
              await AsyncStorage.multiRemove([
                "token",
                "isLoggedIn",
                "sellerProfile",
                "userData",
                "sellerData",
                "isRegistered",
              ]);
              navigateToRegister();
            } catch (err) {
              console.error("Error during logout:", err);
              await AsyncStorage.multiRemove([
                "token",
                "isLoggedIn",
                "sellerProfile",
                "userData",
                "sellerData",
                "isRegistered",
              ]);
              navigateToRegister();
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleMenuPress = (item) => {
    if (item.screen) {
      navigation.navigate(item.screen);
    } else if (item.onPress) {
      item.onPress();
    }
  };

  // Derive display values
  const displayName =
    sellerData?.store_name ||
    profile?.storeName ||
    userData?.name ||
    "Seller Store";

  const ownerName =
    userData?.name ||
    profile?.ownerName ||
    profile?.name ||
    "";

  const displayEmail =
    userData?.email ||
    profile?.email ||
    "seller@deebazar.com";

  const displayMobile =
    userData?.mobile ||
    profile?.mobile ||
    profile?.phone ||
    "";

  const displayRating =
    sellerData?.rating !== undefined
      ? Number(sellerData.rating).toFixed(1)
      : profile?.rating !== undefined
        ? Number(profile.rating).toFixed(1)
        : "5.0";

  const totalRatings =
    sellerData?.total_ratings ||
    profile?.totalRatings ||
    0;

  const baseLogo =
    userData?.logo_url ||
    sellerData?.logo_url ||
    profile?.logo_url ||
    "";

  // Cache-bust the profile image so it reloads dynamically when the backend image changes
  const displayLogo =
    baseLogo.includes("pravatar.cc") || baseLogo.startsWith("file://")
      ? baseLogo
      : baseLogo 
        ? `${baseLogo}${baseLogo.includes("?") ? "&" : "?"}t=${new Date().getTime()}` 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || "Store")}`;

  const accountStatus = (
    sellerData?.status ||
    userData?.approval_status ||
    userData?.status ||
    "active"
  ).toUpperCase();

  const isApproved = accountStatus === "APPROVED" || accountStatus === "ACTIVE";

  const formatCurrency = (val) => {
    if (val === undefined || val === null || isNaN(Number(val))) return "0.00";
    const num = Number(val);
    const parts = num.toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const walletBalance = formatCurrency(sellerData?.wallet_balance);
  const totalEarnings = formatCurrency(sellerData?.total_earnings);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.backgroundAlt }]}
      contentContainerStyle={styles.scrollContent}
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
      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.cardBg }]}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: displayLogo }}
            style={[styles.profileImage, { borderColor: colors.primary }]}
          />
          <View
            style={[
              styles.statusBadgeDot,
              { backgroundColor: isApproved ? "#22C55E" : "#F59E0B" },
            ]}
          />
        </View>

        <Text style={[styles.name, { color: colors.textGrayDark }]}>
          {displayName}
        </Text>

        {ownerName ? (
          <Text style={[styles.ownerNameText, { color: colors.textSecondary }]}>
            Owner: {ownerName}
          </Text>
        ) : null}

        <Text style={[styles.email, { color: colors.textGrayLight }]}>
          {displayEmail} {displayMobile ? ` • ${displayMobile}` : ""}
        </Text>

        {/* Rating and Status Row */}
        <View style={styles.tagsRow}>
          <View
            style={[
              styles.ratingRow,
              { backgroundColor: colors.warningBgLight || "#FFFBEB" },
            ]}
          >
            <Ionicons name="star" size={16} color={colors.warning || "#F59E0B"} />
            <Text
              style={[
                styles.rating,
                { color: colors.warningText || "#B45309" },
              ]}
            >
              {displayRating} ({totalRatings} {totalRatings === 1 ? "rating" : "ratings"})
            </Text>
          </View>

          <View
            style={[
              styles.statusTag,
              {
                backgroundColor: isApproved
                  ? "rgba(34, 197, 94, 0.12)"
                  : "rgba(245, 158, 11, 0.12)",
              },
            ]}
          >
            <Ionicons
              name={isApproved ? "checkmark-circle" : "time-outline"}
              size={14}
              color={isApproved ? "#16A34A" : "#D97706"}
              style={styles.statusTagIcon}
            />
            <Text
              style={[
                styles.statusTagText,
                { color: isApproved ? "#16A34A" : "#D97706" },
              ]}
            >
              {accountStatus}
            </Text>
          </View>
        </View>

        {/* Financial Highlights */}
        <View
          style={[
            styles.statsContainer,
            {
              backgroundColor: colors.backgroundAlt,
              borderColor: colors.borderLight || "#E2E8F0",
            },
          ]}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Wallet Balance
            </Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              ₹{walletBalance}
            </Text>
          </View>

          <View
            style={[
              styles.statDivider,
              { backgroundColor: colors.borderLight || "#E2E8F0" },
            ]}
          />

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Total Earnings
            </Text>
            <Text style={[styles.statValue, { color: colors.textGrayDark }]}>
              ₹{totalEarnings}
            </Text>
          </View>
        </View>
      </View>

      {/* Dark / Light Mode Toggle Card */}
      <View style={[styles.themeToggleCard, { backgroundColor: colors.cardBg }]}>
        <View style={styles.themeToggleLeft}>
          <View
            style={[
              styles.themeIconBox,
              { backgroundColor: colors.menuSettings || "#6366F1" },
            ]}
          >
            <Ionicons
              name={isDarkMode ? "moon" : "sunny"}
              size={22}
              color={colors.textContrast || "#FFFFFF"}
            />
          </View>
          <View style={styles.themeTextContainer}>
            <Text style={[styles.themeTitle, { color: colors.textGrayDark }]}>
              Dark Mode
            </Text>
            <Text style={[styles.themeSubtitle, { color: colors.textGrayLight }]}>
              {isDarkMode ? "Dark Theme Active 🌙" : "Light Theme Active ☀️"}
            </Text>
          </View>
        </View>
        <Switch
          value={isDarkMode}
          onValueChange={toggleTheme}
          trackColor={{ false: "#CBD5E1", true: colors.primary }}
          thumbColor={isDarkMode ? "#ffffff" : "#f4f3f4"}
        />
      </View>

      {/* Menu List */}
      {[
        {
          icon: "storefront-outline",
          title: "Store Information",
          color: colors.menuStore || "#3B82F6",
          screen: "StoreInfo",
        },
        {
          icon: "boat-outline",
          title: "Shipping Settings",
          color: "#F97316",
          screen: "ShippingSettings",
        },
        {
          icon: "shield-checkmark-outline",
          title: "Store Policies",
          color: "#0EA5E9",
          screen: "StorePolicies",
        },
        {
          icon: "person-outline",
          title: "Edit Profile",
          color: colors.menuProfile || "#10B981",
          screen: "EditProfile",
        },
        {
          icon: "call-outline",
          title: "Contact Number",
          color: colors.menuContact || "#EC4899",
          screen: "ContactNumber",
        },
        {
          icon: "card-outline",
          title: "Bank Details",
          color: colors.menuBank || "#8B5CF6",
          screen: "BankDetails",
        },
        {
          icon: "lock-closed-outline",
          title: "Change Password",
          color: colors.menuPassword || "#F59E0B",
          screen: "ChangePassword",
        },
        {
          icon: "settings-outline",
          title: "App Theme & Display",
          color: colors.menuSettings || "#6366F1",
          onPress: () => {
            Alert.alert(
              "Theme Mode",
              `Current Active Mode: ${themeMode.toUpperCase()}\nToggle the switch above to change themes anytime.`,
              [{ text: "OK" }]
            );
          },
        },
        {
          icon: "help-circle-outline",
          title: "Help & Support",
          color: colors.menuHelp || "#06B6D4",
          onPress: () =>
            Alert.alert(
              "Help & Support",
              "Support ticket system will be active soon. Please contact us at support@deebazar.com."
            ),
        },
      ].map((item, index) => (
        <TouchableOpacity
          key={index}
          activeOpacity={0.88}
          onPress={() => handleMenuPress(item)}
          style={[styles.menuCard, { backgroundColor: colors.cardBg }]}
        >
          <View
            style={[
              styles.menuIcon,
              {
                backgroundColor: item.color,
              },
            ]}
          >
            <Ionicons
              name={item.icon}
              color={colors.textContrast || "#FFFFFF"}
              size={22}
            />
          </View>

          <Text style={[styles.menuTitle, { color: colors.textGrayDark }]}>
            {item.title}
          </Text>

          <Ionicons
            name="chevron-forward"
            size={22}
            color={colors.textGrayPlaceholder || "#94A3B8"}
          />
        </TouchableOpacity>
      ))}

      {/* Logout Button */}
      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: colors.error || "#EF4444" }]}
        activeOpacity={0.9}
        onPress={handleLogout}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.textContrast || "#FFFFFF"} size="small" />
        ) : (
          <>
            <Ionicons
              name="log-out-outline"
              size={22}
              color={colors.textContrast || "#FFFFFF"}
            />
            <Text
              style={[
                styles.logoutText,
                { color: colors.textContrast || "#FFFFFF" },
              ]}
            >
              Logout
            </Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

export default Account;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundAlt,
    paddingTop:
      (Platform.OS === "android" ? StatusBar.currentHeight || 24 : 0) + 15,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: COLORS.cardBg,
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: "center",
    elevation: 4,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  avatarContainer: {
    position: "relative",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  statusBadgeDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  name: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textGrayDark,
    textAlign: "center",
  },
  ownerNameText: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  email: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.textGrayLight,
    textAlign: "center",
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  rating: {
    marginLeft: 5,
    fontSize: 13,
    fontWeight: "600",
  },
  statusTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusTagIcon: {
    marginRight: 4,
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "800",
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  themeToggleCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  themeToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  themeIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  themeTextContainer: {
    marginLeft: 14,
    flex: 1,
  },
  themeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textGrayDark,
  },
  themeSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.textGrayLight,
  },
  menuCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  menuTitle: {
    flex: 1,
    marginLeft: 14,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textGrayDark,
  },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 30,
    height: 54,
    backgroundColor: COLORS.error,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    elevation: 4,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  logoutText: {
    color: COLORS.textContrast,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 10,
  },
});