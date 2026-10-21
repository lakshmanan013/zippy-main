/**
 * src/utils/googleGeocoder.js
 * Reverse geocoding and location place searching using Google Maps Geocoding & Places API,
 * with multi-tiered fallback to backend reverse geocode service.
 *
 * Rules:
 * - Dynamically resolves Village, Taluk, Area, City, District, State, Country, PIN Code.
 * - Rural hierarchy: Village → Taluk → District → State
 * - Urban hierarchy: Area → City → District → State
 * - Never hardcodes any real location (e.g. Kalathiyur, Tirupattur, Bengaluru, etc.).
 * - Resolves all fields dynamically from geocoder response components.
 */

import { reverseGeocodeLocation, searchLocationPlaces } from "./location.js";

/**
 * Parses Google Maps Geocoder result array into clean, structured address fields.
 */
export function parseGoogleGeocodeResult(results) {
  if (!results || !Array.isArray(results) || results.length === 0) {
    return null;
  }

  // Aggregate address components from results, preserving most specific to general
  const allComponents = [];
  const seenKeys = new Set();

  for (const res of results) {
    if (Array.isArray(res.address_components)) {
      for (const comp of res.address_components) {
        const types = Array.isArray(comp.types) ? comp.types : [];
        const key = types.join("|") + ":" + (comp.long_name || comp.short_name);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allComponents.push(comp);
        }
      }
    }
  }

  const getComponent = (types, useShort = false) => {
    for (const t of types) {
      const match = allComponents.find(
        (c) => Array.isArray(c.types) && c.types.includes(t)
      );
      if (match) {
        const val = useShort ? match.short_name || match.long_name : match.long_name || match.short_name;
        return val ? String(val).trim() : "";
      }
    }
    return "";
  };

  const pincode = getComponent(["postal_code"]);
  const country = getComponent(["country"]) || "India";
  const state = getComponent(["administrative_area_level_1"]);
  let district = getComponent(["administrative_area_level_2"]);
  const taluk = getComponent(["administrative_area_level_3"]);
  const locality = getComponent(["locality"]);
  const postalTown = getComponent(["postal_town"]);
  const sublocality1 = getComponent(["sublocality_level_1"]);
  const sublocality2 = getComponent(["sublocality_level_2"]);
  const sublocality3 = getComponent(["sublocality_level_3"]);
  const sublocality = getComponent(["sublocality"]) || sublocality1 || sublocality2 || sublocality3;
  const neighborhood = getComponent(["neighborhood"]);
  const route = getComponent(["route"]); // Street / road name
  const streetNumber = getComponent(["street_number"]);
  const premise = getComponent(["premise", "subpremise"]);

  // Clean district name (e.g. "Tirupattur District" -> "Tirupattur")
  if (district) {
    district = district.replace(/\s+District$/i, "").trim();
  }

  // 1. Street Name from street_number + route
  const street = [streetNumber, route].filter(Boolean).join(" ") || route || "";

  // 2. Area Name from neighborhood / sublocality / premise (NEVER city!)
  let areaOnly = sublocality1 || neighborhood || sublocality2 || sublocality3 || sublocality || premise || "";

  // 3. City from locality or postal_town
  let city = locality || postalTown || "";
  let village = "";

  // Dynamic Rural vs. Urban Address Hierarchy Resolution
  if (taluk && locality && taluk.toLowerCase() !== locality.toLowerCase() && !city) {
    village = locality;
  }

  // STRICT RULE: NEVER use city as area or village
  if (city) {
    if (areaOnly && areaOnly.toLowerCase() === city.toLowerCase()) {
      areaOnly = "";
    }
    if (village && village.toLowerCase() === city.toLowerCase()) {
      village = "";
    }
  }

  let areaStreet = "";
  if (areaOnly && street && areaOnly.toLowerCase() !== street.toLowerCase()) {
    areaStreet = `${areaOnly}, ${street}`;
  } else {
    areaStreet = areaOnly || street || village || "";
  }

  // Format a clean, human-readable display address in strict hierarchy order without duplicates:
  // AREA -> STREET -> TALUK -> CITY -> DISTRICT -> STATE - PIN CODE -> COUNTRY
  const parts = [];
  const seen = new Set();
  const addPart = (val) => {
    if (!val) return;
    const cleaned = String(val).trim().replace(/^,+|,+$/g, "");
    if (!cleaned) return;
    const norm = cleaned.toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      parts.push(cleaned);
    }
  };

  addPart(areaOnly || village);
  addPart(street);
  addPart(taluk);
  addPart(city);
  addPart(district);
  if (state && pincode) {
    parts.push(`${state.trim()} - ${pincode.trim()}`);
    seen.add(state.trim().toLowerCase());
    seen.add(pincode.trim().toLowerCase());
  } else if (state) {
    addPart(state);
  } else if (pincode) {
    addPart(pincode);
  }
  if (country) {
    addPart(country);
  }

  const displayAddress = parts.join(", ");
  const rawFormatted = results[0]?.formatted_address || displayAddress;

  return {
    street: street.trim(),
    route: route.trim(),
    area: areaOnly.trim(),
    areaStreet: areaStreet.trim(),
    area_street: areaStreet.trim(),
    village: village.trim(),
    taluk: taluk.trim(),
    city: city.trim(),
    district: district.trim(),
    state: state.trim(),
    country: country.trim() || "India",
    pincode: pincode.trim(),
    pin: pincode.trim(),
    formattedAddress: displayAddress || rawFormatted,
    displayAddress: displayAddress || rawFormatted,
    fullAddress: rawFormatted || displayAddress,
  };
}

