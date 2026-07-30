import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,StyleSheet
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
const ProductDetails = () => {
   const navigation=useNavigation()
  
    const gotoProductEdit=()=>{
          navigation.navigate("EditProduct")
    }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F5F7FB" , paddingTop: 15 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}>

      {/* Header */}

      <View style={styles.header}>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}>

          <Ionicons
            name="arrow-back"
            size={22}
            color="#222"
          />

        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Product Details
        </Text>

        <TouchableOpacity style={styles.iconBtn}>

          <Ionicons
            name="ellipsis-vertical"
            size={22}
            color="#222"
          />

        </TouchableOpacity>

      </View>

      {/* Product Image */}

      <View style={styles.imageCard}>

        <Image
          source={{
            uri: "https://picsum.photos/700?random=25",
          }}
          style={styles.mainImage}
        />

        {/* Favorite */}

      
      </View>

      {/* Image Gallery */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.galleryContainer}>

        {[1, 2, 3, 4, 5].map((item) => (

          <TouchableOpacity
            key={item}
            activeOpacity={0.9}
            style={styles.galleryItem}>

            <Image
              source={{
                uri: `https://picsum.photos/200?random=${item}`,
              }}
              style={styles.galleryImage}
            />

          </TouchableOpacity>

        ))}

      </ScrollView>

      {/* Product Info */}

      <View style={styles.infoCard}>

        <View style={styles.topRow}>

          <View style={{ flex: 1 }}>

            <Text style={styles.productName}>
              Organic Honey Premium 500gm
            </Text>

            <Text style={styles.productSku}>
              SKU : DB-102548
            </Text>

          </View>

          <View style={styles.stockBadge}>

            <Ionicons
              name="checkmark-circle"
              size={16}
              color="#16A34A"
            />

            <Text style={styles.stockText}>
              In Stock
            </Text>

          </View>

        </View>

        <View style={styles.categoryRow}>

          <View style={styles.categoryBadge}>

            <Ionicons
              name="cube-outline"
              size={16}
              color="#2E7DFF"
            />

            <Text style={styles.categoryText}>
              Grocery
            </Text>

          </View>

          <View style={styles.categoryBadge}>

            <Ionicons
              name="pricetag-outline"
              size={16}
              color="#FF9800"
            />

            <Text style={styles.categoryText}>
              Organic
            </Text>

          </View>

        </View>

      </View>
      {/* Price Section */}

     {/* Price & Profit */}

<View style={styles.priceCard}>

  <View style={styles.priceHeader}>
    <Text style={styles.sectionTitle}>
      Pricing Details
    </Text>

    <View style={styles.activeBadge}>
      <Ionicons
        name="checkmark-circle"
        size={14}
        color="#16A34A"
      />
      <Text style={styles.activeText}>
        Active
      </Text>
    </View>
  </View>

  <View style={styles.priceGrid}>

    <View style={styles.priceBox}>
      <Text style={styles.priceLabel}>
        Selling Price
      </Text>

      <Text style={styles.priceValue}>
        ₹499
      </Text>
    </View>

    <View style={styles.priceBox}>
      <Text style={styles.priceLabel}>
        MRP
      </Text>

      <Text style={styles.priceValue}>
        ₹699
      </Text>
    </View>

  </View>

  <View style={styles.priceGrid}>

    <View style={styles.priceBox}>
      <Text style={styles.priceLabel}>
        Profit
      </Text>

      <Text
        style={[
          styles.priceValue,
          { color: "#16A34A" },
        ]}>
        ₹120
      </Text>
    </View>

    <View style={styles.priceBox}>
      <Text style={styles.priceLabel}>
        Margin
      </Text>

      <Text
        style={[
          styles.priceValue,
          { color: "#2563EB" },
        ]}>
        24%
      </Text>
    </View>

  </View>

</View>
      {/* Rating */}

{/* Product Performance */}

