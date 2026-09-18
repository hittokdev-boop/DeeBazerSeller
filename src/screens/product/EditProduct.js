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
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { launchImageLibrary } from "react-native-image-picker";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
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
  const { productId, product: routeProduct } = route.params || {};
  const { colors } = useTheme();

  const [loading, setLoading] = useState(!routeProduct);
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
  const [mainImage, setMainImage] = useState(null);
  const [existingImageUri, setExistingImageUri] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    fetchCategories();
    if (routeProduct) {
      populateForm(routeProduct);
    } else if (productId) {
      loadProduct();
    }
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await getSellerCategories();
      const cats = res?.data || res?.categories || res;
      if (Array.isArray(cats) && cats.length > 0) setCategoriesList(cats);
    } catch {}
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      const res = await getSellerProductDetails(productId);
      const p = res?.data || res?.product || res;
      populateForm(p);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to load product");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (p) => {
    setName(p.name || "");
    setCategoryId(p.category_id || p.category?.id || null);
    setCategoryName(p.category?.name || "");
    setPrice(String(p.price || ""));
    setSalePrice(String(p.sale_price || ""));
    setStockQuantity(String(p.stock_quantity ?? p.quantity ?? ""));
    setMinStockAlert(String(p.min_stock_alert || "5"));
    setSku(p.sku || "");
    setWeight(String(p.weight || ""));
    setShortDescription(p.short_description || "");
    setDescription(p.description || "");
    const rawTags = p.tags || [];
    setTags(rawTags.map((t) => (typeof t === "string" ? t : t?.name || "")));
    setExistingImageUri(p.image || null);
  };

  const handlePickImage = async () => {
    const result = await launchImageLibrary({ mediaType: "photo", quality: 0.8 });
    if (!result.didCancel && result.assets?.length > 0) {
      setMainImage(result.assets[0]);
    }
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
    if (!name.trim()) return Alert.alert("Validation", "Product name is required.");
    if (!price.trim()) return Alert.alert("Validation", "Price is required.");
    if (!stockQuantity.trim()) return Alert.alert("Validation", "Stock quantity is required.");

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("_method", "PUT");
      formData.append("name", name.trim());
      formData.append("price", price);
      if (salePrice) formData.append("sale_price", salePrice);
      formData.append("stock_quantity", stockQuantity);
      formData.append("min_stock_alert", minStockAlert);
      if (categoryId) formData.append("category_id", categoryId);
      if (sku) formData.append("sku", sku);
      if (weight) formData.append("weight", weight);
      if (shortDescription) formData.append("short_description", shortDescription);
      if (description) formData.append("description", description);
      tags.forEach((tag) => formData.append("tags[]", tag));

      if (mainImage) {
        formData.append("image", {
          uri: mainImage.uri,
          type: mainImage.type || "image/jpeg",
          name: mainImage.fileName || "product.jpg",
        });
      }

      await updateSellerProduct(productId, formData);
      Alert.alert("Success", "Product updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to update product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const displayImageUri = mainImage?.uri || existingImageUri;

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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Product</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Image Picker */}
        <TouchableOpacity
          style={[styles.imagePicker, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderMedium }]}
          onPress={handlePickImage}
          activeOpacity={0.8}
        >
          {displayImageUri ? (
            <Image source={{ uri: displayImageUri }} style={styles.imagePreview} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.imagePlaceholderText, { color: colors.textMuted }]}>Tap to change image</Text>
            </View>
          )}
          {displayImageUri && (
            <View style={[styles.changeImageOverlay, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
              <Ionicons name="camera-outline" size={22} color="#fff" />
              <Text style={styles.changeImageText}>Change</Text>
            </View>
          )}
        </TouchableOpacity>

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
              style={[styles.addTagBtn, { backgroundColor: colors.primaryBgLight }]}
              onPress={handleAddTag}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag, i) => (
                <View key={i} style={[styles.tag, { backgroundColor: colors.primaryBgLight }]}>
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
                    categoryId === cat.id && { backgroundColor: colors.primaryBgLight },
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", marginHorizontal: 8 },
  imagePicker: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    overflow: "hidden",
    marginBottom: 14,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePreview: { width: "100%", height: "100%" },
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
    paddingVertical: 10,
    gap: 6,
  },
  changeImageText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 14 },
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
