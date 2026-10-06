/**
 * Real Location & Geodesic utilities for LocalMarket Ghumarwin
 */

export interface GeocodedAddress {
  area: string;
  city: string;
  district: string;
  state: string;
  formattedAddress: string;
}

/**
 * Calculates great-circle distance between two points using the Haversine formula.
 * Earth radius R = 6371.0 km
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

export function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Estimates driving/scooter arrival time based on average town speeds in hilly terrain (~22 km/h)
 */
export function estimateTravelMinutes(km: number): number {
  if (km <= 0.1) return 2;
  const speedKmPerHr = 22;
  const mins = Math.ceil((km / speedKmPerHr) * 60) + 2; // add 2 min pickup buffer
  return Math.max(3, mins);
}

/**
 * Generates an official Google Maps navigation link between real coordinates
 */
export function getGoogleMapsDirectionsUrl(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
}

/**
 * Parses Google Maps Geocoding API address_components
 */
export function parseAddressComponents(components: any[], defaultFormatted?: string): GeocodedAddress {
  let area = '';
  let city = '';
  let district = '';
  let state = 'Himachal Pradesh';

  if (Array.isArray(components)) {
    for (const c of components) {
      const types = c.types || [];
      if (types.includes('sublocality_level_1') || types.includes('sublocality') || types.includes('neighborhood')) {
        area = c.long_name;
      } else if (types.includes('locality')) {
        city = c.long_name;
      } else if (types.includes('administrative_area_level_2')) {
        district = c.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = c.long_name;
      }
    }
  }

  if (!city && area) city = area;
  if (!city) city = 'Ghumarwin';
  if (!district) district = 'Bilaspur';
  if (!area) area = city;

  const formatted = defaultFormatted || `${area}, ${city}, ${district}, ${state}`;

  return {
    area,
    city,
    district,
    state,
    formattedAddress: formatted,
  };
}

/**
 * Performs Reverse Geocoding for coordinates
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedAddress> {
  // 1. Try server proxy endpoint
  try {
    const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const topResult = data.results[0];
        return parseAddressComponents(topResult.address_components, topResult.formatted_address);
      }
    }
  } catch (err) {
    console.warn('Proxy geocode call failed, trying client Geocoder', err);
  }

  // 2. Try window.google.maps.Geocoder if loaded in DOM
  if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      const response = await new Promise<any>((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === 'OK' && results && results[0]) {
            resolve(results[0]);
          } else {
            reject(new Error(`Geocoder status: ${status}`));
          }
        });
      });
      return parseAddressComponents(response.address_components, response.formatted_address);
    } catch (geocoderErr) {
      console.warn('Client Geocoder error', geocoderErr);
    }
  }

  // 3. Coordinate-aware regional fallback for Bilaspur / Ghumarwin coordinates
  // Detect proximity to known localities in Ghumarwin
  if (lat > 31.46 && lat < 31.48 && lng > 31.72 && lng < 76.75) {
    return {
      area: 'Bharari Bazaar',
      city: 'Ghumarwin',
      district: 'Bilaspur',
      state: 'Himachal Pradesh',
      formattedAddress: 'Bharari Bazaar, Ghumarwin, Bilaspur, Himachal Pradesh',
    };
  } else if (lat > 31.43 && lat < 31.45 && lng > 76.70 && lng < 76.73) {
    return {
      area: 'Gandhi Chowk',
      city: 'Ghumarwin',
      district: 'Bilaspur',
      state: 'Himachal Pradesh',
      formattedAddress: 'Gandhi Chowk, Ghumarwin, Bilaspur, Himachal Pradesh',
    };
  }

  return {
    area: 'Ghumarwin',
    city: 'Ghumarwin',
    district: 'Bilaspur',
    state: 'Himachal Pradesh',
    formattedAddress: 'Ghumarwin, Bilaspur, Himachal Pradesh',
  };
}

/**
 * Geocodes an address string to coordinates
 */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number; addressData: GeocodedAddress } | null> {
  const query = address.toLowerCase().includes('himachal') ? address : `${address}, Ghumarwin, Bilaspur, Himachal Pradesh`;
  
  try {
    const res = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const lat = result.geometry.location.lat;
        const lng = result.geometry.location.lng;
        const addressData = parseAddressComponents(result.address_components, result.formatted_address);
        return { lat, lng, addressData };
      }
    }
  } catch (err) {
    console.warn('Geocoding query error:', err);
  }

  return null;
}
