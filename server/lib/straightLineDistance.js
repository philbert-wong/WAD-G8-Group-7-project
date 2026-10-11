// Straight-line distance in metres between two points on the earth (the "haversine" formula).
// Only the seed script uses this; the API uses MongoDB's $geoNear instead.
export function straightLineDistance([lat1, lng1], [lat2, lng2]) {
  const EARTH_RADIUS = 6371000; // metres
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(a));
}