/**
 * Reverse geocodes coordinates (latitude, longitude) into structured address fields.
 * Tries backend reverse-geocode service first (which combines BigDataCloud + Nominatim);
 * then Google Maps Geocoder if available; with safe coordinate fallback.
 */
export async function reverseGeocodeCoordinates(lat, lng) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
    return {
      street: "",
      route: "",
      area: "",
      areaStreet: "",
      area_street: "",
      village: "",
      taluk: "",
      city: "",
      district: "",
      state: "",
      country: "India",
      pincode: "",
      pin: "",
      formattedAddress: "",
      displayAddress: "",
      fullAddress: "",
    };
  }

  const numericLat = Number(lat);
  const numericLng = Number(lng);

  // 1. Primary: Backend reverse geocoding service (BDC + Nominatim fallback & strict hierarchy)
  try {
    const backendRes = await reverseGeocodeLocation(numericLat, numericLng);
    if (backendRes && (backendRes.area || backendRes.city || backendRes.district)) {
      return backendRes;
    }
  } catch (backendErr) {
    console.warn("[Reverse Geocode] Backend fetch error, trying client geocoder:", backendErr?.message);
  }

  // 2. Direct Client-Side Fallback: OpenStreetMap Nominatim Reverse Geocoder (Rich detailed street, area, taluk)
  try {
    const osmRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${numericLat}&lon=${numericLng}&format=jsonv2&addressdetails=1`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Language": "en",
        },
      }
    );
    if (osmRes.ok) {
      const osmData = await osmRes.json();
      const addr = osmData.address || {};
      const street = addr.road || addr.street || addr.footway || addr.path || addr.pedestrian || "";
      const village = addr.village || addr.hamlet || "";
      const suburb = addr.suburb || addr.quarter || addr.neighbourhood || addr.residential || "";
      const taluk = addr.county || addr.subdistrict || addr.tehsil || addr.taluk || addr.mandal || "";
      const city = addr.city || addr.town || addr.municipality || "";
      const district = (addr.state_district || addr.district || "").replace(/\s+District$/i, "").trim();
      const state = addr.state || "";
      const pincode = addr.postcode || "";
      const country = addr.country || "India";

      let area = suburb || village || "";
      if (city && area && area.toLowerCase() === city.toLowerCase()) {
        area = "";
      }

      const areaStreet = area && street && area.toLowerCase() !== street.toLowerCase()
        ? `${area}, ${street}`
        : area || street || village || "";

      const parts = [area || village, street, taluk, city || district, state ? `${state} - ${pincode}` : pincode, country].filter(Boolean);
      const displayAddress = parts.join(", ");

      if (city || district || state || area || village || pincode) {
        return {
          street,
          route: street,
          area: area || village,
          areaStreet,
          area_street: areaStreet,
          village,
          taluk: taluk !== city ? taluk : "",
          city: city || district,
          district: district || city,
          state,
          country,
          pincode,
          pin: pincode,
          formattedAddress: displayAddress,
          displayAddress,
          fullAddress: displayAddress,
        };
      }
    }
  } catch (osmErr) {
    console.warn("[Reverse Geocode] Direct Nominatim fallback notice:", osmErr?.message);
  }

  // 3. Direct Client-Side Fallback: BigDataCloud Reverse Geocoder API (CORS enabled, highly reliable)
  try {
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${numericLat}&longitude=${numericLng}&localityLanguage=en`
    );
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const city = (bdcData.city || "").trim();
      const locality = (bdcData.locality || "").trim();
      let area = "";
      if (locality && city && locality.toLowerCase() !== city.toLowerCase()) {
        area = locality;
      }
      let district = "";
      let taluk = "";
      let village = "";
      let street = "";

      for (const item of bdcData.localityInfo?.administrative || []) {
        const name = (item.name || "").trim();
        const desc = (item.description || "").toLowerCase();
        if (!district && (desc.includes("district") || desc.includes("county"))) {
          district = name.replace(/\s+district$/i, "").replace(/\s+county$/i, "").trim();
        }
        if (!taluk && (desc.includes("taluk") || desc.includes("tehsil") || desc.includes("subdistrict") || desc.includes("mandal"))) {
          taluk = name.replace(/\s+taluk$/i, "").trim();
        }
        if (!village && (desc.includes("village") || desc.includes("hamlet"))) {
          village = name;
        }
      }

      for (const item of bdcData.localityInfo?.informative || []) {
        const name = (item.name || "").trim();
        const desc = (item.description || "").toLowerCase();
        if (!street && (desc.includes("road") || desc.includes("street") || desc.includes("way") || desc.includes("avenue"))) {
          street = name;
        }
        if (!area && (desc.includes("neighbourhood") || desc.includes("suburb") || desc.includes("locality") || desc.includes("quarter"))) {
          area = name;
        }
      }

      const state = (bdcData.principalSubdivision || "").trim();
      const pincode = (bdcData.postcode || "").trim();
      const country = bdcData.countryName || "India";
      const resolvedArea = area || village || (locality !== city ? locality : "");
      const areaStreet = resolvedArea && street && resolvedArea.toLowerCase() !== street.toLowerCase()
        ? `${resolvedArea}, ${street}`
        : resolvedArea || street || "";

      const parts = [resolvedArea, street, taluk, city || district, state ? `${state} - ${pincode}` : pincode, country].filter(Boolean);
      const displayAddress = parts.join(", ");

      if (city || district || state || pincode) {
        return {
          street,
          route: street,
          area: resolvedArea,
          areaStreet,
          area_street: areaStreet,
          village,
          taluk,
          city: city || locality || district,
          district: district || city,
          state,
          pincode,
          pin: pincode,
          country,
          displayAddress,
          formattedAddress: displayAddress,
          fullAddress: displayAddress,
        };
      }
    }
  } catch (bdcErr) {
    console.warn("[Reverse Geocode] Direct BigDataCloud fallback notice:", bdcErr?.message);
  }

  const coordStr = `${numericLat.toFixed(6)}, ${numericLng.toFixed(6)}`;
  return {
    street: "",
    route: "",
    area: "",
    areaStreet: "",
    area_street: "",
    village: "",
    taluk: "",
    city: "",
    district: "",
    state: "",
    country: "India",
    pincode: "",
    pin: "",
    formattedAddress: coordStr,
    displayAddress: coordStr,
    fullAddress: coordStr,
  };
}

