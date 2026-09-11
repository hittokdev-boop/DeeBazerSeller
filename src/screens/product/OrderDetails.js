import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { getOrder, updateOrderStatusAPI } from "../../api/orders";

const OrderDetails = ({ route, navigation }) => {
  const { orderId } = route.params;
  const { colors } = useTheme();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await getOrder(orderId);
      // Backend returns either { data: { ... } } or just the object
      setOrder(response?.data || response);
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to load order details");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const handleUpdateStatus = async (newStatus) => {
    try {
      await updateOrderStatusAPI(orderId, newStatus);
      Alert.alert("Success", `Order status updated to ${newStatus}`);
      fetchOrderDetails();
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update order status");
    }
  };

  if (loading || !order) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.backgroundAlt }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const formattedDate = order.created_at ? new Date(order.created_at).toLocaleString() : "N/A";
  const statusStr = (order.status || "").toString();
  const formattedStatus = statusStr ? statusStr.charAt(0).toUpperCase() + statusStr.slice(1) : "Unknown";

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textGrayDark} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textGrayDark }]}>
          Order Details
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top summary card */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.orderNumber}>{order.order_number || `#${order.id}`}</Text>
            <View
              style={[
                styles.statusBadge,
                formattedStatus === "Delivered"
                  ? styles.deliveredBadgeBg
                  : formattedStatus === "Pending"
                  ? styles.pendingBadgeBg
                  : formattedStatus === "Shipped"
                  ? styles.shippedBadgeBg
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
                    : formattedStatus === "Shipped"
                    ? styles.shippedBadgeText
                    : styles.cancelledBadgeText,
                ]}
              >
                {formattedStatus}
              </Text>
            </View>
          </View>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>

        {/* Action Buttons based on flags */}
        <View style={styles.actionRow}>
          {order.can_confirm && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleUpdateStatus("confirmed")}>
              <Text style={styles.actionBtnText}>Confirm Order</Text>
            </TouchableOpacity>
          )}
          {order.can_ship && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleUpdateStatus("shipped")}>
              <Text style={styles.actionBtnText}>Mark Shipped</Text>
            </TouchableOpacity>
          )}
          {order.can_cancel && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnCancel]} onPress={() => handleUpdateStatus("cancelled")}>
              <Text style={styles.actionBtnTextCancel}>Cancel Order</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Customer & Shipping */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer Details</Text>
          {order.customer ? (
            <View style={styles.detailsBlock}>
              <Text style={styles.detailText}><Ionicons name="person-outline" size={16}/> {order.customer.name}</Text>
              <Text style={styles.detailText}><Ionicons name="mail-outline" size={16}/> {order.customer.email}</Text>
              <Text style={styles.detailText}><Ionicons name="call-outline" size={16}/> {order.customer.mobile}</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>No customer data available.</Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Shipping Address</Text>
          {order.shipping_address ? (
            <View style={styles.detailsBlock}>
              <Text style={styles.detailText}>{order.shipping_address.name}</Text>
              <Text style={styles.detailText}>{order.shipping_address.address}</Text>
              <Text style={styles.detailText}>
                {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
              </Text>
              <Text style={styles.detailText}>{order.shipping_address.country}</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>No shipping address provided.</Text>
          )}
        </View>

        {/* Line Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items && order.items.length > 0 ? (
            order.items.map((item, idx) => (
              <View key={item.id || idx} style={styles.itemRow}>
                <Image source={{ uri: item.image_url || "https://i.pravatar.cc/150" }} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>Qty: {item.quantity} x ₹{item.unit_price}</Text>
                </View>
                <Text style={styles.itemTotal}>₹{item.total}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No items found in this order.</Text>
          )}

          <View style={styles.divider} />

          {/* Pricing breakdown */}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>₹{order.subtotal || 0}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Shipping</Text>
            <Text style={styles.priceValue}>₹{order.shipping_cost || 0}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Commission Deducted</Text>
            <Text style={[styles.priceValue, { color: COLORS.error }]}>- ₹{order.commission_amount || 0}</Text>
          </View>
          <View style={[styles.priceRow, { marginTop: 8 }]}>
            <Text style={[styles.priceLabel, { fontWeight: "700", color: COLORS.textPrimary }]}>Net Seller Amount</Text>
            <Text style={[styles.priceValue, { fontWeight: "700", color: COLORS.success, fontSize: 18 }]}>
              ₹{order.seller_amount || 0}
            </Text>
          </View>
        </View>

        {/* Tracking */}
        {order.tracking_updates && order.tracking_updates.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tracking History</Text>
            <Text style={styles.trackingNumber}>Tracking #: {order.tracking_number || "N/A"}</Text>
            <View style={styles.timeline}>
              {order.tracking_updates.map((update, idx) => (
                <View key={idx} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  {idx !== order.tracking_updates.length - 1 && <View style={styles.timelineLine} />}
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineStatus}>{update.status}</Text>
                    <Text style={styles.timelineDesc}>{update.description} - {update.location}</Text>
                    <Text style={styles.timelineDate}>{new Date(update.timestamp).toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default OrderDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: (Platform.OS === "android" ? StatusBar.currentHeight || 24 : 0) + 15,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textGrayDark,
  },
  dateText: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textGrayLight,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  deliveredBadgeBg: { backgroundColor: COLORS.successBgLight },
  pendingBadgeBg: { backgroundColor: COLORS.warningBgLight },
  shippedBadgeBg: { backgroundColor: COLORS.primaryBgLight },
  cancelledBadgeBg: { backgroundColor: COLORS.errorBgLight },
  statusBadgeText: { fontWeight: "700", fontSize: 12 },
  deliveredBadgeText: { color: COLORS.success },
  pendingBadgeText: { color: COLORS.warning },
  shippedBadgeText: { color: COLORS.primary },
  cancelledBadgeText: { color: COLORS.error },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  actionBtnText: {
    color: COLORS.textContrast,
    fontWeight: "600",
  },
  actionBtnCancel: {
    backgroundColor: COLORS.errorBgLight,
  },
  actionBtnTextCancel: {
    color: COLORS.error,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textGrayDark,
    marginBottom: 12,
  },
  detailsBlock: {
    marginTop: 4,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.textGrayMedium,
    marginBottom: 6,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 16,
  },
  emptyText: {
    color: COLORS.textGrayPlaceholder,
    fontStyle: "italic",
    fontSize: 14,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundAlt,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textGrayDark,
  },
  itemMeta: {
    fontSize: 13,
    color: COLORS.textGrayLight,
    marginTop: 4,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textGrayDark,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textGrayMedium,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textGrayDark,
  },
  trackingNumber: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 10,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginTop: 4,
    zIndex: 2,
  },
  timelineLine: {
    position: "absolute",
    left: 5,
    top: 16,
    bottom: -20,
    width: 2,
    backgroundColor: COLORS.borderLight,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 16,
  },
  timelineStatus: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textGrayDark,
  },
  timelineDesc: {
    fontSize: 13,
    color: COLORS.textGrayMedium,
    marginTop: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: COLORS.textGrayLight,
    marginTop: 4,
  },
});
