import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  StatusBar,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import COLORS from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { getSellerProductDetails, updateSellerProduct } from '../../api/auth';

const EditProduct = ({ navigation, route }) => {
  const productData = route?.params?.product || {};
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [images, setImages] = useState(
    productData?.image_url ? [productData.image_url] : (productData?.image ? [productData.image] : [])
  );
  const [detailImages, setDetailImages] = useState(
    productData?.gallery || productData?.images || []
  );
  const [productName, setProductName] = useState(productData?.name || '');
  const [brand, setBrand] = useState(productData?.brand?.name || '');
  const [category, setCategory] = useState(productData?.category?.name || '');
  const [price, setPrice] = useState((productData?.sale_price || productData?.price)?.toString() || '');
  const [mrp, setMrp] = useState((productData?.price || productData?.sale_price)?.toString() || '');
  const [stock, setStock] = useState(productData?.stock_quantity?.toString() || '');
  const [description, setDescription] = useState(productData?.description || productData?.short_description || '');
  const [variants, setVariants] = useState(productData?.tags || []);
  const [newVariant, setNewVariant] = useState('');
  const [fullProductData, setFullProductData] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      const productId = productData?.product_id || productData?.id;
      if (!productId) return;
      try {
        const res = await getSellerProductDetails(productId);
        if (res?.data) {
          const fullProduct = res.data;
          setFullProductData(fullProduct);
          if (fullProduct.gallery && fullProduct.gallery.length > 0) {
            setDetailImages(fullProduct.gallery);
          } else if (fullProduct.images && fullProduct.images.length > 0) {
            setDetailImages(fullProduct.images);
          }
        }
      } catch (e) {
        console.log("Failed to fetch full product details in EditProduct:", e);
      }
    };
    fetchDetails();
  }, []);

  const requestCameraPermission = async () => {
    if (Platform.OS !== "android") return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message: "DeeBazar Seller needs camera access to capture product photos.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  };

  const pickImage = () => {
    Alert.alert(
      "Product Image",
      "Choose an option to add/update product image",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            const hasPerm = await requestCameraPermission();
            if (!hasPerm) {
              Alert.alert("Permission Required", "Camera permission is needed to take product photos.");
              return;
            }
            launchCamera(
              { mediaType: 'photo', quality: 0.8, saveToPhotos: false },
              response => {
                if (!response.didCancel && response.assets) {
                  setImages(prev => [...prev, ...response.assets]);
                }
              }
            );
          }
        },
        {
          text: "Choose from Gallery",
          onPress: () => {
            launchImageLibrary(
              { mediaType: 'photo', selectionLimit: 0, quality: 0.8 },
              response => {
                if (!response.didCancel && response.assets) {
                  setImages(prev => [...prev, ...response.assets]);
                }
              }
            );
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const removeImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const pickDetailImage = () => {
    Alert.alert(
      "Product Details Image",
      "Choose an option to add/update product details image",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            const hasPerm = await requestCameraPermission();
            if (!hasPerm) {
              Alert.alert("Permission Required", "Camera permission is needed to take product photos.");
              return;
            }
            launchCamera(
              { mediaType: 'photo', quality: 0.8, saveToPhotos: false },
              response => {
                if (!response.didCancel && response.assets) {
                  setDetailImages(prev => [...prev, ...response.assets]);
                }
              }
            );
          }
        },
        {
          text: "Choose from Gallery",
          onPress: () => {
            launchImageLibrary(
              { mediaType: 'photo', selectionLimit: 0, quality: 0.8 },
              response => {
                if (!response.didCancel && response.assets) {
                  setDetailImages(prev => [...prev, ...response.assets]);
                }
              }
            );
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const removeDetailImage = (indexToRemove) => {
    setDetailImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const addVariant = () => {
    if (!newVariant.trim()) return;
    if (variants.includes(newVariant.trim())) {
      Alert.alert('Duplicate', 'This variant already exists.');
      return;
    }
    setVariants((prev) => [...prev, newVariant.trim()]);
    setNewVariant('');
  };

  const removeVariant = (variant) => {
    setVariants((prev) => prev.filter((v) => v !== variant));
  };

  const handleUpdate = async () => {
    const safeName = productName ? String(productName).trim() : '';
    const safePrice = price ? String(price).trim() : '';

    if (!safeName || !safePrice) {
      Alert.alert("Missing Details", "Product name and sale price are required.");
      return;
    }

    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append("name", safeName);
      formData.append("sale_price", safePrice);
      formData.append("price", mrp ? String(mrp).trim() : safePrice);
      formData.append("stock_quantity", stock || "0");
      formData.append("description", description);
      formData.append("short_description", description);
      const activeData = fullProductData || productData;

      formData.append("weight", activeData?.weight !== undefined && activeData?.weight !== null ? String(activeData.weight) : "");
      formData.append("min_stock_alert", activeData?.min_stock_alert !== undefined && activeData?.min_stock_alert !== null ? String(activeData.min_stock_alert) : "");

      if (activeData?.category?.id) {
        formData.append("category_id", String(activeData.category.id));
      } else if (activeData?.category_id) {
        formData.append("category_id", String(activeData.category_id));
      } else {
        // Only fallback if the backend strictly requires it and we have no data, but ideally we leave it empty or 1
        formData.append("category_id", "1");
      }

      if (variants && variants.length > 0) {
        variants.forEach(tag => {
          formData.append("tags[]", tag);
        });
      }

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

      const newImages = images.filter(img => typeof img !== 'string');
      if (newImages.length > 0) {
        const mainFile = formatFileForUpload(newImages[0], `product_image.jpg`);
        if (mainFile) {
          formData.append("image", mainFile);
        }
      }

      const newDetailImages = detailImages.filter(img => typeof img !== 'string' && !img?.image_url && !img?.image && !img?.url);
      if (newDetailImages.length > 0) {
        newDetailImages.forEach((img, index) => {
          // If it's a remote URL that got mixed in, skip it
          if (img?.uri && (img.uri.startsWith("http://") || img.uri.startsWith("https://"))) {
            return;
          }
          const galleryFile = formatFileForUpload(img, `gallery_image_${index}.jpg`);
          if (galleryFile) {
            formData.append("gallery[]", galleryFile);
          }
        });
      }

      const productId = productData?.product_id || productData?.id;
      
      // Log the exact payload for debugging
      if (formData.getParts) {
        console.log("==== UPLOAD PAYLOAD BODY ====");
        console.log(JSON.stringify(formData.getParts(), null, 2));
        console.log("=============================");
      }

      const res = await updateSellerProduct(productId, formData);

      Alert.alert(
        "Success",
        res?.message || "Product updated successfully!",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert("Update Failed", error?.message || "Could not update the product.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectCategory = () => {
    Alert.alert("Select Category", "Choose a category", [
      { text: "Electronics", onPress: () => setCategory("Electronics") },
      { text: "Clothing", onPress: () => setCategory("Clothing") },
      { text: "Home & Kitchen", onPress: () => setCategory("Home & Kitchen") },
      { text: "Sports & Outdoors", onPress: () => setCategory("Sports & Outdoors") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSelectBrand = () => {
    Alert.alert("Select Brand", "Choose a brand", [
      { text: "Apple", onPress: () => setBrand("Apple") },
      { text: "Samsung", onPress: () => setBrand("Samsung") },
      { text: "Nike", onPress: () => setBrand("Nike") },
      { text: "Generic", onPress: () => setBrand("Generic") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.backgroundAlt }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBg }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={colors.textGrayDark}
          />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textGrayDark }]}>
          Edit Product
        </Text>

        <TouchableOpacity>
          <Ionicons
            name="create-outline"
            size={24}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Images */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Product Images
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 15 }}
        >
          {images.map((item, index) => {
            const imgUri = typeof item === 'string' ? item : (item?.uri || item?.image_url || item?.image || item?.url);
            return (
            <View
              key={index}
              style={styles.imageBox}
            >
              <Image
                source={{ uri: imgUri }}
                style={styles.image}
              />
              <TouchableOpacity
                style={styles.editImageBtn}
                onPress={() => removeImage(index)}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={COLORS.textContrast}
                />
              </TouchableOpacity>
            </View>
          )})}
        </ScrollView>

        <TouchableOpacity style={styles.updateImageBtnBelow} onPress={pickImage}>
          <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
          <Text style={styles.updateImageBtnText}>Update Image</Text>
        </TouchableOpacity>
      </View>

      {/* Product Details Images */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Product Details Images
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 15 }}
        >
          {detailImages.map((item, index) => {
            const imgUri = typeof item === 'string' ? item : (item?.uri || item?.image_url || item?.image || item?.url);
            return (
            <View
              key={index}
              style={styles.imageBox}
            >
              <Image
                source={{ uri: imgUri }}
                style={styles.image}
              />
              <TouchableOpacity
                style={styles.editImageBtn}
                onPress={() => removeDetailImage(index)}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={COLORS.textContrast}
                />
              </TouchableOpacity>
            </View>
          )})}
        </ScrollView>

        <TouchableOpacity style={styles.updateImageBtnBelow} onPress={pickDetailImage}>
          <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
          <Text style={styles.updateImageBtnText}>Add Detail Images</Text>
        </TouchableOpacity>
      </View>

      {/* Product Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Basic Information
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Product Name</Text>
          <TextInput
            value={productName}
            onChangeText={setProductName}
            placeholderTextColor={COLORS.textGrayPlaceholder}
            style={styles.input}
            placeholder="Enter product name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Sale Price (₹)</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholderTextColor={COLORS.textGrayPlaceholder}
            style={styles.input}
            placeholder="Enter sale price"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>MRP / Original Price (₹)</Text>
          <TextInput
            value={mrp}
            onChangeText={setMrp}
            keyboardType="numeric"
            placeholderTextColor={COLORS.textGrayPlaceholder}
            style={styles.input}
            placeholder="Enter original price"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Stock Quantity</Text>
          <TextInput
            value={stock}
            onChangeText={setStock}
            keyboardType="numeric"
            placeholderTextColor={COLORS.textGrayPlaceholder}
            style={styles.input}
            placeholder="Enter stock quantity"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            placeholderTextColor={COLORS.textGrayPlaceholder}
            style={styles.descriptionInput}
            placeholder="Enter product description..."
          />
        </View>
      </View>

      {/* Category & Brand */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Category & Brand
        </Text>

        <TouchableOpacity style={styles.selectBox} onPress={handleSelectCategory}>
          <View style={styles.selectLeft}>
            <Ionicons
              name="grid-outline"
              size={22}
              color={COLORS.primary}
            />
            <Text style={styles.selectText}>
              {category || "Select Category"}
            </Text>
          </View>
          <Ionicons
            name="chevron-down"
            size={22}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.selectBox, styles.selectBoxMarginTop15]} onPress={handleSelectBrand}>
          <View style={styles.selectLeft}>
            <Ionicons
              name="pricetag-outline"
              size={22}
              color={COLORS.menuContact}
            />
            <Text style={styles.selectText}>
              {brand || "Select Brand"}
            </Text>
          </View>
          <Ionicons
            name="chevron-down"
            size={22}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Product Variants */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Product Variants
        </Text>

        <View style={styles.variantRow}>
          {variants.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.variantChip}
            >
              <Text style={styles.variantText}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.addVariantBtn}>
            <Ionicons
              name="add"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.addVariantText}>
              Add Variant
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pricing & Discount */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Pricing & Discount
        </Text>
        <TextInput
          placeholder="Discount %"
          placeholderTextColor={COLORS.textGrayPlaceholder}
          keyboardType="numeric"
          style={styles.input}
        />
        <TextInput
          placeholder="Coupon Code"
          placeholderTextColor={COLORS.textGrayPlaceholder}
          style={styles.input}
        />
      </View>

      {/* Product Status */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Product Status
        </Text>

        <TouchableOpacity style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <Ionicons
              name="star-outline"
              size={22}
              color={COLORS.warning}
            />
            <Text style={styles.statusText}>
              Featured Product
            </Text>
          </View>
          <Ionicons
            name="toggle"
            size={42}
            color={COLORS.success}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <Ionicons
              name="flame-outline"
              size={22}
              color={COLORS.error}
            />
            <Text style={styles.statusText}>
              Best Seller
            </Text>
          </View>
          <Ionicons
            name="toggle-outline"
            size={42}
            color={COLORS.textGrayPlaceholder}
          />
        </TouchableOpacity>
      </View>

      {/* Stock History */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Stock History
        </Text>

        <View style={styles.historyRow}>
          <Ionicons
            name="time-outline"
            size={18}
            color={COLORS.primary}
          />
          <Text style={styles.historyText}>
            Stock Updated • Today 11:45 AM
          </Text>
        </View>

        <View style={styles.historyRow}>
          <Ionicons
            name="cube-outline"
            size={18}
            color={COLORS.success}
          />
          <Text style={styles.historyText}>
            Current Stock : 120 Units
          </Text>
        </View>
      </View>

      {/* Product Preview */}
      <View style={styles.previewCard}>
        <Image
          source={{
            uri: images[0]?.uri || (typeof images[0] === 'string' ? images[0] : "https://via.placeholder.com/400")
          }}
          style={styles.previewImage}
        />
        <View style={styles.previewContent}>
          <Text style={styles.previewName}>
            {productName || "Product Name"}
          </Text>
          <Text style={styles.previewPrice}>
            ₹{price || "0"}
          </Text>
          <View style={styles.liveBadge}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={COLORS.success}
            />
            <Text style={styles.liveText}>
              Live Product
            </Text>
          </View>
        </View>
      </View>

      {/* AI Studio */}
      <TouchableOpacity style={styles.aiCard}>
        <View style={styles.aiLeft}>
          <Ionicons
            name="sparkles"
            size={28}
            color={COLORS.textContrast}
          />
          <View style={styles.aiTextContainer}>
            <Text style={styles.aiTitle}>
              AI Product Studio
            </Text>
            <Text style={styles.aiSub}>
              Enhance • Remove BG • HD
            </Text>
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={22}
          color={COLORS.textContrast}
        />
      </TouchableOpacity>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.deleteBtn}>
          <Ionicons
            name="trash-outline"
            size={22}
            color={COLORS.textContrast}
          />
          <Text style={styles.btnText}>
            Delete
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.updateBtn, isUpdating && { opacity: 0.7 }]}
          onPress={handleUpdate}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color={COLORS.textContrast} />
          ) : (
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color={COLORS.textContrast}
            />
          )}
          <Text style={styles.btnText}>
            {isUpdating ? "Updating..." : "Update Product"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default EditProduct;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundAlt,
    paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0) + 10,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    height: 70,
    backgroundColor: COLORS.cardBg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    elevation: 3,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: COLORS.textGrayDark,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 18,
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textGrayDark,
    marginBottom: 15,
  },
  imageBox: {
    marginRight: 14,
    position: "relative",
  },
  image: {
    width: 110,
    height: 110,
    borderRadius: 18,
  },
  editImageBtn: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  addImageBox: {
    width: 110,
    height: 110,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primaryBgLight,
  },
  addImageText: {
    marginTop: 8,
    color: COLORS.primary,
    fontWeight: "700",
  },
  updateImageBtnBelow: {
    marginTop: 15,
    height: 55,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primaryBgLight,
  },
  updateImageBtnText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textGrayDark,
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    height: 55,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    color: COLORS.textGrayDark,
  },
  descriptionInput: {
    height: 130,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    fontSize: 15,
    color: COLORS.textGrayDark,
  },
  aiCard: {
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: COLORS.menuBank,
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 4,
  },
  aiLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiTextContainer: {
    marginLeft: 12,
  },
  aiTitle: {
    fontSize: 18,
    color: COLORS.textContrast,
    fontWeight: "700",
  },
  aiSub: {
    marginTop: 4,
    color: COLORS.primaryLight,
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 25,
    marginBottom: 40,
  },
  deleteBtn: {
    width: "32%",
    height: 55,
    backgroundColor: COLORS.error,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    elevation: 3,
  },
  updateBtn: {
    width: "64%",
    height: 55,
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    elevation: 3,
  },
  btnText: {
    color: COLORS.textContrast,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  selectBox: {
    height: 55,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 14,
    paddingHorizontal: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectBoxMarginTop15: {
    marginTop: 15,
  },
  selectLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectText: {
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.textGrayMedium,
  },
  variantRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  variantChip: {
    backgroundColor: COLORS.primaryBgLight,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 22,
    marginRight: 10,
    marginBottom: 10,
  },
  variantText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  addVariantBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  addVariantText: {
    color: COLORS.primary,
    fontWeight: "700",
    marginLeft: 5,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textGrayDark,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  historyText: {
    marginLeft: 10,
    color: COLORS.textSecondary,
  },
  previewCard: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 20,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  previewImage: {
    width: "100%",
    height: 220,
  },
  previewContent: {
    padding: 18,
  },
  previewName: {
    fontSize: 19,
    fontWeight: "700",
    color: COLORS.textGrayDark,
  },
  previewPrice: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.primary,
  },
  liveBadge: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.successBgLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  liveText: {
    color: COLORS.success,
    fontWeight: "700",
    marginLeft: 6,
  },
});