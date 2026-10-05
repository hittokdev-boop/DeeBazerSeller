import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { getApprovedProducts } from "../../api/auth";

export const normalizeImageUrl = (img) => {
  if (!img) return null;
  let uri = null;
  if (typeof img === "string") {
    uri = img.replace(/\\/g, "").trim();
  } else if (typeof img === "object") {
    uri = img.image_url || img.url || img.path || img.src || img.uri || null;
    if (typeof uri !== "string") return null;
    uri = uri.replace(/\\/g, "").trim();
  }
  if (!uri) return null;

  if (
    uri.startsWith("http://") ||
    uri.startsWith("https://") ||
    uri.startsWith("data:") ||
    uri.startsWith("file:") ||
    uri.startsWith("blob:")
  ) {
    return uri;
  }

  if (uri.startsWith("/")) {
    return `https://deebazar.com${uri}`;
  }
  return `https://deebazar.com/${uri}`;
};

const AdminApprovedProducts = ({ navigation }) => {
  const { colors, isDark } = useTheme();

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchList = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await getApprovedProducts();
      const list = Array.isArray(res) ? res : res?.data || [];
      setProducts(list);
    } catch (err) {
      console.warn("Fetch admin approved error:", err?.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const cat = (typeof item.category === "object" ? item.category?.name : item.category || "").toLowerCase();
      return name.includes(q) || cat.includes(q) || String(item.id).includes(q);
    });
  }, [products, searchQuery]);

  const renderItem = ({ item }) => {
    const rawImage =
      item.image_url ||
      item.image ||
      (Array.isArray(item.images) ? item.images[0] : item.images) ||
      item.thumbnail;
    const imageUri = normalizeImageUrl(rawImage);
    const catName =
      (typeof item.category === "object" ? item.category?.name : item.category) ||
      "Master Product";

    return (
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.image,
                styles.placeholderImage,
                { backgroundColor: isDark ? "#1e293b" : COLORS.backgroundAlt },
              ]}
            >
              <Ionicons name="cube-outline" size={32} color={colors.textSecondary} />
            </View>
          )}
        </View>

        <View style={styles.infoCol}>
          <View style={styles.statusRow}>
            <View style={[styles.badge, { backgroundColor: COLORS.successBgLight }]}>
              <Text style={[styles.badgeText, { color: COLORS.success }]}>
                ADMIN APPROVED
              </Text>
            </View>
            <Text style={[styles.idText, { color: colors.textSecondary }]}>
              ID: #{item.id}
            </Text>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.name || "Approved Product"}
          </Text>
          <Text style={[styles.category, { color: colors.textSecondary }]}>{catName}</Text>

          <View style={styles.noticeRow}>
            <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
            <Text style={[styles.noticeText, { color: COLORS.success }]}>
              Approved by admin • Ready to sell
            </Text>
          </View>
        </View>

        <View style={styles.actionCol}>
          <TouchableOpacity
            style={styles.addSkuBtn}
            onPress={() =>
              navigation.navigate("AddSku", {
                initialTab: "new_variant",
                preselectedProduct: item,
              })
            }
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addSkuBtnText}>Add SKU</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Admin Approved</Text>
          <Text style={[styles.headerSubTitle, { color: colors.textSecondary }]}>
            Total: {products.length} master products available to sell
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.mapSkuHeaderBtn, { backgroundColor: isDark ? "#1e293b" : "#EFF6FF", borderColor: isDark ? "#334155" : COLORS.primaryLight }]}
          onPress={() => navigation.navigate("AddSku")}
          activeOpacity={0.8}
        >
          <Ionicons name="flash" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
          <Text style={[styles.mapSkuHeaderBtnText, { color: COLORS.primary }]}>Map SKU</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBox, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            placeholder="Search approved products by name or ID..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading admin-approved products...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchList(true)}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? "#1e293b" : "#EFF6FF" }]}>
                <Ionicons name="cube-outline" size={40} color={COLORS.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Approved Products Found
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                {searchQuery
                  ? "No master products match your search query."
                  : "There are currently no admin-approved products in the catalog."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default AdminApprovedProducts;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  headerSubTitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  mapSkuHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  mapSkuHeaderBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  searchSection: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
  },
  searchBox: {
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  imageContainer: {
    marginRight: 12,
  },
  image: {
    width: 68,
    height: 68,
    borderRadius: 10,
  },
  placeholderImage: {
    alignItems: "center",
    justifyContent: "center",
  },
  infoCol: {
    flex: 1,
    justifyContent: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  idText: {
    fontSize: 11,
    fontWeight: "600",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    marginBottom: 4,
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  noticeText: {
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
  },
  actionCol: {
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addSkuBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  addSkuBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 30,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
