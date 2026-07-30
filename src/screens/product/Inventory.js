import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,StyleSheet
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const MOCK_INVENTORY = [
  { id: 1, name: "Organic Honey Premium", sku: "DBZ-001", stock: 120, image: "https://picsum.photos/200?random=31" },
  { id: 2, name: "Smart Bluetooth Speaker", sku: "DBZ-002", stock: 15, image: "https://picsum.photos/200?random=32" },
  { id: 3, name: "Cotton Casual T-Shirt", sku: "DBZ-003", stock: 4, image: "https://picsum.photos/200?random=33" },
  { id: 4, name: "Stainless Steel Water Bottle", sku: "DBZ-004", stock: 80, image: "https://picsum.photos/200?random=34" },
  { id: 5, name: "Matte Lipstick Cherry Red", sku: "DBZ-005", stock: 0, image: "https://picsum.photos/200?random=35" },
  { id: 6, name: "Yoga Mat Extra Thick", sku: "DBZ-006", stock: 8, image: "https://picsum.photos/200?random=36" },
  { id: 7, name: "Wooden Building Blocks", sku: "DBZ-007", stock: 25, image: "https://picsum.photos/200?random=37" },
  { id: 8, name: "Handmade Ceramic Mug", sku: "DBZ-008", stock: 0, image: "https://picsum.photos/200?random=38" },
];

const STOCK_FILTERS = ["All", "In Stock", "Low Stock", "Out Of Stock"];

import { Alert } from 'react-native';

