import React, { useState, useEffect, useCallback } from "react";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  DeviceEventEmitter,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { getSellerDashboard, getSellerProfile } from "../../api/auth";

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return "₹0.00";
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return dateString;
  }
};

const getStatusBadgeStyle = (statusOrItem) => {
  let s = "";
  if (typeof statusOrItem === "object" && statusOrItem !== null) {
    const approval = (statusOrItem.approval_status || "").toLowerCase();
    const status = (statusOrItem.status || "").toLowerCase();
    if (approval === "rejected" || status === "rejected") s = "rejected";
    else if (approval === "approved" || status === "approved") s = "approved";
    else if (approval === "pending" || status === "pending") s = "pending";
    else s = approval || status;
  } else {
    s = (statusOrItem || "").toLowerCase();
  }

  if (s === "delivered" || s === "approved" || s === "active") {
    return { bg: COLORS.successBgLight, text: COLORS.success, label: s === "approved" ? "Approved" : s };
  }
  if (s === "pending") {
    return { bg: COLORS.warningBgLight, text: COLORS.warning, label: "Pending" };
  }
  if (s === "processing" || s === "shipped") {
    return { bg: COLORS.primaryBgLight, text: COLORS.primary, label: s };
  }
  if (s === "cancelled" || s === "rejected") {
    return { bg: COLORS.errorBgLight, text: COLORS.error, label: s };
  }
  return { bg: COLORS.backgroundAlt, text: COLORS.textSecondary, label: s || "Draft" };
};

