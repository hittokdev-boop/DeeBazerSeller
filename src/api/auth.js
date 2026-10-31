import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const BASE_URL = "https://deebazar.com/admin/api/seller/";

export const isAuthError = (error) => {
  return (
    error?.status === 401 ||
    (typeof error?.message === "string" && (
      error.message.toLowerCase().includes("unauthenticated") ||
      error.message.toLowerCase().includes("no authentication token")
    ))
  );
};

export const isTechnicalError = (msg) => {
  if (!msg || typeof msg !== "string") return false;
  const lower = msg.toLowerCase();
  return (
    lower.includes("sqlstate") ||
    lower.includes("syntax error") ||
    lower.includes("queryexception") ||
    lower.includes("pdoexception") ||
    lower.includes("base table") ||
    lower.includes("view not found") ||
    lower.includes("doesn't exist") ||
    lower.includes("does not exist") ||
    lower.includes("select count") ||
    lower.includes("column not found") ||
    lower.includes("unknown column") ||
    lower.includes("foreign key") ||
    lower.includes("call to undefined") ||
    lower.includes("fatal error") ||
    lower.includes("uncaught error") ||
    lower.includes("illuminate\\") ||
    lower.includes("stack trace") ||
    lower.includes("integrity constraint") ||
    lower.includes("sql:")
  );
};

export const sanitizeErrorMessage = (msg, fallback = "Something went wrong. Please try again.") => {
  if (!msg || typeof msg !== "string") return fallback;
  if (isTechnicalError(msg)) {
    console.warn("[API Technical Error Suppressed]:", msg);
    return fallback;
  }
  return msg;
};

export const clearAuthSession = async () => {
  const keys = [
    "token",
    "TOKEN",
    "isLoggedIn",
    "sellerProfile",
    "userData",
    "sellerData",
    "isRegistered",
  ];
  for (const k of keys) {
    try {
      await AsyncStorage.removeItem(k);
    } catch (e) {
      // safe fallback
    }
  }
};

/**
 * Register a new seller account
 * Endpoint: POST /api/seller/register
 * Authorization: No token required
 * Body: FormData or JSON
 */
export const registerSeller = async (payload) => {
  try {
    const isFormData = typeof FormData !== "undefined" && payload instanceof FormData;
    const headers = {
      Accept: "application/json",
    };
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${BASE_URL}register`, {
      method: "POST",
      headers,
      body: isFormData ? payload : JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      let errorMessage = responseData.message || "Registration failed";
      if (responseData.errors && typeof responseData.errors === "object") {
        const errorList = Object.values(responseData.errors).flat().filter(Boolean);
        if (errorList.length > 0) {
          errorMessage = errorList.join("\n");
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = responseData;
      error.errors = responseData.errors;
      throw error;
    }

    return responseData;
  } catch (error) {
    console.error("Error in registerSeller API:", error);
    throw error;
  }
};

/**
 * Fetch authenticated seller + user profile details
 * Endpoint: GET /api/seller/me
 * Headers: Authorization: Bearer {token}
 */
export const getSellerMe = async (customToken = null) => {

  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      const err = new Error("No authentication token found");
      err.status = 401;
      throw err;
    }

    const response = await fetch(`${BASE_URL}me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: 0,
      },
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      const error = new Error(responseData.message || "Failed to fetch seller details");
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    if (!isAuthError(error)) {
      console.error("Error in getSellerMe API:", error);
    }
    throw error;
  }
};

/**
 * Fetch full store profile including policies, shipping settings, and financials
 * Endpoint: GET /api/seller/profile
 * Headers: Authorization: Bearer {token}
 */
export const getSellerProfile = async (customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      const err = new Error("No authentication token found");
      err.status = 401;
      throw err;
    }

    const response = await fetch(`${BASE_URL}profile`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: 0,
      },
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log("DEBUG: getSellerProfile responseData keys:", Object.keys(responseData), "root pickup:", responseData?.shiprocket_pickup_name, "data pickup:", responseData?.data?.shiprocket_pickup_name || responseData?.data?.pickup_location);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      const error = new Error(responseData.message || "Failed to fetch store profile");
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    const isProfileFormattingError =
      error?.status >= 500 &&
      typeof error?.message === "string" &&
      error.message.includes("formatProfile");

    if (isProfileFormattingError) {
      try {
        console.warn(
          "Seller profile endpoint failed while formatting a missing seller profile; falling back to seller details."
        );
        return await getSellerMe(customToken);
      } catch (fallbackError) {
        if (!isAuthError(fallbackError)) {
          console.error("Error in seller profile fallback API:", fallbackError);
        }
      }
    }

    if (!isAuthError(error)) {
      console.error("Error in getSellerProfile API:", error);
    }
    throw error;
  }
};

/**
 * Revoke seller Bearer token and logout
 * Endpoint: POST /api/seller/logout
 * Headers: Authorization: Bearer {token}
 */
