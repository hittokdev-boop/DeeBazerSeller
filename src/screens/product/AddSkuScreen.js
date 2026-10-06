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
  getSellerAttributes,
  getSellerCategories,
  addSellerSku,
} from "../../api/auth";

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return "₹0";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
};

const getAttributeIcon = (slugOrName = "") => {
  const s = (slugOrName || "").toLowerCase();
  if (s.includes("color")) return "color-palette-outline";
  if (s.includes("size")) return "resize-outline";
  if (s.includes("storage")) return "save-outline";
  if (s.includes("ram")) return "hardware-chip-outline";
  if (s.includes("screen")) return "phone-portrait-outline";
  if (s.includes("battery")) return "battery-charging-outline";
  if (s.includes("processor")) return "speedometer-outline";
  if (s.includes("camera")) return "camera-outline";
  if (s.includes("operating") || s.includes("os")) return "logo-android";
  if (s.includes("connectivity")) return "wifi-outline";
  return "pricetag-outline";
};

const getColorHex = (valName = "") => {
  const map = {
    red: "#ef4444",
    blue: "#3b82f6",
    green: "#22c55e",
    black: "#18181b",
    white: "#f8fafc",
    silver: "#94a3b8",
    gold: "#eab308",
    yellow: "#facc15",
    orange: "#f97316",
    purple: "#a855f7",
    pink: "#ec4899",
    gray: "#6b7280",
    grey: "#6b7280",
  };
  return map[(valName || "").toLowerCase()] || null;
};

