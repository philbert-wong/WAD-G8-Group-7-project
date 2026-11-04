// Straight-line distance between two places on Earth, in metres (the "haversine" formula; not in our course).
// Used by Search for the PHG filter (the Map uses Leaflet's map.distance, which gives the same answer).
// Example: distanceMetres(1.3691, 103.8454, 1.3721, 103.8496) → about 570

// The Proximity Housing Grant "live near" distance: within 4 km of the parents
export const PHG_NEAR_METRES = 4000

export function distanceMetres(lat1, lng1, lat2, lng2) {
  const EARTH_RADIUS = 6371000 // metres
  const toRad = Math.PI / 180
  const dLat = (lat2 - lat1) * toRad
  const dLng = (lng2 - lng1) * toRad
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(a))
}