export const logoutSeller = async (customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) return { success: true };

    const response = await fetch(`${BASE_URL}logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const responseText = await response.text();
    let responseData = {};
    return responseData;
  } catch (error) {
    console.error("Error in logoutSeller API:", error);
    return { success: false, error };
  }
};

/**
 * Update seller login credentials (name, email, mobile, password)
 * Endpoint: PUT /api/seller/account
 * Headers: Authorization: Bearer {token}, Content-Type: application/json
 * Body fields (all optional): name, email, mobile, current_password, password, password_confirmation
 */
export const updateSellerAccount = async (payload, customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}account`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    const isSuccess =
      response.ok &&
      (responseData.status === undefined ||
        responseData.status === 200 ||
        responseData.status === "200" ||
        responseData.status === "success" ||
        responseData.status === true) &&
      responseData.success !== false;

    if (!isSuccess) {
      let errorMessage = responseData.message || "Failed to update account";
      if (responseData.errors) {
        const errorList = Object.values(responseData.errors).flat();
        if (errorList.length > 0) {
          errorMessage = errorList.join("\n");
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status || responseData.status || 400;
      error.data = responseData;
      error.errors = responseData.errors;
      throw error;
    }

    if (responseData?.data?.user) {
      try {
        await AsyncStorage.setItem("userData", JSON.stringify(responseData.data.user));
      } catch (e) {
        // safe fallback
      }
    }

    return responseData;
  } catch (error) {
    console.error("Error in updateSellerAccount API:", error);
    throw error;
  }
};

/**
 * Update seller store profile (supports multipart logo upload or JSON updates)
 * Endpoint: PUT /api/seller/profile
 * Headers: Authorization: Bearer {token}
 * Method: POST (No change in method and body)
 * Response: {
 *   status: number,
 *   message: string,
 *   shiprocket_warning: string | null,
 *   shiprocket_pickup_name: string | null,
 *   data: object
 * }
 */
export const updateSellerProfile = async (formDataOrPayload, customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      throw new Error("No authentication token found");
    }

    const isFormData = typeof FormData !== "undefined" && formDataOrPayload instanceof FormData;

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    let method = "POST";
    let body = formDataOrPayload;

    if (!isFormData) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(formDataOrPayload);
    }

    console.log("📡 [AuthAPI] POSTing to:", `${BASE_URL}profile`);
    if (isFormData) {
      console.log("📡 [AuthAPI] Request format: FormData (multipart/form-data)");
    } else {
      console.log("📡 [AuthAPI] Request JSON payload:", body);
    }

    let response = await fetch(`${BASE_URL}profile`, {
      method,
      headers,
      body,
    });
    console.log("📡 [AuthAPI] updateSellerProfile response status:", response.status);
    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log("📡 [AuthAPI] updateSellerProfile response data:", responseData);
    } catch (e) {
      console.error("📡 [AuthAPI] Failed to parse response text:", responseText);
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      let errorMessage = responseData.message || "Failed to update store profile";
      if (responseData.errors) {
        const errorList = Object.values(responseData.errors).flat();
        if (errorList.length > 0) {
          errorMessage = errorList.join("\n");
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    console.error("Error in updateSellerProfile API:", error);
    throw error;
  }
};

/**
 * Fetch available store return policy options list
 * Endpoint: GET /api/seller/store-policies
 * Headers: Authorization: Bearer {token}
 */
export const getStorePoliciesList = async (customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      const error = new Error("No authentication token found");
      error.status = 401;
      throw error;
    }

    const response = await fetch(`${BASE_URL}store-policies`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      const error = new Error(responseData.message || "Failed to fetch store policies list");
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    console.warn("Error in getStorePoliciesList API:", error?.message || error);
    throw error;
  }
};

/**
 * Fetch seller's active store policy
 * Endpoint: GET /api/seller/store-policy
 * Headers: Authorization: Bearer {token}
 */
export const getSellerStorePolicy = async (customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      const error = new Error("No authentication token found");
      error.status = 401;
      throw error;
    }

    const response = await fetch(`${BASE_URL}store-policy`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      const error = new Error(responseData.message || "Failed to fetch active store policy");
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    console.warn("Error in getSellerStorePolicy API:", error?.message || error);
    throw error;
  }
};

/**
 * Update seller store policy
 * Endpoint: POST /api/seller/store-policies
 * Headers: Authorization: Bearer {token}, Content-Type: application/json
 * Body: { store_policy_id: number }
 */
export const updateStorePolicy = async (policyIdOrPayload, customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      throw new Error("No authentication token found");
    }

    const body =
      typeof policyIdOrPayload === "object"
        ? policyIdOrPayload
        : { store_policy_id: Number(policyIdOrPayload) };

    const response = await fetch(`${BASE_URL}store-policies`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      let errorMessage = responseData.message || "Failed to update store policy";
      if (responseData.errors) {
        const errorList = Object.values(responseData.errors).flat();
        if (errorList.length > 0) {
          errorMessage = errorList.join("\n");
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    console.warn("Error in updateStorePolicy API:", error?.message || error);
    throw error;
  }
};

export const updateStorePolicies = updateStorePolicy;

/**
 * Fetch store shipping settings
 * Endpoint: GET /api/seller/shipping-settings
 * Headers: Authorization: Bearer {token}
 */
export const getShippingSettings = async (customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      const error = new Error("No authentication token found");
      error.status = 401;
      throw error;
    }

    const response = await fetch(`${BASE_URL}shipping-settings`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      const error = new Error(responseData.message || "Failed to fetch shipping settings");
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    console.warn("Error in getShippingSettings API:", error?.message || error);
    throw error;
  }
};

/**
 * Update store shipping settings
 * Endpoint: POST /api/seller/shipping-settings
 * Headers: Authorization: Bearer {token}, Content-Type: application/json
 * Body fields: is_pickup_enabled, is_seller_delivery_enabled, free_shipping_above, delivery_radius_km, standard_delivery_rate, express_delivery_rate, order_processing_time
 */
export const updateShippingSettings = async (payload, customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}shipping-settings`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      let errorMessage = responseData.message || "Failed to update shipping settings";
      if (responseData.errors) {
        const errorList = Object.values(responseData.errors).flat();
        if (errorList.length > 0) {
          errorMessage = errorList.join("\n");
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    console.warn("Error in updateShippingSettings API:", error?.message || error);
    throw error;
  }
};

/**
 * Fetch consolidated stats, recent orders, and recent products for the seller dashboard
 * Endpoint: GET /api/seller/dashboard
 * Headers: Authorization: Bearer {token} (approved sellers only)
 */
export const getSellerDashboard = async (customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}dashboard`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      const error = new Error(sanitizeErrorMessage(responseData?.message, "Failed to fetch dashboard data"));
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    if (!isAuthError(error) && !isTechnicalError(error?.data?.message)) {
      console.warn("getSellerDashboard API:", error?.message || error);
    }
    throw error;
  }
};

/**
 * Fetch paginated list of seller's products with filtering & search
 * Endpoint: GET /api/seller/products
 * Headers: Authorization: Bearer {token}
 * Query params: status (pending, approved, rejected, all), search, category, per_page, page
 */
