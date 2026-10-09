/** Distance maths for the proximity grant layer. OWNER: Maps & Location */

const R = 6371000;
const toRad = (d) => (d * Math.PI) / 180;

/** Great-circle distance in metres between two { lat, lng } points. */
export function haversineM(a, b) {
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Is a block within `km` of `origin`? Both are { lat, lng }. */
export function withinKm(origin, block, km) {
  return haversineM(origin, block) <= km * 1000;
}
