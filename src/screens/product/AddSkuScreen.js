import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar,
  PermissionsAndroid,
  RefreshControl,
  KeyboardAvoidingView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { CustomAlert } from "../../context/AlertContext";
import {
  getUnmappedApprovedSkus,
  getApprovedProducts,
  addSellerSku,
} from "../../api/auth";

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return "₹0";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
};

const AddSkuScreen = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();

  // Active Tab: "map_sku" | "new_variant"
  const [activeTab, setActiveTab] = useState(route?.params?.initialTab || "map_sku");

  // ================= TAB 1: UNMAPPED APPROVED SKUS STATE =================
  const [unmappedSkus, setUnmappedSkus] = useState([]);
  const [loadingSkus, setLoadingSkus] = useState(true);
  const [refreshingSkus, setRefreshingSkus] = useState(false);
  const [skuSearchQuery, setSkuSearchQuery] = useState("");

  // Mapping Modal State
  const [selectedSkuToMap, setSelectedSkuToMap] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapPrice, setMapPrice] = useState("");
  const [mapSalePrice, setMapSalePrice] = useState("");
  const [mapStock, setMapStock] = useState("");
  const [mapMinStock, setMapMinStock] = useState("5");
  const [mapSellerSku, setMapSellerSku] = useState("");
  const [isSubmittingMap, setIsSubmittingMap] = useState(false);

  // ================= TAB 2: NEW VARIANT STATE =================
  const [approvedProducts, setApprovedProducts] = useState([]);
  const [loadingApprovedProducts, setLoadingApprovedProducts] = useState(false);

  // Form fields for new variant
  const [selectedProduct, setSelectedProduct] = useState(
    route?.params?.preselectedProduct || route?.params?.product || null
  );
  const [variantName, setVariantName] = useState("");
  const [variantWeight, setVariantWeight] = useState("");
  const [variantLength, setVariantLength] = useState("");
  const [variantWidth, setVariantWidth] = useState("");
  const [variantHeight, setVariantHeight] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [variantSalePrice, setVariantSalePrice] = useState("");
  const [variantStock, setVariantStock] = useState("");
  const [variantMinStock, setVariantMinStock] = useState("5");
  const [variantSellerSku, setVariantSellerSku] = useState("");
  const [variantImages, setVariantImages] = useState([]);
  const variantImage = variantImages[0] || null;
  const setVariantImage = (img) => setVariantImages(img ? [img] : []);
  const [isSubmittingVariant, setIsSubmittingVariant] = useState(false);

  // ---------------- Load Unmapped SKUs ----------------
  const fetchUnmappedSkus = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshingSkus(true);
    else setLoadingSkus(true);

    try {
      const data = await getUnmappedApprovedSkus();
      const list = Array.isArray(data) ? data : data?.data || [];
      setUnmappedSkus(list);
    } catch (err) {
      console.warn("Failed to fetch unmapped SKUs:", err?.message);
    } finally {
      setLoadingSkus(false);
      setRefreshingSkus(false);
    }
  }, []);

  // ---------------- Load Approved Master Products ----------------
  const fetchApprovedProducts = useCallback(async () => {
    setLoadingApprovedProducts(true);
    try {
      const data = await getApprovedProducts();
      const list = Array.isArray(data) ? data : data?.data || [];
      setApprovedProducts(list);
    } catch (err) {
      console.warn("Failed to fetch approved products:", err?.message);
    } finally {
      setLoadingApprovedProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchUnmappedSkus();
    fetchApprovedProducts();
  }, [fetchUnmappedSkus, fetchApprovedProducts]);

  useEffect(() => {
    if (route?.params?.preselectedProduct) {
      setSelectedProduct(route.params.preselectedProduct);
    } else if (route?.params?.product) {
      setSelectedProduct(route.params.product);
    }
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.preselectedProduct, route?.params?.product, route?.params?.initialTab]);

  useEffect(() => {
    if (!selectedProduct && approvedProducts.length > 0) {
      const targetId = route?.params?.initialProductId || route?.params?.productId || route?.params?.id;
      if (targetId) {
        const found = approvedProducts.find((p) => String(p.id) === String(targetId));
        if (found) {
          setSelectedProduct(found);
          return;
        }
      }
      setSelectedProduct(approvedProducts[0]);
    }
  }, [approvedProducts, selectedProduct, route?.params]);

  // ---------------- Filtered Unmapped SKUs ----------------
  const filteredSkus = useMemo(() => {
    if (!skuSearchQuery.trim()) return unmappedSkus;
    const q = skuSearchQuery.toLowerCase().trim();
    return unmappedSkus.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const prodName = (item.product_name || "").toLowerCase();
      const skuCode = (item.sku || "").toLowerCase();
      return name.includes(q) || prodName.includes(q) || skuCode.includes(q);
    });
  }, [unmappedSkus, skuSearchQuery]);

  // ---------------- Open Map Modal ----------------
  const handleOpenMapModal = (skuItem) => {
    setSelectedSkuToMap(skuItem);
    setMapPrice("");
    setMapSalePrice("");
    setMapStock("");
    setMapMinStock("5");
    setMapSellerSku(skuItem.sku ? `SELLER-${skuItem.sku}` : "");
    setShowMapModal(true);
  };

  // ---------------- Submit Map SKU ----------------
  const handleSubmitMapSku = async () => {
    if (!selectedSkuToMap) return;

    if (!mapPrice.trim() || isNaN(Number(mapPrice)) || Number(mapPrice) <= 0) {
      CustomAlert.showWarning("Price Required", "Please enter a valid base price.");
      return;
    }
    if (mapSalePrice.trim() && (isNaN(Number(mapSalePrice)) || Number(mapSalePrice) <= 0)) {
      CustomAlert.showWarning("Invalid Sale Price", "Please enter a valid sale price or leave it blank.");
      return;
    }
    if (mapSalePrice.trim() && Number(mapSalePrice) >= Number(mapPrice)) {
      CustomAlert.showWarning("Price Mismatch", "Sale price should be less than regular base price.");
      return;
    }
    if (!mapStock.trim() || isNaN(parseInt(mapStock, 10)) || parseInt(mapStock, 10) < 0) {
      CustomAlert.showWarning("Stock Required", "Please enter initial stock quantity.");
      return;
    }

    setIsSubmittingMap(true);
    try {
      const payload = {
        product_id: selectedSkuToMap.product_id,
        product_sku_id: selectedSkuToMap.id,
        price: Number(mapPrice),
        stock_quantity: parseInt(mapStock, 10),
        min_stock_alert: parseInt(mapMinStock, 10) || 5,
      };

      if (mapSalePrice.trim()) {
        payload.sale_price = Number(mapSalePrice);
      }
      if (mapSellerSku.trim()) {
        payload.seller_sku = mapSellerSku.trim();
      }

      await addSellerSku(payload);

      // Remove from unmapped list
      setUnmappedSkus((prev) => prev.filter((item) => item.id !== selectedSkuToMap.id));
      setShowMapModal(false);

      CustomAlert.showSuccess(
        "SKU Added to Store!",
        `"${selectedSkuToMap.product_name || selectedSkuToMap.name}" has been mapped and is now available in your store.`,
        () => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }
      );
    } catch (err) {
      CustomAlert.showError("Mapping Failed", err?.message || "Could not map SKU to store.");
    } finally {
      setIsSubmittingMap(false);
    }
  };

  // ---------------- Image Picker for Variant ----------------
  const requestCameraPermission = async () => {
    if (Platform.OS !== "android") return true;
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
        title: "Camera Permission",
        message: "DeeBazar Seller needs camera access to capture product photos.",
        buttonNeutral: "Ask Me Later",
        buttonNegative: "Cancel",
        buttonPositive: "OK",
      });
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  };

  const handlePickVariantImage = () => {
    CustomAlert.alert("Upload Variant Photos", "Choose source for variant photos", [
      {
        text: "Camera",
        onPress: async () => {
          const hasPerm = await requestCameraPermission();
          if (!hasPerm) {
            CustomAlert.showWarning("Permission Required", "Camera permission is needed.");
            return;
          }
          launchCamera({ mediaType: "photo", quality: 0.8 }, (response) => {
            if (!response.didCancel && response.assets && response.assets.length > 0) {
              const asset = response.assets[0];
              const newAsset = {
                uri: asset.uri,
                type: asset.type || "image/jpeg",
                fileName: asset.fileName || `variant_${Date.now()}.jpg`,
              };
              setVariantImages((prev) => [...prev, newAsset]);
            }
          });
        },
      },
      {
        text: "Gallery (Multiple)",
        onPress: () => {
          launchImageLibrary({ mediaType: "photo", quality: 0.8, selectionLimit: 10 }, (response) => {
            if (!response.didCancel && response.assets && response.assets.length > 0) {
              const newAssets = response.assets.map((asset, index) => ({
                uri: asset.uri,
                type: asset.type || "image/jpeg",
                fileName: asset.fileName || `variant_${Date.now()}_${index}.jpg`,
              }));
              setVariantImages((prev) => [...prev, ...newAssets]);
            }
          });
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleRemoveVariantImage = (indexToRemove) => {
    setVariantImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetPrimaryImage = (index) => {
    if (index === 0) return;
    setVariantImages((prev) => {
      const target = prev[index];
      const rest = prev.filter((_, idx) => idx !== index);
      return [target, ...rest];
    });
  };

  // ---------------- Submit New Variant SKU ----------------
  const handleSubmitNewVariant = async () => {
    if (!selectedProduct) {
      CustomAlert.showWarning("Product Required", "Please select an approved product first.");
      return;
    }
    if (!variantName.trim()) {
      CustomAlert.showWarning("Variant Name Required", "Please enter variant name (e.g. Red / XL).");
      return;
    }
    if (!variantPrice.trim() || isNaN(Number(variantPrice)) || Number(variantPrice) <= 0) {
      CustomAlert.showWarning("Price Required", "Please enter a valid price.");
      return;
    }
    if (variantSalePrice.trim() && (isNaN(Number(variantSalePrice)) || Number(variantSalePrice) <= 0)) {
      CustomAlert.showWarning("Invalid Sale Price", "Please enter a valid sale price or leave it blank.");
      return;
    }
    if (variantSalePrice.trim() && Number(variantSalePrice) >= Number(variantPrice)) {
      CustomAlert.showWarning("Price Mismatch", "Sale price should be less than regular price.");
      return;
    }
    if (!variantStock.trim() || isNaN(parseInt(variantStock, 10)) || parseInt(variantStock, 10) < 0) {
      CustomAlert.showWarning("Stock Required", "Please enter stock quantity.");
      return;
    }

    setIsSubmittingVariant(true);
    try {
      const formData = new FormData();
      formData.append("product_id", String(selectedProduct.id));
      formData.append("name", variantName.trim());
      formData.append("price", String(Number(variantPrice)));
      formData.append("stock_quantity", String(parseInt(variantStock, 10)));
      formData.append("min_stock_alert", String(parseInt(variantMinStock, 10) || 5));

      if (variantSalePrice.trim()) {
        formData.append("sale_price", String(Number(variantSalePrice)));
      }
      if (variantWeight.trim()) {
        formData.append("weight", String(variantWeight.trim()));
      }
      if (variantLength.trim()) {
        formData.append("length", String(variantLength.trim()));
      }
      if (variantWidth.trim()) {
        formData.append("width", String(variantWidth.trim()));
      }
      if (variantHeight.trim()) {
        formData.append("height", String(variantHeight.trim()));
      }
      if (variantSellerSku.trim()) {
        formData.append("seller_sku", variantSellerSku.trim());
      }

      if (variantImages && variantImages.length > 0) {
        const formatFile = (img, fallbackName) => ({
          uri: Platform.OS === "android" ? img.uri : img.uri.replace("file://", ""),
          type: img.type || "image/jpeg",
          name: img.fileName || fallbackName,
        });

        // Primary image for backward compatibility
        const firstImg = variantImages[0];
        formData.append("image", formatFile(firstImg, `sku_${Date.now()}_0.jpg`));

        // Multi-image support (both images[] and gallery[])
        variantImages.forEach((img, idx) => {
          const fileObj = formatFile(img, `sku_${Date.now()}_${idx}.jpg`);
          formData.append("images[]", fileObj);
          formData.append("gallery[]", fileObj);
        });
      }

      const res = await addSellerSku(formData);

      CustomAlert.showSuccess(
        "Variant Submitted!",
        res?.message || "SKU submitted. It will be visible to customers after admin approves the SKU.",
        () => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }
      );

      // Reset form
      setVariantName("");
      setVariantWeight("");
      setVariantLength("");
      setVariantWidth("");
      setVariantHeight("");
      setVariantPrice("");
      setVariantSalePrice("");
      setVariantStock("");
      setVariantMinStock("5");
      setVariantSellerSku("");
      setVariantImages([]);
    } catch (err) {
      CustomAlert.showError("Submission Failed", err?.message || "Could not submit SKU variant.");
    } finally {
      setIsSubmittingVariant(false);
    }
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>SKU Catalog & Mapping</Text>
          <Text style={[styles.headerSubTitle, { color: colors.textSecondary }]}>
            {activeTab === "map_sku" ? "Map approved SKUs to your shop" : "Submit custom SKU variant for catalog"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.newProdBtn, { backgroundColor: isDark ? "#1e293b" : "#EFF6FF" }]}
          onPress={() => navigation.navigate("AddProduct")}
        >
          <Ionicons name="cube-outline" size={16} color={COLORS.primary} />
          <Text style={[styles.newProdBtnText, { color: COLORS.primary }]}>+ Product</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Switcher */}
      <View style={[styles.tabBar, { backgroundColor: colors.cardBg, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "map_sku" && [styles.activeTabItem, { borderBottomColor: COLORS.primary }],
          ]}
          onPress={() => setActiveTab("map_sku")}
        >
          <Ionicons
            name="flash"
            size={18}
            color={activeTab === "map_sku" ? COLORS.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "map_sku" ? COLORS.primary : colors.textSecondary },
              activeTab === "map_sku" && styles.activeTabText,
            ]}
          >
            Map Approved SKU
          </Text>
          {unmappedSkus.length > 0 && (
            <View style={[styles.badge, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.badgeText}>{unmappedSkus.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "new_variant" && [styles.activeTabItem, { borderBottomColor: COLORS.primary }],
          ]}
          onPress={() => setActiveTab("new_variant")}
        >
          <Ionicons
            name="pricetags"
            size={18}
            color={activeTab === "new_variant" ? COLORS.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "new_variant" ? COLORS.primary : colors.textSecondary },
              activeTab === "new_variant" && styles.activeTabText,
            ]}
          >
            New SKU Variant
          </Text>
        </TouchableOpacity>
      </View>

      {/* ================= TAB 1: MAP APPROVED SKUS ================= */}
      {activeTab === "map_sku" && (
        <View style={styles.flexOne}>
          {/* Search bar */}
          <View style={[styles.searchBox, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
            <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search approved SKUs by name or code..."
              placeholderTextColor={colors.textSecondary}
              value={skuSearchQuery}
              onChangeText={setSkuSearchQuery}
            />
            {skuSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSkuSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* List or Loading */}
          {loadingSkus ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading approved SKUs...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshingSkus} onRefresh={() => fetchUnmappedSkus(true)} />
              }
            >
              {filteredSkus.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? "#1e293b" : "#F1F5F9" }]}>
                    <Ionicons name="cube-outline" size={48} color={colors.textSecondary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Approved SKUs Available</Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    All admin-approved SKUs are currently mapped to your store or none match your search.
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptyActionBtn, { backgroundColor: COLORS.primary }]}
                    onPress={() => setActiveTab("new_variant")}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#fff" />
                    <Text style={styles.emptyActionBtnText}>Create New SKU Variant</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredSkus.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.skuCard, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}
                  >
                    {/* Thumbnail */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() =>
                        navigation.navigate("SkuDetails", {
                          skuId: item.id,
                          skuData: { sku: item, product: { name: item.product_name } },
                        })
                      }
                      style={[styles.thumbnailWrap, { backgroundColor: colors.backgroundAlt }]}
                    >
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.thumbnail} resizeMode="cover" />
                      ) : (
                        <Ionicons name="image-outline" size={32} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>

                    {/* Details */}
                    <View style={styles.skuCardDetails}>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() =>
                          navigation.navigate("SkuDetails", {
                            skuId: item.id,
                            skuData: { sku: item, product: { name: item.product_name } },
                          })
                        }
                      >
                        <View style={styles.skuBadgeRow}>
                          <View style={[styles.adminTag, { backgroundColor: isDark ? "#064e3b" : "#DCFCE7" }]}>
                            <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                            <Text style={[styles.adminTagText, { color: COLORS.success }]}>Approved</Text>
                          </View>
                          <Text style={[styles.skuCode, { color: colors.textSecondary }]}>
                            {typeof item.sku === "object" ? item.sku.code || item.sku.sku || item.sku.name : item.sku}
                          </Text>
                        </View>

                        <Text style={[styles.prodTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                          {item.product_name || item.name}
                        </Text>

                        {item.name && item.product_name && item.name !== item.product_name && (
                          <Text style={[styles.variantSubtitle, { color: colors.textSecondary }]}>
                            Variant: {item.name}
                          </Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.mapActionBtn, { backgroundColor: COLORS.primary }]}
                        onPress={() => handleOpenMapModal(item)}
                      >
                        <Ionicons name="add" size={16} color="#fff" />
                        <Text style={styles.mapActionBtnText}>Map to Store</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* ================= TAB 2: NEW VARIANT SKU ================= */}
      {activeTab === "new_variant" && (
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          <View style={[styles.infoBanner, { backgroundColor: isDark ? "#1e293b" : "#EFF6FF", borderColor: COLORS.primaryLight }]}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={[styles.infoBannerText, { color: isDark ? "#93c5fd" : "#1e40af" }]}>
              Add a new variant (new size, color, or spec) under an approved catalog product. After submission, admin will review and approve it.
            </Text>
          </View>

          {/* Section 1: Approved Product Value & Available Products */}
          <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={[styles.formCardTitle, { color: colors.textPrimary, marginBottom: 0 }]}>1. Approved Product *</Text>
              {selectedProduct?.id && (
                <View style={[styles.selectedIdBadge, { backgroundColor: isDark ? "#1e293b" : "#EFF6FF", borderColor: COLORS.primaryLight }]}>
                  <Text style={[styles.selectedIdBadgeText, { color: COLORS.primary }]}>Active ID: #{selectedProduct.id}</Text>
                </View>
              )}
            </View>

            {/* Currently Selected Product Details */}
            <View
              style={[
                styles.productValueContainer,
                { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight },
              ]}
            >
              <View style={[styles.productIconWrap, { backgroundColor: isDark ? "#1e293b" : "#EFF6FF" }]}>
                <Ionicons name="cube" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.productValueName,
                    { color: selectedProduct ? colors.textPrimary : colors.textSecondary },
                  ]}
                  numberOfLines={2}
                >
                  {selectedProduct ? (selectedProduct.name || `Product #${selectedProduct.id}`) : "No product available"}
                </Text>
                {selectedProduct?.id ? (
                  <View style={styles.productValueMetaRow}>
                    <Text style={[styles.productValueMeta, { color: colors.textSecondary }]}>
                      Product ID: #{selectedProduct.id}
                      {selectedProduct?.category?.name || selectedProduct?.category_name
                        ? ` • ${selectedProduct?.category?.name || selectedProduct?.category_name}`
                        : ""}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Other Available Approved Products list/chips */}
            {approvedProducts.length > 0 && (
              <View style={styles.otherProductsWrap}>
                <Text style={[styles.otherProductsLabel, { color: colors.textSecondary }]}>
                  All Approved Products (Tap ID to switch):
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prodIdChipsRow}>
                  {approvedProducts.map((p) => {
                    const isCurrent = selectedProduct?.id === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => setSelectedProduct(p)}
                        activeOpacity={0.75}
                        style={[
                          styles.prodIdChip,
                          isCurrent
                            ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                            : { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight },
                        ]}
                      >
                        <Ionicons
                          name={isCurrent ? "checkmark-circle" : "cube-outline"}
                          size={13}
                          color={isCurrent ? "#fff" : colors.textSecondary}
                          style={{ marginRight: 5 }}
                        />
                        <Text
                          style={[
                            styles.prodIdChipText,
                            { color: isCurrent ? "#fff" : colors.textPrimary, fontWeight: isCurrent ? "700" : "500" },
                          ]}
                          numberOfLines={1}
                        >
                          ID #{p.id}: {p.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Section 2: Variant Details */}
          <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
            <Text style={[styles.formCardTitle, { color: colors.textPrimary }]}>2. Variant Specification</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Variant Name / Attribute *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
              placeholder="e.g. Red / XL, Blue / 128GB, or 500g"
              placeholderTextColor={colors.textSecondary}
              value={variantName}
              onChangeText={setVariantName}
            />

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Weight (kg)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
                  placeholder="e.g. 0.5"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={variantWeight}
                  onChangeText={setVariantWeight}
                />
              </View>
              <View style={styles.gridCol}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Length (cm)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
                  placeholder="e.g. 10"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={variantLength}
                  onChangeText={setVariantLength}
                />
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Width (cm)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
                  placeholder="e.g. 5"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={variantWidth}
                  onChangeText={setVariantWidth}
                />
              </View>
              <View style={styles.gridCol}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Height (cm)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
                  placeholder="e.g. 2"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={variantHeight}
                  onChangeText={setVariantHeight}
                />
              </View>
            </View>
          </View>

          {/* Section 3: Pricing & Inventory */}
          <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
            <Text style={[styles.formCardTitle, { color: colors.textPrimary }]}>3. Pricing & Stock</Text>

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Regular Price (₹) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
                  placeholder="e.g. 999"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={variantPrice}
                  onChangeText={setVariantPrice}
                />
              </View>
              <View style={styles.gridCol}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Sale Price (₹)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
                  placeholder="e.g. 799"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={variantSalePrice}
                  onChangeText={setVariantSalePrice}
                />
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Stock Quantity *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
                  placeholder="e.g. 50"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={variantStock}
                  onChangeText={setVariantStock}
                />
              </View>
              <View style={styles.gridCol}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Min Stock Alert</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
                  placeholder="Default: 5"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={variantMinStock}
                  onChangeText={setVariantMinStock}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Seller Custom SKU (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
              placeholder="e.g. MY-SKU-003"
              placeholderTextColor={colors.textSecondary}
              value={variantSellerSku}
              onChangeText={setVariantSellerSku}
            />
          </View>

          {/* Section 4: Variant Images */}
          <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
            <View style={styles.imageHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formCardTitle, { color: colors.textPrimary, marginBottom: 2 }]}>
                  4. Variant Photos {variantImages.length > 0 ? `(${variantImages.length})` : ""}
                </Text>
                <Text style={[styles.imageSectionSub, { color: colors.textSecondary }]}>
                  {variantImages.length > 0
                    ? "First photo is Primary. Tap any photo to set as Primary."
                    : "Upload one or more photos for this SKU variant."}
                </Text>
              </View>
              {variantImages.length > 0 && (
                <TouchableOpacity
                  onPress={() => setVariantImages([])}
                  style={styles.clearAllBtn}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.clearAllBtnText, { color: COLORS.error }]}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            {variantImages.length > 0 ? (
              <View style={styles.variantImagesContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.variantImagesScroll}
                >
                  {variantImages.map((img, index) => {
                    const isPrimary = index === 0;
                    return (
                      <TouchableOpacity
                        key={index}
                        activeOpacity={0.9}
                        onPress={() => handleSetPrimaryImage(index)}
                        style={[
                          styles.variantImgWrapper,
                          {
                            borderColor: isPrimary ? COLORS.primary : colors.borderLight,
                            borderWidth: isPrimary ? 2 : 1,
                          },
                        ]}
                      >
                        <Image source={{ uri: img.uri }} style={styles.variantImgThumb} resizeMode="cover" />

                        {/* Primary Badge */}
                        {isPrimary ? (
                          <View style={styles.primaryBadge}>
                            <Ionicons name="star" size={10} color="#fff" style={{ marginRight: 2 }} />
                            <Text style={styles.primaryBadgeText}>Primary</Text>
                          </View>
                        ) : (
                          <View style={styles.indexBadge}>
                            <Text style={styles.indexBadgeText}>#{index + 1}</Text>
                          </View>
                        )}

                        {/* Remove Button */}
                        <TouchableOpacity
                          style={styles.removeVariantImageBtn}
                          onPress={() => handleRemoveVariantImage(index)}
                          activeOpacity={0.8}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close" size={12} color="#fff" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Add More Photos Card */}
                  <TouchableOpacity
                    style={[
                      styles.addMoreCard,
                      { backgroundColor: colors.backgroundAlt, borderColor: COLORS.primaryLight },
                    ]}
                    onPress={handlePickVariantImage}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.addMoreIconWrap, { backgroundColor: isDark ? "#1e293b" : "#EFF6FF" }]}>
                      <Ionicons name="add" size={22} color={COLORS.primary} />
                    </View>
                    <Text style={[styles.addMoreText, { color: COLORS.primary }]}>Add More</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.uploadBox, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight }]}
                onPress={handlePickVariantImage}
                activeOpacity={0.8}
              >
                <View style={[styles.uploadIconCircle, { backgroundColor: isDark ? "#1e293b" : "#EFF6FF" }]}>
                  <Ionicons name="images-outline" size={28} color={COLORS.primary} />
                </View>
                <Text style={[styles.uploadText, { color: colors.textPrimary }]}>
                  Select Multiple Photos from Gallery or Camera
                </Text>
                <Text style={[styles.uploadSub, { color: colors.textSecondary }]}>
                  Tap to choose photos (select multiple at once, JPG/PNG up to 5MB)
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: COLORS.primary }]}
            onPress={handleSubmitNewVariant}
            disabled={isSubmittingVariant}
          >
            {isSubmittingVariant ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>Submit SKU for Approval</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ================= MODAL: MAP SKU BOTTOM SHEET ================= */}
      <Modal visible={showMapModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.cardBg }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Map SKU to Store</Text>
              <TouchableOpacity onPress={() => setShowMapModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedSkuToMap && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* SKU Info Card */}
                <View style={[styles.modalSkuPreview, { backgroundColor: colors.backgroundAlt }]}>
                  {selectedSkuToMap.image_url ? (
                    <Image source={{ uri: selectedSkuToMap.image_url }} style={styles.modalSkuThumb} />
                  ) : (
                    <View style={[styles.modalSkuThumb, styles.centered]}>
                      <Ionicons name="cube" size={24} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.modalProdName, { color: colors.textPrimary }]} numberOfLines={2}>
                      {selectedSkuToMap.product_name || selectedSkuToMap.name}
                    </Text>
                    <Text style={[styles.modalSkuBadge, { color: COLORS.primary }]}>
                      SKU: {selectedSkuToMap.sku}
                    </Text>
                  </View>
                </View>

                {/* Form fields */}
                <View style={styles.gridRow}>
                  <View style={styles.gridCol}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Price (₹) *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
                      placeholder="e.g. 1999"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      value={mapPrice}
                      onChangeText={setMapPrice}
                    />
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Sale Price (₹)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
                      placeholder="e.g. 799"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      value={mapSalePrice}
                      onChangeText={setMapSalePrice}
                    />
                  </View>
                </View>

                <View style={styles.gridRow}>
                  <View style={styles.gridCol}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Stock Quantity *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
                      placeholder="e.g. 50"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      value={mapStock}
                      onChangeText={setMapStock}
                    />
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Min Stock Alert</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
                      placeholder="5"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      value={mapMinStock}
                      onChangeText={setMapMinStock}
                    />
                  </View>
                </View>

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Seller Custom SKU (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
                  placeholder="e.g. MY-STORE-SKU-1"
                  placeholderTextColor={colors.textSecondary}
                  value={mapSellerSku}
                  onChangeText={setMapSellerSku}
                />

                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: COLORS.primary }]}
                  onPress={handleSubmitMapSku}
                  disabled={isSubmittingMap}
                >
                  {isSubmittingMap ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.confirmBtnText}>Confirm & Add to Store</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  centered: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 44) + 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  newProdBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newProdBtnText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabItem: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  activeTabText: {
    fontWeight: "700",
  },
  badge: {
    marginLeft: 6,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  skuCard: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: "center",
  },
  thumbnailWrap: {
    width: 76,
    height: 76,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  skuCardDetails: {
    flex: 1,
    marginLeft: 12,
  },
  skuBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  adminTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  adminTagText: {
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 2,
  },
  skuCode: {
    fontSize: 11,
    fontWeight: "600",
  },
  prodTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  variantSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  mapActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  mapActionBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    marginBottom: 18,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyActionBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
  formContainer: {
    padding: 16,
  },
  infoBanner: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  formCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  formCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  productValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  productIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  productValueName: {
    fontSize: 14,
    fontWeight: "600",
  },
  productValueMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  productValueMeta: {
    fontSize: 12,
  },
  selectedIdBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  selectedIdBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  otherProductsWrap: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.06)",
  },
  otherProductsLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  prodIdChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  prodIdChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  prodIdChipText: {
    fontSize: 12,
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectorBtnText: {
    flex: 1,
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  gridRow: {
    flexDirection: "row",
    marginHorizontal: -6,
  },
  gridCol: {
    flex: 1,
    marginHorizontal: 6,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
  uploadSub: {
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  imageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  imageSectionSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  clearAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  clearAllBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  variantImagesContainer: {
    marginTop: 6,
  },
  variantImagesScroll: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  variantImgWrapper: {
    width: 104,
    height: 104,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    marginRight: 12,
  },
  variantImgThumb: {
    width: "100%",
    height: "100%",
  },
  primaryBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  primaryBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
  indexBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  indexBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  removeVariantImageBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.65)",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  addMoreCard: {
    width: 104,
    height: 104,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  addMoreIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  addMoreText: {
    fontSize: 11,
    fontWeight: "700",
  },
  previewImageContainer: {
    position: "relative",
    width: "100%",
    height: 180,
    borderRadius: 10,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 10,
    marginTop: 8,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  modalSkuPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalSkuThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: "#ccc",
  },
  modalProdName: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalSkuBadge: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 10,
    marginTop: 18,
    marginBottom: 12,
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  productPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  pickerItemText: {
    fontSize: 14,
  },
});

export default AddSkuScreen;
