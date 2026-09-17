import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { getOrders, updateOrderStatusAPI } from "../../api/orders";

const STATUS_FILTERS = ["All", "Pending", "Delivered", "Cancelled"];

const Orders = ({ navigation }) => {
  const { colors } = useTheme();
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const response = await getOrders();
      const ordersList = response?.data?.orders || response?.orders || response?.data || response || [];
      setOrders(ordersList);
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const safeOrders = Array.isArray(orders) ? orders : [];

  const filteredOrders = safeOrders.filter((order) => {
    const customerName = (order.customer?.name || order.customerName || "").toString();
    const orderIdStr = (order.order_number || order.id || "").toString();
    const itemsStr = (order.items || "").toString();

    const matchesSearch =
      customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      orderIdStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      itemsStr.toLowerCase().includes(searchQuery.toLowerCase());

    const statusStr = (order.status || "").toString();
    const formattedStatus = statusStr ? statusStr.charAt(0).toUpperCase() + statusStr.slice(1) : "";
    const matchesStatus = statusFilter === "All" || formattedStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalCount = safeOrders.length;
  const pendingCount = safeOrders.filter((o) => (o.status || "").toString().toLowerCase() === "pending").length;
  const deliveredCount = safeOrders.filter((o) => (o.status || "").toString().toLowerCase() === "delivered").length;

  const updateOrderStatus = async (id, newStatus) => {
    try {
      await updateOrderStatusAPI(id, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
      );
      Alert.alert("Success", `Order #${id} status updated to ${newStatus}`);
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update order status");
    }
  };

  const handleOrderPress = (order) => {
    navigation.navigate("OrderDetails", { orderId: order.id });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textGrayDark }]}>Orders</Text>
          <Text style={[styles.subTitle, { color: colors.textGrayLight }]}>Manage all customer orders</Text>
        </View>
        <TouchableOpacity style={[styles.notification, { backgroundColor: colors.cardBg }]}>
          <Ionicons name="notifications-outline" size={24} color={colors.textGrayDark} />
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCount}>{totalCount}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryCount, styles.pendingSummaryCount]}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryCount, styles.deliveredSummaryCount]}>{deliveredCount}</Text>
          <Text style={styles.summaryLabel}>Delivered</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={COLORS.textGrayLight} />
        <TextInput
          placeholder="Search Customer or Order ID..."
          placeholderTextColor={COLORS.textGrayLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        {searchQuery !== "" && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={COLORS.textGrayPlaceholder} style={styles.clearSearchIcon} />
          </TouchableOpacity>
        )}
        <Ionicons name="options-outline" size={22} color={COLORS.textGrayMedium} />
      </View>

      {/* Status Filter Chips */}
      <View style={styles.chipRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContent}
        >
          {STATUS_FILTERS.map((status) => {
            const isSelected = statusFilter === status;
            return (
              <TouchableOpacity
                key={status}
                onPress={() => setStatusFilter(status)}
                style={[
                  styles.chip,
                  isSelected && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextActive,
                  ]}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Orders List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listScrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {loading ? (
          <View style={{ marginTop: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={60} color={COLORS.borderDark} />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        ) : (
          filteredOrders.map((item) => {
            const statusStr = (item.status || "").toString();
            const formattedStatus = statusStr ? statusStr.charAt(0).toUpperCase() + statusStr.slice(1) : "Unknown";
            const custName = item.customer?.name || item.customerName || "Customer";
            let formattedDate = item.created_at || item.date || "N/A";
            if (typeof formattedDate === "string" && formattedDate.includes("T")) {
              formattedDate = new Date(formattedDate).toLocaleDateString();
            }

            return (
              <TouchableOpacity
                key={item.id || item._id}
                activeOpacity={0.9}
                onPress={() => handleOrderPress(item)}
                style={styles.orderCard}
              >
                {Array.isArray(item.items) && item.items.length > 1 ? (
                  <View style={[styles.customerImage, styles.multiItemIconContainer]}>
                    <Ionicons name="cube-outline" size={30} color={COLORS.primary} />
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>{item.items.length}</Text>
                    </View>
                  </View>
                ) : item.image ? (
                  <Image source={{ uri: item.image }} style={styles.customerImage} />
                ) : (
                  <View style={[styles.customerImage, styles.multiItemIconContainer]}>
                    <Ionicons name="receipt-outline" size={28} color={COLORS.primary} />
                  </View>
                )}

                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>{item.order_number || "#" + (item.id || item._id)}</Text>
                  <Text style={styles.customerName}>{custName}</Text>
                  <Text style={styles.orderDate}>{formattedDate}</Text>
                </View>

                <View style={styles.priceContainer}>
                  <Text style={styles.orderPrice}>₹ {item.subtotal || item.price || 0}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      formattedStatus === "Delivered"
                        ? styles.deliveredBadgeBg
                        : formattedStatus === "Pending"
                          ? styles.pendingBadgeBg
                          : styles.cancelledBadgeBg,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        formattedStatus === "Delivered"
                          ? styles.deliveredBadgeText
                          : formattedStatus === "Pending"
                            ? styles.pendingBadgeText
                            : styles.cancelledBadgeText,
                      ]}
                    >
                      {formattedStatus}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

export default Orders;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundAlt,
    paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0) + 15,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.textGrayDark,
  },
  subTitle: {
    marginTop: 4,
    fontSize: 14,
    color: COLORS.textGrayLight,
  },
  notification: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: COLORS.cardBg,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  summaryCard: {
    width: "31%",
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.primary,
  },
  pendingSummaryCount: {
    color: COLORS.warning,
  },
  deliveredSummaryCount: {
    color: COLORS.success,
  },
  summaryLabel: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  searchBox: {
    marginHorizontal: 16,
    marginBottom: 20,
    height: 55,
    backgroundColor: COLORS.cardBg,
    borderRadius: 15,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.textGrayDark,
  },
  clearSearchIcon: {
    marginRight: 8,
  },
  chipRow: {
    height: 42,
    marginBottom: 12,
  },
  chipScrollContent: {
    paddingHorizontal: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.borderInactive,
    height: 38,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textGrayMedium,
  },
  chipTextActive: {
    color: COLORS.textContrast,
  },
  listScrollContent: {
    paddingBottom: 100,
  },
  orderCard: {
    marginHorizontal: 16,
    marginBottom: 15,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  customerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  multiItemIconContainer: {
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  badgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBg,
    paddingHorizontal: 4,
    zIndex: 10,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  orderInfo: {
    flex: 1,
    marginLeft: 14,
  },
  orderId: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textGrayDark,
  },
  customerName: {
    marginTop: 5,
    fontSize: 14,
    color: COLORS.textGrayMedium,
  },
  orderDate: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textGrayPlaceholder,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.success,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  deliveredBadgeBg: {
    backgroundColor: COLORS.successBgLight,
  },
  pendingBadgeBg: {
    backgroundColor: COLORS.warningBgLight,
  },
  cancelledBadgeBg: {
    backgroundColor: COLORS.errorBgLight,
  },
  statusBadgeText: {
    fontWeight: "700",
    fontSize: 12,
  },
  deliveredBadgeText: {
    color: COLORS.success,
  },
  pendingBadgeText: {
    color: COLORS.warning,
  },
  cancelledBadgeText: {
    color: COLORS.error,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textMuted,
  },
});