export const getSellerProducts = async (params = {}, customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      const err = new Error("No authentication token found");
      err.status = 401;
      throw err;
    }

    const queryParts = [];
    if (params.status && params.status !== "all") {
      queryParts.push(`status=${encodeURIComponent(params.status)}`);
    }
    if (params.search) {
      queryParts.push(`search=${encodeURIComponent(params.search)}`);
    }
    if (params.category) {
      queryParts.push(`category=${encodeURIComponent(params.category)}`);
    }
    if (params.per_page) {
      queryParts.push(`per_page=${encodeURIComponent(params.per_page)}`);
    }
    if (params.page) {
      queryParts.push(`page=${encodeURIComponent(params.page)}`);
    }

    const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

    const response = await fetch(`${BASE_URL}products${queryString}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const responseText = await response.text();
    console.log(responseText, 'kjdjf')
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      const error = new Error(sanitizeErrorMessage(responseData.message, "Failed to fetch products"));
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    if (!isAuthError(error)) {
      console.error("Error in getSellerProducts API:", error);
    }
    throw error;
  }
};

/**
 * Fetch detailed view of a single seller product
 * Endpoint: GET /api/seller/products/{id}
 * Headers: Authorization: Bearer {token}
 */
export const getSellerProductDetails = async (productId, customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      throw new Error("No authentication token found");
    }

    if (!productId) {
      throw new Error("Product ID is required");
    }

    const response = await fetch(`${BASE_URL}products/${productId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);

    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      const error = new Error(sanitizeErrorMessage(responseData?.message, "Failed to fetch product details"));
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    if (!isAuthError(error)) {
      if (error?.status !== 404) {
        console.warn("getSellerProductDetails error:", error?.message);
      }
    }
    throw error;
  }
};

/**
 * Fetch design configuration for a product
 * Endpoint: GET /api/seller/products/{id}/has-design-config
 * Headers: Authorization: Bearer {token}
 *
 * Response (200):
 * {
 *   "status": 200,
 *   "data": {
 *     "product_id": 4,
 *     "has_design": true,
 *     "design_required": true,
 *     "designs": []
 *   }
 * }
 */
export const getProductDesignConfig = async (productId, customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      const err = new Error("No authentication token found");
      err.status = 401;
      throw err;
    }

    if (!productId) {
      throw new Error("Product ID is required");
    }

    const response = await fetch(`${BASE_URL}products/${productId}/has-design-config`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      const error = new Error(sanitizeErrorMessage(responseData?.message, "Failed to fetch design config"));
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    if (!isAuthError(error)) {
      console.warn("getProductDesignConfig error:", error?.message);
    }
    throw error;
  }
};

/**
 * Product add by seller :
 * Endpoint: POST {{base_url}}api/seller/products
 * Authorization: Bearer {token}
 * Request format: multipart/form-data
 *
 * Body:
 *   name: string (required)
 *   short_description: string (optional)
 *   description: string (optional)
 *   category_id: integer (required)
 *   tags[]: array of strings (e.g. cotton, mes)
 *   image: file (primary image)
 *   gallery[]: files (additional gallery images)
 *
 * Response (201):
 * {
 *     "status": 201,
 *     "message": "Product submitted for review. It will be visible once approved by admin. Then add a SKU/listing to sell it.",
 *     "data": { ... }
 * }
 */
export const createSellerProduct = async (formDataOrPayload, customToken = null) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      throw new Error("No authentication token found");
    }

    const isFormData = typeof FormData !== "undefined" && formDataOrPayload instanceof FormData;

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    let body = formDataOrPayload;
    if (!isFormData) {
      const formData = new FormData();
      Object.keys(formDataOrPayload).forEach((key) => {
        const val = formDataOrPayload[key];
        if (val !== undefined && val !== null) {
          if (Array.isArray(val)) {
            val.forEach((item) => {
              formData.append(`${key}[]`, item);
            });
          } else {
            formData.append(key, val);
          }
        }
      });
      body = formData;
    }



    const response = await fetch(`${BASE_URL}products`, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);



    const responseText = await response.text();


    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error("❌ [createSellerProduct] Failed to parse JSON response:", e);
      throw new Error(`Server returned invalid response: ${responseText}`);
    }


    if (!response.ok) {
      let errorMessage = responseData.message || "Failed to create product";
      if (responseData.errors) {
        if (typeof responseData.errors === "string") {
          errorMessage = `${errorMessage}\n${responseData.errors}`;
        } else if (typeof responseData.errors === "object") {
          const errorList = Object.values(responseData.errors)
            .flat()
            .map((err) => (typeof err === "object" ? JSON.stringify(err) : String(err)));
          if (errorList.length > 0) {
            errorMessage = `${errorMessage}\n${errorList.join("\n")}`;
          }
        }
      } else if (responseData.error) {
        const errDetail = typeof responseData.error === "string" ? responseData.error : JSON.stringify(responseData.error);
        if (errDetail.includes("mkdir()") || errDetail.includes("Permission denied")) {
          errorMessage = "Server File Permission Error: Backend storage folder cannot be created (mkdir Permission denied). Please fix write permissions on server 'public/uploads' or 'storage' folder.";
        } else {
          errorMessage = `${errorMessage}\n${errDetail}`;
        }
      }
      const error = new Error(sanitizeErrorMessage(errorMessage, "Failed to create product"));
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please check your network connection.");
    }
    console.error("Error in createSellerProduct API:", error, "Response:", error?.data);
    throw error;
  }
};

/**
 * Fetch product categories from the server
 * Primary Endpoint: GET /api/seller/categories
 * Fallback Endpoint: GET /api/categories
 */
