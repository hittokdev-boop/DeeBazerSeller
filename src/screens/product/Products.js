import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  Platform,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl, Button,
  DeviceEventEmitter
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import {
  getSellerProducts,
  getApprovedProducts,
  deleteSellerProduct,
  updateSkuStock,
  clearAuthSession,
  sanitizeErrorMessage,
} from "../../api/auth";
import { CustomAlert } from "../../context/AlertContext";
import LoggedOutView from "../../components/common/LoggedOutView";


const normalizeImageUrl = (img) => {
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

const ProductImageThumbnail = ({ uri, hasDiscount, discountPct, isDark, textSecondary }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <View style={styles.imageContainer}>
      {uri && !imgError ? (
        <Image
          source={{ uri }}
          style={styles.productImage}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View
          style={[
            styles.productImage,
            styles.placeholderImage,
            { backgroundColor: isDark ? "#1e293b" : COLORS.backgroundAlt },
          ]}
        >
          <Ionicons name="image-outline" size={30} color={textSecondary || COLORS.textSecondary} />
        </View>
      )}
      {hasDiscount && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{discountPct}% OFF</Text>
        </View>
      )}
    </View>
  );
};

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Approved", value: "approved" },
  { label: "Pending", value: "pending" },
  { label: "Rejected", value: "rejected" },
];

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return "₹0";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
};

const getProductStatus = (item) => {
  if (!item) return "pending";
  const status = (item.status || "").toLowerCase();
  const approval = (item.approval_status || item.sku?.approval_status || "").toLowerCase();

  if (status === "approved" || approval === "approved") {
    return "approved";
  }
  if (status === "rejected" || approval === "rejected") {
    return "rejected";
  }
  if (status === "pending" || approval === "pending") {
    return "pending";
  }
  return status || approval || "pending";
};

const getStatusBadge = (itemOrStatus) => {
  const s = typeof itemOrStatus === "object" ? getProductStatus(itemOrStatus) : (itemOrStatus || "").toLowerCase();
  if (s === "approved" || s === "active") {
    return { bg: COLORS.successBgLight, text: COLORS.success, label: "Approved" };
  }
  if (s === "pending") {
    return { bg: COLORS.warningBgLight, text: COLORS.warning, label: "Pending Review" };
  }
  if (s === "rejected") {
    return { bg: COLORS.errorBgLight, text: COLORS.error, label: "Rejected" };
  }
  return { bg: COLORS.backgroundAlt, text: COLORS.textSecondary, label: s || "Draft" };
};

export const extractSkuId = (obj) => {
  if (!obj) return null;
  return (
    obj.product_sku_id ||
    obj.sku_id ||
    (typeof obj.sku === "object" && obj.sku ? obj.sku.id : null) ||
    (typeof obj.sku === "number" ? obj.sku : null) ||
    obj.id
  );
};

export const extractSkuCode = (obj) => {
  if (!obj) return "";
  if (typeof obj.sku === "object" && obj.sku) {
    return obj.sku.code || obj.sku.sku || obj.sku_code || "";
  }
  return obj.sku_code || (typeof obj.sku === "string" ? obj.sku : "") || obj.code || "";
};

export const extractSkuName = (obj) => {
  if (!obj) return "";
  if (typeof obj.sku === "object" && obj.sku) {
    return obj.sku.name || obj.sku.title || obj.sku_name || "";
  }
  return obj.sku_name || obj.title || (obj.product?.name !== obj.name ? obj.name : "");
};