<View style={styles.performanceCard}>

  <View style={styles.performanceHeader}>
    <Text style={styles.sectionTitle}>
      Product Performance
    </Text>

    <View style={styles.liveBadge}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>Live</Text>
    </View>
  </View>

  <View style={styles.performanceRow}>

    <View style={styles.performanceItem}>
      <View style={[styles.performanceIcon, { backgroundColor: "#FFF8E6" }]}>
        <Ionicons
          name="star"
          size={22}
          color="#F59E0B"
        />
      </View>

      <Text style={styles.performanceValue}>
        4.9
      </Text>

      <Text style={styles.performanceLabel}>
        Customer Rating
      </Text>
    </View>

    <View style={styles.performanceItem}>
      <View style={[styles.performanceIcon, { backgroundColor: "#EAF2FF" }]}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={22}
          color="#2E7DFF"
        />
      </View>

      <Text style={styles.performanceValue}>
        326
      </Text>

      <Text style={styles.performanceLabel}>
        Total Reviews
      </Text>
    </View>

  </View>

  <View style={styles.performanceRow}>

    <View style={styles.performanceItem}>
      <View style={[styles.performanceIcon, { backgroundColor: "#EAFBF3" }]}>
        <Ionicons
          name="eye-outline"
          size={22}
          color="#16A34A"
        />
      </View>

      <Text style={styles.performanceValue}>
        12.4K
      </Text>

      <Text style={styles.performanceLabel}>
        Product Views
      </Text>
    </View>

    <View style={styles.performanceItem}>
      <View style={[styles.performanceIcon, { backgroundColor: "#F3EEFF" }]}>
        <Ionicons
          name="trending-up-outline"
          size={22}
          color="#7C3AED"
        />
      </View>

      <Text style={styles.performanceValue}>
        8.6%
      </Text>

      <Text style={styles.performanceLabel}>
        Conversion Rate
      </Text>
    </View>

  </View>

</View>

      {/* Inventory */}

  {/* Inventory Overview */}

<View style={styles.inventoryCard}>

  <View style={styles.inventoryHeader}>
    <Text style={styles.sectionTitle}>
      Inventory Overview
    </Text>

    <TouchableOpacity>
      <Text style={styles.manageText}>
        Manage
      </Text>
    </TouchableOpacity>
  </View>

  <View style={styles.inventoryGrid}>

    <View style={styles.inventoryBox}>
      <Ionicons
        name="cube"
        size={24}
        color="#16A34A"
      />
      <Text style={styles.inventoryValue}>
        156
      </Text>
      <Text style={styles.inventoryTitle}>
        Available
      </Text>
    </View>

    <View style={styles.inventoryBox}>
      <Ionicons
        name="time-outline"
        size={24}
        color="#F59E0B"
      />
      <Text style={styles.inventoryValue}>
        08
      </Text>
      <Text style={styles.inventoryTitle}>
        Reserved
      </Text>
    </View>

    <View style={styles.inventoryBox}>
      <Ionicons
        name="alert-circle"
        size={24}
        color="#EF4444"
      />
      <Text style={styles.inventoryValue}>
        12
      </Text>
      <Text style={styles.inventoryTitle}>
        Low Stock
      </Text>
    </View>

  </View>

  <View style={styles.stockProgressCard}>

    <View style={styles.stockRow}>
      <Text style={styles.stockLabel}>
        Stock Capacity
      </Text>

      <Text style={styles.stockPercent}>
        78%
      </Text>
    </View>

    <View style={styles.progressBackground}>
      <View style={styles.progressFill} />
    </View>

    <Text style={styles.stockInfo}>
      156 of 200 Units Available
    </Text>

  </View>