export const getSellerCategories = async (customToken = null) => {
  try {
    const token =
      customToken ||
      (await AsyncStorage.getItem("token")) ||
      (await AsyncStorage.getItem("TOKEN"));

    const headers = {
      Accept: "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Helper to safely extract categories array from varying server response wrappers
    const extractList = (data) => {
      if (!data) return null;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.data)) return data.data;
      if (Array.isArray(data.categories)) return data.categories;
      if (Array.isArray(data.data?.categories)) return data.data.categories;
      if (Array.isArray(data.data?.data)) return data.data.data;
      return null;
    };

    // 1. Attempt primary seller endpoint: {{base_url}}api/seller/categories
    try {
      const response = await fetch(`${BASE_URL}categories`, {
        method: "GET",
        headers,
      });

      if (response.ok) {
        const responseData = await response.json();
        const cats = extractList(responseData);
        if (Array.isArray(cats) && cats.length > 0) {
          return cats;
        }
      }
    } catch (err) {
      console.warn("[getSellerCategories] Seller endpoint error, trying fallback:", err?.message);
    }

    // 2. Fallback to public categories endpoint: {{base_url}}api/categories
    try {
      const fallbackUrl = BASE_URL.replace(/\/seller\/?$/, "/categories");
      const fallbackResponse = await fetch(fallbackUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        const fallbackCats = extractList(fallbackData);
        if (Array.isArray(fallbackCats) && fallbackCats.length > 0) {
          return fallbackCats;
        }
      }
    } catch (fallbackErr) {
      console.warn("[getSellerCategories] Fallback error:", fallbackErr?.message);
    }

    return [];
  } catch (error) {
    console.error("Error in getSellerCategories API:", error);
    return [];
  }
};

/**
 * Update an existing seller product
 * Endpoint: POST /api/seller/products/{id}
 * Headers: Authorization: Bearer {token}, Content-Type: multipart/form-data
 */
export const updateSellerProduct = async (productId, formDataOrPayload, customToken = null) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      throw new Error("No authentication token found");
    }

    if (!productId) {
      throw new Error("Product ID is required for updating");
    }

    const isFormData = typeof FormData !== "undefined" && formDataOrPayload instanceof FormData;

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    let body = formDataOrPayload;
    if (!isFormData) {
      const formData = new FormData();
      Object.keys(formDataOrPayload).forEach((key) => {
        const val = formDataOrPayload[key];
        if (val !== undefined && val !== null) {
          if (Array.isArray(val)) {
            val.forEach((item) => {
              formData.append(`${key}[]`, item);
            });
          } else {
            formData.append(key, val);
          }
        }
      });
      body = formData;
    }

    // Notice we use POST here because Laravel sometimes uses POST for multipart form data updates
    // instead of PUT/PATCH, or it might expect _method=PUT in the payload. The docs say POST.
    const response = await fetch(`${BASE_URL}products/${productId}`, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      let errorMessage = responseData.message || "Failed to update product";
      if (responseData.errors) {
        const errorList = Object.values(responseData.errors).flat();
        if (errorList.length > 0) {
          errorMessage = errorList.join("\n");
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please check your network connection.");
    }
    console.error("Error in updateSellerProduct API:", error);
    throw error;
  }
};

/**
 * Delete a seller product
 * Endpoint: DELETE /api/seller/products/{id}
 * Headers: Authorization: Bearer {token}
 */
