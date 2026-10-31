import { Linking, Platform, Alert, PermissionsAndroid } from "react-native";
import GeolocationRaw from "@react-native-community/geolocation";

const Geolocation = GeolocationRaw?.default || GeolocationRaw;

export const GOOGLE_MAPS_API_KEY = "AIzaSyA5Jo2sWSApjLojgYNdSgyICND-t3Gzb5M";

// Configure Geolocation module for stable Android LocationManager (prevents PlayServicesLocationManager crash)
try {
  if (Geolocation && typeof Geolocation.setRNConfiguration === "function") {
    Geolocation.setRNConfiguration({
      skipPermissionRequests: false,
      authorizationLevel: "whenInUse",
      locationProvider: "android",
    });
    console.log("📍 [MapService] Geolocation configured with android provider");
  }
} catch (e) {
  console.warn("⚠️ [MapService] setRNConfiguration error:", e?.message);
}

/**
 * Request runtime location permission on Android (requires both FINE and COARSE for Android 12+)
 */
export const requestLocationPermission = async () => {
  if (Platform.OS !== "android") return true;

  try {
    console.log("📍 [MapService] Checking location permissions...");
    const hasFine = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    const hasCoarse = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
    );

    if (hasFine || hasCoarse) {
      console.log("📍 [MapService] Location permission is already granted (Fine:", hasFine, "Coarse:", hasCoarse, ")");
      return true;
    }

    console.log("📍 [MapService] Prompting user for Location permissions...");
    // Android 12+ (API 31+) strictly requires FINE and COARSE permissions in a single requestMultiple
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);

    const fineGranted =
      granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
      PermissionsAndroid.RESULTS.GRANTED;
    const coarseGranted =
      granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
      PermissionsAndroid.RESULTS.GRANTED;

    const isGranted = fineGranted || coarseGranted;
    console.log("📍 [MapService] Location permission result:", {
      fineGranted,
      coarseGranted,
      isGranted,
    });
    return isGranted;
  } catch (err) {
    console.warn("⚠️ [MapService] Permission request error:", err);
    return false;
  }
};

/**
 * Retrieves the device's real GPS coordinates
 */
export const getDeviceGPSLocation = () => {
  return new Promise((resolve, reject) => {
    if (!Geolocation || typeof Geolocation.getCurrentPosition !== "function") {
      console.warn("⚠️ [MapService] Geolocation module is not available in runtime");
      reject(new Error("Native Geolocation module not available."));
      return;
    }

    console.log("📍 [MapService] Requesting GPS coordinates via standard android location provider...");

    Geolocation.getCurrentPosition(
      (position) => {
        if (position?.coords) {
          console.log("📍 [MapService] GPS fix acquired:", {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        } else {
          console.warn("⚠️ [MapService] Position returned empty coords");
          reject(new Error("No coordinates in GPS response."));
        }
      },
      (error) => {
        console.warn("⚠️ [MapService] Location fetch error:", error?.message || error);
        reject(error);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
    );
  });
};

/**
 * Reverse geocodes coordinates to detailed address components using Google Geocoding API
 */
export const reverseGeocodeGoogle = async (latitude, longitude) => {
  if (!GOOGLE_MAPS_API_KEY || !latitude || !longitude) return null;

  try {
    console.log(`🗺️ [MapService] Reverse geocoding via Google Maps API for: (${latitude}, ${longitude})...`);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const best = data.results[0];
      const components = best.address_components || [];

      const getComp = (types) => {
        const found = components.find((c) => types.some((t) => c.types.includes(t)));
        return found ? found.long_name : "";
      };

      const premise = getComp(["premise", "subpremise", "point_of_interest", "establishment"]);
      const streetNumber = getComp(["street_number"]);
      const route = getComp(["route"]);
      const sublocality = getComp([
        "sublocality_level_1",
        "sublocality_level_2",
        "sublocality",
        "neighborhood",
      ]);
      const locality = getComp(["locality", "postal_town"]);
      const district = getComp(["administrative_area_level_2"]);
      const state = getComp(["administrative_area_level_1"]);
      const postalCode = getComp(["postal_code"]);
      const country = getComp(["country"]);

      const streetParts = [premise, streetNumber, route, sublocality].filter(Boolean);
      let street = streetParts.join(", ");
      if (!street || street.length < 5) {
        const parts = best.formatted_address.split(",");
        if (parts.length >= 3) {
          street = parts.slice(0, 2).join(",").trim();
        } else {
          street = best.formatted_address;
        }
      }

      console.log("🗺️ [MapService] Google Geocoding result:", {
        formattedAddress: best.formatted_address,
        street,
        city: locality || district,
        state,
        postalCode,
        country: country || "India",
      });

      return {
        formattedAddress: best.formatted_address,
        address: street,
        city: locality || district || "",
        state: state || "",
        postalCode: postalCode || "",
        country: country || "India",
        latitude: String(latitude),
        longitude: String(longitude),
      };
    } else {
      console.warn("⚠️ [MapService] Google Geocoding status:", data.status, data.error_message);
    }
    return null;
  } catch (error) {
    console.warn("⚠️ [MapService] Reverse geocode error:", error);
    return null;
  }
};

/**
 * Fallback IP location when GPS is unavailable
 */
export const getFallbackIpLocation = async () => {
  try {
    console.log("🌐 [MapService] Querying IP location via ipwho.is...");
    const res = await fetch("https://ipwho.is/", { headers: { Accept: "application/json" } });
    const data = await res.json();
    if (data && data.success && data.latitude && data.longitude) {
      console.log("🌐 [MapService] ipwho.is success:", {
        lat: data.latitude,
        lng: data.longitude,
        city: data.city,
      });
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city || "",
        state: data.region || "",
        postalCode: data.postal || "",
        country: data.country || "India",
      };
    }
  } catch (e) {
    console.warn("⚠️ [MapService] IP location fallback 1 (ipwho.is) failed:", e?.message);
  }

  try {
    console.log("🌐 [MapService] Querying IP location via freeipapi.com...");
    const res = await fetch("https://freeipapi.com/api/json");
    const data = await res.json();
    if (data && data.latitude && data.longitude) {
      console.log("🌐 [MapService] freeipapi success:", {
        lat: data.latitude,
        lng: data.longitude,
        city: data.cityName,
      });
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.cityName || "",
        state: data.regionName || "",
        postalCode: data.zipCode || "",
        country: data.countryName || "India",
      };
    }
  } catch (e) {
    console.warn("⚠️ [MapService] IP location fallback 2 (freeipapi) failed:", e?.message);
  }

  try {
    console.log("🌐 [MapService] Querying IP location via ipapi.co...");
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    if (data && data.latitude && data.longitude) {
      console.log("🌐 [MapService] ipapi.co success:", {
        lat: data.latitude,
        lng: data.longitude,
        city: data.city,
      });
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city || "",
        state: data.region || "",
        postalCode: data.postal || "",
        country: data.country_name || "India",
      };
    }
  } catch (e) {
    console.warn("⚠️ [MapService] IP location fallback 3 (ipapi.co) failed:", e?.message);
  }

  return null;
};