/**
 * Searches locations matching a query string using Google Places / Geocoder with fallback.
 */
export async function searchLocationsWithGoogle(query) {
  if (!query || typeof query !== "string" || query.trim().length < 2) {
    return [];
  }

  const cleanQuery = query.trim();

  // 1. Google Maps Geocoder lookup
  if (window.google?.maps?.Geocoder) {
    try {
      const results = await new Promise((resolve, reject) => {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          {
            address: cleanQuery,
            componentRestrictions: { country: "IN" },
          },
          (resList, status) => {
            if (status === "OK" && resList && resList.length > 0) {
              resolve(resList);
            } else {
              reject(new Error(`Google Geocoder status: ${status}`));
            }
          }
        );
      });

      if (Array.isArray(results) && results.length > 0) {
        return results.map((item) => {
          const latVal = item.geometry.location.lat();
          const lngVal = item.geometry.location.lng();
          const parsed = parseGoogleGeocodeResult([item]);
          return {
            display_name: parsed?.displayAddress || item.formatted_address,
            formatted_address: item.formatted_address,
            latitude: latVal,
            longitude: lngVal,
            village: parsed?.village || "",
            taluk: parsed?.taluk || "",
            area: parsed?.area || parsed?.village || "",
            city: parsed?.city || "",
            district: parsed?.district || "",
            state: parsed?.state || "",
            country: parsed?.country || "India",
            pincode: parsed?.pincode || "",
          };
        });
      }
    } catch (googleSearchErr) {
      console.warn("[Place Search] Google Maps Geocoder search notice:", googleSearchErr?.message);
    }
  }

  // 2. Fallback to existing searchLocationPlaces
  return searchLocationPlaces(cleanQuery);
}