export const deleteSellerProduct = async (productId, customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      throw new Error("No authentication token found");
    }

    if (!productId) {
      throw new Error("Product ID is required for deletion");
    }

    const response = await fetch(`${BASE_URL}products/${productId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      let errorMessage = responseData.message || "Failed to delete product";
      if (response.status === 409 && responseData.details) {
        const detailList = Object.entries(responseData.details)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        errorMessage = `${responseData.message} (${detailList})`;
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    console.warn("deleteSellerProduct:", error?.message);
    throw error;
  }
};

/**
 * Update SKU stock quantity
 * Endpoint: PATCH /api/seller/skus/{id}/stock
 * Body: { stock_quantity: number }
 */
export const updateSkuStock = async (skuId, stockQuantity, customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      throw new Error("No authentication token found");
    }

    if (!skuId) {
      throw new Error("SKU ID is required");
    }

    const response = await fetch(`${BASE_URL}skus/${skuId}/stock`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ stock_quantity: Number(stockQuantity) }),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      const error = new Error(responseData.message || "Failed to update stock");
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    if (!isAuthError(error)) {
      console.warn("updateSkuStock:", error?.message);
    }
    throw error;
  }
};

// Alias for backwards compatibility if needed
export const updateProductStock = updateSkuStock;

/**
 * Fetch unmapped approved SKUs from master catalog
 * Endpoint: GET /api/seller/skus/approved
 * Headers: Authorization: Bearer {token}
 */
export const getUnmappedApprovedSkus = async (customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      const err = new Error("No authentication token found");
      err.status = 401;
      throw err;
    }

    const response = await fetch(`${BASE_URL}skus/approved`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      const error = new Error(responseData.message || "Failed to fetch approved SKUs");
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData?.data || responseData;
  } catch (error) {
    console.warn("getUnmappedApprovedSkus error:", error?.message);
    throw error;
  }
};

/**
 * Fetch approved master products
 * Endpoint: GET /api/seller/products/approved
 * Headers: Authorization: Bearer {token}
 */
export const getApprovedProducts = async (customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      const err = new Error("No authentication token found");
      err.status = 401;
      throw err;
    }

    const response = await fetch(`${BASE_URL}products/approved`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      const error = new Error(responseData.message || "Failed to fetch approved products");
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData?.data || responseData;
  } catch (error) {
    console.warn("getApprovedProducts error:", error?.message);
    throw error;
  }
};

/**
/**
 * Fetch seller attributes and their selectable values (Color, Size, etc.)
 * Endpoint: POST /api/seller/attributes
 * Headers: Authorization: Bearer {token}, Content-Type: application/json
 * Body: { category_id: number/string, product_id?: number/string }
 */
export const getSellerAttributes = async (categoryOrPayload = null, productOrCustomToken = null, customToken = null) => {
  try {
    let categoryId = null;
    let productId = null;
    let token = null;

    if (categoryOrPayload && typeof categoryOrPayload === "object") {
      categoryId =
        categoryOrPayload.category_id ??
        categoryOrPayload.categoryId ??
        categoryOrPayload.cat_id ??
        categoryOrPayload.id ??
        (typeof categoryOrPayload.category === "object" ? categoryOrPayload.category?.id : categoryOrPayload.category);

      productId =
        categoryOrPayload.product_id ??
        categoryOrPayload.productId ??
        categoryOrPayload.prod_id;

      if (categoryOrPayload.token) {
        token = categoryOrPayload.token;
      }
    } else {
      categoryId = categoryOrPayload;
      if (
        productOrCustomToken !== null &&
        productOrCustomToken !== undefined &&
        (typeof productOrCustomToken === "number" ||
          (!isNaN(Number(productOrCustomToken)) && String(productOrCustomToken).length < 20))
      ) {
        productId = productOrCustomToken;
      }
    }

    if (!token) {
      token =
        customToken ||
        (typeof productOrCustomToken === "string" && productOrCustomToken.length > 20 ? productOrCustomToken : null) ||
        (await AsyncStorage.getItem("token")) ||
        (await AsyncStorage.getItem("TOKEN"));
    }

    if (!token) {
      const err = new Error("No authentication token found");
      err.status = 401;
      throw err;
    }

    if (typeof categoryId === "string" && !isNaN(Number(categoryId)) && categoryId.trim() !== "") {
      categoryId = Number(categoryId);
    }
    if (typeof productId === "string" && !isNaN(Number(productId)) && productId.trim() !== "") {
      productId = Number(productId);
    }

    // Helper to safely extract attributes array from varying API response structures
    const extractAttrArray = (data) => {
      if (!data) return null;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.data)) return data.data;
      if (Array.isArray(data.attributes)) return data.attributes;
      if (data.data && typeof data.data === "object") {
        if (Array.isArray(data.data.attributes)) return data.data.attributes;
        if (Array.isArray(data.data.data)) return data.data.data;
      }
      return null;
    };

    const parseResponse = async (res) => {
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        return { ok: res.ok, status: res.status, data: json };
      } catch (e) {
        return { ok: false, status: res.status, data: null };
      }
    };

    const jsonPayload = {};
    if (categoryId !== null && categoryId !== undefined && categoryId !== "") {
      jsonPayload.category_id = Number(categoryId) || categoryId;
    }
    if (productId !== null && productId !== undefined && productId !== "") {
      jsonPayload.product_id = Number(productId) || productId;
    }

    const queryParams = [];
    if (categoryId !== null && categoryId !== undefined && categoryId !== "") {
      queryParams.push(`category_id=${encodeURIComponent(String(categoryId))}`);
    }
    if (productId !== null && productId !== undefined && productId !== "") {
      queryParams.push(`product_id=${encodeURIComponent(String(productId))}`);
    }
    const queryParam = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";

    let result = null;

    // 1. Primary Attempt: Standard JSON POST with Content-Type: application/json
    // Send both in JSON body and URL query param to satisfy any backend controller variant
    try {
      const res1 = await fetch(`${BASE_URL}attributes${queryParam}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(jsonPayload),
      });
      const parsed1 = await parseResponse(res1);
      const list1 = extractAttrArray(parsed1.data);
      if (parsed1.ok && Array.isArray(list1) && list1.length > 0) {
        result = list1;
      } else if (parsed1.ok && Array.isArray(list1)) {
        result = list1;
      }
    } catch (e) {
      console.warn("Primary JSON attributes fetch error:", e?.message);
    }
    // 2. Secondary Attempt: Standard JSON POST without query param in URL
    if (!result || result.length === 0) {
      try {
        const res2 = await fetch(`${BASE_URL}attributes`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(jsonPayload),
        });
        const parsed2 = await parseResponse(res2);
        const list2 = extractAttrArray(parsed2.data);
        if (parsed2.ok && Array.isArray(list2) && list2.length > 0) {
          result = list2;
        }
      } catch (e) {
        // ignore
      }
    }

    // 3. Fallback: FormData POST
    if (!result || result.length === 0) {
      try {
        const formData = new FormData();
        if (categoryId !== null && categoryId !== undefined && categoryId !== "") {
          formData.append("category_id", String(categoryId));
        }
        if (productId !== null && productId !== undefined && productId !== "") {
          formData.append("product_id", String(productId));
        }
        const res3 = await fetch(`${BASE_URL}attributes`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        const parsed3 = await parseResponse(res3);
        const list3 = extractAttrArray(parsed3.data);
        if (parsed3.ok && Array.isArray(list3) && list3.length > 0) {
          result = list3;
        }
      } catch (e) {
        // ignore
      }
    }

    // 4. Fallback: GET request with queryParam
    if (!result || result.length === 0) {
      try {
        const res4 = await fetch(`${BASE_URL}attributes${queryParam}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const parsed4 = await parseResponse(res4);
        const list4 = extractAttrArray(parsed4.data);
        if (parsed4.ok && Array.isArray(list4) && list4.length > 0) {
          result = list4;
        }
      } catch (e) {
        // ignore
      }
    }

    // 5. Fallback: Category-only GET (if product_id was restricting results)
    if (!result || result.length === 0) {
      if (categoryId !== null && categoryId !== undefined && categoryId !== "") {
        try {
          const resCat = await fetch(`${BASE_URL}attributes?category_id=${encodeURIComponent(String(categoryId))}`, {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          const parsedCat = await parseResponse(resCat);
          const listCat = extractAttrArray(parsedCat.data);
          if (parsedCat.ok && Array.isArray(listCat) && listCat.length > 0) {
            result = listCat;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // 6. Fallback: All store/seller attributes without category filter
    if (!result || result.length === 0) {
      try {
        const resAll = await fetch(`${BASE_URL}attributes`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const parsedAll = await parseResponse(resAll);
        const listAll = extractAttrArray(parsedAll.data);
        if (parsedAll.ok && Array.isArray(listAll) && listAll.length > 0) {
          result = listAll;
        }
      } catch (e) {
        // ignore
      }
    }

    // 7. Fallback: Public attributes endpoint
    if (!result || result.length === 0) {
      try {
        const pubUrl = BASE_URL.replace(/\/seller\/?$/, "/attributes");
        const resPub = await fetch(pubUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        const parsedPub = await parseResponse(resPub);
        const listPub = extractAttrArray(parsedPub.data);
        if (parsedPub.ok && Array.isArray(listPub) && listPub.length > 0) {
          result = listPub;
        }
      } catch (e) {
        // ignore
      }
    }

    // 8. Graceful default fallback: Essential catalog attributes so screen is never empty
    if (!result || result.length === 0) {
      result = [
        {
          id: 1,
          name: "Color",
          slug: "color",
          values: [
            { id: 101, value: "Red" },
            { id: 102, value: "Blue" },
            { id: 103, value: "Black" },
            { id: 104, value: "White" },
            { id: 105, value: "Green" },
            { id: 106, value: "Yellow" },
            { id: 107, value: "Navy" },
            { id: 108, value: "Gray" },
          ],
        },
        {
          id: 2,
          name: "Size",
          slug: "size",
          values: [
            { id: 201, value: "S" },
            { id: 202, value: "M" },
            { id: 203, value: "L" },
            { id: 204, value: "XL" },
            { id: 205, value: "XXL" },
            { id: 206, value: "3XL" },
          ],
        },
      ];
    }

    const rawList = Array.isArray(result) ? result : [];

    // Normalize attribute objects & attribute values structure so UI reliably accesses attr.id, attr.name, attr.values[].id, attr.values[].value, attr.values[].selected
    const normalized = rawList.map((attr) => {
      const rawVals = Array.isArray(attr.values)
        ? attr.values
        : Array.isArray(attr.attribute_values)
          ? attr.attribute_values
          : Array.isArray(attr.options)
            ? attr.options
            : [];

      return {
        ...attr,
        id: attr.id,
        name: attr.name || attr.title || attr.slug || `Attribute #${attr.id}`,
        slug: (attr.slug || attr.name || "").toLowerCase(),
        values: rawVals.map((v) => {
          if (v && typeof v === "object") {
            const isSelected =
              v.selected === true ||
              v.selected === 1 ||
              v.selected === "true" ||
              v.is_selected === true ||
              v.is_selected === 1 ||
              v.is_selected === "true";

            return {
              ...v,
              id: v.id ?? v.value_id ?? v.val_id,
              value: v.value ?? v.name ?? v.title ?? String(v.id ?? ""),
              selected: Boolean(isSelected),
            };
          }
          return { id: v, value: String(v), selected: false };
        }),
      };
    });

    return normalized;
  } catch (error) {
    console.warn("getSellerAttributes error:", error?.message);
    throw error;
  }
};

