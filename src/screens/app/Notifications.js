import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  FlatList,
  Platform,
  DeviceEventEmitter,
  Image,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../context/ThemeContext";
import {
  getSellerNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../api/notifications";

const getNotificationMeta = (item) => {
  const eventType = (item?.event_type || "").toLowerCase();
  const type = (item?.type || "").toLowerCase();
  const title = (item?.title || "").toLowerCase();

  if (eventType.includes("order") || title.includes("order") || type === "order") {
    return {
      icon: "receipt",
      iconOutline: "receipt-outline",
      color: "#2563EB",
      bgColor: "#EFF6FF",
      badge: "Order",
    };
  }
  if (eventType.includes("product") || title.includes("product") || type === "product") {
    return {
      icon: "cube",
      iconOutline: "cube-outline",
      color: "#059669",
      bgColor: "#ECFDF5",
      badge: "Product",
    };
  }
  if (eventType.includes("payout") || eventType.includes("payment") || title.includes("payment") || type === "payment") {
    return {
      icon: "wallet",
      iconOutline: "wallet-outline",
      color: "#D97706",
      bgColor: "#FFFBEB",
      badge: "Payment",
    };
  }
  if (eventType.includes("review") || title.includes("review") || type === "review") {
    return {
      icon: "star",
      iconOutline: "star-outline",
      color: "#EA580C",
      bgColor: "#FFF7ED",
      badge: "Review",
    };
  }
  if (type === "warning" || title.includes("alert")) {
    return {
      icon: "alert-circle",
      iconOutline: "alert-circle-outline",
      color: "#DC2626",
      bgColor: "#FEF2F2",
      badge: "Alert",
    };
  }

  return {
    icon: "notifications",
    iconOutline: "notifications-outline",
    color: "#7C3AED",
    bgColor: "#F5F3FF",
    badge: "System",
  };
};

const formatNotificationTime = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return "Just now";
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
};

