import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

const Earnings = () => {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F5F7FB" , paddingTop: 15 }}
      contentContainerStyle={{ paddingBottom: 100 }}>

      {/* Header */}

      <View style={styles.header}>

        <View>
          <Text style={styles.title}>
            Earnings
          </Text>

          <Text style={styles.subTitle}>
            Wallet & Revenue Overview
          </Text>
        </View>

        <TouchableOpacity style={styles.walletIcon}>
          <Ionicons
            name="wallet-outline"
            size={26}
            color="#fff"
          />
        </TouchableOpacity>

      </View>

      {/* Main Card */}

      <View style={styles.earningCard}>

        <Text style={styles.earningLabel}>
          Total Earnings
        </Text>

        <Text style={styles.earningAmount}>
          ₹12,48,560
        </Text>

        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              { width: "82%" },
            ]}
          />
        </View>

        <Text style={styles.growth}>
          +18.4% This Month
        </Text>

      </View>

      {/* Wallet Cards */}

      <View style={styles.cardRow}>

        <View style={styles.smallCard}>

          <Ionicons
            name="card-outline"
            size={28}
            color="#16A34A"
          />

          <Text style={styles.cardTitle}>
            Wallet
          </Text>

          <Text style={styles.cardValue}>
            ₹84,320
          </Text>

        </View>

        <View style={styles.smallCard}>

          <Ionicons
            name="cash-outline"
            size={28}
            color="#FF9800"
          />

          <Text style={styles.cardTitle}>
            Withdrawable
          </Text>

          <Text style={styles.cardValue}>
            ₹63,950
          </Text>

        </View>

      </View>

      {/* Withdraw */}

      <TouchableOpacity style={styles.withdrawBtn}>

        <Ionicons
          name="arrow-down-circle-outline"
          color="#fff"
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

        {[1,2,3,4].map((item,index)=>(

          <TouchableOpacity
            key={index}
            style={styles.transactionCard}>

            <View style={styles.transactionIcon}>
              <Ionicons
                name="cash"
                color="#16A34A"
                size={22}
              />
            </View>

            <View style={{flex:1,marginLeft:12}}>

              <Text style={styles.transactionTitle}>
                Order Payment
              </Text>

              <Text style={styles.transactionDate}>
                17 Jul 2026
              </Text>

            </View>

            <Text style={styles.transactionAmount}>
              + ₹{(index+1)*1250}
            </Text>

          </TouchableOpacity>

        ))}

      </View>

    </ScrollView>
  );
};

export default Earnings;
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
    fontSize: 28,
    fontWeight: "700",
    color: "#222",
  },

  subTitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#777",
  },

  walletIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#2E7DFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  earningCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#2E7DFF",
    borderRadius: 22,
    padding: 22,
    elevation: 6,
  },

  earningLabel: {
    color: "#E8F0FF",
    fontSize: 15,
  },

  earningAmount: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: "700",
    color: "#fff",
  },

  progressBg: {
    marginTop: 20,
    height: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },

  progressFill: {
    height: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
  },

  growth: {
    marginTop: 10,
    color: "#fff",
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
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 22,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  cardTitle: {
    marginTop: 10,
    color: "#666",
    fontSize: 13,
  },

  cardValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
  },

  withdrawBtn: {
    marginHorizontal: 16,
    marginTop: 22,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    elevation: 4,
  },

  withdrawText: {
    color: "#fff",
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
    color: "#222",
  },

  seeAll: {
    color: "#2E7DFF",
    fontWeight: "600",
  },

  transactionCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  transactionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EAF8EF",
    justifyContent: "center",
    alignItems: "center",
  },

  transactionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },

  transactionDate: {
    marginTop: 4,
    color: "#777",
    fontSize: 12,
  },

  transactionAmount: {
    fontSize: 17,
    fontWeight: "700",
    color: "#16A34A",
  },
});