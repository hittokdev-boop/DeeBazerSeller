const GOOGLE_MAPS_API_KEY = "AIzaSyA5Jo2sWSApjLojgYNdSgyICND-t3Gzb5M";

/**
 * Validate geographical coordinate values (latitude & longitude)
 */
export const isValidCoordinate = (lat, lng) => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  if (lat === '' || lng === '') return false;
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) return false;
  if (numLat === 0 && numLng === 0) return false;
  if (numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) return false;
  return true;
};

/**
 * Utility to calculate geographical coordinates (latitude & longitude)
 * from address text inputs (forward geocoding).
 */
export const getCoordinatesFromAddress = async (house, road, land, cit, st, pin) => {
  const attempts = [
    [house, road, land, cit, st, pin, 'India'].filter(Boolean).join(', '),
    [road, land, cit, st, pin, 'India'].filter(Boolean).join(', '),
    [road, cit, st, pin, 'India'].filter(Boolean).join(', '),
    [road, cit, 'India'].filter(Boolean).join(', '),
    [land, cit, 'India'].filter(Boolean).join(', '),
    [pin, cit, 'India'].filter(Boolean).join(', '),
    [pin, 'India'].filter(Boolean).join(', '),
    [cit, st, 'India'].filter(Boolean).join(', '),
    [cit, 'India'].filter(Boolean).join(', '),
  ].filter((v, i, a) => v && v.trim() && a.indexOf(v) === i);

  // 1. Try Google Maps Geocoding first (most accurate)
  for (const q of attempts.slice(0, 3)) {
    try {
      const gRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${GOOGLE_MAPS_API_KEY}`
      ).then(r => r.json()).catch(() => null);

      if (gRes && gRes.status === 'OK' && gRes.results && gRes.results[0]?.geometry?.location) {
        const { lat, lng } = gRes.results[0].geometry.location;
        if (!isNaN(lat) && !isNaN(lng)) {
          return {
            latitude: Number(lat),
            longitude: Number(lng),
          };
        }
      }
    } catch (gErr) {
      // Continue to next attempt
    }
  }

  // 2. Fallback to OpenStreetMap Nominatim
  for (const q of attempts) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
        {
          headers: { 'User-Agent': 'DeeBazer-App' },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data && data[0] && data[0].lat && data[0].lon) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          return {
            latitude: lat,
            longitude: lng,
          };
        }
      }
    } catch (e) {
      // Continue to next attempt
    }
  }

  return null;
};

/**
 * Calculate distance in kilometers between two geographical coordinates (Haversine formula)
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null;

  const R = 6371; // Earth's radius in km
  const dLat = (nLat2 - nLat1) * (Math.PI / 180);
  const dLon = (nLon2 - nLon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(nLat1 * (Math.PI / 180)) *
      Math.cos(nLat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Format distance in kilometers or meters
 */
export const formatDistance = (distKm) => {
  if (distKm === null || distKm === undefined || isNaN(distKm)) return null;
  const num = Number(distKm);
  if (num < 1) {
    const meters = Math.round(num * 1000);
    return `${meters} m`;
  }
  return `${num.toFixed(1)} km`;
};

export const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];