</View>

      {/* Description */}

      <View style={styles.descriptionCard}>

        <Text style={styles.sectionTitle}>
          Description
        </Text>

        <Text style={styles.descriptionText}>
          Organic Premium Honey collected from natural forest flowers.
          Rich in antioxidants, vitamins and minerals. No artificial
          colors, preservatives or added sugar. Perfect for daily use,
          tea, desserts and healthy recipes.
        </Text>

      </View>

      {/* Sales Statistics */}

      <View style={styles.statsCard}>

        <Text style={styles.sectionTitle}>
          Sales Statistics
        </Text>

        <View style={styles.statsRow}>

          <View style={styles.statsBox}>
            <Text style={styles.statsValue}>
              ₹2.8L
            </Text>
            <Text style={styles.statsLabel}>
              Revenue
            </Text>
          </View>

          <View style={styles.statsBox}>
            <Text style={styles.statsValue}>
              850
            </Text>
            <Text style={styles.statsLabel}>
              Units Sold
            </Text>
          </View>

          <View style={styles.statsBox}>
            <Text style={styles.statsValue}>
              97%
            </Text>
            <Text style={styles.statsLabel}>
              Satisfaction
            </Text>
          </View>

        </View>

      </View>

      {/* Brand */}

 
            {/* Specifications */}

      <View style={styles.specificationCard}>

        <Text style={styles.sectionTitle}>
          Specifications
        </Text>

        {[
          { title: "Weight", value: "500 gm" },
          { title: "Brand", value: "DeeBazar Organic" },
          { title: "Category", value: "Grocery" },
          { title: "Shelf Life", value: "12 Months" },
          { title: "Country", value: "India" },
          { title: "SKU", value: "DB-102548" },
        ].map((item, index) => (

          <View
            key={index}
            style={styles.specificationRow}>

            <Text style={styles.specificationTitle}>
              {item.title}
            </Text>

            <Text style={styles.specificationValue}>
              {item.value}
            </Text>

          </View>

        ))}

      </View>

      {/* Shipping Information */}

    

      {/* AI Product Studio */}

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.aiCard}>

        <View style={styles.aiLeft}>

          <View style={styles.aiIcon}>

            <Ionicons
              name="sparkles"
              size={28}
              color="#fff"
            />

          </View>

          <View style={{ flex: 1, marginLeft: 15 }}>

            <Text style={styles.aiTitle}>
              AI Product Studio
            </Text>

            <Text style={styles.aiSubtitle}>
              Remove Background • Enhance • HD Upscale • Studio Light
            </Text>

          </View>

        </View>

        <Ionicons
          name="chevron-forward"
          size={22}
          color="#fff"
        />

      </TouchableOpacity>

      {/* Action Buttons */}

      <View style={styles.actionRow}>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.editButton}  onPress={gotoProductEdit}>

          <Ionicons
            name="create-outline"
            size={22}
            color="#fff"
          />

          <Text style={styles.actionText}>
            Edit Product
          </Text>

        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.deleteButton}>

          <Ionicons
            name="trash-outline"
            size={22}
            color="#fff"
          />

          <Text style={styles.actionText}>
            Delete
          </Text>

        </TouchableOpacity>

      </View>

      {/* Bottom Buttons */}

      <View style={styles.bottomActionRow}>

       

        <TouchableOpacity
          style={styles.inventoryButton}>

          <Ionicons
            name="layers-outline"
            size={22}
            color="#fff"
          />

          <Text style={styles.inventoryButtonText}>
            Manage Inventory
          </Text>

        </TouchableOpacity>

      </View>
    </ScrollView>
  );
};


export default ProductDetails;

const styles = StyleSheet.create({
  header: {
    height: 70,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },

  imageCard: {
    margin: 16,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#fff",
    elevation: 4,
  },

  mainImage: {
    width: "100%",
    height: 320,
    resizeMode: "cover",
  },



  galleryContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  galleryItem: {
    marginRight: 12,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#EAEAEA",
  },

  galleryImage: {
    width: 75,
    height: 75,
  },

  infoCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    elevation: 3,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  productName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
  },

  productSku: {
    marginTop: 6,
    color: "#777",
    fontSize: 14,
  },

  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF8EF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  stockText: {
    marginLeft: 5,
    color: "#16A34A",
    fontWeight: "700",
    fontSize: 13,
  },

  categoryRow: {
    flexDirection: "row",
    marginTop: 18,
  },

  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F6FA",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },

  categoryText: {
    marginLeft: 6,
    fontWeight: "600",
    color: "#444",
  },

  priceCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    elevation: 3,
  },

 
priceHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 18,
},

activeBadge: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#EAFBF3",
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 20,
},

activeText: {
  marginLeft: 5,
  color: "#16A34A",
  fontWeight: "700",
  fontSize: 12,
},

priceGrid: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 12,
},

priceBox: {
  width: "48%",
  backgroundColor: "#F8FAFC",
  borderRadius: 16,
  paddingVertical: 18,
  alignItems: "center",
},

priceLabel: {
  fontSize: 13,
  color: "#6B7280",
},

