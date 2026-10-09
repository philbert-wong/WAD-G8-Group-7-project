/**
 * OneMap (Singapore Land Authority) — the ONLY file in this project that knows
 * what OneMap's API looks like. If OneMap changes, you fix this file and nothing else.
 *
 * OWNER: Maps & Location
 *
 * THREE THINGS THAT WILL BITE YOU IF YOU DON'T READ THIS:
 *
 *  1. Every endpoint needs a token now, including Search. It used to be open.
 *     Most tutorials you'll find online are out of date.
 *
 *  2. The header is `Authorization: <token>` — NOT `Bearer <token>`.
 *
 *  3. FAILURES COME BACK AS HTTP 200. If your token is missing, expired or wrong,
 *     OneMap returns status 200 with an `error` field and an empty results array.
 *     So `if (!res.ok)` will NOT catch it — you must check the body. That is why
 *     every function here goes through `callOneMap()`.
 *
 * Tokens last 3 days, so we cache one in memory and renew it automatically.
 */

const BASE = "https://www.onemap.gov.sg";

// In-memory token cache. Survives for the life of the server process.
let cachedToken = null;
let tokenExpiresAt = 0;

async function getToken() {
  // Renew 10 minutes before expiry so a long job never trips over the boundary.
  if (cachedToken && Date.now() < tokenExpiresAt - 10 * 60 * 1000) {
    return cachedToken;
  }

  const email = process.env.ONEMAP_EMAIL;
  const password = process.env.ONEMAP_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "ONEMAP_EMAIL and ONEMAP_PASSWORD are missing. Copy .env.example to .env and fill them in. " +
      "Register free at https://www.onemap.gov.sg/apidocs/register"
    );
  }

  const res = await fetch(`${BASE}/api/auth/post/getToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`OneMap login failed: ${JSON.stringify(json)}`);
  }

  cachedToken = json.access_token;
  // expiry_timestamp is in seconds. Fall back to 3 days if it's absent.
  tokenExpiresAt = json.expiry_timestamp
    ? Number(json.expiry_timestamp) * 1000
    : Date.now() + 3 * 24 * 60 * 60 * 1000;

  return cachedToken;
}

/**
 * Every OneMap call goes through here so the 200-with-error trap is handled once.
 */
async function callOneMap(path, { retryOnAuthError = true } = {}) {
  const token = await getToken();

  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: token }, // NOT "Bearer " + token
  });

  if (!res.ok) {
    throw new Error(`OneMap HTTP ${res.status} for ${path}`);
  }

  const json = await res.json();

  // The trap: status 200, but the body says the token was rejected.
  if (json.error) {
    if (retryOnAuthError) {
      cachedToken = null; // force a fresh login, then try once more
      return callOneMap(path, { retryOnAuthError: false });
    }
    throw new Error(`OneMap rejected the request: ${json.error}`);
  }

  return json;
}

/**
 * Turn a postal code, address or place name into coordinates.
 * Returns null when nothing matched — that is a normal result, not an error.
 */
export async function search(query) {
  const path =
    `/api/common/elastic/search` +
    `?searchVal=${encodeURIComponent(query)}` +
    `&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

  const json = await callOneMap(path);
  if (!json.results || json.results.length === 0) return null;

  const hit = json.results[0];
  return {
    lat: Number(hit.LATITUDE),
    lng: Number(hit.LONGITUDE),
    address: hit.ADDRESS || hit.SEARCHVAL,
    postal: hit.POSTAL === "NIL" ? null : hit.POSTAL,
  };
}

/**
 * Geocode an HDB block. The resale dataset gives us "406" + "ANG MO KIO AVE 10"
 * and no coordinates at all, so this is how blocks get onto the map.
 */
export async function geocodeBlock(block, streetName) {
  return search(`${block} ${streetName}`);
}

/**
 * Walking route between two points.
 * routeType: "walk" | "drive" | "cycle" | "pt" (public transport)
 */
export async function route(from, to, routeType = "walk") {
  const path =
    `/api/public/routingsvc/route` +
    `?start=${from.lat},${from.lng}` +
    `&end=${to.lat},${to.lng}` +
    `&routeType=${routeType}`;

  const json = await callOneMap(path);
  const summary = json.route_summary;
  if (!summary) return null;

  return {
    distanceM: summary.total_distance,
    durationS: summary.total_time,
    walkMinutes: Math.round(summary.total_time / 60),
    geometry: json.route_geometry, // encoded polyline — Leaflet can draw this
  };
}

/** Exposed for tests only. */
export const _internal = { getToken, callOneMap };
