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
    // console.log("getSellerProfile responseText:", responseText); // Log the raw response text for debugging
    try {
      responseData = JSON.parse(responseText);
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

    let response = await fetch(`${BASE_URL}profile`, {
      method,
      headers,
      body,
    });
    console.log("updateSellerProfile response status:", response.status);
    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
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
    console.log("getSellerStorePolicy response:", token);
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
 * Body fields: free_shipping_above, standard_delivery_rate, express_delivery_rate, order_processing_time
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
      console.warn("getSellerDashboard non-ok response:", response.status, responseData);
      const error = new Error(sanitizeErrorMessage(responseData?.message, "Failed to fetch dashboard data"));
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    if (!isAuthError(error)) {
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
    // console.log(responseText, 'kjdjf')
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
    console.log(token)
    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);

    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      const error = new Error(sanitizeErrorMessage(responseData.message, "Failed to fetch product details"));
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    if (!isAuthError(error)) {
      console.error("Error in getSellerProductDetails API:", error);
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
 * Endpoint: GET /api/seller/categories
 */
export const getSellerCategories = async (customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    const headers = {
      Accept: "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}categories`, {
      method: "GET",
      headers,
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      return null;
    }

    if (!response.ok) return null;
    return responseData.data || responseData.categories || responseData;
  } catch (error) {
    console.error("Error in getSellerCategories API:", error);
    return null;
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
 * Add / Map a SKU to the seller's catalog
 * Endpoint: POST /api/seller/skus
 * Headers: Authorization: Bearer {token}
 * Supports:
 *   Case 1: Mapping existing SKU: { product_id, product_sku_id, price, sale_price, stock_quantity, min_stock_alert, seller_sku }
 *   Case 2: Adding new SKU variant (FormData): { product_id, name, weight, length, width, height, price, sale_price, stock_quantity, min_stock_alert, seller_sku, image }
 */
export const addSellerSku = async (formDataOrPayload, customToken = null) => {
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
          formData.append(key, String(val));
        }
      });
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
    console.log("responseText getSellerSkuDetails", responseText);
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



