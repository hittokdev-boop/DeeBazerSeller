import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import COLORS from "../../constants/theme";

const MOCK_PRODUCTS = [
  { id: 1, name: "Organic Honey Premium", category: "Groceries & Gourmet", price: 690, stock: 120, rating: 4.8, image: "https://picsum.photos/300?random=1" },
  { id: 2, name: "Smart Bluetooth Speaker", category: "Electronics & Gadgets", price: 2499, stock: 15, rating: 4.5, image: "https://picsum.photos/300?random=2" },
  { id: 3, name: "Cotton Casual T-Shirt", category: "Fashion & Apparel", price: 499, stock: 45, rating: 4.2, image: "https://picsum.photos/300?random=3" },
  { id: 4, name: "Stainless Steel Water Bottle", category: "Home & Kitchen", price: 899, stock: 80, rating: 4.6, image: "https://picsum.photos/300?random=4" },
  { id: 5, name: "Matte Lipstick Cherry Red", category: "Health & Beauty", price: 590, stock: 0, rating: 4.0, image: "https://picsum.photos/300?random=5" },
  { id: 6, name: "Yoga Mat Extra Thick", category: "Sports & Outdoors", price: 1299, stock: 8, rating: 4.7, image: "https://picsum.photos/300?random=6" },
  { id: 7, name: "Wooden Building Blocks", category: "Toys & Games", price: 799, stock: 25, rating: 4.4, image: "https://picsum.photos/300?random=7" },
  { id: 8, name: "Handmade Ceramic Mug", category: "Handmade Crafts", price: 349, stock: 18, rating: 4.9, image: "https://picsum.photos/300?random=8" },
];

const CATEGORIES = [
  "All",
  "Electronics & Gadgets",
  "Fashion & Apparel",
  "Home & Kitchen",
  "Health & Beauty",
  "Groceries & Gourmet",
  "Sports & Outdoors",
  "Toys & Games",
  "Handmade Crafts",
];

const Products = () => {
  const navigation = useNavigation();
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("none"); // none, price-asc, price-desc, stock-asc, stock-desc
  const [showSortModal, setShowSortModal] = useState(false);

  const gotoAddProduct = () => {
    navigation.navigate("AddProduct");
  };

  const handleEdit = (product) => {
    navigation.navigate("EditProduct", { product });
  };

  const handleDelete = (id, name) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setProducts((prev) => prev.filter((p) => p.id !== id));
          },
        },
      ]
    );
  };

  // Filter & Sort Products
  const filteredProducts = products
    .filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortOption === "price-asc") return a.price - b.price;
      if (sortOption === "price-desc") return b.price - a.price;
      if (sortOption === "stock-asc") return a.stock - b.stock;
      if (sortOption === "stock-desc") return b.stock - a.stock;
      return 0;
    });

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: 15 }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Products</Text>
          <Text style={styles.subTitle}>
            Total Products : {products.length}
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={gotoAddProduct}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search & Sort Trigger */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#888" />
        <TextInput
          placeholder="Search Products..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        <TouchableOpacity onPress={() => setShowSortModal(true)}>
          <Ionicons
            name="options-outline"
            size={22}
            color={sortOption !== "none" ? COLORS.primary : "#444"}
          />
        </TouchableOpacity>
      </View>

      {/* Category Filter Chips */}
      <View style={{ height: 42, marginBottom: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                onPress={() => setSelectedCategory(category)}
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
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Products List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        ) : (
          filteredProducts.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("ProductDetails", { product: item })}
              style={styles.productCard}
            >
              <Image source={{ uri: item.image }} style={styles.productImage} />

              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.price}>₹ {item.price}</Text>

                <View style={styles.bottomRow}>
                  <View
                    style={[
                      styles.stockBox,
                      item.stock === 0 && { backgroundColor: "#FFECEC" },
                      item.stock < 10 && item.stock > 0 && { backgroundColor: "#FFF2E6" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stockText,
                        item.stock === 0 && { color: COLORS.error },
                        item.stock < 10 && item.stock > 0 && { color: "#FF9800" },
                      ]}
                    >
                      {item.stock === 0 ? "Out of Stock" : `Stock : ${item.stock}`}
                    </Text>
                  </View>

                  <View style={styles.ratingBox}>
                    <Ionicons name="star" size={14} color="#FFC107" />
                    <Text style={styles.rating}>{item.rating}</Text>
                  </View>
                </View>
              </View>

              <View>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => handleEdit(item)}
                >
                  <Ionicons name="create-outline" size={18} color="#2E7DFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item.id, item.name)}
                >
                  <Ionicons name="trash-outline" size={18} color="red" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Sort Options Bottom Sheet Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setShowSortModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort Products</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close-circle" size={24} color="#aaa" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingBottom: 30 }}>
              {[
                { label: "Default (None)", value: "none" },
                { label: "Price: Low to High", value: "price-asc" },
                { label: "Price: High to Low", value: "price-desc" },
                { label: "Stock: Low to High", value: "stock-asc" },
                { label: "Stock: High to Low", value: "stock-desc" },
              ].map((option) => {
                const isSelected = sortOption === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortItem,
                      isSelected && styles.sortItemActive,
                    ]}
                    onPress={() => {
                      setSortOption(option.value);
                      setShowSortModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.sortItemText,
                        isSelected && styles.sortItemTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={COLORS.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Products;

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 35,
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
    color: "#777",
    fontSize: 14,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#2E7DFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    height: 55,
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
  productCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  productImage: {
    width: 90,
    height: 90,
    borderRadius: 14,
    resizeMode: "cover",
  },
  productInfo: {
    flex: 1,
    marginLeft: 15,
  },
  productName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },
  category: {
    marginTop: 4,
    fontSize: 13,
    color: "#888",
  },
  price: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "700",
    color: "#16A34A",
  },
  bottomRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  stockBox: {
    backgroundColor: "#EEF7EE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  stockText: {
    color: "#16A34A",
    fontWeight: "600",
    fontSize: 12,
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    backgroundColor: "#FFF8E6",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  rating: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#444",
  },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EDF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FFECEC",
    justifyContent: "center",
    alignItems: "center",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },
  sortItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sortItemActive: {},
  sortItemText: {
    fontSize: 15,
    color: "#555",
    fontWeight: "500",
  },
  sortItemTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
});