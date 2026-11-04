// Straight-line distance in metres between two points on the earth (the "haversine" formula).
// prep/ keeps its own copy because it cannot load the server's model files (no mongoose here).
// The server's copy lives in server/models/amenity-model.js (used by seed.js). Keep the two the same.

const EARTH_RADIUS = 6371000; // metres

// Angles in the formula must be in radians, not degrees
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// pointA and pointB are [latitude, longitude], e.g. [1.37, 103.85]
export function straightLineDistance(pointA, pointB) {
  const lat1 = pointA[0];
  const lng1 = pointA[1];
  const lat2 = pointB[0];
  const lng2 = pointB[1];

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLng = Math.sin(dLng / 2);
  const a =
    sinHalfLat * sinHalfLat +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinHalfLng * sinHalfLng;

  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(a));
}
