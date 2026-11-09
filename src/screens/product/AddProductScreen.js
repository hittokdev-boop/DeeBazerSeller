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
  PermissionsAndroid,
  ActivityIndicator,
  Modal,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { CustomAlert } from "../../context/AlertContext";
import { createSellerProduct, getSellerCategories, getSubCategories, getChildCategories } from "../../api/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AddProduct = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();

  // Dynamic categories list from API
  const [categoriesList, setCategoriesList] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Form State according to API specification
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [categoryName, setCategoryName] = useState("");

  // Dynamic sub-categories list from API
  const [subCategoriesList, setSubCategoriesList] = useState([]);
  const [isLoadingSubCategories, setIsLoadingSubCategories] = useState(false);
  const [subCategoryId, setSubCategoryId] = useState(null);
  const [subCategoryName, setSubCategoryName] = useState("");
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [subCategorySearchQuery, setSubCategorySearchQuery] = useState("");

  // Dynamic child-categories list from API
  const [childCategoriesList, setChildCategoriesList] = useState([]);
  const [isLoadingChildCategories, setIsLoadingChildCategories] = useState(false);
  const [childCategoryId, setChildCategoryId] = useState(null);
  const [childCategoryName, setChildCategoryName] = useState("");
  const [showChildCategoryModal, setShowChildCategoryModal] = useState(false);
  const [childCategorySearchQuery, setChildCategorySearchQuery] = useState("");

  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");

  // Gender & Design State
  const [gender, setGender] = useState("");
  const [hasDesign, setHasDesign] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);

  const GENDER_OPTIONS = [
    { value: "men", label: "Men", icon: "man-outline" },
    { value: "women", label: "Women", icon: "woman-outline" },
    { value: "unisex", label: "Unisex", icon: "people-outline" },
    { value: "boys", label: "Boys", icon: "happy-outline" },
    { value: "girls", label: "Girls", icon: "heart-outline" },
  ];

  // Tags State
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState("");

  // Media State
  const [mainImage, setMainImage] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);

  // UI state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedProduct, setSubmittedProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCats = async () => {
    setIsLoadingCategories(true);
    try {
      const serverCats = await getSellerCategories();
      if (Array.isArray(serverCats) && serverCats.length > 0) {
        setCategoriesList(serverCats);
      }
    } catch (e) {
      console.warn("[AddProduct] Could not fetch server categories:", e?.message);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCats();
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
    CustomAlert.alert("Upload Primary Product Image", "Choose source for the main catalog photo", [
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
    if (!currentTag.trim()) return;
    // Support comma-separated tags e.g. "cotton, mes"
    const splitTags = currentTag
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter((t) => t.length > 0);

    const updated = [...tags];
    splitTags.forEach((t) => {
      if (!updated.includes(t)) {
        updated.push(t);
      }
    });
    setTags(updated);
    setCurrentTag("");
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const fetchSubCats = async (catId) => {
    if (!catId) return;
    setIsLoadingSubCategories(true);
    try {
      const list = await getSubCategories(catId);
      setSubCategoriesList(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("[AddProduct] Could not fetch sub-categories:", err?.message);
      setSubCategoriesList([]);
    } finally {
      setIsLoadingSubCategories(false);
    }
  };

  const handleSelectCategory = (cat) => {
    setCategoryId(cat.id);
    setCategoryName(cat.name);
    setShowCategoryModal(false);

    // Reset sub and child categories
    setSubCategoryId(null);
    setSubCategoryName("");
    setSubCategoriesList([]);
    setChildCategoryId(null);
    setChildCategoryName("");
    setChildCategoriesList([]);

    // Fetch sub categories
    fetchSubCats(cat.id);
  };

  const fetchChildCats = async (catId, subCatId) => {
    if (!catId || !subCatId) return;
    setIsLoadingChildCategories(true);
    try {
      const list = await getChildCategories(catId, subCatId);
      setChildCategoriesList(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("[AddProduct] Could not fetch child-categories:", err?.message);
      setChildCategoriesList([]);
    } finally {
      setIsLoadingChildCategories(false);
    }
  };

  const handleSelectSubCategory = (subCat) => {
    setSubCategoryId(subCat.id);
    setSubCategoryName(subCat.name);
    setShowSubCategoryModal(false);

    // Reset child category
    setChildCategoryId(null);
    setChildCategoryName("");
    setChildCategoriesList([]);

    // Fetch child categories
    fetchChildCats(categoryId, subCat.id);
  };

  const handleSelectChildCategory = (childCat) => {
    setChildCategoryId(childCat.id);
    setChildCategoryName(childCat.name);
    setShowChildCategoryModal(false);
  };

  const resetForm = () => {
    setName("");
    setCategoryId(null);
    setCategoryName("");
    setSubCategoryId(null);
    setSubCategoryName("");
    setSubCategoriesList([]);
    setChildCategoryId(null);
    setChildCategoryName("");
    setChildCategoriesList([]);
    setShortDescription("");
    setDescription("");
    setGender("");
    setHasDesign(false);
    setTags([]);
    setCurrentTag("");
    setMainImage(null);
    setGalleryImages([]);
    setShowSuccessModal(false);
    setSubmittedProduct(null);
  };

  const handleSubmit = async () => {
    // 1. Validation
    if (!name.trim()) {
      CustomAlert.showWarning("Required Field", "Please enter the product name.");
      return;
    }
    if (!categoryId) {
      CustomAlert.showWarning("Required Field", "Please select a category for this product.");
      return;
    }
    if (!mainImage || !mainImage.uri) {
      CustomAlert.showWarning("Required Field", "Please upload a primary product image.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();

      // Required Core Fields
      formData.append("name", name.trim());
      formData.append("category_id", String(categoryId));
      if (subCategoryId) {
        formData.append("sub_category_id", String(subCategoryId));
      }
      if (childCategoryId) {
        formData.append("child_category_id", String(childCategoryId));
      }

      // Optional Text Fields
      if (shortDescription.trim()) {
        formData.append("short_description", shortDescription.trim());
      }
      if (description.trim()) {
        formData.append("description", description.trim());
      }

      // Gender field
      if (gender) {
        formData.append("gender", gender);
      }

      // Has Design flag (1 = has design, 0 = no design)
      formData.append("has_design", hasDesign ? "1" : "0");

      // Tags array: tags[]=cotton&tags[]=mes
      if (tags.length > 0) {
        tags.forEach((tag) => {
          formData.append("tags[]", tag);
        });
      }

      // Helper to format image object for multipart/form-data
      const formatFileForUpload = (imgObj, defaultName = "product.jpg") => {
        if (!imgObj || !imgObj.uri) return null;
        const uri = imgObj.uri;
        if (typeof uri !== "string" || uri.startsWith("http://") || uri.startsWith("https://")) {
          return null;
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

      const createdProductData = {
        ...(res?.data || {}),
        name: name.trim(),
        category: { id: categoryId, name: categoryName },
        category_id: categoryId,
        category_name: categoryName,
        sub_category: subCategoryId ? { id: subCategoryId, name: subCategoryName } : null,
        sub_category_id: subCategoryId || null,
        sub_category_name: subCategoryName || null,
        child_category: childCategoryId ? { id: childCategoryId, name: childCategoryName } : null,
        child_category_id: childCategoryId || null,
        child_category_name: childCategoryName || null,
        short_description: shortDescription.trim(),
        description: description.trim(),
        tags,
        image_url: mainImage?.uri,
        status: "pending",
        approval_status: "pending",
      };

      // Persist exact category selected by seller for this product
      try {
        const key = "@seller_saved_product_categories";
        const storedStr = await AsyncStorage.getItem(key);
        const storedMap = storedStr ? JSON.parse(storedStr) : {};
        const pId = res?.data?.id || res?.product_id || createdProductData?.id;
        if (pId) {
          storedMap[String(pId)] = { id: categoryId, name: categoryName };
        }
        if (name.trim()) {
          storedMap[name.trim().toLowerCase()] = { id: categoryId, name: categoryName };
        }
        await AsyncStorage.setItem(key, JSON.stringify(storedMap));
      } catch (storageErr) {
        console.warn("Could not save product category to storage:", storageErr);
      }

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

  const filteredCategories = categoriesList.filter((cat) =>
    (cat.name || "").toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  const filteredSubCategories = subCategoriesList.filter((subCat) =>
    (subCat.name || "").toLowerCase().includes(subCategorySearchQuery.toLowerCase())
  );

  const filteredChildCategories = childCategoriesList.filter((childCat) =>
    (childCat.name || "").toLowerCase().includes(childCategorySearchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
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
        {/* Quick SKU Catalog Banner */}
        <TouchableOpacity
          style={[
            styles.skuQuickBanner,
            {
              backgroundColor: isDark ? "#1e293b" : "#EFF6FF",
              borderColor: isDark ? "#334155" : COLORS.primaryLight,
            },
          ]}
          onPress={() => navigation.navigate("AddSku")}
        >
          <View style={styles.skuBannerIconCircle}>
            <Ionicons name="flash" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.skuBannerTitle, { color: colors.textPrimary }]}>Quick Map Approved SKU</Text>
            <Text style={[styles.skuBannerSub, { color: colors.textSecondary }]}>
              Already have an approved catalog SKU? Map it directly with pricing & stock
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Section 1: Main Image & Gallery Upload */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Product Images</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Upload high-resolution images for your product (Main image required)
          </Text>

          {/* Primary Main Photo */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Primary Photo (image) *</Text>
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
          <Text style={[styles.galleryTitle, { color: colors.textPrimary, marginTop: 18 }]}>
            Additional Gallery Photos (gallery[])
          </Text>
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

        {/* Section 2: Basic Product Details */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Product Information</Text>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Product Name *</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundAlt,
                color: colors.textPrimary,
                borderColor: colors.borderLight,
              },
            ]}
            placeholder="e.g. Updated Product Name 3"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Category *</Text>
          <TouchableOpacity
            style={[
              styles.dropdownSelector,
              {
                backgroundColor: colors.backgroundAlt,
                borderColor: colors.borderLight,
              },
            ]}
            onPress={() => {
              if (categoriesList.length === 0 && !isLoadingCategories) {
                fetchCats();
              }
              setShowCategoryModal(true);
            }}
          >
            <Text style={[styles.dropdownText, { color: categoryName ? colors.textPrimary : colors.textSecondary }]}>
              {categoryName || (isLoadingCategories ? "Loading categories..." : "Select Category...")}
            </Text>
            {isLoadingCategories ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            )}
          </TouchableOpacity>

          {/* Sub Category Selector */}
          {categoryId ? (
            <>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
                Sub Category
              </Text>
              <TouchableOpacity
                style={[
                  styles.dropdownSelector,
                  {
                    backgroundColor: colors.backgroundAlt,
                    borderColor: colors.borderLight,
                  },
                ]}
                onPress={() => {
                  if (subCategoriesList.length === 0 && !isLoadingSubCategories) {
                    fetchSubCats(categoryId);
                  }
                  setShowSubCategoryModal(true);
                }}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    { color: subCategoryName ? colors.textPrimary : colors.textSecondary },
                  ]}
                >
                  {subCategoryName ||
                    (isLoadingSubCategories
                      ? "Loading sub-categories..."
                      : subCategoriesList.length === 0
                      ? "No sub-categories available"
                      : "Select Sub Category...")}
                </Text>
                {isLoadingSubCategories ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {subCategoryId ? (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setSubCategoryId(null);
                          setSubCategoryName("");
                          setChildCategoryId(null);
                          setChildCategoryName("");
                          setChildCategoriesList([]);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ marginRight: 6 }}
                      >
                        <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    ) : null}
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : null}

          {/* Child Category Selector */}
          {subCategoryId ? (
            <>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
                Child Category
              </Text>
              <TouchableOpacity
                style={[
                  styles.dropdownSelector,
                  {
                    backgroundColor: colors.backgroundAlt,
                    borderColor: colors.borderLight,
                  },
                ]}
                onPress={() => {
                  if (childCategoriesList.length === 0 && !isLoadingChildCategories) {
                    fetchChildCats(categoryId, subCategoryId);
                  }
                  setShowChildCategoryModal(true);
                }}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    { color: childCategoryName ? colors.textPrimary : colors.textSecondary },
                  ]}
                >
                  {childCategoryName ||
                    (isLoadingChildCategories
                      ? "Loading child-categories..."
                      : childCategoriesList.length === 0
                      ? "No child-categories available"
                      : "Select Child Category...")}
                </Text>
                {isLoadingChildCategories ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {childCategoryId ? (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setChildCategoryId(null);
                          setChildCategoryName("");
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ marginRight: 6 }}
                      >
                        <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    ) : null}
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        {/* Section 2b: Gender & Design Config */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Additional Settings</Text>

          {/* Gender Selector */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Gender</Text>
          <TouchableOpacity
            style={[
              styles.dropdownSelector,
              {
                backgroundColor: colors.backgroundAlt,
                borderColor: colors.borderLight,
              },
            ]}
            onPress={() => setShowGenderModal(true)}
          >
            <Text style={[styles.dropdownText, { color: gender ? colors.textPrimary : colors.textSecondary }]}>
              {gender ? GENDER_OPTIONS.find((g) => g.value === gender)?.label || gender : "Select Gender (optional)"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Gender Quick Pills */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8, gap: 8 }}>
            {GENDER_OPTIONS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: gender === g.value ? COLORS.primary : colors.borderLight,
                    backgroundColor: gender === g.value ? (isDark ? "#1e3a5f" : "#EFF6FF") : colors.backgroundAlt,
                  },
                ]}
                onPress={() => setGender(gender === g.value ? "" : g.value)}
              >
                <Ionicons
                  name={g.icon}
                  size={16}
                  color={gender === g.value ? COLORS.primary : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: gender === g.value ? "700" : "500",
                    color: gender === g.value ? COLORS.primary : colors.textSecondary,
                  }}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Has Design Toggle */}
          <View style={{ marginTop: 18 }}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
              Has Custom Design?
            </Text>
            <TouchableOpacity
              style={[
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: hasDesign ? COLORS.primary : colors.borderLight,
                  backgroundColor: hasDesign ? (isDark ? "#1e3a5f" : "#EFF6FF") : colors.backgroundAlt,
                },
              ]}
              onPress={() => setHasDesign(!hasDesign)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <Ionicons
                  name={hasDesign ? "color-palette" : "color-palette-outline"}
                  size={22}
                  color={hasDesign ? COLORS.primary : colors.textSecondary}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary }}>
                    {hasDesign ? "Design Enabled" : "No Custom Design"}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    {hasDesign
                      ? "SKU variants will require a design name (e.g. printed, embroidered)"
                      : "Enable if this product has custom print/design variants"}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  {
                    width: 46,
                    height: 26,
                    borderRadius: 13,
                    justifyContent: "center",
                    paddingHorizontal: 2,
                    backgroundColor: hasDesign ? COLORS.primary : (isDark ? "#475569" : "#CBD5E1"),
                  },
                ]}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: "#fff",
                    alignSelf: hasDesign ? "flex-end" : "flex-start",
                    elevation: 2,
                    shadowColor: "#000",
                    shadowOpacity: 0.15,
                    shadowRadius: 2,
                    shadowOffset: { width: 0, height: 1 },
                  }}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Descriptions */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Descriptions</Text>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Short Description (short_description)
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: colors.backgroundAlt,
                color: colors.textPrimary,
                borderColor: colors.borderLight,
                height: 75,
              },
            ]}
            placeholder="Brief summary e.g. Updated short description text..."
            placeholderTextColor={colors.textSecondary}
            value={shortDescription}
            onChangeText={setShortDescription}
            multiline
            maxLength={500}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Full Description (description)
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: colors.backgroundAlt,
                color: colors.textPrimary,
                borderColor: colors.borderLight,
                height: 120,
              },
            ]}
            placeholder="Detailed description e.g. Updated full description goes here..."
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        {/* Section 4: Tags */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tags (tags[])</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Add search tags (type words separated by commas e.g. "cotton, mes" and tap Add)
          </Text>

          <View style={styles.tagInputRow}>
            <TextInput
              style={[
                styles.tagInput,
                {
                  backgroundColor: colors.backgroundAlt,
                  color: colors.textPrimary,
                  borderColor: colors.borderLight,
                },
              ]}
              placeholder="e.g. cotton, mes, summer"
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

        {/* Info Note on Workflow */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: isDark ? "#1e293b" : "#F0FDF4",
              borderColor: isDark ? "#334155" : "#BBF7D0",
            },
          ]}
        >
          <Ionicons name="information-circle" size={22} color={COLORS.success} style={{ marginRight: 10 }} />
          <Text style={[styles.infoCardText, { color: isDark ? "#94a3b8" : "#166534" }]}>
            Once submitted, your product will be reviewed by admin. After approval, you can add SKU variants, pricing, and live inventory to sell it in the marketplace.
          </Text>
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

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleNavigateToProducts}
      >
        <View style={styles.successModalOverlay}>
          <View style={[styles.successModalCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.successIconRing}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={36} color={COLORS.textContrast} />
              </View>
            </View>

            <Text style={[styles.successModalTitle, { color: colors.textPrimary }]}>
              Product Submitted!
            </Text>
            <Text style={[styles.successModalSubtitle, { color: colors.textSecondary }]}>
              Product submitted for review. It will be visible once approved by admin. Then add a SKU/listing to sell it.
            </Text>

            {submittedProduct && (
              <View
                style={[
                  styles.submittedPreviewBox,
                  { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight },
                ]}
              >
                <Image
                  source={{
                    uri: submittedProduct.image_url || submittedProduct.image || null,
                  }}
                  style={styles.submittedPreviewImg}
                />
                <View style={styles.submittedPreviewInfo}>
                  <Text style={[styles.submittedPreviewName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {submittedProduct.name}
                  </Text>
                  <Text style={[styles.submittedPreviewCategory, { color: colors.textSecondary }]}>
                    {submittedProduct.category?.name || categoryName || "General"}
                    {submittedProduct.sub_category?.name || subCategoryName ? ` > ${submittedProduct.sub_category?.name || subCategoryName}` : ""}
                    {submittedProduct.child_category?.name || childCategoryName ? ` > ${submittedProduct.child_category?.name || childCategoryName}` : ""}
                  </Text>
                  <View style={styles.pendingStatusPill}>
                    <Ionicons name="hourglass-outline" size={11} color={COLORS.warning} />
                    <Text style={styles.pendingStatusPillText}>Pending Admin Review</Text>
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.viewProductsBtn}
              onPress={handleNavigateToProducts}
              activeOpacity={0.85}
            >
              <Text style={styles.viewProductsBtnText}>View in Products List</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.textContrast} style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addSkuBtn, { backgroundColor: isDark ? "#1e293b" : "#EFF6FF", borderColor: COLORS.primary }]}
              onPress={() => {

                setShowSuccessModal(false);
                navigation.navigate("AddSku", {
                  initialTab: "new_variant",
                  preselectedProduct: submittedProduct,
                  initialProductId: submittedProduct?.id,
                });
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="flash" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.addSkuBtnText, { color: COLORS.primary }]}>Go to SKU Catalog</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addAnotherBtn, { borderColor: colors.borderLight }]}
              onPress={resetForm}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.addAnotherBtnText, { color: colors.textSecondary }]}>Add Another Product</Text>
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

            {/* Category Search */}
            <View style={[styles.modalSearchBox, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight }]}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.textPrimary }]}
                placeholder="Search categories..."
                placeholderTextColor={colors.textSecondary}
                value={categorySearchQuery}
                onChangeText={setCategorySearchQuery}
              />
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {isLoadingCategories ? (
                <View style={{ padding: 32, alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={{ marginTop: 10, color: colors.textSecondary, fontSize: 13 }}>
                    Loading categories from server...
                  </Text>
                </View>
              ) : filteredCategories.length === 0 ? (
                <View style={{ padding: 32, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="alert-circle-outline" size={32} color={colors.textSecondary} />
                  <Text style={{ marginTop: 8, color: colors.textSecondary, fontSize: 13 }}>
                    {categorySearchQuery ? "No matching categories" : "No categories available"}
                  </Text>
                  <TouchableOpacity
                    style={{
                      marginTop: 12,
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      backgroundColor: COLORS.primary,
                      borderRadius: 6,
                    }}
                    onPress={fetchCats}
                  >
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredCategories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.categoryItem, { borderBottomColor: colors.borderLight }]}
                      onPress={() => {
                        handleSelectCategory(cat);
                        setCategorySearchQuery("");
                      }}
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
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sub Category Selection Modal */}
      <Modal visible={showSubCategoryModal} transparent animationType="slide" onRequestClose={() => setShowSubCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismissArea} activeOpacity={1} onPress={() => setShowSubCategoryModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Sub Category</Text>
                {categoryName ? (
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    For {categoryName}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => setShowSubCategoryModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Sub Category Search */}
            <View style={[styles.modalSearchBox, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight }]}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.textPrimary }]}
                placeholder="Search sub-categories..."
                placeholderTextColor={colors.textSecondary}
                value={subCategorySearchQuery}
                onChangeText={setSubCategorySearchQuery}
              />
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {isLoadingSubCategories ? (
                <View style={{ padding: 32, alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={{ marginTop: 10, color: colors.textSecondary, fontSize: 13 }}>
                    Loading sub-categories...
                  </Text>
                </View>
              ) : filteredSubCategories.length === 0 ? (
                <View style={{ padding: 32, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="alert-circle-outline" size={32} color={colors.textSecondary} />
                  <Text style={{ marginTop: 8, color: colors.textSecondary, fontSize: 13 }}>
                    {subCategorySearchQuery ? "No matching sub-categories" : "No sub-categories found for this category"}
                  </Text>
                  <TouchableOpacity
                    style={{
                      marginTop: 12,
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      backgroundColor: COLORS.primary,
                      borderRadius: 6,
                    }}
                    onPress={() => fetchSubCats(categoryId)}
                  >
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredSubCategories.map((subCat) => {
                  const isSelected = subCategoryId === subCat.id;
                  return (
                    <TouchableOpacity
                      key={subCat.id}
                      style={[styles.categoryItem, { borderBottomColor: colors.borderLight }]}
                      onPress={() => {
                        handleSelectSubCategory(subCat);
                        setSubCategorySearchQuery("");
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.categoryItemText,
                            {
                              color: isSelected ? COLORS.primary : colors.textPrimary,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          {subCat.name}
                        </Text>
                        {subCat.count_child_category !== undefined && (
                          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                            {subCat.count_child_category} child {subCat.count_child_category === 1 ? "category" : "categories"}
                          </Text>
                        )}
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Child Category Selection Modal */}
      <Modal visible={showChildCategoryModal} transparent animationType="slide" onRequestClose={() => setShowChildCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismissArea} activeOpacity={1} onPress={() => setShowChildCategoryModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Child Category</Text>
                {subCategoryName ? (
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    For {subCategoryName}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => setShowChildCategoryModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Child Category Search */}
            <View style={[styles.modalSearchBox, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight }]}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.textPrimary }]}
                placeholder="Search child-categories..."
                placeholderTextColor={colors.textSecondary}
                value={childCategorySearchQuery}
                onChangeText={setChildCategorySearchQuery}
              />
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {isLoadingChildCategories ? (
                <View style={{ padding: 32, alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={{ marginTop: 10, color: colors.textSecondary, fontSize: 13 }}>
                    Loading child-categories...
                  </Text>
                </View>
              ) : filteredChildCategories.length === 0 ? (
                <View style={{ padding: 32, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="alert-circle-outline" size={32} color={colors.textSecondary} />
                  <Text style={{ marginTop: 8, color: colors.textSecondary, fontSize: 13 }}>
                    {childCategorySearchQuery ? "No matching child-categories" : "No child-categories found for this sub-category"}
                  </Text>
                  <TouchableOpacity
                    style={{
                      marginTop: 12,
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      backgroundColor: COLORS.primary,
                      borderRadius: 6,
                    }}
                    onPress={() => fetchChildCats(categoryId, subCategoryId)}
                  >
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredChildCategories.map((childCat) => {
                  const isSelected = childCategoryId === childCat.id;
                  return (
                    <TouchableOpacity
                      key={childCat.id}
                      style={[styles.categoryItem, { borderBottomColor: colors.borderLight }]}
                      onPress={() => {
                        handleSelectChildCategory(childCat);
                        setChildCategorySearchQuery("");
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.categoryItemText,
                            {
                              color: isSelected ? COLORS.primary : colors.textPrimary,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          {childCat.name}
                        </Text>
                        {childCat.count_product !== undefined && (
                          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                            {childCat.count_product} {childCat.count_product === 1 ? "product" : "products"}
                          </Text>
                        )}
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                    </TouchableOpacity>
                  );
                })
              )}
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
  },
  scrollContent: {
    paddingBottom: 60,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 44) + 12,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
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
  skuQuickBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  skuBannerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  skuBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  skuBannerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
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
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryBgLight,
  },
  mainUploadText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 14,
    marginTop: 6,
  },
  mainUploadSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  mainImageWrapper: {
    position: "relative",
    width: "100%",
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
  },
  mainImagePreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeMainImgBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  galleryScroll: {
    marginTop: 8,
  },
  addGalleryBox: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryBgLight,
    marginRight: 10,
  },
  addGalleryText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: "700",
    marginTop: 2,
  },
  galleryImgWrapper: {
    position: "relative",
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: "hidden",
    marginRight: 10,
  },
  galleryImgPreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeGalleryBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
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
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownText: {
    fontSize: 14,
  },
  tagInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tagInput: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addTagBtn: {
    backgroundColor: COLORS.primary,
    width: 46,
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  tagsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    gap: 6,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  infoCardText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  publishButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 15,
    borderRadius: 12,
    elevation: 3,
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  modalSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 6,
    paddingVertical: 0,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  categoryItemText: {
    fontSize: 15,
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  successModalCard: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  successIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryBgLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  successModalSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  submittedPreviewBox: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
  },
  submittedPreviewImg: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#ccc",
  },
  submittedPreviewInfo: {
    marginLeft: 12,
    flex: 1,
  },
  submittedPreviewName: {
    fontSize: 14,
    fontWeight: "700",
  },
  submittedPreviewCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  pendingStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.warningBgLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  pendingStatusPillText: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
  },
  viewProductsBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 13,
    borderRadius: 10,
  },
  viewProductsBtnText: {
    color: COLORS.textContrast,
    fontSize: 14,
    fontWeight: "700",
  },
  addSkuBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  addSkuBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  addAnotherBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  addAnotherBtnText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
});