import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { getSellerMe } from "../../api/auth";

const Earnings = () => {
  const { colors } = useTheme();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await getSellerMe();
      if (response && response.data) {
        const user = response.data.user || {};
        const seller = response.data.seller || {};
        
        const mergedProfile = {
          ...user,
          ...seller,
          walletBalance: seller.wallet_balance || 0,
          totalEarnings: seller.total_earnings || 0,
        };
        
        setProfile(mergedProfile);
      }
    } catch (err) {
      console.error("Error fetching profile for earnings:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const totalEarnings = profile?.totalEarnings || 0;
  const walletBalance = profile?.walletBalance || 0;
  // Withdraw-able can be assumed to be walletBalance for now
  const withdrawable = walletBalance;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.backgroundAlt }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textGrayDark }]}>
            Earnings
          </Text>
          <Text style={[styles.subTitle, { color: colors.textGrayLight }]}>
            Wallet & Revenue Overview
          </Text>
        </View>

        <TouchableOpacity style={styles.walletIcon}>
          <Ionicons
            name="wallet-outline"
            size={26}
            color={COLORS.textContrast}
          />
        </TouchableOpacity>
      </View>

      {/* Main Card */}
      <View style={styles.earningCard}>
        <Text style={styles.earningLabel}>
          Total Earnings
        </Text>

        <Text style={styles.earningAmount}>
          ₹{totalEarnings.toLocaleString()}
        </Text>

        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              styles.progress82,
            ]}
          />
        </View>

        <Text style={styles.growth}>
          Total Earnings Generated
        </Text>
      </View>

      {/* Wallet Cards */}
      <View style={styles.cardRow}>
        <View style={styles.smallCard}>
          <Ionicons
            name="card-outline"
            size={28}
            color={COLORS.success}
          />
          <Text style={styles.cardTitle}>
            Wallet
          </Text>
          <Text style={styles.cardValue}>
            ₹{walletBalance.toLocaleString()}
          </Text>
        </View>

        <View style={styles.smallCard}>
          <Ionicons
            name="cash-outline"
            size={28}
            color={COLORS.warning}
          />
          <Text style={styles.cardTitle}>
            Withdrawable
          </Text>
          <Text style={styles.cardValue}>
            ₹{withdrawable.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Withdraw */}
      <TouchableOpacity style={styles.withdrawBtn}>
        <Ionicons
          name="arrow-down-circle-outline"
          color={COLORS.textContrast}
          size={22}
        />
        <Text style={styles.withdrawText}>
          Withdraw Now
        </Text>
      </TouchableOpacity>

      {/* Recent Transactions */}
      <View style={styles.transactionSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Recent Transactions
          </Text>

          <TouchableOpacity>
            <Text style={styles.seeAll}>
              See All
            </Text>
          </TouchableOpacity>
        </View>

        {/* No Transactions found for now, since API doesn't provide them */}
        <View style={{ alignItems: "center", marginTop: 20 }}>
          <Text style={{ color: COLORS.textGrayLight, fontStyle: "italic" }}>
            No recent transactions found.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default Earnings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundAlt,
    paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0) + 15,
  },
  scrollContent: {
    paddingBottom: 100,
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
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textGrayDark,
  },
  subTitle: {
    marginTop: 4,
    fontSize: 14,
    color: COLORS.textGrayLight,
  },
  walletIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  earningCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    padding: 22,
    elevation: 6,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  earningLabel: {
    color: COLORS.primaryBgLight,
    fontSize: 15,
  },
  earningAmount: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: "700",
    color: COLORS.textContrast,
  },
  progressBg: {
    marginTop: 20,
    height: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 8,
    backgroundColor: COLORS.textContrast,
  },
  progress82: {
    width: "82%",
  },
  growth: {
    marginTop: 10,
    color: COLORS.textContrast,
    fontWeight: "600",
    fontSize: 14,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 20,
  },
  smallCard: {
    width: "48%",
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    paddingVertical: 22,
    alignItems: "center",
    elevation: 4,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardTitle: {
    marginTop: 10,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  cardValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textGrayDark,
  },
  withdrawBtn: {
    marginHorizontal: 16,
    marginTop: 22,
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.success,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    elevation: 4,
  },
  withdrawText: {
    color: COLORS.textContrast,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 10,
  },
  transactionSection: {
    marginTop: 28,
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
    color: COLORS.textGrayDark,
  },
  seeAll: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  transactionCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  transactionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.successBgLight,
    justifyContent: "center",
    alignItems: "center",
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textGrayDark,
  },
  transactionDate: {
    marginTop: 4,
    color: COLORS.textGrayLight,
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.success,
  },
});