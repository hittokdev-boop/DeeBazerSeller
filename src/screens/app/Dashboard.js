import React, { useState, useEffect } from 'react';
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from "react-native";
import { ScrollView } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../../constants/theme";

const MOCK_DASHBOARD_ORDERS = [
  { id: "ORD1011", customerName: "Rahul Sharma", price: 1100, status: "Delivered", image: "https://i.pravatar.cc/150?img=21" },
  { id: "ORD1012", customerName: "Priya Patel", price: 1650, status: "Pending", image: "https://i.pravatar.cc/150?img=22" },
  { id: "ORD1013", customerName: "Amit Sen", price: 2200, status: "Delivered", image: "https://i.pravatar.cc/150?img=23" },
  { id: "ORD1014", customerName: "Sneha Reddy", price: 2750, status: "Pending", image: "https://i.pravatar.cc/150?img=24" },
];

const SellerDashboard = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState(MOCK_DASHBOARD_ORDERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem("sellerProfile");
        if (storedProfile) {
          setProfile(JSON.parse(storedProfile));
        }
      } catch (e) {
        console.log("Error loading profile on dashboard", e);
      }
    };
    loadProfile();
  }, []);

  // Filter Orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
   <ScrollView
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{
    paddingBottom: 50,
  }}>
      <View style={styles.headerContainer}>
  {/* Top Row */}
  <View style={styles.headerTop}>
    <View style={styles.leftSection}>
      <Text style={styles.welcomeText}>Welcome Back 👋</Text>
      <Text style={styles.sellerName}>{profile?.storeName || "Hittok Store"}</Text>
    </View>

    <View style={styles.rightSection}>
      <TouchableOpacity style={styles.iconBtn}>
        <Ionicons
          name="notifications-outline"
          size={24}
          color="#222"
        />

        <View style={styles.badge}>
          <Text style={styles.badgeText}>3</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.profileBtn}
        onPress={() => navigation.navigate("Account")}
      >
        <Image
          source={{
            uri: profile?.logoUri || "https://i.pravatar.cc/150?img=12",
          }}
          style={styles.profileImage}
        />
      </TouchableOpacity>
    </View>
  </View>

  {/* Search Bar */}
  <View style={styles.searchContainer}>
    <Ionicons
      name="search-outline"
      size={22}
      color="#888"
    />
    <TextInput
      placeholder="Search Recent Orders..."
      placeholderTextColor="#888"
      value={searchQuery}
      onChangeText={setSearchQuery}
      style={styles.searchInput}
    />
    {searchQuery !== "" && (
      <TouchableOpacity onPress={() => setSearchQuery("")}>
        <Ionicons name="close-circle" size={18} color="#aaa" style={{ marginRight: 6 }} />
      </TouchableOpacity>
    )}
    <Ionicons
      name="options-outline"
      size={20}
      color="#555"
    />
  </View>

  {/* Status Filter Chips */}
  <View style={{ height: 38, marginTop: 12 }}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 4 }}
    >
      {["All", "Pending", "Delivered"].map((status) => {
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
      </View>

        <View style={styles.overviewContainer}>

  <View style={styles.cardRow}>

    {/* Total Sales */}
    <TouchableOpacity activeOpacity={0.9} style={styles.overviewCard}>
      <View style={[styles.iconCircle, { backgroundColor: "#E8F7EF" }]}>
        <Ionicons
          name="cash-outline"
          size={24}
          color="#17A34A"
        />
      </View>

      <Text style={styles.cardTitle}>Total Sales</Text>

      <Text style={styles.cardValue}>₹1,28,540</Text>

      <View style={styles.growthRow}>
        <Ionicons
          name="trending-up"
          color="#16A34A"
          size={15}
        />
        <Text style={styles.growthText}>+12.5%</Text>
      </View>
    </TouchableOpacity>

    {/* Orders */}
    <TouchableOpacity activeOpacity={0.9} style={styles.overviewCard}>
      <View style={[styles.iconCircle, { backgroundColor: "#EEF4FF" }]}>
        <Ionicons
          name="cube-outline"
          size={24}
          color="#3B82F6"
        />
      </View>

      <Text style={styles.cardTitle}>Orders</Text>

      <Text style={styles.cardValue}>1,258</Text>

      <View style={styles.growthRow}>
        <Ionicons
          name="trending-up"
          color="#16A34A"
          size={15}
        />
        <Text style={styles.growthText}>+8.2%</Text>
      </View>
    </TouchableOpacity>

  </View>

  <View style={styles.cardRow}>

    {/* Products */}
    <TouchableOpacity activeOpacity={0.9} style={styles.overviewCard}>
      <View style={[styles.iconCircle, { backgroundColor: "#FFF7E8" }]}>
        <Ionicons
          name="bag-handle-outline"
          size={24}
          color="#F59E0B"
        />
      </View>

      <Text style={styles.cardTitle}>Products</Text>

      <Text style={styles.cardValue}>326</Text>

      <View style={styles.growthRow}>
        <Ionicons
          name="add-circle-outline"
          color="#F59E0B"
          size={15}
        />
        <Text style={[styles.growthText, { color: "#F59E0B" }]}>
          12 New
        </Text>
      </View>
    </TouchableOpacity>

    {/* Earnings */}
    <TouchableOpacity activeOpacity={0.9} style={styles.overviewCard}>
      <View style={[styles.iconCircle, { backgroundColor: "#F3ECFF" }]}>
        <Ionicons
          name="wallet-outline"
          size={24}
          color="#8B5CF6"
        />
      </View>

      <Text style={styles.cardTitle}>Earnings</Text>

      <Text style={styles.cardValue}>₹45,820</Text>

      <View style={styles.growthRow}>
        <Ionicons
          name="trending-up"
          color="#16A34A"
          size={15}
        />
        <Text style={styles.growthText}>+18%</Text>
      </View>
    </TouchableOpacity>

  </View>

         </View>
           
      <View style={styles.orderSection}>

  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>Recent Orders</Text>

    <TouchableOpacity onPress={() => navigation.navigate("Orders")}>
      <Text style={styles.seeAll}>See All</Text>
    </TouchableOpacity>
  </View>

  {filteredOrders.length === 0 ? (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={40} color="#ccc" style={{ marginBottom: 10 }} />
      <Text style={styles.emptyText}>No matching orders found</Text>
    </View>
  ) : (
    filteredOrders.map((item) => (
      <TouchableOpacity
        activeOpacity={0.9}
        key={item.id}
        onPress={() => navigation.navigate("Orders")}
        style={styles.orderCard}
      >
        <Image
          source={{
            uri: item.image,
          }}
          style={styles.customerImage}
        />

        <View style={styles.orderInfo}>
          <View style={styles.orderTop}>
            <View>
              <Text style={styles.orderId}>
                #{item.id}
              </Text>
              <Text style={styles.customerName}>
                {item.customerName}
              </Text>
            </View>

            <Text style={styles.orderPrice}>
              ₹{item.price}
            </Text>
          </View>

          <View style={styles.orderBottom}>
            <View style={styles.statusRow}>
              <View style={styles.paymentBadge}>
                <Text style={styles.paymentText}>
                  Paid
                </Text>
              </View>

              <View
                style={[
                  styles.deliveryBadge,
                  {
                    backgroundColor:
                      item.status === "Delivered"
                        ? "#E8F7EF"
                        : "#FFF4E5",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.deliveryText,
                    {
                      color:
                        item.status === "Delivered"
                          ? "#16A34A"
                          : "#F59E0B",
                    },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#999"
            />
          </View>
        </View>
      </TouchableOpacity>
    ))
  )}

      </View>

      <View style={styles.stockSection}>

  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>
      Low Stock Products
    </Text>

    <TouchableOpacity>
      <Text style={styles.seeAll}>
        See All
      </Text>
    </TouchableOpacity>
  </View>

  {[1,2,3].map((item,index)=>{

    const stock=[4,8,2][index];
    const percent=(stock/20)*100;

    return(

      <TouchableOpacity
        key={index}
        activeOpacity={0.9}
        style={styles.stockCard}>

        <Image
          source={{
            uri:`https://picsum.photos/200?random=${index+20}`
          }}
          style={styles.productImage}
        />

        <View style={styles.stockInfo}>

          <View style={styles.productTop}>

            <View style={{flex:1}}>

              <Text style={styles.productName}>
                Premium Product {index+1}
              </Text>

              <Text style={styles.productCategory}>
                Grocery
              </Text>

            </View>

            <View style={styles.warningBadge}>
              <Ionicons
                name="warning"
                color="#FF9800"
                size={14}
              />
              <Text style={styles.warningText}>
                Low
              </Text>
            </View>

          </View>

          <Text style={styles.stockText}>
            Only {stock} items left
          </Text>

          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                {
                  width:`${percent}%`
                }
              ]}
            />
          </View>

          <TouchableOpacity style={styles.restockBtn}>
            <Ionicons
              name="add-circle-outline"
              size={18}
              color="#fff"
            />

            <Text style={styles.restockText}>
              Restock
            </Text>
          </TouchableOpacity>

        </View>

      </TouchableOpacity>

    )

  })}

      </View>

      <View style={styles.topSellingSection}>

  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>
      Top Selling Products
    </Text>

    <TouchableOpacity>
      <Text style={styles.seeAll}>
        See All
      </Text>
    </TouchableOpacity>
  </View>

  {[1,2,3].map((item,index)=>{

    const sold=[850,620,430][index];
    const revenue=["₹1.2L","₹96K","₹72K"][index];
    const progress=[95,82,68][index];

    return(

      <TouchableOpacity
        key={index}
        activeOpacity={0.9}
        style={styles.topCard}>

        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>
            #{index+1}
          </Text>
        </View>

        <Image
          source={{
            uri:`https://picsum.photos/200?random=${60+index}`
          }}
          style={styles.topImage}
        />

        <View style={styles.topInfo}>

          <Text style={styles.topName}>
            Organic Product {index+1}
          </Text>

          <View style={styles.infoRow}>
            <Ionicons
              name="cube-outline"
              size={15}
              color="#666"
            />
            <Text style={styles.infoText}>
              {sold} Sold
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="cash-outline"
              size={15}
              color="#18A558"
            />
            <Text style={styles.revenueText}>
              {revenue}
            </Text>
          </View>

          <View style={styles.ratingRow}>

            <Ionicons
              name="star"
              size={15}
              color="#FFC107"
            />

            <Text style={styles.ratingText}>
              4.9
            </Text>

          </View>

          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressBar,
                {width:`${progress}%`}
              ]}
            />
          </View>

        </View>

        <TouchableOpacity style={styles.viewBtn}>
          <Ionicons
            name="arrow-forward"
            size={18}
            color="#fff"
          />
        </TouchableOpacity>

      </TouchableOpacity>

    )

  })}

      </View>

      <View style={styles.pendingSection}>

  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>
      Pending Actions
    </Text>

    <TouchableOpacity>
      <Text style={styles.seeAll}>
        Manage
      </Text>
    </TouchableOpacity>
  </View>

  <View style={styles.pendingGrid}>

    {/* Pending Orders */}
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.pendingCard,{backgroundColor:"#EEF5FF"}]}>

      <View style={[styles.pendingIcon,{backgroundColor:"#2E7DFF"}]}>
        <Ionicons
          name="bag-handle-outline"
          size={24}
          color="#fff"
        />
      </View>

      <Text style={styles.pendingCount}>18</Text>

      <Text style={styles.pendingTitle}>
        Pending Orders
      </Text>

      <View style={styles.pendingFooter}>
        <Text style={styles.pendingLink}>View</Text>

        <Ionicons
          name="arrow-forward"
          size={18}
          color="#2E7DFF"
        />
      </View>

    </TouchableOpacity>

    {/* Returns */}
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.pendingCard,{backgroundColor:"#FFF7EA"}]}>

      <View style={[styles.pendingIcon,{backgroundColor:"#F59E0B"}]}>
        <Ionicons
          name="refresh-outline"
          size={24}
          color="#fff"
        />
      </View>

      <Text style={styles.pendingCount}>6</Text>

      <Text style={styles.pendingTitle}>
        Return Requests
      </Text>

      <View style={styles.pendingFooter}>
        <Text style={styles.pendingLink}>Review</Text>

        <Ionicons
          name="arrow-forward"
          size={18}
          color="#F59E0B"
        />
      </View>

    </TouchableOpacity>

  </View>

  <View style={styles.pendingGrid}>

    {/* Refund */}
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.pendingCard,{backgroundColor:"#FFF0F3"}]}>

      <View style={[styles.pendingIcon,{backgroundColor:"#E91E63"}]}>
        <Ionicons
          name="wallet-outline"
          size={24}
          color="#fff"
        />
      </View>

      <Text style={styles.pendingCount}>4</Text>

      <Text style={styles.pendingTitle}>
        Refund Requests
      </Text>

      <View style={styles.pendingFooter}>
        <Text style={styles.pendingLink}>Open</Text>

        <Ionicons
          name="arrow-forward"
          size={18}
          color="#E91E63"
        />
      </View>

    </TouchableOpacity>

    {/* Messages */}
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.pendingCard,{backgroundColor:"#EFFFF6"}]}>

      <View style={[styles.pendingIcon,{backgroundColor:"#16A34A"}]}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={24}
          color="#fff"
        />
      </View>

      <Text style={styles.pendingCount}>12</Text>

      <Text style={styles.pendingTitle}>
        Customer Messages
      </Text>

      <View style={styles.pendingFooter}>
        <Text style={styles.pendingLink}>Reply</Text>

        <Ionicons
          name="arrow-forward"
          size={18}
          color="#16A34A"
        />
      </View>

    </TouchableOpacity>

  </View>

      </View>
      
      <View style={styles.revenueSection}>

  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>
      Revenue Overview
    </Text>

    <TouchableOpacity>
      <Text style={styles.seeAll}>
        Details
      </Text>
    </TouchableOpacity>
  </View>

  {/* Revenue Card */}
  <View style={styles.revenueCard}>

    <View style={styles.revenueTop}>
      <View>
        <Text style={styles.revenueLabel}>
          Total Revenue
        </Text>

        <Text style={styles.revenueAmount}>
          ₹12,48,560
        </Text>
      </View>

      <View style={styles.revenueIcon}>
        <Ionicons
          name="wallet-outline"
          size={28}
          color="#fff"
        />
      </View>
    </View>

    <View style={styles.analyticsBox}>
      <View style={styles.analyticsBar}>
        <View style={[styles.analyticsFill,{width:"78%"}]} />
      </View>

      <View style={styles.analyticsRow}>
        <Text style={styles.analyticsLeft}>
          Monthly Growth
        </Text>

        <Text style={styles.analyticsRight}>
          +18.4%
        </Text>
      </View>
    </View>

  </View>

  {/* Wallet Cards */}

  <View style={styles.walletRow}>

    <View style={styles.walletCard}>
      <Ionicons
        name="card-outline"
        size={28}
        color="#16A34A"
      />

      <Text style={styles.walletTitle}>
        Wallet Balance
      </Text>

      <Text style={styles.walletValue}>
        ₹84,320
      </Text>
    </View>

    <View style={styles.walletCard}>
      <Ionicons
        name="cash-outline"
        size={28}
        color="#FF9800"
      />

      <Text style={styles.walletTitle}>
        Withdrawable
      </Text>

      <Text style={styles.walletValue}>
        ₹63,950
      </Text>
    </View>

  </View>

  {/* Withdraw Button */}

  <TouchableOpacity style={styles.withdrawButton}>

    <Ionicons
      name="arrow-down-circle-outline"
      size={22}
      color="#fff"
    />

    <Text style={styles.withdrawText}>
      Withdraw Earnings
    </Text>

  </TouchableOpacity>

      </View>

      <View style={styles.customerSection}>

  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>
      Customer Analytics
    </Text>

    <TouchableOpacity>
      <Text style={styles.seeAll}>
        View All
      </Text>
    </TouchableOpacity>
  </View>

  <View style={styles.customerGrid}>

    <View style={styles.customerCard}>
      <Ionicons
        name="people-outline"
        size={28}
        color="#2E7DFF"
      />

      <Text style={styles.customerCount}>
        12,560
      </Text>

      <Text style={styles.customerLabel}>
        Total Customers
      </Text>
    </View>

    <View style={styles.customerCard}>
      <Ionicons
        name="person-add-outline"
        size={28}
        color="#16A34A"
      />

      <Text style={styles.customerCount}>
        1,245
      </Text>

      <Text style={styles.customerLabel}>
        New Customers
      </Text>
    </View>

  </View>

  <View style={styles.customerGrid}>

    <View style={styles.customerCard}>
      <Ionicons
        name="repeat-outline"
        size={28}
        color="#FF9800"
      />

      <Text style={styles.customerCount}>
        78%
      </Text>

      <Text style={styles.customerLabel}>
        Repeat Customers
      </Text>
    </View>

    <View style={styles.customerCard}>
      <Ionicons
        name="star-outline"
        size={28}
        color="#FFD600"
      />

      <Text style={styles.customerCount}>
        4.9
      </Text>

      <Text style={styles.customerLabel}>
        Satisfaction
      </Text>
    </View>

  </View>

      </View>

    <View style={styles.performanceSection}>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Store Performance
        </Text>

        <TouchableOpacity>
          <Text style={styles.seeAll}>
            Details
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.performanceCard}>

        <View style={styles.performanceTop}>

          <View>
            <Text style={styles.performanceTitle}>
              Store Health Score
            </Text>

            <Text style={styles.healthScore}>
              96%
            </Text>
          </View>

          <View style={styles.healthBadge}>
            <Ionicons
              name="checkmark-circle"
              size={28}
              color="#16A34A"
            />
          </View>

        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressValue,
                {
                  width: "96%",
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.performanceRow}>

          <View style={styles.performanceItem}>
            <Ionicons
              name="star"
              size={20}
              color="#FFC107"
            />
            <Text style={styles.performanceValue}>
              4.9
            </Text>
            <Text style={styles.performanceLabel}>
              Rating
            </Text>
          </View>

          <View style={styles.performanceItem}>
            <Ionicons
              name="car-outline"
              size={20}
              color="#2E7DFF"
            />
            <Text style={styles.performanceValue}>
              98%
            </Text>
            <Text style={styles.performanceLabel}>
              Delivery
            </Text>
          </View>

          <View style={styles.performanceItem}>
            <Ionicons
              name="cube-outline"
              size={20}
              color="#16A34A"
            />
            <Text style={styles.performanceValue}>
              99%
            </Text>
            <Text style={styles.performanceLabel}>
              Fulfilled
            </Text>
          </View>

        </View>

      </View>

    </View>

    <View style={styles.quickActionSection}>

  <Text style={styles.sectionTitle}>
    Quick Actions
  </Text>

  <View style={styles.quickGrid}>

    <TouchableOpacity style={styles.quickCard}>
      <View style={[styles.quickIcon,{backgroundColor:"#EAF2FF"}]}>
        <Ionicons
          name="add-circle-outline"
          size={26}
          color="#2E7DFF"
        />
      </View>

      <Text style={styles.quickTitle}>
        Add Product
      </Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.quickCard}>
      <View style={[styles.quickIcon,{backgroundColor:"#EEFDF3"}]}>
        <Ionicons
          name="cube-outline"
          size={26}
          color="#16A34A"
        />
      </View>

      <Text style={styles.quickTitle}>
        Products
      </Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.quickCard}>
      <View style={[styles.quickIcon,{backgroundColor:"#FFF6E8"}]}>
        <Ionicons
          name="bag-handle-outline"
          size={26}
          color="#FF9800"
        />
      </View>

      <Text style={styles.quickTitle}>
        Orders
      </Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.quickCard}>
      <View style={[styles.quickIcon,{backgroundColor:"#F4EEFF"}]}>
        <Ionicons
          name="stats-chart-outline"
          size={26}
          color="#7C3AED"
        />
      </View>

      <Text style={styles.quickTitle}>
        Analytics
      </Text>
    </TouchableOpacity>

  </View>