export const groupProductsByMasterProduct = (rawProducts) => {
  if (!Array.isArray(rawProducts)) return [];
  const map = new Map();
  const result = [];

  rawProducts.forEach((item) => {
    if (!item) return;
    const masterId = item.product_id || item.product?.id;
    // Only group if there's a valid master product ID and item doesn't already have its own complete skus array
    if (masterId && (!Array.isArray(item.skus) || item.skus.length <= 1)) {
      if (map.has(masterId)) {
        const existing = map.get(masterId);
        if (!Array.isArray(existing.skus)) {
          const firstSku = {
            id: existing.id,
            seller_sku_id: existing.id,
            seller_product_id: existing.id,
            product_sku_id: extractSkuId(existing),
            sku_id: extractSkuId(existing),
            name: extractSkuName(existing) || existing.name,
            code: extractSkuCode(existing),
            sku: extractSkuCode(existing),
            image_url: existing.sku?.image_url || existing.image_url || existing.image,
            price: existing.price,
            sale_price: existing.sale_price,
            stock_quantity: Number(existing.stock_quantity ?? existing.stock ?? 0),
            in_stock: (existing.stock_quantity ?? existing.stock ?? 0) > 0,
            status: existing.status,
            approval_status: existing.sku?.approval_status || existing.approval_status || existing.status,
          };
          existing.skus = [firstSku];
        }
        const currentSku = {
          id: item.id,
          seller_sku_id: item.id,
          seller_product_id: item.id,
          product_sku_id: extractSkuId(item),
          sku_id: extractSkuId(item),
          name: extractSkuName(item) || item.name,
          code: extractSkuCode(item),
          sku: extractSkuCode(item),
          image_url: item.sku?.image_url || item.image_url || item.image,
          price: item.price,
          sale_price: item.sale_price,
          stock_quantity: Number(item.stock_quantity ?? item.stock ?? 0),
          in_stock: (item.stock_quantity ?? item.stock ?? 0) > 0,
          status: item.status,
          approval_status: item.sku?.approval_status || item.approval_status || item.status,
        };
        if (!existing.skus.some((s) => s.id === currentSku.id)) {
          existing.skus.push(currentSku);
        }
        existing.stock_quantity = existing.skus.reduce((sum, s) => sum + (Number(s.stock_quantity) || 0), 0);
        return;
      } else {
        const copy = { ...item };
        const firstSku = {
          id: copy.id,
          seller_sku_id: copy.id,
          seller_product_id: copy.id,
          product_sku_id: extractSkuId(copy),
          sku_id: extractSkuId(copy),
          name: extractSkuName(copy) || copy.name,
          code: extractSkuCode(copy),
          sku: extractSkuCode(copy),
          image_url: copy.sku?.image_url || copy.image_url || copy.image,
          price: copy.price,
          sale_price: copy.sale_price,
          stock_quantity: Number(copy.stock_quantity ?? copy.stock ?? 0),
          in_stock: (copy.stock_quantity ?? copy.stock ?? 0) > 0,
          status: copy.status,
          approval_status: copy.sku?.approval_status || copy.approval_status || copy.status,
        };
        copy.skus = [firstSku];
        map.set(masterId, copy);
        result.push(copy);
        return;
      }
    }
    result.push(item);
  });

  return result;
};

