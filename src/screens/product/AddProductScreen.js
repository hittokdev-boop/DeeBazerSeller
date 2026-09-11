import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Platform,
  StatusBar,
  PermissionsAndroid,
  ActivityIndicator,
  Modal,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { CustomAlert } from "../../context/AlertContext";
import { createSellerProduct, getSellerCategories } from "../../api/auth";

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

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return "₹0.00";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
};

const AddProduct = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();

  // Categories list (fallback to PRESET_CATEGORIES)
  const [categoriesList, setCategoriesList] = useState(PRESET_CATEGORIES);

  // Form State
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [subCategoryId, setSubCategoryId] = useState(null);
  const [childCategoryId, setChildCategoryId] = useState(null);
  const [brandId, setBrandId] = useState(null);
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [minStockAlert, setMinStockAlert] = useState("5");
  const [sku, setSku] = useState("");
  const [weight, setWeight] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");

  // Tags
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState("");

  // Media
  const [mainImage, setMainImage] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);

  // UI state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedProduct, setSubmittedProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCats = async () => {
      const serverCats = await getSellerCategories();
      if (isMounted && serverCats && Array.isArray(serverCats) && serverCats.length > 0) {
        setCategoriesList(serverCats);
      }
    };
    fetchCats();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (route?.params?.newImage) {
      if (!mainImage) {
        setMainImage({ uri: route.params.newImage, type: "image/jpeg", fileName: "main.jpg" });
      } else {
        setGalleryImages((prev) => [
          ...prev,
          { uri: route.params.newImage, type: "image/jpeg", fileName: `gallery_${Date.now()}.jpg` },
        ]);
      }
    }
  }, [route?.params?.newImage]);

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

  const handlePickMainImage = () => {
    CustomAlert.alert("Upload Main Product Image", "Choose source for main photo (max 4MB)", [
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
              setMainImage({
                uri: asset.uri,
                type: asset.type || "image/jpeg",
                fileName: asset.fileName || `product_${Date.now()}.jpg`,
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
              setMainImage({
                uri: asset.uri,
                type: asset.type || "image/jpeg",
                fileName: asset.fileName || `product_${Date.now()}.jpg`,
              });
            }
          });
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handlePickGalleryImage = () => {
    CustomAlert.alert("Add Additional Photos", "Choose source for product gallery", [
      {
        text: "Camera",
        onPress: async () => {
          const hasPerm = await requestCameraPermission();
          if (!hasPerm) return;
          launchCamera({ mediaType: "photo", quality: 0.8 }, (response) => {
            if (!response.didCancel && response.assets && response.assets.length > 0) {
              const asset = response.assets[0];
              setGalleryImages((prev) => [
                ...prev,
                {
                  uri: asset.uri,
                  type: asset.type || "image/jpeg",
                  fileName: asset.fileName || `gallery_${Date.now()}.jpg`,
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
                fileName: asset.fileName || `gallery_${Date.now()}_${index}.jpg`,
              }));
              setGalleryImages((prev) => [...prev, ...newAssets]);
            }
          });
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleAddTag = () => {
    const cleanTag = currentTag.trim().replace(/^#/, "");
    if (!cleanTag) return;
    if (tags.includes(cleanTag)) {
      CustomAlert.showWarning("Duplicate Tag", "This tag already exists.");
      return;
    }
    setTags((prev) => [...prev, cleanTag]);
    setCurrentTag("");
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleSelectCategory = (cat) => {
    setCategoryId(cat.id);
    setCategoryName(cat.name);
    setShowCategoryModal(false);
  };

  const resetForm = () => {
    setName("");
    setCategoryId(null);
    setCategoryName("");
    setPrice("");
    setSalePrice("");
    setStockQuantity("");
    setMinStockAlert("5");
    setSku("");
    setWeight("");
    setShortDescription("");
    setDescription("");
    setTags([]);
    setCurrentTag("");
    setMainImage(null);
    setGalleryImages([]);
    setShowSuccessModal(false);
  };

  const handleSubmit = async () => {
    // 1. Validation
    if (!name.trim()) {
      CustomAlert.showWarning("Required Field", "Please enter the product name.");
      return;
    }
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      CustomAlert.showWarning("Invalid Price", "Please enter a valid product base price.");
      return;
    }
    if (salePrice.trim()) {
      if (isNaN(Number(salePrice)) || Number(salePrice) <= 0) {
        CustomAlert.showWarning("Invalid Sale Price", "Please enter a valid numeric sale price.");
        return;
      }
      if (Number(salePrice) >= Number(price)) {
        CustomAlert.showWarning("Sale Price Error", "Sale price must be less than regular base price.");
        return;
      }
    }
    if (!stockQuantity.trim() || isNaN(Number(stockQuantity)) || Number(stockQuantity) < 0) {
      CustomAlert.showWarning("Required Field", "Please enter a valid stock quantity.");
      return;
    }
    if (!categoryId) {
      CustomAlert.showWarning("Required Field", "Please select a category for this product.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();

      // Core Required Fields
      formData.append("name", name.trim());
      formData.append("price", String(Number(price)));
      formData.append("stock_quantity", String(parseInt(stockQuantity, 10)));
      formData.append("category_id", String(categoryId));
      formData.append("status", "active");

      // Optional Category & Brand IDs
      if (subCategoryId) {
        formData.append("sub_category_id", String(subCategoryId));
      }
      if (childCategoryId) {
        formData.append("child_category_id", String(childCategoryId));
      }
      if (brandId) {
        formData.append("brand_id", String(brandId));
      }

      // Optional Fields
      if (salePrice.trim()) {
        formData.append("sale_price", String(Number(salePrice)));
      }
      if (minStockAlert.trim()) {
        formData.append("min_stock_alert", String(parseInt(minStockAlert, 10) || 5));
      }
      if (sku.trim()) {
        formData.append("sku", sku.trim());
      }
      if (weight.trim() && !isNaN(Number(weight))) {
        formData.append("weight", String(Number(weight)));
      }
      if (shortDescription.trim()) {
        formData.append("short_description", shortDescription.trim());
      }
      if (description.trim()) {
        formData.append("description", description.trim());
      }

      // Tags array: tags[]=tag1&tags[]=tag2
      if (tags.length > 0) {
        tags.forEach((tag) => {
          formData.append("tags[]", tag);
        });
      }

      // Helper to format image for multipart file upload
      const formatFileForUpload = (imgObj, defaultName = "product.jpg") => {
        if (!imgObj || !imgObj.uri) return null;
        const uri = imgObj.uri;
        if (typeof uri !== "string" || uri.startsWith("http://") || uri.startsWith("https://")) {
          return null; // Remote URLs cannot be read as local files
        }
        return {
          uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
          type: imgObj.type || "image/jpeg",
          name: imgObj.fileName || imgObj.name || defaultName,
        };
      };

      // Main Image File
      if (mainImage && mainImage.uri) {
        const mainFile = formatFileForUpload(mainImage, `product_${Date.now()}.jpg`);
        if (mainFile) {
          formData.append("image", mainFile);
        }
      }

      // Gallery Images Files
      if (galleryImages.length > 0) {
        galleryImages.forEach((img, index) => {
          const galleryFile = formatFileForUpload(img, `gallery_${Date.now()}_${index}.jpg`);
          if (galleryFile) {
            formData.append("gallery[]", galleryFile);
          }
        });
      }



      const res = await createSellerProduct(formData);
      // console.log("🎉 [AddProduct] API Success Response:", res);

      const createdProductData = res.data || {
        name: name.trim(),
        price: Number(price),
        sale_price: salePrice ? Number(salePrice) : null,
        stock_quantity: Number(stockQuantity),
        category: { id: categoryId, name: categoryName },
        image_url: mainImage?.uri,
        status: "active",
        approval_status: "pending",
      };

      setSubmittedProduct(createdProductData);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Product submission failed:", err);
      CustomAlert.showError("Submission Failed", err.message || "Failed to create product. Please check the inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateToProducts = () => {
    setShowSuccessModal(false);
    navigation.navigate("SellerTabs", {
      screen: "Products",
      params: {
        newlyAddedProduct: submittedProduct,
        timestamp: Date.now(),
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Add New Product</Text>
        <TouchableOpacity
          style={styles.aiStudioBtn}
          onPress={() => navigation.navigate("AIProductStudio")}
        >
          <Ionicons name="sparkles" size={16} color={COLORS.primary} />
          <Text style={styles.aiStudioText}>AI Studio</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Main Image & Gallery Upload */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Main Product Photo *</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            High-quality primary image for the catalog (Max 4MB)
          </Text>

          {mainImage ? (
            <View style={styles.mainImageWrapper}>
              <Image source={{ uri: mainImage.uri }} style={styles.mainImagePreview} />
              <TouchableOpacity style={styles.removeMainImgBtn} onPress={() => setMainImage(null)}>
                <Ionicons name="trash-outline" size={16} color={COLORS.textContrast} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.mainUploadBox} onPress={handlePickMainImage}>
              <Ionicons name="camera-outline" size={38} color={COLORS.primary} />
              <Text style={styles.mainUploadText}>Tap to Select Primary Image</Text>
              <Text style={styles.mainUploadSubtext}>JPEG, PNG up to 4MB</Text>
            </TouchableOpacity>
          )}

          {/* Additional Gallery Photos */}
          <Text style={[styles.galleryTitle, { color: colors.textPrimary }]}>Additional Gallery Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
            <TouchableOpacity style={styles.addGalleryBox} onPress={handlePickGalleryImage}>
              <Ionicons name="add" size={26} color={COLORS.primary} />
              <Text style={styles.addGalleryText}>Add</Text>
            </TouchableOpacity>

            {galleryImages.map((img, index) => (
              <View key={index} style={styles.galleryImgWrapper}>
                <Image source={{ uri: img.uri }} style={styles.galleryImgPreview} />
                <TouchableOpacity
                  style={styles.removeGalleryBtn}
                  onPress={() => setGalleryImages((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Ionicons name="close" size={14} color={COLORS.textContrast} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Basic Information */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Basic Details</Text>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Product Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
            placeholder="e.g. Wireless Bluetooth Earbuds Pro"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Category *</Text>
          <TouchableOpacity
            style={[styles.dropdownSelector, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight }]}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={[styles.dropdownText, { color: categoryName ? colors.textPrimary : colors.textSecondary }]}>
              {categoryName || "Select Category..."}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>SKU (Optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
            placeholder="e.g. SKU-AB12CD34 (Auto-generated if empty)"
            placeholderTextColor={colors.textSecondary}
            value={sku}
            onChangeText={setSku}
          />
        </View>

        {/* Pricing & Stock */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pricing & Inventory</Text>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Base Price (₹) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
                placeholder="1299.00"
                placeholderTextColor={colors.textSecondary}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.halfField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Sale Price (₹)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
                placeholder="999.00"
                placeholderTextColor={colors.textSecondary}
                value={salePrice}
                onChangeText={setSalePrice}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Stock Quantity *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
                placeholder="50"
                placeholderTextColor={colors.textSecondary}
                value={stockQuantity}
                onChangeText={setStockQuantity}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.halfField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Min Stock Alert</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
                placeholder="5"
                placeholderTextColor={colors.textSecondary}
                value={minStockAlert}
                onChangeText={setMinStockAlert}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Weight in kg (Optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
            placeholder="0.15"
            placeholderTextColor={colors.textSecondary}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
          />
        </View>

        {/* Descriptions */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Descriptions & Content</Text>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Short Summary (Max 500 characters)
          </Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight, height: 75 }]}
            placeholder="Brief highlighted features of the product..."
            placeholderTextColor={colors.textSecondary}
            value={shortDescription}
            onChangeText={setShortDescription}
            multiline
            maxLength={500}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Full Description</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight, height: 120 }]}
            placeholder="Detailed product specifications, materials, warranty, usage..."
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        {/* Tags */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tags & Search Keywords</Text>

          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.tagInput, { backgroundColor: colors.backgroundAlt, color: colors.textPrimary, borderColor: colors.borderLight }]}
              placeholder="e.g. wireless, earbuds, anc"
              placeholderTextColor={colors.textSecondary}
              value={currentTag}
              onChangeText={setCurrentTag}
              onSubmitEditing={handleAddTag}
            />
            <TouchableOpacity style={styles.addTagBtn} onPress={handleAddTag}>
              <Ionicons name="add" size={20} color={COLORS.textContrast} />
            </TouchableOpacity>
          </View>

          {tags.length > 0 && (
            <View style={styles.tagsWrapper}>
              {tags.map((t, idx) => (
                <View key={idx} style={[styles.tagChip, { backgroundColor: COLORS.primaryBgLight }]}>
                  <Text style={[styles.tagChipText, { color: COLORS.primary }]}>#{t}</Text>
                  <TouchableOpacity onPress={() => handleRemoveTag(t)}>
                    <Ionicons name="close-circle" size={16} color={COLORS.primary} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.publishButton, isSubmitting && styles.publishButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.textContrast} size="small" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={22} color={COLORS.textContrast} />
              <Text style={styles.publishButtonText}>Submit Product for Review</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Professional Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleNavigateToProducts}
      >
        <View style={styles.successModalOverlay}>
          <View style={[styles.successModalCard, { backgroundColor: colors.cardBg }]}>
            {/* Glowing Success Icon Header */}
            <View style={styles.successIconRing}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={36} color={COLORS.textContrast} />
              </View>
            </View>

            <Text style={[styles.successModalTitle, { color: colors.textPrimary }]}>
              Product Submitted!
            </Text>
            <Text style={[styles.successModalSubtitle, { color: colors.textSecondary }]}>
              Your product has been submitted for admin verification. It will be published live in the marketplace once approved.
            </Text>

            {/* Product Summary Preview Box */}
            {submittedProduct && (
              <View style={[styles.submittedPreviewBox, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight }]}>
                <Image
                  source={{
                    uri:
                      submittedProduct.image_url ||
                      submittedProduct.image ||
                      "https://picsum.photos/300?random=10",
                  }}
                  style={styles.submittedPreviewImg}
                />
                <View style={styles.submittedPreviewInfo}>
                  <Text style={[styles.submittedPreviewName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {submittedProduct.name}
                  </Text>
                  <Text style={[styles.submittedPreviewCategory, { color: colors.textSecondary }]}>
                    {submittedProduct.category?.name || categoryName || "General"}
                  </Text>
                  <View style={styles.submittedPriceRow}>
                    <Text style={styles.submittedPreviewPrice}>
                      {formatCurrency(submittedProduct.sale_price || submittedProduct.price)}
                    </Text>
                    <View style={styles.pendingStatusPill}>
                      <Ionicons name="hourglass-outline" size={11} color={COLORS.warning} />
                      <Text style={styles.pendingStatusPillText}>Pending Review</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.viewProductsBtn}
              onPress={handleNavigateToProducts}
              activeOpacity={0.85}
            >
              <Text style={styles.viewProductsBtnText}>View in Products List</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.textContrast} style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addAnotherBtn, { borderColor: colors.borderLight }]}
              onPress={resetForm}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.addAnotherBtnText}>Add Another Product</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Category Selection Modal */}
      <Modal visible={showCategoryModal} transparent animationType="slide" onRequestClose={() => setShowCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismissArea} activeOpacity={1} onPress={() => setShowCategoryModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {categoriesList.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryItem, { borderBottomColor: colors.borderLight }]}
                    onPress={() => handleSelectCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryItemText,
                        {
                          color: isSelected ? COLORS.primary : colors.textPrimary,
                          fontWeight: isSelected ? "700" : "500",
                        },
                      ]}
                    >
                      {cat.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AddProduct;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundAlt,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0,
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  aiStudioBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryBgLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  aiStudioText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 4,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  mainUploadBox: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryBgLight,
  },
  mainUploadText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 8,
  },
  mainUploadSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  mainImageWrapper: {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
    height: 180,
  },
  mainImagePreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeMainImgBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: COLORS.error,
    padding: 6,
    borderRadius: 20,
  },
  galleryTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 10,
  },
  galleryScroll: {
    flexDirection: "row",
  },
  addGalleryBox: {
    width: 65,
    height: 65,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: COLORS.primaryBgLight,
  },
  addGalleryText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: "700",
  },
  galleryImgWrapper: {
    position: "relative",
    marginRight: 10,
  },
  galleryImgPreview: {
    width: 65,
    height: 65,
    borderRadius: 12,
  },
  removeGalleryBtn: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: "top",
  },
  dropdownSelector: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfField: {
    width: "48%",
  },
  tagInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  tagInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addTagBtn: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 10,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  tagsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  publishButton: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishButtonText: {
    color: COLORS.textContrast,
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
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
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  categoryItemText: {
    fontSize: 15,
  },
  // Professional Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  successModalCard: {
    width: "100%",
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  successIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.successBgLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.success,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: COLORS.success,
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  successModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  successModalSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 6,
  },
  submittedPreviewBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 12,
    marginTop: 18,
    borderWidth: 1,
  },
  submittedPreviewImg: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundAlt,
  },
  submittedPreviewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  submittedPreviewName: {
    fontSize: 14,
    fontWeight: "700",
  },
  submittedPreviewCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  submittedPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  submittedPreviewPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.primary,
  },
  pendingStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.warningBgLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingStatusPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.warning,
    marginLeft: 3,
  },
  viewProductsBtn: {
    width: "100%",
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  viewProductsBtnText: {
    color: COLORS.textContrast,
    fontSize: 15,
    fontWeight: "700",
  },
  addAnotherBtn: {
    width: "100%",
    height: 46,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
  },
  addAnotherBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
});