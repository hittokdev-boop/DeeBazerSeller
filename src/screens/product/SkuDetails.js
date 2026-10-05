import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { getSellerSkuDetails, updateSkuStock, isTechnicalError } from "../../api/auth";
import { CustomAlert } from "../../context/AlertContext";
import { normalizeImageUrl } from "./ProductDetails";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return "₹0.00";
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return dateString;
  }
};

const getStatusBadge = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "approved" || s === "active") {
    return { bg: COLORS.successBgLight, text: COLORS.success, label: "Approved" };
  }
  if (s === "pending") {
    return { bg: COLORS.warningBgLight, text: COLORS.warning, label: "Pending Review" };
  }
  if (s === "rejected") {
    return { bg: COLORS.errorBgLight, text: COLORS.error, label: "Rejected" };
  }
  return { bg: COLORS.backgroundAlt, text: COLORS.textSecondary, label: status || "Draft" };
};

const SkuDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, isDark } = useTheme();

  const skuId =
    route.params?.skuId ||
    route.params?.id ||
    route.params?.sku_id;

  const initialData = route.params?.skuData || null;

  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(!initialData && !!skuId);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Fullscreen image preview modal
  const [showImageModal, setShowImageModal] = useState(false);

  // Stock edit modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockInputValue, setStockInputValue] = useState("");
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  // Sync state whenever route params change (e.g. navigating to different variants)
  useEffect(() => {
    if (route.params?.skuData) {
      setData(route.params.skuData);
      setIsLoading(false);
      setFetchError(null);
    }
  }, [route.params?.skuData, route.params?.skuId]);

  const fetchSkuDetails = useCallback(
    async (isRefresh = false) => {
      const activeId =
        route.params?.skuId ||
        route.params?.skuData?.seller_product_id ||
        route.params?.skuData?.listing?.id ||
        skuId ||
        route.params?.id ||
        route.params?.sku_id;
      if (!activeId) return;

      if (isRefresh) {
        setIsRefreshing(true);
      } else if (!data) {
        setIsLoading(true);
      }
      setFetchError(null);

      try {
        console.log("Calling getSellerSkuDetails for ID:", activeId);
        const res = await getSellerSkuDetails(activeId);
        const resData = res?.data || res;

        if (resData && typeof resData === "object") {
          const newListing = resData.listing || {};
          const newSku = resData.sku || {};
          const newProduct = resData.product || {};

          // Verify that the response belongs to the same SKU
          const expectedCode = initialData?.sku?.code || initialData?.sku?.sku || data?.sku?.code || data?.sku?.sku;
          const expectedName = initialData?.sku?.name || initialData?.sku?.sku_name || data?.sku?.name;
          const isSameSku = !expectedCode && !expectedName
            ? true
            : (expectedCode && (newSku.code === expectedCode || newSku.sku === expectedCode)) ||
              (expectedName && (newSku.name === expectedName || newSku.sku_name === expectedName)) ||
              (newSku.id && (newSku.id === initialData?.sku?.id || newSku.id === data?.sku?.id));

          if (isSameSku) {
            setData((prev) => ({
              ...(prev || {}),
              ...resData,
              seller_product_id: resData.seller_product_id ?? activeId,
              listing: {
                ...(prev?.listing || {}),
                ...newListing,
              },
              sku: {
                ...(prev?.sku || {}),
                ...newSku,
                weight: newSku.weight ?? resData.weight ?? newProduct.weight ?? prev?.sku?.weight,
                dimensions: newSku.dimensions ?? resData.dimensions ?? newProduct.dimensions ?? prev?.sku?.dimensions,
                length: newSku.length ?? resData.length ?? newProduct.length ?? prev?.sku?.length,
                width: newSku.width ?? resData.width ?? newProduct.width ?? prev?.sku?.width,
                height: newSku.height ?? resData.height ?? newProduct.height ?? prev?.sku?.height,
              },
              product: {
                ...(prev?.product || {}),
                ...newProduct,
              },
            }));
          } else {
            console.log("Returned SKU details do not match expected SKU, preserving existing SKU");
          }
        }
      } catch (err) {
        console.warn("Failed to load SKU details:", err?.message);
        if (!data) {
          setFetchError(err?.message || "Failed to load SKU details");
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [skuId, route.params]
  );

  useFocusEffect(
    useCallback(() => {
      fetchSkuDetails();
    }, [fetchSkuDetails])
  );

  useEffect(() => {
    fetchSkuDetails();
  }, [fetchSkuDetails]);

  const listing = data?.listing || {};
  const sku = data?.sku || {};
  const product = data?.product || {};
  const sellerProductId = data?.seller_product_id;

  const listingBadge = getStatusBadge(listing?.status);
  const skuBadge = getStatusBadge(sku?.approval_status);

  const regularPrice = Number(listing?.price || 0);
  const salePrice = listing?.sale_price ? Number(listing.sale_price) : null;
  const isOnSale = Boolean(listing?.on_sale && salePrice && salePrice < regularPrice);
  const currentPrice = isOnSale ? salePrice : regularPrice;
  const discountPercent = isOnSale
    ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
    : 0;

  const stock = listing?.stock_quantity ?? 0;
  const isOutOfStock = stock <= 0 || listing?.in_stock === false;
  const isLowStock = !isOutOfStock && stock <= (listing?.min_stock_alert ?? 5);

  const allImages = useMemo(() => {
    const list = [];
    const addImg = (img) => {
      const url = normalizeImageUrl(img);
      if (url && !list.includes(url)) list.push(url);
    };
    if (sku?.image_url) addImg(sku.image_url);
    if (sku?.image) addImg(sku.image);
    if (Array.isArray(sku?.images)) sku.images.forEach(addImg);
    if (Array.isArray(sku?.gallery)) sku.gallery.forEach(addImg);
    if (list.length === 0) {
      if (product?.image_url) addImg(product.image_url);
      if (product?.image) addImg(product.image);
    }
    return list;
  }, [sku, product]);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const imageUrl = allImages[selectedImageIndex] || normalizeImageUrl(sku?.image_url);

  const activeSkuId =
    skuId ||
    sku?.id ||
    sku?.product_sku_id ||
    listing?.product_sku_id ||
    data?.product_sku_id ||
    listing?.id ||
    data?.id;

  const handleStockEdit = () => {
    setStockInputValue(String(stock));
    setShowStockModal(true);
  };

  const handleStockUpdate = async () => {
    const newQty = parseInt(stockInputValue, 10);
    if (isNaN(newQty) || newQty < 0) {
      CustomAlert.showWarning("Invalid Quantity", "Please enter a valid stock number (0 or more).");
      return;
    }

    if (!activeSkuId) {
      CustomAlert.showWarning("Missing SKU ID", "Cannot update stock: SKU ID not found.");
      return;
    }

    setIsUpdatingStock(true);
    try {
      const res = await updateSkuStock(activeSkuId, newQty);
      const updatedQty = res?.data?.stock_quantity !== undefined ? Number(res.data.stock_quantity) : newQty;
      const updatedInStock = res?.data?.in_stock !== undefined ? Boolean(res.data.in_stock) : updatedQty > 0;

      setData((prev) => ({
        ...prev,
        listing: {
          ...prev?.listing,
          stock_quantity: updatedQty,
          in_stock: updatedInStock,
        },
        sku: {
          ...prev?.sku,
          stock_quantity: updatedQty,
          in_stock: updatedInStock,
        },
      }));
      setShowStockModal(false);
      CustomAlert.showSuccess("Stock Updated 🎉", res?.message || `Stock updated to ${newQty} units.`);
    } catch (err) {
      console.warn("Stock update failed:", err?.message);
      CustomAlert.showError("Update Failed", err?.message || "Failed to update stock.");
    } finally {
      setIsUpdatingStock(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.backgroundAlt }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading SKU Details...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {sku?.name || product?.name || "SKU Details"}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {sku?.sku || sku?.code ? `Master SKU: ${sku.sku || sku.code}` : `ID: #${skuId || sku?.id || "-"}`}
          </Text>
        </View>

        <View style={[styles.badgePill, { backgroundColor: listingBadge.bg }]}>
          <Text style={[styles.badgePillText, { color: listingBadge.text }]}>
            {listingBadge.label}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchSkuDetails(true)} />
        }
      >
        {/* Fetch Error Banner */}
        {fetchError && !sku && !isTechnicalError(fetchError) && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
            <Text style={styles.errorBannerText}>{fetchError}</Text>
            <TouchableOpacity onPress={() => fetchSkuDetails()} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hero Image Section */}
        <View style={[styles.heroCard, { backgroundColor: colors.cardBg }]}>
          <TouchableOpacity
            activeOpacity={imageUrl ? 0.85 : 1}
            onPress={() => imageUrl && setShowImageModal(true)}
            style={[styles.imageWrapper, { backgroundColor: colors.backgroundAlt }]}
          >
            {imageUrl ? (
              <>
                <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="contain" />
                <View style={styles.zoomHintBadge}>
                  <Ionicons name="scan-outline" size={14} color="#fff" />
                  <Text style={styles.zoomHintText}>View Full</Text>
                </View>
              </>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="cube-outline" size={60} color={colors.textSecondary} />
                <Text style={[styles.imagePlaceholderText, { color: colors.textSecondary }]}>
                  No Image Available
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {allImages.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryThumbsRow}
            >
              {allImages.map((uri, idx) => {
                const isSelected = selectedImageIndex === idx;
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => setSelectedImageIndex(idx)}
                    style={[
                      styles.galleryThumbItem,
                      {
                        borderColor: isSelected ? COLORS.primary : colors.borderLight,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <Image source={{ uri }} style={styles.galleryThumbImg} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Titles & Codes */}
          <View style={styles.heroDetails}>
            <View style={styles.categoryRow}>
              {product?.category && (
                <View style={[styles.categoryTag, { backgroundColor: colors.backgroundAlt }]}>
                  <Ionicons name="folder-outline" size={12} color={COLORS.primary} />
                  <Text style={[styles.categoryTagText, { color: colors.textPrimary }]}>
                    {typeof product.category === "object"
                      ? product.category.name || product.category.code || "Category"
                      : String(product.category)}
                  </Text>
                </View>
              )}
              {sku?.is_active !== undefined && (
                <View
                  style={[
                    styles.activeTag,
                    {
                      backgroundColor: sku.is_active ? COLORS.successBgLight : COLORS.errorBgLight,
                    },
                  ]}
                >
                  <Ionicons
                    name={sku.is_active ? "checkmark-circle" : "close-circle"}
                    size={12}
                    color={sku.is_active ? COLORS.success : COLORS.error}
                  />
                  <Text
                    style={[
                      styles.activeTagText,
                      { color: sku.is_active ? COLORS.success : COLORS.error },
                    ]}
                  >
                    {sku.is_active ? "Active" : "Inactive"}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.productTitle, { color: colors.textPrimary }]}>
              {product?.name || "Product"}
            </Text>

            {sku?.name ? (
              <View style={styles.variantNameRow}>
                <Ionicons name="pricetag-outline" size={16} color={COLORS.primary} />
                <Text style={[styles.variantNameText, { color: COLORS.primary }]}>
                  Variant: {sku.name}
                </Text>
              </View>
            ) : null}

            {/* SKU Codes Box */}
            <View style={[styles.skuCodesCard, { backgroundColor: colors.backgroundAlt }]}>
              <View style={styles.codeItem}>
                <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Seller SKU</Text>
                <Text style={[styles.codeValue, { color: colors.textPrimary }]} numberOfLines={1}>
                  {listing?.seller_sku || "Not assigned"}
                </Text>
              </View>

              <View style={[styles.codeDivider, { backgroundColor: colors.borderLight }]} />

              <View style={styles.codeItem}>
                <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Master SKU</Text>
                <Text style={[styles.codeValue, { color: colors.textPrimary }]} numberOfLines={1}>
                  {sku?.sku || "N/A"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Rejection Alert Banner */}
        {(listing?.rejection_reason || sku?.rejection_reason) && (
          <View style={styles.rejectionBanner}>
            <Ionicons name="alert-circle" size={20} color={COLORS.error} style={{ marginRight: 8 }} />
            <View style={styles.flexOne}>
              <Text style={styles.rejectionTitle}>Listing Rejected</Text>
              <Text style={styles.rejectionReason}>
                {listing?.rejection_reason || sku?.rejection_reason}
              </Text>
            </View>
          </View>
        )}

        {/* Pricing Card */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="cash-outline" size={18} color={COLORS.primary} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Pricing</Text>
            </View>
            {isOnSale && (
              <View style={[styles.salePill, { backgroundColor: COLORS.successBgLight }]}>
                <Text style={[styles.salePillText, { color: COLORS.success }]}>
                  ON SALE ({discountPercent}% OFF)
                </Text>
              </View>
            )}
          </View>

          <View style={styles.priceRow}>
            <View style={styles.flexOne}>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Listing Price</Text>
              <Text style={[styles.priceLarge, { color: COLORS.primary }]}>
                {formatCurrency(currentPrice)}
              </Text>
            </View>

            {isOnSale && (
              <View style={styles.flexOne}>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Regular Price</Text>
                <Text style={[styles.priceStrikethrough, { color: colors.textSecondary }]}>
                  {formatCurrency(regularPrice)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Inventory & Stock Card */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="layers-outline" size={18} color={COLORS.primary} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Inventory & Stock</Text>
            </View>
            {activeSkuId ? (
              <TouchableOpacity
                style={[styles.editStockBtn, { backgroundColor: COLORS.primaryLight + "20" }]}
                onPress={handleStockEdit}
              >
                <Ionicons name="create-outline" size={14} color={COLORS.primary} />
                <Text style={[styles.editStockBtnText, { color: COLORS.primary }]}>Update Stock</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.stockGrid}>
            <View style={[styles.stockBox, { backgroundColor: colors.backgroundAlt }]}>
              <Text style={[styles.stockBoxLabel, { color: colors.textSecondary }]}>Current Stock</Text>
              <Text
                style={[
                  styles.stockBoxValue,
                  {
                    color: isOutOfStock
                      ? COLORS.error
                      : isLowStock
                      ? COLORS.warning
                      : COLORS.success,
                  },
                ]}
              >
                {stock} units
              </Text>
              <Text
                style={[
                  styles.stockStatusSub,
                  {
                    color: isOutOfStock
                      ? COLORS.error
                      : isLowStock
                      ? COLORS.warning
                      : COLORS.success,
                  },
                ]}
              >
                {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
              </Text>
            </View>

            <View style={[styles.stockBox, { backgroundColor: colors.backgroundAlt }]}>
              <Text style={[styles.stockBoxLabel, { color: colors.textSecondary }]}>
                Min Stock Alert
              </Text>
              <Text style={[styles.stockBoxValue, { color: colors.textPrimary }]}>
                {listing?.min_stock_alert ?? 5} units
              </Text>
              <Text style={[styles.stockStatusSub, { color: colors.textSecondary }]}>
                Alert threshold
              </Text>
            </View>
          </View>
        </View>

        {/* Physical Specifications Card */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="cube-outline" size={18} color={COLORS.primary} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Dimensions & Weight
              </Text>
            </View>
          </View>

          <View style={styles.specsList}>
            <View style={[styles.specRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Weight</Text>
              <Text style={[styles.specVal, { color: colors.textPrimary }]}>
                {sku?.weight !== undefined && sku?.weight !== null && sku?.weight !== ""
                  ? `${sku.weight} kg`
                  : product?.weight !== undefined && product?.weight !== null && product?.weight !== ""
                  ? `${product.weight} kg`
                  : "N/A"}
              </Text>
            </View>

            <View style={[styles.specRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Dimensions</Text>
              <Text style={[styles.specVal, { color: colors.textPrimary }]}>
                {sku?.dimensions ||
                  product?.dimensions ||
                  (sku?.length && sku?.width && sku?.height
                    ? `${sku.length} x ${sku.width} x ${sku.height}`
                    : product?.length && product?.width && product?.height
                    ? `${product.length} x ${product.width} x ${product.height}`
                    : "N/A")}
              </Text>
            </View>

            <View style={[styles.specRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Length</Text>
              <Text style={[styles.specVal, { color: colors.textPrimary }]}>
                {sku?.length ? `${sku.length} cm` : product?.length ? `${product.length} cm` : "N/A"}
              </Text>
            </View>

            <View style={[styles.specRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Width</Text>
              <Text style={[styles.specVal, { color: colors.textPrimary }]}>
                {sku?.width ? `${sku.width} cm` : product?.width ? `${product.width} cm` : "N/A"}
              </Text>
            </View>

            <View style={[styles.specRow, { borderBottomColor: "transparent" }]}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Height</Text>
              <Text style={[styles.specVal, { color: colors.textPrimary }]}>
                {sku?.height ? `${sku.height} cm` : product?.height ? `${product.height} cm` : "N/A"}
              </Text>
            </View>
          </View>
        </View>

        {/* Catalog & Audit Info Card */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Listing Information</Text>
            </View>
          </View>

          <View style={styles.specsList}>
            <View style={[styles.specRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Seller Product ID</Text>
              <Text style={[styles.specVal, { color: colors.textPrimary }]}>
                #{sellerProductId || "N/A"}
              </Text>
            </View>

            <View style={[styles.specRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Master Product ID</Text>
              <Text style={[styles.specVal, { color: colors.textPrimary }]}>
                #{product?.id || "N/A"}
              </Text>
            </View>

            <View style={[styles.specRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>SKU ID</Text>
              <Text style={[styles.specVal, { color: colors.textPrimary }]}>
                #{sku?.id || skuId || "N/A"}
              </Text>
            </View>

            <View style={[styles.specRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Listing Status</Text>
              <View style={[styles.inlineBadge, { backgroundColor: listingBadge.bg }]}>
                <Text style={[styles.inlineBadgeText, { color: listingBadge.text }]}>
                  {listingBadge.label}
                </Text>
              </View>
            </View>

            <View style={[styles.specRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Catalog SKU Status</Text>
              <View style={[styles.inlineBadge, { backgroundColor: skuBadge.bg }]}>
                <Text style={[styles.inlineBadgeText, { color: skuBadge.text }]}>
                  {skuBadge.label}
                </Text>
              </View>
            </View>

            <View style={[styles.specRow, { borderBottomColor: "transparent" }]}>
              <Text style={[styles.specKey, { color: colors.textSecondary }]}>Approved At</Text>
              <Text style={[styles.specVal, { color: colors.textPrimary }]}>
                {formatDate(listing?.approved_at)}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Fullscreen Image Preview Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setShowImageModal(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {imageUrl && (
            <Image
              source={{ uri: imageUrl }}
              style={styles.modalFullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Stock Edit Modal */}
      <Modal
        visible={showStockModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => !isUpdatingStock && setShowStockModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.stockModalBox, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Update Stock Quantity</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Enter current available stock for SKU #{listing?.seller_sku || sku?.sku || sku?.id}:
            </Text>

            <TextInput
              style={[
                styles.stockInput,
                {
                  backgroundColor: colors.backgroundAlt,
                  color: colors.textPrimary,
                  borderColor: colors.borderLight,
                },
              ]}
              keyboardType="number-pad"
              value={stockInputValue}
              onChangeText={setStockInputValue}
              placeholder="e.g. 50"
              placeholderTextColor={colors.textSecondary}
              autoFocus={true}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn, { borderColor: colors.borderLight }]}
                onPress={() => setShowStockModal(false)}
                disabled={isUpdatingStock}
              >
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn, { backgroundColor: COLORS.primary }]}
                onPress={handleStockUpdate}
                disabled={isUpdatingStock}
              >
                {isUpdatingStock ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SkuDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "500",
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
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  scrollContent: {
    padding: 16,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.errorBgLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorBannerText: {
    color: COLORS.error,
    fontSize: 13,
    flex: 1,
    marginLeft: 8,
  },
  retryBtn: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  heroCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  imageWrapper: {
    width: "100%",
    height: 240,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  zoomHintBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  zoomHintText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "500",
  },
  heroDetails: {
    padding: 16,
  },
  galleryThumbsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  galleryThumbItem: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 8,
  },
  galleryThumbImg: {
    width: "100%",
    height: "100%",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  activeTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: 6,
  },
  variantNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  variantNameText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  skuCodesCard: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  codeItem: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  codeValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  codeDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 12,
  },
  rejectionBanner: {
    flexDirection: "row",
    backgroundColor: COLORS.errorBgLight,
    borderWidth: 1,
    borderColor: COLORS.error + "40",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  rejectionTitle: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  rejectionReason: {
    color: COLORS.error,
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },
  salePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  salePillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  priceLarge: {
    fontSize: 22,
    fontWeight: "800",
  },
  priceStrikethrough: {
    fontSize: 16,
    textDecorationLine: "line-through",
    fontWeight: "600",
  },
  editStockBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editStockBtnText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  stockGrid: {
    flexDirection: "row",
    gap: 12,
  },
  stockBox: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
  },
  stockBoxLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 4,
  },
  stockBoxValue: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  stockStatusSub: {
    fontSize: 11,
    fontWeight: "600",
  },
  specsList: {
    marginTop: 2,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  specKey: {
    fontSize: 13,
  },
  specVal: {
    fontSize: 13,
    fontWeight: "600",
  },
  inlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inlineBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  flexOne: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  modalFullImage: {
    width: SCREEN_WIDTH - 20,
    height: "80%",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  stockModalBox: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  stockInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  modalCancelBtn: {
    borderWidth: 1,
  },
  modalSaveBtn: {},
  modalBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
