import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Animated,
  PanResponder,
  Platform,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  Linking,
  PermissionsAndroid,
} from "react-native";
import Geolocation from "@react-native-community/geolocation";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { getOrder, updateOrderStatusAPI, addOrderTrackingAPI, getOrderStatusList } from "../../api/orders";
import { startDeliveryNavigation, openLocationPinInMaps, formatShippingAddress } from "../../services/mapService";
import {
  isValidCoordinate,
  calculateDistanceKm,
  formatDistance,
  getCoordinatesFromAddress,
} from "../../utils/geocodeUtils";

// Helper to downsample route coordinates if too dense for URL length limits
const sampleRouteCoordinates = (coords, maxPoints = 20) => {
  if (!Array.isArray(coords) || coords.length <= maxPoints) return coords || [];
  const step = Math.ceil(coords.length / maxPoints);
  const sampled = [];
  for (let i = 0; i < coords.length; i += step) {
    sampled.push(coords[i]);
  }
  const last = coords[coords.length - 1];
  if (sampled[sampled.length - 1] !== last) {
    sampled.push(last);
  }
  return sampled;
};

// Generates real-time high-resolution street map image URL with Start Point, End Point, and Direction Line
const getMapImageUrl = ({
  destLat,
  destLng,
  startLat = null,
  startLng = null,
  routeCoords = null,
  zoomLevel = 15,
  isCustomZoom = false,
}) => {
  if (destLat === null || destLng === null || isNaN(Number(destLat)) || isNaN(Number(destLng))) {
    return null;
  }

  const nDestLat = Number(destLat).toFixed(6);
  const nDestLng = Number(destLng).toFixed(6);

  // If live location (start point) is available, draw Start Point (light blue), End Point (blue), and direction polyline (DeeBazer Blue #2E7DFF)
  if (
    startLat !== null &&
    startLng !== null &&
    !isNaN(Number(startLat)) &&
    !isNaN(Number(startLng))
  ) {
    const nStartLat = Number(startLat).toFixed(6);
    const nStartLng = Number(startLng).toFixed(6);

    // Markers: start point (BLUE pin pm2blm), end point (RED pin pm2rdm)
    const ptParam = `pt=${nStartLng},${nStartLat},pm2blm~${nDestLng},${nDestLat},pm2rdm`;

    // Direction line / polyline in DeeBazer Blue (#2E7DFF -> c:2E7DFFFF, width 5px)
    let polylineCoordsStr = "";
    if (Array.isArray(routeCoords) && routeCoords.length > 1) {
      polylineCoordsStr = routeCoords
        .map(([lng, lat]) => `${Number(lng).toFixed(6)},${Number(lat).toFixed(6)}`)
        .join(",");
    } else {
      // Direct line from start point to end point
      polylineCoordsStr = `${nStartLng},${nStartLat},${nDestLng},${nDestLat}`;
    }
    const plParam = `pl=c:2E7DFFFF,w:5,${polylineCoordsStr}`;

    // If user clicked custom zoom (+ or -), center at midpoint with their chosen zoom
    if (isCustomZoom && zoomLevel) {
      const midLat = ((Number(startLat) + Number(destLat)) / 2).toFixed(6);
      const midLng = ((Number(startLng) + Number(destLng)) / 2).toFixed(6);
      return `https://static-maps.yandex.ru/1.x/?ll=${midLng},${midLat}&z=${zoomLevel}&l=map&size=650,280&lang=en_US&${plParam}&${ptParam}`;
    }

    // Default: automatic optimal bounding box showing both start & end points and the complete route line
    return `https://static-maps.yandex.ru/1.x/?l=map&size=650,280&lang=en_US&${plParam}&${ptParam}`;
  }

  // Fallback when only destination is available (single pin in RED for End Point)
  return `https://static-maps.yandex.ru/1.x/?ll=${nDestLng},${nDestLat}&z=${zoomLevel}&l=map&size=650,280&lang=en_US&pt=${nDestLng},${nDestLat},pm2rdm`;
};

// Helper to determine if map & navigation features should be enabled for this order
const checkIsMapShow = (order) => {
  if (!order) return false;
  return Boolean(
    order.ismapShow === true ||
    order.ismapShow === 1 ||
    order.ismapShow === "1" ||
    order.ismapShow === "true" ||
    order.isMapShow === true ||
    order.isMapShow === 1 ||
    order.isMapShow === "1" ||
    order.isMapShow === "true" ||
    order.ismap_show === true ||
    order.ismap_show === 1 ||
    order.ismap_show === "1" ||
    order.ismap_show === "true"
  );
};