const Products = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, isDark } = useTheme();

  const [products, setProducts] = useState([]);
  const [adminApprovedProducts, setAdminApprovedProducts] = useState([]);
  const [isLoadingApproved, setIsLoadingApproved] = useState(false);
  const [counts, setCounts] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("none");
  const [showSortModal, setShowSortModal] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // Stock update modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockEditProduct, setStockEditProduct] = useState(null);
  const [stockInputValue, setStockInputValue] = useState("");
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  const searchDebounceTimer = useRef(null);

  // Fetch Admin Approved Master Products from GET api/seller/products/approved
  const fetchApprovedList = useCallback(async () => {
    try {
      setIsLoadingApproved(true);
      const res = await getApprovedProducts();
      const list = Array.isArray(res) ? res : res?.data || [];
      setAdminApprovedProducts(list);
    } catch (err) {
      console.warn("fetchApprovedList error:", err?.message);
    } finally {
      setIsLoadingApproved(false);
    }
  }, []);

  const fetchProductsList = useCallback(
    async (page = 1, isRefresh = false, searchTxt = searchQuery) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setFetchError(null);

      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          setIsLoggedIn(false);
          setProducts([]);
          setAdminApprovedProducts([]);
          setCounts({ total: 0, approved: 0, pending: 0, rejected: 0 });
          setFetchError(null);
          setIsLoading(false);
          setIsRefreshing(false);
          setIsLoadingMore(false);
          return;
        }

        setIsLoggedIn(true);

        const params = {
          page,
          per_page: 30,
          status: "all",
        };
        if (searchTxt && searchTxt.trim().length > 0) {
          params.search = searchTxt.trim();
        }

        const res = await getSellerProducts(params);
        if (res && res.data) {
          const fetchedProducts = res.data.products || [];
          if (page === 1) {
            setProducts(groupProductsByMasterProduct(fetchedProducts));
          } else {
            setProducts((prev) => groupProductsByMasterProduct([...prev, ...fetchedProducts]));
          }

          if (res.data.counts) {
            setCounts(res.data.counts);
          }
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      } catch (err) {
        const isAuth =
          err?.status === 401 ||
          (typeof err?.message === "string" && (
            err.message.toLowerCase().includes("unauthenticated") ||
            err.message.toLowerCase().includes("no authentication token")
          ));

        if (isAuth) {
          setIsLoggedIn(false);
          setProducts([]);
          setAdminApprovedProducts([]);
          setFetchError(null);
          await clearAuthSession();
          return;
        }

        console.error("Failed to fetch products:", err);
        setFetchError(sanitizeErrorMessage(err?.message, "Failed to load products"));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [searchQuery]
  );

  // Listen for auth events (login/logout)
  useEffect(() => {
    const authListener = DeviceEventEmitter.addListener("authStateChanged", (token) => {
      if (token) {
        setIsLoggedIn(true);
        fetchProductsList(1, false, searchQuery);
        fetchApprovedList();
      } else {
        setIsLoggedIn(false);
        setProducts([]);
        setAdminApprovedProducts([]);
        setFetchError(null);
      }
    });

    const logoutListener = DeviceEventEmitter.addListener("sellerLoggedOut", () => {
      setIsLoggedIn(false);
      setProducts([]);
      setAdminApprovedProducts([]);
      setFetchError(null);
    });

    return () => {
      authListener.remove();
      logoutListener.remove();
    };
  }, [fetchProductsList, fetchApprovedList, searchQuery]);

  // Automatically refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("token").then((token) => {
        if (!token) {
          setIsLoggedIn(false);
          setProducts([]);
          setAdminApprovedProducts([]);
          setFetchError(null);
          setIsLoading(false);
        } else {
          setIsLoggedIn(true);
          fetchProductsList(1, false, searchQuery);
          fetchApprovedList();
        }
      });
    }, [fetchProductsList, fetchApprovedList, searchQuery])
  );

  // Instantly prepend newly added product if passed from AddProductScreen
  useEffect(() => {
    if (route.params?.newlyAddedProduct) {
      const newProd = route.params.newlyAddedProduct;
      setProducts((prev) => {
        const exists = prev.some(
          (p) => (p.id && p.id === newProd.id) || (p.product_id && p.product_id === newProd.product_id)
        );
        if (exists) return prev;
        return groupProductsByMasterProduct([newProd, ...prev]);
      });
      fetchProductsList(1, true);
      fetchApprovedList();
    }
  }, [route.params?.timestamp]);

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }
    searchDebounceTimer.current = setTimeout(() => {
      fetchProductsList(1, false, text);
    }, 450);
  };

  const handleRefresh = () => {
    fetchProductsList(1, true, searchQuery);
    fetchApprovedList();
  };

  const handleLoadMore = () => {
    if (!isLoading && !isLoadingMore && pagination.current_page < pagination.last_page) {
      fetchProductsList(pagination.current_page + 1, false, searchQuery);
    }
  };

  const gotoAddProduct = () => {
    navigation.navigate("AddProduct");
  };


  const handleDelete = (id, name) => {
    CustomAlert.alert(
      "Confirm Delete",
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deleteSellerProduct(id);
              setProducts((prev) => prev.filter((p) => (p.product_id || p.id) !== id));
              CustomAlert.showSuccess("Deleted 🎉", res?.message || "Product deleted successfully.");
            } catch (err) {
              console.warn("Delete product blocked:", err?.message);
              CustomAlert.showError("Cannot Delete Product", err?.message || "Failed to delete product.");
            }
          },
        },
      ]
    );
  };

  const handleStockEdit = (product) => {
    if (Array.isArray(product.skus) && product.skus.length > 1) {
      const pId = product.id || product.product_id;
      navigation.navigate("ProductDetails", { product, productId: pId });
      return;
    }
    const id = product.id || product.product_id;
    const currentStock = product.stock_quantity ?? product.stock ?? 0;
    setStockEditProduct({ ...product, id });
    setStockInputValue(String(currentStock));
    setShowStockModal(true);
  };

  const handleStockUpdate = async () => {
    if (!stockEditProduct) return;
    const newQty = parseInt(stockInputValue, 10);
    if (isNaN(newQty) || newQty < 0) {
      CustomAlert.showWarning("Invalid Quantity", "Please enter a valid stock number (0 or more).");
      return;
    }

    const targetSkuId =
      stockEditProduct.product_sku_id ||
      stockEditProduct.sku_id ||
      stockEditProduct.skus?.[0]?.product_sku_id ||
      stockEditProduct.skus?.[0]?.sku_id ||
      stockEditProduct.skus?.[0]?.id ||
      stockEditProduct.sku?.id ||
      stockEditProduct.id;

    if (!targetSkuId) {
      CustomAlert.showWarning("Missing SKU ID", "Cannot update stock: SKU ID not found.");
      return;
    }

    setIsUpdatingStock(true);
    try {
      const targetId = stockEditProduct.id || stockEditProduct.product_id;
      const res = await updateSkuStock(targetSkuId, newQty);

      // Update locally
      setProducts((prev) =>
        prev.map((p) => {
          const pId = p.id || p.product_id;
          if (pId === targetId) {
            return {
              ...p,
              stock_quantity: res.data?.stock_quantity ?? newQty,
              in_stock: res.data?.in_stock ?? newQty > 0,
            };
          }
          return p;
        })
      );
      setShowStockModal(false);
      CustomAlert.showSuccess("Stock Updated 🎉", res?.message || `Stock updated to ${newQty} units.`);
    } catch (err) {
      console.warn("Stock update failed:", err?.message);
      CustomAlert.showError("Update Failed", err?.message || "Failed to update stock.");
    } finally {
      setIsUpdatingStock(false);
    }
  };

  // Sort products client-side for immediate responsive feel
  const sortedProducts = [...products].sort((a, b) => {
    const priceA = Number(a.effective_price ?? a.sale_price ?? a.price ?? 0);
    const priceB = Number(b.effective_price ?? b.sale_price ?? b.price ?? 0);
    const stockA = Number(a.stock_quantity ?? a.stock ?? 0);
    const stockB = Number(b.stock_quantity ?? b.stock ?? 0);

    if (sortOption === "price-asc") return priceA - priceB;
    if (sortOption === "price-desc") return priceB - priceA;
    if (sortOption === "stock-asc") return stockA - stockB;
    if (sortOption === "stock-desc") return stockB - stockA;
    return 0;
  });

  // Filter products client-side for consistent tab presentation
  const displayedProducts = sortedProducts.filter((item) => {
    if (selectedStatus === "all") return true;
    const itemStatus = getProductStatus(item);
    return itemStatus === selectedStatus;
  });

  const filteredAdminApproved = useMemo(() => {
    if (!searchQuery.trim()) return adminApprovedProducts;
    const q = searchQuery.toLowerCase().trim();
    return adminApprovedProducts.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const cat = (typeof item.category === "object" ? item.category?.name : item.category || "").toLowerCase();
      return name.includes(q) || cat.includes(q) || String(item.id).includes(q);
    });
  }, [adminApprovedProducts, searchQuery]);

  const displayCounts = {
    total: Math.max(counts.total || 0, products.length),
    approved: products.length > 0 ? products.filter((p) => getProductStatus(p) === "approved").length : counts.approved || 0,
    pending: products.length > 0 ? products.filter((p) => getProductStatus(p) === "pending").length : counts.pending || 0,
    rejected: products.length > 0 ? products.filter((p) => getProductStatus(p) === "rejected").length : counts.rejected || 0,
    admin_approved: adminApprovedProducts.length,
  };

  const renderProductItem = ({ item }) => {
    const badge = getStatusBadge(item);
    const skusList = Array.isArray(item.skus) ? item.skus : [];
    const variantsCount = skusList.length;

    const categoryName =
      (typeof item.product?.category === "object"
        ? (item.product?.category?.name || item.product?.category?.title)
        : item.product?.category) ||
      (typeof item.category === "object"
        ? (item.category?.name || item.category?.code)
        : item.category) ||
      "General";

    const parentProductName =
      item.product?.name ||
      (typeof item.name === "object" ? (item.name?.name || item.name?.title) : item.name) ||
      "Product";

    const productName = parentProductName;
    const productId = item.id || item.product_id || item.product?.id;

    const rawImage =
      item.image_url ||
      item.image ||
      item.product?.image_url ||
      item.product?.image ||
      (Array.isArray(item.images) ? item.images[0] : item.images) ||
      item.thumbnail ||
      (variantsCount > 0 && (skusList[0]?.image_url || skusList[0]?.image)) ||
      item.sku?.image_url ||
      item.sku?.image;

    const imageUri = normalizeImageUrl(rawImage);

    return (
      <TouchableOpacity
        key={String(productId)}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("ProductDetails", { product: item, productId })}
        style={[styles.productCard, { backgroundColor: colors.cardBg }]}
      >
        {/* Product Thumbnail */}
        <ProductImageThumbnail
          uri={imageUri}
          hasDiscount={false}
          discountPct={0}
          isDark={isDark}
          textSecondary={colors.textSecondary}
        />

        {/* Product Details */}
        <View style={styles.productInfo}>
          {/* Status Badge & Variant Count */}
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                {badge.label.toUpperCase()}
              </Text>
            </View>

            {variantsCount > 1 && (
              <View style={[styles.variantBadge, { backgroundColor: isDark ? "#1e293b" : "#EEF2FF" }]}>
                <Ionicons name="layers-outline" size={11} color={COLORS.primary} style={{ marginRight: 3 }} />
                <Text style={[styles.variantBadgeText, { color: COLORS.primary }]}>
                  {variantsCount} Variants
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={2}>
            {productName}
          </Text>
          <Text style={[styles.category, { color: colors.textSecondary }]}>{categoryName}</Text>

          {/* Rejection notice if any */}
          {item.rejection_reason && (
            <View style={styles.rejectionNotice}>
              <Ionicons name="information-circle-outline" size={13} color={COLORS.error} />
              <Text style={styles.rejectionReasonText} numberOfLines={1}>
                {item.rejection_reason}
              </Text>
            </View>
          )}

          {/* Ratings & Sales count if any */}
          {(item.rating_average || item.sales_count > 0) && (
            <View style={styles.bottomRow}>
              {item.rating_average ? (
                <View style={styles.ratingBox}>
                  <Ionicons name="star" size={12} color={COLORS.warning} />
                  <Text style={styles.rating}>{Number(item.rating_average).toFixed(1)}</Text>
                </View>
              ) : null}

              {item.sales_count > 0 && (
                <Text style={[styles.salesCount, { color: colors.textSecondary }]}>
                  {item.sales_count} sold
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Right Navigation Arrow */}
        <View style={styles.cardRightArrow}>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderAdminApprovedItem = ({ item }) => {
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
      <View style={[styles.productCard, { backgroundColor: colors.cardBg }]}>
        {/* Product Thumbnail */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.productImage,
                styles.placeholderImage,
                { backgroundColor: isDark ? "#1e293b" : COLORS.backgroundAlt },
              ]}
            >
              <Ionicons name="cube-outline" size={32} color={colors.textSecondary} />
            </View>
          )}
        </View>

        {/* Product Details */}
        <View style={styles.productInfo}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: COLORS.successBgLight }]}>
              <Text style={[styles.statusBadgeText, { color: COLORS.success }]}>
                ADMIN APPROVED
              </Text>
            </View>
            <Text style={[styles.skuText, { color: colors.textSecondary }]}>
              ID: #{item.id}
            </Text>
          </View>

          <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.name || "Approved Product"}
          </Text>
          <Text style={[styles.category, { color: colors.textSecondary }]}>{catName}</Text>

          <View style={styles.approvedNoticeRow}>
            <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
            <Text style={[styles.approvedNoticeText, { color: COLORS.success }]}>
              Approved by admin • Ready to sell
            </Text>
          </View>
        </View>

        {/* Action Button: Add SKU */}
        <View style={styles.adminActionCol}>
          <TouchableOpacity
            style={styles.addSkuActionBtn}
            onPress={() =>
              navigation.navigate("AddSku", {
                initialTab: "new_variant",
                preselectedProduct: item,
              })
            }
          >
            <Ionicons name="flash" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addSkuActionBtnText}>Add SKU</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!isLoggedIn) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top Header */}
        <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.borderLight }]}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>My Products</Text>
            <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
              Product Catalog Management
            </Text>
          </View>
        </View>

        <LoggedOutView
          iconName="cube-outline"
          title="You Are Logged Out"
          subtitle="Please log in to view and manage all products in your store."
          features={[
            "View full product catalog & approval status",
            "Easily add new products & upload photos",
            "Track inventory & update live stock levels",
          ]}
          onLoginPress={() => navigation.navigate("Login")}
          onRegisterPress={() => navigation.navigate("SellerRegistration")}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.borderLight }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>My Products</Text>
          <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
            Total: {counts.total || pagination.total || products.length} items
          </Text>
        </View>
        <View style={styles.headerRightActions}>
          <View style={styles.verticalBtnCol}>
            <TouchableOpacity
              style={[
                styles.adminApprovedHeaderBtn,
                { backgroundColor: isDark ? "#1e293b" : "#EFF6FF", borderColor: isDark ? "#334155" : COLORS.primaryLight },
              ]}
              onPress={() => navigation.navigate("AdminApprovedProducts")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="shield-checkmark"
                size={12}
                color={COLORS.primary}
                style={{ marginRight: 3 }}
              />
              <Text
                style={[
                  styles.adminApprovedHeaderBtnText,
                  { color: COLORS.primary },
                ]}
              >
                Admin Approved
              </Text>
              {adminApprovedProducts.length > 0 && (
                <View
                  style={[
                    styles.adminApprovedBadge,
                    {
                      backgroundColor: isDark
                        ? "rgba(59, 130, 246, 0.2)"
                        : "#DBEAFE",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.adminApprovedBadgeText,
                      {
                        color: COLORS.primary,
                      },
                    ]}
                  >
                    {adminApprovedProducts.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.skuCatalogBtn,
                { backgroundColor: isDark ? "#1e293b" : "#EFF6FF", borderColor: isDark ? "#334155" : COLORS.primaryLight },
              ]}
              onPress={() => navigation.navigate("AddSku")}
              activeOpacity={0.8}
            >
              <Ionicons name="flash" size={12} color={COLORS.primary} style={{ marginRight: 3 }} />
              <Text style={[styles.skuCatalogBtnText, { color: COLORS.primary }]}>Map SKU</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={gotoAddProduct} activeOpacity={0.85}>
            <Ionicons name="add" size={24} color={COLORS.textContrast} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search & Sort Controls */}
      <View style={styles.searchSection}>
        <View style={[styles.searchContainer, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            placeholder="Search by name or SKU..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => handleSearchChange("")}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowSortModal(true)} style={styles.filterBtn}>
            <Ionicons
              name="options-outline"
              size={20}
              color={sortOption !== "none" ? COLORS.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Filter Chips with Count Badges */}
      <View style={styles.chipRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScrollContent}>
          {STATUS_OPTIONS.map((opt) => {
            const isSelected = selectedStatus === opt.value;
            let countNumber = displayCounts.total;
            if (opt.value === "approved") countNumber = displayCounts.approved;
            if (opt.value === "pending") countNumber = displayCounts.pending;
            if (opt.value === "rejected") countNumber = displayCounts.rejected;

            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setSelectedStatus(opt.value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? COLORS.primary : colors.cardBg,
                    borderColor: isSelected ? COLORS.primary : colors.borderLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? COLORS.textContrast : colors.textSecondary,
                      fontWeight: isSelected ? "700" : "600",
                    },
                  ]}
                >
                  {opt.label}
                </Text>
                {countNumber !== undefined && (
                  <View
                    style={[
                      styles.chipBadge,
                      {
                        backgroundColor: isSelected ? "rgba(255, 255, 255, 0.3)" : colors.backgroundAlt,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipBadgeText,
                        { color: isSelected ? COLORS.textContrast : colors.textSecondary },
                      ]}
                    >
                      {countNumber}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>



      {/* Products List / Loading */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading products...
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedProducts}
          keyExtractor={(item, index) =>
            String(item.id || item.product_id || item.product_sku_id || index)
          }
          renderItem={renderProductItem}
          contentContainerStyle={styles.listScrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={54} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No products found
              </Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={gotoAddProduct}>
                <Text style={styles.emptyAddBtnText}>
                  + Add First Product
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Sort Options Bottom Sheet Modal */}
      <Modal visible={showSortModal} transparent animationType="slide" onRequestClose={() => setShowSortModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowSortModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Sort Products</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalListPadding}>
              {[
                { label: "Default (Latest)", value: "none" },
                { label: "Price: Low to High", value: "price-asc" },
                { label: "Price: High to Low", value: "price-desc" },
                { label: "Stock: Low to High", value: "stock-asc" },
                { label: "Stock: High to Low", value: "stock-desc" },
              ].map((option) => {
                const isSelected = sortOption === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.sortItem, { borderBottomColor: colors.borderLight }]}
                    onPress={() => {
                      setSortOption(option.value);
                      setShowSortModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.sortItemText,
                        {
                          color: isSelected ? COLORS.primary : colors.textPrimary,
                          fontWeight: isSelected ? "700" : "500",
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Stock Update Modal */}
      <Modal visible={showStockModal} transparent animationType="fade" onRequestClose={() => setShowStockModal(false)}>
        <View style={styles.stockModalOverlay}>
          <TouchableOpacity style={styles.modalDismissArea} activeOpacity={1} onPress={() => setShowStockModal(false)} />
          <View style={[styles.stockModalCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.stockModalIconRing}>
              <Ionicons name="layers" size={28} color={COLORS.warning} />
            </View>

            <Text style={[styles.stockModalTitle, { color: colors.textPrimary }]}>Update Stock</Text>
            <Text style={[styles.stockModalSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {stockEditProduct?.name || "Product"}
            </Text>

            <TextInput
              style={[styles.stockInput, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
              value={stockInputValue}
              onChangeText={setStockInputValue}
              keyboardType="numeric"
              placeholder="Enter new stock quantity"
              placeholderTextColor={colors.textSecondary}
              autoFocus
              selectTextOnFocus
            />

            <View style={styles.stockBtnRow}>
              <TouchableOpacity
                style={[styles.stockCancelBtn, { borderColor: colors.borderLight }]}
                onPress={() => setShowStockModal(false)}
              >
                <Text style={[styles.stockCancelText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.stockSaveBtn, isUpdatingStock && { opacity: 0.6 }]}
                onPress={handleStockUpdate}
                disabled={isUpdatingStock}
              >
                {isUpdatingStock ? (
                  <ActivityIndicator color={COLORS.textContrast} size="small" />
                ) : (
                  <Text style={styles.stockSaveText}>Update Stock</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Products;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerLeft: {
    flexShrink: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  subTitle: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  verticalBtnCol: {
    flexDirection: "column",
    gap: 4,
    marginRight: 8,
  },
  adminApprovedHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  adminApprovedHeaderBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  adminApprovedBadge: {
    marginLeft: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  adminApprovedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  skuCatalogBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  skuCatalogBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  addBtn: {
    width: 38,
    height: 52,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  searchSection: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  searchContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  filterBtn: {
    paddingLeft: 6,
  },
  chipRow: {
    height: 40,
    marginTop: 10,
    marginBottom: 6,
  },
  chipScrollContent: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  chipBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundAlt,
  },
  chipBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.errorBgLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.error,
    marginLeft: 6,
  },
  retryText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  listScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 90,
  },
  productCard: {
    marginBottom: 12,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  imageContainer: {
    position: "relative",
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundAlt,
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
  },
  discountBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: COLORS.error,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: COLORS.textContrast,
    fontSize: 9,
    fontWeight: "800",
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  skuText: {
    fontSize: 10,
    fontWeight: "500",
  },
  variantBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  variantBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  variantsMiniList: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 5,
  },
  variantChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    maxWidth: 100,
  },
  variantChipText: {
    fontSize: 10,
    fontWeight: "600",
  },
  variantMoreText: {
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 2,
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  category: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: "line-through",
    marginLeft: 6,
    color: COLORS.textSecondary,
  },
  bottomRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  stockBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  inStockBg: {
    backgroundColor: COLORS.successBgLight,
  },
  outOfStockBg: {
    backgroundColor: COLORS.errorBgLight,
  },
  lowStockBg: {
    backgroundColor: COLORS.warningBgLight,
  },
  stockText: {
    fontWeight: "700",
    fontSize: 11,
    marginLeft: 3,
  },
  inStockText: {
    color: COLORS.success,
  },
  outOfStockText: {
    color: COLORS.error,
  },
  lowStockText: {
    color: COLORS.warning,
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.warningBgLight,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  rating: {
    marginLeft: 3,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.warning,
  },
  salesCount: {
    fontSize: 11,
    fontWeight: "500",
  },
  rejectionNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.errorBgLight,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 5,
  },
  rejectionReasonText: {
    color: COLORS.error,
    fontSize: 10,
    marginLeft: 4,
    fontWeight: "500",
  },
  cardRightArrow: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 6,
    paddingRight: 4,
  },
  actionsColumn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  stockBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.warningBgLight,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.errorBgLight,
    justifyContent: "center",
    alignItems: "center",
  },
  footerLoader: {
    paddingVertical: 14,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  emptyAddBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    color: COLORS.textContrast,
    fontWeight: "700",
    fontSize: 13,
  },
  emptySubText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  approvedNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  approvedNoticeText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  adminActionCol: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 4,
  },
  addSkuActionBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  addSkuActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  modalDismissArea: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.cardBg,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  modalListPadding: {
    paddingBottom: 30,
  },
  sortItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sortItemText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  stockBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  stockModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  stockModalCard: {
    width: "100%",
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 22,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  stockModalIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.warningBgLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  stockModalTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  stockModalSubtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  stockInput: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 18,
  },
  stockBtnRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },
  stockCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  stockCancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  stockSaveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.warning,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  stockSaveText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textContrast,
  },
});