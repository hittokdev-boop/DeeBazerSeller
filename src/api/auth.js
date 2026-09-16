import AsyncStorage from "@react-native-async-storage/async-storage";

export const BASE_URL = "https://deebazar.com/admin/api/seller/";

/**
 * Fetch authenticated seller + user profile details
 * Endpoint: GET /api/seller/me
 * Headers: Authorization: Bearer {token}
 */
export const getSellerMe = async (customToken = null) => {

  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      throw new Error("No authentication token found");
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
    console.error("Error in getSellerMe API:", error);
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
      throw new Error("No authentication token found");
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
    console.log(responseText)
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
    console.error("Error in getSellerProfile API:", error);
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

    if (!response.ok) {
      let errorMessage = responseData.message || "Failed to update account";
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
 * Update store policies (return_policy, shipping_policy, privacy_policy)
 * Endpoint: PUT /api/seller/store-policies
 * Headers: Authorization: Bearer {token}, Content-Type: application/json
 */
export const updateStorePolicies = async (payload, customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}store-policies`, {
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

    if (!response.ok) {
      let errorMessage = responseData.message || "Failed to update store policies";
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
    console.error("Error in updateStorePolicies API:", error);
    throw error;
  }
};

/**
 * Update store shipping settings
 * Endpoint: PUT /api/seller/shipping-settings
 * Headers: Authorization: Bearer {token}, Content-Type: application/json
 * Body fields: free_shipping_above, standard_rate, express_rate, processing_days, ships_from
 */
export const updateShippingSettings = async (payload, customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}shipping-settings`, {
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
    console.error("Error in updateShippingSettings API:", error);
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
      const error = new Error(responseData.message || "Failed to fetch dashboard data");
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    console.error("Error in getSellerDashboard API:", error);
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
      throw new Error("No authentication token found");
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
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      const error = new Error(responseData.message || "Failed to fetch products");
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    console.error("Error in getSellerProducts API:", error);
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
      const error = new Error(responseData.message || "Failed to fetch product details");
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    console.error("Error in getSellerProductDetails API:", error);
    throw error;
  }
};

/**
 * Submit a new product for admin review (status: pending)
 * Endpoint: POST /api/seller/products
 * Headers: Authorization: Bearer {token}, Content-Type: multipart/form-data
 * Fields: name, price, sale_price, stock_quantity, category_id, short_description, description,
 *         sub_category_id, child_category_id, brand_id, sku, weight, tags[], min_stock_alert, image, gallery[]
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
 * Quick stock-only update (no re-review triggered)
 * Endpoint: PATCH /api/seller/products/{id}/stock
 * Body: { stock_quantity: number }
 */
export const updateProductStock = async (productId, stockQuantity, customToken = null) => {
  try {
    const token = customToken || (await AsyncStorage.getItem("token"));
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${BASE_URL}products/${productId}/stock`, {
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
    console.warn("updateProductStock:", error?.message);
    throw error;
  }
};