/**
 * Full flow: Get Device Live Location & Auto-fill Address via Google Maps
 */
export const fetchAccurateLiveLocation = async () => {
  console.log("📍 [MapService] ================= FETCHING LIVE LOCATION =================");
  let lat = null;
  let lng = null;
  let isGpsAccurate = false;

  // 1. Request GPS Permission
  const hasPermission = await requestLocationPermission();
  console.log("📍 [MapService] Location permission granted:", hasPermission);

  // 2. Attempt Real Device GPS
  if (hasPermission && Geolocation && typeof Geolocation.getCurrentPosition === "function") {
    try {
      const gpsResult = await getDeviceGPSLocation();
      if (gpsResult && gpsResult.latitude && gpsResult.longitude) {
        lat = gpsResult.latitude;
        lng = gpsResult.longitude;
        isGpsAccurate = true;
        console.log("📍 [MapService] Real GPS coords captured:", { lat, lng });
      }
    } catch (gpsError) {
      console.warn("⚠️ [MapService] Real GPS lookup failed, falling back to IP:", gpsError?.message);
    }
  }

  // 3. Fallback to IP if GPS failed or permission denied
  if (!lat || !lng) {
    console.log("🌐 [MapService] Fallback: Acquiring location from IP network...");
    const ipResult = await getFallbackIpLocation();
    if (ipResult) {
      lat = ipResult.latitude;
      lng = ipResult.longitude;
      console.log("🌐 [MapService] Network/IP location captured:", { lat, lng });
    }
  }

  if (!lat || !lng) {
    console.error("❌ [MapService] Failed to detect location from GPS and IP.");
    throw new Error(
      "Could not detect your location. Please ensure Location/GPS is turned on in your device settings."
    );
  }

  console.log("🗺️ [MapService] Resolving full address with Google Maps for:", { lat, lng });
  // 4. Reverse Geocode with Google Maps API (Pinpoint Accuracy)
  const googleResult = await reverseGeocodeGoogle(lat, lng);
  if (googleResult) {
    console.log("🗺️ [MapService] Location & Address resolved successfully:", {
      lat: googleResult.latitude,
      lng: googleResult.longitude,
      address: googleResult.address,
      city: googleResult.city,
      state: googleResult.state,
      postalCode: googleResult.postalCode,
    });
    console.log("📍 [MapService] ==========================================================");
    return {
      ...googleResult,
      isGpsAccurate,
    };
  }

  console.warn("⚠️ [MapService] Reverse geocode returned null, returning raw coordinates.");
  console.log("📍 [MapService] ==========================================================");
  // Basic fallback if Google API fails
  return {
    latitude: String(lat),
    longitude: String(lng),
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    isGpsAccurate,
  };
};

