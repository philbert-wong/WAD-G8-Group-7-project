/**
 * Encoded polylines (Google's format, 5 decimal places) — the format OneMap uses
 * for walking routes. We store the encoded string on the block and decode it here
 * so the browser receives plain [lat, lng] pairs. OWNER: Maps & Location
 */

export function decodePolyline(str, precision = 5) {
  const factor = 10 ** precision;
  const out = [];
  let index = 0, lat = 0, lng = 0;

  while (index < str.length) {
    for (const axis of [0, 1]) {
      let shift = 0, result = 0, byte;
      do {
        byte = str.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta; else lng += delta;
    }
    out.push([lat / factor, lng / factor]);
  }
  return out;
}

export function encodePolyline(points, precision = 5) {
  const factor = 10 ** precision;
  let prevLat = 0, prevLng = 0, out = "";

  const push = (value) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    while (v >= 0x20) {
      out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    out += String.fromCharCode(v + 63);
  };

  for (const [lat, lng] of points) {
    const la = Math.round(lat * factor), ln = Math.round(lng * factor);
    push(la - prevLat);
    push(ln - prevLng);
    prevLat = la; prevLng = ln;
  }
  return out;
}