const OrderDetails = ({ route, navigation }) => {
  const { orderId } = route.params;
  const { colors, isDarkMode } = useTheme();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableStatuses, setAvailableStatuses] = useState([]);

  // Modal states
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Map, Live Location & Navigation State
  const [userLocation, setUserLocation] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [geocodedCoord, setGeocodedCoord] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [mapZoom, setMapZoom] = useState(15);
  const [isCustomZoom, setIsCustomZoom] = useState(false);
  const [mapImageLoading, setMapImageLoading] = useState(true);
  const [mapLoadError, setMapLoadError] = useState(false);
  const [useFallbackUrl, setUseFallbackUrl] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isLocatingRef = useRef(false);
  const pinchStartDist = useRef(null);
  const lastZoomChange = useRef(0);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await getOrder(orderId);
      
      // Backend returns either { data: { ... } } or just the object
      setOrder(response?.data || response);

      try {
        const statusRes = await getOrderStatusList(orderId);
        setAvailableStatuses(statusRes?.data || []);
      } catch (err) {
        console.warn("Failed to fetch status list", err?.message || err);
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to load order details");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);



  // For dynamic location
  const getDynamicLocation = () => {
    return new Promise((resolve) => {
      // Provide valid location string so backend validation succeeds
      const fallback = order?.shipping_address?.city
        ? `Dispatch Hub (${order.shipping_address.city})`
        : "Store Warehouse";
      resolve(fallback);
    });
  };

  const rawDestLat =
    order?.shipping_address?.latitude ??
    order?.shipping_address?.lat ??
    order?.latitude ??
    order?.delivery_address?.latitude;
  const rawDestLng =
    order?.shipping_address?.longitude ??
    order?.shipping_address?.lng ??
    order?.longitude ??
    order?.delivery_address?.longitude;
  const hasValidDestination = isValidCoordinate(rawDestLat, rawDestLng);
  const destLat = hasValidDestination
    ? Number(rawDestLat)
    : geocodedCoord?.latitude !== undefined
    ? geocodedCoord.latitude
    : null;
  const destLng = hasValidDestination
    ? Number(rawDestLng)
    : geocodedCoord?.longitude !== undefined
    ? geocodedCoord.longitude
    : null;

  const isMapShow = checkIsMapShow(order);
  const addressType = order?.delivery_type || order?.shipping_address?.address_type || "Delivery";
  const shippingAddressText = formatShippingAddress(order?.shipping_address);

  // Fetch live seller GPS location safely
  const fetchUserLiveLocation = useCallback(async () => {
    if (isLocatingRef.current) return;
    isLocatingRef.current = true;
    setLocationLoading(true);

    try {
      if (Geolocation && typeof Geolocation.setRNConfiguration === "function") {
        Geolocation.setRNConfiguration({
          skipPermissionRequests: false,
          authorizationLevel: "whenInUse",
          locationProvider: "android",
        });
      }

      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        const isGranted =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED ||
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

        if (!isGranted) {
          setLocationLoading(false);
          isLocatingRef.current = false;
          return;
        }
      }

      Geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos?.coords?.latitude;
          const lng = pos?.coords?.longitude;
          if (isValidCoordinate(lat, lng)) {
            setUserLocation({ latitude: Number(lat), longitude: Number(lng) });
          }
          setLocationLoading(false);
          isLocatingRef.current = false;
        },
        (err) => {
          console.warn("Location error:", err?.message || err);
          setLocationLoading(false);
          isLocatingRef.current = false;
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      );
    } catch (e) {
      console.warn("fetchUserLiveLocation error:", e?.message);
      setLocationLoading(false);
      isLocatingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (isMapShow) {
      fetchUserLiveLocation();
    }
  }, [isMapShow, fetchUserLiveLocation]);

  useEffect(() => {
    if (isMapShow && !hasValidDestination && order?.shipping_address) {
      const sa = order.shipping_address;
      const house = sa.address || "";
      const city = sa.city || "";
      const state = sa.state || "";
      const pin = sa.postal_code || "";
      if (city || pin || house) {
        getCoordinatesFromAddress(house, "", "", city, state, pin).then((coord) => {
          if (coord && isValidCoordinate(coord.latitude, coord.longitude)) {
            setGeocodedCoord(coord);
          }
        });
      }
    }
  }, [isMapShow, hasValidDestination, order?.shipping_address]);

  useEffect(() => {
    if (userLocation?.latitude && userLocation?.longitude && destLat !== null && destLng !== null) {
      // 1. Initial direct distance (Haversine formula)
      const directDist = calculateDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        destLat,
        destLng
      );
      setDistanceKm(directDist);

      // 2. Fetch turn-by-turn driving route directions from live location to destination
      let isMounted = true;
      const fetchDirections = async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const url = `http://router.project-osrm.org/route/v1/driving/${userLocation.longitude},${userLocation.latitude};${destLng},${destLat}?overview=simplified&geometries=geojson`;
          const res = await fetch(url, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Linux; Android)",
              Accept: "application/json",
            },
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (isMounted && data?.code === "Ok" && data?.routes?.[0]?.geometry?.coordinates) {
              const rawCoords = data.routes[0].geometry.coordinates;
              const sampled = sampleRouteCoordinates(rawCoords, 20);
              setRouteCoordinates(sampled);
              if (data.routes[0].distance) {
                setDistanceKm(data.routes[0].distance / 1000);
              }
            }
          }
        } catch (e) {
          console.log("Direction route fetch fallback to direct line:", e?.message);
        }
      };

      fetchDirections();

      return () => {
        isMounted = false;
      };
    }
  }, [userLocation?.latitude, userLocation?.longitude, destLat, destLng]);

  const handleZoomIn = useCallback(() => {
    setIsCustomZoom(true);
    setMapZoom((prev) => Math.min(prev + 1, 18));
  }, []);

  const handleZoomOut = useCallback(() => {
    setIsCustomZoom(true);
    setMapZoom((prev) => Math.max(prev - 1, 10));
  }, []);

  const handleRecenter = useCallback(() => {
    setIsCustomZoom(false);
    setMapZoom(15);
  }, []);

  // Multi-touch pinch responder that changes the real map zoom level
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length >= 2,
        onStartShouldSetPanResponderCapture: (evt) => evt.nativeEvent.touches.length >= 2,
        onMoveShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length >= 2,
        onMoveShouldSetPanResponderCapture: (evt) => evt.nativeEvent.touches.length >= 2,
        onPanResponderGrant: (evt) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            pinchStartDist.current = Math.sqrt(dx * dx + dy * dy);
          }
        },
        onPanResponderMove: (evt) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2 && pinchStartDist.current) {
            const now = Date.now();
            if (now - lastZoomChange.current < 500) return;

            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            const currentDist = Math.sqrt(dx * dx + dy * dy);
            const delta = currentDist - pinchStartDist.current;

            if (delta > 45) {
              lastZoomChange.current = now;
              pinchStartDist.current = currentDist;
              handleZoomIn();
            } else if (delta < -45) {
              lastZoomChange.current = now;
              pinchStartDist.current = currentDist;
              handleZoomOut();
            }
          }
        },
        onPanResponderRelease: () => {
          pinchStartDist.current = null;
        },
        onPanResponderTerminate: () => {
          pinchStartDist.current = null;
        },
      }),
    [handleZoomIn, handleZoomOut]
  );

  const handleRefreshLocation = useCallback(() => {
    setIsCustomZoom(false);
    setUseFallbackUrl(false);
    setMapLoadError(false);
    setMapImageLoading(true);
    fetchUserLiveLocation();
  }, [fetchUserLiveLocation]);

  const mapImageUrl = (destLat !== null && destLng !== null)
    ? getMapImageUrl({
        destLat,
        destLng,
        startLat: userLocation?.latitude,
        startLng: userLocation?.longitude,
        routeCoords: useFallbackUrl ? null : routeCoordinates,
        zoomLevel: mapZoom,
        isCustomZoom,
      })
    : null;

  useEffect(() => {
    if (mapImageUrl) {
      setMapImageLoading(true);
      setMapLoadError(false);
    }
  }, [mapImageUrl]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setUseFallbackUrl(false);
    setMapLoadError(false);
    try {
      const response = await getOrder(orderId);
      const newOrder = response?.data || response;
      setOrder(newOrder);

      try {
        const statusRes = await getOrderStatusList(orderId);
        setAvailableStatuses(statusRes?.data || []);
      } catch (err) {
        console.warn("Failed to refresh status list", err?.message || err);
      }

      if (checkIsMapShow(newOrder)) {
        setMapImageLoading(true);
        handleRecenter();
        await fetchUserLiveLocation();
      }
    } catch (error) {
      console.warn("Pull-to-refresh error:", error?.message || error);
    } finally {
      setRefreshing(false);
    }
  }, [orderId, handleRecenter, fetchUserLiveLocation]);

  const handleOpenNavigation = () => {
    if (destLat === null || destLng === null) {
      if (shippingAddressText) {
        startDeliveryNavigation({
          latitude: null,
          longitude: null,
          address: shippingAddressText,
          customerName: order?.shipping_address?.name || order?.customer?.name || "Customer",
        });
        return;
      }
      Alert.alert("Location Error", "Destination coordinates are not available for navigation.");
      return;
    }
    startDeliveryNavigation({
      latitude: destLat,
      longitude: destLng,
      address: shippingAddressText,
      customerName: order?.shipping_address?.name || order?.customer?.name || "Customer",
    });
  };

  // Start Turn-by-Turn GPS Driving Navigation for delivery
  const handleStartDeliveryNavigation = () => {
    handleOpenNavigation();
  };

  // Open location pin in standard maps
  const handleOpenPinInMaps = () => {
    handleOpenNavigation();
  };

  const handleUpdateStatus = async (newStatus, extraPayload = {}) => {
    try {
      setIsUpdating(true);
      const payload = { status: newStatus, ...extraPayload };
      await updateOrderStatusAPI(orderId, payload);
      Alert.alert("Success", `Order status updated to ${newStatus}`);
      
      // Auto-add tracking milestone when shipped
      if (newStatus === "shipped") {
        try {
          const location = (await getDynamicLocation()) || "Store Warehouse";
          
          await addOrderTrackingAPI(orderId, {
            status: "Shipped",
            location: location,
            description: "Package handed over to courier"
          });
        } catch (trackingError) {
          console.warn("Notice: Failed to auto-add tracking milestone:", trackingError?.message || trackingError);
        }
      }

      fetchOrderDetails();

      // If seller marks as shipped or out for delivery, prompt to navigate
      const statusLower = (newStatus || "").toLowerCase();
      if (statusLower === "shipped" || statusLower === "out_for_delivery" || statusLower === "delivering") {
        if (checkIsMapShow(order)) {
          setTimeout(() => {
            Alert.alert(
              "Start Delivery Navigation?",
              "Order is ready for delivery! Would you like to start turn-by-turn Google Maps navigation to the customer now?",
              [
                { text: "Later", style: "cancel" },
                { text: "Open Maps", onPress: () => handleStartDeliveryNavigation() },
              ]
            );
          }, 600);
        }
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update order status");
    } finally {
      setIsUpdating(false);
      setCancelModalVisible(false);
      setCancelReason("");
    }
  };

  if (loading || !order) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.backgroundAlt }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const formattedDate = order.created_at ? new Date(order.created_at).toLocaleString() : "N/A";
  const statusStr = (order.status || "").toString();
  const formattedStatus = statusStr ? statusStr.charAt(0).toUpperCase() + statusStr.slice(1) : "Unknown";

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textGrayDark} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textGrayDark }]}>
          Order Details
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Top summary card */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.orderNumber}>{order.order_number || `#${order.id}`}</Text>
            <View
              style={[
                styles.statusBadge,
                formattedStatus === "Delivered"
                  ? styles.deliveredBadgeBg
                  : formattedStatus === "Pending"
                  ? styles.pendingBadgeBg
                  : formattedStatus === "Shipped"
                  ? styles.shippedBadgeBg
                  : styles.cancelledBadgeBg,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  formattedStatus === "Delivered"
                    ? styles.deliveredBadgeText
                    : formattedStatus === "Pending"
                    ? styles.pendingBadgeText
                    : formattedStatus === "Shipped"
                    ? styles.shippedBadgeText
                    : styles.cancelledBadgeText,
                ]}
              >
                {formattedStatus}
              </Text>
            </View>
          </View>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>

        {/* Action Buttons based on flags */}
        <View style={styles.actionRow}>
          {availableStatuses && availableStatuses.length > 0 ? (
            availableStatuses.map((statusStr, idx) => (
              <TouchableOpacity 
                key={idx}
                style={[styles.actionBtn, statusStr.toLowerCase() === "cancelled" ? styles.actionBtnCancel : null]} 
                onPress={() => {
                  if (statusStr.toLowerCase() === "shipped") {
                    handleUpdateStatus("shipped");
                  } else if (statusStr.toLowerCase() === "cancelled") {
                    setCancelModalVisible(true);
                  } else {
                    handleUpdateStatus(statusStr);
                  }
                }} 
                disabled={isUpdating}
              >
                <Text style={statusStr.toLowerCase() === "cancelled" ? styles.actionBtnTextCancel : styles.actionBtnText}>
                  {statusStr.charAt(0).toUpperCase() + statusStr.slice(1)}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <>
              {order.can_confirm && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleUpdateStatus("confirmed")} disabled={isUpdating}>
                  <Text style={styles.actionBtnText}>Confirm Order</Text>
                </TouchableOpacity>
              )}
              {order.status === "confirmed" && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleUpdateStatus("processing")} disabled={isUpdating}>
                  <Text style={styles.actionBtnText}>Process Order</Text>
                </TouchableOpacity>
              )}
              {order.can_ship && order.status !== "confirmed" && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleUpdateStatus("shipped")} disabled={isUpdating}>
                  <Text style={styles.actionBtnText}>Mark Shipped</Text>
                </TouchableOpacity>
              )}
              {order.can_cancel && (
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnCancel]} onPress={() => setCancelModalVisible(true)} disabled={isUpdating}>
                  <Text style={styles.actionBtnTextCancel}>Cancel Order</Text>
                </TouchableOpacity>
              )}
            </>
          )}

        </View>

        {/* Customer & Shipping */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Customer Details</Text>
            {order.customer?.mobile ? (
              <TouchableOpacity
                style={styles.quickCallBtn}
                onPress={() => Linking.openURL(`tel:${order.customer.mobile}`)}
                activeOpacity={0.7}
              >
                <Ionicons name="call" size={14} color="#10B981" />
                <Text style={styles.quickCallText}>Call</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {order.customer ? (
            <View style={styles.detailsBlock}>
              <Text style={styles.detailText}><Ionicons name="person-outline" size={16}/> {order.customer.name}</Text>
              {order.customer.email ? (
                <Text style={styles.detailText}><Ionicons name="mail-outline" size={16}/> {order.customer.email}</Text>
              ) : null}
              <Text style={styles.detailText}><Ionicons name="call-outline" size={16}/> {order.customer.mobile}</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>No customer data available.</Text>
          )}

          <View style={styles.divider} />

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            {addressType ? (
              <View
                style={[
                  styles.miniStatusBadge,
                  {
                    backgroundColor: isDarkMode
                      ? "rgba(46, 125, 255, 0.15)"
                      : COLORS.primaryBgLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.miniStatusText,
                    { color: COLORS.primary, textTransform: "capitalize" },
                  ]}
                >
                  {addressType}
                </Text>
              </View>
            ) : null}
          </View>

          {order.shipping_address ? (
            <View style={styles.detailsBlock}>
              <Text style={styles.detailTextName}>{order.shipping_address.name}</Text>
              <Text style={styles.detailText}>{order.shipping_address.address}</Text>
              <Text style={styles.detailText}>
                {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
              </Text>
              {order.shipping_address.country ? (
                <Text style={styles.detailText}>{order.shipping_address.country}</Text>
              ) : null}
              {order.shipping_address.phone ? (
                <Text style={styles.detailText}>
                  <Ionicons name="call-outline" size={14} color={colors.textGrayLight} /> {order.shipping_address.phone}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.emptyText}>No shipping address provided.</Text>
          )}
        </View>

        {/* Location Map & Navigation Card (displayed when ismapShow is true) */}
        {isMapShow && (
          <View style={[styles.card, { paddingBottom: 16 }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleWithIcon}>
                <Ionicons
                  name="navigate-circle-outline"
                  size={20}
                  color={COLORS.primary}
                />
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.textGrayDark, marginLeft: 8 },
                  ]}
                >
                  Location Map & Navigation
                </Text>
              </View>

              {addressType ? (
                <View
                  style={[
                    styles.miniStatusBadge,
                    {
                      backgroundColor: isDarkMode
                        ? "rgba(46, 125, 255, 0.15)"
                        : COLORS.primaryBgLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniStatusText,
                      { color: COLORS.primary, textTransform: "capitalize" },
                    ]}
                  >
                    {addressType}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.divider} />

            {/* Map Container */}
            {destLat !== null && destLng !== null ? (
              <View style={styles.mapBoxContainer}>
                {mapImageUrl ? (
                  <TouchableOpacity
                    style={styles.mapTouchable}
                    activeOpacity={0.9}
                    onPress={handleOpenNavigation}
                  >
                    <Image
                      source={{
                        uri: mapImageUrl,
                        headers: { "User-Agent": "Mozilla/5.0 (Linux; Android)" },
                      }}
                      style={styles.mapElement}
                      resizeMode="cover"
                      onLoadStart={() => {
                        setMapImageLoading(true);
                        setMapLoadError(false);
                      }}
                      onLoad={() => {
                        setMapImageLoading(false);
                        setMapLoadError(false);
                      }}
                      onLoadEnd={() => {
                        setMapImageLoading(false);
                      }}
                      onError={(e) => {
                        console.warn("Map image load failed:", e?.nativeEvent);
                        if (!useFallbackUrl && routeCoordinates && routeCoordinates.length > 0) {
                          // Fallback to cleaner URL without polyline if polyline was rejected
                          setUseFallbackUrl(true);
                          setMapImageLoading(true);
                        } else {
                          setMapImageLoading(false);
                          setMapLoadError(true);
                        }
                      }}
                    />

                    {/* Center Custom Marker Pin (displayed in Red only when live start location is not yet known) */}
                    {(!userLocation?.latitude || !userLocation?.longitude) && (
                      <View style={styles.centerMarkerWrapper} pointerEvents="none">
                        <View style={styles.customPinContainer}>
                          <View style={styles.pinBubble}>
                            <Ionicons name="location" size={34} color="#EF4444" />
                          </View>
                          <View style={styles.pinShadow} />
                        </View>
                      </View>
                    )}

                    {mapImageLoading && !mapLoadError && (
                      <View
                        style={[
                          styles.mapLoadingOverlay,
                          { backgroundColor: isDarkMode ? "#1E293B" : "#F8FAFC" },
                        ]}
                      >
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text
                          style={[
                            styles.mapPlaceholderText,
                            { color: colors.textGrayLight, fontSize: 12, fontWeight: "600", marginTop: 6 },
                          ]}
                        >
                          Loading map route...
                        </Text>
                      </View>
                    )}

                    {mapLoadError && (
                      <View
                        style={[
                          styles.mapLoadingOverlay,
                          { backgroundColor: isDarkMode ? "#1E293B" : "#F8FAFC" },
                        ]}
                      >
                        <Ionicons name="map-outline" size={32} color={colors.textGrayLight} />
                        <Text
                          style={[
                            styles.mapPlaceholderText,
                            { color: colors.textGrayLight, fontSize: 12, fontWeight: "600", marginTop: 4, marginBottom: 8 },
                          ]}
                        >
                          Failed to load map
                        </Text>
                        <TouchableOpacity
                          style={styles.retryMapBtn}
                          onPress={() => {
                            setMapLoadError(false);
                            setMapImageLoading(true);
                            setUseFallbackUrl(false);
                            handleRefreshLocation();
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="refresh" size={13} color="#FFF" />
                          <Text style={styles.retryMapBtnText}>Retry Map</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View
                    style={[
                      styles.mapPlaceholder,
                      {
                        backgroundColor: isDarkMode ? "#1E293B" : "#F8FAFC",
                        borderColor: colors.borderLight,
                        height: 200,
                      },
                    ]}
                  >
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text
                      style={[
                        styles.mapPlaceholderText,
                        { color: colors.textGrayLight },
                      ]}
                    >
                      Loading location map...
                    </Text>
                  </View>
                )}

                {/* Floating Navigation Hint Pill on Top Right */}
                <TouchableOpacity
                  style={styles.tapToNavigatePill}
                  onPress={handleOpenNavigation}
                  activeOpacity={0.8}
                >
                  <Ionicons name="navigate" size={13} color="#FFF" />
                  <Text style={styles.tapToNavigateText}>Open Navigation</Text>
                </TouchableOpacity>

                {/* Floating Zoom & Re-center Controls on the Right */}
                <View style={styles.mapControlsColumn}>
                  <TouchableOpacity
                    style={[
                      styles.mapControlBtn,
                      {
                        backgroundColor: isDarkMode
                          ? "rgba(30, 41, 59, 0.94)"
                          : "rgba(255, 255, 255, 0.96)",
                        borderColor: colors.borderLight,
                      },
                    ]}
                    onPress={handleZoomIn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={18} color={colors.textGrayDark} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.mapControlBtn,
                      {
                        backgroundColor: isDarkMode
                          ? "rgba(30, 41, 59, 0.94)"
                          : "rgba(255, 255, 255, 0.96)",
                        borderColor: colors.borderLight,
                      },
                    ]}
                    onPress={handleZoomOut}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={18} color={colors.textGrayDark} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.mapControlBtn,
                      {
                        backgroundColor: isDarkMode
                          ? "rgba(30, 41, 59, 0.94)"
                          : "rgba(255, 255, 255, 0.96)",
                        borderColor: colors.borderLight,
                      },
                    ]}
                    onPress={handleRecenter}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="crosshairs-gps"
                      size={16}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Start & End Point Legend */}
                <View style={styles.mapPointsLegend} pointerEvents="none">
                  {userLocation?.latitude && userLocation?.longitude ? (
                    <View style={styles.pointChip}>
                      <View style={[styles.pointDot, { backgroundColor: COLORS.primary }]} />
                      <Text style={[styles.pointText, { color: COLORS.primary }]}>Start Point</Text>
                    </View>
                  ) : null}
                  <View style={styles.pointChip}>
                    <View style={[styles.pointDot, { backgroundColor: "#EF4444" }]} />
                    <Text style={[styles.pointText, { color: "#EF4444" }]}>End Point</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.mapPlaceholder,
                  {
                    backgroundColor: isDarkMode ? "#1E293B" : "#F8FAFC",
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text
                  style={[
                    styles.mapPlaceholderText,
                    { color: colors.textGrayLight },
                  ]}
                >
                  Loading location map...
                </Text>
              </View>
            )}

            {/* Distance Section */}
            <View style={styles.distanceBadgeRow}>
              <TouchableOpacity
                style={[
                  styles.distanceBadge,
                  {
                    backgroundColor: isDarkMode
                      ? "rgba(46, 125, 255, 0.12)"
                      : "#EFF6FF",
                    borderColor: COLORS.primary,
                  },
                ]}
                activeOpacity={0.8}
                onPress={handleOpenNavigation}
              >
                <MaterialCommunityIcons
                  name="map-marker-distance"
                  size={18}
                  color={COLORS.primary}
                />
                <Text
                  style={[
                    styles.distanceBadgeText,
                    { color: COLORS.primary },
                  ]}
                >
                  {distanceKm !== null
                    ? `Distance: ${formatDistance(distanceKm)}`
                    : locationLoading
                    ? "Calculating distance..."
                    : "Live distance calculating..."}
                </Text>
              </TouchableOpacity>

              {/* Refresh Distance Button */}
              <TouchableOpacity
                style={[
                  styles.refreshLocBtn,
                  { backgroundColor: isDarkMode ? "#334155" : "#F1F5F9" },
                ]}
                onPress={handleRefreshLocation}
                disabled={locationLoading}
                activeOpacity={0.7}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Ionicons
                    name="refresh"
                    size={16}
                    color={colors.textGrayDark}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Line Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items && order.items.length > 0 ? (
            order.items.map((item, idx) => (
              <View key={item.id || idx} style={styles.itemRow}>
                <Image source={{ uri: item.image_url || "https://i.pravatar.cc/150" }} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>Qty: {item.quantity} x ₹{item.unit_price}</Text>
                </View>
                <Text style={styles.itemTotal}>₹{item.total}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No items found in this order.</Text>
          )}

          <View style={styles.divider} />

          {/* Pricing breakdown */}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>₹{order.subtotal || 0}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Shipping</Text>
            <Text style={styles.priceValue}>₹{order.shipping_cost || 0}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Commission Deducted</Text>
            <Text style={[styles.priceValue, { color: COLORS.error }]}>- ₹{order.commission_amount || 0}</Text>
          </View>
          <View style={[styles.priceRow, { marginTop: 8 }]}>
            <Text style={[styles.priceLabel, { fontWeight: "700", color: COLORS.textPrimary }]}>Net Seller Amount</Text>
            <Text style={[styles.priceValue, { fontWeight: "700", color: COLORS.success, fontSize: 18 }]}>
              ₹{order.seller_amount || 0}
            </Text>
          </View>
        </View>

        {/* Tracking */}
        {order.tracking_updates && order.tracking_updates.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tracking History</Text>
            <Text style={styles.trackingNumber}>Tracking #: {order.tracking_number || "N/A"}</Text>
            <View style={styles.timeline}>
              {order.tracking_updates.map((update, idx) => (
                <View key={idx} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  {idx !== order.tracking_updates.length - 1 && <View style={styles.timelineLine} />}
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineStatus}>{update.status}</Text>
                    <Text style={styles.timelineDesc}>{update.description} - {update.location}</Text>
                    <Text style={styles.timelineDate}>{new Date(update.timestamp).toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>


      {/* Cancel Modal */}
      <Modal visible={cancelModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.textGrayDark }]}>Cancel Order</Text>
            
            <Text style={[styles.modalLabel, { color: colors.textGrayDark }]}>Cancellation Reason (Optional)</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.textGrayDark, borderColor: colors.borderLight, height: 80 }]}
              placeholder="Reason for cancellation..."
              placeholderTextColor={colors.textGrayLight}
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCancelModalVisible(false)} disabled={isUpdating}>
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSubmitBtn} 
                onPress={() => handleUpdateStatus("cancelled", { notes: cancelReason })}
                disabled={isUpdating}
              >
                {isUpdating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSubmitBtnText}>Confirm Cancel</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>





    </View>
  );
};

export default OrderDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: (Platform.OS === "android" ? StatusBar.currentHeight || 24 : 0) + 15,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textGrayDark,
  },
  dateText: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textGrayLight,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  deliveredBadgeBg: { backgroundColor: COLORS.successBgLight },
  pendingBadgeBg: { backgroundColor: COLORS.warningBgLight },
  shippedBadgeBg: { backgroundColor: COLORS.primaryBgLight },
  cancelledBadgeBg: { backgroundColor: COLORS.errorBgLight },
  statusBadgeText: { fontWeight: "700", fontSize: 12 },
  deliveredBadgeText: { color: COLORS.success },
  pendingBadgeText: { color: COLORS.warning },
  shippedBadgeText: { color: COLORS.primary },
  cancelledBadgeText: { color: COLORS.error },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  actionBtnText: {
    color: COLORS.textContrast,
    fontWeight: "600",
  },
  actionBtnCancel: {
    backgroundColor: COLORS.errorBgLight,
  },
  actionBtnTextCancel: {
    color: COLORS.error,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textGrayDark,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
  },
  miniStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  miniStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  mapBoxContainer: {
    height: 200,
    width: "100%",
    position: "relative",
    marginTop: 6,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
  },
  mapElement: {
    width: "100%",
    height: 200,
  },
  mapTouchable: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  centerMarkerWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  customPinContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  pinBubble: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 5,
  },
  pinShadow: {
    width: 10,
    height: 4,
    borderRadius: 5,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    marginTop: -4,
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 6,
  },
  retryMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 5,
    marginTop: 4,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  retryMapBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  tapToNavigatePill: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    zIndex: 10,
  },
  tapToNavigateText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 3,
  },

  mapControlsColumn: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "column",
    gap: 6,
    zIndex: 10,
  },
  mapControlBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.16,
    shadowRadius: 2,
    elevation: 3,
  },
  mapPointsLegend: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pointChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  pointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pointText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1E293B",
  },
  mapPlaceholder: {
    height: 140,
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  mapPlaceholderText: {
    fontSize: 13,
    fontWeight: "500",
  },
  distanceBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  distanceBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  distanceBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
  refreshLocBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  quickCallText: {
    color: "#10B981",
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 4,
  },
  mapHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary + "18",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + "35",
  },
  mapHeaderBadgeText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 4,
  },
  detailTextName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textGrayDark,
    marginBottom: 4,
  },
  mapPreviewContainer: {
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.backgroundAlt,
    position: "relative",
  },
  mapPreviewImage: {
    width: "100%",
    height: "100%",
  },
  mapOverlayPill: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  mapOverlayPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  navigateBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  navigateBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  navIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  navigateBtnTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  navigateBtnSub: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
  },
  detailsBlock: {
    marginTop: 4,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.textGrayMedium,
    marginBottom: 6,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 16,
  },
  emptyText: {
    color: COLORS.textGrayPlaceholder,
    fontStyle: "italic",
    fontSize: 14,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundAlt,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textGrayDark,
  },
  itemMeta: {
    fontSize: 13,
    color: COLORS.textGrayLight,
    marginTop: 4,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textGrayDark,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textGrayMedium,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textGrayDark,
  },
  trackingNumber: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 10,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginTop: 4,
    zIndex: 2,
  },
  timelineLine: {
    position: "absolute",
    left: 5,
    top: 16,
    bottom: -20,
    width: 2,
    backgroundColor: COLORS.borderLight,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 16,
  },
  timelineStatus: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textGrayDark,
  },
  timelineDesc: {
    fontSize: 13,
    color: COLORS.textGrayMedium,
    marginTop: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: COLORS.textGrayLight,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  modalCancelBtnText: {
    color: COLORS.textGrayMedium,
    fontWeight: "600",
    fontSize: 15,
  },
  modalSubmitBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitBtnText: {
    color: COLORS.textContrast,
    fontWeight: "600",
    fontSize: 15,
  },
});
