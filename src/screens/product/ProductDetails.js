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
import { getSellerProductDetails, deleteSellerProduct, updateProductStock } from "../../api/auth";
import { CustomAlert } from "../../context/AlertContext";

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
    uri = img.trim();
  } else if (typeof img === "object") {
    uri = img.image_url || img.url || img.path || img.src || img.uri || null;
    if (typeof uri !== "string") return null;
    uri = uri.trim();
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

export const getProductImages = (prod) => {
  if (!prod) return [];
  const list = [];

  const addImage = (rawImg) => {
    const formatted = normalizeImageUrl(rawImg);
    if (formatted && !list.includes(formatted)) {
      list.push(formatted);
    }
  };

  if (prod.image_url) addImage(prod.image_url);
  if (prod.image) addImage(prod.image);
  if (prod.thumbnail) addImage(prod.thumbnail);
  if (prod.featured_image) addImage(prod.featured_image);

  const rawGallery = prod.gallery || prod.images || prod.product_images || prod.gallery_images;

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
    route.params?.product_id ||
    route.params?.id ||
    initialProduct?.product_id ||
    initialProduct?.id ||
    initialProduct?.productId;

  const [product, setProduct] = useState(initialProduct);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [modalImageUri, setModalImageUri] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const sliderRef = useRef(null);

  const [isLoading, setIsLoading] = useState(!initialProduct);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

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
      if (!productId) return;
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (!product) {
        setIsLoading(true);
      }
      setFetchError(null);

      try {
        const res = await getSellerProductDetails(productId);
        const data = res?.data || res?.product || res;
        if (data && typeof data === "object") {
          setProduct(data);
          const images = getProductImages(data);
          if (images.length > 0) {
            setSelectedImage(images[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load product details:", err);
        setFetchError(err?.message || "Failed to load product details");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [productId, product]
  );

  useEffect(() => {
    fetchDetails();
  }, [productId]);

  useEffect(() => {
    if (product) {
      const images = getProductImages(product);
      if (images.length > 0 && (!selectedImage || !images.includes(selectedImage))) {
        setSelectedImage(images[0]);
      }
    }
  }, [product]);

  const gotoProductEdit = () => {
    navigation.navigate("EditProduct", {
      product,
      productId: product?.product_id || product?.id,
    });
  };

  const handleDeleteProduct = () => {
    const id = product?.product_id
    const prodName = product?.name || "this product";

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
    const pId = product?.product_id
    const newQty = parseInt(stockInputValue, 10);
    if (isNaN(newQty) || newQty < 0) {
      CustomAlert.showWarning("Invalid Quantity", "Please enter a valid stock number (0 or more).");
      return;
    }

    setIsUpdatingStock(true);
    try {
      const res = await updateProductStock(pId, newQty);
      setProduct((prev) => ({
        ...prev,
        stock_quantity: res.data?.stock_quantity ?? newQty,
        in_stock: res.data?.in_stock ?? newQty > 0,
      }));
      setShowStockModal(false);
      CustomAlert.showSuccess("Stock Updated \uD83C\uDF89", res?.message || `Stock updated to ${newQty} units.`);
    } catch (err) {
      console.warn("Stock update failed:", err?.message);
      CustomAlert.showError("Update Failed", err?.message || "Failed to update stock.");
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const statusInfo = getStatusBadge(product?.approval_status || product?.status);
  const categoryName = product?.category?.name || product?.category || "General";
  const regularPrice = Number(product?.price || 0);
  const salePrice = product?.sale_price ? Number(product.sale_price) : null;
  const currentPrice = salePrice && salePrice > 0 ? salePrice : regularPrice;
  const hasDiscount = salePrice && regularPrice > salePrice;
  const discountPercent = hasDiscount
    ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
    : 0;
  const stock = product?.stock_quantity ?? product?.stock ?? 0;
  const isOutOfStock = stock <= 0;

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
          {product?.name || "Product Details"}
        </Text>

        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.backgroundAlt }]}
          onPress={gotoProductEdit}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Error state */}
      {fetchError && product && (
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
            const allImages = getProductImages(product);
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
                  {product?.name || "Product Name"}
                </Text>

                {product?.sku ? (
                  <Text style={[styles.productSku, { color: colors.textSecondary }]}>
                    SKU: {product.sku}
                  </Text>
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
              { title: "Product ID", value: `#${product?.product_id || "-"}` },
              { title: "Category", value: categoryName },
              { title: "SKU", value: product?.sku || "N/A" },
              { title: "Slug", value: product?.slug || "N/A" },
              { title: "Weight", value: product?.weight ? `${product.weight} kg` : "N/A" },
              { title: "Stock Available", value: `${stock} units` },
              { title: "Approval Status", value: statusInfo.label },
            ].map((item, index) => (
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

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.editButton, { backgroundColor: COLORS.primary }]}
              onPress={gotoProductEdit}
            >
              <Ionicons name="create-outline" size={18} color={COLORS.textContrast} />
              <Text style={styles.actionText}>Edit Product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.stockButton, { backgroundColor: COLORS.warning }]}
              onPress={handleStockEdit}
            >
              <Ionicons name="layers-outline" size={18} color={COLORS.textContrast} />
              <Text style={styles.actionText}>Update Stock</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.deleteButton}
            onPress={handleDeleteProduct}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            <Text style={styles.deleteActionText}>Delete Product</Text>
          </TouchableOpacity>
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
});