/**
 * Formats shipping address into a single string
 */
export const formatShippingAddress = (shippingAddress) => {
  if (!shippingAddress) return "";
  const { address, city, state, postal_code, country } = shippingAddress;
  return [address, city, state, postal_code, country]
    .filter((part) => part && typeof part === "string" && part.trim() !== "")
    .join(", ");
};

/**
 * Generates a Google Static Maps preview image URL
 */
export const getStaticMapPreviewUrl = ({
  latitude,
  longitude,
  address,
  width = 600,
  height = 240,
  zoom = 15,
}) => {
  if (!GOOGLE_MAPS_API_KEY) return null;

  let locationParam = "";
  if (latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
    locationParam = `${latitude},${longitude}`;
  } else if (address && address.trim()) {
    locationParam = encodeURIComponent(address.trim());
  } else {
    return null;
  }

  return `https://maps.googleapis.com/maps/api/staticmap?center=${locationParam}&zoom=${zoom}&size=${width}x${height}&scale=2&maptype=roadmap&markers=color:red%7Clabel:S%7C${locationParam}&key=${GOOGLE_MAPS_API_KEY}`;
};

/**
 * Geocodes an address string to precise latitude and longitude using Google Geocoding API
 */
export const geocodeAddressAPI = async (addressString) => {
  if (!addressString || !GOOGLE_MAPS_API_KEY) return null;

  try {
    console.log("🗺️ [MapService] Geocoding address:", addressString);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      addressString
    )}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const best = data.results[0];
      const location = best.geometry.location;
      const components = best.address_components || [];

      const getComp = (types) => {
        const found = components.find((c) => types.some((t) => c.types.includes(t)));
        return found ? found.long_name : "";
      };

      const result = {
        latitude: String(location.lat),
        longitude: String(location.lng),
        formatted_address: best.formatted_address,
        city: getComp(["locality", "postal_town", "administrative_area_level_2"]),
        state: getComp(["administrative_area_level_1"]),
        postalCode: getComp(["postal_code"]),
        country: getComp(["country"]),
      };
      console.log("🗺️ [MapService] Geocoding address result:", result);
      return result;
    }
    return null;
  } catch (error) {
    console.warn("⚠️ [MapService] Geocoding error:", error?.message || error);
    return null;
  }
};

/**
 * Starts Turn-by-Turn GPS Driving Navigation to destination
 */
export const startDeliveryNavigation = async ({
  latitude,
  longitude,
  address,
  customerName = "Customer",
}) => {
  const hasCoordinates =
    latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude));
  const fullAddress = address || "";

  if (!hasCoordinates && !fullAddress.trim()) {
    Alert.alert(
      "Incomplete Address",
      "Shipping address does not contain coordinates or address text to navigate."
    );
    return;
  }

  const destinationParam = hasCoordinates
    ? `${Number(latitude)},${Number(longitude)}`
    : encodeURIComponent(fullAddress.trim());

  const navScheme = Platform.select({
    ios: `maps://?daddr=${destinationParam}&dirflg=d`,
    android: `google.navigation:q=${destinationParam}&mode=d`,
  });

  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationParam}&travelmode=driving&dir_action=navigate`;

  try {
    const canOpen = await Linking.canOpenURL(navScheme);
    if (canOpen) {
      await Linking.openURL(navScheme);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch (err) {
    console.warn("⚠️ [MapService] Navigation launch error:", err);
    Linking.openURL(webUrl).catch(() => {
      Alert.alert("Error", "Could not open Google Maps navigation.");
    });
  }
};

/**
 * Opens location pin in Google Maps (standard view)
 */
export const openLocationPinInMaps = async ({
  latitude,
  longitude,
  address,
  customerName = "Location Pin",
}) => {
  const hasCoordinates =
    latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude));
  const fullAddress = address || "";

  if (!hasCoordinates && !fullAddress.trim()) {
    Alert.alert("Address Missing", "No address found.");
    return;
  }

  const label = encodeURIComponent(customerName);
  const locationParam = hasCoordinates
    ? `${Number(latitude)},${Number(longitude)}`
    : encodeURIComponent(fullAddress.trim());

  const scheme = Platform.select({
    ios: hasCoordinates ? `maps:0,0?q=${label}@${locationParam}` : `maps:0,0?q=${locationParam}`,
    android: hasCoordinates ? `geo:0,0?q=${locationParam}(${label})` : `geo:0,0?q=${locationParam}`,
  });

  const webUrl = `https://www.google.com/maps/search/?api=1&query=${locationParam}`;

  try {
    const canOpen = await Linking.canOpenURL(scheme);
    if (canOpen) {
      await Linking.openURL(scheme);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch (err) {
    Linking.openURL(webUrl).catch(() => {
      Alert.alert("Error", "Could not open map.");
    });
  }
};