priceValue: {
  marginTop: 8,
  fontSize: 24,
  fontWeight: "700",
  color: "#111827",
},


 performanceCard: {
  marginHorizontal: 16,
  marginTop: 15,
  backgroundColor: "#fff",
  borderRadius: 20,
  padding: 18,
  elevation: 3,
},

performanceHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 18,
},

liveBadge: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#EAFBF3",
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 20,
},

liveDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: "#16A34A",
},

liveText: {
  marginLeft: 6,
  color: "#16A34A",
  fontWeight: "700",
  fontSize: 12,
},

performanceRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 12,
},

performanceItem: {
  width: "48%",
  backgroundColor: "#F8FAFC",
  borderRadius: 16,
  alignItems: "center",
  paddingVertical: 18,
},

performanceIcon: {
  width: 48,
  height: 48,
  borderRadius: 24,
  justifyContent: "center",
  alignItems: "center",
},

performanceValue: {
  marginTop: 12,
  fontSize: 22,
  fontWeight: "700",
  color: "#111827",
},

performanceLabel: {
  marginTop: 5,
  fontSize: 13,
  color: "#6B7280",
  textAlign: "center",
},
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 15,
  },
inventoryHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 18,
},

manageText: {
  color: "#2563EB",
  fontWeight: "700",
},

inventoryGrid: {
  flexDirection: "row",
  justifyContent: "space-between",
},

inventoryBox: {
  width: "31%",
  backgroundColor: "#F8FAFC",
  borderRadius: 16,
  alignItems: "center",
  paddingVertical: 18,
},

inventoryValue: {
  marginTop: 10,
  fontSize: 22,
  fontWeight: "700",
  color: "#111827",
},

inventoryTitle: {
  marginTop: 6,
  fontSize: 12,
  color: "#6B7280",
},

stockProgressCard: {
  marginTop: 20,
  backgroundColor: "#F8FAFC",
  borderRadius: 16,
  padding: 16,
},

stockRow: {
  flexDirection: "row",
  justifyContent: "space-between",
},

stockLabel: {
  fontSize: 14,
  color: "#374151",
  fontWeight: "600",
},

stockPercent: {
  fontSize: 14,
  color: "#16A34A",
  fontWeight: "700",
},

progressBackground: {
  marginTop: 12,
  height: 10,
  backgroundColor: "#E5E7EB",
  borderRadius: 20,
  overflow: "hidden",
},

progressFill: {
  width: "78%",
  height: "100%",
  backgroundColor: "#16A34A",
  borderRadius: 20,
},

stockInfo: {
  marginTop: 10,
  color: "#6B7280",
  fontSize: 13,
},

  descriptionCard: {
    marginHorizontal: 16,
    marginTop: 15,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    elevation: 3,
  },

  descriptionText: {
    color: "#666",
    lineHeight: 24,
    fontSize: 15,
  },

  statsCard: {
    marginHorizontal: 16,
    marginTop: 15,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    elevation: 3,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  statsBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    marginHorizontal: 4,
    borderRadius: 14,
    paddingVertical: 16,
  },

  statsValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2E7DFF",
  },

  statsLabel: {
    marginTop: 5,
    fontSize: 13,
    color: "#777",
  },


  specificationCard: {
    marginHorizontal: 16,
    marginTop: 15,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    elevation: 3,
  },

  specificationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },

  specificationTitle: {
    color: "#777",
    fontSize: 14,
  },

  specificationValue: {
    fontWeight: "600",
    color: "#222",
    fontSize: 14,
  },



  aiCard: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 20,
    backgroundColor: "#6D28D9",
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 5,
  },

  aiLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  aiIcon: {
    width: 55,
    height: 55,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },

  aiTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  aiSubtitle: {
    marginTop: 5,
    color: "#E7DDFF",
    fontSize: 13,
    lineHeight: 20,
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 20,
  },

  editButton: {
    flex: 1,
    height: 55,
    borderRadius: 16,
    backgroundColor: "#2E7DFF",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginRight: 8,
  },

  deleteButton: {
    flex: 1,
    height: 55,
    borderRadius: 16,
    backgroundColor: "#E53935",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginLeft: 8,
  },

  actionText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 15,
  },

  bottomActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 40,
  },





  inventoryButton: {
    width: "68%",
    height: 55,
    borderRadius: 16,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  inventoryButtonText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 15,
  },
});