// Robust helper to extract category ID from any product object structure
const extractCategoryId = (prod, categories = [], unmapped = []) => {
  if (!prod) return null;
  // 1. Direct category_id fields from product
  if (prod.category_id !== undefined && prod.category_id !== null && prod.category_id !== "") {
    return Number(prod.category_id) || prod.category_id;
  }
  if (prod.categoryId !== undefined && prod.categoryId !== null && prod.categoryId !== "") {
    return Number(prod.categoryId) || prod.categoryId;
  }
  if (prod.cat_id !== undefined && prod.cat_id !== null && prod.cat_id !== "") {
    return Number(prod.cat_id) || prod.cat_id;
  }
  // 2. Object category
  if (prod.category && typeof prod.category === "object" && prod.category.id) {
    return Number(prod.category.id) || prod.category.id;
  }
  // 3. Numeric category
  if (typeof prod.category === "number") {
    return prod.category;
  }
  if (typeof prod.category === "string" && prod.category.trim() && !isNaN(Number(prod.category))) {
    return Number(prod.category);
  }
  // 4. Nested product object
  if (prod.product && typeof prod.product === "object") {
    const subId = extractCategoryId(prod.product, categories, unmapped);
    if (subId) return subId;
  }
  // 5. Match string category name against loaded categoriesList
  if (typeof prod.category === "string" && prod.category.trim() && Array.isArray(categories) && categories.length > 0) {
    const catNameLower = prod.category.trim().toLowerCase();
    const matched = categories.find(
      (c) =>
        (c.name || "").trim().toLowerCase() === catNameLower ||
        (c.slug || "").trim().toLowerCase() === catNameLower
    );
    if (matched?.id) return Number(matched.id) || matched.id;
  }
  // 6. Check unmappedSkus that belong to this product
  if (Array.isArray(unmapped) && unmapped.length > 0) {
    const matchedSku = unmapped.find((s) => String(s.product_id) === String(prod.id));
    if (matchedSku) {
      const skuCatId =
        matchedSku.category_id ||
        matchedSku.categoryId ||
        (typeof matchedSku.category === "object" ? matchedSku.category?.id : matchedSku.category);
      if (skuCatId && !isNaN(Number(skuCatId))) return Number(skuCatId);
    }
  }

  // 7. Keyword matching by product name
  const pName = (prod.name || "").toLowerCase().trim();
  if (pName) {
    if (
      pName.includes("dal") ||
      pName.includes("masoor") ||
      pName.includes("rice") ||
      pName.includes("oil") ||
      pName.includes("flour") ||
      pName.includes("atta") ||
      pName.includes("grocery") ||
      pName.includes("sugar") ||
      pName.includes("salt") ||
      pName.includes("spice") ||
      pName.includes("tea")
    ) {
      const grocCat = categories.find((c) => (c.slug || c.name || "").toLowerCase().includes("grocery"));
      return grocCat?.id ? Number(grocCat.id) : 11;
    }
    if (
      pName.includes("phone") ||
      pName.includes("samsung") ||
      pName.includes("laptop") ||
      pName.includes("mobile") ||
      pName.includes("electronics")
    ) {
      const elecCat = categories.find((c) => (c.slug || c.name || "").toLowerCase().includes("electronics"));
      return elecCat?.id ? Number(elecCat.id) : 1;
    }
    if (
      pName.includes("dress") ||
      pName.includes("shirt") ||
      pName.includes("pant") ||
      pName.includes("tshirt") ||
      pName.includes("fashion") ||
      pName.includes("floral") ||
      pName.includes("clothing")
    ) {
      const fashCat = categories.find((c) => (c.slug || c.name || "").toLowerCase().includes("fashion"));
      return fashCat?.id ? Number(fashCat.id) : 2;
    }
  }
  return null;
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

  // Mapping Modal State (Single)
  const [selectedSkuToMap, setSelectedSkuToMap] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapPrice, setMapPrice] = useState("");
  const [mapSalePrice, setMapSalePrice] = useState("");
  const [mapStock, setMapStock] = useState("");
  const [mapMinStock, setMapMinStock] = useState("5");
  const [mapSellerSku, setMapSellerSku] = useState("");
  const [isSubmittingMap, setIsSubmittingMap] = useState(false);

  // ================= TAB 1: BATCH MAPPING STATE (Flow 1 Existing SKU Add) =================
  const [batchMapProductGroup, setBatchMapProductGroup] = useState(null);
  const [batchMapVariants, setBatchMapVariants] = useState([]);
  const [showBatchMapModal, setShowBatchMapModal] = useState(false);
  const [batchMinStockAlert, setBatchMinStockAlert] = useState("10");
  const [batchBulkPrice, setBatchBulkPrice] = useState("");
  const [batchBulkSalePrice, setBatchBulkSalePrice] = useState("");
  const [batchBulkStock, setBatchBulkStock] = useState("50");
  const [isSubmittingBatchMap, setIsSubmittingBatchMap] = useState(false);

  // ================= TAB 2: NEW VARIANT STATE =================
  const [approvedProducts, setApprovedProducts] = useState([]);
  const [loadingApprovedProducts, setLoadingApprovedProducts] = useState(false);

  // Attributes State (e.g. Color, Size, Storage, RAM, etc.)
  const [attributes, setAttributes] = useState([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState({}); // { [attribute_id]: [value_id, ...] }

  // Form fields for new variant
  const [selectedProduct, setSelectedProduct] = useState(
    route?.params?.preselectedProduct || route?.params?.product || null
  );

  // Schema Detection: Attributes required by selectedProduct to prevent "different set of attributes" rejection
  const [productRequiredAttrIds, setProductRequiredAttrIds] = useState([]);
  const [productRequiredAttrNames, setProductRequiredAttrNames] = useState([]);
  const [loadingProductSchema, setLoadingProductSchema] = useState(false);

  // image_by: attribute ID that differentiates images (e.g. 1 for Color, 11 for Pack Size)
  const [imageByAttrId, setImageByAttrId] = useState(null);

  // Dedicated photos per attribute value: { [value_id]: asset } -> images[valId]
  const [attributeImages, setAttributeImages] = useState({});

  // Generated variant combinations array
  const [variants, setVariants] = useState([]);

  // Quick Bulk Apply state
  const [bulkPrice, setBulkPrice] = useState("1299");
  const [bulkSalePrice, setBulkSalePrice] = useState("999");
  const [bulkStock, setBulkStock] = useState("10");
  const [bulkMinStock, setBulkMinStock] = useState("2");
  const [bulkWeight, setBulkWeight] = useState("0.40");
  const [bulkLength, setBulkLength] = useState("34");
  const [bulkWidth, setBulkWidth] = useState("24");
  const [bulkHeight, setBulkHeight] = useState("4");
  const [isBulkOpen, setIsBulkOpen] = useState(true);

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

  // Available seller categories for mapping
  const [categoriesList, setCategoriesList] = useState([]);

  useEffect(() => {
    getSellerCategories()
      .then((cats) => {
        const list = Array.isArray(cats) ? cats : cats?.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setCategoriesList(list);
        }
      })
      .catch((e) => {
        console.warn("Could not load categories in AddSkuScreen:", e?.message);
      });
  }, []);

  // ---------------- Load Seller Attributes ----------------
  const fetchAttributes = useCallback(
    async (catId = null) => {
      setLoadingAttributes(true);
      try {
        const resolvedCatId =
          catId !== null && catId !== undefined
            ? catId
            : extractCategoryId(selectedProduct, categoriesList, unmappedSkus);
        const data = await getSellerAttributes(resolvedCatId);
        const list = Array.isArray(data) ? data : data?.data || data?.attributes || [];
        setAttributes(list);
      } catch (err) {
        console.warn("Failed to fetch seller attributes:", err?.message);
      } finally {
        setLoadingAttributes(false);
      }
    },
    [selectedProduct, categoriesList, unmappedSkus]
  );

  useEffect(() => {
    fetchUnmappedSkus();
    fetchApprovedProducts();
  }, [fetchUnmappedSkus, fetchApprovedProducts]);

  // Fetch attributes whenever selected product or categories change
  useEffect(() => {
    const catId = extractCategoryId(selectedProduct, categoriesList, unmappedSkus);
    fetchAttributes(catId);
  }, [
    selectedProduct?.id,
    selectedProduct?.category_id,
    selectedProduct?.categoryId,
    selectedProduct?.cat_id,
    selectedProduct?.category,
    categoriesList.length,
    unmappedSkus.length,
    fetchAttributes,
  ]);

  const resolvedCategoryDisplay = useMemo(() => {
    const catId = extractCategoryId(selectedProduct, categoriesList, unmappedSkus);
    const catObj = categoriesList.find((c) => String(c.id) === String(catId));
    const catName =
      catObj?.name ||
      (typeof selectedProduct?.category === "object" ? selectedProduct?.category?.name : null) ||
      (typeof selectedProduct?.category === "string" && isNaN(Number(selectedProduct.category)) ? selectedProduct.category : null) ||
      selectedProduct?.category_name;
    if (catName && catId) return `Cat: ${catName} (ID: #${catId})`;
    if (catName) return `Cat: ${catName}`;
    if (catId) return `Category ID: #${catId}`;
    return null;
  }, [selectedProduct, categoriesList, unmappedSkus]);

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

  // ---------------- Inspect Master Product's Required Attributes Schema ----------------
  useEffect(() => {
    if (!selectedProduct?.id) {
      setProductRequiredAttrIds([]);
      setProductRequiredAttrNames([]);
      setLoadingProductSchema(false);
      return;
    }

    setLoadingProductSchema(true);
    try {
      const foundAttrIds = new Set();

      // 1. Check unmappedSkus that belong to this product
      const sameProductSkus = unmappedSkus.filter(
        (s) => String(s.product_id) === String(selectedProduct.id)
      );

      sameProductSkus.forEach((s) => {
        if (Array.isArray(s.attributes)) {
          s.attributes.forEach((a) => {
            const aid = a.attribute_id || a.id;
            if (aid) foundAttrIds.add(Number(aid));
          });
        } else if (s.attributes && typeof s.attributes === "object") {
          Object.keys(s.attributes).forEach((k) => {
            if (!isNaN(Number(k))) foundAttrIds.add(Number(k));
          });
        }
        if (Array.isArray(s.sku_attributes)) {
          s.sku_attributes.forEach((a) => {
            const aid = a.attribute_id || a.id;
            if (aid) foundAttrIds.add(Number(aid));
          });
        }
      });

      // 2. Check if selectedProduct already contains attributes or skus
      if (Array.isArray(selectedProduct?.attributes)) {
        selectedProduct.attributes.forEach((a) => {
          const aid = a.attribute_id || a.id;
          if (aid) foundAttrIds.add(Number(aid));
        });
      }
      if (Array.isArray(selectedProduct?.skus)) {
        selectedProduct.skus.forEach((s) => {
          if (Array.isArray(s.attributes)) {
            s.attributes.forEach((a) => {
              const aid = a.attribute_id || a.id;
              if (aid) foundAttrIds.add(Number(aid));
            });
          }
        });
      }

      // 3. Fallback heuristic from product/sku names if not found
      if (foundAttrIds.size === 0) {
        const sampleText = `${selectedProduct.name || ""} ${sameProductSkus.map((s) => s.name || s.sku || "").join(" ")}`.toLowerCase();
        if (
          sampleText.includes("dal") ||
          sampleText.includes("masoor") ||
          sampleText.includes("rice") ||
          sampleText.includes("oil") ||
          sampleText.includes("mustard") ||
          sampleText.includes("grocery") ||
          sampleText.includes("flour") ||
          sampleText.includes("atta") ||
          sampleText.includes("250g") ||
          sampleText.includes("500g") ||
          sampleText.includes("1kg")
        ) {
          foundAttrIds.add(11); // Weight
        } else if (
          sampleText.includes("floral") ||
          sampleText.includes("dress") ||
          sampleText.includes("shirt") ||
          sampleText.includes("pant") ||
          sampleText.includes("clothing") ||
          sampleText.includes("fashion")
        ) {
          foundAttrIds.add(1); // Color
          foundAttrIds.add(2); // Size
        } else if (
          sampleText.includes("phone") ||
          sampleText.includes("samsung") ||
          sampleText.includes("laptop") ||
          sampleText.includes("mobile") ||
          sampleText.includes("electronics")
        ) {
          foundAttrIds.add(1); // Color
          foundAttrIds.add(3); // Storage
          foundAttrIds.add(4); // RAM
        }
      }

      const reqIds = Array.from(foundAttrIds);
      setProductRequiredAttrIds(reqIds);

      // Auto-configure image_by
      if (reqIds.length === 1) {
        setImageByAttrId(reqIds[0]);
      } else if (reqIds.length > 1) {
        const colorId = reqIds.find((id) => {
          const a = attributes.find((at) => Number(at.id) === Number(id));
          return a && ((a.slug || "").toLowerCase().includes("color") || (a.name || "").toLowerCase().includes("color"));
        });
        setImageByAttrId(colorId || reqIds[0]);
      }
    } catch (err) {
      console.warn("inspectSchema error:", err?.message);
    } finally {
      setLoadingProductSchema(false);
    }
  }, [selectedProduct?.id, unmappedSkus]);

  // Keep productRequiredAttrNames in sync with productRequiredAttrIds and attributes without causing re-render loops
  useEffect(() => {
    const reqNames = productRequiredAttrIds.map((id) => {
      const matched = attributes.find((a) => Number(a.id) === Number(id));
      return matched?.name || `Attribute #${id}`;
    });
    setProductRequiredAttrNames(reqNames);
  }, [productRequiredAttrIds, attributes]);

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

  // Group unmapped SKUs by product for Batch Mapping
  const groupedUnmappedByProduct = useMemo(() => {
    const map = new Map();
    filteredSkus.forEach((sku) => {
      const pid = sku.product_id || (sku.product && sku.product.id) || "other";
      if (!map.has(pid)) {
        map.set(pid, {
          productId: pid,
          productName: sku.product_name || (sku.product && sku.product.name) || sku.name || "Approved Product",
          productImage: sku.image_url || (sku.product && sku.product.image_url),
          skus: [],
        });
      }
      map.get(pid).skus.push(sku);
    });
    return Array.from(map.values());
  }, [filteredSkus]);

  // ---------------- Open Single Map Modal ----------------
  const handleOpenMapModal = (skuItem) => {
    setSelectedSkuToMap(skuItem);
    setMapPrice("");
    setMapSalePrice("");
    setMapStock("");
    setMapMinStock("5");
    setMapSellerSku(skuItem.sku ? `SELLER-${skuItem.sku}` : "");
    setShowMapModal(true);
  };

  // ---------------- Open Batch Map Modal (Flow 1 Existing SKU Batch Add) ----------------
  const handleOpenBatchMapModal = (group) => {
    setBatchMapProductGroup(group);
    setBatchMinStockAlert("10");
    setBatchBulkPrice("");
    setBatchBulkSalePrice("");
    setBatchBulkStock("50");
    const initialList = group.skus.map((sku) => {
      const code = typeof sku.sku === "object" ? sku.sku.code || sku.sku.sku || sku.sku.name : sku.sku;
      return {
        product_sku_id: sku.id,
        name: sku.name || sku.product_name || `SKU #${sku.id}`,
        sku_code: code,
        stock_quantity: "50",
        price: "",
        sale_price: "",
        seller_sku: code ? `SELLER-${code}` : "",
      };
    });
    setBatchMapVariants(initialList);
    setShowBatchMapModal(true);
  };

  const handleApplyBatchBulk = () => {
    setBatchMapVariants((prev) =>
      prev.map((v) => ({
        ...v,
        price: batchBulkPrice.trim() ? batchBulkPrice.trim() : v.price,
        sale_price: batchBulkSalePrice.trim() ? batchBulkSalePrice.trim() : v.sale_price,
        stock_quantity: batchBulkStock.trim() ? batchBulkStock.trim() : v.stock_quantity,
      }))
    );
    CustomAlert.showSuccess(
      "Values Applied",
      `Applied price (₹${batchBulkPrice || "--"}), stock (${batchBulkStock || "--"}) to all ${batchMapVariants.length} items.`
    );
  };

  const handleUpdateBatchVariantField = (idx, field, val) => {
    setBatchMapVariants((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  // ---------------- Submit Batch Map (Flow 1) ----------------
  const handleSubmitBatchMap = async () => {
    if (!batchMapProductGroup || batchMapVariants.length === 0) return;

    for (let i = 0; i < batchMapVariants.length; i++) {
      const v = batchMapVariants[i];
      if (!v.price || isNaN(Number(v.price)) || Number(v.price) <= 0) {
        CustomAlert.showWarning("Price Required", `Please enter a valid price for "${v.name}".`);
        return;
      }
      if (v.sale_price && (isNaN(Number(v.sale_price)) || Number(v.sale_price) <= 0)) {
        CustomAlert.showWarning("Invalid Sale Price", `Sale price for "${v.name}" is invalid.`);
        return;
      }
      if (v.sale_price && Number(v.sale_price) >= Number(v.price)) {
        CustomAlert.showWarning("Price Mismatch", `Sale price must be less than regular price for "${v.name}".`);
        return;
      }
      if (!v.stock_quantity || isNaN(parseInt(v.stock_quantity, 10)) || parseInt(v.stock_quantity, 10) < 0) {
        CustomAlert.showWarning("Stock Required", `Please enter stock for "${v.name}".`);
        return;
      }
    }

    setIsSubmittingBatchMap(true);
    try {
      const payload = {
        product_id: batchMapProductGroup.productId,
        min_stock_alert: parseInt(batchMinStockAlert, 10) || 10,
        variants: batchMapVariants.map((v) => {
          const varObj = {
            product_sku_id: v.product_sku_id,
            stock_quantity: parseInt(v.stock_quantity, 10),
            price: Number(v.price),
          };
          if (v.sale_price && String(v.sale_price).trim()) {
            varObj.sale_price = Number(v.sale_price);
          }
          if (v.seller_sku && String(v.seller_sku).trim()) {
            varObj.seller_sku = v.seller_sku.trim();
          }
          return varObj;
        }),
      };

      await addSellerSku(payload);

      const mappedIds = batchMapVariants.map((v) => v.product_sku_id);
      setUnmappedSkus((prev) => prev.filter((item) => !mappedIds.includes(item.id)));
      setShowBatchMapModal(false);

      CustomAlert.showSuccess(
        "SKUs Mapped to Store!",
        `${batchMapVariants.length} SKUs successfully mapped to your shop with custom price and stock.`
      );
    } catch (err) {
      CustomAlert.showError("Batch Mapping Failed", err?.message || "Could not map SKUs.");
    } finally {
      setIsSubmittingBatchMap(false);
    }
  };

  // ---------------- Submit Single Map SKU ----------------
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
        min_stock_alert: parseInt(mapMinStock, 10) || 5,
        variants: [
          {
            product_sku_id: selectedSkuToMap.id,
            stock_quantity: parseInt(mapStock, 10),
            price: Number(mapPrice),
            sale_price: mapSalePrice.trim() ? Number(mapSalePrice) : undefined,
            seller_sku: mapSellerSku.trim() || undefined,
            min_stock_alert: parseInt(mapMinStock, 10) || 5,
          },
        ],
      };

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

  // ---------------- Cartesian Combinations Generator ----------------
  const generateCombos = useCallback(
    (attrsMap, prod, prevVariants = []) => {
      const activeAttrIds = Object.keys(attrsMap).filter(
        (id) => Array.isArray(attrsMap[id]) && attrsMap[id].length > 0
      );
      if (activeAttrIds.length === 0) return [];

      const attrEntries = activeAttrIds.map((attrId) => {
        const attr = attributes.find((a) => String(a.id) === String(attrId));
        const selectedIds = attrsMap[attrId] || [];
        const vals = (attr?.values || []).filter((v) => selectedIds.includes(v.id));
        return { attrId: Number(attrId), attrName: attr?.name || "Spec", vals };
      });

      let combos = [[]];
      for (const entry of attrEntries) {
        if (!entry.vals || entry.vals.length === 0) continue;
        const next = [];
        for (const combo of combos) {
          for (const val of entry.vals) {
            next.push([
              ...combo,
              { attrId: entry.attrId, attrName: entry.attrName, valId: val.id, valName: val.value },
            ]);
          }
        }
        combos = next;
      }

      return combos.map((combo, idx) => {
        const comboAttrMap = {};
        const comboNames = [];
        combo.forEach((c) => {
          comboAttrMap[c.attrId] = c.valId;
          comboNames.push(c.valName);
        });

        const key = Object.entries(comboAttrMap)
          .map(([a, v]) => `${a}:${v}`)
          .sort()
          .join("_");

        const existing = prevVariants.find((v) => {
          if (!v.attributes) return false;
          const vKey = Object.entries(v.attributes)
            .map(([a, val]) => `${a}:${val}`)
            .sort()
            .join("_");
          return vKey === key;
        });

        if (existing) {
          return existing;
        }

        const prodName = prod?.name || "Product";
        const fullName = `${prodName} ${comboNames.join(" ")}`.trim();
        const acronym = prodName
          .split(/\s+/)
          .map((w) => w[0] || "")
          .join("")
          .toUpperCase() || "SKU";
        const skuCode = `${acronym}-${comboNames.map((n) => n.replace(/\s+/g, "").toUpperCase()).join("-")}`;

        return {
          id: `var_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          name: fullName,
          attributes: comboAttrMap,
          labels: combo,
          price: bulkPrice || "1299",
          sale_price: bulkSalePrice || "999",
          stock_quantity: bulkStock || "10",
          min_stock_alert: bulkMinStock || "2",
          weight: bulkWeight || "0.40",
          length: bulkLength || "34",
          width: bulkWidth || "24",
          height: bulkHeight || "4",
          seller_sku: skuCode,
        };
      });
    },
    [attributes, bulkPrice, bulkSalePrice, bulkStock, bulkMinStock, bulkWeight, bulkLength, bulkWidth, bulkHeight]
  );

  // Display ONLY required attributes for the selected product, hiding all unrelated attributes
  const sortedAttributes = useMemo(() => {
    if (productRequiredAttrIds && productRequiredAttrIds.length > 0) {
      const filtered = attributes.filter((a) => productRequiredAttrIds.includes(Number(a.id)));
      if (filtered.length > 0) return filtered;
    }
    return attributes;
  }, [attributes, productRequiredAttrIds]);

  // ---------------- Toggle Attribute Value (Multi-select) ----------------
  const handleToggleAttributeValue = (attributeId, valueId) => {
    setSelectedAttributes((prev) => {
      const current = Array.isArray(prev[attributeId]) ? prev[attributeId] : [];
      let updated;
      if (current.includes(valueId)) {
        updated = current.filter((id) => id !== valueId);
      } else {
        updated = [...current, valueId];
      }
      const newMap = { ...prev };
      if (updated.length === 0) {
        delete newMap[attributeId];
      } else {
        newMap[attributeId] = updated;
      }

      // Auto-assign image_by if not set or invalid
      const activeIds = Object.keys(newMap).filter((id) => newMap[id]?.length > 0);
      if (activeIds.length > 0) {
        if (!imageByAttrId || !activeIds.includes(String(imageByAttrId))) {
          const colorAttr = attributes.find(
            (a) =>
              activeIds.includes(String(a.id)) &&
              ((a.slug || "").toLowerCase().includes("color") || (a.name || "").toLowerCase().includes("color"))
          );
          if (colorAttr) {
            setImageByAttrId(colorAttr.id);
          } else {
            setImageByAttrId(Number(activeIds[0]));
          }
        }
      } else {
        setImageByAttrId(null);
      }

      // Re-generate variant combinations
      setTimeout(() => {
        setVariants((prevVars) => generateCombos(newMap, selectedProduct, prevVars));
      }, 0);

      return newMap;
    });
  };

  // ---------------- Pick Photo for Attribute Value (images[valId]) ----------------
  const handlePickAttributeImage = (valId, valName) => {
    CustomAlert.alert(
      `Upload Photo for ${valName}`,
      `Choose source for ${valName} photo`,
      [
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
                setAttributeImages((prev) => ({
                  ...prev,
                  [valId]: {
                    uri: asset.uri,
                    type: asset.type || "image/jpeg",
                    fileName: asset.fileName || `sku_${valName}_${Date.now()}.jpg`,
                  },
                }));
              }
            });
          },
        },
        {
          text: "Gallery",
          onPress: () => {
            launchImageLibrary({ mediaType: "photo", quality: 0.8, selectionLimit: 1 }, (response) => {
              if (!response.didCancel && response.assets && response.assets.length > 0) {
                const asset = response.assets[0];
                setAttributeImages((prev) => ({
                  ...prev,
                  [valId]: {
                    uri: asset.uri,
                    type: asset.type || "image/jpeg",
                    fileName: asset.fileName || `sku_${valName}_${Date.now()}.jpg`,
                  },
                }));
              }
            });
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleRemoveAttributeImage = (valId) => {
    setAttributeImages((prev) => {
      const copy = { ...prev };
      delete copy[valId];
      return copy;
    });
  };

  // ---------------- Bulk Apply Values ----------------
  const handleApplyBulkToAll = () => {
    if (variants.length === 0) {
      CustomAlert.showWarning("No Variants", "Select attributes to generate variants first.");
      return;
    }
    setVariants((prev) =>
      prev.map((v) => ({
        ...v,
        price: bulkPrice.trim() ? bulkPrice.trim() : v.price,
        sale_price: bulkSalePrice.trim() ? bulkSalePrice.trim() : v.sale_price,
        stock_quantity: bulkStock.trim() ? bulkStock.trim() : v.stock_quantity,
        min_stock_alert: bulkMinStock.trim() ? bulkMinStock.trim() : v.min_stock_alert,
        weight: bulkWeight.trim() ? bulkWeight.trim() : v.weight,
        length: bulkLength.trim() ? bulkLength.trim() : v.length,
        width: bulkWidth.trim() ? bulkWidth.trim() : v.width,
        height: bulkHeight.trim() ? bulkHeight.trim() : v.height,
      }))
    );
    CustomAlert.showSuccess(
      "Bulk Applied!",
      `Applied price (₹${bulkPrice}), stock (${bulkStock}), and specs to all ${variants.length} variants.`
    );
  };

  // ---------------- Update & Remove Variant ----------------
  const handleUpdateVariantField = (varId, field, val) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === varId ? { ...v, [field]: val } : v))
    );
  };

  const handleRemoveVariant = (varId) => {
    setVariants((prev) => prev.filter((v) => v.id !== varId));
  };

  const handleAddCustomVariant = () => {
    const prodName = selectedProduct?.name || "Product";
    const newIdx = variants.length + 1;
    setVariants((prev) => [
      ...prev,
      {
        id: `custom_var_${Date.now()}_${newIdx}`,
        name: `${prodName} Custom Variant ${newIdx}`,
        attributes: {},
        labels: [],
        price: bulkPrice || "1299",
        sale_price: bulkSalePrice || "999",
        stock_quantity: bulkStock || "10",
        min_stock_alert: bulkMinStock || "2",
        weight: bulkWeight || "0.40",
        length: bulkLength || "34",
        width: bulkWidth || "24",
        height: bulkHeight || "4",
        seller_sku: `CUSTOM-SKU-${newIdx}`,
      },
    ]);
  };

  // ---------------- Submit Multi-SKU Variants ----------------
  const handleSubmitNewVariant = async () => {
    if (!selectedProduct) {
      CustomAlert.showWarning("Product Required", "Please select an approved product first.");
      return;
    }
    if (!variants || variants.length === 0) {
      CustomAlert.showWarning("No Variants", "Please select attributes to create at least one SKU variant.");
      return;
    }

    // Validate that all required attributes for this product are included
    if (productRequiredAttrIds.length > 0) {
      const missingIds = productRequiredAttrIds.filter(
        (id) => !selectedAttributes[id] || selectedAttributes[id].length === 0
      );
      if (missingIds.length > 0) {
        const missingNames = missingIds.map((id) => {
          const match = attributes.find((a) => Number(a.id) === Number(id));
          return match?.name || `Attribute #${id}`;
        });
        CustomAlert.showWarning(
          "Required Attribute Missing",
          `"${selectedProduct.name}" requires variants to have both ${productRequiredAttrNames.join(" and ")}.\n\nPlease select at least one value for: ${missingNames.join(", ")}.`
        );
        return;
      }
    }

    // Validate each variant
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.name || !v.name.trim()) {
        CustomAlert.showWarning("Variant Name Required", `Variant #${i + 1} has an empty name.`);
        return;
      }
      if (!v.price || isNaN(Number(v.price)) || Number(v.price) <= 0) {
        CustomAlert.showWarning("Price Required", `Please enter a valid price for "${v.name}".`);
        return;
      }
      if (v.sale_price && (isNaN(Number(v.sale_price)) || Number(v.sale_price) <= 0)) {
        CustomAlert.showWarning("Invalid Sale Price", `Sale price for "${v.name}" is invalid.`);
        return;
      }
      if (v.sale_price && Number(v.sale_price) >= Number(v.price)) {
        CustomAlert.showWarning("Price Mismatch", `Sale price must be less than regular price for "${v.name}".`);
        return;
      }
      if (
        v.stock_quantity === undefined ||
        v.stock_quantity === "" ||
        isNaN(parseInt(v.stock_quantity, 10)) ||
        parseInt(v.stock_quantity, 10) < 0
      ) {
        CustomAlert.showWarning("Stock Required", `Please enter stock quantity for "${v.name}".`);
        return;
      }
    }

    // Validate images if image_by is set
    if (imageByAttrId) {
      const selectedVals = selectedAttributes[imageByAttrId] || [];
      const missingPhotos = selectedVals.filter((vId) => !attributeImages[vId]);
      if (missingPhotos.length > 0) {
        const attrObj = attributes.find((a) => a.id === imageByAttrId);
        const names = missingPhotos
          .map((id) => attrObj?.values?.find((v) => v.id === id)?.value || `ID #${id}`)
          .join(", ");
        CustomAlert.showWarning(
          "Photos Required",
          `Please upload photos for each ${attrObj?.name || "variant"} (${names}).`
        );
        return;
      }
    }

    setIsSubmittingVariant(true);
    try {
      const formData = new FormData();
      formData.append("product_id", String(selectedProduct.id));
      if (imageByAttrId) {
        formData.append("image_by", String(imageByAttrId));
      }
      formData.append("min_stock_alert", String(parseInt(bulkMinStock, 10) || 2));

      variants.forEach((v, idx) => {
        formData.append(`variants[${idx}][name]`, v.name.trim());
        if (v.attributes && typeof v.attributes === "object") {
          Object.entries(v.attributes).forEach(([attrId, valId]) => {
            if (valId !== undefined && valId !== null && valId !== "") {
              formData.append(`variants[${idx}][attributes][${attrId}]`, String(valId));
            }
          });
        }
        formData.append(`variants[${idx}][stock_quantity]`, String(parseInt(v.stock_quantity, 10) || 0));
        formData.append(`variants[${idx}][price]`, String(Number(v.price)));
        if (v.sale_price && String(v.sale_price).trim()) {
          formData.append(`variants[${idx}][sale_price]`, String(Number(v.sale_price)));
        }
        if (v.weight && String(v.weight).trim()) {
          formData.append(`variants[${idx}][weight]`, String(v.weight).trim());
        }
        if (v.length && String(v.length).trim()) {
          formData.append(`variants[${idx}][length]`, String(v.length).trim());
        }
        if (v.width && String(v.width).trim()) {
          formData.append(`variants[${idx}][width]`, String(v.width).trim());
        }
        if (v.height && String(v.height).trim()) {
          formData.append(`variants[${idx}][height]`, String(v.height).trim());
        }
        if (v.seller_sku && String(v.seller_sku).trim()) {
          formData.append(`variants[${idx}][seller_sku]`, String(v.seller_sku).trim());
        }
        formData.append(`variants[${idx}][min_stock_alert]`, String(parseInt(v.min_stock_alert, 10) || 2));
      });

      // Append images[valId]
      if (attributeImages && Object.keys(attributeImages).length > 0) {
        Object.entries(attributeImages).forEach(([valId, img]) => {
          if (img && img.uri) {
            formData.append(`images[${valId}]`, {
              uri: Platform.OS === "android" ? img.uri : img.uri.replace("file://", ""),
              type: img.type || "image/jpeg",
              name: img.fileName || `attr_${valId}_${Date.now()}.jpg`,
            });
          }
        });
      }

      const res = await addSellerSku(formData);

      const createdCount = res?.data?.created?.length || variants.length;
      CustomAlert.showSuccess(
        "SKUs Submitted Successfully!",
        res?.message || `${createdCount} SKU variants submitted. New SKUs will be visible to customers after admin approves them.`,
        () => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }
      );

      // Reset form
      setSelectedAttributes({});
      setVariants([]);
      setAttributeImages({});
      setImageByAttrId(null);
    } catch (err) {
      const errMsg = err?.message || "";
      if (errMsg.toLowerCase().includes("different set of attributes")) {
        CustomAlert.showError(
          "Attribute Schema Mismatch",
          `This catalog product uses a specific combination of attributes for its variants${productRequiredAttrNames.length > 0 ? ` (${productRequiredAttrNames.join(" + ")})` : ""
          }.\n\nPlease ensure all required attributes are selected before submitting.`
        );
      } else {
        CustomAlert.showError("Submission Failed", errMsg || "Could not submit SKU variants.");
      }
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
                groupedUnmappedByProduct.map((group) => (
                  <View key={String(group.productId)} style={styles.productGroupContainer}>
                    {group.skus.length > 1 && (
                      <View
                        style={[
                          styles.productGroupHeader,
                          {
                            backgroundColor: isDark ? "#1e293b" : "#F8FAFC",
                            borderColor: colors.borderLight,
                          },
                        ]}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.productGroupTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                            {group.productName}
                          </Text>
                          <Text style={[styles.productGroupSub, { color: colors.textSecondary }]}>
                            {group.skus.length} variants available in catalog
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.batchMapBtn, { backgroundColor: COLORS.primary }]}
                          onPress={() => handleOpenBatchMapModal(group)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="flash" size={13} color="#fff" style={{ marginRight: 4 }} />
                          <Text style={styles.batchMapBtnText}>Batch Map ({group.skus.length})</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {group.skus.map((item) => (
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
                    ))}
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
                      {resolvedCategoryDisplay ? ` • ${resolvedCategoryDisplay}` : ""}
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

          {/* Section 2: Variant Attributes (Multi-Select) */}
          <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="pricetags-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.formCardTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                  2. Select Variant Attributes
                </Text>
              </View>
              {Object.keys(selectedAttributes).length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedAttributes({});
                    setVariants([]);
                    setAttributeImages({});
                    setImageByAttrId(null);
                  }}
                  activeOpacity={0.7}
                  style={styles.clearAttrBtn}
                >
                  <Text style={[styles.clearAttrBtnText, { color: COLORS.error }]}>Reset All</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Select one or more values for each attribute (e.g. Colors: Red, Blue; Sizes: S, M, L).
            </Text>

            {/* Master Product Schema Guidance Banner */}
            {productRequiredAttrIds.length > 0 && (
              <View
                style={[
                  styles.schemaBanner,
                  {
                    backgroundColor: isDark ? "#172554" : "#EFF6FF",
                    borderColor: COLORS.primaryLight,
                  },
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={18}
                  color={COLORS.primary}
                  style={{ marginRight: 8, marginTop: 2 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.schemaBannerTitle, { color: isDark ? "#bfdbfe" : "#1e40af" }]}>
                    Catalog Variant Schema for "{selectedProduct?.name || "Product"}"
                  </Text>
                  <Text style={[styles.schemaBannerText, { color: isDark ? "#93c5fd" : "#2563EB" }]}>
                    This catalog product requires:{" "}
                    <Text style={{ fontWeight: "700" }}>{productRequiredAttrNames.join(" + ")}</Text>. All
                    variants must include these attributes to match backend validation.
                  </Text>
                </View>
              </View>
            )}

            {loadingAttributes || loadingProductSchema ? (
              <View style={{ paddingVertical: 18, alignItems: "center" }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={{ fontSize: 12, marginTop: 6, color: colors.textSecondary }}>
                  Loading attributes & product schema...
                </Text>
              </View>
            ) : sortedAttributes.length === 0 ? (
              <View style={{ paddingVertical: 14, alignItems: "center" }}>
                <Text style={[styles.emptyAttrText, { color: colors.textSecondary }]}>
                  {extractCategoryId(selectedProduct, categoriesList, unmappedSkus)
                    ? `No attributes found for category #${extractCategoryId(selectedProduct, categoriesList, unmappedSkus)}. You can retry or add custom variants below.`
                    : "No attributes found for this category. You can retry or add custom variants below."}
                </Text>
                <TouchableOpacity
                  style={{
                    marginTop: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    backgroundColor: COLORS.primary,
                    borderRadius: 6,
                  }}
                  onPress={() => {
                    const catId = extractCategoryId(selectedProduct, categoriesList, unmappedSkus);
                    fetchAttributes(catId);
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Retry Attributes</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.attributesListContainer}>
                {sortedAttributes.map((attr) => {
                  const selectedValIds = selectedAttributes[attr.id] || [];
                  const countSelected = selectedValIds.length;
                  const attrIcon = getAttributeIcon(attr.slug || attr.name);
                  const isRequired = productRequiredAttrIds.includes(Number(attr.id));

                  return (
                    <View
                      key={attr.id}
                      style={[
                        styles.attributeGroup,
                        isRequired && {
                          borderColor: isDark ? "#1e3a8a" : "#BFDBFE",
                          borderWidth: 1,
                          borderRadius: 10,
                          padding: 10,
                          backgroundColor: isDark ? "rgba(30, 58, 138, 0.15)" : "rgba(239, 246, 255, 0.5)",
                        },
                      ]}
                    >
                      <View style={styles.attributeGroupHeader}>
                        <Ionicons
                          name={attrIcon}
                          size={15}
                          color={countSelected > 0 || isRequired ? COLORS.primary : colors.textSecondary}
                        />
                        <Text style={[styles.attributeGroupName, { color: colors.textPrimary }]}>
                          {attr.name}
                        </Text>
                        {isRequired && (
                          <View
                            style={[
                              styles.requiredAttrPill,
                              { backgroundColor: isDark ? "#451a03" : "#FEF3C7" },
                            ]}
                          >
                            <Ionicons name="alert-circle" size={11} color="#D97706" style={{ marginRight: 3 }} />
                            <Text style={styles.requiredAttrPillText}>Required</Text>
                          </View>
                        )}
                        {countSelected > 0 && (
                          <View style={[styles.attrSelectedBadge, { backgroundColor: isDark ? "#1e293b" : "#EFF6FF" }]}>
                            <Text style={[styles.attrSelectedBadgeText, { color: COLORS.primary }]}>
                              {countSelected} selected
                            </Text>
                          </View>
                        )}
                      </View>

                      {isRequired && countSelected === 0 && (
                        <Text style={styles.requiredMissingHint}>
                          ⚠️ Select at least one {attr.name} value to complete variant schema
                        </Text>
                      )}

                      <View style={styles.attrChipsWrap}>
                        {Array.isArray(attr.values) &&
                          attr.values.map((val) => {
                            const isSelected = selectedValIds.includes(val.id);
                            const colorDot =
                              attr.slug === "color" || attr.name.toLowerCase().includes("color")
                                ? getColorHex(val.value)
                                : null;

                            return (
                              <TouchableOpacity
                                key={val.id}
                                onPress={() => handleToggleAttributeValue(attr.id, val.id)}
                                activeOpacity={0.7}
                                style={[
                                  styles.attrValueChip,
                                  isSelected
                                    ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                                    : { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight },
                                ]}
                              >
                                {colorDot && (
                                  <View
                                    style={[
                                      styles.colorDotIndicator,
                                      {
                                        backgroundColor: colorDot,
                                        borderColor: isSelected ? "#fff" : colors.borderLight,
                                        borderWidth: 1,
                                      },
                                    ]}
                                  />
                                )}
                                <Text
                                  style={[
                                    styles.attrValueChipText,
                                    {
                                      color: isSelected ? "#fff" : colors.textPrimary,
                                      fontWeight: isSelected ? "700" : "500",
                                    },
                                  ]}
                                >
                                  {val.value}
                                </Text>
                                {isSelected && (
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={13}
                                    color="#fff"
                                    style={{ marginLeft: 4 }}
                                  />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Section 3: Photo Grouping Attribute (image_by) */}
          {Object.keys(selectedAttributes).length > 0 && (
            <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <Ionicons name="camera-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.formCardTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                  3. Differentiate Photos By (image_by)
                </Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Choose which attribute defines different photos (e.g. Color). You will upload specific photos for each selected value of this attribute.
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageByPillRow}>
                {Object.keys(selectedAttributes).map((attrId) => {
                  const attr = attributes.find((a) => String(a.id) === String(attrId));
                  const isChosen = String(imageByAttrId) === String(attrId);
                  const selCount = (selectedAttributes[attrId] || []).length;
                  if (!attr || selCount === 0) return null;

                  return (
                    <TouchableOpacity
                      key={attrId}
                      onPress={() => setImageByAttrId(Number(attrId))}
                      activeOpacity={0.75}
                      style={[
                        styles.imageByPill,
                        isChosen
                          ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                          : { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight },
                      ]}
                    >
                      <Ionicons
                        name={isChosen ? "radio-button-on" : "radio-button-off"}
                        size={15}
                        color={isChosen ? "#fff" : colors.textSecondary}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.imageByPillText,
                          { color: isChosen ? "#fff" : colors.textPrimary, fontWeight: isChosen ? "700" : "500" },
                        ]}
                      >
                        By {attr.name} ({selCount})
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  onPress={() => setImageByAttrId(null)}
                  activeOpacity={0.75}
                  style={[
                    styles.imageByPill,
                    imageByAttrId === null
                      ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                      : { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight },
                  ]}
                >
                  <Ionicons
                    name={imageByAttrId === null ? "radio-button-on" : "radio-button-off"}
                    size={15}
                    color={imageByAttrId === null ? "#fff" : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.imageByPillText,
                      { color: imageByAttrId === null ? "#fff" : colors.textPrimary, fontWeight: imageByAttrId === null ? "700" : "500" },
                    ]}
                  >
                    None (Single Photo)
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* Section 4: Different Type of Images (images[valId]) */}
          {imageByAttrId !== null && selectedAttributes[imageByAttrId]?.length > 0 && (
            <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="images" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.formCardTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                    4. Photos by {attributes.find((a) => a.id === imageByAttrId)?.name || "Attribute"}
                  </Text>
                </View>
                <View style={[styles.selectedIdBadge, { backgroundColor: isDark ? "#1e293b" : "#EFF6FF", borderColor: COLORS.primaryLight }]}>
                  <Text style={[styles.selectedIdBadgeText, { color: COLORS.primary }]}>
                    image_by: {imageByAttrId}
                  </Text>
                </View>
              </View>

              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Upload photo corresponding to each selected {attributes.find((a) => a.id === imageByAttrId)?.name || "option"} (sent as images[ID]).
              </Text>

              <View style={styles.attrImagesList}>
                {selectedAttributes[imageByAttrId]?.map((valId) => {
                  const attrObj = attributes.find((a) => a.id === imageByAttrId);
                  const valObj = attrObj?.values?.find((v) => v.id === valId);
                  const valName = valObj?.value || `Value #${valId}`;
                  const colorDot =
                    attrObj?.slug === "color" || attrObj?.name.toLowerCase().includes("color")
                      ? getColorHex(valName)
                      : null;
                  const attachedImg = attributeImages[valId];

                  return (
                    <View
                      key={valId}
                      style={[
                        styles.attrImgCard,
                        {
                          backgroundColor: colors.backgroundAlt,
                          borderColor: attachedImg ? COLORS.primary : colors.borderLight,
                          borderWidth: attachedImg ? 1.5 : 1,
                        },
                      ]}
                    >
                      {/* Card Header */}
                      <View style={styles.attrImgCardHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                          {colorDot && (
                            <View
                              style={[
                                styles.colorDotIndicator,
                                { backgroundColor: colorDot, borderWidth: 1, borderColor: colors.borderLight },
                              ]}
                            />
                          )}
                          <Text style={[styles.attrImgValTitle, { color: colors.textPrimary }]}>
                            {valName}
                          </Text>
                          <View style={[styles.attrImgKeyBadge, { backgroundColor: isDark ? "#334155" : "#E2E8F0" }]}>
                            <Text style={[styles.attrImgKeyText, { color: colors.textSecondary }]}>
                              images[{valId}]
                            </Text>
                          </View>
                        </View>

                        {attachedImg ? (
                          <View style={styles.attrImgReadyBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            <Text style={styles.attrImgReadyText}>Photo Added</Text>
                          </View>
                        ) : (
                          <View style={styles.attrImgNeededBadge}>
                            <Ionicons name="alert-circle" size={14} color="#F59E0B" />
                            <Text style={styles.attrImgNeededText}>Required</Text>
                          </View>
                        )}
                      </View>

                      {/* Card Body */}
                      {attachedImg ? (
                        <View style={styles.attrImgPreviewRow}>
                          <Image source={{ uri: attachedImg.uri }} style={styles.attrImgThumb} resizeMode="cover" />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.attrImgFileName, { color: colors.textPrimary }]} numberOfLines={1}>
                              {attachedImg.fileName || `Photo for ${valName}`}
                            </Text>
                            <View style={styles.attrImgActionRow}>
                              <TouchableOpacity
                                style={[styles.attrImgActionBtn, { backgroundColor: COLORS.primary }]}
                                onPress={() => handlePickAttributeImage(valId, valName)}
                                activeOpacity={0.75}
                              >
                                <Ionicons name="camera-reverse" size={14} color="#fff" />
                                <Text style={styles.attrImgActionBtnText}>Change</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.attrImgDeleteBtn, { backgroundColor: isDark ? "#451a1a" : "#FEE2E2" }]}
                                onPress={() => handleRemoveAttributeImage(valId)}
                                activeOpacity={0.75}
                              >
                                <Ionicons name="trash-outline" size={14} color={COLORS.error} />
                                <Text style={[styles.attrImgDeleteBtnText, { color: COLORS.error }]}>Remove</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.attrImgEmptyBox}>
                          <TouchableOpacity
                            style={[styles.attrImgPickBtn, { backgroundColor: isDark ? "#1e293b" : "#EFF6FF", borderColor: COLORS.primaryLight }]}
                            onPress={() => handlePickAttributeImage(valId, valName)}
                            activeOpacity={0.75}
                          >
                            <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.attrImgPickBtnText, { color: COLORS.primary }]}>
                              Choose Photo for {valName}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Section 5: Variants Combinations Matrix */}
          <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="layers-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.formCardTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                  5. SKU Variants Matrix
                </Text>
              </View>
              {variants.length > 0 && (
                <View style={[styles.variantCountBadge, { backgroundColor: COLORS.primary }]}>
                  <Text style={styles.variantCountText}>{variants.length} Variants</Text>
                </View>
              )}
            </View>

            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Review individual variant prices, stock, and dimensions before submission.
            </Text>

            {/* Quick Bulk Apply Bar */}
            {variants.length > 0 && (
              <View style={[styles.bulkBox, { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight }]}>
                <TouchableOpacity
                  style={styles.bulkHeaderToggle}
                  onPress={() => setIsBulkOpen((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="flash" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.bulkHeaderTitle, { color: colors.textPrimary }]}>
                      Quick Fill Values (Apply to All {variants.length} Variants)
                    </Text>
                  </View>
                  <Ionicons name={isBulkOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
                </TouchableOpacity>

                {isBulkOpen && (
                  <View style={styles.bulkBody}>
                    <View style={styles.gridRow}>
                      <View style={styles.gridCol}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Price (₹)</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight }]}
                          placeholder="1299"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          value={bulkPrice}
                          onChangeText={setBulkPrice}
                        />
                      </View>
                      <View style={styles.gridCol}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Sale Price (₹)</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight }]}
                          placeholder="999"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          value={bulkSalePrice}
                          onChangeText={setBulkSalePrice}
                        />
                      </View>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={styles.gridCol}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Stock Qty</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight }]}
                          placeholder="10"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          value={bulkStock}
                          onChangeText={setBulkStock}
                        />
                      </View>
                      <View style={styles.gridCol}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Min Stock</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight }]}
                          placeholder="2"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          value={bulkMinStock}
                          onChangeText={setBulkMinStock}
                        />
                      </View>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={styles.gridCol}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Weight (kg)</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight }]}
                          placeholder="0.40"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          value={bulkWeight}
                          onChangeText={setBulkWeight}
                        />
                      </View>
                      <View style={styles.gridCol}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>L x W x H (cm)</Text>
                        <View style={{ flexDirection: "row", gap: 4 }}>
                          <TextInput
                            style={[styles.input, { flex: 1, backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight, textAlign: "center", paddingHorizontal: 2 }]}
                            placeholder="L"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                            value={bulkLength}
                            onChangeText={setBulkLength}
                          />
                          <TextInput
                            style={[styles.input, { flex: 1, backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight, textAlign: "center", paddingHorizontal: 2 }]}
                            placeholder="W"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                            value={bulkWidth}
                            onChangeText={setBulkWidth}
                          />
                          <TextInput
                            style={[styles.input, { flex: 1, backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight, textAlign: "center", paddingHorizontal: 2 }]}
                            placeholder="H"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                            value={bulkHeight}
                            onChangeText={setBulkHeight}
                          />
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.bulkApplyBtn, { backgroundColor: COLORS.primary }]}
                      onPress={handleApplyBulkToAll}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-done" size={16} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.bulkApplyBtnText}>Apply Values to All {variants.length} Variants</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Variants Cards List */}
            {variants.length === 0 ? (
              <View style={styles.emptyMatrixBox}>
                <Ionicons name="cube-outline" size={36} color={colors.textSecondary} />
                <Text style={[styles.emptyMatrixTitle, { color: colors.textPrimary }]}>
                  No Variant Combinations Generated
                </Text>
                <Text style={[styles.emptyMatrixSub, { color: colors.textSecondary }]}>
                  Select values in Section 2 (Attributes) above to automatically generate variant matrix rows, or tap below to add one manually.
                </Text>
                <TouchableOpacity
                  style={[styles.addCustomBtn, { backgroundColor: isDark ? "#1e293b" : "#EFF6FF", borderColor: COLORS.primaryLight }]}
                  onPress={handleAddCustomVariant}
                  activeOpacity={0.75}
                >
                  <Ionicons name="add" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.addCustomBtnText, { color: COLORS.primary }]}>Add Custom Variant</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.variantsCardList}>
                {variants.map((v, idx) => (
                  <View
                    key={v.id || idx}
                    style={[
                      styles.variantItemCard,
                      { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight },
                    ]}
                  >
                    {/* Variant Card Header */}
                    <View style={styles.variantItemHeader}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <View style={[styles.variantNumberTag, { backgroundColor: COLORS.primary }]}>
                            <Text style={styles.variantNumberTagText}>#{idx + 1}</Text>
                          </View>
                          <Text style={[styles.variantItemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                            {v.name}
                          </Text>
                        </View>

                        {/* Labels / Pills */}
                        {Array.isArray(v.labels) && v.labels.length > 0 && (
                          <View style={styles.variantPillsRow}>
                            {v.labels.map((lbl, lIdx) => (
                              <View
                                key={lIdx}
                                style={[styles.variantAttrPill, { backgroundColor: isDark ? "#334155" : "#E2E8F0" }]}
                              >
                                <Text style={[styles.variantAttrPillText, { color: colors.textPrimary }]}>
                                  {lbl.attrName}: {lbl.valName}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>

                      <TouchableOpacity
                        style={[styles.variantDeleteBtn, { backgroundColor: isDark ? "#451a1a" : "#FEE2E2" }]}
                        onPress={() => handleRemoveVariant(v.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>

                    {/* Variant Editable Fields */}
                    <View style={{ marginTop: 8 }}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Variant Title *</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight }]}
                        value={v.name}
                        onChangeText={(txt) => handleUpdateVariantField(v.id, "name", txt)}
                      />

                      <View style={styles.gridRow}>
                        <View style={styles.gridCol}>
                          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Price (₹) *</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight }]}
                            placeholder="1299"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                            value={String(v.price || "")}
                            onChangeText={(txt) => handleUpdateVariantField(v.id, "price", txt)}
                          />
                        </View>
                        <View style={styles.gridCol}>
                          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Sale Price (₹)</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight }]}
                            placeholder="999"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                            value={String(v.sale_price || "")}
                            onChangeText={(txt) => handleUpdateVariantField(v.id, "sale_price", txt)}
                          />
                        </View>
                      </View>

                      <View style={styles.gridRow}>
                        <View style={styles.gridCol}>
                          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Stock Qty *</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight }]}
                            placeholder="10"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                            value={String(v.stock_quantity ?? "")}
                            onChangeText={(txt) => handleUpdateVariantField(v.id, "stock_quantity", txt)}
                          />
                        </View>
                        <View style={styles.gridCol}>
                          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Min Stock Alert</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight }]}
                            placeholder="2"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                            value={String(v.min_stock_alert || "2")}
                            onChangeText={(txt) => handleUpdateVariantField(v.id, "min_stock_alert", txt)}
                          />
                        </View>
                      </View>

                      <View style={styles.gridRow}>
                        <View style={styles.gridCol}>
                          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Weight (kg)</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight }]}
                            placeholder="0.40"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                            value={String(v.weight || "")}
                            onChangeText={(txt) => handleUpdateVariantField(v.id, "weight", txt)}
                          />
                        </View>
                        <View style={styles.gridCol}>
                          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>L x W x H (cm)</Text>
                          <View style={{ flexDirection: "row", gap: 4 }}>
                            <TextInput
                              style={[styles.input, { flex: 1, backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight, textAlign: "center", paddingHorizontal: 2 }]}
                              placeholder="34"
                              placeholderTextColor={colors.textSecondary}
                              keyboardType="numeric"
                              value={String(v.length || "")}
                              onChangeText={(txt) => handleUpdateVariantField(v.id, "length", txt)}
                            />
                            <TextInput
                              style={[styles.input, { flex: 1, backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight, textAlign: "center", paddingHorizontal: 2 }]}
                              placeholder="24"
                              placeholderTextColor={colors.textSecondary}
                              keyboardType="numeric"
                              value={String(v.width || "")}
                              onChangeText={(txt) => handleUpdateVariantField(v.id, "width", txt)}
                            />
                            <TextInput
                              style={[styles.input, { flex: 1, backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight, textAlign: "center", paddingHorizontal: 2 }]}
                              placeholder="4"
                              placeholderTextColor={colors.textSecondary}
                              keyboardType="numeric"
                              value={String(v.height || "")}
                              onChangeText={(txt) => handleUpdateVariantField(v.id, "height", txt)}
                            />
                          </View>
                        </View>
                      </View>

                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Seller SKU Code</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight }]}
                        placeholder="FD-RED-S"
                        placeholderTextColor={colors.textSecondary}
                        value={v.seller_sku}
                        onChangeText={(txt) => handleUpdateVariantField(v.id, "seller_sku", txt)}
                      />
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.addMoreVariantRowBtn, { backgroundColor: isDark ? "#1e293b" : "#EFF6FF", borderColor: COLORS.primaryLight }]}
                  onPress={handleAddCustomVariant}
                  activeOpacity={0.75}
                >
                  <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.addMoreVariantRowBtnText, { color: COLORS.primary }]}>
                    + Add Another Custom Variant
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: COLORS.primary },
              variants.length === 0 && { opacity: 0.6 },
            ]}
            onPress={handleSubmitNewVariant}
            disabled={isSubmittingVariant || variants.length === 0}
            activeOpacity={0.85}
          >
            {isSubmittingVariant ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>
                  {variants.length > 1
                    ? `Submit ${variants.length} SKU Variants for Approval`
                    : "Submit SKU Variant for Approval"}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ================= MODAL: BATCH MAP SKUS BOTTOM SHEET (Flow 1 Existing SKU Add) ================= */}
      <Modal visible={showBatchMapModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.cardBg, maxHeight: "90%" }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Batch Map Catalog SKUs ({batchMapVariants.length})
                </Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {batchMapProductGroup?.productName} (Product #{batchMapProductGroup?.productId})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowBatchMapModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Top-level min_stock_alert setting */}
              <View
                style={[
                  styles.batchAlertBox,
                  { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight },
                ]}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary, marginBottom: 2 }]}>
                    Global Min Stock Alert Threshold
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    Root min_stock_alert sent with this batch mapping
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.smallInput,
                    {
                      backgroundColor: colors.cardBg,
                      color: colors.textPrimary,
                      borderColor: colors.borderLight,
                      width: 60,
                      textAlign: "center",
                    },
                  ]}
                  placeholder="10"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={batchMinStockAlert}
                  onChangeText={setBatchMinStockAlert}
                />
              </View>

              {/* Quick Bulk Fill Toolbar */}
              <View
                style={[
                  styles.batchQuickFillBox,
                  { backgroundColor: isDark ? "#1e293b" : "#EFF6FF", borderColor: COLORS.primaryLight },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <Ionicons name="flash" size={15} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textPrimary }}>
                    Quick Fill All {batchMapVariants.length} Variants
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>Price (₹)</Text>
                    <TextInput
                      style={[
                        styles.smallInput,
                        { backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight },
                      ]}
                      placeholder="e.g. 130"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      value={batchBulkPrice}
                      onChangeText={setBatchBulkPrice}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>Sale Price (₹)</Text>
                    <TextInput
                      style={[
                        styles.smallInput,
                        { backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight },
                      ]}
                      placeholder="e.g. 120"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      value={batchBulkSalePrice}
                      onChangeText={setBatchBulkSalePrice}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>Stock Qty</Text>
                    <TextInput
                      style={[
                        styles.smallInput,
                        { backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.borderLight },
                      ]}
                      placeholder="50"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      value={batchBulkStock}
                      onChangeText={setBatchBulkStock}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.batchApplyBtn, { backgroundColor: COLORS.primary }]}
                  onPress={handleApplyBatchBulk}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-done" size={14} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.batchApplyBtnText}>Apply to All</Text>
                </TouchableOpacity>
              </View>

              {/* Individual Variant Cards */}
              {batchMapVariants.map((v, idx) => (
                <View
                  key={v.product_sku_id}
                  style={[
                    styles.batchVariantCard,
                    { backgroundColor: colors.backgroundAlt, borderColor: colors.borderLight },
                  ]}
                >
                  <View style={styles.batchVarHeader}>
                    <View style={[styles.indexCircle, { backgroundColor: COLORS.primary }]}>
                      <Text style={styles.indexCircleText}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.batchVarName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {v.name}
                      </Text>
                      <Text style={[styles.batchVarCode, { color: colors.textSecondary }]}>
                        SKU ID: #{v.product_sku_id} {v.sku_code ? `• ${v.sku_code}` : ""}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>Price (₹) *</Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: colors.cardBg,
                            color: colors.textPrimary,
                            borderColor: colors.borderLight,
                            height: 38,
                          },
                        ]}
                        placeholder="Price"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        value={String(v.price || "")}
                        onChangeText={(t) => handleUpdateBatchVariantField(idx, "price", t)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>Sale Price</Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: colors.cardBg,
                            color: colors.textPrimary,
                            borderColor: colors.borderLight,
                            height: 38,
                          },
                        ]}
                        placeholder="Optional"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        value={String(v.sale_price || "")}
                        onChangeText={(t) => handleUpdateBatchVariantField(idx, "sale_price", t)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>Stock *</Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: colors.cardBg,
                            color: colors.textPrimary,
                            borderColor: colors.borderLight,
                            height: 38,
                          },
                        ]}
                        placeholder="Qty"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        value={String(v.stock_quantity ?? "")}
                        onChangeText={(t) => handleUpdateBatchVariantField(idx, "stock_quantity", t)}
                      />
                    </View>
                  </View>

                  <Text style={[styles.smallLabel, { color: colors.textSecondary, marginTop: 6 }]}>
                    Seller Custom SKU
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.cardBg,
                        color: colors.textPrimary,
                        borderColor: colors.borderLight,
                        height: 36,
                      },
                    ]}
                    placeholder="e.g. B-MD-250G"
                    placeholderTextColor={colors.textSecondary}
                    value={v.seller_sku}
                    onChangeText={(t) => handleUpdateBatchVariantField(idx, "seller_sku", t)}
                  />
                </View>
              ))}

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: COLORS.primary, marginTop: 16, marginBottom: 24 }]}
                onPress={handleSubmitBatchMap}
                disabled={isSubmittingBatchMap}
                activeOpacity={0.85}
              >
                {isSubmittingBatchMap ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.confirmBtnText}>
                      Submit {batchMapVariants.length} SKUs to Store
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  clearAttrBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  clearAttrBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyAttrText: {
    fontSize: 13,
    marginTop: 6,
    fontStyle: "italic",
  },
  attributesListContainer: {
    marginTop: 10,
  },
  attributeGroup: {
    marginBottom: 14,
  },
  attributeGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  attributeGroupName: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
  attrSelectedBadge: {
    marginLeft: "auto",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  attrSelectedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  attrChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  attrValueChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 2,
  },
  colorDotIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
  },
  attrValueChipText: {
    fontSize: 13,
  },
  autoFillNameBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  autoFillNameBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  imageByPillRow: {
    flexDirection: "row",
    paddingVertical: 4,
    gap: 8,
  },
  imageByPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  imageByPillText: {
    fontSize: 13,
  },
  attrImagesList: {
    marginTop: 6,
    gap: 10,
  },
  attrImgCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 2,
  },
  attrImgCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  attrImgValTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  attrImgKeyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  attrImgKeyText: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "600",
  },
  attrImgReadyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  attrImgReadyText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10B981",
  },
  attrImgNeededBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  attrImgNeededText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#F59E0B",
  },
  attrImgPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  attrImgThumb: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: "#ccc",
  },
  attrImgFileName: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  attrImgActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  attrImgActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  attrImgActionBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  attrImgDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  attrImgDeleteBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  attrImgEmptyBox: {
    paddingVertical: 4,
  },
  attrImgPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  attrImgPickBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  variantCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  variantCountText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  bulkBox: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  bulkHeaderToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  bulkHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  bulkBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  bulkApplyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  bulkApplyBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyMatrixBox: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyMatrixTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  emptyMatrixSub: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  addCustomBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  addCustomBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  variantsCardList: {
    gap: 12,
  },
  variantItemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  variantItemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.15)",
    paddingBottom: 8,
  },
  variantNumberTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  variantNumberTagText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  variantItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  variantPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  variantAttrPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  variantAttrPillText: {
    fontSize: 11,
    fontWeight: "500",
  },
  variantDeleteBtn: {
    padding: 6,
    borderRadius: 6,
  },
  addMoreVariantRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 6,
  },
  addMoreVariantRowBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  productGroupContainer: {
    marginBottom: 16,
  },
  productGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  productGroupTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  productGroupSub: {
    fontSize: 11,
    marginTop: 2,
  },
  batchMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  batchMapBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  schemaBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 12,
  },
  schemaBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  schemaBannerText: {
    fontSize: 12,
    lineHeight: 17,
  },
  requiredAttrPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  requiredAttrPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },
  requiredMissingHint: {
    fontSize: 11,
    color: "#D97706",
    fontWeight: "500",
    marginBottom: 8,
  },
  batchAlertBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  batchQuickFillBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  batchVariantCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  batchVarHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  indexCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  indexCircleText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  batchVarName: {
    fontSize: 13,
    fontWeight: "700",
  },
  batchVarCode: {
    fontSize: 11,
    marginTop: 1,
  },
  smallInput: {
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 13,
  },
  smallLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default AddSkuScreen;
