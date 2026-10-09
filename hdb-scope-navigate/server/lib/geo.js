/** Distance maths. Pure functions. OWNER: Maps & Location */

const R = 6371000;
const toRad = (d) => (d * Math.PI) / 180;

/** Great-circle distance in metres between two { lat, lng } points. */
export function haversineM(a, b) {
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Nearest distance (metres) from `point` to each amenity type.
 * `amenities` is [{ type, lat, lng }]. Types with no amenity are left out.
 */
export function nearestByType(point, amenities) {
  const best = {};
  for (const a of amenities) {
    const d = haversineM(point, a);
    if (best[a.type] == null || d < best[a.type]) best[a.type] = d;
  }
  for (const t of Object.keys(best)) best[t] = Math.round(best[t]);
  return best;
}
