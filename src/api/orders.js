import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "./auth";

export const getOrders = async () => {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("No authentication token found");

  const response = await fetch(`${BASE_URL}orders`, {
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
    throw new Error("Invalid response format");
  }

  if (!response.ok) {
    throw new Error(responseData.message || "Failed to fetch orders");
  }

  return responseData;
};

export const getOrder = async (id) => {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("No authentication token found");

  const response = await fetch(`${BASE_URL}orders/${id}`, {
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
    throw new Error("Invalid response format");
  }

  if (!response.ok) {
    throw new Error(responseData.message || "Failed to fetch order details");
  }

  return responseData;
};

export const updateOrderStatusAPI = async (id, status) => {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("No authentication token found");

  const response = await fetch(`${BASE_URL}orders/${id}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  const responseText = await response.text();
  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch (e) {
    throw new Error("Invalid response format");
  }

  if (!response.ok) {
    throw new Error(responseData.message || "Failed to update order");
  }

  return responseData;
};