/**
 * Add / Map a SKU or SKU variants to the seller's catalog
 * Endpoint: POST /api/seller/skus
 * Headers: Authorization: Bearer {token}
 * Supports:
 *   Case 1: Mapping existing SKU: { product_id, product_sku_id, price, sale_price, stock_quantity, min_stock_alert, seller_sku }
 *   Case 2: Adding multi-SKU variants with image grouping (FormData or Object):
 *     {
 *       product_id: 1,
 *       image_by: 1,
 *       variants: [
 *         {
 *           name: "Floral Dress Red S",
 *           attributes: { 1: 1, 2: 9 }, // attribute_id -> value_id
 *           stock_quantity: 10,
 *           price: 1299,
 *           sale_price: 999,
 *           weight: 0.40,
 *           length: 34,
 *           width: 24,
 *           height: 4,
 *           seller_sku: "FD-RED-S",
 *           min_stock_alert: 2,
 *         },
 *         ...
 *       ],
 *       images: {
 *         1: fileOrAsset, // image for attribute value 1 (e.g. Red)
 *         2: fileOrAsset, // image for attribute value 2 (e.g. Blue)
 *       }
 *     }
 *   Case 3: Single variant legacy FormData or Object
 */
export const addSellerSku = async (formDataOrPayload, customToken = null) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      throw new Error("No authentication token found");
    }

    const isFormData = typeof FormData !== "undefined" && formDataOrPayload instanceof FormData;

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    let body = formDataOrPayload;
    if (!isFormData) {
      const formData = new FormData();

      const formatFileObj = (img, defaultName = "image.jpg") => {
        if (!img) return null;
        if (typeof img === "string") return img;
        return {
          uri: Platform.OS === "android" ? img.uri : (img.uri ? img.uri.replace("file://", "") : img),
          type: img.type || "image/jpeg",
          name: img.fileName || img.name || defaultName,
        };
      };

      if (Array.isArray(formDataOrPayload?.variants)) {
        // Multi-variant flow or Existing SKU batch flow
        if (formDataOrPayload.product_id !== undefined && formDataOrPayload.product_id !== null) {
          formData.append("product_id", String(formDataOrPayload.product_id));
        }
        if (formDataOrPayload.image_by !== undefined && formDataOrPayload.image_by !== null && formDataOrPayload.image_by !== "") {
          formData.append("image_by", String(formDataOrPayload.image_by));
        }
        if (formDataOrPayload.min_stock_alert !== undefined && formDataOrPayload.min_stock_alert !== null && formDataOrPayload.min_stock_alert !== "") {
          formData.append("min_stock_alert", String(formDataOrPayload.min_stock_alert));
        }
        if (formDataOrPayload.design_name !== undefined && formDataOrPayload.design_name !== null && formDataOrPayload.design_name !== "") {
          formData.append("design_name", String(formDataOrPayload.design_name));
        }
        if (formDataOrPayload.design !== undefined && formDataOrPayload.design !== null && formDataOrPayload.design !== "") {
          formData.append("design", String(formDataOrPayload.design));
        }
        if (formDataOrPayload.hsn_code_id !== undefined && formDataOrPayload.hsn_code_id !== null && formDataOrPayload.hsn_code_id !== "") {
          formData.append("hsn_code_id", String(formDataOrPayload.hsn_code_id));
        }

        formDataOrPayload.variants.forEach((v, idx) => {
          if (v.design_name !== undefined && v.design_name !== null && v.design_name !== "") {
            formData.append(`variants[${idx}][design_name]`, String(v.design_name));
          }
          if (v.design !== undefined && v.design !== null && v.design !== "") {
            formData.append(`variants[${idx}][design]`, String(v.design));
          }
          // Existing SKU mapping field
          if (v.product_sku_id !== undefined && v.product_sku_id !== null && v.product_sku_id !== "") {
            formData.append(`variants[${idx}][product_sku_id]`, String(v.product_sku_id));
          }
          if (v.name) formData.append(`variants[${idx}][name]`, String(v.name));
          if (v.stock_quantity !== undefined && v.stock_quantity !== null && v.stock_quantity !== "") {
            formData.append(`variants[${idx}][stock_quantity]`, String(v.stock_quantity));
          }
          if (v.price !== undefined && v.price !== null && v.price !== "") {
            formData.append(`variants[${idx}][price]`, String(v.price));
          }
          if (v.sale_price !== undefined && v.sale_price !== null && v.sale_price !== "") {
            formData.append(`variants[${idx}][sale_price]`, String(v.sale_price));
          }
          if (v.weight !== undefined && v.weight !== null && v.weight !== "") {
            formData.append(`variants[${idx}][weight]`, String(v.weight));
          }
          if (v.length !== undefined && v.length !== null && v.length !== "") {
            formData.append(`variants[${idx}][length]`, String(v.length));
          }
          if (v.width !== undefined && v.width !== null && v.width !== "") {
            formData.append(`variants[${idx}][width]`, String(v.width));
          }
          if (v.height !== undefined && v.height !== null && v.height !== "") {
            formData.append(`variants[${idx}][height]`, String(v.height));
          }
          if (v.seller_sku !== undefined && v.seller_sku !== null && v.seller_sku !== "") {
            formData.append(`variants[${idx}][seller_sku]`, String(v.seller_sku));
          }
          if (v.min_stock_alert !== undefined && v.min_stock_alert !== null && v.min_stock_alert !== "") {
            formData.append(`variants[${idx}][min_stock_alert]`, String(v.min_stock_alert));
          }
          const variantHsnCodeId =
            v.hsn_code_id !== undefined && v.hsn_code_id !== null && v.hsn_code_id !== ""
              ? v.hsn_code_id
              : (v.hsn_id !== undefined && v.hsn_id !== null && v.hsn_id !== ""
                ? v.hsn_id
                : formDataOrPayload.hsn_code_id);
          if (variantHsnCodeId !== undefined && variantHsnCodeId !== null && variantHsnCodeId !== "") {
            formData.append(`variants[${idx}][hsn_code_id]`, String(variantHsnCodeId));
          }
          if (v.hsn_code !== undefined && v.hsn_code !== null && v.hsn_code !== "") {
            formData.append(`variants[${idx}][hsn_code]`, String(v.hsn_code));
          }

          if (v.attributes && typeof v.attributes === "object") {
            if (Array.isArray(v.attributes)) {
              v.attributes.forEach((attr) => {
                if (attr.attribute_id !== undefined && attr.value_id !== undefined) {
                  formData.append(`variants[${idx}][attributes][${attr.attribute_id}]`, String(attr.value_id));
                }
              });
            } else {
              Object.keys(v.attributes).forEach((attrId) => {
                const valId = v.attributes[attrId];
                if (valId !== undefined && valId !== null && valId !== "") {
                  formData.append(`variants[${idx}][attributes][${attrId}]`, String(valId));
                }
              });
            }
          }
        });

        // images: images[1], images[2], images[50], images[51], ...
        if (formDataOrPayload.images && typeof formDataOrPayload.images === "object") {
          Object.keys(formDataOrPayload.images).forEach((valId) => {
            const img = formDataOrPayload.images[valId];
            if (img) {
              const fileObj = formatFileObj(img, `variant_${valId}.jpg`);
              if (fileObj) formData.append(`images[${valId}]`, fileObj);
            }
          });
        }
      } else {
        // Fallback: single mapping or legacy variant format
        // If single mapping with product_sku_id, also populate variants[0] for maximum server compatibility
        if (formDataOrPayload.product_sku_id !== undefined && formDataOrPayload.product_sku_id !== null) {
          formData.append("variants[0][product_sku_id]", String(formDataOrPayload.product_sku_id));
          if (formDataOrPayload.stock_quantity !== undefined && formDataOrPayload.stock_quantity !== null) {
            formData.append("variants[0][stock_quantity]", String(formDataOrPayload.stock_quantity));
          }
          if (formDataOrPayload.price !== undefined && formDataOrPayload.price !== null) {
            formData.append("variants[0][price]", String(formDataOrPayload.price));
          }
          if (formDataOrPayload.sale_price !== undefined && formDataOrPayload.sale_price !== null) {
            formData.append("variants[0][sale_price]", String(formDataOrPayload.sale_price));
          }
          if (formDataOrPayload.seller_sku !== undefined && formDataOrPayload.seller_sku !== null) {
            formData.append("variants[0][seller_sku]", String(formDataOrPayload.seller_sku));
          }
          if (formDataOrPayload.min_stock_alert !== undefined && formDataOrPayload.min_stock_alert !== null) {
            formData.append("variants[0][min_stock_alert]", String(formDataOrPayload.min_stock_alert));
            formData.append("min_stock_alert", String(formDataOrPayload.min_stock_alert));
          }
          if (formDataOrPayload.design_name !== undefined && formDataOrPayload.design_name !== null && formDataOrPayload.design_name !== "") {
            formData.append("variants[0][design_name]", String(formDataOrPayload.design_name));
            formData.append("design_name", String(formDataOrPayload.design_name));
          }
          if (formDataOrPayload.design !== undefined && formDataOrPayload.design !== null && formDataOrPayload.design !== "") {
            formData.append("variants[0][design]", String(formDataOrPayload.design));
            formData.append("design", String(formDataOrPayload.design));
          }
          const fallbackHsnCodeId =
            formDataOrPayload.hsn_code_id !== undefined && formDataOrPayload.hsn_code_id !== null && formDataOrPayload.hsn_code_id !== ""
              ? formDataOrPayload.hsn_code_id
              : formDataOrPayload.hsn_id;
          if (fallbackHsnCodeId !== undefined && fallbackHsnCodeId !== null && fallbackHsnCodeId !== "") {
            formData.append("variants[0][hsn_code_id]", String(fallbackHsnCodeId));
            formData.append("hsn_code_id", String(fallbackHsnCodeId));
          }
          if (formDataOrPayload.hsn_code !== undefined && formDataOrPayload.hsn_code !== null && formDataOrPayload.hsn_code !== "") {
            formData.append("variants[0][hsn_code]", String(formDataOrPayload.hsn_code));
            formData.append("hsn_code", String(formDataOrPayload.hsn_code));
          }
        }

        Object.keys(formDataOrPayload).forEach((key) => {
          const val = formDataOrPayload[key];
          if (val !== undefined && val !== null) {
            if (key === "variant_attributes" && typeof val === "object") {
              Object.keys(val).forEach((attrId) => {
                if (val[attrId] !== undefined && val[attrId] !== null) {
                  formData.append(`variant_attributes[${attrId}]`, String(val[attrId]));
                }
              });
            } else if (key === "images" && typeof val === "object") {
              Object.keys(val).forEach((valId) => {
                const img = val[valId];
                if (img) {
                  const fileObj = formatFileObj(img, `image_${valId}.jpg`);
                  if (fileObj) formData.append(`images[${valId}]`, fileObj);
                }
              });
            } else {
              formData.append(key, String(val));
            }
          }
        });
      }

      body = formData;
    }

    const response = await fetch(`${BASE_URL}skus`, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      let errorMsg = responseData.message || "Failed to add SKU";
      if (responseData.errors && typeof responseData.errors === "object") {
        const firstKey = Object.keys(responseData.errors)[0];
        if (Array.isArray(responseData.errors[firstKey])) {
          errorMsg = responseData.errors[firstKey][0];
        } else if (typeof responseData.errors[firstKey] === "string") {
          errorMsg = responseData.errors[firstKey];
        }
      }
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please check your internet connection.");
    }
    console.warn("addSellerSku error:", error?.message);
    throw error;
  }
};