</View>


    </ScrollView>
  );
};

const styles=StyleSheet.create({
  headerContainer: {
  backgroundColor: COLORS.cardBg,
  paddingHorizontal: 18,
  paddingTop: 55,
  paddingBottom: 22,
  borderBottomLeftRadius: 28,
  borderBottomRightRadius: 28,
  elevation: 10,
  shadowColor: COLORS.textPrimary,
  shadowOpacity: 0.08,
  shadowRadius: 12,
},

headerTop: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

leftSection: {
  flex: 1,
},

welcomeText: {
  fontSize: 15,
  color: COLORS.textGrayLight,
  fontWeight: "500",
},

sellerName: {
  marginTop: 4,
  fontSize: 26,
  fontWeight: "700",
  color: COLORS.textPrimary,
},

rightSection: {
  flexDirection: "row",
  alignItems: "center",
},

iconBtn: {
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: "#F7F8FA",
  justifyContent: "center",
  alignItems: "center",
  marginRight: 12,
},

badge: {
  position: "absolute",
  top: 8,
  right: 8,
  width: 18,
  height: 18,
  borderRadius: 9,
  backgroundColor: "#FF3B30",
  justifyContent: "center",
  alignItems: "center",
},

badgeText: {
  color: "#fff",
  fontSize: 10,
  fontWeight: "700",
},

profileBtn: {
  width: 50,
  height: 50,
  borderRadius: 25,
  overflow: "hidden",
},

profileImage: {
  width: "100%",
  height: "100%",
},

searchContainer: {
  marginTop: 22,
  backgroundColor: "#F5F6FA",
  height: 54,
  borderRadius: 16,
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
},

searchInput: {
  flex: 1,
  marginLeft: 10,
  fontSize: 15,
  color: "#222",
  padding: 0,
},
chip: {
  paddingHorizontal: 16,
  paddingVertical: 6,
  borderRadius: 16,
  backgroundColor: "#F5F6FA",
  marginRight: 8,
  height: 32,
  justifyContent: "center",
  borderWidth: 1,
  borderColor: "#E5E5E5",
},
chipActive: {
  backgroundColor: COLORS.primary,
  borderColor: COLORS.primary,
},
chipText: {
  fontSize: 12,
  fontWeight: "600",
  color: "#555",
},
chipTextActive: {
  color: "#fff",
},
emptyContainer: {
  alignItems: "center",
  justifyContent: "center",
  marginTop: 20,
  marginBottom: 20,
},
emptyText: {
  marginTop: 8,
  fontSize: 14,
  color: "#888",
},
overviewContainer: {
  paddingHorizontal: 16,
  marginTop: 18,
},

cardRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 15,
},

overviewCard: {
  width: "48%",
  backgroundColor: "#fff",
  borderRadius: 18,
  padding: 16,
  elevation: 5,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 10,
},

iconCircle: {
  width: 52,
  height: 52,
  borderRadius: 26,
  justifyContent: "center",
  alignItems: "center",
},

cardTitle: {
  marginTop: 14,
  fontSize: 14,
  color: "#777",
  fontWeight: "500",
},

cardValue: {
  marginTop: 6,
  fontSize: 22,
  color: "#111",
  fontWeight: "700",
},

growthRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 12,
},