const SellerDashboard = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    total_products: 0,
    approved_products: 0,
    pending_products: 0,
    rejected_products: 0,
    total_orders: 0,
    pending_orders: 0,
    processing_orders: 0,
    shipped_orders: 0,
    delivered_orders: 0,
    cancelled_orders: 0,
    total_earnings: 0,
    wallet_balance: 0,
    pending_balance: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setFetchError(null);

    try {
      // 1. Load stored profile if available
      try {
        const storedProfile = await AsyncStorage.getItem("sellerProfile");
        if (storedProfile) {
          setProfile(JSON.parse(storedProfile));
        }

        const token = await AsyncStorage.getItem("token");


      } catch (e) {
        console.log("Error loading cached profile:", e);
      }

      // 2. Fetch live dashboard data from API
      const res = await getSellerDashboard();
      if (res && res.data) {
        if (res.data.stats) {
          setStats(res.data.stats);
        }
        if (Array.isArray(res.data.recent_orders)) {
          setRecentOrders(res.data.recent_orders);
        }
        if (Array.isArray(res.data.recent_products)) {
          setRecentProducts(res.data.recent_products);
        }
      }

      // 3. Try to refresh profile in background if needed
      try {
        const profileRes = await getSellerProfile();
        if (profileRes && profileRes.data) {
          const profileData = profileRes.data.seller || profileRes.data;
          setProfile(profileData);
          await AsyncStorage.setItem("sellerProfile", JSON.stringify(profileData));
        }
      } catch (pErr) {
        // Non-blocking profile refresh
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);

      // Auto-logout if session expired / unauthenticated
      if (err?.status === 401 || (err?.message && err.message.toLowerCase().includes("unauthenticated"))) {
        AsyncStorage.multiRemove([
          "token",
          "isLoggedIn",
          "sellerProfile",
          "userData",
          "sellerData",
          "isRegistered",
        ]).then(() => {
          DeviceEventEmitter.emit("authStateChanged", null);
        });
        return;
      }

      setFetchError(err?.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Profile image dynamic refresh — screen focus এ AsyncStorage থেকে latest logo load করে
  useFocusEffect(
    useCallback(() => {
      const refreshProfileImage = async () => {
        try {
          const [storedProfile, storedUserData] = await Promise.all([
            AsyncStorage.getItem("sellerProfile"),
            AsyncStorage.getItem("userData"),
          ]);
          const parsedProfile = storedProfile ? JSON.parse(storedProfile) : {};
          const parsedUser = storedUserData ? JSON.parse(storedUserData) : {};
          // Merge latest logo from userData or sellerProfile
          const freshLogo =
            parsedUser.logo_url ||
            parsedProfile.logo_url ||
            parsedProfile.logoUri ||
            parsedProfile.logo;
          if (freshLogo) {
            setProfile((prev) => ({
              ...prev,
              ...parsedProfile,
              logo_url: freshLogo,
              logoUri: freshLogo,
              logo: freshLogo,
            }));
          }
        } catch (e) {
          // silent fail
        }
      };
      refreshProfileImage();
    }, [])
  );

  const onRefresh = () => {
    loadDashboardData(true);
  };

  const filteredOrders = recentOrders.filter((order) => {
    const query = searchQuery.trim().toLowerCase();
    const orderNum = (order.order_number || String(order.id) || "").toLowerCase();
    const custName = (order.customer?.name || "").toLowerCase();
    const custMobile = (order.customer?.mobile || "").toLowerCase();

    const matchesSearch =
      query === "" ||
      orderNum.includes(query) ||
      custName.includes(query) ||
      custMobile.includes(query);

    const matchesStatus =
      statusFilter === "All" ||
      (order.status || "").toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Header Bar */}
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: colors.cardBg,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.leftSection}>
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>Welcome Back 👋</Text>
            <Text style={[styles.sellerName, { color: colors.textPrimary }]} numberOfLines={1}>
              {profile?.store_name || profile?.storeName || profile?.name || "My Store"}
            </Text>
          </View>

          <View style={styles.rightSection}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.backgroundAlt }]}
              onPress={() => navigation.navigate("Orders")}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={colors.textPrimary}
              />
              {stats.pending_orders > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {stats.pending_orders > 9 ? "9+" : stats.pending_orders}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => navigation.navigate("Account")}
            >
              {(profile?.logo_url || profile?.logoUri || profile?.logo) ? (
                <Image
                  source={{
                    uri:
                      profile?.logo_url ||
                      profile?.logoUri ||
                      profile?.logo,
                  }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImage, { backgroundColor: COLORS.primaryBgLight, justifyContent: "center", alignItems: "center" }]}>
                  <Ionicons name="person" size={20} color={COLORS.primary} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar for Recent Orders */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: colors.backgroundAlt,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={colors.textSecondary}
          />
          <TextInput
            placeholder="Search Recent Orders..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textSecondary}
                style={styles.clearSearchIcon}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Chips */}
        <View style={styles.chipRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScrollContent}
          >
            {["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"].map((status) => {
              const isSelected = statusFilter === status;
              return (
                <TouchableOpacity
                  key={status}
                  onPress={() => setStatusFilter(status)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? COLORS.primaryBgLight : colors.backgroundAlt,
                      borderColor: isSelected ? COLORS.primary : colors.borderLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected ? COLORS.primary : colors.textSecondary,
                        fontWeight: isSelected ? "700" : "600",
                      },
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Error state banner with retry */}
      {fetchError && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
          <Text style={styles.errorBannerText}>{fetchError}</Text>
          <TouchableOpacity onPress={() => loadDashboardData()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading Spinner */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading dashboard data...
          </Text>
        </View>
      ) : (
        <>
          {/* Key Overview Cards Grid */}
          <View style={styles.overviewContainer}>
            <View style={styles.cardRow}>
              {/* Total Earnings */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.overviewCard, { backgroundColor: colors.cardBg }]}
                onPress={() => navigation.navigate("Earnings")}
              >
                <View style={[styles.iconCircle, styles.salesIconBg]}>
                  <Ionicons name="cash-outline" size={22} color={COLORS.success} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Total Earnings</Text>
                <Text style={[styles.cardValue, { color: colors.textPrimary }]} numberOfLines={1}>
                  {formatCurrency(stats.total_earnings)}
                </Text>
                <View style={styles.subStatsRow}>
                  <Text style={[styles.subStatsText, { color: COLORS.success }]}>
                    Delivered: {stats.delivered_orders}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Total Orders */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.overviewCard, { backgroundColor: colors.cardBg }]}
                onPress={() => navigation.navigate("Orders")}
              >
                <View style={[styles.iconCircle, styles.ordersIconBg]}>
                  <Ionicons name="cube-outline" size={22} color={COLORS.primary} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Total Orders</Text>
                <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                  {stats.total_orders || 0}
                </Text>
                <View style={styles.subStatsRow}>
                  <Text style={[styles.subStatsText, { color: COLORS.warning }]}>
                    {stats.pending_orders || 0} Pending
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.cardRow}>
              {/* Products */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.overviewCard, { backgroundColor: colors.cardBg }]}
                onPress={() => navigation.navigate("Products")}
              >
                <View style={[styles.iconCircle, styles.productsIconBg]}>
                  <Ionicons name="bag-handle-outline" size={22} color={COLORS.warning} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Products</Text>
                <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                  {stats.total_products ?? stats.total ?? 0}
                </Text>
                <View style={styles.subStatsRow}>
                  <Text style={[styles.subStatsText, { color: COLORS.success }]}>
                    {stats.approved_products ?? stats.active_products ?? stats.approved ?? 0} Approved
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Wallet Balance */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.overviewCard, { backgroundColor: colors.cardBg }]}
                onPress={() => navigation.navigate("Earnings")}
              >
                <View style={[styles.iconCircle, styles.earningsIconBg]}>
                  <Ionicons name="wallet-outline" size={22} color={COLORS.menuBank} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Wallet Balance</Text>
                <Text style={[styles.cardValue, { color: colors.textPrimary }]} numberOfLines={1}>
                  {formatCurrency(stats.wallet_balance)}
                </Text>
                <View style={styles.subStatsRow}>
                  <Text style={[styles.subStatsText, { color: COLORS.textSecondary }]}>
                    Pending: {formatCurrency(stats.pending_balance)}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Pending Actions & Order Status Breakdown */}
          <View style={styles.pendingSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Order Status Breakdown</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Orders")}>
                <Text style={styles.seeAll}>Manage</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pendingGrid}>
              {/* Pending Orders */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.pendingCard, styles.pendingOrdersBg]}
                onPress={() => navigation.navigate("Orders")}
              >
                <View style={[styles.pendingIcon, styles.pendingOrdersIconBg]}>
                  <Ionicons name="hourglass-outline" size={20} color={COLORS.textContrast} />
                </View>
                <Text style={styles.pendingCount}>{stats.pending_orders || 0}</Text>
                <Text style={styles.pendingTitle}>Pending Orders</Text>
                <View style={styles.pendingFooter}>
                  <Text style={styles.pendingLink}>View</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                </View>
              </TouchableOpacity>

              {/* Processing Orders */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.pendingCard, styles.pendingReturnsBg]}
                onPress={() => navigation.navigate("Orders")}
              >
                <View style={[styles.pendingIcon, styles.pendingReturnsIconBg]}>
                  <Ionicons name="construct-outline" size={20} color={COLORS.textContrast} />
                </View>
                <Text style={styles.pendingCount}>{stats.processing_orders || 0}</Text>
                <Text style={styles.pendingTitle}>Processing</Text>
                <View style={styles.pendingFooter}>
                  <Text style={styles.pendingLink}>Track</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.warning} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.pendingGrid}>
              {/* Shipped Orders */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.pendingCard, styles.pendingMessagesBg]}
                onPress={() => navigation.navigate("Orders")}
              >
                <View style={[styles.pendingIcon, styles.pendingMessagesIconBg]}>
                  <Ionicons name="airplane-outline" size={20} color={COLORS.textContrast} />
                </View>
                <Text style={styles.pendingCount}>{stats.shipped_orders || 0}</Text>
                <Text style={styles.pendingTitle}>Shipped Orders</Text>
                <View style={styles.pendingFooter}>
                  <Text style={styles.pendingLink}>View</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.success} />
                </View>
              </TouchableOpacity>

              {/* Cancelled / Rejected */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.pendingCard, styles.pendingRefundBg]}
                onPress={() => navigation.navigate("Orders")}
              >
                <View style={[styles.pendingIcon, styles.pendingRefundIconBg]}>
                  <Ionicons name="close-circle-outline" size={20} color={COLORS.textContrast} />
                </View>
                <Text style={styles.pendingCount}>{stats.cancelled_orders || 0}</Text>
                <Text style={styles.pendingTitle}>Cancelled Orders</Text>
                <View style={styles.pendingFooter}>
                  <Text style={styles.pendingLink}>Review</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.error} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Orders Section */}
          <View style={styles.orderSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Orders</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Orders")}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {filteredOrders.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors.cardBg }]}>
                <Ionicons name="receipt-outline" size={38} color={colors.textSecondary} style={styles.emptyIcon} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {searchQuery || statusFilter !== "All"
                    ? "No matching orders found"
                    : "No recent orders yet"}
                </Text>
              </View>
            ) : (
              filteredOrders.map((item) => {
                const badge = getStatusBadgeStyle(item.status);
                const orderNumber = item.order_number || `#ORD-${item.id}`;
                const amount = item.seller_amount !== undefined ? item.seller_amount : item.subtotal;

                return (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    key={item.id}
                    onPress={() => navigation.navigate("Orders")}
                    style={[styles.orderCard, { backgroundColor: colors.cardBg }]}
                  >
                    <View style={[styles.orderAvatar, { backgroundColor: badge.bg }]}>
                      <Ionicons name="receipt" size={22} color={badge.text} />
                    </View>

                    <View style={styles.orderInfo}>
                      <View style={styles.orderTop}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.orderId, { color: colors.textSecondary }]}>
                            {orderNumber}
                          </Text>
                          <Text style={[styles.customerName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {item.customer?.name || "Customer"}
                          </Text>
                          {item.customer?.mobile ? (
                            <Text style={[styles.customerMobile, { color: colors.textSecondary }]}>
                              📞 {item.customer.mobile}
                            </Text>
                          ) : null}
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={[styles.orderPrice, { color: colors.textPrimary }]}>
                            {formatCurrency(amount)}
                          </Text>
                          <Text style={[styles.orderDate, { color: colors.textSecondary }]}>
                            {formatDate(item.created_at)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.orderBottom}>
                        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                            {badge.label.toUpperCase()}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={colors.textSecondary}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Recent Products Section */}
          <View style={styles.productSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Products</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Products")}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {recentProducts.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors.cardBg }]}>
                <Ionicons name="cube-outline" size={38} color={colors.textSecondary} style={styles.emptyIcon} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent products found</Text>
              </View>
            ) : (
              recentProducts.map((prod) => {
                const prodBadge = getStatusBadgeStyle(prod);
                return (
                  <TouchableOpacity
                    key={prod.id || prod.product_id}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate("Products")}
                    style={[styles.productCard, { backgroundColor: colors.cardBg }]}
                  >
                    <Image
                      source={{
                        uri: prod.image_url || "https://picsum.photos/200?random=50",
                      }}
                      style={styles.productImage}
                    />
                    <View style={styles.productInfo}>
                      <View style={styles.productTopRow}>
                        <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {prod.name}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: prodBadge.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: prodBadge.text }]}>
                            {prodBadge.label.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.productMetaRow}>
                        <Text style={[styles.productPrice, { color: COLORS.primary }]}>
                          {formatCurrency(prod.price)}
                        </Text>
                        <View style={styles.stockBadge}>
                          <Ionicons
                            name="layers-outline"
                            size={13}
                            color={prod.stock_quantity > 5 ? COLORS.success : COLORS.warning}
                          />
                          <Text
                            style={[
                              styles.stockBadgeText,
                              { color: prod.stock_quantity > 5 ? COLORS.success : COLORS.warning },
                            ]}
                          >
                            Stock: {prod.stock_quantity ?? 0}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Revenue & Wallet Detailed Card */}
          <View style={styles.revenueSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Financial Summary</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Earnings")}>
                <Text style={styles.seeAll}>Details</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.revenueCard}>
              <View style={styles.revenueTop}>
                <View>
                  <Text style={styles.revenueLabel}>Total Lifetime Earnings</Text>
                  <Text style={styles.revenueAmount}>{formatCurrency(stats.total_earnings)}</Text>
                </View>
                <View style={styles.revenueIcon}>
                  <Ionicons name="wallet-outline" size={28} color={COLORS.textContrast} />
                </View>
              </View>

              <View style={styles.analyticsBox}>
                <View style={styles.analyticsRow}>
                  <Text style={styles.analyticsLeft}>Available Wallet Balance</Text>
                  <Text style={styles.analyticsRight}>{formatCurrency(stats.wallet_balance)}</Text>
                </View>
                <View style={styles.analyticsRow}>
                  <Text style={styles.analyticsLeft}>Pending Clearance Balance</Text>
                  <Text style={styles.analyticsRight}>{formatCurrency(stats.pending_balance)}</Text>
                </View>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
};

export default SellerDashboard;

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 50,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 16,
    paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0) + 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftSection: {
    flex: 1,
    marginRight: 10,
  },
  welcomeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  sellerName: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundAlt,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: COLORS.textContrast,
    fontSize: 10,
    fontWeight: "700",
  },
  profileBtn: {
    borderRadius: 20,
    overflow: "hidden",
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 0,
    marginLeft: 8,
  },
  clearSearchIcon: {
    marginRight: 6,
  },
  chipRow: {
    height: 38,
    marginTop: 12,
  },
  chipScrollContent: {
    paddingHorizontal: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundAlt,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    justifyContent: "center",
    alignItems: "center",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.errorBgLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.error,
    marginLeft: 8,
    fontWeight: "500",
  },
  retryBtn: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryBtnText: {
    color: COLORS.textContrast,
    fontSize: 12,
    fontWeight: "700",
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: "500",
  },
  overviewContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  overviewCard: {
    width: "48%",
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 14,
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  salesIconBg: {
    backgroundColor: COLORS.successBgLight,
  },
  ordersIconBg: {
    backgroundColor: COLORS.primaryBgLight,
  },
  productsIconBg: {
    backgroundColor: COLORS.warningBgLight,
  },
  earningsIconBg: {
    backgroundColor: COLORS.infoBgLight,
  },
  cardTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  cardValue: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginTop: 3,
  },
  subStatsRow: {
    marginTop: 6,
  },
  subStatsText: {
    fontSize: 11,
    fontWeight: "600",
  },
  pendingSection: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  seeAll: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "700",
  },
  pendingGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  pendingCard: {
    width: "48%",
    borderRadius: 16,
    padding: 14,
  },
  pendingOrdersBg: {
    backgroundColor: COLORS.primaryBgLight,
  },
  pendingOrdersIconBg: {
    backgroundColor: COLORS.primary,
  },
  pendingReturnsBg: {
    backgroundColor: COLORS.warningBgLight,
  },
  pendingReturnsIconBg: {
    backgroundColor: COLORS.warning,
  },
  pendingRefundBg: {
    backgroundColor: COLORS.errorBgLight,
  },
  pendingRefundIconBg: {
    backgroundColor: COLORS.error,
  },
  pendingMessagesBg: {
    backgroundColor: COLORS.successBgLight,
  },
  pendingMessagesIconBg: {
    backgroundColor: COLORS.success,
  },
  pendingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  pendingCount: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  pendingTitle: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  pendingFooter: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pendingLink: {
    fontWeight: "700",
    color: COLORS.textPrimary,
    fontSize: 12,
  },
  orderSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 26,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
  },
  emptyIcon: {
    marginBottom: 8,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  orderCard: {
    flexDirection: "row",
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    alignItems: "center",
  },
  orderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  orderInfo: {
    flex: 1,
  },
  orderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderId: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  customerName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  customerMobile: {
    fontSize: 11,
    marginTop: 2,
  },
  orderPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  orderDate: {
    fontSize: 11,
    marginTop: 2,
  },
  orderBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  productSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
    elevation: 2,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  productImage: {
    width: 54,
    height: 54,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: COLORS.backgroundAlt,
  },
  productInfo: {
    flex: 1,
  },
  productTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  productMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  revenueSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  revenueCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    padding: 18,
  },
  revenueTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  revenueLabel: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: "600",
  },
  revenueAmount: {
    color: COLORS.textContrast,
    fontSize: 26,
    fontWeight: "800",
    marginTop: 3,
  },
  revenueIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  analyticsBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
  },
  analyticsRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  analyticsLeft: {
    color: COLORS.textContrast,
    opacity: 0.9,
    fontSize: 12,
  },
  analyticsRight: {
    color: COLORS.textContrast,
    fontWeight: "700",
    fontSize: 13,
  },
});