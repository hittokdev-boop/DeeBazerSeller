import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  StatusBar,
  ActivityIndicator,
  PermissionsAndroid,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { CustomAlert } from "../../context/AlertContext";
import { updateSellerProduct, getSellerProductDetails, getSellerCategories } from "../../api/auth";

const PRESET_CATEGORIES = [
  { id: 1, name: "Electronics & Gadgets" },
  { id: 2, name: "Fashion & Apparel" },
  { id: 3, name: "Grocery & Gourmet" },
  { id: 4, name: "Health & Beauty" },
  { id: 5, name: "Home & Kitchen" },
  { id: 6, name: "Sports & Outdoors" },
  { id: 7, name: "Toys & Games" },
  { id: 8, name: "Handmade Crafts" },
  { id: 9, name: "Automotive" },
  { id: 10, name: "Books & Stationery" },
];

const EditProduct = ({ route, navigation }) => {
  const routeProduct = route.params?.product || null;
  // Note: API returns product_id rather than id
  const productId =
    routeProduct?.product_id ||
    route.params?.productId ||
    routeProduct?.id;

  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoriesList, setCategoriesList] = useState(PRESET_CATEGORIES);

  // Form fields
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [minStockAlert, setMinStockAlert] = useState("5");
  const [sku, setSku] = useState("");
  const [weight, setWeight] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Image Field 1: Primary Main Image
  const [existingMainImageUri, setExistingMainImageUri] = useState(null);
  const [newMainImage, setNewMainImage] = useState(null);

  // Image Field 2: Product Image Details (Gallery Photos from API & New)
  const [existingGalleryImages, setExistingGalleryImages] = useState([]);
  const [newGalleryImages, setNewGalleryImages] = useState([]);

  useEffect(() => {
    fetchCategories();
    // 1. If product data is passed in route params, pre-fill immediately
    if (routeProduct) {
      populateForm(routeProduct);
    }
    // 2. Fetch full fresh product details from API to get all gallery images and latest fields
    if (productId) {
      loadProduct(productId);
    } else {
      setLoading(false);
    }
  }, [productId]);

  const fetchCategories = async () => {
    try {
      const res = await getSellerCategories();
      const cats = res?.data || res?.categories || res;
      if (Array.isArray(cats) && cats.length > 0) setCategoriesList(cats);
    } catch {}
  };

  const populateForm = (p) => {
    if (!p) return;
    setName(p.name || "");
    setCategoryId(p.category_id || p.category?.id || null);
    setCategoryName(p.category?.name || (typeof p.category === "string" ? p.category : ""));
    setPrice(String(p.price !== undefined && p.price !== null ? p.price : ""));
    setSalePrice(String(p.sale_price !== undefined && p.sale_price !== null ? p.sale_price : ""));
    setStockQuantity(String(p.stock_quantity ?? p.quantity ?? p.stock ?? ""));
    setMinStockAlert(String(p.min_stock_alert ?? "5"));
    setSku(p.sku || "");
    setWeight(String(p.weight !== undefined && p.weight !== null ? p.weight : ""));
    setShortDescription(p.short_description || "");
    setDescription(p.description || "");

    const rawTags = p.tags || [];
    setTags(rawTags.map((t) => (typeof t === "string" ? t : t?.name || "")).filter(Boolean));

    // 1. Primary image from API
    const primary = p.image_url || p.image || null;
    if (primary) {
      setExistingMainImageUri(primary);
    }

    // 2. Product Image Details (Gallery photos) from API
    const rawGallery = p.gallery || p.images || p.product_images || p.gallery_images || [];
    if (Array.isArray(rawGallery) && rawGallery.length > 0) {
      const urls = rawGallery
        .map((img) => (typeof img === "string" ? img : img?.url || img?.image_url || img?.image))
        .filter(Boolean);
      setExistingGalleryImages(urls);
    }
  };

  const loadProduct = async (idToFetch) => {
    try {
      if (!routeProduct) setLoading(true);
      const res = await getSellerProductDetails(idToFetch);
      const p = res?.data || res?.product || res;
      if (p) {
        populateForm(p);
      }
    } catch (err) {
      console.warn("Failed to load full product details from API:", err);
      if (!routeProduct) {
        CustomAlert.showError("Error", err.message || "Failed to load product");
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== "android") return true;
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
        title: "Camera Permission",
        message: "This app needs access to your camera to take product photos.",
        buttonNegative: "Cancel",
        buttonPositive: "OK",
      });
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  };

  // --- Primary Image Handlers ---
  const handlePickPrimaryImage = () => {
    CustomAlert.alert("Primary Product Image", "Choose source for the main product photo (max 4MB)", [
      {
        text: "Camera",
        onPress: async () => {
          const hasPerm = await requestCameraPermission();
          if (!hasPerm) {
            CustomAlert.showWarning("Permission Required", "Camera permission is needed to take product photos.");
            return;
          }
          launchCamera({ mediaType: "photo", quality: 0.8 }, (response) => {
            if (!response.didCancel && response.assets && response.assets.length > 0) {
              const asset = response.assets[0];
              setNewMainImage({
                uri: asset.uri,
                type: asset.type || "image/jpeg",
                fileName: asset.fileName || `product_main_${Date.now()}.jpg`,
              });
            }
          });
        },
      },
      {
        text: "Gallery",
        onPress: () => {
          launchImageLibrary({ mediaType: "photo", quality: 0.8 }, (response) => {
            if (!response.didCancel && response.assets && response.assets.length > 0) {
              const asset = response.assets[0];
              setNewMainImage({
                uri: asset.uri,
                type: asset.type || "image/jpeg",
                fileName: asset.fileName || `product_main_${Date.now()}.jpg`,
              });
            }
          });
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // --- Product Image Details (Gallery Photos) Handlers ---
  const handlePickGalleryImages = () => {
    CustomAlert.alert("Product Image Details", "Choose source for additional product detail photos", [
      {
        text: "Camera",
        onPress: async () => {
          const hasPerm = await requestCameraPermission();
          if (!hasPerm) {
            CustomAlert.showWarning("Permission Required", "Camera permission is needed to take product photos.");
            return;
          }
          launchCamera({ mediaType: "photo", quality: 0.8 }, (response) => {
            if (!response.didCancel && response.assets && response.assets.length > 0) {
              const asset = response.assets[0];
              setNewGalleryImages((prev) => [
                ...prev,
                {
                  uri: asset.uri,
                  type: asset.type || "image/jpeg",
                  fileName: asset.fileName || `detail_${Date.now()}.jpg`,
                },
              ]);
            }
          });
        },
      },
      {
        text: "Gallery",
        onPress: () => {
          launchImageLibrary({ mediaType: "photo", quality: 0.8, selectionLimit: 5 }, (response) => {
            if (!response.didCancel && response.assets && response.assets.length > 0) {
              const newAssets = response.assets.map((asset, index) => ({
                uri: asset.uri,
                type: asset.type || "image/jpeg",
                fileName: asset.fileName || `detail_${Date.now()}_${index}.jpg`,
              }));
              setNewGalleryImages((prev) => [...prev, ...newAssets]);
            }
          });
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleRemoveExistingGalleryImage = (index) => {
    setExistingGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewGalleryImage = (index) => {
    setNewGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    const t = currentTag.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (index) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Note: Use product_id for updating
    const targetProductId =
      routeProduct?.product_id ||
      productId ||
      routeProduct?.id;

    if (!targetProductId) {
      CustomAlert.showError("Error", "Product ID (product_id) not found.");
      return;
    }

    if (!name.trim()) {
      CustomAlert.showWarning("Validation", "Product name is required.");
      return;
    }
    if (!price.trim() || isNaN(Number(price))) {
      CustomAlert.showWarning("Validation", "Valid base price is required.");
      return;
    }
    if (!stockQuantity.trim() || isNaN(Number(stockQuantity))) {
      CustomAlert.showWarning("Validation", "Valid stock quantity is required.");
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("price", String(Number(price)));
      if (salePrice && !isNaN(Number(salePrice))) {
        formData.append("sale_price", String(Number(salePrice)));
      }
      formData.append("stock_quantity", String(parseInt(stockQuantity, 10)));
      formData.append("min_stock_alert", String(parseInt(minStockAlert, 10) || 5));
      if (categoryId) formData.append("category_id", String(categoryId));
      if (sku) formData.append("sku", sku.trim());
      if (weight) formData.append("weight", String(weight));
      if (shortDescription) formData.append("short_description", shortDescription.trim());
      if (description) formData.append("description", description.trim());

      tags.forEach((tag) => formData.append("tags[]", tag));

      // 1. Primary Image File
      if (newMainImage && newMainImage.uri) {
        const file = {
          uri: Platform.OS === "android" ? newMainImage.uri : newMainImage.uri.replace("file://", ""),
          type: newMainImage.type || "image/jpeg",
          name: newMainImage.fileName || `product_main_${Date.now()}.jpg`,
        };
        formData.append("image", file);
      }

      // 2. Product Image Details (Gallery Files)
      if (newGalleryImages && newGalleryImages.length > 0) {
        newGalleryImages.forEach((img, idx) => {
          const file = {
            uri: Platform.OS === "android" ? img.uri : img.uri.replace("file://", ""),
            type: img.type || "image/jpeg",
            name: img.fileName || `gallery_${Date.now()}_${idx}.jpg`,
          };
          formData.append("gallery[]", file);
        });
      }

      const res = await updateSellerProduct(targetProductId, formData);
      CustomAlert.showSuccess("Success", res?.message || "Product updated successfully!", () => {
        navigation.goBack();
      });
    } catch (err) {
      CustomAlert.showError("Error", err.message || "Failed to update product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading product details...</Text>
      </View>
    );
  }

  const displayPrimaryUri = newMainImage?.uri || existingMainImageUri;
  const totalGalleryCount = existingGalleryImages.length + newGalleryImages.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.background === "#090D16" ? "light-content" : "dark-content"}
        backgroundColor={colors.cardBg}
        translucent
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.cardBg,
            borderBottomColor: colors.borderLight,
            paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 8 : 52,
          },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 8 }}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Product</Text>
          {productId ? (
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              Product ID: #{productId}
            </Text>
          ) : null}
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
      >
        {/* ========================================================================= */}
        {/* 1. PRIMARY IMAGE FIELD */}
        {/* ========================================================================= */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Primary Image</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Main product cover photo displayed in lists and cards
              </Text>
            </View>
            {newMainImage && (
              <TouchableOpacity
                onPress={() => setNewMainImage(null)}
                style={[styles.revertBtn, { backgroundColor: colors.backgroundAlt }]}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-undo-outline" size={13} color={colors.textSecondary} />
                <Text style={[styles.revertBtnText, { color: colors.textSecondary }]}>Revert</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.primaryImagePicker,
              { backgroundColor: colors.backgroundAlt, borderColor: colors.borderMedium },
            ]}
            onPress={handlePickPrimaryImage}
            activeOpacity={0.85}
          >
            {displayPrimaryUri ? (
              <Image source={{ uri: displayPrimaryUri }} style={styles.primaryImagePreview} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={38} color={colors.textMuted} />
                <Text style={[styles.imagePlaceholderText, { color: colors.textMuted }]}>
                  Tap to upload primary image
                </Text>
              </View>
            )}
            <View style={[styles.changeImageOverlay, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={styles.changeImageText}>
                {displayPrimaryUri ? "Change Primary Photo" : "Upload Photo"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ========================================================================= */}
        {/* 2. PRODUCT IMAGE DETAILS (GALLERY PHOTOS) FIELD */}
        {/* ========================================================================= */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Product Image Details
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Detail photos fetched from API & additional uploads ({totalGalleryCount})
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.addDetailBtn, { backgroundColor: colors.primary }]}
              onPress={handlePickGalleryImages}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addDetailBtnText}>Add Photo</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
            {/* Quick Add Button Tile */}
            <TouchableOpacity
              style={[
                styles.addGalleryTile,
                { borderColor: colors.primary, backgroundColor: colors.primaryBgLight || "#EFF6FF" },
              ]}
              onPress={handlePickGalleryImages}
              activeOpacity={0.7}
            >
              <Ionicons name="images-outline" size={24} color={colors.primary} />
              <Text style={[styles.addGalleryTileText, { color: colors.primary }]}>+ Add</Text>
            </TouchableOpacity>

            {/* Existing Detail Photos from API */}
            {existingGalleryImages.map((uri, idx) => (
              <View key={`existing-${idx}`} style={[styles.galleryCard, { backgroundColor: colors.backgroundAlt }]}>
                <Image source={{ uri }} style={styles.galleryCardImg} resizeMode="cover" />
                <View style={styles.badgeContainer}>
                  <View style={[styles.badge, { backgroundColor: "rgba(30, 41, 59, 0.85)" }]}>
                    <Text style={styles.badgeText}>API</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => handleRemoveExistingGalleryImage(idx)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={13} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Newly Uploaded Detail Photos */}
            {newGalleryImages.map((item, idx) => (
              <View key={`new-${idx}`} style={[styles.galleryCard, { backgroundColor: colors.backgroundAlt }]}>
                <Image source={{ uri: item.uri }} style={styles.galleryCardImg} resizeMode="cover" />
                <View style={styles.badgeContainer}>
                  <View style={[styles.badge, { backgroundColor: COLORS.success || "#10B981" }]}>
                    <Text style={styles.badgeText}>New</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => handleRemoveNewGalleryImage(idx)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={13} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {totalGalleryCount === 0 && (
            <Text style={[styles.emptyGalleryNote, { color: colors.textMuted }]}>
              No detail photos uploaded yet. Tap "+ Add Photo" to upload extra product angles.
            </Text>
          )}
        </View>

        {/* Basic Info */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Basic Information</Text>

          <FormField label="Product Name *" colors={colors}>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderMedium }]}
              value={name}
              onChangeText={setName}
              placeholder="Enter product name"
              placeholderTextColor={colors.textMuted}
            />
          </FormField>

          <FormField label="Category" colors={colors}>
            <TouchableOpacity
              style={[styles.input, styles.selector, { borderColor: colors.borderMedium }]}
              onPress={() => setShowCategoryModal(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.selectorText, { color: categoryName ? colors.textPrimary : colors.textMuted }]}>
                {categoryName || "Select category"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </FormField>

          <FormField label="SKU" colors={colors}>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderMedium }]}
              value={sku}
              onChangeText={setSku}
              placeholder="e.g. PROD-001"
              placeholderTextColor={colors.textMuted}
            />
          </FormField>
        </View>

        {/* Pricing */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pricing</Text>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <FormField label="Price (₹) *" colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderMedium }]}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </FormField>
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Sale Price (₹)" colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderMedium }]}
                  value={salePrice}
                  onChangeText={setSalePrice}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </FormField>
            </View>
          </View>
        </View>

        {/* Inventory */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Inventory</Text>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <FormField label="Stock Qty *" colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderMedium }]}
                  value={stockQuantity}
                  onChangeText={setStockQuantity}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </FormField>
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <FormField label="Min Alert" colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderMedium }]}
                  value={minStockAlert}
                  onChangeText={setMinStockAlert}
                  placeholder="5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </FormField>
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Weight (kg)" colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderMedium }]}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="0.0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </FormField>
            </View>
          </View>
        </View>

        {/* Tags */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tags</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.input, { flex: 1, color: colors.textPrimary, borderColor: colors.borderMedium }]}
              value={currentTag}
              onChangeText={setCurrentTag}
              placeholder="Add tag"
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={handleAddTag}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addTagBtn, { backgroundColor: colors.primaryBgLight || "#EFF6FF" }]}
              onPress={handleAddTag}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag, i) => (
                <View key={i} style={[styles.tag, { backgroundColor: colors.primaryBgLight || "#EFF6FF" }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>#{tag}</Text>
                  <TouchableOpacity onPress={() => handleRemoveTag(i)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                    <Ionicons name="close" size={13} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Description */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Description</Text>
          <FormField label="Short Description" colors={colors}>
            <TextInput
              style={[styles.input, styles.textArea, { color: colors.textPrimary, borderColor: colors.borderMedium }]}
              value={shortDescription}
              onChangeText={setShortDescription}
              placeholder="Brief summary..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </FormField>
          <FormField label="Full Description" colors={colors}>
            <TextInput
              style={[styles.input, styles.textAreaLarge, { color: colors.textPrimary, borderColor: colors.borderMedium }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Detailed description..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </FormField>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: isSubmitting ? colors.primaryDark : colors.primary }]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Category Modal */}
      {showCategoryModal && (
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {categoriesList.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryRow,
                    { borderBottomColor: colors.borderLight },
                    categoryId === cat.id && { backgroundColor: colors.primaryBgLight || "#EFF6FF" },
                  ]}
                  onPress={() => {
                    setCategoryId(cat.id);
                    setCategoryName(cat.name);
                    setShowCategoryModal(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.categoryRowText, { color: categoryId === cat.id ? colors.primary : colors.textPrimary }]}>
                    {cat.name}
                  </Text>
                  {categoryId === cat.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

const FormField = ({ label, children, colors }) => (
  <View style={styles.formField}>
    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, fontWeight: "500" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerSubtitle: { fontSize: 12, marginTop: 1 },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },
  revertBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  revertBtnText: { fontSize: 11, fontWeight: "600" },
  primaryImagePicker: {
    height: 190,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryImagePreview: { width: "100%", height: "100%" },
  imagePlaceholder: { alignItems: "center", gap: 8 },
  imagePlaceholderText: { fontSize: 13 },
  changeImageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    gap: 6,
  },
  changeImageText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  addDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addDetailBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  galleryScroll: {
    marginTop: 4,
    paddingVertical: 4,
  },
  addGalleryTile: {
    width: 82,
    height: 82,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    gap: 4,
  },
  addGalleryTileText: { fontSize: 11, fontWeight: "700" },
  galleryCard: {
    width: 82,
    height: 82,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 10,
    position: "relative",
  },
  galleryCardImg: { width: "100%", height: "100%" },
  badgeContainer: {
    position: "absolute",
    bottom: 4,
    left: 4,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  removePhotoBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyGalleryNote: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic",
  },
  row: { flexDirection: "row" },
  formField: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorText: { fontSize: 14 },
  textArea: { height: 80 },
  textAreaLarge: { height: 130 },
  tagInputRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  addTagBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 4,
  },
  tagText: { fontSize: 12, fontWeight: "600" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 6,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  categoryRowText: { fontSize: 15 },
});

export default EditProduct;