growthText: {
  marginLeft: 4,
  color: "#16A34A",
  fontWeight: "700",
  fontSize: 13,
},
orderSection: {
  marginTop: 22,
  paddingHorizontal: 16,
},

sectionHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 15,
},

sectionTitle: {
  fontSize: 20,
  fontWeight: "700",
  color: "#111",
},

seeAll: {
  color: "#2E7DFF",
  fontWeight: "600",
  fontSize: 14,
},

orderCard: {
  backgroundColor: "#fff",
  borderRadius: 18,
  padding: 14,
  flexDirection: "row",
  marginBottom: 14,
  elevation: 4,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 10,
},

customerImage: {
  width: 58,
  height: 58,
  borderRadius: 29,
},

orderInfo: {
  flex: 1,
  marginLeft: 14,
},

orderTop: {
  flexDirection: "row",
  justifyContent: "space-between",
},

orderId: {
  fontSize: 15,
  fontWeight: "700",
  color: "#111",
},

customerName: {
  marginTop: 3,
  color: "#777",
  fontSize: 13,
},

orderPrice: {
  fontSize: 18,
  fontWeight: "700",
  color: "#16A34A",
},

orderBottom: {
  marginTop: 12,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

statusRow: {
  flexDirection: "row",
},

paymentBadge: {
  backgroundColor: "#EAF2FF",
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 15,
  marginRight: 8,
},

paymentText: {
  color: "#2E7DFF",
  fontWeight: "600",
  fontSize: 12,
},

deliveryBadge: {
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 15,
},

deliveryText: {
  fontWeight: "600",
  fontSize: 12,
},
stockSection:{
  paddingHorizontal:16,
  marginTop:22,
},

stockCard:{
  backgroundColor:"#fff",
  borderRadius:18,
  padding:14,
  marginBottom:16,
  flexDirection:"row",
  elevation:4,
  shadowColor:"#000",
  shadowOpacity:0.08,
  shadowRadius:10,
},

productImage:{
  width:85,
  height:85,
  borderRadius:14,
},

stockInfo:{
  flex:1,
  marginLeft:14,
  justifyContent:"space-between",
},

productTop:{
  flexDirection:"row",
  justifyContent:"space-between",
},

productName:{
  fontSize:16,
  fontWeight:"700",
  color:"#222",
},

productCategory:{
  marginTop:3,
  color:"#888",
  fontSize:13,
},

warningBadge:{
  flexDirection:"row",
  alignItems:"center",
  backgroundColor:"#FFF4E5",
  paddingHorizontal:10,
  paddingVertical:5,
  borderRadius:20,
},

warningText:{
  color:"#FF9800",
  marginLeft:4,
  fontWeight:"700",
  fontSize:12,
},

stockText:{
  marginTop:10,
  color:"#555",
  fontWeight:"600",
},

progressBackground:{
  height:7,
  backgroundColor:"#ECECEC",
  borderRadius:8,
  marginTop:8,
  overflow:"hidden",
},

progressFill:{
  height:7,
  backgroundColor:"#FF9800",
  borderRadius:8,
},

restockBtn:{
  marginTop:14,
  alignSelf:"flex-start",
  backgroundColor:"#2E7DFF",
  flexDirection:"row",
  alignItems:"center",
  paddingHorizontal:16,
  paddingVertical:9,
  borderRadius:25,
},

restockText:{
  color:"#fff",
  marginLeft:6,
  fontWeight:"700",
  fontSize:13,
},
topSellingSection:{
  paddingHorizontal:16,
  marginTop:24,
},

topCard:{
  backgroundColor:"#fff",
  borderRadius:18,
  padding:14,
  flexDirection:"row",
  alignItems:"center",
  marginBottom:16,
  elevation:4,
  shadowColor:"#000",
  shadowOpacity:0.08,
  shadowRadius:10,
},

rankBadge:{
  width:34,
  height:34,
  borderRadius:17,
  backgroundColor:"#FFD54F",
  justifyContent:"center",
  alignItems:"center",
  marginRight:10,
},

rankText:{
  fontWeight:"700",
  color:"#222",
},

topImage:{
  width:72,
  height:72,
  borderRadius:14,
},

topInfo:{
  flex:1,
  marginLeft:14,
},

topName:{
  fontSize:16,
  fontWeight:"700",
  color:"#222",
},

infoRow:{
  flexDirection:"row",
  alignItems:"center",
  marginTop:6,
},

infoText:{
  marginLeft:6,
  color:"#666",
  fontSize:13,
},

revenueText:{
  marginLeft:6,
  color:"#18A558",
  fontWeight:"700",
  fontSize:13,
},

ratingRow:{
  flexDirection:"row",
  alignItems:"center",
  marginTop:6,
},

ratingText:{
  marginLeft:5,
  fontWeight:"700",
  color:"#444",
},

progressBg:{
  marginTop:10,
  height:6,
  backgroundColor:"#ECECEC",
  borderRadius:6,
  overflow:"hidden",
},

progressBar:{
  height:6,
  borderRadius:6,
  backgroundColor:"#18A558",
},

viewBtn:{
  width:42,
  height:42,
  borderRadius:21,
  backgroundColor:"#2E7DFF",
  justifyContent:"center",
  alignItems:"center",
},
pendingSection:{
  paddingHorizontal:16,
  marginTop:24,
},

pendingGrid:{
  flexDirection:"row",
  justifyContent:"space-between",
  marginBottom:16,
},

pendingCard:{
  width:"48%",
  borderRadius:18,
  padding:16,
},

pendingIcon:{
  width:50,
  height:50,
  borderRadius:25,
  justifyContent:"center",
  alignItems:"center",
},

pendingCount:{
  marginTop:18,
  fontSize:26,
  fontWeight:"700",
  color:"#222",
},

pendingTitle:{
  marginTop:6,
  fontSize:14,
  color:"#555",
  fontWeight:"600",
},

pendingFooter:{
  marginTop:18,
  flexDirection:"row",
  justifyContent:"space-between",
  alignItems:"center",
},

pendingLink:{
  fontWeight:"700",
  color:"#222",
},
revenueSection:{
  paddingHorizontal:16,
  marginTop:24,
},

revenueCard:{
  backgroundColor:"#2E7DFF",
  borderRadius:22,
  padding:20,
},

revenueTop:{
  flexDirection:"row",
  justifyContent:"space-between",
  alignItems:"center",
},

revenueLabel:{
  color:"#E6EEFF",
  fontSize:14,
},

revenueAmount:{
  color:"#fff",
  fontSize:30,
  fontWeight:"700",
  marginTop:6,
},

revenueIcon:{
  width:58,
  height:58,
  borderRadius:29,
  backgroundColor:"rgba(255,255,255,0.18)",
  justifyContent:"center",
  alignItems:"center",
},

analyticsBox:{
  marginTop:22,
},

analyticsBar:{
  height:8,
  backgroundColor:"rgba(255,255,255,0.25)",
  borderRadius:8,
  overflow:"hidden",
},

analyticsFill:{
  height:8,
  backgroundColor:"#fff",
  borderRadius:8,
},

analyticsRow:{
  marginTop:8,
  flexDirection:"row",
  justifyContent:"space-between",
},

analyticsLeft:{
  color:"#fff",
  opacity:0.85,
},

analyticsRight:{
  color:"#fff",
  fontWeight:"700",
},

walletRow:{
  flexDirection:"row",
  justifyContent:"space-between",
  marginTop:18,
},

walletCard:{
  width:"48%",
  backgroundColor:"#fff",
  borderRadius:18,
  padding:18,
  alignItems:"center",
  elevation:4,
  shadowColor:"#000",
  shadowOpacity:0.08,
  shadowRadius:10,
},

walletTitle:{
  marginTop:10,
  color:"#666",
  fontSize:13,
},

walletValue:{
  marginTop:8,
  fontSize:22,
  fontWeight:"700",
  color:"#222",
},

withdrawButton:{
  marginTop:20,
  backgroundColor:"#16A34A",
  borderRadius:16,
  height:56,
  justifyContent:"center",
  alignItems:"center",
  flexDirection:"row",
},

withdrawText:{
  color:"#fff",
  fontSize:16,
  fontWeight:"700",
  marginLeft:10,
},
customerSection:{
  paddingHorizontal:16,
  marginTop:24,
},

customerGrid:{
  flexDirection:"row",
  justifyContent:"space-between",
  marginTop:16,
},

customerCard:{
  width:"48%",
  backgroundColor:"#fff",
  borderRadius:18,
  padding:18,
  alignItems:"center",
  elevation:4,
  shadowColor:"#000",
  shadowOpacity:0.08,
  shadowRadius:10,
},

customerCount:{
  fontSize:24,
  fontWeight:"700",
  color:"#222",
  marginTop:12,
},

customerLabel:{
  marginTop:6,
  fontSize:13,
  color:"#666",
  textAlign:"center",
},
performanceSection:{
  paddingHorizontal:16,
  marginTop:24,
},

performanceCard:{
  backgroundColor:"#fff",
  borderRadius:22,
  padding:20,
  elevation:5,
  shadowColor:"#000",
  shadowOpacity:0.08,
  shadowRadius:10,
},

performanceTop:{
  flexDirection:"row",
  justifyContent:"space-between",
  alignItems:"center",
},

performanceTitle:{
  fontSize:14,
  color:"#666",
},

healthScore:{
  fontSize:34,
  fontWeight:"700",
  color:"#16A34A",
  marginTop:5,
},

healthBadge:{
  width:60,
  height:60,
  borderRadius:30,
  backgroundColor:"#ECFDF3",
  justifyContent:"center",
  alignItems:"center",
},

progressContainer:{
  marginTop:18,
},

progressTrack:{
  height:10,
  backgroundColor:"#ECECEC",
  borderRadius:10,
  overflow:"hidden",
},

progressValue:{
  height:10,
  backgroundColor:"#16A34A",
},

performanceRow:{
  flexDirection:"row",
  justifyContent:"space-between",
  marginTop:24,
},

performanceItem:{
  alignItems:"center",
  flex:1,
},

performanceValue:{
  marginTop:8,
  fontSize:20,
  fontWeight:"700",
  color:"#222",
},

performanceLabel:{
  marginTop:4,
  color:"#777",
  fontSize:12,
},
quickActionSection:{
  marginTop:25,
  paddingHorizontal:16,
},

quickGrid:{
  flexDirection:"row",
  flexWrap:"wrap",
  justifyContent:"space-between",
  marginTop:15,
},

quickCard:{
  width:"48%",
  backgroundColor:"#fff",
  borderRadius:18,
  paddingVertical:20,
  alignItems:"center",
  marginBottom:15,
  elevation:4,
  shadowColor:"#000",
  shadowOpacity:0.08,
  shadowRadius:10,
},

quickIcon:{
  width:60,
  height:60,
  borderRadius:30,
  justifyContent:"center",
  alignItems:"center",
},

quickTitle:{
  marginTop:12,
  fontSize:14,
  fontWeight:"700",
  color:"#222",
},

bottomNav:{
  marginTop:30,
  backgroundColor:"#fff",
  borderTopLeftRadius:24,
  borderTopRightRadius:24,
  paddingVertical:15,
  flexDirection:"row",
  justifyContent:"space-around",
  alignItems:"center",
  elevation:12,
},

navItem:{
  alignItems:"center",
},

navText:{
  marginTop:4,
  fontSize:12,
  color:"#777",
},

fab:{
  width:64,
  height:64,
  borderRadius:32,
  backgroundColor:"#2E7DFF",
  justifyContent:"center",
  alignItems:"center",
  marginTop:-35,
  elevation:10,
},
})
export default SellerDashboard;