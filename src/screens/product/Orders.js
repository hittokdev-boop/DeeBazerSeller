import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import COLORS from "../../constants/theme";

const MOCK_ORDERS = [
  { id: "ORD202601", customerName: "Rahul Sharma", date: "22 Jul 2026", price: 1350, status: "Pending", items: "Organic Honey x2", image: "https://i.pravatar.cc/150?img=11" },
  { id: "ORD202602", customerName: "Priya Patel", date: "21 Jul 2026", price: 2499, status: "Delivered", items: "Bluetooth Speaker x1", image: "https://i.pravatar.cc/150?img=20" },
  { id: "ORD202603", customerName: "Amit Sen", date: "20 Jul 2026", price: 499, status: "Cancelled", items: "Cotton T-Shirt x1", image: "https://i.pravatar.cc/150?img=33" },
  { id: "ORD202604", customerName: "Sneha Reddy", date: "19 Jul 2026", price: 1798, status: "Delivered", items: "Stainless Water Bottle x2", image: "https://i.pravatar.cc/150?img=47" },
  { id: "ORD202605", customerName: "Vikram Malhotra", date: "18 Jul 2026", price: 590, status: "Pending", items: "Lipstick Cherry Red x1", image: "https://i.pravatar.cc/150?img=59" },
  { id: "ORD202606", customerName: "Ananya Das", date: "17 Jul 2026", price: 1299, status: "Delivered", items: "Yoga Mat x1", image: "https://i.pravatar.cc/150?img=65" },
];

const STATUS_FILTERS = ["All", "Pending", "Delivered", "Cancelled"];

const Orders = () => {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Filter Orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate dynamic stats
  const totalCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === "Pending").length;
  const deliveredCount = orders.filter((o) => o.status === "Delivered").length;

  const handleOrderPress = (order) => {
    if (order.status === "Pending") {
      Alert.alert(
        "Order Actions",
        `Manage Order #${order.id}\nCustomer: ${order.customerName}\nItems: ${order.items}`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Mark Delivered",
            onPress: () => updateOrderStatus(order.id, "Delivered"),
          },
          {
            text: "Cancel Order",
            style: "destructive",
            onPress: () => updateOrderStatus(order.id, "Cancelled"),
          },
        ]
      );
    } else {
      Alert.alert(
        "Order Details",
        `Order ID: #${order.id}\nCustomer: ${order.customerName}\nDate: ${order.date}\nItems: ${order.items}\nPrice: ₹ ${order.price}\nStatus: ${order.status}`
      );
    }
  };

  const updateOrderStatus = (id, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FB", paddingTop: 15 }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Orders</Text>
          <Text style={styles.subTitle}>Manage all customer orders</Text>
        </View>
        <TouchableOpacity style={styles.notification}>
          <Ionicons name="notifications-outline" size={24} color="#222" />
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCount}>{totalCount}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryCount, { color: "#F59E0B" }]}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryCount, { color: "#16A34A" }]}>{deliveredCount}</Text>
          <Text style={styles.summaryLabel}>Delivered</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color="#777" />
        <TextInput
          placeholder="Search Customer or Order ID..."
          placeholderTextColor="#777"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        {searchQuery !== "" && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#aaa" style={{ marginRight: 8 }} />
          </TouchableOpacity>
        )}
        <Ionicons name="options-outline" size={22} color="#555" />
      </View>

      {/* Status Filter Chips */}
      <View style={{ height: 42, marginBottom: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
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
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        ) : (
          filteredOrders.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.9}
              onPress={() => handleOrderPress(item)}
              style={styles.orderCard}
            >
              <Image source={{ uri: item.image }} style={styles.customerImage} />

              <View style={styles.orderInfo}>
                <Text style={styles.orderId}>#{item.id}</Text>
                <Text style={styles.customerName}>{item.customerName}</Text>
                <Text style={styles.orderDate}>{item.date} • {item.items}</Text>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.orderPrice}>₹ {item.price}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        item.status === "Delivered"
                          ? "#E8F7EF"
                          : item.status === "Pending"
                          ? "#FFF4E5"
                          : "#FFECEC",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        item.status === "Delivered"
                          ? "#16A34A"
                          : item.status === "Pending"
                          ? "#F59E0B"
                          : "#E53935",
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default Orders;

const styles = StyleSheet.create({
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
    color: "#222",
  },
  subTitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#777",
  },
  notification: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
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
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2E7DFF",
  },
  summaryLabel: {
    marginTop: 6,
    fontSize: 13,
    color: "#666",
  },
  searchBox: {
    marginHorizontal: 16,
    marginBottom: 20,
    height: 55,
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#222",
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
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
    color: "#555",
  },
  chipTextActive: {
    color: "#fff",
  },
  orderCard: {
    marginHorizontal: 16,
    marginBottom: 15,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  customerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  orderInfo: {
    flex: 1,
    marginLeft: 14,
  },
  orderId: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },
  customerName: {
    marginTop: 5,
    fontSize: 14,
    color: "#555",
  },
  orderDate: {
    marginTop: 4,
    fontSize: 12,
    color: "#999",
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#16A34A",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: "#888",
  },
});