/**
 * Fetch detailed information for a specific seller SKU
 * Endpoint: GET /api/seller/skus/{id}
 * Headers: Authorization: Bearer {token}
 */
export const getSellerSkuDetails = async (skuId, customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      const err = new Error("No authentication token found");
      err.status = 401;
      throw err;
    }

    if (!skuId) {
      throw new Error("SKU ID is required");
    }

    const response = await fetch(`${BASE_URL}skus/${skuId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      const error = new Error(responseData.message || "Failed to fetch SKU details");
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    if (!isAuthError(error)) {
      console.warn("getSellerSkuDetails error:", error?.message);
    }
    throw error;
  }
};

export const getSellerSku = getSellerSkuDetails;
export const showSku = getSellerSkuDetails;
export const getSku = getSellerSkuDetails;

/**
 * Search HSN codes by code or prefix
 * Endpoint: POST /api/seller/hsn/search
 * Headers: Authorization: Bearer {token}, Accept: application/json
 * Body: { hsn_code_like: "0101" } (FormData)
 * Response: { status: true, data: [ { id, hsn_code, description }, ... ] }
 */
export const searchHsnCodes = async (hsnCodeLike, customToken = null) => {
  // Backend validation strictly requires hsn_code_like to be between 4 and 8 digits
  const rawCode = String(hsnCodeLike || "").trim();
  const digits = rawCode.replace(/\D/g, "");
  if (!digits || digits.length < 4) {
    return [];
  }
  const codeToSend = digits.slice(0, 8);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      throw new Error("No authentication token found");
    }

    let response;
    let responseText;
    let responseData = null;

    // 1. Try JSON POST first (standard for Laravel Sanctum API endpoints)
    try {
      response = await fetch(`${BASE_URL}hsn/search`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ hsn_code_like: codeToSend }),
        signal: controller.signal,
      });

      responseText = await response.text();
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = null;
      }
    } catch (e) {
      if (e.name === "AbortError") throw e;
      responseData = null;
    }

    // 2. If JSON call didn't succeed with 200 or valid JSON, fallback to multipart FormData
    if (!response || !response.ok || !responseData) {
      try {
        const formData = new FormData();
        formData.append("hsn_code_like", codeToSend);

        const fdResponse = await fetch(`${BASE_URL}hsn/search`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: formData,
          signal: controller.signal,
        });

        const fdText = await fdResponse.text();
        let fdData = null;
        try {
          fdData = JSON.parse(fdText);
        } catch (e) {
          fdData = null;
        }

        if (fdResponse.ok && fdData) {
          response = fdResponse;
          responseData = fdData;
        } else if (!responseData && fdData) {
          response = fdResponse;
          responseData = fdData;
        }
      } catch (e) {
        if (e.name === "AbortError") throw e;
      }
    }

    clearTimeout(timeoutId);

    if (!response || !response.ok) {
      let errorMessage = responseData?.message || "Failed to search HSN codes";
      if (responseData?.errors?.hsn_code_like) {
        const errVal = responseData.errors.hsn_code_like;
        errorMessage = Array.isArray(errVal) ? errVal[0] : String(errVal);
      }
      const error = new Error(sanitizeErrorMessage(errorMessage, "Failed to search HSN codes"));
      error.status = response?.status || 500;
      error.data = responseData;
      throw error;
    }

    const list = Array.isArray(responseData?.data)
      ? responseData.data
      : Array.isArray(responseData)
      ? responseData
      : [];
    return list;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please check your network connection.");
    }
    console.warn("searchHsnCodes error:", error?.message || error);
    throw error;
  }
};



