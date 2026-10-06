import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { getSellerProductDetails, getSellerProducts, deleteSellerProduct, updateSkuStock, isTechnicalError } from "../../api/auth";
import { CustomAlert } from "../../context/AlertContext";
import { groupProductsByMasterProduct } from "./Products";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDER_WIDTH = SCREEN_WIDTH - 32;

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return "₹0.00";
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "";
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

const stripHtml = (html) => {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

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

export const getProductImages = (prod, currentSku = null) => {
  if (!prod) return [];
  const list = [];

  const addImage = (rawImg) => {
    const formatted = normalizeImageUrl(rawImg);
    if (formatted && !list.includes(formatted)) {
      list.push(formatted);
    }
  };

  // 1. If a specific active SKU is passed, prioritize ONLY its images
  if (currentSku) {
    if (currentSku.image_url) addImage(currentSku.image_url);
    if (currentSku.image) addImage(currentSku.image);
    if (Array.isArray(currentSku.images)) {
      currentSku.images.forEach((img) => addImage(img));
    }
  }

  // 2. Direct SKU images if prod itself is an SKU object
  if (prod.sku?.image_url && (!currentSku || prod.sku.id === currentSku.id)) {
    addImage(prod.sku.image_url);
  }
  if (prod.sku?.image && (!currentSku || prod.sku.id === currentSku.id)) {
    addImage(prod.sku.image);
  }

  // 3. If no SKU-specific images found, fallback to product level images
  if (list.length === 0) {
    if (Array.isArray(prod.images)) {
      const primaryImg = prod.images.find((img) => img?.is_primary);
      if (primaryImg) addImage(primaryImg);
    }
    if (prod.image_url) addImage(prod.image_url);
    if (prod.image) addImage(prod.image);
    if (prod.product?.image_url) addImage(prod.product.image_url);
    if (prod.product?.image) addImage(prod.product.image);
    if (prod.thumbnail) addImage(prod.thumbnail);
    if (prod.featured_image) addImage(prod.featured_image);

    const rawGallery = prod.images || prod.gallery || prod.product_images || prod.gallery_images;
    if (Array.isArray(rawGallery)) {
      rawGallery.forEach((item) => addImage(item));
    } else if (typeof rawGallery === "string" && rawGallery.trim()) {
      try {
        const parsed = JSON.parse(rawGallery);
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => addImage(item));
        } else {
          rawGallery.split(",").forEach((item) => addImage(item));
        }
      } catch (e) {
        rawGallery.split(",").forEach((item) => addImage(item));
      }
    }
  }

  // 4. Fallback if still empty
  if (list.length === 0 && Array.isArray(prod.skus) && prod.skus.length > 0) {
    const s = currentSku || prod.skus[0];
    if (s?.image_url) addImage(s.image_url);
    if (s?.image) addImage(s.image);
  }

  return list;
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

const ProductDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, isDark } = useTheme();

  const initialProduct = route.params?.product || null;
  const productId =
    route.params?.productId ||
    route.params?.id ||
    route.params?.product_id ||
    initialProduct?.id ||
    initialProduct?.productId ||
    initialProduct?.product_id;

  const [product, setProduct] = useState(initialProduct);
  const [selectedSkuIndex, setSelectedSkuIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [modalImageUri, setModalImageUri] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const sliderRef = useRef(null);

  const [isLoading, setIsLoading] = useState(!initialProduct);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Sync state if navigation opens a different product
  useEffect(() => {
    if (route.params?.product) {
      setProduct(route.params.product);
      const images = getProductImages(route.params.product);
      if (images.length > 0) {
        setSelectedImage(images[0]);
      }
      setActiveSlideIndex(0);
      setSelectedSkuIndex(0);
    }
  }, [route.params?.product, route.params?.productId, route.params?.id]);

  // Stock update modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockInputValue, setStockInputValue] = useState("");
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  const handleSliderScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    if (!slideSize) return;
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / slideSize);
    if (index >= 0 && index !== activeSlideIndex) {
      setActiveSlideIndex(index);
    }
  };

  const scrollToImageIndex = (index) => {
    setActiveSlideIndex(index);
    if (sliderRef.current) {
      try {
        sliderRef.current.scrollToIndex({ index, animated: true });
      } catch (e) {
        // Safe fallback if Layout hasn't completed
      }
    }
  };

  const fetchDetails = useCallback(
    async (isRefresh = false) => {
      const idToFetch = productId || product?.id || product?.product_id;
      if (!idToFetch && !initialProduct) return;
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (!product && !initialProduct) {
        setIsLoading(true);
      }
      setFetchError(null);

      try {
        // 1. Fetch fresh seller products list from server
        let sellerProductsList = [];
        try {
          const sellerProdRes = await getSellerProducts({ status: "all", per_page: 50 });
          sellerProductsList = sellerProdRes?.data?.products || [];
        } catch (e) {
          // ignore
        }

        // 2. Fetch specific product details (if idToFetch exists)
        let data = null;
        if (idToFetch) {
          try {
            const res = await getSellerProductDetails(idToFetch);
            data = res?.data || res?.product || res;
          } catch (e) {
            console.log("ProductDetails getSellerProductDetails err:", e?.message);
          }
        }

        setProduct((prev) => {
          const currentProd = prev || initialProduct || {};
          const prevSkus = Array.isArray(currentProd?.skus) && currentProd.skus.length > 0
            ? currentProd.skus
            : currentProd?.sku && typeof currentProd.sku === "object"
              ? [currentProd.sku]
              : [];

          const currentId = currentProd?.id || productId;
          const currentMasterId = currentProd?.product_id || currentProd?.product?.id;
          const currentSkuCodes = prevSkus.map((s) => s.code || s.sku).filter(Boolean);
          const currentSkuNames = prevSkus.map((s) => s.name || s.sku_name).filter(Boolean);
          const currentSkuIds = prevSkus.map((s) => s.id || s.seller_sku_id || s.product_sku_id || s.sku_id).filter(Boolean);

          // Group seller products list using the exact same grouping logic as Products screen
          const groupedList = groupProductsByMasterProduct(sellerProductsList);

          // Find the exact matching grouped product for this screen
          let matchedSellerProduct = null;
          if (groupedList.length > 0) {
            matchedSellerProduct = groupedList.find((gp) => {
              if (currentId && (gp.id === currentId || gp.seller_product_id === currentId)) return true;
              if (Array.isArray(gp.skus) && gp.skus.length > 0) {
                return gp.skus.some((s) => {
                  const sCode = s.code || s.sku;
                  const sName = s.name || s.sku_name;
                  const sId = s.id || s.seller_sku_id || s.product_sku_id || s.sku_id;
                  return (
                    (sCode && currentSkuCodes.includes(sCode)) ||
                    (sName && currentSkuNames.includes(sName)) ||
                    (sId && currentSkuIds.includes(sId))
                  );
                });
              }
              return false;
            });

            if (!matchedSellerProduct && currentMasterId) {
              matchedSellerProduct = groupedList.find((gp) => {
                const gpMasterId = gp.product_id || gp.product?.id;
                return gpMasterId === currentMasterId;
              });
            }
          }

          const freshGroupedSkus = Array.isArray(matchedSellerProduct?.skus) && matchedSellerProduct.skus.length > 0
            ? matchedSellerProduct.skus
            : [];

          let finalSkus = [];
          if (prevSkus.length > 0) {
            // NEVER overwrite the product's SKUs with unrelated catalog SKUs!
            // Update the existing SKUs with the latest stock/price/status from the seller's inventory.
            finalSkus = prevSkus.map((oldSku) => {
              const oldCode = oldSku.code || oldSku.sku;
              const oldName = oldSku.name || oldSku.sku_name;
              const oldId = oldSku.id || oldSku.seller_sku_id || oldSku.product_sku_id || oldSku.sku_id;

              // Check freshGroupedSkus
              const freshMatch = freshGroupedSkus.find((fs) => {
                const fsCode = fs.code || fs.sku;
                const fsName = fs.name || fs.sku_name;
                const fsId = fs.id || fs.seller_sku_id || fs.product_sku_id || fs.sku_id;
                return (
                  (fsCode && oldCode && fsCode === oldCode) ||
                  (fsName && oldName && fsName === oldName) ||
                  (fsId && oldId && fsId === oldId)
                );
              });

              // Check raw seller products list
              const rawMatch = sellerProductsList.find((sp) => {
                const spCode = sp.sku?.code || sp.sku?.sku || sp.sku_code || (typeof sp.sku === "string" ? sp.sku : null);
                const spName = sp.sku?.name || sp.sku_name || sp.name;
                const spId = sp.sku?.id || sp.sku_id || sp.product_sku_id || sp.id;
                return (
                  (spCode && oldCode && spCode === oldCode) ||
                  (spName && oldName && spName === oldName) ||
                  (spId && oldId && spId === oldId)
                );
              });

              const resolvedStock =
                freshMatch?.stock_quantity ??
                rawMatch?.stock_quantity ??
                rawMatch?.stock ??
                oldSku.stock_quantity;

              const resolvedInStock =
                freshMatch?.in_stock ??
                rawMatch?.in_stock ??
                (resolvedStock > 0);

              const resolvedPrice =
                freshMatch?.price ??
                rawMatch?.price ??
                oldSku.price;

              const resolvedSalePrice =
                freshMatch?.sale_price ??
                rawMatch?.sale_price ??
                oldSku.sale_price;

              const resolvedStatus =
                freshMatch?.approval_status ??
                freshMatch?.status ??
                rawMatch?.sku?.approval_status ??
                rawMatch?.approval_status ??
                rawMatch?.status ??
                oldSku.approval_status ??
                oldSku.status;

              return {
                ...oldSku,
                ...(freshMatch || {}),
                stock_quantity: resolvedStock,
                in_stock: resolvedInStock,
                price: resolvedPrice,
                sale_price: resolvedSalePrice,
                status: resolvedStatus,
                approval_status: resolvedStatus,
                seller_sku_id: freshMatch?.seller_sku_id || rawMatch?.id || oldSku.seller_sku_id || oldSku.id,
                seller_product_id: freshMatch?.seller_product_id || rawMatch?.id || oldSku.seller_product_id || oldSku.id,
              };
            });
          } else if (freshGroupedSkus.length > 0) {
            finalSkus = freshGroupedSkus;
          } else if (Array.isArray(data?.skus) && data.skus.length > 0) {
            finalSkus = data.skus;
          }

          // Preserve the product's images - DO NOT overwrite with master catalog logo/placeholders!
          const existingImages = getProductImages(currentProd);
          const matchedImages = matchedSellerProduct ? getProductImages(matchedSellerProduct) : [];
          const preservedImages = existingImages.length > 0 ? existingImages : (matchedImages.length > 0 ? matchedImages : (data ? getProductImages(data) : []));

          return {
            ...(data || {}),
            ...(currentProd || {}),
            ...(matchedSellerProduct || {}),
            skus: finalSkus,
            images: preservedImages.length > 0 ? preservedImages : (currentProd?.images || data?.images),
            image_url: currentProd?.image_url || matchedSellerProduct?.image_url || data?.image_url,
            name: currentProd?.name || matchedSellerProduct?.name || data?.name,
          };
        });

      } catch (err) {
        console.log("ProductDetails fetch skipped/error:", err?.message);
        if (!product && !initialProduct) {
          setFetchError(err?.message || "Failed to load product details");
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [productId, product, initialProduct]
  );

  useEffect(() => {
    if (!initialProduct && productId) {
      fetchDetails();
    }
  }, [productId]);

  useEffect(() => {
    if (product) {
      const images = getProductImages(product);
      if (images.length > 0 && (!selectedImage || !images.includes(selectedImage))) {
        setSelectedImage(images[0]);
      }
    }
  }, [product]);


  const handleDeleteProduct = () => {
    const id = product?.id || product?.product_id;
    const prodName = productName || "this product";

    CustomAlert.showConfirm(
      "Delete Product",
      `Are you sure you want to delete "${prodName}"? This action cannot be undone.`,
      async () => {
        try {
          const res = await deleteSellerProduct(id);
          CustomAlert.showSuccess("Deleted 🎉", res?.message || "Product deleted successfully.", () => {
            navigation.goBack();
          });
        } catch (err) {
          console.warn("Delete product blocked:", err?.message);
          CustomAlert.showError("Cannot Delete Product", err?.message || "Failed to delete product.");
        }
      },
      () => { },
      "Delete",
      "Cancel",
      true
    );
  };

  const handleStockEdit = () => {
    const currentStock = product?.stock_quantity ?? product?.stock ?? 0;
    setStockInputValue(String(currentStock));
    setShowStockModal(true);
  };

  const handleStockUpdate = async () => {
    const newQty = parseInt(stockInputValue, 10);
    if (isNaN(newQty) || newQty < 0) {
      CustomAlert.showWarning("Invalid Quantity", "Please enter a valid stock number (0 or more).");
      return;
    }

    const targetSkuId =
      activeSku?.product_sku_id ||
      activeSku?.sku_id ||
      activeSku?.id ||
      primarySku?.product_sku_id ||
      primarySku?.sku_id ||
      primarySku?.id ||
      product?.product_sku_id ||
      product?.sku_id ||
      product?.sku?.id ||
      product?.id;

    if (!targetSkuId) {
      CustomAlert.showWarning("Missing SKU ID", "Cannot update stock: SKU ID not found.");
      return;
    }

    setIsUpdatingStock(true);
    try {
      const res = await updateSkuStock(targetSkuId, newQty);
      const updatedStock = res?.data?.stock_quantity ?? newQty;
      const updatedInStock = res?.data?.in_stock ?? updatedStock > 0;
      setProduct((prev) => {
        const targetIdx = selectedSkuIndex >= 0 ? selectedSkuIndex : 0;
        const updatedSkus = Array.isArray(prev?.skus)
          ? prev.skus.map((s, idx) => (idx === targetIdx ? { ...s, stock_quantity: updatedStock, in_stock: updatedInStock } : s))
          : prev?.skus;
        return {
          ...prev,
          total_stock: updatedStock,
          stock_quantity: updatedStock,
          in_stock: updatedInStock,
          skus: updatedSkus,
        };
      });
      setShowStockModal(false);
      CustomAlert.showSuccess("Stock Updated 🎉", res?.message || `Stock updated to ${newQty} units.`);
    } catch (err) {
      console.warn("Stock update failed:", err?.message);
      CustomAlert.showError("Update Failed", err?.message || "Failed to update stock.");
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const primarySku = Array.isArray(product?.skus) && product.skus.length > 0 ? product.skus[0] : null;

  const rawStatus =
    product?.sku?.approval_status ||
    product?.approval_status ||
    primarySku?.approval_status ||
    product?.sku?.status ||
    product?.status ||
    primarySku?.status ||
    "approved";
  const statusInfo = getStatusBadge(rawStatus);

  const categoryName =
    (typeof product?.category === "string" ? product.category : product?.category?.name) ||
    (typeof product?.product?.category === "object"
      ? (product.product.category?.name || product.product.category?.title)
      : product?.product?.category) ||
    "General";

  const skusList =
    Array.isArray(product?.skus) && product.skus.length > 0
      ? product.skus
      : product?.sku && typeof product.sku === "object"
        ? [
          {
            seller_sku_id: product.id,
            product_sku_id: product.product_sku_id || product.sku_id || product.sku?.id,
            sku_id: product.sku_id || product.product_sku_id || product.sku?.id,
            name: product.sku.name || product.sku_name || (typeof product.name === "string" ? product.name : ""),
            code: product.sku.code || product.sku.sku || product.sku_code || product.sku,
            sku: product.sku.code || product.sku.sku || product.sku_code || product.sku,
            image_url: product.sku.image_url || product.image_url,
            price: product.price,
            sale_price: product.sale_price,
            stock_quantity: product.stock_quantity,
            in_stock: product.in_stock,
            status: product.status,
            approval_status: product.sku.approval_status || product.approval_status,
            attributes: product.sku.attributes || [],
          },
        ]
        : [];

  const activeSku =
    skusList.length > 0 && selectedSkuIndex >= 0 && selectedSkuIndex < skusList.length
      ? skusList[selectedSkuIndex]
      : skusList[0] || primarySku;

  const skuName =
    activeSku?.name ||
    (typeof product?.sku === "object" ? product.sku.name : "") ||
    primarySku?.name ||
    product?.sku_name;

  const parentProductName =
    product?.product?.name ||
    (typeof product?.name === "object" ? (product.name?.name || product.name?.title) : product?.name) ||
    "";

  const productName = skuName || parentProductName || "Product Details";

  const regularPrice = Number(
    activeSku?.price !== undefined && activeSku?.price !== null && activeSku?.price !== ""
      ? activeSku.price
      : product?.price !== undefined && product?.price !== null && product?.price !== ""
        ? product.price
        : (primarySku?.price || 0)
  );

  const rawSalePrice =
    activeSku?.sale_price !== undefined && activeSku?.sale_price !== null && activeSku?.sale_price !== ""
      ? activeSku.sale_price
      : product?.sale_price !== undefined && product?.sale_price !== null && product?.sale_price !== ""
        ? product.sale_price
        : primarySku?.sale_price;

  const salePrice = rawSalePrice !== undefined && rawSalePrice !== null && rawSalePrice !== "" ? Number(rawSalePrice) : null;
  const currentPrice = salePrice && salePrice > 0 ? salePrice : regularPrice;
  const hasDiscount = salePrice && regularPrice > salePrice;
  const discountPercent = hasDiscount
    ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
    : 0;

  const stock =
    activeSku?.stock_quantity !== undefined && activeSku?.stock_quantity !== null
      ? Number(activeSku.stock_quantity)
      : product?.total_stock ??
      product?.stock_quantity ??
      product?.stock ??
      (Array.isArray(product?.skus)
        ? product.skus.reduce((acc, s) => acc + (Number(s.stock_quantity) || 0), 0)
        : 0);
  const isOutOfStock = stock <= 0;

  const skuCode =
    activeSku?.code ||
    activeSku?.sku ||
    (typeof product?.sku === "object" ? (product.sku?.code || product.sku?.sku || product.sku?.name) : product?.sku) ||
    primarySku?.code ||
    null;

  // Build gallery list combining main image and gallery images
  const galleryList = [];
  if (product?.image_url) galleryList.push(product.image_url);
  if (Array.isArray(product?.gallery)) {
    product.gallery.forEach((img) => {
      if (img && !galleryList.includes(img)) {
        galleryList.push(img);
      }
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      {/* Header Bar */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {productName}
        </Text>

        <View style={{ width: 36 }} />
      </View>

      {/* Error state */}
      {fetchError && !product && !isTechnicalError(fetchError) && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
          <Text style={styles.errorBannerText}>{fetchError}</Text>
          <TouchableOpacity onPress={() => fetchDetails()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading product details...
          </Text>
        </View>
      ) : !product ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="cube-outline" size={48} color={COLORS.textSecondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Product details not found.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchDetails(true)}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* Main Product Image Slider */}
          {(() => {
            const allImages = getProductImages(product, activeSku);
            const totalImages = allImages.length;

            return (
              <>
                <View style={[styles.imageCard, { backgroundColor: colors.cardBg }]}>
                  {totalImages > 0 ? (
                    <FlatList
                      ref={sliderRef}
                      data={allImages}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      keyExtractor={(_, index) => index.toString()}
                      onScroll={handleSliderScroll}
                      scrollEventThrottle={16}
                      getItemLayout={(_, index) => ({
                        length: SLIDER_WIDTH,
                        offset: SLIDER_WIDTH * index,
                        index,
                      })}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          activeOpacity={0.95}
                          onPress={() => {
                            setModalImageUri(item);
                            setShowImageModal(true);
                          }}
                          style={{ width: SLIDER_WIDTH, height: 280, justifyContent: 'center', alignItems: 'center' }}
                        >
                          <Image
                            source={{ uri: item }}
                            style={styles.mainImage}
                          />
                        </TouchableOpacity>
                      )}
                    />
                  ) : (
                    <View style={styles.noImagePlaceholder}>
                      <Ionicons name="image-outline" size={60} color={colors.textSecondary} />
                      <Text style={[styles.noImageText, { color: colors.textSecondary }]}>
                        No image available
                      </Text>
                    </View>
                  )}

                  {hasDiscount && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>{discountPercent}% OFF</Text>
                    </View>
                  )}

                  {/* Image Counter Badge */}
                  {totalImages > 1 && (
                    <View style={styles.imageCountBadge}>
                      <Ionicons name="images-outline" size={12} color="#FFFFFF" />
                      <Text style={styles.imageCountText}>
                        {activeSlideIndex + 1} / {totalImages}
                      </Text>
                    </View>
                  )}

                  {/* Pagination Dots */}
                  {totalImages > 1 && (
                    <View style={styles.paginationDotsContainer}>
                      {allImages.map((_, i) => (
                        <TouchableOpacity
                          key={i}
                          onPress={() => scrollToImageIndex(i)}
                          style={[
                            styles.dot,
                            i === activeSlideIndex ? styles.dotActive : styles.dotInactive,
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </View>

                {/* Interactive Image Gallery Thumbnails */}
                {totalImages > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.galleryContainer}
                  >
                    {allImages.map((imgUri, index) => {
                      const isSelected = activeSlideIndex === index;
                      return (
                        <TouchableOpacity
                          key={index}
                          activeOpacity={0.85}
                          onPress={() => scrollToImageIndex(index)}
                          style={[
                            styles.galleryItem,
                            {
                              borderColor: isSelected ? COLORS.primary : colors.borderLight,
                              borderWidth: isSelected ? 2.5 : 1,
                            },
                          ]}
                        >
                          <Image source={{ uri: imgUri }} style={styles.galleryImage} />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            );
          })()}

          {/* Variant Selector Chips */}
          {skusList.length > 1 && (
            <View style={[styles.variantSelectorCard, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
              <View style={styles.variantSelectorHeader}>
                <Ionicons name="layers-outline" size={15} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.variantSelectorTitle, { color: colors.textPrimary }]}>
                  Select Variant ({skusList.length}):
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.variantChipsRow}>
                {skusList.map((skuItem, idx) => {
                  const isSelected = selectedSkuIndex === idx;
                  const vStock = skuItem.stock_quantity ?? 0;
                  return (
                    <TouchableOpacity
                      key={skuItem.seller_sku_id || skuItem.product_sku_id || idx}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedSkuIndex(idx);
                        setActiveSlideIndex(0);
                        if (sliderRef.current) {
                          try {
                            sliderRef.current.scrollToIndex({ index: 0, animated: false });
                          } catch (e) {}
                        }
                      }}
                      style={[
                        styles.variantChipBtn,
                        {
                          backgroundColor: isSelected ? COLORS.primary : colors.backgroundAlt,
                          borderColor: isSelected ? COLORS.primary : colors.borderLight,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.variantChipBtnText,
                          { color: isSelected ? "#FFFFFF" : colors.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {skuItem.name || `Variant #${idx + 1}`}
                      </Text>
                      <View
                        style={[
                          styles.variantChipStockBadge,
                          { backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : colors.borderLight },
                        ]}
                      >
                        <Text
                          style={[
                            styles.variantChipStockText,
                            { color: isSelected ? "#FFFFFF" : colors.textSecondary },
                          ]}
                        >
                          {vStock}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Main Info Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.topRow}>
              <View style={styles.flex1}>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusInfo.text }]}>
                    {statusInfo.label.toUpperCase()}
                  </Text>
                </View>

                <Text style={[styles.productName, { color: colors.textPrimary }]}>
                  {productName}
                </Text>

                {parentProductName && parentProductName !== productName ? (
                  <Text style={[styles.parentProductSubtitle, { color: colors.textSecondary }]}>
                    Product: <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>{parentProductName}</Text>
                  </Text>
                ) : null}

                {skuCode ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      const currentTargetSku = activeSku || primarySku;
                      const sId =
                        currentTargetSku?.seller_sku_id ||
                        currentTargetSku?.seller_product_id ||
                        currentTargetSku?.id ||
                        product?.id;

                      const sName =
                        (typeof currentTargetSku?.sku === "object" && currentTargetSku.sku?.name ? currentTargetSku.sku.name : null) ||
                        currentTargetSku?.name ||
                        currentTargetSku?.sku_name ||
                        skuName ||
                        parentProductName;

                      const sCode =
                        (typeof currentTargetSku?.sku === "object" ? (currentTargetSku.sku?.code || currentTargetSku.sku?.sku) : null) ||
                        currentTargetSku?.code ||
                        currentTargetSku?.sku ||
                        skuCode;

                      const sImg =
                        (typeof currentTargetSku?.sku === "object" ? currentTargetSku.sku?.image_url : null) ||
                        currentTargetSku?.image_url ||
                        currentTargetSku?.image ||
                        product?.image_url;

                      const sStock =
                        currentTargetSku?.stock_quantity !== undefined
                          ? Number(currentTargetSku.stock_quantity)
                          : stock;

                      const sRegularPrice =
                        currentTargetSku?.price !== undefined
                          ? Number(currentTargetSku.price)
                          : regularPrice;

                      const sSalePrice =
                        currentTargetSku?.sale_price !== undefined
                          ? Number(currentTargetSku.sale_price)
                          : salePrice;

                      const sStatus =
                        (typeof currentTargetSku?.sku === "object" ? currentTargetSku.sku?.approval_status : null) ||
                        currentTargetSku?.approval_status ||
                        currentTargetSku?.status ||
                        product?.approval_status;

                      const sSellerProductId =
                        currentTargetSku?.seller_sku_id ||
                        currentTargetSku?.seller_product_id ||
                        product?.id;

                      if (sId) {
                        navigation.navigate("SkuDetails", {
                          skuId: sId,
                          skuData: {
                            listing: {
                              id: sSellerProductId,
                              price: sRegularPrice,
                              sale_price: sSalePrice,
                              stock_quantity: sStock,
                              in_stock: currentTargetSku?.in_stock !== undefined ? currentTargetSku.in_stock : !isOutOfStock,
                              status: sStatus,
                            },
                            sku: {
                              id: sId,
                              code: sCode,
                              sku: sCode,
                              name: sName,
                              image_url: sImg,
                              approval_status: sStatus,
                              attributes: currentTargetSku?.attributes || [],
                              weight: currentTargetSku?.weight ?? currentTargetSku?.sku?.weight ?? product?.weight,
                              dimensions: currentTargetSku?.dimensions ?? currentTargetSku?.sku?.dimensions ?? product?.dimensions,
                              length: currentTargetSku?.length ?? currentTargetSku?.sku?.length ?? product?.length,
                              width: currentTargetSku?.width ?? currentTargetSku?.sku?.width ?? product?.width,
                              height: currentTargetSku?.height ?? currentTargetSku?.sku?.height ?? product?.height,
                            },
                            product: {
                              id: product?.product?.id || product?.id,
                              name: parentProductName || product?.name,
                              category: categoryName,
                            },
                            seller_product_id: sSellerProductId,
                          },
                        });
                      }
                    }}
                  >
                    <Text style={[styles.productSku, { color: colors.textSecondary }]}>
                      SKU: <Text style={{ color: COLORS.primary, fontWeight: "600" }}>{skuCode}</Text>
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View
                style={[
                  styles.stockBadge,
                  {
                    backgroundColor: isOutOfStock ? COLORS.errorBgLight : COLORS.successBgLight,
                  },
                ]}
              >
                <Ionicons
                  name={isOutOfStock ? "alert-circle" : "checkmark-circle"}
                  size={16}
                  color={isOutOfStock ? COLORS.error : COLORS.success}
                />
                <Text
                  style={[
                    styles.stockText,
                    { color: isOutOfStock ? COLORS.error : COLORS.success },
                  ]}
                >
                  {isOutOfStock ? "Out of Stock" : `Stock: ${stock}`}
                </Text>
              </View>
            </View>

            {/* Category & Tags Row */}
            <View style={styles.metaRow}>
              <View style={[styles.metaBadge, { backgroundColor: colors.backgroundAlt }]}>
                <Ionicons name="folder-outline" size={14} color={COLORS.primary} />
                <Text style={[styles.metaBadgeText, { color: colors.textPrimary }]}>
                  {categoryName}
                </Text>
              </View>

              {product?.weight !== undefined && product?.weight !== null && (
                <View style={[styles.metaBadge, { backgroundColor: colors.backgroundAlt }]}>
                  <Ionicons name="barbell-outline" size={14} color={COLORS.menuContact} />
                  <Text style={[styles.metaBadgeText, { color: colors.textPrimary }]}>
                    {product.weight} kg
                  </Text>
                </View>
              )}

              {product?.created_at && (
                <View style={[styles.metaBadge, { backgroundColor: colors.backgroundAlt }]}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.metaBadgeText, { color: colors.textSecondary }]}>
                    {formatDate(product.created_at)}
                  </Text>
                </View>
              )}
            </View>

            {/* Short Description */}
            {product?.short_description ? (
              <View style={styles.shortDescBox}>
                <Text style={[styles.shortDescText, { color: colors.textSecondary }]}>
                  {product.short_description}
                </Text>
              </View>
            ) : null}

            {/* Tags */}
            {Array.isArray(product?.tags) && product.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {product.tags.map((tag, i) => (
                  <View key={i} style={[styles.tagPill, { backgroundColor: colors.backgroundAlt }]}>
                    <Text style={[styles.tagText, { color: colors.textSecondary }]}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Pricing Card */}
          <View style={[styles.priceCard, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pricing & Profit</Text>

            <View style={styles.priceGrid}>
              <View style={[styles.priceBox, { backgroundColor: colors.backgroundAlt }]}>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Selling Price</Text>
                <Text style={[styles.priceValue, { color: COLORS.primary }]}>
                  {formatCurrency(currentPrice)}
                </Text>
              </View>

              <View style={[styles.priceBox, { backgroundColor: colors.backgroundAlt }]}>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Original MRP</Text>
                <Text style={[styles.priceValue, { color: colors.textPrimary }]}>
                  {formatCurrency(regularPrice)}
                </Text>
              </View>
            </View>

            {hasDiscount && (
              <View style={[styles.discountSummaryRow, { backgroundColor: COLORS.successBgLight }]}>
                <Ionicons name="pricetag" size={16} color={COLORS.success} />
                <Text style={styles.discountSummaryText}>
                  Discount: {discountPercent}% off (Save {formatCurrency(regularPrice - salePrice)})
                </Text>
              </View>
            )}
          </View>

          {/* Variants & SKUs Section */}
          {skusList.length > 0 && (
            <View style={[styles.variantsCard, { backgroundColor: colors.cardBg }]}>
              <View style={styles.variantsHeader}>
                <View style={styles.variantsHeaderLeft}>
                  <Ionicons name="git-branch-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                    Variants & SKUs
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={[styles.variantCountPill, { backgroundColor: colors.backgroundAlt }]}>
                    <Text style={[styles.variantCountText, { color: COLORS.primary }]}>
                      {skusList.length} {skusList.length === 1 ? "Variant" : "Variants"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.addVariantHeaderBtn, { backgroundColor: isDark ? "#1e293b" : "#EFF6FF" }]}
                    onPress={() => {
                      const prodObj = {
                        id: product?.product?.id || product?.id,
                        name: parentProductName || productName || product?.name,
                      };
                      navigation.navigate("AddSku", {
                        initialTab: "new_variant",
                        preselectedProduct: prodObj,
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={14} color={COLORS.primary} />
                    <Text style={[styles.addVariantHeaderBtnText, { color: COLORS.primary }]}>+ Variant</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.skuList}>
                {skusList.map((skuItem, idx) => {
                  const skuImg = normalizeImageUrl(skuItem.image_url || skuItem.image);
                  const skuStock = skuItem.stock_quantity ?? 0;
                  const skuInStock = skuItem.in_stock !== undefined ? skuItem.in_stock : skuStock > 0;
                  const skuRegularPrice = Number(skuItem.price || 0);
                  const skuSalePrice = skuItem.sale_price ? Number(skuItem.sale_price) : null;
                  const skuFinalPrice = skuSalePrice && skuSalePrice > 0 ? skuSalePrice : skuRegularPrice;
                  const skuStatus = getStatusBadge(skuItem.approval_status || skuItem.status);

                  return (
                    <TouchableOpacity
                      key={skuItem.seller_sku_id || skuItem.product_sku_id || idx}
                      activeOpacity={0.7}
                      style={[
                        styles.skuItemCard,
                        {
                          backgroundColor: colors.backgroundAlt,
                          borderColor: colors.borderLight,
                        },
                      ]}
                      onPress={() => {
                        const targetSkuId =
                          skuItem?.seller_sku_id ||
                          skuItem?.seller_product_id ||
                          skuItem?.id ||
                          (typeof skuItem?.sku === "object" && skuItem.sku?.id ? skuItem.sku.id : null) ||
                          skuItem?.product_sku_id ||
                          skuItem?.sku_id;

                        const sCode =
                          (typeof skuItem?.sku === "object" ? (skuItem.sku?.code || skuItem.sku?.sku) : "") ||
                          skuItem?.code ||
                          skuItem?.sku ||
                          "";

                        const sName =
                          (typeof skuItem?.sku === "object" ? skuItem.sku?.name : "") ||
                          skuItem?.name ||
                          skuItem?.sku_name ||
                          parentProductName ||
                          `Variant #${idx + 1}`;

                        const sImg =
                          (typeof skuItem?.sku === "object" ? skuItem.sku?.image_url : null) ||
                          skuItem?.image_url ||
                          skuItem?.image ||
                          product?.image_url;

                        const sStock =
                          skuItem?.stock_quantity !== undefined ? Number(skuItem.stock_quantity) : 0;

                        const sStatus =
                          (typeof skuItem?.sku === "object" ? skuItem.sku?.approval_status : null) ||
                          skuItem?.approval_status ||
                          skuItem?.status ||
                          product?.approval_status;

                        const sellerProdId =
                          skuItem?.seller_sku_id ||
                          skuItem?.id ||
                          product?.id;

                        navigation.navigate("SkuDetails", {
                          skuId: targetSkuId,
                          skuData: {
                            listing: {
                              id: sellerProdId,
                              price: skuItem?.price !== undefined ? skuItem.price : product?.price,
                              sale_price: skuItem?.sale_price !== undefined ? skuItem.sale_price : product?.sale_price,
                              stock_quantity: sStock,
                              in_stock: skuItem?.in_stock !== undefined ? skuItem.in_stock : (sStock > 0),
                              status: sStatus,
                            },
                            sku: {
                              id: targetSkuId,
                              code: sCode,
                              sku: sCode,
                              name: sName,
                              image_url: sImg,
                              approval_status: sStatus,
                              attributes: skuItem?.attributes || skuItem?.sku?.attributes || [],
                              weight: skuItem?.weight ?? skuItem?.sku?.weight ?? product?.weight,
                              dimensions: skuItem?.dimensions ?? skuItem?.sku?.dimensions ?? product?.dimensions,
                              length: skuItem?.length ?? skuItem?.sku?.length ?? product?.length,
                              width: skuItem?.width ?? skuItem?.sku?.width ?? product?.width,
                              height: skuItem?.height ?? skuItem?.sku?.height ?? product?.height,
                            },
                            product: {
                              id: product?.product?.id || product?.id,
                              name: parentProductName || product?.name,
                              category: categoryName,
                            },
                            seller_product_id: sellerProdId,
                          },
                        });
                      }}
                    >
                      {/* SKU Image Thumbnail */}
                      <View style={[styles.skuImgBox, { backgroundColor: colors.cardBg }]}>
                        {skuImg ? (
                          <Image source={{ uri: skuImg }} style={styles.skuThumb} resizeMode="cover" />
                        ) : (
                          <Ionicons name="cube-outline" size={24} color={colors.textSecondary} />
                        )}
                      </View>

                      {/* SKU Information */}
                      <View style={styles.skuContent}>
                        <View style={styles.skuRowTop}>
                          <Text style={[styles.skuName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {skuItem.name || `Variant #${idx + 1}`}
                          </Text>
                          <View style={[styles.skuStatusPill, { backgroundColor: skuStatus.bg }]}>
                            <Text style={[styles.skuStatusText, { color: skuStatus.text }]}>
                              {skuStatus.label}
                            </Text>
                          </View>
                        </View>

                        {skuItem.code ? (
                          <Text style={[styles.skuCode, { color: colors.textSecondary }]}>
                            SKU: <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>{skuItem.code}</Text>
                          </Text>
                        ) : null}

                        <View style={styles.skuRowBottom}>
                          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                            <Text style={[styles.skuPrice, { color: COLORS.primary }]}>
                              {formatCurrency(skuFinalPrice)}
                            </Text>
                            {skuSalePrice && skuRegularPrice > skuSalePrice ? (
                              <Text style={[styles.skuOriginalPrice, { color: colors.textSecondary }]}>
                                {formatCurrency(skuRegularPrice)}
                              </Text>
                            ) : null}
                          </View>

                          <View
                            style={[
                              styles.skuStockPill,
                              {
                                backgroundColor: skuInStock ? COLORS.successBgLight : COLORS.errorBgLight,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.skuStockText,
                                { color: skuInStock ? COLORS.success : COLORS.error },
                              ]}
                            >
                              {skuInStock ? `${skuStock} in stock` : "Out of stock"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[
                  styles.addVariantBottomBtn,
                  { backgroundColor: isDark ? "#1e293b" : "#EFF6FF", borderColor: COLORS.primaryLight },
                ]}
                onPress={() => {
                  const prodObj = {
                    id: product?.product?.id || product?.id,
                    name: parentProductName || productName || product?.name,
                  };
                  navigation.navigate("AddSku", {
                    initialTab: "new_variant",
                    preselectedProduct: prodObj,
                  });
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="add-circle-outline" size={17} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.addVariantBottomBtnText, { color: COLORS.primary }]}>
                  Add New Variant SKU
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {skusList.length === 0 && (
            <View style={[styles.variantsCard, { backgroundColor: colors.cardBg }]}>
              <View style={styles.variantsHeader}>
                <View style={styles.variantsHeaderLeft}>
                  <Ionicons name="git-branch-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                    Variants & SKUs
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
                No variants listed yet for this product.
              </Text>
              <TouchableOpacity
                style={[
                  styles.addVariantBottomBtn,
                  { backgroundColor: isDark ? "#1e293b" : "#EFF6FF", borderColor: COLORS.primaryLight },
                ]}
                onPress={() => {
                  const prodObj = {
                    id: product?.product?.id || product?.id,
                    name: parentProductName || productName || product?.name,
                  };
                  navigation.navigate("AddSku", {
                    initialTab: "new_variant",
                    preselectedProduct: prodObj,
                  });
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="add-circle-outline" size={17} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.addVariantBottomBtnText, { color: COLORS.primary }]}>
                  + Add First Variant SKU
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Full Description Card */}
          {(product?.description || product?.short_description) && (
            <View style={[styles.descriptionCard, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Description</Text>
              <Text style={[styles.descriptionText, { color: colors.textPrimary }]}>
                {stripHtml(product?.description) || product?.short_description}
              </Text>
            </View>
          )}

          {/* Specifications / Attributes */}
          <View style={[styles.specificationCard, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Product Details</Text>

            {[
              { title: "Product ID", value: `#${product?.product?.id || product?.id || "-"}` },
              { title: "Product Name", value: parentProductName && parentProductName !== productName ? parentProductName : null },
              { title: "Category", value: categoryName },
              { title: "SKU Name", value: skuName || productName },
              { title: "Primary SKU", value: skuCode || "N/A" },
              { title: "Total Variants", value: `${skusList.length || 1} Variant(s)` },
              { title: "Slug", value: product?.slug || product?.product?.slug || null },
              { title: "Weight", value: product?.weight !== undefined && product?.weight !== null ? `${product.weight} kg` : null },
              { title: "Stock Available", value: `${stock} units` },
              { title: "Approval Status", value: statusInfo.label },
            ]
              .filter((item) => item.value !== null)
              .map((item, index) => (
                <View
                  key={index}
                  style={[styles.specificationRow, { borderBottomColor: colors.borderLight }]}
                >
                  <Text style={[styles.specificationTitle, { color: colors.textSecondary }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.specificationValue, { color: colors.textPrimary }]}>
                    {item.value}
                  </Text>
                </View>
              ))}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* Stock Update Modal */}
      <Modal visible={showStockModal} transparent animationType="fade" onRequestClose={() => setShowStockModal(false)}>
        <View style={styles.stockModalOverlay}>
          <TouchableOpacity style={styles.stockDismiss} activeOpacity={1} onPress={() => setShowStockModal(false)} />
          <View style={[styles.stockModalCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.stockIconRing}>
              <Ionicons name="layers" size={28} color={COLORS.warning} />
            </View>
            <Text style={[styles.stockModalTitle, { color: colors.textPrimary }]}>Update Stock</Text>
            <Text style={[styles.stockModalSub, { color: colors.textSecondary }]} numberOfLines={1}>
              {product?.name || "Product"}
            </Text>

            <TextInput
              style={[styles.stockInput, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
              value={stockInputValue}
              onChangeText={setStockInputValue}
              keyboardType="numeric"
              placeholder="Enter stock quantity"
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
                  <Text style={styles.stockSaveText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-Screen Image Preview Modal */}
      <Modal visible={showImageModal} transparent animationType="fade" onRequestClose={() => setShowImageModal(false)}>
        <View style={styles.fullImageModalOverlay}>
          <TouchableOpacity
            style={styles.fullImageCloseBtn}
            onPress={() => setShowImageModal(false)}
          >
            <Ionicons name="close-circle" size={36} color="#FFFFFF" />
          </TouchableOpacity>
          {modalImageUri && (
            <Image
              source={{ uri: modalImageUri }}
              style={styles.fullImageModalContent}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

export default ProductDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundAlt,
    paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0),
  },
  scrollContent: {
    paddingBottom: 60,
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    flex: 1,
    marginHorizontal: 12,
  },
  backBtn: {
    padding: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.errorBgLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.error,
    marginLeft: 8,
  },
  retryBtn: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryBtnText: {
    color: COLORS.textContrast,
    fontSize: 12,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  imageCard: {
    margin: 16,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: COLORS.cardBg,
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    position: "relative",
  },
  mainImage: {
    width: "100%",
    height: 280,
    resizeMode: "contain",
  },
  discountBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountBadgeText: {
    color: COLORS.textContrast,
    fontSize: 12,
    fontWeight: "800",
  },
  galleryContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  galleryItem: {
    marginRight: 10,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.cardBg,
  },
  galleryImage: {
    width: 65,
    height: 65,
    resizeMode: "cover",
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    elevation: 2,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  flex1: {
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  productName: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  productSku: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  parentProductSubtitle: {
    marginTop: 2,
    fontSize: 13,
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stockText: {
    marginLeft: 5,
    fontWeight: "700",
    fontSize: 12,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metaBadgeText: {
    marginLeft: 5,
    fontWeight: "600",
    fontSize: 12,
  },
  shortDescBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  shortDescText: {
    fontSize: 13,
    lineHeight: 18,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    gap: 6,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  priceCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  priceGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  priceBox: {
    width: "48%",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  priceValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: "800",
  },
  discountSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  discountSummaryText: {
    marginLeft: 6,
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "700",
  },
  descriptionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 20,
  },
  specificationCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
  },
  specificationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  specificationTitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  specificationValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  actionRow: {
    marginHorizontal: 16,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    paddingVertical: 14,
    elevation: 3,
  },
  actionText: {
    color: COLORS.textContrast,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  deleteButton: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorBgLight,
  },
  deleteActionText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  stockButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    paddingVertical: 14,
    elevation: 3,
  },
  stockModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  stockDismiss: {
    ...StyleSheet.absoluteFillObject,
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
  stockIconRing: {
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
  stockModalSub: {
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
  noImagePlaceholder: {
    width: "100%",
    height: 280,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.backgroundAlt,
  },
  noImageText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "500",
  },
  imageCountBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  imageCountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  paginationDotsContainer: {
    position: "absolute",
    bottom: 12,
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  dot: {
    borderRadius: 4,
  },
  dotActive: {
    width: 18,
    height: 6,
    backgroundColor: COLORS.primary,
  },
  dotInactive: {
    width: 6,
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
  },
  fullImageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.94)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImageCloseBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 35,
    right: 20,
    zIndex: 20,
    padding: 6,
  },
  fullImageModalContent: {
    width: "100%",
    height: "85%",
  },
  variantsCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
  },
  variantsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  variantsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  variantCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  variantCountText: {
    fontSize: 12,
    fontWeight: "700",
  },
  skuList: {
    gap: 10,
  },
  skuItemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  skuImgBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  skuThumb: {
    width: "100%",
    height: "100%",
  },
  skuContent: {
    flex: 1,
    marginLeft: 12,
  },
  skuRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skuName: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    marginRight: 6,
  },
  skuStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skuStatusText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  skuCode: {
    fontSize: 12,
    marginTop: 2,
  },
  skuRowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  skuPrice: {
    fontSize: 14,
    fontWeight: "800",
  },
  skuOriginalPrice: {
    fontSize: 11,
    textDecorationLine: "line-through",
    marginLeft: 6,
  },
  skuStockPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  skuStockText: {
    fontSize: 11,
    fontWeight: "700",
  },
  variantSelectorCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  variantSelectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  variantSelectorTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  variantChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  variantChipBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  variantChipBtnText: {
    fontSize: 12,
    fontWeight: "700",
    marginRight: 6,
  },
  variantChipStockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  variantChipStockText: {
    fontSize: 10,
    fontWeight: "800",
  },
  addVariantHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  addVariantHeaderBtnText: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 2,
  },
  addVariantBottomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  addVariantBottomBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
});