const Notifications = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "unread"

  const hasAutoReadRef = useRef(false);

  // Parse items safely based on Laravel pagination and doc response:
  // { status: 200, data: { current_page: 1, data: [ ... ], last_page: 1, total: 2 } }
  const extractItemsAndPagination = (res) => {
    let items = [];
    let curPage = 1;
    let lstPage = 1;
    let totalCount = 0;

    if (res?.data && typeof res.data === "object" && !Array.isArray(res.data)) {
      if (Array.isArray(res.data.data)) {
        items = res.data.data;
      } else if (Array.isArray(res.data.notifications)) {
        items = res.data.notifications;
      }
      curPage = Number(res.data.current_page) || 1;
      lstPage = Number(res.data.last_page) || 1;
      totalCount = Number(res.data.total) || items.length;
    } else if (Array.isArray(res?.data)) {
      items = res.data;
      totalCount = items.length;
    } else if (Array.isArray(res?.notifications)) {
      items = res.notifications;
      totalCount = items.length;
    } else if (Array.isArray(res)) {
      items = res;
      totalCount = items.length;
    }

    return { items, curPage, lstPage, totalCount };
  };

  // Auto-mark all notifications as read upon entering the component
  const triggerAutoMarkAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      // Update local state so all notifications are marked read
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: n.read_at || new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
      DeviceEventEmitter.emit("notificationsRead");
      DeviceEventEmitter.emit("unreadCountChanged", 0);
    } catch (err) {
      console.warn("Auto mark all read error:", err?.message || err);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(
    async (page = 1, isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          setNotifications([]);
          setUnreadCount(0);
          return;
        }

        // 1. Fetch notification list from API
        const res = await getSellerNotifications(page);
        const { items, curPage, lstPage } = extractItemsAndPagination(res);

        setCurrentPage(curPage);
        setLastPage(lstPage);

        // 2. Fetch unread count from API
        try {
          const countRes = await getUnreadNotificationCount();
          const count = countRes?.unread_count ?? countRes?.data?.unread_count ?? 0;
          setUnreadCount(Number(count) || 0);
        } catch {
          // Compute fallback unread count
          const unreadFallback = items.filter((n) => !n.is_read && !n.read_at).length;
          setUnreadCount(unreadFallback);
        }

        if (page === 1) {
          setNotifications(items);

          // As required: "ar notification component a enter korle read hoye jabe documenttion dekhe koro"
          // Mark all as read once per entry
          if (!hasAutoReadRef.current) {
            hasAutoReadRef.current = true;
            // Trigger auto mark as read
            triggerAutoMarkAsRead();
          }
        } else {
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newUnique = items.filter((item) => !existingIds.has(item.id));
            return [...prev, ...newUnique];
          });
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [triggerAutoMarkAsRead]
  );

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const handleRefresh = () => {
    hasAutoReadRef.current = false;
    fetchNotifications(1, true);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && !isLoading && currentPage < lastPage) {
      fetchNotifications(currentPage + 1);
    }
  };

  // Manual mark all as read button
  const handleManualMarkAllRead = async () => {
    if (isMarkingAll) return;
    try {
      setIsMarkingAll(true);
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: n.read_at || new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
      DeviceEventEmitter.emit("notificationsRead");
      DeviceEventEmitter.emit("unreadCountChanged", 0);
    } catch (err) {
      console.warn("Failed to mark all as read:", err?.message || err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Tap single notification item
  const handleItemPress = async (item) => {
    const isUnread = !item.is_read && !item.read_at;

    // If unread, mark it as read in backend and update locally
    if (isUnread && item.id) {
      try {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === item.id
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        DeviceEventEmitter.emit("unreadCountChanged", Math.max(0, unreadCount - 1));
        await markNotificationAsRead(item.id);
      } catch (err) {
        console.warn("Failed to mark notification as read:", err?.message || err);
      }
    }

    // Parse extra payload data if available
    let dataObj = {};
    if (typeof item?.data === "string") {
      try {
        dataObj = JSON.parse(item.data);
      } catch (e) {}
    } else if (item?.data && typeof item.data === "object") {
      dataObj = item.data;
    }

    // Check if target screen explicitly specified in data
    if (dataObj?.screen) {
      if (["Orders", "Products", "Earnings", "Dashboard", "Account"].includes(dataObj.screen)) {
        navigation.navigate("SellerTabs", { screen: dataObj.screen });
        return;
      }
      try {
        navigation.navigate(dataObj.screen, dataObj.params || {});
        return;
      } catch (e) {
        console.warn("Navigation failed for target screen:", dataObj.screen);
      }
    }

    const eventType = (item?.event_type || item?.type || "").toLowerCase();
    const title = (item?.title || "").toLowerCase();
    const message = (item?.message || "").toLowerCase();

    // 1. Order notifications: navigate to OrderDetails if order ID exists, otherwise open Orders tab
    if (
      eventType.includes("order") ||
      title.includes("order") ||
      message.includes("order")
    ) {
      const orderId =
        item?.order_id ||
        dataObj?.order_id ||
        dataObj?.id;

      if (orderId && !isNaN(Number(orderId))) {
        navigation.navigate("OrderDetails", { orderId: Number(orderId) });
      } else {
        navigation.navigate("SellerTabs", { screen: "Orders" });
      }
      return;
    }

    // 2. Product notifications
    if (
      eventType.includes("product") ||
      title.includes("product") ||
      message.includes("product")
    ) {
      const productId = item?.product_id || dataObj?.product_id;
      if (productId && !isNaN(Number(productId))) {
        navigation.navigate("ProductDetails", { productId: Number(productId) });
      } else {
        navigation.navigate("SellerTabs", { screen: "Products" });
      }
      return;
    }

    // 3. Earning / Payout / Payment notifications
    if (
      eventType.includes("payment") ||
      eventType.includes("payout") ||
      eventType.includes("earning") ||
      title.includes("payment") ||
      title.includes("payout")
    ) {
      navigation.navigate("SellerTabs", { screen: "Earnings" });
      return;
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === "unread") {
      return !item.is_read && !item.read_at;
    }
    return true;
  });

  const renderItem = ({ item }) => {
    const meta = getNotificationMeta(item);
    const isUnread = !item.is_read && !item.read_at;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: isUnread
              ? isDarkMode
                ? "#1E293B"
                : "#F0F7FF"
              : colors.cardBg,
            borderColor: isUnread
              ? isDarkMode
                ? "#334155"
                : "#BFDBFE"
              : colors.borderLight,
          },
        ]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.75}
      >
        {/* Left Icon Avatar */}
        <View style={[styles.avatar, { backgroundColor: meta.bgColor }]}>
          <Ionicons
            name={isUnread ? meta.icon : meta.iconOutline}
            size={22}
            color={meta.color}
          />
        </View>

        {/* Content Body */}
        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={styles.badgeWrapper}>
              <View style={[styles.typeBadge, { backgroundColor: meta.bgColor }]}>
                <Text style={[styles.typeBadgeText, { color: meta.color }]}>
                  {meta.badge}
                </Text>
              </View>
            </View>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              {formatNotificationTime(item.sent_at || item.created_at)}
            </Text>
          </View>

          <Text
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                fontWeight: isUnread ? "700" : "600",
              },
            ]}
            numberOfLines={2}
          >
            {item.title || "Notification"}
          </Text>

          {item.message ? (
            <Text
              style={[styles.message, { color: colors.textSecondary }]}
              numberOfLines={3}
            >
              {item.message}
            </Text>
          ) : null}

          {/* Attached image preview if available */}
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={styles.attachedImage}
              resizeMode="cover"
            />
          ) : null}
        </View>

        {/* Unread Indicator Dot */}
        {isUnread && (
          <View style={styles.unreadIndicatorWrap}>
            <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyWrap}>
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryBgLight }]}>
          <Ionicons name="notifications-off-outline" size={44} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          {activeFilter === "unread" ? "No unread notifications" : "All caught up!"}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {activeFilter === "unread"
            ? "You don't have any unread notifications right now."
            : "You have no new notifications at this time."}
        </Text>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.primary }]}
          onPress={handleRefresh}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.refreshBtnText}>Check Again</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.cardBg}
      />

      {/* Top Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.cardBg, borderBottomColor: colors.borderLight },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View style={styles.headerCountBadge}>
              <Text style={styles.headerCountText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {/* Mark all read button */}
        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={handleManualMarkAllRead}
            disabled={isMarkingAll}
            style={styles.markAllBtn}
            activeOpacity={0.7}
          >
            {isMarkingAll ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.markAllText, { color: colors.primary }]}>
                Mark all read
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Filter Chips Bar */}
      <View
        style={[
          styles.filterBar,
          { backgroundColor: colors.cardBg, borderBottomColor: colors.borderLight },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor:
                activeFilter === "all" ? colors.primary : colors.backgroundAlt,
              borderColor:
                activeFilter === "all" ? colors.primary : colors.borderLight,
            },
          ]}
          onPress={() => setActiveFilter("all")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterChipText,
              { color: activeFilter === "all" ? "#FFFFFF" : colors.textSecondary },
            ]}
          >
            All ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor:
                activeFilter === "unread" ? colors.primary : colors.backgroundAlt,
              borderColor:
                activeFilter === "unread" ? colors.primary : colors.borderLight,
            },
          ]}
          onPress={() => setActiveFilter("unread")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterChipText,
              { color: activeFilter === "unread" ? "#FFFFFF" : colors.textSecondary },
            ]}
          >
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading notifications…
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item, index) =>
            item.id ? String(item.id) : `notif-${index}`
          }
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={
            filteredNotifications.length === 0
              ? styles.emptyContainer
              : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerCountBadge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 0.5,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  body: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  badgeWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  title: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 3,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  attachedImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginTop: 8,
  },
  unreadIndicatorWrap: {
    paddingLeft: 8,
    paddingTop: 4,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  refreshBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