const Inventory = ({navigation}) => {
  const [inventory, setInventory] = useState(MOCK_INVENTORY);
  const [search, setSearch] = useState('');
  const [selectedStockFilter, setSelectedStockFilter] = useState('All');

  // Filter items
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                         item.sku.toLowerCase().includes(search.toLowerCase());
    
    let matchesStock = true;
    if (selectedStockFilter === "In Stock") {
      matchesStock = item.stock > 20;
    } else if (selectedStockFilter === "Low Stock") {
      matchesStock = item.stock > 0 && item.stock <= 20;
    } else if (selectedStockFilter === "Out Of Stock") {
      matchesStock = item.stock === 0;
    }
    
    return matchesSearch && matchesStock;
  });

  // Calculate dynamic stats
  const totalCount = inventory.length;
  const inStockCount = inventory.filter(i => i.stock > 20).length;
  const lowStockCount = inventory.filter(i => i.stock > 0 && i.stock <= 20).length;
  const outOfStockCount = inventory.filter(i => i.stock === 0).length;

  const handleStockAdjust = (id, currentStock, name) => {
    Alert.alert(
      "Adjust Stock",
      `Manage stock for "${name}" (Current: ${currentStock})`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Set Out of Stock", 
          style: "destructive",
          onPress: () => {
            setInventory(prev => prev.map(item => item.id === id ? { ...item, stock: 0 } : item));
          }
        },
        { 
          text: "+10 Stock", 
          onPress: () => {
            setInventory(prev => prev.map(item => item.id === id ? { ...item, stock: item.stock + 10 } : item));
          }
        },
        { 
          text: "-10 Stock", 
          onPress: () => {
            setInventory(prev => prev.map(item => item.id === id ? { ...item, stock: Math.max(0, item.stock - 10) } : item));
          }
        }
      ]
    );
  };

  return (

    <ScrollView
      style={{ flex:1,backgroundColor:'#F6F7FB', paddingTop: 15 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{paddingBottom:100}}>

      {/* Header */}

      <View style={styles.header}>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={()=>navigation.goBack()}>

          <Ionicons
            name="arrow-back"
            size={22}
            color="#222"
          />

        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Inventory
        </Text>

        <TouchableOpacity style={styles.filterBtn}>

          <Ionicons
            name="options-outline"
            size={22}
            color="#2E7DFF"
          />

        </TouchableOpacity>

      </View>

      {/* Search */}

      <View style={styles.searchBox}>

        <Ionicons
          name="search-outline"
          size={22}
          color="#888"
        />

        <TextInput
          placeholder="Search Product..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />

      </View>

      {/* Stock Filter Chips */}
      <View style={{ height: 42, marginBottom: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {STOCK_FILTERS.map((filter) => {
            const isSelected = selectedStockFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setSelectedStockFilter(filter)}
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
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Summary Cards */}

      <View style={styles.summaryRow}>

        <View style={styles.summaryCard}>

          <Ionicons
            name="cube-outline"
            size={26}
            color="#2E7DFF"
          />

          <Text style={styles.summaryValue}>
            {totalCount}
          </Text>

          <Text style={styles.summaryLabel}>
            Total Products
          </Text>

        </View>

        <View style={styles.summaryCard}>

          <Ionicons
            name="checkmark-circle-outline"
            size={26}
            color="#16A34A"
          />

          <Text style={styles.summaryValue}>
            {inStockCount}
          </Text>

          <Text style={styles.summaryLabel}>
            In Stock
          </Text>

        </View>

      </View>

      <View style={styles.summaryRow}>

        <View style={styles.summaryCard}>

          <Ionicons
            name="warning-outline"
            size={26}
            color="#FF9800"
          />

          <Text style={styles.summaryValue}>
            {lowStockCount}
          </Text>

          <Text style={styles.summaryLabel}>
            Low Stock
          </Text>

        </View>

        <View style={styles.summaryCard}>

          <Ionicons
            name="close-circle-outline"
            size={26}
            color="#F44336"
          />

          <Text style={styles.summaryValue}>
            {outOfStockCount}
          </Text>

          <Text style={styles.summaryLabel}>
            Out Of Stock
          </Text>

        </View>

      </View>

      {/* Inventory List */}

      <View style={styles.sectionHeader}>

        <Text style={styles.sectionTitle}>
          Inventory List
        </Text>

        <TouchableOpacity>

          <Text style={styles.seeAll}>
            View All
          </Text>

        </TouchableOpacity>

      </View>

      {filteredInventory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No inventory items found</Text>
        </View>
      ) : (
        filteredInventory.map((item) => {
          return(

            <TouchableOpacity
              key={item.id}
              activeOpacity={0.9}
              onPress={() => handleStockAdjust(item.id, item.stock, item.name)}
              style={styles.productCard}>

              <Image
                source={{
                  uri: item.image
                }}
                style={styles.productImage}
              />

              <View style={styles.productInfo}>

                <Text style={styles.productName}>
                  {item.name}
                </Text>

                <Text style={styles.sku}>
                  SKU : {item.sku}
                </Text>

                <Text style={styles.stockText}>
                  Stock : {item.stock}
                </Text>

                <View style={styles.progressBg}>

                  <View
                    style={[
                      styles.progressFill,
                      {
                        width:`${Math.min(item.stock,100)}%`,
                        backgroundColor:
                          item.stock===0
                          ?"#F44336"
                          :item.stock<20
                          ?"#FF9800"
                          :"#16A34A"
                      }
                    ]}
                  />

                </View>

              </View>

              <TouchableOpacity 
                style={styles.moreBtn}
                onPress={() => handleStockAdjust(item.id, item.stock, item.name)}
              >

                <Ionicons
                  name="ellipsis-vertical"
                  size={20}
                  color="#666"
                />

              </TouchableOpacity>

            </TouchableOpacity>

          )

        })
      )}
{/* Inventory Analytics */}

<View style={styles.analyticsCard}>

  <View style={styles.sectionHeader}>

    <Text style={styles.sectionTitle}>
      Inventory Analytics
    </Text>

    <TouchableOpacity>
      <Text style={styles.seeAll}>
        Report
      </Text>
    </TouchableOpacity>

  </View>

  <View style={styles.analyticsRow}>

    <View style={styles.analyticsItem}>

      <Ionicons
        name="trending-up-outline"
        size={28}
        color="#16A34A"
      />

      <Text style={styles.analyticsValue}>
        +18%
      </Text>

      <Text style={styles.analyticsLabel}>
        Monthly Growth
      </Text>

    </View>

    <View style={styles.analyticsItem}>

      <Ionicons
        name="alert-circle-outline"
        size={28}
        color="#FF9800"
      />

      <Text style={styles.analyticsValue}>
        {lowStockCount}
      </Text>

      <Text style={styles.analyticsLabel}>
        Low Stock
      </Text>

    </View>

    <View style={styles.analyticsItem}>

      <Ionicons
        name="close-circle-outline"
        size={28}
        color="#F44336"
      />

      <Text style={styles.analyticsValue}>
        {outOfStockCount}
      </Text>

      <Text style={styles.analyticsLabel}>
        Out Of Stock
      </Text>

    </View>

  </View>

</View>

{/* Warehouse */}

<View style={styles.warehouseCard}>

  <View style={styles.sectionHeader}>

    <Text style={styles.sectionTitle}>
      Warehouse
    </Text>

    <TouchableOpacity>
      <Text style={styles.seeAll}>
        Manage
      </Text>
    </TouchableOpacity>

  </View>

  <View style={styles.warehouseRow}>

    <Ionicons
      name="business-outline"
      size={30}
      color="#2E7DFF"
    />

    <View style={{flex:1,marginLeft:15}}>

      <Text style={styles.warehouseName}>
        Main Warehouse
      </Text>

      <Text style={styles.warehouseSub}>
        {totalCount} Products Available
      </Text>

    </View>

    <Ionicons
      name="chevron-forward"
      size={22}
      color="#999"
    />

  </View>

</View>

{/* Inventory Alerts */}

<View style={styles.alertCard}>

  <View style={styles.sectionHeader}>

    <Text style={styles.sectionTitle}>
      Inventory Alerts
    </Text>

  </View>

  <View style={styles.alertItem}>

    <Ionicons
      name="warning"
      size={22}
      color="#FF9800"
    />

    <Text style={styles.alertText}>
      {lowStockCount} products are running low on stock.
    </Text>

  </View>

  <View style={styles.alertItem}>

    <Ionicons
      name="close-circle"
      size={22}
      color="#F44336"
    />

    <Text style={styles.alertText}>
      {outOfStockCount} products are out of stock.
    </Text>

  </View>

</View>

{/* Floating Button */}

<TouchableOpacity style={styles.fab}>

  <Ionicons
    name="add"
    size={34}
    color="#fff"
  />

</TouchableOpacity>
    </ScrollView>

  );

};

export default Inventory;



const styles = StyleSheet.create({

  header:{
    height:70,
    backgroundColor:"#fff",
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",
    paddingHorizontal:18,
    elevation:3,
  },

  backBtn:{
    width:42,
    height:42,
    borderRadius:12,
    backgroundColor:"#F5F6FA",
    justifyContent:"center",
    alignItems:"center",
  },

  headerTitle:{
    fontSize:21,
    fontWeight:"700",
    color:"#222",
  },

  filterBtn:{
    width:42,
    height:42,
    borderRadius:12,
    backgroundColor:"#EEF5FF",
    justifyContent:"center",
    alignItems:"center",
  },

  searchBox:{
    margin:16,
    backgroundColor:"#fff",
    height:56,
    borderRadius:16,
    flexDirection:"row",
    alignItems:"center",
    paddingHorizontal:15,
    elevation:2,
  },

  searchInput:{
    flex:1,
    marginLeft:10,
    fontSize:15,
    color:"#222",
  },

  summaryRow:{
    flexDirection:"row",
    justifyContent:"space-between",
    marginHorizontal:16,
    marginBottom:15,
  },

  summaryCard:{
    width:"48%",
    backgroundColor:"#fff",
    borderRadius:20,
    padding:18,
    elevation:3,
    alignItems:"center",
  },

  summaryValue:{
    fontSize:24,
    fontWeight:"700",
    color:"#222",
    marginTop:10,
  },

  summaryLabel:{
    marginTop:5,
    color:"#666",
    fontSize:14,
    textAlign:"center",
  },

  sectionHeader:{
    marginHorizontal:16,
    marginTop:10,
    marginBottom:15,
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",
  },

  sectionTitle:{
    fontSize:18,
    fontWeight:"700",
    color:"#222",
  },

  seeAll:{
    color:"#2E7DFF",
    fontWeight:"700",
  },

  productCard:{
    marginHorizontal:16,
    marginBottom:16,
    backgroundColor:"#fff",
    borderRadius:18,
    padding:14,
    flexDirection:"row",
    elevation:3,
  },

  productImage:{
    width:85,
    height:85,
    borderRadius:14,
  },

  productInfo:{
    flex:1,
    marginLeft:14,
  },

  productName:{
    fontSize:16,
    fontWeight:"700",
    color:"#222",
  },

  sku:{
    marginTop:5,
    color:"#888",
    fontSize:13,
  },

  stockText:{
    marginTop:8,
    color:"#333",
    fontWeight:"600",
  },

  progressBg:{
    marginTop:10,
    height:8,
    backgroundColor:"#ECECEC",
    borderRadius:8,
    overflow:"hidden",
  },

  progressFill:{
    height:"100%",
    borderRadius:8,
  },

  moreBtn:{
    justifyContent:"center",
    alignItems:"center",
    paddingHorizontal:5,
  },

  stockBadge:{
    alignSelf:"flex-start",
    marginTop:10,
    paddingHorizontal:10,
    paddingVertical:5,
    borderRadius:20,
  },

  stockBadgeText:{
    fontSize:12,
    fontWeight:"700",
  },

  actionRow:{
    flexDirection:"row",
    marginTop:14,
  },

  restockBtn:{
    flex:1,
    height:42,
    borderRadius:12,
    backgroundColor:"#16A34A",
    justifyContent:"center",
    alignItems:"center",
    flexDirection:"row",
    marginRight:8,
  },

  editBtn:{
    flex:1,
    height:42,
    borderRadius:12,
    backgroundColor:"#2E7DFF",
    justifyContent:"center",
    alignItems:"center",
    flexDirection:"row",
  },

  actionText:{
    color:"#fff",
    fontWeight:"700",
    marginLeft:6,
  },

  fab:{
    position:"absolute",
    right:20,
    bottom:25,
    width:60,
    height:60,
    borderRadius:30,
    backgroundColor:"#2E7DFF",
    justifyContent:"center",
    alignItems:"center",
    elevation:8,
  },
analyticsCard:{
  margin:16,
  backgroundColor:"#fff",
  borderRadius:20,
  padding:18,
  elevation:3,
},

analyticsRow:{
  flexDirection:"row",
  justifyContent:"space-between",
  marginTop:15,
},

analyticsItem:{
  width:"31%",
  alignItems:"center",
},

analyticsValue:{
  marginTop:10,
  fontSize:22,
  fontWeight:"700",
  color:"#222",
},

analyticsLabel:{
  marginTop:5,
  fontSize:13,
  color:"#777",
  textAlign:"center",
},

warehouseCard:{
  marginHorizontal:16,
  marginBottom:18,
  backgroundColor:"#fff",
  borderRadius:20,
  padding:18,
  elevation:3,
},

warehouseRow:{
  flexDirection:"row",
  alignItems:"center",
  marginTop:15,
},

warehouseName:{
  fontSize:17,
  fontWeight:"700",
  color:"#222",
},

warehouseSub:{
  marginTop:5,
  color:"#777",
},

alertCard:{
  marginHorizontal:16,
  marginBottom:30,
  backgroundColor:"#fff",
  borderRadius:20,
  padding:18,
  elevation:3,
},

alertItem:{
  flexDirection:"row",
  alignItems:"center",
  marginTop:15,
},

alertText:{
  flex:1,
  marginLeft:10,
  color:"#555",
  fontSize:14,
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
    backgroundColor: "#2E7DFF",
    borderColor: "#2E7DFF",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },
  chipTextActive: {
    color: "#fff",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
    marginBottom: 30,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: "#888",
  },
});