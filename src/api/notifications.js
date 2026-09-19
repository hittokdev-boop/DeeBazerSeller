import AsyncStorage from "@react-native-async-storage/async-storage";

const SELLER_API_URL = "https://deebazar.com/admin/api/seller/";
const GENERAL_API_URL = "https://deebazar.com/admin/api/";

/**
 * Fetch paginated notifications for the seller
 * Endpoint: GET {{base_url}}api/seller/notifications?page={page}
 * Headers: Authorization: Bearer {token}
 */
export const getSellerNotifications = async (page = 1) => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) return { data: { notifications: [] }, notifications: [] };

    const response = await fetch(`${SELLER_API_URL}notifications?page=${page}`, {
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
      const error = new Error(responseData.message || "Failed to fetch notifications");
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    const isAuth =
      error?.status === 401 ||
      (typeof error?.message === "string" && (
        error.message.toLowerCase().includes("unauthenticated") ||
        error.message.toLowerCase().includes("no authentication token")
      ));
    if (!isAuth) {
      console.error("Error in getSellerNotifications API:", error);
    }
    return { data: { notifications: [] }, notifications: [] };
  }
};

/**
 * Fetch unread notification count
 * Endpoint: GET {{base_url}}api/seller/notifications/unread-count
 * Headers: Authorization: Bearer {token}
 */
export const getUnreadNotificationCount = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      return { data: { unread_count: 0 }, unread_count: 0 };
    }

    const response = await fetch(`${SELLER_API_URL}notifications/unread-count`, {
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
      const error = new Error(responseData.message || "Failed to fetch unread count");
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    const isAuth =
      error?.status === 401 ||
      (typeof error?.message === "string" && (
        error.message.toLowerCase().includes("unauthenticated") ||
        error.message.toLowerCase().includes("no authentication token")
      ));
    if (!isAuth) {
      console.error("Error in getUnreadNotificationCount API:", error);
    }
    return { data: { unread_count: 0 }, unread_count: 0 };
  }
};

/**
 * Mark a single notification as read
 * Endpoint: POST {{base_url}}api/notifications/read
 * Body: { id: <notification_id> }
 * Headers: Authorization: Bearer {token}
 */
export const markNotificationAsRead = async (id) => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("No authentication token found");

    // Primary endpoint: api/notifications/read
    let response = await fetch(`${GENERAL_API_URL}notifications/read`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    });

    // Fallback in case backend mounted it under api/seller/notifications/read
    if (response.status === 404) {
      response = await fetch(`${SELLER_API_URL}notifications/read`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
    }

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      const error = new Error(responseData.message || "Failed to mark notification as read");
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    console.error("Error in markNotificationAsRead API:", error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 * Endpoint: POST {{base_url}}api/notifications/read-all
 * Headers: Authorization: Bearer {token}
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("No authentication token found");

    // Primary endpoint: api/notifications/read-all
    let response = await fetch(`${GENERAL_API_URL}notifications/read-all`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // Fallback in case backend mounted it under api/seller/notifications/read-all
    if (response.status === 404) {
      response = await fetch(`${SELLER_API_URL}notifications/read-all`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    }

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned invalid response: ${responseText}`);
    }

    if (!response.ok) {
      const error = new Error(responseData.message || "Failed to mark all notifications as read");
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    console.error("Error in markAllNotificationsAsRead API:", error);
    throw error;
  }
};
